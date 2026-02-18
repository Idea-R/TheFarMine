# Combat Design — Stamina, Steel, and the Three‑Wide Law (Sprint 1)

Provenance
- Owner: @gamma (Combat Systems — Battlehammer Ironshield)
- Voice: Battlehammer Ironshield, trimmed and hammer-true for implementers
- Cross‑refs:
  - src/core/ecs-registry.js
  - data/core/component-schemas.json
  - data/audio/sound-manifest.json
  - data/visual/color-palette.json
  - data/combat/enemy-goblin-grunt.json
  - data/combat/enemy-cave-burrower.json (pending)
  - docs/core-systems/ecs-architecture.md
  - docs/world-generation/cave-gen-algorithm.md


## 1) Design Pillars & MVP Goals
- Readable telegraphs
- Earned hits (no freebies; commitment matters)
- Stamina as tempo governor
- Poise as posture/advantage management
- Lane safety under the Three‑Wide Law
- MVP pacing target: ~30 s solo TTK vs Goblin Grunt and Cave Burrower using Expected Player stats (AP 8, DEF 0, hitRate 0.6)


## 2) Core Stats & Units
- Time: milliseconds (ms). Frame reference 60 FPS (1 f ≈ 16.67 ms).
  - Common windows (frames → ms, rounded):
    - 6f ≈ 100 ms
    - 8f ≈ 133 ms
    - 12f ≈ 200 ms
    - 18f ≈ 300 ms
    - 25f ≈ 417 ms
    - 30f ≈ 500 ms
- Space: pixels (px). Standard body collider: 12×12 px, centered on an entity’s transform.
- Attack range, arc, hitbox semantics:
  - rangePx: measured from the body’s forward face (front edge of 12×12) to furthest hitbox extent during Active.
  - arcDeg: degrees of sweep centered on entity forward (0°); positive in both left/right directions symmetrically unless otherwise specified.
  - hitbox: axis‑aligned box in local space, forward‑biased via offset; sampled every frame during Active.


## 3) Stamina System (Costs, Regen, Delay)
Baseline (ECS component)
- Stamina{ max:100, value:100, regenPerSec:14, regenDelayAfterActionMs:600 }

Action costs (initial tuning)
- Light attack: 14 stamina; windup 220 ms; recovery 340 ms (player-facing reference)
- Heavy attack (placeholder): 24 stamina; windup 420 ms; recovery 520 ms (not MVP‑required)
- Dodge: 18 stamina; i‑frames 160 ms; total animation 360 ms; regen delay applies on start
- Block hold: 0 per second baseline while held; on hit, stamina drain is defined by Block Mitigation (see Section 5)

Regen rules
- Linear stamina regen resumes after regenDelayAfterActionMs following the last stamina‑gating action start (attack, dodge, block-raise).
- Rate: regenPerSec; clamped at max.

Edge cases
- Insufficient stamina prevents action start (attack, dodge). UI/HUD should gray out.
- Block hold is allowed at 0 stamina, but on hit, mitigation is lost per Block Mitigation overflow rules (may take full damage).


## 4) Poise System (Breaks, Recovery, Advantage)
Baseline (ECS component)
- Poise{ max:100, value:100, recoverPerSec:35, breakDurationMs:800 }

Behavior
- Incoming attacks apply poiseDamage concurrently with health damage resolution.
- If poise value ≤ 0 after application:
  - Trigger PoiseBreak (stun) for breakDurationMs (800 ms) with recovery lockout (poise does not recover during this duration).
  - Emit SFX/VFX and event (see Events).
  - Attacker advantage: target is stunned, cannot block/dodge; attacker recovers normally and may chain follow‑ups.

Recovery
- Passive recoverPerSec resumes 400 ms after last received poiseDamage (cooldown), clamped to max.
- Taking any further poiseDamage during cooldown resets the 400 ms timer.


## 5) Damage & Mitigation Formulas
Raw damage calculation
- baseEffective = max(0, attack.base + attacker.Attributes.attackPower − defender.Attributes.defense)

Health damage application
- If not blocked or dodged: healthDamage = baseEffective
- If dodged during i‑frames: healthDamage = 0
- If blocked: see Block mitigation

