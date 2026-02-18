# The Far Mine — Combat Stamina/Poise MVP (Sprint 1 Gamma)

Owner: Battlehammer Ironshield (Gamma)  
Version/Date: v0.1 / 2026-02-18  
Status: Draft v0.1

## 1) Title & Scope
Scope (Sprint 1 Gamma MVP):
- Player melee basics, stamina/poise model, player-focused state machine, I-frames/hitstun rules, damage/stagger math, telegraph timings, hit-stop, tuning ranges.
- Two weapon archetypes (Pickaxe T0, Hammer T1).
- Two L1 enemies (Goblin Grunt, Cave Burrower).
- ECS integration hooks and events.
- Deterministic collision/hit resolution order.
- Pseudocode for text sim and parameter externalization for Rust/Bevy runtime and JS harness tests.
- Target TTK: ~25–35 s vs a single L1 enemy with starter Pickaxe.

Out of scope: ranged, status effects, AI sophistication beyond simple approach/attack loops, movement physics, networking.

## 2) Design Pillars (concise)
- Telegraph-first readability.
- Stamina as tempo throttle.
- Poise as the lesson-teacher (risk windows via stagger/break).
- Hits feel weighty (hit-stop).
- Fairness via clear I-frames and parry logic.

## 3) Core Variables & Ranges (MVP defaults with tuning bounds)

Stamina and Costs
- Stamina.max = 100 (80–120)
- Stamina.regen_per_sec = 18 (12–24)
- Stamina.regen_delay_ms = 500 (300–700)
- Stamina.on_hit_regen_pause_ms = 250
- Costs:
  - light_attack = 15 (10–18)
  - heavy_attack = 35 (28–42)
  - dodge = 20 (16–24)
  - block_tick = 5 per 200 ms while holding guard
  - parry_window_ms = 120 (90–150) before attack active start

Poise (player baseline)
- Poise.max = 60 (40–80)
- Poise.recover_per_sec = 12 (8–16)
- Poise.break_duration_ms = 800 (700–900)
- Enemies define their own (see §11).

Dodge / I-frames
- total_dodge_ms = 180 (160–220)
- iframes_ms = 120, centered on dodge peak
- Move distance: tied to player speed (not elaborated here).

Hit-stop
- Attacker: 10–18 ms (default choose per attack)
- Victim: 20–36 ms (default choose per attack)
- Global clamp: [8..40] ms

## 4) Move State Machine (player-focused; enemies mirror with AI control)
States
- idle, move, attack_light, attack_heavy, chain_followup, dodge, block, parry_flash (brief), hitstun_light, hitstun_heavy, poise_broken, death.

Priorities (highest to lowest)
- death > poise_broken > dodge (iframes) > active attack > block/parry > movement/idle.

Transitions
- idle/move → attack_light (on input and stamina ≥ cost) → chain_followup (buffer window 140 ms after recovery start; up to 3 hits in light chain).
- idle/move → attack_heavy (on input and stamina ≥ cost).
- any non-critical → dodge (consumes stamina; grants I-frames per §3).
- idle/move → block (hold; drains per 200 ms tick if blocking any valid incoming angle or under pressure rules; see §6).
- While blocking: if within parry_window_ms before incoming active: enter parry_flash; no damage; apply counter-poise to attacker; brief stun to attacker.
- On hit: enter hitstun_light or hitstun_heavy by attack tag unless covered by I-frames or parry. If poise ≤ 0: enter poise_broken (uninterruptible stagger for break_duration_ms; stamina regen paused first 300 ms).
- health ≤ 0 → death.

## 5) Timing Model & Windows (ms @60 Hz reference)
AttackDef fields:
- windup_ms, active_ms, recovery_ms, cooldown_ms
- telegraph.flash_at_ms relative to active start (negative, e.g., -110)
- TelegraphStartEvent fires at now + (windup_ms + flash_at_ms)

Per-frame resolution order (deterministic):
1) Process inputs/state changes (respect priorities).
2) Advance timers; when crossing telegraph threshold, emit TelegraphStartEvent.
3) At active window start, enable collisions; for each collision, resolve in order: I-frames → parry → block → hit.
4) Emit DamageEvent and apply hit-stop (pause attacker/victim action clocks by configured ms; clamp to [8..40]).
5) Update poise; if poise ≤ 0: emit PoiseBreakEvent and enter poise_broken for configured duration; cancel non-unstoppable attacks (MVP: none are unstoppable).

