# The Far Mine — Tools & Crafting (Sprint 1 v0.1)

Author: Gearwright Steamforge (Delta)
Version: v0.1
Date: 2026-02-19
Status: Draft v0.1

Scope: MVP vertical slice (Mine L1), 2D side-view, Tier 0–2 tools, 3 starter recipes, basic workbench rules. Aligns to P4 contracts and data/components.


## 1) Title & Metadata

- Title: The Far Mine — Tools & Crafting (Sprint 1 v0.1)
- Author: Gearwright Steamforge (Delta)
- Version/Date: v0.1 / 2026-02-19
- Status: Draft v0.1
- Scope:
  - MVP vertical slice (Mine L1) in 2D side-view.
  - Tool tiers covered: T0–T2 (pick class only).
  - Three starter recipes and basic workbench station.
  - Align to P4 contracts and data/components; loader-safe JSON contracts.
  - Unblocks data entry for items and recipes; integrates with Bevy ECS events.


## 2) Assumptions & Contracts

- Engine: Bevy + ECS per P4.
- World scale: Tile size = 16 px; 1 tile = 1.0 world unit.
- Core components (see data/core/component-schemas.json):
  - inventory
  - tool
  - ore_vein
  - tile
  - stamina
- Events (event-bus messaging, fire-and-forget):
  - UiCommand { action: "craft", payload: { recipe_id: string, times: int >= 1 } }
  - MineHitEvent { pos: Vec2, tool: Entity|nil, power: number }
  - PlaySfxEvent { tag: string, pos: Vec2|nil }
- Tick: 60 Hz fixed step.
- Persistence: JSON save/load; items/recipes defined under data/.
- Audio/visual tokens use cross-file string tokens; no hard-coded asset paths in systems.


## 3) Item JSON Schema (Data Contract)