Poise damage application
- If not blocked or dodged: poiseApplied = attack.poiseDamage
- If dodged during i‑frames: poiseApplied = 0
- If blocked: reduced per Block mitigation

Block mitigation
- Normal block (any time outside perfect window):
  - Health damage reduced by 70% (take 30% chip): healthDamage = round(baseEffective × 0.30)
  - Poise damage reduced by 40%: poiseApplied = round(attack.poiseDamage × 0.60)
  - Stamina cost: consumeStamina = round(baseEffective × 0.90)  // based on incoming pre‑reduction damage
  - If stamina < consumeStamina:
    - Apply deficit proportionally to health chip by increasing chip toward full hit. Let deficit = consumeStamina − staminaAvailable (clamped ≥ 0). Proportion p = min(1, deficit / consumeStamina).
    - healthDamage = round(lerp(baseEffective × 0.30, baseEffective, p))
    - poiseApplied remains reduced (do not restore poise to full on stamina failure).
    - Stamina becomes 0.
- Perfect block window (first 120 ms after block‑raise completes):
  - Health damage reduced by 90% (10% chip): healthDamage = round(baseEffective × 0.10)
  - Poise damage reduced by 70%: poiseApplied = round(attack.poiseDamage × 0.30)
  - Reflect poise: attacker receives 6 poiseDamage immediately.
  - Stamina cost: consumeStamina = round(baseEffective × 0.60)
  - Overflow handling identical to normal block (proportional chip increase).

Dodge i‑frames
- If attack Active overlaps the defender only during i‑frames, apply 0 health and 0 poise; otherwise resolve full (or blocked) damage.

Rounding
- Use banker's rounding to nearest integer for damage and stamina costs to remain stable across platforms.


## 6) Telegraphs & Attack Lifecycle
States
- TelegraphStart → Windup (telegraph VFX active) → Active (hitbox live) → Recovery → Cooldown

Cues and budgets
- Readable slow: windup 380–460 ms (teaches block timing)
  - Visual: arc overlay enabled
  - Audio: sfx.combat.telegraph.swing at TelegraphStart
- Fast jab: windup 240–300 ms
  - Visual: narrower arc overlay

Visual tokens
- telegraph colorToken → data/visual/color-palette.json: mapping.telegraph.arc.amber
- GroundHalo: false (MVP)
- arcOverlay: true

Artist cue table (relative to Active start)
- sweepStart: Windup start (t = −windupMs)
- flashAtMs: −120 ms (brief brighter arc pulse before impact)
- impactWindow: Active duration
- recoveryFade: first 180 ms of Recovery, reduce arc opacity to 0


## 7) Hit‑Stop & Local Timescale
Default caps
- Victim: 42–52 ms depending on attack
- Attacker: 20–26 ms depending on attack

Specifics
- Light hits: attacker 22 ms, victim 42 ms
- Heavy hits (if added later): attacker 28 ms, victim 60 ms (cap)

Blocked hits
- Reduce both attacker and victim hit‑stop by ~30% (e.g., 22→15 ms, 42→29 ms) to keep rhythm while still tactile.

Scope
- Hit‑stop is applied as a local timescale to the involved actors only; world, movement of others, and AI scheduling continue unpaused.


## 8) Player Actions (Block, Dodge, Attack) — Timing & Cones
Block
- Raise time: 120 ms from input to block‑active
- Maintain until released
- Perfect window: first 120 ms after raise completes
- Block cone: 140° centered forward; hits from outside cone are unblocked

Dodge
- Startup: 80 ms
- I‑frames: 160 ms (begin at DodgeStart event)
- Endlag: 120 ms
- Total animation: 360 ms
- Movement burst: 80 px over 360 ms, velocity easing front‑loaded
- Obeys lane safety (no tunneling through walls; adjust if collision)

Attack (player baseline reference; not MVP‑finalized)
- Light Chop example (for test harness parity):
  - windupMs: 220, activeMs: 90, recoveryMs: 340, cooldownMs: 0 (player actions typically reuse recovery as lockout)
  - rangePx: 24, arcDeg: 80
  - damage: { base:10, poiseDamage:12 }
  - hitStopMs: { attacker:22, victim:42 }
  - Notes: matches stamina and timings elsewhere for consistency


