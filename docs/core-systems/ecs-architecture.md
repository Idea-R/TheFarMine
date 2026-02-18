# ECS Architecture — Bedrock and Beards (Sprint 1)

Owner: @alpha (Core Systems — Ironforge Stonebeard)

Cross-references:
- data/core/component-schemas.json (v1 authoritative fields)
- src/core/ecs-registry.js (API and runtime)
- docs/world-generation/cave-gen-algorithm.md (§Tile flags)
- docs/combat-systems/combat-design.md (§Timing, Telegraphed attacks)
- docs/technology-systems/crafting-design.md (§Inventory/Tile hardness)
- docs/visual-systems/style-guide.md (§Renderable.tintToken)


## 1) Goals & Constraints (MVP)

Goals (Sprint 1):
- Simple, fast, deterministic ECS suitable for gameplay-critical loops.
- Clamp-safe component updates using import-validated schemas.
- Mask-based entity queries backed by dense component stores.
- Archetype factories for consistent entity creation.
- Profiler hooks across hot operations.

Constraints:
- Exactly 15 fixed components (Sprint 1 catalog).
- 1-based entity IDs; entity ID 0 is invalid.
- Uint16 signature mask (bits 0..14) encodes component presence.
- Dense-store per component with sparse index for O(1) add/remove (amortized).
- Schemas imported and validated at boot (ESM JSON assertions).
- Browser JavaScript target (Phaser 3 render loop).

Performance targets:
- query/forEach tight loops over dense arrays.
- Entity create/destroy O(components).
- add/remove O(1) amortized via dense-swap.
- Initial capacity 4096, growth by doubling on demand.


## 2) Entity & Component Model

Entities:
- IDs are 1-based. ID 0 is invalid and never allocated.
- Each entity has a Uint16 signature bitmask indicating component presence.
- Signature bit assignment (bits 0..14 inclusive) is fixed and authoritative.

Components (fixed catalog; bits 0..14 exactly):
0. Position
1. Velocity
2. Attributes
3. Health
4. Stamina
5. Poise
6. Inventory
7. Renderable
8. Collider
9. AI
10. Player
11. Enemy
12. Item
13. Tile
14. Projectile

Authoritative field lists, types, defaults, and clamps are defined in data/core/component-schemas.json (v1). At runtime we enforce the dynamic clamp rule value∈[0..max] for Health, Stamina, and Poise.

Storage layout per component (performance-first, cache-friendly):
- count: number of active entities with this component
- denseIds: Uint32Array of entity IDs ordered densely [0..count-1]
- data: Array of component data objects (aligned with denseIds indices)
- sparseIndex: Int32Array mapping entityId → dense index or -1 if absent
- Removal uses dense-swap (swap last element into freed slot; update sparseIndex; decrement count).


## 3) Authoritative Component Definitions (Summary)

Canonical field names, types, and default/clamp values live in data/core/component-schemas.json (v1). Below are purpose highlights and notable constraints. Do not treat any numeric here as source of truth; code clamps and defaults from the schema only.

0) Position (bit 0)
- Purpose: World-space location and facing.
- Key fields:
  - x, y: integer coordinates. Bounds as per schema; used as pixel units for entities; tiles created with (tx*16, ty*16).
  - dirX, dirY: facing/aim direction; normalized to [-1..1] each (runtime-clamped).
- Notes: Integer x/y clamps enforced; dir components normalized/clamped on patch.

1) Velocity (bit 1)
- Purpose: Linear motion intent/state.
- Key fields:
  - vx, vy: velocity components (numbers).
  - maxSpeed: int, clamped [0..2000].
- Notes: MovementSystem clamps magnitude ≤ maxSpeed.

2) Attributes (bit 2)
- Purpose: Core offensive/defensive stats.
- Key fields:
  - attackPower, defense: ints clamped [0..999].
  - speedMul or similar movement/action multipliers per schema.
- Notes: Combat and stamina costs scale off these values.

