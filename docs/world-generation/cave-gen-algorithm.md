# The Far Mine — Cave Generation L1 (Sprint 1 Beta)

Owner: Deepdelver Caveborn (Beta)  
Version/Date: v0.1 — 2026-02-18  
Status: Draft v0.1

## 1) Title & Scope
- Scope
  - Single L1 biome slice (Crystal Caverns flavor)
  - Target bounds: 256x128 tiles (tile=16px). MVP demo defaults 128x128.
  - MVP room types: tunnel, cavern, ore-vein pocket
  - Deterministic by seed
  - Guaranteed solvable main path with Three‑Wide Law corridors (min width=3)
  - Performance target: <200 ms @128x128 with default params

## 2) Design Goals & Constraints
- Playability
  - 1 guaranteed start→exit path, corridor min width=3 along entire route
  - Loop frequency: 10–20% of corridor segments create optional loops
  - 2–4 light choke points (3–5 tiles long), ensure at least one alt-route
- Bounds
  - Room sizes: min 6x4, max cavern 26x18
  - Corridor width: 3 main; occasional flares to 4–5
  - Density: open floor coverage 38–52% after smoothing
- Connectivity
  - ≥90% of walkable floor in largest connected component
  - Entrance and exit on that component
- Enemy/tool integration hooks
  - Annotate spawn anchors and ore veins with hardness tiers: T0 rock, T1 copper, T1.5 iron stub
  - Avoid impossible pockets behind unbreakable walls in MVP

## 3) Algorithm Overview (Pipeline)
- Step A) Seed & RNG Substreams
  - Derive stable sub-RNGs from master seed using SplitMix64(master + domain_tag_hash)
  - Substreams: rng_ca, rng_rooms, rng_tunnels, rng_connect, rng_veins, rng_lamps, rng_decor
- Step B) Base Occupancy via Cellular Automata (CA)
  - Initialize with random fill p_wall ≈ 0.47
  - Run 4–5 steps; 8-neighborhood rule:
    - For a wall: stays wall if neighbor_walls ≥ birth_limit (5), else becomes floor
    - For a floor: becomes wall if neighbor_walls > death_limit (3), else stays floor
- Step C) Template Rooms (3–7 stamps)
  - Load from data/world/room-templates.json (tunnel, cavern, ore-pocket)
  - Place non-overlapping with 2-tile safety margins using rng_rooms; carved cells become floor
- Step D) Main Spine & Corridors
  - Choose entrance on left margin, exit on right margin where cells are wall-adjacent floor candidates
  - Run A* corridor from entrance to exit (width=3), with cost favoring existing floors and low-turn routes
  - Occasionally widen pockets (flare) to 4–5 tiles; mark path cells as main_path
  - Loop injection along corridor segments with loop_chance_per_segment (0.10)
- Step E) Connectivity Pass
  - Flood fill components; ensure ≥90% in largest component
  - Connect stray components to main via minimal connectors (width=3) using rng_connect
- Step F) Smoothing & Polishing
  - One cleanup pass: remove 1-tile specks, fill thin walls, enforce 3-wide corridors
  - Add edge bevel hints to walls (cosmetic in tile metadata)
- Step G) Ore Vein Seeding
  - Seeded clustering via rng_veins; densities per biome file data/world/biome-crystal-caverns.json
  - Copper along walls 6–18 tiles from main path (light density); iron sparser in side caverns; quartz rare in ceilings
  - Do not block 3-wide corridors; ores occupy solid until mined
- Step H) Anchors & Props
  - lamp_anchor along main_path every 18–26 tiles (rng_lamps), biased toward wall-adjacent placements
  - enemy_anchor in alcoves ≥4 tiles off main; apply start/exit buffers
  - Deco crystals per biome rules via rng_decor
- Step I) Exit Placement
  - Place exit tile on far (right) margin along main_path
  - Ensure 2-tile landing area and no immediate choke shorter than 3 tiles

## 4) Parameters Table (defaults)
- dims
  - width=128, height=128 (MVP demo); target L1: 256x128
- ca
  - initial_wall_prob=0.47, steps=5, birth_limit=5, death_limit=3
- rooms
  - count_min=3, count_max=7, min_size=6x4, max_size=26x18, attempts=64
