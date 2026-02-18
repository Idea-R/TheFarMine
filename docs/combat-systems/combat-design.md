# Combat Design — Steel, Steam, and Teachable Blows (Sprint 1)

Provenance
- Owner: @gamma (Combat Systems — Battlehammer Ironshield)
- This document is implementation-ready for Sprint 1 MVP. Times are in ms; target frame rate 60 fps.
- Cross-references:
  - src/core/ecs-registry.js (Health/Stamina/Poise clamps and post-patch guarantees)
  - data/core/component-schemas.json
  - docs/visual-systems/style-guide.md (§Telegraphs)
  - data/visual/color-palette.json (telegraph token)
  - docs/audio-systems/audio-design.md (§Event Bridge)
  - data/audio/sound-manifest.json
  - data/combat/enemy-goblin-grunt.json
  - data/combat/enemy-cave-burrower.json

---

## 2) Design Pillars

- Balance creed
  - Every weapon must feel earned.
  - Every enemy teaches a specific timing/read through clear telegraphs and fair punish windows.
- Three‑Wide Law
  - Bodies standardized at 12×12 px.
  - Attack arcs ≤110° (no barn-door nonsense in tight halls).
  - Doors, corridors, and combat lanes target 3 tiles wide (keep pathing and swing arcs honest).
- Telegraph-first combat
  - Readable windups with consistent event timing and overlay cues.
  - Fair i-frames on dodges; clear block raise time.
  - Distinct parry vs block windows in the future. MVP includes block and dodge only. Parry is stubbed in notes for later.

---

## 3) Core Stats & Components (ECS contract)

- Components
  - Health: { current:int, max:int }. Clamp rules:
    - On any write: current = clamp(current, 0, max).
    - On max change: current = min(current, max).
    - Hitting 0 does not delete the entity; emits death/KO elsewhere when needed (out of scope MVP).
  - Stamina: { current:int, max:int, regenPerSec:int, regenDelayAfterActionMs:int, lastSpendAtMs:int }. Clamp rules:
    - current = clamp(current, 0, max).
    - If current < cost, action is denied (no negative stamina).
  - Poise: { current:int, max:int, recoverPerSec:int, breakDurationMs:int, state:"Normal|Broken", lastHitAtMs:int, breakEndsAtMs:int }. Clamp rules:
    - current = clamp(current, 0, max).
    - On reaching 0: state = Broken; timer starts.
    - On break end: current snaps to floor (see §5).
- Baseline Player Attributes (ENTITY_TYPES.Player)
  - attributes: { attackPower: 8, defense: 0 }
  - Health.max, Stamina.max, Poise.max set by spawn template; see §4 and §5 defaults for Stamina/Poise.
- Enemy archetype expectations
  - Body 12×12 px.
  - Collider defaults: axis-aligned box, 12×12, origin center; no rotation scaling hitbox.
  - Renderable: depth ≈300 to layer correctly under UI telegraphs and above tiles.

---

## 4) Stamina System (Numbers locked for MVP)

- Pools (defaults)
  - Stamina.max = 100
  - Stamina.regenPerSec = 14
  - Stamina.regenDelayAfterActionMs = 600
- Costs (player)
  - Light Attack: 14
  - Dodge/Roll: 24 (grants i-frames; see §6)
  - Block: 6 to raise; plus 8 applied on each successful block (on impact). If 8 cannot be paid at impact, see §7 Guard Break.
  - Sprint: N/A in MVP (reserved)
- Regen rules
  - Any stamina spend pauses regen for 600 ms.
  - After the delay, stamina regenerates linearly at 14/s until capped at max.
  - Floor at 0; actions that cannot pay full cost are denied (no partials; no negatives).
  - Block raise denial: if current < 6, block cannot be raised.

Implementation notes
- tick(dt): if now - lastSpendAtMs ≥ 600, add regenPerSec * dt; clamp.
- All stamina writes go through patchComponent; registry clamps post-patch (see §19).

---

## 5) Poise System (Break and Recovery)

- Pools (defaults)
  - Poise.max = 100
  - Poise.recoverPerSec = 35 (only while not Broken and not hit in last 480 ms)
  - Poise.breakDurationMs = 800
