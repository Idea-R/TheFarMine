# ECS Architecture — Foundations, Masks, and System Order (Sprint 1)

Provenance: owner @alpha (Core Systems — Ironforge Stonebeard). Cross-refs: src/core/ecs-registry.js, data/core/component-schemas.json, docs/world-generation/cave-gen-algorithm.md (§Tiles/ECS contracts), docs/combat-systems/combat-design.md (§Lanes/telegraphs), data/visual/color-palette.json (tint tokens).

---

## 1) Goals & Non-Goals (MVP)

Goals (Sprint 1)
- Deterministic per-frame behavior on a single client (given same inputs and RNG seeds).
- Data-driven via component schemas; schema-validation at init.
- Mask-based queries with contiguous 15-bit component mask (bits 0..14).
- Zero-GC inner loops in hot paths; reuse buffers; no spread/rest in hot paths.
- Clean, minimal API: create/destroy, add/remove/get, query/view with include/exclude masks, name helpers.
- Browser-friendly performance: 60 fps target, ECS update < 1.5 ms on MVP maps and entity counts.
- Simple, readable system order exported centrally; systems are pure-ish (side effects via event bus and spawn/despawn queues).

Non-goals (deferred from MVP)
- Multithreading/work stealing.
- Network sync/rollback prediction.
- Advanced pooling/SoA packing beyond sparse maps.
- Hierarchical/parented transforms and attachments.

---

## 2) ECS Principles & Data Model

Concepts
- Entities: numeric ids (int > 0). No behavior, only an id and a bitmask.
- Components: plain data structs (POJOs) with validated fields; no methods.
- Systems: pure-ish functions operating on filtered entity sets using bitmasks; may emit events and enqueue spawns/despawns.

Bitmask model
- 15 components, assigned contiguous bit indexes 0..14 inclusive.
- Helpers/constants in src/core/ecs-registry.js:
  - COMPONENT_INDEX: { [name: string]: bitIndex: 0..14 }
  - COMPONENT_BITS: { [name: string]: bitMask: 1 << bitIndex }
  - fromNames(...names): number → OR of requested bits.
  - toNames(mask): string[] → names for the set bits (debug/dev).
- Internal entityMask[id]: number (15-bit).

Storage strategy (as implemented in registry)
- Per-component sparse maps keyed by entity id (Map<int, ComponentData> or plain Object with null-prototype).
- entityMask: Int32Array or number[] tracking membership bitfield.
- aliveIds: dense number[] of active entity ids; free list for id reuse.
- nextId starts at 1; id 0 is reserved and never allocated.
- Structural changes (add/remove component, create/destroy entity) mark view caches dirty and are applied outside active view iteration when needed.

---

## 3) Component Catalog (MVP 15)

General rules
- All schema definitions live in data/core/component-schemas.json (versioned). Registry builds COMPONENT_INDEX and COMPONENT_BITS from schema at init.
- All numeric fields are clamped to declared min/max on write (and at add/init), with int fields floored.
- Defaults come from schema. Typical defaults given below mirror schema. Ranges are enforced.
- All spriteKey and tintToken are token strings only; no raw hex in ECS. Tokens resolve via manifests/palette lookup at render time.
- String enums are tokenized; keep low entropy for bundle size.

Component list (bit assignment order is schema order; 0..14)

1. Position (bit 0)
   - Purpose: world-space location and layer (z-plane slice).
   - Fields: { x:number, y:number, layer:int }
   - Defaults: x=0, y=0, layer=0
   - Ranges: x,y float finite; layer clamped [0..3]
   - Notes: layer 0 = tiles/terrain, 1 = actors, 2+ reserved.

2. Velocity (bit 1)
   - Purpose: per-frame motion delta.
   - Fields: { vx:number, vy:number }
   - Defaults: vx=0, vy=0
   - Ranges: |v| capped by 2048 px/s to avoid tunneling in MVP.

3. Attributes (bit 2)
   - Purpose: offensive/defensive scalar knobs.
   - Fields: { attackPower:int, defense:int }
   - Defaults: attackPower=4, defense=0
   - Ranges: [0..999]; integers.

4. Health (bit 3)
   - Purpose: hitpoints.
   - Fields: { max:int, value:int }
   - Defaults: max=100, value=100
   - Ranges: max [1..9999]; value clamped [0..max].

