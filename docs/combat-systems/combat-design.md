# Combat Design — Stamina, Poise, and Telegraph Law (Sprint 1)

Provenance
- Owner: @gamma (Combat Systems — Battlehammer Ironshield)
- This spec is authoritative for ECS component fields, combat timing, and event contracts in Sprint 1.
- Cross-references:
  - docs/core-systems/ecs-architecture.md (§Components, System Order)
  - docs/visual-systems/style-guide.md (§Telegraphs)
  - docs/audio-systems/audio-design.md (§Event Bridge)
  - docs/world-generation/cave-gen-algorithm.md (§lane arcs ≤110°)
  - data/visual/color-palette.json (mapping.telegraph.arc.amber)
  - src/systems/combat-timing-service.js (timing FSM, events)
  - data/combat/enemy-*.json (schema and constraints)


## 2) Goals & Non-goals (MVP)

Goals (Sprint 1 MVP)
- Readable, punishable-but-fair melee core loop.
- Stamina gates decision cadence; no spam, encourage reposition windows.
- Poise enforces trading risk; break state curbs aggression.
- Telegraphs consistent and lane-safe (arc ≤ 110°); respect cave lane arcs.
- Solo TTK 30–34 s vs baseline enemies at Player AP 8 (Goblin Grunt target 28–32 s; Burrower 30–34 s).
- Deterministic timing at millisecond precision; all timers use a monotonic game clock.

Non-goals
- No combo trees (single-step actions only).
- No status effects in MVP.
- No ranged combat in MVP.
- No stagger chains beyond PoiseBreak-lite (parry stunner and PoiseBreak only).


## 3) Components (Authoritative fields and clamps)

All numeric times are integer milliseconds. All integer fields are clamped to non-negative ranges unless stated.

Stamina
- Shape:
  - max:int (clamp: [1..999])
  - value:int (clamp on write: [0..max])
  - regenPerSec:number (clamp: [0..100])
  - regenDelayAfterActionMs:int = 500 (default; clamp: [0..3000])
  - regenCooldownUntilMs:int (monotonic ms timestamp; clamp: ≥ now)
- Semantics:
  - Actions that require stamina fail to start if value < cost (hard gate).
  - On successful action start, subtract cost immediately; set regenCooldownUntilMs = now + regenDelayAfterActionMs (or action-specific override).
  - Regen tick: when now ≥ regenCooldownUntilMs, value increases continuously at regenPerSec (apply per-frame as dtMs × regenPerSec / 1000), clamped to max.

Poise
- Shape:
  - max:int (clamp: [1..999])
  - value:int (clamp on write: [0..max])
  - recoverPerSec:number (clamp: [0..100])
  - breakDurationMs:int (default: 900; clamp: [300..3000])
  - brokenUntilMs:int (monotonic ms timestamp; clamp: ≥ now or 0 if not broken)
- Semantics:
  - Apply poise damage on hit.
  - Break rule: when value ≤ 0 at resolution, set brokenUntilMs = now + breakDurationMs and emit poise.Break.
  - While broken (now < brokenUntilMs): cannot start new attacks; CombatTimingService applies poiseStartupTaxMs = 40 to any incoming attacks impacting the broken entity (startup tax hook).
  - Recovery: when not broken, value recovers continuously at recoverPerSec (dtMs × recoverPerSec / 1000), up to max. When value returns to max from below (and brokenUntilMs == 0 or elapsed), emit poise.Recover.

Health
- Shape:
  - max:int (clamp: [1..9999])
  - value:int (clamp on write: [0..max])
- Semantics:
  - On damage, clamp to [0..max]. value == 0 triggers entity death flow (handled elsewhere).

Attributes
- Shape:
  - attackPower:int (clamp: [0..99])
  - defense:int (clamp: [0..99])

Collider/Hitbox ownership
- Ownership and transform inheritance follow docs/core-systems/ecs-architecture.md. The CombatTimingService toggles attack hitboxes per-attack; Entity Collider remains for body collision. Attack hitboxes are child shapes with local offsets, non-persistent outside ACTIVE windows.


## 4) Actions & Stamina Costs (Authoritative numbers)

Light Attack (Player pick swing MVP)
- staminaCost: 14
- windupMs: 300, activeMs: 80, recoveryMs: 420, cooldownMs: 260

