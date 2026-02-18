# The Far Mine — Combat Stamina/Poise MVP v0.1 (Sprint 1)

Owner: Battlehammer Ironshield (Gamma)  
Version: 0.1 • Date: 2026-02-18  
Audience: Engineers and designers integrating Bevy ECS combat (Rust-first; JS prototype notes included)

## 1) Scope
- Player vs L1 enemies (Goblin Grunt, Cave Burrower).
- Systems: stamina/poise model, move state machine, I-frames/hitstun, damage/stagger math, telegraph timings, hit-stop, tuning ranges, ECS hooks.
- Implementation-ready for Bevy ECS; timing constants and event ordering defined. JS prototype: mirror via 60 Hz tick with deterministic hit resolution.

## 2) Combat Design Pillars (brief)
- Balance creed: every swing earned, every foe teaches.
- Readability: telegraphs first; fairness via stamina/poise.
- Tactility: hit-stop, poise breaks, concise pacing (TTK ~30s per solo L1).

## 3) Core Variables & Definitions
- Timing constants: frame = 16.67 ms at 60 Hz. All times in ms. Frame-rounding guidance: quantize scheduled windows to nearest frame (round half up); clamp to ≥1 frame for any non-zero duration.
- Stamina
  - Fields: max, current, regen_per_sec, regen_delay_ms.
  - Costs: attack_light, attack_heavy, dodge, block_hold_per_sec, block_chip_on_impact via block_stamina_factor.
  - GuardBreak: guard_break_ms on stamina depletion while blocking.
- Poise
  - Fields: poise_max, poise_value (current), recover_per_sec, break_duration_ms.
  - Break threshold: if poise_value ≤ 0 → PoiseBreak state; recover to poise_max after break with wakeup ratio (see §8).
- Health/Attributes
  - health (base), attack_power (attacker), defense (flat armor MVP).
  - Damage types: “physical” only for MVP.

## 4) Formulas (clear math)
- Stamina cost
  - On action start (windup begin): stamina_current -= stamina_cost.
  - Block drains: stamina_current -= block_hold_per_sec * dt_seconds while block held.
  - Partial refund if canceled pre-active (player cancel): refund_pct = 0.5; refund = floor(stamina_cost * refund_pct). If interrupted by heavy stagger/poise_break: refund = 0.
- Stamina regen
  - Regen paused during active, recovery, cooldown and while block_hold.
  - Regen resumes after regen_delay_ms since last stamina spend or hit taken; linear rate = regen_per_sec (per second).
- Damage
  - damage_out = max(1, (attacker.attack_power + weapon_power) - target.defense).
  - Apply block if blocking and stamina_current > 0: damage_blocked = floor(damage_out * block_factor); incoming_after_block = damage_out - damage_blocked.
  - Block stamina chip on impact: stamina_damage = ceil(damage_out * block_stamina_factor). If stamina reaches 0 due to chip → GuardBreak.
- Poise damage
  - poise_value' = max(0, poise_value - poise_damage).
  - If poise_value' == 0 → PoiseBreakEvent.
- Hit-stop
  - Apply hitStop.attacker_ms to attacker and hitStop.victim_ms to victim after hit resolve (see order §6).
- Parry (MVP hook; default disabled)
  - parry_window_ms = 80 from perfect block start. On parry: negate damage, stamina no chip, inflict PoiseBurst on attacker (poise_damage += 20). Feature flag off by default.
- Knockback
  - onHit.knockback_px along attack facing; integrate via KnockbackSystem with simple velocity impulse then damp over 120 ms.

## 5) Move State Machine (player/enemy common)
States: idle, windup, active, recovery, cooldown, dodge, block_hold, hitstun, poise_broken, dead.

- idle → windup on attack input if stamina ≥ cost and not in hitstun/poise_broken/dead.
- windup → active when windup_ms timer elapses; windup interrupted by heavy stagger or poise_broken.
- active → recovery at active_ms end.
- recovery → cooldown at recovery_ms end.
- cooldown → idle when cooldown_ms timer elapses.
- any (except dead) → hitstun on DamageEvent with stagger flag (see §8).
- any (except dead) → poise_broken on PoiseBreakEvent.
- idle → dodge if stamina ≥ dodge_cost; grants i-frames for dodge_iframes_ms during first dodge_iframe_window_ms of the dodge.
- idle/block_hold → block_hold while input held; exit on release. If stamina reaches 0 from block chip → GuardBreak → poise_broken-like special stagger for guard_break_ms, then return to idle.

