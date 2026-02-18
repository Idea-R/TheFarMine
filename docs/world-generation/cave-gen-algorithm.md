# The Far Mine — Cave Generation L1 (Sprint 1)

Owner: Deepdelver Caveborn (Beta)  
Version: v0.1.0 — 2026-02-18

## 1) Title & Scope
- Title: The Far Mine — Cave Generation L1 (Sprint 1)
- Owner: Deepdelver Caveborn (Beta). Version/date above.
- Scope: 2D side-view, tile-based cave layout for Mine Level 1 at target bounds 256x128 (MVP accepts 64x64/128x128 test sizes). Deterministic by seed, guarantees a solvable main path from spawn to exit, integrates room templates and ore seeding.

## 2) Design Goals & Constraints
- Goals:
  - Readable Three‑Wide corridors.
  - One main spine with 1–2 loops.
  - 90%+ tiles in main connected component.
  - Ore veins biased to pockets and rims.
- Hard constraints:
  - Corridor width=3 tiles minimum (Three‑Wide Law).
  - Min room size 7x5, max room size 25x17 (L1).
  - Corridor bend frequency ≤ 0.18/step.
  - Exit placed on far rim with path length ≥ 0.65*map_width.
- Bounds and budgets:
  - Default L1 bounds ~256x128; performance target <200 ms at 128x128 on dev laptop for default params.

## 3) High-Level Algorithm (overview)
- Pipeline phases:
  a) Seed and RNG substreams setup (global, rooms, CA, tunnels, ore, lamps/props).  
  b) Stamp room templates (weighted, rotatable) as anchors: tunnel segments, one cavern, 1–3 ore_pocket niches.  
  c) Carve connector tunnels between room doors using A* on rock/floor grid with Three‑Wide brush and turn penalty.  
  d) Cellular automata smoothing pass on cavern/tunnel edges, with approach-protect bands preserved.  
  e) Connectivity ensure pass: flood fill; if multiple components remain, punch minimal 3‑wide connectors along shortest Manhattan cutlines.  
  f) Place spawn and exit along main path extrema; optionally add 0–2 loop connectors respecting chokepoints spacing.  
  g) Resource pass: seed ore veins from 'O' preference tiles + stochastic rim bias; decorate with crystals/lamps per biome config.  
  h) Emit tilemap JSON + metadata; compute connectivity and golden hash for tests.

## 4) Deterministic RNG Plan
- PRNG: PCG32 (recommended) or XorShift32. Seed: u32.
- Substreams (derived via splitmix32 of seed): rng_rooms, rng_connectors, rng_ca, rng_ore, rng_props, rng_loops. Each substream initialized with splitmix32(seed + const_k) to avoid cross-correlation.
- Ordering guarantees:
  - All passes iterate in deterministic eid/scanline order; avoid hashmap iteration order.
  - Room stamping attempts sorted by template id then attempt index.
  - Door lists sorted (y, x, side).
  - Flood-fill, A*, and CA traverse row-major (y outer, x inner).

## 5) Data Contracts (Output)
Tilemap JSON schema (v0.1):
```
{
  version:int=1,
  meta:{ seed:u32, w:int, h:int, biome_id:string, algo_version:string, params:object },
  tiles: array<array<string>> h rows of w tokens from set ["rock","floor","ore.copper","ore.iron","ore.quartz","wall.crystal"],
  hardness: array<array<u8>> optional (same dims),
  flags: array<array<u32>> optional bitflags (ROOM_FLOOR=1<<0, DOOR_BAND=1<<1, APPROACH_PROTECT=1<<2, ORE_PREF=1<<3),
  anchors: { spawn:{x:int,y:int}, exit:{x:int,y:int}, rooms: array<{id:string,kind:string,rect:{x,y,w,h},doors:array<{x,y,side}>}> },
  stats: { main_component_ratio:number[0..1], loops:int, path_length:int }
}
```
- Emit order and determinism:
  - All arrays row-major, top-left origin, y then x.
  - Serialize tiles, hardness, flags, anchors, stats in fixed field order as shown.

