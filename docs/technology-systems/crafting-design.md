# Crafting & Mining Tech — Plates, Rivets, and Progression (Sprint 1)

Owner/Provenance
- Owner: @delta (Technology Systems — Gearwright Steamforge)
- This document: implementation-ready spec for Sprint 1 crafting/mining progression

Cross-References
- data/items/tools.json (v1)
- data/crafting/recipes.json (this spec)
- docs/combat-systems/combat-design.md (§4 stamina, §10 events)
- docs/core-systems/ecs-architecture.md (§Components Inventory/Tile)
- data/visual/color-palette.json (ui.frame.*)
- docs/audio-systems/audio-design.md (§Event Bridge, §5 mappings)
- docs/world-generation/cave-gen-algorithm.md (§Tiles/Hardness, Three‑Wide)

---

## 2) Scope & Acceptance (MVP)

Scope
- Three tool tiers:
  - T1 pick
  - T2 pick
  - T3 steam drill
- One workbench chain:
  - Workbench → Forge → Steamworks
- Three starter recipes (one per tool)
- Durability + stamina costs enforced
- Hardness gating via Tile.hardness vs tool.miningPower
- Audio/UI event hooks wired via Event Bridge
- No repairs in Sprint 1 (explicitly disabled; placeholder UI tab hidden)

Acceptance
- Tool stat numbers align exactly with data/items/tools.json (v1)
- recipes.json schema stable, strictly ordered keys, parseable (UTF‑8)
- Progression unlocks new hardness gates: T1 ≤4, T2 ≤5, T3 ≤7
- UI tint tokens resolve: ui.frame.copper | ui.frame.brass | ui.frame.crystal

---

## 3) Resource & Item Taxonomy (Authoritative IDs)

Materials (canonical ids, roles)
- mat.ore.copper — mined from copper-bearing rock (hardness 4)
- mat.ore.iron — mined from iron-bearing rock (hardness 5)
- mat.crystal.shard — general crystal shard (binding/insulator)
- mat.core.steam — steam core (crafted/loot; used for T3)
- mat.rod.wood — wooden haft/rod (basic construction)
- mat.plate.iron — smithed plate for reinforcement (T2)

Tools (outputs)
- tool.pick.t1.basic
- tool.pick.t2.reinforced
- tool.drill.t3.steam

Stations
- station.workbench.t1
- station.forge.t2
- station.steamworks.t3

Acquisition Sources (MVP)
- Mined: mat.ore.copper, mat.ore.iron (gated by hardness; worldgen spawns per cave-gen spec)
- Drops/loot: mat.core.steam (interim: quest reward or vendor until crafting chain lands)
- Gathered/placeholder vendor: mat.crystal.shard, mat.rod.wood
- Forged: mat.plate.iron (see optional sub-recipe; otherwise seed via vendor)
- Note: ids are stable camel-dot strings; all ids must resolve in item registry

---

## 4) Workbench Chain & Mechanics

- station.workbench.t1
  - Crafts basic implements
  - Accepts common mats
  - No heat requirements

- station.forge.t2
  - Unlocks metalworking (plate/bolting)
  - Requires hub access flag (progression gate)
  - Crafts Reinforced Pickaxe (T2)

- station.steamworks.t3
  - Assembles engines/casings
  - Crafts Steam Drill (T3)
  - Consumes mat.core.steam
  - Optional ambient SFX while open

Station UI requirements
- Left pane: player inventory grid (read-only within station; drag from inventory permitted)
- Right pane: recipe list filtered by station tier and known recipes
- Craft button enabled when:
  - All inputs present in inventory with required quantities
  - StationId matches current station
  - Output durability does not affect enable-state (tools always craft at full)
- Progress bar shows timeMs; cancel returns inputs unmodified (MVP: allow cancel; if not feasible, disable cancel)

---

## 5) Hardness & Eligibility Gate

Eligibility rule
- Tool may mine a tile if: tool.miningPower ≥ Tile.hardness

MVP hardness guidance (worldgen owner to finalize)
- Common rock: 3
- Copper-bearing rock: 4
- Iron-bearing rock: 5
- Quartz/Crystal bands: 6–7

Tier-to-hardness mapping
- T1 (tool.pick.t1.basic): ≤ 4
- T2 (tool.pick.t2.reinforced): ≤ 5
- T3 (tool.drill.t3.steam): ≤ 7

