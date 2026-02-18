# Combat Design — Steel, Stamina, and Telegraphs (Sprint 1)

Provenance
- Owner: @gamma (Combat Systems — Battlehammer Ironshield)
- Voice: Battlehammer Ironshield — terse, forge-hot, implementation-first.

Cross‑References (must remain in lockstep)
- src/core/ecs-registry.js (Health/Stamina/Poise, Attributes, Transform)
- data/core/component-schemas.json
- docs/audio-systems/audio-design.md (§Event Bridge)
- data/visual/color-palette.json (mapping.telegraph.arc.amber)
- data/combat/enemy-goblin-grunt.json
- data/items/tools.json
- docs/world-generation/cave-gen-algorithm.md (§Three‑Wide lanes)

---

## 1) Scope & Acceptance

Scope (MVP)
- Melee only. No projectiles.
- Core loop: stamina spend → action windows (windup/active/recovery) → hit-stop → damage/poise → reactions.
- Defenses: dodge, block. Parry OFF (hook reserved).
- Telegraph overlays for melee arcs.
- Hit-stop supported (attacker/victim times).
- Deterministic damage formula. No crits/status.
- Events: authoritative, stable payloads, bridgeable to audio.
- AI parity on rules (no stamina spend for enemies in Sprint 1).

Acceptance
- Tuned for ≈30 s solo TTK vs Goblin Grunt when Player AP = 8, defense = 0, average hit rate ≈ 0.6.
- Event names/payloads exactly as in §10; audio bridge captures them.
- All tokens/ids resolve (color token, attack ids).
- Tables and schemas parse cleanly for ECS/Phaser implementers.

---

## 2) Core Stats & Gauges (ECS Mapping)

Authoritative Gauges
- Health (HP)
- Stamina (STA)
- Poise (PSE)

Dynamic clamps and tick rules apply engine‑wide.

ECS Component Mapping (names/fields/units)
- components.Health
  - current:int (0..max)
  - max:int (>=1)
  - regenPerSec:number (HP/s; default 0 for MVP combat)
  - clamp: on write: current = min(max, max(0, current))
- components.Stamina
  - current:int (0..max)
  - max:int (default 100)
  - regenPerSec:number (default 14)
  - regenDelayAfterActionMs:int (default 600)
  - lastActionMs:int (engine time)
  - regenActive: bool (derived – true if nowMs − lastActionMs >= regenDelayAfterActionMs)
  - Tick: 60 Hz; per-frame regen = regenPerSec / 60 when regenActive = true
  - On any stamina spend attempt (success or deny), set lastActionMs = nowMs (delay resets)
- components.Poise
  - current:int (0..max)
  - max:int (default 100)
  - recoverPerSec:number (default 35) — only when not taking damage and not performing an action (idle/moving okay)
  - isBroken:bool (PoiseBreak state)
  - breakEndMs:int
  - Suppress recovery during:
    - hit-stop (any side)
    - isBroken = true
    - active windup/active/recovery windows
  - Break rule: when current <= 0 → set isBroken = true; breakEndMs = nowMs + 800; during break: attacks/dodges/blocks disabled; movement allowed; after break, current stays at 0 until recovery resumes next tick.
- components.Attributes
  - attackPower:int
  - defense:int
- components.Transform (Position/Facing)
  - position:{ x:number, y:number }
  - dirX:number, dirY:number (normalized facing)

Defaults (Player)
- Stamina: max 100; regenPerSec 14; regenDelayAfterActionMs 600; 60 Hz regen.
- Poise: max 100; recoverPerSec 35; PoiseBreak duration 800 ms; movement allowed, block/dodge/attack disabled.

---

## 3) Player Action Costs & Windows (Numeric Tables)

Action windows are absolute in milliseconds; the engine maps them to frames at 60 fps (see §9).

Player Actions (first‑pass tuning)

- Light Attack (attackId: player.light_1)
  - staminaCost: 14
  - windupMs: 300
  - activeMs: 80
  - recoveryMs: 420
  - hitStopMs: attacker 22 / victim 42 (defaults if absent)
  - damage:
    - coefficient vs Attributes.attackPower: 1.0
    - attack.damage.base: 4 (use in formula; see §6)
    - poiseDamage: 12
  - arcDeg: 80
  - rangePx: 20
  - knockback: 6 px forward (apply after hit-stop)
