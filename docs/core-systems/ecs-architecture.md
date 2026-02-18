# ECS Architecture — Bedrock and Bevel (Sprint 1)

Provenance
- Owner: @alpha (Core Systems — Ironforge Stonebeard)
- Runtime alignment: Phaser 3 (Scene.update clock; WebGL sprites; single-threaded JS)
- Cross-references:
  - docs/combat-systems/combat-design.md (§system events and AttackDef)
  - docs/technology-systems/crafting-design.md (§Inventory, Tile.hardness)
  - docs/visual-systems/style-guide.md (§Renderable.tintToken)
  - data/visual/color-palette.json
  - docs/audio-systems/audio-design.md (§Event bridge)
  - data/items/tools.json
  - data/world/room-templates.json
  - src/systems/combat-timing-service.js

Scope
- Sprint 1 authoritative spec. Implementation-ready for src/core/ecs-registry.js, system scaffolds, and component schemas.
- This document is binding for code and data contracts referenced herein.

---

## 1) Goals & Non-goals (MVP)

Goals
- Simple, cache-friendly ECS with dense component stores (SoA).
- Deterministic system ordering per tick; fixed-step simulation surface.
- Stable entity IDs with generation counters to avoid stale references.
- Strict component clamps and dev-time validation.
- Snapshot-friendly for player-centric autosaves.
- No GC churn during play (typed arrays, pooled objects, ring buffers).
- Fast iteration paths for common archetypes: Player, Enemy, Tile.

Non-goals
- Netcode replication and rollback are deferred.
- Hot-swappable reflection editor is deferred.
- Multithreaded workers (deferred). All systems run on main thread (Phaser 3 Scene.update).

---

## 2) Entities & IDs

EntityId
- 32-bit signed integer (int32).
- Structure: index (low 20 bits), generation counter (high 12 bits) OR an equivalent two-array scheme. Implementation detail: use arrays:
  - generations[index] = uint16 increments on free.
  - ids are composed as (generation << 20) | index.
- Null/invalid: -1.

Lifecycle
- createEntity():
  - Reuse from free-list if available; else expand pool by chunk (e.g., +256).
  - Assign zeroed component mask(s), default tag = 0.
  - Return stable EntityId (index + current generation).
- addComponent(id, type, data?):
  - Validate entity alive and not queued for destroy.
  - Set bit in mask; copy defaults; apply clamps after merging provided data.
- removeComponent(id, type):
  - Clear bit; zero its slot; release any associated pooled sub-objects (e.g., ItemStack array) to pools.
- destroyEntity(id):
  - Mark for destruction; actual removal deferred until end-of-tick (Lifetime/DespawnSystem).
  - During the tick, entity remains readable; systems must check a destroy flag before writing non-idempotent state.
- Double destroy is safe (idempotent).
- Stale references:
  - Any API using an EntityId validates generation; mismatch throws in dev, no-op in release.

Stable runtime archetypes (MVP)
- Player (singleton)
- Enemy (many)
- Item (ground drop)
- Tile (grid-aligned)
- Projectile (few)

---

## 3) Component Model & Storage

Storage
- Dense component stores per component type (Structure of Arrays).
  - One TypedArray per numeric field (Int32Array, Float32Array, Uint32Array).
  - For string/nullable/object fields, parallel JS arrays with pooled strings/objects where possible (e.g., spriteId, itemId).
- Per-entity component mask
  - Two 32-bit bitfields: maskLo (components 0–31), maskHi (components 32–63).
  - Supports up to 64 component types in MVP. Extendable to more by adding additional words.
- Optional archetypeTag (uint16) per entity for query fast-path hints. MVP: 0=none; reserved ranges for Player=1, Enemy=2, Tile=3, Item=4, Projectile=5.