3) Health (bit 3)
- Purpose: Entity vitality pool.
- Key fields:
  - value, max: ints; value dynamically clamped to [0..max] on any patch or max change.
  - regenPerSec, regenDelayMs (canonical names per schema).
- Notes: Combat systems subtract via patchComponent; regen system respects delay.

4) Stamina (bit 4)
- Purpose: Action resource for sprinting/mining/attacks.
- Key fields:
  - value, max with dynamic clamp [0..max].
  - regenPerSec, regenDelayMs.
- Notes: MiningSystem and CombatTimingService consume; Regen system replenishes after delay.

5) Poise (bit 5)
- Purpose: Stagger resistance and break window.
- Key fields:
  - value, max with dynamic clamp [0..max].
  - breakThreshold, breakDurationMs, regenDelayMs (canonical exact names in schema).
- Notes: combat.Telegraph/Hit interact; poise.Break/Recover events flow from thresholds.

6) Inventory (bit 6)
- Purpose: Carrying and hotbar selection.
- Key fields:
  - slots: capacity (int).
  - selectedIndex: int in [0..slots-1] (clamped).
  - items: schema-defined representation (id/qty stacks).
- Notes: Crafting and item use read this; see crafting-design.md.

7) Renderable (bit 7)
- Purpose: Visual identity.
- Key fields:
  - spriteId: string (texture/frame key).
  - depth: int for render order.
  - visible: boolean.
  - tintToken: string → resolves to palette token per style-guide.md (never hard-code hex).
- Notes: RenderSyncSystem reads, binds to Phaser sprites; tint resolved late.

8) Collider (bit 8)
- Purpose: Spatial collision/hurtbox.
- Key fields:
  - w, h: dimensions (ints).
  - offsetX, offsetY: local offsets.
  - solid: boolean; blocks movement if true.
  - isTrigger: boolean; overlap-only if true.
  - hurtboxPadPx: padding for combat overlap leniency.
- Notes: CollisionSystem uses solid; CombatResolveSystem uses isTrigger/hurtboxPadPx.

9) AI (bit 9)
- Purpose: State machine scaffolding.
- Key fields:
  - state: string/enum per enemy behavior.
  - targetId: entityId; 1-based; 0 or -1 means none (clamped accordingly).
  - aggroRange, leashRange: ints/floats per schema.
  - thinkCooldownMs: throttle for decision updates.
- Notes: AISystem enforces cooldown; ensures targetId bounds.

10) Player (bit 10)
- Purpose: Player identity marker.
- Key fields:
  - playerId or handle per schema.
- Notes: Used for input routing and UI.

11) Enemy (bit 11)
- Purpose: Enemy identity marker and tuning.
- Key fields:
  - enemyTypeId (string) and tuning keys from enemy data.
- Notes: Factory wires attributes and AI states.

12) Item (bit 12)
- Purpose: World item entity info.
- Key fields:
  - itemId (string), qty (int).
  - onGround: boolean (default true for drops).
- Notes: Pickup and crafting consumption pivot on this.

13) Tile (bit 13)
- Purpose: Static world cell as entity for interaction.
- Key fields:
  - tileType: enum string (rock | floor | ore.*).
  - hardness: int (see crafting-design.md for tool gates).
  - oreType: optional ore.* string.
  - flags: uint32 bitfield (see cave-gen-algorithm.md §Tile flags).
- Notes: WorldGen creates these; MiningSystem consults hardness/flags.

14) Projectile (bit 14)
- Purpose: Transient moving hit volume.
- Key fields:
  - speed, lifeMs.
  - dirX, dirY (normalized).
  - ownerId: entityId; 1-based.
  - damage, poiseDamage.
- Notes: Expires on lifeMs; applies damage via CombatResolveSystem.


## 4) Archetypes (ENTITY_TYPES)

Archetype overlays are merged with schema defaults and caller overrides, then clamped. The createEntityOf pipeline sets the mask, applies the overlay per component, merges overrides, and validates.

