# The Far Mine — Combat Stamina/Poise MVP (Sprint 1)

Owner: Battlehammer Ironshield (Gamma)  
Version: 0.1 — 2026-02-18

1) Title & Scope
- Title: The Far Mine — Combat Stamina/Poise MVP (Sprint 1)
- Owner: Battlehammer Ironshield (Gamma); version/date as above.
- Scope: Side-view melee timing model with stamina/poise gates, single-attack baseline, telegraphs, hit-stop. Applies to Player and MVP enemies (Goblin Grunt, Cave Burrower). One core player melee (light) and one enemy melee (goblin.light_slash). Cave Burrower has burrow_lunge (MVP). Maps to Bevy ECS per cross-team decision and integrates with existing ECS phases.
- Out of scope (for Sprint 1 only): chained combos, cancel windows, ranged attacks, guard-break chip damage, armor curves beyond linear.

2) Variables & Baselines (authoritative definitions with units and defaults)
- Stamina (component: Stamina)
  - Fields (units: points unless noted):
    - max:int
    - value:int
    - regenPerSec:float (points/s)
    - regenDelayAfterActionMs:int (ms) — delay before regen resumes
    - regenCooldownUntilMs:int (absolute ms, set by systems)
  - Player defaults: max=100, regenPerSec=22, regenDelayAfterActionMs=700
- Poise (component: Poise)
  - Fields:
    - max:int
    - value:int
    - recoverPerSec:float (points/s)
    - breakDurationMs:int (ms)
    - brokenUntilMs:int (absolute ms, set by systems)
  - Player defaults: max=40, recoverPerSec=10, breakDurationMs=650
  - Enemy baselines:
    - Goblin Grunt: max=35, recoverPerSec=9, breakDurationMs=700
    - Cave Burrower: max=45, recoverPerSec=8, breakDurationMs=750 (see §13)
- Attributes (component: Attributes)
  - attackPower:int; defense:int
  - Player baseline: attackPower=4, defense=3
  - Goblin Grunt baseline: attackPower=5, defense=1
  - Cave Burrower baseline: attackPower=6, defense=2
- Attack Costs/Defs (component/data: AttackDef)
  - Common fields: staminaCost:int, poiseDamageToTarget:int, baseDamage:int, windupMs:int, activeMs:int, recoveryMs:int, cooldownMs:int, rangePx:int, arcDeg:int, hitStopMs:{attacker:int,victim:int}, knockbackPx:int, telegraph:{flashAtMs:int,colorToken:string}
  - Player melee (MVP):
    - light: staminaCost=16, poiseDamageToTarget=12, baseDamage=7, windupMs=300, activeMs=90, recoveryMs=340, cooldownMs=480, rangePx=20, arcDeg=75, hitStopMs(attacker/victim)=(14/28), knockbackPx=6, telegraph.flashAtMs=-100, telegraph.colorToken="mapping.telegraph.arc.amber"
    - heavy: placeholder; disabled by default (enabled=false). If enabled later, must obey §12 clamps. Until then, inputs triggering heavy do nothing but UI error “combat.disabled.heavy”.
  - Defensive Actions (system-level defs)
    - dodge: staminaCost=22, iFramesMs=180, distancePx=42. Applies regenDelayAfterActionMs on perform.
    - block: staminaDrainOnHit = min(18, floor(damageTaken*1.2)); while blocking, incoming poiseDamageToTarget reduced by 60% (effectivePoiseDamage = floor(original * 0.4)). Block raise applies regenDelayAfterActionMs.
    - parry (preview): windowMs=80 starting at block start (early block). On success: negate damageTaken, set attacker.poise.value=0 and attacker.poise.brokenUntilMs = max(nowMs + floor(attacker.poise.breakDurationMs*0.5), attacker.poise.brokenUntilMs). Emits combat.Parry then poise.Break(attacker). Parry does not spend additional stamina beyond block raise.

3) Formulas (exact, unit-safe)
- Stamina spend (on action at time t=nowMs):
  - If stamina.value >= cost:
    - stamina.value = stamina.value - cost
    - stamina.regenCooldownUntilMs = nowMs + stamina.regenDelayAfterActionMs
  - Else:
    - Deny action (no partial spend). Emit UI error: ui.error.not_enough_stamina
- Stamina regen per fixed step dt (dtSec = dtMs/1000):
  - If nowMs >= stamina.regenCooldownUntilMs:
    - stamina.value = clamp(stamina.value + stamina.regenPerSec * dtSec, 0..stamina.max)
