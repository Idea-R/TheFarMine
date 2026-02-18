# Combat Design — Steel, Stamina, and Poise (Sprint 1)

Provenance
- Owner: @gamma (Combat Systems — Battlehammer Ironshield)
- Scope: Implementation-ready spec for Sprint 1 combat. Audience: gameplay engineers, AI scripters, animation/VFX, audio.
- Cross-references:
  - data/core/component-schemas.json (§Health/Stamina/Poise clamps)
  - src/core/ecs-registry.js (Registry API)
  - docs/visual-systems/style-guide.md (§8 Telegraphs)
  - docs/world-generation/cave-gen-algorithm.md (§Three‑Wide lanes)
  - data/visual/color-palette.json (mapping.telegraph.*)
  - docs/audio-systems/music-direction.md (§Events)
  - data/audio/sound-manifest.json (telegraph/impact ids)
  - data/combat/enemy-*.json (§Schema alignment)

---

## 2) Combat Goals & MVP Scope

Encounter feel
- Readable, telegraph-first melee. Players should read the arc and commit to dodge/block/parry.
- Stamina budget forces meaningful choice; no spamming. Windows reopen via discipline.
- Poise creates stagger windows; break state is the moment to capitalize.
- Hit-stop sells weight and clarity without freezing the world sim.

Target tuning
- Solo TTK target: ~30 s vs a Goblin/Burrower mix for Player AP 8.
- Enemy pressure: 2 melee options per enemy, medium cadence, clear pre-flash.

MVP actions
- Player: Light Attack (melee), Dodge, Block (hold), Parry (perfect-timed block).
- Enemies: Basic melee (2 attacks per enemy).
- Systemic: Poise break/stun.
- Deferred: Any ranged (bows, spits, throws); Sprint action is disabled to avoid input/energy conflicts.

---

## 3) Core Stats, Units, and Global Timing

Simulation cadence
- Frame rate assumption: 60 fps fixed-step; timing measurements in ms.
- Quick ms↔frames guide (approx at 60 fps):
  - 60 ms ≈ 4 frames
  - 80 ms ≈ 5 frames
  - 100 ms ≈ 6 frames
  - 300 ms ≈ 18 frames
  - 480 ms ≈ 29 frames
  - 500 ms ≈ 30 frames
  - 800 ms ≈ 48 frames

World scale reminders
- Tiles: 16×16 px.
- Actor bodies: 12×12 px nominal footprint.
- Lane law: ≤110° melee sweep arcs to preserve Three‑Wide lanes readability and space control.

---

## 4) Stamina System (Authoritative Numbers)

Player defaults (use schema defaults unless noted)
- Stamina.max = 100
- Stamina.regenPerSec = 14
- Stamina.regenDelayAfterActionMs = 600
- Clamp rule: value ∈ [0..max], enforced by ecs-registry per data/core/component-schemas.json v1.

Action stamina costs (MVP)
- LightAttack: 18 stamina at windup start.
- Dodge: 22 stamina at dodge start.
- Block:
  - Entry: require minimum reserve ≥6 to raise shield. No upfront cost.
  - While held and absorbing hits: 6 stamina per 200 ms tick when one or more impacts occurred in that tick window; no idle drain when not absorbing.
  - Additionally per absorbed hit: spend staminaDrainPerHit (see §6).
- Parry: no extra cost beyond Block if the parry window is satisfied; see §6.
- Sprint: disabled in MVP. Set per-player Sprint.enabled=false and cost=0 to prevent conflicts.

Regen rules
- Any stamina spend pauses regen for regenDelayAfterActionMs (600 ms) from the spend time.
- Regen resumes at regenPerSec/60 per frame, until reaching max.
- When blocking and an incoming hit is absorbed, extend the current regen pause by +200 ms per absorbed hit (extends, not overwrites; take the max of existing pause vs now+200).
- Enforce clamp at write-time via ecs-registry.

