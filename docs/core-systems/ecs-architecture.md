# The Far Mine — Core ECS Architecture (Sprint 1 v0.1)

Author: Ironforge Stonebeard — Alpha  
Version: 0.1  
Date: 2026-02-19 (ISO-8601)  
Status: Draft v0.1

## 1) Title & Metadata

- Title: The Far Mine — Core ECS Architecture (Sprint 1 v0.1)
- Author: Ironforge Stonebeard — Alpha
- Version/Date: 0.1 / 2026-02-19
- Status: Draft v0.1
- Scope:
  - L1 vertical slice focused on core game loop, basic combat/mining, and player-enemy-tile interactions.
  - Bevy 0.13 ECS, dual-schedule with fixed 60 Hz logic (FixedUpdate) and visual/audio routing (Update).
  - Integration with P4 contracts for cross-team token stability, event semantics, and scheduling guarantees.

## 2) Goals & Constraints

- Goals:
  - Stable component/event contracts with explicit invariants.
  - Clean, minimal API surfaces with consistent bundle naming.
  - Predictable scheduling with deterministic 60 Hz logic.
  - Testability: unit-ish tests for systems and events; micro-integration tests.
  - Baseline performance: ≥60 Hz with 10k entities (Transform/Velocity/Collider) under trivial systems.

- Constraints:
  - Bevy 0.13.
  - 2D side-view.
  - Tiles are 16 px; 1.0 world unit per tile.
  - Fixed 60 Hz tick for gameplay logic (FixedUpdate).

- Non-goals (Sprint 1):
  - Networking.
  - Reflection-heavy tooling.
  - Hot-reload beyond Bevy asset system (no custom live-reload for gameplay code).

## 3) ECS Model Overview

- Entities
  - Bevy `Entity`, opaque IDs. Do not persist numeric IDs across sessions.
  - Bundle naming convention: `XxxBundle` mirroring contained component names. Player/Enemy bundles are "L1" scope for this sprint.

- Component definitions (Sprint 1)
  - All numeric clamps are invariants enforced by constructors or init systems. Fields use glam types where applicable.

```rust
// Common token type for stable identifiers.
pub type Token = String;

// Transform: world position and facing. Facing must be -1 or +1.
pub struct Transform {
    pub pos: Vec2,       // world units; 1.0 = 1 tile (16 px)
    pub facing: i8,      // ∈ {-1, +1}
}

// Velocity: linear velocity and max clamp.
pub struct Velocity {
    pub lin: Vec2,       // world units per second
    pub max_speed: f32,  // >= 0
}

// Collider: axis-aligned box (half extents) and solidity.
pub struct Collider {
    pub aabb: Vec2,      // half extents in world units (>= 0 per axis by convention)
    pub solid: bool,
}

// Tile: world tile identity and hardness.
pub struct Tile {
    pub kind: Token,     // e.g., "tile:stone", "tile:dirt"
    pub hardness: f32,   // >= 0
}

// OreVein: overlays or attached to tiles; modifies mining.
pub struct OreVein {
    pub ore_type: Token,      // e.g., "ore:copper"
    pub richness: u8,         // 0..255, yields scale
    pub hardness_bias: f32,   // additive to tile hardness (may be negative, clamp at use-site)
}

// Health: current/max health.
pub struct Health {
    pub current: f32,         // >= 0, <= max
    pub max: f32,             // > 0
}

// Stamina: current/max stamina with regen and drain multiplier.
pub struct Stamina {
    pub current: f32,             // >= 0, <= max
    pub max: f32,                 // > 0
    pub regen_per_sec: f32,       // >= 0
    pub drain_mult: f32,          // >= 0
}

// Tool: mining/combat tool with durability.
pub struct Tool {
    pub id: Token,                // e.g., "tool:pick_1"
    pub tier: u8,                 // 0..255
    pub mining_power: f32,        // >= 0
    pub durability: i32,          // >= 0
    pub durability_max: i32,      // > 0
}

// Inventory: fixed capacity with non-empty stacks.
pub struct Inventory {
    pub slots: Vec<ItemStack>,    // len <= capacity
    pub capacity: u16,            // > 0
}

pub struct ItemStack {
    pub id: Token,                // e.g., "item:stone"
    pub qty: u16,                 // > 0
}

// Damageable: flat armor and poise system for stagger.
pub struct Damageable {
    pub armor: f32,               // >= 0
    pub poise: f32,               // >= 0, <= poise_max
    pub poise_max: f32,           // > 0
    pub poise_regen_per_sec: f32, // >= 0
}

// Faction: simple allegiance tag.
pub struct Faction {
    pub id: Token,                // e.g., "faction:player", "faction:enemy"
}

// SpriteRef: stable mapping to visual asset; z for layering.
pub struct SpriteRef {
    pub sprite_token: Token,  // e.g., "sprite:player_base"
    pub z: f32,               // layering scalar; tiles < actors < fx
}

// Light: simple radial light.
pub struct Light {
    pub radius: f32,          // >= 0, world units
    pub intensity: f32,       // [0, 1]
    pub color_token: Token,   // e.g., "color:warm", resolved by visuals
}

// SoundEmitter: source of sfx, may loop with cooldown gating.
pub struct SoundEmitter {
    pub sfx_tag: Token,       // e.g., "sfx:footstep_dirt"
    pub looped: bool,
    pub cooldown_ms: u32,     // minimum interval between triggers
}

// UIState: bitset for HUD toggles.
pub struct UIState {
    pub hud_flags: u32,       // bitset; team-defined map
}
```

