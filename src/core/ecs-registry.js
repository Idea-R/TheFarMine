'use strict';

/*
  The Far Mine - Core Systems: MVP ECS Registry
  Purpose: Minimal, deterministic, engine-agnostic ECS with events and stages for Sprint 1.
  Mirrors: docs/core-systems/ecs-architecture.md (P4/P6 mapping)
  Author: alpha (Ironforge)
  Version: v0.1

  License: This source is part of The Far Mine. See project license.
*/

/**
 * JSDoc typedefs and interfaces
 */

/**
 * @typedef {number} EntityId
 */

/**
 * @typedef {string} ComponentName
 */

/**
 * Lightweight schema definition for dev-time validation.
 * Two supported forms:
 *  - Flat props map: { x:'number', y:'number', label:'string?', nested:{...} }
 *      - Suffix '?' marks property optional (not required).
 *      - Supported primitive types: 'number', 'string', 'boolean', 'object', 'array'
 *      - For nested objects, you can provide a nested SchemaDef object instead of a string type.
 *  - Explicit form: { props: { ... same as flat form ... } }
 * Notes:
 *  - This is a soft validator; it warns in dev mode only and never throws in prod.
 *  - It is not JSON Schema; it's a tiny helper for catching obvious errors early.
 * @typedef {Object<string, (string|SchemaDef)> & {props?: Object<string, (string|SchemaDef)>>} SchemaDef
 */

/**
 * @callback SystemFn
 * @param {Registry} registry
 * @param {number} dtSec
 * @returns {void}
 */

/**
 * @typedef {Object} View
 * @property {(cb: (eid: EntityId, ...comps: any[]) => void) => void} each
 * @property {() => number} size
 */

/**
 * @typedef {Object} Registry
 * @property {Set<EntityId>} _alive Internal: set of alive entity ids
 * @property {Map<string, any>} _resources Internal: named global resources
 * @property {Map<string, number>} counters Internal: diagnostic counters
 * @property {'dev'|'prod'} _mode Internal: mode
 * @property {EventBus} bus Event bus instance
 * @property {Map<ComponentName, any>} _stores Internal: component stores map
 * @property {Record<string, SchemaDef>} _schemas Internal: dev-time schemas
 * @property {Array<Array<SystemFn>>} _systems Internal: systems per stage
 * @property {number} _nextEid Internal: next eid to allocate
 * @property {Array<EntityId>} _freelist Internal: free entity id stack
 * @property {Map<number, any>} _ephemeral Internal: optional per-entity cache (JS cannot WeakMap<number>)
 * @property {() => EntityId} createEntity Create and return a new entity id
 * @property {(eid: EntityId) => void} destroyEntity Destroy an entity and remove all its components
 * @property {(eid: EntityId) => boolean} isAlive Check if an entity is alive
 * @property {(eid: EntityId, name: ComponentName, data: any) => void} add Add or replace a component on an entity
 * @property {(eid: EntityId, name: ComponentName) => void} remove Remove a component from an entity
 * @property {(eid: EntityId, name: ComponentName) => any|null} get Get component payload or null
 * @property {(eid: EntityId, name: ComponentName) => boolean} has Check component presence
 * @property {(map: Record<string, SchemaDef>) => void} setSchemas Set dev-time schemas
 * @property {(include: ComponentName[], exclude?: ComponentName[]) => View} view Create a view over entities matching components
 * @property {(stage: number, fn: SystemFn) => void} register Register a system function at a given stage
 * @property {(dtSec: number) => void} tick Advance simulation by dt; calls systems in stage order
 * @property {(name: string, obj: any) => void} setResource Set a global resource
 * @property {(name: string) => any|undefined} getResource Get a global resource
 * @property {(name: string) => boolean} hasResource Check global resource presence
 * @property {(name: string) => any|null} getDebugStore Dev-only: get internal store for tests
 * @property {(key: string, by?: number) => void} inc Increment a counter by key
 * @property {() => void} resetCounters Reset/clear diagnostic counters
 */

/**
 * Stages enum-like object
 */
