# Crafting & Mining Tool Progression — Gears, Grist, and Good Steel (Sprint 1)

Provenance
- Owner: @delta (Technology Systems — Gearwright Steamforge)
- Voice: Gearwright Steamforge — precise, implementation-ready, steampunk‑practical

Cross‑References
- Data: data/crafting/recipes.json, data/items/tools.json, data/items/resources.json, data/core/component-schemas.json (§Inventory, Tile)
- Design: docs/world-generation/cave-gen-algorithm.md (§Hardness, ore seeding)
- Audio: docs/audio-systems/audio-design.md (§5 Event Map, §12 Mining Rhythm)
- Visual/UI: docs/visual-systems/ui-framework.md (§HUD gauges, inventory)
- Code: src/core/ecs-registry.js (Inventory/Tile components), planned src/systems/mining-system.js, planned src/systems/crafting-system.js


## 1) Design Pillars
- Meaningful tier steps in cadence and capability: miningPower gates seams; miningSpeed sets progress rate; swing cadence sets feel.
- Simple, readable inputs with clear station progression: copper → iron → steam core; workbench → forge → steam workshop.
- Fair stamina rhythm; durability as light pacing. No repair loop in MVP; replacement/upgrade only.
- Token‑only color/audio references; JSON data is source of truth for exact ids and mixing.


## 2) Resources Taxonomy (MVP)
Authoritative ids as in data/items/resources.json. Stack sizes and sell values are placeholders for UI display guidance only; MVP logic does not rely on them.

- ore.copper
  - Definition: Raw copper ore chunk suitable for smelting or basic tool heads.
  - Acquisition: Mined from copper seams; worldgen seed weight: common in L1; see cave-gen-algorithm.md.
  - Stack: 99; Sell: 2
- ore.iron
  - Definition: Dense iron ore chunk for reinforced tools and machine chassis.
  - Acquisition: Mined from iron seams; worldgen seed weight: uncommon in L1, ramps in deeper bands.
  - Stack: 99; Sell: 4
- shard.quartz
  - Definition: Hard quartz shard used as tempering grit and edge retainer.
  - Acquisition: Loot from enemies and decor breakables in MVP; not a mineable tile (see §6).
  - Stack: 50; Sell: 3
- core.steam
  - Definition: Compact steam core with valve collar and micro-boiler; powers the drill.
  - Acquisition: Rare loot and quest rewards in MVP; not mined. May be placed in late L1 caches.
  - Stack: 10; Sell: 20

Worldgen notes
- Align ore spawn weights and hardness with docs/world-generation/cave-gen-algorithm.md. Copper should be readily reachable by T1; iron reachable with T2 or deeper pockets behind base-rock.
- Quartz and steam cores are not seeded as mineable tiles in Sprint 1.


## 3) Stations & Tiers (Authoritative for MVP)
Stations
- workbench (T1): Handwork of soft metals and hafting.
- forge (T2): Hot-work for iron reinforcement and annealing.
- steam_workshop (T3): Precision assembly, valve-fitting, pressure tests.

Access Model (MVP)
- If a station entity is present in the scene, all its recipes are craftable. No blueprint unlocks in Sprint 1.

Crafting Queue Model
- One craft at a time per station instance. No partial saves.
- Time is taken from recipes.json (recipe.timeMs).
- Inventory handling: reserve on start (subtract inputs immediately).
- State machine per station:
  - Idle → Crafting(t) → Complete | Cancel
  - On Complete: add output to initiating inventory.
  - On Cancel/interrupt: return reserved inputs to initiating inventory; if space is insufficient, drop overflow as item entities.

Station Tiering
- T1 (workbench) → T2 (forge) → T3 (steam_workshop); each station exposes its tier’s tool recipe.


## 4) Tool Progression Overview
Authoritative ids and stats as in data/items/tools.json. The values below are the Sprint 1 contract engineering shall implement; JSON is the source of truth and must match.

