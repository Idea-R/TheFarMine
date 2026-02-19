# The Far Mine — Core ECS Architecture (Sprint 1 v0.1)

Author: Ironforge Stonebeard (Alpha)  
Version/Date: v0.1 — 2026-02-19 (ISO-8601)  
Status: Draft v0.1  
Scope: L1 vertical slice; Bevy ECS core (>=0.13); fixed 60 Hz logic; integration with components/events/resources per P4 decision (Rust + Bevy).


## 1) Goals & Constraints

- Goals
  - Stable component/event contracts
  - Clean API surfaces
  - Predictable scheduling (deterministic 60 Hz core)
  - Testability (unit-ish + integration)
  - Baseline performance (≥60 Hz on dev laptop)

- Constraints
  - Bevy 0.13
  - 2D side-view
  - Tiles are 16 px; world units 1.0 per tile
  - Fixed 60 Hz tick for core gameplay logic (FixedUpdate)

- Non-goals (Sprint 1)
  - Network sync/rollback
  - Advanced reflection-driven UI
  - Hot-reload beyond Bevy asset system


## 2) ECS Model Overview

- Entities
  - Opaque Bevy Entity IDs.
  - Naming conventions for bundles: Suffix “Bundle” (e.g., PlayerBundle), components are PascalCase structs.

- Core types (aliases/tokens)
  - type SpriteToken = String
  - type SfxTag = String
  - type MaterialTag = String
  - type OreTag = String
  - type FactionId = u16
  - type AttackId = u32
  - type Ms = u32

- Components (Sprint 1 set)
  - Transform (use bevy::prelude::Transform)
    - Invariants: 2D usage: translation.z for z-order; translation.x/y in world units (1.0/tile), scale = Vec3::ONE.
  - Velocity
    - fields:
      - lin: Vec2
      - max_speed: f32 (>= 0.0)
    - clamp: |lin| <= max_speed when integrating.
  - Collider (AABB)
    - fields:
      - half_extents: Vec2 (x > 0.0, y > 0.0)
      - offset: Vec2
      - solid: bool
      - layer: u32 (bitmask category)
      - mask: u32 (bitmask collides-with)
  - Tile
    - fields:
      - id: u32
      - material: MaterialTag
      - hardness: u8 (0..=255)
      - solid: bool
  - OreVein
    - fields:
      - ore_type: OreTag
      - quantity: u16 (0..)
      - hardness_bonus: u8 (0..=64)
  - Health
    - fields:
      - current: f32 (0.0..=max)
      - max: f32 (> 0.0)
  - Stamina
    - fields:
      - current: f32 (0.0..=max)
      - max: f32 (> 0.0)
      - regen_per_s: f32 (>= 0.0)
  - Inventory
    - fields:
      - slots: Vec<ItemStack>
      - capacity: u8 (>= slots.len(), clamp to 255)
    - ItemStack { item_id: u32, qty: u16 (1..), max_stack: u16 (>= qty) }
  - Tool
    - fields:
      - tier: u8 (0..=10)
      - power: f32 (>= 0.0)
      - uses_left: i32 (>= -1; -1 = infinite)
  - Damageable
    - fields:
      - invulnerable: bool
      - poise_current: f32 (0.0..=poise_max)
      - poise_max: f32 (> 0.0)
      - poise_regen_per_s: f32 (>= 0.0)
  - Faction
    - fields:
      - id: FactionId
  - SpriteRef
    - fields:
      - token: SpriteToken
      - z_layer: i16 (z-order hint; translated to Transform.z)
  - Light
    - fields:
      - intensity: f32 (>= 0.0)
      - radius: f32 (>= 0.0)
      - color: bevy::prelude::Color
  - SoundEmitter
    - fields:
      - sfx_tag: SfxTag
      - cool_ms: Ms
      - last_played_ms: Ms
  - UIState
    - fields:
      - visible: bool
      - mode: u8 (opaque mode id for Sprint 1)

- Resources
  - GameTime { start_instant: std::time::Instant, fixed_frame: u64, last_fixed_dt: f32 }
  - InputMap { bindings: Vec<(KeyCode, Intent)> } — Intent is enum of player intents for Sprint 1
  - AssetIndex { sprites: HashMap<SpriteToken, Handle<Image>>, sfx: HashMap<SfxTag, Handle<AudioSource>> }
  - DepthScalar (audio) { value: f32 (0.0..=1.0) }
  - WorldGenRng { seed: u64, rng: rand::rngs::SmallRng }

