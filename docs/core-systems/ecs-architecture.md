# ECS Architecture — Foundations of Brass and Bedrock (Sprint 1)

Provenance
- Owner: @alpha (Core Systems — Ironforge Stonebeard)
- Cross-references:
  - data/core/component-schemas.json
  - src/core/ecs-registry.js
  - docs/combat-systems/combat-design.md
  - docs/technology-systems/crafting-design.md
  - docs/world-generation/cave-gen-algorithm.md
  - docs/visual-systems/ui-framework.md

## 1) ECS Principles & Goals (Sprint 1)

- Data-oriented design: components are plain bags of validated, clamped data; systems are pure update passes over stable views.
- Fixed component catalog (15 bits, 0..14): no dynamic registration at runtime in Sprint 1.
- Cache-friendly maps + masks: per-component storage Maps plus dense mask array; bit operations for fast query.
- Deterministic updates: single-threaded, fixed system order, stable query/view snapshots.
- Minimal allocations mid-tick: views build stable snapshots; loops reuse bags where feasible.
- Stable queries/views: mutations during iteration do not invalidate current pass.
- Robust clamping/validation per schema: all component writes and patches pass through schema-driven clamps.

Non-goals (MVP)
- No dynamic reflection of arbitrary schemas at runtime (catalog is fixed).
- No hierarchy/parenting or transform inheritance.
- No advanced archetype migration or chunk/archetype storage.

## 2) Component Catalog (Authoritative Pointer)

- Single source of truth: data/core/component-schemas.json (version=1). It defines exactly 15 components occupying bits 0..14, contiguous.
- Compact index list (name → bit):
  - Position(0), Velocity(1), Attributes(2), Health(3), Stamina(4), Poise(5), Inventory(6), Renderable(7), Collider(8), AI(9), Player(10), Enemy(11), Item(12), Tile(13), Projectile(14).
- Clamp and coercion summary (applies on add, replace, and patch):
  - Numbers/ints: clamp to [min..max] if specified by schema; NaN ignored on patch.
  - Health/Stamina/Poise: dynamic clamp so value ≤ max; if max decreases, value is clamped down; regen rates/timeouts clamped to schema bounds.
  - Booleans: coerced via !!value.
  - Strings: coerced to string; empty string allowed unless schema default overrides; default applied if absent.
  - Objects: shallow-merged; only primitive leaves permitted. Inventory.slots and Projectile.damage are treated as shallow objects with primitive leaves only.
  - Unknown keys are ignored on patches (do not throw); unknown component names cause throws.

## 3) Archetypes & Entity Types (MVP)

Canonical archetypes match ENTITY_TYPES in src/core/ecs-registry.js. Each archetype is composed of required components with defaults. Options (opts) are merged per component then clamped.

- player
  - Components: Position, Velocity, Attributes{strength:8, agility:0}, Health{value:100, max:100}, Stamina{value:100, max:100, regenPerSec:14, regenDelayAfterActionMs:600}, Poise{value:100, max:100, regenPerSec:35, regenDelayAfterHitMs:800}, Renderable{visible:true, depth:0, scale:1}, Collider{w:12, h:12, solid:false, isTrigger:false}, Player{inputEnabled:true}, Inventory{capacity:20}
  - Notes: 12×12 body; render layer depth 0.
- enemy
  - Components: Position, Velocity, Attributes{}, Health{}, Poise{}, Renderable{}, Collider{w:12, h:12}, AI{behavior:"idle", state:"idle"}, Enemy{kind:""}
  - Notes: opts-merge allowed for AI.behavior, Enemy.kind, and stats (Attributes/Health/Poise).
- item
  - Components: Position, Renderable{}, Collider{w:12, h:12, isTrigger:true, solid:false}, Item{qty:1, stackable:true, onGround:true}
- tile
  - Components: Position{layer:0}, Tile{tileType:"rock"|"floor"|"rock.ore", hardness, breakable:true, oreType:""}, Collider depends on tileType, Renderable optional
  - Collider rules:
    - rock: solid=true, w:16, h:16
    - floor: solid=false, w:16, h:16
  - Renderable: optional; tilemap renderer may drive visuals for tiles.
- projectile
  - Components: Position, Velocity, Projectile{speedPxPerSec:120, ttlMs:1500, damage:{base:4, poise:10}}, Collider{w:4, h:4, isTrigger:true, solid:false}

