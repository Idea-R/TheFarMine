# Combat System MVP — Stamina, Poise, Timing (Sprint 1)

By the anvil and the clock, this is the authoritative design for our first swing at timing-centric combat. It locks down stamina, poise, telegraphs, and event contracts so engineering, animation, audio, and AI march in step.

## 1) Title & Scope

- Title: Combat System MVP — Stamina, Poise, Timing (Sprint 1)
- Scope:
  - Context: Player vs. Goblin Grunt and Cave Burrower in Mine L1.
  - Systems: Stamina consumption/regeneration, poise/break, attack timing (windup/active/recovery), telegraph colors, hit-stop, and ECS event contracts.
  - Goals:
    - Solo TTK ≈ 30 seconds with AP 8 baseline, accounting for spacing and readable telegraphs.
    - Clear punish windows via stagger (poise break).
    - Deterministic timings with narrow, documented clamps.
- Constraints:
  - Player stamina is fully implemented. Enemy stamina is defined but unused this sprint.
  - ECS event payloads are strict and versioned by topic name.
  - Timing and visual telegraphs must be legible at 60 Hz.

---

## 2) Variables & Definitions (Authoritative)

Unless specified, all integer values are in milliseconds (ms). Numerical clamps for timing and bounds are defined in Appendix: Bounds & Clamps.

- Stamina (player authoritative in MVP; enemy values set, not consumed):
  - Shape: Stamina = { max:int, value:int, regenPerSec:number, regenDelayAfterActionMs:int, regenCooldownUntilMs:int }
  - Notes:
    - regenCooldownUntilMs is an absolute epoch ms timestamp.
    - regenPerSec is applied according to roundingPolicy (see Section 11).

- Poise (player and enemies; governs stagger/punish windows):
  - Shape: Poise = { max:int, value:int, recoverPerSec:number, breakDurationMs:int, brokenUntilMs:int }
  - Notes:
    - While poise is “broken” (nowMs < brokenUntilMs), the target is staggered and does not recover poise.

- AttackDefs (common fields for melee attacks; values clamped per Appendix):
  - Common:
    - id:string
    - name:string
    - kind:"melee" (MVP limited to melee)
    - windupMs:int
    - activeMs:int
    - recoveryMs:int
    - cooldownMs:int (internal per-attacker lockout after recovery)
    - rangePx:int
    - arcDeg:int
    - hitbox:{ w:int, h:int, offsetX:int, offsetY:int } (axis-aligned in attacker local space during active)
    - damage:{ base:int, poiseDamage:int }
    - hitStopMs:{ attacker:int, victim:int }
    - knockback:{ px:int, direction:"forward"|"backward"|"none" }
    - telegraph:{ colorToken:string, arcOverlay:boolean, flashAtMs:int }
  - Movement/AI fields:
    - approachRangePx:int (AI seeks within this for attack)
    - retreatRangePx:int (AI disengages past this; not enforced in MVP if unset)
  - Clamps: See Appendix section for exact ranges.

- Timing Model (per attacker):
  - Phases: windup → active → recovery → internal cooldown (cooldownMs).
  - Internal cooldown: attacker cannot begin a new attack until internalCooldownUntilMs elapses.
  - AI cadence: ai.cooldownMsRange controls when an actor attempts to schedule the next attack (enforced on enemies).

- Movement for attacks:
  - approachRangePx/retreatRangePx are advisory targets used by AI to adjust spacing before initiating windup.

- Facing:
  - Knockback direction "forward" is along attacker’s facing dirDeg at hit time.

---

## 3) Formulas & Timing Model

- Stamina spend rules (Player only in MVP):
  - attack.light staminaCost = 12
  - attack.heavy staminaCost = 22
  - dodge staminaCost = 18
  - blockHold staminaCost = 0 per frame (block only gates parry windows in MVP)
  - parry window consumes 8 on success
  - Spend check: action requires stamina.value ≥ cost at attempt time; otherwise rejected.
- Stamina regeneration:
  - Gate: no regen while (stamina.value < stamina.max) AND (nowMs < stamina.regenCooldownUntilMs).
  - While allowed: stamina.value += stamina.regenPerSec * dtSeconds, rounded by roundingPolicy (ceil to integer each 100ms tick).
  - After any stamina-consuming action (attack/dodge/parry success): stamina.regenCooldownUntilMs = nowMs + stamina.regenDelayAfterActionMs.
- Damage application:
  - finalDamage = max(0, damage.base - target.attributes.defense).
  - Health damage is integer, applied on each valid Hit.
