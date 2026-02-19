# The Far Mine — Combat MVP (Stamina/Poise, Sprint 1)

Author: Battlehammer Ironshield (Gamma)  
Version/Date: Draft v0.1 — 2026-02-19  
Status: Draft  
Scope: L1 vertical slice; 2D side-view; tile size 16 px; world units 1.0 per tile; target 60 FPS (fixed-step).  
Dependencies: ECS components/events per P4 (core runtime + Physics/Collision v0.4).

I forge this spec like good steel: clear grain, no surprises, ready for the hammer of implementation.

## 1) Combat Feel Pillars (brief)
- Balance ethos
  - Readable telegraphs, earned hits, fair punish windows.
  - Small rosters, distinct attack identities; poise matters, trading is costly.
- Feedback
  - Hit-stop per hit; poise-stagger on thresholds; tightly mapped audio/VFX cue tokens.
  - Directional knock nudge (≤0.2 tiles) for hit confirm clarity.

## 2) Core Variables & Definitions
- Stamina (player)
  - Fields: current, max, regen_per_sec, drain_mult.
  - Defaults
    - max = 60
    - regen_per_sec = 18.0 (stamina/s)
    - drain_mult = 1.0 (global multiplier; use for tuning)
    - regen_state_mult
      - idle/move = 1.0
      - attack_startup/active/recovery = 0.25
      - dodge = 0.0 during i-frames, 0.5 during dodge recovery
      - block = 0.0 while holding
  - Costs (applied at attack-commit frame; see Timing)
    - light_attack: 22 (safe range 18–26)
    - heavy_attack: 38 (safe range 32–44)
    - dodge/roll: 18 (safe range 14–22)
    - block: 12 per second (ticks at 60 Hz; 0.2 per tick). Startup 60 ms, release 80 ms.
    - sprint (if used in L1): 8 per second (0.133 per tick); suppressed in Sprint 1 unless QA needs traverse tuning.
    - feint (enemy-only): 5
- Poise (entity: player + enemies)
  - Fields: poise_max, poise_current, poise_recover_per_sec, poise_break_stun_ms, poise_recover_delay_ms
  - Defaults (player): poise_max = 50; poise_recover_per_sec = 12; poise_break_stun_ms = 900; poise_recover_delay_ms = 300 after last hit/hitstun end
  - On-hit poise damage
    - Player Pickaxe T1: light 12; heavy 28
    - Hammer: light 16; heavy 38
    - Enemy-specific listed in section 7
- Health/Defense
  - health.current, health.max; defense (flat mitigation)
  - Damage mitigation formula: damage_out = max(1, floor(attack_power - defense))
- I-frames and Hitstun
  - I-frames: dodge grants invulnerability during a window within dodge (see State Machine). Hits ignored during active i-frames.
  - Hitstun on damage taken (if not fully blocked/parried; parry out-of-scope Sprint 1)
    - Light hitstun default: 220 ms
    - Heavy hitstun default: 320 ms
  - Blocked hits: no health damage; stamina drains 50% of would-be damage as stamina (rounded up). Poise damage reduced by 50%.

## 3) Timing & Resolution Order (frame-accurate)
- Fixed-step: 60 Hz tick, dt = 16.667 ms. All time fields authorial in ms; engine converts to tick counts via ceil(ms/16.667).
- Per-tick resolution order
  1) Read buffered input (frame n)
  2) State machine update (evaluate transitions; gate by stamina/poise/dead)
  3) Stamina/poise regen and drains (apply regen_state_mult by current state)
  4) Advance timers: startup/active/recovery/hitstun/poise_break; schedule/advance i-frame windows
  5) Collision/hit query if an attack has active frames this tick (AABB with frontal arc mask)
  6) Resolve impacts: apply damage/poise; compute knock nudge; enqueue hit-stop
  7) Emit events (TelegraphStartEvent at windup start; DamageEvent; PoiseBreakEvent; PlaySfxEvent)
  8) Apply hit-stop freezes at end of tick (see below) so next tick sees frozen clocks if any
- Hit-stop
  - Default per-hit:
    - Player light vs enemy: 60 ms
    - Player heavy vs enemy: 90 ms
    - Enemy hits player: 50 ms
  - Freeze rules during hit-stop
    - Frozen: animation playback, movement velocity integration, attack startup/active/recovery timers, AI animation timers, hitbox toggles
    - Continue: stamina regen/drain, i-frame timers, hitstun timers, poise recovery timers (if not paused by hitstun), global cooldowns, telegraph countdowns
    - Rationale: prevents “free invuln extension” and AI desync; preserves input buffering and timing windows fairness.