Archetype opts-merge contract
- createEntity(type, opts) accepts a map of componentName → partial component object.
- Merge order per component: defaults → opts[component] → clamp.
- Unknown component names in opts throw.

## 4) Registry API (Public Contract)

Exports (src/core/ecs-registry.js)
- COMPONENTS: array of component names in bit order [0..14].
- COMPONENT_BITS: map name → bitmask (1 << index).
- COMPONENT_INDEX: map bit index → name.
- fromNames(names[]: string[]): number — returns combined required bitmask.

Factory
- createRegistry(): Registry — constructs an isolated ECS registry instance.

Registry methods and semantics
- createEntity(type?: string, opts?: object): number
  - Allocates an entity id ≥ 1.
  - If type provided, applies canonical archetype (see section 3). Unknown type throws.
  - Returns id; id 0 is reserved and never returned.
- destroyEntity(id: number): void
  - Removes all components; clears mask; puts id into free-list (LIFO).
  - Safe if called multiple times (subsequent calls no-op).
- addComponent(id: number, name: string, data?: object): void
  - Attaches component; merges defaults with provided data; clamps to schema.
  - If component already present, replace/idempotent re-add merges and clamps (last write wins).
  - Unknown component name throws.
- getComponent(id: number, name: string): object | undefined
  - Returns live component bag (mutations reflect immediately), or undefined if absent.
- hasComponent(id: number, name: string): boolean
  - Resolves from mask check (bit test).
- removeComponent(id: number, name: string): void
  - Deletes storage and clears bit. Safe if absent (no-op).
- applyPatch(id: number, name: string, patch: object): void
  - Shallow-merge into component; type-coerce and clamp fields; ignores unknown keys and NaN.
  - Unknown component name throws.
- maskOf(id: number): number
  - Returns 32-bit int mask; Sprint 1 uses bits 0..14.
- query(requiredMask: number, excludeMask: number = 0): number[]
  - Returns a stable snapshot array of ids with (mask & requiredMask) === requiredMask and (mask & excludeMask) === 0.
  - Snapshot is immutable for the caller’s tick; registry may reuse internal buffers across ticks.
- view(includeNames: string[], excludeNames?: string[]): View
  - Materializes a stable id list for the tick.
  - View.forEach(fn: (bag) => void): iterates matching entities; bag includes { id, mask } plus named components pre-fetched as fields keyed by component name.
  - Mutations inside forEach do not affect current iteration order or membership.
- size(): number
  - Active entity count (non-zero mask).

Determinism
- query() and view() produce stable snapshots for the current tick; mutations during iteration never invalidate or reorder the current pass.

## 5) System Catalog (Sprint 1) & Execution Order

Execution order is fixed; each system consumes stable snapshots. Aye, keep the cogs turning in this order each frame:

1) Clock/TimerService
- Purpose: Advances central ms clock; provides dt (ms) and scaled local time queries.
- Views: none (service).
- Emits: tick.start {dtMs}, tick.end {dtMs}.
- Ordering: Always first.

2) InputSystem
- Purpose: Consume device input; write intents to Player component or transient action flags.
- Views: include ["Player"]; may also read Stamina when gating queued actions.
- Emits: input.actionQueued {id, kind, tsMs}.
- Ordering: Before stamina and action resolution.

3) StaminaSystem
- Purpose: Enforce regenDelayAfterActionMs; spend on queued actions; start/stop regen.
- Views: ["Player","Stamina"] and optionally ["AI","Stamina"] for NPC stamina usage.
- Emits: stamina.spend {id, amount}, stamina.regenState {id, state: "idle"|"delayed"|"regen"}.
- Ordering: Before Combat/Mining so spends are applied or actions cancelled.

4) CombatTimingService (HitStop hooks)
- Purpose: Per-actor timeScale freezes from combat-design; cap ≤ 60 ms per event; decays over time.
- Views: ["Player"] and ["Enemy"] optional for bookkeeping.
- Emits: combat.hitStopApplied {id, ms}, combat.hitStopEnd {id}.
- Ordering: Before CombatSystem; MovementSystem must query per-actor timescale.

5) CombatSystem
- Purpose: Resolve telegraph → active → collision → damage/poise/block/dodge; respect i-frames and block cones.
- Views:
  - Attackers: ["Position","Collider"] with one of ["Player","AI"].
  - Victims: ["Position","Collider","Health"].