Validation & clamps
- On write: every component write goes through clamp() to enforce ranges, types, and invariants.
- Defaults: every component has authoritatively defined defaults; addComponent merges user data over defaults, then clamps.
- Debug invariants toggle: DEV_GUARDS=true enables:
  - Schema conformance checks.
  - Unknown component/type throws.
  - Missing palette tintToken throws.
  - AttackDef consistency warnings (see Error Handling).

Component registry metadata
- For each component type:
  - key: string (e.g., "Position")
  - version: semver-like string (e.g., "1.0.0-mvp1")
  - defaults: immutable object
  - clamp rules: code reference + doc summary
  - schemaHash: uint32 (FNV-1a of JSON schema-ish description)
- Registry provides stable component indices for bit masks.

Serialization
- Per-component serialization notes included below. Snapshot (MVP) saves only a subset (see section 12).

---

## 4) Component Schemas (Authoritative)

Conventions
- Times are in epoch milliseconds (ms) relative to a shared clock (Phaser’s time.now).
- All integer fields are clamped to int32 range as last resort; domain clamps precede.
- Writers lists are authoritative system write-ownership; Reads are non-exhaustive.

1) Position
- Schema: { x:int, y:int, dirDeg:int }
- Defaults
  - x=0, y=0, dirDeg=0
- Clamp rules
  - x, y: integers (Math.round on write). World bounds clamp by MovementSystem as needed.
  - dirDeg: wrap into [0..359] via ((n % 360) + 360) % 360.
- Writers
  - MovementSystem (primary)
  - RenderSyncSystem may read dirDeg for sprite flip; never writes.
- Readers
  - InputSystem (aiming), AISystem, CollisionSystem, CombatResolveSystem, RenderSyncSystem, AudioEventBridge.
- Serialization (MVP)
  - Included in snapshot.

2) Velocity
- Schema: { vx:number, vy:number, maxSpeed:number }
- Defaults
  - vx=0, vy=0, maxSpeed=180 (px/s; tune per feel)
- Clamp rules
  - vx, vy: finite numbers, NaN -> 0.
  - maxSpeed: >= 0.
  - On write: if hypot(vx,vy) > maxSpeed and maxSpeed>0, scale down to maxSpeed.
- Writers
  - InputSystem (player steer, zero when no input)
  - AISystem (steer for enemies)
  - MovementSystem may damp to zero post-collision.
- Readers
  - MovementSystem, CollisionSystem, Debug/ProfilerHooks.
- Serialization
  - Not included in snapshot (transient).

3) Health
- Schema: { max:int, value:int }
- Defaults
  - max=100, value=100
- Clamp rules
  - max: >= 1
  - value: clamp into [0..max]
- Writers
  - CombatResolveSystem (damage/heal)
  - Lifetime/DespawnSystem may read to mark destroy on <=0 alongside other flags.
- Readers
  - AISystem (behavior), RenderSyncSystem (tints/overlays), AudioEventBridge, Debug.
- Serialization
  - Included in snapshot.

4) Stamina
- Schema: { max:int, value:int, regenPerSec:number, regenDelayAfterActionMs:int, regenCooldownUntilMs:int }
- Defaults
  - max=100, value=100, regenPerSec=30, regenDelayAfterActionMs=500, regenCooldownUntilMs=0
- Clamp rules
  - max: >= 0
  - value: clamp into [0..max]
  - regenPerSec: >= 0, finite
  - regenDelayAfterActionMs: >= 0
  - regenCooldownUntilMs: >= 0; on spend, set to now + regenDelayAfterActionMs
- Writers
  - InputSystem (spends when gating actions)
  - AISystem (spends for AI actions)
  - StaminaPoiseRegenSystem (regenerates after cooldown)
- Readers
  - CombatTimingService (availability), UI
- Serialization
  - Included in snapshot (regenCooldownUntilMs included to keep deterministic behavior on load).

5) Poise
- Schema: { max:int, value:int, recoverPerSec:number, breakDurationMs:int, brokenUntilMs:int }
- Defaults
  - max=100, value=100, recoverPerSec=40, breakDurationMs=700, brokenUntilMs=0
