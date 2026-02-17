'use strict';

/**
 * ECS Registry for The Far Mine.
 * Loads component schemas, builds bit mappings, and provides an entity registry with add/get/remove/patch, queries, and archetype builders.
 *
 * Exports:
 * - COMPONENTS: array of component schema objects (index-aligned to bits 0..14)
 * - COMPONENT_BITS: object name -> (1<<bit)
 * - COMPONENT_INDEX: array index==bit -> component name
 * - fromNames(names: string[]): number
 * - ENTITY_TYPES: archetype builders { player, enemy, item, tile, projectile }
 * - createRegistry(): Registry
 */

// Load schemas (Node/bundler-friendly synchronous require)
const ALL_SCHEMAS = require('../data/core/component-schemas.json');

// Only first 15 are used in Sprint 1 (bits 0..14 contiguous)
const COMPONENTS = Object.freeze(ALL_SCHEMAS.slice(0, 15));

// Build name index and bitmasks
const COMPONENT_INDEX = [];
const COMPONENT_BITS = Object.create(null);
const COMPONENT_META = Object.create(null); // name -> meta { bit, defaults, specs, nestedSpecs }

for (let bit = 0; bit < COMPONENTS.length; bit++) {
  const entry = COMPONENTS[bit] || {};
  const name = entry.name || entry.id || `Cmp${bit}`;
  COMPONENT_INDEX[bit] = name;
  COMPONENT_BITS[name] = 1 << bit;
  COMPONENT_META[name] = buildComponentMeta(name, bit, entry);
}

/**
 * Build component meta info from schema entry.
 * Supports a flexible schema format:
 * - entry.defaults or entry.default as object defines default bag
 * - or entry.schema.properties / entry.properties defines per-field specs with default/min/max/type
 * - type synonyms: integer, number, string, boolean, object
 * - min/max synonyms: min/max, minimum/maximum
 */
function buildComponentMeta(name, bit, entry) {
  const meta = {
    name,
    bit,
    defaults: {},
    specs: Object.create(null),        // top-level specs: prop -> FieldSpec
    nestedSpecs: Object.create(null),  // nested object specs: prop -> { defaults, specs }
  };

  const schemaProps = entry && (entry.properties || (entry.schema && entry.schema.properties)) || null;
  const hasExplicitDefaults = entry && typeof entry.defaults === 'object';
  const hasExplicitDefault = entry && typeof entry.default === 'object';

  // Prefer explicit defaults if present
  let defaults = {};
  if (hasExplicitDefaults) {
    defaults = deepClone(entry.defaults);
  } else if (hasExplicitDefault) {
    defaults = deepClone(entry.default);
  } else if (schemaProps) {
    // Build defaults from property specs
    for (const key of Object.keys(schemaProps)) {
      const spec = normalizeFieldSpec(schemaProps[key]);
      if (spec.hasOwnProperty('default')) {
        defaults[key] = deepClone(spec.default);
      } else {
        defaults[key] = defaultForType(spec.type);
      }
    }
  } else {
    defaults = {};
  }

  meta.defaults = defaults;

  // Build specs map from schemaProps if available; otherwise infer from defaults
  if (schemaProps) {
    for (const key of Object.keys(schemaProps)) {
      const specDef = schemaProps[key];
      const spec = normalizeFieldSpec(specDef);
      if (spec.type === 'object') {
        // nested object spec
        const nested = {
          defaults: {},
          specs: Object.create(null),
        };
        const nestedProps = specDef && (specDef.properties || (specDef.schema && specDef.schema.properties)) || null;
        if (nestedProps) {
          for (const subKey of Object.keys(nestedProps)) {
            const subSpecDef = nestedProps[subKey];
            const subSpec = normalizeFieldSpec(subSpecDef);
            nested.specs[subKey] = subSpec;
            if (subSpec.hasOwnProperty('default')) {
              nested.defaults[subKey] = deepClone(subSpec.default);
            } else {
              nested.defaults[subKey] = defaultForType(subSpec.type);
            }
          }
        } else {
          // If no nested properties listed, use defaults object keys to infer
          const d = (defaults && typeof defaults[key] === 'object' && defaults[key]) || {};
          for (const subKey of Object.keys(d)) {
            const inferredType = inferType(d[subKey]);
            nested.specs[subKey] = { type: inferredType };
            nested.defaults[subKey] = deepClone(d[subKey]);
          }
        }
        meta.nestedSpecs[key] = nested;
      } else {
        meta.specs[key] = spec;
      }
    }
  } else {
    // Infer field specs from defaults bag
    for (const key of Object.keys(defaults)) {
      const val = defaults[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const nested = {
          defaults: {},
          specs: Object.create(null),
        };
        for (const subKey of Object.keys(val)) {
          nested.specs[subKey] = { type: inferType(val[subKey]) };
          nested.defaults[subKey] = deepClone(val[subKey]);
        }
        meta.nestedSpecs[key] = nested;
      } else {
        meta.specs[key] = { type: inferType(val) };
      }
    }
  }

  return meta;
}