- Events
  - MineHitEvent { pos: Vec2, tool_tier: u8, power: f32 }
  - DamageEvent { source: Option<Entity>, target: Entity, amount: f32, dmg_type: DamageType }
  - FootstepEvent { entity: Entity, material: MaterialTag }
  - PlaySfxEvent { tag: SfxTag, pos: Option<Vec2> }
  - UiCommand { action: UiAction, payload: serde_json::Value }
  - TelegraphStartEvent { entity: Entity, attack_id: AttackId, flash_at_ms: Vec<Ms>, total_windup_ms: Ms, vfx_token: String, sfx_tag: SfxTag }
  - PoiseBreakEvent { entity: Entity, duration_ms: Ms }

  - DamageType: enum { Blunt, Sharp, Heat, Chill, True }

- Bundles
  - PlayerBundle {
      Transform, Velocity, Collider, Health, Stamina, Damageable, Inventory, Tool, Faction, SpriteRef, Light, SoundEmitter, UIState
    }
  - EnemyBundle (L1) {
      Transform, Velocity, Collider, Health, Damageable, Faction, SpriteRef
    }
  - TileBundle {
      Transform, Tile, Collider, SpriteRef
    }
  - OreVeinBundle {
      Transform, Tile, OreVein, SpriteRef
    }


## 3) Scheduling & Systems

- Dual-schedule approach
  - FixedUpdate (60 Hz): deterministic gameplay logic; authoritative state changes and event emission.
  - Update (variable): visuals/audio/UI; reads the latest fixed state; bridges SFX events.

- Fixed 60 Hz configuration (Bevy 0.13)
  - Insert Time::<Fixed>::from_hz(60.0) to drive FixedUpdate.
  - Store dt in GameTime.last_fixed_dt for systems requiring numeric delta.

- FixedUpdate system sets (ordered, chained)
  1) InputCollectSet — input_collect (InputMap → intents/components)
  2) RegenSet — stamina_regen, poise_regen (Damageable.poise)
  3) StateMachineSet — player/enemy state machines, emits TelegraphStartEvent
  4) MovementSet — movement_integrate (Transform += Velocity * dt; clamp speed)
  5) CollisionSet — collision_and_hits (AABB queries; attack arcs)
  6) DamageSet — damage_resolve → emits DamageEvent, PoiseBreakEvent, PlaySfxEvent (hits)
  7) MiningSet — mining_resolve (MineHitEvent → Tile/OreVein changes; PlaySfxEvent)
  8) PickupSet — inventory_pickup
  9) CleanupSet — cleanup & despawn (remove dead, clear temp flags)

- Update system sets (ordered)
  - SpriteAnimSet — sprite_anim (advance frames based on state)
  - LightSet — light_update
  - AudioBridgeSet — audio_event_bridge (PlaySfxEvent → Audio)
  - UiSyncSet — ui_sync (UIState, UiCommand)

