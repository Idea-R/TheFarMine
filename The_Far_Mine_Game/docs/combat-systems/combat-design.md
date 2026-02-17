# Combat System — Stamina, Poise, and the Three‑Wide Law (Sprint 1)

Provenance: owner @gamma (Combat Systems — Battlehammer Ironshield). Cross-refs: docs/core-systems/ecs-architecture.md (§System Order, Components), src/core/ecs-registry.js (Archetypes), data/combat/enemy-goblin-grunt.json, data/combat/enemy-cave-burrower.json, data/visual/color-palette.json (telegraph tokens), docs/world-generation/cave-gen-algorithm.md (§Lanes & 3‑wide law).

I forged this spec for implementation. Numbers are binding for Sprint 1. Where the three‑wide law bites, I call it out — better a constrained swing than a sloppy death.


## 1) Title & Provenance
(See header.)


## 2) Design Goals (MVP) & Non‑Goals

- Goals:
  - Telegraph-first melee with fair reaction windows in 3‑wide lanes.
  - Stamina-gated actions (attack, dodge, block) with readable costs and regen rhythm.
  - Poise as stance meter: breaks create punish windows; never pure DPS race.
  - 30-second target TTK vs Expected Player (AP 8, DEF 0, hitRate 0.6) for baseline foes.
  - Hit-stop and knockback tuned for crunchy feedback without input lag.

- Non-goals:
  - Combo trees, weapon stances, perfect parry counterattacks (post-MVP).
  - Ranged/melee hybrid kits (MVP is melee-only for player and enemies).


## 3) Core Components & Data Contracts (ECS Integration)

- Required component fields read/written by CombatSystem (align with ecs-architecture.md and ecs-registry.js):
  - Attributes:
    - attackPower: number
    - defense: number
  - Health:
    - max: number
    - value: number
  - Stamina:
    - max: number
    - value: number
    - regenPerSec: number
    - regenDelayAfterActionMs: number
    - regenSuppressUntilTimeMs: number (runtime; set by system)
  - Poise:
    - max: number
    - value: number
    - recoverPerSec: number
    - breakDurationMs: number
    - brokenUntilTimeMs: number (runtime; 0 if not broken)
    - lastPoiseDamageTimeMs: number (runtime)
  - Position:
    - x: number
    - y: number
    - facingX: -1|0|1
    - facingY: -1|0|1
  - Collider:
    - w: number
    - h: number
    - offsetX: number
    - offsetY: number
    - solid: boolean
  - AI (for enemies):
    - attackCooldownMs: number
    - lastAttackTimeMs: number (runtime)
    - preferOpenLane: boolean
    - attackIntent: enum|string (authoritative keys per enemy.attacks[n].id)
    - speedPxPerSec: number
    - chaseSpeedPxPerSec: number
    - aggroRadiusPx: number
    - repositionOnMissMs: number
    - attackWeights: object (attackId → weight)
  - CombatRuntime (created by CombatSystem if absent):
    - currentAttackId: string|null
    - phase: 'idle'|'windup'|'active'|'recovery'
    - phaseEndsAtMs: number
    - hitbox: { w:number, h:number, offsetX:number, offsetY:number, arcDeg?:number }|null
    - iFrameUntilMs: number (dodge)
    - blockActiveAtMs: number
    - blockHeld: boolean
    - guardBrokenUntilMs: number
  - Renderable (token-only; visuals resolve via palette):
    - tintToken: string (e.g., tokens from data/visual/color-palette.json)
  - Tags/Archetypes (ecs-registry.js):
    - Player, Enemy (and specific prefab archetypes: EnemyGoblinGrunt, EnemyCaveBurrower)
  - Effects (for telegraphs; consumed by EffectsSystem):
    - telegraph: { colorToken:string, startMs:number, endMs:number, kind:'arc'|'halo', params:any }

- System order:
  - Per docs/core-systems/ecs-architecture.md: PhysicsSystem → CombatSystem → EffectsSystem → AudioSystem → RenderSystem. Combat runs after position/collision resolution and before visuals/audio.

