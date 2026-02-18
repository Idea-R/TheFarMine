/**
 * CombatTimingService
 * Strict ESM module providing a deterministic per-entity attack timing FSM.
 * Coordinates phases: idle -> windup -> active -> recovery, emits events, toggles hitboxes.
 *
 * Authoritative events:
 * - combat.TelegraphStart { attackerId, attackId, targetId|null, startMs, windupMs, arcDeg, rangePx, colorToken, flashAtMs }
 * - combat.AttackEnd { attackerId, attackId, endedAtMs, reason:"finished"|"canceled"|"interrupted" }
 *
 * No external dependencies. Read-only touchpoints with ECS registry.
 *
 * AttackDef expectation (mirrors enemy JSON and player inline spec):
 * {
 *   id, name, kind:"melee", windupMs:int, activeMs:int, recoveryMs:int, cooldownMs:int,
 *   rangePx:int, arcDeg:int,
 *   hitbox:{ w:int,h:int,offsetX:int,offsetY:int },
 *   damage:{ base:int, poiseDamage:int },
 *   hitStopMs:{ attacker:int, victim:int },
 *   knockback:{ px:int, direction:"forward" },
 *   telegraph:{ colorToken:string, arcOverlay:bool, flashAtMs:int },
 *   notes:[string]
 * }
 *
 * JSDoc usage example:
 *
 * import { createCombatTimingService } from './src/systems/combat-timing-service.js';
 *
 * // Suppose registry and eventBus are available from your engine bootstrap
 * const timing = createCombatTimingService({
 *   registry,
 *   eventBus,
 *   getAttackDef: (attackerId, attackId) => {
 *     // Look up definitions by attacker and id (player/enemy)
 *     return enemyDefs[attackId] || playerDefs[attackId];
 *   },
 *   onHitboxToggle: (attackerId, enabled, def) => {
 *     // Inform Collider/Hitbox system to enable a transient attack collider
 *     // Example: collider.enableAttackHitbox(attackerId, enabled, def.hitbox)
 *   },
 *   onWindupStart: (attackerId, def) => {
 *     // Optional instrumentation hook; could trigger VFX
 *   },
 *   poiseStartupTaxMs: (attackerId) => {
 *     // Return +40 if PoiseBroken, else 0
 *     const poiseBroken = registry.hasComponent(attackerId, 'PoiseBroken');
 *     return poiseBroken ? 40 : 0;
 *   },
 *   dev: true
 * });
 *
 * // Game loop
 * function tick(dtMs) {
 *   timing.update(dtMs);
 *   // ... other systems
 * }
 *
 * // Starting a goblin attack
 * const goblinId = 102;
 * const attackAccepted = timing.startAttack(goblinId, 'goblin_slash_A', null);
 *
 * // Feinting: cancel mid-windup
 * timing.cancelAttack(goblinId, 'canceled');
 *
 * // Observing events
 * eventBus.on('combat.TelegraphStart', (p) => console.log('Telegraph', p));
 * eventBus.on('combat.AttackEnd', (p) => console.log('AttackEnd', p));
 */

/**
 * @typedef {Object} AttackDef
 * @property {string} id
 * @property {string} name
 * @property {string} kind
 * @property {number} windupMs
 * @property {number} activeMs
 * @property {number} recoveryMs
 * @property {number} cooldownMs
 * @property {number} rangePx
 * @property {number} arcDeg
 * @property {{w:number,h:number,offsetX:number,offsetY:number}} hitbox
 * @property {{base:number, poiseDamage:number}} damage
 * @property {{attacker:number, victim:number}} hitStopMs
 * @property {{px:number, direction:"forward"|"back"|"left"|"right"}} knockback
 * @property {{colorToken:string, arcOverlay:boolean, flashAtMs:number}} telegraph
 * @property {string[]} notes
 */

/**
 * @typedef {Object} AttackState
 * @property {0|1|2|3} phase // 0 idle, 1 windup, 2 active, 3 recovery
 * @property {string} attackId
 * @property {number|null} targetId
 * @property {AttackDef} def
 * @property {number} windupStartMs
 * @property {number} extraStartupMs
 * @property {number} activeStartMs
 * @property {number} recoveryStartMs
 */