## 4) Player Move State Machine (states, transitions)
- States
  - idle
    - Entry: on ground, no move input or velocity <0.05 u/s; not hitstun/poise_broken/dead
    - Exit: move input, attack input, dodge, block, get hit
    - Regen mult: 1.0
  - move
    - Entry: horizontal input > deadzone; not attacking; not hitstun
    - Exit: idle, attack_light/heavy (if stamina sufficient), dodge, block, get hit
    - Regen mult: 1.0
    - Dodge-cancel: allowed from move only (not from attack)
  - attack_light
    - Stamina gate: current >= 22
    - Timings: startup 180 ms; active 120 ms; recovery 280 ms
    - Commit point: 60 ms into startup (cost applied here)
    - Cancel: none until recovery; chain to chain_window after 60% of recovery (see below)
  - attack_heavy
    - Stamina gate: current >= 38
    - Timings: startup 360 ms; active 140 ms; recovery 420 ms
    - Commit point: 120 ms into startup (cost applied here)
    - Cancel: none; no dodge-cancel until recovery
  - chain_window
    - Duration: 140 ms window beginning at last 60% of prior attack’s recovery
    - Allowed: light→light or light→heavy if stamina gates met; buffer 100 ms early
  - dodge
    - Stamina gate: current >= 18
    - Timings: startup 80 ms; travel 220 ms; recovery 160 ms (total 460 ms)
    - I-frames: 100–260 ms from dodge start (frames 6–16 inclusive)
    - Cancel: none; on exit to idle/move
  - block
    - Entry: hold block; startup 60 ms; drains 12/s while held; release 80 ms
    - Reduces move speed by 60%; cannot attack; can dodge-cancel on release startup complete
  - hitstun
    - Entry: on unblocked hit; duration per incoming attack archetype (default 220/320 ms)
    - Exit: idle/move if on ground; transitions suppressed except to dead
    - Poise recovery paused; stamina regen at 0.5x
  - poise_broken
    - Entry: poise_current <= 0
    - Duration: poise_break_stun_ms (default 900 ms player)
    - Exit: set poise_current = poise_max; resume normal
  - dead
    - Entry: health.current <= 0
    - No exits; all inputs ignored
- Transition notes (L1)
  - Allowed: idle↔move; idle/move→attack_light/heavy; move→dodge; idle/move→block; any→hitstun/poise_broken/dead per impacts
  - Lockouts: no dodge/attack during attack startup/active; chain only during chain_window; block prevents attacks
  - Numeric defaults integrated above; all times authorial in ms and resolved per-tick

## 5) Formulas
- Stamina
  - regen_per_tick = regen_per_sec * dt * regen_state_mult
  - cost applied at commit; stamina_current = max(0, stamina_current - cost*drain_mult)
- Damage
  - damage_out = max(1, floor(attack_power - defense))
- Poise damage
  - poise_out = base_poise_dmg * attack_mult (attack_mult default = 1.0; enemy resist/weakness may scale 0.75–1.25)
  - Poise recovery pauses during hitstun/poise_broken; resumes after poise_recover_delay_ms since last hitstun end
- Stagger/Poise break
  - If poise_current <= 0 → apply poise_break_stun_ms; set poise_current refill to poise_max after poise_broken ends
- I-frames
  - Dodge invuln active in [start_ms, end_ms] relative to dodge start; any overlapping hits ignored

## 6) Attack Archetypes (Player, MVP)
- Weapon A: Pickaxe T0/T1
  - Light (Pickaxe_T1_Light)
    - startup 180 ms; active 120 ms; recovery 280 ms
    - stamina cost 22
    - base_damage 10 (T0 = 8)
    - base_poise_dmg 12
    - hit_stop_ms 60
    - chain_window_ms 140 (in last 60% of recovery)
    - arc: frontal 60°; reach 0.9 tiles
  - Heavy (Pickaxe_T1_Heavy)
    - startup 360 ms; active 140 ms; recovery 420 ms
    - stamina cost 38
    - base_damage 18 (T0 = 15)
    - base_poise_dmg 28
    - hit_stop_ms 90
    - chain_window_ms 160 (in last 50% of recovery)
    - arc: frontal 75°; reach 1.0 tiles; slight forward step 0.2 tiles during startup
