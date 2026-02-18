# Crafting & Mining Tech — Brass, Steel, and Steam (Sprint 1)

Provenance
- Owner: @delta (Technology Systems — Gearwright Steamforge)
- Authoring voice: Gearwright Steamforge, Master of Cogs and Contracts
- Cross-references:
  • data/items/tools.json
  • data/crafting/recipes.json
  • data/world/biome-crystal-caverns.json (§tiles.hardness, ore)
  • docs/world-generation/cave-gen-algorithm.md (§Hardness & lanes)
  • docs/combat-systems/combat-design.md (§Stamina baseline)
  • data/audio/sound-manifest.json (ui.craft.*; mining SFX)
  • data/visual/color-palette.json (UI tokens)

---

## 2) Design Pillars & MVP Goals

- Meaningful 3-step tool arc: pick → better pick → steam drill.
- Fast reads and fair gates via hardness; no hidden math.
- Minimal UI friction; one-queue stations; clear feedback.
- Deterministic recipes; no probabilistic sinks.
- Token-only theming (no raw hex), audio also by tokens.
- MVP goal: Player cleanly upgrades T1→T3 within a single session (~20–40 min) with average ore luck; mining cadence is satisfying and tier feel is distinct.

Notes from the bench: We begin with a trusty pick, strengthen it with copper, and finally bolt on the boiler for the steam drill.

---

## 3) Resource Catalog (MVP)

Token-only resource ids (must match data/items/resources.json):

- ore.copper
  • Description: Rough copper ore chunks suitable for forging.
  • Source: Rock ore veins (tileType rock.ore with oreType=copper) in Crystal Caverns; primary acquisition via mining once eligible; curated early cache/loot may seed small amounts for bootstrap.
  • Storage: Stackable.
  • UI icon: TBD (token in resources.json).

- ore.iron
  • Description: Dense iron ore requiring stronger tools.
  • Source: Rock ore veins (tileType rock.ore with oreType=iron), deeper lanes; mining when eligible.
  • Storage: Stackable.
  • UI icon: TBD.

- shard.quartz
  • Description: Sharp, crystalline shard; useful as cutting/abrasive and for precision edges.
  • Source: Rare veins and decor crystals in biome-crystal-caverns; also in rare loot.
  • Storage: Stackable.
  • UI icon: TBD.

- core.steam
  • Description: Sealed micro-boiler core; safely powers small implements.
  • Source: Starter grant/NPC/loot in MVP (not craftable in Sprint 1).
  • Storage: Stackable.
  • UI icon: TBD.

---

## 4) Stations & Progression Tiers

- Stations
  • workbench (tier 1)
  • forge (tier 2)
  • steam_workshop (tier 3)

- Unlock flow (MVP)
  • workbench: available by default.
  • forge and steam_workshop: present as hub fixtures (static world objects). No construction cost in MVP; access is gated solely by recipe availability.

- Station behavior (MVP)
  • Queue size: 1 craft at a time.
  • Time-bound crafts; inputs reserved at start.
  • Cancel returns 100% of reserved inputs.
  • Keep station ids stable for future sprints (construction may be added later).

---

## 5) Tool Tiers & Stats (Authoritative mapping to data/items/tools.json)

Compact listing (text):

- id: tool.pick.t1.basic
  • name: Basic Pickaxe
  • kind: pick
  • tier: 1
  • stats: miningPower 3, miningSpeed 6, swingIntervalMs 520, staminaCost 12, durabilityMax 120, durabilityPerSwing 1

- id: tool.pick.t2.reinforced
  • name: Reinforced Pickaxe
  • kind: pick
  • tier: 2
  • stats: miningPower 5, miningSpeed 10, swingIntervalMs 480, staminaCost 12, durabilityMax 180, durabilityPerSwing 1

- id: tool.drill.t3.steam
  • name: Steam Drill
  • kind: drill
  • tier: 3
  • stats: miningPower 7, miningSpeed 22, swingIntervalMs 140, staminaCost 6, durabilityMax 220, durabilityPerSwing 1

- Allowed tiles (all three): ["rock","rock.ore"]
  • Floor is not mineable.

