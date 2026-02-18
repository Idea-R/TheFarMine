# Crafting & Mining Tech — Gears, Grit, and Steam (Sprint 1)

Provenance
- Owner: @delta (Technology Systems — Gearwright Steamforge)
- Voice and authority: Gearwright Steamforge, your exacting steward of cogs, contracts, and capability.

Cross-references
- data/core/component-schemas.json (§Inventory, §Tile.hardness)
- docs/core-systems/ecs-architecture.md (§System Order — MiningSystem)
- docs/world-generation/cave-gen-algorithm.md (§Hardness bands; Tile.flags)
- data/world/biome-crystal-caverns.json (rock/ore hardness 3/4/5/7)
- docs/combat-systems/combat-design.md (§Stamina timings for parity)
- docs/visual-systems/style-guide.md (§Mining VFX tokens)
- docs/audio-systems/music-direction.md (§Events & Bridges note references)
- Future implementation target: src/systems/mining-system.js (adhere to contract herein)



## 1) MVP Goals & Scope

Goals
- 3-step tool progression that meaningfully gates resources by hardness:
  - Rock (3), Copper (4), Iron (5), Quartz (7)
- Three starter crafting recipes to bring players through the chain
- Workbench chain with simple enable gating: Workbench → Forge → Steamworks
- Clean data contracts:
  - items/tools.json (ToolDef array)
  - crafting/recipes.json (RecipeDef array)
- MiningSystem contract:
  - Eligibility check vs Tile.hardness
  - Stamina spend and regen delay on swing
  - Durability decrement and tool-break behavior
  - Progress ticks and tile break events

Out of scope (Sprint 1)
- Repairs UI flow (may stub or disable)
- Smelting loop beyond what’s required for the listed recipes
- Automation miners or background mining behaviors



## 2) Resource Types (MVP)

Authoritative item ids and notes
- mat.ore.copper
  - Acquisition: mine Copper tiles (hardness 4)
  - Stack: integer ≥0
- mat.ingot.copper
  - Acquisition: smelting (may be bypassed in MVP; see note below)
  - Stack: integer ≥0
  - Note: MVP may allow using ore directly in recipes in lieu of ingots
- mat.ore.iron
  - Acquisition: mine Iron tiles (hardness 5)
  - Stack: integer ≥0
- mat.ingot.iron
  - Acquisition: smelting (may be bypassed in MVP)
  - Stack: integer ≥0
- mat.crystal.quartz
  - Acquisition: mine Quartz veins (hardness 7)
  - Stack: integer ≥0
- mat.wood.plank
  - Acquisition: basic gather/salvage or vendor
  - Stack: integer ≥0
- mat.fiber.bundle
  - Acquisition: gather from flora or loot; used as binding
  - Stack: integer ≥0
- mat.steam.core
  - Acquisition: rare drop or vendor (MVP)
  - Stack: integer ≥0
- mat.scrap.copper
  - Acquisition: goblin loot/salvage; convertible to ingot at Forge if smelting enabled in MVP+1
  - Stack: integer ≥0
- mat.scrap.iron
  - Acquisition: goblin loot/salvage; convertible to ingot at Forge if smelting enabled in MVP+1
  - Stack: integer ≥0

MVP simplification note
- Where noted, ore may be a direct crafting input in lieu of ingots to avoid blocking on smelting loop in Sprint 1.



## 3) Stations & Workbench Mechanics

Stations and ids
- station.workbench.t1
  - Basic assembly
  - Availability: Tavern/workshop at start
- station.forge.t2
  - Metalworking and reinforcement
  - Unlock: after first delve return (flag) or via placed Forge prop
- station.steamworks.t3
  - Advanced mechanistry
  - Unlock: mid-MVP by flag or debug toggle for balance
  - Consumes mat.steam.core in recipes (no runtime fuel drain)

Station interaction rules (MVP)
- Each recipe declares a required station id; UI filters by available stations
- No sub-slot complexities; instant craft on click if ingredients present
- Error/disabled states:
  - "Missing station" — player lacks access to required station
  - "Insufficient materials" — inventory missing inputs
  - "Output inventory full" — optional string if inventory capacity blocks output (UI discretion, not required by contract)



