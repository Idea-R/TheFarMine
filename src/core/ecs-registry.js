/**
 * The Far Mine - ECS Registry (MVP, v1 component schemas)
 * ESM-only module; zero external dependencies. Importable by Phaser runtime and Node for tests.
 *
 * JSDoc Examples:
 *   const reg = createRegistry({ dev: true });
 *   const pid = createEntityOf("Player", { Position: { x: 16, y: 16 } }, reg);
 *   reg.forEach(MASKS.Position | MASKS.Velocity, id => {
 *     const p = reg.getComponent(id, "Position");
 *     const v = reg.getComponent(id, "Velocity");
 *     // integrate position by velocity, etc.
 *   });
 */

import componentSchemas from "../../data/core/component-schemas.json" assert { type: "json" };

/* ------------------------------ Boot-time Schema Validation ------------------------------ */

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

(function validateSchemasBoot() {
  if (!componentSchemas || typeof componentSchemas !== "object") {
    throw new Error("Component schemas JSON missing or invalid.");
  }
  const { version, components } = componentSchemas;
  if (version !== 1) {
    throw new Error(`Component schema version mismatch. Expected 1, got ${String(version)}.`);
  }
  if (!Array.isArray(components) || components.length !== 15) {
    throw new Error(`Component schema components count mismatch. Expected 15, got ${Array.isArray(components) ? components.length : "invalid"}.`);
  }
  for (let i = 0; i < EXPECTED_NAMES.length; i++) {
    const c = components[i];
    const expectedName = EXPECTED_NAMES[i];
    if (!c) {
      throw new Error(`Component schema missing at index ${i}. Expected ${expectedName}.`);
    }
    if (c.name !== expectedName) {
      throw new Error(`Component schema name mismatch at index ${i}: expected '${expectedName}', got '${c.name}'.`);
    }
    if (c.bit !== i) {
      throw new Error(`Component schema bit mismatch at index ${i} ('${c.name}'): expected bit ${i}, got ${c.bit}.`);
    }
  }
})();

/* ------------------------------ Component Catalog & Masks ------------------------------ */

const COMPONENTS = (() => {
  const arr = componentSchemas.components.slice().sort((a, b) => a.bit - b.bit);
  // normalize masks and shallow ensure defaults/fields present
  return arr.map((c) => ({
    name: c.name,
    bit: c.bit | 0,
    mask: (1 << c.bit) & 0xffff,
    defaults: c.defaults || {},
    fields: Array.isArray(c.fields) ? c.fields.slice() : [],
  }));
})();

const COMPONENT = (() => {
  const obj = Object.create(null);
  for (const c of COMPONENTS) {
    obj[c.name] = { bit: c.bit, mask: c.mask, defaults: c.defaults, fields: c.fields };
  }
  return obj;
})();

const MASKS = (() => {
  const obj = Object.create(null);
  for (const c of COMPONENTS) {
    obj[c.name] = c.mask;
  }
  return obj;
})();

/**
 * Compute bitmask from component name list.
 * @param {string[]} names
 * @returns {number} uint16 mask
 */
export function maskOf(names) {
  if (!Array.isArray(names)) throw new Error("maskOf: names must be an array of strings.");
  let m = 0;
  for (let i = 0; i < names.length; i++) {
    const n = names[i];
    const cm = MASKS[n];
    if ((cm | 0) !== cm) {
      throw new Error(`maskOf: unknown component name '${n}' at index ${i}.`);
    }
    m = (m | cm) & 0xffff;
  }
  return m >>> 0;
}

/**
 * Component names present in mask, ordered by ascending bit.
 * @param {number} mask
 * @returns {string[]}
 */
export function namesOfMask(mask) {
  const out = [];
  const m = mask | 0;
  for (let i = 0; i < COMPONENTS.length; i++) {
    const c = COMPONENTS[i];
    if ((m & c.mask) === c.mask) out.push(c.name);
  }
  return out;
}

/* ------------------------------ Type Coercion & Clamping Utilities ------------------------------ */

/**
 * Truncate toward zero, clamp to [min, max] if provided.
 * @param {any} v
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number}
 */