5. Stamina (bit 4)
   - Purpose: action resource gating.
   - Fields: { max:int, value:int, regenPerSec:number, regenDelayAfterActionMs:int }
   - Defaults: max=100, value=100, regenPerSec=10, regenDelayAfterActionMs=300
   - Ranges: max [1..999]; regenPerSec [0..100]; delay [0..2000]
   - Notes: regen paused for delay after spend; timer managed by Stamina subsystem hooks in Input/Mining/Combat.

6. Poise (bit 5)
   - Purpose: stagger resistance, recovers over time; breaking triggers vulnerability window.
   - Fields: { max:int, value:int, recoverPerSec:number, breakDurationMs:int }
   - Defaults: max=100, value=100, recoverPerSec=25, breakDurationMs=400
   - Ranges: max [1..999]; recover [0..200]; break [0..3000]

7. Inventory (bit 6)
   - Purpose: capacity only in MVP.
   - Fields: { capacity:int, slots?:any[] }
   - Defaults: capacity=10; slots omitted in MVP (null/undefined)
   - Ranges: capacity [0..200]
   - Notes: MVP ignores slots; UI reads capacity.

8. Renderable (bit 7)
   - Purpose: sprite and draw controls.
   - Fields: { spriteKey:string, frame:string, tintToken:string, visible:boolean, depth:int, scale:number }
   - Defaults: spriteKey="", frame="base", tintToken="tint.default", visible=true, depth=0, scale=1
   - Ranges: depth [-100..100]; scale [0.25..8]
   - Notes: spriteKey/frame/tintToken must be valid tokens; see data/visual/color-palette.json.

9. Collider (bit 8)
   - Purpose: AABB and solid/trigger flags.
   - Fields: { w:int, h:int, offsetX:int, offsetY:int, solid:boolean, isTrigger:boolean }
   - Defaults: w=16, h=16, offsetX=0, offsetY=0, solid=true, isTrigger=false
   - Ranges: w,h [1..256]; offsets [-64..64]
   - Notes: solid XOR isTrigger in validations (cannot be both true).

10. AI (bit 9)
    - Purpose: simple state-driven enemy control.
    - Fields: { behavior:string, state:string, speedPxPerSec:number, attackCooldownMs:int, preferOpenLane:boolean, repositionOnMissMs:int, targetId:int }
    - Defaults: behavior="idle", state="idle", speedPxPerSec=32, attackCooldownMs=800, preferOpenLane=true, repositionOnMissMs=400, targetId=0
    - Ranges: speed [0..256], cooldown [0..5000], reposition [0..5000], targetId >=0
    - Notes: behavior/state are tokens; see docs/combat-systems/combat-design.md.

11. Player (bit 10)
    - Purpose: flag + input gate.
    - Fields: { inputEnabled:boolean }
    - Defaults: inputEnabled=false

12. Enemy (bit 11)
    - Purpose: marker + optional kind tag.
    - Fields: { kind?:string }
    - Defaults: kind=""
    - Notes: purely for filtering and data binding.

13. Item (bit 12)
    - Purpose: loot and inventory pickup behavior.
    - Fields: { qty:int, stackable:boolean, onGround:boolean }
    - Defaults: qty=1, stackable=true, onGround=true
    - Ranges: qty [1..999]

14. Tile (bit 13)
    - Purpose: tile metadata for mining and collisions.
    - Fields: { tileType:string, hardness:int, breakable:boolean, oreType?:string }
    - Defaults: tileType="rock", hardness=30, breakable=true, oreType=""
    - Ranges: hardness [0..999]
    - Notes: tileType drives collider.solid and mining outcome; see docs/world-generation/cave-gen-algorithm.md.

15. Projectile (bit 14)
    - Purpose: transient damaging movers.
    - Fields: { speedPxPerSec:number, ttlMs:int, damage:{ base:int, poiseDamage:int } }
    - Defaults: speedPxPerSec=160, ttlMs=1500, damage:{ base:2, poiseDamage:5 }
    - Ranges: speed [0..1024], ttl [0..10000], damage fields [0..999]

Schema cross-links
- All above fields, ranges, and defaults reflect data/core/component-schemas.json.
- Token constraint: Renderable.spriteKey, Renderable.frame, Renderable.tintToken are token-only; no raw hex colors or ad-hoc strings.

---

## 4) Entity Archetypes (MVP)

