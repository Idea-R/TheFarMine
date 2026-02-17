# Combat System — Steel, Stamina, and the Three‑Wide Law (Sprint 1)

Provenance
- Owner: @gamma (Combat Systems — Battlehammer Ironshield)
- I swing the hammer, I measure the frames, and I don’t lie about the numbers.

Cross‑References
- data/core/component-schemas.json (Health/Stamina/Poise/Attributes)
- src/core/ecs-registry.js (ENTITY_TYPES)
- docs/audio-systems/audio-design.md (§5 Event Map)
- data/combat/enemy-goblin-grunt.json
- data/combat/enemy-cave-burrower.json
- data/visual/color-palette.json (mapping.telegraph.*)
- docs/visual-systems/ui-framework.md (§Gauges)
- docs/world-generation/cave-gen-algorithm.md (§Three‑wide lanes)


## 1) Design Pillars

- Telegraph readability > reaction fairness. If they can’t read it, it’s not fair combat.
- Stamina as the tempo governor.
- Poise as the punish window.
- Hit-stop for impact.
- Three‑wide lanes for honest spacing.
- Numbers tuned for ~30 s TTK vs Expected Player (AP 8, DEF 0, hitRate 0.6).


## 2) Core Components & Data Contracts

ECS Components (overview)
- Health
  - value:int, max:int
  - Dead when value ≤ 0.
- Stamina
  - value:int, max:int
  - regenPerSec:number, regenDelayAfterActionMs:int
  - regenPaused:boolean (derived, runtime only)
- Poise
  - value:int, max:int
  - recoverPerSec:number
  - breakDurationMs:int
  - isBroken:boolean (derived), breakUntilMs:int (runtime)
- Attributes
  - attackPower:int, defense:int, speed:number (reserved), resistances:map (reserved MVP)
- AI
  - currentState, blackboard, attackSelector (data-driven)
- Collider
  - body:{w:int,h:int}, offset:{x:int,y:int}, layer:string, hurtboxPadPx:int
- Renderable
  - spriteId, facing:int, flip:boolean, vfxHooks:array

Clamp Rules (from component-schemas.json recap)
- All resource values clamp to [0..max].
- max ≥ 0; value initialized to max unless overridden by entity data.
- regenPerSec, recoverPerSec ≥ 0.
- breakDurationMs ≥ 0.

Default Player Archetype (ecs-registry)
- Health: 100
- Stamina: { max: 100, regenPerSec: 14, regenDelayAfterActionMs: 600 }
- Poise: { max: 100, recoverPerSec: 35, breakDurationMs: 800 }
- Attributes: attackPower defaults to 8 (AP 8), defense 0 unless gear modifies.


## 3) Stamina System (Authoritative)

Costs (MVP defaults; per-action configurable)
- Light attack: 16
- Dodge: 22
- Block (hold): 6 per 500 ms tick
- Parry (MVP-lite via block): no extra cost beyond block tick during a 120 ms perfect window; grants attacker PoiseDamage bonus and cancels chip (see §6 and §10)

Regen Rules
- Stamina regeneration starts after regenDelayAfterActionMs since the last stamina spend (default 600 ms).
- Regen rate: regenPerSec (player default 14/s).
- Regen pauses while blocking (hold state); resume delay restarts upon release.

Out‑of‑Stamina Penalty
- Attacks disabled while stamina.value < minCost(light attack).
- Dodge i‑frames reduced by 20% (from 160 ms → 128 ms).
- Block still functions; chip ratio worsens (see §6 modifiers).
- UI: stamina low-state under 20% per UI spec (docs/visual-systems/ui-framework.md §Gauges).


## 4) Poise System (Authoritative)

Poise Damage and Break
- Each hit applies PoiseDamage to target.Poise.value.
- When value ≤ 0 → enter PoiseBroken for breakDurationMs (player/enemy default 800 ms unless overridden in entity JSON).
- While PoiseBroken:
  - Cannot attack, block, or dodge.
  - Takes +20% damage and +20% knockback.
  - Play effects.poiseBreakFlash and sfx.combat.poiseBreak (token-only).

