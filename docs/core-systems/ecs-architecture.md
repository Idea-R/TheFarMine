# ECS Architecture — Foundations of Stone and Steam (Sprint 1)

Owner: @alpha (Core Systems — Ironforge Stonebeard)
Author: Ironforge Stonebeard, Core Systems, The Far Mine

Cross-references:
- src/core/ecs-registry.js
- data/core/component-schemas.json
- docs/combat-systems/combat-design.md
- docs/technology-systems/crafting-design.md
- docs/world-generation/cave-gen-algorithm.md
- data/audio/sound-manifest.json


## 1) Goals, Constraints, Design Pillars

Design pillars (Sprint 1):
- Data-oriented, cache-friendly iteration over stable snapshots.
- Stable masks and query snapshots; no iterator invalidation.
- No GC churn in tight loops; minimal dynamic allocations during view iteration.
- Strict component catalog: 15 components, contiguous bits 0..14.
- Archetype-first entity creation with shallow patching.
- Clamp/validate on every write-path based on authoritative schemas.
- Minimal dynamic allocations during view iteration (reused cursor objects).
- Web/Phaser 3 compatible ESM (import/export modules only).

MVP constraints:
- Single-threaded; 60 FPS target.
- Registry is local to a Phaser.Scene instance (no global singleton).
- id 0 reserved (never allocated).
- 32-bit mask space (bitwise ops in JS number).


## 2) ECS Model Overview

Definitions:
- Entity: Integer id ≥ 1. id 0 is reserved/null.
- Component: Typed, schema-defined bag of fields with defaults and clamping. Stored per component as Map<int,object>.
- System: Pure-ish function that iterates stable views, mutates component bags through the registry API, and emits domain events.
- Event Bridge: Thin bus converting domain events to external hooks (Audio/UI).

Bitmask composition:
- Each component has a fixed bit index (0..14). An entity’s mask is a 32-bit number with these bits set for the components it has.
- Contracts:
  - COMPONENTS: Frozen array of all component names at indices 0..14.
  - COMPONENT_BITS: name → 1 << index.
  - COMPONENT_INDEX: index → name.
- Snapshot query semantics:
  - query(requiredMask, excludeMask=0) returns a new stable array of current entity ids matching (mask & requiredMask) === requiredMask and (mask & excludeMask) === 0 at call time. Mutations after the call do not affect the returned array.
- Exclude mask usage:
  - Use excludeMask to omit entire component categories (e.g., exclude [Projectile] when scanning damageables).
  - Field-level exclusions (e.g., Collider.isTrigger) cannot be masked; filter in the loop.


## 3) Component Catalog (Authoritative Summary)

Authoritative bit indices (data/core/component-schemas.json version=1; bits contiguous 0..14). Detailed min/max/type enforcement is by schema; notable runtime clamps are listed below. Health/Stamina/Poise.value dynamically clamp to [0..max] whenever value/max change.

- 0 Position
  - Purpose: World placement.
  - Fields: x:number, y:number, layer:number (z/plane).
  - Notes: Integers preferred for tile-aligned entities; layer 0 by default.
- 1 Velocity
  - Purpose: Linear motion.
  - Fields: vx:number, vy:number.
  - Notes: Integrated into Position by MovementSystem; zeroed when needed.
- 2 Attributes
  - Purpose: Core stats influencing combat/movement.
  - Fields: attackPower:number, defense:number, moveSpeedPxPerSec?:number.
  - Notes: Consumers must handle absent optional fields via defaults.
- 3 Health
  - Purpose: Life total.
  - Fields: value:number, max:number.
  - Clamps: value ∈ [0..max].
- 4 Stamina
  - Purpose: Action fuel.
  - Fields: value:number, max:number, regenPerSec:number, regenDelayAfterActionMs:number, lastActionAtMs?:number.
  - Clamps: value ∈ [0..max].
- 5 Poise
  - Purpose: Stagger resistance.
  - Fields: value:number, max:number, recoverPerSec:number, breakDurationMs:number, lastHitAtMs?:number.
  - Clamps: value ∈ [0..max].
- 6 Inventory
  - Purpose: Carrying items.
  - Fields: capacity:number, slots:Record<string, { itemId:string, qty:number, meta?:object }>.
  - Notes: Shallow rules only; unknown keys in per-slot meta ignored by registry. Consumers (crafting/loot) validate specifics.
