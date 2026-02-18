# The Far Mine — Core ECS Architecture v0.1 (Sprint 1)

Owner: Ironforge Stonebeard (Alpha)  
Version: 0.1 — 2026-02-18

## 1) Title & Scope

Scope: Define Entities, Components, Systems, World, Event Bus, Queries, and Scheduling for the MVP vertical slice. Targets:
- JS prototype: engine-agnostic registry used by Movement demo.
- Rust/Bevy: Bevy-oriented contracts and mappings for monorepo integration.

This document is implementation-ready for Sprint 1, with determinism, SoA storage, and minimal allocations as first-class goals.

## 2) Design Principles

- Determinism-first: eid-ascending iteration order for views; stable filter composition.
- Minimal allocations in hot loops: pre-sized buffers, ring-buffers for events, SoA storage.
- Data-oriented layout: dense arrays per component; sparse maps for eid→index; free-list for entity slots.
- Stable component schemas: snake_case names; field clamps; DEV=reject invalid, PROD=clamp+warn.
- Clear API surface:
  - Entities: create, destroy, isAlive.
  - Components: add, remove, get, has.
  - Systems: register per stage, tick(dt).
- No hidden globals: systems get world/registry via parameters only.
- Instrumentation hooks: microprofiler counters, timing per stage; snapshot plan for save/load.

## 3) Core Types and Concepts

- Entity
  - Opaque eid: Rust u32; JS number (32-bit safe).
  - Lifecycle: alive | pending_destroy (destroy applied at stage barrier).
  - Allocation: free-list reuse to avoid fragmentation; monotonic eid counter for new slots.

- Component
  - snake_case names; reflectable schema defined in data/core/component-schemas.json.
  - Validation: field-level clamps; DEV throws on invalid; PROD clamps to bounds + logs warn(code, eid, component, field).
  - Storage: SoA dense arrays per field whenever feasible; otherwise AoS fallback acceptable in JS for simplicity.

- System
  - Pure function: fn(world, dtSec) → void. No hidden state; use Resources for shared state.
  - Inputs: Registry (entities + components), Resources, EventBus, dtSec (clamped [0..1]).
  - Scheduling: staged fixed order in MVP; long-term read/write sets for conflict-aware ordering.

- World
  - Composition: { registry, resources, eventBus, profiler }.
  - Resources: typed singletons (GameTime, InputMap, AssetIndex).
  - EventBus: intra-tick ring buffers; consumption within same or next tick.

- Resources
  - Access pattern: getResource(name) returns read-only or mutable object; mutation discipline documented per resource.
  - Examples:
    - GameTime { frame: u64, dtSec: f32, fixedStepSec: f32 }
    - InputMap { axes, buttons, lastDevice }
    - AssetIndex { sprites: Map<string, SpriteMeta>, colors: Map<string, Color>, sfx: Map<string, SfxMeta> }

## 4) Component Set (MVP) — Schemas and Fields

Cross-ref: data/core/component-schemas.json (authoritative for runtime checks and toolchain codegen).

General defaults: unless stated, numbers default to 0, strings to "", enums to first variant, flags to 0.

- Position { x: f32, y: f32, dir_deg: f32 }
  - Clamps: x,y finite; dir_deg normalized to [0,360).
  - Defaults: x=0, y=0, dir_deg=0.

- Velocity { vx: f32, vy: f32, max_speed: f32 }
  - Clamps: vx,vy finite; max_speed ≥ 0; on add/update clamp sqrt(vx^2+vy^2) to max_speed (if max_speed>0).
  - Defaults: vx=0, vy=0, max_speed=8.0.

- Collider (AABB) { w: f32, h: f32, flags: u32 }
  - Clamps: w ∈ (0, 1024], h ∈ (0, 1024]; flags as bitmask U32.
  - Defaults: w=1, h=1, flags=0.

- Tile { kind: enum("rock","floor","ore.copper","ore.iron","ore.quartz"), hardness: u8, flags: u32 }
  - Clamps: hardness ∈ [0,255]; flags U32.
  - Defaults: kind="rock", hardness=100, flags=0.

- OreVein { ore_id: string, richness: u8 }
  - Clamps: ore_id non-empty in PROD coerced to "", DEV reject empty; richness ∈ [0,255].
  - Defaults: ore_id="", richness=0.

- Health { max: i32, value: i32 }
  - Clamps: max ∈ [1, 1_000_000]; value ∈ [0, max].
  - Defaults: max=100, value=100.