- corridors
  - width=3, flare_chance=0.12, flare_len=[2,4], loop_chance_per_segment=0.10
- connectivity
  - min_connected_ratio=0.90, max_connectors=16
- veins
  - copper_density=0.012, iron_density=0.004, quartz_density=0.002
  - cluster_radius=[2,4], wall_adjacency_required=true
- lamps
  - spacing=[18,26] along main_path, wall_preference=true
- anchors
  - enemy_buffer_from_start=24, from_exit=16
- perf
  - max_ms_128=200, rng: SplitMix64+LCG mix; buffers: typed arrays where possible

## 5) Tile Palette & Legends
- Tile types (int codes)
  - 0=void, 1=rock, 2=floor, 3=wall (solid boundary), 4=ore.copper, 5=ore.iron, 6=ore.quartz, 7=spawn, 8=exit, 9=lamp_anchor, 10=enemy_anchor, 11=deco.crystal
- Solidity and walkability
  - Solid tiles: {1,3,4,5,6}
  - Walkable: {2,7,8}

## 6) Output Data Contract (JSON Schema-lite)
- Top-level object fields
  - version:int=1
  - seed:string (hex or decimal)
  - width:int, height:int
  - legend:
    - code_to_id: { "0":"void","1":"rock",...,"11":"deco.crystal" }
    - id_to_code: inverse mapping, stable across runs
  - tiles: array<int> length=width*height (row-major)
  - meta:
    - biome_id:string ("biome.crystal_caverns")
    - entrance:{ x:int, y:int }, exit:{ x:int, y:int }
    - main_path: array<{x:int,y:int}> (sparse checkpoints every ~4–6 tiles)
    - components:int, largest_component_ratio:number
    - anchors:{ lamps: array<{x:int,y:int}>, enemies: array<{x:int,y:int}> }
    - stats:{ open_ratio:number, ore_counts:{ copper:int, iron:int, quartz:int }, loops:int }
- Serialization
  - Row-major tiles (index = y*width + x)
  - Legend stability guaranteed across runs
  - Deterministic given seed+params

## 7) Pseudocode (language-agnostic; mirrors generate_map API)
Signature
- generate_map(seed:int|string, w:int, h:int, params?:Partial<Params>) -> TileMap

Subroutines
- init_rng(seed)->{rng_ca,rng_rooms,rng_tunnels,rng_connect,rng_veins,rng_lamps,rng_decor}
- ca_generate(w,h,params_ca,rng_ca)->grid<int>
- place_rooms(grid, templates, params_rooms, rng_rooms)->void
- carve_corridor(grid, a:Point, b:Point, width:int, rng)->array<Point>
- ensure_connectivity(grid, target_ratio, rng_connect)->void
- seed_ores(grid, params_veins, rng_veins)->void
- place_anchors(grid, path, params_lamps, rng_lamps)->{lamps,enemies}
- compute_meta(grid, path, anchors)->Meta

Pseudocode
```
function generate_map(seed, w, h, params={}):
  p = merge_defaults(params)
  rngs = init_rng(seed)
  grid = alloc_grid(w, h, initial=1 /*rock*/)

  // Step B: CA base
  grid = ca_generate(w, h, p.ca, rngs.rng_ca)

  // Step C: rooms
  templates = load_room_templates("data/world/room-templates.json")
  place_rooms(grid, templates, p.rooms, rngs.rng_rooms)

  // Step D: entrance/exit candidates
  entrance = pick_margin_point(grid, "left", rngs.rng_tunnels)
  exit = pick_margin_point(grid, "right", rngs.rng_tunnels)

  // A*: favor floors, penalize turns
  path = a_star_path(grid, entrance, exit, cost_fn)
  main_path_points = carve_corridor(grid, path, p.corridors.width, rngs.rng_tunnels)
  inject_loops(grid, main_path_points, p.corridors.loop_chance_per_segment, rngs.rng_tunnels)

  // Step E: connectivity
  ensure_connectivity(grid, p.connectivity.min_connected_ratio, rngs.rng_connect)

  // Step F: smoothing
  cleanup_artifacts(grid)
  enforce_three_wide(grid, main_path_points, p.corridors.width)
  bevel_edges(grid)

  // Step G: ores
  seed_ores(grid, p.veins, rngs.rng_veins)

  // Step H: anchors
  anchors = place_anchors(grid, main_path_points, p.lamps, rngs.rng_lamps)

  // Step I: exit finalize on path near right margin
  exit = finalize_exit_on_path(grid, main_path_points)

  // Meta and tiles export
  meta = compute_meta(grid, main_path_points, anchors)
  tiles = serialize_row_major(grid)

  return { version:1, seed:to_string(seed), width:w, height:h, legend:stable_legend(),
           tiles:tiles, meta:meta, }
```