Enemy stamina (MVP parity)
- Enemies possess the same Stamina component shape. They spend stamina per action matching player costs for parity, but are not exhaustible in MVP (AI will not be canceled by low stamina).
- Regen values set to ensure their loops function smoothly. No stamina-based cancels or guard-breaks in MVP.

---

## 5) Poise System (Authoritative Numbers)

Player poise
- Poise.max = 100
- Poise.recoverPerSec = 35
- Poise.breakDurationMs = 800
- Clamp rule: value ∈ [0..max].
- On hit:
  - Apply poiseDamage from the attack definition (see §9 and §13).
  - If Poise.value remains > 0, allow small flinch reactions at animation level when internal thresholds from animation request are crossed (non-systemic).
- Poise break
  - Triggered when Poise.value ≤ 0 after applying damage.
  - Enter PoiseBreak state for breakDurationMs (800 ms).
  - While PoiseBroken: cannot block or parry; dodge i-frames remain, but startup slowed by +40 ms (action tax applied to the next Dodge or until break ends, whichever first; do not stack).
  - Visual: apply stun animation/FX per style guide (§8 Telegraphs reference).
  - Poise recovery: begins only after 250 ms of calm (no further poiseDamage received). Recover at recoverPerSec. Poise does not recover during break.

Enemy poise
- Defined per enemy in data/combat/enemy-*.json (poise.max, recoverPerSec).
- Same break semantics as player: cannot block or parry (if such mechanics exist on the enemy), and vulnerable windows align with animation.
- CombatTimingService emits poise.Break and poise.Recover events (see §11).

---

## 6) Block and Parry Windows

Block
- While held and stamina > 0:
  - Incoming Health damage is reduced by BlockFactor = 0.6 (40% reduction).
  - Stamina drains on pressure:
    - Per-hit drain: staminaDrainPerHit = min(12, floor(0.5 × incomingDamage before block)).
    - While under fire: additional 6 stamina every 200 ms tick if at least one impact was absorbed in that tick.
  - If stamina is insufficient to fully pay staminaDrainPerHit for a given impact:
    - Damage is still mitigated by BlockFactor (as long as stamina > 0 at the instant of impact).
    - Apply GuardBreakLight: +8 bonus poiseDamage to the defender.
- If the player attempts to raise block with Stamina.value < 6, block does not raise (UI may flicker an error; system does not incur cost).
- Each absorbed hit extends stamina regen delay by +200 ms (see §4).

Parry
- Requirements:
  - Block must be raised at least 120 ms prior to the impact to arm the parry window.
  - Perfect-block window = 120 ms centered on the predicted impact timestamp.
- On success:
  - Nullify incoming Health damage.
  - Reflect poiseDamage = 10 to the attacker.
  - Stun the attacker for 220 ms if the attack is parryable (parryable flag carried in the attack’s notes; true for goblins, false for some burrower moves).
  - Treat as a “hit” for hit-stop with parry-success rules (see §8).
- On failure:
  - Falls back to normal block behavior, including stamina drains and reduced damage.

Implementation notes
- CombatTimingService provides impact prediction timestamps for active hitboxes; CombatResolveSystem checks parry window.
- For multi-hit actives, evaluate parry per sub-hit.

---

## 7) Dodge/I‑frames

Timing
- Total duration: 320 ms
  - Startup: 60 ms (add +40 ms if PoiseBroken; see §5)
  - I‑frames: 120 ms starting at t=60 ms (i.e., [60..180] ms)
  - Recovery: 140 ms
- Movement burst: 80 px over 220 ms along input direction, subject to collision resolution/clamping.
- Cooldown: 300 ms action gate (movement not locked; only the Dodge action button is on cooldown).

Collision/I‑frames
- During i‑frames, ignore damage, poiseDamage, and on-hit effects from standard melee.
- Grapples or environmental hazards are not in MVP; future-proof by tagging attack kinds.

---

## 8) Hit-Stop & On-Hit Feedback (Authoritative)

Durations
- Default melee on-hit hit-stop:
  - Attacker: 22 ms
  - Victim: 42 ms
  - These are also the default in enemy JSON unless overridden by attack.hitStopMs.