Text table (id, tier, miningPower, cadence, staminaCost, miningSpeed, durabilityMax)
- tool.pickaxe.basic — T1 — miningPower 3 — swingIntervalMs 520 — stamina 12 — miningSpeed 6 — durability 120
- tool.pickaxe.reinforced — T2 — miningPower 5 — swingIntervalMs 480 — stamina 12 — miningSpeed 10 — durability 180
- tool.drill.steam — T3 — miningPower 7 — pulseIntervalMs 140 — stamina 6 — miningSpeed 22 — durability 220 — looped bite audio

Notes
- tool.drill.steam has continuous pulse cadence; each pulse behaves as a “swing” for stamina/durability accounting.
- Audio ids are referenced via tools.json.audio.* (swing, hit_rock, hit_ore, thunk, loop/drill_bite).


## 5) Hardness & Gating Contract
Tile.hardness semantics (MVP targets; see world-gen for exact assignments)
- floor: hardness 0–1 — always mineable for clearance if needed.
- rock (base walls): hardness ~3–4 in L1.
- rock.ore.copper: effective seam hardness 4.
- rock.ore.iron: effective seam hardness 5.
- quartz: not a tile in MVP; appears as loot. Optional: worldgen may seed rare quartz ore with hardness ≥6 (non‑binding; coordinate with @beta).

Gating Rule
- A tool can apply progress to a tile iff tool.stats.miningPower ≥ Tile.hardness.
- Else: 0 progress, do not spend durability, play “thunk” feedback; show UI tooltip: “Too hard for this tool” (tokenized in UI text).
- Contract applies uniformly to swing/pulse events.


## 6) Mining Mechanics (MVP Runtime Spec)
Cadence and Hit Window
- For pickaxes: schedule hit window ~70–90 ms after swing audio start; default hitWindowMs = 80.
- For drill: apply a “hit” each pulseIntervalMs (tools.json.stats.swingIntervalMs = 140 for drill).
- Tools read cadence from tools.json.stats.swingIntervalMs.

Progress Model
- Per valid hit, add tool.stats.miningSpeed to tile.breakProgress.
- breakThreshold = Tile.hardness × hardnessToProgressScalar.
  - Default hardnessToProgressScalar = 10 (tunable; see §11).
- On reaching or exceeding breakThreshold, emit mining.break and replace the tile per Tile replacement rules (ore drop, cave air, etc.).

Stamina
- On each valid hit, spend tool.stats.staminaCost.
- Use Stamina.regenDelayAfterActionMs from component schema to delay regen after each spend.
- If stamina < cost, do not start a swing/pulse; emit “Out of stamina” UI message if player input attempted.

Durability
- Decrement tool.stats.durabilityPerSwing on each valid hit (i.e., only when progress was applied).
- When currentDurability reaches 0:
  - Tool is disabled (cannot swing/pulse).
  - Show UI warning token and play “tool_broken” audio cue.
  - MVP: no repair path; see §10.

Targeting and Allowed Tiles
- Mining targets the adjacent tile in facing direction.
- Validate against tool.stats.allowedTiles (e.g., [“floor”, “rock”, “rock.ore.*”]) before applying progress.
- If invalid target: ignore progress; no stamina or durability spend; optional soft error sound.

Event Contracts (aligns with Audio/UI)
- mining.swing { toolId, pos, tileType }
- mining.hit { toolId, pos, tileType, oreType? }
- mining.break { pos, tileType, oreType? }
- stamina.Spend { entityId, action: "mine", amount }
- ui.tooltip.show { token: "too_hard_for_tool", context? } only when hardness‑gated.

Audio Mapping
- Route events to AudioSystem per docs/audio-systems/audio-design.md §5.
- Mining rhythm adheres to §12; drill uses looped bite mapped via tools.json.audio.loopId.


## 7) Crafting Mechanics (MVP Runtime Spec)
Recipe Shape (restated)
- id (string)
- name (string)
- station (enum: "workbench" | "forge" | "steam_workshop")
- timeMs (number)
- inputs[]: [{ id, count }]
- output: { id, count }