const PHASE_IDLE = 0;
const PHASE_WINDUP = 1;
const PHASE_ACTIVE = 2;
const PHASE_RECOVERY = 3;

const PHASE_LABEL = ['idle', 'windup', 'active', 'recovery'];

const TELEGRAPH_MIN_SPACING_MS = 300; // per-attacker debounce

/**
 * Utility: clamp value to integer within [min, max]
 * @param {number} n
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clampInt(n, min, max) {
  const x = (n | 0);
  return x < min ? min : (x > max ? max : x);
}

/**
 * Utility: ensure non-negative integer milliseconds
 * @param {number} n
 * @returns {number}
 */
function toIntMs(n) {
  if (Number.isInteger(n)) return n;
  // Prefer deterministic rounding
  return Math.max(0, Math.round(n));
}

/**
 * @param {object} opts
 * @param {object} opts.registry - ECS registry (required)
 * @param {{emit: (eventName:string, payload:object) => void}} opts.eventBus - event bus (required)
 * @param {{ nowMs: () => number }=} opts.time - time provider; if absent, service maintains its own ms clock advanced by update(dtMs)
 * @param {(attackerId:number, attackId:string) => AttackDef} opts.getAttackDef - fetch AttackDef (required)
 * @param {(attackerId:number, enabled:boolean, def:AttackDef) => void=} opts.onHitboxToggle - callback to toggle hitboxes
 * @param {(attackerId:number, def:AttackDef) => void=} opts.onWindupStart - optional instrumentation hook
 * @param {(attackerId:number) => number=} opts.poiseStartupTaxMs - returns extra startup delay (+ms), default 0
 * @param {boolean=} opts.dev - enable dev logs/invariants
 */