Defaults (MVP): dodge_total_ms = 420, dodge_iframe_window_ms = 220, dodge_iframes_ms = 180.

## 6) I-frames and Hit Resolution Order
Resolution order per hit frame:
1) TelegraphStart (windup) scheduled
2) Active window begins
3) Collision check
4) Deterministic resolve order (ascending entity id) within Combat Resolve stage
5) Apply damage (block/parry handled)
6) Apply poise damage and check PoiseBreak
7) Emit hit events (Audio/FX)
8) Apply hit-stop
9) Apply knockback
10) Enter victim hitstun/poise_broken as applicable

I-frames: only during dodge i-frame window. Block provides no i-frames.

## 7) Telegraphs & VFX/Audio Cues
- Telegraph fields per attack: windup_ms, active_ms, recovery_ms, cooldown_ms, flash_at_ms (negative offset from active start), color_token, arc_overlay (bool).
- Contracts:
  - TelegraphStartEvent at (active_start_ms + flash_at_ms).
  - TelegraphEndEvent at active_start_ms.
  - Debounce via ai.telegraph_debounce_ms (no re-emit within window).
- Palette tokens: mapping.telegraph.arc.amber (default), .red (danger), .green (future parry-ready).
- Audio: sfx.combat.telegraph.whoosh on TelegraphStart.

## 8) Hit-Stop, Stagger, and Stun Windows
- HitStop clamps: attacker_ms ∈ [8..24], victim_ms ∈ [16..48]. Defaults per attack in data.
- Stagger tiers:
  - Light stagger: victim cannot act; move speed 40% for (victim_ms + extra_stagger_ms). extra_stagger_ms ∈ [80..120], default 100.
  - Heavy stagger: interrupts windup; occurs on PoiseBreak or when poise_damage / target.poise_max ≥ 0.4 on a single hit.
- PoiseBreak:
  - Set poise_value = 0; victim enters poise_broken for break_duration_ms.
  - On exit, poise_value = floor(poise_max * break_wakeup_ratio). break_wakeup_ratio = 0.5.

## 9) Tuning Targets & Encounter Pacing
- Solo TTK vs L1: 25–35 s @ light attack 1.0–1.3 Hz, 75% hit rate, 10–15% time dodging.
- Stagger cadence: one light stagger every 2–4 landed hits; PoiseBreak every ~6–10 s under pressure.
- Guard-break rarity: ≤1 per 20 s with judicious blocks.

## 10) Weapon Archetypes (MVP)
- Pickaxe Light
  - windup 220, active 70, recovery 260, cooldown 300, flash -100
  - stamina_cost 8; poise_damage 8
  - hitStop {attacker_ms:12, victim_ms:24}
  - weapon_power = 6; onHit.knockback_px = 12
- Pickaxe Heavy
  - windup 420, active 90, recovery 380, cooldown 520, flash -140
  - stamina_cost 16; poise_damage 16
  - hitStop {attacker_ms:16, victim_ms:36}
  - weapon_power = 12; onHit.knockback_px = 18
  - Heavy causes heavy stagger on counter-hit (if attacker hit during target windup)

## 11) Enemy Archetypes (L1)
- Goblin Grunt
  - stats: health 140, attack_power 5, defense 1
  - poise: {max 40, value 40, recover_per_sec 9, break_duration_ms 700}
  - attacks:
    - Jab: windup 260, active 80, recovery 280, cooldown 450, flash -110, hitStop {12,24}, poise_damage 6, onHit.knockback_px 10
    - Slash: windup 340, active 90, recovery 320, cooldown 520, flash -120, hitStop {14,28}, poise_damage 9, onHit.knockback_px 12
- Cave Burrower (see data/combat/enemy-cave-burrower.json)
  - exemplar lunge: windup 380, active 90, recovery 380, cooldown 560, flash -120, hitStop {14,32}, poise_damage 10, onHit.knockback_px 16
  - stats: health 160, attack_power 6, defense 1, poise {max 50, value 50, recover_per_sec 9, break_duration_ms 700}

## 12) Clamps & Ranges (enforced)
- Timings per attack (ms): windup [200..700], active [60..140], recovery [200..600], cooldown [250..800], flash_at_ms [-180..-80]
- HitStop (ms): attacker_ms [8..24], victim_ms [16..48]
- Poise: max [20..80], recover_per_sec [6..14], break_duration_ms [600..900]
- Stamina: max [70..140], regen_per_sec [12..28], regen_delay_ms [350..550]
  - Costs: light [6..10], heavy [14..20], dodge [10..18], block_hold_per_sec [6..12], block_stamina_factor [0.5..1.2]
  - Guard_break_ms [650..900]