Validation and Flow
- Require station entity in scene.
- Check initiating inventory has required input counts.
- Reserve on start: immediately subtract inputs; emit crafting.start.
- Start timer (timeMs). On completion, add output to initiating inventory; emit crafting.complete.
- On cancel/interrupt, rollback reserved inputs to initiating inventory; emit crafting.cancel. Overflow drops to ground as item entities.

UI Bindings
- HUD prompt shows recipe name, time, and station id.
- Progress bar uses central Clock ms ticks; pause/resume not supported in MVP.

Edge Cases
- Full inventory at completion:
  - Try auto-stack into existing stacks.
  - If no space, spawn output as world item at station’s position; show tooltip token “inventory_full_dropped.”


## 8) Data Sources (Authoritative Files)
data/items/tools.json
- Per tool:
  - id (e.g., "tool.pickaxe.basic", "tool.pickaxe.reinforced", "tool.drill.steam")
  - name, tier (1|2|3)
  - stats: 
    - miningPower (gating; compared to Tile.hardness)
    - miningSpeed (progress per valid hit)
    - swingIntervalMs (cadence; drill uses pulse cadence)
    - staminaCost (per hit)
    - durabilityMax (max durability)
    - durabilityPerSwing (decrement per valid hit; default 1)
    - allowedTiles (array of tile kinds)
  - ui: { iconKey, colorToken }
  - audio: { swingId, hitRockId, hitOreId, thunkId, loopId? }

Authoritative Tools (must exist with these stats)
- tool.pickaxe.basic: miningPower 3, miningSpeed 6, swingIntervalMs 520, staminaCost 12, durabilityMax 120, durabilityPerSwing 1.
- tool.pickaxe.reinforced: miningPower 5, miningSpeed 10, swingIntervalMs 480, staminaCost 12, durabilityMax 180, durabilityPerSwing 1.
- tool.drill.steam: miningPower 7, miningSpeed 22, swingIntervalMs 140, staminaCost 6, durabilityMax 220, durabilityPerSwing 1, audio.loopId set.

data/crafting/recipes.json
- Exactly three starter recipes (one per tier). Use these ids, ingredients, and timings:
  - recipe.tool.pickaxe.basic
    - station: workbench
    - timeMs: 4000
    - inputs: [{ id: "ore.copper", count: 8 }, { id: "shard.quartz", count: 2 }]
    - output: { id: "tool.pickaxe.basic", count: 1 }
    - Note: T1 Basic Pickaxe is also granted as starting gear; this recipe serves replacement.
  - recipe.tool.pickaxe.reinforced
    - station: forge
    - timeMs: 5000
    - inputs: [{ id: "ore.iron", count: 12 }, { id: "shard.quartz", count: 3 }]
    - output: { id: "tool.pickaxe.reinforced", count: 1 }
  - recipe.tool.drill.steam
    - station: steam_workshop
    - timeMs: 7000
    - inputs: [{ id: "ore.iron", count: 16 }, { id: "shard.quartz", count: 4 }, { id: "core.steam", count: 1 }]
    - output: { id: "tool.drill.steam", count: 1 }

data/items/resources.json
- Must include and resolve:
  - ore.copper
  - ore.iron
  - shard.quartz
  - core.steam


## 9) Repairs & Upgrades Policy (MVP)
- Repairs: Disabled in Sprint 1. Tools cannot be repaired; when durability reaches 0, tool is unusable.
- UI: Hide/disable repair affordances. Tooltip token: “repairs_locked_until_s2” with copy “Repairs arrive after the First Warrant’s second season.”
- Upgrades: Crafted independently; no combine logic. Player crafts the next-tier tool at the proper station.


## 10) Balance Targets & Tuning Notes
Expected Pacing (assuming hardnessToProgressScalar = 10)
- Copper with T1 (hardness 4): threshold 40; miningSpeed 6 → typically 7 hits (42) to break, possibly 8–9 when cadence or stamina interleaves cause slight delays; ~4–5 s per ore with 520 ms swings and regen delay overhead.
- Iron with T2 (hardness 5): threshold 50; miningSpeed 10 → 5 hits (50) to break; with 480 ms cadence and rhythm, ~3–4 s per ore.
- Drill on base rock (hardness 3–4): pulses every 140 ms; intended for short bursts to open lanes and chew seams. With staminaCost 6, target burst from full stamina to 20% in ~1.5–2.0 s.

