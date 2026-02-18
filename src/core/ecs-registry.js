/**
 * src/core/ecs-registry.js
 * Pure ESM JavaScript module implementing The Far Mine ECS Registry with dense SoA storage,
 * deterministic iteration, and DEV-mode clamps.
 * No external dependencies; strict mode implied by ESM.
 */

/**
 * JSDoc Typedefs
 *
 * @typedef {Object} Query
 * @property {string[]=} allOf - Entity must have all of these components.
 * @property {string[]=} anyOf - Entity must have at least one of these components.
 * @property {string[]=} noneOf - Entity must not have any of these components.
 *
 * @typedef {Object} Registry
 * @property {() => number} createEntity - Create a new entity id (eid) with generation tracking.
 * @property {(eid:number) => void} destroyEntity - Destroy an entity, removing all components, bumping generation, and recycling the eid.
 * @property {(eid:number, type:string, data?:Object) => void} addComponent - Add a component to an entity using default values merged with data.
 * @property {(eid:number, type:string) => void} removeComponent - Remove a component from an entity if present.
 * @property {(eid:number, type:string) => Object|null} get - Get a shallow copy of component data or null if missing.
 * @property {(eid:number, type:string, data:Object) => void} set - Replace component data after validation/clamp.
 * @property {(eid:number, type:string) => boolean} has - Check if an entity has a component type.
 * @property {(query: Query) => { driver: string, size: number, each: (fn:(eid:number)=>void)=>void }} view - Get a cached lightweight view abstraction for a query.
 * @property {(query: Query, fn: (eid:number)=>void) => void} each - Iterate eids in ascending order from driver, applying filters.
 * @property {(eid:number) => Object} serialize - Serialize entity to debug/save object { eid, gen, components }.
 * @property {(filter?:{include?:string[], exclude?:string[]}) => Object} snapshot - Stable snapshot of all entities/components satisfying filter; eid-ascending.
 * @property {() => Object} stats - Return registry stats: { entities:{alive:int, capacity:int}, components:{[type]:count}, views:int }.
 * @property {() => number} nowMs - Monotonic clock source; default Date.now().
 */

/**
 * Component Typedefs (MVP)
 *
 * @typedef {Object} Position
 * @property {number} x - Integer tile coordinate x.
 * @property {number} y - Integer tile coordinate y.
 * @property {number} dirDeg - Direction in degrees [0..359].
 *
 * @typedef {Object} Velocity
 * @property {number} vx - X component of velocity (pixels/sec or units/sec).
 * @property {number} vy - Y component of velocity.
 * @property {number} maxSpeed - Integer maximum speed (>=0). Clamped non-negative.
 *
 * @typedef {Object} Health
 * @property {number} max - Integer >= 1.
 * @property {number} value - Integer clamped to [0..max].
 *
 * @typedef {Object} Stamina
 * @property {number} max - Integer >= 0.
 * @property {number} value - Integer clamped to [0..max].
 * @property {number} regenPerSec - Number >= 0.
 * @property {number} regenDelayAfterActionMs - Integer >= 0.
 * @property {number} regenCooldownUntilMs - Integer >= 0.
 *
 * @typedef {Object} Poise
 * @property {number} max - Integer >= 0.
 * @property {number} value - Integer clamped to [0..max].
 * @property {number} recoverPerSec - Number >= 0.
 * @property {number} breakDurationMs - Integer >= 0.
 * @property {number} brokenUntilMs - Integer >= 0.
 *
 * @typedef {Object} Attributes
 * @property {number} attackPower - Integer >= 0.
 * @property {number} defense - Integer >= 0.
 *
 * @typedef {Object} InventoryItem
 * @property {string} id - Item id.
 * @property {number} qty - Integer >= 1.
 *
 * @typedef {Object} Inventory
 * @property {number} capacity - Integer >= 0.
 * @property {InventoryItem[]} items - Lightweight item list; truncated to capacity.
 *
 * @typedef {Object} Renderable
 * @property {string|null} spriteId - Sprite asset id or null.
 * @property {string|null} tintToken - Tint token or null.
 * @property {number} z - Integer z-order.
 *
 * @typedef {Object} Collider
 * @property {number} w - Integer width >= 0.
 * @property {number} h - Integer height >= 0.
 * @property {number} offsetX - Integer offset x.
 * @property {number} offsetY - Integer offset y.
 * @property {boolean} solid - Solid gate for collision.
 *
 * @typedef {Object} AI
 * @property {string} state - AI state string.
 * @property {number} telegraphDebounceMs - Integer >= 0.
 * @property {{min:number, max:number}=} cooldownMsRange - Optional range; ints with 0 <= min <= max.
 * @property {number=} approachRangePx - Optional integer range for approaching target.
 * @property {number=} retreatRangePx - Optional integer range for retreating.
 *
 * @typedef {Object} PlayerTag
 * (empty marker)
 *
 * @typedef {Object} EnemyTag
 * @property {string=} kind - Optional enemy kind tag.
 *
 * @typedef {Object} Tile
 * @property {string} tileType - One of TILE_TYPES.
 * @property {number} hardness - One of {0,3,4,5,7}; must match tileType rules.
 * @property {number} flags - Bitfield masked to known TILE_FLAGS.
 *
 * @typedef {Object} AttackIntent
 * @property {number} requestedAtMs - Integer timestamp (monotonic).
 * @property {string} attackId - Attack identifier.
 *
 * @typedef {Object} Hitbox
 * @property {number} w - Integer width >= 0.
 * @property {number} h - Integer height >= 0.
 * @property {number} offsetX - Integer offset x.
 * @property {number} offsetY - Integer offset y.
 * @property {boolean} active - Whether hitbox is active.
 *
 * @typedef {Object} AudioEmitter
 * @property {string|null=} lastEventId - Last audio event played.
 * @property {number=} coolUntilMs - Integer cooldown until timestamp >= 0.
 */

