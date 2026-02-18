# The Far Mine — Combat Stamina/Poise MVP (Sprint 1)

Author: Battlehammer Ironshield (Gamma)  
Version/Date: v0.1 / 2026-02-18  
Status: Draft v0.1

Scope: L1 side-view vertical slice. Melee-focused MVP: stamina/poise loop, dodge/block basics (parry disabled unless toggled), telegraph-based enemy attacks, hit-stop, deterministic damage/poise formulas. Integrates with Bevy schedules per Alpha (Gameplay, Events, RenderPrep, FixedUpdate 16 ms baseline).

---

## 1) Design Goals & Feel Targets

- Pillars:
  - Readable telegraphs
  - Earned hits, fair punish windows
  - Pressure/release cadence
  - Solo TTK vs Goblin 30±5 s with T0 pick; fair with 65% hit ratio
- Responsiveness targets:
  - Input-to-action latency ≤ 60 ms end-to-end
  - Hit-stop micro-pauses: 10–26 ms bands for MVP (fixed per-attack)

---

## 2) Core Variables & Ranges (Player MVP)

- Stamina
  - max_s = 100
  - regen_per_sec = 18–24 (baseline 20)
  - regen_delay_ms = 500 after any spend
- Action Costs
  - light = 12
  - heavy = 24
  - dodge = 18
  - block_hold = 4/sec
  - block_impact = 8 on successful block
  - Sprint: disabled in Sprint 1
- Poise
  - player max_p = 60
  - recover_per_sec = 12
  - break_threshold = 0
  - break_stun_ms = 650
  - partial_stagger: when cumulative poise_delta ≥ 15 within 600 ms cluster
- Damage
  - Base from tool.weapon archetypes
  - Defense = flat reduction
  - Minimum 1 after reduction
- I-frames
  - Dodge: 120 ms of invulnerability starting at dodge frame 2 (~33 ms from input), lasts 120 ms
  - Block parry window: off (parry disabled unless param toggle set true)
- Hit-stop (fixed per-attack for MVP)
  - Attacker_ms: light 10–12, heavy 16–20
  - Victim_ms: light 22–26, heavy 30–36

---

## 3) State Machine (Player/Enemy)

States: Idle, Windup, Active, Recovery, Dodge, Block, Hitstun, PoiseBroken, Dead

ASCII diagram (condensed):
```
        +-------+
        | Idle  |
        +---+---+
            | attack (stamina>=cost)
            v
        +---+------+
        | Windup   | --(t>=windup_ms)--> +--------+
        +---+------+                     | Active |
            ^                            +---+----+
            | dodge (allowed, stamina)       |
            | block hold                      --(t>=active_ms)-->
            | on hit -> Hitstun                   +---------+
            |                                     | Recovery|
            |                                     +----+----+
            |                                          |
 any -> Dodge (i-frames)                               v
 any -> Block (hold)                              back to Idle
 any -> Hitstun (on hit)
 Hitstun -> Idle (on timer end if !PoiseBroken)
 PoiseBroken (locks input; no move/dodge) -> Idle (on break_stun_ms end; poise reset)
 Dead: terminal
```

Deterministic transitions (guards → effects):
- Idle → Windup: on attack input AND stamina ≥ action_cost → spend stamina; set combat_state.timers; schedule TelegraphStartEvent at (now + flashAtMs)
- Windup → Active: when elapsed ≥ windup_ms → enable attack_capsule.active = true
- Active → Recovery: when elapsed ≥ active_ms → attack_capsule.active = false
- Any → Dodge: on dodge input AND stamina ≥ dodge_cost → spend stamina; set Dodge with i_frames_ms; cancel current attack hurtbox; maintain facing
- Any → Block: on block input hold → drain stamina block_hold per sec; set Block state; on block impact spend block_impact; if insufficient stamina at impact, Block fails
- On hit taken: apply damage → set Hitstun timer; apply poise damage → check break/partial stagger
- Any → PoiseBroken: if poise ≤ 0 within cluster window → lock input (no move/dodge/attack), set timer break_stun_ms; on end, set poise to p_break_recover = floor(max*0.4)
- Any → Dead: if health ≤ 0

---

## 4) Hit Resolution Order (per collision)

Within same frame (deterministic by entity id ascending):
1) Check invulnerability/i-frames
2) Block/parry check (parry disabled MVP)
3) Apply damage (with defense clamp)
4) Apply poise damage and cluster tracking
5) Schedule HitStopEvent (attacker_ms, victim_ms)
6) Apply knockback (per attack def; MVP constant or 0 if blocked)
7) Enqueue audio/FX events
8) State changes (Hitstun, PoiseBroken, Dead)