- 7 Renderable
  - Purpose: Visual presence and ordering.
  - Fields: visible:boolean, depth:number, scale:number, tintToken:string.
  - Notes: tintToken is a symbolic string passed to the theme/renderer; validation deferred to UI/theme loader.
- 8 Collider
  - Purpose: AABB collision/hurtbox.
  - Fields: w:number, h:number, offsetX:number, offsetY:number, solid:boolean, isTrigger:boolean, hurtboxPadPx:number.
  - Notes: AABB only; hurtboxPadPx expands victim box for forgiving hits. Collision against tilemap in MovementSystem.
- 9 AI
  - Purpose: Behavior state.
  - Fields: behavior:string, state:string, targetId:number, attackCooldownMs:number, preferOpenLane:boolean.
  - Notes: Behavior/state tokens are strings; concrete meaning per AISystem.
- 10 Player
  - Purpose: Player control marker and input switch.
  - Fields: inputEnabled:boolean.
  - Notes: Presence marks entity as player-controlled.
- 11 Enemy
  - Purpose: Enemy marker and kind.
  - Fields: kind:string.
  - Notes: kind token references enemy catalog in content layer.
- 12 Item
  - Purpose: World item stack.
  - Fields: itemId:string, qty:number, stackable:boolean, onGround:boolean.
  - Notes: onGround true implies pickup via trigger checks in InventorySystem.
- 13 Tile
  - Purpose: World tile metadata when represented as an entity.
  - Fields: tileType:string, hardness:number, breakable:boolean, oreType:string.
  - Notes: tileType allowed set validated by world systems; Collider optional (tilemap usually handles solidity).
- 14 Projectile
  - Purpose: Moving damaging object.
  - Fields: speedPxPerSec:number, ttlMs:number, damage:{ base:number, poiseDamage:number }, ownerId?:number.
  - Notes: damage object shallow-merged only; primitive leaves clamped. Collides via ProjectileSystem and CombatSystem.


## 4) Entity Archetypes (MVP)

Canonical archetypes and defaults (aligned with src/core/ecs-registry.js). Collider canonical body sizes: actors 12×12; projectiles 4×4.

- player
  - Components: Position{x:0,y:0,layer:0}, Velocity{vx:0,vy:0}, Attributes{attackPower:8, defense:0}, Health{value:100, max:100}, Stamina{value:100, max:100, regenPerSec:14, regenDelayAfterActionMs:600}, Poise{value:100, max:100, recoverPerSec:35, breakDurationMs:800}, Renderable{visible:true, depth:0, scale:1, tintToken:""}, Collider{w:12,h:12,offsetX:0,offsetY:0,solid:false,isTrigger:false,hurtboxPadPx:0}, Player{inputEnabled:true}, Inventory{capacity:20, slots:{}}
- enemy
  - Components: Position, Velocity, Attributes, Health, Poise, Renderable, Collider{w:12,h:12,offsetX:0,offsetY:0,solid:false,isTrigger:false,hurtboxPadPx:0}, AI{behavior:"idle", state:"idle", targetId:0, attackCooldownMs:0, preferOpenLane:true}, Enemy{kind:""}
- item
  - Components: Position, Renderable, Collider{w:12,h:12,offsetX:0,offsetY:0,solid:false,isTrigger:true,hurtboxPadPx:0}, Item{itemId:"", qty:1, stackable:true, onGround:true}
- tile
  - Components: Position{layer:0}, Tile{tileType:"rock", hardness:3, breakable:true, oreType:""}
  - Notes: Collider optional; solidity handled primarily by tilemap. When instanced as entities for interaction, rock ⇒ solid true in world/tilemap layer, floor ⇒ solid false; not auto-added by archetype.
- projectile
  - Components: Position, Velocity, Projectile{speedPxPerSec:120, ttlMs:1500, damage:{base:4, poiseDamage:10}}, Collider{w:4,h:4,offsetX:0,offsetY:0,solid:false,isTrigger:true,hurtboxPadPx:0}


## 5) Registry API Contract (src/core/ecs-registry.js)

Exports (ESM):
- COMPONENTS: Frozen array of component names at indices 0..14.
- COMPONENT_BITS: Record<string, number> mapping name → bitmask.
- COMPONENT_INDEX: Record<number, string> mapping bit index → name.
- fromNames(names: string[]): number
  - Returns OR’d mask from component names; throws on unknowns (lists valid keys).
- ENTITY_TYPES: { player, enemy, item, tile, projectile }
  - Canonical archetypes as above; deep-add semantics at creation (adds listed components).