- Bundles (exact fields)
  - PlayerBundle:
    - Transform
    - Velocity
    - Collider
    - Health
    - Stamina
    - Damageable
    - Tool
    - Inventory
    - Faction { id: "faction:player" }
    - SpriteRef
    - Light
    - SoundEmitter
    - UIState
  - EnemyBundle (L1):
    - Transform
    - Velocity
    - Collider
    - Health
    - Stamina
    - Damageable
    - Faction { id: "faction:enemy" }
    - SpriteRef
    - SoundEmitter
  - TileBundle:
    - Transform   // pos aligns with tile grid; facing = +1
    - Tile
    - Collider    // solid depends on tile.kind
    - SpriteRef
  - OreVeinBundle:
    - Transform   // co-located with host tile
    - OreVein
    - SpriteRef   // optional decorative overlay

- Resources
```rust
pub struct GameTime {
    pub fixed_dt: f32, // seconds per tick; default 1.0 / 60.0
}

// InputMap: action tokens mapped to current frame intents (bool/axis).
// Stable tokens are defined by P4 contract (e.g., "act:move_left", "act:mine").
pub struct InputMap {
    // Minimal MVP: resolved intents snapshot for FixedUpdate
    pub actions: std::collections::HashMap<Token, f32>, // buttons: 0.0 or 1.0; axes: [-1.0, 1.0]
}

// AssetIndex: token->handle registry for assets (sprites, sfx, colors).
pub struct AssetIndex {
    pub sprites: std::collections::HashMap<Token, bevy::prelude::Handle<bevy::sprite::TextureAtlas>>,
    pub sfx: std::collections::HashMap<Token, bevy::prelude::Handle<bevy::audio::AudioSource>>,
    pub colors: std::collections::HashMap<Token, bevy::prelude::Color>,
}

// DepthScalar: ambient depth factor [0,1] for audio/visual tuning.
pub struct DepthScalar(pub f32); // clamp to [0,1]

// WorldSeed: deterministic worldgen seed.
pub struct WorldSeed(pub u64);
```

- Events
```rust
pub struct MineHitEvent {
    pub pos: Vec2,
    pub tool: Token,
    pub power: f32,
}

pub struct DamageEvent {
    pub source: Entity,
    pub target: Entity,
    pub amount: f32,
    pub r#type: Token, // e.g., "dmg:physical", "dmg:impact"
}

pub struct FootstepEvent {
    pub entity: Entity,
    pub material: Token, // e.g., "mat:dirt"
}

pub struct PlaySfxEvent {
    pub tag: Token,         // sfx token
    pub pos: Option<Vec2>,  // 2D positional audio; None = UI/global
}

pub struct UiCommand {
    pub action: Token,              // e.g., "ui:craft_open"
    pub payload: serde_json::Value, // stable, tokenized keys
}

pub struct TelegraphStartEvent {
    pub entity: Entity,
    pub attack_id: Token,    // e.g., "atk:swipe_1"
    pub total_windup_ms: u32,
}

pub struct PoiseBreakEvent {
    pub entity: Entity,
    pub duration_ms: u32,
}
```

