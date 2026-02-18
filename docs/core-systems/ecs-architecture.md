# The Far Mine — Core ECS Architecture (Sprint 1)

Author: Ironforge Stonebeard (Alpha)  
Version: Draft v0.1 — 2026-02-18  
Status: Draft v0.1

Scope: MVP vertical slice (Mine L1) focusing on Entities, Components, Systems, World/Registry, Event Bus, Queries, and Scheduling. Runtime target: Bevy (Rust) for the executable, with an engine-agnostic registry API mirrored in src/core/ecs-registry.js for tests and tools.

---

## 2) Goals & Constraints

- Performance:
  - Instantiate 10,000 entities with 3 simple components.
  - Run 3 trivial systems at >= 60 Hz on a dev laptop.
- Determinism:
  - Query iteration is eid-ascending.
  - Per-event-type FIFO ordering within a tick.
- Stability and naming:
  - snake_case component names.
  - Events end with Event; plugins end with Plugin.
  - Tile size: 16 px; 1.0 world unit per tile.
- Serialization:
  - Plan to leverage serde + bevy_reflect for seeds/player state, mapping one-to-one with JS registry schemas for tools.

---

## 3) Core Concepts & Data Model

- Entities:
  - 32-bit integer-like ids (eid: u32).
  - Created/destroyed via registry; reuse ids via a freelist to avoid unbounded growth.
- Components (MVP set, plain data, minimal validation):
  - position, velocity, collider (AABB), tile, ore_vein, health, stamina, damageable, inventory, tool, faction, sprite_ref, light, sound_emitter, ui_state.
  - Data-only; validation limited to light dev checks (range/type).
- Resources (registry/world named singletons):
  - game_time (secs, tick count), input_map (actions/axes), asset_index (lookup for sprites, sfx, colors), plus per-system scratch if needed.
- Events (payload sketches, intended routing):
  - MineHitEvent { pos: {x,y}, tool: {tool_id,tier}, power: f32, target_tile?: {tx,ty} }
    - Routed to mining logic; bridged to audio for impacts.
  - DamageEvent { source_eid?: u32, target_eid: u32, amount: i32, kind?: string }
    - Routed to combat/damageable; may spawn VFX telegraph.
  - FootstepEvent { eid: u32, pos: {x,y}, surface?: string }
    - Routed to audio bridge for footstep SFX; optional surface inferred via tile.
  - PlaySfxEvent { key: string, pos?: {x,y}, volume?: f32 }
    - Routed directly to AudioEventBridge (asset_index resolves key).
  - UiCommand { kind: string, payload?: any, target?: string }
    - Routed to UI bridge (menus/HUD).

---

## 4) Storage Strategy (MVP)

- Per-component dense store:
  - Arrays: ids[]: u32, data[]: T, and index: Map<u32, usize> (eid → dense index).
  - Add: push eid + data; index[eid] = last_index.
  - Remove: swap-remove from end; update moved eid’s index.
  - Get/Has: O(1) via index.
- Deterministic iteration:
  - Each store maintains lazy sortedIds snapshot: Vec<u32>, invalidated on add/remove.
  - On first query requiring this store per tick, rebuild snapshot (ids.clone() then sort ascending).
  - Query iteration always uses the driver store’s sortedIds; multi-store filters preserve driver order.
- Evolution notes:
  - If/when component counts grow and cache misses dominate, consider archetype/SoA or sparse-set with chunked SoA per archetype. Keep API stable to swap storage under the hood post-alpha.

---

## 5) Public API Surface (Registry)

Engine-agnostic JS-like API mirrored by src/core/ecs-registry.js for tests/tools. Bevy runtime provides equivalent semantics (Appendix A).

- Entity lifecycle:
  - createEntity(): u32
  - destroyEntity(eid: u32): boolean
  - isAlive(eid: u32): boolean
- Components:
  - add(eid: u32, compName: string, data: object): void
  - remove(eid: u32, compName: string): boolean
  - get(eid: u32, compName: string): object | null
  - has(eid: u32, compName: string): boolean
- Queries:
  - view(include: string[], exclude?: string[]): Iterable<[eid: u32, ...components]>
    - Driver selection: choose smallest include store (min length) for performance.
    - Iterate driver.sortedIds (eid-ascending); for each eid, ensure presence of remaining include comps and absence of exclude comps.
    - Yield [eid, components...] where components are in the same order as include list.