function coerceInt(v, min, max) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = 0;
  n = n < 0 ? Math.ceil(n) : Math.floor(n);
  if (Number.isFinite(min) && n < min) n = min;
  if (Number.isFinite(max) && n > max) n = max;
  return n;
}

/**
 * Number coercion with optional clamp.
 * @param {any} v
 * @param {number} [min]
 * @param {number} [max]
 * @returns {number}
 */
function coerceNumber(v, min, max) {
  let n = Number(v);
  if (!Number.isFinite(n)) n = 0;
  if (Number.isFinite(min) && n < min) n = min;
  if (Number.isFinite(max) && n > max) n = max;
  return n;
}

/**
 * Boolean coercion; strings "true"/"false" supported.
 * @param {any} v
 * @returns {boolean}
 */
function coerceBool(v) {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true") return true;
    if (s === "false") return false;
    if (s === "1") return true;
    if (s === "0") return false;
  }
  return Boolean(v);
}

/**
 * String coercion; null/undefined -> "".
 * @param {any} v
 * @returns {string}
 */
function coerceString(v) {
  if (v == null) return "";
  return String(v);
}

/**
 * Shallow merge enumerable own props from patch into target. Returns target.
 * Unknown nested keys are not traversed.
 * @template T
 * @param {T} target
 * @param {Partial<T>} patch
 * @returns {T}
 */
function shallowMergeObject(target, patch) {
  if (!patch || typeof patch !== "object") return target;
  for (const k of Object.keys(patch)) {
    target[k] = patch[k];
  }
  return target;
}

/**
 * Coerce and clamp a single field on a target object based on the field schema and provided source value.
 * @param {any} schemaField Field definition { name, type, min?, max? }
 * @param {object} targetObj
 * @param {any} srcVal
 */
function applyField(schemaField, targetObj, srcVal) {
  if (!schemaField || !targetObj) return;
  const name = schemaField.name;
  const t = (schemaField.type || schemaField.kind || typeof srcVal || "number").toString().toLowerCase();
  const min = schemaField.min;
  const max = schemaField.max;

  switch (t) {
    case "int":
    case "integer":
      targetObj[name] = coerceInt(srcVal, min, max);
      break;
    case "float":
    case "number":
      targetObj[name] = coerceNumber(srcVal, min, max);
      break;
    case "bool":
    case "boolean":
      targetObj[name] = coerceBool(srcVal);
      break;
    case "string":
      targetObj[name] = coerceString(srcVal);
      break;
    case "object": {
      const current = targetObj[name];
      const next = (current && typeof current === "object") ? current : {};
      if (srcVal && typeof srcVal === "object") {
        shallowMergeObject(next, srcVal);
      } else {
        // If a non-object provided, leave as-is; avoid surprising overwrites.
      }
      targetObj[name] = next;
      break;
    }
    default: {
      // Fallback: attempt number, else direct assign
      if (typeof srcVal === "number") {
        targetObj[name] = coerceNumber(srcVal, min, max);
      } else {
        targetObj[name] = srcVal;
      }
      break;
    }
  }
}

/**
 * Overlay values of a component into target object using schema field definitions.
 * Only known fields are applied; others are ignored.
 * @param {object} compDef { fields: FieldDef[] }
 * @param {object} target Target component data (mutated)
 * @param {object} values Source values to apply
 */
function applyComponentOverlay(compDef, target, values) {
  if (!values || typeof values !== "object") return;
  const fields = compDef.fields || [];
  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    if (Object.prototype.hasOwnProperty.call(values, f.name)) {
      applyField(f, target, values[f.name]);
    }
  }
}

/**
 * Enforce dynamic clamps for Health/Stamina/Poise: value ∈ [0, max], and non-negative max.
 * Called after any write/patch to those components.
 * @param {string} compName
 * @param {object} obj
 */