## 9) Enemy Attacks Schema Mapping (Engine Contract)
AttackDef fields (as used in enemy JSONs)
- id: string (unique within enemy file)
- name: string
- kind: "melee" | "ranged" (MVP uses "melee")
- windupMs: int
- activeMs: int
- recoveryMs: int
- cooldownMs: int
- rangePx: int
- arcDeg: int
- hitbox: { w:int, h:int, offsetX:int, offsetY:int }  // local, forward = +X
- damage: { base:int, poiseDamage:int }
- hitStopMs: { attacker:int, victim:int }
- knockback: { px:int, direction:"fromAttackerForward"|"awayFromContactNormal" }
- telegraph: { useGlobalAudio:boolean, visual:{ colorToken:string, arcOverlay:boolean, groundHalo:boolean } }
- notes: string[]

Collision semantics
- During Active, sample per frame (60 Hz); on first overlap with a given victim in that Active window, apply a Hit and set a per‑victim cooldown so repeated frames do not multi‑hit.
- Hitboxes should be forward‑biased to protect walls in 3‑wide lanes.
- rangePx measures from the body’s forward face (front of 12×12 collider) to hitbox far edge.

ASCII: body and hitbox offset (top‑down, +X is forward)
- O = body center, [ ] = body 12×12, { } = hitbox

           +X →
        ┌─────────── Lane ───────────┐
                 [   O   ]
         {hitbox}
   offsetX>0 pushes { } forward from O
   offsetY shifts vertical lane position (±)

Goblin exemplars
- Slash Sweep
  - windupMs: 420, activeMs: 100, recoveryMs: 480, cooldownMs: 360
  - arcDeg: 110°, rangePx: 22
  - hitbox: { w:16, h:10, offsetX:10, offsetY:0 }
  - damage: { base:8, poiseDamage:14 }
  - hitStopMs: { attacker:22, victim:42 }
  - telegraph.visual.colorToken: mapping.telegraph.arc.amber
- Stab Jab
  - windupMs: 280, activeMs: 80, recoveryMs: 420, cooldownMs: 320
  - arcDeg: 60°, rangePx: 24
  - hitbox: { w:12, h:8, offsetX:12, offsetY:0 }
  - damage: { base:10, poiseDamage:10 }
  - hitStopMs: { attacker:22, victim:42 }
  - telegraph.visual.colorToken: mapping.telegraph.arc.amber


## 10) AI & Gating Hooks Relevant to Combat
- AI.attackCooldownMs: minimum ms between chosen enemy attacks, independent of per‑attack cooldownMs
- attackWeights: weighted choice for attack selection; tune to prefer diverse sequences
- preferOpenLane: true biases A* to remain centered in lanes; avoid rubbing walls
- repositionOnMissMs: delay before re‑approach after a whiff (e.g., 400–600 ms)
- Aggro/leash:
  - aggroRadiusPx: begin chasing
  - leashRadiusPx: return home if exceeded or line‑of‑sight lost for N ms
- Range gating: do not attack if player beyond (rangePx + 8 px buffer) at AttackActive start; cancel into Recovery if target left bubble mid‑windup


## 11) Events & ECS Integration (Authoritative Contracts)
Emitter system
- CombatSystem (publishes all combat.* events; consumers: Audio, VFX, UI, AI)

All times are ms unless stated.

Events and payloads
- combat.TelegraphStart
  ```
  {
    "attackerId": "entity-uuid",
    "attackId": "goblin.stabJab",
    "windupMs": 280,
    "colorToken": "mapping.telegraph.arc.amber",
    "sfxId": "sfx.combat.telegraph.swing"
  }
  ```
- combat.AttackActive
  ```
  {
    "attackerId": "entity-uuid",
    "attackId": "goblin.stabJab",
    "activeMs": 80
  }
  ```