## 6) Room Templates Integration
- Reference: data/world/room-templates.json (tunnel, cavern, ore_pocket).
- Stamping rules:
  - Allow 0/90/180/270 rotation honoring Three‑Wide door bands.
  - Enforce 1‑tile rock moat except at door bands; forbid overlaps beyond rock→rock merges; door bands must union seamlessly to corridors.
  - Respect approachDepth: mark first N cells as APPROACH_PROTECT; CA and pillar placement may not overwrite.
- Placement heuristics:
  - One central cavern (ovalA) biased to center±15% bounds.
  - 2–5 tunnel segments bridging to cavern.
  - 1–3 ore pockets branching off spine.

## 7) Corridor Carving Algorithm
- Representation:
  - Brush carve a 3‑wide corridor around a centerline path; fill floors (hardness 0), set flags ROOM_FLOOR.
  - Optional shoulder=1 clears a one-tile buffer of rock to floor where needed to resolve diagonal pinches; keep DOOR_BAND and APPROACH_PROTECT intact.
- Pathing:
  - Grid A* with cost = 1 per step + turn_penalty (e.g., 0.4) + rock_cost gradient near existing floors (hug_bias) to prefer hugging but not breaching approach bands.
  - Cells marked APPROACH_PROTECT have large additive cost (e.g., +50) rather than hard block to allow emergency connections in fallback.
- Turn limits:
  - Inject 5% chance to add a scenic bend; max 2 successive bends per connector.
  - Global bend frequency ≤ 0.18/step enforced by rejecting paths exceeding the ratio.

## 8) Cellular Automata (CA) Smoothing
- Cells:
  - Consider 5x5 neighborhood majority to decide rock/floor toggle only on perimeter cells (cells adjacent to both rock and floor); 1–2 iterations.
- Protect:
  - APPROACH_PROTECT and DOOR_BAND never toggled.
- Params:
  - floor_survive ≥ 13/25, floor_birth ≥ 16/25 for perimeter only.

## 9) Connectivity & Loop Policy
- Flood fill to compute components; ensure main component ratio ≥ 0.90 (reject/regenerate tunnels between closest door mouths if violated; cap 3 retries then fallback to direct carve).
- Loops:
  - Probability p_loop=0.35; enforce min choke spacing (≥ 12 tiles) and at most 2 loop connectors.

## 10) Resource & Feature Distribution (L1)
- Ore hardness bands:
  - rock=3, ore.copper=4, ore.iron=5, ore.quartz=7 (aligns with item-schema/tools).
- Vein seeding:
  - Copper: weight high near ore_pocket templates and cavern rims; vein size 5–12 tiles via random walk with backtracking, density clamp.
  - Iron: low chance in distant tunnels (depth scalar optional = 0.25..0.45 region), size 3–6.
  - Quartz: rare sparkle node on cavern rim/pillar tip; size 2–4.
- Decoration hooks (biome JSON):
  - Crystal growths on floor edges, lamp anchors every 18–24 tiles along spine, avoid doors and approach bands.

## 11) Parameters Table (defaults and ranges)
- map_w:int [64..256] default 128
- map_h:int [64..128] default 96
- room_counts: { tunnels:int[2..6]=4, caverns:int[1..1]=1, ore_pockets:int[1..3]=2 }
- a_star: { turn_penalty:0.4[0..1], hug_bias:0.2[0..0.6] }
- corridor: { width:int=3, shoulder:int=1 }
- ca: { iters:int=1..2=1, floor_survive:int=13, floor_birth:int=16, kernel:"5x5" }
- loops: { probability:0.35, max:int=2, min_choke_spacing:int=12 }
- ore: { copper_weight:1.0, iron_weight:0.25, quartz_weight:0.12, vein_walk_steps:[5,12] }
- lamps: { spacing_min:int=18, spacing_max:int=24 }

## 12) Biome Tags & Config Hook
- Default biome_id: "biome.crystal_caverns.l1"; point to data/world/biome-crystal-caverns.json for:
  - Tile palette tokens, ambient light color, decoration rules (crystal growth frequency, lamp color), ore weights overrides.