- Player
  - Components: Position, Velocity, Attributes{ attackPower: 8, defense: 0 }, Health, Stamina, Poise, Inventory, Renderable{ depth: 300, visible: true }, Collider{ w: 12, h: 12, offsetX: 0, offsetY: 0, solid: true, isTrigger: false }, AI, Player
- Enemy
  - Components: Position, Velocity, Attributes, Health, Stamina, Poise, Renderable{ depth: 300 }, Collider{ w: 12, h: 12, solid: true }, AI, Enemy
- Item
  - Components: Position, Renderable, Collider{ w: 12, h: 12, solid: false, isTrigger: true }, Item{ onGround: true }
- Tile
  - Components: Position, Tile, Collider{ w: 16, h: 16, offsetX: 0, offsetY: 0, solid: true, isTrigger: false }
- Projectile
  - Components: Position, Velocity, Projectile, Renderable{ depth: 500 }, Collider{ w: 4, h: 4, isTrigger: true, solid: false }


## 5) Public API (Registry)

Factory:
- createRegistry({ dev = false, initialCapacity = 4096 }) → Registry
  - dev: enables strict validations and diagnostic logs.
  - initialCapacity: initial entity capacity; doubles as needed.

Registry methods:
- createEntity(initialMask = 0) → entityId
  - Allocates a new 1-based ID; applies initialMask presence but requires addComponent to materialize data (use createEntityOf for archetypes).
- destroyEntity(entityId) → void
  - Removes all components (dense-swap), clears signature, marks ID reusable.
- addComponent(entityId, componentName, initialData?) → void
  - O(1) amortized; applies schema defaults then merges initialData; clamps/coerces.
- removeComponent(entityId, componentName) → void
  - Dense-swap removal; clears signature bit.
- hasComponent(entityId, componentName) → boolean
- getComponent(entityId, componentName) → object | null
  - Returns a live reference to the internal data object; mutate only via patchComponent in gameplay code to ensure clamps and events.
- patchComponent(entityId, componentName, partialData) → void
  - Coerces types and applies clamps per schema. Dynamic clamps for Health/Stamina/Poise value in [0..max].
- getSignature(entityId) → number
  - Returns Uint16 mask for the entity.
- query(requiredMask, excludedMask = 0) → Uint32Array | number[]
  - Returns a snapshot array of entity IDs with (sig & requiredMask) === requiredMask and (sig & excludedMask) === 0.
- queryByNames(requiredNames, excludedNames?) → number[]
  - requiredNames/excludedNames: string | string[]. Converts via maskOf and delegates to query.
- forEach(requiredMask, fn) → void
  - Tight loop visiting entities whose signature matches requiredMask; fn(entityId).
- stats() → object
  - Returns counts, capacity, per-component counts, allocations.
- setProfilerHooks(hooks) → void
  - hooks: optional callbacks { onCreate, onDestroy, onAdd, onRemove, onPatch, onQuery, onForEach } receiving minimal payloads for sampling.
- createEntityOf(typeId, overrides?) → entityId
  - typeId in ENTITY_TYPES. Applies archetype overlay, merges overrides, clamps, and returns the entityId.

Utilities and constants:
- COMPONENTS: string[] (15 names in bit order).
- NAME_TO_BIT: Map<string, number>.
- BIT_TO_NAME: string[].
- MASKS: object of component bit masks, e.g., MASKS.Position === 1 << 0.
- maskOf(names: string | string[]) → number.
- namesOfMask(mask: number) → string[].
- ENTITY_TYPES: object of archetype definitions and overlays (see §Archetypes).


## 6) Validation, Type Coercion, and Clamps

Boot-time schema import:
- Import data/core/component-schemas.json with ESM import assertions.
- Verify: version === "v1", component count === 15, names and bit indices match [0..14].
- Precompute per-field metadata: type, default, min/max, dynamic rules for hot-path patching.

Type coercion rules (on add/patch):
- int → Math.trunc(Number(v))
- number → Number(v)
- bool → !!v
- string → String(v)
- Unknown keys in dev: ignored with a one-time console.warn per component name under namespace "ecs.registry.validation"; in prod: silently ignored.