File location: data/items/*.json
- Each file may contain one or many item records (array). Tools, materials, and parts share a base shape.

Base fields (all):
- id: token (unique, required). Example: "tool.pick.t0.rough"
- type: "tool" | "material" | "part"
- name: string (human-readable)
- tier: int >= 0, nullable for materials/parts (use null if N/A)
- stackable: bool
- max_stack: int >= 1 (ignored if stackable=false; still validate)
- weight: number >= 0 (carry weight units; data-only, balancing later)
- tags: array<string> (classification, e.g., ["pick","metal"])
- icon_token: token (atlas or sprite key; e.g., "icon.tool.pick.t0.rough")
- value: int >= 0 (sell price hint; economy placeholder)

Tool-only fields (present when type="tool"):
- tool_class: "pick" | "drill"
- mining_power: number >= 0 (effective vs Tile.hardness)
- mining_speed: number > 0 (tiles/sec target vs hardness 1.0; used as timing hint)
- durability_max: int >= 1
- attack_power: number >= 0 (melee placeholder)
- repairable: bool
- repair_costs: array<{ id: token, qty: int >= 1 }> (optional if repairable=false)

Material/part fields (present when type="material" or "part"):
- rarity: "common" | "uncommon" | "rare" | "epic" | "legendary"
- refine_yield: int >= 1 (optional; for future furnace loop)

Validation hints:
- id_pattern: ^[a-z0-9]+(\.[a-z0-9]+)*$ (lowercase, dot-delimited namespaces)
- name length: 1..64
- tags length: 0..16; tag token pattern matches id_pattern
- numeric clamps:
  - tier >= 0 or null
  - max_stack 1..999
  - weight 0..100
  - mining_power 0..10
  - mining_speed 0.1..10
  - durability_max 1..9999
  - attack_power 0..100
  - value 0..1_000_000
- Cross-file alignment:
  - icon_token must exist in UI atlas registry.
  - Audio tag references (via systems) use tokens like "sfx.pickup.ore" and "ui.click".
  - tool_class must match system routing logic (mining uses "pick" in Sprint 1).

Example items (illustrative only; real data in data/items/tools.json and data/items/materials.json):
```json
[
  {
    "id": "tool.pick.t0.rough",
    "type": "tool",
    "name": "Starter Pickaxe",
    "tier": 0,
    "stackable": false,
    "max_stack": 1,
    "weight": 2.5,
    "tags": ["pick", "starter"],
    "icon_token": "icon.tool.pick.t0.rough",
    "value": 10,
    "tool_class": "pick",
    "mining_power": 1.0,
    "mining_speed": 0.9,
    "durability_max": 60,
    "attack_power": 4,
    "repairable": false,
    "repair_costs": []
  },
  {
    "id": "material.ore.copper",
    "type": "material",
    "name": "Copper Ore",
    "tier": null,
    "stackable": true,
    "max_stack": 99,
    "weight": 0.2,
    "tags": ["ore", "copper"],
    "icon_token": "icon.material.ore.copper",
    "value": 2,
    "rarity": "common",
    "refine_yield": 1
  }
]
```


## 4) Tool Tiers & Stats (MVP)

Intended feel (vs Tile.hardness rock:1.0..1.4; ore_copper:1.2..1.6):
- T0: tool.pick.t0.rough (Starter Pickaxe) — mining_power ≈ 1.0, mining_speed ≈ 0.9, durability_max ≈ 60, attack_power ≈ 4.
- T1: tool.pick.t1.copper (Copper Pickaxe) — mining_power ≈ 1.6, mining_speed ≈ 1.1, durability_max ≈ 120, attack_power ≈ 5.
- T2: tool.pick.t2.bronze (Bronze Pickaxe) — mining_power ≈ 2.1, mining_speed ≈ 1.25, durability_max ≈ 180, attack_power ≈ 6.

ASCII table:
```
id                         | tier | mining_power | mining_speed | durability_max | tool_class | notes
---------------------------|------|--------------|--------------|----------------|------------|-------------------------------
tool.pick.t0.rough         | 0    | 1.0          | 0.9          | 60             | pick       | Starter kit; barely nicks ore
tool.pick.t1.copper        | 1    | 1.6          | 1.1          | 120            | pick       | Smooths early copper veins
tool.pick.t2.bronze        | 2    | 2.1          | 1.25         | 180            | pick       | Prototype; pacing gate optional
```

Balance notes:
- Verify against Deepdelver’s finalized hardness bands; adjust mining_power ±0.1–0.2 as needed.
- mining_speed is a timing hint; effective break time should decrease monotonically per tier for same tile.


## 5) Resource Nodes & Drops

MVP tokens and nodes:
- mat.ore.copper (tile palette token: tile.rock.ore.copper)
  - Drops: item "material.ore.copper", qty 1–3 per break, scaled by ore_vein.richness.
- material.part.handle.wood (crafted/looted)
- material.binding.twine (crafted/looted; not used in Sprint 1 recipes)
- material.ingot.copper (future refine; for MVP, ore used directly where stated)

Drop rules:
- On MineHitEvent that reduces a vein tile’s HP to break threshold, if tool tier/power sufficient:
  - Emit inventory pickups: N x "material.ore.copper".
  - Emit PlaySfxEvent { tag: "sfx.pickup.ore", pos: tile_center }.
  - Decrement ore_vein.richness by 1 per tile break; remove vein entity when richness <= 0.
- Tool sufficiency:
  - Require tool_class == "pick".
  - Effective_break_power = tool.mining_power - tile.hardness; must be >= 0 (non-negative) to permit progress.
  - Progress per swing/time derived from mining_speed and Effective_break_power (see Algorithms).


## 6) Crafting System (Workbench Mechanics)

Stations:
- workbench.t0 (field bench): enables basic recipes listed below. Higher stations (forge/workshop) deferred.

Craft action contract:
- UiCommand {
    action: "craft",
    payload: { recipe_id: string, times: int >= 1 }
  }
- CraftSystem flow:
  - Validate station availability: player is within interaction of required station tier.
  - Validate blueprint flags if specified (MVP: all 3 recipes are unlocked at workbench.t0).
  - Check inventory for inputs x times.
  - Consume inputs, enqueue/produce outputs.
  - Emit PlaySfxEvent "ui.click" on accept; optionally "sfx.mining.hit.rock.light" as placeholder craft-foley.

Gating:
- Each recipe declares required station: "workbench.t0".
- No skill checks in Sprint 1. Blueprints optional flag not used (default unlocked).


## 7) Starter Recipes (3) — data/crafting/recipes.json mapping

Data contract (array of records):
- id: token (e.g., "recipe.tool.handle.wood")
- station: token ("workbench.t0")
- time_sec: number >= 0
- inputs: array<{ id: token, qty: int >= 1 }>
- outputs: array<{ id: token, qty: int >= 1 }>
- flags: optional object (e.g., { unlocked: true })

Starter set:
- recipe.tool.handle.wood
  - inputs: [{ material.wood.stick: 2 }]
  - outputs: [{ material.part.handle.wood: 1 }]
  - station: workbench.t0
  - time_sec: 2
- recipe.tool.pick.t0.rough
  - inputs: [{ material.part.handle.wood: 1 }, { material.wood.stick: 1 }]
  - outputs: [{ tool.pick.t0.rough: 1 }]
  - station: workbench.t0
  - time_sec: 4
- recipe.tool.pick.t1.copper
  - inputs: [{ tool.pick.t0.rough: 1 }, { material.ore.copper: 6 }]
  - outputs: [{ tool.pick.t1.copper: 1 }]
  - station: workbench.t0
  - time_sec: 6
  - Notes: No smelting loop in MVP; treat ore as direct input.

Example JSON snippet (illustrative; file: data/crafting/recipes.json):
```json
[
  {
    "id": "recipe.tool.handle.wood",
    "station": "workbench.t0",
    "time_sec": 2,
    "inputs": [{ "id": "material.wood.stick", "qty": 2 }],
    "outputs": [{ "id": "material.part.handle.wood", "qty": 1 }],
    "flags": { "unlocked": true }
  },
  {
    "id": "recipe.tool.pick.t0.rough",
    "station": "workbench.t0",
    "time_sec": 4,
    "inputs": [
      { "id": "material.part.handle.wood", "qty": 1 },
      { "id": "material.wood.stick", "qty": 1 }
    ],
    "outputs": [{ "id": "tool.pick.t0.rough", "qty": 1 }],
    "flags": { "unlocked": true }
  },
  {
    "id": "recipe.tool.pick.t1.copper",
    "station": "workbench.t0",
    "time_sec": 6,
    "inputs": [
      { "id": "tool.pick.t0.rough", "qty": 1 },
      { "id": "material.ore.copper", "qty": 6 }
    ],
    "outputs": [{ "id": "tool.pick.t1.copper", "qty": 1 }],
    "flags": { "unlocked": true }
  }
]
```

ASCII dependency graph:
```
material.wood.stick ──> material.part.handle.wood ──> tool.pick.t0.rough ──> tool.pick.t1.copper
          (x2)                     (x1)                     (+ stick x1)            (+ ore.copper x6)
```


## 8) Progression & Pacing (60–90 min MVP)

- First 10–15 min: gather sticks, craft handle, craft rough pick.
- 20–35 min: mine copper ore with rough pick, craft copper pick.
- 45–60 min: optional bronze path prototype (stub recipe; not required for M3).
- Target copper upgrade loop: ~8–12 copper ore tiles, depending on vein richness and rough pick durability.
  - With rough pick durability 60, account for 1 durability per successful mining tick (see Algorithms).


## 9) ECS Integration & Algorithms

Relevant component fields (subset used here):
- tool { id, tool_class, tier, mining_power, mining_speed, durability: int, durability_max: int, attack_power }
- stamina { current: number, max: number, regen_per_sec: number, cost_per_swing: number }
- tile { token: string, hardness: number, hp: number, break_threshold: number }
- ore_vein { richness: int, drop_id: token, drop_min: int, drop_max: int }
- inventory { stacks: [{ id: token, qty: int, max_stack: int }] }

Mining check pseudocode:
```
on MineHitEvent(pos, tool, power):
  tile = lookup_tile_at(pos)
  if tool is nil or tool.tool_class != "pick":
    return  // no mining

  if tool.durability <= 0:
    emit PlaySfxEvent("ui.click", pos)  // dull thunk
    return

  if stamina.current < stamina.cost_per_swing:
    return  // too tired

  eff = tool.mining_power - tile.hardness
  if eff < 0:
    return  // tool too weak for this tile

  // Time/progress model: progress per tick scales with mining_speed and eff
  // Normalize eff floor to small epsilon to avoid zero division
  eff_norm = max(eff, 0.05)
  progress_per_tick = tool.mining_speed * eff_norm / 60.0  // tiles per tick vs hardness 1
  tile.hp -= progress_per_tick

  stamina.current -= stamina.cost_per_swing
  if tile.hp <= tile.break_threshold:
    break_tile(tile)
    tool.durability -= 1
    if tile.token == "tile.rock.ore.copper":
      drops = roll_qty(ore_vein.drop_min, ore_vein.drop_max, ore_vein.richness)
      add_to_inventory("material.ore.copper", drops)
      emit PlaySfxEvent("sfx.pickup.ore", pos)
      ore_vein.richness -= 1
      if ore_vein.richness <= 0:
        despawn(ore_vein.entity)
  else:
    // partial hit still costs stamina; only decrement durability on successful break
    pass
```

Craft validation pseudocode:
```
on UiCommand(action="craft", payload):
  recipe = recipes[payload.recipe_id]
  if not recipe:
    return
  if not is_station_available(recipe.station):
    return
  times = max(1, payload.times)
  if not inventory_has_all(recipe.inputs, times):
    return
  consume_inputs(recipe.inputs, times)
  produce_outputs(recipe.outputs, times)
  emit PlaySfxEvent("ui.click", player_pos)
  // Optional craft foley placeholder:
  emit PlaySfxEvent("sfx.mining.hit.rock.light", player_pos)
```

Notes:
- Durability decremented on successful tile break only (not on every swing) for MVP clarity.
- Stamina regenerates outside of this spec; ensure cost_per_swing is small (e.g., 1–3) for pacing.


## 10) Test Plan (MVP)

Data validation:
- Validate item JSON against schema (id_pattern, clamps).
- Ensure unique ids across all data/items/*.json.
- Ensure icon_token and tags conform to token rules.

Unit-ish checks:
- Recipe path existence: from material.wood.stick to tool.pick.t1.copper via defined recipes.
- Simulate mining 10 rock tiles then 10 copper ore tiles with T0, T1, T2:
  - Measured average time-to-break must decrease monotonically with tier.
- Durability:
  - Confirm durability decrements by 1 per tile broken; never below 0.

Integration checks:
- MineHitEvent on break emits PlaySfxEvent "sfx.pickup.ore".
- UiCommand "craft" routes to CraftSystem; outputs appear in inventory; "ui.click" SFX plays.
- JSON save/load preserves tool durability and inventory stacks.


## 11) Risks & Mitigations

- Risk: World-gen hardness not final.
  - Mitigation: Expose mining_power and mining_speed purely as data; test against hardness bands and adjust.
- Risk: Smelting loop absent may confuse.
  - Mitigation: Direct ore usage in MVP recipes; clearly marked; add furnace in Sprint 2 with ingot conversion.
- Risk: Timing feels off due to eff_norm floor.
  - Mitigation: Tune epsilon and mining_speed to maintain responsiveness without stalling.


## 12) Acceptance Checklist

- Crafting dependencies are acyclic and form a valid upgrade path.
- Tool tiers T0–T2 defined with ids, stats, and notes.
- Example upgrade path computable: sticks → handle → rough pick → copper pick.
- JSON-ready schemas and sample items/recipes provided with validation hints.
- ECS hooks and events specified; pseudocode provided for mining and crafting.
- Basic test plan present for data, unit-ish behavior, and integration SFX routing.

Strike the iron, drive the rivets—data may proceed.