- Token-only visuals:
  - All colors referenced by token. Renderable.tintToken and telegraph tokens must resolve via data/visual/color-palette.json. No raw hex embedded in data or code.


## 4) Player Baseline & Encounter Targeting

- Expected Player (Sprint 1):
  - Attributes: AP 8, DEF 0
  - Stamina: { max 100, regenPerSec 14, regenDelayAfterActionMs 600 }
  - Poise: { max 100, recoverPerSec 35, breakDurationMs 800 }
  - Health: 100

- Target TTK: 30 s vs single baseline enemy with 60% hit rate, modest stamina discipline, basic block/dodge. Balance in §13 confirms.


## 5) Stamina System — Costs, Regen, Delays

- Pool & regen:
  - Stamina.value ∈ [0, Stamina.max].
  - On any stamina-consuming action, set Stamina.regenSuppressUntilTimeMs = now + Stamina.regenDelayAfterActionMs.
  - If now ≥ regenSuppressUntilTimeMs and not blocking: value += regenPerSec * dt; clamp to max.
  - Regen while blocking: 25% of base (after delay). While attacking (windup/active/recovery) or during dodge: 0% until attack recovery ends / dodge completes.

- Action costs (MVP defaults):
  - Light Attack (single swing): 14 stamina on press at windup start. If insufficient, action does not start.
  - Dodge (i-frame roll/step): 22 stamina at dodge start; i-frames 180 ms; travel 48 px over 220 ms along input vector; blocked if insufficient stamina.
  - Block (raise guard): 8 stamina at guard raise; if insufficient, guard will not raise. While blocking, chip on impact equals incoming poiseDamage × 0.45 deducted from stamina.
  - Sprint: disabled in MVP (no cost, not bindable).

- Out-of-stamina rules:
  - If value < required cost, action fails (no partial). For dodge refusal: play subtle click SFX via AudioSystem token sfx.ui.denied (stubbed id acceptable).
  - Stamina clamps at floor 0.

- Timing:
  - Block startup (see §11) consumes 8 at t0; sets blockActiveAtMs = now + 120 ms.

Callout — Three‑Wide: Dodge distance 48 px equals the corridor width. This is intentional: a clean lane-length reposition without clipping notches.


## 6) Poise — Stance, Break, Recovery

- Poise:
  - value ∈ [0, max].
  - Each hit applies poiseDamage from the attack.
  - Poise recovers at recoverPerSec when no poise damage has been taken for 400 ms (Poise.lastPoiseDamageTimeMs gate).

- Break threshold:
  - When value ≤ 0, entity becomes Poise Broken:
    - Set Poise.brokenUntilTimeMs = now + Poise.breakDurationMs (default 800 ms).
    - Effects: stagger animation, unable to attack or block; takes 1.1× damage (MVP punish multiplier); telegraph generation is suppressed/canceled.

- Player-specific guard break:
  - If blocking and stamina reaches 0 from stamina chip during an impact, immediate Guard Break:
    - Treat as Poise Break with duration 600 ms for player (override breakDurationMs).
    - Apply stagger; drop guard; set CombatRuntime.blockHeld = false.

- Blocked poise:
  - If a hit lands on an active block and stamina > 0:
    - Apply reduced poise damage = floor(listed poiseDamage × 0.35) to Poise.
    - Apply stamina chip = floor(listed poiseDamage × 0.45) to Stamina (see §5).
  - If stamina depletes to 0 from chip, trigger Guard Break as above.

- Enemy parity:
  - Enemies follow the same poise rules as player.
  - Authored examples: Goblin Poise.max 70, Burrower Poise.max 80.


## 7) Damage, Mitigation, and Formulas

- Base damage calc (melee):
  - raw = attack.damage.base + floor(Attributes.attackPower × 0.25)
  - mitigated = max(1, raw − target.Attributes.defense)
  - If target is Poise Broken (now < Poise.brokenUntilTimeMs): mitigated = floor(mitigated × 1.1)

- Block:
  - On successful Block (blockActive and not Guard Broken):
    - Health chip = floor(mitigated × 0.25); apply to Health.value.
    - Remaining 75% negated.
    - Stamina chip handled per §5; Poise damage reduction per §6.