Recovery
- If not hit for 200 ms after last PoiseDamage instance, recover linearly at recoverPerSec (player default 35/s).
- While PoiseBroken, no further poise damage accrues; poiseDamage applied is ignored until recovery ends (see §6).
- On break end, emit combat.RecoverPoise.


## 5) Damage & Mitigation Formulae (MVP)

Base and Defense
- BaseDamage = attacker.Attributes.attackPower + attack.damage.base
- Reduced = max(0, BaseDamage − target.Attributes.defense)

Block (directional, 120° frontal, active only)
- If blocking and target is within block angle during Active window:
  - BlockedDamage = floor(Reduced × blockDamageFactor), default 0.6
  - Stamina chip: staminaChip = floor(Reduced × blockStaminaChipFactor), default 0.9
    - Clamp chip to available stamina.
    - If stamina depletes to 0 during chip, overflow × 0.5 converts to health damage (rounded down).
  - Perfect block (first 120 ms after raise OR parry window):
    - blockDamageFactor = 0.2
    - blockStaminaChipFactor = 0.3
    - Apply attacker PoiseDamage ×1.25 to attacker (parry-enabled counter momentum) and cancel chip-to-health overflow.

Dodge i‑frames
- 160 ms i‑frames centered on the first 220 ms of the dodge (tunable; see §10).
- During i‑frames: total damage negation and ignore poise hits.

Poise Broken Adjustments
- On targets in PoiseBroken: finalDamage × 1.20; poiseDamage × 0 (poise does not accrue while broken).

Knockback
- Apply attack.knockback.px to victim.
- If victim is blocking, reduce applied knockback by 40%.

Final Application Order
1) Compute Reduced
2) Apply dodge/block resolution
3) Apply poise adjustments (including PoiseBroken modifiers)
4) Apply hit-stop (see §8)
5) Apply deltas: health, poise, stamina (chip), knockback


## 6) Attack Lifecycle & Timings

Phases
- Windup → Active → Recovery → Cooldown
  - Cooldown is AI/ability gating only; not necessarily animation-locked.

Telegraph Policy
- Telegraph event (combat.TelegraphStart) fires at Windup start.
- Visual token usage from data/visual/color-palette.json mapping.telegraph.*.
- Audio token: sfx.combat.telegraph.swing.

Hit Registration
- Occurs during Active window.
- Multi-frame sampling allowed, but restrict to single-hit per target per attack instance (no multi-tick bleed in MVP).

Cancel Rules (MVP)
- Player cannot cancel mid-windup.
- Dodge input buffer: inputs within 80 ms before Windup start of next action are queued to fire at earliest legal time post-current action.
- Enemies cannot cancel.


## 7) Hit‑Stop & Feel

Defaults (baseline; specific per attack in enemy JSONs)
- Light melee: attacker 20–26 ms; victim 40–48 ms.

On Block
- Apply reduced hit-stop to convey dampened impact:
  - attacker: −6 ms
  - victim: −10 ms
- Clamp any hit-stop to ≤ 60 ms to preserve input feel.

Implementation
- TimeScale freeze is applied to involved actors only (attacker and victim).
- Core clock continues; only animation and movement processing for those actors are paused per hit-stop duration.


## 8) Telegraph Timings & Visual/Audio Cues

60 FPS guidance (ms ≈ frames × 16.67)
- Slow sweep (Goblin Slash Sweep)
  - Windup 420 ms (~25 fr), Active 96 ms (~6 fr), Recovery 480 ms (~29 fr)
- Fast jab (Goblin Stab Jab)
  - Windup 280 ms (~17 fr), Active 80 ms (~5 fr), Recovery 420 ms (~25 fr)
- Burrower emerge
  - Windup 620 ms (~37 fr) with ground halo, Active 110 ms (~7 fr), Recovery 520 ms (~31 fr)

