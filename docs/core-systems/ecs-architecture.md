# The Far Mine — ECS Architecture (Sprint 1 Alpha)

Owner: Ironforge Stonebeard (Alpha)  
Version: 0.1 • Date: 2026-02-18  
Status: Draft v0.1

## 1) Title & Scope

This document specifies the MVP ECS foundations for The Far Mine, targeting Sprint 1 (Alpha). It is implementation-ready, aligned with src/core/ecs-registry.js as the canonical JS reference, and includes a Bevy (Rust) mapping appendix.

Scope:
- Entities, Components, Systems
- World/Registry
- Event Bus
- Queries
- Scheduling
- Resources

MVP target: spawn/move a dwarf; sustain 10k entities baseline with 3 trivial systems at >=60 Hz on a dev laptop.


## 2) Design Principles

- Determinism-first: eid-ascending iteration for systems and event draining.
- Cache-friendly stores: dense arrays per component (SoA-like by component).
- Schema-validated components: JSON Schema validation in dev mode; no bake-in at runtime in prod.
- Stable system stages: fixed stage order; append-only order within a stage.
- Event-driven edges: cross-system edges via typed event queues; FIFO per type per tick.
- Engine-agnostic core: JS registry is the golden algorithmic reference; Bevy bridge path defined in appendix.
- Non-goals for MVP: archetype optimizer, multithreading.


## 3) Core Concepts & Data Model

- Entities
  - Numeric eid, monotonically increasing; freelist reuse. First entity id = 1.
  - isAlive(eid) contract: true only if currently allocated and not tombstoned.

- Components
  - snake_case names (e.g., position, velocity, sprite_ref).
  - Storage: per-component dense store with:
    - ids: number[] (entity ids)
    - data: object[] (object-per-component instance for clarity in MVP)
    - indices: Map<EntityId, index> (or number[] fast index map)
  - Semantics: swap-remove on removal (swap last slot into removed index; update indices).
  - Deterministic iteration: each store maintains lazy sortedIds snapshot (eid ascending). Mark dirty on add/remove; recompute once per tick when needed.
  - Validation: schemas set via setSchemas(); enforced in dev mode on add/remove/update paths; no-op in prod.

- Systems
  - Pure functions: (registry, dtSec) => void
  - Registered into fixed Stages (enum-like): Input, PrePhysics, Gameplay, Events, RenderPrep.
  - Order within each stage is append-only and stable across ticks.

- World/Registry
  - Single runtime container for:
    - Entity lifecycle (create/destroy)
    - Component API (add/remove/get/has)
    - Queries (view)
    - Resources (named singletons)
    - Event Bus
    - Scheduling (staged system lists)
    - Counters and dev-only diagnostics
    - Ephemeral per-tick bag (registry._ephemeral: Map-like)

- Resources
  - Named singletons, e.g., GameTime, InputMap, AssetIndex.
  - get/set/has APIs; no schema enforcement at MVP.

- Events
  - Lightweight per-type FIFO queues; types are stable strings through P4.
  - Planned types for Sprint 1: MineHitEvent, DamageEvent, FootstepEvent, PlaySfxEvent, UiCommand.


## 4) Public API (JS reference; mirrors src/core/ecs-registry.js)

Factory:
- createRegistry(opts?: { mode: 'dev' | 'prod' }) → Registry

Registry methods and properties:
- createEntity(): EntityId
- destroyEntity(eid): void
- isAlive(eid): boolean
- add(eid, name, data): void
  - Adds or replaces the component instance for eid. Validates in dev (if schemas present).
  - Marks component store dirty (sortedIds).
- remove(eid, name): void
  - No-op if not present. Swap-remove semantics; marks dirty.
- get(eid, name): object | null
- has(eid, name): boolean
- setSchemas(map: Record<ComponentName, SchemaDef>): void
  - Sets/overwrites the JSON Schemas; dev mode validation only. Registry does not mutate data to conform.
- schemas: Record<ComponentName, SchemaDef>
- view(include: string[], exclude?: string[]) → { each(cb: (eid, ...comps) => void), size(): number }
  - Selects the smallest include store as driver.
  - Ensures driver.sortedIds snapshot prepared (eid-ascending).
  - Iterates driver ids; for each eid:
    - skip if !isAlive(eid)
    - require all include has()
    - require all exclude !has()
    - pass component data refs in include order
  - Counters updated: Query.iterations, Query.matches.
  - MVP: include up to 5 components; excludes are cheap has() checks.
