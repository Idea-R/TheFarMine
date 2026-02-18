# The Far Mine — Mining Tools & Crafting MVP v0.1 (Sprint 1)

Owner: Gearwright Steamforge (Delta)  
Version: 0.1 • Date: 2026-02-18

## 1) Title & Scope
- Scope: MVP vertical slice for Mine Level 1 covering:
  - Pickaxe progression T0 → T2
  - Basic workbench/forge steps
  - Three starter recipes
- Approach: Data-first implementation with ECS hooks and load-time validation. Designers author JSON; engine binds via item-schema and recipe contracts.

## 2) Design Goals & Constraints
- Clear, paced unlocks via mining_power vs tile.hardness bands:
  - rock=3, ore.copper=4, ore.iron=5, ore.quartz=7
- Session pacing (60–90 min): reach T2 Reinforced by session end with optional sidetrack
- No repair loop (repairable=false in MVP)
- Acyclic crafting dependencies
- All item ids dot-delimited and conform to data/items/item-schema.json (version=1)

## 3) Core Data Contracts (with links)
- Reference schema: data/items/item-schema.json (version=1)
  - Kinds: "material", "component", "tool" (others reserved)
  - Tool fields (min set for MVP): id, kind, name, tool_type, tier, mining_power, mining_speed, durability_max, stamina_per_swing, repairable
  - Invariants and clamps (enforced at load):
    - id: ^[a-z][a-z0-9]*(\.[a-z0-9]+)+$ (dot-delimited)
    - name: 1–48 chars
    - kind: enum
    - tool_type: enum("pick","drill")
    - tier: int [0..9]
    - mining_power: int [0..10]
    - mining_speed: number (float) (0.1..5.0]
    - durability_max: int [1..9999]
    - stamina_per_swing: int [0..100]
    - repairable: boolean (MVP: false)
    - Tools are non-stackable (stack_max=1 if applicable in schema)
- Runtime files to be provided:
  - data/items/tools.json — tool definitions
  - data/crafting/recipes.json — crafting recipes
  - Both must be strict JSON and validate under item-schema (tools) and recipe shape (below).
- Recipe JSON shape (for data/crafting/recipes.json) — exact field order:
  - version:int=1
  - meta:{ author:string, updated:ISO8601, notes:array<string> }
  - recipes: array<Recipe> where each Recipe has, in order:
    1) id:string (e.g., "recipe.tool.pick.t1.copper")
    2) name:string (UI ≤ 48 chars)
    3) workstation:string enum("workbench","forge","steam_workshop")
    4) requiresTier:int (workstation tier; MVP uses 1)
    5) inputs: array<{ id:string, qty:int≥1 }>
    6) outputs: array<{ id:string, qty:int≥1 }>
    7) time_sec:number (craft duration; MVP can be 0 for instant)
    8) notes:array<string>
- Tools JSON shape (for data/items/tools.json):
  - version:int=1
  - meta:{ author:string, updated:ISO8601, notes:array<string> }
  - items: array<Item> following item-schema with kind:"tool" (fields emitted in schema order)

Example (illustrative; ensure schema order if different):

Code:
{
  "version": 1,
  "meta": { "author": "Delta", "updated": "2026-02-18T00:00:00Z", "notes": ["MVP Sprint 1 tools"] },
  "items": [
    {
      "id": "tool.pick.t0.starter",
      "kind": "tool",
      "name": "Starter Pickaxe",
      "tool_type": "pick",
      "tier": 0,
      "mining_power": 3,
      "mining_speed": 1.0,
      "durability_max": 100,
      "stamina_per_swing": 8,
      "repairable": false
    },
    {
      "id": "tool.pick.t1.copper",
      "kind": "tool",
      "name": "Copper Pickaxe",
      "tool_type": "pick",
      "tier": 1,
      "mining_power": 4,
      "mining_speed": 1.1,
      "durability_max": 120,
      "stamina_per_swing": 8,
      "repairable": false
    },
    {
      "id": "tool.pick.t2.reinforced",
      "kind": "tool",
      "name": "Reinforced Pickaxe",
      "tool_type": "pick",
      "tier": 2,
      "mining_power": 5,
      "mining_speed": 1.2,
      "durability_max": 180,
      "stamina_per_swing": 9,
      "repairable": false
    }
  ]
}

Example recipe file (field order exact):