Clamps:
- If field has min/max in schema, clamp after coercion.
- Dynamic clamp rule: For Health, Stamina, Poise, value is always clamped to [0..max] on any patch, including when max changes in the same op (apply max first, then clamp value).
- targetId fields (e.g., AI.targetId, Projectile.ownerId): clamped to valid entityId domain (1..maxEntityId) or to sentinel (0/-1) by schema policy.

Dev vs prod behavior:
- Dev: invalid IDs or component names throw; prod: safe no-op and early return.
- Dev: mismatched component payload keys warned once per key family; prod: no logs.


## 7) Memory, Capacity Growth, and IDs

Capacity and growth:
- Initial capacity: 4096 entities.
- Growth policy: double capacity when allocation exceeds headroom.
- Reallocation preserves entity order, signatures, alive flags, and component dense arrays.

Entity bookkeeping:
- alive: Uint8Array[capacity] (0|1).
- signatures: Uint16Array[capacity].
- freelist: stack of freed IDs for O(1) reuse; new allocations pull from freelist or extend capacity.

Destroy semantics:
- For each present component: dense-swap out; update sparseIndex; decrement count.
- Clear signature to 0; alive[id]=0; push id to freelist.
- Profiler hook onDestroy invoked with id and signature snapshot.


## 8) System Execution Order (Sprint 1 loop)

Recommended per-tick order (left to right is bedrock; each pickaxe swing relies on the last stone laid):
1) InputSystem
   - Reads ECS (Player, Position, etc.); writes intents (Velocity or input buffers).
2) AISystem
   - Reads perception (Position, Player/Enemy, Tile flags); writes Velocity/AI.state; respects thinkCooldown.
3) CombatTimingService
   - Advances telegraphs/cooldowns per combat-design.md; emits combat.TelegraphStart/End; schedules windows.
4) MovementSystem
   - Integrates Position from Velocity; clamps to Velocity.maxSpeed.
5) CollisionSystem
   - Resolves Collider vs world tiles; mutates Position/Velocity; respects Collider.solid/isTrigger.
6) MiningSystem
   - Eligibility checks vs Tile.hardness and Inventory/tools (crafting-design.md); spends Stamina; emits mining.* events.
7) CombatResolveSystem
   - Hit detection using Collider and isTrigger; applies Health/Poise patches; hit-stop scheduling.
8) StaminaPoiseRegenSystem
   - Applies regen with regenDelay; uses patchComponent for safe clamps.
9) RenderSyncSystem
   - Maps Renderable + Position to Phaser sprites; resolves tintToken via style-guide palette.
10) AudioEventBridge
   - Consumes domain events (mining/combat/poise) and dispatches sound IDs.

HitStop: Implemented as time-scaling hooks affecting selected systems (render/combat feel) without violating ECS data invariants.


## 9) Event Contracts and Bridges

Core event names (see domain docs for payload details):
- mining.Swing
- mining.Progress
- mining.Break
- mining.Deny
- combat.TelegraphStart
- combat.Hit
- combat.TelegraphEnd
- poise.Break
- poise.Recover

Profiler hooks are available for ECS lifecycle events: onCreate, onDestroy, onAdd, onRemove, onPatch, onQuery, onForEach.


## 10) Integration Notes

World Generation → ECS:
- TileFactory consumes generateLevel() output (docs/world-generation/cave-gen-algorithm.md).
- Create Tile entities with Position at (x*16, y*16) in pixels.
- Tile.flags is a uint32 bitfield; interpret meanings per Tile flags section.

EnemyFactory:
- Consumes data/combat/enemy-*.json IDs to instantiate Enemy archetype.
- Sets Enemy.enemyTypeId, applies AI state defaults and Attributes/Health/Stamina/Poise tuning from data.

Rendering:
- Renderable.tintToken resolves through data/visual/color-palette.json per style-guide; never use hard-coded hex in ECS.
- RenderSyncSystem should respect Renderable.depth and visible.