/**
 * Normalize a field spec object into a standard FieldSpec:
 * { type, default, min, max, integer }
 */
function normalizeFieldSpec(spec) {
  const out = {};
  if (!spec || typeof spec !== 'object') {
    return out;
  }
  // Determine type
  let type = spec.type;
  if (Array.isArray(type) && type.length > 0) {
    // JSON schema can have ["integer","null"]
    type = type.find(t => t !== 'null') || type[0];
  }
  if (type === 'integer') {
    out.type = 'integer';
    out.integer = true;
  } else if (type === 'number') {
    out.type = 'number';
  } else if (type === 'boolean') {
    out.type = 'boolean';
  } else if (type === 'string') {
    out.type = 'string';
  } else if (type === 'object') {
    out.type = 'object';
  } else {
    // fallback unknown => infer later
    if (spec.hasOwnProperty('default')) {
      out.type = inferType(spec.default);
    }
  }

  if (spec.hasOwnProperty('default')) out.default = spec.default;

  // Min/max synonyms
  if (spec.hasOwnProperty('min')) out.min = spec.min;
  if (spec.hasOwnProperty('max')) out.max = spec.max;
  if (spec.hasOwnProperty('minimum')) out.min = spec.minimum;
  if (spec.hasOwnProperty('maximum')) out.max = spec.maximum;

  if (spec.hasOwnProperty('int')) out.integer = !!spec.int;
  if (spec.hasOwnProperty('integer')) out.integer = !!spec.integer;

  return out;
}

function inferType(val) {
  const t = typeof val;
  if (t === 'number') {
    // can't infer integer vs number reliably; default to number
    return Number.isInteger(val) ? 'integer' : 'number';
  }
  if (t === 'boolean') return 'boolean';
  if (t === 'string') return 'string';
  if (val && t === 'object') return 'object';
  return 'number'; // safe numeric default
}

function defaultForType(type) {
  switch (type) {
    case 'integer':
    case 'number': return 0;
    case 'boolean': return false;
    case 'string': return '';
    case 'object': return {};
    default: return 0;
  }
}

/**
 * Build a bitmask from list of component names.
 * Throws on unknown component name.
 * @param {string[]} names
 * @returns {number}
 */
function fromNames(names) {
  let mask = 0 | 0;
  for (let i = 0; i < names.length; i++) {
    const name = names[i];
    const bit = COMPONENT_BITS[name];
    if (bit === undefined) {
      throw new Error(`Unknown component: ${name}`);
    }
    mask |= bit;
  }
  return mask | 0;
}

/**
 * ENTITY_TYPES archetype builders.
 * Each returns a descriptor object mapping componentName -> data object (base),
 * which will then be merged with opts[componentName] (if provided) and clamped by addComponent.
 */
