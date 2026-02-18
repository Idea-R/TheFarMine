# ECS Architecture — Bedrock and Brass (Sprint 1)

Owner: @alpha (Core Systems — Ironforge Stonebeard)

Cross-references:
- src/core/ecs-registry.js
- data/core/component-schemas.json (v1)
- docs/combat-systems/combat-design.md (§Events & Timing)
- docs/world-generation/cave-gen-algorithm.md (§Tiles/Flags)
- data/visual/color-palette.json (tint tokens)
- data/combat/enemy-goblin-grunt.json


## 1) Scope & Acceptance

Scope (Sprint 1):
- ECS runtime and registry (MVP).
- Entity archetypes: Player, Enemy, Item, Tile, Projectile.
- Component catalog: 15 components.
- System execution order for a 60 Hz main loop.
- Contracts for clamps and validation.
- Iteration and query patterns.
- Dev hooks for profiling and validation.

Acceptance:
- Component order/bits [0..14] exactly mirror data/core/component-schemas.json (v1). Field defaults come from that schema and are applied as-is.
- Public API precisely matches src/core/ecs-registry.js (see §7).
- System order is spelled out and justified (see §9), aligning with combat/worldgen specifications.
- Examples conceptually compile against the registry and do not contradict the combat/worldgen docs.
- No drift on event contracts; exact payloads live in combat-design.md, referenced herein (see §10).


## 2) Design Principles

- Simplicity first
  - Dense per-component stores.
  - 1-based entity IDs; 0 is reserved/sentinel.
  - uint16 signatures; fixed component ordering.
- Stability
  - Schema-driven clamps; numeric fields clamped to schema bounds.
  - Dynamic clamps for Health, Stamina, Poise: value ∈ [0..max] at all times after any write.
- Performance
  - Hot-loop iteration over signatures with bit masks; zero object churn in inner loops.
  - Precomputed masks; forEach(requiredMask, fn) for critical paths.
  - Microprofiler hooks are present but no-ops by default.
- Determinism
  - Component order fixed by schema (see §4) and validated at registry import time.
  - No reliance on JS prototype magic; plain records, typed arrays, explicit control flow.


## 3) Component Catalog (Authoritative Summary)

Canonical definitions (fields, defaults, clamps) live in data/core/component-schemas.json version 1. This section is a purpose/index summary. Do not treat this as a field default source.

Exact order and bit indices:
1. Bit 0 — Position: x, y, dirX, dirY (unit/near-unit facing)
2. Bit 1 — Velocity: vx, vy, maxSpeed (px/s clamp)
3. Bit 2 — Attributes: attackPower, defense
4. Bit 3 — Health: value, max (dynamic clamp)
5. Bit 4 — Stamina: value, max, regenPerSec, regenDelayAfterActionMs
6. Bit 5 — Poise: value, max, recoverPerSec, breakDurationMs
7. Bit 6 — Inventory: slots, selectedIndex (contents out-of-scope here)
8. Bit 7 — Renderable: spriteId, depth, visible, tintToken
9. Bit 8 — Collider: w, h, offsetX, offsetY, solid, isTrigger, hurtboxPadPx
10. Bit 9 — AI: state, targetId, aggroRangePx, leashRangePx, thinkCooldownMs
11. Bit 10 — Player: idTag
12. Bit 11 — Enemy: kindId
13. Bit 12 — Item: itemId, qty, onGround
14. Bit 13 — Tile: tileType, hardness, oreType, flags(uint32)
15. Bit 14 — Projectile: speedPxPerSec, lifeMs, dirX, dirY, ownerId, damage, poiseDamage

Dynamic clamp rule (authoritative):
- After any write/patch to Health, Stamina, or Poise, clamp value into [0..max].
- If max changes, immediately re-clamp value into [0..max].


## 4) Masks, Signatures, and Querying