- Clamp rules
  - max: >= 0
  - value: clamp into [0..max]
  - recoverPerSec: >= 0, finite
  - breakDurationMs: >= 0
  - brokenUntilMs: >= 0; set to now + breakDurationMs on break.
- Writers
  - CombatResolveSystem (reduces, triggers break)
  - StaminaPoiseRegenSystem (recovers, clears break when time passes)
- Readers
  - AISystem (behavior), InputSystem (gating), RenderSyncSystem (FX), AudioEventBridge
- Serialization
  - Included in snapshot (brokenUntilMs to preserve states on load).

6) Attributes
- Schema: { attackPower:int, defense:int }
- Defaults
  - attackPower=10, defense=0
- Clamp rules
  - attackPower >= 0, defense >= 0
- Writers
  - Equipment/Status systems (future). MVP: static except data scripts at spawn.
- Readers
  - CombatResolveSystem (damage formula), AISystem
- Serialization
  - Included in snapshot.

7) Inventory
- Schema: { slots:[ItemStack], selectedIndex:int }
  - ItemStack: { itemId:string, qty:int, durability:int? }
- Defaults
  - slots=[], selectedIndex=-1
- Clamp rules
  - slots: array length <= MAX_SLOTS (MVP: 16)
  - Each stack:
    - itemId: non-empty string.
    - qty: >= 0. If qty==0, stack may be elided by Inventory maintenance.
    - durability: optional int >= 0 when present.
  - selectedIndex: -1 or [0..slots.length-1]; if out of range, set -1.
- Writers
  - InputSystem (use current tool/consume), Crafting/Mining systems (future), Loot pickup logic.
- Readers
  - Crafting/Mining checks, UI, AudioEventBridge
- Serialization
  - Included in snapshot (full array). Strings must be stable item IDs mapped by data/items/tools.json etc.

8) Renderable
- Schema: { spriteId:string, tintToken:string, depth:int }
- Defaults
  - spriteId="", tintToken="none", depth=0
- Clamp rules
  - spriteId: string (non-empty for visible actors)
  - tintToken: must exist in data/visual/color-palette.json; DEV_GUARDS throws if not; release maps unknown to "none"/identity.
  - depth: int; clamped to [-10000..10000]. Style-guide defines z-bands:
    - Tiles: -100..-1
    - Items: 0..99
    - Actors: 100..999
    - Overlays/Telegraphs: 1000..1999
- Writers
  - RenderSyncSystem (depth, dynamic tint during telegraph/hit-stop), Style compliance toggles
- Readers
  - Phaser sprite bridge, Debug
- Serialization
  - Not included in snapshot (reconstructed from archetype/spawn data). Optional for player cosmetic persistence (deferred).

9) Collider
- Schema: { w:int, h:int, offsetX:int, offsetY:int, kind:"actor"|"tile"|"attack", solid:boolean, mask:int }
- Defaults
  - w=16, h=16, offsetX=0, offsetY=0, kind="actor", solid=true, mask=0xFFFF_FFFF
- Clamp rules
  - w,h,offsetX,offsetY: integers; w,h >= 0
  - kind: enum
  - solid: boolean
  - mask: uint32 bitfield used by CollisionSystem to filter pairs
- Writers
  - MovementSystem (may adjust offset for stepping), CollisionSystem (temporary flags, not permanent)
  - CombatTimingService toggles Hitbox component rather than changing Collider for attacks.
- Readers
  - MovementSystem, CollisionSystem, CombatResolveSystem
- Serialization
  - Tiles: serialized as part of world seed/grid, not per-entity (MVP).
  - Actors: not snapshot (recreated from archetype).

10) AI
- Schema: { state:string, targetId:int|null, aggroRangePx:int, leashRangePx:int, cooldownUntilMs:int }
- Defaults
  - state="idle", targetId=null, aggroRangePx=160, leashRangePx=320, cooldownUntilMs=0