- Poise damage application (on confirmed hit):
  - target.poise.value = clamp(target.poise.value - poiseDamage, 0..target.poise.max)
  - If target.poise.value == 0 and target.poise.brokenUntilMs < nowMs:
    - target.poise.brokenUntilMs = nowMs + target.poise.breakDurationMs
    - Emit poise.Break { entity:target, durationMs:target.poise.breakDurationMs }
- Poise recovery per fixed step dt:
  - If nowMs >= poise.brokenUntilMs:
    - poise.value = min(poise.max, poise.value + poise.recoverPerSec * dtSec)
  - Else: no recovery while broken
- Damage (MVP linear):
  - damageTaken:int = max(0, attack.baseDamage + attacker.attributes.attackPower - target.attributes.defense)
  - Note: Future armor curve to replace linear clamp with diminishing returns (tbd).
- Knockback:
  - Apply to victim along attacker facing: accumulate knockbackPx over activeMs end as a single impulse (enqueue into Movement). For MVP, treat as instantaneous horizontal impulse at hit time.

4) Timing Model & FSM (CombatTimingService)
- Attack FSM phases (per-instance):
  - Reserve/Gate: On AttackIntent, if entity.readyAtMs <= nowMs and stamina check passes, reserve attackId; set entity.readyAtMs = AttackEnd(now) + cooldownMs (see below). Emit combat.TelegraphStart immediately.
  - Telegraph: overlay-only; telegraphStartAt = nowMs; flashAtMs ∈ [-180..-80] relative to Swing start; baseline -100.
  - Windup: windupMs. Hitbox inactive.
  - Active: activeMs. Hitbox.active = true within arcDeg and rangePx. MVP single-contact: each target can be hit at most once per Active (track local hit set per attackId).
  - Recovery: recoveryMs. No cancels except external poise-break (see below).
  - AttackEnd: at end of Recovery. Emit combat.AttackEnd.
  - Lockout/Cooldown: cannot start a new attack until readyAtMs = AttackEnd + cooldownMs.
- Poise-break interaction: If attacker is poise-broken during Windup/Active/Recovery, immediately force transition to RecoveryEnd; emit combat.AttackEnd, preserve readyAtMs as already set.
- Phase clamps (applied at load): see §12.
- Events (emitted at phase boundaries or resolution):
  - combat.TelegraphStart { entity:Entity, attackId:Uid, windupMs:int, flashAtMs:int, colorToken:string }
  - combat.Swing.light { entity:Entity, attackId:Uid, activeMs:int, rangePx:int, arcDeg:int }
  - combat.Hit { attacker:Entity, target:Entity, attackId:Uid, damage:int, poiseDamage:int, hitStop:{attacker:int,victim:int} }
  - combat.Block { attacker:Entity, defender:Entity, attackId:Uid }
  - combat.Parry { attacker:Entity, defender:Entity, attackId:Uid }
  - poise.Break { entity:Entity, durationMs:int }
  - combat.AttackEnd { entity:Entity, attackId:Uid, endedAtMs:int }
- Hit-stop: On combat.Hit, apply an animation-only timeScale clamp:
  - attacker hit-stop ms ∈ [0..40], victim ∈ [0..80]. Baselines: player.light (14/28), goblin.light_slash (18/34).
  - While hit-stop active: animations paused, input buffered; physics and core timers continue (do not stall FSM timers). Visuals to implement animation timeScale overlay only.

5) Telegraphs & VFX/Color Tokens
- Default telegraph color: mapping.telegraph.arc.amber; Visuals handle opacity ≤ 0.6 and flashAtMs blink timing.
- Arc overlay gate: true for arc swings, false for line pokes (not used in MVP).
- MVP attack telegraph mapping:
  - player.light → color: amber, flashAtMs=-100, arcOverlay:true
  - goblin.light_slash → color: amber, flashAtMs=-100, arcOverlay:true
  - burrower.burrow_lunge → color: amber, flashAtMs=-120, arcOverlay:true
  - burrower.surface_burst (future): amber-to-red flick if surfacing within 140 ms of hit (future variant; MVP uses amber only)

6) AI Cadence Hooks (brief)
- Attack reattempt time (AI): after receiving combat.AttackEnd, next attempt earliest at nowMs + max(ai.cooldownMsRoll, attack.cooldownMs).
- telegraphDebounceMs (AI local): 250 ms minimum between emitting combat.TelegraphStart for the same entity to prevent spam; honored even after parry or whiff.