## 13) Pseudocode: generate_map(seed, w, h)
- Conventions: grid[y][x], row-major; tiles initialized to "rock", hardness=3, flags=0.

```
function generate_map(seed:u32, w:int, h:int, params)->Json:
  assert 64 <= w <= 256 and 64 <= h <= 128

  // 1) RNG setup
  rng_global = PCG32(seed)
  ss = splitmix32_streams(seed, ["rooms","connectors","ca","ore","props","loops"])
  rng_rooms = PCG32(ss["rooms"])
  rng_connectors = PCG32(ss["connectors"])
  rng_ca = PCG32(ss["ca"])
  rng_ore = PCG32(ss["ore"])
  rng_props = PCG32(ss["props"])
  rng_loops = PCG32(ss["loops"])

  // 2) Allocate buffers
  tiles = array[h][w] filled "rock"
  hardness = array[h][w] filled 3
  flags = array[h][w] filled 0
  doors = []            // populated from rooms and inferred connectors
  rooms = []            // anchors metadata
  door_bands = set()    // DOOR_BAND cells
  approach_protect = set()

  // 3) Place central cavern
  center = (x: clamp(int(w*0.5 + rand_uniform(rng_rooms,-0.15,0.15)*w), 16, w-16),
            y: clamp(int(h*0.5 + rand_uniform(rng_rooms,-0.15,0.15)*h), 12, h-12))
  cavern_template = pick_weighted(rng_rooms, templates.kind=="cavern")
  cav_rot = pick_rotation(rng_rooms, [0,90,180,270])
  cav_rect = propose_rect(center, cavern_template.size, cav_rot).clamped_within(w,h)
  if not place_room("cavern", cavern_template.id, cav_rot, cav_rect, tiles, flags, door_bands, approach_protect):
    // If central placement fails (unlikely with clamping), retry near center up to 5 times
    retry up to 5 with jitter; else abort with error

  // 4) Place tunnel segments (2..6) and ore pockets (1..3)
  target_tunnels = clamp(params.room_counts.tunnels, 2, 6)
  target_pockets = clamp(params.room_counts.ore_pockets, 1, 3)
  placed_tunnels = 0
  placed_pockets = 0
  attempts = 0
  while (placed_tunnels < target_tunnels or placed_pockets < target_pockets) and attempts < 64:
    attempts += 1
    kind = (placed_tunnels < target_tunnels) ? "tunnel" : "ore_pocket"
    tmpl = pick_weighted(rng_rooms, templates.kind==kind)
    rot = pick_rotation(rng_rooms, [0,90,180,270])
    // Bias near cavern for tunnels; bias branching off spine for ore pockets
    anchor = pick_anchor_for_kind(kind, rooms, tiles, rng_rooms)
    rect = propose_rect_near(anchor, tmpl.size, rot, w,h)
    if place_room(kind, tmpl.id, rot, rect, tiles, flags, door_bands, approach_protect):
      record_room_metadata(rooms, tmpl.id, kind, rect, doors_from_template(tmpl, rect, rot))
      if kind=="tunnel": placed_tunnels += 1 else placed_pockets += 1

  // 5) Connect doors with A* and carve 3-wide corridors
  door_pairs = plan_connectors(rooms, rng_connectors) // minimal graph to connect all rooms with a spine
  for (a,b) in door_pairs in deterministic_sorted_order:
    path = a_star_with_costs(a.pos, b.pos, tiles, flags, params.a_star, rng_connectors)
    path = enforce_turn_limits(path, max_ratio=0.18, rng=rng_connectors)
    carve_three_wide(path, tiles, hardness, flags, width=params.corridor.width, shoulder=params.corridor.shoulder)

  // 6) CA smoothing (1..2 iters)
  for iter in 1..params.ca.iters:
    perimeter = collect_perimeter_cells(tiles)
    nextTiles = tiles.clone()
    for (y,x) in perimeter in row_major:
      if flags[y][x] & (APPROACH_PROTECT|DOOR_BAND) != 0: continue
      neigh = count_floor_in_5x5(tiles, x,y)
      if tiles[y][x]=="floor":
        if neigh < params.ca.floor_survive: nextTiles[y][x]="rock"; hardness[y][x]=3
      else:
        if neigh >= params.ca.floor_birth: nextTiles[y][x]="floor"; hardness[y][x]=0; flags[y][x] |= ROOM_FLOOR
    tiles = nextTiles

  // 7) Connectivity ensure pass
  comp_map, comp_sizes = flood_fill(tiles)
  main_comp_id = argmax(comp_sizes)
  main_ratio = comp_sizes[main_comp_id] / count_floor(tiles)
  retries = 0
  while main_ratio < 0.90 and retries < 3:
    retries += 1
    // find closest pair of door mouths (or perimeter floor cells) between main and others
    pairs = shortest_manhattan_cutlines_between_components(comp_map, main_comp_id)
    for cut in pairs in increasing length:
      carve_three_wide(line_path(cut.a, cut.b), tiles, hardness, flags, width=3, shoulder=0)
      break
    comp_map, comp_sizes = flood_fill(tiles)
    main_comp_id = argmax(comp_sizes)
    main_ratio = comp_sizes[main_comp_id] / count_floor(tiles)
  if main_ratio < 0.90:
    // fallback: direct carve from farthest orphan centroid to nearest main cell
    orphan = argmax_non_main(comp_sizes)
    carve_three_wide(direct_line_path(centroid(orphan), nearest_main_cell(orphan)), tiles, hardness, flags, width=3, shoulder=0)
    comp_map, comp_sizes = flood_fill(tiles)
    main_comp_id = argmax(comp_sizes)
    main_ratio = comp_sizes[main_comp_id] / count_floor(tiles)

  // 8) Spawn/exit placement on main path
  main_graph = build_graph_from_component(tiles, main_comp_id)
  a = pick_centerish_node(main_graph, near=cavern_center)
  s, _ = farthest_node_bfs(main_graph, a)
  t, dist = farthest_node_bfs(main_graph, s)
  // Ensure exit on far rim and path length ≥ 0.65*map_w; shift to rim if needed
  spawn = clamp_to_walkable(s)
  exit  = shift_to_far_rim_if_needed(t, tiles, min_len=int(0.65*w), prefer_far_x = spawn.x < w/2 ? w-2 : 1)
  anchors = { spawn: spawn, exit: exit }

  // 9) Optional loop connectors (0..2)
  loop_count = 0
  if rand_float(rng_loops) < params.loops.probability:
    candidates = find_chokes_and_nearby_nodes(main_graph, min_spacing=params.loops.min_choke_spacing)
    for c in candidates in deterministic order:
      if loop_count >= params.loops.max: break
      if is_valid_loop(c, main_graph, tiles):
        path = a_star_with_costs(c.u, c.v, tiles, flags, params.a_star, rng_connectors)
        carve_three_wide(path, tiles, hardness, flags, width=3, shoulder=0)
        loop_count += 1

  // 10) Resource pass: ore seeding
  // Mark ORE_PREF tiles: template 'O' cells and cavern rim cells (floor with rock in 4-neighborhood)
  mark_ore_preferences(tiles, flags, rooms)
  // Copper
  copper_spawns = sample_pref_tiles(flags, ORE_PREF, rng_ore, count=estimate_from_area(w,h,weight=params.ore.copper_weight))
  for s in copper_spawns:
    seed_vein("ore.copper", s, steps=rand_int(rng_ore, params.ore.vein_walk_steps[0], params.ore.vein_walk_steps[1]), tiles, hardness, flags)
  // Iron
  iron_seeds = sample_distant_tunnels(tiles, anchors, rng_ore, weight=params.ore.iron_weight)
  for s in iron_seeds:
    seed_vein("ore.iron", s, steps=rand_int(rng_ore, 3, 6), tiles, hardness, flags)
  // Quartz
  quartz_spawns = sample_cavern_rims(tiles, rooms, rng_ore, weight=params.ore.quartz_weight)
  for s in quartz_spawns:
    seed_vein("ore.quartz", s, steps=rand_int(rng_ore, 2, 4), tiles, hardness, flags)
  // Decorations (lamps/crystals)
  decorate_crystals_and_lamps(tiles, flags, rng_props, spacing=params.lamps)

  // 11) Stats and golden hash
  path_length = shortest_path_len_bfs(tiles, anchors.spawn, anchors.exit)
  stats = { main_component_ratio: main_ratio, loops: loop_count, path_length: path_length }
  golden = compute_golden_hash(tiles, flags) // SHA-256 over (tiles,flags) row-major

  // 12) Emit JSON
  return {
    version: 1,
    meta: { seed: seed, w: w, h: h, biome_id: params.biome_id, algo_version: "cavegen.l1.v0.1.0", params: params },
    tiles: tiles, hardness: hardness, flags: flags,
    anchors: { spawn: anchors.spawn, exit: anchors.exit, rooms: rooms },
    stats: stats,
    golden: golden // optional in debug builds; not part of schema if strict
  }
```