- Dodge (roll/step)
  - staminaCost: 18
  - totalDurationMs: 360
  - iFramesMs: 140 (centered around mid-dodge)
    - Implementation note: divide the 360 ms into 6 equal phases (~60 ms each); i-frames active during phases 2–5. This approximates a centered 140 ms window while remaining discrete.
  - velocityBoost: 1.6× maxSpeed for first 120 ms, then lerp to normal by end
  - cooldownAfterRecoveryMs: 200 (from end of recovery)
- Block (hold)
  - staminaOnHit: 60% of incoming healthDamage (pre-block) converted to stamina cost; min 4
  - guardImpactHitStopMs: attacker 28 / victim 38
  - perfectBlockWindowMs: 120 after block is raised (MVP optional; if not implementing reflect, still expose window for future)
  - blockRaiseTimeMs: 120 (from press to guard active)
  - While blocking: movement at 70% speed; facing lock ±35°/s turn-rate cap
- Parry
  - OFF for Sprint 1. Reserve hook: action kind “parry” is recognized but not enterable (always denied). No data required.

Mining Action Note
- Mining costs are defined in data/items/tools.json (separate system).
- If stamina deny occurs for mining, emit UI warn + audio via audio bridge mapping (see docs/audio-systems/audio-design.md §Event Bridge). No combat events emitted.

---

## 4) Enemy Action Costs & Rules (AI Parity)

- Enemies (MVP): do not spend stamina. Stamina fields exist for parity in ECS (ignored by AI for Sprint 1).
- Enemy Poise: identical behavior to player. On poise <= 0 → stun (PoiseBreak) for 800 ms (attacks/dodges/blocks disabled; move allowed if AI permits shuffles).
- Movement & Turn-rate Guidance
  - Standard collision body: 12×12 px
  - Cave lanes: respect §Three‑Wide lanes (docs/world-generation/cave-gen-algorithm.md)
  - Attack arcs: keep ≤ 110°
  - Suggested AI turn-rate: 360°/s cap (6° per frame) to avoid instant snaps

---

## 5) Damage Formula & Mitigation

Base damage
- attackDamage = max(1, floor((attacker.Attributes.attackPower + attack.damage.base) − defender.Attributes.defense))

Blocked vs Unblocked
- If blocked == true:
  - healthDamage = floor(attackDamage × 0.25)
  - staminaDamageOnBlock = max(4, floor(attackDamage × 0.60))  // applies to blocker’s stamina
  - poiseDamage = floor(attack.damage.poiseDamage × 0.40)  // 60% reduction
- If not blocked:
  - healthDamage = attackDamage
  - poiseDamage = attack.damage.poiseDamage

No crits or status in MVP.

---

## 6) Hit‑Stop, Knockback, and Reactions

Application order
1) On collision during active window, compute block state and damages (health/poise) per §5.
2) Apply hit-stop (freeze animations/time-scale) for involved actors only:
   - attacker: attackerMs
   - victim: victimMs
   - Default if undefined by attack: 22 ms / 42 ms
3) During hit-stop:
   - Physics integration skips displacement for frozen actors
   - Poise recovery is suppressed
   - Stamina regen delay timers continue counting (do not freeze)
4) After hit-stop concludes, apply knockback:
   - direction: attacker forward (dirX, dirY)
   - magnitude: attack.knockback.px (constant)
5) Emit reactions:
   - combat.Hit (always)
   - combat.PoiseBreak if victim’s poise <= 0 (can co-emit with Hit or occur later from stacked damage)

---

## 7) Telegraphs — Visual/Timing Contract

Color Token
- telegraph color: mapping.telegraph.arc.amber (see data/visual/color-palette.json)

Arc Overlay
- Visible during windup only
- Optional flashAtMs cue relative to active start (t0 = active begin): must be in −180..−80 ms
- Draw parameters:
  - stroke: 2 px + 1 px outer halo
  - opacity: ramps 0 → 1 linearly over first 80–120 ms from TelegraphStart
- Clear on AttackEnd or on cancel

Events
- CombatSystem emits combat.TelegraphStart at windup begin with payload { windupMs }
- Artists map flash cues to telegraph.flashAtMs per attack def
- No per-attack SFX ids in data; audio bridge resolves globally (docs/audio-systems/audio-design.md §Event Bridge)

---

## 8) Timing Model & Frame Mapping

Reference: 60 fps (16.667 ms per frame). Round to nearest whole frame for engine sampling.

Common conversions (ms ≈ frames @60 fps)
- 80 ms ≈ 5 frames
- 100 ms ≈ 6 frames
- 120 ms ≈ 7 frames
- 140 ms ≈ 8 frames
- 180 ms ≈ 11 frames
- 300 ms ≈ 18 frames
- 360 ms ≈ 22 frames
- 420 ms ≈ 25 frames
- 520 ms ≈ 31 frames
- 800 ms ≈ 48 frames