- Systems and scheduling:
  - register(stage: StageName, systemFn: (reg, dt) => void, opts?: { name?: string, after?: string[], before?: string[] }): void
  - tick(dtSec: number): void
    - dt clamped to [0.0, 0.1] seconds.
    - Executes stages in fixed order (see Scheduling).
- Schemas and debug:
  - setSchemas(map: Record<string, Schema>): void
  - getDebugStore(name: string): { count: number, ids: u32[], dirty: boolean } | null
- Resources:
  - setResource<T>(name: string, value: T): void
  - getResource<T>(name: string): T | null
  - hasResource(name: string): boolean
- Event bus:
  - bus.emit<T>(type: string, payload: T): void
  - bus.drain<T>(type: string): T[]   // FIFO snapshot and clear
  - bus.clear(type?: string): void
- Counters (for tests/benchmarks):
  - getCounters(): Record<string, number>
  - resetCounters(): void
  - incCounter(name: string, by?: number): void
- Dev vs prod:
  - Dev mode: light schema/type checks and console warnings; registry never throws on component ops (returns false/null on failure).
  - Prod mode: minimal checks; same no-throw contract.

StageName is one of: "Input", "PrePhysics", "Gameplay", "Events", "RenderPrep".

---

## 6) Scheduling & Stages

Stage order (global, stable):

1) Input
   - Gather/normalize inputs; update input_map resource; emit UiCommand as needed.
2) PrePhysics
   - Movement integration, simple collision pre-pass, constraints.
3) Gameplay
   - Combat, mining, AI, stamina/regen.
4) Events
   - Deterministic drain/bridge of events to subsystems (audio, UI, VFX bridges).
5) RenderPrep
   - Sprite selection, lighting buffer prep, render-layer sorting.

Ordering guarantees:
- Stages execute strictly in the above order per tick.
- Within a stage, systems can express local ordering via opts.after/opts.before (acyclic). Absent constraints, insertion order is used.
- Systems should avoid cross-stage side effects; emit events or set resources instead. E.g., PrePhysics should not mutate sprite_ref; instead write data or events consumed in RenderPrep.

---

## 7) Reference Systems & Hooks (MVP)

- MovementSystem (PrePhysics):
  - Query: [position, velocity]
  - position += velocity * dt.
  - If velocity.max_speed is present, clamp speed to <= max_speed (Euclidean).
  - Guard against NaN/Inf: if detected, zero velocity and skip movement; dev log.
  - FootstepEvent emission:
    - Maintain per-entity cooldown (e.g., 0.35s walking cadence) via an ephemeral cache Map<eid, t_next>. Store in registry resource "footstep_cooldowns".
    - Emit FootstepEvent { eid, pos, surface? } when current time >= t_next and |velocity| > epsilon.
- Mining hook sketch:
  - Any system detecting a mining action emits MineHitEvent { pos, tool, power, target_tile } during Gameplay.
  - OreVein/Tile interaction:
    - Tile hardness/tool_tier gate for breaking; OreVein hardness reduces effective power.
    - On break: emit PlaySfxEvent with key from asset_index; spawn inventory loot via InventorySystem (deferred).
- Combat hooks sketch:
  - Input/AI triggers emit DamageEvent { source_eid, target_eid, amount, kind } in Gameplay.
  - Damage processing system:
    - Reads damageable, health; applies defense; reduces health.current; may emit UiCommand on death/low HP, and telegraph events for VFX.
  - Stamina/poise:
    - Integration points only; defer deeper logic to Gamma’s combat spec (consume stamina on heavy actions; regenerate in Gameplay; emit telegraph tokens).

---

## 8) Component Schemas (MVP fields)

Validation: Dev-only range/type checks; Prod: trust data. Cross-team contracts noted.

- position { x: f32, y: f32 }
  - x,y in world units. No validation beyond finite numbers.
- velocity { vx: f32, vy: f32, max_speed?: f32 }
  - Optional max_speed >= 0.0 if present.
- collider { half_w: f32, half_h: f32, solid: bool }
  - half_w/half_h > 0; AABB centered on position; solid toggles collision.