- Dodge:
  - If overlap occurs while target has i-frames active (now < CombatRuntime.iFrameUntilMs), the attack misses entirely (no damage, no poise, no stamina chip).

- Knockback:
  - Apply attacker-defined knockback pixels along attacker forward vector (Position.facingX/Y).
  - Clamp displacement so target does not clip walls; stop at solid colliders.
  - Preserve three‑wide fairness: never push targets past lane boundaries; if pushing against a lane edge, convert excess to small hit-stop extension (+6 ms victim) instead of penetration.


## 8) Telegraphs — Readability Windows and Visuals

- Visual tokens:
  - Use mapping.telegraph.emerge.amber for all MVP arcs/halos.
  - EffectsSystem resolves tokens via data/visual/color-palette.json.

- Categories and windows (per attack definition; pick one):
  - Light Arc (slashes):
    - windup 380–460 ms; active 80–100 ms; recovery 420–520 ms.
  - Quick Jab (pokes):
    - windup 240–300 ms; active 70–90 ms; recovery 380–460 ms.
  - Ground Halo (emerge burst):
    - windup 520–700 ms; active 100–120 ms; recovery ~520 ms.

- Audio:
  - sfx.combat.telegraph.swing fires at windup start for arcs and halo in MVP.

- Rules:
  - Telegraph always begins before hitbox activation.
  - Halo centers on target emergence Position (for Burrower).
  - Arcs align with swing direction (Position.facing).

- Implementation:
  - On windup start, CombatSystem emits combat.telegraph.start with { entityId, attackId, colorToken, kind } for EffectsSystem to render a token-colored overlay.


## 9) Hit-Stop & Impact Feedback

- Asymmetric hit-stop applied on hit:
  - Light hit (jab): attacker 22 ms, victim 42 ms.
  - Sweep (slash): attacker 24 ms, victim 44 ms.
  - Emerge burst: attacker 24 ms, victim 46 ms.

- Behavior:
  - Pause movement integration and animation timers for affected entities only.
  - Do not stall global dt; do not pause AI of other entities.
  - Buffer follow-through impulses and knockback; apply immediately when stop ends.
  - Use per-entity localTimeScale or explicit freeze timers in CombatRuntime.


## 10) Lanes, Hitboxes, and the Three‑Wide Law

- Geometry:
  - Corridors and doors are 3 tiles (48 px) wide.
  - Body colliders:
    - Enemy: 12×12 px
    - Player: 12×12 px
  - When centered, at least one body width of margin remains on each side.

- Attack hitboxes must not exceed lane width when centered with offsetX:
  - Goblin slash: 20×14; offsetX 8 (forward-biased within lane).
  - Goblin stab: 16×12; offsetX 12.
  - Burrower burst (surface emerge): ~20×16; offsetX ~8; arcDeg caps cone to prevent wall clipping.

- Overlap tests:
  - Use Collider + optional hurtboxPadPx expansion from enemy data for fairness (see §12).
  - Disallow single-tile notches in nav; AI.preferOpenLane = true to bias to centers.

Callout — Three‑Wide: Any authored hitbox wider than 48 px is illegal. Clamp or reject at content import with a console warning and analytics ping.


## 11) Action Windows & Invulnerability

- Dodge:
  - i-frames: 180 ms, starting 40 ms after input (animation lift), ending before recovery.
  - Travel: 48 px over 220 ms along input vector; frictionless; collision-respecting.

- Block:
  - Startup: 120 ms before full guard is active.
  - Hits during startup = half-block:
    - Health chip = 50% of mitigated.
    - Stamina chip = full (poiseDamage × 0.45).
    - Poise damage reduction does not apply (treat as hit to poise at 100%).

- Attack cancel rules:
  - No dodge-cancel during active frames.
  - Allow dodge during recovery with 1.2× stamina cost penalty (26 instead of 22) — MVP flag CombatConfig.dodgeDuringRecoveryEnabled default false.
  - When enabled later, apply additional 20 ms input buffer to avoid accidental eats.


## 12) Enemy Data Mapping (JSON → Runtime)