Archetypes mirror ENTITY_TYPES in src/core/ecs-registry.js. Each archetype supplies minimal required components and critical default overrides; remaining fields use schema defaults.

- player
  - Components:
    - Position{ layer:1 }
    - Velocity{}
    - Attributes{ attackPower:8, defense:0 }
    - Health{ max:100, value:100 }
    - Stamina{ regenPerSec:14 }
    - Poise{ recoverPerSec:35 }
    - Inventory{ capacity:20 }
    - Renderable{ depth:10, scale:1 }
    - Collider{ w:12, h:12, solid:true, isTrigger:false }
    - Player{ inputEnabled:true }
  - Rationale: fully controllable actor with stamina/poise dynamics.

- enemy
  - Components:
    - Position{ layer:1 }
    - Velocity{}
    - Attributes{} (schema defaults)
    - Health{} (schema defaults)
    - Poise{} (schema defaults)
    - AI{ behavior:"skirmisher", state:"idle", speedPxPerSec:48 }
    - Renderable{ depth:9 }
    - Collider{ w:12, h:12, solid:true, isTrigger:false }
    - Enemy{}
  - Rationale: baseline hostile; tuned by external data mapping.

- item
  - Components:
    - Position{ layer:1 }
    - Renderable{ depth:8 }
    - Item{ qty:1, stackable:true, onGround:true }
    - Collider{ w:12, h:12, solid:false, isTrigger:true }
  - Rationale: pickups; trigger-only for overlap detection.

- tile
  - Components:
    - Position{ layer:0 }
    - Tile{ tileType:"rock" }
    - Renderable{ depth:0 }
    - Collider{ w:16, h:16, solid:true, isTrigger:false }
  - Rationale: static world; mining transforms tileType and updates collision.

- projectile
  - Components:
    - Position{ layer:1 }
    - Velocity{}
    - Projectile{ ttlMs:1500, damage:{ base:4, poiseDamage:10 } }
    - Renderable{ depth:11 }
    - Collider{ w:6, h:6, solid:false, isTrigger:true }
  - Rationale: transient damage carrier; speed provided by spawner; trigger for hit detection.

---

## 5) System Execution Order (Authoritative for Sprint 1)

Canonical order exported as SYSTEM_EXECUTION_ORDER in src/core/ecs-registry.js. This document is the source of truth.

1) InputSystem
- Reads: Player, Stamina (regen delay only), Position (for context-sensitive inputs)
- Writes: Velocity, Stamina.regenDelayAfterActionMs timer bookkeeping (sets lastAction timestamp in registry-internal stamina cache)
- Side effects: may enqueue CombatIntents for player attacks; may emit UI events
- Invariants: never applies position updates; only velocity/intent staging

2) AISystem
- Reads: AI, Position, Poise, Health, Enemy, Player (for target acquisition)
- Writes: Velocity, AI.state, AI.targetId, enqueues attack intents to event bus
- Side effects: none beyond intent events
- Invariants: respects attackCooldownMs; does not modify Health/Poise directly

3) PhysicsSystem
- Reads: Position, Velocity, Collider, Tile (for solidity), optional world lane metadata
- Writes: Position
- Side effects: collision events (enter/exit/trigger) to event bus
- Invariants:
  - Resolves collisions using AABB vs. solid tiles and solid colliders
  - Honors 3-wide combat lanes from docs/combat-systems/combat-design.md (entities snap/resolve within lanes; cross-lane motion throttled or blocked by lane bounds)
  - Zero tunneling for speeds under 256 px/s with discrete step; higher speeds require multiple substeps (up to 4)

4) MiningSystem
- Reads: Player (for authority), Tile, Collider (reach box vs. tiles), Position
- Writes: Tile.hardness, Tile.tileType (e.g., "rock" -> "floor" or "rock.ore" -> "floor"), spawns Item entities on break
- Side effects: mining events to event bus (for audio/FX)
- Invariants:
  - Enforces stamina costs before applying hardness damage
  - When hardness reaches 0 and breakable, updates collider.solid of affected tile (via Tile->Collider rule in registry)

5) CombatSystem
- Reads: CombatIntents (event bus), Attributes, Poise, Health, Collider, Position
- Writes: Health.value, Poise.value, transient hit-stop timer, knockback velocities
- Side effects: emits hit events (hit, block, stagger, death) and telegraph completions
- Invariants:
  - Applies damage and poise in one pass per frame
  - Hit-stop clamps local dt for attacker and victim only; does not affect global dt accumulation
  - Knockback respects lane constraints; capped distances

