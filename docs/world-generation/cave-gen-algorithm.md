# The Far Mine — Cave Generation L1 (Sprint 1)

Author: Deepdelver Caveborn (Beta)  
Version/Date: v0.1 / 2026-02-18  
Status: Draft v0.1

Scope: Level 1 slice world generation for ~256×128 target (default 128×128 during Sprint 1), 16 px tiles, deterministic seed → tilemap. Techniques: CA smoothing + three-wide tunneling + connectivity guarantees, ore/feature placement, metadata suitable for ECS ingestion.

---

## 2) Goals & Constraints

- Determinism: Identical output for same 64-bit seed and params. Substreams for phase stability.
- Connectivity:
  - ≥90% of floor tiles in main connected component.
  - Always-solvable main path from Spawn (top-left band) to Exit (bottom-right band) with clearance width ≥3.
  - Corridor minimum width three for primary arteries (spine and guaranteed connectors).
- Bounds:
  - Room sizes and counts constrained (see Parameters).
  - Corridor density bounded by connectors_max and room counts.
- Performance:
  - <200 ms @128×128, default params, on dev laptop (JS/TS, single thread).
  - Memory: Use typed arrays (Uint8Array/Int16Array/Uint32Array) and reuse buffers.
- Robustness: Edges clamped to solid; validation + limited retries.

---

## 3) Tile & Output Contract (Data Model)

- Coordinate system: 0 ≤ x < w (left→right), 0 ≤ y < h (top→bottom). Row-major index i = y*w + x.
- Output:
  - tiles: Int16Array or Uint16Array (terrain codes).
  - masks:
    - floor: Uint8Array (0/1)
    - wall: Uint8Array (0/1) derived skirt around floor
    - ore: Uint8Array (0: none, 10: copper, 11: quartz, 12: iron)
  - features layer (anchors/props) emitted as marker lists rather than per-tile raster, except lamp anchors optionally stamped as tile code 20 in tiles for convenience.
- Layers (conceptual):
  - terrain: 0=void(outside), 1=solid_rock, 2=floor, 3=wall
  - ore: 0 none, 10 copper, 11 quartz, 12 iron (placed on solid or wall, never on floor)
  - features: 20 lamp_anchor, 21 rubble, 11 crystal.quartz visual anchor (mirrors ore 11) where applicable
  - markers: 30 spawn, 31 exit, plus generic anchors [{x,y,kind}]
  - biome tags (string[] at map level; optional per-cell byte tag)
  - difficulty depth: per-row scalar (e.g., y/h)
- JSON schema sketch:
  - {
      version: "l1.0",
      seed: "0x…",
      w, h,
      tiles: int[],               // row-major
      masks: {
        floor: uint8[],
        wall: uint8[],
        ore: uint8[]
      },
      markers: {
        spawn: [x,y],
        exit: [x,y],
        anchors: [{x,y,kind}]     // kind ∈ ["lamp","checkpoint","crystal_glow"]
      },
      biome: "mine.l1",
      metrics: {
        connectivity: 0.0..1.0,
        loop_count: int,
        floor_ratio: 0.0..1.0,
        path_len: int
      },
      params: { … }               // echo resolved parameters
    }
- ECS Integration:
  - Tile component: { code, hardness, tool_tier, materialTag }
    - code from tiles[]; hardness/tier per mapping (see Tile Codes).
  - OreVein entity for each contiguous ore region with {kind, bbox, cells[]} or per-anchor point to support runtime vein growth.
  - LightAnchor entities from markers.anchors where kind="lamp".
  - Audio hooks: materialTag e.g., "rock.t0", "ore.copper", "crystal.quartz".

---

## 4) Algorithm Overview

Pipeline phases:

a) RNG init  
- Initialize master 64-bit seed. Derive substreams: structure, tunneling/path, rooms, ores, deco. Use SplitMix64 → XorShift128+ or PCG64. All sampling draws must use designated substream.

b) Primordial Noise  
- Seed occupancy as floor with probability p0 (initial_fill_p). Clamp a 1-tile border to solid.

c) Cellular Automata smoothing  
- 4–5 steps using floor-centric rule akin to B5+/S4+:
  - Let n = count of 8-neighbors that are floor.
  - If cell is floor: stays floor if n ≥ survive_thresh (default 4); else becomes solid.
  - If cell is solid: becomes floor if n ≥ birth_thresh (default 5).