Tunable Ranges (finalize with @beta per world hardness)
- miningSpeed ±15%
- staminaCost ±2
- swingIntervalMs ±20 ms (picks only)
- hardnessToProgressScalar in [8..12]
- Note: Any hardness change in world-gen requires reconciling the gating rule with miningPower tiers.


## 11) UI & Feedback
- Inventory/Hotbar: tools.json.ui.iconKey maps to HUD icons; colorToken provides slot accent (e.g., metal.copper, metal.iron, energy.steam).
- Gauges: Stamina gauge adheres to UI framework low‑stamina pulse rule at <20%.
- Tooltips/Messages (tokenized):
  - too_hard_for_tool → “Too hard for this tool”
  - out_of_stamina → “Out of stamina”
  - tool_broken → “Tool broken”
  - inventory_full_dropped → “Inventory full — output dropped”
  - repairs_locked_until_s2 → “Repairs arrive after the First Warrant’s second season.”
- Minimap ore pips: reveal policy owned by worldgen/UI; independent of tool gating.


## 12) Engineering Integration Notes
MiningSystem (planned src/systems/mining-system.js)
- Dependencies: ECS (Position, Inventory, Tile, Stamina), central Clock, Input.
- Update Order:
  1) Handle input (swing/pulse intent).
  2) Validate stamina ≥ cost; validate target tile and facing.
  3) Enforce swingIntervalMs cadence; schedule hit at hitWindowMs (picks) or apply per pulse (drill).
  4) If tool.miningPower ≥ Tile.hardness, apply miningSpeed to tile.breakProgress; else emit thunk and tooltip.
  5) On valid hit: spend stamina, decrement durability, emit mining.hit; on break: mining.break and tile replacement.
  6) Emit events for Audio/UI and update HUD gauges/tooltips.
- Determinism: All timings in ms; no RNG in MVP.
- Unit Tests:
  - Tool tier gating vs hardness (apply/no-apply).
  - Stamina spend and regen delay enforcement.
  - Durability decremented only on valid hits.
  - Ore vein depletion and drop spawns per break.

CraftingSystem (planned src/systems/crafting-system.js)
- Station registry keyed by station id; each station instance supports a single in‑flight craft.
- Inventory reservation on start; rollback on cancel/interrupt.
- Event emissions: crafting.start, crafting.complete, crafting.cancel with payloads in §16.
- Completion path handles auto-stacking and overflow drop.


## 13) Acceptance & QA Checklist (Sprint 1)
- Three tiers feel distinct in cadence and capability; miningPower gates copper/iron per §5.
- JSON parses cleanly; ids resolve across tools.json, recipes.json, resources.json, sound-manifest.json, color-palette.json.
- Stamina costs enforced; regen delay respected; durability decremented only on valid hits; zero durability disables the tool.
- Events emitted per contract; AudioSystem receives mining.swing/hit/break; UI updates gauges/tooltips immediately.
- Crafting occurs only at correct stations; inputs reserved on start; output granted after timeMs; cancel returns inputs or drops overflow.



## 14) Appendix A — Example Flows

Example 1: Craft Basic Pick at workbench (exact inputs)
- Preconditions: Player inventory has ore.copper x8, shard.quartz x2; station: workbench present; inventory has one free slot or stack compatible with tool.
- Timeline:
  - t=0 ms: Player selects recipe.tool.pickaxe.basic → Craft
    - CraftingSystem validates station present, inventory ≥ inputs.
    - Reserve on start: Inventory −8 ore.copper, −2 shard.quartz.
    - Emit crafting.start { id:"recipe.tool.pickaxe.basic", station:"workbench", timeMs:4000 }.
  - t=0→4000 ms: Station state = Crafting(4000). UI shows progress.
  - t=4000 ms: Emit crafting.complete; add tool.pickaxe.basic x1 to inventory (auto-stack not applicable for tools).