- Set definitions and ordering (example)
```rust
#[derive(SystemSet, Debug, Hash, PartialEq, Eq, Clone)]
pub enum FixedSet {
  InputCollect,
  Regen,
  StateMachines,
  Movement,
  CollisionAndHits,
  DamageResolve,
  MiningResolve,
  InventoryPickup,
  Cleanup,
}

#[derive(SystemSet, Debug, Hash, PartialEq, Eq, Clone)]
pub enum UpdateSet {
  SpriteAnim,
  Light,
  AudioBridge,
  UiSync,
}

pub struct CorePlugin;

impl Plugin for CorePlugin {
  fn build(&self, app: &mut App) {
    use bevy::prelude::*;
    use bevy::time::common_conditions::on_timer;

    // 60 Hz fixed step
    app.insert_resource(Time::<Fixed>::from_hz(60.0));

    // Resources
    app.init_resource::<GameTime>()
      .init_resource::<InputMap>()
      .init_resource::<AssetIndex>()
      .insert_resource(DepthScalar { value: 1.0 })
      .insert_resource(WorldGenRng::from_seed(0xFARM1NE));

    // Events
    app.add_event::<MineHitEvent>()
      .add_event::<DamageEvent>()
      .add_event::<FootstepEvent>()
      .add_event::<PlaySfxEvent>()
      .add_event::<UiCommand>()
      .add_event::<TelegraphStartEvent>()
      .add_event::<PoiseBreakEvent>();

    // FixedUpdate ordering
    app.configure_sets(
      FixedUpdate,
      (
        FixedSet::InputCollect,
        FixedSet::Regen,
        FixedSet::StateMachines,
        FixedSet::Movement,
        FixedSet::CollisionAndHits,
        FixedSet::DamageResolve,
        FixedSet::MiningResolve,
        FixedSet::InventoryPickup,
        FixedSet::Cleanup,
      ).chain()
    );

    app.add_systems(FixedUpdate, input_collect.in_set(FixedSet::InputCollect))
       .add_systems(FixedUpdate, (stamina_regen, poise_regen).in_set(FixedSet::Regen))
       .add_systems(FixedUpdate, state_machines.in_set(FixedSet::StateMachines))
       .add_systems(FixedUpdate, movement_integrate.in_set(FixedSet::Movement))
       .add_systems(FixedUpdate, collision_and_hits.in_set(FixedSet::CollisionAndHits).after(FixedSet::Movement))
       .add_systems(FixedUpdate, damage_resolve.in_set(FixedSet::DamageResolve).after(FixedSet::CollisionAndHits))
       .add_systems(FixedUpdate, mining_resolve.in_set(FixedSet::MiningResolve))
       .add_systems(FixedUpdate, inventory_pickup.in_set(FixedSet::InventoryPickup))
       .add_systems(FixedUpdate, cleanup_and_despawn.in_set(FixedSet::Cleanup));

    // Update ordering
    app.configure_sets(
      Update,
      (
        UpdateSet::SpriteAnim,
        UpdateSet::Light,
        UpdateSet::AudioBridge,
        UpdateSet::UiSync,
      ).chain()
    );

    app.add_systems(Update, sprite_anim.in_set(UpdateSet::SpriteAnim))
       .add_systems(Update, light_update.in_set(UpdateSet::Light))
       .add_systems(Update, audio_event_bridge.in_set(UpdateSet::AudioBridge))
       .add_systems(Update, ui_sync.in_set(UpdateSet::UiSync));
  }
}
```

- Notes
  - Systems that emit audio/visual events in FixedUpdate should do so via PlaySfxEvent and token-based VFX/SFX tags.
  - Update reads event queues and components; it must not mutate authoritative gameplay state (except visual state like SpriteRef.z_layer).


## 4) Queries & Storage Strategy

- Storage/perf guidance
  - Rely on Bevy archetype storage; minimize component churn during hot loops.
  - Prefer With/Without/Or filters to narrow queries early.
  - Avoid heavy change detection in tight loops; batch by frame if needed.
  - Hot paths:
    - Movement: dense Query<(&mut Transform, &Velocity)>
    - Combat arcs: Query<(&Transform, &Collider, Option<&Faction>, Option<&Damageable>)>
    - Mining near player: spatially filter by distance or tile grid index (Sprint 1: distance check)

- Snapshot/delta
  - Use Time::<Fixed>::delta_seconds() to compute dt in FixedUpdate.
  - Avoid simultaneous mutable borrows by partitioning queries by component sets and using .split_for_each if needed.

- Example query snippets (pseudocode)
```rust
// Movement (dense)
for (mut tf, vel) in &mut q_moves {
  let v = vel.lin.clamp_length_max(vel.max_speed);
  tf.translation.x += v.x as f32 * dt;
  tf.translation.y += v.y as f32 * dt;
}

// Collision broad phase (simple AABB vs AABB)
for (e_a, tf_a, col_a) in &q_colliders {
  let aabb_a = aabb_world(tf_a, col_a);
  for (e_b, tf_b, col_b) in &q_colliders_others {
    if e_a == e_b { continue; }
    if (col_a.layer & col_b.mask) == 0 { continue; }
    if aabb_a.overlaps(aabb_world(tf_b, col_b)) {
      // resolve or flag hit
    }
  }
}

// Mining (player-centric)
let player_pos = tf_player.translation.truncate();
for (tile_e, tile, mut ore, tf) in q_tiles_near(player_pos, radius_tiles) {
  if (player_pos - tf.translation.truncate()).length() < radius_world {
    // process MineHitEvent matches
  }
}
```