## 4) Tool Tiers & Gates (Authoritative Numbers)

Eligibility rule (authoritative)
- A tool may attempt a mining action only if tool.miningPower ≥ target Tile.hardness

Tools
- tool.pick.t1.basic — Tier 1 Pickaxe
  - miningPower: 4 (mines Rock 3, Copper 4)
  - miningSpeed: 1.00×
  - staminaCostPerSwing: 16
  - durabilityMax: 60
  - durabilityPerHit: 1
  - swingMs: 300
  - Notes: [TUNE] values for cadence
- tool.pick.t2.reinforced — Tier 2 Reinforced Pickaxe
  - miningPower: 5 (adds Iron 5)
  - miningSpeed: 1.15×
  - staminaCostPerSwing: 15
  - durabilityMax: 120
  - durabilityPerHit: 1
  - swingMs: 300
  - Notes: [TUNE]
- tool.drill.t3.steam — Tier 3 Steam Drill
  - miningPower: 7 (adds Quartz 7)
  - miningSpeed: 1.35×
  - staminaCostPerSwing: 12 per bite
  - durabilityMax: 200
  - durabilityPerHit: 1
  - swingMs: 220
  - Crafting requirement: mat.steam.core per craft
  - Runtime fuel drain: none in MVP
  - Notes: [TUNE]

Hardness gates (from world-gen, locked for Sprint 1)
- Rock: 3
- Copper: 4
- Iron: 5
- Quartz: 7



## 5) Items/Tools Data Contract (data/items/tools.json)

File shape
- Strict JSON array of ToolDef objects.
- Each ToolDef requires keys in exact order as listed.
- Constraints
  - ids unique
  - numeric fields ≥0
  - tier ∈ {1,2,3}
  - miningPower integer
  - Aligns with MiningSystem contract

ToolDef object (exact key order and meaning)
- id: string (e.g., "tool.pick.t1.basic")
- name: string (display name)
- tier: int (1..3)
- kind: enum "pick" | "drill"
- miningPower: int (gate vs Tile.hardness)
- miningSpeed: number (1.0 baseline multiplier)
- staminaCost: int (per swing/bite)
- durabilityMax: int (max durability)
- durabilityPerHit: int (decrement per successful progress tick; default 1 if omitted, but include explicitly in MVP)
- swingMs: int (animation timing hint; ~300 pick, ~220 drill)
- notes: array of string (may be empty)

Authoritative ToolDefs to include (values from §4)
- tool.pick.t1.basic
  - name: "Basic Pickaxe"
  - tier: 1
  - kind: "pick"
  - miningPower: 4
  - miningSpeed: 1.0
  - staminaCost: 16
  - durabilityMax: 60
  - durabilityPerHit: 1
  - swingMs: 300
  - notes: []
- tool.pick.t2.reinforced
  - name: "Reinforced Pickaxe"
  - tier: 2
  - kind: "pick"
  - miningPower: 5
  - miningSpeed: 1.15
  - staminaCost: 15
  - durabilityMax: 120
  - durabilityPerHit: 1
  - swingMs: 300
  - notes: []
- tool.drill.t3.steam
  - name: "Steam Drill"
  - tier: 3
  - kind: "drill"
  - miningPower: 7
  - miningSpeed: 1.35
  - staminaCost: 12
  - durabilityMax: 200
  - durabilityPerHit: 1
  - swingMs: 220
  - notes: [ "Consumes mat.steam.core on craft", "No runtime fuel drain (MVP)" ]



## 6) MiningSystem Contract (Authoritative MVP Behavior)

Eligibility
- If tool.miningPower < target.Tile.hardness: deny action
- Emit mining.Deny with reason "insufficient_power"

Progress model
- On each confirmed mining action tick:
  - baseProgress = 1 unit per eligible hit (constant)
  - addedProgress = baseProgress × tool.miningSpeed
  - Accumulate progress per tile; when cumulative progress ≥ Tile.hardness, the tile breaks
- Multiple players can contribute; progress is per-tile accumulator (MVP: local to the instigator only if shared state is non-trivial; choose per implementation complexity — default single-player accumulator for Sprint 1)