- Each entity has a uint16 signature; bit i indicates presence of component i (see §3).
- Utility: maskOf(componentNameArray) → uint16; e.g., maskOf(['Position', 'Velocity']).
- Helper: namesOfMask(mask) → string[]; stable name order per schema.
- Convenience masks (single-bit), exported by the registry as MASKS:
  - MASKS.Position = 1 << 0
  - MASKS.Velocity = 1 << 1
  - MASKS.Attributes = 1 << 2
  - MASKS.Health = 1 << 3
  - MASKS.Stamina = 1 << 4
  - MASKS.Poise = 1 << 5
  - MASKS.Inventory = 1 << 6
  - MASKS.Renderable = 1 << 7
  - MASKS.Collider = 1 << 8
  - MASKS.AI = 1 << 9
  - MASKS.Player = 1 << 10
  - MASKS.Enemy = 1 << 11
  - MASKS.Item = 1 << 12
  - MASKS.Tile = 1 << 13
  - MASKS.Projectile = 1 << 14

Query semantics:
- Match rule: (entitySignature & requiredMask) === requiredMask AND (entitySignature & excludedMask) === 0 (if excludedMask provided).
- Performance guidance:
  - Use forEach(requiredMask, fn) in tight loops; it prefilters and avoids allocations.
  - Use queryByNames([...]) for ergonomics in setup/non-hot paths.
  - Prefer precomputed masks over maskOf calls in hot sections.


## 5) Storage Model

- Entities:
  - IDs are 1-based. ID 0 is reserved and unused.
  - Free-list for recycling IDs on destroy.
- Capacity and growth:
  - Initial capacity is power-of-two; default 4096 unless overridden.
  - Capacities grow by doubling when needed.
- Signatures:
  - Uint16Array of length capacity + 1 (index by entityId).
- Per-component store (SoA-Dense hybrid):
  - denseIds: typed array (Uint32Array) of entity IDs in dense order.
  - data: JS array of component records (live refs), same length as denseIds.
  - sparseIndex: Map or Uint32Array mapping entityId → denseIndex (or -1/undefined if absent).
  - Removal via dense-swap: last dense element swapped into the removed slot; sparseIndex updated in O(1).
- Component data lifecycle:
  - On first add: registry deep-clones the component’s schema defaults, then applies any provided patch, performing field coercion and clamps. Dynamic clamp rule applies for Health/Stamina/Poise.
  - On remove: dense-swap in component store and fix sparseIndex; clear the entity’s bit in signature.
  - On entity destroy: remove all present components (dense-swap for each), zero the signature, return ID to free-list.


## 6) Public API (Registry) — Exact Surface

Factory:
- createRegistry({ dev?, initialCapacity? }) → Registry

Registry methods:
- Registry.createEntity(initialMask?, initialOverrides?) → id
  - Allocates an entity ID, optionally applies a mask of components and merges overrides per-component (clamped).
- Registry.destroyEntity(id)
  - Removes all components, zeroes signature, recycles ID.
- Registry.addComponent(id, compName, values?)
  - Adds component if absent; deep-clones schema defaults, applies values with clamps; sets signature bit.
- Registry.removeComponent(id, compName)
  - Removes component if present; clears signature bit.
- Registry.hasComponent(id, compName) → boolean
- Registry.getComponent(id, compName) → liveRef | null
  - Returns a live reference; mutating directly bypasses clamps — prefer patchComponent.
- Registry.patchComponent(id, compName, patch)
  - Applies a partial update with field coercion and clamps; unknown keys ignored.
- Registry.getSignature(id) → uint16
- Registry.query(requiredMask, excludedMask?) → Iterable<id>
  - Returns an iterable (generator) of matching IDs.
- Registry.queryByNames(required[], excluded[]?) → Iterable<id>
- Registry.forEach(requiredMask, fn(id))
  - Iterates matching IDs; fn receives id.
- Registry.stats() → { capacity, alive, free, perComponent: { [name]: count } }
- Registry.setProfilerHooks(hooks)
  - Hooks: onCreate(id), onDestroy(id), onAdd(id, compName), onRemove(id, compName), onPatch(id, compName, patch).

Examples:

Creating a Player
```js
import { createRegistry, MASKS, maskOf } from '../src/core/ecs-registry.js';

const ecs = createRegistry({ dev: true });

// Option A: Archetype factory (see §8)
import { createEntityOf } from '../src/core/ecs-registry.js';
const playerId = createEntityOf('Player', {
  Position: { x: 16, y: 16 },
  Renderable: { spriteId: 'player.base' }
}, ecs);

// Option B: Direct create with mask + overrides
const baseMask = maskOf(['Position','Velocity','Attributes','Health','Stamina','Poise','Inventory','Renderable','Collider','AI','Player']);
const p2 = ecs.createEntity(baseMask, {
  Renderable: { depth: 300, visible: true },
  Collider: { w: 12, h: 12, solid: true }
});
```