const ENTITY_TYPES = Object.freeze({
  player: function (_reg, opts) {
    const o = opts || {};
    const desc = {
      Position: { layer: 0 },
      Velocity: {},
      Attributes: { attackPower: 8, defense: 0 },
      Health: { max: 100, value: 100 },
      Stamina: { max: 100, value: 100, regenPerSec: 14, regenDelayAfterActionMs: 600 },
      Poise: { max: 100, value: 100, recoverPerSec: 35, breakDurationMs: 800 },
      Renderable: { visible: true, depth: 0, scale: 1 },
      Collider: { w: 12, h: 12, offsetX: 0, offsetY: 0, solid: false, isTrigger: false },
      Player: { inputEnabled: true },
      Inventory: { capacity: 20 },
    };
    // Merge any provided overrides shallowly; clamping occurs during addComponent
    for (const k in o) {
      if (o && o.hasOwnProperty(k)) {
        if (desc.hasOwnProperty(k)) {
          desc[k] = mergeShallow(desc[k], o[k]);
        }
      }
    }
    return desc;
  },

  enemy: function (_reg, opts) {
    const o = opts || {};
    const aiBehavior = o && o.AI && typeof o.AI.behavior === 'string' ? o.AI.behavior : 'idle';
    const enemyKind = o && o.Enemy && typeof o.Enemy.kind === 'string' ? o.Enemy.kind : '';
    const desc = {
      Position: { layer: 0 },
      Velocity: {},
      Attributes: {},
      Health: {},
      Poise: {},
      Renderable: {},
      Collider: { w: 12, h: 12, offsetX: 0, offsetY: 0, solid: false, isTrigger: false },
      AI: { behavior: aiBehavior, state: 'idle' },
      Enemy: { kind: enemyKind },
    };
    for (const k in o) {
      if (o && o.hasOwnProperty(k)) {
        if (desc.hasOwnProperty(k)) {
          desc[k] = mergeShallow(desc[k], o[k]);
        }
      }
    }
    return desc;
  },

  item: function (_reg, opts) {
    const o = opts || {};
    const desc = {
      Position: { layer: 0 },
      Renderable: {},
      Collider: { w: 12, h: 12, offsetX: 0, offsetY: 0, solid: false, isTrigger: true },
      Item: { qty: 1, stackable: true, onGround: true },
    };
    for (const k in o) {
      if (o && o.hasOwnProperty(k)) {
        if (desc.hasOwnProperty(k)) {
          desc[k] = mergeShallow(desc[k], o[k]);
        }
      }
    }
    return desc;
  },

  tile: function (_reg, opts) {
    const o = opts || {};
    const tileType = o && o.Tile && typeof o.Tile.tileType === 'string' ? o.Tile.tileType : 'rock';
    const baseTile = {
      tileType: tileType,
      hardness: (o && o.Tile && typeof o.Tile.hardness === 'number') ? o.Tile.hardness : undefined,
      breakable: true,
      oreType: (o && o.Tile && typeof o.Tile.oreType === 'string') ? o.Tile.oreType : '',
    };
    if (baseTile.hardness === undefined) {
      delete baseTile.hardness; // avoid stomping schema default if not provided
    }
    const desc = {
      Position: { layer: 0 },
      Tile: baseTile,
      // Collider rules based on tileType
      Collider: tileType === 'rock'
        ? { solid: true, w: 16, h: 16, offsetX: 0, offsetY: 0, isTrigger: false }
        : { solid: false, w: 16, h: 16, offsetX: 0, offsetY: 0, isTrigger: false },
    };
    for (const k in o) {
      if (o && o.hasOwnProperty(k)) {
        if (desc.hasOwnProperty(k)) {
          desc[k] = mergeShallow(desc[k], o[k]);
        }
      }
    }
    return desc;
  },

  projectile: function (_reg, opts) {
    const o = opts || {};
    const desc = {
      Position: { layer: 0 },
      Velocity: {},
      Projectile: { speedPxPerSec: 120, ttlMs: 1500, damage: { base: 4, poiseDamage: 10 } },
      Collider: { w: 4, h: 4, offsetX: 0, offsetY: 0, solid: false, isTrigger: true },
    };
    for (const k in o) {
      if (o && o.hasOwnProperty(k)) {
        if (desc.hasOwnProperty(k)) {
          desc[k] = mergeShallow(desc[k], o[k]);
        }
      }
    }
    return desc;
  },
});

/**
 * Create a new ECS registry.
 * @returns {Registry}
 */