export function createCombatTimingService(opts = {}) {
  // Validate options at boot
  if (!opts || typeof opts !== 'object') {
    throw new Error('CombatTimingService: options object is required.');
  }
  const { registry, eventBus, time, getAttackDef } = opts;

  if (!registry || typeof registry !== 'object') {
    throw new Error('CombatTimingService: opts.registry is required.');
  }
  if (typeof registry.hasComponent !== 'function') {
    throw new Error('CombatTimingService: registry.hasComponent(entityId, componentName) must exist.');
  }

  if (!eventBus || typeof eventBus.emit !== 'function') {
    throw new Error('CombatTimingService: opts.eventBus with emit(name, payload) is required.');
  }

  if (typeof getAttackDef !== 'function') {
    throw new Error('CombatTimingService: opts.getAttackDef(attackerId, attackId) is required and must be a function.');
  }

  const dev = !!opts.dev;
  const onHitboxToggle = typeof opts.onHitboxToggle === 'function' ? opts.onHitboxToggle : null;
  const onWindupStart = typeof opts.onWindupStart === 'function' ? opts.onWindupStart : null;
  const poiseStartupTaxMs = typeof opts.poiseStartupTaxMs === 'function' ? opts.poiseStartupTaxMs : (() => 0);
  const hasTimeProvider = !!(time && typeof time.nowMs === 'function');

  // Internal state containers
  /** @type {Map<number, AttackState>} */
  const states = new Map();
  /** @type {Map<number, number>} */
  const telegraphCooldown = new Map();
  /** @type {Set<number>} warnOnceByAttacker */
  const warnOnceByAttacker = new Set();

  // Dev counters
  const metrics = {
    telegraphsEmitted: 0,
    attacksStarted: 0,
    attacksFinished: 0,
    cancels: 0
  };

  // Internal clock if no time provider
  let internalNowMs = 0;

  /**
   * Get "now" in ms (integer, monotonic).
   * If external time provider exists, return provider.nowMs() rounded to int.
   * Otherwise return internalNowMs.
   * @returns {number}
   */
  function nowMs() {
    if (hasTimeProvider) {
      const t = toIntMs(time.nowMs());
      return t < 0 ? 0 : t;
    }
    return internalNowMs;
  }

  /**
   * Safe invoke a hook; in dev mode log errors, but do not break flow.
   * @param {Function} fn
   * @param {Array<any>} args
   */
  function safeCallHook(fn, args) {
    if (!fn) return;
    try {
      fn(...args);
    } catch (err) {
      if (dev) {
        // eslint-disable-next-line no-console
        console.warn('CombatTimingService hook error:', err);
      }
    }
  }

  /**
   * Check if an entity is a valid attacker (Player or Enemy).
   * @param {number} entityId
   * @returns {boolean}
   */
  function isValidAttacker(entityId) {
    // Optionally verify entity exists if registry.hasEntity is present
    if (typeof registry.hasEntity === 'function') {
      if (!registry.hasEntity(entityId)) return false;
    }
    // Must have either Player or Enemy component
    return !!(registry.hasComponent(entityId, 'Player') || registry.hasComponent(entityId, 'Enemy'));
  }

  /**
   * Validate def constraints per combat-design.md, warn once per attacker if out-of-bounds.
   * - activeMs in [70..110]
   * - arcDeg <= 110
   * @param {number} attackerId
   * @param {AttackDef} def
   */
  function validateDefConstraints(attackerId, def) {
    if (!dev) return;
    if (warnOnceByAttacker.has(attackerId)) return;

    const activeOk = typeof def.activeMs === 'number' && def.activeMs >= 70 && def.activeMs <= 110;
    const arcOk = typeof def.arcDeg === 'number' && def.arcDeg <= 110;

    if (!activeOk || !arcOk) {
      warnOnceByAttacker.add(attackerId);
      // eslint-disable-next-line no-console
      console.warn(
        `CombatTimingService: AttackDef constraints violation for attacker ${attackerId} (attackId="${def.id}"): ` +
        `${!activeOk ? `activeMs=${def.activeMs} (expected 70..110)` : ''} ` +
        `${!arcOk ? `arcDeg=${def.arcDeg} (expected <=110)` : ''}`.trim()
      );
    }
  }

  /**
   * Emit TelegraphStart if not rate-limited; coalesce on cooldown violation.
   * @param {number} attackerId
   * @param {string} attackId
   * @param {number|null} targetId
   * @param {AttackDef} def
   * @param {number} windupStart
   * @param {number} effectiveWindup
   */
  function maybeEmitTelegraph(attackerId, attackId, targetId, def, windupStart, effectiveWindup) {
    const last = telegraphCooldown.get(attackerId) || -Infinity;
    const t = windupStart;
    if (t - last < TELEGRAPH_MIN_SPACING_MS) {
      return; // coalesce: skip emission, still proceed with attack timing
    }
    telegraphCooldown.set(attackerId, t);

    const payload = {
      attackerId,
      attackId,
      targetId: targetId == null ? null : targetId,
      startMs: t,
      windupMs: effectiveWindup,
      arcDeg: toIntMs(def.arcDeg),
      rangePx: toIntMs(def.rangePx),
      colorToken: def.telegraph && typeof def.telegraph.colorToken === 'string' ? def.telegraph.colorToken : 'default',
      flashAtMs: def.telegraph && Number.isInteger(def.telegraph.flashAtMs) ? def.telegraph.flashAtMs : 0
    };
    eventBus.emit('combat.TelegraphStart', payload);
    if (dev) metrics.telegraphsEmitted++;
  }

  /**
   * Enter windup phase for attacker
   * @param {number} attackerId
   * @param {string} attackId
   * @param {number|null} targetId
   * @param {AttackDef} def
   * @param {number} startT
   */
  function enterWindup(attackerId, attackId, targetId, def, startT) {
    const extra = toIntMs(Math.max(0, poiseStartupTaxMs(attackerId) | 0));
    const effectiveWindup = toIntMs(def.windupMs) + extra;

    /** @type {AttackState} */
    const st = {
      phase: PHASE_WINDUP,
      attackId,
      targetId: targetId == null ? null : targetId,
      def,
      windupStartMs: startT,
      extraStartupMs: extra,
      activeStartMs: -1,
      recoveryStartMs: -1
    };
    states.set(attackerId, st);

    // Telegraph at windup begin (effective start is now with windup length adjusted by extra)
    maybeEmitTelegraph(attackerId, attackId, st.targetId, def, startT, effectiveWindup);

    // Optional instrumentation at windup start
    safeCallHook(onWindupStart, [attackerId, def]);

    if (dev) metrics.attacksStarted++;
  }

  /**
   * Transition helpers
   * @param {number} attackerId
   * @param {AttackState} st
   * @param {number} now
   */
  function tryAdvanceFromWindup(attackerId, st, now) {
    const windupEnd = st.windupStartMs + toIntMs(st.def.windupMs) + st.extraStartupMs;
    if (now >= windupEnd) {
      // Enter Active exactly at windupEnd boundary
      st.activeStartMs = windupEnd;
      st.phase = PHASE_ACTIVE;

      // Toggle hitbox ON
      safeCallHook(onHitboxToggle, [attackerId, true, st.def]);
    }
  }

  function tryAdvanceFromActive(attackerId, st, now) {
    const activeEnd = st.activeStartMs + toIntMs(st.def.activeMs);
    if (now >= activeEnd) {
      // Exit Active
      // Toggle hitbox OFF
      safeCallHook(onHitboxToggle, [attackerId, false, st.def]);

      st.recoveryStartMs = activeEnd;
      st.phase = PHASE_RECOVERY;
    }
  }

  function tryAdvanceFromRecovery(attackerId, st, now) {
    const recoveryEnd = st.recoveryStartMs + toIntMs(st.def.recoveryMs);
    if (now >= recoveryEnd) {
      // Finished
      eventBus.emit('combat.AttackEnd', {
        attackerId,
        attackId: st.attackId,
        endedAtMs: now,
        reason: 'finished'
      });
      if (dev) metrics.attacksFinished++;
      states.delete(attackerId);
    }
  }

  /**
   * Validate AttackDef structure minimally.
   * @param {AttackDef} def
   * @returns {boolean}
   */
  function validateAttackDefShape(def) {
    if (!def || typeof def !== 'object') return false;
    if (typeof def.id !== 'string') return false;
    if (!Number.isFinite(def.windupMs) || !Number.isFinite(def.activeMs) || !Number.isFinite(def.recoveryMs)) return false;
    if (!def.telegraph || typeof def.telegraph !== 'object') return false;
    if (!Number.isFinite(def.arcDeg) || !Number.isFinite(def.rangePx)) return false;
    return true;
  }

  const service = {
    /**
     * Attempt to start an attack for an entity.
     * Preconditions:
     * - Attacker must have Player or Enemy component.
     * - Must not already be attacking (windup/active/recovery). Starting in recovery is rejected.
     * - Fetch AttackDef via opts.getAttackDef; if invalid, reject.
     *
     * TelegraphStart is emitted at windup begin if debounce spacing allows; otherwise it is coalesced (skipped).
     *
     * @param {number} attackerId
     * @param {string} attackId
     * @param {number|null} [targetId=null]
     * @returns {boolean} true if accepted; false if rejected
     */
    startAttack(attackerId, attackId, targetId = null) {
      if (!Number.isInteger(attackerId)) return false;
      if (typeof attackId !== 'string' || attackId.length === 0) return false;
      if (!isValidAttacker(attackerId)) return false;

      if (states.has(attackerId)) {
        // Already attacking; policy: do not auto-cancel or restart
        const st = states.get(attackerId);
        if (st && (st.phase === PHASE_WINDUP || st.phase === PHASE_ACTIVE || st.phase === PHASE_RECOVERY)) {
          return false;
        }
      }

      const def = getAttackDef(attackerId, attackId);
      if (!validateAttackDefShape(def)) {
        if (dev) {
          // eslint-disable-next-line no-console
          console.warn(`CombatTimingService.startAttack: invalid AttackDef for attacker=${attackerId} attackId="${attackId}".`);
        }
        return false;
      }

      validateDefConstraints(attackerId, def);

      const t = nowMs();
      enterWindup(attackerId, attackId, targetId, def, t);
      return true;
    },

    /**
     * Cancel or interrupt an ongoing attack. If in ACTIVE, disables hitbox immediately.
     * Emits combat.AttackEnd with provided reason.
     *
     * @param {number} attackerId
     * @param {"canceled"|"interrupted"} [reason="canceled"]
     * @returns {void}
     */
    cancelAttack(attackerId, reason = 'canceled') {
      const st = states.get(attackerId);
      if (!st) return;
      // Disable hitbox if currently active
      if (st.phase === PHASE_ACTIVE) {
        safeCallHook(onHitboxToggle, [attackerId, false, st.def]);
      }
      states.delete(attackerId);
      eventBus.emit('combat.AttackEnd', {
        attackerId,
        attackId: st.attackId,
        endedAtMs: nowMs(),
        reason: reason === 'interrupted' ? 'interrupted' : 'canceled'
      });
      if (dev) metrics.cancels++;
    },

    /**
     * Advance internal clock (if no external time provider) and progress state machines.
     * Performs phase transitions and triggers hooks/events accordingly.
     *
     * @param {number} dtMs - delta time in milliseconds
     * @returns {void}
     */
    update(dtMs) {
      const dt = toIntMs(dtMs);
      if (!hasTimeProvider) {
        // Maintain internal monotonic ms clock
        const safeDt = dt >= 0 ? dt : 0;
        internalNowMs = (internalNowMs + safeDt) | 0;
      }

      if (states.size === 0) return;

      const now = nowMs();

      // Iterate over attackers; careful with deletion during iteration
      const attackers = Array.from(states.keys());
      for (let i = 0; i < attackers.length; i++) {
        const attackerId = attackers[i];
        const st = states.get(attackerId);
        if (!st) continue;

        // Progress possible multiple transitions if dt is large
        if (st.phase === PHASE_WINDUP) {
          tryAdvanceFromWindup(attackerId, st, now);
        }
        if (!states.has(attackerId)) continue; // might have been mutated externally

        if (st.phase === PHASE_ACTIVE) {
          tryAdvanceFromActive(attackerId, st, now);
        }
        if (!states.has(attackerId)) continue;

        if (st.phase === PHASE_RECOVERY) {
          tryAdvanceFromRecovery(attackerId, st, now);
        }
      }
    },

    /**
     * Is the entity currently in any attack phase (WINDUP/ACTIVE/RECOVERY)?
     * @param {number} attackerId
     * @returns {boolean}
     */
    isAttacking(attackerId) {
      const st = states.get(attackerId);
      return !!(st && st.phase !== PHASE_IDLE);
    },

    /**
     * Get current attack state for an entity.
     * Returns phase, attackId, tInPhaseMs, and endsAtMs for current phase; or {phase:"idle"}.
     * @param {number} attackerId
     * @returns {{ phase:"idle"|"windup"|"active"|"recovery", attackId?:string, tInPhaseMs?:number, endsAtMs?:number }}
     */
    getState(attackerId) {
      const st = states.get(attackerId);
      if (!st) return { phase: 'idle' };

      const now = nowMs();

      if (st.phase === PHASE_WINDUP) {
        const start = st.windupStartMs;
        const ends = st.windupStartMs + toIntMs(st.def.windupMs) + st.extraStartupMs;
        return {
          phase: 'windup',
          attackId: st.attackId,
          tInPhaseMs: Math.max(0, now - start),
          endsAtMs: ends
        };
      }
      if (st.phase === PHASE_ACTIVE) {
        const start = st.activeStartMs;
        const ends = st.activeStartMs + toIntMs(st.def.activeMs);
        return {
          phase: 'active',
          attackId: st.attackId,
          tInPhaseMs: Math.max(0, now - start),
          endsAtMs: ends
        };
      }
      if (st.phase === PHASE_RECOVERY) {
        const start = st.recoveryStartMs;
        const ends = st.recoveryStartMs + toIntMs(st.def.recoveryMs);
        return {
          phase: 'recovery',
          attackId: st.attackId,
          tInPhaseMs: Math.max(0, now - start),
          endsAtMs: ends
        };
      }

      return { phase: 'idle' };
    },

    /**
     * Clear all tracked attack states without emitting AttackEnd (scene reset).
     * Disables any active hitboxes via hook to avoid leaked colliders.
     * @returns {void}
     */
    clearAll() {
      if (onHitboxToggle && states.size > 0) {
        // Disable any active hitboxes
        for (const [attackerId, st] of states) {
          if (st.phase === PHASE_ACTIVE) {
            safeCallHook(onHitboxToggle, [attackerId, false, st.def]);
          }
        }
      }
      states.clear();
      // Do not clear telegraph cooldowns; audio debounce across scene resets is not specified. We'll reset to be safe.
      telegraphCooldown.clear();
    },

    /**
     * Development metrics snapshot.
     * @returns {{telegraphsEmitted:number, attacksStarted:number, attacksFinished:number, cancels:number}}
     */
    getDebugMetrics() {
      return { ...metrics };
    }
  };

  return Object.freeze(service);
}

export default createCombatTimingService;