- Emits: combat.telegraphStart, combat.telegraphCancel, combat.attackStart, combat.hit, combat.graze, combat.block, combat.dodge, combat.poiseBreak, combat.damageApplied, combat.attackEnd.
- Ordering: After StaminaSystem; before Physics (knockback impulses applied before collision resolution).

6) MiningSystem
- Purpose: Schedule swings/pulses; enforce hardness gating; accumulate progress; decrement tool durability only on valid hits.
- Views: Actors: ["Player","Stamina"]; Targets: ["Tile","Collider"].
- Emits: mining.swing, mining.hit {tileId, progressAdded}, mining.break {tileId, dropKind?}.
- Ordering: After StaminaSystem; before Physics so impulses from mining can be applied.

7) MovementSystem
- Purpose: Integrate Velocity → Position; honor local hit-stop timescale; clamp to navmask.
- Views: ["Position","Velocity"] excluding entities currently fully frozen by hit-stop (via service query).
- Emits: movement.moved {id, dx, dy}.
- Ordering: Before Physics/CollisionSystem.

8) AISystem
- Purpose: Lightweight state machine; target selection; attack gating via attackCooldownMs; lane preference via AI.preferOpenLane.
- Views: ["AI","Position"] and environmental queries.
- Emits: ai.stateChanged {id, from, to}, ai.targetChanged {id, targetId}.
- Ordering: After Movement and Combat (to react); before next frame Input/Stamina gating.

9) Physics/CollisionSystem
- Purpose: Broad/narrow phase between entity Colliders and world/tile; resolve triggers (pickup), solids, and apply knockback.
- Views:
  - Dynamics: ["Position","Collider"] where Collider.solid or isTrigger.
  - World: ["Tile","Collider"].
- Emits: physics.trigger {a,b, kind}, physics.collision {a,b, normal}, item.picked {playerId, itemId}.
- Ordering: After Movement and Combat impulses; before Lifetime.

10) LifetimeSystem
- Purpose: TTL for projectiles; destroy on expiry or impact flags.
- Views: ["Projectile"] and optionally Collider for impact flags.
- Emits: lifetime.expired {id}, lifetime.destroyed {id, reason}.
- Ordering: After Physics.

11) AnimationVFXBridge
- Purpose: Map state to animation keys; overlay telegraphs; surface strike-frame cues.
- Views: ["Renderable"] plus read-only peeks at Combat/Mining state.
- Emits: vfx.play {id, key}, anim.state {id, key}.
- Ordering: After core state changes (Combat/Mining/Physics).

12) AudioEventBridge
- Purpose: Subscribe to mining/combat/ui events; route to AudioSystem per audio-design.
- Views: none (event bridge).
- Emits: audio.play {key, pos?}, audio.duck {bus, ms}.
- Ordering: After AnimationVFXBridge (non-blocking).

13) UISync/HUDSystem
- Purpose: Update gauges (Health/Stamina/Poise), hotbar, prompts from component changes/events.
- Views: ["Player","Health","Stamina","Poise","Inventory"].
- Emits: ui.hudUpdate {slots, bars}, ui.prompt {text, kind}.
- Ordering: Late; after events produced.

14) Cleanup/DespawnSystem
- Purpose: Process destroy queues; enforce teardown ordering; finalize component removals.
- Views: none (operates on registry queues).
- Emits: none (or debug cleanup.done).
- Ordering: Final.

## 6) Masks, Views, and Query Patterns

- Move integration view
  - include: ["Position","Velocity"]
  - Example: For each bag, integrate dx = vx * (dt * localScale), unless entity is fully hit-stopped via CombatTimingService.
- Combat collision candidates
  - Attackers: include ["Position","Collider"] and one of ["AI","Player"].
  - Victims: include ["Position","Collider","Health"].
- Tile interaction
  - include ["Tile","Collider"].
- Using fromNames and mask math
  - const req = fromNames(["Position","Velocity"]);
  - const ex = fromNames(["Projectile"]); // e.g., exclude projectiles from movement integration if handled elsewhere
  - const ids = registry.query(req, ex);
  - Required match: (mask & req) === req; Exclusion: (mask & ex) === 0.
- Snapshot safety
  - Mutating entities (add/remove components, destroyEntity) inside view.forEach is safe; current iteration membership is not affected this tick.

## 7) Data Contracts & Events (Authoritative Pointers)