- Movement/geometry: melee range_px [16..28], arc_deg [45..100]

## 13) ECS Integration Hooks
- Components
  - Health {value, max}
  - Stamina {max, value, regen_per_sec, regen_delay_ms, guard_break_ms, last_spend_time}
  - Damageable {armor, poise_max, poise_value, poise_recover_per_sec, break_duration_ms, break_wakeup_ratio}
  - CombatState {state, timers, attack_id?, dodge_timers?, hitstop_remaining_ms}
  - Faction {enum: Player|Enemy|Neutral}
  - AttackDefRef {id}
  - SpriteRef, SoundEmitter
- Systems
  - CombatTimingSystem (drive state timers, transitions, telegraphs)
  - HitResolveSystem (collision → resolve order → damage/poise/block/parry → events)
  - StaminaSystem (drain/regen with delay)
  - PoiseSystem (recover out of combat and outside poise_broken)
  - KnockbackSystem (apply impulses)
- Events
  - TelegraphStartEvent { entity, attack_id, flash_at_ms, color_token }
  - TelegraphEndEvent { entity, attack_id }
  - AttackStateEvent { entity, attack_id, phase: "windup|active|recovery|cooldown" }
  - PoiseBreakEvent { entity, break_ms }
  - GuardBreakEvent { entity, break_ms }
  - DamageEvent { source, target, amount, poise_damage, blocked: bool, parried: bool }
- Event ordering: emit in Gameplay stage before Audio Bridge; Audio maps to SFX ids.

## 14) Data Contracts (Enemy/AttackDef JSON)
Enemy JSON (shape mirrored in assets):
- version: "1"
- id: string
- meta: { name, level, notes }
- visuals: { spriteId, tintToken, accentToken }
- audio: { telegraphSfxId, swingSfxId, hitSfxId, blockSfxId, parrySfxId, poiseBreakSfxId }
- stats: { health, attributes: { attackPower, defense }, poise: { max, value, recoverPerSec, breakDurationMs } }
- movement: { speedPxPerSec, approachRangePx, retreatRangePx }
- ai: { state, telegraphDebounceMs, cooldownMsRange: { min, max }, attackWeights: { [attackId]: weight } }
- attacks: [AttackDef]
- loot: { table: [ { id, weight } ], rolls, notes }
- acceptance: { clamps: true, crossRefs: true }

AttackDef:
- id, name
- geometry: { range_px, arc_deg, offset_px }
- timings: { windup_ms, active_ms, recovery_ms, cooldown_ms }
- hitStop: { attacker_ms, victim_ms }
- telegraph: { flash_at_ms, color_token, arc_overlay }
- onHit: { weapon_power, base_damage_bonus, poise_damage, knockback_px, block_factor_override?, block_stamina_factor_override? }
- sfxOverrides?: { telegraph?, swing?, hit?, block?, parry?, poiseBreak? }
Validations: enforce clamps in §12; flash_at_ms negative; sum(windup/active/recovery/cooldown) > 0; range_px and arc_deg within ranges.

## 15) Pseudocode: Timing/Resolve Loop