/**
 * TILE_FLAGS bitfield constants used by world-gen and Tile component.
 */
export const TILE_FLAGS = Object.freeze({
  ROOM_FLOOR: 1 << 0,
  DOOR_BAND: 1 << 1,
  ORE_PREF: 1 << 2,
  LAMP_ANCHOR: 1 << 3,
  APPROACH3W_PROTECT: 1 << 4,
});

/**
 * TILE_TYPES enum of allowed Tile.tileType strings.
 */
export const TILE_TYPES = Object.freeze(['rock', 'floor', 'ore.copper', 'ore.iron', 'ore.quartz']);

/**
 * COMPONENTS: readonly registry of component type names to their metadata (for debugging/tools).
 * Each entry is: { name, defaults():object, validate(data):void (DEV), clamp(data):object, transient:boolean=false }
 * Meta objects are frozen. The map is exported as a const for read access.
 * Note: per-registry storage is not stored here; this map is global metadata only.
 */
export const COMPONENTS = new Map();

/**
 * Internal helpers and utilities
 */

const DEV_DEFAULT = (() => {
  try {
    // eslint-disable-next-line no-undef
    const env = (typeof process !== 'undefined' && process && process.env && process.env.NODE_ENV) || 'development';
    return env !== 'production';
  } catch {
    return true;
  }
})();

