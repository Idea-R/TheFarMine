# ECS Architecture — Core Systems Foundation (Sprint 1)

Author: Ironforge Stonebeard, Core Systems, The Far Mine

## 1) Title and Scope
- Scope: A browser-friendly JavaScript Entity–Component System (ECS) with dense Structure-of-Arrays (SoA) component stores, minimal dependencies, and service-oriented systems. The registry is the sole state authority; systems are stateless functions operating on the registry.
- MVP targets:
  - Stable entity lifecycle with generation counters
  - Data-only components validated by schema
  - Deterministic system scheduling and iteration order
  - Fast query iteration over dense stores
  - Snapshot and serialize for UI/debug and saves
- Acceptance:
  - Unit tests pass (see 12)
  - A simulated frame updates Position from Velocity deterministically
  - DEV mode asserts on invalid inputs; production mode does not thrash the GC

## 2) Design Goals & Principles
- Goals:
  - Stability and clean API
  - Fast iteration over entities and components
  - Deterministic snapshots and per-frame ordering
  - Small GC surface; reuse allocations where practical
  - Dev-mode clamps, assertions, and schema validation
- Principles:
  - Components are data-only; behavior lives in systems/services
  - Explicit system scheduling; no implicit ordering
  - Stable entity IDs with generation counters to prevent ABA hazards
  - Assertive validation in DEV builds; lenient/logging in production
  - Snapshots are reproducible with stable iteration (id-ascending)

## 3) Entity & Component Model
- Entities:
  - Integer IDs with generation counters. An entity handle is (id, gen).
  - Lifecycle:
    - create: assigns from free list if available; otherwise grows capacity.
    - destroy: removes all components for id, bumps its generation, returns id to free list.
    - reuse: an id is only reused after destroy, and its generation must match for reads/writes.
- Components (MVP set; concise fields; see data/core/component-schemas.json for authoritative defaults/clamps; runtime clamps in src/core/ecs-registry.js):
  - Position: x, y (numbers; world units). Optional facingDir? (future).
  - Velocity: vx, vy (numbers), maxSpeed (number, optional per-entity override; else use system default).
  - Health: hp, maxHp, invulnUntilMs (optional).
  - Stamina: value, max, regenPerSec, regenDelayMs.
  - Poise: value, max, brokenUntilMs.
  - Attributes: strength, agility, resolve (small integer bands for balancing).
  - Inventory: slots (array of item ids/refs), capacity.
  - Renderable: spriteId (string), z (int), tint (rgba or hex), visible (bool).
  - Collider: shape ("circle" | "aabb"), radius or hw/hh (numbers), solid (bool), layer (uint16), mask (uint16).
  - AI: state (string), targetId (optional), telegraphDebounceMs (int), behaviorId (string).
  - PlayerTag: data-less marker component.
  - EnemyTag: data-less marker component (optional enemyType string in schema).
  - Tile: tileType (enum), hardness (band), flags (bitmask).
  - AttackIntent: requestedAtMs (int), attackId (string).
  - Hitbox: ownerId (int), shape, radius/hw/hh, activeUntilMs (int), damage (number), poiseDamage (number).
  - AudioEmitter: event (string), gain (number), pitch (number), once (bool).
- Defaults and clamps:
  - Authoritative schemas in data/core/component-schemas.json (JSON Schema 2020-12).
  - Runtime clamps, fills, and DEV assertions implemented in src/core/ecs-registry.js.
  - This spec defers numeric ranges to those files to avoid drift.

## 4) Registry API (Interface Definitions)
- Factory:
  - createRegistry(config?): Registry
    - config.dev: boolean (enable asserts and schema validation)
    - config.nowMs?: () => number (monotonic time source; default performance.now)
    - config.random?: () => number (optional deterministic seed)
- Registry methods:
  - createEntity(): { id: number, gen: number }
  - destroyEntity(id: number): void
  - addComponent(id: number, type: string, data?): void
  - removeComponent(id: number, type: string): void
  - get(id: number, type: string): object | undefined  (returns a shallow copy; undefined if missing)
  - set(id: number, type: string, data: object): void  (full overwrite with clamp/validate; partial updates use get+set)
  - has(id: number, type: string): boolean
  - view(query): View  (opaque iterable view cached for this call)
  - each(queryOrView, fn(entityId, compAccess)): void
    - compAccess.get(type): object copy
    - compAccess.set(type, data): void
    - compAccess.has(type): boolean
  - serialize(entityId: number): { id, gen, components: { [type]: object } }
  - snapshot(filter?): { entities: Array<serialize>, meta: { nowMs } }
    - filter?: { include?: string[], exclude?: string[] } (component allow/deny lists)
  - stats(): object  (counts: entitiesAlive, componentsByType, memApprox, counters if enabled)
  - nowMs: number  (current time according to registry clock)