Dodge (step)
- staminaCost: 18
- iFrames: 180 ms (start at frame 0 of dodge)
- Travel: 36 px over 180 ms (linear; collision-resolved)
- regenDelayAfterActionMs override: 600

Block (hold)
- enterCost: 8 (charged on press)
- upkeepCost: 6 per second (apply as 3 per 500 ms tick; first tick occurs at 500 ms)
- Block window: immediate on enter
- chipDamageRatio: 0.35
- Stamina damage on block equals 60% of prevented health damage
- Guard break: if stamina reaches 0 while blocking, block ends immediately; no extra stagger in MVP; stamina regen delay resets (apply base 500 ms).

Parry (timed while blocking)
- Parry window: 120 ms before contact time while holding block
- staminaCost: 8 (no upkeep for 200 ms parry window after successful parry attempt)
- On successful parry, set wasParried=true for resolution.

Enemy stamina
- Enemies do not consume stamina for actions in MVP. Any enemy stamina pools are for AI pacing only; regenPerSec on those pools may govern cadence but does not gate attack validity in MVP.


## 5) Damage & Mitigation Formulas (deterministic)

Let attacker and victim be the entities involved and AttackDef be the attack definition.

Raw damage:
- D_raw = AttackDef.damage.base + floor(0.5 × attacker.Attributes.attackPower)

Mitigated pre-block:
- D_mid = max(1, D_raw − floor(0.4 × victim.Attributes.defense))

Outcomes
- Unblocked, unparried:
  - Health -= D_mid
  - Poise -= AttackDef.damage.poiseDamage
- Blocked:
  - Health -= floor(D_mid × chipDamageRatio) where chipDamageRatio = 0.35
  - Poise -= ceil(AttackDef.damage.poiseDamage × 0.5)
  - Stamina -= ceil(D_mid × 0.6)
- Parried (defender successfully parries attacker’s strike):
  - Health -= floor(D_mid × 0.6)
  - Attacker Poise -= ceil(AttackDef.damage.poiseDamage × 1.25)
  - Apply parry stunner to attacker: +160 ms forced recovery added to normal recovery (PoiseBreak-lite)
  - Emit parry ring SFX and visuals per style

Knockback
- Apply AttackDef.knockback.px along attacker forward if unblocked/unparried.
- If blocked: reduce knockback to 30% (round down).
- If parried: 0% knockback (cancelled).


## 6) Poise System Details

Per-hit poiseDamage arrives from AttackDef.damage.poiseDamage.
- Recovery: Poise recovers at recoverPerSec when the entity is not in Broken state.
- Break: On value ≤ 0, set brokenUntilMs = now + breakDurationMs and emit poise.Break. While broken:
  - Victim can move and block.
  - Victim cannot start new attacks.
  - Incoming attacks against the broken victim apply a +40 ms startup tax via CombatTimingService (poiseStartupTaxMs hook).
- Recovery event: When poise recovers to max after being below max, emit poise.Recover.

Events (payloads in §11)
- poise.Break { entityId, breakMs }
- poise.Recover { entityId, recoveredAtMs }


## 7) Hit-Stop & Feel

Apply per-attack AttackDef.hitStopMs; freeze visuals only for affected sprites. Audio continues.

Default light (MVP) tuning:
- Unblocked hit: attacker 22 ms, victim 42 ms
- Blocked: attacker 12 ms, victim 14 ms
- Parried: attacker 4 ms, defender (victim) 12 ms plus parry ring SFX

Allowed tuning windows (for other attacks):
- Unblocked: attacker 18–24 ms, victim 38–46 ms
- Blocked: attacker 10–14 ms, victim 12–16 ms
- Parried: attacker 0–6 ms, defender 10–14 ms


## 8) Telegraphs (Visual + Timing Contracts)

- TelegraphStart fires at windup begin (after any applied poise startup tax).
- Arc overlay:
  - arcDeg ≤ 110° (lane-safe; cross-ref cave-gen-algorithm lanes)
  - colorToken = mapping.telegraph.arc.amber (from data/visual/color-palette.json)
  - rangePx = AttackDef.rangePx
- flashAtMs:
  - Pre-flash window must be in [−180..−80] ms relative to ACTIVE start.
  - Artists align highlights per style-guide Appendix A table.
- Debounce:
  - Per-attacker telegraph debounce ≥ 300 ms. CombatTimingService coalesces emission if violated (later start supersedes earlier within the debounce window).