- For each enemy config (e.g., data/combat/enemy-goblin-grunt.json, enemy-cave-burrower.json):

  - stats:
    - health: number → Health.max/value
    - attackPower: number → Attributes.attackPower
    - defense: number → Attributes.defense
    - poise.max: number → Poise.max/value
    - poise.recoverPerSec: number → Poise.recoverPerSec
    - poise.breakDurationMs: number → Poise.breakDurationMs

  - movement:
    - speedPxPerSec: number → AI.speedPxPerSec
    - chaseSpeedPxPerSec: number → AI.chaseSpeedPxPerSec
    - aggroRadiusPx: number → AI.aggroRadiusPx

  - ai:
    - attackCooldownMs: number → AI.attackCooldownMs
    - attackWeights: object (id→weight) → AI.attackWeights
    - preferOpenLane: boolean → AI.preferOpenLane
    - repositionOnMissMs: number → AI.repositionOnMissMs

  - telegraphs:
    - colorToken: string → EffectsSystem telegraph visuals (token-only)
    - overlays: array (optional) → EffectsSystem layered telegraph params

  - attacks[n] (1:1 to CombatSystem attack defs):
    - id: string (unique per enemy) → used by AI.attackIntent and CombatRuntime.currentAttackId
    - category: 'lightArc'|'quickJab'|'groundHalo' → validation aid; does not drive logic
    - windupMs: number
    - activeMs: number
    - recoveryMs: number
    - cooldownMs: number
    - rangePx: number
    - arcDeg: number (0 for jab/line, >0 for cone)
    - hitbox: { w:number, h:number, offsetX:number, offsetY:number }
    - damage: { base:number, poiseDamage:number }
    - hitStopMs: { attacker:number, victim:number } (override defaults)
    - knockback: { px:number }
    - telegraph: { visual:'arc'|'halo', colorToken:string } (token-only)

  - collision:
    - body: { w:number, h:number, offsetX:number, offsetY:number } → Collider
    - hurtboxPadPx: number → applied in overlap tests to player/enemy fairness

  - loot:
    - drops: array → DropSystem (MVP stub; not used by CombatSystem)

  - tuning:
    - expectedPlayer: object, TTK: number → analytics only; ignored by runtime

- Import behavior:
  - Validate windows against §8 min/max; clamp or reject with warnings.
  - Enforce three‑wide hitbox legality; auto-clamp arcDeg if needed to prevent wall clipping.


## 13) Balance Targets & Worked Example (30s TTK)

- Example vs Goblin Grunt (120 HP):
  - Player AP 8 → +floor(8 × 0.25) = +2 from AP scaling.
  - Suppose goblin DEF 1 (baseline), player light hit base 8:
    - raw = 8 + 2 = 10; mitigated = max(1, 10 − 1) = 9 on flesh.
  - On successful blocks against the player:
    - Player chip received = floor(9 × 0.25) = 2 per blocked hit.
  - With 60% hit rate over 30 s, landing ~18 light hits:
    - 18 × 9 = 162 potential; subtract misc blocks/dodges and Poise interplay:
    - Typical one Poise Break (800 ms) yields 1–2 extra safe hits at 1.1×:
      - Two punish hits: floor(9 × 1.1) = 9 each (rounded down), but effectively reduces total required swings by ~2 due to uncontested windows.
    - Net: ~16 real swings to kill within ~30 s considering windups, whiffs, and stamina pauses.

- Burrower (130 HP; higher poise and emerge downtime):
  - Slightly slower neutral, but larger punish after missed emerge/poise break.
  - Effective TTK remains ~30 s for Expected Player (±15%).


## 14) Tuning Tables (MVP Defaults)

- Stamina:
  - max 100
  - regen 14/s
  - delay 600 ms
  - attack cost 14
  - dodge cost 22
  - block raise 8
  - block stamina chip = poiseDamage × 0.45
  - block health chip = 25% of mitigated

- Poise:
  - player max 100, recover 35/s
  - enemy per file (Goblin 70, Burrower 80)
  - break 800 ms
  - guard-break (player) 600 ms
  - recovery delay after last poise damage: 400 ms