- combat.Hit
  ```
  {
    "attackerId": "entity-uuid",
    "victimId": "entity-uuid",
    "attackId": "goblin.stabJab",
    "damage": { "base": 18, "final": 5 },
    "poiseDamage": 6,
    "blocked": true,
    "perfect": false,
    "hitStopMs": { "attacker": 15, "victim": 29 }
  }
  ```
- combat.PoiseBreak
  ```
  {
    "entityId": "entity-uuid",
    "breakDurationMs": 800
  }
  ```
- combat.BlockStart
  ```
  { "entityId": "entity-uuid" }
  ```
- combat.BlockEnd
  ```
  { "entityId": "entity-uuid" }
  ```
- combat.DodgeStart
  ```
  { "entityId": "entity-uuid", "iFrameMs": 160 }
  ```
- combat.DodgeEnd
  ```
  { "entityId": "entity-uuid" }
  ```

Emit sites and ordering
- TelegraphStart at Windup begin (one per attack instance)
- AttackActive at Active window open
- Hit once per victim per Active window on first overlap
- PoiseBreak after applying poise clamp that crosses ≤ 0
- BlockStart when block state enters raise (t=0 of 120 ms raise)
- DodgeStart when i‑frames begin (after 80 ms startup)
- BlockEnd/DodgeEnd on state exit


## 12) Audio & VFX Cue Table
Default SFX ids (resolve in data/audio/sound-manifest.json)
- onTelegraph: sfx.combat.telegraph.swing
- onHit (light): sfx.combat.hit.light
- onBlock: sfx.combat.block
- onPoiseBreak: sfx.combat.poiseBreak

Visual tokens (data/visual/color-palette.json)
- Telegraph arcs: mapping.telegraph.arc.amber
- Impact overlay: effects.hitFlash
- Poise break overlay: effects.poiseBreakFlash

Event → A/V suggestions
- TelegraphStart: play sfx.combat.telegraph.swing at t=0; show arc with mapping.telegraph.arc.amber; pulse at flashAtMs = −120 ms
- AttackActive: no additional SFX by default; maintain arc until Recovery start
- Hit (unblocked): sfx.combat.hit.light at t=0; spawn effects.hitFlash on victim at t=0; apply hit‑stop
- Hit (blocked): sfx.combat.block at t=0; spawn effects.hitFlash dimmer on defender’s shield direction; reduced hit‑stop
- PoiseBreak: sfx.combat.poiseBreak at t=0; spawn effects.poiseBreakFlash on victim; optional camera nudge


## 13) Tuning Targets & Safe Ranges
Target TTK math vs Goblin Grunt (example, Expected Player AP 8, DEF 0, hitRate 0.6)
- Example Goblin Grunt (data/combat/enemy-goblin-grunt.json target): Health ≈ 240, Defense ≈ 2
- Player Light Chop damage per landed hit:
  - base 10 + AP 8 − DEF 2 = 16
- Hits to kill (landed): 240 / 16 = 15
- Considering hitRate 0.6: swings needed ≈ 15 / 0.6 = 25
- Cycle time per swing: 220 ms windup + 90 ms active (overlaps) + 340 ms recovery ≈ 560 ms envelope
  - 25 swings pure uptime ≈ 14.0 s
- Stamina gating (14 per swing, max 100, regen 14/s, delay 600 ms):
  - Bursts of 7 swings (≈3.92 s), then rest ≈ 7.6 s to refill (0.6 s delay + 7 s regen)
  - 25 swings → 7 + 7 + 7 + 4 swings with rests: attack time ≈ 13.0 s, rests ≈ 19.8 s
  - Total ≈ 32.8 s (before accounting for any blocks/dodges adding minor overhead)
- Conclusion: On‑track for ~30 s TTK; minor dials (DEF, health, stamina) can bring within 28–32 s.

Safe ranges for MVP content
- Enemy windupMs: 240–460
- Enemy activeMs: 70–110
- Enemy recoveryMs: 380–520
- Enemy cooldownMs: 300–420
- PoiseDamage per light: 10–18
- Poise breakDurationMs: 700–900
- Block chip: 20–35% normal; 5–15% perfect
- Dodge i‑frames: 140–180 ms


