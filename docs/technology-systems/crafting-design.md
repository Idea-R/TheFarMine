# Crafting & Tool Progression — Gears, Grist, and Grind (Sprint 1)

Provenance
- Owner: @delta (Technology Systems — Gearwright Steamforge)
- Author: Gearwright Steamforge, Master of cogs, code, and careful clamps
- Cross-references:
  - docs/core-systems/ecs-architecture.md (§Components: Inventory, Tile.hardness)
  - docs/world-generation/cave-gen-algorithm.md (§3 Hardness bands, §12 Outputs)
  - docs/audio-systems/audio-design.md (§6 Event Bridge)
  - docs/visual-systems/style-guide.md (§10 UI-safe iconography)
  - data/items/tools.json
  - data/audio/sound-manifest.json (crafting.complete)
  - forthcoming src/systems/mining-system.js

---

## 1) Intent

By my brass-bound calipers: this specification delivers an implementation-ready Crafting and Tool Progression slice for Sprint 1. It defines tool gates, recipe data, station tiers, and the event bridges that bind to UI/Audio. It is aligned to ECS inventory, worldgen hardness bands, and the MiningSystem handshake.

---

## 2) Goals & Non-goals (MVP)

Goals
- a) Meaningful 3-step tool progression across hardness gates 3/4/5/7.
- b) Simple station tiering: workbench → forge → steamworks.
- c) Three starter recipes referencing stable ids (authoritative here).
- d) Deterministic JSON schemas for tools and recipes (key order and clamps).
- e) Clear event bridges: UI and Audio on craft start/complete/fail.

Non-goals
- Smelting/ingot loops and resource refinement chains.
- Fuel/pressure simulation for drills (no runtime fuel in MVP).
- Recipe discovery systems beyond default-known flags.

---

## 3) Resource Taxonomy (Authoritative MVP IDs)

Categories and stable ids used by recipes; these ids must be respected by Inventory and Crafting UI. No data file defined here; authoritative values are below.

- Ores/Crystals
  - mat.ore.copper
  - mat.ore.iron
  - mat.crystal.quartz
  - Mapping to ore tiles: ore.copper, ore.iron, ore.quartz
- Components/Scrap
  - mat.scrap.copper
- Power
  - mat.core.steam (Steam Core)

Notes
- Worldgen hardness mapping (Level 1), per cave-gen-algorithm.md §3:
  - rock = 3
  - ore.copper = 4
  - ore.iron = 5
  - ore.quartz = 7
  - These teach our hardness gates and are mirrored by MiningSystem.
- Future: mat.ingot.* reserved; excluded from MVP.

---

## 4) Stations & Tiers (MVP Mechanics)

Stations (stable ids and baselines)
- station.workbench.t1 — Tier 1: basic assembly; 1-slot queue; craft time baseline 1.2–1.8 s per recipe.
- station.forge.t2 — Tier 2: metalwork; 1-slot queue; craft time baseline 1.8–2.4 s; required for iron-tier tools.
- station.steamworks.t3 — Tier 3: steam/mech assembly; 1-slot queue; craft time baseline 2.2–3.0 s; required for Steam Drill.

UI/UX (MVP)
- Stations present a simple recipe list filtered by station tier and known recipes.
- Disabled entries show exact unmet constraints (missing items, wrong station, insufficient qty).
- Emit mining.Deny sounds only in mining; crafting uses ui.error/confirm per audio spec.
- On craft start: deduct inputs atomically; on completion: deliver outputs; emit crafting.complete.

Audio bridge
- crafting.complete → ui.craft.complete (data/audio/sound-manifest.json).
- Clicks/confirm/error map to ui.click/ui.confirm/ui.error.

---

## 5) Tools & Hardness Gates (Authoritative Mapping)

Tool ids and fields per data/items/tools.json (already shipped)
- tool.pick.t1.basic — tier 1; kind=pick; miningPower 4 (eligible: rock 3, copper 4); miningSpeed 1.0; staminaCost 16; durabilityMax 60; swingMs 300.
- tool.pick.t2.reinforced — tier 2; kind=pick; miningPower 5 (adds iron 5); miningSpeed 1.15; staminaCost 15; durabilityMax 120; swingMs 300.
- tool.drill.t3.steam — tier 3; kind=drill; miningPower 7 (adds quartz 7); miningSpeed 1.35; staminaCost 12; durabilityMax 200; swingMs 220.
  - Notes: requires Steam Core; no runtime fuel in MVP.
- Eligibility rule (mirrored by MiningSystem): tool.miningPower >= Tile.hardness.
- Feel targets: T2 swing ≈15% faster than T1; T3 drill bites faster again with lower stamina per progress.