- Weapon B: Makeshift Hammer (placeholder alt)
  - Light (Hammer_Light)
    - startup 220 ms; active 120 ms; recovery 340 ms
    - stamina cost 24
    - base_damage 12
    - base_poise_dmg 16
    - hit_stop_ms 70
    - chain_window_ms 140
    - arc: frontal 70°; reach 0.85 tiles
  - Heavy (Hammer_Heavy)
    - startup 420 ms; active 140 ms; recovery 500 ms
    - stamina cost 40
    - base_damage 22
    - base_poise_dmg 38
    - hit_stop_ms 100
    - chain_window_ms 160
    - arc: frontal 85°; reach 1.05 tiles; forward step 0.25 tiles

Note: Damage is before defense mitigation. Poise damage unaffected by defense unless enemy has special trait (not in Sprint 1).

## 7) Enemy Archetypes L1 (behavior + numbers)
- Goblin Grunt
  - Stats: health.max 120; defense 2; poise_max 40; poise_recover_per_sec 8; poise_break_stun_ms 800; poise_recover_delay_ms 300
  - Move: speed 2.8 tiles/s; approach_distance 0.8 tiles; backoff on low stamina (AI) not used Sprint 1
  - Attacks (weights: jab 65%, swing 35%)
    - Jab
      - startup 180 ms; active 100 ms; recovery 320 ms
      - attack_power 8 → damage_out vs player_defense
      - poise_dmg 8
      - telegraph: flashAtMs [120, 160]; total_windup_ms 180; vfx goblin_jab_wind; sfx sfx.combat.telegraph.goblin
      - cooldown 800 ms
    - Windup Swing
      - startup 420 ms; active 140 ms; recovery 520 ms
      - attack_power 12
      - poise_dmg 16
      - telegraph: flashAtMs [220, 360, 400]; total_windup_ms 420; vfx goblin_swing_wind; sfx sfx.combat.telegraph.goblin_heavy
      - cooldown 1600 ms
  - Feint: feintChance 0.1 on Windup Swing; feint cost 5 stamina (enemy)
  - A/V tokens: vfx.goblin.flash.small, vfx.goblin.flash.heavy, sfx.combat.poise_break
- Cave Burrower
  - Stats: health.max 150; defense 3; poise_max 60; poise_recover_per_sec 6; poise_break_stun_ms 900; poise_recover_delay_ms 400
  - Behavior: burrow approach from 3–5 tiles; emerge at 1.2 tiles with dust telegraph; may retreat if player >4 tiles for >1.5 s
  - Emerge Lunge
    - startup 520 ms (underground windup); active 120 ms; recovery 600 ms; punish window after emerge 400 ms (no attack, can be hit)
    - attack_power 14
    - poise_dmg 22
    - telegraph: flashAtMs [200, 460, 500]; total_windup_ms 520; vfx burrower_dust_puff; sfx sfx.combat.telegraph.burrower
    - cooldown 2200 ms
  - Retreat rule: after missing lunge, 30% chance to burrow exit and reposition 2–3 tiles back; cooldown 3000 ms
  - A/V tokens: vfx.dust.burst.small, vfx.burrow.trail, sfx.combat.poise_break_heavy

Per-attack data above includes startup/active/recovery, damage, poise_dmg, and TelegraphStartEvent emission at windup start.

## 8) Telegraphs & Cues (cross-team contract)
- TelegraphStartEvent
  - Contract: { entity: EntityId, attack_id: string, flash_at_ms: int[], total_windup_ms: int, vfx_token: string, sfx_tag: string }
  - Defaults: flash palette tokens
    - vfx.tokens: vfx.flash.small (fast), vfx.flash.heavy (slow), vfx.dust.burst.small
    - Mapping guidance: fast attacks ≤220 ms windup use small; heavy >300 ms windup use heavy; burrow uses dust
- PoiseBreakEvent
  - Contract: { entity: EntityId, duration_ms: int, sfx_tag: string, vfx_token: string }
  - Defaults: sfx.combat.poise_break, vfx.stars.small for goblin; vfx.stars.medium for burrower/player