Tick note: 60 Hz reference (~16.67 ms); timers are ms-precise and accumulated; events fire when crossing thresholds, not just on exact equals.

## 6) Damage, Block, Parry, Stagger Math
Raw damage
- Let attack_power = AttackDef.damageBase
- Let weapon_power = weapon tier modifier (MVP: 0 unless otherwise set)
- dmg = max(1, attack_power + weapon_power - defense)

On block
- Negate full damage; drain stamina:
  - block_cost = base 6 + ceil(dmg * 0.6)
  - chip_health = ceil(dmg * 0.1)
- If stamina < block_cost: apply excess as extra chip at 0.5 per missing stamina (cap total chip to 50% of dmg).
- Example: dmg=20 → base block_cost=6+12=18; chip=2. If stamina=10, shortfall=8 → extra_chip=ceil(8*0.5)=4, total chip=2+4=6 (≤ cap=10).

On parry (within parry_window before active)
- Damage = 0; chip = 0.
- Attacker receives parry_poise = base 16 + ceil(dmg * 1.0).
- Attacker enters hitstun_light = 220 ms (fixed for MVP on parry).
- Emit parry.success SFX (route via PlaySfxEvent).

Poise damage and breaks
- Apply AttackDef.poiseDamage on hit (or on block? MVP: on full hit only).
- When poise ≤ 0 → poise_broken for break_duration_ms (player baseline 800; enemy per §11).
- On exit from poise_broken: restore poise to max * 0.5; begin recovering normally.
- Attacks are interrupted on poise break unless marked unstoppable (MVP: none).

Hitstun durations (derived defaults; clamps)
- light = clamp(200 + 2 × poiseDamage, 200, 260)
- heavy = clamp(300 + 3 × poiseDamage, 320, 420)

## 7) Stamina Regen & Delays
- After any stamina spend, start regen_delay_ms timer (default 500 ms) before regen begins.
- On receiving a hit, pause regen an additional on_hit_regen_pause_ms (250 ms).
- Regen rates:
  - idle or blocking: 100% of regen_per_sec.
  - moving or attacking: 75% of regen_per_sec.
  - in poise_broken: paused for first 300 ms, then 50% of regen_per_sec until state exit.
- Stamina cannot exceed max; floors at 0.

## 8) Telegraphs & FX Contracts
Per-attack telegraph definition
- telegraph { flash_at_ms (negative), color_token, arc_overlay }

Color tokens (MVP)
- mapping.telegraph.arc.amber (enemy)
- mapping.telegraph.arc.cyan (player heavy)
- mapping.telegraph.arc.green (parry cue, internal)

ECS Events
- TelegraphStartEvent { attacker:Entity, attack_id:string, flash_at_ms:int, color_token:string, pos:Vec2, arc_deg:int, range_px:int }
- AttackCommitEvent { attacker:Entity, attack_id:string, active_ms:int }
- PoiseBreakEvent { entity:Entity, duration_ms:int }
- StaggerStartEvent { entity:Entity, kind:"light"|"heavy", duration_ms:int }
- Existing: DamageEvent, PlaySfxEvent

Audio
- sfx.combat.telegraph.whoosh on TelegraphStartEvent
- sfx.combat.poise.break on PoiseBreakEvent
- parry.success on successful parry (as above)

## 9) Collision & Hit Resolution Order (deterministic)
For each victim intersecting attack geometry during active:
1) If victim is in dodge I-frames: no hit; consume no further logic.
2) Else if victim is blocking and within parry_window before active start: parry success (see §6); emit parry SFX; attacker receives parry_poise.
3) Else if victim is blocking: apply block flow (stamina drain, chip).
4) Else: apply full damage and poiseDamage per attack.

Notes
- Multi-hit disabled in MVP; per-attack geometry.multiHit=false.
- An attack can only apply to a given victim once per active window.

## 10) Weapon Archetypes (MVP examples with concrete numbers)

Pickaxe T0 (Starter Tool)
- Light:
  - windup=240 ms, active=70 ms, recovery=260 ms
  - damage_base=8, poise_damage=10
  - stamina_cost=15
  - hit_stop {att=12, vic=26}
  - chain window=140 ms
  - 3-hit chain damage scaling: 1.0 / 0.9 / 1.1