function createRegistry() {
  // Per-component storage maps
  const stores = Object.create(null);
  for (let i = 0; i < COMPONENT_INDEX.length; i++) {
    const name = COMPONENT_INDEX[i];
    stores[name] = new Map();
  }

  // Entity bookkeeping
  const masks = [0]; // index 0 unused; 32-bit masks
  const alive = [false]; // index 0 reserved
  const free = [];
  let nextId = 1;

  // Debug hooks (noop by default)
  const debug = {
    enabled: false,
    onCreate: null,
    onDestroy: null,
    onAdd: null,
    onRemove: null,
    onPatch: null,
  };

  function allocId() {
    if (free.length > 0) {
      return free.pop();
    }
    const id = nextId++;
    // Initialize slots
    masks[id] = 0 | 0;
    alive[id] = false;
    return id;
  }

  function freeId(id) {
    free.push(id);
  }

  /**
   * Attach component data to entity with defaults and clamping.
   * If component already exists, merges into existing using add+clamp semantics.
   */
  function addComponentInternal(id, name, data) {
    const meta = COMPONENT_META[name];
    if (!meta) throw new Error(`Unknown component: ${name}`);
    const store = stores[name];
    const existing = store.get(id);

    if (!existing) {
      const bag = deepClone(meta.defaults);
      // Merge provided data
      if (data && typeof data === 'object') {
        mergeAndClampInto(bag, data, meta, /*mode*/'add');
      }
      // Dynamic coupling: if "max" exists, clamp "value" to [0..max]
      dynamicValueClamp(bag, meta);
      store.set(id, bag);
      masks[id] = (masks[id] | (1 << meta.bit)) | 0;
      if (debug.enabled && typeof debug.onAdd === 'function') {
        try { debug.onAdd(id, name, bag); } catch (e) { /* ignore */ }
      }
      return bag;
    } else {
      // Merge into existing; idempotent fields preserved unless overwritten by input
      const bag = existing;
      const baseMerge = data && typeof data === 'object' ? data : {};
      mergeAndClampInto(bag, baseMerge, meta, /*mode*/'add');
      dynamicValueClamp(bag, meta);
      // ensure bit set
      masks[id] = (masks[id] | (1 << meta.bit)) | 0;
      if (debug.enabled && typeof debug.onAdd === 'function') {
        try { debug.onAdd(id, name, bag); } catch (e) { /* ignore */ }
      }
      return bag;
    }
  }

  const reg = {
    /**
     * Allocate a new entity id and optionally apply an archetype.
     * @param {string} [type]
     * @param {object} [opts]
     * @returns {number} entity id
     */
    createEntity(type, opts) {
      const id = allocId();
      alive[id] = true;
      masks[id] = 0 | 0;
      if (debug.enabled && typeof debug.onCreate === 'function') {
        try { debug.onCreate(id, type, opts || null); } catch (e) { /* ignore */ }
      }

      if (type != null) {
        const builder = ENTITY_TYPES[type];
        if (!builder) {
          throw new Error(`Unknown archetype: ${type}`);
        }
        // Build archetype descriptor
        let baseDesc;
        if (typeof builder === 'function') {
          baseDesc = builder(reg, opts || {});
        } else if (builder && typeof builder === 'object') {
          baseDesc = deepClone(builder);
        } else {
          baseDesc = {};
        }

        // First apply base descriptor
        for (const compName in baseDesc) {
          if (!baseDesc.hasOwnProperty(compName)) continue;
          // Merge opts[compName] over base descriptor before add (so add sees full picture)
          const merged = mergeShallow(
            baseDesc[compName] || {},
            (opts && opts[compName]) || undefined
          );
          addComponentInternal(id, compName, merged);
        }

        // Then apply any opts components that weren't in base (extra components)
        if (opts && typeof opts === 'object') {
          for (const compName in opts) {
            if (!opts.hasOwnProperty(compName)) continue;
            if (!baseDesc.hasOwnProperty(compName)) {
              addComponentInternal(id, compName, opts[compName]);
            }
          }
        }
      }

      return id;
    },

    /**
     * Destroy an entity and free its id for reuse; clears all components and mask.
     * @param {number} id
     */
    destroyEntity(id) {
      if (!alive[id]) return;
      // Remove all components present in mask
      let mask = masks[id] | 0;
      if (mask !== 0) {
        for (let bit = 0; bit < COMPONENT_INDEX.length; bit++) {
          const bitflag = 1 << bit;
          if ((mask & bitflag) !== 0) {
            const name = COMPONENT_INDEX[bit];
            const store = stores[name];
            store.delete(id);
          }
        }
      }
      masks[id] = 0 | 0;
      alive[id] = false;
      freeId(id);
      if (debug.enabled && typeof debug.onDestroy === 'function') {
        try { debug.onDestroy(id); } catch (e) { /* ignore */ }
      }
    },

    /**
     * Add a component to an entity, with defaults and clamping.
     * Adding twice merges into existing using add+clamp semantics.
     * @param {number} id
     * @param {string} name
     * @param {object} [data]
     */
    addComponent(id, name, data) {
      if (!COMPONENT_META[name]) {
        throw new Error(`Unknown component: ${name}`);
      }
      if (!alive[id]) return;
      addComponentInternal(id, name, data);
    },

    /**
     * Get the live component bag for read/update.
     * @param {number} id
     * @param {string} name
     * @returns {object|undefined}
     */
    getComponent(id, name) {
      const meta = COMPONENT_META[name];
      if (!meta) throw new Error(`Unknown component: ${name}`);
      const store = stores[name];
      return store.get(id);
    },

    /**
     * Check if an entity has a component by bitmask.
     * @param {number} id
     * @param {string} name
     * @returns {boolean}
     */
    hasComponent(id, name) {
      const meta = COMPONENT_META[name];
      if (!meta) throw new Error(`Unknown component: ${name}`);
      const mask = masks[id] | 0;
      return ((mask & (1 << meta.bit)) !== 0);
    },

    /**
     * Remove a component from an entity.
     * @param {number} id
     * @param {string} name
     */
    removeComponent(id, name) {
      const meta = COMPONENT_META[name];
      if (!meta) throw new Error(`Unknown component: ${name}`);
      if (!alive[id]) return;
      const store = stores[name];
      if (store.has(id)) {
        store.delete(id);
        masks[id] = (masks[id] & ~(1 << meta.bit)) | 0;
        if (debug.enabled && typeof debug.onRemove === 'function') {
          try { debug.onRemove(id, name); } catch (e) { /* ignore */ }
        }
      }
    },

    /**
     * Shallow-merge patch onto existing component with type coercion and clamping.
     * If the component does not exist, it is created with patch data merged into defaults.
     * NaN/undefined are ignored for patch fields; numbers are clamped; extra keys ignored.
     * @param {number} id
     * @param {string} name
     * @param {object} patch
     */
    applyPatch(id, name, patch) {
      const meta = COMPONENT_META[name];
      if (!meta) throw new Error(`Unknown component: ${name}`);
      if (!alive[id]) return;
      const store = stores[name];
      let bag = store.get(id);
      if (!bag) {
        // Create component via add with patch
        bag = addComponentInternal(id, name, patch);
        if (debug.enabled && typeof debug.onPatch === 'function') {
          try { debug.onPatch(id, name, bag); } catch (e) { /* ignore */ }
        }
        return;
      }
      // Mutate in place
      mergeAndClampInto(bag, patch, meta, /*mode*/'patch');
      dynamicValueClamp(bag, meta);
      if (debug.enabled && typeof debug.onPatch === 'function') {
        try { debug.onPatch(id, name, bag); } catch (e) { /* ignore */ }
      }
    },

    /**
     * Get the entity's mask.
     * @param {number} id
     * @returns {number}
     */
    maskOf(id) {
      return masks[id] | 0;
    },

    /**
     * Query entities matching required mask and excluding exclude mask.
     * Returns a stable snapshot array of ids.
     * @param {number} requiredMask
     * @param {number} [excludeMask=0]
     * @returns {number[]}
     */
    query(requiredMask, excludeMask) {
      const req = requiredMask | 0;
      const exc = (excludeMask | 0) || 0;
      const out = [];
      // Snapshot by scanning current alive ids
      for (let id = 1; id < alive.length; id++) {
        if (!alive[id]) continue;
        const m = masks[id] | 0;
        if ((m & req) === req && (m & exc) === 0) {
          out.push(id);
        }
      }
      return out;
    },

    /**
     * Make a view over entities with includeNames (and optional excludeNames),
     * returning an object with forEach(fn) to iterate stable snapshot of ids.
     * The callback receives a bag { id, mask, Position?, Velocity?, ... } with included components pre-fetched.
     * @param {string[]} includeNames
     * @param {string[]} [excludeNames]
     */
    view(includeNames, excludeNames) {
      const reqMask = fromNames(includeNames);
      const excMask = excludeNames && excludeNames.length ? fromNames(excludeNames) : 0;
      const ids = this.query(reqMask, excMask); // snapshot
      const include = includeNames.slice();

      return {
        forEach: (fn) => {
          for (let i = 0; i < ids.length; i++) {
            const id = ids[i];
            const bag = { id: id, mask: masks[id] | 0 };
            for (let j = 0; j < include.length; j++) {
              const name = include[j];
              const store = stores[name];
              // It should exist by query, but snapshot safety:
              bag[name] = store.get(id);
            }
            fn(bag);
          }
        }
      };
    },

    /**
     * Number of active entities.
     * @returns {number}
     */
    size() {
      let count = 0;
      for (let i = 1; i < alive.length; i++) {
        if (alive[i]) count++;
      }
      return count;
    },

    // Lightweight debug hooks (noop by default)
    debug
  };

  return reg;
}

