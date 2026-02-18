/**
 * src/core/ecs-registry.js
 * A minimal, deterministic, dense-store ECS Registry with scheduler and event bus.
 * Pure ESM module; no external deps.
 *
 * JSDoc example usage:
 *
 * import EcsRegistry, { createDefaultRegistry, Stages, Components } from './ecs-registry.js';
 *
 * const world = createDefaultRegistry();
 * const e = world.createEntity();
 * world.add(e, Components.position, { x: 0, y: 0 });
 * world.add(e, Components.velocity, { vx: 1, vy: 0 });
 * world.register(Stages.PrePhysics, (w, dt) => {/* ... */}, 'CustomSystem');
 * world.tick(1/60);
 */

const dev = (() => {
  try {
    // Safe check for common Node env; browsers normally have no process
    return typeof process !== 'undefined' &&
      process &&
      process.env &&
      process.env.NODE_ENV !== 'production';
  } catch (_) {
    return false;
  }
})();

/**
 * Deterministic pipeline stages.
 */
export const Stages = Object.freeze({
  Input: 'Input',
  PrePhysics: 'PrePhysics',
  Gameplay: 'Gameplay',
  Events: 'Events',
  RenderPrep: 'RenderPrep',
  Order: ['Input', 'PrePhysics', 'Gameplay', 'Events', 'RenderPrep'],
});

/**
 * Stable event keys for bus.
 */
export const Events = Object.freeze({
  MineHitEvent: 'MineHitEvent',
  DamageEvent: 'DamageEvent',
  FootstepEvent: 'FootstepEvent',
  PlaySfxEvent: 'PlaySfxEvent',
  UiCommand: 'UiCommand',
  TelegraphStartEvent: 'TelegraphStartEvent',
  PoiseBreakEvent: 'PoiseBreakEvent',
  HitStopEvent: 'HitStopEvent',
});

/**
 * Stable component key strings.
 */
export const Components = Object.freeze({
  position: 'position',
  velocity: 'velocity',
  collider: 'collider',
  tile: 'tile',
  ore_vein: 'ore_vein',
  health: 'health',
  stamina: 'stamina',
  damageable: 'damageable',
  inventory: 'inventory',
  tool: 'tool',
  faction: 'faction',
  sprite_ref: 'sprite_ref',
  light: 'light',
  sound_emitter: 'sound_emitter',
  ui_state: 'ui_state',
});

/**
 * Internal: monotonic-ish clock in ms.
 */