const Stages = Object.freeze({
  Input: 0,
  PrePhysics: 1,
  Gameplay: 2,
  Events: 3,
  RenderPrep: 4,
});

/**
 * Canonical Event Types used across Sprint 1
 */
const EventTypes = Object.freeze({
  MineHitEvent: 'MineHitEvent',
  DamageEvent: 'DamageEvent',
  FootstepEvent: 'FootstepEvent',
  PlaySfxEvent: 'PlaySfxEvent',
  UiCommand: 'UiCommand',
});

/**
 * Internal Store class: dense storage for a single component type.
 * - Dense arrays: ids[] and data[] kept 1:1
 * - index: eid -> dense index
 * - sortedIds: lazily built ascending snapshot of ids for deterministic iteration
 * - swap-append and swap-remove keep arrays dense
 * - dirty flag invalidates sortedIds
 */
class Store {
  /**
   * @param {ComponentName} name
   */
  constructor(name) {
    /** @type {ComponentName} */
    this.name = name;
    /** @type {EntityId[]} */
    this.ids = [];
    /** @type {any[]} */
    this.data = [];
    /** @type {Map<EntityId, number>} */
    this.index = new Map();
    /** @type {EntityId[]|null} */
    this.sortedIds = null;
    /** @type {boolean} */
    this._dirty = false;
  }

  /**
   * Add or replace component for eid
   * @param {EntityId} eid
   * @param {any} value
   */
  add(eid, value) {
    if (this.index.has(eid)) {
      const i = this.index.get(eid);
      this.data[i] = value;
      return;
    }
    const i = this.ids.length;
    this.ids.push(eid);
    this.data.push(value);
    this.index.set(eid, i);
    this._markDirty();
  }

  /**
   * Remove component from eid if present (swap-remove)
   * @param {EntityId} eid
   */
  remove(eid) {
    const idx = this.index.get(eid);
    if (idx === undefined) return;
    const lastIdx = this.ids.length - 1;
    if (idx !== lastIdx) {
      const lastEid = this.ids[lastIdx];
      const lastData = this.data[lastIdx];
      this.ids[idx] = lastEid;
      this.data[idx] = lastData;
      this.index.set(lastEid, idx);
    }
    // pop last
    this.ids.pop();
    this.data.pop();
    this.index.delete(eid);
    this._markDirty();
  }

  /**
   * @param {EntityId} eid
   * @returns {any|null}
   */
  get(eid) {
    const idx = this.index.get(eid);
    return idx === undefined ? null : this.data[idx];
  }

  /**
   * @param {EntityId} eid
   * @returns {boolean}
   */
  has(eid) {
    return this.index.has(eid);
  }

  /**
   * Deterministic ascending-eid iteration with snapshot memoization.
   * @param {(eid: EntityId) => void} cb
   */
  eachSorted(cb) {
    if (!this.sortedIds || this._dirty) {
      // snapshot and sort by ascending eid
      this.sortedIds = this.ids.slice().sort((a, b) => a - b);
      this._dirty = false;
    }
    const snapshot = this.sortedIds;
    for (let i = 0; i < snapshot.length; i++) {
      cb(snapshot[i]);
    }
  }

  _markDirty() {
    this._dirty = true;
    // do not rebuild sortedIds now; leave it lazy
  }
}

/**
 * EventBus with per-type FIFO queues and deterministic drain order (insertion order maintained).
 * Never reorders within a tick; queues persist until drained or cleared.
 */
class EventBus {
  /**
   * @param {(type: string) => void} [onEmit]
   * @param {(type: string, count: number) => void} [onDrain]
   */
  constructor(onEmit, onDrain) {
    /** @type {Map<string, any[]>} */
    this._queues = new Map();
    this._onEmit = onEmit || null;
    this._onDrain = onDrain || null;
  }

  /**
   * Emit an event
   * @param {string} type
   * @param {any} payload
   */
  emit(type, payload) {
    let q = this._queues.get(type);
    if (!q) {
      q = [];
      this._queues.set(type, q);
    }
    q.push(payload);
    if (this._onEmit) this._onEmit(type);
  }