7) Acceptance Targets & Tuning Rationale
- Encounter TTK (solo player, base gear; see §13 knobs):
  - Goblin Grunt: ~28–34 s assuming ~35% player light-attack land rate and ~10% stamina downtime; 1–2 poise breaks expected.
  - Cave Burrower: ~32–38 s; punish over-commit with lunge/burrow mix; ~1 poise break typical.
- Stagger cadence: Average poise break every 7–11 s under sustained offense. Player poise break rare but readable on consecutive enemy hits (2–3 in quick succession).

8) Worked Example Trace (human-readable)
- Setup: dt=50 ms, Player vs Goblin. Player uses light attacks on cooldown; goblin occasionally sidesteps causing whiffs. Player stamina regenDelayAfterActionMs=700 ms. Poise: Goblin 35 max, recovers when not broken. Player attributes AP=4; Goblin DEF=1. Damage per landed light = 7+4-1=10.
- Trace snippet (CSV-like; fields: tMs, Stamina, RegenGate(ms), Phase, Events):
  - 0000, 100, regen@0, Telegraph, combat.TelegraphStart{light,-100,amber}
  - 0000, 84, regen@700, Windup, —
  - 0300, 84, regen@700, Active, combat.Swing.light{active=90}
  - 0320, 84, regen@700, Active, combat.Hit{dmg=10,poise=12,hitStop=14/28} → Goblin poise: 35→23
  - 0730, 84, regen@700, RecoveryEnd, combat.AttackEnd
  - 1210, 95, regen@1210+700=1910, Telegraph, combat.TelegraphStart{light,-100,amber} (attempt #2; whiff)
  - 1510, 79, regen@1910, Active, — (no contact)
  - 1940, 79, regen@1910, RecoveryEnd, combat.AttackEnd
  - 3630, 96, regen@3630+700=4330, Telegraph, combat.TelegraphStart{light,-100,amber}
  - 3930, 80, regen@4330, Active, combat.Swing.light
  - 3980, 80, regen@4330, Active, combat.Hit{dmg=10,poise=12,hitStop=14/28} → Goblin poise: 23→11
  - 7260, 99, regen@7260+700=7960, Telegraph, combat.TelegraphStart{light,-100,amber}
  - 7560, 83, regen@7960, Active, combat.Hit{dmg=10,poise=12,hitStop=14/28} → Goblin poise: 11→0; poise.Break{700}
  - 7900, 83, regen@7960, Recovery, (Goblin staggered; animation hit-stop 28 ms already elapsed)
- Notes: Stamina regen resumes at t≥gate. Goblin poise recovers only after 7560+700=8260 ms.

9) Text Sim Pseudocode (ready for JS/Rust port)
- Signatures:
  - run_scenario(params, durationMs:int, dtMs:int) -> Trace[]
  - step_stamina(entity, nowMs:int, dtSec:float)
  - step_poise(entity, nowMs:int, dtSec:float)
  - advance_attack_fsm(attacker, nowMs:int) -> events[]
  - resolve_hit(attacker, defender, nowMs:int) -> events[]
