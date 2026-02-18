/**
 * ECS Registry for The Far Mine MVP.
 *
 * Strict ESM module implementing an Entity-Component storage with signature masks.
 *
 * JSON ESM import assertion note:
 * - This module assumes a bundler/runtime that supports import assertions. If a production target
 *   lacks it, a build-step alias or loader shim should inline componentSchemas.
 */

import componentSchemas from "../../data/core/component-schemas.json" assert { type: "json" };

/**
 * Validate imported schema and build normalized metadata.
 */

// Expected component ordering and bits (strict 1:1 with docs and v1 schema)
const EXPECTED_NAMES = [
  "Position",
  "Velocity",
  "Attributes",
  "Health",
  "Stamina",
  "Poise",
  "Inventory",
  "Renderable",
  "Collider",
  "AI",
  "Player",
  "Enemy",
  "Item",
  "Tile",
  "Projectile",
];

// Boot-time schema validation
(function validateComponentSchemaBoot(schema) {
  if (!schema || typeof schema !== "object") {
    throw new Error("[ecs-registry] Invalid component schema JSON");
  }
  const { version, components } = schema;
  if (version !== 1) {
    throw new Error(`[ecs-registry] component-schemas.json version mismatch: expected 1, got ${version}`);
  }
  if (!Array.isArray(components) || components.length !== 15) {
    throw new Error(`[ecs-registry] expected 15 components, got ${Array.isArray(components) ? components.length : "N/A"}`);
  }

  for (let i = 0; i < EXPECTED_NAMES.length; i++) {
    const expectedName = EXPECTED_NAMES[i];
    const comp = components[i];
    if (!comp) {
      throw new Error(`[ecs-registry] Missing component at index ${i} (${expectedName})`);
    }
    const { name, bit } = comp;
    if (name !== expectedName) {
      throw new Error(`[ecs-registry] Component order/name mismatch at index ${i}: expected "${expectedName}", got "${name}"`);
    }
    if (bit !== i) {
      throw new Error(`[ecs-registry] Component bit mismatch for "${name}": expected bit ${i}, got ${bit}`);
    }
  }
})(componentSchemas);

// Utility: clamp
function clamp(v, min, max) {
  if (min != null && v < min) v = min;
  if (max != null && v > max) v = max;
  return v;
}

// Utility: shallow test for plain object
function isPlainObject(o) {
  return !!o && typeof o === "object" && (Object.getPrototypeOf(o) === Object.prototype || Object.getPrototypeOf(o) === null);
}

// Utility: deep merge (plain objects only; arrays and non-objects replaced)
function deepMerge(target, source) {
  if (!isPlainObject(target) || !isPlainObject(source)) {
    return isPlainObject(source) ? { ...source } : source;
  }
  const out = { ...target };
  for (const k of Object.keys(source)) {
    const sv = source[k];
    const tv = target[k];
    if (isPlainObject(sv) && isPlainObject(tv)) {
      out[k] = deepMerge(tv, sv);
    } else {
      out[k] = isPlainObject(sv) ? deepMerge({}, sv) : sv;
    }
  }
  return out;
}

// Precompute normalized metadata and fast-lookup structures
const COMPONENTS = (() => {
  const out = [];
  for (const comp of componentSchemas.components) {
    const { name, bit, fields } = comp;
    const defaults = {};
    const fieldMeta = {};
    if (Array.isArray(fields)) {
      for (const f of fields) {
        // Normalize types commonly used in schemas
        const fname = f.name;
        const ftype = f.type;
        const fmin = f.min != null ? f.min : null;
        const fmax = f.max != null ? f.max : null;
        const fdefault = f.default;

        defaults[fname] = fdefault;

        fieldMeta[fname] = {
          name: fname,
          type: ftype,
          min: fmin,
          max: fmax,
          default: fdefault,
        };
      }
    }
    out.push(Object.freeze({ name, bit, fields, defaults: Object.freeze({ ...defaults }), fieldMeta: Object.freeze({ ...fieldMeta }) }));
  }
  return Object.freeze(out);
})();

// NAME_TO_BIT, BIT_TO_NAME
const NAME_TO_BIT = (() => {
  const m = new Map();
  for (const c of COMPONENTS) {
    m.set(c.name, c.bit);
  }
  return m;
})();

