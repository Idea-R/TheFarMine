import componentSchemas from '../../data/core/component-schemas.json' assert { type: 'json' };

/**
 * The Far Mine - Core ECS Registry
 * Implementation aligned with:
 * - docs/core-systems/ecs-architecture.md
 * - data/core/component-schemas.json (version=1, 15 contiguous bits 0..14)
 *
 * Acceptance criteria highlights:
 * - ESM only; runs in modern browser/Phaser 3
 * - Deterministic query/view snapshots
 * - Bitmask operations limited to bits 0..14 for Sprint 1
 * - Component coercion/clamping per schema; dynamic clamp for Health/Stamina/Poise
 * - Archetypes: player, enemy, item, tile, projectile
 * - No external deps
 */

/**
 * @typedef {Object} ComponentField
 * @property {string} key
 * @property {'int'|'number'|'bool'|'string'|'object'} type
 * @property {number=} min
 * @property {number=} max
 * @property {string=} notes
 */

/**
 * @typedef {Object} ComponentSchema
 * @property {string} name
 * @property {number} bit
 * @property {Object<string, any>} defaults
 * @property {ComponentField[]} fields
 */

/**
 * @typedef {Object} RegistryDebug
 * @property {number} clampCount
 * @property {number} viewBuilds
 */

/**
 * @typedef {Object} Registry
 * @property {(type?: string, opts?: Object<string, Object>) => number} createEntity
 * @property {(id: number) => void} destroyEntity
 * @property {(id: number, name: string, data?: Object) => void} addComponent
 * @property {(id: number, name: string) => (Object|undefined)} getComponent
 * @property {(id: number, name: string) => boolean} hasComponent
 * @property {(id: number, name: string) => void} removeComponent
 * @property {(id: number, name: string, patch: Object) => void} applyPatch
 * @property {(id: number) => number} maskOf
 * @property {(requiredMask: number, excludeMask?: number) => number[]} query
 * @property {(includeNames: string[], excludeNames?: string[]) => { ids: number[], forEach: (fn: (bag: any) => void) => void }} view
 * @property {() => number} size
 * @property {RegistryDebug} _debug
 */

// ---------- Schema load and validation ----------

/**
 * Validate schemas against required constraints.
 * @param {any} raw
 * @returns {{version: number, list: ComponentSchema[]}}
 */
export function _validateSchemas(raw) {
  let version = 0;
  let list = null;
  if (Array.isArray(raw)) {
    // Tolerate raw array shape for older tooling (assume version 1).
    version = 1;
    list = raw;
  } else if (raw && typeof raw === 'object' && Array.isArray(raw.components)) {
    version = raw.version;
    list = raw.components;
  } else {
    throw new Error('component-schemas.json: Invalid format. Expected array or { version, components[] }.');
  }

  if (version !== 1) {
    throw new Error(`component-schemas.json: Unsupported version ${version}. Expected version=1.`);
  }

  if (!Array.isArray(list) || list.length !== 15) {
    throw new Error(`component-schemas.json: Expected exactly 15 component schemas, got ${Array.isArray(list) ? list.length : 'invalid'}.`);
  }

  const bits = new Set();
  const names = new Set();

  for (let i = 0; i < list.length; i++) {
    const s = list[i];
    if (!s || typeof s !== 'object') {
      throw new Error(`component-schemas.json: Schema at index ${i} invalid.`);
    }
    if (typeof s.name !== 'string' || !s.name) {
      throw new Error(`component-schemas.json: Schema #${i} has invalid name.`);
    }
    if (typeof s.bit !== 'number' || s.bit !== (s.bit | 0)) {
      throw new Error(`component-schemas.json: Schema "${s.name}" has invalid bit (must be int).`);
    }
    if (s.bit < 0 || s.bit > 31) {
      throw new Error(`component-schemas.json: Schema "${s.name}" bit out of range.`);
    }
    if (typeof s.defaults !== 'object' || s.defaults == null) {
      throw new Error(`component-schemas.json: Schema "${s.name}" missing defaults object.`);
    }
    if (!Array.isArray(s.fields)) {
      throw new Error(`component-schemas.json: Schema "${s.name}" missing fields array.`);
    }
    if (bits.has(s.bit)) {
      throw new Error(`component-schemas.json: Duplicate bit ${s.bit}.`);
    }
    if (names.has(s.name)) {
      throw new Error(`component-schemas.json: Duplicate name "${s.name}".`);
    }
    bits.add(s.bit);
    names.add(s.name);
  }

  // Ensure contiguous bits 0..14
  for (let b = 0; b <= 14; b++) {
    if (!bits.has(b)) {
      throw new Error(`component-schemas.json: Bits must be contiguous 0..14; missing bit ${b}.`);
    }
  }
  // Ensure no bits outside 0..14 used
  for (const s of list) {
    if (s.bit < 0 || s.bit > 14) {
      throw new Error(`component-schemas.json: Unexpected bit outside 0..14: "${s.name}" has bit ${s.bit}.`);
    }
  }

  return { version, list };
}