- register(stage: number, fn: SystemFn): void
  - Appends system to the stage’s list.
- tick(dtSec: number): void
  - dtSec clamped to [0, 0.1].
  - For each stage in order: run systems; reset per-tick ephemeral after all stages or per tick-start.
  - Resets store sorted snapshots lazily as needed.
- setResource(name, obj): void
- getResource(name): any | undefined
- hasResource(name): boolean
- bus: EventBus
  - emit(type: string, payload: any): void
  - drain(type: string, fn: (payload: any) => void): number
    - Processes events FIFO for that type; returns drained count; clears drained events.
  - clear(type?: string): void
    - Clears one type or all if omitted.
- counters: Map<string, number>
  - inc(key: string, by = 1): void
  - resetCounters(): void
    - Clears all counters to 0 (or removes entries).
- dev-only: getDebugStore(name): Store
  - Returns the internal store for the named component in dev mode.
  - Throws or returns undefined in prod mode.
  - Store shape (read-only contract): { ids: number[], data: any[], indices: Map|number[], sortedIds: number[]|null, dirtySorted: boolean }

Exports:
- Stages: { Input: 0, PrePhysics: 1, Gameplay: 2, Events: 3, RenderPrep: 4 }
- EventTypes: { MineHitEvent, DamageEvent, FootstepEvent, PlaySfxEvent, UiCommand }

Reference system:
- MovementSystem(registry, dtSec)
  - Query: view(['position', 'velocity'])
  - Integrate: position.x += velocity.vx * dt; position.y += velocity.vy * dt
  - Guards:
    - If any of position or velocity components contain NaN/Inf, zero-out offending fields; clamp velocity magnitude by max_speed if provided.
  - Optional footstep cooldown:
    - Uses registry._ephemeral.footstep_cd_ms: Map<EntityId, number>
    - Accumulates movement distance/time; when threshold met, emit FootstepEvent with eid/pos; set cooldown ~250 ms (tunable resource).


## 5) Component Set (Sprint 1 stable names)

- Transform
  - position { x: number, y: number }
  - velocity { vx: number, vy: number, max_speed?: number }
- Physics/World
  - collider { half_w: number, half_h: number, flags?: number }
  - tile { type: string, solid?: boolean }
  - ore_vein { ore_id: string, richness: number }
- Combat
  - health { current: number, max: number }
  - stamina { current: number, max: number, regen_per_sec: number }
  - damageable { defense: number, poise?: number }
- Inventory/Items
  - inventory { capacity: number, items?: any[] }
  - tool { id: string, tier: number, durability: number, max_durability: number }
- Identity/Rendering/FX
  - faction { id: string }
  - sprite_ref { id: string, tint?: string }
  - light { intensity: number, color_token?: string }
  - sound_emitter { id?: string }
- UI
  - ui_state { visible: boolean }

Note: Precise JSON Schemas are provided in data/core/component-schemas.json (companion file). The registry does not bake schemas; use setSchemas() in bootstrap.


## 6) System Scheduling & Order (MVP)

Stage order:
1) Input
2) PrePhysics
3) Gameplay
4) Events
5) RenderPrep

Example pipeline:
- Input: read InputMap resource; write velocity.desired or velocity directly.
- PrePhysics: MovementSystem (position += velocity*dt; clamp/guard)
- Gameplay: CombatResolveSystem (stub); MiningSystem (stub: emits MineHitEvent)
- Events:
  - Audio bridge drains PlaySfxEvent
  - Damage application drains DamageEvent
- RenderPrep: sprite_ref → renderer buffer; copy position to render transforms

Determinism:
- All query iterations are eid-ascending via per-store sortedIds snapshot.
- Event processing is FIFO per type per tick.


## 7) Queries

- view(include: string[], exclude?: string[])
  - Driver selection: smallest include store by ids.length.
  - Snapshot: ensure driver.sortedIds is materialized if dirty (sort ascending).
  - Iteration:
    - For each eid in driver.sortedIds:
      - Skip if !isAlive(eid)
      - For each include: has(eid, comp) must be true
      - For each exclude: has(eid, comp) must be false
      - Pass component data refs to callback in include order
  - Counters:
    - inc('Query.iterations', +1 per eid visited)
    - inc('Query.matches', +1 per eid passed to callback)