- Visuals:
  - Render per docs/visual-systems/style-guide.md (§Telegraphs); opacity cap 0.6; arc overlay true for melee MVP.


## 9) AttackDef Schema & Bounds (Melee MVP)

Exact object shape and key order (must match enemy JSON shape and order):

```
{
  id,
  name,
  kind: "melee",
  windupMs,
  activeMs,
  recoveryMs,
  cooldownMs,
  rangePx,
  arcDeg,
  hitbox: { w, h, offsetX, offsetY },
  damage: { base, poiseDamage },
  hitStopMs: { attacker, victim },
  knockback: { px, direction: "forward" },
  telegraph: { colorToken: "mapping.telegraph.arc.amber", arcOverlay: true, flashAtMs },
  notes: [string]
}
```

Constraints (authoritative for validation):
- kind must be "melee"
- activeMs ∈ [70..110]
- arcDeg ≤ 110
- flashAtMs ∈ [−180..−80]
- hitbox.w, hitbox.h ∈ [1..64]
- rangePx ∈ [8..64]
- knockback.px ∈ [0..32]
- hitStopMs.attacker ∈ [0..48], hitStopMs.victim ∈ [0..64]
- notes is optional but, if present, must be an array of strings.


## 10) Player Light Attack (Authoritative MVP AttackDef)

Inline Player AttackDef used by timing service if a Player melee attack is required and no data file overrides are present:

```
{
  id: "pick_light",
  name: "Pick Swing",
  kind: "melee",
  windupMs: 300,
  activeMs: 80,
  recoveryMs: 420,
  cooldownMs: 260,
  rangePx: 18,
  arcDeg: 90,
  hitbox: { w: 16, h: 12, offsetX: 10, offsetY: 0 },
  damage: { base: 6, poiseDamage: 14 },
  hitStopMs: { attacker: 22, victim: 42 },
  knockback: { px: 8, direction: "forward" },
  telegraph: { colorToken: "mapping.telegraph.arc.amber", arcOverlay: true, flashAtMs: -120 },
  notes: ["Baseline MVP swing; tuned vs AP 8 for fair trades."]
}
```


## 11) System Order & Event Contracts (Authoritative)

ECS pipeline order (frame-level, authoritative for combat timing):
1. TimeService (dtMs, nowMs)
2. InputSystem (player intents)
3. AISystem (enemy intents; enqueues startAttack/cancelAttack)
4. StaminaSystem (validate and spend; deny actions if insufficient)
5. CombatTimingService (FSM advance; apply poiseStartupTaxMs; fire TelegraphStart; schedule hitbox toggles)
6. MovementSystem (applies dodge motion and general movement for the frame)
7. HitboxSystem (toggle attack hitboxes at ACTIVE start/end; collision detection for active hitboxes)
8. BlockParrySystem (determine wasBlocked/wasParried on contacts)
9. DamageSystem (resolve damage per §5; produce combat.Hit; clamp Health/Poise; queue hit-stop)
10. PoiseSystem (apply poise changes; handle breaks/recoveries; emit poise.Break/poise.Recover)
11. KnockbackSystem (apply impulses post-resolution)
12. RecoveryCooldownSystem (enforce recovery and cooldown; fire combat.AttackEnd when appropriate)
13. StaminaRegenSystem (apply regen when off cooldown)
14. AudioBridgeSystem (map events to audio-design keys)
15. VisualTelegraphSystem (render arcs per style-guide; obey opacity cap)

CombatTimingService state machine (per attack instance):
- IDLE → WINDUP (at startAttack; apply +40 ms to windup if target is PoiseBroken and tax is applicable) → ACTIVE (hitbox on) → RECOVERY (hitbox off) → COOLDOWN → IDLE
- Cancellations allowed: during WINDUP only (by AI within ≤ 40% windup, see §12); reason:"canceled"
- Interruptions: if attacker is disabled/knocked down (not in MVP), use reason:"interrupted"

Events (payloads exact):
- combat.TelegraphStart
  - { attackerId:int, attackId:string, targetId:int|null, startMs:int, windupMs:int, arcDeg:int, rangePx:int, colorToken:string, flashAtMs:int }
- combat.AttackEnd
  - { attackerId:int, attackId:string, endedAtMs:int, reason:"finished"|"canceled"|"interrupted" }