Notes:
- Successful Block: negate damage and poise; spend block_impact stamina; if stamina < block_impact at impact time → block fails and full hit applies.
- Hitstun duration determined by attack and/or stagger rules (MVP: 200–260 ms light, 300–360 ms heavy; authoring per attack; partial_stagger triggers lower bound).

---

## 5) Damage, Stamina, and Poise Formulas

Damage:
- dmg_final = max(1, floor((weapon.damage_base * multipliers) - target.defense))
- Multipliers:
  - stance = 1.0 (MVP constant)
  - backhit = 1.1 (MVP off by default)
  - enemy.damage_multiplier (from enemy archetype; default 1.0)

Stamina:
- Spend at action start (attack, dodge, block impact; block hold drains per second)
- Regen only if time_since_last_spend ≥ regen_delay_ms
- regen_rate = base_regen_per_sec (no modifiers MVP)
- regen_this_tick = regen_rate * dt_seconds; clamp to max

Poise:
- poise_t ∈ [0, max]
- On hit: poise_t -= attack.poise_damage
- Recovery: allowed if time_since_last_poise_hit ≥ 400 ms, rate = recover_per_sec
- Break: if poise_t ≤ 0 within 1.0 s cluster window since first contributing hit
  - Emit PoiseBreakEvent{duration_ms}
  - Set poise_t = 0; lock in PoiseBroken for duration
  - On exit: poise_t = floor(max * 0.4)
- Partial stagger: if cumulative poise_delta ≥ 15 within 600 ms without break → apply Hitstun (lower tier)

---

## 6) Telegraphs & Timing Model

- TelegraphStartEvent is fired at enemy windup_time + flashAtMs (flashAtMs is negative lead)
- Payload:
  - { entity, attack_id, color_token ("telegraph.arc.amber" etc.), flash_ms = abs(flashAtMs), arc_deg, range_px }
- Visual:
  - Optional VFX arc overlay; tokens from data/visual/color-palette.json using telegraph.arc.*
- Audio:
  - Emit event.Combat.telegraph.start on TelegraphStartEvent

---

## 7) Components & Events (ECS Integration)

Components (MVP additions):
- stamina { current:f32, max:f32, regen_per_sec:f32, regen_delay_ms:u16, last_spend_ms:u64 }
- poise { current:i32, max:i32, recover_per_sec:f32, last_hit_ms:u64, break_cooldown_ms:u16 }
- combat_state { state:str, timers:{windup_ms:u16, active_ms:u16, recovery_ms:u16, hitstun_ms:u16}, i_frames_ms:u16 }
- attack_capsule { range_px:i16, arc_deg:i16, active:bool }

Events:
- TelegraphStartEvent { entity:u32, attack_id:str, color_token:str, flash_ms:u16, arc_deg:u16, range_px:u16 }
- DamageEvent { source:u32, target:u32, amount:i32, type:"melee|env|other" }
- PoiseBreakEvent { entity:u32, duration_ms:u16 }
- HitStopEvent { attacker_ms:u8, victim_ms:u8 }

Scheduling:
- Systems emit in Gameplay stage (FixedUpdate 16 ms)
- Bridges consume in Events stage (audio/VFX, telemetry)
- RenderPrep reads VFX flags and telegraph overlays
- Determinism: resolve collisions/hits per eid ascending; run single-threaded or with explicit ordering fences for these systems

---

## 8) Weapon Archetypes (MVP examples)

- Pickaxe_T0 (Starter; light):
  - damage_base = 4; poise_damage = 2
  - windup = 220 ms; active = 80 ms; recovery = 260 ms
  - cost = 12
  - hitStop { attacker: 10, victim: 22 }
- Pickaxe_T1 (Copper; heavy):
  - damage_base = 8; poise_damage = 5
  - windup = 320 ms; active = 90 ms; recovery = 320 ms
  - cost = 24
  - hitStop { attacker: 16, victim: 30 }
- Note: Values align with data/items/tools.json intent

---

## 9) Enemy Archetypes (L1)

- Goblin Grunt (data/combat/enemy-goblin-grunt.json)
  - Health: authoring per data (tune for 25–35 s TTK vs T0 pick)
  - Defense: flat (e.g., 1–2)
  - Poise: 40; recover 9/s; break_stun_ms = 700
  - Attacks:
    - Jab: windup 260 ms, flashAtMs = -120 ms (amber), active 70 ms, recovery 240 ms, arc 60°, range 36 px
    - Slash: windup 340 ms, flashAtMs = -160 ms (amber), active 90 ms, recovery 300 ms, arc 100°, range 46 px