- After CA, enforce border solid.

d) Extract components  
- Flood-fill 4-neighbors on floor cells, label region ids. Keep largest as main. Others recorded as candidates for connectors/rooms.

e) Connector Carving  
- Choose spawn in top-left band (x ∈ [2..w*0.2], y ∈ [2..h*0.2]) on nearest floor to corner; same for exit in bottom-right band (x ∈ [w*0.8..w-3], y ∈ [h*0.8..h-3]).
- A* from spawn→exit on grid nodes with width-3 feasibility. Cost:
  - base = 1 for floor, 1 + wall_carve_cost (default 3) for solid.
  - bias: -0.25 if current or neighbor already floor to prefer open cells.
  - curvature penalty: +0.5 when turning too frequently (limit max bend rate).
- Carve three-wide spine along path. Stamp doorways min width 3.
- Connect side regions to spine using region adjacency graph:
  - Build edges where a minimal Manhattan connector exists (scan frontier cells). Weight by length + carve penalty.
  - Run Prim’s MST until connectivity ≥0.90 floor coverage or connectors_max reached.
  - Add 1±1 extra edges to form 0–2 loops, preferring short connectors.

f) Room Stamping  
- Attempt 2–4 tunnel rooms, 1–2 caverns, 2–3 ore-pocket rooms using templates and rejection sampling:
  - Respect no-overlap (or soft overlap with existing floor by re-carving walls).
  - Connect rooms with ≥3-wide doors to nearest spine or corridor.
  - Reconcile walls after carving.

g) Validation  
- Recompute floor/wall masks. Run width-3 A* from spawn to exit. If no path, retry connector step up to K=3 with perturbed tie-breakers. Verify main CC ≥ 0.90.

h) Resource Seeding  
- Copper: 0.6–1.2% of tiles as ore cells; prefer wall/solid within 3 tiles of spine/corridors.
- Quartz: 0.3–0.6%, cluster in caverns and open rooms.
- Iron: 0.1–0.2%, y > h*0.6 band; sparse pockets.
- Place ores only on solid/wall, never overwriting floor or mandatory doorways.

i) Feature/Lighting  
- Lamp anchors every 12–18 tiles along spine and at T-junctions. Cap 40 @128×128.
- Rubble: sparse decorative on floor edges, non-blocking.
- Crystal glow anchors near quartz clusters.

j) Finalize  
- Compute metrics (connectivity, loop_count, floor_ratio, path_len). Assemble JSON payload and optional 1-bit PNG artifact.

---

## 5) Parameters & Bounds

- Grid: default w=128, h=128 (target 256×128 Sprint 2).
- CA:
  - initial_fill_p: 0.42–0.48 (default 0.45)
  - steps: 4–5 (default 5)
  - birth_thresh: 5
  - survive_thresh: 4
- Spine/tunnels:
  - width: 3
  - A* heuristic weight: 1.0 (Manhattan)
  - wall_carve_cost: 3
  - max bend rate: disallow 3 consecutive turns; add 0.5 per turn
  - door width min: 3
- Rooms:
  - counts: tunnel 2–4, cavern 1–2, ore-vein 2–3
  - sizes (w×h):
    - tunnel: 7×13..9×21 (elongated rectangles)
    - cavern: 12×12..20×18 (oval/irregular)
    - ore pocket: 5×7..9×11 (dense ore mask within solid)
- Connectivity:
  - min_main_cc: 0.90
  - loops_target: 1±1
  - connectors_max: 12
- Resources:
  - copper: 0.6–1.2% tiles, bias dist≤3 to spine/corridors
  - quartz: 0.3–0.6% in caverns
  - iron: 0.1–0.2% with y>0.6h
- Lamps: spacing 12–18 along spine; at T-junctions; max 40 @128×128.

---

## 6) Tile Codes, Hardness, Tool Tier

- 0 = void (outside map), hardness 0, n/a
- 1 = solid_rock.t0, hardness ≈ 1.0, tool_tier t0, materialTag "rock.t0"
- 2 = floor (walkable), hardness 0, n/a
- 3 = wall (face adjacent to floor; solid), hardness ≈ 1.0, tool_tier t0, materialTag "rock.t0"
- 10 = ore.copper (ore layer; base terrain remains 1 or 3), hardness ≈ 1.4, tool_tier t1, materialTag "ore.copper"
- 11 = crystal.quartz.t1 (ore/feature; usually on 1 or 3), hardness ≈ 1.6, tool_tier t1, materialTag "crystal.quartz"
- 12 = ore.iron.t1_5, hardness ≈ 1.8, tool_tier t1_5, materialTag "ore.iron"
- 20 = lamp_anchor (feature; also emitted as anchor entity)
- 21 = rubble (decor, non-blocking; place on floor)
- 30 = marker.spawn
- 31 = marker.exit