- Audio links
  • Picks: sfx.mining.pick.swing, sfx.mining.pick.hitRock, sfx.mining.pick.hitOre, sfx.mining.pick.break
  • Drill: no swing; uses sfx.mining.drill.spinUp, sfx.mining.drill.biteLoop, sfx.mining.drill.coolDown; impacts fall back to sfx.mining.pick.hitRock / sfx.mining.pick.hitOre for hit feedback

- UI tokens
  • Picks frame: ui.frame.brass
  • Drill accent: mapping.lighting.lampWarm (accent only, not raw color)

---

## 6) Hardness Gating Contract (Mining Eligibility)

- Tile.hardness references (MiningSystem input):
  • floor: 0–1 (not mineable in MVP)
  • rock: 3
  • rock.ore (copper): 4
  • rock.ore (iron): 5
  • rock.ore (quartz rare): 6–7 (per biome note; see worldgen)

- Gate rule
  • A swing (pick) or pulse (drill) applies progress only if tool.stats.miningPower ≥ Tile.hardness AND tileType is in tool.allowedTiles.

- Worldgen alignment
  • data/world/biome-crystal-caverns.json assigns hardness per tileType; cave-gen-algorithm.md (§Hardness & lanes) defines distribution and lanes. Quartz is exceptional: rare pockets at hardness 6–7 to ensure late-gate even with strong picks; presence/weight to be confirmed with world-gen. Reinforce spawn logic so copper appears in accessible lanes once T2 is attained.

---

## 7) Mining Cadence & Stamina/Durability Rules (Engine Contract)

Per swing (pick) or pulse (drill):
1) Eligibility: Verify tileType ∈ allowedTiles and tool.miningPower ≥ tile.hardness.
2) Resource check: Player Stamina.value ≥ staminaCost AND tool.durability > 0.
3) If eligible and resourced:
   • Spend staminaCost immediately; trigger Stamina.regenDelayAfterActionMs (from combat spec).
   • Apply progress += tool.miningSpeed to the tile’s break meter.
   • Decrement durability by durabilityPerSwing (only on valid progress application).
4) If ineligible (hardness/allowedTiles) or lacking stamina or tool broken:
   • Do not spend stamina or durability.
   • Emit mining.Deny (reason) and play thud/denied feedback (optional tooltip).
5) When progress ≥ breakThreshold (see §8):
   • Emit mining.Break, convert tile to floor, spawn drops per oreType, and play break SFX.

Cadence specifics:
- Pick cadence: discrete actions gated by swingIntervalMs; each press/swing attempts one application.
- Drill cadence: hold to apply pulses every swingIntervalMs; play sfx.mining.drill.spinUp at hold start, loop sfx.mining.drill.biteLoop while pulses are valid; on release or loss of eligibility play sfx.mining.drill.coolDown.
- Combat stamina baseline linkage: All mining actions respect Stamina.regenDelayAfterActionMs per docs/combat-systems/combat-design.md.

---

## 8) Tile Break Thresholds & Progress Units

Break model (simple and testable):
- breakThreshold = 20 at hardness 3, plus +5 per hardness over 3.
  • rock (3) → 20
  • copper (4) → 25
  • iron (5) → 30
  • quartz (6) → 35 (rare); quartz 7 would be 40

MiningSpeed units:
- miningSpeed values (6 / 10 / 22) are progress units per valid swing/pulse.

Example estimates (sanity checks):
- Rock (3): T1: ceil(20/6)=4 swings; T2: ceil(20/10)=2–3 (player timing/overkill); Drill: ceil(20/22)=1–2 pulses.
- Copper (4): T1: ceil(25/6)=5 (if eligible; it is not—see §6); T2: ceil(25/10)=3; Drill: ceil(25/22)=2.
- Iron (5): T2: ceil(30/10)=3; Drill: ceil(30/22)=2.
- Quartz (6): Drill only: ceil(35/22)=2.

Note: Values are tuning seeds; iterate against worldgen pacing to balance session length targets.

---

## 9) Crafting Recipes (Bind to data)

Authoritative MVP recipes (must match data/crafting/recipes.json). Inputs are reserved on start; cancel fully refunds; times as specified.

- id: recipe.tool.pick.t1.basic
  • station: workbench
  • timeMs: 6000
  • inputs: [ { itemId: "shard.quartz", qty: 1 } ]
  • output: { itemId: "tool.pick.t1.basic", qty: 1 }