- Poise application and recovery:
  - On Hit: target.poise.value -= damage.poiseDamage.
  - If target.poise.value ≤ 0:
    - Emit poise.Break once.
    - target.poise.brokenUntilMs = nowMs + target.poise.breakDurationMs.
    - target.poise.value = 0 (clamped).
  - Poise recovers only when not broken: poise.value += recoverPerSec * dtSeconds (clamped to max).
- Poise startup tax (readability fairness vs broken foes):
  - If target is PoiseBroken at the moment a new attack windup would start against them, add poiseStartupTaxMs = 40 to that attack’s windup for that strike only.
- Telegraph timing:
  - TelegraphStart event fires at windup begin (t0).
  - telegraph.flashAtMs is a relative negative offset from tActiveStart = t0 + windupMs.
    - Example: -120 means flash at (tActiveStart - 120).
  - Per-attacker debounce: must not emit TelegraphStart more often than ai.telegraphDebounceMs.
- Hit-stop:
  - On valid Hit: pause local motion/animation for the hit-stop durations.
  - Implementation: systems honor per-entity timeScale=0 overlay for attacker and victim for their respective hitStopMs.
- Knockback:
  - Applied on valid Hit. Direction "forward" uses attacker’s facing dirDeg.

---

## 4) Event Contracts (ECS Integration)

- Consumed components:
  - Position, Velocity, Health, Stamina, Poise, Attributes, AI, AttackIntent, Hitbox, AudioEmitter

- Emitted events (strict MVP payloads):
  - combat.TelegraphStart: { attackerEid:int, attackId:string, atMs:int, colorToken:string, arcDeg:int, rangePx:int }
  - combat.Swing.light: { attackerEid:int, attackId:string, atMs:int }
  - combat.Hit: { attackerEid:int, victimEid:int, attackId:string, atMs:int, damage:int, poiseDamage:int, wasBlocked:boolean, wasParried:boolean }
  - combat.Block: { attackerEid:int, victimEid:int, attackId:string, atMs:int }
  - combat.Parry: { attackerEid:int, victimEid:int, attackId:string, atMs:int }
  - poise.Break: { eid:int, atMs:int, breakDurationMs:int }
  - combat.AttackEnd: { attackerEid:int, attackId:string, atMs:int, reason:"finished"|"canceled" }

- Audio Event Bridge routing:
  - TelegraphStart → sfx.combat.telegraph.whoosh
  - Swing.light → sfx.combat.swing.whoosh.light
  - Hit (unblocked) → sfx.combat.hit.light
  - Block → sfx.combat.block.impact
  - Parry → sfx.combat.parry.success
  - poise.Break → sfx.combat.poise.break

---

## 5) Visual Telegraphs

- Color tokens:
  - Use mapping.telegraph.arc.amber from data/visual/color-palette.json.
  - Arc overlay opacity ≤ 0.6 when telegraph.arcOverlay is true.
  - arcOverlay:true indicates draw a sector from attacker facing with arcDeg and rangePx.
- flashAtMs typical ranges per enemy:
  - Goblin light slash: -90 to -110ms
  - Cave Burrower lunge: -120ms (per data/combat/enemy-cave-burrower.json)

---

## 6) Player Baseline (MVP)

- Attributes: { attackPower: 8, defense: 2 }
- Health.max: 120
- Stamina: { max:100, value:100, regenPerSec:22, regenDelayAfterActionMs:600, regenCooldownUntilMs:0 }
- Poise: { max:45, value:45, recoverPerSec:10, breakDurationMs:750, brokenUntilMs:0 }
- Player stamina costs:
  - light 12, heavy 22, dodge 18, parry success 8
- Player attacks for simulation targets:
  - pick_light:
    - windupMs: 260, activeMs: 80, recoveryMs: 260, cooldownMs: 300
    - rangePx: 18, arcDeg: 70
    - damage: { base: 6, poiseDamage: 10 }
    - hitStopMs: { attacker: 16, victim: 36 }
    - telegraph: { colorToken: "mapping.telegraph.arc.amber", arcOverlay: true, flashAtMs: -100 }
    - knockback: { px: 24, direction: "forward" }
  - pick_heavy:
    - windupMs: 420, activeMs: 110, recoveryMs: 380, cooldownMs: 520
    - rangePx: 20, arcDeg: 80
    - damage: { base: 11, poiseDamage: 18 }
    - hitStopMs: { attacker: 22, victim: 48 }
    - telegraph: { colorToken: "mapping.telegraph.arc.amber", arcOverlay: true, flashAtMs: -120 }
    - knockback: { px: 36, direction: "forward" }

---

## 7) Enemy Baselines (MVP)