- Inventory diffs:
  - Start: −8 ore.copper, −2 shard.quartz.
  - Complete: +1 tool.pickaxe.basic.
- If player cancels at t=1500 ms: Emit crafting.cancel and return inputs (+8 ore.copper, +2 shard.quartz). If no space, drop remainder as items at station.

Example 2: Mine copper seam with T1 (illustrative math)
- Assumptions: Tile.hardness=4; hardnessToProgressScalar=10 → breakThreshold=40. Tool: tool.pickaxe.basic (miningSpeed=6, swingIntervalMs=520, staminaCost=12).
- Sequence:
  - Each valid hit adds +6 progress. After 7 hits: 42 ≥ 40 → tile breaks.
  - Stamina: spend 12 per hit; 7 hits spend 84 stamina total (must have stamina ≥ 12 before each swing).
  - Cadence: Swing every 520 ms; hit registers at ~t+80 ms each swing. Total time to break ~7×520 ms ≈ 3640 ms plus any regen delay interleaving.

Example 3: Drill burst on base rock (stamina envelope)
- Assumptions: Base rock hardness=3; breakThreshold=30. Tool: tool.drill.steam (miningSpeed=22, pulseIntervalMs=140, staminaCost=6). For illustration, Stamina.max=100; low-stamina threshold=20.
- Sequence:
  - Each pulse adds +22 progress. One pulse breaks hardness 3 (22 < 30); second pulse breaks (44 ≥ 30).
  - Pulses per second ≈ 1000/140 ≈ 7.14; stamina spend ≈ 7.14×6 ≈ 42.84 per second.
  - From full (100) to 20% (20) consumes 80 stamina → ~1.87 s of sustained drilling before low-stamina pulse.
  - Tiles broken in a 1.87 s burst: ~7.14×1.87 ≈ 13 pulses. Against hardness 3–4, expect 6–13 tiles depending on target mix and adjacency changes between pulses.



## 15) Appendix B — Event Payload Examples

Mining
- mining.swing
  - { "event":"mining.swing", "toolId":"tool.pickaxe.basic", "pos":{"x":12,"y":34}, "tileType":"rock" }
- mining.hit (non‑ore)
  - { "event":"mining.hit", "toolId":"tool.pickaxe.basic", "pos":{"x":12,"y":34}, "tileType":"rock" }
- mining.hit (ore)
  - { "event":"mining.hit", "toolId":"tool.pickaxe.reinforced", "pos":{"x":18,"y":40}, "tileType":"rock.ore", "oreType":"ore.iron" }
- mining.break
  - { "event":"mining.break", "pos":{"x":18,"y":40}, "tileType":"rock.ore", "oreType":"ore.iron" }
- stamina.Spend
  - { "event":"stamina.Spend", "entityId":123, "action":"mine", "amount":12 }
- ui.tooltip.show (hardness gate)
  - { "event":"ui.tooltip.show", "token":"too_hard_for_tool", "context":{"tileType":"rock.ore","oreType":"ore.iron"} }

Crafting
- crafting.start
  - { "event":"crafting.start", "recipeId":"recipe.tool.pickaxe.basic", "station":"workbench", "timeMs":4000, "byEntity":123 }
- crafting.complete
  - { "event":"crafting.complete", "recipeId":"recipe.tool.pickaxe.basic", "station":"workbench", "output":{"id":"tool.pickaxe.basic","count":1}, "byEntity":123 }
- crafting.cancel
  - { "event":"crafting.cancel", "recipeId":"recipe.tool.pickaxe.basic", "station":"workbench", "refunded":[{"id":"ore.copper","count":8},{"id":"shard.quartz","count":2}], "byEntity":123 }



## 16) Appendix C — Future Hooks (Non‑binding)
- Repair kits and maintenance benches.
- Mod sockets for tools (edge retention, steam governor).
- Fuel/pressure management for drills (cores as consumables).
- Blueprint discovery and station upgrade trees.
- Multi‑output and byproduct recipes (slag, grit).
- Parallel crafting queues and station automation.