On ineligible attempt
- MiningSystem emits: mining.Deny { reason:"hardness", toolId }
- UI: show warning tooltip
- No stamina or durability spent

---

## 6) Tool Stats & Behavior (align exactly to data/items/tools.json)

T1 Basic Pickaxe — tool.pick.t1.basic
- miningPower: 4
- swingIntervalMs: 520
- staminaCostPerSwing: 10
- durabilityMax: 120
- durabilityPerSwing: 1
- progressPerSwing: 0.34
- ui.tintToken: ui.frame.copper

T2 Reinforced Pickaxe — tool.pick.t2.reinforced
- miningPower: 5
- swingIntervalMs: 480
- staminaCostPerSwing: 12
- durabilityMax: 180
- durabilityPerSwing: 1
- progressPerSwing: 0.39
- ui.tintToken: ui.frame.brass

T3 Steam Drill — tool.drill.t3.steam
- miningPower: 7
- pulseIntervalMs: 160
- staminaCostPerSec: 22
- durabilityMax: 240
- durabilityPerSecWhileBiting: 2
- progressPerPulse: 0.09
- ui.tintToken: ui.frame.crystal

Behavior notes
- Picks: discrete swings; input buffered; swingIntervalMs is the action lockout per swing
- Drill: hold-to-bite; pulses at pulseIntervalMs; audio hysteresis: spinUp → bite loop → coolDown per audio-design
- Angle checks use current facing vs tile normal; only deny on egregious mismatch (see mining.Deny reason:"angle")

---

## 7) Stamina, Durability, and Mining Progress Rules

Picks (discrete)
- On eligible hit:
  - Spend stamina: staminaCostPerSwing
  - Apply progress: progress += progressPerSwing × tileFactor
  - Decrement durability: durabilityPerSwing
- On insufficient stamina:
  - Emit mining.Deny { reason:"stamina", toolId }
  - No progress/durability change

Drill (continuous)
- While biting on eligible tile:
  - Each pulse tick: progress += progressPerPulse
  - Spend stamina continuously: staminaCostPerSec / 60 per frame (assuming 60 FPS tick), or per delta-time
  - Durability drains at durabilityPerSecWhileBiting (scale by delta-time)
- Leaving tile or release input stops bite; no progress decay in MVP

Completion and reset
- When progress ≥ 1.0:
  - Emit mining.Break
  - Spawn drops
  - Reset tile progress to 0
- Interrupts (movement, tool swap): keep progress in MVP (no decay), configurable later

Tile factor (soft guidance; can be constant 1.0 for MVP)
- Suggested linear factor based on hardness vs miningPower:
  - Let d = tool.miningPower − Tile.hardness (eligible: d ≥ 0)
  - factor = clamp(0.8, 1.1, 1.0 + d × 0.05)
  - Examples:
    - d = 0 (equal): factor = 1.0
    - d = +1: factor = 1.05 (cap 1.1)
    - d = +2 or more (still eligible): factor → max 1.1
- If worldgen pacing needs slower equal-hardness breakpoints, consider shifting baseline to 0.9–1.0; MVP can hold at 1.0

---

## 8) Events & Bridges (Authoritative wiring)

MiningSystem domain events
- mining.Swing
  - { toolId, tileType, oreType|null, eligible }
- mining.Progress
  - { toolId, tileType, oreType|null, applied }  // applied = amount added
- mining.Break
  - { toolId, tileType, oreType|null, pos:{x,y} }
- mining.Deny
  - { reason:"hardness"|"stamina"|"angle", toolId }

Audio mapping (via Audio Event Bridge; see audio-design.md §5)
- mining.Swing → sfx.mining.swing.pick.light (use variant routing by tileType if available)
- mining.Progress (per-hit or per-n pulses) → materialized impact: stone/ore specific
- mining.Break → sfx.mining.break.stone (ore variants optional)
- mining.Deny (stamina|hardness) → ui.tooltip.warn (play once per deny burst; rate-limit)

UI hooks
- Tooltip warn on deny with localized reason
- Hotbar stamina flash on stamina deny
- Durability bar ticks on successful use; greyed tool icon when broken (0 durability)
- Cursor/reticle shows disabled-state when aiming at ineligible tiles (hardness gate)

