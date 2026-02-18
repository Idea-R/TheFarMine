# The Far Mine — Core ECS Architecture (Sprint 1)

Owner: Ironforge Stonebeard (Alpha)
Version: v0.1.0-alpha
Date: 2026-02-18

1) Title & Scope
- Scope: MVP vertical slice targeting Mine L1. Defines entities, components, systems, events/resources, storage/query model, scheduling, and testing. Engine-agnostic; includes Bevy mapping notes. JS reference pairs to src/core/ecs-registry.js (authoritative registry for Sprint 1).

2) Design Goals & Constraints
- Goals:
  - Determinism: eid-ascending iteration for all systems and views.
  - Simplicity: MVP-only features to ship L1 vertical slice.
  - Performance: ≤0.5 ms per 1k entities for common views (allOf(Position, Velocity), allOf(Health), allOf(Renderable)).
  - Debuggability: stats counters, stable snapshots, DEV validation.
  - Schema stability: component schemas stable across gameplay/UI/worldgen domains.
- Constraints:
  - Pure JS registry for prototype; Bevy/ECS-first target post-Alpha.
  - Tile size: 16 px; world units: 1.0 per tile (x,y in tiles; renderer scales to pixels).
  - Coordinate system: X increases right, Y increases down. Angles deg: 0=right, 90=down, 180=left, 270=up (clockwise).

3) Entity & Component Model
- Entity:
  - eid: integer (32-bit) with generation to prevent stale handles. No inheritance; behavior emerges via component composition.
- Component philosophy:
  - Data-only, strictly typed fields. Defaults and clamps applied on add/set. Transient vs persistent flagged and serialized accordingly. DEV validation enforces shape/constraints.
- MVP Components (1:1 map to registry):
  - Position — 2D location and facing.
  - Velocity — per-axis velocity and max speed clamp.
  - Health — hit points with max.
  - Stamina — action stamina with regen and cooldown gate.
  - Poise — stagger meter and break timing.
  - Attributes — attack/defense scalars.
  - Inventory — capacity and item stack list.
  - Renderable — sprite/tint/z-order metadata.
  - Collider — AABB size/offset; solidity.
  - AI — simple spacing/attack cadence knobs.
  - PlayerTag — marker for the player.
  - EnemyTag — marker for hostiles (kind optional).
  - Tile — static world tile definition.
  - AttackIntent (transient) — requested attack this frame.
  - Hitbox (transient) — active hit shape during attacks.
  - AudioEmitter (transient) — sound event helper.

4) Component Schemas (authoritative)
- Notes:
  - int: 32-bit signed integer. number: finite float. boolean: true/false.
  - Transient components are excluded from snapshot/serialize by default.
  - TILE_TYPES: ['rock','floor','ore.copper','ore.iron','ore.quartz'].
  - TILE_FLAGS masks (bitfield): ROOM_FLOOR, DOOR_BAND, ORE_PREF, LAMP_ANCHOR, APPROACH3W_PROTECT.

- Position { x:int=0, y:int=0, dirDeg:int=0 }:
  - dirDeg normalized into [0..359] on write.
  - Invariant: x,y are world tile units (may be fractional if integrated from Velocity).
- Velocity { vx:number=0, vy:number=0, maxSpeed:int=0 }:
  - vx,vy must be finite. maxSpeed≥0; 0 means “no clamp”.
- Health { max:int≥1=1, value:int=max }:
  - Clamp value into [0..max] on set; reaching 0 marks entity “dead” for gameplay (removal policy owned by higher-level logic).
- Stamina { max:int≥0=0, value:int=max, regenPerSec:number≥0=0, regenDelayAfterActionMs:int≥0=250, regenCooldownUntilMs:int≥0=0 }:
  - Regen applies only if nowMs ≥ regenCooldownUntilMs; after stamina spend, write regenCooldownUntilMs = nowMs + regenDelayAfterActionMs.
- Poise { max:int≥0=0, value:int=max, recoverPerSec:number≥0=0, breakDurationMs:int≥0=600, brokenUntilMs:int≥0=0 }:
  - When value reaches 0, set brokenUntilMs = nowMs + breakDurationMs. Recovery occurs only if nowMs ≥ brokenUntilMs.
- Attributes { attackPower:int≥0=0, defense:int≥0=0 }.
- Inventory { capacity:int≥0=0, items:[{id:string, qty:int≥1}] = [] }:
  - Clamp items.length ≤ capacity; coalesce identical id stacks on set; qty≥1 per stack.