- Query descriptor shape:
  - { allOf?: string[], anyOf?: string[], noneOf?: string[] }
  - Semantics: entity must contain every component in allOf, at least one in anyOf (if provided), and none in noneOf.
- Error behavior:
  - DEV (config.dev=true):
    - Throws on invalid id/gen, unknown component type, schema violation, double-add, remove missing, and cross-field clamp failures.
    - Asserts iteration invariants and stable order.
  - Production:
    - No throws for common misuses; logs a single-rate-limited warning and no-ops where safe. Validation is reduced to hot-path clamps only.

## 5) Storage & Performance Notes
- Storage:
  - Dense SoA per component type:
    - byEntity: Map<entityId, index>
    - entity: number[]  (dense list of entity ids storing this component)
    - data: object[] or struct-like arrays  (component payloads aligned with entity[])
  - Entity->components index: Set per entity (DEV) or bitset (future) for fast has().
- Query driver heuristic:
  - When allOf is non-empty, pick the smallest store among its component types as the driver; iterate it and test membership for others with O(1) byEntity lookups.
  - If only anyOf is provided, pick the smallest store among anyOf and de-dup hits.
  - noneOf check applied last.
- Complexity targets:
  - add/remove: amortized O(1) via swap-remove in dense arrays
  - get/set/has: O(1)
  - each: O(k + matches), where k is size of driver store
- Memory layout notes:
  - Use swap-remove to keep arrays dense; avoid holes.
  - Optionally reuse object instances for hot-path read/write internally; external API returns copies to protect invariants.
  - Typed arrays are a future optimization; MVP uses plain arrays/objects for developer ergonomics.
- Micro-profiler (planned):
  - Counters: addComponent, removeComponent, queries run, entities iterated by system
  - View cache: short-lived cache keyed by query signature for a single frame (future)

## 6) Systems & Scheduling Order (MVP)
- Frame pipeline proposal (Sprint 1):
  1) InputIntent gather (outside ECS; writes AttackIntent and Velocity targets)
  2) StaminaRegenSystem (time-based clamps)
  3) PoiseRecoverySystem
  4) MovementSystem (Position += Velocity, clamped by maxSpeed; collider–solid resolution stubbed)
  5) CombatTimingService tick (windup/active/recovery; telegraph debounce; activates Hitbox)
  6) HitDetectionSystem (Hitbox vs Collider overlap; emit combat.Hit; apply Health/Poise deltas)
  7) AudioEventBridge (routes emitted events to sound ids)
  8) Render sync (read-only consumers)
- Determinism:
  - Systems run in the above fixed order.
  - Within each system pass, entities are processed in ascending entityId order.

## 7) Movement System (MVP Spec)
- Reads: Position, Velocity
- Writes: Position
- Step:
  - dtMs = fixed 16ms suggestion for MVP (can derive from registry.nowMs ticks in future)
  - speed = hypot(vx, vy)
  - If speed > maxSpeed (from Velocity.maxSpeed, else system default), scale (vx, vy) by (maxSpeed / speed)
  - dx = vx * dtMs / 1000; dy = vy * dtMs / 1000
  - Position.x += dx; Position.y += dy
  - Integer rounding policy: round to nearest integer at write-time for Position to keep tile alignment predictable; preserve subpixel velocity.
- Collider note:
  - MVP ignores world solids and tile collision; leave a hook for future Tile collision resolution.
- Telemetry:
  - Increment counter Movement.entities for each processed entity (DEV/profiler).

## 8) Combat Timing Hooks (Integration Contract)
- AttackIntent consumption:
  - Fields: requestedAtMs, attackId
  - On consume, service resolves AttackDef (windup, active, recovery, hitStop, audio cues) and stamps schedule against registry.nowMs.
