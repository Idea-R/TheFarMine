import componentSchemas from "../../data/core/component-schemas.json" assert { type: "json" };

/**
 * The Far Mine - MVP ECS Registry
 * ESM module implementing a data-oriented ECS with dense component stores.
 * Consumes data/core/component-schemas.json v1 to build component catalogs and masks.
 *
 * Priorities: correctness, clean API, deterministic clamping.
 */

/* ---------------------------------------------
   1) Schema Validation and Catalog Construction
----------------------------------------------*/

const EXPECTED_COMPONENT_ORDER = [
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

// Basic schema shape validation
if (!componentSchemas || typeof componentSchemas !== "object") {
  throw new Error("ecs-registry: component-schemas.json is missing or invalid (expected object).");
}
const { version, components } = componentSchemas;
if (version !== 1) {
  throw new Error(`ecs-registry: component-schemas.json version mismatch. Expected 1, got ${version}.`);
}
if (!Array.isArray(components)) {
  throw new Error("ecs-registry: components not an array in component-schemas.json.");
}
if (components.length !== 15) {
  throw new Error(`ecs-registry: expected 15 components in schema, got ${components.length}.`);
}

// Validate bits and names order
const sortedByBit = [...components].sort((a, b) => (a.bit | 0) - (b.bit | 0));
for (let i = 0; i < sortedByBit.length; i++) {
  const c = sortedByBit[i];
  if (c.bit !== i) {
    throw new Error(`ecs-registry: component bits must be contiguous 0..14. Found bit ${c.bit} at index ${i}.`);
  }
}
for (let i = 0; i < EXPECTED_COMPONENT_ORDER.length; i++) {
  const expected = EXPECTED_COMPONENT_ORDER[i];
  const actual = sortedByBit[i]?.name;
  if (actual !== expected) {
    throw new Error(
      `ecs-registry: component name/order mismatch at bit ${i}. Expected "${expected}", got "${actual}".`
    );
  }
}

// Build catalogs
/** @type {Array<{name:string, bit:number, mask:number, defaults:Record<string, any>, fields:Array<{name:string,type:string,min?:number,max?:number}>}>} */
const COMPONENTS = sortedByBit.map((c) => ({
  name: c.name,
  bit: c.bit | 0,
  mask: (1 << (c.bit | 0)) >>> 0,
  defaults: typeof c.defaults === "object" && c.defaults ? c.defaults : {},
  fields: Array.isArray(c.fields) ? c.fields : [],
}));

/** @type {{[name: string]: { bit:number, mask:number, defaults:Record<string, any>, fields:Array<{name:string,type:string,min?:number,max?:number}> }}} */
const COMPONENT = {};
/** @type {{[name: string]: number}} */
const MASKS = {};
for (const def of COMPONENTS) {
  COMPONENT[def.name] = { bit: def.bit, mask: def.mask, defaults: def.defaults, fields: def.fields };
  MASKS[def.name] = def.mask;
}

/**
 * Compute a uint16 mask from a list of component names.
 * Unknown names are ignored (no-op). Registry methods will log in dev mode.
 * @param {string[]} names
 * @returns {number} uint16 mask
 */
export function maskOf(names) {
  if (!Array.isArray(names)) return 0;
  let m = 0;
  for (const n of names) {
    const def = COMPONENT[n];
    if (def) m |= def.mask;
  }
  return m & 0xffff;
}

/**
 * Return the component names contained in a mask, in bit order.
 * @param {number} mask
 * @returns {string[]}
 */
export function namesOfMask(mask) {
  const out = [];
  let m = mask | 0;
  for (const def of COMPONENTS) {
    if ((m & def.mask) !== 0) out.push(def.name);
  }
  return out;
}

export { COMPONENTS, COMPONENT, MASKS };

/* ---------------------------------------------
   2) Coercion & Clamping Utilities
----------------------------------------------*/

/** Truncate toward zero. */
function toInt(x) {
  if (typeof x !== "number" || !isFinite(x)) return 0;
  return x < 0 ? Math.ceil(x) : Math.floor(x);
}

/** Deterministic clamp for numbers, returns number. */
function clampNumber(v, min, max) {
  let x = typeof v === "number" && isFinite(v) ? v : 0;
  if (typeof min === "number") x = Math.max(x, min);
  if (typeof max === "number") x = Math.min(x, max);
  return x;
}

/** Deterministic clamp for ints, with truncation then clamp. */
function clampInt(v, min, max) {
  let x = toInt(v);
  if (typeof min === "number") x = Math.max(x, toInt(min));
  if (typeof max === "number") x = Math.min(x, toInt(max));
  return x;
}

/**
 * Coerce a value to schema field constraints.
 * @param {{type:string,min?:number,max?:number}} field
 * @param {any} value
 * @param {any} prevValue
 * @returns {any}
 */
function coerceFieldValue(field, value, prevValue) {
  switch (field.type) {
    case "int":
      return clampInt(value, field.min, field.max);
    case "number":
      return clampNumber(value, field.min, field.max);
    case "bool":
    case "boolean":
      return Boolean(value);
    case "string":
      return value == null ? "" : String(value);
    case "object": {
      // Shallow-merge: accept only keys already present in prevValue (defaults), ignore unknown
      const base = (prevValue && typeof prevValue === "object") ? prevValue : {};
      const patch = (value && typeof value === "object") ? value : {};
      const out = Array.isArray(base) ? base.slice() : { ...base };
      for (const k of Object.keys(base)) {
        if (Object.prototype.hasOwnProperty.call(patch, k)) {
          const pv = base[k];
          const nv = patch[k];
          // Heuristic coercion by typeof base
          const t = typeof pv;
          if (t === "number") {
            // No field-level min/max metadata for nested keys; clamp to finite number deterministically
            out[k] = clampNumber(nv, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
          } else if (t === "boolean") {
            out[k] = Boolean(nv);
          } else if (t === "string") {
            out[k] = nv == null ? "" : String(nv);
          } else if (t === "object") {
            // one-level shallow copy
            out[k] = (nv && typeof nv === "object") ? { ...pv, ...nv } : pv;
          } else {
            out[k] = nv;
          }
        }
      }
      return out;
    }
    default:
      // Unknown type: pass-through
      return value;
  }
}

/**
 * Deep-ish clone (component-level, and one-level for object fields) of defaults.
 * Prevents shared references across entities.
 * @param {Record<string, any>} defaults
 */
function cloneComponentDefaults(defaults) {
  const obj = {};
  for (const k of Object.keys(defaults)) {
    const v = defaults[k];
    if (v && typeof v === "object") {
      if (Array.isArray(v)) {
        obj[k] = v.slice();
      } else {
        // one-level shallow clone
        obj[k] = { ...v };
      }
    } else {
      obj[k] = v;
    }
  }
  return obj;
}

/**
 * Apply a shallow patch to a component bag using component schema fields.
 * Deterministic: per-field coercion and clamping.
 * @param {string} compName
 * @param {Record<string, any>} target
 * @param {Record<string, any>} patch
 */
function applyComponentPatch(compName, target, patch) {
  if (!patch || typeof patch !== "object") return;
  const def = COMPONENT[compName];
  if (!def) return;
  // Apply by schema fields first
  if (Array.isArray(def.fields)) {
    for (const field of def.fields) {
      const key = field.name;
      if (!Object.prototype.hasOwnProperty.call(patch, key)) continue;
      const prev = target[key];
      const next = patch[key];
      const coerced = coerceFieldValue(field, next, prev);
      target[key] = coerced;
    }
  }
  // For any additional keys present in defaults but not listed in fields (rare), allow shallow override
  const defaults = def.defaults || {};
  for (const key of Object.keys(defaults)) {
    if (Array.isArray(def.fields) && def.fields.some((f) => f.name === key)) continue;
    if (Object.prototype.hasOwnProperty.call(patch, key)) {
      const prev = target[key];
      const next = patch[key];
      // Heuristic per typeof default
      const t = typeof defaults[key];
      if (t === "number") target[key] = clampNumber(next, Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);
      else if (t === "boolean") target[key] = Boolean(next);
      else if (t === "string") target[key] = next == null ? "" : String(next);
      else if (t === "object") {
        target[key] = (next && typeof next === "object") ? { ...prev, ...next } : prev;
      } else {
        target[key] = next;
      }
    }
  }

  // Dynamic clamps for special components
  dynamicClampSpecial(compName, target);
}

/**
 * Dynamic clamp for Health, Stamina, Poise to ensure value in [0..max].
 * Accepts either {value,max} or {current,max}. Max coerced to >=0.
 * Keeps determinism across updates.
 * @param {string} compName
 * @param {Record<string, any>} bag
 */
function dynamicClampSpecial(compName, bag) {
  if (compName !== "Health" && compName !== "Stamina" && compName !== "Poise") return;
  if (!bag || typeof bag !== "object") return;

  const maxKey = "max";
  let valueKey = "value";
  if (!(valueKey in bag) && ("current" in bag)) valueKey = "current";

  // Ensure properties exist numerically
  const maxVal = clampNumber(bag[maxKey], 0, Number.POSITIVE_INFINITY);
  let val = clampNumber(bag[valueKey], Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY);

  // Clamp and write back deterministically
  const v = Math.max(0, Math.min(val, maxVal));
  bag[maxKey] = maxVal;
  bag[valueKey] = v;
}

/* ---------------------------------------------
   3) Registry Implementation (Data-Oriented)
----------------------------------------------*/

/**
 * @typedef {Object} ProfilerHooks
 * @property {(info:{id:number, comp?:string})=>void} [onCreate]
 * @property {(info:{id:number, comp?:string})=>void} [onDestroy]
 * @property {(info:{id:number, comp:string})=>void} [onAdd]
 * @property {(info:{id:number, comp:string})=>void} [onRemove]
 * @property {(info:{id:number, comp:string, patch?:object})=>void} [onPatch]
 */

/**
 * @typedef {Object} ECSRegistry
 * @property {(opts:ProfilerHooks)=>void} setProfilerHooks
 * @property {(initialMask?:number, initial?:Record<string, object>)=>number} createEntity
 * @property {(id:number)=>void} destroyEntity
 * @property {(id:number, compName:string, values?:object)=>void} addComponent
 * @property {(id:number, compName:string)=>void} removeComponent
 * @property {(id:number, compName:string)=>boolean} hasComponent
 * @property {(id:number, compName:string)=>object|null} getComponent
 * @property {(id:number, compName:string, patch:object)=>void} patchComponent
 * @property {(id:number)=>number} getSignature
 * @property {(requiredMask:number, excludedMask?:number)=>Iterable<number>} query
 * @property {(required:string[], excluded?:string[])=>Iterable<number>} queryByNames
 * @property {(requiredMask:number, fn:(id:number)=>void)=>void} forEach
 * @property {()=>{ capacity:number, alive:number, free:number, perComponent:Record<string, number> }} stats
 */

/**
 * Create a new ECS Registry.
 * @param {{ capacity?:number, dev?:boolean }} [options]
 * @returns {ECSRegistry}
 *
 * @example
 * // Construct registry and spawn a Player at (16,16)
 * import { createRegistry, createEntityOf } from "./src/core/ecs-registry.js";
 * const ecs = createRegistry({ dev: true });
 * const playerId = createEntityOf("Player", { Position: { x: 16, y: 16 } }, ecs);
 *
 * @example
 * // PhysicsSystem integrates all entities with Position+Velocity
 * const mask = maskOf(["Position", "Velocity"]);
 * ecs.forEach(mask, (id) => {
 *   const pos = ecs.getComponent(id, "Position");
 *   const vel = ecs.getComponent(id, "Velocity");
 *   // integrate
 *   pos.x += vel.x;
 *   pos.y += vel.y;
 * });
 */
export function createRegistry(options = {}) {
  const DEV = !!options.dev;
  let capacity = toPowerOfTwo(Math.max(4096, toInt(options.capacity ?? 4096)));

  // Signatures and alive bitmap (index 0 reserved)
  let signatures = new Uint16Array(capacity + 1);
  let alive = new Uint8Array(capacity + 1); // 0 or 1

  /** @type {number[]} */
  const freeList = [];
  let nextId = 1;
  let aliveCount = 0;

  // Per-component dense stores
  const stores = {};
  for (const def of COMPONENTS) {
    stores[def.name] = {
      name: def.name,
      bit: def.bit,
      mask: def.mask,
      data: /** @type {Array<any>} */ ([]),
      denseIds: /** @type {number[]} */ ([]),
      sparseIndex: /** @type {Map<number, number>} */ (new Map()),
    };
  }

  // Profiler hooks (no-op by default)
  /** @type {ProfilerHooks} */
  let profiler = {
    onCreate: () => {},
    onDestroy: () => {},
    onAdd: () => {},
    onRemove: () => {},
    onPatch: () => {},
  };

  // Dev-only one-time warnings (unknown components, invalid ids, etc.)
  const warned = new Set();
  function warnOnce(key, msg) {
    if (!DEV) return;
    if (warned.has(key)) return;
    warned.add(key);
    // Category: ecs.registry.validation
    // Keeping logs concise and once-per-key
    console.warn(`[ecs.registry.validation] ${msg}`);
  }

  function ensureCapacity(idNeeded) {
    if (idNeeded <= capacity) return;
    let newCap = capacity;
    while (newCap < idNeeded) newCap <<= 1;
    const oldSignatures = signatures;
    const oldAlive = alive;
    signatures = new Uint16Array(newCap + 1);
    signatures.set(oldSignatures);
    alive = new Uint8Array(newCap + 1);
    alive.set(oldAlive);
    capacity = newCap;
  }

  function allocEntityId() {
    if (freeList.length > 0) {
      return freeList.pop();
    }
    const id = nextId++;
    ensureCapacity(id);
    return id;
  }

  function validateEntityId(id, requireAlive = true) {
    if (!DEV) return true;
    if (typeof id !== "number" || id <= 0 || id > capacity) {
      warnOnce(`bad-id-${id}`, `Invalid entity id "${id}".`);
      return false;
    }
    if (requireAlive && alive[id] !== 1) {
      warnOnce(`dead-id-${id}`, `Entity id "${id}" is not alive.`);
      return false;
    }
    return true;
  }

  function validateComponentName(compName) {
    if (!DEV) return true;
    if (!COMPONENT[compName]) {
      warnOnce(`unknown-comp-${compName}`, `Unknown component "${compName}".`);
      return false;
    }
    return true;
  }

  function hasComponentMask(sig, compName) {
    const def = COMPONENT[compName];
    if (!def) return false;
    return (sig & def.mask) !== 0;
  }

  function addComponentInternal(id, compName, initPatch) {
    const def = COMPONENT[compName];
    if (!def) return;
    const store = stores[compName];
    const sig = signatures[id] | 0;
    if ((sig & def.mask) !== 0) return; // already present

    // Create instance data from defaults and optional init patch
    const inst = cloneComponentDefaults(def.defaults);
    if (initPatch && typeof initPatch === "object") {
      applyComponentPatch(compName, inst, initPatch);
    }
    // Final dynamic clamp for specials
    dynamicClampSpecial(compName, inst);

    // Add to dense store
    const idx = store.data.length;
    store.data.push(inst);
    store.denseIds.push(id);
    store.sparseIndex.set(id, idx);

    // Update signature
    signatures[id] = (sig | def.mask) & 0xffff;

    profiler.onAdd && profiler.onAdd({ id, comp: compName });
  }

  function removeComponentInternal(id, compName) {
    const def = COMPONENT[compName];
    if (!def) return;
    const store = stores[compName];
    const sig = signatures[id] | 0;
    if ((sig & def.mask) === 0) return; // not present

    // Dense-swap removal
    const idx = store.sparseIndex.get(id);
    if (idx === undefined) return; // inconsistent, but avoid crash
    const lastIdx = store.data.length - 1;
    const lastId = store.denseIds[lastIdx];

    if (idx !== lastIdx) {
      // Move last into idx
      store.data[idx] = store.data[lastIdx];
      store.denseIds[idx] = lastId;
      store.sparseIndex.set(lastId, idx);
    }

    // Remove last
    store.data.pop();
    store.denseIds.pop();
    store.sparseIndex.delete(id);

    // Update signature
    signatures[id] = (sig & ~def.mask) & 0xffff;

    profiler.onRemove && profiler.onRemove({ id, comp: compName });
  }

  function destroyAllComponents(id) {
    let sig = signatures[id] | 0;
    // Remove components by iterating set bits until empty
    while (sig !== 0) {
      const lowestMask = sig & -sig; // isolate lowest set bit
      // Find component by mask
      const def = COMPONENTS.find((d) => d.mask === lowestMask);
      if (!def) {
        // Should never happen; clear bit and continue
        sig &= ~lowestMask;
        continue;
      }
      removeComponentInternal(id, def.name);
      sig = signatures[id] | 0; // update after removal
    }
  }

  function chooseMinStore(requiredMask) {
    if ((requiredMask | 0) === 0) return null;
    let best = null;
    for (const def of COMPONENTS) {
      if ((requiredMask & def.mask) !== 0) {
        const store = stores[def.name];
        if (!best || store.data.length < best.data.length) {
          best = store;
        }
      }
    }
    return best;
  }

  /** @type {ECSRegistry} */
  const api = {
    setProfilerHooks(hooks) {
      profiler = {
        onCreate: hooks?.onCreate || (() => {}),
        onDestroy: hooks?.onDestroy || (() => {}),
        onAdd: hooks?.onAdd || (() => {}),
        onRemove: hooks?.onRemove || (() => {}),
        onPatch: hooks?.onPatch || (() => {}),
      };
    },

    createEntity(initialMask = 0, initial = undefined) {
      const id = allocEntityId();
      alive[id] = 1;
      aliveCount++;
      signatures[id] = 0;

      // Apply any initial components by mask, using defaults plus provided initial overrides.
      let requiredMask = initialMask | 0;
      if (initial && typeof initial === "object") {
        // Pre-extend requiredMask from provided initial component keys to ensure included even if not in initialMask
        for (const k of Object.keys(initial)) {
          if (!COMPONENT[k]) {
            validateComponentName(k); // dev warn once
            continue;
          }
          requiredMask |= COMPONENT[k].mask;
        }
      }

      if (requiredMask) {
        for (const def of COMPONENTS) {
          if ((requiredMask & def.mask) !== 0) {
            const patch = initial && initial[def.name] ? initial[def.name] : undefined;
            addComponentInternal(id, def.name, patch);
          }
        }
      }

      profiler.onCreate && profiler.onCreate({ id });
      return id;
    },

    destroyEntity(id) {
      if (!validateEntityId(id, false)) return;
      if (alive[id] !== 1) return;
      destroyAllComponents(id);
      signatures[id] = 0;
      alive[id] = 0;
      aliveCount--;
      freeList.push(id);
      profiler.onDestroy && profiler.onDestroy({ id });
    },

    addComponent(id, compName, values) {
      if (!validateEntityId(id)) return;
      if (!validateComponentName(compName)) return;
      const sig = signatures[id] | 0;
      const def = COMPONENT[compName];
      if ((sig & def.mask) !== 0) {
        // No-op even if values provided (per requirements)
        return;
      }
      addComponentInternal(id, compName, values);
    },

    removeComponent(id, compName) {
      if (!validateEntityId(id)) return;
      if (!validateComponentName(compName)) return;
      removeComponentInternal(id, compName);
    },

    hasComponent(id, compName) {
      if (!validateEntityId(id)) return false;
      if (!validateComponentName(compName)) return false;
      return hasComponentMask(signatures[id] | 0, compName);
    },

    getComponent(id, compName) {
      if (!validateEntityId(id)) return null;
      if (!validateComponentName(compName)) return null;
      const store = stores[compName];
      const idx = store.sparseIndex.get(id);
      if (idx === undefined) return null;
      return store.data[idx];
    },

    patchComponent(id, compName, patch) {
      if (!validateEntityId(id)) return;
      if (!validateComponentName(compName)) return;
      const store = stores[compName];
      const idx = store.sparseIndex.get(id);
      if (idx === undefined) {
        if (DEV) warnOnce(`patch-missing-${compName}`, `Cannot patch missing component "${compName}" on entity ${id}.`);
        return;
      }
      const target = store.data[idx];
      applyComponentPatch(compName, target, patch);
      // Ensure dynamic clamp applied too (applyComponentPatch does it, but keep idempotent)
      dynamicClampSpecial(compName, target);
      profiler.onPatch && profiler.onPatch({ id, comp: compName, patch });
    },

    getSignature(id) {
      if (!validateEntityId(id)) return 0;
      return signatures[id] | 0;
    },

    *query(requiredMask, excludedMask = 0) {
      const req = requiredMask | 0;
      const exc = excludedMask | 0;

      const seedStore = chooseMinStore(req);
      if (seedStore) {
        const ids = seedStore.denseIds;
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const sig = signatures[id] | 0;
          if ((sig & req) === req && (sig & exc) === 0) {
            yield id;
          }
        }
      } else {
        // Full scan
        for (let id = 1; id <= capacity; id++) {
          if (alive[id] !== 1) continue;
          const sig = signatures[id] | 0;
          if ((sig & req) === req && (sig & exc) === 0) {
            yield id;
          }
        }
      }
    },

    queryByNames(required, excluded = []) {
      const req = maskOf(required);
      const exc = maskOf(excluded);
      return this.query(req, exc);
    },

    forEach(requiredMask, fn) {
      const req = requiredMask | 0;
      const seedStore = chooseMinStore(req);
      if (seedStore) {
        const ids = seedStore.denseIds;
        for (let i = 0; i < ids.length; i++) {
          const id = ids[i];
          const sig = signatures[id] | 0;
          if ((sig & req) === req) {
            fn(id);
          }
        }
      } else {
        for (let id = 1; id <= capacity; id++) {
          if (alive[id] !== 1) continue;
          const sig = signatures[id] | 0;
          if ((sig & req) === req) fn(id);
        }
      }
    },

    stats() {
      const perComponent = {};
      for (const def of COMPONENTS) {
        perComponent[def.name] = stores[def.name].data.length | 0;
      }
      const free = freeList.length | 0;
      return {
        capacity,
        alive: aliveCount | 0,
        free,
        perComponent,
      };
    },
  };

  return api;
}

/* ---------------------------------------------
   4) Archetype Definitions (ENTITY_TYPES)
----------------------------------------------*/

/**
 * ENTITY_TYPES: Archetype descriptors with mask and defaults.
 */
export const ENTITY_TYPES = (() => {
  const P = (names) => maskOf(names);

  const PlayerMask = P([
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
  ]);

  const EnemyMask = P([
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
  ]);

  const ItemMask = P(["Position", "Renderable", "Collider", "Item"]);

  const TileMask = P(["Position", "Tile", "Collider"]);

  const ProjectileMask = P(["Position", "Velocity", "Projectile", "Renderable", "Collider"]);

  /** Collider lane-alignment helper */
  function alignColliderDefaults(col) {
    if (!col || typeof col !== "object") return col;
    const out = { ...col };
    // Deterministic defaults enforcement
    if (typeof out.w !== "number") out.w = 1;
    if (typeof out.h !== "number") out.h = 1;
    out.w = Math.max(1, toInt(out.w));
    out.h = Math.max(1, toInt(out.h));
    if (typeof out.offsetX === "number") out.offsetX = toInt(out.offsetX);
    if (typeof out.offsetY === "number") out.offsetY = toInt(out.offsetY);
    if (out.isTrigger === true) out.solid = false;
    if (out.solid === true) out.isTrigger = false;
    if (typeof out.solid !== "boolean") out.solid = false;
    if (typeof out.isTrigger !== "boolean") out.isTrigger = false;
    // Optional hurtbox padding, ensure non-negative
    if (typeof out.hurtboxPadPx === "number") out.hurtboxPadPx = Math.max(0, toInt(out.hurtboxPadPx));
    return out;
  }

  return {
    Player: {
      mask: PlayerMask,
      defaults: {
        Collider: alignColliderDefaults({
          w: 12,
          h: 12,
          offsetX: 0,
          offsetY: 0,
          solid: true,
          isTrigger: false,
        }),
        Renderable: {
          depth: 300,
          visible: true,
          tintToken: "",
        },
        Attributes: {
          attackPower: 8,
          defense: 0,
        },
      },
    },
    Enemy: {
      mask: EnemyMask,
      defaults: {
        Collider: alignColliderDefaults({
          w: 12,
          h: 12,
          solid: true,
        }),
        Renderable: {
          depth: 300,
        },
      },
    },
    Item: {
      mask: ItemMask,
      defaults: {
        Collider: alignColliderDefaults({
          w: 12,
          h: 12,
          solid: false,
          isTrigger: true,
        }),
        Item: {
          onGround: true,
        },
      },
    },
    Tile: {
      mask: TileMask,
      defaults: {
        Collider: alignColliderDefaults({
          w: 16,
          h: 16,
          offsetX: 0,
          offsetY: 0,
          solid: true,
          isTrigger: false,
        }),
      },
    },
    Projectile: {
      mask: ProjectileMask,
      defaults: {
        Collider: alignColliderDefaults({
          w: 4,
          h: 4,
          solid: false,
          isTrigger: true,
          hurtboxPadPx: 0,
        }),
        Renderable: {
          depth: 500,
        },
      },
    },
  };
})();

/**
 * Convenience to instantiate an archetype.
 * Ensures Collider defaults align with lane law.
 * @param {"Player"|"Enemy"|"Item"|"Tile"|"Projectile"} typeId
 * @param {Record<string, object>} [overrides]
 * @param {ECSRegistry} registry
 * @returns {number} entity id
 */
export function createEntityOf(typeId, overrides = undefined, registry) {
  if (!registry || typeof registry.createEntity !== "function") {
    throw new Error("ecs-registry: createEntityOf requires a valid registry instance as the third argument.");
  }
  const t = ENTITY_TYPES[typeId];
  if (!t) {
    throw new Error(`ecs-registry: unknown archetype "${typeId}".`);
  }

  // Merge archetype defaults with overrides
  const initial = {};
  if (t.defaults) {
    for (const k of Object.keys(t.defaults)) {
      initial[k] = cloneComponentDefaults(t.defaults[k]);
    }
  }
  if (overrides && typeof overrides === "object") {
    for (const k of Object.keys(overrides)) {
      const def = COMPONENT[k];
      if (!def) continue; // Ignore unknown
      // Merge shallowly per component
      const base = initial[k] || cloneComponentDefaults(def.defaults);
      const patch = overrides[k];
      applyComponentPatch(k, base, patch);
      initial[k] = base;
    }
  }

  // Secondary collider alignment after overrides
  if (initial.Collider) {
    initial.Collider = (function align(col) {
      if (!col || typeof col !== "object") return col;
      const out = { ...col };
      if (typeof out.w !== "number") out.w = 1;
      if (typeof out.h !== "number") out.h = 1;
      out.w = Math.max(1, toInt(out.w));
      out.h = Math.max(1, toInt(out.h));
      if (out.isTrigger === true) out.solid = false;
      if (out.solid === true) out.isTrigger = false;
      if (typeof out.solid !== "boolean") out.solid = false;
      if (typeof out.isTrigger !== "boolean") out.isTrigger = false;
      if (typeof out.hurtboxPadPx === "number") out.hurtboxPadPx = Math.max(0, toInt(out.hurtboxPadPx));
      return out;
    })(initial.Collider);
  }

  return registry.createEntity(t.mask, initial);
}

/* ---------------------------------------------
   5) Helpers
----------------------------------------------*/

function toPowerOfTwo(n) {
  n = Math.max(1, n | 0);
  let p = 1;
  while (p < n) p <<= 1;
  return p;
}

// Default export is optional; exporting object with createRegistry per requirements
export default { createRegistry };