- Pseudocode (language-agnostic):
  - run_scenario(params, durationMs, dtMs):
    - init world from params; nowMs=0; traces=[]
    - while nowMs <= durationMs:
      - for e in entities:
        - step_stamina(e, nowMs, dtMs/1000.0)
        - step_poise(e, nowMs, dtMs/1000.0)
      - for a in attackers:
        - evsA = advance_attack_fsm(a, nowMs); emit(evsA)
      - for pairs in potential_contacts:
        - if pairs.attacker.hitboxActive and not pairs.attacker.hasHit[pairs.defender]:
          - evsH = resolve_hit(pairs.attacker, pairs.defender, nowMs); emit(evsH)
      - record trace line: nowMs, per-entity stamina.value, poise.value, currentPhase, emitted event names
      - nowMs += dtMs
    - return traces
  - step_stamina(e, nowMs, dtSec):
    - if nowMs >= e.stamina.regenCooldownUntilMs:
      - e.stamina.value = clamp(e.stamina.value + e.stamina.regenPerSec * dtSec, 0, e.stamina.max)
  - step_poise(e, nowMs, dtSec):
    - if nowMs >= e.poise.brokenUntilMs:
      - e.poise.value = min(e.poise.max, e.poise.value + e.poise.recoverPerSec * dtSec)
  - advance_attack_fsm(attacker, nowMs):
    - evs=[]
    - if attacker.intentQueued and nowMs >= attacker.readyAtMs:
      - if attacker.stamina.value >= attacker.attackDef.staminaCost:
        - spend stamina per §3; attacker.phase=Telegraph; attacker.phaseStart=nowMs
        - attacker.readyAtMs = nowMs + attacker.attackDef.windupMs + attacker.attackDef.activeMs + attacker.attackDef.recoveryMs + attacker.attackDef.cooldownMs
        - emit combat.TelegraphStart
      - else: UI error; clear intent
    - switch attacker.phase:
      - Telegraph -> Windup when nowMs - phaseStart >= 0 (immediate, visual only)
      - Windup when nowMs - phaseStart >= windupMs -> Active; emit combat.Swing.light or type-specific event; clear hasHit map
      - Active when nowMs - activeStart >= activeMs -> Recovery; deactivate hitbox
      - Recovery when nowMs - recoveryStart >= recoveryMs -> None; emit combat.AttackEnd
    - if attacker.poise.brokenUntilMs > nowMs and attacker.phase in {Windup,Active,Recovery}:
      - attacker.phase=None; emit combat.AttackEnd (if not already); // do not alter readyAtMs
    - return evs
  - resolve_hit(attacker, defender, nowMs):
    - evs=[]
    - // blocking/parry resolution external; assume open
    - dmg = max(0, attacker.attackDef.baseDamage + attacker.AP - defender.DEF)
    - poiseDmg = attacker.attackDef.poiseDamageToTarget
    - apply hit-stop overlay: attacker/victim per attackDef.hitStopMs
    - defender.health -= dmg
    - defender.poise.value = max(0, defender.poise.value - poiseDmg)
    - emit combat.Hit{...}
    - if defender.poise.value == 0 and defender.poise.brokenUntilMs < nowMs:
      - defender.poise.brokenUntilMs = nowMs + defender.poise.breakDurationMs
      - emit poise.Break{...}
    - attacker.hasHit[defender]=true
    - return evs

10) Externalized Params (JSON shape for MVP sims)
- File: data/combat/params-mvp.json (doc is contract; authored next)
- Schema (example shape):
{
  "version": 1,
  "player": {
    "stamina": { "max": 100, "regenPerSec": 22, "regenDelayAfterActionMs": 700 },
    "poise": { "max": 40, "recoverPerSec": 10, "breakDurationMs": 650 },
    "attributes": { "attackPower": 4, "defense": 3 },
    "attacks": [
      {
        "id": "light",
        "staminaCost": 16,
        "poiseDamageToTarget": 12,
        "baseDamage": 7,
        "windupMs": 300,
        "activeMs": 90,
        "recoveryMs": 340,
        "cooldownMs": 480,
        "rangePx": 20,
        "arcDeg": 75,
        "hitStopMs": { "attacker": 14, "victim": 28 },
        "knockbackPx": 6,
        "telegraph": { "flashAtMs": -100, "colorToken": "mapping.telegraph.arc.amber" }
      }
    ]
  },
  "goblin": {
    "health": { "max": 120 },
    "poise": { "max": 35, "recoverPerSec": 9, "breakDurationMs": 700 },
    "attributes": { "attackPower": 5, "defense": 1 },
    "attacks": [
      {
        "id": "light_slash",
        "staminaCost": 0,
        "poiseDamageToTarget": 10,
        "baseDamage": 5,
        "windupMs": 340,
        "activeMs": 90,
        "recoveryMs": 340,
        "cooldownMs": 520,
        "rangePx": 20,
        "arcDeg": 70,
        "hitStopMs": { "attacker": 18, "victim": 34 },
        "knockbackPx": 5,
        "telegraph": { "flashAtMs": -100, "colorToken": "mapping.telegraph.arc.amber" }
      }
    ],
    "ai": { "cooldownMsRange": [520, 680], "telegraphDebounceMs": 250 }
  },
  "burrower": {
    "health": { "max": 110 },
    "poise": { "max": 45, "recoverPerSec": 8, "breakDurationMs": 750 },
    "attributes": { "attackPower": 6, "defense": 2 },
    "attacks": [
      {
        "id": "burrow_lunge",
        "staminaCost": 0,
        "poiseDamageToTarget": 14,
        "baseDamage": 6,
        "windupMs": 380,
        "activeMs": 90,
        "recoveryMs": 380,
        "cooldownMs": 560,
        "rangePx": 22,
        "arcDeg": 60,
        "hitStopMs": { "attacker": 16, "victim": 32 },
        "knockbackPx": 9,
        "telegraph": { "flashAtMs": -120, "colorToken": "mapping.telegraph.arc.amber" }
      }
    ],
    "ai": { "cooldownMsRange": [560, 740], "telegraphDebounceMs": 250 }
  }
}