/**
 * Merge patch data into target bag with type coercion and clamping.
 * - mode 'add': undefined/NaN -> defaults (if patch provides invalid, set to defaults)
 * - mode 'patch': undefined/NaN -> ignore (preserve existing)
 * - numeric/int clamped to [min..max] if provided
 * - strings coerced; booleans !!value
 * - objects shallow-merged for known nested objects (primitive leaves only)
 * - unknown keys ignored
 * @param {object} target
 * @param {object} patch
 * @param {object} meta component meta
 * @param {'add'|'patch'} mode
 */
function mergeAndClampInto(target, patch, meta, mode) {
  if (!patch || typeof patch !== 'object') return target;

  // Top-level primitives and known objects
  const specs = meta.specs;
  const nested = meta.nestedSpecs;

  // Handle top-level keys that are recognized
  for (const key in patch) {
    if (!patch.hasOwnProperty(key)) continue;
    const val = patch[key];

    if (nested && nested.hasOwnProperty(key)) {
      // Merge nested object
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        const child = target[key] && typeof target[key] === 'object' ? target[key] : {};
        const childSpec = nested[key];
        const childDefaults = childSpec.defaults || {};
        const childSpecs = childSpec.specs || {};
        // Ensure base object exists on target
        if (!target[key] || typeof target[key] !== 'object') {
          target[key] = deepClone(childDefaults);
        }

        for (const subKey in val) {
          if (!val.hasOwnProperty(subKey)) continue;
          if (childSpecs && childSpecs.hasOwnProperty(subKey)) {
            const subSpec = childSpecs[subKey];
            const existing = target[key][subKey];
            const coerced = coerceValue(subSpec, val[subKey], (mode === 'patch') ? existing : childDefaults[subKey], mode);
            if (coerced !== IGNORE_SYMBOL) {
              target[key][subKey] = coerced;
            }
          } else {
            // If no spec for nested key, but default exists and is primitive, accept with basic coercion
            const def = childDefaults[subKey];
            if (isPrimitive(def)) {
              const inferred = { type: inferType(def) };
              const existing = target[key][subKey];
              const coerced = coerceValue(inferred, val[subKey], (mode === 'patch') ? existing : def, mode);
              if (coerced !== IGNORE_SYMBOL) {
                target[key][subKey] = coerced;
              }
            }
            // Unknown nested keys are ignored otherwise
          }
        }
      }
      // Non-object for nested key: ignore (unknown shape)
      continue;
    }

    if (specs && specs.hasOwnProperty(key)) {
      const spec = specs[key];
      const existing = target[key];
      const baseDefault = meta.defaults.hasOwnProperty(key) ? meta.defaults[key] : defaultForType(spec.type);
      const coerced = coerceValue(spec, val, (mode === 'patch') ? existing : baseDefault, mode);
      if (coerced !== IGNORE_SYMBOL) {
        target[key] = coerced;
      }
    } else if (meta.defaults && meta.defaults.hasOwnProperty(key)) {
      // If present in defaults but missing spec, infer type
      const baseDefault = meta.defaults[key];
      const inferred = { type: inferType(baseDefault) };
      const existing = target[key];
      const coerced = coerceValue(inferred, val, (mode === 'patch') ? existing : baseDefault, mode);
      if (coerced !== IGNORE_SYMBOL) {
        target[key] = coerced;
      }
    }
    // Else unknown key ignored
  }

  // After merging, clamp all numeric fields within known ranges
  // Ensure top-level numeric/int specs are clamped even if not touched by patch
  for (const key in specs) {
    if (!specs.hasOwnProperty(key)) continue;
    const spec = specs[key];
    const v = target[key];
    if (v == null) continue;
    if (spec.type === 'number' || spec.type === 'integer') {
      const coerced = coerceValue(spec, v, v, 'patch'); // clamp pass
      if (coerced !== IGNORE_SYMBOL) {
        target[key] = coerced;
      }
    }
  }

  // Clamp nested numeric leaves similarly
  for (const key in nested) {
    if (!nested.hasOwnProperty(key)) continue;
    const childObj = target[key];
    if (!childObj || typeof childObj !== 'object') continue;
    const childSpecs = nested[key].specs || {};
    for (const subKey in childSpecs) {
      if (!childSpecs.hasOwnProperty(subKey)) continue;
      const subSpec = childSpecs[subKey];
      const v = childObj[subKey];
      if (v == null) continue;
      if (subSpec.type === 'number' || subSpec.type === 'integer') {
        const coerced = coerceValue(subSpec, v, v, 'patch');
        if (coerced !== IGNORE_SYMBOL) {
          childObj[subKey] = coerced;
        }
      }
    }
  }

  return target;
}