- Stacking cap:
  - Maximum 2 overlapping stops affecting the same entity.
  - Any excess converts into +6 ms camera micro-kick (no time dilation added beyond cap).

Application rules
- Apply hit-stop only on confirmed Health-hitting events (i.e., non-blocked hits) and successful parries (count as momentary riposte impact).
- Do not apply hit-stop on ordinary blocks.
- On blocked impacts, apply reduced haptic/feel cues only (not time dilation):
  - Attacker “haptic window”: 12 ms
  - Victim “haptic window”: 18 ms

Contract
- CombatResolveSystem schedules per-entity hit-stop envelopes.
- RenderSyncSystem, AudioEventBridge, and AI tick remain responsive (no global timeScale changes).

---

## 9) Damage & Mitigation Formula

Inputs
- attacker.Attributes.attackPower (AP)
- attack.damage.base (DB) from AttackDef
- defender.Attributes.defense (DEF)
- defender block state (see §6)

Computation
- BaseDamage = DB + floor(0.5 × AP)
- Mitigated = max(1, BaseDamage - DEF)
- If blocking: Mitigated = ceil(Mitigated × BlockFactor) with BlockFactor = 0.6
- Apply to Health with ECS clamp (data/core/component-schemas.json).
- Poise application:
  - Apply attack.damage.poise (poiseDamage) separately, reduced by block only if parry success (parry nullifies, normal block does not reduce poiseDamage in MVP).
- Emit combat.Hit with payload per §11.

---

## 10) Telegraphs — Visual, Timing, and Constraints

Windowing and visibility
- Telegraph window equals windupMs for the attack.
- Arc overlays are visible only during windup; hide automatically at AttackEnd or cancel.

Pre-flash
- flashAtMs: a visual pre-flash relative to ActiveStart.
- Allowed range: −180..−80 ms.
- Default color token: mapping.telegraph.arc.amber (from data/visual/color-palette.json).

Arc constraints
- arcDeg ≤ 110° to respect Three‑Wide lane readability.
- Do not obscure the actor’s center silhouette; opacity cap ≤ 60% for overlays (follow stroke/halo per style guide §8).
- Range is AttackDef.rangePx; arc origin is actor-local forward.

Animation alignment
- Provide per-anim offset map if needed: animId → flashAtMsOffset (default 0).
- 60 fps frame conversions: use guide in §3; e.g., 100 ms ≈ 6 frames.

---

## 11) Event Contracts (Authoritative payloads)

All events route through AudioEventBridge and Render/VFX bridges where applicable.

Event shapes
- combat.TelegraphStart
  - { attackerId:int, attackId:string, targetId:int|null, startMs:int, windupMs:int, arcDeg:int, rangePx:int, colorToken:string, flashAtMs:int }
- combat.Hit
  - { attackerId:int, victimId:int, attackId:string, damage:int, poiseDamage:int, wasBlocked:bool, wasParried:bool, hitStop:{attacker:int, victim:int} }
- combat.AttackEnd
  - { attackerId:int, attackId:string, endedAtMs:int, reason:"finished"|"canceled"|"interrupted" }
- poise.Break
  - { entityId:int, breakMs:int }
- poise.Recover
  - { entityId:int, recoveredAtMs:int }

Emit points
- CombatTimingService
  - Emits combat.TelegraphStart at windup begin.
  - Emits poise.Break when transitioning into PoiseBreak (if not emitted by Resolve on the same frame).
- CombatResolveSystem
  - Emits combat.Hit on confirmed resolution.
  - Emits poise.Break when Poise.value ≤ 0 due to a hit.
- TimingService
  - Emits combat.AttackEnd with reason finished/canceled/interrupted at state machine transitions.
- StaminaPoiseRegenSystem
  - Emits poise.Recover when Poise transitions from <max to recovering state and crosses the recovery event threshold (first tick back above 0 or explicit stable state).

---

