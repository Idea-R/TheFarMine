# Crafting & Mining Tools — From Pick to Steam (Sprint 1)

Provenance
- Owner: @delta (Technology Systems — Gearwright Steamforge)
- Authorial voice: Gearwright Steamforge, practical brass-and-bolts guarantees
- Cross-references:
  - docs/core-systems/ecs-architecture.md (§System Order, MiningSystem)
  - src/core/ecs-registry.js (Tile, Inventory, Attributes, Stamina)
  - docs/world-generation/cave-gen-algorithm.md (§Tiles & hardness)
  - data/items/resources.json (ore.copper, ore.iron, shard.quartz, core.steam)
  - data/visual/color-palette.json (token references only)
  - docs/combat-systems/combat-design.md (§Stamina rhythm)
  - data/audio/sound-manifest.json (sfx.mining.* ids)

—

## 2) Goals & Non-Goals (MVP)

Goals
- Three tool tiers with clear utility jumps:
  - T1 Basic Pickaxe → T2 Reinforced Pickaxe → T3 Steam Drill
  - Step-ups deliver speed gains and hardness breakpoints that feel material, not marginal.
- Simple but meaningful station progression:
  - Workbench → Forge → Steam Workshop (gates recipes and repairs)
- Stamina rhythm dovetails with combat stamina to keep a single, learnable cadence.
- Fully data-driven items/recipes in JSON that parse cleanly and align with ECS contracts.

Non-goals
- Automation (borers/auto-miners), mod mixing, alloys beyond iron+copper hints, multi-head tools, socket systems, or any steam fuel runtime drain (MVP assembly gate only).

—

## 3) Core Concepts & Definitions

- Tile hardness
  - Integer stored on Tile.hardness from biome gen.
  - MVP target ranges:
    - floor: 0–1
    - wall rock: 3–5
    - ore rock: 4–6 (Crystal Caverns §9)
  - Hardness gating:
    - A tool can apply mining progress only if Tool.stats.miningPower ≥ target hardness.
    - Sprint 1 shim (copper-only gate): ore.copper tiles use effectiveGateHardness = 3 for the gating check, but retain true hardness = 4 for progress scaling. This preserves T1 usability without weakening higher tiers. No other ores receive this exception.

- Mining progress
  - On each swing/pulse, MiningSystem adds progress = Tool.miningSpeed × f(hardness)
  - MVP scaling function: f(h) = 1 / (0.8 + 0.2 × h)
  - When break meter crosses threshold (internal to the tile), the tileType transitions, drops items, and resets its internal meter.

- Stamina coupling
  - Each swing/pulse costs Tool.staminaCost.
  - MiningSystem respects Stamina.regenDelayAfterActionMs as defined by ECS Attributes/Stamina; when stamina is insufficient for the action, mining input is ignored and an insufficient-stamina event is emitted (no partial costs).

- Durability
  - Tool durability reduces by Tool.durabilityPerSwing each swing/pulse.
  - At 0 durability, tool enters Damaged state:
    - −40% miningSpeed
    - +30% staminaCost
  - Damaged tools still function, but repairs must be performed at a station of sufficient tier (see §4, §11).

—

## 4) Stations & Progression

Station tiers and roles
- T1 Workbench
  - Crafts: Basic Pickaxe, simple parts
  - Repairs: T1
- T2 Forge
  - Crafts: Reinforced Pickaxe
  - Repairs: T1–T2
  - Smelts: iron/copper components (abstracted via recipe inputs in MVP; no separate smelt step)
- T3 Steam Workshop
  - Crafts: Steam Drill (requires core.steam to assemble)
  - Repairs: T1–T3
  - Maintains: Steam Drill (no runtime fuel in MVP; housekeeping only)

Station access and unlocks
- Tavern hub features a Workbench by default.
- Forge blueprint unlock: on first acquisition of either ore.iron or a set of shard.quartz (any quantity ≥ 1 is sufficient).
- Steam Workshop unlock: on acquiring core.steam via the quest gate.

—

## 5) Tool Tiers (Authoritative MVP Stats)

All tokens referenced are ids only; no raw assets embedded.