Mapping: ECS Tile component reads tiles[]; OreVein/Crystal from masks.ore and anchors; LightAnchor from markers.anchors and/or tiles==20.

---

## 7) Seed Management & RNG Discipline

- Master 64-bit seed S. Expand via SplitMix64 to produce five 128-bit states:
  - structure, path, rooms, ores, deco
- Each phase exclusively uses its substream to avoid drift.
- Stable iteration:
  - Iterate in fixed scanlines or sorted lists (by index) for all loops.
  - Explicit tie-breakers: when costs equal, prefer smaller (y, then x).
  - Avoid for..of on object keys; pre-sort arrays deterministically.
- Any added sampling must consume from correct substream and be placed where order is guaranteed (append-only, not inside unordered maps).

---

## 8) Pseudocode: generate_map(seed, w, h)

```pseudo
type U8 = Uint8Array
type U16 = Uint16Array
type I16 = Int16Array

function generate_map(seed64: u64, w: int, h: int, inParams?: Params): GenResult {
  const p = resolveParams(inParams) // clamp to bounds
  const rng = makeRNGs(seed64) // {structure, path, rooms, ores, deco}

  // Buffers
  const floor = new U8(w*h)     // 0/1
  const wall  = new U8(w*h)     // 0/1
  const ore   = new U8(w*h)     // 0,10,11,12
  const tiles = new U16(w*h)    // terrain codes

  // a) Primordial Noise (structure RNG)
  for y in 0..h-1:
    for x in 0..w-1:
      i = y*w + x
      if x==0 || y==0 || x==w-1 || y==h-1:
        floor[i] = 0
      else:
        floor[i] = rng.structure.nextFloat() < p.initial_fill_p ? 1 : 0

  // b) CA smoothing
  for step in 1..p.ca_steps:
    tmp = new U8(w*h)
    for y in 1..h-2:
      for x in 1..w-2:
        i = y*w + x
        n = count8NeighborsFloor(floor, w, h, x, y)
        if floor[i]==1:
          tmp[i] = (n >= p.survive_thresh) ? 1 : 0
        else:
          tmp[i] = (n >= p.birth_thresh) ? 1 : 0
    // clamp border
    for x in 0..w-1: tmp[x]=0; tmp[(h-1)*w + x]=0
    for y in 0..h-1: tmp[y*w]=0; tmp[y*w + (w-1)]=0
    floor.set(tmp)
  end

  // c) Region labeling
  const regionId = new I16(w*h).fill(-1)
  let regions = [] // {id, size, anyCell}
  let rid = 0
  for i in 0..w*h-1:
    if floor[i]==1 && regionId[i]==-1:
      size = flood_fill_label_floor(floor, regionId, w, h, i, rid)
      regions.push({id: rid, size})
      rid += 1
  sort regions by size desc
  const mainRegion = regions.length>0 ? regions[0].id : -1

  // d) Spawn/Exit selection on existing floor or nearest carve
  const spawn = pickMarkerInBand(floor, w, h, bandTL(), rng.path)
  const exit  = pickMarkerInBand(floor, w, h, bandBR(), rng.path)
  stampMarker(tiles, w, h, spawn, 30)
  stampMarker(tiles, w, h, exit, 31)

  // e) Spine pathfinding (A* with width-3 clearance)
  const clearance = computeClearanceSolid(floor, w, h) // distance-to-solid in tiles
  const path = aStar_width3(spawn, exit, floor, clearance, w, h, p, rng.path)
  carve_three_wide(floor, w, h, path)

  // Walls from floor (initial)
  recompute_walls(floor, wall, w, h)

  // f) Region graph + connectors (ensure ≥90% floor coverage)
  let ccCoverage = main_cc_ratio(floor, w, h)
  if ccCoverage < p.min_main_cc:
    const graph = buildRegionAdjacency(floor, regionId, w, h)
    const mstEdges = prim_connectors(graph, rng.path, p.connectors_max)
    for e in mstEdges:
      const connPath = carve_connector_path(e, floor, w, h, p, rng.path) // three-wide
      carve_three_wide(floor, w, h, connPath)
    recompute_walls(floor, wall, w, h)

  // g) Rooms
  place_rooms(floor, wall, w, h, p, rng.rooms)

  // h) Validation with retries
  let ok=false
  for attempt in 1..3:
    recompute_walls(floor, wall, w, h)
    if path_exists_width3(spawn, exit, floor, w, h, p):
      ok=true; break
    // retry connectors with perturbed weights
    tweak_path_bias(rng.path, attempt)
    add_short_connector(floor, w, h, rng.path, p)
  if !ok: force_direct_spine(spawn, exit, floor, w, h, p) // guaranteed carve

  // i) Resources (ores only on solid/wall)
  seed_ore("copper", ore, floor, wall, w, h, p, rng.ores, biasToSpine=true)
  seed_ore("quartz", ore, floor, wall, w, h, p, rng.ores, cavernsOnly=true)
  seed_ore("iron",   ore, floor, wall, w, h, p, rng.ores, deeperBand=true)

  // j) Features / Lamps
  const anchors = []
  place_lamps_along_path(anchors, floor, wall, w, h, p, rng.deco)
  sprinkle_rubble(tiles, floor, wall, w, h, p, rng.deco)
  add_crystal_glow_anchors(anchors, ore, w, h, rng.deco)

  // Assemble terrain tiles
  for i in 0..w*h-1:
    if floor[i]==1:
      tiles[i] = 2
    else if wall[i]==1:
      tiles[i] = 3
    else:
      tiles[i] = 1
  // keep explicit markers & lamps if desired
  for each a in anchors where a.kind=="lamp":
    tiles[a.y*w + a.x] = 20

  const metrics = compute_metrics(floor, w, h, spawn, exit)

  return {
    version: "l1.0",
    seed: fmtHex(seed64),
    w, h,
    tiles: toJSArray(tiles),
    masks: { floor: toJSArray(floor), wall: toJSArray(wall), ore: toJSArray(ore) },
    markers: { spawn: [spawn.x,spawn.y], exit: [exit.x,exit.y], anchors },
    biome: "mine.l1",
    metrics,
    params: p
  }
}

// Helpers (signatures)
function flood_fill_label_floor(floor: U8, regionId: I16, w,h,i0,rid): int
function count8NeighborsFloor(floor: U8, w,h,x,y): int
function computeClearanceSolid(floor: U8, w,h): U8 // min distance to any solid; treat floor=1 as free
function aStar_width3(start, goal, floor, clearance, w,h,p,rng): Point[]
function carve_three_wide(floor: U8, w,h, path: Point[]): void
function recompute_walls(floor: U8, wall: U8, w,h): void // wall=1 where solid adjacent (8-neigh) to floor
function buildRegionAdjacency(floor: U8, regionId: I16, w,h): Graph
function prim_connectors(graph, rng, maxEdges): Edge[]
function carve_connector_path(edge, floor, w,h,p,rng): Point[]
function place_rooms(floor, wall, w, h, p, rng): void
function path_exists_width3(spawn, exit, floor, w, h, p): bool
function seed_ore(kind, ore: U8, floor: U8, wall: U8, w,h,p,rng, flags): void
function place_lamps_along_path(anchors[], floor, wall, w, h, p, rng): void
function sprinkle_rubble(tiles: U16, floor: U8, wall: U8, w,h,p,rng): void
function add_crystal_glow_anchors(anchors[], ore: U8, w,h,rng): void
function compute_metrics(floor, w,h,spawn,exit): {connectivity, loop_count, floor_ratio, path_len}
```