Code:
{
  "version": 1,
  "meta": { "author": "Delta", "updated": "2026-02-18T00:00:00Z", "notes": ["MVP Sprint 1 recipes"] },
  "recipes": [
    {
      "id": "recipe.binding.copper",
      "name": "Copper Binding",
      "workstation": "workbench",
      "requiresTier": 1,
      "inputs": [ { "id": "mat.scrap.metal", "qty": 2 }, { "id": "mat.ore.copper", "qty": 1 } ],
      "outputs": [ { "id": "mat.binding.copper", "qty": 1 } ],
      "time_sec": 2.0,
      "notes": ["Simple metal strap with copper rivets."]
    },
    {
      "id": "recipe.tool.pick.t1.copper",
      "name": "Copper Pickaxe",
      "workstation": "forge",
      "requiresTier": 1,
      "inputs": [ { "id": "mat.ore.copper", "qty": 8 }, { "id": "mat.binding.copper", "qty": 1 }, { "id": "mat.shaft.wood", "qty": 1 } ],
      "outputs": [ { "id": "tool.pick.t1.copper", "qty": 1 } ],
      "time_sec": 5.0,
      "notes": ["First meaningful upgrade; unlocks copper."]
    },
    {
      "id": "recipe.tool.pick.t2.reinforced",
      "name": "Reinforced Pickaxe",
      "workstation": "forge",
      "requiresTier": 1,
      "inputs": [ { "id": "tool.pick.t1.copper", "qty": 1 }, { "id": "mat.ore.iron", "qty": 6 }, { "id": "mat.binding.copper", "qty": 1 } ],
      "outputs": [ { "id": "tool.pick.t2.reinforced", "qty": 1 } ],
      "time_sec": 6.0,
      "notes": ["Consumes prior tool; avoids inventory bloat; unlocks iron."]
    }
  ]
}

## 4) Tool Tiers and Stats
- Tier 0 — Starter Pickaxe (id: tool.pick.t0.starter)
  - tool_type:"pick", tier:0, mining_power:3, mining_speed:1.0, durability_max:100, stamina_per_swing:8, repairable:false
  - Allowed tiles: rock, floor (no ores) — gated by mining_power vs hardness
  - Intent: lets player open corridors and reach copper veins; slow on rock.
- Tier 1 — Copper Pickaxe (id: tool.pick.t1.copper)
  - tool_type:"pick", tier:1, mining_power:4, mining_speed:1.1, durability_max:120, stamina_per_swing:8, repairable:false
  - Unlocks copper ore nodes (hardness 4). Slightly faster.
- Tier 2 — Reinforced Pickaxe (id: tool.pick.t2.reinforced)
  - tool_type:"pick", tier:2, mining_power:5, mining_speed:1.2, durability_max:180, stamina_per_swing:9, repairable:false
  - Unlocks iron ore nodes (hardness 5). Noticeably sturdier.
- (Forward hook, non-MVP) Tier 3 — Steam Drill (id: tool.drill.t3.steam)
  - tool_type:"drill", tier:3, mining_power:6–7 (TBD), mining_speed:1.6, durability_max:240, stamina_per_swing:10
  - Requires steam_workshop; included for roadmap only, not craftable in MVP.

Compact table:

| Tier | ID                         | Power | Speed | Durability | Stamina/Swing | Unlocks           |
|-----:|----------------------------|------:|------:|-----------:|--------------:|-------------------|
| 0    | tool.pick.t0.starter       | 3     | 1.0   | 100        | 8             | Rock (h=3)        |
| 1    | tool.pick.t1.copper        | 4     | 1.1   | 120        | 8             | Copper (h=4)      |
| 2    | tool.pick.t2.reinforced    | 5     | 1.2   | 180        | 9             | Iron (h=5)        |
| 3*   | tool.drill.t3.steam (hook) | 6–7   | 1.6   | 240        | 10            | Quartz (h=7, TBD) |

## 5) Resource Nodes & Drops (MVP L1)
- node.ore.copper.vein
  - drops: mat.ore.copper (qty 1–2, mean ~1.4), rare mat.crystal.shard at p≈0.05
- node.ore.iron.seam (low frequency)
  - drops: mat.ore.iron (qty 1; rare 2 at p≈0.2)
- node.quartz.cluster (rare deco/resource)
  - drops: mat.gem.quartz (qty 1), needs tier≥3 (tease-only in MVP)
- Placement: align with cave-gen resource pass (see docs/world-generation/cave-gen-algorithm.md §10)
- Hardness bands: rock=3, ore.copper=4, ore.iron=5, ore.quartz=7

## 6) Starter Materials and Components (ids)
- Materials:
  - mat.ore.copper (common)
  - mat.ore.iron (uncommon)
  - mat.scrap.wood (common)
  - mat.scrap.metal (uncommon)
- Components:
  - mat.binding.copper (component; craftable at workbench)
  - mat.shaft.wood (component; gathered or starter grant)

## 7) MVP Recipes (3 concrete, acceptance-path)
- recipe.binding.copper
  - workstation:"workbench", requiresTier:1
  - inputs: mat.scrap.metal x2, mat.ore.copper x1
  - outputs: mat.binding.copper x1
  - time_sec: 2.0
  - Notes: simple metal strap with copper rivets.
- recipe.tool.pick.t1.copper
  - workstation:"forge", requiresTier:1
  - inputs: mat.ore.copper x8, mat.binding.copper x1, mat.shaft.wood x1
  - outputs: tool.pick.t1.copper x1
  - time_sec: 5.0
  - Notes: first meaningful upgrade; unlocks copper.