- Renderable { spriteId:string|null=null, tintToken:string|null=null, z:int=0 }:
  - z ascending draw order; tintToken maps to data/visual/color-palette.json.
- Collider { w:int≥0=0, h:int≥0=0, offsetX:int=0, offsetY:int=0, solid:boolean=true }:
  - AABB in world units (tiles). If solid=false, exclude from collision resolution but may still receive hits if targeted.
- AI { state:string="idle", telegraphDebounceMs:int≥0=300, cooldownMsRange?:{min:int≥0, max:int≥min}, approachRangePx?:int, retreatRangePx?:int }:
  - Optional fields omitted => default “no action” behavior.
- PlayerTag {} (transient=false).
- EnemyTag { kind?:string } (transient=false).
- Tile { tileType: enum, hardness:int∈{0,3,4,5,7}, flags:int=0 } (transient=false):
  - Invariants:
    - rock → hardness=3; floor → hardness=0; ore.copper=4; ore.iron=5; ore.quartz=7.
    - If tileType='floor' then flags must include ROOM_FLOOR.
    - If tileType starts with 'ore.' then flags must include ORE_PREF.
    - LAMP_ANCHOR allowed only for tileType in {'rock','floor'}.
    - DOOR_BAND may be set only when ROOM_FLOOR also set (door cuts through floor band).
    - APPROACH3W_PROTECT cannot be set on ore.*
- AttackIntent { requestedAtMs:int, attackId:string } — transient=true:
  - One per entity per frame at most; latest wins.
- Hitbox { w:int≥0=0, h:int≥0=0, offsetX:int=0, offsetY:int=0, active:boolean=false } — transient=true:
  - Active only during “swing active” window; cleared by Cleanup when inactive.
- AudioEmitter { lastEventId?:string|null=null, coolUntilMs?:int≥0=0 } — transient=true:
  - Bridge metadata for one-shot SFX throttling.

5) Events & Resources (contracts)
- Events (enqueue into per-frame buses; consumed by bridges/systems):
  - MineHitEvent { pos:{x:int,y:int}, tool:string, power:int }.
  - DamageEvent { source:int|0, target:int, amount:int≥0, type:string } — type∈{'physical','poise','environment',...}.
  - FootstepEvent { entity:int, material:string }.
  - PlaySfxEvent { tag:string, pos?:{x:number,y:number} }.
  - UiCommand { action:string, payload:any }.
  - Combat events (see docs/combat-systems/combat-design.md):
    - combat.TelegraphStart { entity:int, attackId:string, atMs:int }.
    - combat.Swing.light { entity:int, attackId:string, atMs:int }.
    - combat.Hit { source:int, target:int, attackId:string, atMs:int }.
    - combat.Block { source:int, target:int, atMs:int }.
    - combat.Parry { source:int, target:int, atMs:int }.
    - poise.Break { target:int, untilMs:int }.
    - combat.AttackEnd { entity:int, attackId:string, atMs:int }.
- Resources:
  - GameTime { nowMs:int } — supplied by registry.clock(); deterministic in tests.
  - InputMap — consumable per-frame inputs (axes, buttons, intents).
  - AssetIndex — IDs for sprites/sfx/materials.

6) Systems & Scheduling (MVP order)
Deterministic fixed-step frame order (eid-ascending per view):
1) Input gather → write intents (AttackIntent, desired movement vector) — source outside ECS (platform layer) or as InputMap resource updates.
2) Stamina/Poise Regen System:
   - For each eid with Stamina: if nowMs ≥ regenCooldownUntilMs, value += regenPerSec*dt, clamp [0..max].
   - For each eid with Poise: if nowMs ≥ brokenUntilMs, value += recoverPerSec*dt, clamp [0..max].
3) AI Spacing + Intent System:
   - For eids with AI, Position (and EnemyTag or PlayerTag as needed): choose move direction to approach/retreat target ranges; set AttackIntent if within attack window and past telegraphDebounceMs.
4) CombatTimingService:
   - Attack FSM per entity: idle→telegraph→swing(active hitbox)→recover→idle.
   - Emits combat.TelegraphStart, combat.Swing.light; toggles Hitbox.active during active window; honors AI.telegraphDebounceMs and hit-stop overlays.
5) HitDetectionSystem:
   - For each active Hitbox, test AABB vs candidates with Collider and Health/Poise (Damageable). Emit DamageEvent and combat.Hit/Block/Parry as resolved.