ECS touchpoints (see ecs-architecture.md)
- Components:
  - Tool (stats reference by id)
  - Durability (current/max)
  - Stamina (current/max; shared with combat §4)
  - Inventory (item stacks)
  - Tile (hardness, type, ore payload)
- Systems:
  - MiningSystem (this spec)
  - CraftingSystem (station interactions, timeMs jobs)
  - AudioEventBridge (event routing)
  - UIEventBridge (status and tooltips)

---

## 9) Recipe System — JSON Schema (for data/crafting/recipes.json)

File rules
- UTF‑8, no comments
- Top-level key order is strict

Top-level shape
```
{
  "version": 1,
  "recipes": []
}
```

RecipeDef exact keys and order
```
{
  "id": "",
  "name": "",
  "stationId": "",
  "inputs": [ { "id": "", "qty": 0 } ],
  "output": { "id": "", "qty": 0 },
  "timeMs": 0,
  "unlockedByDefault": true,
  "notes": []
}
```

Validation notes
- ids must resolve to item registry (materials/tools)
- stationId ∈ { "station.workbench.t1", "station.forge.t2", "station.steamworks.t3" }
- timeMs: 500–2000 ms in MVP
- Parse order stable; reject unknown keys

---

## 10) Starter Recipes (Authoritative contents to mirror in recipes.json)

recipe.tool.pick.t1.basic
- name: Basic Pickaxe
- stationId: station.workbench.t1
- inputs: { mat.rod.wood: 1 }, { mat.ore.copper: 3 }, { mat.crystal.shard: 1 }
- output: { tool.pick.t1.basic, 1 }
- timeMs: 1200
- unlockedByDefault: true
- notes: ["Entry pick; gates hardness ≤4."]

recipe.tool.pick.t2.reinforced
- name: Reinforced Pickaxe
- stationId: station.forge.t2
- inputs: { mat.plate.iron: 2 }, { mat.ore.iron: 2 }, { mat.crystal.shard: 1 }
- output: { tool.pick.t2.reinforced, 1 }
- timeMs: 1600
- unlockedByDefault: true
- notes: ["Adds iron seams (≤5)."]

recipe.tool.drill.t3.steam
- name: Steam Drill
- stationId: station.steamworks.t3
- inputs: { mat.core.steam: 1 }, { mat.plate.iron: 3 }, { mat.crystal.shard: 2 }
- output: { tool.drill.t3.steam, 1 }
- timeMs: 2000
- unlockedByDefault: true
- notes: ["Continuous bite; covers quartz bands (≤7).", "Audio state machine active."]

Optional (stopgap) sub-recipe for iron plate
- If mat.plate.iron is not otherwise sourced in Sprint 1:
  - recipe.mat.plate.iron.from.ore
    - name: Iron Plate
    - stationId: station.forge.t2
    - inputs: { mat.ore.iron: 1 }
    - output: { mat.plate.iron: 1 }
    - timeMs: 600
    - unlockedByDefault: true
    - notes: ["Temporary conversion for MVP; replace with smelting chain later."]

Reference JSON — paste into data/crafting/recipes.json
```
{
  "version": 1,
  "recipes": [
    {
      "id": "recipe.tool.pick.t1.basic",
      "name": "Basic Pickaxe",
      "stationId": "station.workbench.t1",
      "inputs": [
        { "id": "mat.rod.wood", "qty": 1 },
        { "id": "mat.ore.copper", "qty": 3 },
        { "id": "mat.crystal.shard", "qty": 1 }
      ],
      "output": { "id": "tool.pick.t1.basic", "qty": 1 },
      "timeMs": 1200,
      "unlockedByDefault": true,
      "notes": [ "Entry pick; gates hardness ≤4." ]
    },
    {
      "id": "recipe.tool.pick.t2.reinforced",
      "name": "Reinforced Pickaxe",
      "stationId": "station.forge.t2",
      "inputs": [
        { "id": "mat.plate.iron", "qty": 2 },
        { "id": "mat.ore.iron", "qty": 2 },
        { "id": "mat.crystal.shard", "qty": 1 }
      ],
      "output": { "id": "tool.pick.t2.reinforced", "qty": 1 },
      "timeMs": 1600,
      "unlockedByDefault": true,
      "notes": [ "Adds iron seams (≤5)." ]
    },
    {
      "id": "recipe.tool.drill.t3.steam",
      "name": "Steam Drill",
      "stationId": "station.steamworks.t3",
      "inputs": [
        { "id": "mat.core.steam", "qty": 1 },
        { "id": "mat.plate.iron", "qty": 3 },
        { "id": "mat.crystal.shard", "qty": 2 }
      ],
      "output": { "id": "tool.drill.t3.steam", "qty": 1 },
      "timeMs": 2000,
      "unlockedByDefault": true,
      "notes": [ "Continuous bite; covers quartz bands (≤7).", "Audio state machine active." ]
    }
  ]
}
```