- Goblin Grunt (to be delivered in data/combat/enemy-goblin-grunt.json):
  - Health ≈ 95; Attributes.defense = 1
  - Poise: { max:35, recoverPerSec:9, breakDurationMs:700 }
  - Movement: { speed:56, approachRangePx:34 }
  - AI:
    - cooldownMsRange: { min:900, max:1200 }
    - telegraphDebounceMs: 280
  - Attack: light slash (1–2 pattern)
    - damage.base: 5, poiseDamage: 12
    - hitStopMs: { attacker:18, victim:34 }
    - arcDeg: 80, rangePx: 20
    - windupMs: 340, activeMs: 90, recoveryMs: 360, cooldownMs: 300
    - telegraph.flashAtMs: -100
    - telegraph: { colorToken: "mapping.telegraph.arc.amber", arcOverlay: true }
- Cave Burrower:
  - Use canonical values in data/combat/enemy-cave-burrower.json.
  - Lunge telegraph flashAtMs: -120ms.
  - Baseline TTK alignment per Section 8.

---

## 8) Tuning Targets

- Solo TTK target vs AP 8:
  - Goblin: 20–26 landed lights leading to ≈ 28–34s considering approach spacing, cooldown cadence, and occasional stamina recovery pauses.
  - Burrower: 13–17 landed lights for ≈ 30–34s (per already-configured stats).
- Stagger cadence:
  - Goblin: poise break typically every 2–3 landed lights (if player commits).
  - Burrower: poise break typically every 3–4 landed lights.

---

## 9) CombatTimingService — Implementation Notes

- State per attacker:
  - { attackId:string|null, phase:"idle"|"windup"|"active"|"recovery", phaseUntilMs:int, internalCooldownUntilMs:int }
- Scheduling:
  - At windup start (t0):
    - Check internalCooldownUntilMs ≤ nowMs.
    - Apply Poise Startup Tax: if target is PoiseBroken at scheduling time, extend windup by +poiseStartupTaxMs for this attack only.
    - Emit combat.TelegraphStart (respect ai.telegraphDebounceMs per attacker).
    - Schedule telegraph flash at (t0 + windupMs + telegraph.flashAtMs).
  - Transition to active at tActiveStart = t0 + windupMs.
    - Emit combat.Swing.light for light attacks at tActiveStart.
    - Enable Hitbox for activeMs and resolve collisions each frame.
  - On Hit:
    - If blocked/parried, emit combat.Block/combat.Parry accordingly; otherwise emit combat.Hit.
    - Apply damage and poise changes immediately on event emission.
    - Apply hit-stop by setting entity-local timeScale=0 overlays for attacker/victim for their respective hitStopMs.
    - On poise <= 0, emit poise.Break, set brokenUntilMs.
  - Transition to recovery at tActiveEnd; disable Hitbox.
  - On recovery end: set internalCooldownUntilMs = nowMs + cooldownMs; emit combat.AttackEnd with reason:"finished".
- Cancelation:
  - If attack is interrupted (knockback, parry, or state clear), emit combat.AttackEnd with reason:"canceled" and set internalCooldownUntilMs as above unless designates “forfeit lockout” (not in MVP).

---

## 10) Sim Pseudocode and Worked Trace

- Overview:
  - Language-agnostic, 16ms fixed-step. Deterministic vs a provided seed for AI cadence variance.

- Inputs:
  - params JSON: see Externalized Parameters.
  - scenario:
    - actors: player vs enemy (Goblin Grunt for example run).
    - player plan: "light chain" | "heavy openers" | etc. (MVP: "light chain").
    - seed:int for AI attempt cadence within ai.cooldownMsRange.
  - initial positions and facing (assume in-range or the AI will approach to approachRangePx).

- Outputs:
  - Readable trace lines with ms timestamps for:
    - TelegraphStart, Swing, Hit, Block/Parry, poise.Break, AttackEnd, stamina floor/recover events.
  - Summary with total time to defeat, hits landed, staggers.

- Pseudocode (16ms tick):