6) EffectsSystem
- Reads: Renderable, recent combat/mining events, telegraph descriptors
- Writes: schedules telegraphs, sets tintToken/frame changes (token-driven), toggles visible, owns short-lived FX entities
- Side effects: emits FX-finished events
- Invariants: never mutates Position/Collider of non-FX entities

7) AudioSystem
- Reads: event bus (mining, hit, death, footstep, UI), plus optional AI state changes
- Writes: none to ECS; triggers audio engine with manifest ids
- Side effects: plays SFX/music by token id only (no file paths)
- Invariants: idempotent per event

8) RenderingSystem
- Reads: Renderable, Position, depth
- Writes: none to ECS
- Side effects: submits draw calls; debug overlays optional under dev flag
- Invariants: respects visible flag; depth ascending

---

## 6) Time Step & Determinism

- MVP uses a variable dt in milliseconds, clamped to [8, 33]. Nominal frame time ~16.6 ms.
- Determinism: with the same input stream and RNG seed, a single client produces identical results frame-to-frame. RNG usage is isolated within systems that need it (AI, loot rolls); registry provides rng seeded per-session.
- If jitter observed in physics/combat, enable fixed-step accumulator for those subsystems (e.g., simulate in N x 8.33 ms quanta up to dt cap), while keeping render at variable dt.

---

## 7) Queries, Views, and Masks

Helpers
- fromNames(...names: string[]): number → bitmask
- toNames(mask: number): string[] → component names (dev/debug)
- registry.query(requiredMask: number, excludeMask: number = 0): returns a lightweight iterable (id[] view) of entities where (mask & requiredMask) === requiredMask and (mask & excludeMask) === 0
- registry.view(includeNames: string[], excludeNames?: string[]): cached view object:
  - Properties: maskInclude, maskExclude, ids: number[] (internal), forEach(cb:(id)=>void)
  - Cache invalidated on structural changes; rebuilt lazily on next iterate

Complexity and iteration contract
- Query: O(aliveCount) worst-case check, but fast bitwise ops; returned array is a borrowed buffer—read-only during iteration.
- View: first build O(aliveCount); subsequent frames O(matchCount). Rebuild on any entity structural mutation, spawn, or destroy.
- Contract: No structural mutation (add/remove component, create/destroy entity) while iterating a provided ids buffer. Systems must enqueue mutations via registry.structuralQueue and let the registry drain post-frame or between systems as configured.
- Stability: Within a frame, the id order is stable (ascending numeric id). Do not rely on order beyond stable asc id unless explicitly sorted by system.

---

## 8) Component Schemas & Validation

Schema file shape (data/core/component-schemas.json)
- Top-level
  - version: int (MVP expects 1)
  - components: array of component descriptors; length must be exactly 15
- Each component descriptor
  - name: string (unique; TitleCase)
  - bit: int (0..14, contiguous across file; position defines mask index)
  - fields: array of
    - { key: string, type: "int" | "number" | "string" | "boolean" | "object", default: any, min?: number, max?: number, required?: boolean }
- Validation on init (registry)
  - version == expected (1 for Sprint 1)
  - Bits cover contiguous range [0..14] with no gaps
  - Unique component names and unique bit assignments
  - Field defaults conform to type; ints are integers; number finite; min <= default <= max if present
- Coercion and clamping
  - int: floor(value), clamp to [min,max] if provided
  - number: +value, clamp to [min,max] if provided
  - boolean: !!value
  - string: String(value)
  - object: shallow-validated if nested schema provided (e.g., Projectile.damage)
- applyPatch semantics
  - When addComponent(entity, name, data) called, data shallow-merged over defaults, then coerced+clamped
  - setComponentField clamps per write; partial updates allowed
- Fail-fast: throw on invalid component name, bit collisions, or field writes that violate type (after coercion attempt)

---

## 9) Error Handling & Debugging

Initialization checks
- Schema version mismatch → throw: "Schema version 1 required (got X)"
- Bit contiguity violation → throw: "Component bits must be contiguous 0..14; missing: [list]"
- Duplicate names/bits → throw with offending entries