## 4) Scheduling & Systems

- Dual-schedule design
  - FixedUpdate (60 Hz, deterministic): core gameplay logic.
  - Update (variable Hz): visuals, audio routing, UI sync; reads snapshots from last fixed tick.

- FixedUpdate SystemSets and ordering
  - Set labels (use enum or Const labels):
    1) input_collect (InputMap → intents)
    2) stamina_regen, poise_regen
    3) state_machines (player/enemy)
    4) movement_integrate (Transform += Velocity*dt, clamp speed)
    5) collision_and_hits (AABB resolution, attack arcs)
    6) damage_resolve (apply damage, emit Damage/PoiseBreak)
    7) mining_resolve (MineHitEvent → Tile/OreVein updates)
    8) inventory_pickup
    9) cleanup_despawn

- Update schedule (visual/audio/UI)
  - sprite_anim
  - light_update
  - audio_event_bridge
  - ui_sync (reads last fixed snapshot; issues UiCommand if needed)

- Bevy 0.13 configuration sketch (non-executable overview)

```rust
#[derive(SystemSet, Debug, Hash, PartialEq, Eq, Clone)]
pub enum FixedSets {
    InputCollect,
    StaminaRegen,
    PoiseRegen,
    StateMachines,
    MovementIntegrate,
    CollisionAndHits,
    DamageResolve,
    MiningResolve,
    InventoryPickup,
    CleanupDespawn,
}

pub struct CorePlugin;

impl Plugin for CorePlugin {
    fn build(&self, app: &mut App) {
        // Resources
        app.insert_resource(GameTime { fixed_dt: 1.0 / 60.0 })
           .insert_resource(InputMap { actions: Default::default() })
           .insert_resource(AssetIndex {
               sprites: Default::default(),
               sfx: Default::default(),
               colors: Default::default(),
           })
           .insert_resource(DepthScalar(0.0))
           .insert_resource(WorldSeed(0));

        // Events
        app.add_event::<MineHitEvent>()
           .add_event::<DamageEvent>()
           .add_event::<FootstepEvent>()
           .add_event::<PlaySfxEvent>()
           .add_event::<UiCommand>()
           .add_event::<TelegraphStartEvent>()
           .add_event::<PoiseBreakEvent>();

        // Fixed schedule sets & ordering
        app.configure_sets(
            FixedUpdate,
            (
                FixedSets::InputCollect,
                FixedSets::StaminaRegen,
                FixedSets::PoiseRegen,
                FixedSets::StateMachines,
                FixedSets::MovementIntegrate,
                FixedSets::CollisionAndHits,
                FixedSets::DamageResolve,
                FixedSets::MiningResolve,
                FixedSets::InventoryPickup,
                FixedSets::CleanupDespawn,
            )
                .chain(), // strict order
        );

        // Systems (placeholders; implement in modules)
        app.add_systems(FixedUpdate, input_collect_system.in_set(FixedSets::InputCollect))
           .add_systems(FixedUpdate, stamina_regen_system.in_set(FixedSets::StaminaRegen))
           .add_systems(FixedUpdate, poise_regen_system.in_set(FixedSets::PoiseRegen))
           .add_systems(FixedUpdate, state_machine_systems.in_set(FixedSets::StateMachines))
           .add_systems(FixedUpdate, movement_integrate_system.in_set(FixedSets::MovementIntegrate))
           .add_systems(FixedUpdate, collision_and_hits_system.in_set(FixedSets::CollisionAndHits))
           .add_systems(FixedUpdate, damage_resolve_system.in_set(FixedSets::DamageResolve))
           .add_systems(FixedUpdate, mining_resolve_system.in_set(FixedSets::MiningResolve))
           .add_systems(FixedUpdate, inventory_pickup_system.in_set(FixedSets::InventoryPickup))
           .add_systems(FixedUpdate, cleanup_despawn_system.in_set(FixedSets::CleanupDespawn));

        // Update schedule systems
        app.add_systems(Update, (sprite_anim_system, light_update_system, audio_event_bridge_system, ui_sync_system));
    }
}
```