function enforceVitalClamps(compName, obj) {
  if (!obj || typeof obj !== "object") return;
  if (compName === "Health" || compName === "Stamina" || compName === "Poise") {
    let max = Number(obj.max);
    if (!Number.isFinite(max) || max < 0) max = 0;
    obj.max = max;
    let v = Number(obj.value);
    if (!Number.isFinite(v)) v = 0;
    if (v < 0) v = 0;
    if (v > max) v = max;
    obj.value = v;
  }
}

/**
 * Shallow clone component defaults (one level); arrays become shallow-copied.
 * @param {object} src
 * @returns {object}
 */
function cloneDefaults(src) {
  const out = {};
  if (!src || typeof src !== "object") return out;
  for (const k of Object.keys(src)) {
    const v = src[k];
    if (Array.isArray(v)) out[k] = v.slice();
    else if (v && typeof v === "object") out[k] = { ...v };
    else out[k] = v;
  }
  return out;
}

/* ------------------------------ Storage Model & Registry ------------------------------ */

/**
 * Create a new ECS Registry.
 * @param {object} [options]
 * @param {boolean} [options.dev=false] Enable dev-time assertions and diagnostics.
 * @param {number} [options.initialCapacity=4096] Initial entity capacity (grows power-of-two).
 */
export function createRegistry(options = {}) {
  const dev = !!options.dev;
  let capacity = nextPow2(options.initialCapacity != null ? options.initialCapacity : 4096);
  if (capacity < 2) capacity = 2; // need id >= 1
  let signatures = new Uint16Array(capacity);
  let aliveFlags = new Uint8Array(capacity); // 1 if entity id is alive
  let aliveCount = 0;
  const freeList = [];
  let nextId = 1;
  let maxEntityId = 0;

  // DEV diagnostics
  const devWarnedMissing = dev ? new Set() : null;

  // Profiler hooks (no-ops by default)
  let onAdd = NOOP;
  let onRemove = NOOP;
  let onCreate = NOOP;
  let onDestroy = NOOP;
  let onPatch = NOOP;

  // Per-component dense stores
  const storesByName = Object.create(null);
  for (const c of COMPONENTS) {
    storesByName[c.name] = createStoreRecord();
  }

  function createStoreRecord() {
    return {
      data: [], // array of component data objects
      denseIds: [], // entity id at index
      sparseIndex: new Map(), // entity id -> dense index
    };
  }

  function ensureCapacityForId(id) {
    if (id < capacity) return;
    let newCap = capacity;
    while (newCap <= id) {
      newCap = newCap << 1;
    }
    const newSigs = new Uint16Array(newCap);
    newSigs.set(signatures);
    signatures = newSigs;
    const newAlive = new Uint8Array(newCap);
    newAlive.set(aliveFlags);
    aliveFlags = newAlive;
    capacity = newCap;
  }

  function allocateId() {
    let id = freeList.length > 0 ? freeList.pop() : nextId++;
    ensureCapacityForId(id);
    if (id > maxEntityId) maxEntityId = id;
    return id;
  }

  function devAssertId(id, methodName) {
    if (!dev) return true;
    if (typeof id !== "number" || !Number.isInteger(id) || id <= 0 || id >= capacity) {
      throw new Error(`[ecs.registry.validation] ${methodName}: invalid entity id ${String(id)}.`);
    }
    if (!aliveFlags[id]) {
      throw new Error(`[ecs.registry.validation] ${methodName}: entity ${id} is not alive.`);
    }
    return true;
  }

  function getCompDefByName(compName) {
    const def = COMPONENT[compName];
    if (!def) {
      throw new Error(`Unknown component '${compName}'.`);
    }
    return def;
  }

  function hasComponentInternal(id, compName) {
    const def = COMPONENT[compName];
    if (!def) return false;
    const sig = signatures[id] | 0;
    return (sig & def.mask) === def.mask;
  }

  function addComponentInternal(id, compName, values) {
    const def = getCompDefByName(compName);
    if (hasComponentInternal(id, compName)) {
      // Already present; dev: prefer patch behavior
      if (dev) {
        // patch with provided values to be helpful
        if (values && typeof values === "object") {
          patchComponentInternal(id, compName, values);
        }
        return;
      } else {
        if (values && typeof values === "object") {
          patchComponentInternal(id, compName, values);
        }
        return;
      }
    }
    const store = storesByName[compName];
    const idx = store.data.length;
    store.denseIds.push(id);
    const compData = cloneDefaults(def.defaults);
    // Apply overlay if provided
    if (values && typeof values === "object") {
      applyComponentOverlay(def, compData, values);
    }
    // Vital clamps
    enforceVitalClamps(compName, compData);
    store.data.push(compData);
    store.sparseIndex.set(id, idx);
    // Update signature
    signatures[id] = (signatures[id] | def.mask) & 0xffff;
    // Hooks
    onAdd && onAdd({ id, compName });
  }

  function removeComponentInternal(id, compName) {
    const def = getCompDefByName(compName);
    if (!hasComponentInternal(id, compName)) {
      if (dev) {
        // silent in production, no-op
      }
      return;
    }
    const store = storesByName[compName];
    const idx = store.sparseIndex.get(id);
    if (idx === undefined) {
      // Inconsistent; guard
      if (dev) {
        console.warn(`[ecs.registry.validation] removeComponent: internal index missing for entity ${id}, component ${compName}.`);
      }
      // still clear signature
      signatures[id] = (signatures[id] & (~def.mask)) & 0xffff;
      return;
    }
    const lastIdx = store.data.length - 1;
    const lastId = store.denseIds[lastIdx];
    if (idx !== lastIdx) {
      // dense-swap
      store.data[idx] = store.data[lastIdx];
      store.denseIds[idx] = lastId;
      store.sparseIndex.set(lastId, idx);
    }
    // pop last
    store.data.pop();
    store.denseIds.pop();
    store.sparseIndex.delete(id);
    // Update signature
    signatures[id] = (signatures[id] & (~def.mask)) & 0xffff;
    // Hooks
    onRemove && onRemove({ id, compName });
  }

  function patchComponentInternal(id, compName, patch) {
    const def = getCompDefByName(compName);
    if (!hasComponentInternal(id, compName)) {
      if (dev) {
        const key = `${compName}`;
        if (!devWarnedMissing.has(key)) {
          console.warn(`[ecs.registry.validation] patchComponent: entity ${id} lacks component '${compName}'. (logged once)`);
          devWarnedMissing.add(key);
        }
      }
      return;
    }
    const store = storesByName[compName];
    const idx = store.sparseIndex.get(id);
    if (idx === undefined) {
      if (dev) {
        console.warn(`[ecs.registry.validation] patchComponent: internal index missing for entity ${id}, component ${compName}.`);
      }
      return;
    }
    const target = store.data[idx];
    if (patch && typeof patch === "object") {
      applyComponentOverlay(def, target, patch);
      enforceVitalClamps(compName, target);
      onPatch && onPatch({ id, compName, patch });
    }
  }

  function createEntity(initialMask = 0, initial = undefined) {
    const id = allocateId();
    signatures[id] = 0;
    aliveFlags[id] = 1;
    aliveCount++;
    // Add components in bit order
    const reqMask = initialMask | 0;
    for (let i = 0; i < COMPONENTS.length; i++) {
      const c = COMPONENTS[i];
      if ((reqMask & c.mask) === c.mask) {
        const initForComp = initial && typeof initial === "object" ? initial[c.name] : undefined;
        addComponentInternal(id, c.name, initForComp);
      }
    }
    // Hooks
    onCreate && onCreate({ id });
    return id;
  }

  function destroyEntity(id) {
    devAssertId(id, "destroyEntity");
    // Remove all components this entity currently has (use snapshot of signature)
    const sig = signatures[id] | 0;
    if (sig !== 0) {
      for (let i = 0; i < COMPONENTS.length; i++) {
        const c = COMPONENTS[i];
        if ((sig & c.mask) === c.mask) {
          removeComponentInternal(id, c.name);
        }
      }
    }
    // Mark dead
    signatures[id] = 0;
    aliveFlags[id] = 0;
    aliveCount--;
    freeList.push(id);
    onDestroy && onDestroy({ id });
  }

  function addComponent(id, compName, values) {
    devAssertId(id, "addComponent");
    addComponentInternal(id, compName, values);
  }

  function removeComponent(id, compName) {
    devAssertId(id, "removeComponent");
    removeComponentInternal(id, compName);
  }

  function hasComponent(id, compName) {
    if (dev) {
      if (typeof id !== "number" || id <= 0 || id >= capacity) return false;
      if (!aliveFlags[id]) return false;
    }
    return hasComponentInternal(id, compName);
  }

  function getComponent(id, compName) {
    devAssertId(id, "getComponent");
    const def = getCompDefByName(compName);
    if (!hasComponentInternal(id, compName)) {
      if (dev) {
        const key = `${compName}`;
        if (!devWarnedMissing.has(key)) {
          console.warn(`[ecs.registry.validation] getComponent: entity ${id} lacks component '${compName}'. (logged once)`);
          devWarnedMissing.add(key);
        }
      }
      return null;
    }
    const store = storesByName[compName];
    const idx = store.sparseIndex.get(id);
    if (idx === undefined) return null;
    // Note: live reference; prefer patchComponent to ensure clamps are applied.
    return store.data[idx];
  }

  function patchComponent(id, compName, patch) {
    devAssertId(id, "patchComponent");
    patchComponentInternal(id, compName, patch);
  }

  function getSignature(id) {
    devAssertId(id, "getSignature");
    return signatures[id] | 0;
  }

  function* query(requiredMask, excludedMask = 0) {
    const req = requiredMask | 0;
    const exc = excludedMask | 0;
    // Performance: raw for with minimal allocations
    for (let id = 1; id <= maxEntityId; id++) {
      if (!aliveFlags[id]) continue;
      const sig = signatures[id] | 0;
      if ((sig & req) === req && (sig & exc) === 0) {
        yield id;
      }
    }
  }

  function queryByNames(required, excluded) {
    const req = maskOf(required || []);
    const exc = excluded ? maskOf(excluded) : 0;
    return query(req, exc);
  }

  function forEach(requiredMask, fn) {
    const req = requiredMask | 0;
    for (let id = 1; id <= maxEntityId; id++) {
      if (!aliveFlags[id]) continue;
      const sig = signatures[id] | 0;
      if ((sig & req) === req) {
        fn(id);
      }
    }
  }

  function stats() {
    const perComponent = Object.create(null);
    for (const c of COMPONENTS) {
      const store = storesByName[c.name];
      perComponent[c.name] = store.data.length | 0;
    }
    return {
      capacity,
      alive: aliveCount | 0,
      free: freeList.length | 0,
      perComponent,
    };
  }

  function setProfilerHooks(hooks) {
    if (!hooks || typeof hooks !== "object") {
      onAdd = onRemove = onCreate = onDestroy = onPatch = NOOP;
      return;
    }
    onAdd = typeof hooks.onAdd === "function" ? hooks.onAdd : NOOP;
    onRemove = typeof hooks.onRemove === "function" ? hooks.onRemove : NOOP;
    onCreate = typeof hooks.onCreate === "function" ? hooks.onCreate : NOOP;
    onDestroy = typeof hooks.onDestroy === "function" ? hooks.onDestroy : NOOP;
    onPatch = typeof hooks.onPatch === "function" ? hooks.onPatch : NOOP;
  }

  /** Public Registry object */
  return {
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
  };
}