Visual Tokens
- mapping.telegraph.arc.amber for swing arcs
- mapping.telegraph.emerge.amber for burrower halo

Audio Tokens
- Telegraph at Windup start: sfx.combat.telegraph.swing
- Hit: sfx.combat.hit.light
- Block: sfx.combat.block
- PoiseBreak: sfx.combat.poiseBreak
(See §12 Event Map binding)


## 9) Player Actions (Frames & Costs)

Light Attack
- Timings: Windup 240 ms; Active 80 ms; Recovery 320 ms; Cooldown 300 ms
- Range: ~20 px; frontal arc 90° (player default)
- Damage: base 7; PoiseDamage 14
- Stamina: 16
- HitStop: { attacker 22 ms, victim 42 ms }

Dodge
- Total duration: 320 ms
- I‑frames: 160 ms centered in first 220 ms (invuln window runs approx 60–220 ms)
- Distance: 48 px (forward input doubles distance forward; neutral is lateral; MVP uses fixed vector per facing)
- Cost: 22 stamina

Block
- Raise time: 120 ms
- Angle: 120° frontal
- Hold drain: 6 stamina per 500 ms tick
- Perfect window: 120 ms after raise completes; parry-lite behavior as §5

Notes
- Numbers are initial; subject to ±10% tuning during playtest.


## 10) Enemy Attacks (Schema Alignment)

JSON Field Shapes (authoritative for data/combat/enemy-*.json)
- id:string
- name:string
- windupMs:int
- activeMs:int
- recoveryMs:int
- cooldownMs:int
- rangePx:int
- arcDeg:int
- hitbox: { w:int, h:int, offsetX:int, offsetY:int }
- damage: { base:int, poiseDamage:int }
- hitStopMs: { attacker:int, victim:int }
- knockback: { px:int, direction:"forward|outward|custom" }
- telegraph: { useGlobalAudio:boolean, visual:"arc|halo|burst", colorToken:string }
- lane: { requiresThreeWide:boolean, forwardBiasPx:int } (MVP: forwardBiasPx ≥ 4)
- meta: { notes:string } (non-executable)

Lane‑Safety Constraints
- Collider body: 12×12 px.
- Hitboxes must be forward-biased and sized to avoid wall clipping inside three‑wide lanes (docs/world-generation/cave-gen-algorithm.md).
- No hitbox edge may extend beyond lane interior bounds when attacker stands centered lane with 6 px lateral tolerance.
- Burrower emerge uses halo (telegraph.visual:"halo") and spawns from within lane center; ensure no overlap with walls on 3‑wide maps.


## 11) Events & System Contracts (Authoritative for MVP)

All times in ms, distances in px. Emit precisely once per lifecycle edge.

- combat.TelegraphStart — emitted at Windup start
  - { enemyId, attackId, pos:{x,y}, colorToken, visual:"arc|halo" }

- combat.AttackActive — emitted at Active window start
  - { sourceId, attackId, pos:{x,y}, rangePx, arcDeg, hitbox:{w,h,offsetX,offsetY} }

- combat.Hit — for each unique target hit
  - { sourceId, targetId, attackId, damage:{ base:int, final:int }, poiseDamage:int, wasBlocked:boolean, wasDodged:boolean, knockbackPx:int }

- combat.Block — when a block occurs
  - { blockerId, attackerId, attackId, chip:{ stamina:int, health:int }, perfect:boolean }

- combat.PoiseBreak — on entering PoiseBroken
  - { targetId, pos:{x,y} }

- combat.RecoverPoise — when recovering from break
  - { targetId }

- stamina.Spend — on action spend
  - { entityId, action:"attack|dodge|blockTick", amount:int }

- stamina.RegenState — when regen starts/stops
  - { entityId, isRegenerating:boolean }

AudioSystem §5 Id Map (token-only)
- TelegraphStart → sfx.combat.telegraph.swing
- Hit → sfx.combat.hit.light
- Block → sfx.combat.block
- PoiseBreak → sfx.combat.poiseBreak