const BIT_TO_NAME = (() => {
  const arr = new Array(COMPONENTS.length);
  for (const c of COMPONENTS) {
    arr[c.bit] = c.name;
  }
  return Object.freeze(arr);
})();

// MASKS
const MASKS = (() => {
  const m = {};
  for (const c of COMPONENTS) {
    m[c.name] = (1 << c.bit) & 0xffff;
  }
  return Object.freeze(m);
})();

// Utilities
function maskOf(names) {
  let mask = 0;
  if (Array.isArray(names)) {
    for (const n of names) {
      const bit = NAME_TO_BIT.get(n);
      if (bit == null) {
        // Unknown name: in dev, the registry layer will warn; here we silently ignore
        continue;
      }
      mask |= (1 << bit) & 0xffff;
    }
  }
  return mask & 0xffff;
}

function namesOfMask(mask) {
  const names = [];
  for (let bit = 0; bit < BIT_TO_NAME.length; bit++) {
    const bitMask = (1 << bit) & 0xffff;
    if ((mask & bitMask) !== 0) {
      names.push(BIT_TO_NAME[bit]);
    }
  }
  return names;
}

// Special dynamic clamp components
const DYNAMIC_CLAMP_SET = new Set(["Health", "Stamina", "Poise"]);
function applyDynamicClampIfNeeded(compName, dataObj) {
  if (!DYNAMIC_CLAMP_SET.has(compName) || !dataObj) return;
  // Enforce value in [0..max] if both value and max are numeric
  const val = Number(dataObj.value);
  const max = Number(dataObj.max);
  if (Number.isFinite(val) && Number.isFinite(max)) {
    dataObj.value = clamp(val, 0, max);
  }
}

// Per-field coercion helpers based on schema metadata
function coerceByType(type, value) {
  switch (type) {
    case "int":
    case "integer":
      return Math.trunc(Number(value) || 0);
    case "number":
    case "float":
      return Number(value);
    case "bool":
    case "boolean":
      return !!value;
    case "string":
      return String(value);
    default:
      // Unknown or custom types: return as-is
      return value;
  }
}

function applyPatchWithClamps(meta, target, patch, dev, unknownKeyWarnOnceSet) {
  if (!patch || typeof patch !== "object") return;

  const fm = meta.fieldMeta || {};
  for (const key of Object.keys(patch)) {
    const fmeta = fm[key];
    if (!fmeta) {
      if (dev) {
        // Warn once per component name for unknown fields
        if (!unknownKeyWarnOnceSet.has(meta.name)) {
          unknownKeyWarnOnceSet.add(meta.name);
          // Category: ecs.registry.validation
          console.warn(`[ecs.registry.validation] Ignoring unknown field "${key}" for component "${meta.name}"`);
        }
      }
      continue; // ignore unknown keys
    }
    const { type, min, max } = fmeta;
    let v = coerceByType(type, patch[key]);
    if (typeof v === "number" && Number.isFinite(v)) {
      v = clamp(v, min, max);
    }
    target[key] = v;
  }
}

/**
 * ENTITY_TYPES archetypes.
 * Exactly aligned with spec:
 * - Player
 * - Enemy
 * - Item
 * - Tile
 * - Projectile
 */
const ENTITY_TYPES = (() => {
  // Build overlays as specified; masks are calculated below to stay authoritative.
  const types = {
    Player: {
      overlays: {
        Attributes: { attackPower: 8, defense: 0 },
        Renderable: { depth: 300, visible: true },
        Collider: { w: 12, h: 12, offsetX: 0, offsetY: 0, solid: true, isTrigger: false },
      },
      // Components included: Position, Velocity, Attributes, Health, Stamina, Poise, Inventory, Renderable, Collider, AI, Player
      mask: 0, // computed after
      include: ["Position", "Velocity", "Attributes", "Health", "Stamina", "Poise", "Inventory", "Renderable", "Collider", "AI", "Player"],
    },
    Enemy: {
      overlays: {
        Renderable: { depth: 300 },
        Collider: { w: 12, h: 12, solid: true },
      },
      // Components included: Position, Velocity, Attributes, Health, Stamina, Poise, Renderable, Collider, AI, Enemy
      mask: 0,
      include: ["Position", "Velocity", "Attributes", "Health", "Stamina", "Poise", "Renderable", "Collider", "AI", "Enemy"],
    },
    Item: {
      overlays: {
        Collider: { w: 12, h: 12, solid: false, isTrigger: true },
        Item: { onGround: true },
      },
      // Components included: Position, Renderable, Collider, Item
      mask: 0,
      include: ["Position", "Renderable", "Collider", "Item"],
    },
    Tile: {
      overlays: {
        Collider: { w: 16, h: 16, offsetX: 0, offsetY: 0, solid: true, isTrigger: false },
      },
      // Components included: Position, Tile, Collider
      mask: 0,
      include: ["Position", "Tile", "Collider"],
    },
    Projectile: {
      overlays: {
        Renderable: { depth: 500 },
        Collider: { w: 4, h: 4, isTrigger: true, solid: false },
      },
      // Components included: Position, Velocity, Projectile, Renderable, Collider
      mask: 0,
      include: ["Position", "Velocity", "Projectile", "Renderable", "Collider"],
    },
  };

  // Compute masks
  for (const typeId of Object.keys(types)) {
    const t = types[typeId];
    t.mask = maskOf(t.include);
    // Remove helper property from the exported constant
    delete t.include;
  }
  return Object.freeze(types);
})();