- Stamina { max: i32, value: i32, regen_per_sec: f32, guard_break_ms: i32 }
  - Clamps: max ∈ [1, 100_000]; value ∈ [0, max]; regen_per_sec ∈ [0, 1_000]; guard_break_ms ∈ [0, 60_000].
  - Defaults: max=100, value=100, regen_per_sec=10, guard_break_ms=0.

- Inventory { slots: array<Slot>, capacity: u16 }
  - MVP Slot = { item_id: string, qty: u16 } (flat bag). Future: grid with stacks/weights.
  - Clamps: capacity ∈ [0, 1000]; slots.length ≤ capacity; qty ∈ [0, 65535]; empty item_id implies slot removal in PROD, DEV reject.
  - Defaults: slots=[], capacity=20.

- Tool { tool_id: string, mining_power: i32, stamina_per_swing: i32, durability: i32, durability_max: i32 }
  - Clamps: tool_id non-empty (DEV required); mining_power ∈ [0, 1_000_000]; stamina_per_swing ∈ [0, 10_000];
    durability_max ∈ [0, 1_000_000]; durability ∈ [0, durability_max].
  - Defaults: tool_id="", mining_power=0, stamina_per_swing=0, durability=0, durability_max=0.

- Damageable { armor: i32, poise_max: i32, poise_value: i32, poise_recover_per_sec: f32 }
  - Clamps: armor ∈ [0, 1_000_000]; poise_max ∈ [0, 1_000_000]; poise_value ∈ [0, poise_max];
    poise_recover_per_sec ∈ [0, 10_000].
  - Defaults: armor=0, poise_max=100, poise_value=100, poise_recover_per_sec=30.

- Faction { id: enum("player","goblin","burrower") }
  - Clamps: enum membership.
  - Defaults: id="player".

- SpriteRef { sprite_id: string, tint_token: string }
  - Clamps: sprite_id exists in AssetIndex.sprites in PROD warn-on-miss; tint_token exists in AssetIndex.colors else "white".
  - Defaults: sprite_id="", tint_token="white".

- Light { radius: f32, intensity: f32, color_token: string }
  - Clamps: radius ∈ [0, 64]; intensity ∈ [0, 8]; color_token in AssetIndex.colors else "white".
  - Defaults: radius=0, intensity=0, color_token="white".

- SoundEmitter { id: string, spatial: bool }
  - Clamps: id exists in AssetIndex.sfx else warn; spatial as boolean.
  - Defaults: id="", spatial=true.

- UIState { hud_mode: enum("default","inventory","menu") }
  - Clamps: enum membership.
  - Defaults: hud_mode="default".

## 5) Event Bus

Event types (P4-aligned):
- MineHitEvent { pos: {x,y}, tool: string, power: i32 }
- DamageEvent { source: eid|0, target: eid, amount: i32, type: enum("blunt","slash","pierce","mine") }
- FootstepEvent { entity: eid, material: enum("stone","dirt","metal") }
- PlaySfxEvent { tag: string, pos: {x,y}|null }
- UiCommand { action: string, payload: any }

Model:
- Per-type ring-buffer (capacity configurable; default 1024 per frame). Emit order preserved within a stage.
- Consumption: readers drain within same tick or next tick; buffers auto-cleared at end of tick after drains.
- Ordering guarantees: stage-level then emit order within stage; cross-stage order not guaranteed.
- Latency-sensitive audio: prefer emitting PlaySfxEvent in Events/Audio Bridge stage for immediate playback.

JS prototype API:
- bus.emit(eventType: string, payload: any): void
- bus.drain(eventType: string, fn: (event) => void): void

Bevy mapping:
- Use bevy::ecs::event::Events<T>.
- Systems read/write Events<T> with stage ordering mirroring JS stages.
- For audio bridge, ensure PlaySfxEvent writer runs before audio system in Update.

## 6) Queries & Views

API pattern:
- registry.view(["position","velocity"]).each((eid, pos, vel) => { /* eid-ascending */ })

Variants:
- with(names[]): entities having all components in names.
- without(names[]): exclude entities with these components.
- Optional: include eid-only view for counting or tagging.

Filter composition:
- Deterministic iteration: sort by eid ascending; internal dense index stable per tick.
- Views precompute entity list at view creation; avoid heap in each().

Perf notes:
- Storage: per-component dense arrays (SoA): fields as Float32Array/Int32Array in JS where applicable.
- Indexing: sparse map eid→denseIndex; tombstones for removals; compaction outside hot path.
- Entities: free-list for vacant eids; capacity grows geometrically.