const IGNORE_SYMBOL = Symbol('ignore');

/**
 * Coerce a raw value according to FieldSpec and mode.
 * - For mode 'add': if invalid -> default
 * - For mode 'patch': if invalid -> IGNORE (preserve existing)
 * Applies integer truncation and min/max clamps.
 */
function coerceValue(spec, raw, defaultVal, mode) {
  const ignoreOnInvalid = (mode === 'patch');

  const t = (spec && spec.type) || inferType(defaultVal);

  if (t === 'boolean') {
    if (raw === undefined) return ignoreOnInvalid ? IGNORE_SYMBOL : (!!defaultVal);
    return !!raw;
  }

  if (t === 'string') {
    if (raw === undefined || raw === null) return ignoreOnInvalid ? IGNORE_SYMBOL : (defaultVal != null ? String(defaultVal) : '');
    return String(raw);
  }

  if (t === 'object') {
    if (!raw || typeof raw !== 'object') return ignoreOnInvalid ? IGNORE_SYMBOL : (defaultVal && typeof defaultVal === 'object' ? deepClone(defaultVal) : {});
    // Objects are merged at a higher level; here we return as-is
    return raw;
  }

  // Numeric or integer
  const num = Number(raw);
  if (raw === undefined || raw === null || !isFinite(num)) {
    if (ignoreOnInvalid) return IGNORE_SYMBOL;
    // Use default numeric
    let v = Number(defaultVal);
    if (!isFinite(v)) v = 0;
    v = applyNumericSpecClamp(v, spec);
    return v;
  }
  let v = num;
  if (spec && spec.integer) {
    v = Math.trunc(v);
  }
  v = applyNumericSpecClamp(v, spec);
  return v;
}