Helpers (signatures):
- carve_three_wide(path: array<Point>, tiles, hardness, flags, width:int=3, shoulder:int=1) -> void
- place_room(kind:string, template_id:string, rot:int, rect:{x,y,w,h}, tiles, flags, door_bands:set, approach:set) -> bool
- connect_doors(a:{x,y,side}, b:{x,y,side}) -> array<Point> // uses A*
- flood_fill(tiles) -> (comp_map:array[h][w]int, comp_sizes:map<int,int>)
- compute_longest_path(component_graph, start:Point?) -> (u:Point, v:Point, dist:int)
- seed_vein(kind:string, start:Point, steps:int, tiles, hardness, flags) -> void
- compute_golden_hash(tiles, flags) -> hex_string
- a_star_with_costs(start:Point, goal:Point, tiles, flags, a_star_params, rng) -> array<Point>

Notes:
- A* cost(x,y,dir_change) = 1.0 + (dir_change? params.a_star.turn_penalty:0) + hug_cost(x,y)
- hug_cost(x,y) = clamp(min_dist_to_floor(x,y)*params.a_star.hug_bias, 0..0.6), with APPROACH_PROTECT adding +50.

## 14) Invariants, Tests, and DoD
- Invariants:
  - Determinism: seed → identical tiles, flags, anchors.
  - Connectivity: main_component_ratio ≥ 0.90; exit reachable from spawn; corridor width ≥ 3 everywhere.