- Break
  - When Poise.current reaches 0: enter Broken for 800 ms.
  - Effects while Broken:
    - Cannot act (no move, no dodge, no block, no attack).
    - Takes +20% Health damage (see §8, PoiseBreak bonus).
    - Special SFX/VFX (see §9 and §10).
- Recovery
  - If not Broken: recovery resumes 300 ms after last received hit (lastHitAtMs).
  - While Broken: no recovery. At break end:
    - state = Normal
    - Poise.current snaps to floor: 25% of max (i.e., 25 if max=100).
    - Normal recovery resumes (respecting the 300 ms hit grace and 480 ms anti-cheese window).
- Anti-spam windows (MVP-simple)
  - “not hit in last 480 ms” gate supersedes the 300 ms resume if still within 480 ms.

---

## 6) Dodge/Movement Windows

- Total dodge duration: 360 ms (6 frames at 60 fps; style-guide aligned).
- I-frames: 140 ms, centered early-middle:
  - Default MVP window: t = [80 ms, 220 ms] from dodge start.
  - Represented as a constant window now; future per-animation mapping supported by a tunables array.
- Cancel/buffer rules
  - Cannot cancel into attack during active i-frames.
  - Can buffer an attack within the last 120 ms of the dodge; it fires when dodge ends.
  - Movement continues during non-i-frame segments as dictated by animation root motion (MVP: fixed displacement blend).

---

## 7) Block Rules

- Raise time
  - Block becomes active 120 ms after input (raise animation gate).
- Stamina on block
  - 6 stamina on raise (pay-to-prepare).
  - 8 additional stamina only if a hit is successfully blocked (applied on impact).
  - If insufficient stamina to pay the 8 on impact:
    - Guard breaks: the hit counts as fully unblocked.
    - Apply an extra +12 Poise damage on top of the attack’s normal Poise damage.
- Damage reduction while blocking
  - Health: 70% reduced (i.e., 30% goes through; see §8).
  - Poise: 40% reduced (i.e., 60% goes through; see §8).
- Chip damage floor
  - If the original unblocked Health damage (Mitigated in §8) would have been ≥5, then blocked Health damage is at least 1.
- Notes
  - No additional “stamina damage” scaling from attack properties in MVP; stamina drain is only the fixed 8 on successful block.
  - Broken entities cannot block.

---

## 8) Damage & Mitigation Formulae (MVP-simple)

- Definitions (integers unless stated)
  - RawDamage = attacker.attributes.attackPower + attack.damage.base
  - Mitigated = max(1, RawDamage - defender.attributes.defense)
- On Block (block is active and stamina costs are successfully paid)
  - HealthDamage = max(chipFloor, ceil(Mitigated * 0.30))
    - chipFloor = 1 if Mitigated ≥ 5, else 0
  - PoiseDamage = ceil(attack.damage.poiseDamage * 0.60)
- On Hit (no block or guard break)
  - HealthDamage = Mitigated
  - PoiseDamage = attack.damage.poiseDamage
- PoiseBreak bonus
  - While target is Broken, incoming HealthDamage × 1.20 (round: ceil at final stage).
  - Order of operations: determine HealthDamage as above (block or hit), then if target is Broken, HealthDamage = ceil(HealthDamage * 1.20).
  - In practice, Broken targets cannot block; rule included for completeness/future exceptions.
- Application order
  1) Compute RawDamage and Mitigated.
  2) Resolve block state and stamina payments.
  3) Compute HealthDamage and PoiseDamage per above.
  4) Apply PoiseBreak bonus if target Broken.
  5) Apply damage; clamp Health/Poise via registry.

---

## 9) Hit-Stop & Feedback

- Hit-Stop windows (ms)
  - Attacker: 18–24 based on attack heft; MVP default 22 if unspecified in attack def.
  - Victim: 36–48; MVP default 42 if unspecified in attack def.
- Audio
  - Do not time-scale or pitch-scale audio with hit-stop (see audio doc).
  - Use Event Bridge keys mapped from attack ids and event types (see §10).
- Visual
  - Apply effects.hitFlash overlay to both attacker and victim on Hit.
  - Apply effects.poiseBreakFlash on PoiseBreak events.
  - Telegraph overlays are managed separately (see §15).

---

## 10) Events & Contracts (authoritative payloads)