- Dodge:
  - i-frames 180 ms (start +40 ms after input)
  - distance 48 px
  - duration 220 ms

- Hit-stop:
  - jab 22/42 (attacker/victim)
  - slash 24/44
  - burst 24/46

- Damage scaling:
  - +0.25×AP flat add before DEF
  - 1.1× during Poise Break (floored)

- Telegraph windows:
  - Light Arc: 380–460 / 80–100 / 420–520 (windup/active/recovery ms)
  - Quick Jab: 240–300 / 70–90 / 380–460
  - Ground Halo: 520–700 / 100–120 / ~520

- Colliders & hitboxes:
  - Player/Enemy body: 12×12 px
  - Lane width: 48 px (hard cap for centered hitboxes)


## 15) Events & Audio Hooks

- CombatSystem emits:
  - combat.telegraph.start: { entityId, attackId, colorToken, kind }
  - combat.attack.hit: { attackerId, victimId, attackId, damage, poiseDamage, isBlocked:boolean, isDodge:boolean }
  - combat.block: { blockerId, attackerId, attackId, staminaChip, healthChip, halfBlock:boolean }
  - combat.poise.break: { entityId, durationMs, cause:'damage'|'guardBreak' }

- AudioSystem mapping (by token/id from manifest):
  - sfx.combat.telegraph.swing on windup start (arcs/halo)
  - sfx.combat.impact.light, sfx.combat.impact.heavy chosen by attack category
  - sfx.combat.block on successful block/half-block
  - sfx.combat.guardbreak on guard break
  - sfx.ui.denied on action fail (insufficient stamina)


## 16) Acceptance & QA Checklist

- Data & tokens:
  - All numeric fields finite and within ranges (no NaN/Infinity).
  - All color tokens resolve in data/visual/color-palette.json.
  - Event names and sfx ids match manifest.

- ECS alignment:
  - Component fields exactly as listed in §3.
  - CombatSystem runs after Physics and before Effects (verify system order list).

- Three‑wide law:
  - Player/enemy colliders 12×12.
  - Attack hitboxes, when centered + offsetX, do not exceed 48 px width or clip walls.
  - Knockback does not pass targets through solids or lane bounds.

- Timing windows:
  - Telegraph minimums met:
    - Jabs windup ≥ 240 ms (total pre-hit ≥ 260 ms including 20 ms buffer for spawn jitter).
    - Slashes windup ≥ 380 ms (≥ 420 ms target readability).
    - Halo emerges windup ≥ 520 ms.
  - Dodge i-frames 180 ms begin at +40 ms from input; end before recovery.
  - Block startup 120 ms; half-block rules verified.

- Stamina & poise:
  - Regen pauses exactly regenDelayAfterActionMs after action; resumes at proper rates (25% while blocking, 0% during attacks/dodge).
  - Block stamina chip uses poiseDamage × 0.45; health chip is 25% mitigated.
  - Poise recovery starts only after 400 ms without poise damage.
  - Guard break triggers at stamina 0 during block and sets 600 ms break.

- Damage & feedback:
  - Damage formula raw/base/AP/DEF ordering holds; 1.1× during break applied then floored.
  - Hit-stop freezes only attacker/victim; global dt untouched.

- TTK sanity:
  - Against Goblin Grunt baseline (120 HP), Expected Player achieves 30 s ± 15%.
  - Against Burrower (130 HP), same band considering emerge downtime.

- Enemy JSONs:
  - data/combat/enemy-goblin-grunt.json and enemy-cave-burrower.json validate against §12 mapping and §8 windows.
  - preferOpenLane true where pathing through 3-wide corridors is expected.


## 17) Future Notes (Non-binding)

- Weapon mastery tiers and unlocked cancels.
- Perfect parry with counter windows and poise spike.
- Heavy attacks and charge variants.
- Stamina pressure variants by enemy family.
- Poise damage taxonomy (blunt vs pierce vs shock) affecting block chip differently.

Callout — Three‑Wide Endnote: Keep your swings honest and your bodies centered. Our caves are narrow; fairness flows from geometry before numbers.