- Fixed tick run criteria pseudocode (accumulator)
```rust
// Pseudocode; Bevy 0.13 already provides FixedUpdate, but custom accumulator shown for clarity.
struct FixedAccumulator {
    acc: f64,
    fixed_dt: f64,
}

fn fixed_run_criteria(
    time: Res<Time>,
    mut acc: Local<FixedAccumulator>,
    game_time: Res<GameTime>,
) -> ShouldRun {
    if acc.fixed_dt == 0.0 {
        acc.fixed_dt = game_time.fixed_dt as f64;
    }
    acc.acc += time.delta_seconds_f64();
    if acc.acc + 1e-12 >= acc.fixed_dt {
        acc.acc -= acc.fixed_dt;
        ShouldRun::Yes
    } else {
        ShouldRun::No
    }
}
```

## 5) Queries & Storage Strategy

- General guidance
  - Favor archetype-friendly components; avoid frequent add/remove on hot-path entities.
  - Use With/Without/Or filters to avoid borrow contention and restrict iteration sets.
  - Partition queries by faction or state tags to reduce broad-phase work.
  - Read-mostly data (e.g., Collider) should be immutable in hot systems when possible.

- Hot-path examples
  - Movement: dense iteration, avoid optionals.
```rust
// Movement on actors only
Query<(&mut Transform, &mut Velocity), Or<(With<PlayerTag>, With<EnemyTag>)>>
```
  - Combat: partition by faction to avoid same-archetype self-conflict.
```rust
// Defender-side read
Query<(&Collider, &Transform, &mut Damageable, &Faction), ()>
// Attacker-side read (with attack state)
Query<(&Transform, &Faction, &AttackState), ()>
```
  - Mining: MVP uses vicinity filter; future optimization uses grid index (chunk map).
```rust
// Tiles and veins near player
Query<(&mut Tile, &Transform)>,
Query<(&mut OreVein, &Transform)>
// Filter by |tile.pos - player.pos| <= R
```

## 6) API Surface & Examples (Bevy-focused)

- Spawning with Bundles
```rust
// Player spawn (L1)
commands.spawn((
    Transform { pos: Vec2::ZERO, facing: 1 },
    Velocity { lin: Vec2::ZERO, max_speed: 6.0 },
    Collider { aabb: Vec2::new(0.4, 0.9), solid: true },
    Health { current: 100.0, max: 100.0 },
    Stamina { current: 100.0, max: 100.0, regen_per_sec: 15.0, drain_mult: 1.0 },
    Damageable { armor: 2.0, poise: 100.0, poise_max: 100.0, poise_regen_per_sec: 20.0 },
    Tool { id: "tool:pick_1".into(), tier: 1, mining_power: 1.0, durability: 100, durability_max: 100 },
    Inventory { slots: vec![], capacity: 24 },
    Faction { id: "faction:player".into() },
    SpriteRef { sprite_token: "sprite:player_base".into(), z: 10.0 },
    Light { radius: 4.0, intensity: 0.6, color_token: "color:warm".into() },
    SoundEmitter { sfx_tag: "sfx:footstep_dirt".into(), looped: false, cooldown_ms: 80 },
    UIState { hud_flags: 0 },
));
```

- Despawning
```rust
commands.entity(entity).despawn_recursive();
```

- Add/remove components
```rust
// Add temporary attack state
commands.entity(e).insert(AttackState::windup("atk:swipe_1".into(), 300));

// Remove tool (breakage)
commands.entity(e).remove::<Tool>();
```

- Event emit/consume
```rust
// Emit
fn mine_swing(mut ev_mine: EventWriter<MineHitEvent>, tool: &Tool, pos: Vec2) {
    ev_mine.send(MineHitEvent { pos, tool: tool.id.clone(), power: tool.mining_power });
}

// Consume
fn mining_resolve_system(
    mut ev_mine: EventReader<MineHitEvent>,
    mut tiles: Query<(&mut Tile, &Transform)>,
    mut veins: Query<(&mut OreVein, &Transform)>,
) {
    for e in ev_mine.read() {
        // handle nearest tile/vein to e.pos ...
    }
}
```