## 12) System Responsibilities & Order Integration

ECS loop (combat-relevant ordering)
1) InputSystem
   - Reads input; writes PlayerIntent (move, attack, block, dodge).
2) ActionGateSystem
   - Validates stamina availability and cooldown gates; sets ActionRequests (attack start, dodge start, block raise/lower).
3) CombatTimingService
   - Owns per-entity attack state machine: idle → windup → active → recovery.
   - Respects ai.attackCooldownMs gating.
   - On windup start: enqueues TelegraphStart and programs flashAtMs.
   - On active start/end: toggles hitbox colliders on/off.
4) MovementSystem
   - Applies dodge bursts and standard locomotion; honors i‑frames timeline.
5) Collision/HurtboxSystem
   - Collects overlaps between active hitboxes and hurtboxes; packages HitCandidates.
6) CombatResolveSystem
   - For each HitCandidate:
     - Evaluates dodge i‑frames, block state, parry window.
     - Computes damage per §9; applies Health clamp.
     - Applies poiseDamage and break logic per §5/§6.
     - Spends stamina on action costs and block drains per §4/§6.
     - Schedules hit-stop envelopes per §8.
     - Emits combat.Hit and possibly poise.Break.
7) StaminaPoiseRegenSystem
   - Ticks stamina regen if after delay; extends delay on block absorption.
   - Ticks poise recovery after 250 ms calm, pauses during break; emits poise.Recover on threshold.
8) AudioEventBridge / VFXBridge
   - Consumes events; plays SFX/VFX as mapped in §17.
9) RenderSyncSystem
   - Applies hit-stop envelopes (per-entity), camera micro-kicks, and telegraph overlays.

Registry interactions (src/core/ecs-registry.js)
- All reads/writes via ecs-registry API:
  - registry.get(entityId, ComponentName)
  - registry.patch(entityId, ComponentName, partial)
  - registry.emit(eventName, payload)
- Clamp enforcement: Health/Stamina/Poise values clamped per schema on write or commit.

---

## 13) Attack Definition Schema (Authoritative for data/combat/enemy-*.json)

Shape (mirror enemy-goblin-grunt.json)
- id:string
- name:string
- kind:string (MVP: "melee" only)
- windupMs:int
- activeMs:int
- recoveryMs:int
- cooldownMs:int
- rangePx:int
- arcDeg:int
- hitbox:object (actor-local space; forward is +X; use same sub-shape fields as goblin file)
- damage:object
  - base:int
  - poise:int
- hitStopMs:object
  - attacker:int
  - victim:int
- knockback:int (px)
- telegraph:object
  - colorToken:string
  - arcOverlay:bool
  - flashAtMs:int
- notes:object (freeform; include parryable:bool here for MVP)

Constraints (MVP)
- kind == "melee"
- activeMs ∈ [70..110]
- arcDeg ≤ 110
- telegraph.flashAtMs ∈ [−180..−80]
- hitbox defined in actor-local space; the system will use rangePx and arcDeg to construct swept volumes consistent with hitbox metadata.
- Forward is +X; arc centers on actor’s forward vector.

Data validation
- ecs-registry validation should reject out-of-range values and missing mandatory fields.
- Goblin and Burrower files must parse and adhere to these constraints.

---

## 14) Player Attack (MVP inline spec)

Player Light Swing (Pick)
- id: "player_light_pick"
- name: "Light Swing"
- kind: "melee"
- windupMs: 300
- activeMs: 80
- recoveryMs: 420
- cooldownMs: 300
- rangePx: 18
- arcDeg: 70
- damage:
  - base: 7
  - poise: 16
- hitStopMs:
  - attacker: 22
  - victim: 42
- knockback: 8 px
- telegraph:
  - colorToken: mapping.telegraph.arc.amber
  - arcOverlay: true
  - flashAtMs: −100
- notes:
  - parryable: true (for enemies reacting to player, if implemented)

Implementation
- Packaged as a data-driven AttackDef in player-attack-light.json or inline in player ability set, matching the same schema.