  /**
   * Drain all events of a type in FIFO order
   * @param {string} type
   * @param {(payload: any) => void} fn
   * @returns {number} drained count
   */
  drain(type, fn) {
    const q = this._queues.get(type);
    if (!q || q.length === 0) {
      if (this._onDrain) this._onDrain(type, 0);
      return 0;
    }
    const snapshot = q.slice(); // deterministic
    q.length = 0; // clear
    for (let i = 0; i < snapshot.length; i++) {
      fn(snapshot[i]);
    }
    const drained = snapshot.length;
    if (this._onDrain) this._onDrain(type, drained);
    return drained;
  }

  /**
   * Clear events for a type or all
   * @param {string} [type]
   */
  clear(type) {
    if (typeof type === 'string') {
      this._queues.delete(type);
      return;
    }
    this._queues.clear();
  }
}

/**
 * Internal helpers
 */

/**
 * Clamp a number into [min, max]
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(v, min, max) {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

/**
 * Is finite number guard
 * @param {any} v
 * @returns {v is number}
 */
function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

/**
 * Choose the driver store (fewest entities). Ties broken by name lex order.
 * @param {Map<ComponentName, Store>} stores
 * @param {ComponentName[]} include
 * @returns {{store: Store|null, missing: ComponentName[]}}
 */
function chooseDriverStore(stores, include) {
  let driver = null;
  let driverName = null;
  let minLen = Infinity;
  const missing = [];
  for (let i = 0; i < include.length; i++) {
    const name = include[i];
    const s = stores.get(name);
    if (!s) {
      missing.push(name);
      continue;
    }
    const size = s.ids.length;
    if (size < minLen) {
      minLen = size;
      driver = s;
      driverName = name;
    } else if (size === minLen && driverName !== null) {
      // tie-breaker by lexicographic name
      if (name < driverName) {
        driver = s;
        driverName = name;
      }
    }
  }
  if (driver === null && missing.length === 0) {
    // This can happen if include is empty; not expected for queries here
    return { store: null, missing: [] };
  }
  return { store: driver, missing };
}

/**
 * Ensure a store exists for component name
 * @param {Map<ComponentName, Store>} stores
 * @param {ComponentName} name
 * @returns {Store}
 */
function ensureStore(stores, name) {
  let s = stores.get(name);
  if (!s) {
    s = new Store(name);
    stores.set(name, s);
  }
  return s;
}

/**
 * Validate data against schema in dev mode.
 * Returns { ok, warnings[] }.
 * - Warns about missing required properties, and type mismatches.
 * - For type strings with '?', property is optional.
 * - For nested schema (object instead of string), recursively validate.
 * @param {string} name
 * @param {any} data
 * @param {SchemaDef} schema
 * @param {'dev'|'prod'} mode
 * @returns {{ok: boolean, warnings: string[]}}
 */
