# The Far Mine — Cave Generation L1 (Sprint 1 v0.1)

Author: Deepdelver Caveborn (Beta)  
Version/Date: Draft v0.1 — 2026-02-19 (ISO-8601)  
Status: Draft v0.1  
Scope: L1 vertical slice; side-view 2D tile map; target bounds ~256x128 (MVP example 64x64); deterministic by seed.

---

## 1) Title & Metadata

- Title: The Far Mine — Cave Generation L1 (Sprint 1 v0.1)
- Author: Deepdelver Caveborn (Beta)
- Version/Date: Draft v0.1 — 2026-02-19
- Status: Draft v0.1
- Scope:
  - Level: Mine Level 1 (Crystal Caverns biome)
  - Projection: side-view 2D tile map (grid-aligned)
  - Target bounds: ~256x128; MVP example: 64x64
  - Determinism: full determinism by world seed


## 2) Goals & Constraints

- Goals
  - Guarantee a solvable main path from entrance (top rim) to exit (bottom rim).
  - >90% of tiles in the main connected component (excluding rim).
  - Bounded room and corridor sizes; enforce corridor_min_width.
  - Resource and feature distribution consistent with biome parameters.
  - Performance target: <200 ms at 128x128 in release builds.
- Constraints
  - Engine: Bevy 0.13
  - Tile size: 16 px; world units: 1.0 per tile
  - Fixed tick: 60 Hz logic
  - Serialization: serde + bevy_reflect
  - Biome for L1: Crystal Caverns
- Non-goals (Sprint 1)
  - Multi-level stair stitching
  - Dynamic reflow during play
  - Physics-based collapse simulation


## 3) Data Contracts (Tilemap JSON + Metadata)