- Audio mapping
  - IDs live in data/audio/sound-manifest.json
  - Examples
    - sfx.combat.telegraph.goblin
    - sfx.combat.telegraph.goblin_heavy
    - sfx.combat.telegraph.burrower
    - sfx.combat.poise_break
    - sfx.weapon.pickaxe.hit_light
    - sfx.weapon.pickaxe.hit_heavy
    - sfx.player.dodge

## 9) ECS Integration Notes
- Components
  - Health{current,max}, Defense{value}, Stamina{current,max,regen_per_sec,drain_mult,state_mult}, Poise{current,max,recover_per_sec,break_stun_ms,recover_delay_ms,last_hit_time}
  - Damageable{faction, hurtbox}, Tool{attack_power, attack_id, archetype}, Faction{enum: Player, Enemy}, SpriteRef{asset_id}, Collider{aabb, mask}, StateMachine{state, timers}
- Events (order as in Section 3)
  - TelegraphStartEvent{entity, attack_id, flash_at_ms, total_windup_ms, vfx_token, sfx_tag}
  - DamageEvent{source: EntityId, target: EntityId, amount: int, type: enum(Physical), poise:int, hitstun_ms:int, hit_stop_ms:int, attack_id:string}
  - PoiseBreakEvent{entity, duration_ms, sfx_tag, vfx_token}
  - PlaySfxEvent{tag:string, pos:Vec2}
- Systems (tick order)
  1) InputSystem
  2) PlayerStateSystem (includes stamina gating, commit logic)
  3) EnemyAISystem (schedules telegraphs; raises TelegraphStartEvent)
  4) StaminaSystem (apply regen/drain pre-commit)
  5) AttackTimingSystem (startup/active/recovery toggles; i-frame scheduling)
  6) CollisionSystem (queries active hitboxes vs hurtboxes; emits DamageEvents)
  7) DamageSystem (applies health/poise; schedules hit-stop; emits PoiseBreakEvent/PlaySfxEvent)
  8) HitStopSystem (applies freezes for next tick based on queued durations)
  9) AudioVfxSystem (consumes PlaySfxEvent/TelegraphStartEvent/PoiseBreakEvent)

ID pattern: attack_id strings like "Pickaxe_T1_Light", "Goblin_Jab", "Burrower_EmergeLunge".

## 10) Tuning Targets & Acceptance Ranges
- Encounter TTK target
  - 25–35 sec vs single Goblin Grunt using T1 pickaxe, baseline player skill, no cheese; ~30 s average over 10 trials
- Stagger cadence
  - 1 poise break on goblin every 6–10 sec given occasional heavy or 2–3 lights in sequence
- Stamina loop
  - 2–3 light attacks before refill pause; heavy requires deliberate window and drains majority of bar

## 11) Text Sim Plan (MVP)
- Outline
  - Load param JSON (player/enemy stats, moves, timings, defense, stamina, poise)
  - Initialize timeline; step dt_sim = 10 ms
  - Player policy: attempt light→light chain when in range and stamina allows; attempt heavy when chain window and stamina >= threshold; dodge when enemy telegraph within X ms
  - Enemy policy: pick attack by weights; emit telegraph; execute if not feinted
  - Resolution uses Section 3 order; per-10ms trace logs state, stamina, poise, health, enemy state
- Pseudocode (abbrev)
  - init()
    - load params
    - t = 0; dt = 0.010; trace = []
  - loop while enemy.health > 0 and player.health > 0
    - read_input_policy(player, enemy, t)
    - update_state_machines()
    - apply_stamina_regen()
    - advance_timers()
    - if attack_active(player): check_hit(player, enemy)
    - if attack_active(enemy): check_hit(enemy, player)
    - resolve_damage_and_poise()
    - schedule_and_apply_hitstop()
    - log_trace(t, states, stamina, poise, health)
    - t += dt
  - output summary: TTK, average stagger interval, stamina_starvation_pct (time with stamina < 22)