UI Bindings
- player.health.changed, player.stamina.changed
- poise state for future HUD slot (emit PoiseBreak/RecoverPoise to HUD bridge)


## 12) Collision & Arc Resolution

Lane‑safe Arc Sampling
- Inputs: source position, facing vector, arcDeg, rangePx, hitbox shape, Collider (12×12), hurtboxPadPx.
- Steps:
  1) Build arc cone from facing, arcDeg, rangePx.
  2) Sample candidate targets via broad-phase (AABB in cone bounds).
  3) For each candidate, spawn a forward rectangle hitbox at offsets (hitbox.offsetX/Y) in source space, rotated by facing if needed (MVP may keep axis-aligned with forwardBiasPx).
  4) Inflate target hurtbox by hurtboxPadPx (from enemy JSON) for fairness.
  5) Resolve overlap; if overlapping and target not invulnerable (dodge i-frames), register single hit for this attack instance.
- Single hit per target per attack instance (track attackId+targetId).
- Exclude targets flagged invulnerable in current frame window.


## 13) Balance Targets & TTK Math (Reference)

Expected Player
- AP 8, DEF 0, hitRate 0.6.

Goblin Grunt TTK
- Health: 120
- Player light BaseDamage = AP(8) + attack.base(7) = 15
- Assume goblin DEF ≈ 0 (MVP grunt).
- Reduced ≈ 15 per landed hit; required landed hits: ceil(120 / 15) = 8.
- Effective attack cycle time (includes windup 240, recovery 320, cooldown 300, micro‑reposition ~900 ms avg) ≈ 1.8–2.4 s; use 2.2 s median.
- Attempts needed with 0.6 hitRate: 8 / 0.6 ≈ 13.33 attempts.
- TTK ≈ 13.33 × 2.2 s ≈ 29.3 s, stretching to 28–32 s with occasional blocks/dodges.

Cave Burrower TTK
- Health: 130
- Same player payload; burrower presents larger punish windows but slightly more reposition time.
- Landed hits needed: ceil(130 / 15) = 9.
- Attempts: 9 / 0.6 = 15.
- With slightly longer effective cycle (≈ 2.0–2.2 s due to emerge timing advantage), TTK ≈ 30 ± 1 s → 29–31 s.

Quick Validation Formulae
- BaseDamage = AP + base
- Reduced = max(0, BaseDamage − DEF)
- LandedHits = ceil(Health / Reduced)
- Attempts = LandedHits / hitRate
- TTK ≈ Attempts × effectiveCycleSeconds

Example Sequence (Goblin)
- Player strings 3 light attacks (cost 48 stamina) → stamina 100→52, regen delayed 600 ms.
- Goblin blocks one hit (reduced by blockDamageFactor 0.6), chip drains stamina on player if player blocks incoming counter.
- Player dodges once (−22 stamina), hits again after reposition; regen resumes between windows.
- Eight landed hits over 14 attempts within ~30 s → goblin drops. Fair, honest, earned.


## 14) Animation/VFX Cue Table

Frame↔ms at 60 FPS
- ms ≈ frames × 16.67

Cue Reference (initial targets; provide CSV/JSON cue sheet keyed by anim key)
- player.light
  - telegraphStartFrame: 0 (Windup start)
  - strikeFrame: ~14 (≈ 233 ms; Active start at 240 ms, round as needed)
  - recoveryEndFrame: ~53 (≈ 883 ms end of Recovery; Cooldown may extend non-anim)
  - VFX: flashAtMs 240 (contact onset), light swing trail using mapping.telegraph.arc.amber
- goblin.slash_sweep
  - telegraphStartFrame: 0
  - strikeFrame: ~25 (≈ 420 ms)
  - recoveryEndFrame: ~54 (≈ 900 ms)
  - VFX: flashAtMs 420; arc telegraph mapping.telegraph.arc.amber
- goblin.stab_jab
  - telegraphStartFrame: 0
  - strikeFrame: ~17 (≈ 283 ms)
  - recoveryEndFrame: ~42 (≈ 700 ms)
  - VFX: flashAtMs 280; arc telegraph mapping.telegraph.arc.amber