11) Integration Notes (ECS & Bridges)
- ECS Components:
  - Stamina, Poise, Health, Attributes, AttackDefRef, AttackIntent, AttackState (FSM data), Hitbox, Facing, EnemyTag/PlayerTag
- Systems order (tick):
  1) Regen (Stamina, Poise)
  2) AI (decide intents; respect readyAtMs and telegraphDebounceMs)
  3) CombatTimingService (advance_attack_fsm; emit TelegraphStart/Swing/AttackEnd)
  4) HitDetection (query Hitbox vs targets; single-contact rule)
  5) DamageApply (apply damage/poise per §3; emit combat.Hit, poise.Break)
  6) Movement (apply knockback impulses)
  7) Audio/Visual bridges (subscribe to events; apply hit-stop animation overlay; telegraph arcs using mapping.telegraph.arc.amber)
  8) Cleanup (reset hasHit maps; expire temporary flags)
- Event emitters:
  - Ensure combat.TelegraphStart at reserve time (nowMs).
  - Emit poise.Break strictly in DamageApply when crossing to 0 and not already broken.
- Visuals:
  - Resolve tint tokens from data/visual/color-palette.json; arc opacity ≤ 0.6; flashAtMs blink at telegraph offset.
- Audio:
  - Event→SFX per docs/audio-systems/audio-design.md: telegraph/whoosh on TelegraphStart/Swing, impact on combat.Hit, shield-on Block, parry ring on combat.Parry, crunch on poise.Break.

12) Clamps & Ranges (hard limits for loaders)
- windupMs: [200..700]
- activeMs: [70..120]
- recoveryMs: [200..600]
- cooldownMs: [250..800]
- arcDeg: [40..110]
- rangePx: [14..28]
- hitStopMs: attacker [0..40], victim [0..80]
- telegraph.flashAtMs: [-180..-80]
- knockbackPx: [0..16]
- stamina/poise numeric fields must be ≥0 and integers except regen/recoverPerSec (floats ≥0)

13) MVP Enemy Knobs Summary
- Goblin Grunt (mirror of data/combat/enemy-goblin-grunt.json baseline):
  - health.max = 120
  - attributes: { attackPower: 5, defense: 1 }
  - poise: { max: 35, recoverPerSec: 9, breakDurationMs: 700 }
  - attacks:
    - light_slash:
      - windupMs=340, activeMs=90, recoveryMs=340, cooldownMs=520
      - rangePx=20, arcDeg=70, baseDamage=5, poiseDamageToTarget=10
      - hitStop(18/34), knockbackPx=5, telegraph.flashAtMs=-100, arcOverlay:true
- Cave Burrower (to be authored in JSON next):
  - health.max=110, attributes.attackPower=6, defense=2
  - poise: { max:45, recoverPerSec:8, breakDurationMs:750 }
  - movement: speed=48, approachRangePx=30, retreatRangePx=58
  - attacks:
    - burrow_lunge (MVP): windupMs=380 (telegraph flash -120), activeMs=90, recoveryMs=380, cooldownMs=560, rangePx=22, arcDeg=60, damage.base=6, poiseDamage=14, hitStop(16/32), knockback 9 px forward, arcOverlay:true
    - surface_burst (optional/future): heavier telegraph; cut if time tight

14) Test Plan (minimal)
- Unit tests:
  - Stamina regen gates: regen does not start before regenCooldownUntilMs; resumes precisely at boundary.
  - Poise break emission: emitted once per threshold crossing; no duplicate events while broken.
  - Hit-stop: animation overlay duration equals spec; physics/FSM timers unaffected.
- Scenario sims:
  - Player light spam vs Goblin: verify Goblin TTK ~30 s ±15%.
  - Verify average poise break interval within 7–11 s given 35% land rate.
  - Validate heavy path (disabled) returns UI error but sim path can instantiate and validate clamps.
- JSON validation:
  - Enemy config obeys §12 clamps; color tokens resolve; required fields present.
  - Single-contact per Active enforced.

15) Risks & Assumptions
- Numbers likely to be retuned after sandbox; telegraph offsets may need per-animation nips and tucks.
- Event ordering must remain stable across systems and frames; DamageApply is sole arbiter for poise.Break emission.
- Block/parry preview: timings may shift once shield animations land; parry authority kept server-side to avoid exploits.
- Cooldown modeled as post-recovery lockout by design; if feel is sluggish, consider partial overlap later (post-MVP).

Axe-sharp and clock-true. Implement to the letter; we’ll tune by the hammer after first playtest.