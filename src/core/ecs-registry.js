'use strict';

/**
 * ECS Registry — Core module for The Far Mine
 * Acceptance: aligns with ecs-architecture.md §5 (Components) and §8 (Registry API).
 * Includes dev guards and clamping behavior in devMode where applicable.
 *
 * This module is a standalone browser-friendly ES module with no external dependencies.
 */

/* ---------------------------------------
 * 1) DEV flags and Utilities
 * ------------------------------------- */

/** Development mode flag. */
const DEV = typeof process !== 'undefined' ? (process.env?.NODE_ENV !== 'production') : true;

/**
 * Returns true if n is a finite number.
 * @param {any} n
 * @returns {boolean}
 */
function isFiniteNumber(n) {
  return Number.isFinite(n);
}

/**
 * Clamp a number to integer within [min, max].
 * Non-finite inputs become 0 before clamping.
 * @param {number} v
 * @param {number} [min=-Infinity]
 * @param {number} [max=Infinity]
 * @returns {number}
 */
function clampInt(v, min = -Infinity, max = Infinity) {
  if (!isFiniteNumber(v)) v = 0;
  const t = Math.trunc(v);
  return Math.min(max, Math.max(min, t));
}

/**
 * Clamp a number within [min, max].
 * Non-finite inputs become 0 before clamping.
 * @param {number} v
 * @param {number} [min=-Infinity]
 * @param {number} [max=Infinity]
 * @returns {number}
 */
function clampNum(v, min = -Infinity, max = Infinity) {
  if (!isFiniteNumber(v)) v = 0;
  return Math.min(max, Math.max(min, v));
}

/**
 * Monotonic-ish millisecond clock provider.
 * Uses performance.now() when available, else Date.now().
 */
const nowMs = () =>
  (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? Math.floor(performance.now())
    : Date.now();

/**
 * Deep clone for plain objects and arrays with primitive leafs.
 * Avoids structuredClone for portability.
 * @param {any} value
 * @returns {any}
 */
function deepClone(value) {
  if (Array.isArray(value)) {
    return value.map(deepClone);
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const k in value) {
      out[k] = deepClone(value[k]);
    }
    return out;
  }
  return value;
}

/**
 * Shallow clone for plain objects. Arrays are duplicated shallowly.
 * @param {any} value
 * @returns {any}
 */
function shallowClone(value) {
  if (Array.isArray(value)) return value.slice();
  if (value && typeof value === 'object') {
    const out = {};
    for (const k in value) {
      const v = value[k];
      out[k] = Array.isArray(v) ? v.slice() : v;
    }
    return out;
  }
  return value;
}

/* ---------------------------------------
 * 2) Component Registry Metadata (Authoritative)
 * ------------------------------------- */

/**
 * Helper to ensure direction degrees in [0..359]
 * @param {number} deg
 * @returns {number}
 */