- createRegistry(): Registry
  - Returns a scene-local registry with methods:
    - createEntity(type?: keyof ENTITY_TYPES, opts?: Record<string,object>): number
      - Allocates id ≥ 1; applies archetype (if provided); then shallow-merge per-component patches from opts; clamps/coerces all fields; throws on unknown type; returns id.
    - destroyEntity(id: number): void
      - Removes all components; clears mask; recycles id via LIFO freelist; safe no-op on invalid/free id.
    - addComponent(id: number, name: string, data?: object): void
      - Add or replace named component: start from schema defaults, shallow-merge data, clamp/coerce; unknown keys ignored.
    - getComponent<T=any>(id: number, name: string): T|undefined
      - Returns live mutable bag reference or undefined if absent.
    - hasComponent(id: number, name: string): boolean
    - removeComponent(id: number, name: string): void
      - Safe no-op if component is absent or id invalid.
    - applyPatch(id: number, name: string, patch?: object): void
      - Shallow-merge into existing component or add if missing; clamp/coerce; null/undefined treated as {}; unknown keys ignored.
    - maskOf(id: number): number
      - Returns 32-bit component mask, 0 for free/invalid ids.
    - query(requiredMask: number, excludeMask: number = 0): number[]
      - Returns stable snapshot array of ids satisfying masks at call time.
    - view(includeNames: string[], excludeNames?: string[]): { ids: number[], forEach(fn: (row: { id:number, mask:number, [name:string]:any }) => void): void }
      - Prefetches named bags into a cursor object with shape { id, mask, <compName>:bag }.
      - Iteration uses a single reused cursor object to avoid allocations; do not retain the object reference beyond the callback.
      - ids is the stable snapshot backing the iteration for debugging/secondary passes.
    - size(): number
      - Active entity count.

Clamping/coercion:
- Types: int/number/bool/string/object respected per schema; numbers NaN/±Inf coerced to 0 before clamping.
- Dynamic clamps: Health/Stamina/Poise.value are clamped to [0..max] whenever value/max are written.
- Object shallow-merge only (e.g., Projectile.damage); nested objects are not deep-merged; primitive leaves clamped; extra keys ignored.

Error handling:
- Unknown component/type names throw with a helpful message listing valid keys.
- Null/undefined patches treated as {}.
- Out-of-range fields clamped; type mismatches coerced when safe, else dropped to default.

Performance notes:
- All query() and view() produce stable snapshots to prevent iterator invalidation.
- Tight loops avoid allocations via reused cursor object in view.forEach.
- Registry stores a dense mask array (indexed by id) and per-component Map<int,object> for sparse component storage.


## 6) Systems and Execution Order (Frame Pipeline)

Canonical per-tick order and intent. All systems run on stable snapshots. Event emissions are queued for the same-tick bridges unless otherwise noted.

1) InputSystem
- View: include [Player, Stamina, Poise, Velocity].
- Behavior: Translate input into intents; gate actions on stamina and poise (broken state). Emits: combat.BlockStart/End, combat.DodgeStart/End, mining.Swing (intent).

2) AISystem
- View: include [Enemy, AI, Position, Velocity].
- Behavior: Choose behavior and attacks; respect AI.preferOpenLane and attackCooldownMs; produce intents similar to InputSystem for CombatSystem.

3) CombatSystem
- Stages:
  - Telegraph: schedule and emit combat.TelegraphStart at windup.
  - Activation: transition to AttackActive; produce active windows and shapes.
  - Collision/hit resolution: View include [Collider] and victims having [Health] and/or [Poise]; apply damage per docs/combat-systems/combat-design.md; emit combat.Hit and combat.PoiseBreak after clamping.
- Hooks: Hit-Stop via CombatTimingService (to be implemented) to apply local timescale modulation.

4) MiningSystem
- Inputs: mining.Swing intents from Input/AISystem.
- View: include [Tile, Position]; optionally [Collider] if physical tiles are instanced.
- Behavior: Validate tool.miningPower ≥ Tile.hardness; emit mining.Progress and mining.Break; otherwise mining.Deny. Maintain drill hysteresis consistent with audio feel.

5) CraftingSystem
- View: crafting station entities/queues (MVP may be event-driven without dedicated components).
- Behavior: Manage reservations, start/progress/complete/cancel cycles; move items between Inventory.slots.
- Emits: crafting.Start/Progress/Complete/Canceled.