- tile { code: i32, hardness: f32, tool_tier: "t0|t1|t1_5|t2" }
  - code from tile atlas; hardness >= 0; tool_tier aligns with data/mining/tools.json.
- ore_vein { kind: "copper|iron|quartz", hardness: f32 }
  - kind matches data/mining/ore.json; hardness >= 0.
- health { current: i32, max: i32 }
  - 0 <= current <= max; on current <= 0, entity considered dead for combat systems.
- stamina { current: f32, max: f32, regen_per_sec: f32 }
  - Clamp current to [0,max]; regen_per_sec >= 0.
- damageable { defense: i32, faction_mask?: u32 }
  - defense >= 0; faction_mask bitfield compatible with faction routing.
- inventory { capacity: u8, slots?: [item_id|null] }
  - capacity <= small MVP cap (e.g., 16); if slots provided, length <= capacity; item_id per data/items/index.json.
- tool { tool_id: string, tier: u8, mining_power?: f32 }
  - tool_id matches data/tools/index.json; tier consistent with tile.tool_tier; mining_power >= 0 if present.
- faction { id: string }
  - id aligns with data/combat/factions.json; used with damageable.faction_mask.
- sprite_ref { sprite_id: string, tint_token?: string }
  - sprite_id resolves via asset_index.sprites; tint_token from data/visual/color-palette.json.
- light { radius: f32, intensity: f32, color_token: string }
  - radius >= 0; intensity in [0,1.5]; color_token per color-palette.json.
- sound_emitter { radius: f32, spatial: bool }
  - radius >= 0; spatial true for positional attenuation.
- ui_state { state: string }
  - state keys agreed with UI team (Eta), e.g., "hud", "menu_pause", etc.

---

## 9) Event Bus & Bridges

- Event bus:
  - Per-type FIFO queues; emit enqueues, drain returns a snapshot array in FIFO order and clears the queue.
  - Deterministic within a tick; no persistence across ticks unless a system re-emits/retains by copying to a resource.
- Bridges (Events stage):
  - AudioEventBridge:
    - FootstepEvent → resolve surface → PlaySfxEvent triggerKeys via asset_index.sfx. 
    - PlaySfxEvent → runtime audio engine (pos/volume optional).
  - Combat/Telegraph VFX bridge:
    - DamageEvent (pre-hit/post-hit) → telegraph.arc tokens for VFX system.
  - UI bridge:
    - UiCommand → route to UI layer (Eta), targets like "hud", "menu", "notif".
- Mapping tables:
  - Placeholders referencing Zeta’s audio map (data/audio/map.json) and Eta’s UI command spec (docs/ui/commands.md). Clamp unknown keys in dev with warnings; noop in prod.

---

## 10) Testing & Benchmark Plan (MVP)

- Unit tests (JS registry):
  - Entities: create/destroy/isAlive; reuse ids via freelist.
  - Components: add/remove/get/has; remove on destroyEntity; get returns null for missing.
  - Queries: view(include/exclude) determinism; ascending eid order; include order respected in payload.
  - Systems: MovementSystem integration updates position; NaN guards; max_speed clamp.
  - Events: emit/drain FIFO counts; per-type isolation; clear behavior.
- Benchmark harness:
  - Spawn 10,000 entities with position+velocity+health.
  - Register MovementSystem + 2 trivial systems (no-ops reading components).
  - Run for 3 seconds wall time; record average Hz (ticks/sec) and per-system invocation counters.
  - Acceptance: >= 60 Hz on dev laptop; log counters to console; assert determinism (stable first/last eids).

---

## 11) Risks & Assumptions

- Inventory shape may be too prescriptive; keep capacity-only semantics now; slots optional and not required by systems in Sprint 1.
- Event payload strings (materials, tokens) must align with data files; add dev-time clamps and logs for unknown keys.
- JSON tooling/import quirks vary; keep schemas flat and loader-friendly; avoid nested enums beyond strings for MVP.

---

## 12) Appendix A — Bevy Mapping (Rust)

- Schedule mapping:
  - Input → PreUpdate
  - PrePhysics → FixedUpdate (or a custom Schedule "PrePhysics" inserted before Update if FixedUpdate cadence mismatches)
  - Gameplay → Update
  - Events → PostUpdate
  - RenderPrep → Last (or a custom "RenderPrep" before Render)