6) DamageApply System:
   - Apply Health.value -= damage (type 'physical'); Poise.value -= damage (type 'poise'); clamp. When Poise hits 0, emit poise.Break and set brokenUntilMs.
7) Movement System:
   - Apply Velocity to Position with dt; clamp speed to maxSpeed; resolve AABB vs world (tiles with solid/blocked semantics).
8) AudioEventBridge / VisualsBridge:
   - Consume events; enqueue SFX and telegraph visuals; update AudioEmitter as needed.
9) Cleanup System:
   - Clear or remove one-frame transients (AttackIntent, inactive Hitbox); emit combat.AttackEnd when FSM completes.

Movement System API and pseudocode:
- Signature: update(dtSec:number, registry)
- Behavior:
```
function movementSystem(dtSec, reg) {
  reg.each({ allOf: ['Position','Velocity'] }, (eid, pos, vel) => {
    // Clamp velocity magnitude if maxSpeed > 0
    if (vel.maxSpeed > 0) {
      const speed = Math.hypot(vel.vx, vel.vy);
      if (speed > vel.maxSpeed) {
        const s = vel.maxSpeed / (speed || 1);
        vel.vx *= s; vel.vy *= s;
        reg.set(eid, 'Velocity', vel);
      }
    }
    // Integrate
    const nx = pos.x + vel.vx * dtSec;
    const ny = pos.y + vel.vy * dtSec;

    // Placeholder collider-aware resolution (AABB vs world tiles)
    const col = reg.get(eid, 'Collider');
    let rx = nx, ry = ny;
    if (col && col.solid) {
      // Resolve X then Y against solid tiles (ROOM_FLOOR non-solid; rock/ore solid)
      rx = resolveAxis(pos.x, nx, pos.y, col, 'x', reg);
      ry = resolveAxis(pos.y, ny, rx, col, 'y', reg);
    }

    reg.set(eid, 'Position', { x: rx, y: ry, dirDeg: pos.dirDeg });
  });
}
```
- resolveAxis is an internal helper using Tile.flags and Collider extents (AABB) to block penetration; exact algorithm can be a simple grid-step with per-tile solidity check.

7) Storage & Query Model
- Storage: Dense SoA per component:
  - store = { entityIds:int[], data:any[], indexOfEntity:Map<int,int> }.
  - entityIds kept sorted ascending for deterministic iteration.
- Add/remove:
  - addComponent: binary-insert eid into entityIds, splice data at same index; indexOfEntity updated.
  - removeComponent: splice entityIds/data; update indexOfEntity for shifted items.
- Queries:
  - View({ allOf:string[], anyOf?:string[], noneOf?:string[] }):
    - Driver store = smallest entityIds among allOf for minimal scan.
    - each(view, fn): iterate driver eids ascending; filter others using has(eid, comp) checks; skip entities with any noneOf; pass ordered component refs to fn(eid, ...).
- Entity liveness:
  - createEntity allocates new eid or reuses from freelist with generation bump.
  - destroyEntity increments generation; all components removed.
  - get/has validates generation; stale eids rejected.
- Error policy:
  - DEV: throw on invalid schema, duplicates, unknown components, NaN/Infinite, invariant violations.
  - PROD: warn once per site, skip unsafe writes; keep sim alive.

8) Performance & Instrumentation
- Scale: Hundreds up to ≤2k entities in L1.
- Hot paths:
  - Query driver selection minimizes scans for common views.
  - Binary-insert O(log n) search + O(n) splice acceptable in MVP.
- Stats and counters:
  - registry.stats(): { entitiesAlive, componentsPerType, queriesRun, lastFrameMs, nowMs }.
  - profiler.counters: 'ECS.add', 'ECS.remove', 'ECS.query.each', 'ECS.entities.alive', 'ECS.serialize', 'ECS.snapshot'.
- Timing:
  - Optionally track per-system ms in a ring buffer (DEV).
- Snapshot/debug:
  - snapshot({ include?:string[], exclude?:string[], includeTransients?:boolean=false }) returns deterministic eid-ascending JSON. Stable for diffs.

9) Integration Notes
- Bevy mapping:
  - Components map 1:1 to Rust structs with #[derive(Reflect, Serialize, Deserialize)] where suitable.
  - Events mapped to Bevy Event<T> channels.
  - Systems scheduled in CoreSchedule::FixedMain (fixed-step sim), preserving order above; use Query eid-ascending via stable Entity ordering or explicit sorting.