- combat.Hit
  - { attackerId:int, victimId:int, attackId:string, damage:int, poiseDamage:int, wasBlocked:bool, wasParried:bool, hitStop:{attacker:int, victim:int} }
- poise.Break
  - { entityId:int, breakMs:int }
- poise.Recover
  - { entityId:int, recoveredAtMs:int }

Audio mapping (audio-design.md keys):
- combat.TelegraphStart → sfx.combat.telegraph.whoosh
- combat.Hit (unblocked) → sfx.combat.hit.flesh (or sfx.combat.hit.metal by victim armor tag if available)
- combat.Hit (blocked) → sfx.combat.block
- combat.Hit (parried) → sfx.combat.parry.contact + sfx.combat.parry.ring
- poise.Break → sfx.combat.poise.break
- combat.AttackEnd (finished) → no SFX; (canceled) → sfx.combat.feint
- Dodge start (out of scope event) → sfx.movement.dodge.step (if defined)


## 12) AI Constraints & Cadence (MVP enemies)

- Global attack cadence target: 1.0–1.3 s per attempt (sum of AI-controlled delays + per-attack cooldownMs).
- Feints: Allowed only during WINDUP and only within ≤ 40% of windupMs.
  - On feint, invoke cancelAttack(attackerId, attackId, reason:"canceled") and ensure telegraph arc fades per style.
- Targeting: Prefer nearest lane-aligned player; adjust to maintain arc safety (≤ 110°).
- Telegraph debounce: AI must not spam TelegraphStart; the service enforces ≥ 300 ms per-attacker debounce; AI should space attempts accordingly.


## 13) Enemy Data Schema (Goblin/Burrower) — Top-level Order

Mirror the exact top-level keys and order as enemy-cave-burrower.json when defining enemy-goblin-grunt.json.

Top-level key order (authoritative):
1) version
2) id
3) name
4) archetype
5) body
6) attributes
7) health
8) stamina
9) poise
10) movement
11) ai
12) attacks
13) loot
14) notes

Sub-objects (authoritative fields and constraints):

- version:string (semver-like), id:string (unique), name:string, archetype:string

- body
  - { width:int, height:int, colliderOffsetX:int, colliderOffsetY:int }
  - Constraints: width,height ∈ [8..64]

- attributes
  - { attackPower:int, defense:int }
  - Constraints: attackPower, defense ∈ [0..99]

- health
  - { max:int, value:int }
  - Constraints: 1 ≤ value ≤ max ≤ 9999

- stamina
  - { max:int, value:int, regenPerSec:number, regenDelayAfterActionMs:int }
  - Constraints: mirrors §3 clamps; enemies may set regenPerSec ≥ 0 even if unused for gating in MVP.

- poise
  - { max:int, value:int, recoverPerSec:number, breakDurationMs:int }
  - Constraints: mirrors §3 clamps.

- movement
  - { speedPxPerSec:number, turnRateDegPerSec:number }
  - Constraints: speedPxPerSec ∈ [10..180], turnRateDegPerSec ∈ [90..720]

- ai
  - {
      engageRangePx:int,
      disengageRangePx:int,
      minTimeBetweenAttacksMs:int,
      feintChance:number,
      attackWeights:{ [attackId:string]: number }
    }
  - Constraints:
    - 0 ≤ feintChance ≤ 0.5 (MVP cap)
    - minTimeBetweenAttacksMs ∈ [700..2000] to achieve 1.0–1.3 s cadence when combined with per-attack cooldownMs.
    - engageRangePx ≥ disengageRangePx ≥ 0
    - attackWeights:
      - Each key must exactly match an id in attacks[*].id
      - Each weight ≥ 0
      - Sum of all weights > 0

- attacks
  - Array of AttackDef objects; each must match §9 exact shape, key order, and constraints (activeMs bounds, arcDeg ≤ 110, flashAtMs window, etc.).

- loot
  - { table:[ { id:string, weight:int } ], nothingWeight:int }
  - Constraints: weights ≥ 0; nothingWeight ≥ 0; sum of all weights + nothingWeight > 0.

- notes
  - [string]

Any additional fields are disallowed in Sprint 1 validation.


## 14) Tuning Targets & Benchmarks