/**
 * Create a new ECS Registry.
 *
 * Public API methods:
 * - createEntity
 * - destroyEntity
 * - addComponent
 * - removeComponent
 * - hasComponent
 * - getComponent
 * - patchComponent
 * - getSignature
 * - query
 * - queryByNames
 * - forEach
 * - stats
 * - setProfilerHooks
 * - createEntityOf
 *
 * Entities are 1-based; id 0 is reserved and invalid.
 *
 * @param {{ dev?: boolean, initialCapacity?: number }} [opts]
 * @returns {object} Registry
 */
export function createRegistry({ dev = false, initialCapacity = 4096 } = {}) {
  let capacity = Math.max(2, nextPowerOfTwo(initialCapacity | 0)); // ensure >= 2 (index 0 unused)
  let signatures = new Uint16Array(capacity);
  let alive = new Uint8Array(capacity); // 0/1 flags
  let aliveCount = 0;

  // ID allocation
  let nextIdCounter = 0; // highest ever allocated id
  const freeIds = [];

  // Profiler hooks (optional)
  let profilerHooks = null;

  // One-time dev warnings
  const devWarnGetCompOnce = new Set();
  const devWarnUnknownPatchKeyOnce = new Set();

  // Per-component stores by bit index
  const storesByBit = COMPONENTS.map((meta) => ({
    name: meta.name,
    bit: meta.bit,
    mask: (1 << meta.bit) & 0xffff,
    count: 0,
    denseIds: new Uint32Array(capacity),
    data: [],
    sparseIndex: (() => {
      const arr = new Int32Array(capacity);
      arr.fill(-1);
      return arr;
    })(),
  }));

  function nextPowerOfTwo(n) {
    let x = n <= 0 ? 1 : n;
    x--;
    x |= x >> 1;
    x |= x >> 2;
    x |= x >> 4;
    x |= x >> 8;
    x |= x >> 16;
    x++;
    return x;
  }

  function ensureCapacityForId(id) {
    if (id < capacity) return;
    let newCap = capacity;
    while (newCap <= id) newCap *= 2;

    // Resize top-level tables
    const newSignatures = new Uint16Array(newCap);
    newSignatures.set(signatures);
    signatures = newSignatures;

    const newAlive = new Uint8Array(newCap);
    newAlive.set(alive);
    alive = newAlive;

    // Resize per-component sparse/dense structures
    for (const store of storesByBit) {
      const newSparse = new Int32Array(newCap);
      newSparse.fill(-1);
      newSparse.set(store.sparseIndex);
      store.sparseIndex = newSparse;

      const newDenseIds = new Uint32Array(newCap);
      newDenseIds.set(store.denseIds.subarray(0, store.count));
      store.denseIds = newDenseIds;
      // store.data is a dynamic JS array; no change needed
    }

    capacity = newCap;
  }

  function assertValidId(id) {
    if (!dev) return;
    if ((id | 0) !== id || id <= 0 || id >= capacity) {
      throw new Error(`[ecs-registry] Invalid entity id: ${id}`);
    }
  }

  function isAlive(id) {
    return alive[id] === 1;
  }

  function assertAlive(id) {
    if (!dev) return;
    if (!isAlive(id)) {
      throw new Error(`[ecs-registry] Entity ${id} is not alive`);
    }
  }

  function getStoreByName(name) {
    const bit = NAME_TO_BIT.get(name);
    if (bit == null) return null;
    return storesByBit[bit];
  }

  function assertKnownComponent(name) {
    if (!dev) return;
    if (!NAME_TO_BIT.has(name)) {
      throw new Error(`[ecs-registry] Unknown component "${name}"`);
    }
  }

  function isComponentPresent(id, store) {
    return store.sparseIndex[id] !== -1;
  }

  function fireHook(kind, a, b) {
    if (!profilerHooks) return;
    try {
      const fn = profilerHooks[kind];
      if (typeof fn === "function") {
        if (b !== undefined) fn(a, b);
        else fn(a);
      }
    } catch (err) {
      // Guard hooks to avoid destabilizing loops in dev or prod
      if (dev) {
        console.warn(`[ecs-registry] profiler hook "${kind}" threw:`, err);
      }
    }
  }

  function addComponentInternal(id, store, values) {
    // Ensure not present
    if (dev && isComponentPresent(id, store)) {
      throw new Error(`[ecs-registry] Entity ${id} already has component "${store.name}"`);
    }
    if (!dev && isComponentPresent(id, store)) {
      return; // no-op in prod
    }

    // Build data object from defaults
    const meta = COMPONENTS[store.bit];
    const obj = { ...meta.defaults };

    // Apply patch values with clamps
    applyPatchWithClamps(meta, obj, values, dev, devWarnUnknownPatchKeyOnce);
    applyDynamicClampIfNeeded(store.name, obj);

    // Insert into dense arrays
    const denseIndex = store.count;
    store.count = denseIndex + 1;
    store.denseIds[denseIndex] = id;
    store.data[denseIndex] = obj;
    store.sparseIndex[id] = denseIndex;

    // Update signature
    signatures[id] = (signatures[id] | store.mask) & 0xffff;

    // Profiler hook
    fireHook("onAdd", id, store.name);
  }

  function removeComponentInternal(id, store) {
    const denseIndex = store.sparseIndex[id];
    if (denseIndex === -1) {
      if (dev) {
        throw new Error(`[ecs-registry] Entity ${id} does not have component "${store.name}"`);
      }
      return; // no-op in prod
    }

    const lastIndex = store.count - 1;
    const lastId = store.denseIds[lastIndex];

    if (denseIndex !== lastIndex) {
      // Move last into removed slot
      store.denseIds[denseIndex] = lastId;
      store.data[denseIndex] = store.data[lastIndex];
      store.sparseIndex[lastId] = denseIndex;
    }
    // Clear last slot
    store.data[lastIndex] = undefined;
    store.count = lastIndex;
    store.sparseIndex[id] = -1;

    // Update signature
    signatures[id] = (signatures[id] & ~store.mask) & 0xffff;

    // Profiler hook
    fireHook("onRemove", id, store.name);
  }

  function patchComponentInternal(id, store, patch) {
    const denseIndex = store.sparseIndex[id];
    if (denseIndex === -1) {
      if (dev) {
        throw new Error(`[ecs-registry] Entity ${id} does not have component "${store.name}"`);
      }
      return; // no-op in prod
    }

    const obj = store.data[denseIndex];
    const meta = COMPONENTS[store.bit];
    applyPatchWithClamps(meta, obj, patch, dev, devWarnUnknownPatchKeyOnce);
    applyDynamicClampIfNeeded(store.name, obj);

    fireHook("onPatch", id, store.name);
  }

  function createEntity(initialMask = 0, initialOverrides = {}) {
    // Allocate id
    let id;
    if (freeIds.length > 0) {
      id = freeIds.pop();
    } else {
      id = nextIdCounter + 1;
      ensureCapacityForId(id);
      nextIdCounter = id;
    }

    alive[id] = 1;
    signatures[id] = 0; // start empty
    aliveCount++;

    // Add components based on initialMask
    if ((initialMask | 0) !== initialMask) initialMask = 0;
    let mask = initialMask & 0xffff;
    while (mask !== 0) {
      const lowest = mask & -mask;
      const bit = Math.clz32 ? 31 - Math.clz32(lowest) : getBitIndex(lowest);
      const store = storesByBit[bit];
      const compName = store.name;
      const patch = isPlainObject(initialOverrides) && isPlainObject(initialOverrides[compName])
        ? initialOverrides[compName]
        : initialOverrides[compName] != null
          ? initialOverrides[compName]
          : undefined;
      addComponentInternal(id, store, patch);
      mask &= mask - 1; // clear lowest set bit
    }

    fireHook("onCreate", id);
    return id;
  }

  function destroyEntity(id) {
    assertValidId(id);
    if (!isAlive(id)) {
      if (dev) {
        throw new Error(`[ecs-registry] Cannot destroy: entity ${id} is not alive`);
      }
      return; // no-op in prod
    }

    // Remove all components present using signature bits
    let sig = signatures[id] & 0xffff;
    while (sig !== 0) {
      const lowest = sig & -sig;
      const bit = Math.clz32 ? 31 - Math.clz32(lowest) : getBitIndex(lowest);
      const store = storesByBit[bit];
      removeComponentInternal(id, store);
      sig &= sig - 1;
    }

    signatures[id] = 0;
    alive[id] = 0;
    aliveCount--;

    // Recycle id
    freeIds.push(id);

    fireHook("onDestroy", id);
  }

  function addComponent(id, compName, values) {
    assertValidId(id);
    assertAlive(id);
    assertKnownComponent(compName);
    const store = getStoreByName(compName);
    if (!store) {
      // Unknown: prod no-op
      return;
    }
    addComponentInternal(id, store, values);
  }

  function removeComponent(id, compName) {
    assertValidId(id);
    assertAlive(id);
    assertKnownComponent(compName);
    const store = getStoreByName(compName);
    if (!store) {
      return;
    }
    removeComponentInternal(id, store);
  }

  function hasComponent(id, compName) {
    if ((id | 0) !== id || id <= 0 || id >= capacity) return false;
    if (!NAME_TO_BIT.has(compName)) return false;
    const bit = NAME_TO_BIT.get(compName);
    const mask = (1 << bit) & 0xffff;
    return isAlive(id) && (signatures[id] & mask) !== 0;
  }

  function getComponent(id, compName) {
    assertValidId(id);
    assertAlive(id);
    assertKnownComponent(compName);
    const store = getStoreByName(compName);
    if (!store) return null;
    const denseIndex = store.sparseIndex[id];
    if (denseIndex === -1) return null;
    if (dev && !devWarnGetCompOnce.has(compName)) {
      devWarnGetCompOnce.add(compName);
      console.warn(`[ecs.registry.validation] getComponent("${compName}") returns a live reference; prefer patchComponent to preserve clamp invariants.`);
    }
    return store.data[denseIndex];
  }

  function patchComponent(id, compName, patch) {
    assertValidId(id);
    assertAlive(id);
    assertKnownComponent(compName);
    const store = getStoreByName(compName);
    if (!store) return;
    patchComponentInternal(id, store, patch);
  }

  function getSignature(id) {
    assertValidId(id);
    return signatures[id] & 0xffff;
  }

  function* query(requiredMask, excludedMask = 0) {
    const req = requiredMask & 0xffff;
    const exc = excludedMask & 0xffff;
    for (let id = 1; id < capacity; id++) {
      if (alive[id] !== 1) continue;
      const sig = signatures[id];
      if ((sig & req) === req && (sig & exc) === 0) {
        yield id;
      }
    }
  }

  function queryByNames(required, excluded) {
    const req = maskOf(required);
    const exc = Array.isArray(excluded) ? maskOf(excluded) : 0;
    return query(req, exc);
  }

  function forEach(requiredMask, fn) {
    const req = requiredMask & 0xffff;
    for (let id = 1; id < capacity; id++) {
      if (alive[id] !== 1) continue;
      const sig = signatures[id];
      if ((sig & req) === req) {
        fn(id);
      }
    }
  }

  function stats() {
    const perComponent = {};
    for (const store of storesByBit) {
      perComponent[store.name] = store.count | 0;
    }
    return {
      capacity: capacity | 0,
      alive: aliveCount | 0,
      free: ((capacity - 1) - aliveCount) | 0,
      perComponent,
    };
  }

  function setProfilerHooks(hooks) {
    if (!hooks || typeof hooks !== "object") {
      profilerHooks = null;
      return;
    }
    // Only accept known hooks
    profilerHooks = {
      onCreate: typeof hooks.onCreate === "function" ? hooks.onCreate : undefined,
      onDestroy: typeof hooks.onDestroy === "function" ? hooks.onDestroy : undefined,
      onAdd: typeof hooks.onAdd === "function" ? hooks.onAdd : undefined,
      onRemove: typeof hooks.onRemove === "function" ? hooks.onRemove : undefined,
      onPatch: typeof hooks.onPatch === "function" ? hooks.onPatch : undefined,
    };
  }

  function createEntityOf(typeId, overrides = {}) {
    const arche = ENTITY_TYPES[typeId];
    if (!arche) {
      if (dev) {
        throw new Error(`[ecs-registry] Unknown entity type "${typeId}"`);
      }
      // Fallback: empty entity
      return createEntity(0, {});
    }

    // Build per-component merged overrides (archetype overlays + caller overrides per component)
    const mask = arche.mask & 0xffff;

    // Construct a dictionary of component patches
    const patches = {};
    const overlay = arche.overlays || {};
    // Apply overlay for each component in archetype mask
    let iterMask = mask;
    while (iterMask !== 0) {
      const lowest = iterMask & -iterMask;
      const bit = Math.clz32 ? 31 - Math.clz32(lowest) : getBitIndex(lowest);
      const name = BIT_TO_NAME[bit];
      const overlayPatch = overlay[name];
      if (overlayPatch != null) {
        patches[name] = isPlainObject(overlayPatch) ? deepMerge({}, overlayPatch) : overlayPatch;
      }
      iterMask &= iterMask - 1;
    }
    // Merge in caller overrides (deep)
    if (isPlainObject(overrides)) {
      for (const compName of Object.keys(overrides)) {
        // Only merge for components in the archetype mask; others ignored
        const bit = NAME_TO_BIT.get(compName);
        if (bit == null) continue;
        const compMask = (1 << bit) & 0xffff;
        if ((mask & compMask) === 0) continue;
        const ov = overrides[compName];
        if (ov == null) continue;
        const base = patches[compName] || {};
        patches[compName] = isPlainObject(ov) ? deepMerge(base, ov) : ov;
      }
    }

    const id = createEntity(mask, patches);
    return id;
  }

  // Helper: bit index fallback if Math.clz32 is not available
  function getBitIndex(singleBitMask) {
    // singleBitMask has exactly one bit set
    let idx = 0;
    let n = singleBitMask >>> 0;
    while (n > 1) {
      n >>>= 1;
      idx++;
    }
    return idx;
  }

  const registry = {
    createEntity,
    destroyEntity,
    addComponent,
    removeComponent,
    hasComponent,
    getComponent,
    patchComponent,
    getSignature,
    query,
    queryByNames,
    forEach,
    stats,
    setProfilerHooks,
    createEntityOf,
  };

  return registry;
}