Key details
- Corridor stamping (3-wide brush)
  - For each successive pair of path nodes (x0,y0)->(x1,y1), rasterize 4-neighborhood polyline
  - For each center cell c along polyline, stamp a disk/rect of radius r=floor((width-1)/2)
    - For width=3, set cells (cx+dx, cy+dy) where |dx|+|dy| ≤ 1 to floor (2)
  - At corners, also fill the 2x2 block bridging the L to prevent diagonal pinch
  - Flares: with flare_chance, temporarily set width=rand_int[4..5] for flare_len tiles
- A* cost function
  - base_cost=1
  - if current is floor -> cost *= 0.6
  - if neighbor is wall -> cost += 0.4
  - turning penalty: +0.2 when direction changes
  - soft bias toward horizontal progress: -0.05 when moving right (bounded ≥ 0.1)
- Loop injection logic
  - For each k-th carved segment (between checkpoints every ~4–6 tiles), with loop_chance, pick a side target near existing corridor within radius 8–16
  - Run a short BFS; if successful, carve a 3-wide connector; count as loop if it connects two already-walkable areas without being on main spine
  - Enforce loop budget: keep total loops in [8, 64] for 256x128; scale by map size
- Flood fill
  - Label components on walkable set {2,7,8}; pick largest by area
  - While largest_ratio < target_ratio and connectors_used < max_connectors:
    - For each non-main component, find nearest pair (p in comp, q in main) by Manhattan
    - Carve 3-wide straight-then-turn connector (or A* if obstacle density high)
    - Relabel; update largest_ratio
- Guardrails
  - No write outside bounds
  - Never shrink a corridor segment below width=3
  - Ores must not overwrite walkable cells in any 3-wide corridor footprint

## 8) Determinism & RNG Plan
- Master seed: u64 (accept decimal string or 0x-prefixed hex)
- Domain tags (strings): "ca","rooms","tunnels","connect","veins","lamps","decor"
- Tag hash: FNV-1a 64-bit over ASCII of tag
  - offset_basis=0xcbf29ce484222325, prime=0x100000001b3
- Substream derivation:
  - sub_state0 = splitmix64(master_seed + tag_hash)
  - sub_state1 = splitmix64(master_seed + rotate_left(tag_hash, 17))
- SplitMix64 step:
  - x += 0x9E3779B97F4A7C15
  - z = x; z = (z ^ (z >> 30)) * 0xBF58476D1CE4E5B9; z = (z ^ (z >> 27)) * 0x94D049BB133111EB; return z ^ (z >> 31)
- LCG step (mixed source for speed and decorrelation):
  - lcg = lcg * 6364136223846793005 + 1442695040888963407 (mod 2^64)
  - next_u64 = splitmix64_step(sm_state) XOR (lcg >> 1)
- All random choices within a stage must use that stage’s substream exclusively (no cross-talk)
- Call ordering (must remain stable)
  1) init substreams
  2) CA: init noise, iterate steps
  3) Rooms: sample count, then placement attempts per room
  4) Tunnels: entrance, exit, A* expansions, carve, flares, loop probes
  5) Connectivity: component scan, connector selection/order
  6) Veins: cluster centers then fill per cluster
  7) Lamps: sample spacing then concrete positions
  8) Decor: crystals pass

## 9) Performance Plan
- Complexity
  - CA: O(w*h*steps)
  - Pathfinding corridors: O(E log V) with grid neighbors; constrained by single main path and limited loop attempts
  - Connectivity flood fills: O(w*h)