- burrower.emerge_burst
  - telegraphStartFrame: 0 (halo appears)
  - strikeFrame: ~37 (≈ 620 ms)
  - recoveryEndFrame: ~68 (≈ 1133 ms)
  - VFX: haloDurationMs 620 using mapping.telegraph.emerge.amber; burst dust on strike

Audio (token-only)
- Telegraph: sfx.combat.telegraph.swing at telegraphStartFrame
- Hit/block: sfx.combat.hit.light / sfx.combat.block at strikeFrame reaction
- PoiseBreak: sfx.combat.poiseBreak on event


## 15) Integration Notes (Engineering)

CombatSystem Update Order (per tick; use central Clock for ms timing)
1) Input collection
2) Stamina validation (block if insufficient)
3) Action start (emit stamina.Spend)
4) Telegraph emit (combat.TelegraphStart)
5) Active window collision (emit combat.AttackActive at start)
6) Resolve damage/poise/block/dodge (emit combat.Hit / combat.Block)
7) Apply hit-stop (actor-local timeScale freeze)
8) Start/advance recovery and cooldown timers
9) Handle poise break/recover (emit combat.PoiseBreak / combat.RecoverPoise)
10) Stamina regen state machine (emit stamina.RegenState on transitions)

Determinism Hooks
- No RNG in core combat resolution; all outcomes derived from inputs and ms timers.
- Central Clock source; avoid Date.now() scatter.
- Record attackId with monotonically increasing sequence for replay/debug.

Unit Test Seeds (MVP)
- Dodge i‑frames negate damage within 160 ms window.
- Perfect block applies 0.2 damage factor and 0.3 chip; no chip overflow to health; attacker receives +25% PoiseDamage (parry-lite).
- Poise breaks at 0 and remains disabled for breakDurationMs (800 ms default), then recovers.
- Event emission order: TelegraphStart → AttackActive → Hit/Block → PoiseBreak (if applicable) → RecoverPoise.


## 16) Tuning Knobs & Ranges (MVP)

Safe Ranges
- stamina.lightAttackCost: 12–20 (default 16)
- stamina.dodgeCost: 18–26 (default 22)
- stamina.blockTickPer500ms: 4–8 (default 6)
- dodge.iFrameMs: 140–180 (default 160)
- block.blockDamageFactor: 0.5–0.7 (default 0.6); perfect 0.15–0.25 (default 0.2)
- block.blockStaminaChipFactor: 0.7–1.0 (default 0.9); perfect 0.2–0.4 (default 0.3)
- parryWindowMs: 80–140 (default 120)
- hitStop.capMs: ≤ 60 (default apply as needed)
- poise.recoverPerSec: 25–45 (player default 35)
- poise.poiseRecoverGraceMs: 150–250 (default 200)


## 17) Acceptance & QA Checklist

- Actions spend stamina and respect 600 ms regen delay; regen pauses while blocking.
- Dodge i‑frames functional and negate damage/poise during window; reduced by 20% at 0 stamina.
- Blocks mitigate per factors; perfect block/parry-lite applies correct modifiers; chip overflow converts 50% to health only when stamina hits 0 (non-perfect).
- Poise reaches 0 → PoiseBroken for breakDurationMs; gains +20% damage and knockback; no poise accrual while broken; recovery resumes after duration.
- Hit-stop applies to involved actors and caps at ≤ 60 ms.
- Telegraphs emit at Windup start with proper visual/audio tokens.
- Enemy JSON fields align to schema in §10; lane constraints respected in three‑wide lanes.
- ~30 s TTK observed in dry runs vs. goblin and burrower with Expected Player (AP 8, DEF 0, hitRate 0.6).
- Event payloads match §11 and are consumed by Audio/UI bridges; token-only color/audio refs throughout.


## 18) Appendix — Example Payloads