/** @type {{version: number, list: ComponentSchema[]}} */
const { version: __schemasVersion, list: __schemasList } = _validateSchemas(componentSchemas);

/**
 * Build immutable COMPONENTS, COMPONENT_BITS, COMPONENT_INDEX
 */

/**
 * @template T
 * @param {T} obj
 * @returns {T}
 */
function deepFreezeSchema(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const stack = [obj];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object' || Object.isFrozen(current)) continue;
    Object.freeze(current);
    for (const k of Object.keys(current)) {
      const v = current[k];
      if (v && typeof v === 'object' && !Object.isFrozen(v)) {
        stack.push(v);
      }
    }
  }
  return obj;
}

/** @type {ComponentSchema[]} */
const __componentsMutable = __schemasList.map((s) => {
  // Freeze nested structures to keep schemas immutable
  // but note: registry will clone defaults when creating bags.
  const frozen = {
    name: s.name,
    bit: s.bit | 0,
    defaults: deepFreezeSchema(structuredClone ? structuredClone(s.defaults) : JSON.parse(JSON.stringify(s.defaults))),
    fields: s.fields.map((f) => deepFreezeSchema({ ...f })),
  };
  return deepFreezeSchema(frozen);
});

/** @type {readonly ComponentSchema[]} */
export const COMPONENTS = Object.freeze(__componentsMutable.slice());

/** name -> bitmask (1 << bit) */
const __bitsMutable = {};
/** bit index -> name */
const __indexMutable = [];
/** name -> schema */
const __nameToSchema = Object.create(null);

for (const s of COMPONENTS) {
  const mask = (1 << (s.bit | 0)) | 0;
  __bitsMutable[s.name] = mask;
  __indexMutable[s.bit | 0] = s.name;
  __nameToSchema[s.name] = s;
}

/** @type {Readonly<Record<string, number>>} */
export const COMPONENT_BITS = Object.freeze({ ...__bitsMutable });
/** @type {readonly string[]} */
export const COMPONENT_INDEX = Object.freeze(__indexMutable.slice());

/**
 * Build a bitmask from a list of component names.
 * @param {string[]} names
 * @returns {number}
 */
export function fromNames(names) {
  if (!names || names.length === 0) return 0;
  let mask = 0;
  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    const bit = COMPONENT_BITS[n];
    if (bit == null) {
      const valid = Object.keys(COMPONENT_BITS).sort().join(', ');
      throw new Error(`fromNames: Unknown component "${String(n)}". Valid: ${valid}`);
    }
    mask = (mask | bit) | 0;
  }
  return mask | 0;
}

// ---------- Archetypes (ENTITY_TYPES) ----------

/**
 * Archetype blueprints per ecs-architecture.md.
 * Bags are partials against component defaults.
 */