- Components:
  - Rust structs mirroring schemas with derives:
    - #[derive(Component, Reflect, Serialize, Deserialize, Default, Clone)]
    - Register types with app.register_type::<T>() for reflect.
- Events:
  - Bevy Event<T> types: MineHitEvent, DamageEvent, FootstepEvent, PlaySfxEvent, UiCommand.
  - Add via app.add_event::<T>() and systems consuming EventReader<T>, producing via EventWriter<T>.
- Resources:
  - game_time: Resource with elapsed_seconds, tick_count.
  - input_map, asset_index as Resources with reflective serialization as needed.
- Plugin:
  - CoreEcsPlugin:
    - Adds resources, registers components for reflect, adds events.
    - Adds systems to appropriate schedules in the specified order using bevy’s system ordering (in_base_set, before/after labels).
- Save/Load:
  - Use bevy_reflect + serde (bevy_reflect::serde) for seeds/player state snapshots.
  - Maintain schema parity with JS registry for tools; JS remains for tests/tools; Rust/Bevy is authoritative runtime.

---

## 13) Appendix B — Usage Snippets

Pseudocode (JS registry usage):
```
const reg = createRegistry();
reg.setSchemas({
  position: { x: 'f32', y: 'f32' },
  velocity: { vx: 'f32', vy: 'f32', max_speed: '?f32' },
  health:   { current: 'i32', max: 'i32' },
  // ...
});

// MovementSystem
function movementSystem(reg, dt) {
  const now = (reg.getResource('game_time')?.secs) ?? 0;
  const cooldowns = reg.getResource('footstep_cooldowns') ?? new Map();
  if (!reg.hasResource('footstep_cooldowns')) reg.setResource('footstep_cooldowns', cooldowns);

  for (const [eid, pos, vel] of reg.view(['position', 'velocity'])) {
    let vx = vel.vx, vy = vel.vy;
    if (!Number.isFinite(vx) || !Number.isFinite(vy)) { vel.vx = 0; vel.vy = 0; continue; }

    const speed = Math.hypot(vx, vy);
    if (vel.max_speed != null && speed > vel.max_speed && speed > 0) {
      const s = vel.max_speed / speed;
      vx *= s; vy *= s;
      vel.vx = vx; vel.vy = vy;
    }

    pos.x += vx * dt;
    pos.y += vy * dt;

    if (Math.hypot(vx, vy) > 0.2) {
      const next = cooldowns.get(eid) ?? 0;
      if (now >= next) {
        reg.bus.emit('FootstepEvent', { eid, pos: { x: pos.x, y: pos.y } });
        cooldowns.set(eid, now + 0.35);
      }
    }
  }
}

reg.register('PrePhysics', movementSystem);

// Spawn a mover
const e = reg.createEntity();
reg.add(e, 'position', { x: 0, y: 0 });
reg.add(e, 'velocity', { vx: 1, vy: 0, max_speed: 4 });

reg.setResource('game_time', { secs: 0, ticks: 0 });
for (let i = 0; i < 5; i++) {
  const t = reg.getResource('game_time');
  t.secs += 0.016; t.ticks++;
  reg.tick(0.016);
}

// Drain footsteps (Events stage bridge would normally do this)
const steps = reg.bus.drain('FootstepEvent'); // FIFO
console.log('footsteps', steps.length);
```

Example Bevy Rust snippets:

Components:
```rust
use bevy::prelude::*;
use bevy::reflect::Reflect;
use serde::{Serialize, Deserialize};

#[derive(Component, Reflect, Serialize, Deserialize, Default, Clone)]
#[reflect(Component)]
pub struct Position { pub x: f32, pub y: f32 }

#[derive(Component, Reflect, Serialize, Deserialize, Default, Clone)]
#[reflect(Component)]
pub struct Velocity { pub vx: f32, pub vy: f32, pub max_speed: Option<f32> }

#[derive(Event, Default, Clone)]
pub struct FootstepEvent { pub eid: u32, pub x: f32, pub y: f32 }
```