- Clamp rules
  - Strings: non-empty
  - targetId: valid EntityId or null (no resolution check on write; AISystem validates before use)
  - ranges: >= 0
  - cooldownUntilMs: >= 0
- Writers
  - AISystem
- Readers
  - CombatTimingService, MovementSystem, Debug
- Serialization
  - Not included in snapshot (respawned/retargeted on load, MVP).

11) PlayerTag
- Schema: {}
- Defaults
  - Marker only
- Clamp rules
  - N/A
- Writers
  - Spawn code only
- Readers
  - InputSystem, queries
- Serialization
  - Included in snapshot (presence only)

12) EnemyTag
- Schema: { kindId:string } e.g., "enemy.goblin.grunt"
- Defaults
  - kindId=""
- Clamp rules
  - Non-empty string maps to data id; DEV_GUARDS warns if unknown.
- Writers
  - Spawn code only
- Readers
  - AISystem, CombatResolveSystem (for behaviors), RenderSyncSystem
- Serialization
  - Not included in snapshot (respawn logic).

13) Tile
- Schema: { tileType:"rock"|"floor"|"ore.copper"|"ore.iron"|"ore.quartz", hardness:int, flags:int }
- Defaults
  - tileType="floor", hardness=3, flags=0
- Clamp rules
  - tileType: enum (MVP set above)
  - hardness ∈ {3,4,5,7} (L1)
  - flags: uint32 with reserved bits:
    - ROOM_FLOOR: 1<<0
    - DOOR_BAND: 1<<1
    - ORE_PREF: 1<<2
    - LAMP_ANCHOR: 1<<3
    - Reserved: 1<<4..1<<7 (future world-gen), 1<<8.. (free)
- Writers
  - Mining/Tech systems (future), World-gen importer
- Readers
  - MovementSystem (solidity via separate tile collider), Crafting/Mining gates
- Serialization
  - Not snapshot in MVP; reconstructed from data/world/room-templates.json and seed.

14) AttackIntent
- Schema: { attackId:string|null, requestedAtMs:int }
- Defaults
  - attackId=null, requestedAtMs=0
- Clamp rules
  - attackId: null or non-empty string that maps to AttackDef; DEV_GUARDS warns if unknown on set.
  - requestedAtMs: >= 0
- Writers
  - InputSystem (player), AISystem (enemies)
- Readers
  - CombatTimingService (consumes and clears)
- Serialization
  - Not included (transient).

15) Hitbox
- Schema: { active:boolean, w:int, h:int, offsetX:int, offsetY:int, ownerId:int }
- Defaults
  - active=false, w=0, h=0, offsetX=0, offsetY=0, ownerId=-1
- Clamp rules
  - active: boolean
  - w,h >= 0; offsets int
  - ownerId: valid EntityId or -1
- Writers
  - CombatTimingService toggles via onHitboxToggle callback; alternatively adds/removes Hitbox component on window open/close.
- Readers
  - CollisionSystem (staging overlaps), CombatResolveSystem
- Serialization
  - Not included (ephemeral per attack window).

16) AudioEmitter
- Schema: { spatialized:boolean, lastEventMs:int }
- Defaults
  - spatialized=true, lastEventMs=0
- Clamp rules
  - spatialized: boolean
  - lastEventMs >= 0
- Writers
  - AudioEventBridge (debounce tracking)
- Readers
  - Audio system integration
- Serialization
  - Not included (transient hinting)

Optional future stubs (not implemented MVP)
- StatusEffects, Equipment

---

## 5) System Execution Order (Authoritative tick pipeline)

Frame clock and dt rules
- Phaser 3 Scene.update(time, delta) feeds a fixed-step accumulator.
- Fixed step: STEP_MS = 16.6667 ms (60 Hz). Clamp incoming delta into [0..50] to avoid spiral-of-death.
- For each full step in accumulator:
  - Execute systems 1..11 in strict order below using dtMs=STEP_MS and nowMs=Phaser.Time.now (monotonic).
