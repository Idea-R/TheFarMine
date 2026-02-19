# The Far Mine — Cave Generation L1 (Sprint 1)

Author: Deepdelver Caveborn (Beta)  
Version/Date: 0.1 / 2026-02-19  
Status: Draft v0.1

Scope
- Level: 1 only (Crystal Caverns L1), 2D side-view tile map.
- Bounds: target 256x128; acceptance also at 128x128 and 64x64.
- Engine-agnostic, with Bevy/ECS integration notes.

---

## 1) Play Constraints & Guarantees

Bounds
- Map sizes supported: min 64x64, max 256x128. Width and height must be even.
- Playable area margins: maintain solid rock borders of at least 2 tiles on all sides; spawn/exit must be ≥6 tiles from map edges and ≥3 tiles from any void/out-of-bounds.

Main Path
- Guarantee a solvable, walkable path from spawn to exit within the main connected component (MCC).
- Main corridor minimum clear width: 3 tiles (horizontal and vertical Manhattan width).
- Door/neck sizes:
  - Main-path doors/necks: ≥3 tiles.
  - Side-room doors: ≥2 tiles (never affects main-path width).
  - Optional secret squeezes: 1-tile passes allowed only if flagged secret and not on any critical path; mark as non-critical in metadata.

Connectivity
- Walkable connectivity: ≥90% of all walkable tiles must be in the MCC.
- Loops: target 0.8–1.6 loops per 1000 total tiles (not just walkable); loops created post main-path routing.
- Cul-de-sacs budget: ≤6% of walkable tiles terminate within 3 steps (dead ends), excluding room interiors.

Room Sizes and Density
- Tunnels: 3-wide lanes; straight or gently curving; lengths variable.
- Caverns: radius-equivalent 12–28 tiles (eqv radius r where area ≈ πr², allowing amorphous shapes).
- Ore chambers: radius-equivalent 5–9 tiles.
- Density per 10k tiles:
  - Tunnels: 4–10 per 10k.
  - Caverns: 1.2–2.8 per 10k.
  - Ore chambers: 0.8–2.0 per 10k.

Chokepoints
- Target 2–4 soft chokepoints in the MCC (width 2–3).
- Never narrower than 2 tiles unless flagged secret (and excluded from MCC calculations).

---

## 2) Algorithm Overview (Pipeline)

High-level pipeline (deterministic per seed):
1) Seeded RNG setup with substreams.
2) Initial noise blob via cellular automata (CA) from random fill.
3) Flood-select largest connected component (MCC) and clear outside to solid rock.
4) Stamp room templates (weighted, separated) onto MCC boundary/nearby rock.
5) Carve connector tunnels between rooms/MCC using A* over a cost field (rock vs air).
6) Enforce corridor minimum widths by morphological opening (widen_corridor).
7) Add loops by evaluating connector candidates and applying a disjoint-set (cycle) check.
8) Decorate edges (ledges, rubble) based on curvature/convexity heuristics.
9) Ore vein seeding influenced by biome rules and hardness masks.
10) Lamp/light anchor placement along main path and near intersections.
11) Metadata bake: spawn/exit determination, stats, anchors, palette IDs.

Justification for Sprint 1
- CA yields organic mass cheaply and stably.
- Template stamping ensures recognizable spaces (rooms) and repeatable authoring.
- Deterministic tunnel routing (A*) ensures connectivity and width enforcement with predictable costs.

---

## 3) Seed Management & Determinism

Seed and Substreams
- Single 64-bit root seed expands into named substreams:
  - layout, rooms, connectors, ore, decor, lights
- Derivation: sub_seed = SplitMix64(root ^ hash64("namespace") ^ hash64(w,h,params.version))
  - hash64("namespace"): FNV-1a 64 or xxHash64 over ASCII of the name.
  - hash64(w,h,params.version): pack into bytes and hash; future-proof via params.version.
- Each substream uses PCG32 (XSH-RR) with the derived 64-bit state and 64-bit stream/seq = sub_seed>>1.