Canonical events (align payloads and naming with referenced design docs)
- Combat (docs/combat-systems/combat-design.md)
  - combat.telegraphStart {id, attackKey, windupMs, dir}
  - combat.telegraphCancel {id, attackKey, reason}
  - combat.attackStart {id, attackKey, activeWindowMs}
  - combat.hit {attackerId, victimId, damage:{health, poise}, knockback:{dx,dy}}
  - combat.graze {attackerId, victimId}
  - combat.block {attackerId, victimId, perfect:boolean}
  - combat.dodge {attackerId, victimId, iFrame:true}
  - combat.poiseBreak {victimId}
  - combat.damageApplied {victimId, healthDelta, poiseDelta}
  - combat.attackEnd {id, attackKey}
  - combat.hitStopApplied {id, ms}
  - combat.hitStopEnd {id}
- Mining/Crafting (docs/technology-systems/crafting-design.md)
  - mining.swing {actorId, toolKey, tsMs}
  - mining.hit {actorId, tileId, progressAdded, hardness}
  - mining.break {actorId, tileId, oreType?, drops?}
  - crafting.queue {actorId, recipeId}
  - crafting.complete {actorId, recipeId}
- Audio (docs/visual-systems/ui-framework.md and audio-design in visual systems)
  - audio.play {key, pos?, volume?}
  - audio.duck {bus, ms}
  - audio.stop {key?}
- UI/HUD (docs/visual-systems/ui-framework.md)
  - ui.hudUpdate {health, stamina, poise, hotbar}
  - ui.prompt {text, kind}
  - ui.damageNumber {victimId, value, kind}
- Timing and Tick
  - tick.start {dtMs}
  - tick.end {dtMs}

Units and determinism
- Time: milliseconds (ms) integer where practical; dt is ms.
- Space: pixels (px) for Position, Velocity, Collider dimensions.
- No RNG in core action resolution; randomization, if any, must be injected via deterministic seeds in higher layers (not in Sprint 1 core).

## 8) Validation, Defaults, and Clamping Rules

- Central clamp utility enforces schema defaults and min/max constraints on all writes (addComponent, applyPatch).
- Dynamic clamps
  - Health/Stamina/Poise: On add/patch, ensure value ≤ max and ≥ 0; regenPerSec clamped to [schema.min..schema.max]; delay timers clamped to [0..schema.maxDelay].
- Shallow objects
  - Inventory.slots: shallow object of slotKey → itemRef or primitive; non-objects ignored.
  - Projectile.damage: shallow {base:number, poise:number}; unknown fields ignored.
- Unknown handling
  - Unknown component name: throws.
  - Unknown field in data/patch: ignored; does not throw.
- Strings and booleans coerced; numbers with NaN are ignored on patch; on add, NaN replaced by default.

## 9) Performance & Memory Notes

- Entity id allocator
  - LIFO free-list reuse; id 0 reserved and never used.
- Storage layout
  - Per-component Map<int, object> for bags.
  - Dense mask array number[] indexed by id; optional active flags or mask===0 for dead.
- Bit ops
  - 32-bit math; Sprint 1 uses bits 0..14 only.
- Allocation policy
  - Avoid per-frame temp objects in tight loops; views may reuse an internal bag object when iterating, but forEach receives stable field references for the iteration body.
- Microprofiler hooks (dev flag)
  - query()/view() build time and counts.
  - Per-system forEach duration and iteration count.
  - Clamp utility invocation counters and time.

## 10) Determinism & Testing Hooks

- Determinism
  - Fixed system order; single-threaded loop; central Clock service in ms.
- Unit tests to add (tools/ecs-registry.test.js)
  - Registry add/remove/query and mask correctness.
  - View snapshot stability while mutating (add/remove/destroy within forEach).
  - Dynamic clamps for Health/Stamina/Poise, including value ≤ max on max reductions.
  - Archetype defaults: Player Collider 12×12, Player.inputEnabled true; Tile Collider.solid true for rock and false for floor.
- Acceptance requirements
  - Test suite must pass with strict equality on component names/bits/fields and API signatures.

## 11) System–Component Interaction Tables (Compact)

- Clock/TimerService
  - Reads: none
  - Writes: service state (dtMs)
  - Emits: tick.start, tick.end
  - Deps: none

- InputSystem
  - Reads: Player
  - Writes: Player (intents/transients)
  - Emits: input.actionQueued
  - Deps: device input

- StaminaSystem
  - Reads: Stamina, Player/AI intent flags
  - Writes: Stamina.value, Stamina.regenDelay timers
  - Emits: stamina.spend, stamina.regenState
  - Deps: none