- Deterministic update surface:
  - Given identical inputs/events and same seed, simulation is deterministic.

Order and responsibilities
1) InputSystem (player)
- Reads: PlayerTag, Position, Stamina, Poise, Inventory
- Writes: Velocity (steer), AttackIntent (if action pressed and stamina gate), Stamina (spend)
- Behavior:
  - Translate UI input into desired velocity and/or attack requests.
  - Spend stamina per action (clamp, start regen cooldown).
  - Direction facing: may update Position.dirDeg based on aim vector.

2) AISystem
- Reads: EnemyTag, Position, Health, Stamina, Poise, AI
- Writes: Velocity (steer), AttackIntent (choose/cancel), AI (state, target, cooldowns)
- Behavior:
  - Acquire target within aggroRangePx; respect leashRangePx.
  - Choose attacks gated by stamina/poise, set AttackIntent or cancel feints (null attackId).

3) CombatTimingService tick
- Contract: src/systems/combat-timing-service.js exposes tick(nowMs, dtMs, ecs, events, callbacks)
  - Consumes AttackIntent
  - Advances per-entity attack FSM (telegraph, startup, active, recovery)
  - Emits events: combat.TelegraphStart, combat.AttackStart, combat.AttackEnd (see Events)
  - Toggles Hitbox via callbacks.onHitboxToggle(entityId, open:boolean, dims, offsets)
- Reads: AttackIntent, Poise/Stamina (availability), Attributes (for AttackDef resolve)
- Writes: Hitbox (add/remove or active flag), internal service state (not ECS), Stamina (spend per phase if required)

4) MovementSystem
- Reads: Position, Velocity, Collider(kind="actor"), Tile grid/colliders
- Writes: Position (integration), Velocity (post-collision damp), Collider offsets as needed
- Behavior:
  - Integrate vx,vy over dt; sweep AABB vs world (tile colliders kind="tile").
  - Clamp to room/world bounds.
  - Ensure integer pixel positions for pixel-perfect visuals (snap after integration).

5) CollisionSystem
- Reads: Collider for actors and Hitbox, Position
- Writes: Contact buffers (ring buffer), temporary overlap staging
- Behavior:
  - Actor-actor collision resolution (separation impulses) if required for MVP; otherwise detection only.
  - Detect Hitbox vs Collider (actors/enemies) pairs, respecting mask bitfields.
  - Populate contact staging for CombatResolveSystem without allocating (reused arrays).

6) CombatResolveSystem
- Reads: staged overlaps, Attributes, Health, Poise, EnemyTag/PlayerTag, AttackDef
- Writes: Health (damage), Poise (reduce, break), events (combat.Hit, combat.HitStop), AI (maybe stagger state), Stamina (on hit-cancel if applicable)
- Behavior:
  - Use combat-design’s formula: damage = f(AttackDef, attackPower, defense, crit/poise windows).
  - Schedule hit-stop tokens as events (combat.HitStop with durationMs).
  - Prevent double-hits within same active window per owner/target (per-tick hit registry).

7) StaminaPoiseRegenSystem
- Reads: Stamina, Poise
- Writes: Stamina (regen after cooldown), Poise (recover over time), events (poise.Recover when leaving broken state)
- Behavior:
  - If nowMs >= regenCooldownUntilMs, add regenPerSec * dt.
  - Poise recovers continuously; when value reaches threshold and brokenUntilMs passed, emit poise.Recover.

8) Lifetime/DespawnSystem
- Reads: Health (<=0), offscreen/despawn flags, projectile lifetimes
- Writes: destroy flags; executes deferred destruction queue
- Behavior:
  - Mark entities for removal; end-of-tick free pass: remove components, increment generation.

9) RenderSyncSystem
- Reads: Position, Renderable, Hitbox (for telegraph overlays), style constraints
- Writes: Phaser sprite transforms (x,y,depth,tint), z-ordering, transient overlay entities lifetimes
- Behavior:
  - Enforce docs/visual-systems/style-guide.md. Resolve tintToken via data/visual/color-palette.json.
  - Telegraph overlay management in sync with CombatTimingService events.