- Plugin layout and crate structure (monorepo alignment)
  - Crates:
    - core: components, bundles, resources, events, core systems (movement, regen, mining MVP), CorePlugin.
    - combat: attack state, telegraphs, damage application.
    - worldgen: Tile/OreVein population, chunk bootstrap, seed usage.
    - tech: tools, items, crafting hooks.
    - audio: sfx mapping, PlaySfxEvent bridge, emit loops.
    - visuals: SpriteRef mapping, light updates, z-order config.
    - ui: UIState mapping, UiCommand handling.
    - game: top-level App wiring, main schedules, scene setup.
  - Registration:
    - CorePlugin registers all core components as reflect (as needed), events, resources, SystemSets, and fixed tick configuration.

## 7) Data & Serialization

- Serialization
  - Use serde for minimal saves: world seed, player state (Transform, Health/Stamina, Inventory, Tool durability).
  - Use bevy_reflect selectively for editor/debug prints; avoid reflection-heavy runtime in Sprint 1.

- Stable token conventions
  - sprite tokens: "sprite:<domain>_<name>"
  - sfx tags: "sfx:<domain>_<name>"
  - item ids: "item:<material>|<thing>"
  - tile kinds: "tile:<material>"
  - ore types: "ore:<material>"
  - damage types: "dmg:<type>"
  - factions: "faction:<name>"
  - actions: "act:<verb>[_<axis>]"
  - All tokens are mapped via AssetIndex or data tables; JSON data uses the same tokens and is translated to runtime components during load.

- Mapping from JSON to runtime
  - Inventory/Tool: deserialize ItemStack/Tool by token; validate against known registries.
  - Tile/OreVein: placed by worldgen with tokens; hardness/richness values are clamped on load.

## 8) Integration Contracts (Cross-Team)

- Combat
  - Relies on Stamina/Poise and emits TelegraphStartEvent, DamageEvent.
  - Ordering guarantees:
    - Telegraph and state machines run before CollisionAndHits.
    - DamageResolve runs strictly after CollisionAndHits, before MiningResolve.
    - PoiseBreakEvent emitted within DamageResolve.

- CaveGen
  - Provides initial Tile/OreVein placement; adheres to hardness bands by biome/depth.
  - Uses WorldSeed for deterministic generation.
  - Chunk/entity creation occurs during loading or streaming; must insert TileBundle/OreVeinBundle with correct transforms.

- Tech/Crafting
  - Inventory/Tool contracts define capacity and durability.
  - UiCommand "ui:craft_*" actions are consumed by tech crate; results modify Inventory.
  - Mining consumes Tool durability and Stamina; stamina drain scaled by Tool.tier and drain_mult.

- Audio
  - PlaySfxEvent is the primary routing; SoundEmitter.looped used for looping ambience on entities with cooldown gating.
  - DepthScalar affects ambience mix and low-pass (handled by audio crate).

- Visuals/UI
  - SpriteRef tokens resolve to atlas handles; z-order:
    - Tiles: z in [0.0..3.0]
    - Player/Enemies: z in [5.0..15.0]
    - Foreground deco/FX: z > 15.0
  - Light used by visuals to spawn/update light proxies.
  - UIState feeds HUD toggles; ui crate syncs each Update after FixedUpdate snapshot.

## 9) Minimal Algorithms & Pseudocode

- Fixed tick driver accumulator
```text
acc += delta_time
while acc >= fixed_dt:
    run FixedUpdate once
    acc -= fixed_dt
render Update
```

- Movement system pseudocode
```text
for each (Transform t, Velocity v) where actor (player or enemy):
    // Clamp speed
    speed = length(v.lin)
    if speed > v.max_speed and v.max_speed > 0:
        v.lin = v.lin * (v.max_speed / speed)

    // Integrate
    t.pos += v.lin * fixed_dt

    // Update facing from x-velocity if above small epsilon
    if v.lin.x > 0.01: t.facing = +1
    else if v.lin.x < -0.01: t.facing = -1
```