Costs and decrements
- Stamina
  - On action start, spend tool.staminaCost
  - If insufficient stamina: deny with reason "no_stamina"
  - Apply Stamina.regenDelay += 600 ms (parity with combat doc) [TUNE]
- Durability
  - On each successful progress tick, decrement durability by durabilityPerHit
  - If durability reaches 0, emit item.DurabilityZero; cancel further mining with that tool until repaired/replaced
- Tile break
  - When cumulative progress ≥ Tile.hardness:
    - Emit mining.Break (tile), drop resolved by tileType/oreType
    - Reset tile progress accumulator and mark tile destroyed/replaced (world rules)

Action range
- If target out of permissible range/arc: deny with reason "out_of_range" (range constant shared with melee swing reach; see combat parity as reference)

Events (emit via bridges similar to combat)
- mining.Swing
  - { playerId:int, toolId:string, tileX:int, tileY:int, eligible:bool }
- mining.Progress
  - { playerId:int, toolId:string, tileX:int, tileY:int, added:int, total:int, threshold:int }
- mining.Break
  - { playerId:int, toolId:string, tileX:int, tileY:int, tileType:string, oreType:string }
- mining.Deny
  - { playerId:int, toolId:string, tileX:int, tileY:int, reason:"insufficient_power"|"no_stamina"|"out_of_range" }

Audio/VFX hooks
- Map events to sfx ids:
  - mining.Swing (eligible true): sfx.mine.pick.hit or sfx.mine.drill.bite by kind
  - mining.Swing (eligible false): sfx.mine.dull.thud
  - mining.Progress: sfx.mine.chip.rockA/B by surface
  - mining.Break: sfx.mine.rock.break (subtype by ore)
- VFX tokens per style guide:
  - effects.debris.rockA / effects.debris.rockB
  - Optional ore tint variants (effects.debris.copper, iron, quartz) if tokens exist; otherwise default rock

ECS touchpoints
- Reads
  - Player.Inventory (selectedIndex, tool item with durability extension)
  - Tile component (tileType, hardness, oreType, flags)
  - Player position/aim for range validation
- Writes
  - Stamina (value, regenDelay)
  - Tile state (progress accumulator, removal/replacement on break)
  - Events to Audio/UI bridges
- Tool durability storage
  - Track as Item extension metadata; UI exposure is sufficient for MVP if not fully componentized



## 7) Starter Recipes (data/crafting/recipes.json + Concrete 3)

File shape
- Strict JSON array of RecipeDef objects.
- Each RecipeDef uses the exact key order below.

RecipeDef object (exact key order and meaning)
- id: string (e.g., "recipe.tool.pick.t1.basic")
- name: string (display)
- station: string (station.* id)
- inputs: array of { itemId:string, qty:int }
- output: { itemId:string, qty:int }
- notes: array of string

Concrete recipes (authoritative for MVP)
- recipe.tool.pick.t1.basic
  - name: "Basic Pickaxe"
  - station: station.workbench.t1
  - inputs:
    - { itemId: mat.wood.plank, qty: 4 }
    - { itemId: mat.fiber.bundle, qty: 2 }
    - Prefer one of:
      - { itemId: mat.scrap.copper, qty: 2 }
      - or { itemId: mat.ore.copper, qty: 1 }
  - output:
    - { itemId: tool.pick.t1.basic, qty: 1 }
  - notes:
    - "Scrap copper or raw copper ore acceptable (choose one set)"
    - "No smelting required in MVP"
- recipe.tool.pick.t2.reinforced
  - name: "Reinforced Pickaxe"
  - station: station.forge.t2
  - inputs:
    - Primary metals:
      - { itemId: mat.ore.iron, qty: 3 }
      - or { itemId: mat.ingot.iron, qty: 2 }
    - Alloying/supplement:
      - { itemId: mat.ore.copper, qty: 2 }
    - Binding:
      - { itemId: mat.fiber.bundle, qty: 2 }
  - output:
    - { itemId: tool.pick.t2.reinforced, qty: 1 }
  - notes:
    - "Either iron ore or ingots acceptable (not both required)"