function clampDirDeg(deg) {
  deg = clampInt(deg);
  // wrap modulo 360
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/**
 * Clamp inventory slots array.
 * @param {any} slots
 * @returns {Array<{itemId:string, qty:number, durability:number}>}
 */
function clampInventorySlots(slots) {
  const out = [];
  if (!Array.isArray(slots)) return out;
  for (let i = 0; i < slots.length; i++) {
    const s = slots[i] || {};
    const itemId = (typeof s.itemId === 'string') ? s.itemId : '';
    const qty = clampInt(s.qty, 0);
    const durability = clampInt(s.durability, 0);
    out.push({ itemId, qty, durability });
  }
  return out;
}

/**
 * Validate non-empty string in DEV.
 * @param {string} s
 * @param {string} field
 */
function devAssertNonEmptyString(s, field) {
  if (!DEV) return;
  if (typeof s !== 'string' || s.trim().length === 0) {
    throw new Error(`Validation error: ${field} must be a non-empty string.`);
  }
}

/**
 * Tile hardness mapping per tileType (worldgen hardness gates).
 */
const TILE_TYPE_DEFAULTS = {
  'rock': 3,
  'floor': 3,
  'ore.copper': 4,
  'ore.iron': 5,
  'ore.quartz': 7,
};
const TILE_HARDNESS_ALLOWED = new Set([3, 4, 5, 7]);
const TILE_TYPES_ALLOWED = new Set(Object.keys(TILE_TYPE_DEFAULTS));

/**
 * Authoritative component metadata registry.
 * Each entry provides: key, version, defaults, clamp, validate, notes
 */
export const COMPONENTS = Object.freeze({
  Position: {
    key: 'Position',
    version: 1,
    defaults: Object.freeze({ x: 0, y: 0, dirDeg: 0 }),
    clamp(data) {
      const d = data || {};
      const x = clampInt(d.x);
      const y = clampInt(d.y);
      const dirDeg = clampDirDeg(d.dirDeg);
      return { x, y, dirDeg };
    },
    validate(data) {
      if (!DEV) return;
      if (!data || typeof data !== 'object') throw new Error('Position must be an object.');
      if (!Number.isInteger(data.x)) throw new Error('Position.x must be int.');
      if (!Number.isInteger(data.y)) throw new Error('Position.y must be int.');
      if (!Number.isInteger(data.dirDeg) || data.dirDeg < 0 || data.dirDeg > 359) {
        throw new Error('Position.dirDeg must be int in [0..359].');
      }
    },
    notes: 'World-space tile position and facing; owned by movement systems.'
  },

  Velocity: {
    key: 'Velocity',
    version: 1,
    defaults: Object.freeze({ vx: 0, vy: 0, maxSpeed: 0 }),
    clamp(data) {
      const d = data || {};
      let maxSpeed = clampNum(d.maxSpeed, 0);
      let vx = clampNum(d.vx);
      let vy = clampNum(d.vy);
      if (maxSpeed > 0) {
        vx = clampNum(vx, -maxSpeed, maxSpeed);
        vy = clampNum(vy, -maxSpeed, maxSpeed);
      }
      return { vx, vy, maxSpeed };
    },
    validate(data) {
      if (!DEV) return;
      if (typeof data.vx !== 'number' || !isFiniteNumber(data.vx)) throw new Error('Velocity.vx must be finite number.');
      if (typeof data.vy !== 'number' || !isFiniteNumber(data.vy)) throw new Error('Velocity.vy must be finite number.');
      if (typeof data.maxSpeed !== 'number' || data.maxSpeed < 0 || !isFiniteNumber(data.maxSpeed)) {
        throw new Error('Velocity.maxSpeed must be finite number >= 0.');
      }
      if (data.maxSpeed >= 0 && (Math.abs(data.vx) > data.maxSpeed + 1e-6 || Math.abs(data.vy) > data.maxSpeed + 1e-6)) {
        // soft assert: the clamping should prevent this
        throw new Error('Velocity components exceed maxSpeed after clamp.');
      }
    },
    notes: 'Continuous velocity in tiles/sec; owned by movement integration.'
  },

  Health: {
    key: 'Health',
    version: 1,
    defaults: Object.freeze({ max: 100, value: 100 }),
    clamp(data) {
      const d = data || {};
      let max = clampInt(d.max, 1);
      let value = clampInt(d.value, 0, max);
      return { max, value };
    },
    validate(data) {
      if (!DEV) return;
      if (!Number.isInteger(data.max) || data.max < 1) throw new Error('Health.max must be int >= 1.');
      if (!Number.isInteger(data.value) || data.value < 0 || data.value > data.max) throw new Error('Health.value must be int within [0..max].');
    },
    notes: 'Vitality pool; owned by combat resolution.'
  },

  Stamina: {
    key: 'Stamina',
    version: 1,
    defaults: Object.freeze({
      max: 100,
      value: 100,
      regenPerSec: 10,
      regenDelayAfterActionMs: 500,
      regenCooldownUntilMs: 0
    }),
    clamp(data) {
      const d = data || {};
      let max = clampInt(d.max, 0);
      let value = clampInt(d.value, 0, max);
      let regenPerSec = clampNum(d.regenPerSec, 0);
      let regenDelayAfterActionMs = clampInt(d.regenDelayAfterActionMs, 0);
      let regenCooldownUntilMs = clampInt(d.regenCooldownUntilMs, 0);
      return { max, value, regenPerSec, regenDelayAfterActionMs, regenCooldownUntilMs };
    },
    validate(data) {
      if (!DEV) return;
      if (!Number.isInteger(data.max) || data.max < 0) throw new Error('Stamina.max must be int >= 0.');
      if (!Number.isInteger(data.value) || data.value < 0 || data.value > data.max) throw new Error('Stamina.value must be int within [0..max].');
      if (typeof data.regenPerSec !== 'number' || data.regenPerSec < 0) throw new Error('Stamina.regenPerSec must be number >= 0.');
      if (!Number.isInteger(data.regenDelayAfterActionMs) || data.regenDelayAfterActionMs < 0) throw new Error('Stamina.regenDelayAfterActionMs must be int >= 0.');
      if (!Number.isInteger(data.regenCooldownUntilMs) || data.regenCooldownUntilMs < 0) throw new Error('Stamina.regenCooldownUntilMs must be int >= 0.');
    },
    notes: 'Action resource with regen delay; owned by stamina/regen system.'
  },

  Poise: {
    key: 'Poise',
    version: 1,
    defaults: Object.freeze({
      max: 50,
      value: 50,
      recoverPerSec: 10,
      breakDurationMs: 800,
      brokenUntilMs: 0
    }),
    clamp(data) {
      const d = data || {};
      let max = clampInt(d.max, 0);
      let value = clampInt(d.value, 0, max);
      let recoverPerSec = clampNum(d.recoverPerSec, 0);
      let breakDurationMs = clampInt(d.breakDurationMs, 0);
      let brokenUntilMs = clampInt(d.brokenUntilMs, 0);
      return { max, value, recoverPerSec, breakDurationMs, brokenUntilMs };
    },
    validate(data) {
      if (!DEV) return;
      if (!Number.isInteger(data.max) || data.max < 0) throw new Error('Poise.max must be int >= 0.');
      if (!Number.isInteger(data.value) || data.value < 0 || data.value > data.max) throw new Error('Poise.value must be int within [0..max].');
      if (typeof data.recoverPerSec !== 'number' || data.recoverPerSec < 0) throw new Error('Poise.recoverPerSec must be number >= 0.');
      if (!Number.isInteger(data.breakDurationMs) || data.breakDurationMs < 0) throw new Error('Poise.breakDurationMs must be int >= 0.');
      if (!Number.isInteger(data.brokenUntilMs) || data.brokenUntilMs < 0) throw new Error('Poise.brokenUntilMs must be int >= 0.');
    },
    notes: 'Stagger meter; owned by combat timing and hit-stun logic.'
  },

  Attributes: {
    key: 'Attributes',
    version: 1,
    defaults: Object.freeze({ attackPower: 10, defense: 0 }),
    clamp(data) {
      const d = data || {};
      let attackPower = clampInt(d.attackPower, 0);
      let defense = clampInt(d.defense, 0);
      return { attackPower, defense };
    },
    validate(data) {
      if (!DEV) return;
      if (!Number.isInteger(data.attackPower) || data.attackPower < 0) throw new Error('Attributes.attackPower must be int >= 0.');
      if (!Number.isInteger(data.defense) || data.defense < 0) throw new Error('Attributes.defense must be int >= 0.');
    },
    notes: 'Base combat attributes; owned by progression and equipment systems.'
  },

  Inventory: {
    key: 'Inventory',
    version: 1,
    defaults: Object.freeze({ slots: Object.freeze([]), selectedIndex: -1 }),
    clamp(data) {
      const d = data || {};
      const slots = clampInventorySlots(d.slots);
      let sel = clampInt(d.selectedIndex);
      if (!(sel === -1 || (sel >= 0 && sel < slots.length))) {
        sel = -1;
      }
      return { slots, selectedIndex: sel };
    },
    validate(data) {
      if (!DEV) return;
      if (!Array.isArray(data.slots)) throw new Error('Inventory.slots must be array.');
      for (let i = 0; i < data.slots.length; i++) {
        const s = data.slots[i];
        if (!s || typeof s !== 'object') throw new Error(`Inventory.slots[${i}] must be object.`);
        if (typeof s.itemId !== 'string') throw new Error(`Inventory.slots[${i}].itemId must be string.`);
        if (!Number.isInteger(s.qty) || s.qty < 0) throw new Error(`Inventory.slots[${i}].qty must be int >= 0.`);
        if (!Number.isInteger(s.durability) || s.durability < 0) throw new Error(`Inventory.slots[${i}].durability must be int >= 0.`);
      }
      const sel = data.selectedIndex;
      if (!(sel === -1 || (Number.isInteger(sel) && sel >= 0 && sel < data.slots.length))) {
        throw new Error('Inventory.selectedIndex invalid; must be -1 or valid slot index.');
      }
    },
    notes: 'Item slots with selectedIndex; owned by inventory/equipment systems.'
  },

  Renderable: {
    key: 'Renderable',
    version: 1,
    defaults: Object.freeze({ spriteId: '', tintToken: 'none', depth: 0 }),
    clamp(data) {
      const d = data || {};
      let spriteId = (typeof d.spriteId === 'string') ? d.spriteId : '';
      let tintToken = (typeof d.tintToken === 'string') ? d.tintToken : 'none';
      let depth = clampInt(d.depth);
      return { spriteId, tintToken, depth };
    },
    validate(data) {
      if (!DEV) return;
      if (typeof data.spriteId !== 'string') throw new Error('Renderable.spriteId must be string.');
      if (typeof data.tintToken !== 'string' || data.tintToken.trim().length === 0) {
        throw new Error('Renderable.tintToken must be non-empty string in DEV.');
      }
      if (!Number.isInteger(data.depth)) throw new Error('Renderable.depth must be int.');
    },
    notes: 'Visual presentation; owned by rendering pipeline.'
  },

  Collider: {
    key: 'Collider',
    version: 1,
    defaults: Object.freeze({
      w: 0, h: 0, offsetX: 0, offsetY: 0,
      kind: 'actor', solid: true, mask: 0
    }),
    clamp(data) {
      const d = data || {};
      let w = clampInt(d.w, 0);
      let h = clampInt(d.h, 0);
      let offsetX = clampInt(d.offsetX);
      let offsetY = clampInt(d.offsetY);
      let kind = (d.kind === 'actor' || d.kind === 'tile' || d.kind === 'attack') ? d.kind : 'actor';
      let solid = Boolean(d.solid);
      let mask = clampInt(d.mask, 0);
      return { w, h, offsetX, offsetY, kind, solid, mask };
    },
    validate(data) {
      if (!DEV) return;
      if (!Number.isInteger(data.w) || data.w < 0) throw new Error('Collider.w must be int >= 0.');
      if (!Number.isInteger(data.h) || data.h < 0) throw new Error('Collider.h must be int >= 0.');
      if (!Number.isInteger(data.offsetX)) throw new Error('Collider.offsetX must be int.');
      if (!Number.isInteger(data.offsetY)) throw new Error('Collider.offsetY must be int.');
      if (!['actor', 'tile', 'attack'].includes(data.kind)) throw new Error('Collider.kind invalid.');
      if (typeof data.solid !== 'boolean') throw new Error('Collider.solid must be boolean.');
      if (!Number.isInteger(data.mask) || data.mask < 0) throw new Error('Collider.mask must be int >= 0.');
    },
    notes: 'Axis-aligned collision shape; owned by physics/collision systems.'
  },

  AI: {
    key: 'AI',
    version: 1,
    defaults: Object.freeze({
      state: 'idle', targetId: null,
      aggroRangePx: 128, leashRangePx: 256, cooldownUntilMs: 0
    }),
    clamp(data) {
      const d = data || {};
      let state = (typeof d.state === 'string') ? d.state : 'idle';
      let targetId = (d.targetId === null || d.targetId === undefined) ? null : clampInt(d.targetId, 0);
      let aggroRangePx = clampInt(d.aggroRangePx, 0);
      let leashRangePx = clampInt(d.leashRangePx, 0);
      let cooldownUntilMs = clampInt(d.cooldownUntilMs, 0);
      return { state, targetId, aggroRangePx, leashRangePx, cooldownUntilMs };
    },
    validate(data) {
      if (!DEV) return;
      if (typeof data.state !== 'string') throw new Error('AI.state must be string.');
      if (!(data.targetId === null || (Number.isInteger(data.targetId) && data.targetId >= 0))) {
        throw new Error('AI.targetId must be null or int >= 0.');
      }
      if (!Number.isInteger(data.aggroRangePx) || data.aggroRangePx < 0) throw new Error('AI.aggroRangePx must be int >= 0.');
      if (!Number.isInteger(data.leashRangePx) || data.leashRangePx < 0) throw new Error('AI.leashRangePx must be int >= 0.');
      if (!Number.isInteger(data.cooldownUntilMs) || data.cooldownUntilMs < 0) throw new Error('AI.cooldownUntilMs must be int >= 0.');
    },
    notes: 'Basic finite-state AI; owned by behavior systems.'
  },

  PlayerTag: {
    key: 'PlayerTag',
    version: 1,
    defaults: Object.freeze({}),
    clamp(/*data*/) { return {}; },
    validate(/*data*/) { /* marker; nothing */ },
    notes: 'Marker for player-controlled entity; no fields.'
  },

  EnemyTag: {
    key: 'EnemyTag',
    version: 1,
    defaults: Object.freeze({ kindId: '' }),
    clamp(data) {
      const d = data || {};
      let kindId = (typeof d.kindId === 'string') ? d.kindId : '';
      return { kindId };
    },
    validate(data) {
      if (!DEV) return;
      if (typeof data.kindId !== 'string') throw new Error('EnemyTag.kindId must be string.');
    },
    notes: 'Marker for enemies with taxonomy id; used by spawn/AI systems.'
  },

  Tile: {
    key: 'Tile',
    version: 1,
    defaults: Object.freeze({ tileType: 'rock', hardness: 3, flags: 0 }),
    clamp(data) {
      const d = data || {};
      let tileType = (typeof d.tileType === 'string' && TILE_TYPES_ALLOWED.has(d.tileType)) ? d.tileType : 'rock';
      let hardness = clampInt(d.hardness);
      if (!TILE_HARDNESS_ALLOWED.has(hardness)) {
        hardness = TILE_TYPE_DEFAULTS[tileType] || 3;
      }
      let flags = clampInt(d.flags, 0);
      return { tileType, hardness, flags };
    },
    validate(data) {
      if (!DEV) return;
      if (typeof data.tileType !== 'string' || !TILE_TYPES_ALLOWED.has(data.tileType)) throw new Error('Tile.tileType is invalid.');
      if (!Number.isInteger(data.hardness) || !TILE_HARDNESS_ALLOWED.has(data.hardness)) {
        throw new Error('Tile.hardness must be one of {3,4,5,7}.');
      }
      if (!Number.isInteger(data.flags) || data.flags < 0) throw new Error('Tile.flags must be int >= 0.');
    },
    notes: 'World tile properties; owned by map/tile systems.'
  },

  AttackIntent: {
    key: 'AttackIntent',
    version: 1,
    defaults: Object.freeze({ attackId: null, requestedAtMs: 0 }),
    clamp(data) {
      const d = data || {};
      let attackId = (d.attackId === null || d.attackId === undefined) ? null
        : (typeof d.attackId === 'string' ? d.attackId : null);
      let requestedAtMs = clampInt(d.requestedAtMs, 0);
      return { attackId, requestedAtMs };
    },
    validate(data) {
      if (!DEV) return;
      if (!(data.attackId === null || typeof data.attackId === 'string')) throw new Error('AttackIntent.attackId must be string or null.');
      if (!Number.isInteger(data.requestedAtMs) || data.requestedAtMs < 0) throw new Error('AttackIntent.requestedAtMs must be int >= 0.');
    },
    notes: 'Input request for attack resolution; owned by input/combat systems.'
  },

  Hitbox: {
    key: 'Hitbox',
    version: 1,
    defaults: Object.freeze({ active: false, w: 0, h: 0, offsetX: 0, offsetY: 0, ownerId: 0 }),
    clamp(data) {
      const d = data || {};
      let active = Boolean(d.active);
      let w = clampInt(d.w, 0);
      let h = clampInt(d.h, 0);
      let offsetX = clampInt(d.offsetX);
      let offsetY = clampInt(d.offsetY);
      let ownerId = clampInt(d.ownerId, 0);
      return { active, w, h, offsetX, offsetY, ownerId };
    },
    validate(data) {
      if (!DEV) return;
      if (typeof data.active !== 'boolean') throw new Error('Hitbox.active must be boolean.');
      if (!Number.isInteger(data.w) || data.w < 0) throw new Error('Hitbox.w must be int >= 0.');
      if (!Number.isInteger(data.h) || data.h < 0) throw new Error('Hitbox.h must be int >= 0.');
      if (!Number.isInteger(data.offsetX)) throw new Error('Hitbox.offsetX must be int.');
      if (!Number.isInteger(data.offsetY)) throw new Error('Hitbox.offsetY must be int.');
      if (!Number.isInteger(data.ownerId) || data.ownerId < 0) throw new Error('Hitbox.ownerId must be int >= 0.');
    },
    notes: 'Transient attack/interaction hitbox; owned by combat timing.'
  },

  AudioEmitter: {
    key: 'AudioEmitter',
    version: 1,
    defaults: Object.freeze({ spatialized: true, lastEventMs: 0 }),
    clamp(data) {
      const d = data || {};
      let spatialized = Boolean(d.spatialized);
      let lastEventMs = clampInt(d.lastEventMs, 0);
      return { spatialized, lastEventMs };
    },
    validate(data) {
      if (!DEV) return;
      if (typeof data.spatialized !== 'boolean') throw new Error('AudioEmitter.spatialized must be boolean.');
      if (!Number.isInteger(data.lastEventMs) || data.lastEventMs < 0) throw new Error('AudioEmitter.lastEventMs must be int >= 0.');
    },
    notes: 'Audio cue source; owned by audio event bridge.'
  },
});

/* ---------------------------------------
 * 3) Reserved Tile Flags
 * ------------------------------------- */

/**
 * Reserved TILE_FLAGS bitfield names.
 * Note: Exact bit values may be adjusted later, but names are stable.
 */
export const TILE_FLAGS = Object.freeze({
  ROOM_FLOOR: 1 << 0,
  DOOR_BAND: 1 << 1,
  ORE_PREF: 1 << 2,
  LAMP_ANCHOR: 1 << 3,
  APPROACH3W_PROTECT: 1 << 4,
});

/* ---------------------------------------
 * 4) Component Stores (Dense SoA) Helpers
 * ------------------------------------- */

/**
 * Create a new component store (dense SoA).
 * @returns {{ byEntity: Map<number, number>, entity: number[], data: any[] }}
 */
function createStore() {
  return {
    byEntity: new Map(),
    entity: [],
    data: [],
  };
}

/**
 * Add entity and data to store.
 * @param {{ byEntity: Map<number, number>, entity: number[], data: any[] }} store
 * @param {number} entityId
 * @param {any} data
 */
function addToStore(store, entityId, data) {
  const idx = store.entity.length;
  store.byEntity.set(entityId, idx);
  store.entity.push(entityId);
  store.data.push(data);
}

/**
 * Remove entity from store if present.
 * @param {{ byEntity: Map<number, number>, entity: number[], data: any[] }} store
 * @param {number} entityId
 * @returns {boolean} true if removed
 */
function removeFromStore(store, entityId) {
  const idx = store.byEntity.get(entityId);
  if (idx === undefined) return false;
  const lastIdx = store.entity.length - 1;
  const lastEntity = store.entity[lastIdx];

  // swap-pop
  if (idx !== lastIdx) {
    store.entity[idx] = lastEntity;
    store.data[idx] = store.data[lastIdx];
    store.byEntity.set(lastEntity, idx);
  }
  store.entity.pop();
  store.data.pop();
  store.byEntity.delete(entityId);
  return true;
}

/**
 * Get store data for entity if present.
 * @param {{ byEntity: Map<number, number>, entity: number[], data: any[] }} store
 * @param {number} entityId
 * @returns {any|undefined}
 */
function getFromStore(store, entityId) {
  const idx = store.byEntity.get(entityId);
  if (idx === undefined) return undefined;
  return store.data[idx];
}

/* ---------------------------------------
 * 5) Registry Factory
 * ------------------------------------- */

/**
 * Ensure component type is known.
 * @param {string} type
 */
function ensureKnownType(type) {
  if (!COMPONENTS[type]) {
    throw new Error(`Unknown component type: ${String(type)}`);
  }
}

/**
 * Pick driver store for query by selecting smallest among allOf stores.
 * @param {Map<string, any>} stores
 * @param {{ allOf?: string[], anyOf?: string[], noneOf?: string[] }} q
 * @returns {{ driver: string|null, store: any|null }}
 */
function pickDriverStore(stores, q) {
  let driver = null;
  let store = null;
  if (Array.isArray(q.allOf) && q.allOf.length > 0) {
    let minSize = Infinity;
    for (const type of q.allOf) {
      const s = stores.get(type);
      const size = s ? s.entity.length : 0;
      if (size < minSize) {
        minSize = size;
        driver = type;
        store = s || null;
      }
    }
  }
  return { driver, store };
}

/**
 * Create an ECS registry.
 * @param {object} [config]
 * @returns {{
 *   createEntity: () => number,
 *   destroyEntity: (id:number) => void,
 *   addComponent: (id:number, type:string, data?:any) => void,
 *   removeComponent: (id:number, type:string) => void,
 *   get: (id:number, type:string) => any|undefined,
 *   set: (id:number, type:string, data:any) => void,
 *   has: (id:number, type:string) => boolean,
 *   view: (query: {allOf?:string[], anyOf?:string[], noneOf?:string[]}) => readonly number[],
 *   each: (query: {allOf?:string[], anyOf?:string[], noneOf?:string[]}, fn:(id:number, reg:any)=>any) => void,
 *   serialize: (id:number) => { id:number, components: Record<string, any> },
 *   snapshot: (filter?: string[]) => { entities: Array<{ id:number, components: Record<string, any> }> },
 *   stats: () => { entities:number, components: Record<string, number> },
 *   nowMs: () => number,
 *   COMPONENTS: typeof COMPONENTS
 * }}
 */
export function createRegistry(/*config*/) {
  // 4) Entity ID Pool with Generation Counters
  let nextId = 1;
  const freeList = [];
  const generations = new Map(); // id -> gen
  const alive = new Set();

  // 5) Component Stores
  const stores = new Map(); // type -> store

  /**
   * Ensure store exists for type.
   * @param {string} type
   * @returns {{ byEntity: Map<number, number>, entity: number[], data: any[] }}
   */
  function ensureStore(type) {
    ensureKnownType(type);
    let s = stores.get(type);
    if (!s) {
      s = createStore();
      stores.set(type, s);
    }
    return s;
  }

  /**
   * Check entity validity and liveness.
   * @param {number} id
   */
  function assertAlive(id) {
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`Invalid entity id: ${id}`);
    }
    if (!generations.has(id)) {
      throw new Error(`Stale entity id (no generation recorded): ${id}`);
    }
    if (!alive.has(id)) {
      throw new Error(`Entity not alive: ${id}`);
    }
  }

  /**
   * Clamp and validate component data for type.
   * @param {string} type
   * @param {any} data
   * @returns {any} sanitized data
   */
  function sanitizeComponent(type, data) {
    const meta = COMPONENTS[type];
    const clamped = meta.clamp(data ?? meta.defaults);
    if (DEV) meta.validate(clamped);
    return clamped;
  }

  /**
   * Read-only view materialization helper.
   * @param {{ allOf?: string[], anyOf?: string[], noneOf?: string[] }} query
   * @returns {readonly number[]}
   */
  function view(query = {}) {
    const q = query || {};
    if (DEV) {
      const allowedKeys = new Set(['allOf', 'anyOf', 'noneOf']);
      for (const k in q) {
        if (!allowedKeys.has(k)) throw new Error(`Invalid query key: ${k}`);
      }
      if (q.allOf && !Array.isArray(q.allOf)) throw new Error('query.allOf must be array.');
      if (q.anyOf && !Array.isArray(q.anyOf)) throw new Error('query.anyOf must be array.');
      if (q.noneOf && !Array.isArray(q.noneOf)) throw new Error('query.noneOf must be array.');
      if (q.allOf) q.allOf.forEach(ensureKnownType);
      if (q.anyOf) q.anyOf.forEach(ensureKnownType);
      if (q.noneOf) q.noneOf.forEach(ensureKnownType);
    }

    const { driver, store } = pickDriverStore(stores, q);
    const candidates = [];

    if (driver && store) {
      // Iterate entities having the driver component
      for (let i = 0; i < store.entity.length; i++) {
        candidates.push(store.entity[i]);
      }
    } else {
      // Fallback: iterate all alive
      for (const id of alive) candidates.push(id);
    }

    const allOf = q.allOf || null;
    const anyOf = q.anyOf || null;
    const noneOf = q.noneOf || null;

    const result = [];
    outer: for (let i = 0; i < candidates.length; i++) {
      const id = candidates[i];

      // Filter for allOf: must have all
      if (allOf) {
        for (let j = 0; j < allOf.length; j++) {
          const t = allOf[j];
          const s = stores.get(t);
          if (!s || !s.byEntity.has(id)) {
            continue outer;
          }
        }
      }

      // Filter for anyOf: must have at least one (if specified)
      if (anyOf && anyOf.length > 0) {
        let pass = false;
        for (let j = 0; j < anyOf.length; j++) {
          const t = anyOf[j];
          const s = stores.get(t);
          if (s && s.byEntity.has(id)) {
            pass = true;
            break;
          }
        }
        if (!pass) continue;
      }

      // Filter for noneOf: must not have any
      if (noneOf && noneOf.length > 0) {
        for (let j = 0; j < noneOf.length; j++) {
          const t = noneOf[j];
          const s = stores.get(t);
          if (s && s.byEntity.has(id)) {
            continue outer;
          }
        }
      }

      result.push(id);
    }

    return Object.freeze(result);
  }

  /**
   * Iterate over query results, early-exit if fn returns false.
   * @param {{ allOf?: string[], anyOf?: string[], noneOf?: string[] }} query
   * @param {(id:number, registry:any) => any} fn
   */
  function each(query, fn) {
    const arr = view(query);
    for (let i = 0; i < arr.length; i++) {
      const id = arr[i];
      const res = fn(id, api);
      if (res === false) break;
    }
  }

  /**
   * API object constructed at end to capture function refs.
   */
  const api = {
    createEntity,
    destroyEntity,
    addComponent,
    removeComponent,
    get,
    set,
    has,
    view,
    each,
    serialize,
    snapshot,
    stats,
    nowMs,
    COMPONENTS,
  };

  /**
   * Allocate a new entity id, mark alive, and init generation if first time.
   * @returns {number}
   */
  function createEntity() {
    let id;
    if (freeList.length > 0) {
      id = freeList.pop();
    } else {
      id = nextId++;
    }
    if (!generations.has(id)) {
      generations.set(id, 1);
    }
    alive.add(id);
    return id;
  }

  /**
   * Destroy an entity: remove all components immediately, bump generation, recycle id.
   * @param {number} id
   */
  function destroyEntity(id) {
    assertAlive(id);
    // Remove all components
    for (const [type, store] of stores) {
      if (store.byEntity.has(id)) {
        removeFromStore(store, id);
      }
    }
    alive.delete(id);
    const gen = generations.get(id) || 0;
    generations.set(id, gen + 1);
    freeList.push(id);
  }

  /**
   * Add a component to an entity. Errors in DEV on duplicate.
   * @param {number} id
   * @param {string} type
   * @param {any} data
   */
  function addComponent(id, type, data) {
    assertAlive(id);
    ensureKnownType(type);
    const s = ensureStore(type);
    if (DEV && s.byEntity.has(id)) {
      throw new Error(`Entity ${id} already has component ${type}.`);
    }
    const sanitized = sanitizeComponent(type, data);
    addToStore(s, id, sanitized);
  }

  /**
   * Remove a component from an entity. No-op if absent (DEV warns).
   * @param {number} id
   * @param {string} type
   */
  function removeComponent(id, type) {
    assertAlive(id);
    ensureKnownType(type);
    const s = ensureStore(type);
    const removed = removeFromStore(s, id);
    if (DEV && !removed) {
      // Static warning to aid debugging
      // eslint-disable-next-line no-console
      console.warn(`removeComponent: Entity ${id} does not have ${type}.`);
    }
  }

  /**
   * Get a shallow copy of component data for entity if present.
   * Note: does not expose internal references.
   * @param {number} id
   * @param {string} type
   * @returns {any|undefined}
   */
  function get(id, type) {
    assertAlive(id);
    ensureKnownType(type);
    const s = ensureStore(type);
    const v = getFromStore(s, id);
    if (v === undefined) return undefined;
    return deepClone(v);
  }

  /**
   * Set or create a component with clamps and validation.
   * @param {number} id
   * @param {string} type
   * @param {any} data
   */
  function set(id, type, data) {
    assertAlive(id);
    ensureKnownType(type);
    const s = ensureStore(type);
    const sanitized = sanitizeComponent(type, data);
    const idx = s.byEntity.get(id);
    if (idx === undefined) {
      addToStore(s, id, sanitized);
    } else {
      s.data[idx] = sanitized;
    }
  }

  /**
   * Check if entity has component type.
   * @param {number} id
   * @param {string} type
   * @returns {boolean}
   */
  function has(id, type) {
    assertAlive(id);
    ensureKnownType(type);
    const s = ensureStore(type);
    return s.byEntity.has(id);
  }

  /**
   * Serialize an entity to { id, components: { type: data } }.
   * @param {number} id
   * @returns {{ id:number, components: Record<string, any> }}
   */
  function serialize(id) {
    assertAlive(id);
    const components = {};
    for (const [type, store] of stores) {
      const idx = store.byEntity.get(id);
      if (idx !== undefined) {
        components[type] = deepClone(store.data[idx]);
      }
    }
    return { id, components };
  }

  /**
   * Snapshot all alive entities, optionally filtered by component allowlist.
   * @param {string[]} [filter]
   * @returns {{ entities: Array<{ id:number, components: Record<string, any> }> }}
   */
  function snapshot(filter) {
    const allow = Array.isArray(filter) ? new Set(filter) : null;
    const out = [];
    for (const id of alive) {
      const components = {};
      if (allow) {
        for (const type of allow) {
          const store = stores.get(type);
          if (store) {
            const idx = store.byEntity.get(id);
            if (idx !== undefined) {
              components[type] = deepClone(store.data[idx]);
            }
          }
        }
      } else {
        for (const [type, store] of stores) {
          const idx = store.byEntity.get(id);
          if (idx !== undefined) {
            components[type] = deepClone(store.data[idx]);
          }
        }
      }
      out.push({ id, components });
    }
    return { entities: out };
  }

  /**
   * Registry statistics.
   * @returns {{ entities:number, components: Record<string, number> }}
   */
  function stats() {
    const cmp = {};
    for (const [type, store] of stores) {
      cmp[type] = store.entity.length;
    }
    return { entities: alive.size, components: cmp };
  }

  return api;
}