- Event payloads (all ints are 32-bit)
  - combat.TelegraphStart
    - { attackerId:int, attackId:string, windupMs:int }
  - combat.AttackActivate
    - { attackerId:int, attackId:string, activeMs:int, hitbox:{w:int,h:int,offsetX:int,offsetY:int}, arcDeg:int, rangePx:int }
  - combat.Hit
    - { attackerId:int, victimId:int, attackId:string, blocked:bool, damage:{ health:int, poise:int }, poiseBreak:bool }
  - combat.PoiseBreak
    - { entityId:int, breakDurationMs:int }
  - combat.AttackEnd
    - { attackerId:int, attackId:string }
- Emission sites and order
  - TelegraphStart (at windup start)
  - AttackActivate (at start of active frames)
  - Hit (0..n, per contact; multi-target allowed in arc)
  - AttackEnd (at recovery start)
  - PoiseBreak may fire during Hit processing if the victim’s Poise reaches 0.
- Audio bridge
  - Event Bridge keys must map to ids in data/audio/sound-manifest.json.
  - Example keying convention (MVP suggestion): "sfx.combat.{attackId}.{eventType}"

---

## 11) Timings & Frame Mapping

- Frame target
  - 60 fps; 1 frame ≈ 16.67 ms
- Telegraph flash windows
  - Safe window: flashAtMs ∈ [-180 .. -80] relative to active start.
- Archetype timing ranges
  - Jab/Stab windup: 240–300 ms
  - Slash/Sweep windup: 380–520 ms
  - Heavy windup: 520–700 ms (not used in MVP)
  - Active windows: 70–110 ms typical
  - Recovery windows: 400–560 ms typical
- All timing gates must be consistent with style-guide rhythm and readable in 3-wide lanes.

---

## 12) Attack Definition Schema (Enemy/Player parity)

- Authoritative shape for data/combat/enemy-*.json (and player attacks), in this key order:
  - {
    id,
    name,
    kind:"melee",
    windupMs,
    activeMs,
    recoveryMs,
    cooldownMs,
    rangePx,
    arcDeg,
    hitbox:{ w, h, offsetX, offsetY },
    damage:{ base, poiseDamage },
    hitStopMs:{ attacker, victim },
    knockback:{ px, direction:"forward" },
    telegraph:{ colorToken:"mapping.telegraph.arc.amber", arcOverlay:true, flashAtMs },
    notes:[]
    }
- Constraints and validation
  - Bodies are 12×12; default melee rangePx must be within 18–26 for parity and readability.
  - arcDeg ≤110 (Three-Wide Law).
  - Hitboxes must be forward-biased (positive offsetX) to avoid wall self-clips:
    - Recommended: offsetX ≥ half body width (≥6 px) for 12×12.
  - activeMs between 70–110 unless documented exception in notes.
  - windupMs must sit in the correct archetype band (see §11) unless notes justify variance.
  - telegraph.colorToken must resolve in data/visual/color-palette.json.

---

## 13) Player Basic Attack (MVP)

- One default melee light attack (id: "light_1")
  - windupMs: 300
  - activeMs: 80
  - recoveryMs: 420
  - cooldownMs: 320
  - rangePx: 20
  - arcDeg: 80
  - hitbox: { w:12, h:12, offsetX:10, offsetY:0 }
  - damage: { base:6, poiseDamage:14 }
  - hitStopMs: { attacker:22, victim:42 }
  - staminaCost: 14 (see §4)
  - telegraph: { colorToken:"mapping.telegraph.arc.amber", arcOverlay:true, flashAtMs:-110 }
- Notes
  - Single-press, no combo chaining in MVP.
  - Uses standard Dodge/Block timing interactions (see §6–§7).

---

## 14) Enemy Catalog Expectations (MVP)