- CombatTimingService
  - Reads: combat events
  - Writes: internal per-actor timeScale registry
  - Emits: combat.hitStopApplied, combat.hitStopEnd
  - Deps: CombatSystem hooks

- CombatSystem
  - Reads: Position, Collider, Health, Poise, Player/AI, Stamina (gating), service timeScale
  - Writes: Health.value, Poise.value, Velocity (knockback), transient i-frames
  - Emits: combat.*
  - Deps: CombatTimingService

- MiningSystem
  - Reads: Player, Stamina, Tile, Collider, Attributes (tool checks)
  - Writes: Tile.breakProgress (transient/local), Stamina.value, tool durability (if modeled)
  - Emits: mining.swing, mining.hit, mining.break
  - Deps: Audio/UI bridges (listeners)

- MovementSystem
  - Reads: Position, Velocity, per-actor timeScale
  - Writes: Position
  - Emits: movement.moved
  - Deps: navmask

- AISystem
  - Reads: AI, Position, world context
  - Writes: AI.state, intents
  - Emits: ai.stateChanged, ai.targetChanged
  - Deps: none

- Physics/CollisionSystem
  - Reads: Position, Collider, Tile
  - Writes: Position (resolution), Velocity (response), Item/Inventory (pickup)
  - Emits: physics.trigger, physics.collision, item.picked
  - Deps: world collision map

- LifetimeSystem
  - Reads: Projectile, impact flags
  - Writes: destroy queues
  - Emits: lifetime.expired, lifetime.destroyed
  - Deps: registry

- AnimationVFXBridge
  - Reads: Renderable, combat/mining states
  - Writes: Renderable transient fields (e.g., tintToken), animation state
  - Emits: vfx.play, anim.state
  - Deps: renderer

- AudioEventBridge
  - Reads: event bus
  - Writes: none (routes to audio engine)
  - Emits: audio.play, audio.duck
  - Deps: AudioSystem

- UISync/HUDSystem
  - Reads: Player, Health, Stamina, Poise, Inventory
  - Writes: UI state
  - Emits: ui.hudUpdate, ui.prompt
  - Deps: UI framework

- Cleanup/DespawnSystem
  - Reads: destroy queue
  - Writes: registry mutations
  - Emits: none
  - Deps: registry

## 12) Execution Timeline Examples (Copy/Paste)

- Example A: Player light attack
  - InputSystem → input.actionQueued(lightAttack)
  - StaminaSystem → stamina.spend(attackCost) or cancel if insufficient
  - CombatSystem → combat.telegraphStart → after windup, combat.attackStart
  - Physics/CollisionSystem during active window → collisions found
  - CombatSystem → combat.hit per victim; apply Health/Poise deltas; enqueue knockback
  - CombatTimingService → combat.hitStopApplied (cap 60 ms) → decay
  - AnimationVFXBridge → vfx.play("slash"), anim.state("attack_light")
  - AudioEventBridge → audio.play("swing_light"); on hit audio.play("hit_flesh"/"hit_rock")
  - UISync/HUDSystem → ui.hudUpdate (stamina delta), ui.damageNumber

- Example B: Mining T1 pick on copper
  - InputSystem → input.actionQueued(mine)
  - StaminaSystem → stamina.spend(mineCost)
  - MiningSystem → mining.swing (schedule) → strike at ~70–90 ms window
  - Physics/CollisionSystem → ensure tile in reach; resolve trigger
  - MiningSystem → mining.hit (progress += f(tool, hardness)); on threshold → mining.break
  - AudioEventBridge → audio.play("pick_swing"), audio.play("rock_hit"), audio.duck(bus="music", ms=200)
  - UISync/HUDSystem → ui.hudUpdate (stamina), ui.prompt on ore pickup

- Example C: Block with perfect window
  - InputSystem → input.actionQueued(block)
  - StaminaSystem → stamina.spend(blockRaiseCost)
  - CombatSystem → sets block state; perfect window ~120 ms after raise lasting ~120 ms
  - Incoming hit during window → combat.block {perfect:true}; reduced damage/chip applied; reflect poise bonus
  - CombatTimingService → small hit-stop for both parties
  - UISync/HUDSystem → ui.hudUpdate; AudioEventBridge → audio.play("block_perfect")

## 13) Integration Notes with Other Specs