- Test plan:
  - Unit:
    - Door approach preservation: APPROACH_PROTECT and DOOR_BAND untouched by CA and carving except at union seams.
    - Three‑Wide check: assert min corridor cross-section ≥ 3 for all carved connectors.
    - Flood-fill correctness on sample maps (multi-component and single-component).
  - Golden hash:
    - Given seeds [1337, 20240229] at 64x64, produce stable SHA-256 over tiles/flags; store in tests/worldgen/golden.json.
  - PNG export:
    - Black=rock, white=floor, ore tints for quick eyeball.

Definition of Done:
- L1 generation passes tests above.
- Performance meets budget at 128x128.
- JSON schema v0.1 emitted and consumable by JS prototype and Rust worldgen crate.
- Golden hashes stable across CI platforms.

## 15) Performance Notes & Risks
- Target: <200 ms at 128x128; A* bounded by limited door pairs; reuse buffers for flood fill and CA; typed arrays recommended.
- Use flat row-major arrays to improve cache locality; avoid allocations inside tight loops.
- Risks:
  - RNG substream misuse can break determinism; mitigate with explicit alloc-free iteration and seed derivation log.
  - Excessive A* expansions if heuristics weak; cap search box to map bounds and early-abort with fallback direct lines.

## 16) Integration Notes (ECS/Bevy)
- Map Tile → ECS Tile components: type/hardness/flags; anchors spawn as entities with Transform; exit spawner tag.
- Events: none at gen-time; serialization via serde + bevy_reflect (Rust) and plain JSON (JS prototype).
- Worldgen crate:
  - Expose generate_map(seed, w, h, params) -> Tilemap struct implementing Serialize/Deserialize.
  - Feature flags: "golden" to include golden hash; "png" for debug export.
- JS prototype:
  - Use deterministic PCG implementation; ensure same splitmix32 derivation; iterate rows then cols for rendering and hashing.