CombatTimingSystem (per frame):
```
fn combat_timing_system(dt_ms):
  for e in query(CombatState, AttackInput, BlockInput, DodgeInput, Stamina, Damageable):
    // Clear expired hitstop
    if e.CombatState.hitstop_remaining_ms > 0:
      e.CombatState.hitstop_remaining_ms -= dt_ms
      if e.CombatState.hitstop_remaining_ms > 0: continue

    match e.CombatState.state:
      idle:
        if DodgeInput.just_pressed && Stamina.value >= costs.dodge:
          spend_stamina(e, costs.dodge)
          enter_dodge(e, total_ms=420, iframe_window_ms=220, iframes_ms=180)
        else if BlockInput.held:
          e.CombatState.state = block_hold
        else if AttackInput.light_pressed && Stamina.value >= costs.light:
          start_attack(e, attack_id="pickaxe_light")
        else if AttackInput.heavy_pressed && Stamina.value >= costs.heavy:
          start_attack(e, attack_id="pickaxe_heavy")
      windup:
        e.CombatState.timers.windup -= dt_ms
        if e.CombatState.timers.windup <= 0:
          e.CombatState.state = active
          emit(AttackStateEvent{e, attack_id, "active"})
      active:
        e.CombatState.timers.active -= dt_ms
        if e.CombatState.timers.active <= 0:
          e.CombatState.state = recovery
          emit(AttackStateEvent{e, attack_id, "recovery"})
      recovery:
        e.CombatState.timers.recovery -= dt_ms
        if e.CombatState.timers.recovery <= 0:
          e.CombatState.state = cooldown
          emit(AttackStateEvent{e, attack_id, "cooldown"})
      cooldown:
        e.CombatState.timers.cooldown -= dt_ms
        if e.CombatState.timers.cooldown <= 0:
          e.CombatState.state = idle
      block_hold:
        // stamina drain handled in StaminaSystem
        if !BlockInput.held: e.CombatState.state = idle
      dodge:
        update_dodge(e, dt_ms)
      hitstun:
        e.CombatState.timers.hitstun -= dt_ms
        if e.CombatState.timers.hitstun <= 0: e.CombatState.state = idle
      poise_broken:
        e.CombatState.timers.poise_break -= dt_ms
        if e.CombatState.timers.poise_break <= 0:
          e.Damageable.poise_value = floor(e.Damageable.poise_max * e.Damageable.break_wakeup_ratio)
          e.CombatState.state = idle

  // Telegraph scheduling
  for e in query(CombatState with windup just entered):
    let atk = get_attack_def(e.attack_id)
    let flash_time = atk.timings.windup_ms + atk.telegraph.flash_at_ms
    if now - e.AI.last_telegraph_time >= e.AI.telegraph_debounce_ms:
      schedule_event_in(flash_time, TelegraphStartEvent{e, atk.id, atk.telegraph.flash_at_ms, atk.telegraph.color_token})
      schedule_event_in(atk.timings.windup_ms, TelegraphEndEvent{e, atk.id})
      emit(AttackStateEvent{e, atk.id, "windup"})
```

StaminaSystem:
```
fn stamina_system(dt_ms):
  for e in query(Stamina, CombatState):
    if e.CombatState.state == block_hold:
      e.Stamina.value -= block_hold_per_sec * (dt_ms/1000.0)
      if e.Stamina.value <= 0:
        e.Stamina.value = 0
        emit(GuardBreakEvent{e, e.Stamina.guard_break_ms})
        enter_guard_break_stun(e, e.Stamina.guard_break_ms)
        // exit block implicitly
    // regen gating
    let gating = (e.CombatState.state in [active, recovery, cooldown]) || (e.CombatState.state == block_hold)
    if !gating && (now - e.Stamina.last_spend_time) >= e.Stamina.regen_delay_ms:
      e.Stamina.value = min(e.Stamina.max, e.Stamina.value + e.Stamina.regen_per_sec * (dt_ms/1000.0))
```

HitResolveSystem (collision-driven during active):
```
fn hit_resolve_system(dt_ms):
  let hits = collect_collisions_where(attacker.state == active, victim.alive)
  sort(hits, by=(attacker.entity_id, victim.entity_id))
  for h in hits:
    let atk = get_attack_def(h.attacker.attack_id)
    if victim_in_iframes(h.victim): continue
    let blocked = (h.victim.CombatState.state == block_hold && h.victim.Stamina.value > 0 && facing_block(h))
    let parried = false
    var dmg = max(1, (h.attacker.attack_power + atk.onHit.weapon_power + atk.onHit.base_damage_bonus) - h.victim.Damageable.armor)
    var poise_dmg = atk.onHit.poise_damage
    if blocked:
      // optional parry window
      if PARry_FEATURE && within_parry_window(h.victim, parry_window_ms=80):
        parried = true
        dmg = 0; poise_dmg += 20
      else:
        let bf = atk.onHit.block_factor_override.unwrap_or(global.block_factor) // e.g., 0.6
        let bsf = atk.onHit.block_stamina_factor_override.unwrap_or(global.block_stamina_factor) // e.g., 0.8
        let reduced = floor(dmg * bf)
        victim_take_stamina_chip(h.victim, ceil(dmg * bsf))
        dmg -= reduced
        if h.victim.Stamina.value <= 0:
          emit(GuardBreakEvent{h.victim, h.victim.Stamina.guard_break_ms})
          enter_guard_break_stun(h.victim, h.victim.Stamina.guard_break_ms)
    apply_damage(h.attacker, h.victim, dmg, poise_dmg, blocked, parried)

fn apply_damage(source, target, amount, poise_damage, blocked, parried):
  if amount > 0:
    target.Health.value = max(0, target.Health.value - amount)
  if poise_damage > 0:
    target.Damageable.poise_value = max(0, target.Damageable.poise_value - poise_damage)
  let atk = get_attack_def(source.attack_id)
  schedule_hitstop(source, atk.hitStop.attacker_ms)
  schedule_hitstop(target, atk.hitStop.victim_ms)
  apply_knockback(target, atk.onHit.knockback_px, source.facing)
  // Stagger determination
  if target.Damageable.poise_value == 0:
    emit(PoiseBreakEvent{target, target.Damageable.break_duration_ms})
    enter_poise_broken(target, target.Damageable.break_duration_ms)
  else:
    // light or heavy stagger
    let ratio = poise_damage as f32 / target.Damageable.poise_max as f32
    if ratio >= 0.4 || parried:
      enter_hitstun(target, atk.hitStop.victim_ms + 120)
    else:
      enter_hitstun(target, atk.hitStop.victim_ms + 100)
  emit(DamageEvent{source, target, amount, poise_damage, blocked, parried})
```