Key mappings from §4
- Light Attack: windup 300 ms (18 f), active 80 ms (5 f), recovery 420 ms (25 f)
- Dodge: total 360 ms (22 f), i-frames 140 ms (8 f centered), speed boost 120 ms (7 f)
- Block raise: 120 ms (7 f)
- PoiseBreak: 800 ms (48 f)

Include goblin attack frame equivalents when authoring enemy data (see §13 exemplars).

---

## 9) Events & Contracts (Authoritative)

Emit order guarantee per attack lifecycle:
- TelegraphStart → (optional) AttackActivate → Hit(s) → AttackEnd
- PoiseBreak may accompany Hit or emit asynchronously if poise crosses zero from stacked hits

Event payloads (stable, JSON-shaped)
- combat.TelegraphStart
  - { attackerId:int, attackId:string, windupMs:int }
- combat.AttackActivate
  - { attackerId:int, attackId:string, activeMs:int, arcDeg:int, rangePx:int }
- combat.Hit
  - { attackerId:int, victimId:int, attackId:string, blocked:bool,
      damage:{ health:int, poise:int }, poiseBreak:bool }
- combat.PoiseBreak
  - { entityId:int, breakDurationMs:int }
- combat.AttackEnd
  - { attackerId:int, attackId:string }

Audio Bridge Reminder
- Do not embed per-attack SFX ids in data; audio layer listens to combat.* events and resolves globally (docs/audio-systems/audio-design.md §Event Bridge).

---

## 10) Collision, Ranges, and Arcs

Melee arc sweep
- Facing: use Transform.dirX/dirY (normalized)
- Active window: sample each frame (60 Hz)
- Hitbox: forward-biased rectangle with optional arc filter
  - hitbox fields: w, h, offsetX, offsetY (relative to actor center in facing space)
  - World placement each frame: center + rotate(offset) by facing; axis-aligned or oriented rect (engine choice; MVP can use forward-projected AABB)
- Arc filter:
  - Compute angle between facing vector and vector to candidate target center
  - If angle <= arcDeg/2, target is within arc
- Body expectation: 12×12 px
- Recommended melee range: 18–26 px (rangePx in data should mark the forward distance where the hitbox front edge roughly lands)

---

## 11) AttackDef Schema (Authoritative for data/combat/enemy-*.json)

Fields (types/units)
- id:string (unique, kebab or dot namespace)
- name:string (display/debug)
- kind:string ("melee" for MVP)
- windupMs:int
- activeMs:int
- recoveryMs:int
- cooldownMs:int
- rangePx:int
- arcDeg:int
- hitbox: { w:int, h:int, offsetX:int, offsetY:int }  // px
- damage: { base:int, poiseDamage:int }
- hitStopMs: { attacker:int, victim:int }
- knockback: { px:int, direction:"forward" }  // only “forward” for MVP
- telegraph: { colorToken:string, arcOverlay:bool, flashAtMs:int|null }
- notes:string[]  // optional, freeform

Validation (reject on load if violated)
- kind == "melee"
- activeMs in [70..110]
- arcDeg <= 110
- flashAtMs == null or in [-180..-80]
- windupMs >= 120
- recoveryMs >= 240
- cooldownMs >= 0
- rangePx in [12..32]
- hitStopMs.attacker in [16..40]; hitStopMs.victim in [28..60]
- knockback.px in [0..14]
- damage.base >= 0; damage.poiseDamage >= 0

---

## 12) Standard Movesets (MVP)

Player exemplar (authoritative for player.light_1)
- id: player.light_1
- name: Light Attack
- kind: melee
- windupMs: 300
- activeMs: 80
- recoveryMs: 420
- cooldownMs: 0 (global cadence handled by input/state; no extra lockout)
- rangePx: 20
- arcDeg: 80
- hitbox: { w: 16, h: 10, offsetX: 10, offsetY: 0 }
- damage: { base: 4, poiseDamage: 12 }
- hitStopMs: { attacker: 22, victim: 42 }
- knockback: { px: 6, direction: "forward" }
- telegraph: { colorToken: "mapping.telegraph.arc.amber", arcOverlay: true, flashAtMs: -120 }
- notes: [ "Coefficient vs AP = 1.0", "Stamina cost 14 (see §3)" ]