function nextPow2(n) {
  n = Math.max(1, Math.floor(n) | 0);
  n--;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  n++;
  return n >>> 0;
}

function NOOP() { /* no-op */ }

/* ------------------------------ Archetypes (ENTITY_TYPES) and Factory ------------------------------ */

// Convenience to build archetype masks/defaults using schema awareness
const ENTITY_TYPES = (() => {
  // Defaults overlays as specified (only override listed fields; others inherit schema defaults)
  const playerDefaults = {
    Position: {},
    Velocity: {},
    Attributes: { attackPower: 8, defense: 0 },
    Health: {},
    Stamina: {},
    Poise: {},
    Inventory: {},
    Renderable: { depth: 300, visible: true, tintToken: "" },
    Collider: { w: 12, h: 12, offsetX: 0, offsetY: 0, solid: true, isTrigger: false },
    AI: {},
    Player: {},
  };
  const enemyDefaults = {
    Position: {},
    Velocity: {},
    Attributes: {},
    Health: {},
    Stamina: {},
    Poise: {},
    Renderable: { depth: 300 },
    Collider: { w: 12, h: 12, solid: true, isTrigger: false },
    AI: {},
    Enemy: {},
  };
  const itemDefaults = {
    Position: {},
    Renderable: {},
    Collider: { w: 12, h: 12, solid: false, isTrigger: true },
    Item: { onGround: true },
  };
  const tileDefaults = {
    Position: {},
    Tile: {},
    Collider: { w: 16, h: 16, offsetX: 0, offsetY: 0, solid: true, isTrigger: false },
  };
  const projectileDefaults = {
    Position: {},
    Velocity: {},
    Projectile: {},
    Renderable: { depth: 500 },
    Collider: { w: 4, h: 4, solid: false, isTrigger: true, hurtboxPadPx: 0 },
  };

  function maskFromNames(names) {
    return maskOf(names);
  }

  return {
    Player: {
      mask: maskFromNames([
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
      ]),
      defaults: playerDefaults,
    },
    Enemy: {
      mask: maskFromNames([
        "Position",
        "Velocity",
        "Attributes",
        "Health",
        "Stamina",
        "Poise",
        "Renderable",
        "Collider",
        "AI",
        "Enemy",
      ]),
      defaults: enemyDefaults,
    },
    Item: {
      mask: maskFromNames([
        "Position",
        "Renderable",
        "Collider",
        "Item",
      ]),
      defaults: itemDefaults,
    },
    Tile: {
      mask: maskFromNames([
        "Position",
        "Tile",
        "Collider",
      ]),
      defaults: tileDefaults,
    },
    Projectile: {
      mask: maskFromNames([
        "Position",
        "Velocity",
        "Projectile",
        "Renderable",
        "Collider",
      ]),
      defaults: projectileDefaults,
    },
  };
})();