Iterating movers (hot loop)
```js
const MOVERS = MASKS.Position | MASKS.Velocity;
ecs.forEach(MOVERS, (id) => {
  const pos = ecs.getComponent(id, 'Position');   // live ref
  const vel = ecs.getComponent(id, 'Velocity');   // live ref
  // read-only fast path; writes should respect clamps (see PhysicsIntegrationSystem)
  pos.x += vel.vx * dt;
  pos.y += vel.vy * dt;
});
```

Patching Health safely
```js
function damageEntity(ecs, id, amount) {
  ecs.patchComponent(id, 'Health', { value: ecs.getComponent(id, 'Health').value - amount });
  // value is auto-clamped into [0..max]; if the entity lacked Health, dev mode logs a validation warning once.
}
```


## 7) Archetypes (ENTITY_TYPES) and Factory

Archetypes are authoritative for Sprint 1. Each archetype specifies the included components (mask) and optional overlay defaults that override schema defaults. Unspecified fields retain schema defaults. All writes are clamped.

- Player
  - Components: Position, Velocity, Attributes{attackPower:8, defense:0}, Health, Stamina, Poise, Inventory, Renderable{depth:300, visible:true}, Collider{w:12, h:12, solid:true}, AI, Player
  - Notes: Renderable.spriteId is caller-provided or schema default. Collider offset defaults apply unless overridden.

- Enemy
  - Components: Position, Velocity, Attributes, Health, Stamina, Poise, Renderable{depth:300}, Collider{w:12, h:12, solid:true}, AI, Enemy
  - Notes: Enemy.kindId must match data/combat/enemy-*.json. Depth aligns with player layer for overlap sorting.

- Item
  - Components: Position, Renderable, Collider{w:12, h:12, solid:false, isTrigger:true}, Item{onGround:true}
  - Notes: Intended for pickups; trigger-only collisions.

- Tile
  - Components: Position, Tile, Collider{w:16, h:16, solid:true}
  - Notes: Tile.flags consume worldgen flags (see cave-gen-algorithm.md). Colliders are static solids.

- Projectile
  - Components: Position, Velocity, Projectile, Renderable{depth:500}, Collider{w:4, h:4, isTrigger:true}
  - Notes: Projectiles are trigger-only; depth 500 renders above actors.

Factory helper:
- createEntityOf(typeId, overrides?, registry?)
  - Applies the archetype’s mask, merges provided overrides atop schema defaults, and clamps fields. If registry omitted, uses a shared default registry export (if provided by build). Returns entity ID.

Data linkages:
- Enemy.kindId references data/combat/enemy-*.json, including enemy-goblin-grunt.json.
- Tile.flags reflect worldgen outputs such as ORE_PREF, DOOR_BAND, APPROACH3W, LAMP_ANCHOR, etc. See docs/world-generation/cave-gen-algorithm.md.


## 8) System List & Execution Order (Frame Tick 60 Hz)

Authoritative order for the Mine scene in Sprint 1:

1) InputSystem
- Collect input and build Intents (not persisted as ECS components in Sprint 1). Intents feed MovementIntentSystem and CombatTimingService.

2) StaminaGateSystem
- Deny costly actions when Stamina.value < cost; start/refresh Stamina.regenDelayAfterActionMs timers.

3) CombatTimingService
- Advance per-attack state machines (windup → active → recovery).
- Emit events per combat-design.md: combat.TelegraphStart, combat.AttackActivate.

4) AISystem (lightweight)
- Update AI.state/targetId; enforce AI.thinkCooldownMs; enqueue intents (chase, leash, attack).

5) MovementIntentSystem
- Translate intents into desired velocities; update Position.dirX/dirY to face movement or aim.

6) PhysicsIntegrationSystem
- Integrate Position by Velocity, respecting Velocity.maxSpeed.
- Suspend displacement during hit-stop for affected entities only.

7) CollisionSystem
- Resolve solid vs. solid collisions (AABB).
- Process trigger overlaps (pickups, melee hitboxes modeled as triggers in MVP).