## 14) Lane Law & Hitbox Rules
Three‑Wide Law (lane width = 3 × 12 px = 36 px)
- No melee AoE lateral span may exceed 2/3 lane width (≤ 24 px effective width) without a clear, early telegraph (≥ 380 ms windup with arc overlay).
- Melee hitboxes must be forward‑biased (offsetX > 0) to reduce wall contacts.
- Body colliders are fixed at 12×12 px; do not scale for MVP.
- Knockback must not push victims into/through walls:
  - Cap knockback to stop at ≥ 1 px from wall surfaces.
  - Default knockback for light attacks: 6–10 px; for heavies: 12–18 px (if added later).
- RangePx measured from front face; keep range tight in lanes (≤ 24 px for light enemy hits).


## 15) Sandbox & Tests
Quickplay scenarios
- Goblin Grunt duel (flat lane)
  - Trials: 10
  - Metrics: average TTK, stamina utilization (% time regenerating), poise breaks per minute, block success rate, dodge success rate
  - Expected ranges:
    - Avg TTK: 28–34 s
    - Stamina regen time fraction: 45–60%
    - Poise breaks: 1–2 per fight (player on goblin), 0–1 against player
- Cave Burrower (emerge/pounce) — pending asset
  - Validate emerge telegraph ≥ 380 ms, pounce i‑frame fair window (≥ 140 ms overlap)
  - Edge case: blockable body‑bump on failed pounce should apply block chip and stamina drain per Block mitigation

Acceptance checks
- TelegraphStart, AttackActive, and Hit events fire in correct order with correct payloads
- Perfect block window measured from block‑raise completion (120 ms raise + 120 ms perfect)
- Dodge i‑frames align with DodgeStart event
- Single Hit per victim per Active window
- Hit‑stop local to participants only
- Lane compliance: no hitbox lateral span > 24 px without slow telegraph


## 16) Data Authoring Guidelines (Enemies/Attacks)
Checklist for enemy JSONs
- Field order (recommended for readability): id, name, kind, windupMs, activeMs, recoveryMs, cooldownMs, rangePx, arcDeg, hitbox, damage, hitStopMs, knockback, telegraph, notes
- Tokens:
  - telegraph.visual.colorToken must exist in data/visual/color-palette.json
  - sfx ids must exist in data/audio/sound-manifest.json
- Body collider: 12×12 px (do not override in MVP)
- Hitboxes: forward‑biased (offsetX > 0), sized to stay within lane law
- arcDeg < 120 for lane melee; exceptions require slow telegraph budget
- rangePx ≤ 24 for light enemy strikes
- hitStopMs: use attacker:22, victim:42 for light attacks unless specified
- Notes: include intent (e.g., “fast jab to punish greed”)


## 17) Open Questions & Iteration Notes
Dials to revisit post‑playtest
- Block chip % (normal and perfect)
- Perfect block window (120 ms) leniency
- Dodge i‑frame length (currently 160 ms)
- Poise recoverPerSec (currently 35) and breakDurationMs (800)

Integration risks
- Event ordering under lag or variable frame times; add unit tests for TelegraphStart timing and PoiseBreak emission relative to Hit.
- Stamina overflow handling on block must remain deterministic across rounding and different baseEffective values.

Planned adds (post‑Sprint 1)
- Enemy: Cave Burrower final timings and emerge dust VFX hooks
- Player heavy attack finalization
- Additional audio layers for heavy hits and perfect blocks


## 18) Acceptance Checklist (for this doc)
- Stamina costs, regen, and delays specified
- Poise thresholds, recovery, and break durations specified
- Telegraph timings, states, and visual/audio tokens specified
- Hit‑stop values and local timescale behavior specified
- Damage and block mitigation formulas are concrete and testable
- Events with exact payload structures and emission order defined
- Enemy AttackDef schema mapped to JSON with exemplars
- Lane law and hitbox rules formalized
- Tuning targets (~30 s TTK) with back‑of‑pickaxe math included
- Safe ranges for timings and poise/block/dodge provided
- Sandbox tests and acceptance checks defined

By my beard, that’s the lot. Implement true to the numbers, and the mines will sing of fair fights and earned victories.