- Visuals/UI:
  - Renderable.tintToken resolves into data/visual/color-palette.json tokens.
  - Enemy goblin uses characters.goblin.base; telegraphs map via mapping.telegraph.arc.amber.
- Audio:
  - AudioEmitter assists AudioEventBridge to map ECS events to data/audio/sound-manifest.json ids.
- Worldgen:
  - Tile.flags/TILE_FLAGS used for stamping room templates (ROOM_FLOOR, DOOR_BAND) and approach lanes (APPROACH3W_PROTECT); ores require ORE_PREF.

10) Minimal Test Plan (MVP)
- Unit:
  - add/get/set/remove component happy paths (per component).
  - Query determinism: each() iterates eid-ascending always.
  - Entity generation bump on destroy; stale eid rejected.
  - Tile.hardness ↔ tileType clamps and flag invariants enforced.
- Movement demo:
  - Create eid with Position{0,0}, Velocity{vx:2,vy:0,maxSpeed:0}; dt=0.1s; expect Position.x≈0.2.
  - Set Velocity{vx:10,vy:0,maxSpeed:5}; after one update, effective speed clamped to 5.
- Snapshot:
  - snapshot includes/excludes components; transients excluded by default; includeTransients=true includes Hitbox/AttackIntent.
- DEV validation:
  - Malformed data (NaN, negative max, invalid tileType) throws with clear message; PROD warns and ignores.

11) Risks & Assumptions
- Risks:
  - Sorted SoA insert/delete O(n) may hotspot under heavy churn (spawn/despawn storms). Acceptable for MVP; upgrade to slab + cached sorted views later.
- Assumptions:
  - JSON component schemas mirror this doc and ecs-registry.js validators.
  - Saves/snapshots can exclude transient components without breaking consumers.
  - Tile solidity derived from tileType/flags externally; Collider used for entity-entity/world interactions.

12) Appendix
- Public API (src/core/ecs-registry.js):
```
type EID = number;

function createRegistry(opts?: {
  dev?: boolean,
  clock?: () => number,         // for tests; nowMs source
  components?: Record<string, Schema>,
}) => {
  // Entity lifecycle
  createEntity(): EID
  destroyEntity(eid: EID): void

  // Components
  addComponent(eid: EID, name: string, data?: object): void
  removeComponent(eid: EID, name: string): void
  get<T>(eid: EID, name: string): T | undefined
  set<T>(eid: EID, name: string, patch: Partial<T> | T): void
  has(eid: EID, name: string): boolean

  // Queries
  view(spec: { allOf: string[], anyOf?: string[], noneOf?: string[] }): {
    size(): number
    each(fn: (eid: EID, ...comps: any[]) => void): void
    [Symbol.iterator](): IterableIterator<EID>
  }
  each(spec, fn): void  // convenience

  // Serialization / Debug
  serialize(options?: { includeTransients?: boolean }): string
  snapshot(options?: {
    include?: string[], exclude?: string[], includeTransients?: boolean
  }): object
  stats(): {
    entitiesAlive: number,
    componentsPerType: Record<string, number>,
    queriesRun: number,
    lastFrameMs?: number,
    nowMs: number
  }

  // Time
  nowMs(): number
  clock(): () => number

  // Resources (minimal helpers)
  setResource(name: string, value: any): void
  getResource<T>(name: string): T | undefined

  // Events (simple bus)
  emit(eventName: string, payload: any): void
  drain(eventName: string): any[]   // returns and clears events of a type
}

// Constants
const TILE_TYPES = ['rock','floor','ore.copper','ore.iron','ore.quartz'] as const;
const TILE_FLAGS = {
  ROOM_FLOOR:        1 << 0,
  DOOR_BAND:         1 << 1,
  ORE_PREF:          1 << 2,
  LAMP_ANCHOR:       1 << 3,
  APPROACH3W_PROTECT:1 << 4,
};
```
- Python binding note (optional):
  - Entities stored as ints; components as dicts keyed by eid; per-component dicts hold data. Iteration uses sorted(eids) for determinism. Minimal bridge:
```
class PyRegistry:
    def __init__(self): ...
    def create_entity(self) -> int: ...
    def add(self, eid:int, name:str, data:dict): ...
    def get(self, eid:int, name:str) -> dict|None: ...
    def view(self, allOf:list[str], anyOf=None, noneOf=None) -> list[int]: ...
    def each(self, spec, fn): 
        for eid in self.view(**spec): fn(eid, *[self.get(eid,n) for n in spec['allOf']])
```
  - Enables headless simulation parity for CI with deterministic eid-ascending loops.