Key details:
- Width-3 feasibility: require clearance[y*w+x] ≥ 1 for center cell, and carve three-wide as a 3×3 diamond or 4-connected radius 1 cross; consistent for both checks and carve.
- Ore BFS: start from seed wall/solid, expand 4-neigh until target count; avoid placing adjacent to spawn/exit tiles; never overwrite floor.

---

## 9) Example Layout (ASCII)

Seed: 0x0000_0000_DEEP_D1G  
Params: w=64, h=32, initial_fill_p=0.45, ca_steps=5, wall_carve_cost=3, lamp_spacing=14

Legend:
- . floor, # solid rock, = main spine, + junction, [ ] room walls implied, C copper, Q quartz, I iron, L lamp, S spawn, E exit

```
################################################################
##S====L============+============L============+============E###
##......###########..............###########.............#####.
##......###########....[cavern]..###########....[room]..#####.
##......######C####....[QQQQQQ]..######C####............#####.
###.....######C####....[QQQQQQ]..######C####.....C......#####.
###.....######C####..............######C####............#####.
###.....######C####====L====+====######C####====L====+==#####.
###..................#######..................#######.........
#####IIII##########..#######..##########IIII..#######..######.
#####IIII##########..#######..##########IIII..#######..######.
#####....##########..#######..##########....I.#######..######.
#####....##########..#######..##########....I.#######..######.
#####....====L=======#######==+====L======....#######..######.
#####................#######...............L.#######..######.
###################..#######..#####################..########
###################..#######..#####################..########
###################..#######..#####################..########
################################################################
```