- T1 Basic Pickaxe
  - id: tool.pick.t1.basic
  - name: Basic Pickaxe
  - tier: 1
  - stationRequired: workbench
  - stats:
    - miningPower: 3
    - miningSpeed: 6 units/swing
    - swingIntervalMs: 520
    - staminaCost: 12
    - durabilityMax: 120
    - durabilityPerSwing: 1
  - allowedTiles: floor, rock (≤3 hardness), rock.ore (copper ≤4; uses copper gate shim)
  - audio sfx tokens: sfx.mining.pick.swing, sfx.mining.pick.hitRock, sfx.mining.pick.hitOre
  - notes:
    - Baseline entry tool; viable on copper with the copper gate shim (see §3).

- T2 Reinforced Pickaxe
  - id: tool.pick.t2.reinforced
  - name: Reinforced Pickaxe
  - tier: 2
  - stationRequired: forge
  - stats:
    - miningPower: 5
    - miningSpeed: 10 units/swing
    - swingIntervalMs: 480
    - staminaCost: 12
    - durabilityMax: 180
    - durabilityPerSwing: 1
  - allowedTiles: floor, rock (≤5), rock.ore (copper/iron ≤5)
  - audio sfx tokens: sfx.mining.pick.swingHeavy, sfx.mining.pick.hitRock, sfx.mining.pick.hitOre
  - notes:
    - First true hardness breakpoint at 5; opens iron veins comfortably.

- T3 Steam Drill
  - id: tool.drill.t3.steam
  - name: Steam Drill
  - tier: 3
  - stationRequired: steam_workshop
  - stats:
    - miningPower: 7
    - miningSpeed: 22 units per pulse (tick-based)
    - swingIntervalMs: 140 (pulse period)
    - staminaCost: 6 per 300 ms pulse window (lower per-pulse, higher sustained draw)
    - durabilityMax: 220
    - durabilityPerSwing: 1 per pulse
  - fuelNote: core.steam is an assembly gate only in MVP (no runtime fuel drain)
  - allowedTiles: all MVP Crystal Caverns tiles ≤6 hardness
  - audio sfx tokens: sfx.mining.drill.spinUp, sfx.mining.drill.bite, sfx.mining.drill.coolDown
  - notes:
    - Designed for burst mining lanes; rapid pulses sync with stamina bursts between fights.

Balance notes
- Each tier shortens TTB (time-to-break) on a hardness-4 ore by about 35–45% step-over-step (see §10).
- Stamina costs are tuned to the combat stamina regeneration curve, so continuous mining demands short breathers in lockstep with combat recovery.

—

## 6) Data Contracts (JSON Schemas) — Runtime Mapping

tools.json (data/items/tools.json) — per item
```
{
  "id": "string",
  "name": "string",
  "tier": 1,
  "stationRequired": "workbench",
  "stats": {
    "miningPower": 0,
    "miningSpeed": 0,
    "swingIntervalMs": 0,
    "staminaCost": 0,
    "durabilityMax": 0,
    "durabilityPerSwing": 0
  },
  "allowedTiles": ["floor", "rock", "rock.ore"],
  "ui": {
    "iconKey": "string",
    "colorToken": "string"
  },
  "audio": {
    "swing": "string",
    "hitRock": "string",
    "hitOre": "string",
    "loop?": "string"
  },
  "notes": ["string"]
}
```

recipes.json (data/crafting/recipes.json) — per recipe
```
{
  "id": "string",
  "name": "string",
  "station": "workbench",
  "inputs": [{ "itemId": "string", "qty": 0 }],
  "output": { "itemId": "string", "qty": 0 },
  "timeMs": 0,
  "unlockedBy": {
    "seenItemIds"?: ["string"],
    "questFlag"?: "string"
  }
}
```

MiningSystem consumption (runtime mapping)
- Reads equipped tool from Inventory; tool stats from ItemData (tools.json).
- Checks Tile.tileType and Tile.hardness (from world gen).
- Gate:
  - If tool.miningPower ≥ tile.hardness, allow progress.
  - Copper exception: for ore.copper only, use effectiveGateHardness = 3 for the gate (progress still scaled by true hardness 4).