function nowMs() {
  if (typeof performance !== 'undefined' && performance && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
}

/**
 * Light, dev-only validator util.
 * SchemaLike: { fields: { [key: string]: 'number'|'string'|'boolean'|'object' } }
 */
function validateShapeDev(compName, data, schema, warnOnce) {
  if (!schema || !schema.fields || typeof data !== 'object' || data === null) return true;
  const fields = schema.fields;
  let ok = true;
  for (const k in fields) {
    const want = fields[k];
    const have = typeof data[k];
    const pass = (want === 'array')
      ? Array.isArray(data[k])
      : have === want || (want === 'number' && Number.isFinite(data[k]));
    if (!pass) {
      ok = false;
      if (dev) warnOnce(`schema:${compName}:${k}`, `ECS add(): component "${compName}" field "${k}" expected ${want}, got ${have}`);
    }
  }
  return ok;
}

/**
 * Dense component store factory.
 */
function makeStore() {
  return {
    ids: [],          // dense eid array
    data: [],         // dense data parallel to ids
    index: new Map(), // eid -> dense index
    sortedIds: null,  // cached ascending snapshot, invalidated on mutation
  };
}

/**
 * ECS Registry: entities, components, scheduler, and event bus.
 */
export default class EcsRegistry {
  constructor() {
    // entity core
    this.nextId = 1;
    this.freelist = [];
    this._alive = new Set();
    this._entityToComps = new Map();

    // components
    this._stores = new Map();
    this._schemas = Object.create(null);

    // scheduler
    this._systems = {
      [Stages.Input]: [],
      [Stages.PrePhysics]: [],
      [Stages.Gameplay]: [],
      [Stages.Events]: [],
      [Stages.RenderPrep]: [],
    };

    // resources and bus
    this._resources = new Map();
    this.bus = this._makeBus();

    // counters
    this.counters = { systems: Object.create(null) };

    // dev warnings once-per-key
    this._warned = new Set();

    // last dt
    this._lastDt = 0;
  }

  // ---------- utils ----------
  _warnOnce(key, msg) {
    if (!dev) return;
    if (this._warned.has(key)) return;
    this._warned.add(key);
    // eslint-disable-next-line no-console
    console.warn(msg);
  }

  _ensureStore(name) {
    let s = this._stores.get(name);
    if (!s) {
      s = makeStore();
      this._stores.set(name, s);
    }
    return s;
  }

  _invalidateSorted(store) {
    store.sortedIds = null;
  }

  _getOrCreateEntitySet(eid) {
    let set = this._entityToComps.get(eid);
    if (!set) {
      set = new Set();
      this._entityToComps.set(eid, set);
    }
    return set;
  }

  // ---------- Entity API ----------
  createEntity() {
    const id = this.freelist.length > 0 ? this.freelist.pop() : this.nextId++;
    this._alive.add(id);
    // ensure entity map exists for bookkeeping
    this._getOrCreateEntitySet(id);
    return id;
  }

  destroyEntity(eid) {
    if (!this._alive.has(eid)) return;
    const comps = this._entityToComps.get(eid);
    if (comps && comps.size > 0) {
      const list = Array.from(comps);
      for (let i = 0; i < list.length; i++) {
        this.remove(eid, list[i]);
      }
    }
    this._entityToComps.delete(eid);
    this._alive.delete(eid);
    this.freelist.push(eid);
  }

  isAlive(eid) {
    return this._alive.has(eid);
  }

  // ---------- Component API ----------
  add(eid, componentName, data) {
    if (!this._alive.has(eid)) {
      if (dev) this._warnOnce(`add:dead:${eid}`, `ECS add(): eid ${eid} is not alive`);
      return;
    }
    if (typeof componentName !== 'string' || componentName.length === 0) {
      if (dev) this._warnOnce(`add:badname`, `ECS add(): invalid component name "${componentName}"`);
      return;
    }
    if (dev) {
      const schema = this._schemas[componentName];
      validateShapeDev(componentName, data, schema, this._warnOnce.bind(this));
    }

    const store = this._ensureStore(componentName);
    if (store.index.has(eid)) {
      // overwrite data in place (idempotent, no layout change)
      const idx = store.index.get(eid);
      store.data[idx] = data;
      return;
    }
    const idx = store.ids.length;
    store.ids.push(eid);
    store.data.push(data);
    store.index.set(eid, idx);
    this._invalidateSorted(store);

    // bookkeeping
    this._getOrCreateEntitySet(eid).add(componentName);
  }

  remove(eid, componentName) {
    const store = this._stores.get(componentName);
    if (!store) return;
    const idx = store.index.get(eid);
    if (idx === undefined) return;

    const lastIdx = store.ids.length - 1;
    const lastEid = store.ids[lastIdx];

    // swap-remove dense
    if (idx !== lastIdx) {
      store.ids[idx] = lastEid;
      store.data[idx] = store.data[lastIdx];
      store.index.set(lastEid, idx);
    }
    store.ids.pop();
    store.data.pop();
    store.index.delete(eid);
    this._invalidateSorted(store);

    // bookkeeping
    const set = this._entityToComps.get(eid);
    if (set) set.delete(componentName);
  }

  get(eid, componentName) {
    const store = this._stores.get(componentName);
    if (!store) return undefined;
    const idx = store.index.get(eid);
    if (idx === undefined) return undefined;
    return store.data[idx];
  }

  has(eid, componentName) {
    const store = this._stores.get(componentName);
    return !!store && store.index.has(eid);
  }

  /**
   * View iterator over entities that include all components in `include`,
   * excluding any that have components in `exclude`.
   * Iteration order is strictly ascending by eid, driven by the smallest include store.
   * @param {string[]} include required component names
   * @param {string[]} [exclude] optional excluded component names
   * @returns {Iterable<{eid:number, comps:object[]}>}
   */
  view(include, exclude) {
    const inc = Array.isArray(include) ? include : [];
    const exc = Array.isArray(exclude) ? exclude : [];
    if (inc.length === 0) {
      // empty include => empty view
      return (function* () {})();
    }

    // choose smallest driver store by ids length
    let driverName = inc[0];
    let driverStore = this._ensureStore(driverName);
    let minLen = driverStore.ids.length;
    for (let i = 1; i < inc.length; i++) {
      const s = this._ensureStore(inc[i]);
      if (s.ids.length < minLen) {
        driverStore = s;
        driverName = inc[i];
        minLen = s.ids.length;
      }
    }

    // ensure sorted snapshot
    if (driverStore.sortedIds === null) {
      // copy + sort ascending
      const copy = driverStore.ids.slice();
      copy.sort((a, b) => a - b);
      driverStore.sortedIds = copy;
    }
    const sorted = driverStore.sortedIds;
    const self = this;

    return (function* () {
      const includeStores = inc.map((n) => self._ensureStore(n));
      const excludeStores = exc.map((n) => self._ensureStore(n));
      for (let i = 0; i < sorted.length; i++) {
        const eid = sorted[i];
        if (!self._alive.has(eid)) continue;

        // driver membership is implied by snapshot; verify other includes
        let ok = true;
        for (let j = 0; j < includeStores.length; j++) {
          const s = includeStores[j];
          if (!s.index.has(eid)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        for (let j = 0; j < excludeStores.length; j++) {
          const s = excludeStores[j];
          if (s.index.has(eid)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;

        const comps = new Array(inc.length);
        for (let j = 0; j < inc.length; j++) {
          const s = includeStores[j];
          const idx = s.index.get(eid);
          comps[j] = s.data[idx];
        }
        yield { eid, comps };
      }
    })();
  }

  /**
   * Set schemas for components for light dev-time validation.
   * @param {Record<string, {fields?:Record<string,string>}>} map
   */
  setSchemas(map) {
    if (!map || typeof map !== 'object') return;
    this._schemas = Object.assign(Object.create(null), map);
  }

  /**
   * Returns internal component store reference for tests/dev.
   */
  getDebugStore(name) {
    return this._stores.get(name);
  }

  // ---------- Resources ----------
  setResource(key, value) {
    this._resources.set(key, value);
  }
  getResource(key) {
    return this._resources.get(key);
  }
  hasResource(key) {
    return this._resources.has(key);
  }

  // ---------- Scheduler ----------
  /**
   * Register a system in a stage. Systems within a stage run in registration order.
   * @param {string} stage one of Stages.*
   * @param {(world:EcsRegistry, dt:number)=>void} systemFn
   * @param {string} [name] optional display/counter name
   * @returns {()=>void} unregister function
   */
  register(stage, systemFn, name) {
    if (!Stages.Order.includes(stage)) {
      if (dev) this._warnOnce(`register:stage:${stage}`, `ECS register(): unknown stage "${stage}"`);
      // still register into Gameplay as fallback
      stage = Stages.Gameplay;
    }
    const sysName = String(name || systemFn.name || 'system');
    const entry = { fn: systemFn, name: sysName };
    const arr = this._systems[stage];
    arr.push(entry);
    const self = this;
    let active = true;
    return function unregister() {
      if (!active) return;
      active = false;
      const idx = arr.indexOf(entry);
      if (idx >= 0) arr.splice(idx, 1);
    };
  }

  /**
   * Advance the world by dt seconds. Clamps dt to [0, 0.1].
   * Executes stages in fixed order.
   * @param {number} dtSec
   */
  tick(dtSec) {
    let dt = Number(dtSec);
    if (!Number.isFinite(dt) || dt < 0) {
      if (dev) this._warnOnce('tick:dt', `ECS tick(): invalid dt "${dtSec}", coercing to 0`);
      dt = 0;
    }
    if (dt > 0.1) dt = 0.1;
    this._lastDt = dt;

    // run stages in order
    for (let si = 0; si < Stages.Order.length; si++) {
      const stage = Stages.Order[si];
      const systems = this._systems[stage];
      for (let i = 0; i < systems.length; i++) {
        const { fn, name } = systems[i];
        const t0 = nowMs();
        fn(this, dt);
        const t1 = nowMs();
        let entry = this.counters.systems[name];
        if (!entry) {
          entry = this.counters.systems[name] = { calls: 0, totalTimeMs: 0 };
        }
        entry.calls++;
        entry.totalTimeMs += (t1 - t0);
      }
    }

    // clear events across ticks to ensure no cross-tick persistence
    this.bus.clear();
  }

  // ---------- Event bus ----------
  _makeBus() {
    const queues = new Map();
    return {
      emit(type, payload) {
        const t = String(type);
        let q = queues.get(t);
        if (!q) {
          q = [];
          queues.set(t, q);
        }
        q.push(payload);
      },
      drain(type) {
        const t = String(type);
        const q = queues.get(t);
        if (!q || q.length === 0) {
          queues.set(t, []);
          return [];
        }
        queues.set(t, []);
        return q;
      },
      peekCount(type) {
        const q = queues.get(String(type));
        return q ? q.length : 0;
      },
      clear(type) {
        if (typeof type === 'string') {
          queues.set(type, []);
          return;
        }
        // clear all
        queues.forEach((_, k) => queues.set(k, []));
      },
    };
  }
}

/**
 * Reference MovementSystem (production-safe).
 * - Iterates entities with position+velocity.
 * - Integrates: pos += vel * dt, clamps velocity by optional max_speed.
 * - Emits FootstepEvent on a simple per-entity cooldown (240ms).
 * @param {EcsRegistry} registry
 * @param {number} dt
 */
function MovementSystem(registry, dt) {
  const posK = Components.position;
  const velK = Components.velocity;

  // cooldown resource map: eid -> nextStepAtMs
  const cooldownKey = '__footstepCooldowns';
  let cooldowns = registry.getResource(cooldownKey);
  if (!cooldowns) {
    cooldowns = new Map();
    registry.setResource(cooldownKey, cooldowns);
  }

  const now = nowMs();
  const STEP_MS = 240;

  for (const { eid, comps } of registry.view([posK, velK])) {
    const pos = comps[0];
    const vel = comps[1];

    // sanitize numbers
    let x = Number(pos.x); if (!Number.isFinite(x)) x = 0;
    let y = Number(pos.y); if (!Number.isFinite(y)) y = 0;
    let vx = Number(vel.vx); if (!Number.isFinite(vx)) vx = 0;
    let vy = Number(vel.vy); if (!Number.isFinite(vy)) vy = 0;

    // clamp speed if max_speed present on velocity or position
    let maxS = Number.isFinite(vel.max_speed) ? Number(vel.max_speed)
              : Number.isFinite(pos.max_speed) ? Number(pos.max_speed)
              : undefined;
    if (Number.isFinite(maxS) && maxS > 0) {
      const sp2 = vx * vx + vy * vy;
      const ms2 = maxS * maxS;
      if (sp2 > ms2) {
        const s = Math.sqrt(sp2) || 1;
        const k = maxS / s;
        vx *= k; vy *= k;
        vel.vx = vx; vel.vy = vy; // keep velocity consistent if clamped
      }
    }

    // integrate
    x += vx * dt;
    y += vy * dt;

    // write back
    pos.x = x; pos.y = y;

    // simple footstep emission when moving
    const speed = Math.sqrt(vx * vx + vy * vy);
    if (speed > 0.01) {
      const nextAt = cooldowns.get(eid) || 0;
      if (now >= nextAt) {
        registry.bus.emit(Events.FootstepEvent, { eid });
        cooldowns.set(eid, now + STEP_MS);
      }
    }
  }
}

/**
 * Create a default registry and register core reference systems.
 * @returns {EcsRegistry}
 */
export function createDefaultRegistry() {
  const world = new EcsRegistry();
  world.register(Stages.PrePhysics, MovementSystem, 'Movement');
  return world;
}

/**
 * Simple benchmark helper.
 * Spawns entities with position+velocity+health, runs a tight tick loop.
 * @param {{entities?:number, seconds?:number}} [opts]
 * @returns {Promise<{avgHz:number,totalTicks:number,systems:Record<string,{calls:number,totalTimeMs:number}>}>}
 */
export async function benchmarkSimple({ entities = 10000, seconds = 3 } = {}) {
  const world = createDefaultRegistry();

  // trivial systems to simulate load
  function HealthTouchSystem(w, dt) {
    for (const { comps } of w.view([Components.health])) {
      // touch without doing anything meaningful
      const h = comps[0];
      // noop field read/write to prevent DCE in some environments
      h.hp = Number.isFinite(h.hp) ? h.hp : 100;
    }
  }
  function CounterSystem(w, dt) {
    const key = '__benchCounter';
    let c = w.getResource(key) || 0;
    c += 1;
    w.setResource(key, c);
  }

  world.register(Stages.Gameplay, HealthTouchSystem, 'HealthTouch');
  world.register(Stages.RenderPrep, CounterSystem, 'Counter');

  // Spawn entities
  for (let i = 0; i < entities; i++) {
    const e = world.createEntity();
    world.add(e, Components.position, { x: 0, y: 0 });
    // light variation in velocities
    const ang = (i % 360) * (Math.PI / 180);
    world.add(e, Components.velocity, { vx: Math.cos(ang), vy: Math.sin(ang), max_speed: 2 });
    world.add(e, Components.health, { hp: 100 });
  }

  const tStart = nowMs();
  const targetMs = seconds * 1000;
  let totalTicks = 0;
  const dt = 1 / 120;

  // tight loop
  while ((nowMs() - tStart) < targetMs) {
    world.tick(dt);
    totalTicks++;
    // Intentional no await/sleep; tight profiling loop
  }
  const elapsed = Math.max(1e-6, (nowMs() - tStart) / 1000);
  const avgHz = totalTicks / elapsed;

  return { avgHz, totalTicks, systems: world.counters.systems };
}