- TelegraphStart:
  - Emitted at windup begin.
  - Debounce via ai.telegraphDebounceMs from AI component; if last telegraph < debounce window, suppress.
  - If victim is PoiseBroken (Poise.brokenUntilMs > nowMs), apply poiseStartupTaxMs = 40 to windup (service-level rule).
- HitStop:
  - AttackDef may carry hitStopAttackerMs and hitStopVictimMs; service freezes their animation/system deltas for those durations (clock source: registry.nowMs).
- Emits (event bus or transient components):
  - combat.TelegraphStart
  - combat.Swing.light (and other tiers per manifest)
  - combat.Hit
  - combat.Block
  - combat.Parry
  - AttackEnd
  - AudioEventBridge translates to sound manifest ids.

## 9) Data Contracts & Schemas
- Single source of truth:
  - data/core/component-schemas.json (JSON Schema draft 2020-12): authoritative field shapes, defaults, and value ranges.
  - src/core/ecs-registry.js: runtime default injection, clamps, and DEV assertions.
- Tile data:
  - Hardness bands (tool gating): {3, 4, 5, 7}
  - Tile.tileType enums (suggested baseline): dirt, gravel, stone, ore, crystal, lava, void
  - TILE_FLAGS bit names (uint32):
    - 0x0001 SOLID (blocks movement)
    - 0x0002 BREAKABLE (can be mined/destroyed)
    - 0x0004 LIQUID (flow behavior; slows movement)
    - 0x0008 DAMAGING (hurts on touch)
    - 0x0010 LADDER (climbable)
    - 0x0020 OPAQUE (blocks vision/LOS)
    - 0x0040 PLATFORM (one-way top)
    - 0x0080 SLIPPERY (reduced friction)
    - 0x0100 INTERACTIVE (can trigger)
    - 0x0200 SPAWN_BLOCK (prevents spawns)

## 10) Snapshots, Serialization, and Save Safety
- serialize(entityId) returns:
  - { id, gen, components: { [type]: data } } for all components present on the entity
- snapshot(filter?) returns:
  - { entities: [serialize(...)], meta: { nowMs } }
  - Recommended filter allowlist for UI/debug: Position, Velocity, Health, Stamina, Poise, Attributes, Inventory, Renderable, Collider, AI, PlayerTag, EnemyTag, Tile, AudioEmitter
  - Avoid transient-only components (e.g., Hitbox, AttackIntent) in saves; include them for replay/debug traces only.

## 11) Godot Binding Appendix (Outline)
- Approach:
  - GDExtension wrapper around the Registry; expose create/destroy/add/get/set/each to GDScript.
  - Map Components to Godot Dictionary instances; convert at boundary to maintain JS-side SoA density.
  - Signals:
    - Bridge ECS events (combat.* and audio cues) to Godot signals; ensure signal emissions happen on main thread.
  - Ownership:
    - Registry and component storage live in JS; Godot holds opaque handles/ids; no shared mutation across threads.
  - Perf caveats:
    - Avoid per-entity roundtrips; prefer batched each() operations that fill preallocated Godot arrays.
    - Minimize allocations in tight loops; cache temporary Dictionaries where feasible.

## 12) Testing & DOD
- Minimal unit tests:
  - Entity lifecycle: create/destroy/reuse increments generation; stale gen rejected in DEV.
  - Components: add/get/set/remove roundtrip with schema clamps; has() correctness.
  - Query: each() over allOf/anyOf/noneOf; ensures ascending id order.
  - Snapshot: filter include/exclude works; serialize shape matches spec.
  - Movement sanity: Position updates by Velocity with maxSpeed clamp and rounding policy.
- Definition of Done reminder:
  - Create entity with Position+Velocity.
  - Run update tick (MovementSystem with dt=16ms).
  - Position advances deterministically; test asserts exact integer position given inputs.

## 13) Future Hooks
- View caching keyed by query signature for frame-local reuse
- Archetype buckets or bitset-accelerated membership tests
- Physics integration (Tile/world collision resolution; swept AABB; narrow-phase)
- Jobified system runner (split each() passes across tasks with stable chunk ordering)
- Typed array backing for hot-path components (Position, Velocity, Collider)
- Event bus standardization (transient component vs ring buffer) for low-GC signaling

References:
- data/core/component-schemas.json
- src/core/ecs-registry.js