- Progress:
  - progressPerAction = tool.miningSpeed × f(hardness), f(h) = 1 / (0.8 + 0.2 × h)
  - Pulsed tools (drill) apply this per pulse at swingIntervalMs cadence.
- Stamina:
  - Deduct Stamina by tool.staminaCost per swing/pulse.
  - Apply Stamina.regenDelayAfterActionMs (per ECS Attributes/Stamina).
  - If stamina < cost, action is skipped; emit insufficient-stamina feedback event (no partial progress).
- Durability:
  - Deduct tool.durabilityPerSwing each action.
  - When durability reaches 0, set tool state = Damaged; apply −40% miningSpeed, +30% staminaCost until repaired at required station or higher.
- Events:
  - Emit mining.swing, mining.hit.rock, mining.hit.ore, mining.break.tile, and crafting.complete to EventBus; AudioSystem maps to sfx tokens.

—

## 7) Resources & Components (Ground Truth)

Resource ids (from data/items/resources.json) and intended use
- ore.copper: T1 heads/parts, mixed into T2 components.
- ore.iron: T2 heads/haft pins, T3 chassis parts.
- shard.quartz: stabilizer component across all tiers.
- core.steam: gate for T3 assembly only (no runtime fuel drain in MVP).

ECS components (per src/core/ecs-registry.js)
- Tile (tileType, hardness)
- Inventory (equipped tool, item stacks)
- Attributes (binds stamina with regenDelayAfterActionMs)
- Stamina (current, max, regen flags)

—

## 8) Starter Recipes (Authoritative Targets)

- R1: Basic Pickaxe
  - id: recipe.tool.pick.t1.basic
  - station: Workbench
  - inputs: ore.copper × 8, shard.quartz × 2
  - output: tool.pick.t1.basic × 1
  - timeMs: 3000
  - unlockedBy: default

- R2: Reinforced Pickaxe
  - id: recipe.tool.pick.t2.reinforced
  - station: Forge
  - inputs: ore.copper × 4, ore.iron × 6, shard.quartz × 3
  - output: tool.pick.t2.reinforced × 1
  - timeMs: 4500
  - unlockedBy: seenItemIds = ["ore.iron"]

- R3: Steam Drill
  - id: recipe.tool.drill.t3.steam
  - station: Steam Workshop
  - inputs: ore.iron × 12, shard.quartz × 6, core.steam × 1
  - output: tool.drill.t3.steam × 1
  - timeMs: 6000
  - unlockedBy: questFlag = "steam_core_acquired"

—

## 9) UI & Feedback

- Inventory and HUD
  - Use color tokens only (no raw hex): e.g., ui.text.numbers, terrain.ore.copper.
  - Show tier pips I/II/III, durability bar, and a clear Damaged icon state when durability = 0.
- Tooltips (for tools)
  - miningPower
  - miningSpeed
  - staminaCost
  - durability (current/max)
  - required station
- Audio
  - Hook by event → token mapping only (sfx.mining.*).
  - Do not reference file paths directly; AudioSystem resolves tokens via data/audio/sound-manifest.json.

—

## 10) Balance Tables (Sprint 1 Defaults)

Crystal Caverns hardness (authoritative sprint values)
- floor: 0–1
- wall rock: 3–4
- rock.ore:
  - copper: 4 (gated as 3 for power check; scaled as 4 for progress)
  - iron: 5

Tool deltas vs copper ore (hardness 4)
- T1 Basic Pickaxe:
  - ~7 swings average (≈3.6 s) at 520 ms cadence
- T2 Reinforced Pickaxe:
  - ~4 swings average (≈1.9 s) at 480 ms cadence
- T3 Steam Drill:
  - ~6 pulses (≈0.9 s) at 140 ms pulses

Stamina flow per 10 seconds continuous mining
- T1: ~19 swings → 228 stamina
- T2: ~20 swings → 240 stamina
- T3: ~70 pulses → 420 stamina
Notes
- These are UX targets. Engineers may fine-tune f(hardness) or the internal break threshold to hit these timings without changing the step-order: T1 < T2 < T3 in both speed and breakpoint authority.