- Heavy:
  - windup=360 ms, active=90 ms, recovery=340 ms
  - damage_base=16, poise_damage=18
  - stamina_cost=35
  - hit_stop {att=16, vic=34}

Hammer T1 (Heavy Prototype for tuning)
- Light:
  - windup=280 ms, active=80 ms, recovery=300 ms
  - damage_base=12, poise_damage=14
  - stamina_cost=18
  - hit_stop default to 14/30 unless overridden
- Heavy:
  - windup=420 ms, active=110 ms, recovery=420 ms
  - damage_base=24, poise_damage=28
  - stamina_cost=38
  - hit_stop default to 18/36 unless overridden

Geometry guidance (both archetypes)
- Range: 70–85 px (Pickaxe), 65–80 px (Hammer)
- Arc: 75–110 degrees (light), 90–130 degrees (heavy)

## 11) Enemy Archetypes L1 (summary; full JSON in data/combat)
Goblin Grunt
- health ≈ 140; defense = 1
- poise { max=40, recover_per_sec=9, break_duration_ms=700 }
- attacks: jab (telegraph flash_at_ms = -110), slash (flash_at_ms = -120)
- approach speed tuned to ≈ 22 px/frame bucket (authoritative in movement config)
- attack powers (guidance): jab damage_base=7, poiseDamage=8; slash damage_base=10, poiseDamage=12

Cave Burrower (MVP)
- health ≈ 160; defense = 2
- poise { max=50, recover_per_sec=8, break_duration_ms=800 }
- pattern: surface poke (telegraph arc), short burrow reposition (adds targeting noise), lunge with longer telegraph (flash_at_ms = -140), punishable recovery on whiff
- attack powers (guidance): poke damage_base=8, poiseDamage=10; lunge damage_base=14, poiseDamage=16
- Full config in enemy-cave-burrower.json

## 12) Tuning Targets & Cadence
- Solo TTK vs L1 enemy target: 25–35 s with Pickaxe T0.
- Expected average: 6–9 successful light hits + 1–2 heavies to kill Goblin Grunt; similar or +1 heavy for Cave Burrower given defense=2.
- One poise break every 8–12 s if player presses advantage (chain follow-ups, proper spacing).
- Heavies punish over-commit; light-chain is sustainable with good stamina discipline. Spamming heavies should bottom out stamina and open the player to risk.

## 13) ECS Integration Hooks
Components (attach to entities as applicable)
- Health { current:int, max:int }
- Stamina { current:int, max:int, regen_per_sec:float, regen_delay_ms:int }
- Damageable { defense:int, poise:{ max:int, value:int, recover_per_sec:float, break_duration_ms:int } }
- Faction { id:enum/player|enemy|neutral }
- AttackState { optional; holds current AttackDef id, timers, chain index }
- DodgeState { timer_ms:int, iframes_center_ms:int, iframes_ms:int }
- BlockState { is_blocking:bool, next_tick_ms:int }
- SpriteRef { id }
- SoundEmitter { id? }

Systems (Gameplay stage)
- CombatResolveSystem
  - Consumes queued attack states; manages telegraph timing; enables active hitboxes; performs collision queries; resolves I-frames/parry/block/hit; emits DamageEvent, TelegraphStartEvent, AttackCommitEvent, PoiseBreakEvent, StaggerStartEvent; applies hit-stop pausing action clocks only (not global).
- StaminaSystem
  - Tracks spend events; manages regen_delay_ms and on_hit_regen_pause_ms; adjusts regen rates by movement/attack/poise_broken states.
- PoiseSystem
  - Applies poise damage; starts/ends poise_broken; restores poise to 50% on break end; handles recover_per_sec.

Events (register in Bevy app and JS harness)
- TelegraphStartEvent, AttackCommitEvent, PoiseBreakEvent, StaggerStartEvent, DamageEvent, PlaySfxEvent

## 14) Data Contracts (Enemy/AttackDef JSON outline)
Enemy JSON (e.g., goblin)
- { version, id, meta, visuals, audio, stats, movement, ai, attacks[], loot, acceptance }