/**
 * Create an entity of the given archetype.
 * - If a registry is provided, creates the entity immediately and returns its id.
 * - If no registry is provided, returns a curried function expecting a registry.
 *
 * @param {"Player"|"Enemy"|"Item"|"Tile"|"Projectile"} typeId
 * @param {Object<string, object>} [overrides]
 * @param {ReturnType<typeof createRegistry>} [registry]
 * @returns {number|function} Entity id, or a function (registry) => id if registry not supplied.
 */
export function createEntityOf(typeId, overrides, registry) {
  const arch = ENTITY_TYPES[typeId];
  if (!arch) {
    throw new Error(`Unknown entity archetype '${typeId}'.`);
  }
  if (!registry) {
    return (reg) => createEntityOf(typeId, overrides, reg);
  }
  // Apply archetype mask, then defaults, then overrides (component-field aware)
  const id = registry.createEntity(arch.mask, arch.defaults);
  if (overrides && typeof overrides === "object") {
    const names = Object.keys(overrides);
    for (let i = 0; i < names.length; i++) {
      const compName = names[i];
      if ((arch.mask & (MASKS[compName] || 0)) === 0) continue; // ignore components not in archetype mask
      const patch = overrides[compName];
      if (patch && typeof patch === "object") {
        registry.patchComponent(id, compName, patch);
      }
    }
  }
  return id;
}

/* ------------------------------ Exports ------------------------------ */

export { COMPONENTS, COMPONENT, MASKS, ENTITY_TYPES };

/* Optional default export for convenience */
export default { createRegistry };

/* ------------------------------ Notes ------------------------------
- Performance: raw for loops in forEach and query; no allocations in hot paths.
- Dense stores use arrays without holes; removal uses dense-swap to keep arrays compact.
- getComponent returns a live object reference; prefer patchComponent for clamping-sensitive components (Health/Stamina/Poise).
--------------------------------------------------------------------- */