---

## 15) AI Hooks and Cadence

Attack selection
- AI.state evaluates:
  - Distance to target vs rangePx and preferred keepDistancePx.
  - Attack weights per attack id (tuned per enemy).
  - Cooldown availability (respects cooldownMs).
  - Line/arc clearance per Three‑Wide lanes and arcDeg constraint.

Feints
- Optional feintChance per attack: 0..1.
- If feint chosen, emit TelegraphStart as normal, then cancel the attack before 40% of windup elapses.
  - Emit combat.AttackEnd with reason:"canceled".
  - No stamina refund in MVP.
  - Minimum telegraph display: 120 ms to avoid instant pop.

Approach/spacing
- approachPxSpeed tuned per enemy locomotion; AI closes to rangePx − margin.
- keepDistancePx ensures enemies avoid stacking; prefer staggered arcs.

Parryability
- Parry gating taken from attack.notes.parryable (true for goblins; false for some burrower moves).

---

## 16) Acceptance Tests & Sandbox Scenarios

Encounter sandboxes
- Arena template: Flat, collision-free test space 15×9 tiles, neutral lighting.
- Scenario A (Goblin 1v1)
  - Seed: 48731
  - Player AP: 8, DEF per default starter.
  - Goblin: grunt archetype with two melee attacks from data/combat/enemy-goblin-grunt.json.
  - Target: 10 trials, average TTK 28–32 s.
  - Readability: cleave attack should present a ≥60% successful dodge rate after 2–3 exposures (players learnable; measured as successful Dodge input within ±80 ms of flashAtMs producing i‑frame overlap with active window).
- Scenario B (Burrower 1v1)
  - Seed: 52189
  - Player AP: 8.
  - Burrower: surface swipe and pop-up strike; burrow tell must be fair.
  - Target: 10 trials, average TTK 30–34 s.
  - Counter window: on surface, at least one punish window ≥300 ms following a PoiseBreak or whiff.

Unit-like checks
- Stamina
  - After LightAttack or Dodge, stamina regen remains paused exactly 600 ms.
  - Blocking an absorbed hit extends pause by +200 ms per hit.
- Poise
  - PoiseBreak lasts 800 ms; cannot block or parry during this window.
  - Poise recovers at 35/s after 250 ms without new poiseDamage; paused during break.
- Telegraphs
  - combat.TelegraphStart fires exactly at windup begin; flash occurs at telegraph.flashAtMs relative to ActiveStart.
- Hit-stop
  - On-hit durations match attack.hitStopMs if defined; else 22/42 defaults.
  - Stacking capped at 2 per entity; additional hits emit micro-kick only.

---

## 17) Audio & VFX Bridges

Audio mappings (data/audio/sound-manifest.json ids)
- TelegraphStart (melee windup): sfx.combat.telegraph.swing (short whoosh/bead)
- Hit (light melee impact): sfx.combat.hit.light
- Block impact: sfx.block.impact
- Parry success: sfx.parry.ring
- PoiseBreak: sfx.combat.poise.break
- Dodge whoosh (optional/if present): sfx.movement.dodge

Rules
- TelegraphStart triggers a brief whoosh and any pre-flash ping at flashAtMs.
- Hit triggers appropriate impact; vary by material tag later (deferred).
- Block plays block impact without hit-stop.
- Parry success plays ring and the attacker stun cue.
- PoiseBreak plays a distinct crack/rattle.

VFX tokens
- Telegraph arc overlay: mapping.telegraph.arc.amber
- On-hit flash: effects.hitFlash
- Parry glint: effects.parryRing
- Poise break flash: effects.poiseBreakFlash
- Optional camera micro-kick on excess hit-stop: effects.camera.microKick

Bridging
- AudioEventBridge subscribes to combat.TelegraphStart, combat.Hit, poise.Break, combat.AttackEnd (for canceled whoosh tails).
- VFXBridge mirrors same for visuals; RenderSyncSystem handles overlays and time envelopes.

---