8) CombatResolveSystem
- Sample melee hitboxes in Active phase.
- Compute block/health/poise outcomes per combat-design.md.
- Apply hit-stop, knockback, and emit combat.Hit (and combat.PoiseBreak when applicable).

9) RecoveryAndCooldownSystem
- Transition attacks to end state; emit combat.AttackEnd.
- Enforce per-attack cooldowns.

10) RegenerationSystem
- Apply Stamina/Poise regen if delays allow.
- Suppress during hit-stop/stun per spec.

11) RenderSyncSystem
- Update sprite frame/flip, depth ordering, and tintToken application.

12) AudioEventBridge
- Consume domain events (mining/combat/UI) and fire audio per audio-design.md.

13) CleanupSystem
- Destroy dead entities; recycle IDs; clear transient flags.

Tie-breakers:
- Dodge i-frames supersede block if overlapping.
- Block takes precedence over normal hits when both are possible.
- Exact precedence is per docs/combat-systems/combat-design.md and must not drift.


## 9) Event Contracts (Authoritative Pointers)

Events and payloads are defined in docs/combat-systems/combat-design.md §10. This ECS document does not redefine payloads.

- combat.TelegraphStart
- combat.AttackActivate
- combat.Hit
- combat.PoiseBreak
- combat.AttackEnd

Emission order guarantee during an attack sequence:
- TelegraphStart → AttackActivate → Hit(s) → AttackEnd
- PoiseBreak may co-emit with Hit or trail per combat spec timing rules.


## 10) Validation & Clamps

Boot-time assertions:
- On registry initialization, validate:
  - Schema version is 1.
  - Components length is exactly 15.
  - Component names and order match §3.
  - Bit assignments [0..14] are consistent and monotonic.
- On first mismatch, throw a descriptive Error with actionable detail.

Runtime dev guards (when dev:true):
- Unknown component names in API calls cause a single-once warning under category ecs.registry.validation.
- Invalid or dead entity IDs warn once per offending callsite/name.
- get/patch on absent components warn once per component name; patch calls are no-ops in that case.

Field coercion rules:
- Integers: truncate toward zero after numeric conversion, then clamp to bounds.
- Numbers: clamp to schema [min..max] if provided; NaN ignored (field unchanged).
- Strings/bools: conservative coercion only if obvious (e.g., '' not coerced; true/false preserved).
- Unknown patch keys: ignored.
- Dynamic clamp rule: Health/Stamina/Poise.value always clamped into [0..max]; if max changes, re-clamp value immediately.


## 11) Performance Notes & Benchmarks

Target MVP scale:
- A few hundred active entities in the Mine scene. Dense stores suffice.

Hot loops:
- Use Registry.forEach(requiredMask, fn) and precompute requiredMask.
- Avoid dynamic allocations in inner loops; keep locals scoped to loop.
- Mask checks are branch-predictable; keep condition order consistent.

Expected micro-budgets per frame (mid-tier laptop, MVP build):
- PhysicsIntegrationSystem: 0.2–0.6 ms
- CollisionSystem: 0.4–1.0 ms (AABB grid broad-phase TBD)
- CombatResolveSystem: 0.2–0.5 ms
- Regeneration/AISystem: negligible

Profiling hooks:
- setProfilerHooks({ onCreate, onDestroy, onAdd, onRemove, onPatch }) registers optional callbacks.
- Defaults are no-ops. Intended for a dev overlay and frame markers; do not allocate in hooks.


## 12) Entity Lifecycles & Examples

Player spawn
```js
const playerId = createEntityOf('Player', {
  Position: { x: 16, y: 16 },
  Renderable: { spriteId: 'player.base' }
}, ecs);
```

Enemy spawn (Goblin)
```js
const gobId = createEntityOf('Enemy', {
  Enemy: { kindId: 'enemy.goblin.grunt' },
  Attributes: { attackPower: 6 },
  Health: { value: 64, max: 64 }
}, ecs);

// Then register attacks and timings via CombatTimingService using data/combat/enemy-goblin-grunt.json.
```

Tile grid stamp
```js
const tileId = createEntityOf('Tile', {
  Position: { x: tx * 16, y: ty * 16 },
  Tile: { tileType: 'rock', hardness: 3, flags: worldFlags }
}, ecs);
```