Helpers:
```
fn start_attack(e, attack_id):
  let atk = get_attack_def(attack_id)
  let cost = cost_for_attack(attack_id)
  spend_stamina(e, cost)
  // partial refund path if canceled: mark refundable_cost = floor(cost * 0.5)
  e.CombatState = windup; e.attack_id = attack_id
  e.CombatState.timers = { windup: atk.timings.windup_ms, active: atk.timings.active_ms, recovery: atk.timings.recovery_ms, cooldown: atk.timings.cooldown_ms }
```

## 16) Tuning Table (MVP defaults)
- Player
  - stamina: { max: 110, regen_per_sec: 20, regen_delay_ms: 450, guard_break_ms: 750 }
  - dodge_cost: 12
  - block_hold_per_sec: 8
  - block_factor: 0.6
  - block_stamina_factor: 0.8
- Weapons: Pickaxe light/heavy as in §10
- Enemies: Goblin Grunt, Cave Burrower per §11 and clamps §12

## 17) Text Sim Outline (for separate code/notebook)
- Scenarios
  1) Light spam at target cadence (~1.1 Hz) vs Goblin; record TTK, staggers, stamina floor.
  2) Heavy interleaved (L, L, H cycle) vs Goblin; measure PoiseBreak frequency.
  3) 3-hit chain (L-L-H) vs Cave Burrower; observe guard-breaks when blocking.
- Inputs: external JSON for player/enemy stats, attacks, costs, timings (mirror AttackDef/Enemy schema).
- Output: per-100 ms rows: t_ms, player {stamina, state}, enemy {poise, state, health}, last_event, damage_this_tick.
- Skeleton:
```
for t in range(0, 40000, 100):
  drive_inputs(schedule) // presses/releases
  combat_timing_system(100)
  hit_resolve_system(100)
  stamina_system(100); poise_system(100); knockback_system(100)
  log_row()
```
- Example trace snippet (light opening vs Goblin):
```
t, P.sta, P.state, G.hp, G.poise, event
0, 110, windup(L), 140, 40, TelegraphStart(G:-110)
220, 102, active(L), 134, 32, DamageEvent{L,6,8}; HitStop{12/24}
344, 102, recovery(L), 134, 32, -
604, 104, idle, 134, 33, -
1214, 96, active(L), 128, 25, DamageEvent{L,6,7}; Stagger(light)
```

## 18) Acceptance & Tests
- Acceptance
  - Clear math for stamina costs/regen (spend, pause, delay, resume), poise thresholds and break handling, hit resolution order, state transitions.
  - Two weapon archetypes and two enemy types defined; clamps enumerated.
- Test plan
  - Unit: stamina regen delay (resume after 450±1 ms), poise break timing (700 ms for Goblin), telegraph emit at flash_at_ms, guard break when block stamina depletes, hit-stop durations applied and unfreezing exact.
  - Integration: fixed-seed timeline with deterministic entity id ordering; assert event order (TelegraphStart → AttackState:active → DamageEvent → PoiseBreak/GuardBreak → HitStop).

## 19) Risks & Assumptions
- Tuning will need retouch after first playtests (TTK, stagger cadence).
- Event ordering must remain stable; ensure all damage resolves within one system stage pre-Audio.
- Animation frame-to-ms table alignment TBD with Visuals; current rounding uses 16.67 ms quantization.
- JS prototype notes: run at fixed 16 ms step; store fractional remainder to sync to 60 Hz; ensure stable sort by entity id for hit resolution.