10) AudioEventBridge
- Reads: EventBus stream, AudioEmitter
- Writes: audio triggers via manifest (docs/audio-systems/audio-design.md), AudioEmitter.lastEventMs (debounce)
- Behavior:
  - Map domain events to trigger keys; apply per-entity debouncing window (e.g., 50–100ms).

11) Debug/ProfilerHooks
- Reads: Registry stats
- Writes: counters for systems dt, entities processed, telegraphsEmitted, attacksFinished, eventsEmitted
- Behavior:
  - Zero-allocation counter updates; expose to overlay/dev console.

---

## 6) Events & Buses

EventBus contract
- API:
  - on(topic:string, fn:(payload:any)=>void): unsubscribeFn
  - once(topic, fn)
  - off(topic, fn)
  - emit(topic:string, payload:any): void
  - drain(topic?): iterator over frame-local ring buffer (for systems-to-systems without callbacks)
- Implementation:
  - Per-topic ring buffers (capacity per topic, e.g., 128). Drop-oldest on overflow (DEV_GUARDS warn).
  - No allocations on emit (payloads use pooled structs or plain objects from pool).

Payload schemas (authoritative subset; mirror domain docs)
- mining.Attempt
  - { actorId:int, tileX:int, tileY:int, toolId:string, hardness:int }
- mining.Success
  - { actorId:int, tileX:int, tileY:int, dropItemId:string, qty:int }
- combat.TelegraphStart
  - { actorId:int, attackId:string, startMs:int, windupMs:int }
- combat.AttackStart
  - { actorId:int, attackId:string, startMs:int, activeMs:int }
- combat.AttackEnd
  - { actorId:int, attackId:string, endMs:int, canceled:boolean }
- combat.Hit
  - { attackerId:int, targetId:int, attackId:string, damage:int, poiseDamage:int, hitMs:int, critical:boolean }
- combat.HitStop
  - { durationMs:int, scope:"attacker"|"target"|"both", actorId?:int, targetId?:int }
- poise.Recover
  - { actorId:int, recoverMs:int }

Coalescing
- Multiple identical events within the same frame for the same entity may be coalesced (e.g., repeated combat.HitStop shorter than existing -> extend).

---

## 7) Registry API (mirrors src/core/ecs-registry.js)

createRegistry(config?)
- Returns:
  - createEntity(archetypeTag?:number): EntityId
  - destroyEntity(id:EntityId): void  // defers until end-of-tick
  - addComponent(id, typeKey, data?): void
  - removeComponent(id, typeKey): void
  - get(id, typeKey): ComponentView  // zero-copy view where possible
  - has(id, typeKey): boolean
  - view(query): Iterable<EntityId>  // optimized iterator
  - each(query, fn:(id)=>void): void // fast-path iteration
  - serialize(entityId): SerializedEntity  // per-entity component subset
  - snapshot(filter?): Snapshot  // whole-world or filtered subset
  - stats(): { entities:int, alive:int, components:{[key]:int} }

Query spec
- Shape:
  - { allOf?:string[], anyOf?:string[], noneOf?:string[], tag?:number|number[] }
- Semantics:
  - allOf: must have all components
  - anyOf: must have at least one
  - noneOf: must have none
  - tag: optional archetypeTag filter(s)
- Optimization:
  - Precompute component index masks for query; use maskLo/maskHi bitwise checks.
  - Hot-path iterators for common archetypes (Player, Enemy, Tile) use cached entity index lists updated on add/remove.

Validation behavior
- DEV_GUARDS:
  - Throws on missing component type, schema mismatch, invalid EntityId generation.
  - Warns on unknown tintToken/AttackId/Enemy kindId.
- Release:
  - Applies clamps silently, unknown ids mapped to safe defaults, no throws (except fatal pool corruption).