- id: recipe.tool.pick.t2.reinforced
  • station: forge
  • timeMs: 9000
  • inputs: [ { itemId: "ore.copper", qty: 4 }, { itemId: "tool.pick.t1.basic", qty: 1 } ]
  • output: { itemId: "tool.pick.t2.reinforced", qty: 1 }

- id: recipe.tool.drill.t3.steam
  • station: steam_workshop
  • timeMs: 14000
  • inputs: [ { itemId: "ore.iron", qty: 6 }, { itemId: "shard.quartz", qty: 2 }, { itemId: "core.steam", qty: 1 }, { itemId: "tool.pick.t2.reinforced", qty: 1 } ]
  • output: { itemId: "tool.drill.t3.steam", qty: 1 }

Bootstrap note (MVP practicality): The player begins with tool.pick.t1.basic in loadout and may encounter a curated cache/NPC trade to seed early ore.copper; quartz and core.steam are obtainable via decor/loot and starter grant respectively. This avoids early deadlock while preserving vein-driven economy.

---

## 10) CraftingSystem Runtime Rules & Events (Authoritative Contracts)

State machine per craft:
- Idle → Reserving → InProgress (countdown) → Completed | Canceled

Inventory interaction:
- Reserving: decrement inputs from Inventory.slots (reserve bucket tied to station instance).
- InProgress: countdown continues even if player moves away; inputs remain reserved.
- Completed: add output to Inventory.slots; clear reserve.
- Canceled: refund all reserved inputs to Inventory.slots; clear reserve.

Events (emitter: CraftingSystem):
- crafting.Start: { stationId, recipeId, timeMs, entityId }
- crafting.Progress: { stationId, recipeId, elapsedMs, remainingMs, progress01 }
- crafting.Complete: { stationId, recipeId, output: { itemId, qty }, entityId, sfxId: "ui.craft.complete" }
- crafting.Canceled: { stationId, recipeId, refunded: [ { itemId, qty } ], entityId }

Audio/UI hooks:
- On Start: play ui.craft.start.
- On Complete: play ui.craft.complete.
- Tooltips use ui.text.* tokens; no raw colors.

---

## 11) MiningSystem Runtime Events (Authoritative Contracts)

- mining.Swing:
  • Payload: { entityId, toolId, tile: { x, y, layer }, eligible: boolean, staminaSpent: int, durabilityDelta: int, sfxId }
  • Notes: Fired for picks on each swing; for drills, fire per pulse with eligible set accordingly.

- mining.Progress:
  • Payload: { entityId, toolId, tile: { x, y, layer }, add: int, total: int, threshold: int }
  • Notes: Emitted only when progress is applied.

- mining.Break:
  • Payload: { entityId, toolId, tile: { x, y, layer }, oreType: string, drops: [ { itemId, qty } ], sfxId: "sfx.mining.break.stone" }
  • Notes: oreType is null/empty for plain rock.

- mining.Deny:
  • Payload: { entityId, toolId, tile: { x, y, layer }, reason: "hardness"|"notAllowed"|"noStamina"|"broken" }

Ordering guarantees:
- For a valid attempt: Swing → (Progress?) → (Break?)
- For ineligible or no-stamina/broken: emit Deny only (no Swing if the input isn’t accepted; for held-drill, Deny may appear in place of Swing on that pulse).

---

## 12) Drops & Yields (MVP Simplification)

- Plain rock (no oreType): no item drops in MVP; optional rubble visual only.
- rock.ore (copper): drop 1–2x ore.copper.
- rock.ore (iron): drop 1–2x ore.iron.
- rock.ore (quartz rare): drop 1x shard.quartz.
- Quantities align with data/items/resources.json yield weights; MVP may bias generous yields to enable tiering pace.

---

## 13) Durability & Repairs (MVP Policy)

- Durability decreases only on valid progress application (eligible target and stamina paid).
- At 0 durability: tool is “broken”
  • Cannot apply progress (MiningSystem emits mining.Deny with reason "broken").
  • Still selectable; UI shows red meter; allow player to view stats.
- Repairs: disabled in MVP. Future hook: add repair recipes and partial restores at workbench/forge.