AttackDef
- {
  id, name,
  geometry: { range_px:int, arc_deg:int, multiHit:false },
  timings: { windup_ms:int, active_ms:int, recovery_ms:int, cooldown_ms:int },
  staminaCost:int,
  poiseDamage:int,
  damageBase:int,
  hitStop: { attackerMs:int, victimMs:int },
  telegraph: { flashAtMs:int, colorToken:string, arcOverlay:string },
  onHit: { knockbackPx:int, applyStagger:"light"|"heavy"|null },
  sfxOverrides?: { telegraph?:string, swing?:string, hit?:string },
  acceptance: { clamps:boolean, notes:string[] }
}

MVP notes
- weaponPower is considered 0 unless provided elsewhere (weapon-tier data). Effective damage uses damageBase + weaponPower - defense.
- multiHit must be false in MVP.

## 15) Text Sim Pseudocode & Params Externalization
File: src/combat/sim_pseudocode.txt (to be created)

Outline
- simulate_scenario(params, script, seed):
  - init RNG with seed
  - spawn player, enemy with health/stamina/poise using params
  - time_ms = 0
  - while both alive:
    - process script(time_ms) → player inputs (light/heavy/dodge/block/idle)
    - advance timers; handle telegraph events
    - if any attack enters active: resolve collisions order: I-frames → parry → block → hit
    - apply dmg, poise, hit-stop (pause local clocks)
    - apply stamina spends and regen pacing
    - log: time_ms, player_state, enemy_state, player_stamina, enemy_poise, dmg_applied, poise_events
    - time_ms += dt (e.g., 16 ms)
  - return trace.csv, summary { TTK_ms, avg_DPS, avg_time_between_staggers, stamina_floor, time_in_poise_broken }

Scripts
- light_spam: chain 3x light whenever chain window is open; repeat on cooldown.
- heavy_poke: heavy every ~1.5 s if stamina allows; otherwise idle to regen.
- mixed_chain: light-light-heavy cadence respecting chain window and stamina.

Outputs
- CSV-like trace and summary metrics consumable by JS harness and Rust unit tests.

Params JSON (data/combat/params-mvp.json)
- {
  stamina: { max, regen_per_sec, regen_delay_ms, on_hit_regen_pause_ms,
    costs: { light, heavy, dodge, block_tick } },
  poise: { player_max, player_rps, break_ms },
  timings: { parry_window_ms, total_dodge_ms, iframes_ms },
  hit_stop: { att_ms_range:[min,max], vic_ms_range:[min,max], clamp:[8,40] },
  weapon_archetypes: { pickaxe_t0:{...}, hammer_t1:{...} },
  enemies: { goblin_grunt:{...}, cave_burrower:{...} }
}

Worked example (expected)
- mixed_chain vs goblin_grunt:
  - Expected TTK ≈ 32 s
  - ~2 poise breaks
  - stamina floor ≈ 22
  - Notes: chain scaling 1.0/0.9/1.1 and goblin defense=1 yield average light hit ≈ max(1, 8-1)=7, heavy ≈ 15; cadence bounded by stamina and recovery windows.

## 16) Acceptance Checklist (for this spec)
- Stamina costs/regen math and delays specified, including state-based regen modifiers and pause on hit.
- Poise thresholds, damage application, break behavior, and recovery clarified.
- Deterministic hit resolution order: I-frames → parry → block → hit.
- Clear player state machine with priorities and transitions; chain buffer window detailed.
- Telegraph timing and event emission rules provided; hit-stop timings and clamps provided.
- Concrete numbers for two weapon archetypes and two L1 enemy archetypes.
- ECS components, systems, and events named and scoped for Bevy integration.
- Data contract outlines for Enemy and AttackDef.
- Sim pseudocode and externalized params JSON shape defined.
- Tuning targets align to ~30 s TTK with Pickaxe T0.

## 17) Risks & Assumptions
- Numbers are pre-playtest; will iterate after sandbox TTK tests and telemetry from sim harness.
- Event ordering may require minor emit-site tweaks in CombatResolveSystem to align with animation systems.
- Telegraph flash_at_ms may require per-anim offsets due to blend trees; color tokens must remain stable across VFX/audio.
- weapon_power assumed 0 for MVP; introducing tiers later may compress TTK—monitor and retune defense/health accordingly.
- Hit-stop must pause only attacker/victim action clocks, not global time; verify in both Rust and JS harness for determinism.

— Battlehammer Ironshield, hammer rings true.