- Memory
  - JS: use Uint8Array for tiles, Int32Array for labels; re-use scratch buffers
  - Rust/Bevy: Vec<u8> for tiles, Vec<i32> for labels; pre-allocate capacity width*height
- Budget and counters
  - <200 ms @128x128 defaults
  - Record: ca.steps_run, path_nodes_expanded, connectors_used, veins_placed, lamps_placed, loops_count
  - Early-out caps: max_connectors=16, max_loop_attempts=width*height/64

## 10) Invariants & Tests
- Connectivity test
  - Flood fill largest CC; assert ratio ≥ 0.90
  - Entrance and exit indices are within largest CC
- Corridor width
  - Validate 3-wide everywhere on main_path footprint
- Loop count
  - Assert loops within [8, 64] for 256x128; scale proportionally for other sizes
- Bounds respected
  - No writes out of [0..w-1],[0..h-1]
- Ores and corridors
  - Assert no ore tile within any cell that is part of the 3-wide corridor mask
- Seed reproducibility
  - Same seed + params => identical hash(tiles)
  - FNV-1a 64-bit over row-major tiles (u8 widened to u64 per byte): start offset_basis, for each byte b: hash ^= b; hash *= prime

## 11) Example Output (inline reference)
- Seed: 0xC0BB1E
- ASCII sketch (64x32). Legend: ‘#’=wall/rock, ‘.’=floor, ‘S’=start, ‘E’=exit, ‘c’=copper, ‘i’=iron, ‘q’=quartz, ‘L’=lamp, ‘x’=enemy anchor, ‘*’=deco.

```
################################################################
##########################################q#####################
###########################.....###########q####################
#############qq###########.S...###########qq###################
#############..###########.....###########..###################
#############..###########.....#########....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####..L..#######....L..#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######.......#....###################
#############..#####.....#######....L..#....###################
#############..#####.....#######.......#....###################
#############..###################E#############c##############
```
Notes
- The repo will include a JSON sample map at data/world/samples/mine_l1_64x64_seed_0xC0BB1E.json in a follow-up commit.

## 12) ECS/Bevy Integration Notes
- Mapping tiles→entities
  - For each cell:
    - Solid: spawn Tile collider; walkable: spawn Tile floor
    - Ore tiles (4/5/6): spawn OreVein entity with { ore_id, richness∈[1..3] } (richness from rng_veins)
    - 9 lamp_anchor → light prototype entity with placement params; actual light spawned by lighting system
    - 10 enemy_anchor → consumed by spawn system; do not block navmesh
    - 11 deco.crystal → static deco entity (no collision or light unless biome says otherwise)
  - 7 spawn → player/entrance marker; 8 exit → exit trigger
- Resources
  - WorldgenMeta { seed:u64, biome_id:String, legend:Legend, dims:(w,h), stats }
  - TileMap { tiles:Vec<u8>, width, height }
- Events
  - None emitted at gen-time; loading system reads TileMap, spawns entities on load stage

## 13) Risks & Assumptions
- Risks
  - Pathfinding cost spikes at 256x128 if loop injection runs too many BFS/A* probes
    - Mitigation: loop budget and early-out; prefer straight-then-turn connectors
  - RNG substream misuse causing nondeterminism
    - Mitigation: codify call order; CI tile-hash check per seed list
- Assumptions
  - Hardness/tool-tier mapping stable for L1 (T0 rock, T1 copper, T1.5 iron) — to sync with Delta
  - Biome rates in data/world/biome-crystal-caverns.json are final for Sprint 1

## 14) Acceptance Checklist
- Deterministic by seed with stable legend
- Guaranteed solvable 3-wide start→exit path
- Parameter bounds defined and enforced
- Resource placement rules for ores and anchors specified
- Data contract stable and documented
- Pseudocode for generate_map() and subroutines provided
- Performance target documented with counters and complexity
- Tests/invariants enumerated, including FNV-1a hash for CI

Appendix: Implementation Hooks
- Rust (Bevy)
  - Use bevy_tasks for off-thread generation; return TileMap resource to main thread
  - Prefer smallvec for neighbor lists in A*
- JS Harness
  - Pre-allocate typed arrays; avoid per-cell allocations; use bitmasks for 3x3 neighbor sums in CA
  - WebWorker boundary returns serialized JSON per contract