- recipe.tool.pick.t2.reinforced
  - workstation:"forge", requiresTier:1
  - inputs: tool.pick.t1.copper x1, mat.ore.iron x6, mat.binding.copper x1
  - outputs: tool.pick.t2.reinforced x1
  - time_sec: 6.0
  - Notes: consumes prior tool; avoids inventory bloat; unlocks iron.

## 8) Progression & Pacing Notes
- Expected path (first 60–90 min):
  - Starter grants tool.pick.t0.starter. Mine rock to reach copper veins; craft binding.copper; forge tool.pick.t1.copper within 15–25 min.
  - With copper pick, access more copper and occasional iron seam; upgrade to tool.pick.t2.reinforced by 45–75 min depending on luck and routing.
- Ore needs (nominal):
  - Copper Pick: ~8 copper + 1 binding (binding consumes 1 copper + 2 scrap.metal) → total ~9 copper, ~2 scrap.metal, 1 wood shaft.
  - Reinforced: 6 iron + 1 binding + prior pick.
- Durability:
  - T0≈100, T1≈120, T2≈180. No repairs in MVP; durability at 0 disables mining (equip allowed but ineffective).

## 9) System Diagram & ECS Hooks
Components:
- Tool { tool_id, mining_power, stamina_per_swing, durability, durability_max }
- Inventory
- Stamina
- Tile { kind, hardness }
- OreVein { ore_id, richness }

Events:
- MineHitEvent { pos, tool, power, material_tag }
- PlaySfxEvent { tag, pos }

ASCII flow:

[Input: Mine Tile]
   │
   ▼
[MiningSystem]
   │  checks: stamina >= cost AND durability > 0
   │
   ├─ if mining_power >= tile.hardness → success
   │     ├─ mutate Tile (rock→floor; ore.*→floor)
   │     ├─ spawn drops to Inventory (per OreVein.richness/drop table)
   │     ├─ Tool.durability -= 1
   │     ├─ Stamina -= stamina_per_swing
   │     └─ emit MineHitEvent(material_tag), PlaySfxEvent(sfx.mine.hit.[material])
   │
   └─ else → fail
         └─ emit PlaySfxEvent(sfx.mine.clink), optional UI hint

MiningSystem (stub contract):
- Input: player action targets a tile; check stamina ≥ cost and tool.durability > 0.
- Compute effective power = tool.mining_power; if power ≥ tile.hardness → apply damage/clear logic: rock→floor; ore.* emits pickup to Inventory.
- On success: decrement durability by 1; spend stamina = tool.stamina_per_swing; emit MineHitEvent with material tag for Audio.
- On fail (insufficient power or stamina): emit clink SFX and optional UI hint (out-of-scope for MVP).

Audio mapping per docs/audio-systems/audio-design.md:
- MineHitEvent routes to sfx.mine.hit.[material].v* (e.g., stone, metal, crystal).

## 10) Validation & Tests (DoD)
Data loads:
- item files conform to item-schema.json; recipe ids reference valid item ids.
- Recipe field order exact; workstation enum valid; requiresTier=1.

Unit checks (JS prototype/Rust harness):
- mining_power gating:
  - tool.pick.t0.starter cannot damage ore.copper (h=4); tool.pick.t1.copper can.
  - tool.pick.t1.copper cannot damage ore.iron (h=5); tool.pick.t2.reinforced can.
- stamina spend: action blocked if stamina < cost; stamina regen (combat spec) unaffected by mining tick.
- durability: decrements per successful mine; mining disabled at 0.
- recipe path computable: starter → binding.copper → tool.pick.t1.copper → tool.pick.t2.reinforced.
- drop tables: copper vein yields 1–2 copper; quartz requires tier≥3 and yields none if underpowered (tease visual remains).

## 11) Risks & Assumptions
- Hardness numbers locked to cave-gen spec (rock=3, copper=4, iron=5, quartz=7). If these change, update mining_power values.
- No smelting loop in MVP; ores craft directly into tools to reduce surface area and UI complexity.
- Steam Drill reserved for post-MVP to avoid UI/system sprawl and steam_workshop scope creep.
- Tools are non-repairable in MVP; ensure UI suppresses repair affordances.

## 12) Next Deliverables (by Delta)
- data/items/tools.json — includes:
  - tool.pick.t0.starter, tool.pick.t1.copper, tool.pick.t2.reinforced with stats listed here.
- data/crafting/recipes.json — includes the 3 recipes above with schema described.
- Optional: data/items/materials.json for referenced materials/components if owners prefer separation.

Appendix: Hardness vs Power quick ref
- rock: hardness 3 → requires mining_power ≥ 3
- ore.copper: hardness 4 → requires mining_power ≥ 4
- ore.iron: hardness 5 → requires mining_power ≥ 5
- ore.quartz: hardness 7 → requires mining_power ≥ 7

Forge hot and schema strict—Gearwright out.