Notes:
- MVP supports up to 5 include components.
- Excludes are cheap has() checks (no data fetch).
- Do not remove components from the driver store during its iteration to avoid swap-remove skipping; if needed, defer via Events or a post-pass.


## 8) Example Usage (code snippet outline)

```js
import { createRegistry, Stages, EventTypes } from './core/ecs-registry.js';
import schemas from '../data/core/component-schemas.json';

// 1) Create registry and register schemas
const reg = createRegistry({ mode: 'dev' });
reg.setSchemas(schemas);

// 2) Create a player entity
const player = reg.createEntity();
reg.add(player, 'position', { x: 0, y: 0 });
reg.add(player, 'velocity', { vx: 0, vy: 0, max_speed: 6 });
reg.add(player, 'sprite_ref', { id: 'dwarf_01' });

// 3) Resources
reg.setResource('InputMap', {
  getAxis: (name) => (name === 'move_x' ? 1 : 0), // stub: always move right
});

// 4) Systems
function InputSystem(r, dt) {
  const input = r.getResource('InputMap');
  const ax = input?.getAxis('move_x') ?? 0;
  const ay = input?.getAxis('move_y') ?? 0;
  r.view(['velocity']).each((eid, vel) => {
    vel.vx = ax * (vel.max_speed ?? 4);
    vel.vy = ay * (vel.max_speed ?? 4);
  });
}

function MovementSystem(r, dt) {
  r.view(['position', 'velocity']).each((eid, pos, vel) => {
    const clamp = (v) => (Number.isFinite(v) ? v : 0);
    vel.vx = clamp(vel.vx); vel.vy = clamp(vel.vy);
    if (vel.max_speed && Number.isFinite(vel.max_speed)) {
      const m = Math.hypot(vel.vx, vel.vy);
      if (m > vel.max_speed && m > 0) {
        const s = vel.max_speed / m;
        vel.vx *= s; vel.vy *= s;
      }
    }
    pos.x = clamp(pos.x + vel.vx * dt);
    pos.y = clamp(pos.y + vel.vy * dt);

    // optional footsteps
    const eph = (r._ephemeral ||= {});
    const cd = (eph.footstep_cd_ms ||= new Map());
    const now = (eph.tick_ms ||= 0); // assume registry populates each tick
    if ((cd.get(eid) ?? 0) <= now && (Math.abs(vel.vx) + Math.abs(vel.vy)) > 0) {
      r.bus.emit(EventTypes.FootstepEvent, { eid, x: pos.x, y: pos.y });
      cd.set(eid, now + 250);
    }
  });
}

reg.register(Stages.Input, InputSystem);
reg.register(Stages.PrePhysics, MovementSystem);

// 5) Tick loop (dt clamped internally)
let last = performance.now();
function frame(now) {
  const dtSec = (now - last) / 1000;
  last = now;
  reg.tick(dtSec);

  // Drain footsteps in Events stage or here (demo)
  reg.bus.drain(EventTypes.FootstepEvent, (e) => {
    // bridge to audio
  });

  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
```


## 9) Performance Target & Bench Plan

Target:
- 10,000 entities with components: position, velocity, sprite_ref
- 3 trivial systems (e.g., Input, Movement, RenderPrep sync)
- Sustained >= 60 Hz on a dev laptop (single thread)

Bench script outline (bench.js):
- Create registry in prod mode.
- Create N entities (default 10k); add position, velocity, sprite_ref with randomized values.
- Register:
  - InputSystem (sets velocities to a constant)
  - MovementSystem (integration only)
  - RenderPrepSystem (no-op copy/read)
- Run warmup (120 ticks), then measure (600 ticks).
- Record:
  - avg_tick_ms, p95_tick_ms
  - systems: avg_ms per stage/system (optional via simple timing wrappers)
  - counters snapshot: Entities.alive, Query.iterations, Query.matches
- Expected baseline (guideline, not a hard gate):
  - avg_tick_ms <= 16.0
  - Query.iterations ~= N per system using a single-view driver
  - GC pressure low (no per-entity allocations inside tick)


## 10) Testing Plan (MVP)

Unit tests:
- Entities
  - create/destroy/isAlive
  - Freelist reuse after destroy
- Components
  - add/remove/get/has
  - swap-remove correctness (indices update; ids/data length sync)
  - dev-only getDebugStore invariants