- TTK vs Goblin Grunt: ~28–32 s at Player AP 8, defense 0, using Player pick_light attack, with ~70% uptime and a mix of hits, blocks, and a few parries.
- TTK vs Burrower: ~30–34 s at Player AP 8, defense 0, same assumptions.
- Stamina loop cadence: average two light swings followed by a brief reposition/dodge; regen windows must prevent infinite swing sequences.
- Poise loop: Two to three clean hits from enemies should threaten a PoiseBreak; successful player parries should meaningfully pressure enemy poise without trivializing the fight.


## 15) Acceptance Tests (Sandbox Scripts & Manual)

Sandbox scenario
- Arena: 12×12 flat.
- Player: Attributes.attackPower = 8, defense = 0; uses AttackDef pick_light from §10.
- Enemies: spawn goblin-grunt and cave-burrower one at a time for separate 10-trial runs.

Record per trial
- attacksStarted:int
- hitsLanded:int
- blocks:int
- parries:int
- timeToKillMs:int
- telegraphsEmitted:int

Data validity checks
- All AttackDefs satisfy §9 bounds (activeMs, arcDeg, flashAtMs). Reject and log any violations.
- colorToken resolves to data/visual/color-palette.json mapping.telegraph.arc.amber.
- Event order per §11: TelegraphStart precedes any Hit of that attack, AttackEnd fires exactly once per started attack.
- poise.Break then poise.Recover order for each break cycle; timestamps monotonic.

JSON handshake
- enemy-cave-burrower.json and enemy-goblin-grunt.json parse with exact top-level key order in §13.
- ai.attackWeights keys match attacks[*].id and sums > 0.
- loot tables parse; nothingWeight included and plausible (no negative weights).
- Numbers within clamps specified in §3, §9, §13.

Pass criteria
- Median TTK within targets for both enemies.
- No telegraph debounce violations (service coalesces; observed telegraphsEmitted ≤ attacksStarted + number of debounced merges).
- No failed starts due to negative stamina values (stamina never < 0).
- Deterministic replays: identical seeds yield identical event timelines (±0 ms tolerance).


## 16) Risks & Dials

Dials (safe Sprint 1 ranges)
- staminaCost: ±2
- regenPerSec: ±10%
- poiseDamage: ±2
- chipDamageRatio: 0.30–0.40
- hitStop: ±4 ms
- telegraph flashAtMs: ±20 ms
- poise.breakDurationMs: ±150 ms around 900

Risks
- Insufficient playtest volume may skew TTK.
- AI feint rate too high devalues telegraphs.
- Encounter density: overlapping telegraphs risk visual clutter; enforce debounce and opacity cap.


## 17) Integration Notes

- Wire CombatTimingService hooks:
  - onWindupStart(attackerId, attackId): apply poiseStartupTaxMs = 40 if defender is PoiseBroken (adds to windup).
  - onHitboxToggle(attackerId, attackId, isActive): toggle attack hitbox on ACTIVE start/end.
- Stamina spend:
  - Occurs in InputSystem/AISystem gating before CombatTimingService startAttack; deny if insufficient; set regen cooldown per action (Block enter, Dodge override 600 ms, otherwise default 500 ms).
- Telegraph rendering:
  - VisualTelegraphSystem draws arc overlays per docs/visual-systems/style-guide.md (§Telegraphs), colorToken mapping.telegraph.arc.amber, opacity ≤ 0.6. Pre-flash at telegraph.flashAtMs relative to ACTIVE start.
- Audio:
  - AudioBridgeSystem maps events to audio keys as per §11.
- Knockback application:
  - After Damage and Poise resolution; scale per block/parry rule.
- Lane safety:
  - Ensure arcDeg ≤ 110° (cave-gen-algorithm lane arcs). Any wider arcs are invalid in MVP.
- Determinism:
  - Use the engine monotonic nowMs for all timestamps; store and compare as ints; avoid floating error by accumulating regen with integer math where possible (fixed-point: per-1000 scaling).


## 18) Changelog & Ownership

- Version 1.0 — Sprint 1 MVP
  - Established authoritative components and clamps
  - Locked AttackDef schema and bounds
  - Finalized CombatTimingService events and FSM timings
  - Codified Telegraph Law (arc ≤ 110°, color token, debounce)
  - Set TTK targets and acceptance tests

Owner: @gamma (Battlehammer Ironshield). Any changes require PR review with updated acceptance metrics and re-run of the sandbox benchmarks. Do not deviate from the numbers without data.