Runtime API errors
- addComponent(id, name, data) when entity missing → throw: "Entity #id not found"
- addComponent for existing component → no-op or throw under strict mode: "Entity #id already has Component"
- removeComponent for non-present → no-op (dev warns)
- destroyEntity(id) unknown → no-op (dev warns)
- set/get when component absent → throw: "Component X missing on #id"
- Structural mutation during iteration → assert in dev: "Structural mutation during active view; enqueue instead"

serializeEntity(id) snapshot (dev)
- Returns a plain object stable for logging:
  - { id, mask: "0bxxxxxxxxxxxxxxx", components: { Name: { ...data } } }
- Optional hex mask "0x####" for brevity

Dev stats (registry.stats)
- entityCount: number
- componentCounts: { [name]: number }
- viewBuilds: number (since reset)
- queriesRun: number (since reset)
- structuralOps: { adds, removes, creates, destroys } (counters)
- frameAllocs: number (should be 0 in hot paths; dev-only probes)

---

## 10) Performance Targets & Benchmarks

Targets (mid-tier laptop, Chrome stable)
- ECS update (all systems 1–8) < 1.5 ms with 250–400 entities:
  - ~120 tiles proxied as ECS in active chunk
  - 20–30 enemies
  - 30 items
  - Misc effects/projectiles within budget
- Zero allocations per frame in hot loops (systems 1–5); Effects/Audio may allocate sparingly (<10 small objects/frame)

Practices
- Reuse id buffers and scratch vectors
- Avoid for..of and spread/rest in inner loops; use counted for i=0..n
- Prefer numeric masks and precomputed COMPONENT_BITS constants

Micro-bench plan (acceptance)
- 10k masked checks ((mask & req) === req) < 0.5 ms
- View cache rebuild (include+exclude) for 400 alive entities < 0.2 ms
- Physics broad-phase AABB vs. tiles (per-entity) < 0.05 ms for typical densities

---

## 11) Serialization & Save/Load (MVP Notes)

- Minimal snapshot for dev saves:
  - List of entities: { id, mask, components }
  - Components include only present ones; data as per schema (token strings preserved)
  - JSON format; stable keys; versioned with schema version
- Load path:
  - Create entities with given ids if free; otherwise remap with id map (dev only)
  - Add components via schema-validated addComponent
- Not required for Sprint 1 shipping, but format should remain backward-compatible within major version 1

---

## 12) Integration Points

- Worldgen (docs/world-generation/cave-gen-algorithm.md)
  - Tiles instantiated via ENTITY_TYPES.tile
  - Tile.tileType drives Collider.solid and Renderable.spriteKey/frame through mapping in worldgen adapters