```
init():
  load params from data/combat/combat-params.json
  seed RNG
  nowMs = 0
  dt = 16
  init components: Health, Stamina, Poise, Attributes, AI, Position, Velocity
  init attack defs (player pick_light, enemy attacks)
  init CombatTimingService states for both actors

loop until enemy.Health <= 0 or timeout:
  // 1) Apply per-entity local timeScale overlays (hit-stop); if timeScale==0 skip sim mutations for that entity
  for each entity e:
    if e.timeFreezeUntilMs > nowMs: continue (frozen)
  
  // 2) Stamina regen (player only MVP)
  if player.Stamina.value < player.Stamina.max:
    if nowMs >= player.Stamina.regenCooldownUntilMs:
      // roundingPolicy "ceil-100ms": accumulate 100ms buckets
      player.staminaBucketMs += dt
      while player.staminaBucketMs >= 100:
        gain = ceil(player.Stamina.regenPerSec * 0.1) // e.g., ceil(2.2)=3
        player.Stamina.value = min(player.Stamina.max, player.Stamina.value + gain)
        player.staminaBucketMs -= 100
    else:
      player.staminaBucketMs = 0

  // 3) Poise recovery (only if not broken)
  for each entity e:
    if nowMs >= e.Poise.brokenUntilMs and e.Poise.value < e.Poise.max:
      e.poiseBucketMs += dt
      while e.poiseBucketMs >= 100:
        e.Poise.value = min(e.Poise.max, e.Poise.value + ceil(e.Poise.recoverPerSec * 0.1))
        e.poiseBucketMs -= 100

  // 4) AI attempt cadence (enemy)
  if enemy.AI.nextAttemptMs <= nowMs and enemyTiming.phase == "idle" and nowMs >= enemyTiming.internalCooldownUntilMs:
    if inRange(enemy, player, enemy.approachRangePx):
      startEnemyAttackLight()
    else:
      moveToward(enemy, player)

  // 5) Player plan (MVP: light chain if stamina available and off cooldown)
  if playerPlan == "light chain" and playerTiming.phase == "idle" and nowMs >= playerTiming.internalCooldownUntilMs:
    if player.Stamina.value >= 12:
      spend( player.Stamina, 12 )
      player.Stamina.regenCooldownUntilMs = nowMs + player.Stamina.regenDelayAfterActionMs
      startPlayerAttackLight()
    else:
      // out of stamina: wait to recover; record a "stamina floor" moment in trace

  // 6) Advance attack state machines
  for attacker in [player, enemy]:
    if attackerTiming.phase == "windup" and nowMs >= attackerTiming.phaseUntilMs:
      attackerTiming.phase = "active"
      attackerTiming.phaseUntilMs = nowMs + attack.activeMs
      emit Swing event
    if attackerTiming.phase == "active":
      // collision each frame while active
      if isHit(attacker, target) and not alreadyHitThisActive:
        resolveBlockParryIfAny()
        computeDamageAndPoise()
        applyHitStop()
        if target.Poise.value <= 0 and nowMs < target.Poise.brokenUntilMs just now set:
          emit poise.Break
        markAlreadyHitThisActive()
      if nowMs >= attackerTiming.phaseUntilMs:
        attackerTiming.phase = "recovery"
        attackerTiming.phaseUntilMs = nowMs + attack.recoveryMs
    if attackerTiming.phase == "recovery" and nowMs >= attackerTiming.phaseUntilMs:
      attackerTiming.phase = "idle"
      attackerTiming.internalCooldownUntilMs = nowMs + attack.cooldownMs
      emit AttackEnd finished

  // 7) Telegraphs & flash
  // TelegraphStart emitted at windup start with debounce check. Schedule a timed flash event at (tActiveStart + flashAtMs).

  // 8) End condition check
  if enemy.Health.value <= 0:
    break

  nowMs += dt
```

- Worked example (Player vs Goblin, light chain, two staggers):
  - Assumptions:
    - Player begins in-range; enemy opens slow due to AI attempt window.
    - Player uses uninterrupted light chain except for one stamina recovery pause.
    - Goblin stats per Section 7; typical block/parry not used in this trace.
    - 20 landed lights total (one early miss or partial block can account for range vs ≈95 HP target).
  - Key timestamps (trace excerpt):
    - 0000ms: combat.TelegraphStart (player, pick_light), arc amber, arcDeg 70, range 18
    - 0260ms: combat.Swing.light (player), Hit at 0260ms → damage 5 (6-1), poiseDamage 10; goblin HP 90; goblin poise 25
    - 1170ms: combat.Swing.light (player), Hit → damage 5; goblin poise 15
    - 2060ms: combat.Swing.light (player), Hit → damage 5; goblin poise 5
    - 2950ms: combat.Swing.light (player), Hit → damage 5; poise to -5 → poise.Break at 2950ms (break 700ms to 3650ms)
    - 2950–3650ms: Goblin staggered; player continues chaining. Poise Startup Tax applies to strikes started while goblin remains broken (+40ms windup), slightly elongating telegraphs.
    - 9800ms: Stamina floor — player at 4 stamina, cannot start next light; pauses to recover (records “stamina floor” in trace). Regen delay elapses; by ~11,800ms player reaches ≥12 stamina (with ceil-100ms ticks).
    - 11800ms: combat.TelegraphStart (player resumes)
    - 21500ms: Second poise.Break on goblin; punish window again (~700ms)
    - 31200ms: Final Hit → goblin HP ≤ 0; combat.AttackEnd emitted; Summary computed.
  - Summary:
    - Total time to defeat (TTK): ≈ 31.2s
    - Landed hits: 20 lights
    - Staggers: 2 poise breaks
    - Observations: Startup tax (+40ms during breaks) improves readability when target is already reeling. The stamina floor at ~9.8–11.8s adds breathing space and supports the target 30s pacing.