- Goblin Grunt (data/combat/enemy-goblin-grunt.json)
  - Stat block (targets)
    - Health ≈ 64
    - Poise ≈ 70
    - attributes.attackPower ≈ 6
    - Body 12×12
    - Move speed ≈ 48 px/s
    - Turn rate 360–540 deg/s
  - Attacks (two)
    - slash_sweep
      - Longer windup (≈ 420–500 ms), wider arc (≤ 100–110°), range 20–22 px.
      - Damage tuned to pressure block stamina; poiseDamage slightly higher than jab.
    - stab_jab
      - Shorter windup (≈ 260–300 ms), narrow arc (≤ 70–85°), range 20–22 px.
      - Damage modest; poiseDamage moderate; teaches quick-read punish.
    - Both within §11 timing bands; both emit telegraphs per §10 and §15.
  - AI parameters (targets)
    - aggroRange ≈ 120 px
    - leash ≈ 240 px
    - attackCooldown ≈ 900–1100 ms
    - preferOpenLane: true (respects 3-wide pathing)
    - feintChance ≈ 0.06 (future dial; for MVP may be stubbed)
    - keepDistance ≈ 6 px (repositions to maintain viable range)
    - attackWeights favor slash_sweep slightly (e.g., 0.55 sweep / 0.45 jab)
  - Balance
    - Tuned for ~30 s duel TTK vs Player AP 8 with hitRate ≈ 0.6 and fair reads.
- Cave Burrower
  - Must align exactly with existing data/combat/enemy-cave-burrower.json.
  - No changes in MVP; use it as source of truth for timings, damage, and telegraph notes.
  - Ensure arcDeg ≤110 and body 12×12 consistency (already delivered; cross-check during integration).

---

## 15) Telegraph Visuals & Tokens

- Visual
  - Telegraph overlay uses color token: mapping.telegraph.arc.amber (from data/visual/color-palette.json).
  - Arc line width 2 px; halo 1 px per style-guide.
  - Enabled on TelegraphStart; optional flash at telegraph.flashAtMs; clears on AttackEnd (recovery start).
- Audio
  - useGlobalAudio: true recommended at TelegraphStart for sfx.combat.telegraph.swing (ensure manifest id resolves).
- Behavior
  - The telegraph arc should respect arcDeg, rangePx, and hitbox forward bias for true representation.
  - Do not persist overlays during hit-stop; overlays are UI-timed, not time-scaled.

---

## 16) Loot & Rewards (combat tie-in only)

- Per-enemy loot tables are defined in their JSON blocks.
- MVP scarcity rule
  - nothingWeight must exceed the sum of average individual drop weights to bias toward “no drop.”
- Goblin Grunt drops
  - Lean toward copper/iron scraps; small chance of minor consumables (if present).
- Cave Burrower drops
  - Include a small quartz chance; otherwise light material yield.
- Out of scope
  - Gold economy and crafting balance are beyond this document; we only enforce post-combat hooks.

---

## 17) Sandbox Tuning Targets & Acceptance

- Targets
  - Solo TTK: ~30 s for an average player against a single MVP enemy in a clean 3-wide lane.
  - Stamina pacing: allows either 3–4 light attacks or 1 dodge + 2 attacks before pausing for regen.
  - Recovery windows leave space to read telegraphs and choose block vs dodge.
- Acceptance checklist
  - Numbers match this spec (Stamina/Poise timings, costs, and reductions).
  - JSON fields adhere to the schema in §12.
  - Telegraph color tokens and audio ids resolve from their manifests.
  - Combat events fire in the correct order; PoiseBreak events on 0 Poise.
  - ECS clamps (Health/Stamina/Poise) verified post-patch in src/core/ecs-registry.js.

---

## 18) Example Event Payloads (for engineers/tests)

- TelegraphStart (Goblin slash_sweep)
  - { "attackerId": 102, "attackId": "slash_sweep", "windupMs": 420 }
- Hit (unblocked)
  - { "attackerId": 102, "victimId": 1, "attackId": "slash_sweep", "blocked": false, "damage": { "health": 9, "poise": 16 }, "poiseBreak": false }
- PoiseBreak
  - { "entityId": 1, "breakDurationMs": 800 }

Notes
- Blocked hit example (if blocked and costs paid) would set "blocked": true and use reduced damage per §8.
- Guard break due to insufficient stamina on block registers as "blocked": false and adds +12 Poise in the computed damage step.

---

## 19) Systems Order & Integration Notes

- Systems order (per tick)
  1) AI System (intent selection, assigns current attack or movement)
  2) CombatSystem
     - Emits TelegraphStart at windup start
     - Emits AttackActivate at active start
     - Processes contacts; emits Hit for each
     - Emits PoiseBreak when Poise reaches 0
     - Emits AttackEnd at recovery start
  3) AudioEventBridge (maps events to manifest ids; plays without time scaling)
  4) RenderSyncSystem (applies telegraphs and flash overlays)