/* ---------------------------------------
 * 6) Examples (Inline, comments only)
 * ------------------------------------- */

/**
// Example: Creating a player entity with core components

import { createRegistry } from './ecs-registry.js';
const reg = createRegistry();

const player = reg.createEntity();
reg.addComponent(player, 'PlayerTag', {});
reg.addComponent(player, 'Position', { x: 10, y: 5, dirDeg: 90 });
reg.addComponent(player, 'Health', { max: 100, value: 100 });
reg.addComponent(player, 'Stamina', { max: 100, value: 100, regenPerSec: 12, regenDelayAfterActionMs: 500 });
reg.addComponent(player, 'Poise', { max: 50, value: 50 });
reg.addComponent(player, 'Attributes', { attackPower: 12, defense: 2 });
reg.addComponent(player, 'Inventory', { slots: [], selectedIndex: -1 });
reg.addComponent(player, 'Renderable', { spriteId: 'hero', tintToken: 'team-blue', depth: 0 });
reg.addComponent(player, 'Collider', { w: 1, h: 1, offsetX: 0, offsetY: 0, kind: 'actor', solid: true, mask: 0 });

// Example: Querying enemies with position and health
const enemies = reg.view({ allOf: ['EnemyTag', 'Position', 'Health'] });
// Iterate
reg.each({ allOf: ['EnemyTag', 'Position', 'Health'] }, (id, registry) => {
  const pos = registry.get(id, 'Position');
  // ... do something ...
});

// Example: Snapshotting player-centric components
const snap = reg.snapshot(['Position', 'Health', 'Stamina', 'Inventory', 'Attributes']);
console.log(snap);
*/

/* ---------------------------------------
 * 7) Default export
 * ------------------------------------- */

export default createRegistry;