JSON import assertions:
- Runtime/bundler must support ESM JSON import with assertions.
- If not available, provide a shim loader or bake schemas at build-time to keep runtime behavior identical.


## 11) Examples (JSDoc-like snippets)

/** Create a Player at spawn with sprite */
```js
const id = registry.createEntityOf('Player', {
  Position: { x: 80, y: 64 },
  Renderable: { spriteId: 'player.base' }
});
```

/** Iterate movers and integrate (if doing custom integration) */
```js
const moveMask = MASKS.Position | MASKS.Velocity;
registry.forEach(moveMask, (eid) => {
  const pos = registry.getComponent(eid, 'Position');
  const vel = registry.getComponent(eid, 'Velocity');
  // Read-only access; write through patch to ensure clamps:
  registry.patchComponent(eid, 'Position', { x: pos.x + vel.vx, y: pos.y + vel.vy });
});
```

/** Apply damage safely */
```js
const h = registry.getComponent(targetId, 'Health');
if (h) registry.patchComponent(targetId, 'Health', { value: h.value - 12 });
```

/** Spawn a Tile from a worldgen cell */
```js
function spawnTileFromCell(registry, cell) {
  // cell: { tx, ty, tileType, hardness, oreType, flags }
  return registry.createEntityOf('Tile', {
    Position: { x: cell.tx * 16, y: cell.ty * 16 },
    Tile: {
      tileType: cell.tileType,
      hardness: cell.hardness,
      oreType: cell.oreType || null,
      flags: cell.flags >>> 0
    }
  });
}
```


## 12) Testing & Profiling

Unit checks:
- add/remove/query invariants across all 15 components.
- Dense-swap correctness (sparseIndex and denseIds/data alignment).
- Dynamic clamp behavior for Health/Stamina/Poise on value/max changes.
- maskOf/namesOf roundtrip and NAME_TO_BIT consistency with schema.
- query and queryByNames parity; excludedMask handling.

Performance/micro-profiler:
- Wire setProfilerHooks to increment counters per op and sample durations (e.g., onForEach ticks, onPatch counts).
- Measure in Encounter Sandbox scene: 10k create/destroy cycles, batched queries.
- Validate branch-predictable scans in query/forEach by linear memory access.

Golden behavior targets (mid laptop):
- 10k create/destroy cycles under 50 ms.
- forEach over 4k entities with Position|Velocity under 0.2 ms average.
- No GC churn spikes from hot loops (reuse arrays/buffers).

Debugging:
- In dev, expect one-time warnings for unknown patch keys per component.
- Use stats() to verify per-component counts after scripted scenarios.


## 13) Risks & Future Dials

Risks:
- JSON import assertions may vary across bundlers; fallback loader needed.
- Over-prescriptive schema risks: Inventory.slots and Tile.tileType enums may constrain content pipelines prematurely.

Future dials:
- Capacity growth factor (currently ×2) — tune for memory vs allocation frequency.
- Clamp ranges — open to balance changes; schema drives behavior without code churn.
- Store shape simplification — if hotspots observed, consider struct-of-arrays for select components (Position/Velocity) in a specialized fast path.
- Query acceleration — add small archetype index if mask patterns stabilize.

Non-goals (Sprint 1):
- Dynamic component catalogs.
- Multithreaded systems.
- Event-sourced undo/redo.


## 14) Acceptance Checklist

- Components catalog and bit indices match data/core/component-schemas.json (v1).
- Registry API matches src/core/ecs-registry.js signatures and behaviors listed.
- System order documented with rationale and data dependencies.
- Archetypes documented precisely; createEntityOf merges overlays and overrides with schema clamps.
- Integration notes align with worldgen, combat, crafting, and render docs.
- Examples are representative and compile in spirit.
- Testing/profiling guidance present; performance targets stated.

Forge’s word: This bedrock stands. Clamp your values, keep your loops hot, and your frames will sing like a dwarven anvil.