Serialization helpers
- serialize(entityId):
  - Returns JSON-safe object with only serializable MVP components (see section 12).
- snapshot(filter):
  - filter = { include?:string[], exclude?:string[], predicate?:(id)=>boolean }
  - Returns object with entities[], components keyed by typeKey.

---

## 8) Archetypes & Common Queries

Archetype definitions (MVP)
- Player
  - allOf: [PlayerTag, Position, Velocity, Health, Stamina, Poise, Attributes, Inventory, Renderable, Collider]
  - tag: 1
- Enemy
  - allOf: [EnemyTag, Position, Velocity, Health, Stamina, Poise, Attributes, AI, Renderable, Collider]
  - tag: 2
- Tile
  - allOf: [Tile, Collider]
  - tag: 3
  - Note: Backed by grid meta for performance; represented as ECS records for uniform logic (mining anchors).
- Item (ground drop)
  - allOf: [Position, Renderable, Collider]
  - Note: ItemStack-as-component is deferred; MVP encodes drop identity in Renderable.spriteId and a small data tag if needed.
  - tag: 4
- Projectile
  - allOf: [Position, Velocity, Collider, Renderable]
  - tag: 5

Common queries
- Single player: { allOf:["PlayerTag"] }
- Enemies: { allOf:["EnemyTag"] }
- Actors (player+enemies): { anyOf:["PlayerTag","EnemyTag"], allOf:["Position","Collider"] }
- Active hitboxes: { allOf:["Hitbox"] }
- Tiles: { allOf:["Tile"] }

---

## 9) Data Handshakes

AttackDef lookup (CombatTimingService)
- Attack IDs from AttackIntent must resolve to AttackDef in combat-design.
- Expectations:
  - Fields minimally: windupMs, activeMs, recoveryMs, staminaCost, poiseDamage, baseDamage, hitboxDims (w,h,offsets), arcDeg or directionality.
  - Service is responsible for enforcing AttackDef constraints and surfacing DEV_GUARDS warnings.
- src/systems/combat-timing-service.js should provide:
  - tick(nowMs, dtMs, ecs, eventBus, { onHitboxToggle })
  - resolveAttackDef(attackId): AttackDef
  - internal state per entity (FSM nodes, timers)

Audio palette/tint resolution
- Renderable.tintToken resolves to a color via data/visual/color-palette.json.
- Style-guide constraints:
  - Telegraphs use standardized tokens (e.g., "telegraph.warn", "telegraph.danger").
  - DEV_GUARDS error on missing token; release falls back to neutral.

Mining tool gating
- From data/items/tools.json, tools carry minHardness capability.
- Tile.hardness clamps and gating:
  - A tool may mine tile if tool.minHardness >= Tile.hardness (MVP rule; see crafting-design for exact).
- Inventory.selectedIndex indicates active tool in hand; -1 means unarmed.

Room templates
- data/world/room-templates.json provides grid layouts incl. Tile.tileType and flags. Importer populates ECS Tile records and tile colliders.

---

## 10) Performance & Memory Plan

Target counts (MVP)
- Tiles: grid-backed, ECS-visible subset per active room (e.g., up to 2,048 on-screen; pool-backed)
- Enemies: ≤ 32
- Items (ground drops): ≤ 64
- Projectiles: ≤ 16
- Telegraph overlays: ≤ 8 concurrent

Memory layout notes
- Use typed arrays for numeric fields; grow in chunks (power of two).
- Pools:
  - Entities in chunks of 256.
  - Contact staging buffers sized for worst-case overlaps (e.g., 256 entries per frame).
  - EventBus ring buffers: capacity 128 per topic.
- Strings (spriteId, tintToken, itemId) interned or referenced; avoid per-frame concatenations.
- Avoid per-frame allocations:
  - No new arrays/objects inside system hot paths.
  - Reuse iterators (each/query), staging arrays, payload objects (pooled).