- Damage resolution ordering
```text
inputs: attack arcs/hitboxes from CollisionAndHits
collect all hits for this tick into list H
sort H by target entity id (stable) to avoid double-mutation conflicts
for each hit in H:
    read target Damageable and Health
    effective = max(0, amount - armor)
    poise_after = max(0, poise - amount_poise) // amount_poise defaults to amount
    if poise_after == 0 and poise > 0:
        emit PoiseBreakEvent(target, duration_ms = 600)
    health_after = max(0, current - effective)
    write back poise_after, health_after
    emit DamageEvent(source, target, effective, type)
if health_after == 0:
    mark for despawn in CleanupDespawn
```

- Mining check pseudocode
```text
on MineHitEvent (pos, tool_token, power):
    find nearest tile within mining radius R
    if no tile: return
    tile_hard = clamp(tile.hardness + vein.hardness_bias_if_present, min=0)
    if power < tile_hard:
        // insufficient power: play tink sfx; small stamina drain
        drain = base_mine_cost * 0.5
        play sfx "sfx:mine_tink"
        return
    // success chance scales with vein richness; MVP: deterministic break over N hits
    apply damage to tile hardness accumulator or decrement "integrity"
    decrease tool.durability by 1 (>= 0)
    decrease stamina by base_mine_cost * drain_mult
    if tile broken:
        spawn drops based on vein.richness and tile.kind
        remove or downgrade Tile/OreVein
        play sfx "sfx:mine_break"
```

## 10) Test & Benchmark Plan (Sprint 1)

- Unit-ish tests
  - Spawn/Despawn entity via PlayerBundle; assert components present/absent.
  - Add/Remove component: insert Tool, remove Tool; invariants maintained.
  - Event roundtrip: send MineHitEvent and receive in system; assert count.
  - System ordering: assert MovementIntegrate runs before CollisionAndHits, and DamageResolve after.

- Integration microtest
  - Given Transform at (0,0) and Velocity (1,0) with max_speed ≥ 1:
    - After one FixedUpdate tick (fixed_dt = 1/60), pos.x ≈ 1/60.

- Benchmark plan
  - Scene with 10k entities having Transform, Velocity, Collider.
  - Three trivial systems at FixedUpdate:
    - Integrate Velocity
    - Dummy read of Collider
    - No-op filter pass
  - Target: maintain ≥60 Hz FixedUpdate on release build.
  - Instructions:
    - Run: cargo run --release
    - Enable Bevy log: RUST_LOG=info
    - Capture frame and fixed step times via bevy_time diagnostics or a simple profiler.
    - Log archetype churn (insert/remove) counts during spawn phase, ensure minimal churn during steady-state.

## 11) Risks & Mitigations

- Over-prescriptive component fields
  - Mitigation: keep MVP fields minimal; mark extensions for Sprint 2 (e.g., status effects) out-of-scope.

- Schedule contention/borrows
  - Mitigation: Use explicit SystemSets with chain ordering; partition queries by tags/factions; design read-mostly hot paths.

- Token drift across teams
  - Mitigation: Shared token registry in P4; PR gates require token review; AssetIndex validates presence on startup.

## 12) Acceptance Checklist

- Components, events, and resources defined with fields and clamps.
- Fixed vs render scheduling documented with explicit ordering.
- API examples for spawn/despawn, components, events are present.
- Test/benchmark plan includes 10k-entity target and execution notes.
- Cross-team integration points (Combat, CaveGen, Tech/Crafting, Audio, Visuals/UI) clearly mapped.

## Appendix A) Stack Resolution Note

This document supersedes earlier JS registry plans due to the P4 decision to standardize on Bevy/Rust. The code scaffold will be a Rust Bevy crate (core) providing:

- Component/resource/event definitions per this spec.
- A minimal Movement system operating in FixedUpdate at 60 Hz.
- Registration via CorePlugin, with SystemSets and fixed tick configuration.
- Initial tests for spawn/despawn, movement integration microtest, and event roundtrip.

Subsequent commits will expand combat, mining resolution, and worldgen hooks under the monorepo crates outlined above.