/** Clamp value to integer */
function toInt(n) {
  return (n | 0);
}
/** Clamp to non-negative integer */
function clampNonNegInt(n) {
  n = Math.trunc(Number.isFinite(n) ? n : 0);
  return n < 0 ? 0 : n;
}
/** Normalize a degree to [0..359] */
function normalizeDeg(deg) {
  deg = Math.trunc(Number.isFinite(deg) ? deg : 0);
  deg %= 360;
  if (deg < 0) deg += 360;
  return deg;
}
/** Assert finite number in DEV */
function assertFiniteNumber(n, name, dev) {
  if (!dev) return;
  if (typeof n !== 'number' || !Number.isFinite(n)) {
    throw new Error(`DEV: Expected finite number for ${name}, got ${n}`);
  }
}
/** Shallow clone plain object */
function shallowClone(o) {
  if (!o || typeof o !== 'object') return o;
  return { ...o };
}
/** Binary search insert position into ascending sorted numeric array. */
function binarySearchInsertPos(arr, x) {
  let lo = 0, hi = arr.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    if (arr[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}
/** Mask tile flags to known union mask. */
const TILE_FLAGS_MASK = Object.values(TILE_FLAGS).reduce((a, b) => a | b, 0);

/**
 * Register a component type in the global COMPONENTS map.
 * @param {Object} meta - { name, defaults, validate, clamp, transient=false }
 */
function registerComponent(meta) {
  const frozen = Object.freeze({ ...meta });
  COMPONENTS.set(frozen.name, frozen);
}

/**
 * Component registrations (MVP)
 * Using defaults(), clamp(data), validate(data) for DEV.
 */

registerComponent({
  name: 'Position',
  defaults: () => ({ x: 0, y: 0, dirDeg: 0 }),
  clamp: (d) => ({
    x: toInt(d?.x ?? 0),
    y: toInt(d?.y ?? 0),
    dirDeg: normalizeDeg(d?.dirDeg ?? 0),
  }),
  validate: (d) => {
    if (!Number.isInteger(d.x) || !Number.isInteger(d.y)) {
      throw new Error('DEV: Position.x/y must be integers.');
    }
    if (!Number.isInteger(d.dirDeg) || d.dirDeg < 0 || d.dirDeg > 359) {
      throw new Error('DEV: Position.dirDeg must be int in [0..359].');
    }
  },
  transient: false,
});

registerComponent({
  name: 'Velocity',
  defaults: () => ({ vx: 0, vy: 0, maxSpeed: 0 }),
  clamp: (d) => ({
    vx: Number.isFinite(d?.vx) ? d.vx : 0,
    vy: Number.isFinite(d?.vy) ? d.vy : 0,
    maxSpeed: clampNonNegInt(d?.maxSpeed ?? 0),
  }),
  validate: (d) => {
    if (typeof d.vx !== 'number' || !Number.isFinite(d.vx)) throw new Error('DEV: Velocity.vx must be finite number.');
    if (typeof d.vy !== 'number' || !Number.isFinite(d.vy)) throw new Error('DEV: Velocity.vy must be finite number.');
    if (!Number.isInteger(d.maxSpeed) || d.maxSpeed < 0) throw new Error('DEV: Velocity.maxSpeed must be non-negative int.');
  },
  transient: false,
});

registerComponent({
  name: 'Health',
  defaults: () => ({ max: 1, value: 1 }),
  clamp: (d) => {
    const max = Math.max(1, toInt(d?.max ?? 1));
    let value = toInt(d?.value ?? max);
    if (value < 0) value = 0;
    if (value > max) value = max;
    return { max, value };
  },
  validate: (d) => {
    if (!Number.isInteger(d.max) || d.max < 1) throw new Error('DEV: Health.max must be int >= 1.');
    if (!Number.isInteger(d.value) || d.value < 0 || d.value > d.max) throw new Error('DEV: Health.value must be int in [0..max].');
  },
  transient: false,
});

registerComponent({
  name: 'Stamina',
  defaults: () => ({ max: 0, value: 0, regenPerSec: 0, regenDelayAfterActionMs: 0, regenCooldownUntilMs: 0 }),
  clamp: (d) => {
    const max = clampNonNegInt(d?.max ?? 0);
    let value = clampNonNegInt(d?.value ?? 0);
    if (value > max) value = max;
    const regenPerSec = Number.isFinite(d?.regenPerSec) && d.regenPerSec >= 0 ? d.regenPerSec : 0;
    const regenDelayAfterActionMs = clampNonNegInt(d?.regenDelayAfterActionMs ?? 0);
    const regenCooldownUntilMs = clampNonNegInt(d?.regenCooldownUntilMs ?? 0);
    return { max, value, regenPerSec, regenDelayAfterActionMs, regenCooldownUntilMs };
  },
  validate: (d) => {
    if (!Number.isInteger(d.max) || d.max < 0) throw new Error('DEV: Stamina.max must be int >= 0.');
    if (!Number.isInteger(d.value) || d.value < 0 || d.value > d.max) throw new Error('DEV: Stamina.value must be int in [0..max].');
    assertFiniteNumber(d.regenPerSec, 'Stamina.regenPerSec', true);
    if (d.regenPerSec < 0) throw new Error('DEV: Stamina.regenPerSec must be >= 0.');
    if (!Number.isInteger(d.regenDelayAfterActionMs) || d.regenDelayAfterActionMs < 0) throw new Error('DEV: Stamina.regenDelayAfterActionMs must be int >= 0.');
    if (!Number.isInteger(d.regenCooldownUntilMs) || d.regenCooldownUntilMs < 0) throw new Error('DEV: Stamina.regenCooldownUntilMs must be int >= 0.');
  },
  transient: false,
});

registerComponent({
  name: 'Poise',
  defaults: () => ({ max: 0, value: 0, recoverPerSec: 0, breakDurationMs: 0, brokenUntilMs: 0 }),
  clamp: (d) => {
    const max = clampNonNegInt(d?.max ?? 0);
    let value = clampNonNegInt(d?.value ?? 0);
    if (value > max) value = max;
    const recoverPerSec = Number.isFinite(d?.recoverPerSec) && d.recoverPerSec >= 0 ? d.recoverPerSec : 0;
    const breakDurationMs = clampNonNegInt(d?.breakDurationMs ?? 0);
    const brokenUntilMs = clampNonNegInt(d?.brokenUntilMs ?? 0);
    return { max, value, recoverPerSec, breakDurationMs, brokenUntilMs };
  },
  validate: (d) => {
    if (!Number.isInteger(d.max) || d.max < 0) throw new Error('DEV: Poise.max must be int >= 0.');
    if (!Number.isInteger(d.value) || d.value < 0 || d.value > d.max) throw new Error('DEV: Poise.value must be int in [0..max].');
    assertFiniteNumber(d.recoverPerSec, 'Poise.recoverPerSec', true);
    if (d.recoverPerSec < 0) throw new Error('DEV: Poise.recoverPerSec must be >= 0.');
    if (!Number.isInteger(d.breakDurationMs) || d.breakDurationMs < 0) throw new Error('DEV: Poise.breakDurationMs must be int >= 0.');
    if (!Number.isInteger(d.brokenUntilMs) || d.brokenUntilMs < 0) throw new Error('DEV: Poise.brokenUntilMs must be int >= 0.');
  },
  transient: false,
});

registerComponent({
  name: 'Attributes',
  defaults: () => ({ attackPower: 0, defense: 0 }),
  clamp: (d) => ({
    attackPower: clampNonNegInt(d?.attackPower ?? 0),
    defense: clampNonNegInt(d?.defense ?? 0),
  }),
  validate: (d) => {
    if (!Number.isInteger(d.attackPower) || d.attackPower < 0) throw new Error('DEV: Attributes.attackPower must be int >= 0.');
    if (!Number.isInteger(d.defense) || d.defense < 0) throw new Error('DEV: Attributes.defense must be int >= 0.');
  },
  transient: false,
});

registerComponent({
  name: 'Inventory',
  defaults: () => ({ capacity: 0, items: [] }),
  clamp: (d) => {
    const capacity = clampNonNegInt(d?.capacity ?? 0);
    let items = Array.isArray(d?.items) ? d.items.slice(0, capacity) : [];
    items = items.map((it) => {
      const id = (it && typeof it.id === 'string') ? it.id : '';
      const qty = Math.max(1, toInt(it?.qty ?? 1));
      return { id, qty };
    });
    return { capacity, items };
  },
  validate: (d) => {
    if (!Number.isInteger(d.capacity) || d.capacity < 0) throw new Error('DEV: Inventory.capacity must be int >= 0.');
    if (!Array.isArray(d.items)) throw new Error('DEV: Inventory.items must be array.');
    if (d.items.length > d.capacity) throw new Error('DEV: Inventory.items length must be <= capacity.');
    for (let i = 0; i < d.items.length; i++) {
      const it = d.items[i];
      if (!it || typeof it.id !== 'string') throw new Error(`DEV: Inventory.items[${i}].id must be string.`);
      if (!Number.isInteger(it.qty) || it.qty < 1) throw new Error(`DEV: Inventory.items[${i}].qty must be int >= 1.`);
    }
  },
  transient: false,
});

registerComponent({
  name: 'Renderable',
  defaults: () => ({ spriteId: null, tintToken: null, z: 0 }),
  clamp: (d) => ({
    spriteId: d?.spriteId == null ? null : String(d.spriteId),
    tintToken: d?.tintToken == null ? null : String(d.tintToken),
    z: toInt(d?.z ?? 0),
  }),
  validate: (d) => {
    if (!(d.spriteId === null || typeof d.spriteId === 'string')) throw new Error('DEV: Renderable.spriteId must be string|null.');
    if (!(d.tintToken === null || typeof d.tintToken === 'string')) throw new Error('DEV: Renderable.tintToken must be string|null.');
    if (!Number.isInteger(d.z)) throw new Error('DEV: Renderable.z must be integer.');
  },
  transient: false,
});

registerComponent({
  name: 'Collider',
  defaults: () => ({ w: 0, h: 0, offsetX: 0, offsetY: 0, solid: false }),
  clamp: (d) => ({
    w: clampNonNegInt(d?.w ?? 0),
    h: clampNonNegInt(d?.h ?? 0),
    offsetX: toInt(d?.offsetX ?? 0),
    offsetY: toInt(d?.offsetY ?? 0),
    solid: !!(d?.solid ?? false),
  }),
  validate: (d) => {
    if (!Number.isInteger(d.w) || d.w < 0) throw new Error('DEV: Collider.w must be int >= 0.');
    if (!Number.isInteger(d.h) || d.h < 0) throw new Error('DEV: Collider.h must be int >= 0.');
    if (!Number.isInteger(d.offsetX) || !Number.isInteger(d.offsetY)) throw new Error('DEV: Collider.offsetX/Y must be ints.');
    if (typeof d.solid !== 'boolean') throw new Error('DEV: Collider.solid must be boolean.');
  },
  transient: false,
});

registerComponent({
  name: 'AI',
  defaults: () => ({ state: 'idle', telegraphDebounceMs: 0 }),
  clamp: (d) => {
    const state = String(d?.state ?? 'idle');
    const telegraphDebounceMs = clampNonNegInt(d?.telegraphDebounceMs ?? 0);
    let cooldownMsRange = d?.cooldownMsRange;
    if (cooldownMsRange && typeof cooldownMsRange === 'object') {
      let min = clampNonNegInt(cooldownMsRange.min ?? 0);
      let max = clampNonNegInt(cooldownMsRange.max ?? min);
      if (max < min) max = min;
      cooldownMsRange = { min, max };
    } else {
      cooldownMsRange = undefined;
    }
    const approachRangePx = d?.approachRangePx != null ? clampNonNegInt(d.approachRangePx) : undefined;
    const retreatRangePx = d?.retreatRangePx != null ? clampNonNegInt(d.retreatRangePx) : undefined;
    return { state, telegraphDebounceMs, cooldownMsRange, approachRangePx, retreatRangePx };
  },
  validate: (d) => {
    if (typeof d.state !== 'string') throw new Error('DEV: AI.state must be string.');
    if (!Number.isInteger(d.telegraphDebounceMs) || d.telegraphDebounceMs < 0) throw new Error('DEV: AI.telegraphDebounceMs must be int >= 0.');
    if (d.cooldownMsRange != null) {
      if (typeof d.cooldownMsRange !== 'object') throw new Error('DEV: AI.cooldownMsRange must be object.');
      const { min, max } = d.cooldownMsRange;
      if (!Number.isInteger(min) || min < 0) throw new Error('DEV: AI.cooldownMsRange.min must be int >= 0.');
      if (!Number.isInteger(max) || max < min) throw new Error('DEV: AI.cooldownMsRange.max must be int >= min.');
    }
    if (d.approachRangePx != null && (!Number.isInteger(d.approachRangePx))) throw new Error('DEV: AI.approachRangePx must be integer if present.');
    if (d.retreatRangePx != null && (!Number.isInteger(d.retreatRangePx))) throw new Error('DEV: AI.retreatRangePx must be integer if present.');
  },
  transient: false,
});

registerComponent({
  name: 'PlayerTag',
  defaults: () => ({}),
  clamp: (d) => ({}),
  validate: (_d) => {},
  transient: false,
});

registerComponent({
  name: 'EnemyTag',
  defaults: () => ({ }),
  clamp: (d) => {
    const kind = d?.kind != null ? String(d.kind) : undefined;
    return kind != null ? { kind } : {};
  },
  validate: (d) => {
    if (d.kind != null && typeof d.kind !== 'string') throw new Error('DEV: EnemyTag.kind must be string if present.');
  },
  transient: false,
});

const TILE_HARDNESS_RULE = Object.freeze({
  'rock': 3,
  'floor': 0,
  'ore.copper': 4,
  'ore.iron': 5,
  'ore.quartz': 7,
});

registerComponent({
  name: 'Tile',
  defaults: () => ({ tileType: 'rock', hardness: TILE_HARDNESS_RULE['rock'], flags: 0 }),
  clamp: (d) => {
    const tileType = TILE_TYPES.includes(d?.tileType) ? d.tileType : 'rock';
    const expectedHardness = TILE_HARDNESS_RULE[tileType];
    const hardness = expectedHardness; // enforce band rule
    const flags = toInt(d?.flags ?? 0) & TILE_FLAGS_MASK;
    return { tileType, hardness, flags };
  },
  validate: (d) => {
    if (!TILE_TYPES.includes(d.tileType)) throw new Error('DEV: Tile.tileType must be one of TILE_TYPES.');
    const expected = TILE_HARDNESS_RULE[d.tileType];
    if (d.hardness !== expected) throw new Error(`DEV: Tile.hardness must be ${expected} for tileType ${d.tileType}.`);
    if (!Number.isInteger(d.flags) || (d.flags & ~TILE_FLAGS_MASK) !== 0) throw new Error('DEV: Tile.flags must be int with only known TILE_FLAGS bits.');
  },
  transient: false,
});

registerComponent({
  name: 'AttackIntent',
  defaults: () => ({ requestedAtMs: 0, attackId: '' }),
  clamp: (d) => ({
    requestedAtMs: clampNonNegInt(d?.requestedAtMs ?? 0),
    attackId: String(d?.attackId ?? ''),
  }),
  validate: (d) => {
    if (!Number.isInteger(d.requestedAtMs) || d.requestedAtMs < 0) throw new Error('DEV: AttackIntent.requestedAtMs must be int >= 0.');
    if (typeof d.attackId !== 'string') throw new Error('DEV: AttackIntent.attackId must be string.');
  },
  transient: true,
});

registerComponent({
  name: 'Hitbox',
  defaults: () => ({ w: 0, h: 0, offsetX: 0, offsetY: 0, active: false }),
  clamp: (d) => ({
    w: clampNonNegInt(d?.w ?? 0),
    h: clampNonNegInt(d?.h ?? 0),
    offsetX: toInt(d?.offsetX ?? 0),
    offsetY: toInt(d?.offsetY ?? 0),
    active: !!(d?.active ?? false),
  }),
  validate: (d) => {
    if (!Number.isInteger(d.w) || d.w < 0) throw new Error('DEV: Hitbox.w must be int >= 0.');
    if (!Number.isInteger(d.h) || d.h < 0) throw new Error('DEV: Hitbox.h must be int >= 0.');
    if (!Number.isInteger(d.offsetX) || !Number.isInteger(d.offsetY)) throw new Error('DEV: Hitbox.offsetX/Y must be ints.');
    if (typeof d.active !== 'boolean') throw new Error('DEV: Hitbox.active must be boolean.');
  },
  transient: true,
});

registerComponent({
  name: 'AudioEmitter',
  defaults: () => ({ lastEventId: null, coolUntilMs: 0 }),
  clamp: (d) => ({
    lastEventId: d?.lastEventId == null ? null : String(d.lastEventId),
    coolUntilMs: d?.coolUntilMs != null ? clampNonNegInt(d.coolUntilMs) : 0,
  }),
  validate: (d) => {
    if (!(d.lastEventId === null || typeof d.lastEventId === 'string')) throw new Error('DEV: AudioEmitter.lastEventId must be string|null.');
    if (!Number.isInteger(d.coolUntilMs) || d.coolUntilMs < 0) throw new Error('DEV: AudioEmitter.coolUntilMs must be int >= 0.');
  },
  transient: true,
});

/**
 * Minimal Internal Utilities
 */

/**
 * Create sorted dense store for a component type.
 * We maintain ascending entityIds[] order by insertion with binary search and splice.
 * Removal uses splice and updates index map for shifted entries.
 * For MVP scale O(n) splice is acceptable; future optimization: slab allocator with per-view sorted caches.
 *
 * @param {string} name
 * @param {boolean} dev
 * @param {{counter(name:string,value:number):void}=} profiler
 * @returns {{
 *   name: string,
 *   entityIds: number[],
 *   data: Object[],
 *   indexOfEntity: Map<number, number>,
 *   add(eid:number, data:Object): void,
 *   remove(eid:number): void,
 *   has(eid:number): boolean,
 *   get(eid:number): Object|undefined,
 *   set(eid:number, data:Object): void,
 *   forEach(fn:(eid:number)=>void): void,
 *   size(): number
 * }}
 */
function makeStore(name, dev, profiler) {
  const entityIds = [];
  const data = [];
  const indexOfEntity = new Map();

  function add(eid, d) {
    if (indexOfEntity.has(eid)) {
      if (dev) throw new Error(`DEV: Component ${name} already present on eid ${eid}`);
      return;
    }
    const pos = binarySearchInsertPos(entityIds, eid);
    entityIds.splice(pos, 0, eid);
    data.splice(pos, 0, d);
    // Update index map for shifted tail
    for (let i = pos; i < entityIds.length; i++) {
      indexOfEntity.set(entityIds[i], i);
    }
    if (profiler && profiler.counter) profiler.counter('ECS.add', 1);
  }

  function remove(eid) {
    const idx = indexOfEntity.get(eid);
    if (idx == null) return;
    entityIds.splice(idx, 1);
    data.splice(idx, 1);
    indexOfEntity.delete(eid);
    // Update index map for shifted tail
    for (let i = idx; i < entityIds.length; i++) {
      indexOfEntity.set(entityIds[i], i);
    }
    if (profiler && profiler.counter) profiler.counter('ECS.remove', 1);
  }

  function has(eid) {
    return indexOfEntity.has(eid);
  }

  function get(eid) {
    const idx = indexOfEntity.get(eid);
    if (idx == null) return undefined;
    return data[idx];
  }

  function set(eid, d) {
    const idx = indexOfEntity.get(eid);
    if (idx == null) {
      if (dev) throw new Error(`DEV: Cannot set component ${name} on missing entity ${eid}`);
      return;
    }
    data[idx] = d;
  }

  function forEach(fn) {
    // entityIds already ascending
    for (let i = 0; i < entityIds.length; i++) fn(entityIds[i]);
  }
  function size() {
    return entityIds.length;
  }

  return {
    name,
    entityIds,
    data,
    indexOfEntity,
    add,
    remove,
    has,
    get,
    set,
    forEach,
    size,
  };
}

/**
 * Merge defaults and data, then clamp.
 * @param {() => Object} defaultsFn
 * @param {Object=} data
 * @param {(data:Object)=>Object} clamp
 * @returns {Object}
 */
function mergeDefaults(defaultsFn, data, clamp) {
  const base = defaultsFn ? defaultsFn() : {};
  const merged = { ...base, ...(data || {}) };
  return clamp ? clamp(merged) : merged;
}

/**
 * Create the ECS Registry instance.
 * @param {Object=} config
 * @param {() => number=} config.clock - monotonic clock source; default Date.now
 * @param {{counter(name:string, value:number):void}=} config.profiler - optional micro-profiler sink.
 * @param {boolean=} config.dev - force DEV mode; default NODE_ENV !== 'production'
 * @param {boolean=} config.serializeTransients - include transient components in serialize/snapshot
 * @returns {Registry}
 */
export function createRegistry(config = {}) {
  const dev = !!(config.dev ?? DEV_DEFAULT);
  const profiler = config.profiler || null;
  const clock = typeof config.clock === 'function' ? config.clock : Date.now;
  const serializeTransients = !!config.serializeTransients;

  // Entity generation tracking and liveness
  const gens = [0]; // 0th unused if eids start at 1
  const alive = new Set();
  const freeList = [];
  const aliveEids = []; // ascending sorted list of alive eids (for driver when no allOf)

  // Per-component stores
  /** @type {Map<string, ReturnType<typeof makeStore>>} */
  const stores = new Map();
  for (const [name] of COMPONENTS) {
    stores.set(name, makeStore(name, dev, profiler));
  }

  // Cached query views
  const views = new Map();

  function nowMs() {
    return Number(clock());
  }

  if (profiler && profiler.counter) profiler.counter('ECS.entities.alive', alive.size);

  function ensureEntityAlive(eid) {
    if (!dev) return;
    if (!alive.has(eid)) {
      throw new Error(`DEV: Entity ${eid} is not alive.`);
    }
  }

  function ensureValidType(type) {
    if (!COMPONENTS.has(type)) {
      if (dev) throw new Error(`DEV: Unknown component type "${type}".`);
      return false;
    }
    return true;
  }

  function getStore(type) {
    const s = stores.get(type);
    if (!s) throw new Error(`Internal: missing store for type ${type}`);
    return s;
  }

  function createEntity() {
    let eid;
    if (freeList.length > 0) {
      eid = freeList.pop();
    } else {
      eid = gens.length; // eids: 1..N
      gens.push(0); // initial generation 0 for new slot
    }
    alive.add(eid);
    // insert eid into aliveEids maintaining sorted ascending
    const pos = binarySearchInsertPos(aliveEids, eid);
    aliveEids.splice(pos, 0, eid);

    if (profiler && profiler.counter) profiler.counter('ECS.entities.alive', alive.size);
    return eid;
  }

  function destroyEntity(eid) {
    if (!alive.has(eid)) return;
    // Remove all components present on this entity
    for (const [type, store] of stores) {
      if (store.has(eid)) {
        store.remove(eid);
      }
    }
    // Remove from alive tracking
    alive.delete(eid);
    const idx = aliveEids.indexOf(eid);
    if (idx >= 0) aliveEids.splice(idx, 1);
    // Bump generation and recycle eid
    gens[eid] = (gens[eid] | 0) + 1;
    freeList.push(eid);
    if (profiler && profiler.counter) profiler.counter('ECS.entities.alive', alive.size);
  }

  function addComponent(eid, type, data) {
    if (!ensureValidType(type)) return;
    if (!alive.has(eid)) {
      const msg = `Entity ${eid} not alive; cannot add component ${type}.`;
      if (dev) throw new Error(`DEV: ${msg}`);
      // eslint-disable-next-line no-console
      console.warn(msg);
      return;
    }
    const meta = COMPONENTS.get(type);
    const store = getStore(type);
    if (store.has(eid)) {
      if (dev) throw new Error(`DEV: Entity ${eid} already has component ${type}`);
      return;
    }
    let merged = mergeDefaults(meta.defaults, data, meta.clamp);
    if (dev) {
      try {
        meta.validate(merged);
      } catch (e) {
        throw new Error(`DEV: Validation failed for addComponent ${type} on eid ${eid}: ${e.message || e}`);
      }
    }
    store.add(eid, merged);
  }

  function removeComponent(eid, type) {
    if (!ensureValidType(type)) return;
    const store = getStore(type);
    store.remove(eid);
  }

  function get(eid, type) {
    if (!ensureValidType(type)) return null;
    const store = getStore(type);
    const d = store.get(eid);
    return d ? shallowClone(d) : null;
  }

  function set(eid, type, data) {
    if (!ensureValidType(type)) return;
    const store = getStore(type);
    if (!store.has(eid)) {
      const msg = `Entity ${eid} does not have component ${type}; cannot set.`;
      if (dev) throw new Error(`DEV: ${msg}`);
      // eslint-disable-next-line no-console
      console.warn(msg);
      return;
    }
    const meta = COMPONENTS.get(type);
    // Merge against defaults to ensure missing fields present, then clamp
    let merged = mergeDefaults(meta.defaults, data, meta.clamp);
    if (dev) {
      try {
        meta.validate(merged);
      } catch (e) {
        throw new Error(`DEV: Validation failed for set ${type} on eid ${eid}: ${e.message || e}`);
      }
    }
    store.set(eid, merged);
  }

  function has(eid, type) {
    if (!ensureValidType(type)) return false;
    const store = getStore(type);
    return store.has(eid);
  }

  function canonicalizeQuery(query) {
    const allOf = Array.isArray(query?.allOf) ? [...new Set(query.allOf)].sort() : [];
    const anyOf = Array.isArray(query?.anyOf) ? [...new Set(query.anyOf)].sort() : [];
    const noneOf = Array.isArray(query?.noneOf) ? [...new Set(query.noneOf)].sort() : [];
    return { allOf, anyOf, noneOf, key: `a:${allOf.join(',')}|o:${anyOf.join(',')}|n:${noneOf.join(',')}` };
  }

  function chooseDriver(allOf) {
    if (allOf.length === 0) {
      return { driver: 'all', store: null, size: aliveEids.length };
    }
    let bestType = allOf[0];
    let bestSize = getStore(bestType).size();
    for (let i = 1; i < allOf.length; i++) {
      const t = allOf[i];
      const s = getStore(t).size();
      if (s < bestSize) {
        bestType = t;
        bestSize = s;
      }
    }
    return { driver: bestType, store: getStore(bestType), size: bestSize };
  }

  function view(query) {
    const cq = canonicalizeQuery(query || {});
    let v = views.get(cq.key);
    if (!v) {
      const chosen = chooseDriver(cq.allOf);
      v = {
        driver: chosen.driver,
        get size() {
          return chosen.store ? chosen.store.size() : aliveEids.length;
        },
        each(fn) {
          each(query, fn);
        },
      };
      views.set(cq.key, v);
    }
    return v;
  }

  function each(query, fn) {
    const cq = canonicalizeQuery(query || {});
    const driverInfo = chooseDriver(cq.allOf);
    const runFilters = (eid) => {
      if (!alive.has(eid)) return false; // generation/liveness safety
      // allOf: all components present
      for (let i = 0; i < cq.allOf.length; i++) {
        if (!getStore(cq.allOf[i]).has(eid)) return false;
      }
      // anyOf: at least 1 present (if provided and non-empty)
      if (cq.anyOf.length > 0) {
        let any = false;
        for (let i = 0; i < cq.anyOf.length; i++) {
          if (getStore(cq.anyOf[i]).has(eid)) {
            any = true;
            break;
          }
        }
        if (!any) return false;
      }
      // noneOf: none present
      for (let i = 0; i < cq.noneOf.length; i++) {
        if (getStore(cq.noneOf[i]).has(eid)) return false;
      }
      return true;
    };

    if (driverInfo.store) {
      // Iterate driver store in ascending order
      const ids = driverInfo.store.entityIds;
      for (let i = 0; i < ids.length; i++) {
        const eid = ids[i];
        if (runFilters(eid)) fn(eid);
      }
    } else {
      // No allOf; iterate all alive eids ascending
      for (let i = 0; i < aliveEids.length; i++) {
        const eid = aliveEids[i];
        if (runFilters(eid)) fn(eid);
      }
    }
    if (profiler && profiler.counter) profiler.counter('ECS.query.each', 1);
  }

  function serialize(eid) {
    if (!alive.has(eid)) {
      if (dev) throw new Error(`DEV: Cannot serialize non-alive entity ${eid}`);
      return null;
    }
    const components = {};
    for (const [type, store] of stores) {
      if (!serializeTransients) {
        const meta = COMPONENTS.get(type);
        if (meta && meta.transient) continue;
      }
      const d = store.get(eid);
      if (d) components[type] = shallowClone(d);
    }
    return { eid, gen: gens[eid] | 0, components };
  }

  function snapshot(filter) {
    const include = Array.isArray(filter?.include) ? new Set(filter.include) : null;
    const exclude = Array.isArray(filter?.exclude) ? new Set(filter.exclude) : null;

    const out = {
      entities: [],
    };

    for (let i = 0; i < aliveEids.length; i++) {
      const eid = aliveEids[i];
      const ent = { eid, gen: gens[eid] | 0, components: {} };
      for (const [type, store] of stores) {
        const meta = COMPONENTS.get(type);
        if (!serializeTransients && meta && meta.transient) continue;
        if (include && !include.has(type)) continue;
        if (exclude && exclude.has(type)) continue;
        const d = store.get(eid);
        if (d) ent.components[type] = shallowClone(d);
      }
      out.entities.push(ent);
    }

    return out;
  }

  function stats() {
    const compStats = {};
    for (const [type, store] of stores) {
      compStats[type] = store.size();
    }
    return {
      entities: { alive: alive.size, capacity: gens.length - 1 },
      components: compStats,
      views: views.size,
    };
  }

  /**
   * Example Usage:
   *
   * // const ecs = createRegistry();
   * // const eid = ecs.createEntity();
   * // ecs.addComponent(eid, 'Position', { x: 10, y: 4, dirDeg: 90 });
   * // ecs.addComponent(eid, 'Velocity', { vx: 1.5, vy: 0, maxSpeed: 3 });
   * //
   * // // In MovementSystem (external):
   * // function movementSystem(ecs, dtSec) {
   * //   ecs.each({ allOf: ['Position', 'Velocity'] }, (e) => {
   * //     const pos = ecs.get(e, 'Position');
   * //     const vel = ecs.get(e, 'Velocity');
   * //     // Clamp by maxSpeed externally if desired
   * //     const max = vel.maxSpeed;
   * //     const spd = Math.hypot(vel.vx, vel.vy);
   * //     const scale = spd > 0 && spd > max ? (max / spd) : 1;
   * //     pos.x = (pos.x + Math.trunc((vel.vx * scale) * dtSec)) | 0;
   * //     pos.y = (pos.y + Math.trunc((vel.vy * scale) * dtSec)) | 0;
   * //     ecs.set(e, 'Position', pos);
   * //   });
   * // }
   */

  return {
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
  };
}