Iteration hotspots
- InputSystem: O(1) (single player)
- AISystem: O(N_enemies)
- Movement/Collision: O(N_actors + N_hitboxes). Use spatial partition/grid (cell size ≈ 32 px) for broadphase.
- CombatTimingService: O(N_attackers with active FSM)
- RenderSync: O(N_renderables in view)

Micro-profiler counters
- systemsDtMs: map { systemName: lastStepMs }
- entitiesProcessed: per system
- telegraphsEmitted, attacksFinished, eventsEmitted per frame
- maxAccumulatorSteps per frame (guard oscillations)

---

## 11) Serialization & Snapshots (MVP)

Snapshot scope (player-centric autosave)
- Included components:
  - Position, Health, Stamina, Attributes, Inventory, PlayerTag
- Excluded:
  - Tiles (regenerated from seed and room templates)
  - Enemies, Items, Projectiles (respawn/despawn logic)
  - Transients: Velocity, AttackIntent, Hitbox, AudioEmitter, AI

Snapshot shape (conceptual)
- {
  - version: "ecs-s1",
  - timeMs: nowMs,
  - player: {
    - idHint?: int, // optional, not trusted across sessions
    - Position, Health, Stamina, Attributes, Inventory
  },
  - seed: string|int // world seed used to reconstruct tiles/rooms
}

Load behavior
- Rebuild world from seed/templates.
- Spawn player with serialized components; run clamps post-load.
- Clear transient systems state (CombatTimingService FSM, events).

---

## 12) Error Handling & Dev Guards

Dev-only guards (enabled under DEV_GUARDS)
- Missing tintToken in data/visual/color-palette.json -> error with component/entity context.
- Unknown component key on add/remove -> error.
- Stale EntityId generation mismatch -> error.
- AttackDef constraint warnings (surfaced by CombatTimingService):
  - activeMs <= 0
  - arcDeg outside [0..360]
  - hitbox dims <= 0
  - staminaCost < 0
- Inventory:
  - selectedIndex out of range -> auto-correct and warn.
  - itemId unknown -> warn (data-driven).
- EventBus overflow -> warn with topic and dropped count.
- Query with unknown component -> error.

Release behavior
- Soft-fail with safe defaults and clamps. No throws in hot paths. Log minimal once-per-session for critical mismatches.

---

## 13) Implementation Notes (Phaser 3 alignment)

- Scene.update(time, delta):
  - Maintain accumulator; step fixed dtMs passes.
- Sprite bridge:
  - RenderSyncSystem applies x/y from Position, depth, and tint from palette token resolved once and cached.
  - Direction: dirDeg used for sprite flip/angle; style-guide governs rotation vs. flip.
- Collision:
  - Tile collisions use grid-based AABB checks; actor swept AABB to prevent tunneling at ≤ 300 px/s.
- Time source:
  - nowMs from Phaser.Time.now (monotonic). All timers (regenCooldownUntilMs, brokenUntilMs) use this clock.

---

## 14) Acceptance Checklist

- Components
  - All MVP components defined with defaults, clamps, write ownership, and serialization notes.
  - Tile.flags reserved bits documented.
- Systems
  - Authoritative execution order (1..11) aligned with combat-design and CombatTimingService.
- Registry
  - API surface defined with query spec, validation, and snapshot helpers.
- Data bridges
  - AttackDef resolution contract clarified.
  - Tint token/palette mapping defined.
  - Mining gating via Tile.hardness and tools.json defined.
- Performance
  - Memory and iteration strategies documented; no-GC hot paths.
  - Micro-profiler counters enumerated.
- Serialization
  - Player-centric snapshot shape defined; tiles/world regenerated by seed.
- Error handling
  - DEV_GUARDS coverage for common pitfalls.
- Engineer handoff
  - Ready to generate code and schemas for src/core/ecs-registry.js and systems scaffolds next.

---

By my beard and the bedrock beneath, this spec is chiseled to guide sturdy code. Any cracks you spy, bring ‘em to Core Systems before we pour the next layer.