6) ProjectileSystem
- View: include [Projectile, Position, Velocity, Collider].
- Behavior: Advance position by speed; decrement ttl; test overlaps against enemy/player hurtboxes; emit combat.Hit; mark for Cleanup when ttl ≤ 0 or on impact (as defined by design).

7) Physics/MovementSystem
- View: include [Position, Velocity]; often [Collider] for collision resolution.
- Behavior: Integrate Velocity → Position; resolve collisions with the tilemap; enforce 3‑wide lane navigation rules; update contact flags if needed.

8) StaminaRegenSystem
- View: include [Stamina].
- Behavior: If now - lastActionAtMs ≥ regenDelayAfterActionMs, apply regenPerSec; clamp to max.

9) PoiseRecoverySystem
- View: include [Poise].
- Behavior: If now - lastHitAtMs ≥ 400 ms and not in break window (breakDurationMs), apply recoverPerSec; clamp to max.

10) InventorySystem
- View: include [Inventory] and nearby [Item] with Collider.isTrigger true (filter by field).
- Behavior: Stack merges; auto-pickup checks based on overlap and capacity.

11) AudioEventBridge
- Behavior: Translate domain events (combat, mining, crafting, UI) to sound ids from data/audio/sound-manifest.json; manage drill hysteresis and cadence alignment.

12) RenderSyncSystem
- View: include [Renderable] (and [Health]/[Stamina] for HUD).
- Behavior: Push depth/tint changes; drive health/stamina UI updates; throttle minimap refresh per UI spec.

13) CleanupSystem
- View: include [Health] and/or [Projectile].
- Behavior: Destroy entities with Health.value ≤ 0; free expired projectiles; clear ephemeral telegraph/FX entities.


## 7) Events & Ordering Guarantees

Domain events (payload sketches; consumers own full typing):
- Mining
  - mining.Swing { entityId, tool:{ miningPower:number } }
  - mining.Progress { tileId, progress01:number }
  - mining.Break { tileId }
  - mining.Deny { tileId, reason:string }
  - Ordering: Swing → (Progress? → Break?) else Deny.
- Combat
  - combat.TelegraphStart { attackerId, attackId, windupMs }
  - combat.AttackActive { attackerId, attackId, window:{ startMs, endMs } }
  - combat.Hit { attackerId, victimId, damage:{ base, poiseDamage }, crit?:boolean }
  - combat.PoiseBreak { victimId, breakDurationMs }
  - Ordering: TelegraphStart at windup begin; AttackActive at active open; one Hit per victim per active window; PoiseBreak after clamp writes.
- Crafting
  - crafting.Start { stationId, recipeId }
  - crafting.Progress { stationId, t01:number }
  - crafting.Complete { stationId, outputs:{...} }
  - crafting.Canceled { stationId, reason:string }

Bridging guarantees:
- Events emitted during a tick are delivered to bridges in the same tick (AudioEventBridge, UI bridge) after all state mutations of producer systems complete.
- Late subscribers (registered after emission) observe events starting next tick.


## 8) Queries, Masks, and Typical Views

fromNames usage examples:
- Actors: fromNames(["Position","Collider"])
- Damageables: fromNames(["Health","Collider"])
- Player control: fromNames(["Player","Stamina"])
- Tiles: fromNames(["Tile","Position"])

Exclude masks:
- Exclude projectiles when scanning actors: query(fromNames(["Position","Collider"]), fromNames(["Projectile"]))
- Exclude items when scanning dynamic actors: query(fromNames(["Velocity"]), fromNames(["Item"]))
- Note: You cannot exclude Collider.isTrigger via masks (field-level). Filter row.Collider.isTrigger in the loop.


## 9) Validation & Schema Discipline

Initialization checks (performed by ecs-registry.js on import):
- data/core/component-schemas.json has version === 1.
- Exactly 15 component schemas present.
- Bit indices contiguous 0..14 and match COMPONENTS order.
- Throws if any check fails to keep the forge true and square.

Write-path discipline:
- All add/patch operations clamp/coerce to schema types/ranges.
- Dynamic clamp value ≤ max for Health/Stamina/Poise.
- Unknown keys ignored; strings are accepted as tokens; domain-specific token validation deferred to consumers (UI/theme-loader, content catalogs).


## 10) Performance, Memory, and Debugging

Structures:
- Dense mask array: masks[id] → 32-bit mask; 0 for free.
- Per-component stores: Map<int,object> for sparse storage; keys are entity ids.
- Id freelist: LIFO for locality and cache warmth on reuse.