---

## 14) UI/UX Notes & Accessibility

- HUD/Frames: use ui.gauge.* for meters, ui.text.* for copy; tool icon keys from tools.json (ui.iconKey). No raw color literals—resolve via data/visual/color-palette.json tokens.
- Feedback:
  • Insufficient stamina: ui.tooltip.warn + gentle HUD shake; enforce Stamina.regenDelayAfterActionMs.
  • Hardness gate: brief tooltip suggesting higher-tier tool (ui.text.tooltip.hardnessGate).
- Drill ergonomics: hold-to-operate; distinct visual states for spin-up, active bite, and cooldown; synchronize with sfx.mining.drill.* loop state.

---

## 15) Data Contracts & Schemas

- data/items/tools.json
  • version=1
  • ToolDef shape (authoritative fields used here): { id, name, kind, tier, stats: { miningPower, miningSpeed, swingIntervalMs, staminaCost, durabilityMax, durabilityPerSwing }, allowedTiles, ui: { frameToken, iconKey, accentToken? }, audio: { swing?, hitRock, hitOre, break?, spinUp?, biteLoop?, coolDown? } }

- data/crafting/recipes.json
  • version=1
  • RecipeDef shape: { id, stationId, timeMs, inputs: [ { itemId, qty }... ], output: { itemId, qty } }

- ECS Tile component fields used:
  • tileType (e.g., "floor", "rock", "rock.ore")
  • hardness (int)
  • oreType (string | null, e.g., "copper" | "iron" | "quartz")
  • Collider is handled by world/tilemap per ecs-registry archetype; MiningSystem reads from Tile only.

---

## 16) Tuning Targets & Safe Ranges

Approximate target swings-to-break:
- Rock (3): T1 ~4 swings (6×4=24≥20), T2 ~3, Drill ~1–2 pulses.
- Copper (4): T1 ~5 (6×5=30≥25), T2 ~3, Drill ~2.
- Iron (5): T1 gated, T2 ~3 (10×3=30≥30), Drill ~2.
- Quartz (6): gated to Drill (22×2=44≥35) — rare.

Stamina pacing:
- With Stamina.max ≈100 and regen per combat spec, mining bursts of ~6–10 actions before a brief pause.
- Drill is more stamina-efficient per pulse (staminaCost 6) but faster cadence demands attention to regen delay.

Safe ranges for iteration:
- miningSpeed: [5..25]
- swingIntervalMs: picks [440..560], drill [120..180]
- breakThreshold base: [18..24] at hardness 3, step [+4..+6] per hardness tier

---

## 17) Acceptance Checklist (Sprint 1)

- Tools and recipe ids match data files; JSONs parse cleanly.
- Hardness gating defined and aligns with biome tiles.
- Events specified for Crafting and Mining with exact payload contracts.
- No raw colors; all UI uses tokens from palette.
- Tool progression across 3 tiers feels meaningful by thresholds and cadence; session target 20–40 min is achievable with average vein luck and curated bootstrap.

---

## 18) Open Questions & Integration Risks

- World-Gen confirmation needed:
  • Final Tile.hardness values in data/world/biome-crystal-caverns.json (especially quartz 6–7) and lane distributions for copper/iron.
  • Ensure early-game curated cache or NPC trade seeds enough ore.copper to avoid deadlock before T2.

- System dependencies:
  • src/systems/mining-system.js must enforce hardness gating, stamina spend, and durability decrement strictly on valid progress.
  • UI bridges for stations must honor single-queue, reservation, and full-refund on cancel.

- Suggested unit tests:
  • Eligibility gate: verify miningPower < hardness blocks Progress and emits mining.Deny(hardness).
  • Stamina spend: verify no spend when ineligible; spend occurs once per swing/pulse; regen delay applied.
  • Durability decrement: only on valid progress; no decrement on Deny.
  • Break logic: progress accumulation matches thresholds; Break converts tile to floor and spawns correct drops per oreType.
  • Crafting lifecycle: Reserving/InProgress/Completed/Canceled state transitions and inventory side-effects; events emitted with correct payloads.

---

Steel your nerves, brace your brass, and mind your steam pressure. With these contracts in place, every strike, spark, and hiss shall behave as the cogs decree.