Consumption Rules
- RNG consumption is confined to its substream per task:
  - layout: CA fill, CA steps.
  - rooms: template selection, placement jitter, rotations.
  - connectors: A* tie-breaks, candidate ordering.
  - ore: vein attempts, branching.
  - decor: rubble/edges, crystal clusters.
  - lights: jitter, intersection proximity choices.
- Order of consumption per stage is stable: iterate grid row-major; iterate rooms by sorted template-id then by seeded index; iterate connectors by ascending room-id pairs. No early-returns that skip draws; where bailouts occur, consume dummy draws equal to worst-case to preserve determinism.

Hashing Rule
- Effective run signature: H = hash64(root_seed || w || h || params.version || stable_param_pack).
- Output is stable across runs with identical H.

---

## 4) Parameters Table (defaults & safe ranges)

Grid
- width: default 128; height: default 128.

Cellular Automata (CA)
- fill_prob: 0.51 (safe 0.43..0.58).
- steps: 4 (safe 3..6).
- birth_limit: 5 (safe 5..6).
- death_limit: 3 (safe 3..4).

Rooms (Poisson means; enforce separation ≥6 tiles center-to-center projected to AABBs with margin=2)
- tunnel: mean 8 (range 6–10).
- cavern: mean 3 (range 2–4).
- ore_chamber: mean 2 (range 2–3).

Corridors
- min_width: 3.
- max_turn_rate_deg: 45.
- junction_rate: 0.15 (probability to branch when carving near intersections).
- loop_try: 12 candidates after main connectors.
- loop_accept_bias: 0.6 (favor shorter loops and MCC coverage).

Ore
- vein_attempts per 10k tiles: 18.
- vein_len: default 7 (safe 4..11).
- branch_prob: 0.25.
- richness_range: 6..18 (local density cap per vein).

Lights
- lamp_every_N_tiles_along_main: 22 with ±4 jitter.
- near_intersections: true (priority bonus at junction nodes).

Performance Caps
- max_nodes_a_star: 50k per connector.
- max_vein_cells: ≤3% of walkable tiles.

---

## 5) Output Data Contract (Tilemap JSON + Metadata)

Artifact shape (engine-agnostic; row-major tiles; uint64 as string for broad JSON compatibility):
```
{
  "version": 1,
  "meta": { "seed": "1234567890123456789", "w": 128, "h": 128, "params_version": 1, "gen_time_ms": 137.6 },
  "tiles": [ /* length = w*h; "0","1","2","3","4" or small ints; row-major top->bottom */ ],
  "palette": {
    "0": "tile.air.empty",
    "1": "tile.rock.solid",
    "2": "tile.rock.ore.copper",
    "3": "tile.rock.rubble",
    "4": "tile.lamp.stand"
  },
  "spawn": { "x": 8, "y": 12 },
  "exit": { "x": 119, "y": 110 },
  "anchors": {
    "rooms": [ { "type":"room.tunnel", "aabb":[x,y,w,h], "seed": 392188221 } ],
    "enemies": [],
    "lights": [ { "x": 42, "y": 29, "color":"light.crystal.amber", "radius": 7.5 } ]
  },
  "stats": {
    "walkable_pct": 0.38,
    "main_cc_pct": 0.95,
    "rooms": { "tunnel":7, "cavern":3, "ore":2 },
    "loops": 12
  }
}
```
Notes for ECS/Bevy mapping
- Tiles:
  - Tile { tile_id: u16, material: from palette+biome, hardness: biome.hardness_scalar * token_base }
  - Collider: static AABB for solid tiles; empty for air/lamps/rubble.
- Lights: anchors.lights -> Light component (color preset from biome, radius scalar).
- SoundEmitter anchors (none yet in L1) to map from biome ambient SFX.

---

## 6) Biome Hooks (Crystal Caverns L1)

- External data: data/world/biome-crystal-caverns.json (to be produced).
- Defines:
  - palette tokens, materials, hardness scalars (e.g., rock=1.0, ore=1.2).
  - ambient light tint: subtle blue-amber blend.
  - decoration: crystal clusters on convex rock edges with 12% chance per eligible edge, decor density clamps per chunk.
  - lamp style tokens: "tile.lamp.stand" visual variant, color "light.crystal.amber".
  - ambient SFX spots: drip nodes near stalactites, low-rumble near large caverns.