- Worked example (baseline defaults)
  - Setup: Player T1 pickaxe (defense 1), Goblin Grunt (defense 2), distance 0.8 tiles, player pattern: L-L, wait, H when safe
  - Result (illustrative): TTK ≈ 31.4 s; avg stagger interval ≈ 7.6 s; stamina_starvation_pct ≈ 41%
  - Abbreviated trace (10 ms rows; ... indicates skipped)
    - t=0.00: P:idle S=60 Poise=50 HP=100 | G:approach
    - t=0.10: P:attack_light(startup) S=60→commit@0.06s S=38 | TelegraphStart(Goblin_Jab)
    - t=0.28: P:attack_light(active) hit G dmg=8 poise=12 hitstop=60ms | G:hitstun(220ms)
    - t=0.46: P:chain_window → attack_light start; S commit->16
    - t=0.64: P:attack_light(active) hit G dmg=8 poise=12→G.poise=16 | G:hitstun
    - t=1.20: P:recovery end; S≈24 (regen during action low); waits to ≥38
    - t=2.40: P:attack_heavy(startup) commit@2.52 S=38→0
    - t=2.66: P:attack_heavy(active) hit G dmg=16 poise=28→G.poise<=0 → PoiseBreak(800ms)
    - ...
    - t=9.80: G HP≈72; one poise break occurred at t≈2.66; next at t≈10.3
    - ...
    - t=31.40: G HP<=0; Summary emitted

## 12) Risks & Assumptions
- Risks
  - Over-locking numbers pre-playtest; expect +/-15% damage/poise/stamina tweaks
  - ECS event ordering bugs around hit-stop freeze boundaries
  - Per-animation root motion offsets may be required to align reach arcs
- Assumptions
  - 60 Hz fixed-step authoritative; collision is AABB; attack arc simplified to short-range frontal lobe
  - Simple AI heuristics for Sprint 1; no pathfinding complexities underground for Burrower beyond linear lerp

## 13) Acceptance Checklist
- Clear math for stamina/regen and poise thresholds
- Resolution order and state transitions defined
- Two weapon archetypes + two enemy archetypes documented
- Telegraph and poise break event contracts defined
- Sim pseudocode + one worked example provided
- Tuning targets listed for TTK and stagger cadence

## Appendix A: Default Numbers Table (concise)
- Player stamina
  - max 60; regen_per_sec 18; drain_mult 1.0
  - Costs: light 22; heavy 38; dodge 18; block 12/s; sprint 8/s (disabled Sprint 1)
  - Dodge i-frames: 100–260 ms of a 460 ms dodge
- Attack timings (player)
  - Pickaxe T1 Light: 180/120/280 ms; hit-stop 60 ms; chain 140 ms
  - Pickaxe T1 Heavy: 360/140/420 ms; hit-stop 90 ms; chain 160 ms
  - Hammer Light: 220/120/340 ms; hit-stop 70 ms; chain 140 ms
  - Hammer Heavy: 420/140/500 ms; hit-stop 100 ms; chain 160 ms
- Damage (pre-defense) and poise (player)
  - Pickaxe T1 Light: dmg 10; poise 12
  - Pickaxe T1 Heavy: dmg 18; poise 28
  - Hammer Light: dmg 12; poise 16
  - Hammer Heavy: dmg 22; poise 38
- Enemy baselines
  - Goblin Grunt: HP 120; DEF 2; Poise 40 (8/s); Break 800 ms; Jab 180/100/320 ms (dmg 8, poise 8); Swing 420/140/520 ms (dmg 12, poise 16); telegraph flashes [120,160] jab; [220,360,400] swing
  - Cave Burrower: HP 150; DEF 3; Poise 60 (6/s); Break 900 ms; Emerge Lunge 520/120/600 ms (dmg 14, poise 22); telegraph flashes [200,460,500]; punish 400 ms

## Appendix B: Data Field Glossary
- attack_id: string identifier, pattern <Archetype>_<Tier>_<Move> (e.g., Pickaxe_T1_Light), enemies <Enemy>_<Move> (Goblin_Jab)
- faction: enum { Player, Enemy }
- sfx_tag: string id into data/audio/sound-manifest.json (e.g., sfx.combat.telegraph.goblin)
- vfx_token: string id into VFX registry (e.g., vfx.flash.heavy, vfx.dust.burst.small)
- damage.type: enum { Physical } (extend later)
- timers: startup_ms, active_ms, recovery_ms fields on attack data; hitstun_ms per impact
- i_frame_window: {start_ms:int, end_ms:int} relative to dodge start
- collider.mask: bitmask for team-based filtering; player hits Enemy, enemy hits Player
- event ordering: TelegraphStartEvent → DamageEvent → PoiseBreakEvent/PlaySfxEvent; HitStop scheduled after DamageEvent and applied next tick

That’s the plan and the iron to make it. Forge ahead.