## 7) Scheduling & Stages

Stages (MVP fixed order):
1) Input
2) PrePhysics (movement integration)
3) Gameplay (combat, ai)
4) Events/Audio Bridge
5) Render Prep

Determinism:
- Fixed stage order; within each stage, systems run in list order.
- Long-term: systems declare readSet/writeSet (components/resources) for planner; MVP uses explicit order.

Example MVP order:
1) InputSystem
2) MovementSystem
3) CombatTimingSystem (stamina/poise regen/decay)
4) MiningSystem (tile interactions)
5) EventBridge(Audio)
6) RenderSync

## 8) Public API (JS Prototype)

Entities:
- createEntity(): number
- destroyEntity(eid: number): void
- isAlive(eid: number): boolean

Components:
- add(eid: number, name: string, data: object): void
- remove(eid: number, name: string): void
- get<T=any>(eid: number, name: string): T|null  // returns live reference where safe
- has(eid: number, name: string): boolean

Systems:
- register(stage: string, fn: (world, dtSec: number) => void): void
- tick(dtSec: number): void  // clamps dtSec ∈ [0,1]

Events & Resources:
- world.eventBus.emit(type: string, payload: any): void
- world.eventBus.drain(type: string, fn: (e:any)=>void): void
- setResource(name: string, obj: any): void
- getResource<T=any>(name: string): T|null

Errors & clamps:
- DEV: schema mismatch throws; invalid fields rejected.
- PROD: fields clamped to bounds; warn logged; counters incremented (Validation.clamps).

Example:
```js
// Setup
const world = makeWorld({ env: "DEV" });
const { registry, eventBus } = world;

// Create player
const player = registry.createEntity();
registry.add(player, "position", { x: 0, y: 0, dir_deg: 0 });
registry.add(player, "velocity", { vx: 1, vy: 0, max_speed: 5 });

// Register systems
world.register("PrePhysics", (w, dt) => {
  w.registry.view(["position","velocity"]).each((eid, pos, vel) => {
    pos.x += vel.vx * dt;
    pos.y += vel.vy * dt;
    if ((Math.abs(vel.vx) + Math.abs(vel.vy)) > 0) {
      w.eventBus.emit("FootstepEvent", { entity: eid, material: "stone" });
      w.profiler.count("Movement.iterations", 1);
    }
  });
});

world.register("Events/Audio Bridge", (w) => {
  w.eventBus.drain("FootstepEvent", (e) => {
    w.eventBus.emit("PlaySfxEvent", { tag: "footstep.stone", pos: w.registry.get(e.entity,"position") });
  });
});

// Tick
world.tick(1/60);
```

## 9) Example Snippets

- Player + Movement + Footstep
```js
const eid = registry.createEntity();
registry.add(eid, "position", { x: 2, y: 2, dir_deg: 90 });
registry.add(eid, "velocity", { vx: 2, vy: 0, max_speed: 6 });

function MovementSystem(w, dt) {
  w.registry.view(["position","velocity"]).each((id, pos, vel) => {
    // Clamp speed
    const s2 = vel.vx*vel.vx + vel.vy*vel.vy;
    const ms = vel.max_speed;
    if (ms > 0 && s2 > ms*ms) {
      const s = Math.sqrt(s2);
      vel.vx = vel.vx * (ms / s);
      vel.vy = vel.vy * (ms / s);
    }
    pos.x += vel.vx * dt;
    pos.y += vel.vy * dt;

    if ((pos.x|0) % 1 === 0) {
      w.eventBus.emit("FootstepEvent", { entity: id, material: "stone" });
    }
  });
}
world.register("PrePhysics", MovementSystem);
```

- Damage path
```js
// CombatTimingSystem (simplified)
world.register("Gameplay", (w, dt) => {
  w.eventBus.drain("DamageEvent", (e) => {
    const health = w.registry.get(e.target, "health");
    const dmg = Math.max(0, e.amount); // armor calc could be elsewhere
    if (health) {
      health.value = Math.max(0, Math.min(health.max, health.value - dmg));
      if (health.value === 0) {
        // future: DeathEvent
      }
    }
  });
});

// Somewhere else (e.g., MiningSystem hits burrower)
w.eventBus.emit("DamageEvent", { source: player, target: enemy, amount: 12, type: "blunt" });
```

## 10) Determinism & Performance Targets