function applyNumericSpecClamp(v, spec) {
  if (spec) {
    if (typeof spec.min === 'number') v = Math.max(spec.min, v);
    if (typeof spec.max === 'number') v = Math.min(spec.max, v);
  }
  return v;
}

/**
 * Clamp "value" to [0..max] if both exist in the same component bag.
 * Also ensures integer truncation if schema says integer for these fields.
 */
function dynamicValueClamp(bag, meta) {
  if (!bag || typeof bag !== 'object') return;
  if (bag.hasOwnProperty('max') && (typeof bag.max === 'number') &&
      bag.hasOwnProperty('value') && (typeof bag.value === 'number')) {
    let v = bag.value;
    let max = bag.max;
    if (!isFinite(max)) max = bag.value; // degenerate case
    if (!isFinite(v)) v = 0;
    v = Math.max(0, Math.min(max, v));
    // integer hint if any
    const valueSpec = meta.specs && meta.specs.value;
    if (valueSpec && valueSpec.integer) {
      v = Math.trunc(v);
    }
    bag.value = v;
  }
}

/** Shallow merge two plain objects (dst over src), returning a new object. */
function mergeShallow(src, dst) {
  const out = {};
  if (src && typeof src === 'object') {
    for (const k in src) {
      if (src.hasOwnProperty(k)) out[k] = src[k];
    }
  }
  if (dst && typeof dst === 'object') {
    for (const k in dst) {
      if (dst.hasOwnProperty(k)) out[k] = dst[k];
    }
  }
  return out;
}

/** Deep clone for plain objects (sufficient for small component bags). */
function deepClone(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.slice();
  const out = {};
  for (const k in obj) {
    if (obj.hasOwnProperty(k)) {
      const v = obj[k];
      out[k] = (v && typeof v === 'object') ? deepClone(v) : v;
    }
  }
  return out;
}

function isPrimitive(v) {
  const t = typeof v;
  return v == null || t === 'string' || t === 'number' || t === 'boolean';
}

module.exports = {
  createRegistry,
  ENTITY_TYPES,
  COMPONENT_BITS,
  COMPONENT_INDEX,
  COMPONENTS,
  fromNames,
};