## 5) API Surface & Examples (Bevy-focused)

- Entity lifecycle
```rust
// Spawn with bundle
let player_e = commands.spawn(PlayerBundle {
  Transform: Transform::from_xyz(0.0, 0.0, 0.0),
  Velocity: Velocity { lin: Vec2::ZERO, max_speed: 8.0 },
  Collider: Collider { half_extents: Vec2::new(0.4, 0.9), offset: Vec2::ZERO, solid: true, layer: 0b0001, mask: 0b1110 },
  Health: Health { current: 100.0, max: 100.0 },
  Stamina: Stamina { current: 50.0, max: 50.0, regen_per_s: 10.0 },
  Damageable: Damageable { invulnerable: false, poise_current: 50.0, poise_max: 50.0, poise_regen_per_s: 5.0 },
  Inventory: Inventory { slots: vec![], capacity: 16 },
  Tool: Tool { tier: 1, power: 10.0, uses_left: -1 },
  Faction: Faction { id: 1 },
  SpriteRef: SpriteRef { token: "eta/player_base".into(), z_layer: 0 },
  Light: Light { intensity: 0.0, radius: 0.0, color: Color::WHITE },
  SoundEmitter: SoundEmitter { sfx_tag: "none".into(), cool_ms: 0, last_played_ms: 0 },
  UIState: UIState { visible: true, mode: 0 },
}).id();

// Add/remove component
commands.entity(player_e).insert(Velocity { lin: Vec2::ZERO, max_speed: 10.0 });
commands.entity(player_e).remove::<Tool>();

// Despawn (recursive for hierarchies)
commands.entity(player_e).despawn_recursive();
```

- Events (emit/consume)
```rust
// Emit
play_sfx_writer.send(PlaySfxEvent { tag: "zeta/swing_01".into(), pos: Some(pos) });

// Consume in system
fn sfx_bridge(mut reader: EventReader<PlaySfxEvent>, assets: Res<AssetIndex>, audio: Res<Audio>) {
  for ev in reader.read() {
    if let Some(handle) = assets.sfx.get(&ev.tag) {
      audio.play(handle.clone());
    }
  }
}
```

- Plugin layout (monorepo crates)
  - crates/core: components, events, bundles, CorePlugin (this doc)
  - crates/combat: combat systems, damage resolution, telegraphs
  - crates/worldgen: rng/seed, tile/ore setup
  - crates/tech: tools/inventory interactions
  - crates/audio: audio bridge, emitters
  - crates/visuals: sprites/lighting, z-order mapping
  - crates/ui: UI state and command handling
  - crates/game: app entry, scenario setup, CorePlugin wiring


## 6) Data & Serialization

- Use serde + bevy_reflect
  - #[derive(Serialize, Deserialize, Reflect)] on data-bearing components/resources used for save/load (e.g., WorldGenRng.seed, minimal player state).
  - Keep runtime-only handles out of serialized state; use AssetIndex token lookups on load.

- Stable tokens
  - SpriteRef.token and SfxTag strings are stable cross-team IDs.
  - AssetIndex composes during startup by resolving tokens → handles.

- Data mapping
  - JSON item/tool definitions → runtime components:
    - Tool { tier, power, uses_left }
    - Inventory initial slots from scenario JSON
  - Tile/Ore data from CaveGen feed Tile.hardness and OreVein.{ore_type, quantity}.


## 7) Integration Contracts (Cross-Team)

- Combat (Gamma)
  - Relies on Stamina, Damageable (poise fields), Health.
  - Events: TelegraphStartEvent (windup), DamageEvent, PoiseBreakEvent.
  - Ordering guarantees: Telegraph emitted in StateMachineSet; Damage/PoiseBreak in DamageSet after CollisionSet.

- CaveGen (Beta)
  - Provides Tile and OreVein placement from WorldGenRng.seed.
  - Exposes hardness bands via Tile.hardness and OreVein.hardness_bonus.
  - MiningSet updates tiles/veins; emits PlaySfxEvent for strikes/breaks.