- Combat data
  - Enemy configs in data/combat/*.json map to AI/Attributes/Health/Poise/Renderable/Collider
  - tintToken paths resolve via data/visual/color-palette.json; no raw hex in ECS
  - Lanes/telegraphs per docs/combat-systems/combat-design.md; EffectsSystem/AISystem adhere to lane tokens
- UI
  - HUD consumes Health.value/max, Stamina.value/max and regen delay, Poise.value/max
  - Inventory.capacity shown; future slots deferred
- Audio
  - AudioSystem consumes event bus tokens; all SFX/music referenced by manifest id tokens

---

## 13) Testing & QA Checklist

- Schema loads and validates:
  - version == 1
  - bits cover 0..14 contiguous
  - no duplicate names or bits
- Archetypes instantiate without errors; defaults match this document
- System order enforced equals SYSTEM_EXECUTION_ORDER
- Combat hit-stop localizes dt; does not corrupt global dt or other entities' motion
- Queries and views:
  - include/exclude masks honored
  - no structural mutations during iteration; queue works
- All tintToken/spriteKey references resolve to known tokens
- Performance budget met in profiling:
  - ECS < 1.5 ms for target loads
  - Zero allocations in Physics/Combat/Input/AI inner loops

---

## 14) Future Extensions (Non-binding)

- Pooling and SoA packing for hot components (Position, Velocity, Collider)
- Per-system event buses and typed channels
- State tags/temporal components (e.g., Stunned, Invulnerable) with TTL
- Parenting/attachments for weapons and FX
- Multithreaded jobs (Web Workers/Atomics) for AI batches
- Net sync strategies (authoritative lockstep or rollback)

---

## Appendices

Appendix A) Example code snippets (commented)

```js
// Creating a player entity
import { registry, fromNames, COMPONENT_BITS } from 'src/core/ecs-registry.js';

// Create
const id = registry.createEntity();

// Add baseline components (schema defaults applied where not provided)
registry.addComponent(id, 'Position', { x: 32, y: 64, layer: 1 });
registry.addComponent(id, 'Velocity', { vx: 0, vy: 0 });
registry.addComponent(id, 'Attributes', { attackPower: 8, defense: 0 });
registry.addComponent(id, 'Health', { max: 100, value: 100 });
registry.addComponent(id, 'Stamina', { regenPerSec: 14 }); // other fields default
registry.addComponent(id, 'Poise',   { recoverPerSec: 35 });
registry.addComponent(id, 'Inventory', { capacity: 20 });
registry.addComponent(id, 'Renderable', { spriteKey: 'actor.player', frame: 'base', tintToken: 'tint.player', depth: 10, scale: 1 });
registry.addComponent(id, 'Collider', { w: 12, h: 12, solid: true, isTrigger: false });
registry.addComponent(id, 'Player',   { inputEnabled: true });

// Querying all movable entities (Position + Velocity), excluding Items and Tiles
const MOVABLE = fromNames('Position', 'Velocity');
const EXCLUDE = fromNames('Item', 'Tile');
const ids = registry.query(MOVABLE, EXCLUDE);

// Hot loop with zero-GC pattern
for (let i = 0, n = ids.length; i < n; i++) {
  const e = ids[i];
  const pos = registry.getComponent(e, 'Position');
  const vel = registry.getComponent(e, 'Velocity');
  // integrate (PhysicsSystem will clamp and collide)
  pos.x += vel.vx * registry.dtSec; // dtSec = dtMs / 1000
  pos.y += vel.vy * registry.dtSec;
}

// Using a cached view
const actorsView = registry.view(['Position', 'Renderable'], ['Tile']);
actorsView.forEach((e) => {
  const r = registry.getComponent(e, 'Renderable');
  if (!r.visible) return;
  // submit draw...
});
```

Appendix B) ASCII mask diagram for common views

```
Bit index:   14 13 12 11 10 09 08 07 06 05 04 03 02 01 00
Component:   Pr Ti It En Pl AI Co Re In Po St He At Ve Po
Legend key:  Pr=Projectile Ti=Tile It=Item En=Enemy Pl=Player AI=AI Co=Collider
             Re=Renderable In=Inventory Po=Poise St=Stamina He=Health At=Attributes
             Ve=Velocity Po=Position

Example masks:
- MOVABLE = Position | Velocity
  Mask bits: ...000000000000011  (bits 0 and 1 set)

- ACTORS = Position | Renderable | Collider | (Player or Enemy)
  Base: Position + Renderable + Collider
  Include: 0000001000000111 (bits 0,1,7,8)
  Filter by tags Player or Enemy separately as needed.

- TILES = Position | Tile | Collider
  Mask bits: ...011000000000001 (bits 0,8,13)

- DAMAGE_CARRIERS = Projectile | Collider | Position
  Mask bits: ...100000000000001 (bits 0,8,14)
```

Appendix C) Field range cheatsheet (key components)

- Health
  - max: [1..9999], default 100
  - value: [0..max]
- Stamina
  - max: [1..999], default 100
  - value: [0..max]
  - regenPerSec: [0..100], default 10 (player archetype uses 14)
  - regenDelayAfterActionMs: [0..2000], default 300
- Poise
  - max: [1..999], default 100
  - value: [0..max]
  - recoverPerSec: [0..200], default 25 (player archetype uses 35)
  - breakDurationMs: [0..3000], default 400
- Collider
  - w,h: [1..256]; default 16x16 (player/enemy 12x12; projectile 6x6; tile 16x16)
  - offsetX/Y: [-64..64]
  - solid/isTrigger: XOR (one true at most)
- Projectile
  - speedPxPerSec: [0..1024], default 160 (archetype supplies via weapon if needed)
  - ttlMs: [0..10000], default 1500
  - damage.base: [0..999], default 2 (archetype projectile uses 4)
  - damage.poiseDamage: [0..999], default 5 (archetype projectile uses 10)

---

Stonebeard’s closing note: Keep the bits tight, the loops tighter, and never let a stray allocation crumble your frame. The order above is the anvil—build your systems on it.