Generated maps are written to data/world/maps/*.json and consumed by the level loader. Values are loader-safe and compact.

- Top-level fields
  - version: string (semver), e.g., "0.1.0"
  - seed: string (decimal u64 text to avoid JSON 53-bit float issues), e.g., "1311768467463790320"
  - width: integer (>= 8, <= 2048)
  - height: integer (>= 8, <= 2048)
  - tiles: array length width*height (row-major, top-to-bottom, left-to-right)
    - Each element is integer (u8 or u16), index into palette
  - palette: object mapping integer index (stringified keys for JSON safety are allowed) → token string
    - Example entries:
      - 0: "tile.void"
      - 1: "tile.rock.solid"
      - 2: "tile.rock.floor"
      - 3: "tile.rock.wall"
      - 10: "tile.ore.copper"
      - 20: "tile.deco.crystal.small"
  - meta: object
    - biome: string token, e.g., "biome.crystal_caverns"
    - entrance: { x:int, y:int } (grid coords in-bounds)
    - exit: { x:int, y:int } (grid coords in-bounds)
    - anchors: object
      - lamps: array of { x:int, y:int }
      - enemies: array of { x:int, y:int, tag:string }
      - lore: array of { x:int, y:int, tag:string }
    - stats: object
      - open_ratio: number [0,1]
      - main_cc_ratio: number [0,1]
      - room_count: integer >= 0
      - corridor_len_total: integer >= 0
    - params: object of key:string → value (string|number|boolean), echo of generator parameters used
- Validation schema (JSON Schema-like description)
  - type: object
  - required: [version, seed, width, height, tiles, palette, meta]
  - properties:
    - version: { type: string, pattern: "^[0-9]+\\.[0-9]+\\.[0-9]+(-[A-Za-z0-9\\.]+)?$" }
    - seed: { type: string, pattern: "^[0-9]{1,20}$" }
    - width: { type: integer, minimum: 8, maximum: 2048 }
    - height: { type: integer, minimum: 8, maximum: 2048 }
    - tiles:
      - type: array
      - minItems: width*height
      - maxItems: width*height
      - items: { type: integer, minimum: 0, maximum: 65535 }
    - palette:
      - type: object
      - additionalProperties: { type: string, pattern: "^[a-z0-9_\\.]+$" }
      - minProperties: 2
    - meta:
      - type: object
      - required: [biome, entrance, exit, anchors, stats, params]
      - properties:
        - biome: { type: string }
        - entrance: { type: object, required: [x,y], properties: { x:{type:integer}, y:{type:integer} } }
        - exit: { type: object, required: [x,y], properties: { x:{type:integer}, y:{type:integer} } }
        - anchors:
          - type: object
          - required: [lamps, enemies, lore]
          - properties:
            - lamps: { type: array, items: { type: object, required:[x,y], properties:{x:{type:integer},y:{type:integer}} } }
            - enemies: { type: array, items: { type: object, required:[x,y,tag], properties:{x:{type:integer},y:{type:integer},tag:{type:string}} } }
            - lore: { type: array, items: { type: object, required:[x,y,tag], properties:{x:{type:integer},y:{type:integer},tag:{type:string}} } }
        - stats:
          - type: object
          - required: [open_ratio, main_cc_ratio, room_count, corridor_len_total]
          - properties:
            - open_ratio: { type: number, minimum: 0, maximum: 1 }
            - main_cc_ratio: { type: number, minimum: 0, maximum: 1 }
            - room_count: { type: integer, minimum: 0 }
            - corridor_len_total: { type: integer, minimum: 0 }
        - params: { type: object, additionalProperties: { type: [string, number, boolean] } }

- Hardness bands (Tech/Combat — subject to final tuning with Delta/Gamma)
  - tile.rock.solid: 1.0 – 1.4
  - tile.ore.copper: 1.2 – 1.6
  - tile.rubble: 0.6 – 0.9


## 4) RNG & Determinism Plan

- Single world seed: u64 world_seed
- Substreams by phase using SplitMix64 derivation
  - subseed = splitmix64(world_seed XOR hash64(phase_tag))
  - hash64(phase_tag): xxHash64 over ASCII lowercased tag, fixed seed 0
  - Initialized PRNG per phase: xoroshiro128++ seeded from subseed via two splitmix64 draws
- Phase tags (exact strings)
  - "rng_rooms", "rng_ca", "rng_connect", "rng_ores", "rng_deco", "rng_anchors"
- Deterministic ordering rules
  - Iterate grid in fixed row-major order for all scans
  - When multiple choices exist (e.g., connectors), sort by key:
    - key = (manhattan_dist, y, x) ascending
  - Avoid floating RNG in index math; use integer RNG and integer arithmetic
  - No parallel mutation of shared buffers within a phase; if parallelizing, partition by deterministic tiling and stable-reduce
- Save-back of params used into meta.params to enable exact replay


## 5) Algorithm Overview (Phases)

- Phase A: Initialize occupancy grid
  - Create boolean occupancy grid open[y][x]; true = passable/floor
  - Initialize with seeded random fill: p_open_init ≈ 0.42–0.48 (biome-dependent softness)
  - Stamp N room templates (Section 8) at legal positions
    - Validate margin to rim and to each other
    - Carve their open cells into the grid (set open = true), optionally harden perimeter walls
- Phase B: Cellular Automata smoothing
  - 8-neighborhood count of open neighbors
  - Rule: cell becomes open if neighbors_open ≥ T_open (default 5)
  - Else, remains/will be closed
  - Steps S in [3..5], default 4; apply to interior, keep rim as solid unless stamped otherwise
- Phase C: Connectivity & Main Path
  - Flood-fill all connected components (4-connectivity for movement; 8-connectivity allowed for CA, but pathing uses 4 or 8 consistently—choose 4 for stricter corridors)
  - Identify largest component as main
  - Choose entrance: an open cell on the top rim near center-left (x in [w/8 .. 3w/8]) with bias
  - Choose exit: an open cell on bottom rim near center-right (x in [5w/8 .. 7w/8]) and at least width/3 away in x from entrance
  - Run A* on passable cells; if no path, carve a corridor along the shortest wall-crossing line using dig brush (parameterized width 1–3; default 3)
- Phase D: Connect secondary components
  - For each island component, find 1–3 minimal connectors to main:
    - Sample boundary points from island and main
    - For each pair, compute approximate path cost (manhattan or 45°-aware)
    - Carve minimal-length connector(s), ensuring brush width
  - Optional loops: add K additional connectors between distant nodes (target ≈ 2–4% of map area / 1000, rounded)
- Phase E: Corridor Widening & Cleanup
  - Enforce corridor_min_width ∈ {2,3}
  - Widen chokepoints detected via local thickness analysis
  - Trim single-tile spikes, fill 1×1 potholes, remove dead-end sandbars shorter than threshold unless flagged as pockets for anchors
- Phase F: Ore Vein Seeding
  - Generate ore seed points via Poisson disk/blue-noise with biome rates
  - For each seed, grow a vein via random-walk (self-avoiding with limited backtrack) or light CA growth for length 6–20 tiles
  - Avoid rooms by margin; ensure richness 2–5 clusters per vein cell where applicable
- Phase G: Decoration & Anchors
  - Place crystals/decorations with density caps and clearances
  - Lamp anchors every L tiles along corridors and at room hubs
  - Enemy anchors at pockets with 2–3 tile clearance
  - Lore anchors in 1–2 notable nodes (junctions, scenic rooms)


## 6) Parameters Table (defaults & ranges)

- width: int (default 128; 32–256 MVP)
- height: int (default 96; 32–128 MVP)
- p_open_init: float (default 0.45; range 0.42–0.48)
- ca_steps: int (default 4; range 3–5)
- ca_threshold_open: int (default 5; fixed for 8-neighborhood)
- corridor_min_width: int (default 2; range 2–3)
- loops_target: int (default computed; 0–6 depending on size)
- room_count: int (default 3; templates: tunnel, cavern, ore-vein niche)
- ore.vein_count_per_1000tiles: float (default 3.0; range 2–4)
- ore.vein_len_min/max: int (default 6/20)
- ore.richness_min/max: int (default 2/5)
- lamp_spacing: int (default 11; range 9–13)
- entrance_bias_x: float (default 0.25 of width, clamp [0.1,0.4])
- exit_bias_x: float (default 0.75 of width, clamp [0.6,0.9])
- biome_token: string (default "biome.crystal_caverns")


## 7) Pseudocode (Implementation-Ready)

Note: Types use simple arrays for clarity. Use u8/u16 for tiles; bool for open grid.

```
function generate_map(world_seed: u64, w: int, h: int, biome_token: string) -> MapJson:
    rng_rooms   = make_phase_rng(world_seed, "rng_rooms")
    rng_ca      = make_phase_rng(world_seed, "rng_ca")
    rng_connect = make_phase_rng(world_seed, "rng_connect")
    rng_ores    = make_phase_rng(world_seed, "rng_ores")
    rng_deco    = make_phase_rng(world_seed, "rng_deco")
    rng_anchors = make_phase_rng(world_seed, "rng_anchors")

    params = load_biome_params(biome_token) // overrides defaults

    open = init_density(w, h, params.p_open_init, rng_ca)
    stamp_rooms(open, w, h, params.room_count, rng_rooms, biome_token)

    for s in 0 .. params.ca_steps-1:
        open = ca_step(open, w, h, params.ca_threshold_open, rng_ca)

    comps = flood_fill(open, w, h)
    main_id = largest_component_id(comps)

    entrance = choose_rim(open, w, h, "top", params.entrance_bias_x, rng_connect)
    exit     = choose_rim(open, w, h, "bottom", params.exit_bias_x, rng_connect)

    ensure_path(open, w, h, entrance, exit, params.corridor_min_width, rng_connect)

    connect_islands(open, w, h, comps, main_id, params.corridor_min_width, params.loops_target, rng_connect)

    widen_corridors(open, w, h, params.corridor_min_width)

    // Materialization
    tiles = allocate_tile_layer(w, h, default = TILE_ROCK_SOLID)
    paint_floors_and_walls(tiles, open) // floors/walls around open cells

    place_ores(tiles, open, w, h, biome_token, params, rng_ores)
    place_deco_and_anchors(tiles, open, w, h, params, rng_deco, rng_anchors)

    palette = build_palette(biome_token)
    meta = build_meta(world_seed, biome_token, entrance, exit, open, params, anchors, stats_from(open, tiles))

    return MapJson {
        version: "0.1.0",
        seed: to_string(world_seed),
        width: w, height: h,
        tiles: flatten_row_major(tiles),
        palette: palette,
        meta: meta
    }
```

Helper: cellular automata step

```
function ca_step(open: bool[w*h], w: int, h: int, T_open: int, rng) -> bool[w*h]:
    next = copy(open)
    for y in 1 .. h-2:
        for x in 1 .. w-2:
            n = count_open_neighbors8(open, x, y, w)
            if n >= T_open:
                next[y*w + x] = true
            else:
                next[y*w + x] = false
    // keep outer rim closed to preserve boundary
    for x in 0..w-1: next[0*w + x] = false; next[(h-1)*w + x] = false
    for y in 0..h-1: next[y*w + 0] = false; next[y*w + (w-1)] = false
    return next
```

Helper: flood fill components

```
function flood_fill(open: bool[w*h], w: int, h: int) -> int[w*h]:
    comps = array_fill(-1, w*h)
    comp_id = 0
    for y in 0..h-1:
        for x in 0..w-1:
            idx = y*w + x
            if open[idx] and comps[idx] == -1:
                size = bfs_mark(open, comps, w, h, x, y, comp_id) // 4-connected BFS
                comp_id += 1
    return comps
```

Helper: ensure path using grid A* and corridor carving

```
function ensure_path(open, w, h, start, goal, brush_w: int, rng):
    path = astar_on_grid(open, w, h, start, goal) // returns list of cells or empty
    if path not empty:
        return
    // carve along shortest "line" using weighted grid search that allows through walls
    carve_path = astar_allow_through_walls(open, w, h, start, goal, wall_cost=5, floor_cost=1)
    carve_along_path(open, w, h, carve_path, brush_w)

function carve_along_path(open, w, h, path: list<(x,y)>, brush_w: int):
    r = floor(brush_w / 2)
    for (x,y) in path:
        for dy in -r .. r:
            for dx in -r .. r:
                xx = x + dx; yy = y + dy
                if in_bounds(xx, yy, w, h):
                    open[yy*w + xx] = true
```

Helper: connect islands with minimal connectors and optional loops

```
function connect_islands(open, w, h, comps, main_id, brush_w, loops_target, rng):
    boundaries_by_comp = compute_boundaries(open, comps, w, h)
    // For each island, connect 1..3 times to main
    for comp in components_except(main_id):
        pairs = nearest_pairs(boundaries_by_comp[comp], boundaries_by_comp[main_id], sample_limit=64)
        sort(pairs, by=(manhattan_distance, y1, x1, y2, x2))
        k = 1 + (rng.next_u32() % 3) // 1..3
        for i in 0 .. min(k-1, len(pairs)-1):
            p1, p2 = pairs[i]
            tunnel = straight_or_45_path(p1, p2)
            carve_along_path(open, w, h, tunnel, brush_w)
    // Optional loops: connect random distant nodes in main
    if loops_target > 0:
        main_nodes = boundaries_by_comp[main_id]
        for i in 0 .. loops_target-1:
            a = sample(main_nodes, rng); b = sample_far(main_nodes, rng)
            tunnel = straight_or_45_path(a, b)
            carve_along_path(open, w, h, tunnel, brush_w)
```

Helper: Poisson disk points (grid-based dart throwing)

```
function poisson_disk_points(w, h, min_dist_tiles: float, rng) -> list<(x,y)>:
    // Use simple grid-accelerated dart throwing for MVP
    cell = max(1, floor(min_dist_tiles / sqrt(2)))
    grid_w = ceil(w / cell); grid_h = ceil(h / cell)
    accel = array_fill((-1,-1), grid_w*grid_h)
    points = []
    attempts = 0; max_attempts = 8 * w * h / (min_dist_tiles*min_dist_tiles + 1)
    while attempts < max_attempts and len(points) < (w*h)/(min_dist_tiles*min_dist_tiles + 4):
        x = rng.next_u32() % w
        y = rng.next_u32() % h
        gx = x / cell; gy = y / cell
        ok = true
        for ny in max(0,gy-2) .. min(grid_h-1,gy+2):
            for nx in max(0,gx-2) .. min(grid_w-1,gx+2):
                px, py = accel[ny*grid_w + nx]
                if px != -1:
                    if (abs(px-x)^2 + abs(py-y)^2) < (min_dist_tiles^2):
                        ok = false
                        break
            if not ok: break
        if ok:
            points.push((x,y))
            accel[gy*grid_w + gx] = (x,y)
        attempts += 1
    return points
```

Helper: grow vein by random walk

```
function grow_vein_walk(start: (x,y), len_min: int, len_max: int, open, avoid_mask, rng) -> list<(x,y)>:
    L = len_min + (rng.next_u32() % (len_max - len_min + 1))
    pos = start
    dir = random_dir4_or_8(rng) // biome-controlled
    cells = [pos]
    visited = set{pos}
    retries = 0
    while len(cells) < L and retries < 64:
        cand = pos + dir
        // bounce if out of bounds or too close to avoid_mask (rooms)
        if not in_bounds(cand) or avoid_mask[cand] == true:
            dir = turn_or_random(dir, rng)
            retries += 1
            continue
        if cand not in visited:
            cells.push(cand)
            visited.add(cand)
            pos = cand
            if rng.next_float() < 0.3: dir = random_turn(dir, rng)
        else:
            // small sidestep to avoid loops
            dir = random_turn(dir, rng)
            retries += 1
    return cells
```

Complexity notes
- Main passes O(w*h): density init, S CA steps, flood-fill, cleanup, painting
- A* complexity bounded by open area; fallback carve uses limited-cost A* allowing walls
- Island connectors: sampling limited to O(k) per island (k ≤ 64 pairs)
- Ore/deco placement proportional to map area; Poisson disk uses capped attempts
- Meets <200 ms at 128x128 in release with straightforward implementations


## 8) Room Templates Integration

- Templates file: data/world/room-templates.json
- Format (array of objects):
  - id: string (unique)
  - kind: "tunnel" | "cavern" | "ore_vein"
  - w, h: integers (template dimensions)
  - grid: array of strings or integer arrays
    - Symbols or ints where:
      - 0 = solid
      - 1 = floor/open
      - 2 = wall (optional hint; generator can enforce perimeter walling)
  - anchor_points: array of { x:int, y:int, tag:string } relative to template origin
    - Examples: {tag:"anchor.lamp"}, {tag:"anchor.enemy.small"}, {tag:"anchor.lore"}
  - stamp_rules: { overlap: bool, margin: int (1..2) }
  - entrance_offsets: array of { x:int, y:int } relative exits for stitching (MVP: hints only)
  - exit_offsets: array of { x:int, y:int }
  - transform: { mirror_x: bool, mirror_y: bool, rotate_90: bool } (MVP: allow mirror_x only; no rotation)
- Stamping rules
  - Choose positions avoiding:
    - Rim by ≥ margin tiles
    - Overlap with other critical rooms when overlap=false
  - Collision/merge behavior:
    - For each template cell:
      - If value==1: set map open=true
      - If value==2: set neighbor shells to solid wall (or mark for wall pass)
  - Mirroring:
    - If mirror_x allowed, flip grid across vertical axis; adjust anchor_points
  - Selection:
    - Weighted random selection by kind to meet room_count and biome weights
- Post-stamp integration
  - After stamping, CA smoothing will blend edges
  - Anchor points from templates are recorded into anchors.lamps/enemies/lore if applicable and not vetoed by post-filters (clearance checks)


## 9) Biome Config Integration

- File: data/world/biome-crystal-caverns.json
- Fields
  - id: "biome.crystal_caverns"
  - tile_tokens: mapping symbolic roles → tile tokens in palette
    - rock_solid: "tile.rock.solid"
    - rock_floor: "tile.rock.floor"
    - rock_wall: "tile.rock.wall"
    - ore_copper: "tile.ore.copper"
    - deco_crystal_small: "tile.deco.crystal.small"
    - light_crystal_cold: "light.crystal.cold"
  - ca_overrides:
    - p_open_init, ca_steps, ca_threshold_open
  - deco_densities:
    - crystal_small_per_1000_open: float
    - crystal_clusters_bias: float [0..1]
  - ore_distributions:
    - copper: { per_1000tiles: 3.0, vein_len_min: 6, vein_len_max: 20, richness_min: 2, richness_max: 5 }
  - light_tokens:
    - lamp: "light.lamp.warm"
    - ambient: "light.crystal.cold"
  - sfx_ambience: "sfx.amb.crystal_caverns"
  - hardness_bands:
    - tile.rock.solid: [1.0, 1.4]
    - tile.ore.copper: [1.2, 1.6]
    - tile.rubble: [0.6, 0.9]
  - gating_hints:
    - early_pickaxe_ok: ["tile.rubble"]
    - requires_upgrade: ["tile.ore.copper", "tile.rock.solid"]


## 10) ECS Integration (Bevy)

- Data ingestion
  - Resource: WorldSeed(u64), BiomeToken(String)
  - Event: GenerateLevel { seed, width, height, biome_token }
  - System: worldgen_system consumes event, produces:
    - Tile chunk entities populated from MapJson
    - Anchor entities (lamps, enemies, lore) with transform at tile centers
- Components
  - Tile { kind: TileKind, hardness: f32, sprite_ref: Handle<TextureAtlas>, light_token: Option<String> }
  - OreVein { ore_type: OreType, richness: u8 }
  - Light { radius: f32, intensity: f32, color_token: String }
  - SoundEmitter { sfx_token: String, loop: bool, gain: f32 }
  - Anchor { tag: String } // for spawn systems to resolve into gameplay entities
- Resources
  - TokenRegistry mapping token strings → assets (sprites, audio, VFX)
  - TilePalette mapping index → token (and token → index)
- Systems ordering
  - worldgen_system → chunk_spawn_system → anchor_spawn_system
- Serialization
  - All map and entity data support serde + bevy_reflect for save/load and inspection


## 11) Output & Export Artifacts

- Artifacts
  - JSON map file as per Section 3
  - PNG occupancy export:
    - floor/open: light gray (e.g., #CFCFCF)
    - wall/solid: dark gray/black (e.g., #202020)
    - ore: accent color (e.g., copper #B87333)
- ASCII mini-sample (64x24) — legend: '#' wall, '.' floor, 'O' ore, 'L' lamp

```
################################################################
################################################################
#########################......#############################L###
######################...........###############################
#####################....####.....##############################
####################....######.....#############################
###################.....######......############################
##################......######........##########################
###############..........####..........#########################
##############.............##.............######################
#############..............##..............#####################
#############..............##......OO.......####################
#############..............##.....OOOO......####################
#############......L.......##......OO.......####################
##############.............##.............######################
###############............####..........#######################
#################..........######......#########################
###################........######.....##########################
#####################......######.....##########################
######################.....####.....L###########################
########################...........#############################
#########################.........##############################
################################################################
################################################################
```


## 12) Test Plan (MVP)

- Determinism
  - Given seed/w/h/biome and default params, compute a stable hash (e.g., xxHash64) of tiles + meta.entrance/exit/anchors; verify against a golden hash
  - Unit test per phase substream: same seed and phase_tag yields same subseed
- Connectivity
  - Assert A* path exists entrance ↔ exit
  - main_cc_ratio ≥ 0.9 (meta.stats)
- Bounds and constraints
  - corridor_min_width enforced at all traversable chokepoints
  - Room templates placed within bounds, respect margin; count within [room_count-1, room_count+1] depending on legal slots
  - Ore counts within biome-specified ranges (per_1000 tiles ± 20%)
- Performance
  - Micro-benchmark: 96x64 and 128x128
  - Target <200 ms @128x128 in release; track allocations and avoid per-cell heap traffic
- Serialization/Schema
  - Validate JSON against schema-like checks
  - Round-trip load → ECS entities → export occupancy matches original open ratio ± 0.5%


## 13) Risks & Mitigations

- Risk: CA overcarves or seals exits
  - Mitigation: Post-CA path enforcement pass (ensure_path) with 3-wide brush fallback
- Risk: RNG substream misuse or cross-contamination
  - Mitigation: Explicit phase-tagged seeding; unit tests verifying substream independence; log seeds in meta.params
- Risk: Token drift across teams (art/sfx/vfx naming)
  - Mitigation: Central TokenRegistry; weekly sync; link doc to registry; CI check for unresolved tokens
- Risk: Performance regressions with larger sizes
  - Mitigation: Cap sampling in connectors; O(w*h) passes only; benchmark gates in CI; feature flags for debug visuals
- Risk: Island over-connection creating labyrinths
  - Mitigation: Limit connectors per island (1–3) and loops_target scaled by area


## 14) Acceptance Checklist

- Deterministic by seed with documented substream derivation
- Solvable entrance-to-exit path guaranteed
- Min/max room sizes and corridor width constraints enforced
- Resource (ore) placement rules specified with biome rates
- JSON data contract and schema documented; includes palette and meta fields
- Pseudocode provided for generate_map() and key helpers
- ECS integration points defined for Bevy 0.13 (components, systems, resources)
- Output artifacts include JSON and PNG occupancy; ASCII sample provided
- Performance target and complexity notes included
- Hardness bands per tile token specified for Tech/Combat coordination

---

Appendix: Deterministic Seed Derivation

- hash64(tag): xxHash64(tag_ascii_lower, seed=0)
- subseed = splitmix64(world_seed XOR hash64(tag))
- xoroshiro128++ initialization:
  - s0 = splitmix64(subseed)
  - s1 = splitmix64(s0)
  - PRNG state = (s0, s1)
- Phase tags used exactly as:
  - "rng_rooms", "rng_ca", "rng_connect", "rng_ores", "rng_deco", "rng_anchors"