/**
 * JSDoc Examples:
 *
 * Creating a Player with starting position/sprite:
 *
 * const ecs = createRegistry({ dev: true });
 * const playerId = ecs.createEntityOf('Player', {
 *   Position: { x: 100, y: 220 },
 *   Renderable: { spriteKey: 'hero_idle' }
 * });
 *
 * Iterating movers:
 *
 * ecs.forEach(MASKS.Position | MASKS.Velocity, (id) => {
 *   const pos = ecs.getComponent(id, 'Position');
 *   const vel = ecs.getComponent(id, 'Velocity');
 *   // Update position by velocity, preferably via patchComponent:
 *   ecs.patchComponent(id, 'Position', { x: pos.x + vel.x, y: pos.y + vel.y });
 * });
 *
 * Safely applying damage:
 *
 * function applyDamage(ecs, id, dmg) {
 *   const health = ecs.getComponent(id, 'Health');
 *   if (!health) return;
 *   ecs.patchComponent(id, 'Health', { value: health.value - dmg });
 *   // Dynamic clamp enforces value in [0..max] automatically.
 * }
 *
 * Phaser/data integration notes:
 * - Renderable.tintToken resolves via data/visual/color-palette.json; do not apply colors in this module.
 *   Leave to the RenderSyncSystem to map tintToken to actual tints.
 * - Component JSON is imported with ESM import assertion; ensure your build supports it or provide a loader shim.
 */

export { COMPONENTS, NAME_TO_BIT, BIT_TO_NAME, MASKS, maskOf, namesOfMask, ENTITY_TYPES };
export default createRegistry;