- Acceptance: 10k entities × 3 simple components; 3 trivial systems at ≥60 Hz on dev laptop.
- Iteration:
  - eid-sorted view drivers; no dependence on insertion order.
  - Zero heap in hot loops: reuse temporary vectors, drain events with preallocated iterators.
  - NaN guards: reject or coerce to 0 in DEV; clamp in PROD.
  - dt clamp: [0..1]; if >1, set to 1 and warn once per second.
- Microprofiler counters (examples):
  - Movement.iterations
  - Events.emitted.{Type}
  - Events.dropped.{Type}
  - Query.matches.{viewSig}
  - Validation.clamps
  - Stage.time_ms.{StageName}

## 11) Testing & Benchmark Plan

Unit tests:
- Entities: create/destroy/isAlive; reuse of freed eids.
- Components: add/remove/get/has; schema validation; clamp behavior DEV vs PROD.
- Views: with/without/exclude composition; eid-ascending order; stable iteration under removals.
- Movement integration: position updates; max_speed clamp; NaN guard.
- Event round-trip: emit→drain within same tick; cross-tick persistence; overflow handling.
- Snapshot: count of entities and component cardinality round-trip.

Benchmark harness:
- Spawn 10k entities with Position+Velocity+SpriteRef.
- Register 3 NOP systems + MovementSystem.
- Run 120 frames; collect ms/frame median/p95; counters for iterations and emitted events.
- Pass criteria: ≥60 FPS average; no allocations in hot loop (tracked by alloc counter where available).

## 12) Integration Notes — Rust/Bevy

Components mapping (JS ↔ Rust):
- Types mirror schemas; numeric ranges enforced via smart constructors or system clamps.
- Derives: #[derive(Component, Reflect, Debug, Clone)] with #[reflect(Component)] for editor tools.
- Example:
  - JS Position {x,y,dir_deg} ↔ Rust struct Position { pub x: f32, pub y: f32, pub dir_deg: f32 }
- Flags as u32 bitmasks; enums as Rust enums with Reflect + Serialize/Deserialize.

Events:
- Map to bevy::ecs::event::Events<T> per type (MineHitEvent, DamageEvent, FootstepEvent, PlaySfxEvent, UiCommand).
- System ordering: place Movement in CoreSchedule::FixedUpdate; audio bridge in Update after gameplay.

Scheduling:
- JS Stages ↔ Bevy sets:
  - Input → PreUpdate
  - PrePhysics → FixedUpdate
  - Gameplay → Update (or FixedUpdate if tight coupling)
  - Events/Audio Bridge → PostUpdate (before audio)
  - Render Prep → Last/Render-prep plugin boundary

Serialization:
- serde + bevy_reflect for save/load; stable field names match snake_case schema.
- Asset/token resolution via AssetIndex resource (handles SpriteRef.tint_token, Light.color_token).

## 13) Appendix A — Python Prototype Hooks (optional)

```python
class World:
    def __init__(self):
        self.registry = Registry()
        self.resources = {"GameTime": {"frame":0,"dtSec":0.0}}
        self.event_bus = EventBus()
        self.systems = {"Input":[], "PrePhysics":[], "Gameplay":[], "Events/Audio Bridge":[], "Render Prep":[]}

    def register(self, stage, fn): self.systems[stage].append(fn)

    def tick(self, dt):
        dt = max(0.0, min(1.0, float(dt)))
        self.resources["GameTime"]["dtSec"] = dt
        for stage in ["Input","PrePhysics","Gameplay","Events/Audio Bridge","Render Prep"]:
            for fn in self.systems[stage]:
                fn(self, dt)
        self.event_bus.end_tick()
```

## 14) Risks & Mitigations

- Risk: Schema over-prescription vs runtime needs (e.g., Inventory shape).
  - Mitigation: MVP flat bag + clamps; evolve with versioned schema; migration helpers.

- Risk: Cross-runtime JSON import quirks.
  - Mitigation: Strict ESM in JS; no import assertions in MVP; loaders accept plain fetch/serde; validate against component-schemas.json.

- Risk: Perf regression under large mixed archetypes.
  - Mitigation: Dense SoA storage; view filters to minimize cache misses; profile hot spots and batch systems; add archetype-aware iteration if needed.

- Risk: Event overflow (ring-buffer full).
  - Mitigation: Track Events.dropped counters; size buffers based on profiling; back-pressure or coalescing for spammy events.

- Risk: Non-determinism from floating math differences across runtimes.
  - Mitigation: Clamp dt; avoid transcendental ops in hot loops; prefer integer grid ops where possible for gameplay-critical paths.

— Ironforge Stonebeard, forging systems stout and sturdy for The Far Mine.