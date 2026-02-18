'use strict';

/**
 * ECS Registry Module
 * Version: v0.1
 * Author: Alpha
 * Docs: docs/core-systems/ecs-architecture.md
 *
 * This module provides a minimal, engine-agnostic ECS runtime aligned with Sprint 1
 * contracts. Deterministic eid-sorted iteration is guaranteed across views.
 *
 * Example usage:
 *   import { createRegistry, registerKnownComponents, Stages, MovementSystem, EventTypes } from './ecs-registry.js';
 *   const registry = createRegistry({ mode: 'dev' });
 *   registerKnownComponents(registry);
 *   const player = registry.createEntity();
 *   registry.add(player, 'position', { x: 0, y: 0 });
 *   registry.add(player, 'velocity', { vx: 1, vy: 0, max_speed: 4 });
 *   registry.register(Stages.PrePhysics, MovementSystem);
 *   registry.tick(1/60);
 *   // Drain footstep events (if any) after the tick
 *   registry.bus.drain(EventTypes.FootstepEvent, (e) => {
 *     // handle footstep event
 *   });
 */

/**
 * @typedef {number} EntityId
 */

/**
 * @typedef {string} ComponentName
 */

/**
 * @callback SystemFn
 * @param {Registry} registry
 * @param {number} dtSec
 * @returns {void}
 */

/**
 * @typedef {Object} Registry
 * @property {Record<ComponentName, any>} schemas
 * @property {Object} bus
 * @property {Map<string, number>} counters
 * @property {(key: string, by?: number) => void} inc
 * @property {() => void} resetCounters
 * @property {() => EntityId} createEntity
 * @property {(eid: EntityId) => void} destroyEntity
 * @property {(eid: EntityId) => boolean} isAlive
 * @property {(name: ComponentName, obj: any) => void} setResource
 * @property {(name: ComponentName) => any|undefined} getResource
 * @property {(name: ComponentName) => boolean} hasResource
 * @property {(eid: EntityId, name: ComponentName, data: Object) => void} add
 * @property {(eid: EntityId, name: ComponentName) => void} remove
 * @property {(eid: EntityId, name: ComponentName) => Object|null} get
 * @property {(eid: EntityId, name: ComponentName) => boolean} has
 * @property {(map: Record<ComponentName, any>) => void} setSchemas
 * @property {(include: ComponentName[], exclude?: ComponentName[]) => { each: (cb: (eid: EntityId, ...comps: any[]) => void) => void, size: () => number }} view
 * @property {(stage: number, fn: SystemFn) => void} register
 * @property {(dtSec: number) => void} tick
 * @property {(name: ComponentName) => any} getDebugStore
 * @property {Object} _ephemeral
 */

/**
 * Stages constants in fixed, deterministic order.
 */
export const Stages = Object.freeze({
  Input: 0,
  PrePhysics: 1,
  Gameplay: 2,
  Events: 3,
  RenderPrep: 4,
});

/**
 * Common Event Types for convenience (not enforced by engine).
 */
export const EventTypes = Object.freeze({
  MineHitEvent: 'MineHitEvent',
  DamageEvent: 'DamageEvent',
  FootstepEvent: 'FootstepEvent',
  PlaySfxEvent: 'PlaySfxEvent',
  UiCommand: 'UiCommand',
});

/**
 * Create a lightweight, type-tagged event bus.
 * - Per-type FIFO queues
 * - Deterministic in-order draining
 * - Optional internal subscriptions used by the registry at Events stage
 */