function validateAgainstSchema(name, data, schema, mode) {
  /** @type {string[]} */
  const warnings = [];
  if (mode !== 'dev') return { ok: true, warnings };

  if (typeof data !== 'object' || data == null || Array.isArray(data)) {
    warnings.push(`[ECS][${name}] component should be an object, got ${typeof data}`);
    return { ok: false, warnings };
  }

  const props = /** @type {Record<string, any>} */ (schema && schema.props ? schema.props : schema);
  if (!props || typeof props !== 'object') {
    // No schema content; nothing to validate
    return { ok: true, warnings };
  }

  const checkProp = (propName, expected, value, path) => {
    const stringType = typeof expected === 'string' ? expected : null;
    const isOptional = stringType ? stringType.endsWith('?') : false;
    const baseType = stringType ? (isOptional ? stringType.slice(0, -1) : stringType) : null;
    const fullPath = path.length ? `${path.join('.')}.${propName}` : propName;

    if (value === undefined || value === null) {
      if (!isOptional) {
        warnings.push(`[ECS][${name}] missing required field "${fullPath}"`);
      }
      return;
    }

    if (stringType) {
      // Primitive or special
      if (baseType === 'array') {
        if (!Array.isArray(value)) {
          warnings.push(`[ECS][${name}] field "${fullPath}" expected array, got ${typeof value}`);
        }
      } else if (baseType === 'number') {
        if (!isFiniteNumber(value)) {
          warnings.push(`[ECS][${name}] field "${fullPath}" expected finite number, got ${String(value)}`);
        }
      } else if (baseType === 'object') {
        if (typeof value !== 'object' || value == null || Array.isArray(value)) {
          warnings.push(`[ECS][${name}] field "${fullPath}" expected object, got ${Array.isArray(value) ? 'array' : typeof value}`);
        }
      } else {
        if (typeof value !== baseType) {
          warnings.push(`[ECS][${name}] field "${fullPath}" expected ${baseType}, got ${typeof value}`);
        }
      }
    } else if (expected && typeof expected === 'object') {
      // Nested schema
      const nestedProps = expected.props ? expected.props : expected;
      if (typeof value !== 'object' || value == null || Array.isArray(value)) {
        warnings.push(`[ECS][${name}] field "${fullPath}" expected object for nested schema`);
        return;
      }
      for (const k of Object.keys(nestedProps)) {
        checkProp(k, nestedProps[k], value[k], path.concat([propName]));
      }
    }
  };

  for (const key of Object.keys(props)) {
    checkProp(key, props[key], data[key], []);
  }

  return { ok: warnings.length === 0, warnings };
}

/**
 * Registry factory
 * @param {{mode?: 'dev'|'prod'}} [opts]
 * @returns {Registry}
 */