Projectile
```js
const projId = createEntityOf('Projectile', {
  Position: { x, y, dirX, dirY },
  Velocity: {}, // schema defaults for vx/vy; direction may be used by Projectile component to set velocity in a system
  Projectile: { damage: 4, poiseDamage: 8 }
}, ecs);
```


## 13) Integration Notes (Phaser & Data)

- ESM import with JSON assertion:
  - Import data/core/component-schemas.json using import assertions where supported:
    import schemas from '../../data/core/component-schemas.json' assert { type: 'json' };
  - For bundlers/environments lacking assertions, provide a build-time loader or adapter that yields the same structured object.

- Renderable.tintToken:
  - Resolved via data/visual/color-palette.json. Example: mapping.telegraph.arc.amber for telegraph arcs.

- Enemy data:
  - enemy-goblin-grunt.json is consumed by an EnemyFactory layer that maps into ECS components and registers attack timelines via CombatTimingService.

- Worldgen outputs:
  - Tile.flags carry enumerated flags from docs/world-generation/cave-gen-algorithm.md. ECS treats flags as a uint32 bitfield; semantics live in worldgen and scene logic.


## 14) Testing Plan (MVP)

Unit tests (Node):
- Registry core:
  - Create/destroy entity; ID reuse; signature correctness.
  - add/remove component; dense-swap integrity; sparseIndex consistency.
  - query/queryByNames/forEach correctness; excludedMask behavior.
  - maskOf/namesOfMask round-trip and stability vs. schema order.
- Clamps:
  - Health/Stamina/Poise dynamic clamp on value updates and on max changes.
  - Numeric min/max clamps from schema; int truncation behavior.
- Dev guards:
  - Unknown components, invalid IDs, absent components (get/patch) emit once-only warnings when dev:true.

Sandbox Encounter Scene:
- Spawn Player vs. Goblin (enemy-goblin-grunt.json).
- Exercise CombatTimingService: verify TelegraphStart → AttackActivate → Hit(s) → AttackEnd ordering.
- Hit-stop observable only on impacted entities.
- Quick counters for TTK bands: ensure target window 28–32 s under baseline parameters (document deviations).


## 15) Risks & Future Dials

- JSON import assertions vary across bundlers:
  - Verify in dev and production builds; supply a fallback adapter if assertions are unavailable.
- Dense-store scaling:
  - Acceptable for MVP target bands. If entities exceed plan, revisit SoA layout per archetype and introduce archetype iteration lists.
- Inventory:
  - Shape is intentionally minimal to avoid premature coupling with UI/economy; expect iterative refinement.
- Collision broad-phase:
  - Current plan TBD; refine grid/spatial hash if CollisionSystem exceeds budget.


## 16) Acceptance Checklist

- Component order/bits and defaults mirror data/core/component-schemas.json (v1) exactly; this doc’s order matches [0..14].
- Registry API surface documented and matches src/core/ecs-registry.js.
- System execution order explicit and aligned with combat/worldgen docs.
- Examples conceptually compile; event contracts link out, not redefined.
- Performance notes, clamps, and validation behaviors are present and actionable.


## Appendix A — Query Patterns and Masks (Quick Reference)

- Required-only match:
  - (sig & required) === required
- Required + excluded:
  - (sig & required) === required && (sig & excluded) === 0
- Common masks (build-time constants recommended):
  - MOVERS = MASKS.Position | MASKS.Velocity
  - ACTORS = MASKS.Position | MASKS.Renderable | (MASKS.Player | MASKS.Enemy)
  - SOLIDS = MASKS.Collider
- namesOfMask(mask) returns canonical component names for debugging/telemetry.

## Appendix B — Physics Integration Clamp Notes

- Velocity.maxSpeed is authoritative; if magnitude of (vx, vy) exceeds maxSpeed, scale down to maxSpeed before integration.
- Position.dirX/dirY should be updated to reflect intent-facing in MovementIntentSystem; Projectiles may override with Projectile.dirX/dirY where applicable.

## Appendix C — Dev Hooks Categories

- ecs.registry.lifecycle: create/destroy entity
- ecs.registry.components: add/remove component
- ecs.registry.patch: patch operations
- ecs.registry.validation: once-only warnings for invalid usage

By my beard and the bedrock beneath us, these contracts are stable for Sprint 1. Keep your tools sharp and your loops hot, and this ECS will carry the mine.