Optional sub-recipe JSON (include only if needed)
```
{
  "id": "recipe.mat.plate.iron.from.ore",
  "name": "Iron Plate",
  "stationId": "station.forge.t2",
  "inputs": [ { "id": "mat.ore.iron", "qty": 1 } ],
  "output": { "id": "mat.plate.iron", "qty": 1 },
  "timeMs": 600,
  "unlockedByDefault": true,
  "notes": [ "Temporary conversion for MVP; replace with smelting chain later." ]
}
```

---

## 11) Repair & Upgrades (MVP stance)

- Repairs: disabled. Tools are replaced when durability reaches 0. Hide/disable any repair UI tab in Sprint 1. Future: repair kits that restore partial durability with efficiency loss.
- Upgrades: none in MVP. Future pass may add reinforced variants (T2 → T2+) with improved swing and stamina efficiency.

---

## 12) UI/UX Notes

- Hotbar tool frame tinted by ui.frame.* from color-palette.json:
  - T1: ui.frame.copper
  - T2: ui.frame.brass
  - T3: ui.frame.crystal
- Tooltip shows mining capability: “Cuts ≤ 4” / “Cuts ≤ 5” / “Cuts ≤ 7”
- Crafting UI:
  - Station filter active by stationId
  - Recipes discoverability: unlockedByDefault = true for all three
  - Craft enable-state per §4; insufficient inputs highlight in red; missing station greyed
- Mining reticle state:
  - Eligible tile: normal
  - Ineligible hardness: disabled state + hover tooltip (“Need stronger tool”)

---

## 13) Integration Plan & Testing

Implementation
- MiningSystem MVP:
  - Check stamina gate (combat §4 stamina pool)
  - Check eligibility (tool.miningPower vs Tile.hardness)
  - Apply progress, spawn Break, decrement durability
  - Emit events per §8; bridge to AudioEventBridge and UIEventBridge
- CraftingSystem MVP:
  - Load recipes.json (schema §9)
  - Station interaction per §4
  - Consume inputs, schedule craft by timeMs, deliver output to Inventory
- ECS glue:
  - Tile.hardness from worldgen (cave-gen §Tiles/Hardness); respect Three‑Wide vein geometry; mining affects correct tile position(s)

Unit tests
- Eligibility: deny when hardness > miningPower; allow otherwise
- Stamina: deny on low stamina; no durability/progress spent
- Durability: decrements exactly per swing/pulse; tool breaks at 0 and unequips
- Progress: verify Break after expected swings/pulses given stats and tileFactor
- Events: correct event emission order and payloads

Balancing checks (human-in-loop)
- T1 vs rock(3): 3–4 swings target
- T1 vs copper(4): 4–5 swings target
- T2 vs iron(5): 3–4 swings target
- T3 drill vs quartz(6–7): sustained bite time aligns with stamina drain expectations

---

## 14) Risks & Dials

Risks
- Worldgen TileData.hardness finalization affects pacing
- Ore spawn density shifts resource economy and recipe throughput
- Audio state machine drift with drill pulse timing

Tunable dials (safe ranges)
- progressPerSwing: ±0.02
- swingIntervalMs: ±40 ms
- drill progressPerPulse: ±0.01
- stamina costs: ±2
- tileFactor baseline/scale: ±0.1 / ±0.02

---

## 15) Acceptance Checklist

- Recipe schema defined; three concrete recipes provided; ids consistent and parseable
- Tool ids and numbers match data/items/tools.json (v1)
- Mining eligibility, stamina, and durability rules specified
- Events mapped to Audio/UI bridges; UI tokens resolve
- MVP calls called out: repairs off; all three recipes unlocked by default
- Workbench chain functional: Workbench → Forge → Steamworks

— Gearwright Steamforge, bolts tight and gauges green.