function createRegistry(opts) {
  const mode = (opts && opts.mode) === 'dev' ? 'dev' : 'prod';

  /** @type {Set<EntityId>} */
  const _alive = new Set();
  /** @type {Array<EntityId>} */
  const _freelist = [];
  let _nextEid = 1;

  /** @type {Map<ComponentName, Store>} */
  const _stores = new Map();
  /** @type {Record<string, SchemaDef>} */
  let _schemas = Object.create(null);
  /** @type {Array<Array<SystemFn>>} */
  const _systems = [[], [], [], [], []]; // per Stages
  /** @type {Map<string, any>} */
  const _resources = new Map();
  /** @type {Map<string, number>} */
  const counters = new Map();
  // Note: JS WeakMap cannot use numbers as keys; use Map<number, any> instead.
  /** @type {Map<number, any>} */
  const _ephemeral = new Map();

  // Event bus with counters integration
  const bus = new EventBus(
    (type) => {
      const key = `events.emitted.${type}`;
      const v = counters.get(key) || 0;
      counters.set(key, v + 1);
    },
    (type, count) => {
      const key = `events.drained.${type}`;
      const v = counters.get(key) || 0;
      counters.set(key, v + count);
    }
  );

  /** @type {Registry} */
  const registry = {
    _alive,
    _freelist,
    _nextEid,
    _stores,
    _schemas,
    _systems,
    _resources,
    bus,
    counters,
    _mode: mode,
    _ephemeral,

    createEntity() {
      let eid;
      if (_freelist.length > 0) {
        eid = /** @type {number} */ (_freelist.pop());
      } else {
        eid = _nextEid++;
      }
      _alive.add(eid);
      return eid;
    },

    destroyEntity(eid) {
      if (!_alive.has(eid)) return;
      // remove components from all stores
      _stores.forEach((store) => {
        if (store.has(eid)) store.remove(eid);
      });
      _alive.delete(eid);
      _freelist.push(eid);
      // cleanup ephemeral cache
      _ephemeral.delete(eid);
    },

    isAlive(eid) {
      return _alive.has(eid);
    },

    add(eid, name, data) {
      if (!_alive.has(eid)) return;
      if (mode === 'dev') {
        const schema = _schemas && _schemas[name];
        if (schema) {
          const res = validateAgainstSchema(name, data, schema, mode);
          if (!res.ok && res.warnings.length) {
            // soft warnings
            for (let i = 0; i < res.warnings.length; i++) {
              // eslint-disable-next-line no-console
              console.warn(res.warnings[i]);
            }
          }
        }
      }
      const store = ensureStore(_stores, name);
      store.add(eid, data);
    },

    remove(eid, name) {
      const s = _stores.get(name);
      if (!s) return;
      s.remove(eid);
    },

    get(eid, name) {
      const s = _stores.get(name);
      if (!s) return null;
      return s.get(eid);
    },

    has(eid, name) {
      const s = _stores.get(name);
      return !!(s && s.has(eid));
    },

    setSchemas(map) {
      _schemas = map || Object.create(null);
      this._schemas = _schemas;
    },

    view(include, exclude) {
      // Fast path: if any include store missing -> empty view
      const { store: driver, missing } = chooseDriverStore(_stores, include);
      if (missing.length > 0 || !driver) {
        // empty view
        return {
          each: () => {},
          size: () => 0,
        };
      }
      const excludeSet = new Set(exclude || []);
      const includeStores = include.map((n) => _stores.get(n) || null);

      const reg = this;
      // Provide a stable size() as driver size (upper-bound)
      const size = driver.ids.length;

      return {
        each(cb) {
          let iter = 0;
          let matched = 0;
          driver.eachSorted((eid) => {
            iter++;
            // must have all includes
            for (let i = 0; i < includeStores.length; i++) {
              const s = includeStores[i];
              if (!s || !s.has(eid)) {
                return;
              }
            }
            // must not have excluded
            for (const ex of excludeSet) {
              const maybe = _stores.get(ex);
              if (maybe && maybe.has(eid)) {
                return;
              }
            }
            // collect components in include-order
            const comps = new Array(include.length);
            for (let i = 0; i < include.length; i++) {
              const s = includeStores[i];
              comps[i] = s ? s.get(eid) : null;
            }
            matched++;
            cb(eid, ...comps);
          });
          reg.inc('queries.iterations', iter);
          reg.inc('queries.matches', matched);
        },
        size: () => size,
      };
    },

    register(stage, fn) {
      if (stage < 0 || stage >= _systems.length) {
        throw new Error(`ECS.register: invalid stage ${stage}`);
      }
      _systems[stage].push(fn);
    },

    tick(dtSec) {
      const dt = clamp(+dtSec || 0, 0, 0.1);
      for (let stage = 0; stage < _systems.length; stage++) {
        const list = _systems[stage];
        for (let i = 0; i < list.length; i++) {
          list[i](this, dt);
        }
        // After Events stage, we could clear one-shot ephemerals if needed.
        // Here we keep persistent ephemerals (e.g., footstep timers) by design.
      }
      // Update diagnostic counters
      this.counters.set('entities.alive', _alive.size);
      this.counters.set('stores.count', _stores.size);
    },

    setResource(name, obj) {
      _resources.set(name, obj);
    },

    getResource(name) {
      return _resources.get(name);
    },

    hasResource(name) {
      return _resources.has(name);
    },

    getDebugStore(name) {
      if (mode !== 'dev') return null;
      return _stores.get(name) || null;
    },

    inc(key, by) {
      const v = counters.get(key) || 0;
      counters.set(key, v + (by === undefined ? 1 : by));
    },

    resetCounters() {
      counters.clear();
    },
  };

  return registry;
}

/**
 * Reference MovementSystem
 * - Query: include ['position', 'velocity']
 * - Clamps dt to [0, 0.1]
 * - Optional max_speed on velocity: clamps velocity vector by scaling
 * - Integrates position += velocity * dt
 * - NaN/Inf guard: zeros non-finite values and increments 'movement.nan_guard'
 * - Emits FootstepEvent every 320ms while moving if entity has 'sprite_ref' or 'sound_emitter'
 *   Uses registry._ephemeral per-entity cache as { footstepTimer: number }
 * @type {SystemFn}
 */