export const ENTITY_TYPES = {
  player: {
    Position: { x: 0, y: 0, layer: 0 },
    Velocity: {},
    Attributes: { attackPower: 8, defense: 0 },
    Health: { max: 100, value: 100 },
    Stamina: { max: 100, value: 100, regenPerSec: 14, regenDelayAfterActionMs: 600 },
    Poise: { max: 100, value: 100, recoverPerSec: 35, breakDurationMs: 800 },
    Renderable: { visible: true, depth: 0, scale: 1, tintToken: '' },
    Collider: { w: 12, h: 12, offsetX: 0, offsetY: 0, solid: false, isTrigger: false, hurtboxPadPx: 0 },
    Player: { inputEnabled: true },
    Inventory: { capacity: 20, slots: {} },
  },
  enemy: {
    Position: {},
    Velocity: {},
    Attributes: {},
    Health: {},
    Poise: {},
    Renderable: {},
    Collider: { w: 12, h: 12, offsetX: 0, offsetY: 0, solid: false, isTrigger: false, hurtboxPadPx: 0 },
    AI: { behavior: 'idle', state: 'idle', targetId: 0, attackCooldownMs: 0, preferOpenLane: true },
    Enemy: { kind: '' },
  },
  item: {
    Position: {},
    Renderable: {},
    Collider: { w: 12, h: 12, offsetX: 0, offsetY: 0, solid: false, isTrigger: true, hurtboxPadPx: 0 },
    Item: { itemId: '', qty: 1, stackable: true, onGround: true },
  },
  tile: {
    Position: { layer: 0 },
    Tile: { tileType: 'rock', hardness: 3, breakable: true, oreType: '' },
    // Note: Collider is optional for tiles; tile collision is usually handled by tilemap.
    // If added at instantiation time, Collider.solid depends on Tile.tileType:
    //   rock -> solid true; floor -> solid false.
  },
  projectile: {
    Position: {},
    Velocity: {},
    Projectile: { speedPxPerSec: 120, ttlMs: 1500, damage: { base: 4, poiseDamage: 10 } },
    Collider: { w: 4, h: 4, offsetX: 0, offsetY: 0, solid: false, isTrigger: true, hurtboxPadPx: 0 },
  },
};

// ---------- Registry implementation ----------

/**
 * Create a new ECS registry instance.
 * @returns {Registry}
 */