---

## 6) JSON Schemas (Authoritative, key order and clamps)

tools.json (reference parity; already implemented)
- File: data/items/tools.json
- Structure: JSON array of ToolDef with exact key order:
  - id
  - name
  - tier
  - kind
  - miningPower
  - miningSpeed
  - staminaCost
  - durabilityMax
  - durabilityPerHit
  - swingMs
  - notes
- Constraints:
  - tier ∈ {1,2,3}
  - kind ∈ {"pick","drill"}
  - miningPower ≥ 0
  - miningSpeed > 0
  - staminaCost ≥ 0
  - durabilityMax ≥ 1
  - durabilityPerHit ≥ 0
  - swingMs > 0
- Ensure parity with data/items/tools.json for authoritative values.

recipes.json (authoritative)
- File: data/crafting/recipes.json
- Top-level: strict JSON array of RecipeDef objects.
- Each RecipeDef uses this exact key order:
  1) id (string)
  2) name (string)
  3) stationId (string)
  4) stationTier (int)
  5) timeMs (int)
  6) inputs (array of { id: string, qty: int })
  7) outputs (array of { id: string, qty: int })
  8) unlock (object { knownByDefault: boolean })
- Clamps:
  - id, stationId non-empty strings.
  - timeMs ≥ 0.
  - inputs length ≥ 1; outputs length ≥ 1.
  - All qty ≥ 1.
  - stationTier ∈ {1,2,3} and must match the tier of stationId.
- Relations:
  - outputs reference existing item ids (e.g., tool.* from data/items/tools.json).
  - inputs reference material ids defined in §3.

Sample shape (illustrative only):
```json
{
  "id": "recipe.example.id",
  "name": "Display Name",
  "stationId": "station.workbench.t1",
  "stationTier": 1,
  "timeMs": 1500,
  "inputs": [ { "id": "mat.ore.copper", "qty": 1 } ],
  "outputs": [ { "id": "tool.pick.t1.basic", "qty": 1 } ],
  "unlock": { "knownByDefault": true }
}
```

Implementation clamps (loader)
- Validate key order when serializing; preserve insertion order when emitting to disk.
- Enforce station tier mapping table:
  - station.workbench.t1 → 1
  - station.forge.t2 → 2
  - station.steamworks.t3 → 3
- On parse failure, surface a structured error with path and reason; do not partially register recipes.

---

## 7) Starter Recipes (MVP — exact definitions)

Place the following exact array into data/crafting/recipes.json. Preserve key order and spacing as shown (order matters; spacing is flexible but recommended for diffs).

```json
[
  {
    "id": "recipe.tool.pick.t1.basic",
    "name": "Forge Basic Pickaxe",
    "stationId": "station.workbench.t1",
    "stationTier": 1,
    "timeMs": 1500,
    "inputs": [
      { "id": "mat.ore.copper", "qty": 8 },
      { "id": "mat.scrap.copper", "qty": 2 }
    ],
    "outputs": [
      { "id": "tool.pick.t1.basic", "qty": 1 }
    ],
    "unlock": { "knownByDefault": true }
  },
  {
    "id": "recipe.tool.pick.t2.reinforced",
    "name": "Forge Reinforced Pickaxe",
    "stationId": "station.forge.t2",
    "stationTier": 2,
    "timeMs": 2000,
    "inputs": [
      { "id": "mat.ore.iron", "qty": 8 },
      { "id": "mat.ore.copper", "qty": 4 }
    ],
    "outputs": [
      { "id": "tool.pick.t2.reinforced", "qty": 1 }
    ],
    "unlock": { "knownByDefault": false }
  },
  {
    "id": "recipe.tool.drill.t3.steam",
    "name": "Assemble Steam Drill",
    "stationId": "station.steamworks.t3",
    "stationTier": 3,
    "timeMs": 2400,
    "inputs": [
      { "id": "mat.ore.iron", "qty": 6 },
      { "id": "mat.crystal.quartz", "qty": 2 },
      { "id": "mat.core.steam", "qty": 1 }
    ],
    "outputs": [
      { "id": "tool.drill.t3.steam", "qty": 1 }
    ],
    "unlock": { "knownByDefault": false }
  }
]
```

Rationale
- T1 builds from nearby copper and scrap.
- T2 demands iron (new hardness gate) plus some copper.
- T3 introduces quartz + a Steam Core to sell the tech jump.
- No upgrade-consume of prior tool in MVP to keep logic simple.

---

## 8) Craft Flow & ECS Integration

Inventory ownership (ECS)
- Inventory component shape: Inventory { slots: [ItemStack], selectedIndex }
  - ItemStack: { id: string, qty: int } with qty ≥ 0.