---

## 7) Room Templates Usage

Source
- data/world/room-templates.json (to be produced), includes 3 base templates:
  - tunnel, cavern, ore-vein (ore chamber).

Template fields
- id: "room.tunnel" | "room.cavern" | "room.ore".
- size: { w:int, h:int } nominal bounding box.
- grid: rows of chars; mapping chars→tokens via palette (e.g., '.'=air, '#'=rock, 'o'=ore seed).
- doorways: [{ x:int, y:int, facing:"N|S|E|W" }], local coords in template space.
- flags: rotation:true/false, reflection:true/false.
- stamp_rules:
  - no-overlap margin: 2 tiles to any existing room AABB.
  - align_to: MCC boundary or interior with bias per type.
  - priority: tie-break ordering for overlapping candidates.

Placement algorithm
- Generate candidate positions via blue-noise (Poisson disk) over the grid domain respecting separation ≥6.
- For each template type (weighted by Poisson-sampled count), try rotations/reflections allowed by flags; validate no-overlap and doorway exposure to rock or MCC edge.
- Build a doorway graph; ensure at least one doorway per room is connectable to MCC via planned connectors; discard isolated rooms.

---

## 8) Pseudocode (generate_map)

```
function generate_map(seed:u64, w:int, h:int, params:Params) -> Artifact:
  assert 64 <= w <= 256 and 64 <= h <= 128 and w%2==0 and h%2==0
  rng = init_rng(seed, w, h, params.version)
  // Substreams
  R = {
    layout: rng.sub("layout"),
    rooms: rng.sub("rooms"),
    connectors: rng.sub("connectors"),
    ore: rng.sub("ore"),
    decor: rng.sub("decor"),
    lights: rng.sub("lights")
  }

  grid = ca_init_grid(w,h, params.CA.fill_prob, R.layout)
  for i in 1..params.CA.steps:
    grid = ca_iterate(grid, params.CA.birth_limit, params.CA.death_limit)

  mcc_mask = floodfill_largest(grid) // returns boolean mask of largest air component
  grid = apply_mcc_mask(grid, mcc_mask) // non-MCC cells become solid rock

  templates = load_room_templates() // from data/world/room-templates.json
  rooms = stamp_rooms(grid, templates, params.Rooms, R.rooms)

  cost_field = build_cost_field(grid) // rock: high cost, air: low, rubble: mid
  connectors = plan_connectors(rooms, mcc_mask, R.connectors)
  paths = carve_connectors_a_star(connectors, cost_field, R.connectors, params.max_nodes_a_star)
  grid = apply_paths(grid, paths)

  grid = enforce_min_width(grid, params.Corridors.min_width) // morphological open+fill
  loop_candidates = pick_loop_candidates(grid, connectors, R.connectors, params.Corridors.loop_try)
  loops = select_loops(loop_candidates, R.connectors, params.Corridors.loop_accept_bias, disjoint_set_from(grid))
  grid = apply_paths(grid, loops)

  decorate_edges(grid, R.decor) // rubble, ledges per curvature
  mcc_mask = floodfill_largest(grid) // recompute after carving

  main_skel = extract_main_skeleton(grid, mcc_mask)
  spawn, exit = place_spawn_exit(main_skel, R.layout) // maximize geodesic separation
  lights = place_lights_along_main(main_skel, spawn, exit, params.Lights, R.lights)

  vein_seeds = seed_ore_veins(grid, mcc_mask, params.Ore, biome_rules(), R.ore, params.max_vein_cells)
  grid = apply_ore(grid, vein_seeds)

  anchors = bake_anchors(rooms, lights)
  stats = compute_stats(grid, mcc_mask, rooms, loops)

  palette = default_palette_for_biome("crystal_caverns_L1")
  tiles = bake_tiles(grid, palette)

  meta = { seed: to_string(seed), w, h, params_version: params.version, gen_time_ms: timing() }
  return build_artifact(version=1, meta, tiles, palette, spawn, exit, anchors, stats)
```