## 18) Data & Tuning Tables

Authoritative MVP numbers
- Stamina costs
  - LightAttack: 18 [TUNE ±2]
  - Dodge: 22 [TUNE ±2]
  - Block (pressure tick): 6 per 200 ms while absorbing hits [TUNE ±2]
  - Block per-hit drain: min(12, floor(0.5×incomingDamage)) [TUNE ceiling ±2]
  - Parry: 0 extra
  - Sprint: disabled (0)
- Poise
  - Player max: 100
  - Player recover: 35/s [TUNE ±5/s]
  - Break duration: 800 ms (startup tax +40 ms on Dodge during break)
  - Parry reflect: 10 poise
  - GuardBreakLight on insufficient stamina: +8 poise
- Dodge
  - 320 ms total; 120 ms i‑frames starting at 60 ms [TUNE i‑frames ±20 ms]
  - Movement: 80 px over 220 ms
  - Cooldown: 300 ms
- Block/Parry
  - BlockFactor: 0.6 [TUNE ±0.05]
  - Parry window: 120 ms centered on impact [TUNE ±20 ms]
  - Arm requirement: block raised ≥120 ms pre-impact
- Hit-stop
  - Default: 22/42 ms [TUNE ±4 ms]
  - Stack cap: 2; excess → camera micro-kick +6 ms feel

Poise damage reference (reuse goblin values 12–14)
- Player Light Swing: 16 poise
- Goblin Jab/Slash: 12 poise
- Goblin Cleave/Overhead: 14 poise
- Burrower Swipe: 12 poise
- Burrower Lunge/Pop-up: 14 poise

Telegraph pre-flash
- Default flashAtMs: −100 ms [allowed −180..−80]

Frame conversion quick notes (60 fps)
- 80 ms ≈ 5f, 100 ms ≈ 6f, 300 ms ≈ 18f, 800 ms ≈ 48f

---

## 19) Risks & Future Dials

Risks
- Numbers are pre-playtest; may shift with feel and readability.
- AI feints can feel cheap if overused; limit frequency and ensure minimum display time.
- Telegraph offsets may require per-animation tuning to sync with artist-authored keyframes.

Future dials
- Stamina action costs: ±2
- Hit-stop durations: ±4 ms
- Poise recover rate: ±5/s
- Parry window width: ±20 ms
- Dodge i‑frame window: ±20 ms
- BlockFactor: ±0.05
- RegenDelayAfterActionMs: ±100 ms

---

## 20) Acceptance Checklist

- Numbers present and consistent with Health/Stamina/Poise component clamps.
- Event payloads explicitly defined in §11; emitting systems identified in §12.
- Telegraph constraints (arcDeg ≤110, flashAtMs bounds) and visuals align with style guide §8.
- Attack schema in §13 matches enemy JSON; Goblin grunt file parses; Burrower uses same keys.
- Sandbox/TTK tests defined with seeds and success criteria; unit checks listed.
- Stamina regen delay and block extensions implemented; Poise break window honored; dodge startup tax on break applied.
- Hit-stop execution per-entity with stacking cap; excess converted to camera micro-kick; world systems remain responsive.
- AI hooks implement attack weights, cooldowns, feints with cancel semantics; no stamina refund in MVP.

---

# 1) Title & Provenance (Index)

- Title: Combat Design — Steel, Stamina, and Poise (Sprint 1)
- Owner: @gamma (Combat Systems — Battlehammer Ironshield)
- Cross-refs:
  - data/core/component-schemas.json (§Health/Stamina/Poise clamps)
  - src/core/ecs-registry.js (Registry API)
  - docs/visual-systems/style-guide.md (§8 Telegraphs)
  - docs/world-generation/cave-gen-algorithm.md (§Three‑Wide lanes)
  - data/visual/color-palette.json (mapping.telegraph.*)
  - docs/audio-systems/music-direction.md (§Events)
  - data/audio/sound-manifest.json (telegraph/impact ids)
  - data/combat/enemy-*.json (§Schema alignment)