export function createEventBus() {
  /** @type {Map<string, any[]>} */
  const queues = new Map();
  /** internal subscription registry (not part of public API contract, used by registry auto-drain) */
  /** @type {Map<string, Set<(payload: any) => void>>} */
  const subs = new Map();

  const getQueue = (type) => {
    let q = queues.get(type);
    if (!q) {
      q = [];
      queues.set(type, q);
    }
    return q;
  };

  const bus = {
    emit(type, payload) {
      // Event payloads are objects. We do not clone for performance; tests are responsible for immutability.
      getQueue(type).push(payload);
    },
    /**
     * Drain all events of a given type, passing payloads to fn in FIFO order.
     * Returns number of events drained.
     * @param {string} type
     * @param {(payload: any) => void} fn
     * @returns {number}
     */
    drain(type, fn) {
      const q = queues.get(type);
      if (!q || q.length === 0) return 0;
      const n = q.length;
      // Maintain FIFO and avoid O(n^2) shifts by simple index scan
      for (let i = 0; i < n; i++) {
        const p = q[i];
        fn(p);
      }
      q.length = 0;
      return n;
    },
    /**
     * Clear events either for a specific type or for all.
     * @param {string=} type
     */
    clear(type) {
      if (typeof type === 'string') {
        const q = queues.get(type);
        if (q) q.length = 0;
        return;
      }
      // Clear all
      queues.forEach((q) => (q.length = 0));
    },
    // Internal optional subscription helpers.
    _subscribe(type, fn) {
      let set = subs.get(type);
      if (!set) {
        set = new Set();
        subs.set(type, set);
      }
      set.add(fn);
      return () => {
        set.delete(fn);
      };
    },
    _drainSubscriptions() {
      // For each subscribed type, deliver all queued payloads to every subscriber, FIFO.
      subs.forEach((set, type) => {
        if (set.size === 0) return;
        const q = queues.get(type);
        if (!q || q.length === 0) return;
        const payloads = q.slice(0); // snapshot to preserve order
        q.length = 0; // clear
        for (let i = 0; i < payloads.length; i++) {
          const p = payloads[i];
          set.forEach((fn) => {
            try {
              fn(p);
            } catch {
              // Swallow to isolate systems; tests may verify queue drained regardless.
            }
          });
        }
      });
    },
  };

  return bus;
}

/**
 * Create a new ECS Registry.
 * @param {{ mode?: 'dev'|'prod', autoDrainEvents?: boolean }=} opts
 * @returns {Registry}
 */