Enemy exemplars — Goblin Grunt (normative references)
- Source of truth: data/combat/enemy-goblin-grunt.json
- The following two attacks must match that file. If the data file changes, update these here in lockstep.

1) Goblin: Wide Swing
- id: goblin_grunt.swing_wide
- name: Wide Swing
- kind: melee
- windupMs: 420
- activeMs: 90
- recoveryMs: 520
- cooldownMs: 240
- rangePx: 22
- arcDeg: 100
- hitbox: { w: 18, h: 10, offsetX: 9, offsetY: 0 }
- damage: { base: 5, poiseDamage: 10 }
- hitStopMs: { attacker: 22, victim: 42 }
- knockback: { px: 6, direction: "forward" }
- telegraph: { colorToken: "mapping.telegraph.arc.amber", arcOverlay: true, flashAtMs: -120 }
- notes: [ "Bread-and-butter opener", "Lane-safe, ≤110° arc" ]

2) Goblin: Short Stab
- id: goblin_grunt.stab_short
- name: Short Stab
- kind: melee
- windupMs: 280
- activeMs: 80
- recoveryMs: 440
- cooldownMs: 260
- rangePx: 24
- arcDeg: 60
- hitbox: { w: 12, h: 12, offsetX: 10, offsetY: 0 }
- damage: { base: 7, poiseDamage: 14 }
- hitStopMs: { attacker: 24, victim: 44 }
- knockback: { px: 8, direction: "forward" }
- telegraph: { colorToken: "mapping.telegraph.arc.amber", arcOverlay: true, flashAtMs: -100 }
- notes: [ "Quicker thrust for pressure", "Tighter arc, longer range nose" ]

Baseline Goblin Grunt Stats (for tuning coherence; keep synced with data/enemy config)
- Health: 64
- Poise: 100
- Defense: 0
- Attack cadence target (see §14): ≈ 0.95–1.1 s effective

---

## 13) AI Gating & Cooldowns

- Global AI gate: AI.attackCooldownMs between any two executed attacks (including canceled feints)
  - Goblin Grunt target: 700–900 ms baseline
- Per-attack cooldownMs (from §12) is a local lockout before re-selecting that same move
- Effective cadence emerges from max(global gate, per-attack cooldown + recovery + decision time) ≈ 0.95–1.1 s for Goblin with weights
- Feint placeholder (MVP):
  - feintChance: if triggered, emit TelegraphStart and cancel before AttackActivate within first 40% of windup
  - On cancel: do NOT emit audio (MVP), do emit AttackEnd with a flag note in debug (optional)
  - Cancel consumes global AI gate (prevents immediate re-swing spam)

---

## 14) Stamina/Poise Tuning Targets

30 s Duel TTK target vs Goblin Grunt (Player AP 8, DEF 0, avg. hit rate ≈ 0.6)
- Goblin HP ≈ 64; Player Light Attack damage ~ AP(8) + base(4) − DEF(0) = 12
- Clean hits to kill: 5–7 (12 dmg → ~6 hits ideal; imperfect play raises attempts)
- Block reduces incoming health but taxes stamina (watch for stamina starvation)
- Poise cadence: goblin poise 100; player light poiseDamage 12 → breaks occur on ~9 clean hits (rare without chaining)

Quick dials for feel tuning (safe per-sprint adjustments)
- Player Light Attack staminaCost: ±2
- Enemy recoveryMs: ±60
- poiseDamage (player and enemy): ±2
- hitStop victim: ±6
- Goblin attack selection weights: ±10% per move

---

## 15) Integration Notes & Order of Operations

Per-frame system ordering (combat tick)
1) Input → Intents (read-only state)
2) Stamina gate check (deny if insufficient; play deny UI/audio; start/refresh regen delay timer)
3) State changes:
   - On action start: set windup; set lastActionMs; emit combat.TelegraphStart
4) On active start:
   - emit combat.AttackActivate
   - During active each frame: resolve hitboxes/arcs → detect overlaps
5) On collision:
   - Determine blocked/dodged (dodge i-frames supersede block if overlapping)
   - Compute damage per §5
   - Apply hit-stop per §6
   - Apply knockback
   - Emit combat.Hit (and combat.PoiseBreak if crossing zero)
6) On recovery end:
   - emit combat.AttackEnd
   - Allow stamina regen after delay elapses
Tie-breaker rules
- Dodge i-frames > Block > Normal hit
- Block vs Dodge simultaneous: if within i-frame window → treat as dodge (no damage, no stamina drain). Else block applies if guard is raised.

---

## 16) VFX & UI Hooks