- Tech/Crafting (Delta)
  - Inventory and Tool are authoritative.
  - UiCommand used for craft requests; handled in UiSyncSet (route to Tech).

- Audio (Zeta)
  - PlaySfxEvent is the contract; optional SoundEmitter helps diegetic SFX placement.
  - DepthScalar resource modulates mix based on cave depth (0.0 surface → 1.0 deep).

- Visuals/UI (Eta)
  - SpriteRef.token + z_layer maps to sprite/atlas and Transform.z.
  - Light drives simple lighting prototype.
  - UIState toggles panels/modes; UiCommand for button actions.


## 8) Minimal Algorithms & Pseudocode

- Fixed tick driver (accumulator model; Bevy handles schedule, shown conceptually)
```text
accum += real_dt
while accum >= 1/60 {
  run(FixedUpdate) // authoritative logic
  accum -= 1/60
}
run(Update) // visuals/audio/UI
```

- Movement system (2D)
```rust
fn movement_integrate(mut q: Query<(&mut Transform, &Velocity)>, time: Res<Time<Fixed>>, mut gt: ResMut<GameTime>) {
  let dt = time.delta_seconds();
  gt.last_fixed_dt = dt;
  for (mut tf, vel) in &mut q {
    let v = vel.lin.clamp_length_max(vel.max_speed);
    tf.translation.x += v.x * dt;
    tf.translation.y += v.y * dt;
  }
}
```

- Damage resolution ordering (per tick)
```text
1) Collect hit candidates from CollisionSet (attack arcs vs targets)
2) For each target:
   a) If invulnerable: skip
   b) Apply poise damage first; if poise_current <= 0 → emit PoiseBreakEvent
   c) Apply health damage (clamp to 0)
   d) If damage > 0 → emit DamageEvent, PlaySfxEvent("hit")
3) Mark dead entities for CleanupSet
```

- Mining check (tool tier/power vs hardness)
```rust
fn mining_resolve(mut tiles: Query<(&mut Tile, Option<&mut OreVein>)>, mut mine_hits: EventReader<MineHitEvent>) {
  for ev in mine_hits.read() {
    for (mut tile, ore) in tiles.iter_mut().filter(|(_, _)| /* within radius of ev.pos */ true) {
      let eff_hard = tile.hardness as f32 + ore.as_ref().map(|o| o.hardness_bonus as f32).unwrap_or(0.0);
      if ev.tool_tier as f32 * ev.power >= eff_hard {
        // break tile / reduce ore
      }
    }
  }
}
```


## 9) Test & Benchmark Plan (Sprint 1)

- Unit-ish
  - Spawn/despawn entity succeeds.
  - Add/remove component changes archetype without panic.
  - Event roundtrip: writer.send → reader receives once.
  - System ordering assertions: Movement runs before CollisionSet; CollisionSet before DamageSet.

- Integration microtest
  - Given entity with Velocity and Transform, after one FixedUpdate at 60 Hz, Transform advances by v*dt.

- Benchmark (release)
  - Scenario: 10k entities with Transform, Velocity, Collider; run 3 trivial systems (movement, noop collide, noop anim) at ≥60 Hz.
  - Capture:
    - Frame/step time via bevy_diagnostic frame time plugin.
    - Archetype churn: count insert/remove of Velocity/Collider.
  - How to run:
    - cargo run --release
    - Enable log level info; print average fixed step over 5 seconds.
    - Optionally enable bevy’s trace feature to export microprofiler JSON.


## 10) Risks & Mitigations

- Risk: Over-prescriptive component fields limit iteration.
  - Mitigation: Keep MVP minimal; document invariants; add extension fields behind Option<>.

- Risk: Schedule contention and borrow conflicts.
  - Mitigation: Partition queries; explicit SystemSet ordering; avoid overlapping &mut in same set.

- Risk: Token drift across teams (sprite/sfx IDs).
  - Mitigation: Shared token registry (AssetIndex) and review gates on token changes.


## 11) Acceptance Checklist

- Components/events/resources defined with fields and clamps.
- Scheduling and system ordering documented; fixed vs render update separated.
- API examples included (spawn, add/remove, register systems, emit/consume events).
- Test and benchmark plan specified with ≥10k entity target.
- Cross-team integration points mapped with ordering guarantees.