export function createRegistry(opts = {}) {
  const mode = opts.mode === 'prod' ? 'prod' : 'dev';
  const autoDrainEvents = opts.autoDrainEvents !== false; // default true
  const warnLimiter = createWarnLimiter();

  // Entities
  let nextEid = 1;
  /** @type {number[]} */
  const freeList = [];
  /** @type {Set<number>} */
  const alive = new Set();

  // Component stores
  /** @type {Map<ComponentName, Store>} */
  const stores = new Map();

  // Systems by stage
  /** @type {Array<SystemFn[]>} */
  const systems = [
    [], // Input
    [], // PrePhysics
    [], // Gameplay
    [], // Events
    [], // RenderPrep
  ];

  // Resources
  /** @type {Map<string, any>} */
  const resources = new Map();

  // Schemas (optional)
  /** @type {Record<ComponentName, any>} */
  const schemas = Object.create(null);

  // Counters
  /** @type {Map<string, number>} */
  const counters = new Map();

  // Event bus
  const bus = createEventBus();

  // Internal tick index to help lazy sorts
  let tickIndex = 0;

  // Ephemeral heap per tick/lifetime for transient per-entity data (e.g., cooldowns)
  const _ephemeral = {
    cooldowns: new Map(), // eid -> { footstep: number }
  };

  // Helpers
  const inc = (key, by = 1) => counters.set(key, (counters.get(key) || 0) + by);
  const resetCounters = () => counters.clear();

  function ensureStore(name) {
    let s = stores.get(name);
    if (!s) {
      s = createStore(name);
      stores.set(name, s);
    }
    return s;
  }

  function createEntity() {
    let eid = 0;
    if (freeList.length > 0) {
      eid = freeList.pop();
    } else {
      eid = nextEid++;
    }
    alive.add(eid);
    return eid;
  }

  function destroyEntity(eid) {
    if (!alive.has(eid)) return;
    // Remove from all component stores immediately
    stores.forEach((s) => {
      if (s.indices.has(eid)) {
        storeRemove(s, eid);
      }
    });
    alive.delete(eid);
    freeList.push(eid);
  }

  function isAlive(eid) {
    return alive.has(eid);
  }

  function setResource(name, obj) {
    resources.set(name, obj);
  }

  function getResource(name) {
    return resources.get(name);
  }

  function hasResource(name) {
    return resources.has(name);
  }

  function validateAndSanitizeComponent(name, incoming) {
    // Shallow object expected
    if (incoming == null || typeof incoming !== 'object') {
      if (mode === 'dev') {
        throw new Error(`Component "${name}" expects object data`);
      } else {
        warnLimiter.warnOnce(`comp_${name}_nonobj`, `Component "${name}" received non-object data; replaced with empty object.`);
        return {};
      }
    }
    const schema = schemas[name];
    if (!schema) {
      // No schema => accept as-is
      return incoming;
    }

    // If properties defined, enforce per field.
    const props = schema && schema.properties ? schema.properties : null;
    const required = Array.isArray(schema && schema.required) ? schema.required : [];

    // Check unknown fields/types
    const out = {};
    if (props) {
      // Examine incoming keys
      for (const k of Object.keys(incoming)) {
        if (!Object.prototype.hasOwnProperty.call(props, k)) {
          if (mode === 'dev') {
            throw new Error(`Component "${name}" has unknown field "${k}"`);
          } else {
            warnLimiter.warnThrottled(`comp_${name}_unknown_${k}`, `Component "${name}" unknown field "${k}" ignored.`);
            continue;
          }
        }
        out[k] = sanitizeByPropDef(name, k, incoming[k], props[k], warnLimiter, mode, inc);
      }
      // Enforce required and defaults
      for (const k of Object.keys(props)) {
        if (out[k] === undefined) {
          if (incoming[k] !== undefined) {
            // Already assigned above
          } else if (required.includes(k)) {
            if (mode === 'dev') {
              throw new Error(`Component "${name}" missing required field "${k}"`);
            } else {
              const d = defaultForProp(props[k]);
              warnLimiter.warnThrottled(`comp_${name}_missing_${k}`, `Component "${name}" missing "${k}", defaulting.`);
              out[k] = d;
            }
          } else if (props[k] && props[k].default !== undefined) {
            out[k] = props[k].default;
          }
        }
      }
      return out;
    }

    // If no props described, accept as-is
    return incoming;
  }

  function add(eid, name, data) {
    if (!alive.has(eid)) {
      if (mode === 'dev') {
        throw new Error(`add(): eid ${eid} is not alive`);
      } else {
        warnLimiter.warnThrottled('add_dead', `Attempted to add component "${name}" to dead entity ${eid}`);
        return;
      }
    }
    const store = ensureStore(name);
    const sanitized = validateAndSanitizeComponent(name, data);
    const existing = store.indices.get(eid);
    if (existing !== undefined) {
      if (mode === 'dev') {
        throw new Error(`Entity ${eid} already has component "${name}"`);
      } else {
        warnLimiter.warnThrottled(`dup_${name}`, `Entity ${eid} already had "${name}", replacing.`);
        store.data[existing] = sanitized;
        return;
      }
    }

    const idx = store.ids.length;
    store.ids.push(eid);
    store.data.push(sanitized);
    store.indices.set(eid, idx);
    store.dirtySorted = true;
  }

  function remove(eid, name) {
    const s = stores.get(name);
    if (!s) return;
    if (!s.indices.has(eid)) return;
    storeRemove(s, eid);
  }

  function get(eid, name) {
    const s = stores.get(name);
    if (!s) return null;
    const idx = s.indices.get(eid);
    if (idx === undefined) return null;
    // Return direct reference; caller is responsible for safe mutation.
    return s.data[idx];
  }

  function has(eid, name) {
    const s = stores.get(name);
    if (!s) return false;
    return s.indices.has(eid);
  }

  function setSchemas(map) {
    // Replace whole schema map
    for (const k of Object.keys(schemas)) {
      delete schemas[k];
    }
    if (map && typeof map === 'object') {
      for (const k of Object.keys(map)) {
        schemas[k] = map[k];
      }
    }
  }

  function view(include, exclude) {
    if (!Array.isArray(include) || include.length === 0) {
      throw new Error('view(): include must be a non-empty array of component names');
    }
    if (include.length > 5) {
      // MVP supports up to 5; we can still proceed but warn in dev
      if (mode === 'dev') {
        warnLimiter.warnThrottled('view_inc_len', `view() include length ${include.length} exceeds MVP target (5). Proceeding.`);
      }
    }

    // Determine driver store (smallest)
    /** @type {Store[]} */
    const includeStores = include.map((n) => ensureStore(n));
    let driver = includeStores[0];
    for (let i = 1; i < includeStores.length; i++) {
      if (includeStores[i].ids.length < driver.ids.length) {
        driver = includeStores[i];
      }
    }

    const excludes = Array.isArray(exclude) ? exclude : [];

    const ensureSorted = () => {
      if (driver.lastSortTick !== tickIndex || driver.dirtySorted) {
        driver.sortedIds.length = 0;
        for (let i = 0; i < driver.ids.length; i++) {
          driver.sortedIds[i] = driver.ids[i];
        }
        driver.sortedIds.sort(numberAsc);
        driver.lastSortTick = tickIndex;
        driver.dirtySorted = false;
      }
    };

    return {
      each(cb) {
        ensureSorted();
        const incStores = includeStores;
        const excStores = excludes.map((n) => stores.get(n)).filter(Boolean);
        const N = driver.sortedIds.length;
        for (let i = 0; i < N; i++) {
          const eid = driver.sortedIds[i];
          inc('Query.iterations', 1);
          if (!alive.has(eid)) continue;
          // Must have all include components
          let ok = true;
          for (let j = 0; j < incStores.length; j++) {
            const s = incStores[j];
            if (!s.indices.has(eid)) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          // Must not have any exclude components
          for (let j = 0; j < excStores.length; j++) {
            const s = excStores[j];
            if (s && s.indices.has(eid)) {
              ok = false;
              break;
            }
          }
          if (!ok) continue;
          // Collect component references in stable include order
          const comps = new Array(incStores.length);
          for (let j = 0; j < incStores.length; j++) {
            const s = incStores[j];
            const idx = s.indices.get(eid);
            comps[j] = s.data[idx];
          }
          inc('Query.matches', 1);
          cb(eid, ...comps);
        }
      },
      // Size is the driver store size; may overapproximate matches.
      size() {
        return driver.ids.length;
      },
    };
  }

  function register(stage, fn) {
    if (typeof stage !== 'number' || stage < 0 || stage > 4) {
      throw new Error('register(): invalid stage');
    }
    if (typeof fn !== 'function') {
      throw new Error('register(): fn must be a function');
    }
    systems[stage].push(fn);
  }

  function tick(dtSec) {
    // Clamp dt to [0, 0.1]
    let dt = clampNumber(dtSec, 0, 0.1, 0);
    tickIndex++;

    // Run stages in fixed order
    for (let s = 0; s < systems.length; s++) {
      const arr = systems[s];
      for (let i = 0; i < arr.length; i++) {
        try {
          arr[i](registry, dt);
        } catch (err) {
          // Isolate system failures; in dev we can warn
          warnLimiter.warnThrottled(`sys_err_${s}_${i}`, `System error at stage ${s}, index ${i}: ${err && err.message ? err.message : err}`);
        }
      }
      // Auto-drain at end of Events stage
      if (s === Stages.Events && autoDrainEvents) {
        bus._drainSubscriptions();
      }
    }
  }

  function getDebugStore(name) {
    if (mode !== 'dev') {
      throw new Error('getDebugStore() is only available in dev mode');
    }
    const s = stores.get(name);
    if (!s) return null;
    // Expose a safe snapshot (shallow) of structural arrays and maps for tests
    return {
      name: s.name,
      ids: s.ids.slice(0),
      data: s.data.slice(0),
      indices: new Map(s.indices),
      sortedIds: s.sortedIds.slice(0),
      dirtySorted: s.dirtySorted,
    };
  }

  const registry = {
    schemas,
    bus,
    counters,
    inc,
    resetCounters,
    createEntity,
    destroyEntity,
    isAlive,
    setResource,
    getResource,
    hasResource,
    add,
    remove,
    get,
    has,
    setSchemas,
    view,
    register,
    tick,
    getDebugStore,
    _ephemeral,
  };

  return registry;
}

/**
 * Register MVP-known component stores up-front for convenience.
 * This pre-creates empty stores but does not bind schemas.
 * @param {Registry} registry
 */
export function registerKnownComponents(registry) {
  const names = [
    'position',
    'velocity',
    'collider',
    'tile',
    'ore_vein',
    'health',
    'stamina',
    'inventory',
    'tool',
    'damageable',
    'faction',
    'sprite_ref',
    'light',
    'sound_emitter',
    'ui_state',
  ];
  for (let i = 0; i < names.length; i++) {
    // Touch ensure store via add/remove on a dummy entity? Better: create store directly.
    ensureStoreForRegistry(registry, names[i]);
  }
}

/**
 * Reference Movement System operating on position + velocity.
 * - Clamps velocity length to max_speed if provided (velocity.max_speed or position.max_speed).
 * - Integrates position by dt.
 * - NaN guards for positions and velocities.
 * - Emits FootstepEvent with cooldown when speed exceeds threshold.
 * @param {Registry} registry
 * @param {number} dtSec
 */
export function MovementSystem(registry, dtSec) {
  const dt = clampNumber(dtSec, 0, 0.1, 0);
  const v = registry.view(['position', 'velocity']);
  v.each((eid, pos, vel) => {
    // Validate numeric fields
    if (!isFiniteNumber(vel.vx)) {
      vel.vx = 0;
      registry.inc('Guards.corrected', 1);
    }
    if (!isFiniteNumber(vel.vy)) {
      vel.vy = 0;
      registry.inc('Guards.corrected', 1);
    }

    // Clamp speed if max_speed present
    const maxs = resolveMaxSpeed(vel, pos);
    let vx = vel.vx || 0;
    let vy = vel.vy || 0;
    let spd2 = vx * vx + vy * vy;
    if (maxs > 0 && spd2 > 0) {
      const max2 = maxs * maxs;
      if (spd2 > max2) {
        const scale = Math.sqrt(max2 / spd2);
        vx *= scale;
        vy *= scale;
        vel.vx = vx;
        vel.vy = vy;
      }
    }

    // Integrate position
    if (!isFiniteNumber(pos.x)) {
      pos.x = 0;
      registry.inc('Guards.corrected', 1);
    }
    if (!isFiniteNumber(pos.y)) {
      pos.y = 0;
      registry.inc('Guards.corrected', 1);
    }
    pos.x += vx * dt;
    pos.y += vy * dt;

    // Footstep event emission (simple cooldown)
    const speed = Math.sqrt((vx * vx) + (vy * vy));
    const threshold = 1.0; // units/sec
    const cooldownDur = 0.4; // seconds between footsteps
    if (speed > threshold) {
      let cd = registry._ephemeral.cooldowns.get(eid);
      if (!cd) {
        cd = { footstep: 0 };
        registry._ephemeral.cooldowns.set(eid, cd);
      }
      cd.footstep -= dt;
      if (cd.footstep <= 0) {
        registry.bus.emit(EventTypes.FootstepEvent, { eid, speed });
        cd.footstep = cooldownDur;
      }
    } else {
      // If slow/idle, allow next step quickly
      let cd = registry._ephemeral.cooldowns.get(eid);
      if (cd) {
        cd.footstep = Math.min(cd.footstep, 0.1);
      }
    }

    registry.inc('Movement.iterations', 1);
  });
}

/* ======================= Internal Structures & Helpers ======================= */

/**
 * @typedef {Object} Store
 * @property {ComponentName} name
 * @property {number[]} ids
 * @property {Object[]} data
 * @property {Map<number, number>} indices
 * @property {number[]} sortedIds
 * @property {boolean} dirtySorted
 * @property {number} lastSortTick
 */

/**
 * Create an empty component store
 * @param {ComponentName} name
 * @returns {Store}
 */
function createStore(name) {
  return {
    name,
    ids: [],
    data: [],
    indices: new Map(),
    sortedIds: [],
    dirtySorted: true,
    lastSortTick: -1,
  };
}

/**
 * Remove entity from a store with O(1) swap-remove
 * @param {Store} s
 * @param {EntityId} eid
 */
function storeRemove(s, eid) {
  const idx = s.indices.get(eid);
  if (idx === undefined) return;
  const lastIdx = s.ids.length - 1;
  const lastEid = s.ids[lastIdx];
  // Swap with last if not already last
  if (idx !== lastIdx) {
    s.ids[idx] = lastEid;
    s.data[idx] = s.data[lastIdx];
    s.indices.set(lastEid, idx);
  }
  // Pop
  s.ids.pop();
  s.data.pop();
  s.indices.delete(eid);
  s.dirtySorted = true;
}

/**
 * Ensure a named store exists on a registry. Used by registerKnownComponents.
 * @param {Registry} registry
 * @param {ComponentName} name
 */
function ensureStoreForRegistry(registry, name) {
  // Try a harmless op to force store creation: adding and removing to a temp entity is noisy.
  // Instead, reach into internal helper via add/remove improbable name.
  // We simulate by adding and removing on a dead eid path that creates store but doesn't store data.
  const r = /** @type {any} */ (registry);
  if (!r || !r.schemas) return;
  // Access internal stores via calling add then remove guarded by alive check; to avoid that, we reflectively ensure store creation by calling a private creator.
  // Since we can't access its closure, emulate by adding and catching dev error harmlessly.
  try {
    // Most registries are 'dev' and will throw for dead eid; we don't care. We only want ensureStore called.
    r.add(0, name, {});
  } catch {
    // ignore
  }
}

/**
 * Sort comparator for numeric ascending
 */
function numberAsc(a, b) {
  return a - b;
}

/**
 * Warn helper with per-key throttling
 */
function createWarnLimiter() {
  const counts = new Map();
  const LIMIT = 10;
  return {
    warnOnce(key, msg) {
      if (counts.has(key)) return;
      counts.set(key, 1);
      console.warn(msg);
    },
    warnThrottled(key, msg) {
      const c = counts.get(key) || 0;
      if (c < LIMIT) {
        console.warn(msg);
        counts.set(key, c + 1);
      } else if (c === LIMIT) {
        console.warn(`Further warnings suppressed for "${key}"`);
        counts.set(key, c + 1);
      }
      // beyond LIMIT+1: silent
    },
  };
}

/**
 * Clamp a number with NaN/Inf guard and default fallback.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {number} def
 * @returns {number}
 */
function clampNumber(value, min, max, def) {
  if (!isFiniteNumber(value)) return def;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * @param {any} v
 * @returns {boolean}
 */
function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Sanitize a property according to a simplified JSON-schema-like prop def.
 * Supports: type: 'number'|'integer'|'string'|'boolean', enum: [], minimum, maximum, default
 * @param {string} comp
 * @param {string} key
 * @param {any} val
 * @param {any} propDef
 * @param {{ warnOnce: (k:string,m:string)=>void, warnThrottled: (k:string,m:string)=>void }} warnLimiter
 * @param {'dev'|'prod'} mode
 * @param {(k: string, by?: number) => void} inc
 */
function sanitizeByPropDef(comp, key, val, propDef, warnLimiter, mode, inc) {
  const t = propDef && typeof propDef.type === 'string' ? propDef.type : null;
  const hasEnum = Array.isArray(propDef && propDef.enum);
  let out = val;

  // Type handling
  if (t === 'number' || t === 'integer') {
    if (!isFiniteNumber(out)) {
      if (mode === 'dev') {
        throw new Error(`Component "${comp}" field "${key}" expects ${t}, got ${typeof val}`);
      } else {
        warnLimiter.warnThrottled(`type_${comp}_${key}`, `Component "${comp}" field "${key}" expects ${t}; corrected to default.`);
        out = propDef && propDef.default !== undefined ? propDef.default : 0;
        inc('Guards.corrected', 1);
      }
    }
    if (t === 'integer') {
      out = Math.trunc(out);
    }
    if (isFiniteNumber(out)) {
      if (typeof propDef.minimum === 'number' && out < propDef.minimum) {
        out = propDef.minimum;
      }
      if (typeof propDef.maximum === 'number' && out > propDef.maximum) {
        out = propDef.maximum;
      }
    }
  } else if (t === 'string') {
    if (typeof out !== 'string') {
      if (mode === 'dev') {
        throw new Error(`Component "${comp}" field "${key}" expects string, got ${typeof val}`);
      } else {
        warnLimiter.warnThrottled(`type_${comp}_${key}`, `Component "${comp}" field "${key}" expects string; corrected to default.`);
        out = propDef && propDef.default !== undefined ? String(propDef.default) : '';
        inc('Guards.corrected', 1);
      }
    }
  } else if (t === 'boolean') {
    if (typeof out !== 'boolean') {
      if (mode === 'dev') {
        throw new Error(`Component "${comp}" field "${key}" expects boolean, got ${typeof val}`);
      } else {
        warnLimiter.warnThrottled(`type_${comp}_${key}`, `Component "${comp}" field "${key}" expects boolean; corrected to default.`);
        out = propDef && propDef.default !== undefined ? !!propDef.default : false;
        inc('Guards.corrected', 1);
      }
    }
  } else if (t != null) {
    // Unknown type
    if (mode === 'dev') {
      throw new Error(`Component "${comp}" field "${key}" has unsupported type "${t}"`);
    } else {
      warnLimiter.warnThrottled(`type_${comp}_${key}`, `Component "${comp}" field "${key}" has unsupported type "${t}"`);
    }
  }

  // Enum handling
  if (hasEnum) {
    const list = propDef.enum;
    if (!list.includes(out)) {
      if (mode === 'dev') {
        throw new Error(`Component "${comp}" field "${key}" must be one of ${JSON.stringify(list)}, got ${JSON.stringify(out)}`);
      } else {
        warnLimiter.warnThrottled(`enum_${comp}_${key}`, `Component "${comp}" field "${key}" coerced to first enum value.`);
        out = list[0];
        inc('Guards.corrected', 1);
      }
    }
  }

  return out;
}

/**
 * Provide default for property based on simplified propDef
 * @param {any} propDef
 */
function defaultForProp(propDef) {
  if (propDef && propDef.default !== undefined) return propDef.default;
  const t = propDef && typeof propDef.type === 'string' ? propDef.type : null;
  switch (t) {
    case 'number':
    case 'integer':
      return 0;
    case 'string':
      return '';
    case 'boolean':
      return false;
    default:
      return null;
  }
}

/**
 * Resolve max speed value from components, if present.
 * @param {any} vel
 * @param {any} pos
 * @returns {number}
 */
function resolveMaxSpeed(vel, pos) {
  const v = vel && isFiniteNumber(vel.max_speed) ? vel.max_speed : null;
  if (v != null) return v;
  const p = pos && isFiniteNumber(pos.max_speed) ? pos.max_speed : null;
  if (p != null) return p;
  return 0;
}

/**
 * TODOs / Future Hooks:
 * - Archetype-based optimizer for hot queries.
 * - Snapshot/restore registry state for save/load.
 * - Pluggable microprofiler sink for per-system timings.
 * - Bevy bridge: explore mapping component stores to Rust WASM.
 */