Helper signatures
- floodfill_largest(grid) -> BoolMask
- a_star(start, goal, cost_field, max_nodes, rng) -> Path
- disjoint_set_from(grid) -> DSU
- widen_corridor(grid, min_width) -> grid
- pick_loop_candidates(grid, connectors, rng, k:int) -> [Connector]
- compute_geodesic_dists(grid, source_mask) -> DistField
- plan_connectors(rooms, mcc_mask, rng) -> [Connector]
- carve_connectors_a_star(connectors, cost_field, rng, cap) -> [Path]
- place_spawn_exit(main_skel, rng) -> (Point, Point)

Notes
- Cost field: air=1, rubble=2, rock=6, out-of-bounds=∞; turning adds angle cost proportional to degrees/max_turn_rate.
- enforce_min_width: dilate air by r then erode to guarantee 3-wide corridors; patch single-tile pinches.

---

## 9) Basic Connectivity Test & PNG Export Notes

Test (seed=12345, w=h=64, defaults)
- Assert stats.main_cc_pct ≥ 0.9.
- Assert path_exists(spawn, exit) == true (BFS on air cells).
- Assert min corridor width along the main path ≥ 3.
- Assert rooms_count in observed stats within configured [min,max] per type.

PNG Export (deterministic colors)
- rock: #2b2b2b
- air: #0f0f1a
- ore: #5fa7c8
- lamps: #f6c067
- Render row-major; optional grid overlay for debugging.

---

## 10) Performance Targets & Complexity

Targets
- <200 ms at 128x128 on a typical dev laptop (2024-2026 era CPU).
- Memory: <16 MB transient; use typed arrays.

Hotspots and strategies
- A* for connectors: early-exit when heuristic < ε and near-goal; cap nodes; reuse open/closed buffers; 4/8-neighbor precomputed indices; tie-break with straightness bias.
- CA loops: use bitmasks and two buffers; branchless neighbor counts where possible.
- Floodfills: queue-based BFS using ring buffer; reuse buffers across passes.

Big-O (approx.)
- CA: O(w*h*steps)
- Floodfills: O(w*h)
- A*: O(E log V) with caps; practical ~O(k * w*h^0.5)
- Decorations/Ore: linear in grid size plus vein lengths.

---

## 11) Integration Notes (Bevy/ECS)

- Worldgen seed stored as resource (serde persisted). UiCommand(Regenerate{ seed, w, h, params_version }).
- Loader reads artifact JSON → spawns Tiles in deterministic order: row-major tiles, then anchors.rooms sorted by type then aabb, then anchors.lights in input order.
- Components:
  - Tile { id:u16, material:Handle<Material>, hardness:f32, collider: Option<Collider> }.
  - Light from anchors.lights; SoundEmitter later via biome hooks.
- Transforms: static; tile size assumed 16 px; Z-order: air < rubble < lamp; colliders for solid rock only.

---

## 12) Risks & Assumptions

Risks
- RNG substream drift if consumption order changes; mitigated by dummy draws and documented iteration orders.
- A* cost tuning can create too-straight or too-wiggly connectors; needs playtesting.
- Biome token changes by content owners can break palette mapping.

Assumptions
- Tile size = 16 px.
- Hardness → tool tier mapping provided later by Delta.
- Enemy anchor IDs stable in future sprints; empty in L1.

---

## 13) Acceptance Checklist

- [ ] Deterministic by seed (+w,h,params.version).
- [ ] Solvable path from spawn to exit with main corridor width ≥ 3.
- [ ] Room sizes and counts within defined bounds; separation respected.
- [ ] Connectivity: ≥90% of walkable tiles in MCC; loop density within range.
- [ ] Resource placement rules (ore, lights, decor) applied per biome and caps.
- [ ] Performance target: <200 ms at 128x128 met in profiling.
- [ ] Output matches JSON contract; Bevy mapping validated.
- [ ] Tests (64x64, seed=12345) pass assertions.

---