- Clamp guarantees
  - src/core/ecs-registry.js enforces Health/Stamina/Poise clamps after any patch.
  - CombatSystem must use patchComponent for writes to Health, Stamina, Poise; do not mutate raw component memory.
- Networking/Determinism (MVP local)
  - Event order and payloads above are authoritative for local simulation and replay logs.

---

## 20) Open Dials & Future Work

- Dials (safe ranges for iteration)
  - feintChance per enemy: 0.00–0.12
  - approach/keepDistance per enemy: 4–12 px
  - staminaCost per weapon family:
    - Light: 12–16
    - Medium: 18–26 (future)
    - Heavy: 28–36 (future)
  - dodge i-frame window: 120–160 ms (keep total dodge at 340–380 ms)
  - poise recoverPerSec: 30–45
  - poise breakDurationMs: 700–900
- Parry (not MVP)
  - Future: 2-stage window (early “perfect” 60–80 ms → full negate, late “soft” 80–120 ms → reduced damage).
  - Requires new events (combat.Parry, combat.ParryPerfect), additional SFX, and stamina/poise interactions.
- Heavy attacks and weapon families
  - Add new kind:"melee" subtypes with different knockback and hit-stop ranges.
- Multi-hit arcs and cleave tuning
  - Consider per-target diminishing hit-stop for readability in crowds (post-MVP).

---

## Appendix A — ECS Contract Summary (quick reference)

- Health
  - Write path: patchComponent(entityId, "Health", { current: newValue })
  - Clamp: 0 ≤ current ≤ max
- Stamina
  - Spend(actionCost): if current ≥ cost → current -= cost; lastSpendAtMs = now; else deny
  - Regen: if now - lastSpendAtMs ≥ 600 ms → current += 14 * dtSec
- Poise
  - OnHit: current -= poiseDamage; lastHitAtMs = now; if current ≤ 0 → state=Broken; breakEndsAtMs=now+800
  - Tick: if state=Broken and now ≥ breakEndsAtMs → state=Normal; current = round(max*0.25)
  - Recover: if state=Normal and now - lastHitAtMs ≥ 300 ms and now - lastHitAtMs ≥ 480 ms gate → current += 35 * dtSec

---

## Appendix B — Implementation Rulings (edge cases)

- Simultaneous hits
  - Process in attacker id ascending order for determinism; apply clamps between each Hit.
- Overkill damage
  - No spillover mechanics; just clamp Health to 0.
- Multiple blocks in same frame
  - Apply 8 stamina per successfully blocked hit; if stamina runs out mid-frame, subsequent hits count as unblocked with +12 Poise each.
- Knockback
  - Direction "forward" is attacker’s facing; apply after hit-stop resolves; magnitude in pixels (no physics sim in MVP).
- Hitbox vs arc
  - An entity is valid if within both the arcDeg sector and the hitbox sweep at activation. Favor arc sector for target gating; hitbox is for collision overlap.
- Telegraphs on cooldowned attacks
  - TelegraphStart only fires when the attack is actually committed after cooldown.

---

## Appendix C — Data Authoring Cheatsheet

- AttackDef example (Goblin slash_sweep; illustrative)
  - {
    "id": "slash_sweep",
    "name": "Wide Slash",
    "kind": "melee",
    "windupMs": 440,
    "activeMs": 90,
    "recoveryMs": 500,
    "cooldownMs": 980,
    "rangePx": 21,
    "arcDeg": 100,
    "hitbox": { "w": 12, "h": 12, "offsetX": 10, "offsetY": 0 },
    "damage": { "base": 5, "poiseDamage": 16 },
    "hitStopMs": { "attacker": 22, "victim": 42 },
    "knockback": { "px": 14, "direction": "forward" },
    "telegraph": { "colorToken": "mapping.telegraph.arc.amber", "arcOverlay": true, "flashAtMs": -120 },
    "notes": [ "Sweep teaches wider read; sits at upper arc bound." ]
    }
- Player light_1 mirrors the schema with staminaCost handled in the action definition (engine-side).

Steel speaks truth: teach through timing, punish through clarity, and let no swing be unearned.