- Cave Burrower (to author JSON)
  - Health ≈ 120; defense 0
  - Poise 35; recover 8/s; break_stun_ms = 650
  - Attacks:
    - Pop-up Lunge: windup 420 ms; flashAtMs = -140 ms; arc 70°; range 54 px; color telegraph.arc.amber
    - Sand Toss: ranged stub off for MVP; future telegraph color telegraph.arc.cyan
    - Burrow Retreat: movement/escape; no damage
  - Behavior: emerges within 30 px of player; retreats after miss

---

## 10) Hitbox/Arc Geometry Contract

- Attack arcs are polar sectors centered on facing vector of source entity
- Parameters: arc_deg, range_px from attack def
- Collision sampling:
  - MVP coarse sweep: sample every 6 degrees; cast to target hurtbox circle/rect
  - Optional: SAT against precomputed arc mesh for higher fidelity
- Active window is continuous across active_ms; evaluate collisions each tick while attack_capsule.active = true
- Facing is frozen at Windup→Active boundary for the duration of Active (MVP)

---

## 11) Tuning Targets & Acceptance

- TTK target: 25–35 s vs Goblin with Pickaxe_T0; mixed chain (light→light→dodge cadence), 65% hit ratio
- Stagger cadence: light staggers on 2–3 quicks within ~1.2 s; poise break windows ~ every 8–12 s under pressure
- Regen feel: from full (100), can chain 3 lights (36 stamina), then recover to one more light in ~0.6–0.8 s idle

---

## 12) Text Sim Pseudocode & Scenarios

Engine model (fixed dt = 16 ms):

```
state = load_params(params.json)
scenario = load_scenario(script)
t = 0
while t < scenario.duration:
  // Input & scripting
  inputs = scenario.inputs_at(t)

  // Stamina spend on action start
  for actor in actors:
    if inputs.attack and actor.stamina.current >= cost(attack):
      actor.stamina.current -= cost(attack); actor.stamina.last_spend_ms = t
      enter_windup(actor, attack)
    if inputs.dodge and actor.stamina.current >= cost(dodge):
      spend(actor, dodge); start_dodge_iframes(actor, start=t+33, dur=120)
    if inputs.block_hold:
      drain = block_hold_per_sec * dt
      if actor.stamina.current > 0: actor.stamina.current = max(0, actor.stamina.current - drain)

  // Regen
  for actor in actors:
    if (t - actor.stamina.last_spend_ms) >= actor.stamina.regen_delay_ms:
      actor.stamina.current = min(actor.stamina.max, actor.stamina.current + actor.stamina.regen_per_sec * dt/1000.0)

  // Timers & telegraphs
  advance_combat_timers(actor, dt)
  if telegraph_due(actor, t): emit(TelegraphStartEvent(...))

  // Collisions (scripted for sim or using arc sampling)
  for atk in active_attacks:
    for target in targets_in_arc(atk):
      if target.invulnerable_at(t): continue
      if target.is_blocking and can_pay_block_impact(target):
        target.stamina.current -= block_impact; schedule_hitstop(atk, blocked=true)
        continue
      dmg = max(1, floor(atk.damage_base * multipliers(atk, target)) - target.defense)
      apply_health(target, -dmg); emit(DamageEvent(...))
      target.poise.current = max(0, target.poise.current - atk.poise_damage); update_poise_cluster(target, t)
      if should_break_poise(target): enter_poise_broken(target)
      else if partial_stagger(target): enter_hitstun(target, tier=light)
      schedule_hitstop(atk, blocked=false)

  // Hit-stop application (engine time dilation or actor-local pause)
  apply_hitstop_queues()

  // Logging
  log_trace_row(t, actors, events_emitted)

  t += dt
```

Scenarios:
- light_single: 1 light vs dummy (logs stamina spend/regen and hit-stop timings)
- heavy_single: 1 heavy vs dummy
- chain_mix: light → light → dodge → light over 1.6 s, then idle; vs Goblin archetype to observe poise cluster and regen