export function createRegistry() {
  // Maps per component
  /** @type {Record<string, Map<number, any>>} */
  const stores = Object.create(null);
  for (const s of COMPONENTS) {
    stores[s.name] = new Map();
  }

  /** Dense array of bitmasks indexed by entity id. 0 also used by alive=false (free). */
  /** @type {number[]} */
  const masks = [0]; // id 0 reserved
  /** Track alive state separately to distinguish free (alive=false) from alive with no components. */
  /** @type {boolean[]} */
  const alive = [false];

  let nextId = 1;
  /** LIFO free-list stack */
  /** @type {number[]} */
  const freeList = [];
  let entityCount = 0;

  /** Dev/debug counters */
  /** @type {RegistryDebug} */
  const debug = { clampCount: 0, viewBuilds: 0 };

  // ---------- Utilities ----------

  /**
   * Ensure the entity id refers to an allocated (alive) entity.
   * @param {number} id
   */
  function assertValidEntity(id) {
    if (typeof id !== 'number' || id !== (id | 0) || id <= 0 || id >= alive.length || alive[id] !== true) {
      throw new Error(`ECS: Invalid or dead entity id ${id}.`);
    }
  }

  /**
   * Validate component name exists.
   * @param {string} name
   * @returns {ComponentSchema}
   */
  function assertComponentName(name) {
    const schema = __nameToSchema[name];
    if (!schema) {
      const valid = Object.keys(COMPONENT_BITS).sort().join(', ');
      throw new Error(`ECS: Unknown component "${String(name)}". Valid names: ${valid}`);
    }
    return schema;
  }

  /**
   * Clone defaults object shallowly.
   * @param {Object} defaults
   */
  function cloneDefaults(defaults) {
    // Shallow clone is sufficient; object-typed fields are merged via patch.
    return Object.assign({}, defaults);
  }

  /**
   * Determine primitive
   * @param {any} v
   * @returns {boolean}
   */
  function isPrimitive(v) {
    return v == null || (typeof v !== 'object' && typeof v !== 'function');
  }

  /**
   * Coerce and clamp fields in "bag" using "schema" based on "source" patch.
   * - number/int: Number(), ignore if NaN; clamp; int via Math.trunc
   * - bool: !!
   * - string: String()
   * - object: shallow-merge only primitive leaves from source[key]
   *
   * Dynamic clamp for ["Health","Stamina","Poise"]: clamp bag.value to [0..bag.max]
   *
   * @param {string} compName
   * @param {any} bag
   * @param {ComponentSchema} schema
   * @param {any=} source
   */
  function coerceAndClamp(compName, bag, schema, source) {
    const fields = schema.fields;
    for (let i = 0; i < fields.length; i++) {
      const f = fields[i];
      const key = f.key;
      const t = f.type;

      if (t === 'object') {
        // Merge from source[key] primitives only
        const srcObj = source && source[key];
        if (srcObj && typeof srcObj === 'object') {
          const base = (bag[key] && typeof bag[key] === 'object') ? bag[key] : (bag[key] = {});
          for (const k of Object.keys(srcObj)) {
            const v = srcObj[k];
            if (isPrimitive(v)) {
              base[k] = v;
              debug.clampCount++;
            }
          }
        }
        continue;
      }

      if (!(key in bag)) continue;

      const prevVal = bag[key];
      if (t === 'number' || t === 'int') {
        const num = Number(prevVal);
        if (Number.isNaN(num)) {
          // Ignore, keep existing (from defaults/previous)
          continue;
        }
        let out = num;
        if (t === 'int') out = Math.trunc(out);
        if (f.min != null && out < f.min) out = f.min;
        if (f.max != null && out > f.max) out = f.max;
        bag[key] = out;
        debug.clampCount++;
      } else if (t === 'bool') {
        bag[key] = !!prevVal;
        debug.clampCount++;
      } else if (t === 'string') {
        bag[key] = String(prevVal);
        debug.clampCount++;
      }
    }

    // Dynamic clamp for durability-like meters
    if (compName === 'Health' || compName === 'Stamina' || compName === 'Poise') {
      const maxNum = Number(bag.max);
      if (!Number.isNaN(maxNum)) {
        const rawVal = bag.value;
        const numVal = Number(rawVal);
        if (!Number.isNaN(numVal)) {
          let v = numVal;
          if (v < 0) v = 0;
          if (v > maxNum) v = maxNum;
          if (v !== bag.value) {
            bag.value = v;
            debug.clampCount++;
          }
        }
      }
    }
  }

  /**
   * Set a prepared component bag directly (no re-clamp).
   * @param {number} id
   * @param {string} name
   * @param {any} bag
   */
  function setComponentPrepared(id, name, bag) {
    const schema = __nameToSchema[name];
    const bit = COMPONENT_BITS[name];
    stores[name].set(id, bag);
    masks[id] = (masks[id] | bit) | 0;
  }

  /**
   * Ensure internal arrays can address "id".
   * @param {number} id
   */
  function ensureCapacity(id) {
    while (id >= masks.length) {
      masks.push(0);
      alive.push(false);
    }
  }

  // ---------- Public API ----------

  /** @type {Registry} */
  const api = {
    /**
     * Allocate a new entity id. If type provided, apply archetype and merge opts.
     * @param {string=} type
     * @param {Object<string, any>=} opts
     * @returns {number}
     */
    createEntity(type, opts) {
      let id;
      if (freeList.length > 0) {
        id = freeList.pop();
      } else {
        id = nextId++;
      }
      ensureCapacity(id);
      masks[id] = 0;
      alive[id] = true;
      entityCount++;

      if (type != null) {
        const blueprint = ENTITY_TYPES[type];
        if (!blueprint) {
          const keys = Object.keys(ENTITY_TYPES).sort().join(', ');
          throw new Error(`ECS.createEntity: Unknown type "${String(type)}". Valid types: ${keys}`);
        }

        // Apply each component in blueprint using defaults -> blueprint -> (opts if present)
        const optBag = opts && typeof opts === 'object' ? opts : null;
        const applied = new Set();

        for (const compName of Object.keys(blueprint)) {
          const schema = assertComponentName(compName);
          const base = cloneDefaults(schema.defaults);
          const bp = blueprint[compName] || {};
          // For object typed fields, we want to merge from sources.
          // Apply shallow merge first.
          for (const k of Object.keys(bp)) {
            base[k] = bp[k];
          }
          if (optBag && optBag[compName]) {
            const o = optBag[compName];
            if (o && typeof o === 'object') {
              for (const k of Object.keys(o)) {
                base[k] = o[k];
              }
            }
          }
          // Build a source patch for object fields composed of bp + opt so that object merges only absorb primitive leaves.
          const patchForObjects = {};
          // Combine only keys relevant; safe to include all
          for (const k of Object.keys(bp)) patchForObjects[k] = bp[k];
          if (optBag && optBag[compName]) {
            const o = optBag[compName];
            for (const k of Object.keys(o)) patchForObjects[k] = o[k];
          }
          coerceAndClamp(compName, base, schema, patchForObjects);
          setComponentPrepared(id, compName, base);
          applied.add(compName);
        }

        // If opts contains extra components not in blueprint, add them too.
        if (optBag) {
          for (const compName of Object.keys(optBag)) {
            if (applied.has(compName)) continue;
            // Use normal addComponent (will validate + clamp)
            api.addComponent(id, compName, optBag[compName]);
          }
        }

        // Special note for tile collider left optional; if consumer wants, they can add later.
      } else if (opts && typeof opts === 'object') {
        // No type; allow adding components from opts
        for (const compName of Object.keys(opts)) {
          api.addComponent(id, compName, opts[compName]);
        }
      }

      return id;
    },

    /**
     * Destroy entity, remove all components, recycle id (LIFO). Safe no-op on invalid or already free.
     * @param {number} id
     */
    destroyEntity(id) {
      if (typeof id !== 'number' || id !== (id | 0) || id <= 0 || id >= alive.length || alive[id] !== true) {
        return; // safe no-op
      }
      // Remove all component bags for this id
      for (const name of Object.keys(stores)) {
        stores[name].delete(id);
      }
      // Clear mask, mark free, recycle id
      masks[id] = 0;
      alive[id] = false;
      freeList.push(id);
      entityCount--;
    },

    /**
     * Add or replace a component on entity. Applies defaults then merges provided data.
     * @param {number} id
     * @param {string} name
     * @param {Object=} data
     */
    addComponent(id, name, data) {
      assertValidEntity(id);
      const schema = assertComponentName(name);
      const bag = cloneDefaults(schema.defaults);
      const patch = (data && typeof data === 'object') ? data : {};
      // Shallow pre-merge
      for (const k of Object.keys(patch)) {
        // Unknown keys ignored in coercion; pre-merge is safe
        bag[k] = patch[k];
      }
      coerceAndClamp(name, bag, schema, patch);
      setComponentPrepared(id, name, bag);
    },

    /**
     * Get live component bag reference or undefined.
     * @param {number} id
     * @param {string} name
     * @returns {any|undefined}
     */
    getComponent(id, name) {
      assertValidEntity(id);
      assertComponentName(name);
      return stores[name].get(id);
    },

    /**
     * Does entity have component?
     * @param {number} id
     * @param {string} name
     * @returns {boolean}
     */
    hasComponent(id, name) {
      assertValidEntity(id);
      const bit = COMPONENT_BITS[name];
      if (bit == null) {
        const valid = Object.keys(COMPONENT_BITS).sort().join(', ');
        throw new Error(`ECS.hasComponent: Unknown component "${String(name)}". Valid names: ${valid}`);
      }
      return ((masks[id] & bit) | 0) === bit;
    },

    /**
     * Remove component; safe if absent.
     * @param {number} id
     * @param {string} name
     */
    removeComponent(id, name) {
      assertValidEntity(id);
      const schema = assertComponentName(name);
      const bit = COMPONENT_BITS[schema.name];
      if (stores[name].has(id)) {
        stores[name].delete(id);
        masks[id] = (masks[id] & ~bit) | 0;
      }
    },

    /**
     * Shallow-merge patch into existing bag; coerce/clamp; ignores unknown keys.
     * If missing, behaves like addComponent(defaults+patch).
     * @param {number} id
     * @param {string} name
     * @param {Object} patch
     */
    applyPatch(id, name, patch) {
      assertValidEntity(id);
      const schema = assertComponentName(name);
      const p = (patch && typeof patch === 'object') ? patch : {};
      if (!stores[name].has(id)) {
        // Missing -> add with defaults+patch
        this.addComponent(id, name, p);
        return;
      }
      const bag = stores[name].get(id);
      // Shallow-merge provided keys (unknown keys tolerated but will be ignored by coercion)
      for (const k of Object.keys(p)) {
        bag[k] = p[k];
      }
      coerceAndClamp(name, bag, schema, p);
      // Bag updated in-place; mask bit already set
    },

    /**
     * Get 32-bit mask for entity.
     * @param {number} id
     * @returns {number}
     */
    maskOf(id) {
      assertValidEntity(id);
      return masks[id] | 0;
    },

    /**
     * Snapshot query of entity ids matching masks.
     * @param {number} requiredMask
     * @param {number=} excludeMask
     * @returns {number[]}
     */
    query(requiredMask, excludeMask = 0) {
      const req = requiredMask | 0;
      const exc = excludeMask | 0;
      /** @type {number[]} */
      const out = [];
      // Single pass scan; stable snapshot independent of later mutations.
      for (let id = 1; id < masks.length; id++) {
        if (!alive[id]) continue;
        const m = masks[id] | 0;
        if (((m & req) | 0) === req && ((m & exc) | 0) === 0) {
          out.push(id);
        }
      }
      return out;
    },

    /**
     * Build a snapshot view and provide cache-friendly forEach iteration.
     * The iteration bag is reused per iteration for performance.
     * @param {string[]} includeNames
     * @param {string[]=} excludeNames
     * @returns {{ ids: number[], forEach: (fn: (bag: any) => void) => void }}
     */
    view(includeNames, excludeNames) {
      debug.viewBuilds++;
      const ids = this.query(fromNames(includeNames || []), fromNames(excludeNames || []));
      const names = (includeNames || []).slice();
      // Validate names once
      const schemas = names.map((n) => assertComponentName(n));
      return {
        ids,
        forEach: (fn) => {
          if (typeof fn !== 'function' || ids.length === 0) return;
          // Reuse a small temp bag object across calls (avoid allocations in tight loops).
          // Consumers should not retain a reference to this bag outside the callback.
          const tmp = Object.create(null);
          // Pre-populate keys for consistent hidden class
          tmp.id = 0;
          tmp.mask = 0;
          for (let i = 0; i < names.length; i++) tmp[names[i]] = undefined;

          for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            tmp.id = id;
            tmp.mask = masks[id] | 0;
            for (let j = 0; j < names.length; j++) {
              const n = names[j];
              tmp[n] = stores[n].get(id);
            }
            fn(tmp);
          }
        },
      };
    },

    /**
     * Active entity count.
     * @returns {number}
     */
    size() {
      return entityCount | 0;
    },

    _debug: debug,
  };

  return api;
}