- Telegraph overlay: render in “vfx.telegraph” layer above actors, below HUD
  - color: mapping.telegraph.arc.amber
  - stroke 2 px + 1 px halo; opacity ramp per §7
- Hit flashes:
  - effects.hitFlash (on victim body)
  - effects.poiseBreakFlash (on victim body on PoiseBreak)
- Gauges:
  - Health → ui.gauge.health.*
  - Stamina → ui.gauge.stamina.*
  - Poise (if displayed for debug) → ui.gauge.poise.*
  - Colors pulled from data/visual/color-palette.json

---

## 17) Testing & Sandbox Scenarios

Sandbox Drill 1 — Goblin TTK Verification
- Setup:
  - Player: AP = 8, DEF = 0
  - Enemy: Goblin Grunt (Health 64, DEF 0)
  - Scene: flat lane, no adds
- Procedure:
  - 10 trials (solo)
  - Player uses Light Attack primarily; normal dodges/blocks; no cheese corners
  - Record metrics per trial:
    - timeToKillMs
    - hitsLanded, hitsTaken
    - blocks (count), staminaStarves (count)
    - poiseBreakCount (on goblin)
- Acceptance:
  - mean TTK: 28–32 s
  - std dev: ≤ 7 s
  - hitsLanded ≈ 5–7 clean hits; hit rate ≈ 0.6

Sandbox Drill 2 — Burrower Burst Readability (forward reference to next enemy)
- Setup:
  - Enemy: Burrower surface lunge prototype (telegraph arc + flash at −120 ms)
  - Player attempts to dodge
- Procedure:
  - 3 familiarization trials, then 10 measured
  - Measure dodgeSuccessRate = successful i-frame avoids / total lunges
- Acceptance:
  - dodgeSuccessRate ≥ 70% after 3-trial exposure

Dev Scene Commands (pseudo-API)
- spawn("goblin_grunt", { count: 1, lane: "center" })
- setPlayerStats({ attackPower: 8, defense: 0 })
- giveMove("player.light_1")
- startDuelTimer()
- onEvent("combat.Hit", logHit)
- onEvent("combat.AttackEnd", maybeAdvanceAI)
- hotkeys:
  - F5: reset duel
  - F6: toggle telegraphs
  - F7: show collision/hitboxes
  - F8: dump metrics (CSV)

---

## 18) Open Questions & Future Dials

- Parry: deferred; hook kept for inputs/data but non-functional in Sprint 1
- Weapon variance: light/heavy chains, unique arcs, multi-hit — post-MVP
- Per-anim telegraph offsets: may need sprite-specific arc alignment after prototype
- AI approach behavior and feint weights: tune after broader data capture
- Stamina on enemies: enable in later sprint with AI budgets

---

## 19) Acceptance Checklist

- Numeric tables present (player actions, timings, hit-stop, costs)
- Events match docs/audio-systems/audio-design.md (§Event Bridge)
- Enemy AttackDef schema parity with data/core/component-schemas.json and used in data/combat/enemy-*.json
- Goblin exemplars included; kept in sync with data/combat/enemy-goblin-grunt.json
- Explicit ms↔frame mappings at 60 fps
- Clear tuning levers listed
- Sandbox tests defined with targets and metrics

---

## Appendix A — Engineer Notes (Clamps and Edge Cases)

- Stamina spend denial:
  - If current < cost: deny action; set lastActionMs = nowMs; emit UI warn/audio; no combat events
- Block stamina drain:
  - On simultaneous multi-hits in the same frame, sum staminaDamageOnBlock once per attacker per frame to avoid overdrain spikes
- Poise:
  - On PoiseBreak trigger, cancel current windup/active (cleanly emit AttackEnd if we had started an attack)
- Multiple victims:
  - Single swing may produce multiple combat.Hit events (per victim)
- Networking (future):
  - Events are deterministic off local sim; include attacker/victim ids only; leave transport to runtime

---

## Appendix B — Frame-Exact Windows for Player Actions

- Light Attack
  - Windup: frames 0–17 (300 ms)
  - Active: frames 18–22 (80 ms)
  - Recovery: frames 23–47 (420 ms)
- Dodge
  - Total: frames 0–21 (360 ms)
  - i-frames: approx frames 7–14 (140 ms centered; implement via phases 2–5)
  - Velocity boost: frames 0–7 (120 ms)
- Block
  - Raise: frames 0–6 (120 ms)
  - Perfect window: frames 7–14 (120 ms) after guard active

By my beard, keep your arcs tight, your gauges clamped, and your events in order. The steel will sing if the numbers do.