—

## 11) Repair & Durability Rules

Repair costs and timing (at minimum station or higher)
- T1 tools: ore.copper × 2; timeMs: 1500; station: Workbench+
- T2 tools: ore.iron × 2 + shard.quartz × 1; timeMs: 2500; station: Forge+
- T3 tools: ore.iron × 3 + shard.quartz × 2; timeMs: 3000; station: Steam Workshop

Damaged penalties (durability = 0)
- miningSpeed: −40%
- staminaCost: +30%
- Penalties lift immediately after successful repair.

—

## 12) Events & Audio Hooks

MiningSystem emits (tokenized event ids)
- mining.swing
- mining.hit.rock
- mining.hit.ore
- mining.break.tile
- crafting.complete

AudioSystem mapping
- Map events to sfx tokens per data/audio/sound-manifest.json:
  - Picks: sfx.mining.pick.swing, sfx.mining.pick.hitRock, sfx.mining.pick.hitOre, sfx.mining.pick.swingHeavy
  - Drill: sfx.mining.drill.spinUp, sfx.mining.drill.bite, sfx.mining.drill.coolDown

—

## 13) Acceptance & QA Checklist

Data validation
- tools.json and recipes.json validate against schema shapes in §6.
- All ids resolve against:
  - data/items/resources.json (ore.copper, ore.iron, shard.quartz, core.steam)
  - data/visual/color-palette.json (colorToken references only)
  - data/audio/sound-manifest.json (sfx.mining.*)
- No raw hex colors or audio file paths in game data; tokens only.

Gameplay
- T1 mines copper ore tiles (hardness 4) via copper gate shim; timings land near §10 targets.
- T2 mines iron ore tiles (hardness 5) reliably and faster than T1 on copper.
- T3 comfortably mines both ores; pulses feel rapid and bursty, not continuous drone.
- Stamina interactions:
  - Costs deducted per action; regen delay applied per ECS.
  - Insufficient stamina cancels action cleanly with feedback; no partial-cost deductions.
- Durability and repair:
  - Durability decreases per swing/pulse; Damaged state triggers at 0.
  - Repairs gated by station tier and resource costs in §11.

Performance
- MiningSystem update budget remains under 0.2 ms per frame at MVP entity densities (single miner active, modest tile checks).

—

## 14) Appendix A: Example JSON Entries

Example tool (tools.json)
```
{
  "id": "tool.pick.t1.basic",
  "name": "Basic Pickaxe",
  "tier": 1,
  "stationRequired": "workbench",
  "stats": {
    "miningPower": 3,
    "miningSpeed": 6,
    "swingIntervalMs": 520,
    "staminaCost": 12,
    "durabilityMax": 120,
    "durabilityPerSwing": 1
  },
  "allowedTiles": ["floor", "rock", "rock.ore"],
  "ui": {
    "iconKey": "icon.tool.pick.t1",
    "colorToken": "terrain.ore.copper"
  },
  "audio": {
    "swing": "sfx.mining.pick.swing",
    "hitRock": "sfx.mining.pick.hitRock",
    "hitOre": "sfx.mining.pick.hitOre"
  },
  "notes": ["Entry-tier pickaxe; copper gate shim enabled"]
}
```

Example recipe (recipes.json)
```
{
  "id": "recipe.tool.pick.t1.basic",
  "name": "Basic Pickaxe",
  "station": "workbench",
  "inputs": [
    { "itemId": "ore.copper", "qty": 8 },
    { "itemId": "shard.quartz", "qty": 2 }
  ],
  "output": { "itemId": "tool.pick.t1.basic", "qty": 1 },
  "timeMs": 3000,
  "unlockedBy": {}
}
```

—

## 15) Appendix B: Future Notes

- Heavy swing variants with momentum windows.
- Alloy heads beyond copper/iron (steel, bronze mixes).
- Actual steam fuel consumption and heat buildup for drills.
- Auger heads and modular attachments.
- Automaton miners and conveyor-fed borers.

That’s the spec. Bolt it in, wire it to ECS cleanly, and we’ll have the Caverns singing to the tune of steel and steam.