- Queries
  - Deterministic iteration: eid-ascending across multiple adds/removes
  - Exclude semantics
  - Counters: iterations vs matches
- Event Bus
  - FIFO ordering per type
  - drain returns count; clear(type?) behavior
- Systems
  - MovementSystem integrates position with dt clamp
  - NaN/Inf guards zero-out invalid numbers
  - Optional footstep cooldown via _ephemeral does not spam
- Tick
  - Stage order respected; register append-only order preserved


## 11) Bevy (Rust) Mapping Appendix

Mapping:
- Entity
  - JS EntityId ↔ bevy::ecs::entity::Entity
- Components
  - JS component objects ↔ Rust structs
    - Example:
      - #[derive(Component, Reflect, Serialize, Deserialize)]
        struct Position { x: f32, y: f32 }
      - #[derive(Component, Reflect, Serialize, Deserialize)]
        struct Velocity { vx: f32, vy: f32, max_speed: Option<f32> }
      - Health, Stamina, Damageable, Collider, Tile, OreVein, Inventory, Tool, Faction, SpriteRef, Light, SoundEmitter, UiState mirror fields and names (snake_case -> snake_case)
- Resources
  - JS named resources ↔ Bevy Resources via .insert_resource(...)
  - Examples: GameTime, InputMap, AssetIndex
- Events
  - JS bus types ↔ Bevy Events
    - struct MineHitEvent { pos: Vec2, tool: ToolId, power: f32 }
    - struct DamageEvent { target: Entity, amount: i32, kind: DamageKind }
    - struct FootstepEvent { entity: Entity, pos: Vec2 }
    - struct PlaySfxEvent { id: SfxId, pos: Option<Vec2> }
    - struct UiCommand { cmd: String, payload: serde_json::Value }
  - Configure with App::add_event::<...>() and systems to write/read.
- Systems and Scheduling
  - JS Stages ↔ a custom Bevy set that mirrors order:
    - Define: #[derive(SystemSet, Debug, Hash, PartialEq, Eq, Clone)]
      enum FarMineCoreSet { Input, PrePhysics, Gameplay, Events, RenderPrep }
    - Chain with .configure_sets((
        FarMineCoreSet::Input,
        FarMineCoreSet::PrePhysics.after(FarMineCoreSet::Input),
        FarMineCoreSet::Gameplay.after(FarMineCoreSet::PrePhysics),
        FarMineCoreSet::Events.after(FarMineCoreSet::Gameplay),
        FarMineCoreSet::RenderPrep.after(FarMineCoreSet::Events),
      ))
  - Determinism: Prefer queries without parallel mutation; optionally sort entities by id for iteration if exact parity needed during validation runs.
- Notes
  - The JS registry is the algorithmic reference and test harness; production slice uses Bevy ECS.
  - Event/type names stable per P4; keep asset/event id parity (bridge doc TBD).


## 12) Risks & Assumptions

- Risk: Over-prescriptive schemas vs runtime needs.
  - Mitigation: Optional fields remain lax; validate in dev only; clamp/null-guard in prod.
- Risk: Query perf hotspots beyond 50k entities.
  - Mitigation: Stage-local driver selection, counters for visibility; future archetype optimizer or columnar typed arrays.
- Assumption: Component and event ids in P4 remain stable through Sprint 1.
- Assumption: Single-threaded tick; no inter-stage parallelism in MVP.


## 13) Acceptance Checklist

- Entities, Components, Systems, World/Registry, Event Bus, Queries, Scheduling documented.
- Public API mirrors src/core/ecs-registry.js:
  - create/destroy/isAlive
  - add/remove/get/has
  - setSchemas/schemas
  - view(each/size)
  - register/tick (dt clamp)
  - resources get/set/has
  - EventBus (emit/drain/clear)
  - counters (inc/resetCounters)
  - dev-only getDebugStore
- Stages export: { Input, PrePhysics, Gameplay, Events, RenderPrep }
- EventTypes export constants present.
- MovementSystem reference described (integration, guards, optional footstep cooldown via _ephemeral).
- Component set enumerated with stable names and fields.
- System scheduling and determinism defined.
- Queries detail driver selection and counters.
- Example usage provided.
- Performance target and bench outline provided.
- Testing plan enumerated.
- Bevy mapping appendix included.

Forged and signed,
— Ironforge Stonebeard, Core Systems Engineer