Notes: Spine marked by =; lamps at regular spacing; T-junctions '+'; copper C near corridors; quartz Q clustered in cavern; iron I deeper rows.

---

## 10) Performance Notes

- CA smoothing: O(steps * w*h). Single pass neighbor counts; reuse buffer.
- Flood-fill labeling: O(w*h). Queue-based BFS with preallocated ring buffer.
- A*: Nodes ≤ w*h; heuristic-consistent. Use binary heap; cost evaluation constant-time. Width-3 clearance precomputed by one pass distance transform (manhattan or chamfer) O(w*h).
- Region graph build: scan edges; amortized O(w*h).
- Connectors/Rooms: small fixed counts; path carving linear in connector lengths.
- Ore seeding: sample anchors (O(K)); BFS-limited to small pockets.
- Memory: ~ (w*h) * (floor:1 + wall:1 + ore:1 + tiles:2 + regionId:2 + clearance:1) ≈ 8 bytes/cell + overhead. 128×128 ≈ 128 KB core.
- Optimizations:
  - Reuse arrays; avoid allocations in hot loops.
  - Early exit if connectivity ≥ target before full connector build.
  - Clamp attempts to ≤3 retries.

---

## 11) Testing & Acceptance

- Determinism:
  - For fixed seed and params, SHA-1(tiles) and SHA-1(masks.ore) stable across runs/hosts.
- Connectivity:
  - width-3 A* finds path spawn→exit.
  - main CC ratio ≥ 0.90; loop_count within 0–2.
- Resource bounds:
  - Tile counts within configured % ranges (±0.05% tolerance).
  - No ore on floor or blocking 3-wide doors.
- Lamps:
  - Count ≤ cap; spacing within [12..18] along spine; lamps at all T-junctions.
- Artifacts:
  - Emit JSON grid and 1-bit PNG (floor vs solid) for sanity; optional debug PNG for ore overlay.
- Regression suite:
  - Golden seeds set (e.g., 10 seeds) checked for hashes and metrics envelopes.

---

## 12) Risks & Assumptions

- A* cost tuning at 256×128 may exceed 200 ms without heap micro-optimizations; consider Jump Point Search if needed.
- Tool tiers and hardness may shift in Gamma/Delta; keep code->tier mapping data-driven (tools.json).
- Room templates must validate against schema (size bounds, door placements); malformed templates can break connectivity.
- CA parameters may need biome-dependent tuning; current defaults target L1.
- Rendering expects walls around floors; ensure recompute_walls after every carve.

---

## 13) References & Integration

- ECS components:
  - Tile, OreVein, LightAnchor, Marker. Events: OnTileMined(materialTag) → audio.
- Data:
  - configs/tools.json (tiers t0, t1, t1_5)
  - palettes/lights.json (lamp/crystal colors)
  - audio/material_map.json (rock/ore/crystal hits)
- Templates:
  - assets/worldgen/rooms/l1/tunnel_*.json
  - assets/worldgen/rooms/l1/cavern_*.json
  - assets/worldgen/rooms/l1/ore_pocket_*.json
- Module paths:
  - src/worldgen/cave/gen_l1.ts
  - src/worldgen/util/rng.ts (SplitMix64, XorShift128+)
  - src/worldgen/util/astar.ts
  - src/worldgen/util/floodfill.ts
  - src/worldgen/export/json.ts, src/worldgen/export/png.ts

---