Movement system and registration:
```rust
fn movement_system(
  time: Res<Time>,
  mut q: Query<(&mut Position, &mut Velocity)>,
  mut steps: EventWriter<FootstepEvent>,
) {
  let dt = time.delta_seconds().clamp(0.0, 0.1);
  for (mut pos, mut vel) in q.iter_mut() {
    let mut vx = vel.vx; let mut vy = vel.vy;
    if !vx.is_finite() || !vy.is_finite() { vel.vx = 0.0; vel.vy = 0.0; continue; }

    let speed = (vx * vx + vy * vy).sqrt();
    if let Some(max_s) = vel.max_speed {
      if speed > max_s && speed > 0.0 {
        let s = max_s / speed; vx *= s; vy *= s; vel.vx = vx; vel.vy = vy;
      }
    }

    pos.x += vx * dt; pos.y += vy * dt;

    if (vx*vx + vy*vy) > 0.04 {
      // EID retrieval depends on how you map entity ids; placeholder 0 for snippet
      steps.send(FootstepEvent { eid: 0, x: pos.x, y: pos.y });
    }
  }
}

pub struct CoreEcsPlugin;
impl Plugin for CoreEcsPlugin {
  fn build(&self, app: &mut App) {
    app
      .register_type::<Position>()
      .register_type::<Velocity>()
      .add_event::<FootstepEvent>()
      .add_systems(PreUpdate, () /* input systems */)
      .add_systems(FixedUpdate, movement_system) // PrePhysics
      .add_systems(Update, () /* gameplay systems */)
      .add_systems(PostUpdate, () /* event bridges */)
      .add_systems(Last, () /* render prep */);
  }
}
```

---

## 1) Title & Metadata

- Title: The Far Mine — Core ECS Architecture (Sprint 1)
- Author: Ironforge Stonebeard (Alpha), Version/Date: Draft v0.1 — 2026-02-18, Status: Draft v0.1
- Scope: MVP vertical slice (Mine L1) with focus on Entities, Components, Systems, World/Registry, Event Bus, Queries, Scheduling. Targets Bevy (Rust) as runtime, but presents an engine-agnostic registry API (mirrors src/core/ecs-registry.js) for tests and tools.

---

## 4.5) Storage Pseudocode (JS registry internals, reference)

```
class DenseStore {
  constructor() { this.ids = []; this.data = []; this.index = new Map(); this.sorted = []; this.dirty = false; }
  add(eid, comp) {
    if (this.index.has(eid)) return false;
    const i = this.ids.length;
    this.ids.push(eid); this.data.push(comp); this.index.set(eid, i);
    this.dirty = true; return true;
  }
  remove(eid) {
    const i = this.index.get(eid); if (i === undefined) return false;
    const last = this.ids.length - 1;
    const movedEid = this.ids[last];
    // swap-remove
    [this.ids[i], this.ids[last]] = [this.ids[last], this.ids[i]];
    [this.data[i], this.data[last]] = [this.data[last], this.data[i]];
    this.ids.pop(); this.data.pop();
    this.index.delete(eid);
    if (i < last) this.index.set(movedEid, i);
    this.dirty = true; return true;
  }
  get(eid) { const i = this.index.get(eid); return i === undefined ? null : this.data[i]; }
  has(eid) { return this.index.has(eid); }
  sortedIds() {
    if (this.dirty) { this.sorted = Array.from(this.ids).sort((a,b)=>a-b); this.dirty = false; }
    return this.sorted;
  }
}
```

---

## 9.5) Event Bus Pseudocode

```
class EventBus {
  constructor() { this.q = new Map(); }
  emit(type, payload) {
    if (!this.q.has(type)) this.q.set(type, []);
    this.q.get(type).push(payload);
  }
  drain(type) {
    const arr = this.q.get(type) ?? [];
    this.q.set(type, []); // clear
    return arr; // FIFO snapshot
  }
  clear(type) { if (type) this.q.set(type, []); else this.q.clear(); }
}
```

---

## 6.5) Tick Loop Sketch

```
function tick(reg, dt) {
  const clamped = Math.max(0, Math.min(0.1, dt));
  const order = ['Input', 'PrePhysics', 'Gameplay', 'Events', 'RenderPrep'];
  for (const stage of order) reg._runStage(stage, clamped);
  // Post-tick: no implicit event persistence
}
```

---

Aye, that’s the bedrock for Sprint 1. Solid enough to build upon, light enough to move fast.