- recipe.tool.drill.t3.steam
  - name: "Steam Drill"
  - station: station.steamworks.t3
  - inputs:
    - { itemId: mat.steam.core, qty: 1 }
    - { itemId: mat.ingot.iron, qty: 4 } or { itemId: mat.ore.iron, qty: 6 }
    - { itemId: mat.crystal.quartz, qty: 2 }
  - output:
    - { itemId: tool.drill.t3.steam, qty: 1 }
  - notes:
    - "Consumes one steam core at craft time"
    - "Iron ore may substitute for ingots in MVP"

UI notes
- Show unavailable recipes grayed with:
  - Missing inputs explicitly listed with counts
  - Station gating message per §3: "Missing station"
- If alternative inputs exist, show a toggle/chooser or an “either/or” indicator in the recipe details panel



## 8) Acceptance & Balancing Notes

Acceptance
- JSON in items/tools.json and crafting/recipes.json parses cleanly
- Schemas follow defined key order and types
- Tool progression aligns with biome hardness gates (3/4/5/7) and feels meaningful
- MiningSystem contract implemented and testable end-to-end
- Stamina spend, regen delay, and durability interactions are clear and visible in UI

Initial balance targets [TUNE]
- Time-to-quartz access: 15–25 minutes for a skilled player following intended loop
- Durability longevity:
  - T1 ≈ 50–60 eligible hits (durabilityMax 60, per-hit cost 1)
  - T2 ≈ 120 hits
  - T3 ≈ 200 hits
- Stamina cadence:
  - Per swing/bite: 16/15/12
  - RegenDelay: +600 ms to keep mining distinct from combat actions



## 9) Data Examples (Inline, non-authoritative)

Example ToolDef (field order illustration, not a JSON block)
- id: "tool.pick.t1.basic"
- name: "Basic Pickaxe"
- tier: 1
- kind: "pick"
- miningPower: 4
- miningSpeed: 1.0
- staminaCost: 16
- durabilityMax: 60
- durabilityPerHit: 1
- swingMs: 300
- notes: []

Example RecipeDef (field order illustration, not a JSON block)
- id: "recipe.tool.pick.t1.basic"
- name: "Basic Pickaxe"
- station: "station.workbench.t1"
- inputs: [{ mat.wood.plank ×4 }, { mat.fiber.bundle ×2 }, plus either { mat.scrap.copper ×2 } or { mat.ore.copper ×1 }]
- output: { tool.pick.t1.basic ×1 }
- notes: ["Either scrap copper or copper ore acceptable"]



## 10) Integration & Testing Plan

Unit tests (names only)
- test_toolTier_gating()
- test_stamina_spend_and_regen_delay()
- test_durability_decrement_and_break()
- test_vein_depletion_threshold()

Bridges and event handshake
- Coordinate with AudioEventBridge and UI to confirm mining.* payloads as defined in §6
- Map sfx ids and VFX tokens per style guide; confirm fallbacks for missing ore variants
- Verify UI error strings for station/mats and out_of_range handling

World-gen dependency
- Confirm Tile.hardness per biome is stable and exposed via Tile component
- Locked for Sprint 1:
  - Rock 3, Copper 4, Iron 5, Quartz 7



## 11) Risks & Future Dials

Risks
- Missing smelt loop may compress T2 progression; resource value curve could flatten
- Repair loop TBD; tool attrition may feel punitive without clear recovery path
- Steam Drill without runtime fuel drain may feel overly generous at Tier 3

Future dials (safe ranges for iteration)
- miningSpeed: ±0.10
- staminaCost: ±2
- durabilityMax: ±20%
- recipe costs: ±1–2 units per input
- regenDelay: ±100–200 ms if combat cadence updates



## 12) Acceptance Checklist

- items/tools.json and crafting/recipes.json schemas defined and stable (key order enforced)
- Tool tiers and miningPower align with biome hardness gates (3/4/5/7)
- MiningSystem event payloads and cost semantics explicit and implemented
- Three starter recipes present, gated by stations, and sensible for MVP pacing

— Signed in soot and brass,
Gearwright Steamforge, Technology Systems