Example: Goblin Slash Sweep (enemy-goblin-grunt.json, attack id "slash_sweep")
- combat.TelegraphStart
```
{
  "enemyId": "goblin_grunt_01",
  "attackId": "slash_sweep",
  "pos": { "x": 512, "y": 384 },
  "colorToken": "mapping.telegraph.arc.amber",
  "visual": "arc"
}
```

- combat.AttackActive
```
{
  "sourceId": "goblin_grunt_01",
  "attackId": "slash_sweep",
  "pos": { "x": 512, "y": 384 },
  "rangePx": 28,
  "arcDeg": 110,
  "hitbox": { "w": 26, "h": 14, "offsetX": 12, "offsetY": 0 }
}
```

- combat.Hit (player blocks imperfectly)
```
{
  "sourceId": "goblin_grunt_01",
  "targetId": "player_hero",
  "attackId": "slash_sweep",
  "damage": { "base": 15, "final": 9 },   // 15 reduced × 0.6 block factor = 9
  "poiseDamage": 10,
  "wasBlocked": true,
  "wasDodged": false,
  "knockbackPx": 6
}
```

- combat.Block
```
{
  "blockerId": "player_hero",
  "attackerId": "goblin_grunt_01",
  "attackId": "slash_sweep",
  "chip": { "stamina": 13, "health": 0 }, // floor(15 × 0.9) = 13; no overflow
  "perfect": false
}
```

- combat.PoiseBreak (on goblin after sustained hits)
```
{
  "targetId": "goblin_grunt_01",
  "pos": { "x": 516, "y": 384 }
}
```

Example: Burrower Emerge Burst (enemy-cave-burrower.json, attack id "emerge_burst")
- combat.TelegraphStart
```
{
  "enemyId": "cave_burrower_02",
  "attackId": "emerge_burst",
  "pos": { "x": 736, "y": 360 },
  "colorToken": "mapping.telegraph.emerge.amber",
  "visual": "halo"
}
```

- combat.AttackActive
```
{
  "sourceId": "cave_burrower_02",
  "attackId": "emerge_burst",
  "pos": { "x": 736, "y": 360 },
  "rangePx": 22,
  "arcDeg": 360,
  "hitbox": { "w": 24, "h": 24, "offsetX": 0, "offsetY": 0 }
}
```

- combat.Hit (player caught, burrower target not PoiseBroken)
```
{
  "sourceId": "cave_burrower_02",
  "targetId": "player_hero",
  "attackId": "emerge_burst",
  "damage": { "base": 16, "final": 16 },
  "poiseDamage": 18,
  "wasBlocked": false,
  "wasDodged": false,
  "knockbackPx": 8
}
```

- stamina.Spend (player dodge attempt, separate event)
```
{
  "entityId": "player_hero",
  "action": "dodge",
  "amount": 22
}
```

- stamina.RegenState (resume after delay)
```
{
  "entityId": "player_hero",
  "isRegenerating": true
}
```

Example State Diagrams (textual)

Player Light Attack
- Idle
  → Input.Attack (stamina ≥ 16) → stamina.Spend(16)
  → TelegraphStart
  → Windup(240 ms)
  → Active(80 ms) → AttackActive
    • Collision samples → Hit/Block events per target
    • Apply hit-stop
  → Recovery(320 ms)
  → Cooldown(300 ms, AI/input gated only; animation may already be neutral)
  → Regen delay (600 ms from last spend) → stamina.RegenState(true)
  → Idle

Player Dodge
- Any actionable state (not PoiseBroken, not hard-stunned)
  → Input.Dodge (stamina ≥ 22) → stamina.Spend(22)
  → Start dodge anim (Total 320 ms)
    • I‑frames: 160 ms centered in first 220 ms (≈ 60–220 ms)
    • Movement: 48 px over duration along facing/input vector
  → End dodge → Regen delay (600 ms from last spend) → stamina.RegenState(true)

Three‑Wide Law Adherence
- All enemy swing arcs and spawn offsets must keep their forward rectangles within lane bounds to avoid “wall magic.” Honest steel, honest space.