Iteration:
- query() builds a fresh array of ids once per call; content is immutable for the caller’s scope.
- view().forEach uses a single cursor object reused per row to avoid allocations; consumers must not retain references to the row object. If retention is needed, copy fields.
- Typical MVP counts (≤1k entities): queries + iteration under 0.5 ms on mid-tier hardware; worldgen runs outside frame loop.

Debugging and profiling:
- Optional microprofiler hooks (registry._debug):
  - Counters: clampsApplied, viewsBuilt, queriesRun.
  - Console toggles to trace allocations and hot views.
- Mask inspection utilities and fromNames() for readability in logs.

ESM/Web:
- Pure ESM module; no Node-only APIs.
- Phaser 3 compatible; registry lives inside a Scene and tears down cleanly on scene stop.


## 11) Integration Touchpoints

World generation:
- Tile entities (when used) mirror docs/world-generation/cave-gen-algorithm.md outputs; Tile.hardness and oreType drive MiningSystem eligibility and drops.

Combat:
- Actor Collider size 12×12; projectile 4×4, consistent with lane rules in combat-design.md.
- Hit-stop and telegraphs coordinate through the future CombatTimingService; systems emit timing events accordingly.

Crafting:
- Inventory.slots are the conduit for station consumption/production; events reflect reservation/return flows; shallow validation at registry, deep validation in crafting system.

UI:
- Renderable.tintToken and depth consumed by renderer/theme; health/stamina bars updated via RenderSyncSystem based on component values and events.

Audio:
- AudioEventBridge maps domain events to data/audio/sound-manifest.json ids; mining drill hysteresis maintained to avoid chatter; tempo/bar alignment for rhythmic cues handled in the bridge.


## 12) Testing Plan (MVP)

Unit tests (outline):
- Registry basics:
  - create/destroy/add/remove/has/get correctness; maskOf accuracy.
  - Id reuse via LIFO freelist; destroying a free id is a no-op.
- Clamps:
  - Health/Stamina/Poise dynamic value ≤ max on add/patch (including lowering max below value).
  - Number/string/bool coercions per schema ranges.
- Query/view stability:
  - query() snapshot remains stable while adding/removing entities during iteration of the result.
  - view().forEach iterates a stable id list; adding/removing components during iteration doesn’t affect current pass.
  - Cursor reuse: ensure object identity of row is reused between iterations (no per-row allocations).
- Archetypes:
  - createEntity("player", { Health:{ max:50 } }) sets Health{ max:50, value:50 }.
  - Shallow patches only (Projectile.damage shallow-merged).
- Errors:
  - fromNames() throws on unknown component with valid keys listed.
  - addComponent/applyPatch ignore unknown fields; null/undefined treated as {}.


## 13) Acceptance Checklist

- All MVP entity types (player, enemy, item, tile, projectile) defined with canonical components.
- Component catalog fixed at 15 entries (bits 0..14 contiguous) with authoritative summaries and clamps.
- System order defined with views and event emissions; Audio/UI bridges placed after producers.
- Collider/body sizes specified (actors 12×12, projectiles 4×4).
- Registry API precisely documented and aligned with src/core/ecs-registry.js.
- Schema validation, clamping, and token handling documented and aligned with data/core/component-schemas.json (version=1).
- Queries/masks examples included; exclude-mask behavior clarified.
- ESM/Phaser 3 compatibility and scene-local registry usage documented.


## 14) Open Questions (for Sprint 2 planning)

- Validation strictness vs. speed for object fields:
  - Are shallow rules for Inventory.slots sufficient for MVP, or do we need a stricter slot schema (e.g., whitelist keys, qty bounds per item)?
- CombatTimingService:
  - Concrete API for scheduling hit-stop and per-entity timescale; hook sites across CombatSystem and RenderSyncSystem to avoid visual/audio desync.
- Physics scope:
  - Do we add a minimal continuous collision step (swept AABB) in MVP, or keep tilemap-only discrete resolution and defer swept handling to Sprint 2?
- Projectile ownership:
  - Should Projectile.ownerId be mandatory to prevent friendly fire and for score attribution?
- AI target selection:
  - Formalize target acquisition events and lifetime to avoid stale targetId references after CleanupSystem runs.

By my beard and the steady beat of the piston, this foundation is square and true. Align your code to it, and it will bear the weight of deeper mines to come.