- Combat design alignment
  - Timings for windup/active/recovery and hit-stop caps (≤ 60 ms) must match docs/combat-systems/combat-design.md.
  - I-frames, block cones, and poise mechanics resolved in CombatSystem as specified.
- Crafting/Mining alignment
  - Hardness gating and valid-hit durability decrement per docs/technology-systems/crafting-design.md.
  - Stamina rhythm (regen delays and costs) aligned with tool tiers.
- World generation alignment
  - Tile.tileType/hardness/oreType must match docs/world-generation/cave-gen-algorithm.md output.
  - Corridor width “three-wide law” respected by Collider and navmask; Movement clamps accordingly.
- UI framework alignment
  - HUDScene listens for ui.hudUpdate and related events.
  - Optional Renderable.tintToken used by props for token-only color changes per docs/visual-systems/ui-framework.md.

## 14) Acceptance & QA Checklist (Sprint 1)

- Component catalog exactly matches data/core/component-schemas.json (names, bits, fields).
- Registry API matches src/core/ecs-registry.js public exports and behavior.
- Archetype defaults align to this doc and tests; masks and queries are stable.
- System order implemented exactly as documented; events emitted with correct payloads and timing.
- Deterministic behavior under fixed inputs; micro-profiler hooks (if enabled) are non-intrusive.

## Appendices

### A) COMPONENT_BITS reference (name → bit → hex mask)

- Position → 0 → 0x00000001
- Velocity → 1 → 0x00000002
- Attributes → 2 → 0x00000004
- Health → 3 → 0x00000008
- Stamina → 4 → 0x00000010
- Poise → 5 → 0x00000020
- Inventory → 6 → 0x00000040
- Renderable → 7 → 0x00000080
- Collider → 8 → 0x00000100
- AI → 9 → 0x00000200
- Player → 10 → 0x00000400
- Enemy → 11 → 0x00000800
- Item → 12 → 0x00001000
- Tile → 13 → 0x00002000
- Projectile → 14 → 0x00004000

Combined examples
- Move mask (Position|Velocity): 0x00000001 | 0x00000002 = 0x00000003
- Actor mask (Position|Collider|(Player|AI)): base 0x00000001 | 0x00000100 plus either 0x00000400 or 0x00000200.

### B) Example code snippets (JavaScript)

- Creating a registry and spawning a player via archetype with overrides
```js
import { createRegistry, fromNames } from "../src/core/ecs-registry.js";

const ecs = createRegistry();

// Spawn a player with overridden Attributes and Renderable.scale
const playerId = ecs.createEntity("player", {
  Attributes: { strength: 10 },
  Renderable: { scale: 1.1 },
  Position: { x: 64, y: 128, layer: 0 }
});

// Verify clamps applied (e.g., Health.value ≤ Health.max)
const health = ecs.getComponent(playerId, "Health");
console.log(playerId, health.value, health.max);
```

- Building a view and iterating safely while mutating entities
```js
const moveView = ecs.view(["Position", "Velocity"]);
moveView.forEach(bag => {
  // bag has { id, mask, Position, Velocity }
  const dtMs = clock.dtMsFor(bag.id); // from Clock/CombatTimingService, mocked here
  bag.Position.x += bag.Velocity.vx * (dtMs / 1000);
  bag.Position.y += bag.Velocity.vy * (dtMs / 1000);

  // Safe mutation: removing Velocity mid-iteration will not affect this pass
  if (Math.abs(bag.Velocity.vx) < 0.01 && Math.abs(bag.Velocity.vy) < 0.01) {
    ecs.removeComponent(bag.id, "Velocity");
  }
});
```

- Using fromNames to construct masks for queries
```js
const req = fromNames(["Position", "Collider"]);
const ex = fromNames(["Projectile"]); // exclude projectiles
const ids = ecs.query(req, ex);
for (const id of ids) {
  const pos = ecs.getComponent(id, "Position");
  const col = ecs.getComponent(id, "Collider");
  // ... do broadphase or spatial indexing
}
```

### C) Future hooks (non-binding)

- Schema validation levels: dev-time strict mode vs release lightweight clamps.
- Parent/child links: transform hierarchies and attachment points.
- Archetype migration utilities: scripted changes across save versions.
- Save/load snapshot format: bitmask + per-component shallow bags with schema version tagging.

—

That’s the lot, hammered square and true. Keep the masks tight, the views stable, and the clamps firm, and the mine will run like a well-oiled gear.