---

## 11) Externalized Parameters

- The simulator and services must read global parameters from:
  - data/combat/combat-params.json
  - Canonical contents (to be authored next):

    { "player": {"health":120, "stamina":{"max":100,"regenPerSec":22,"regenDelayAfterActionMs:":600}, "poise":{"max":45,"recoverPerSec":10,"breakDurationMs":750}, "attributes":{"attackPower":8,"defense":2} }, "poiseStartupTaxMs":40, "roundingPolicy":"ceil-100ms" }

- Notes:
  - roundingPolicy "ceil-100ms": regen and poise recovery apply in 100ms buckets using ceil(perSec * 0.1).
  - The service must not hardcode these values; fallback defaults only during file read failures (log warnings).

---

## 12) Acceptance & Definition of Done (DOD)

- Simulation pseudocode:
  - Complete and directly portable to a simple JS reference implementation.
  - Produces human-readable trace lines with ms timestamps for key events and a summary (TTK, hits landed, staggers).
- Parameters:
  - All player/enemy/attack parameters in this spec are documented.
  - Numbers align with:
    - data/combat/enemy-cave-burrower.json (burrower timings and -120ms flashAtMs).
    - Upcoming data/combat/enemy-goblin-grunt.json (as per Section 7).
  - Telegraph tokens and audio ids match:
    - data/visual/color-palette.json (mapping.telegraph.arc.amber)
    - data/audio/sound-manifest.json (sfx.combat.* ids listed)
- Events:
  - ECS event payloads match the exact field names/types in Section 4.
  - Hit-stop durations remain within [0..80]ms bounds.
- MVP quality bar:
  - Encounters land near ~30s TTK with AP 8.
  - Each enemy cycle affords at least one readable stagger (poise break) window with punish opportunity.
  - Telegraphs are visible and consistent with debounce policy.

---

## 13) Appendix: Bounds & Clamps

- Timing clamps (authoritative):
  - windupMs: [200..700]
  - activeMs: [70..120]
  - recoveryMs: [200..600]
  - cooldownMs: [250..800]
  - arcDeg: [40..110]
  - rangePx: [14..28]
  - hitStopMs.attacker: [0..40]
  - hitStopMs.victim: [0..80]
  - telegraph.flashAtMs: [-180..-80]
- Damage/Defense:
  - Health (MVP enemies): [90..140]
  - Defense (MVP enemies): [0..3]
  - With AP 8 player and pick_light base damage 6:
    - Versus defense 1: finalDamage = 5; 95 HP goblin requires ≈ 19–20 landed lights.
    - Movement, cooldowns, stamina delays, and readable telegraphs stretch practical TTK to ≈ 28–34s.
- Poise:
  - Poise.max (enemies MVP): [30..60]
  - recoverPerSec (enemies MVP): [6..12]
  - breakDurationMs (enemies MVP): [600..900]
- AI cadence:
  - ai.cooldownMsRange.min/max must satisfy min ≥ 600 and max ≤ 1500 for legible cadence in L1.
- Movement:
  - approachRangePx: [28..40]
  - retreatRangePx: [36..56] (optional in MVP)

---

## Cross-References

- data/visual/color-palette.json:
  - mapping.telegraph.arc.amber
  - characters.goblin.base
  - characters.burrower.base
- data/audio/sound-manifest.json:
  - sfx.combat.telegraph.whoosh
  - sfx.combat.swing.whoosh.light
  - sfx.combat.hit.light
  - sfx.combat.block.impact
  - sfx.combat.parry.success
  - sfx.combat.poise.break
- data/combat/enemy-cave-burrower.json:
  - Canonical ambush example with lunge (-120ms flashAtMs)
- Forthcoming:
  - data/combat/enemy-goblin-grunt.json following the schema and numbers in Section 7

---

## Notes from Battlehammer Ironshield

- Readability over raw speed: the +40ms Poise Startup Tax is the smith’s touch that keeps a stagger from becoming an unreadable blender.
- Keep telegraphs honest with debounce; no strobe-spam. Honor the clamps; timings inside these ranges are tested to feel fair under 60 Hz.