- Craft system reads/writes Inventory; all qty clamped ≥ 0 after operations.

Action path (client-local MVP)
1) Player opens a station entity (has Station { id, tier }).
2) UI lists recipes filtered by station.tier and unlock.knownByDefault.
3) On selection, validate:
   - Station tier matches recipe.stationTier.
   - All inputs present with sufficient qty in Inventory.
4) On success:
   - Emit crafting.Start.
   - Deduct inputs immediately and atomically from Inventory.
   - Start a client-local craft timer for recipe.timeMs. Queue size = 1 per station; no background queue.
5) On completion:
   - Grant outputs into Inventory (stack into existing slots if possible).
   - Emit crafting.Complete (Audio: ui.craft.complete).
6) On failure:
   - Do not deduct anything; emit crafting.Fail with reason and route UI error.

Events (emit on bus)
- crafting.Start { playerId, stationId, recipeId, timeMs }
- crafting.Complete { playerId, stationId, recipeId, outputs:[{id,qty}] } → Audio maps to ui.craft.complete
- crafting.Fail { playerId, stationId, recipeId, reason:"no_inputs"|"wrong_station"|"unknown" } → UI maps to ui.error

UI bridges
- Badge stationTier on recipe list.
- Grey-out unmet with reasons:
  - “Need station tier X” when station mismatch.
  - “Missing: <item id> ×<qty>” for each deficit.
- Hover shows resource deltas (+/−) pre- and post-craft (predictive).
- Use UI-safe icons per style-guide §10.

---

## 9) MiningSystem Handshake (for context)

- Eligibility rule: tool.miningPower >= Tile.hardness (3/4/5/7), per worldgen doc.
- Mining performance:
  - miningSpeed multiplier and staminaCost per data/items/tools.json.
  - Durability decremented by durabilityPerHit on successful progress tick.
- Events per audio-design.md:
  - mining.Swing (per kind: pick/drill)
  - mining.Progress (material-specific hit feedback)
  - mining.Break (tile destroyed)
  - mining.Deny (wrong tool power or stamina)
- Audio mapping examples:
  - mining.Swing.pick → sfx.mine.pick.swing
  - mining.Progress.ore.copper → sfx.mine.hit.ore.copper
  - mining.Break.ore → sfx.mine.break.ore
  - Deny routes per reason (insufficient power/stamina).

Note: forthcoming src/systems/mining-system.js must mirror the eligibility rule and feel targets from §5.

---

## 10) Balancing Notes & Dials

Adjustable dials
- recipe timeMs ±300 ms
- material qty ±2
- miningSpeed ±0.05
- staminaCost ±2

Targets
- T1 viable but stamina-taxing.
- T2 noticeably smoother (≈15% faster effective pace).
- T3 breezy on hardness 3/4/5; fair challenge on 7 (quartz).

Playtime intent
- First Steam Drill acquisition ≈ 25–40 minutes from fresh seed with average luck.
- Adjust via Steam Core rarity later (out of scope here).

---

## 11) Acceptance Checklist

- data/items/tools.json present and parses (3 entries; ids match §5).
- data/crafting/recipes.json parses; three recipes exactly as §7; key order matches §6 schema; stationTier aligns with stationId.
- Crafting UI can render stations and recipes; disabled states communicate unmet constraints clearly.
- Audio bridge: crafting.complete fires on success; ui.error on fail; ui.click/confirm on interactions.
- Mining gates align: tool.miningPower vs Tile.hardness per worldgen doc; player can feel progression across 3 tiers.

---

## 12) Future Hooks (Post-MVP)

- Smelting/refinement (ingots).
- Repair kits vs durability; workstation repair actions.
- Partial refunds on cancel.
- Tool mods (heads/hafts), sockets, and set bonuses.
- Blueprint discovery/tech tree gating.
- Station upgrades: multiple slots, parallel queues, automation modules.
- Pressure/fuel loop for advanced drills (steam/coal tanks, regulators).

---

## Appendix A) IDs Index (for engineers/UI)

Tools
- tool.pick.t1.basic
- tool.pick.t2.reinforced
- tool.drill.t3.steam

Stations
- station.workbench.t1
- station.forge.t2
- station.steamworks.t3

Materials
- mat.ore.copper
- mat.ore.iron
- mat.crystal.quartz
- mat.scrap.copper
- mat.core.steam

Events
- crafting.Start
- crafting.Complete
- crafting.Fail
- mining.Swing
- mining.Progress
- mining.Break
- mining.Deny

By gear and grit, this spec is ready to bolt into the codebase. Keep key orders true, gates tight, and the audio valves hissing on completion.