Worked Example (light_single vs dummy; dt=16 ms; baseline regen 20/s):
- Setup: Player stamina=100; poise irrelevant; attack Pickaxe_T0 (windup 220, active 80, recovery 260); hitstop {10,22}
- Trace (ms | action | stamina | notes)
  - 0 | input: light; spend 12 | stamina=88.0 | last_spend=0; regen paused until ≥500 ms
  - 208 | TelegraphStartEvent | stamina=88.0 | flashAtMs=-120 → fires at 220-120=100; correction: event actually at 100 ms (emitted earlier)
  - 220 | Active starts; collision at 224 | stamina=88.0 | hit connects
  - 224 | Damage applied | stamina=88.0 | dmg = max(1, floor(4*1.0 - defense(0))) = 4
  - 224 | HitStopEvent queued | stamina=88.0 | attacker_ms=10; victim_ms=22
  - 224–234 | Attacker micro-pause | stamina=88.0 | 10 ms pause (one frame)
  - 500 | Regen resumes | stamina=88.0 → next ticks add 0.32 per 16 ms
  - 512 | Regen tick | stamina≈88.32 | continues until max

Note: If defense=3, dmg = max(1, floor(4) - 3) = 1.

---

## 13) Data & Externalization

Suggested path: data/combat/params.json
- Shape:
```
{
  "stamina": {
    "max": 100,
    "regen_per_sec": 20,
    "regen_delay_ms": 500,
    "costs": { "light":12, "heavy":24, "dodge":18, "block_hold":4, "block_impact":8 }
  },
  "poise": {
    "player": { "max":60, "recover_per_sec":12, "break_stun_ms":650 },
    "enemy_defaults": { "recover_per_sec":9, "break_stun_ms":700 }
  },
  "attacks": {
    "player": {
      "light": { "damage_base":4, "poise_damage":2, "windup_ms":220, "active_ms":80, "recovery_ms":260, "hitstop":{ "attacker_ms":10, "victim_ms":22 }, "arc_deg":80, "range_px":44, "flashAtMs":-120 }
    },
    "player_heavy": {
      "heavy": { "damage_base":8, "poise_damage":5, "windup_ms":320, "active_ms":90, "recovery_ms":320, "hitstop":{ "attacker_ms":16, "victim_ms":30 }, "arc_deg":100, "range_px":52, "flashAtMs":-160 }
    }
  },
  "timings": { "dodge_i_frames_ms":120, "dodge_iframe_start_ms":33 },
  "hitstop": {
    "player": { "light": { "attacker_ms":10 }, "heavy": { "attacker_ms":16 } },
    "enemy": { "light": { "victim_ms":22 }, "heavy": { "victim_ms":30 } }
  },
  "visual": { "telegraph_color_tokens": ["telegraph.arc.amber","telegraph.arc.cyan"] }
}
```
- All color/audio tokens must align with data/visual/color-palette.json and docs/audio-systems/audio-design.md

---

## 14) Integration Notes & Risks

Bevy mapping:
- FixedUpdate (16 ms):
  - input_system → stamina_spend_system → combat_timers_system → telegraph_emit_system → attack_activation_system → collision_resolve_system → poise_system → hitstop_queue_system
- Events:
  - audio_bridge_system (TelegraphStartEvent → event.Combat.telegraph.start)
  - vfx_bridge_system (telegraph arcs, hit sparks)
- RenderPrep:
  - read VFX flags, draw arc overlays; apply camera micro-pause response to hit-stop if needed

Determinism:
- Sort entities by eid ascending in collision_resolve_system; process in that order
- Single-thread critical systems or use explicit system ordering and commands buffering

Risks:
- Numbers will shift after playtests (TTK, regen, poise)
- AI feint/approach needs tuning for fair punish windows
- Event ordering and hit-stop profiling needed across platforms
- Artists may request per-anim flash offsets (per-sprite telegraph anchor)

---

## 15) Test Plan

Unit tests:
- Damage clamp: never < 1 after defense
- Stamina regen delay: no regen before 500 ms since last spend
- Poise break timing: break only if ≤ 0 within 1.0 s cluster; recovery resumes after 400 ms since last poise hit
- Event emission points: TelegraphStartEvent timing (windup + flashAtMs), HitStopEvent on hit, PoiseBreakEvent on break

Sandbox tests:
- Spawn goblin dummy; run chain_mix 10 trials
- Log: TTK, hits landed, poise breaks, average stamina utilization
- Acceptance: mean TTK ∈ [25, 35] s; poise breaks observed at ~8–12 s cadence under pressure; input-to-action ≤ 60 ms; hit-stop in 10–26 ms bands

---

## 16) Appendix: Implementation Notes (MVP constraints)

- Parry: feature-flagged off; when on, treat as perfect block within first 80 ms of Block with counter window (future)
- Block: successful block negates damage and poise; costs block_impact stamina; if cannot pay → block fails
- Knockback: author per attack; default small for light, medium for heavy; 0 if blocked
- Facing lock: during Active only
- I-frames: Dodge only; no backhit bonus by default (toggleable later)