function MovementSystem(registry, dtSec) {
  const dt = clamp(+dtSec || 0, 0, 0.1);
  const view = registry.view(['position', 'velocity']);

  const STEP_INTERVAL = 0.320; // seconds
  const EPS = 1e-3;

  view.each((eid, pos, vel) => {
    if (!pos || !vel) return;

    // Normalize component shapes
    let vx = isFiniteNumber(vel.x) ? vel.x : 0;
    let vy = isFiniteNumber(vel.y) ? vel.y : 0;

    // Clamp by max_speed if present
    let maxSpeed = undefined;
    if (isFiniteNumber(vel.max_speed)) {
      maxSpeed = vel.max_speed;
    } else if (isFiniteNumber(pos.max_speed)) {
      // fallback if someone put it in position
      maxSpeed = pos.max_speed;
    }
    const speed = Math.hypot(vx, vy);
    if (isFiniteNumber(maxSpeed) && maxSpeed > 0 && speed > maxSpeed) {
      const scale = maxSpeed / (speed || 1);
      vx *= scale;
      vy *= scale;
      // write back clamped velocities
      vel.x = vx;
      vel.y = vy;
    }

    // Integrate
    const dx = vx * dt;
    const dy = vy * dt;

    // Guards for non-finite deltas or pos
    let nanGuarded = false;
    if (!isFiniteNumber(pos.x)) {
      pos.x = 0;
      nanGuarded = true;
    }
    if (!isFiniteNumber(pos.y)) {
      pos.y = 0;
      nanGuarded = true;
    }

    if (!isFiniteNumber(dx)) {
      nanGuarded = true;
    } else {
      pos.x += dx;
    }
    if (!isFiniteNumber(dy)) {
      nanGuarded = true;
    } else {
      pos.y += dy;
    }
    if (nanGuarded) {
      registry.inc('movement.nan_guard', 1);
      if (!isFiniteNumber(vel.x)) vel.x = 0;
      if (!isFiniteNumber(vel.y)) vel.y = 0;
    }

    // Footstep emission if moving and has audio/sprite ref
    const canEmitStep = registry.has(eid, 'sprite_ref') || registry.has(eid, 'sound_emitter');
    if (canEmitStep && speed > EPS) {
      let cache = registry._ephemeral.get(eid);
      if (!cache) {
        cache = { footstepTimer: 0 };
        registry._ephemeral.set(eid, cache);
      }
      cache.footstepTimer = (cache.footstepTimer || 0) + dt;
      if (cache.footstepTimer >= STEP_INTERVAL) {
        cache.footstepTimer -= STEP_INTERVAL;
        registry.bus.emit(EventTypes.FootstepEvent, { entity: eid, material: 'rock' });
      }
    }
  });
}

/**
 * Inline usage example
 *
 * // Create registry
 * const reg = createRegistry({ mode: 'dev' });
 *
 * // Optional: set schemas
 * reg.setSchemas({
 *   position: { x: 'number', y: 'number' },
 *   velocity: { x: 'number', y: 'number', max_speed: 'number?' },
 *   sprite_ref: { id: 'string' },
 * });
 *
 * // Create an entity with position and velocity
 * const e = reg.createEntity();
 * reg.add(e, 'position', { x: 0, y: 0 });
 * reg.add(e, 'velocity', { x: 2, y: 0, max_speed: 4 });
 * reg.add(e, 'sprite_ref', { id: 'hero' });
 *
 * // Register systems
 * reg.register(Stages.Gameplay, MovementSystem);
 *
 * // Tick simulation
 * reg.tick(0.016); // ~16ms frame
 *
 * // Drain footstep events (none expected on first few frames)
 * reg.bus.drain(EventTypes.FootstepEvent, (evt) => {
 *   // Handle footstep
 * });
 *
 * // Access debug store in dev mode
 * const posStore = reg.getDebugStore('position');
 */

/**
 * Compatibility and testing notes:
 * - No DOM or Node globals required; works in Node and browser bundlers.
 * - Designed to be imported by unit tests under src/core/__tests__/ecs-registry.test.js.
 * - Component names aligned with docs and P4 decision:
 *   'position','velocity','collider','tile','ore_vein','health','stamina',
 *   'damageable','inventory','tool','faction','sprite_ref','light','sound_emitter','ui_state'
 */

// Public API exports
export { createRegistry, Stages, EventTypes, MovementSystem };