# The Far Mine — Cave Generation (Sprint 1, Mine L1)

Owner: Deepdelver Caveborn (Beta)  
Version: v0.4 • 2026-02-18

## 1) Title & Scope
- Deterministically carve a 2D tile map using room templates + CA smoothing + corridor carving; seed ores/lamps; emit JSON grid for ECS Tile component and TILE_FLAGS.
- Target size ~256×128 (prototype perf target at 96×64). Provide 64×64 sample.

## 2) Design Goals & Constraints
- Determinism: same seed → identical tiles. Use per-phase RNG substreams; no cross-phase RNG consumption.
- Connectivity: ≥90% of walkable cells must be in the main component. Door bands must honor Three‑Wide approaches.
- Performance: 10–20 ms at 96×64 in JS prototype. Plan parity with Rust/Bevy later; identical results per-impl not required in Sprint 1, only intra-impl determinism.
- Integration: Output maps to Tile{ tileType, hardness, flags }. Provide hooks (anchors) for future enemy/loot spawns.

## 3) Data Contracts
- TILE_TYPES (strings)
  - rock, floor, ore.copper, ore.iron, ore.quartz
- Hardness (integer)
  - rock=3, floor=0, ore.copper=4, ore.iron=5, ore.quartz=7
- TILE_FLAGS (bitmask)
  - ROOM_FLOOR=0x01
  - DOOR_BAND=0x02
  - ORE_PREF=0x04
  - LAMP_ANCHOR=0x08
  - APPROACH3W_PROTECT=0x10
- Output JSON schema (version=1)
  - {
    version:int(=1),
    seed:int|string,
    w:int, h:int,
    tiles: array[h][w] of { type:string in TILE_TYPES, flags:int, hardness:int },
    meta:{
      components:{ main:int, others:int },
      door_centers:[{x:int,y:int}],
      lamp_anchors:[{x:int,y:int}]
    }
  }
- Input configs
  - data/world/room-templates.json (existing; this doc defines stamping rules)
  - data/world/biome-crystal-caverns.json (schema below)
  - Palettes/colors via external refs (unchanged)

## 4) Algorithm Overview (pipeline)
- Phase A — Layout Seed
  - Place N rooms from templates with rotation. Disallow overlaps via AABB + 1-tile moat. Ensure doorBands Three‑Wide and approachDepth ≥ max(template.depth, biome.approachDepth).
- Phase B — Corridor Planning
  - Build door-center graph; connect via deterministic MST (Prim’s). Carve Three‑Wide corridors using a grid-aware marcher (Manhattan with bend penalty), preserving approach lanes.
- Phase C — CA Smoothing
  - Initialize binary rock/floor from rooms+corridors. Run 4–5 generations of 8-neigh 4/5 rule (B5678/S45678-like), constrained by a protection mask that preserves approach lanes and corridor core.
- Phase D — Ore Vein Seeding
  - Use ORE_PREF hints (from templates) to choose seeds; flood-grow per-ore counts/cluster sizes; set hardness per ore; never overwrite floors or door bands.
- Phase E — Lamp Anchors
  - Along corridors and rooms, mark LAMP_ANCHOR on suitable wall/ceiling rock at biome.lamp.spacing, skipping door spans and ores; record anchors in meta.
- Phase F — Finalization
  - Reinforce flags (DOOR_BAND spans; APPROACH3W_PROTECT first k behind doors). Compute connectivity; if <90%, bridge smallest gaps or reclaim tiny orphan pockets back to rock.

## 5) RNG & Determinism Plan
- Base PRNG: xorshift32 on 32-bit seeds.
  - state:uint32
  - nextUint(): state ^= state<<13; state ^= state>>>17; state ^= state<<5; return state
  - nextFloat(): (nextUint() >>> 0) / 4294967296
- Substreams: deriveSeed(baseSeed:uint32, tag:string) → uint32
  - hash32 FNV-1a over ASCII tag; return baseSeed XOR hash32 XOR 0x9E3779B9
- Phase tags (exact): "room_placement", "corridor_graph", "corridor_carve", "ca", "ore", "lamps"
- All random choices (template pick, rotation, order, tiebreaks) must pull from the corresponding substream only.

## 6) Room Stamping Rules
- Template rune semantics (pre-rotated grid):
  - '#': solid rock (do not set flags)
  - '.': floor; set type=floor, hardness=0; flags|=ROOM_FLOOR
  - 'D': floor; flags|=ROOM_FLOOR|DOOR_BAND (centered Three‑Wide doorway segment)
  - 'O': rock; flags|=ORE_PREF (hint only, still rock)
- Rotation: rotate grid and metadata (door band normals, approach depth vectors) 0/90/180/270.
- Three‑Wide mouths: door bands must be 3 tiles orthogonal to mouth normal; ensure at least approachDepth cells of '.' directly behind each door band (post-rotation).
- Placement constraints:
  - AABB + 1-tile moat of rock around non-door perimeters (moats may touch map boundary).
  - Rooms cannot overlap each other’s stamped cells ('.'/'D'/'O'), except door bands may later be merged with corridor floors.
  - Stamp within bounds only; if out-of-bounds, reject placement.

## 7) Corridor Carving (Three‑Wide Law)
- Door graph
  - Nodes: all door band centers (integer grid coords).
  - Edge weight: |dx|+|dy| + bendPenalty*(dx!=0 && dy!=0 ? 1:0) where bendPenalty=biome.corridor.bend_penalty.
  - Deterministic tiebreak: lexicographic by node id; node id = y*w + x.
- Selection: Prim’s MST using corridor_graph RNG for any randomized ordering (but prefer deterministic lexicographic seed to break ties consistently).
- Marcher (for each selected edge):
  - Carve a central path between a and b favoring cardinal steps that reduce max(|dx|,|dy|); allow 1-cell lateral offsets to maintain 3-wide continuity around corners.
  - For each center step, stamp a 3-wide cross-section orthogonal to current direction:
    - Set type=floor, hardness=0; flags|=ROOM_FLOOR
    - On doorway span cells, also flags|=DOOR_BAND
  - Protect first k = biome.approachDepth tiles behind each door center along the corridor direction: flags|=APPROACH3W_PROTECT. Do not allow pillars or CA erosion here.
- Optional loops: With probability ratio biome.corridor.extra_ratio, add MST-noncritical edges (lowest weights first).
- Corridor core protection mask: keep the central 1-tile line protected during CA; side tiles may be smoothed unless APPROACH3W_PROTECT.

## 8) Cellular Automata Details
- Grid: binary mask M where rock=1, floor=0 initialized from stamped rooms+corridors.
- Neighborhood: 8-neigh count n (0..8).
- Update rule per iteration (tuned by biome.ca):
  - Birth (rock→floor): if n <= (8 - birthMin) where birthMin=biome.ca.birthMin (default 5)
  - Survive (floor stays floor): if rockNeighbors < (8 - surviveMin); otherwise flip to rock.
  - Equivalently: newRock = (n >= birthMin) || (n == 0) when using rock-majority framing.
- Protection mask: cells with flags&(ROOM_FLOOR|APPROACH3W_PROTECT) remain floor; CA cannot flip them. Corridor centerline remains floor.

## 9) Ore Veins
- Candidates: rock cells; prioritize ORE_PREF with bias pref_bias per ore type.
- For each ore type in biome.ore (in fixed order: copper, iron, quartz):
  - Repeat count times:
    - Pick seed: weighted by (ORE_PREF ? pref_bias : 1 - pref_bias), disallow any floor/door cells.
    - Cluster target size: uniform in [min,max].
    - Grow via BFS frontier: for each popped cell, mark ore if rock; enqueue 4-neigh with probability p decaying with distance from nearest ORE_PREF (linear falloff).
    - Stop at cluster target or frontier exhaustion.
  - Set type=ore.<name>; hardness as per table; do not overwrite non-rock.
- Mine L1 defaults:
  - Copper common near ORE_PREF pockets; Iron occasional near cavern rims; Quartz disabled (count 0).

## 10) Lamps
- Corridors: every biome.lamp.spacing tiles, starting after approachDepth + 1 cells from each door, choose a rock tile adjacent (4-neigh) to floor with headroom (no floor above if ceiling lamp) or wall position (side of corridor). Mark LAMP_ANCHOR on that rock tile and record {x,y}.
- Rooms: place at least biome.lamp.per_room anchors on rim segments: pick rock cells adjacent to room floor, maximize spacing, avoid door spans and ore tiles.

## 11) Pseudocode (concise, implementable)
```
type Tile = { type:string, hardness:int, flags:int }
type Grid = { w:int, h:int, tiles: Tile[][] }
type PlacedRoom = { id:string, aabb:{x,y,w,h}, doorCenters:{x,y,dir}[] }
type Edge = { a:{x,y}, b:{x,y}, w:int }

function generate_map(seed:int, w:int, h:int, biomeCfg, templates): MapJson {
  let grid = alloc_grid(w,h, type="rock", hardness=3, flags=0)
  let rngRooms = make_rng(deriveSeed(seed,"room_placement"))
  let rngGraph = make_rng(deriveSeed(seed,"corridor_graph"))
  let rngCarve = make_rng(deriveSeed(seed,"corridor_carve"))
  let rngCA    = make_rng(deriveSeed(seed,"ca"))
  let rngOre   = make_rng(deriveSeed(seed,"ore"))
  let rngLamp  = make_rng(deriveSeed(seed,"lamps"))

  let rooms = place_rooms(rngRooms, w,h, templates, biomeCfg.room_counts, biomeCfg.approachDepth, grid)
  let edges = connect_doors_mst(rngGraph, rooms, biomeCfg.corridor.bend_penalty, w)

  for e in edges:
    carve_corridor_3w(rngCarve, grid, e.a, e.b, biomeCfg.approachDepth)

  run_ca(rngCA, grid, biomeCfg.ca.iterations, biomeCfg.ca.birthMin, biomeCfg.ca.surviveMin)

  seed_ores(rngOre, grid, biomeCfg.ore)

  let anchors = place_lamps(rngLamp, grid, biomeCfg.lamp, rooms)

  finalize_and_metrics(grid) // set DOOR_BAND spans, ensure APPROACH3W_PROTECT, clamp flags
  let cc = compute_connectivity(grid)
  if (cc.ratio < 0.90) { improve_connectivity(rngCarve, grid) ; cc = compute_connectivity(grid) }

  return to_json_v1(seed, grid, cc, rooms, anchors)
}

function place_rooms(rng,w,h,templates,count_range,approachDepth,grid): PlacedRoom[] {
  // Determine counts per template category deterministically from rng
  // For each pick: choose template, rotation, sample position in bounds; test AABB + 1-tile moat, no stamp overlap.
  // Validate door 3-wide and approachDepth behind D; stamp runes into grid ('.','D' floors; 'O' rock|ORE_PREF).
}

function connect_doors_mst(rng, rooms, bendPenalty:int, w:int): Edge[] {
  // Gather all doorCenters; compute complete graph weights: |dx|+|dy| + (dx!=0 && dy!=0 ? bendPenalty:0)
  // Prim's MST: start from lexicographically smallest node id (y*w+x); deterministic tie-breaks.
}

function carve_corridor_3w(rng, grid, a:{x,y}, b:{x,y}, protect_k:int): void {
  // March from a to b: while (x!=bx || y!=by) choose step reducing max(|dx|,|dy|); prefer axis with larger |d|.
  // Apply lateral 1-cell offsets if needed to keep 3-wide continuous around corners.
  // For each center (cx,cy): stamp cross-section 3-wide orthogonal to last move: set type=floor,hardness=0, flags|=ROOM_FLOOR
  // Mark first k cells behind door centers with flags|=APPROACH3W_PROTECT; door span tiles flags|=DOOR_BAND.
}

function run_ca(rng, grid, iterations:int, birthMin:int, surviveMin:int): void {
  // Uint8Array mask for rock(1)/floor(0). Int8Array for flags.
  // For t in 1..iterations: compute next mask by counting 8-neigh; skip cells with ROOM_FLOOR or APPROACH3W_PROTECT.
  // After CA, sync mask->tiles: rock vs floor type/hardness; preserve ore types and protected floors.
}

function seed_ores(rng, grid, oreCfg): void {
  // For ore in [copper, iron, quartz]:
  //   repeat ore.count: pick seed rock weighted by ORE_PREF bias; BFS grow up to cluster[min,max]; never overwrite floor/door.
  //   Set tile.type to ore token, tile.hardness per table, flags unchanged except clear ORE_PREF if overwritten.
}

function place_lamps(rng, grid, lampCfg, rooms): Anchor[] {
  // Corridors: scan corridor floors along centerlines; every spacing, pick adjacent rock cell with floor neighbour; flags|=LAMP_ANCHOR
  // Rooms: per room, place at least per_room anchors on rim rock adjacent to room floors, avoid doors/ores.
  // Return list of {x,y} for anchors.
}

function compute_connectivity(grid): { mainSize:int, ratio:number } {
  // BFS/DFS over floor cells (type==floor or ore? floor only). Count largest component and total floors. ratio = main/total.
}
```
Notes
- Use row-major storage: tiles[y][x]. rock/floor mask as Uint8Array(h*w). flags as Uint8Array or Int32Array per tile for bit ops.

## 12) Biome JSON Shape (Crystal Caverns L1)
```
{
  "version": 1,
  "id": "biome.crystal_caverns.l1",
  "tile_palette": {
    "rock": "rock",
    "floor": "floor",
    "oreCopper": "ore.copper",
    "oreIron": "ore.iron",
    "oreQuartz": "ore.quartz"
  },
  "room_counts": { "tunnel": [3, 6], "cavern": [1, 2], "ore_pocket": [1, 2] },
  "approachDepth": 3,
  "corridor": { "extra_ratio": 0.15, "bend_penalty": 2 },
  "ca": { "iterations": 4, "birthMin": 5, "surviveMin": 4 },
  "ore": {
    "copper": { "count": 6, "cluster": { "min": 4, "max": 12 }, "pref_bias": 0.75 },
    "iron":   { "count": 2, "cluster": { "min": 3, "max": 7 },  "pref_bias": 0.55 },
    "quartz": { "count": 0, "cluster": { "min": 0, "max": 0 },  "pref_bias": 0.0 }
  },
  "lamp": { "spacing": 10, "per_room": 2 }
}
```
Notes: Numeric defaults may tune slightly during prototype. Ids must match TILE_TYPES.

## 13) Sample Output & Exports
- Deliver:
  - data/world/samples/map-l1-s64x64-seed-1337.json
  - data/world/samples/map-l1-s64x64-seed-1337.png (occupancy; floor light, rock dark; doors amber overlay optional)
- Serialization
  - Grid order: row-major (y outer 0..h-1, x inner 0..w-1).
  - JSON version=1; seed stored as provided (int or string).

## 14) Test Plan
- Determinism: run generate_map on seeds [1337, 42, 8675309] and compute SHA256 over tiles array (type|flags|hardness); expect stable hash across runs/machines for same implementation.
- Connectivity: BFS largest component ratio ≥ 0.90; if fail, adjust bend_penalty/extra_ratio and/or CA thresholds.
- Invariants:
  - Every door band is 3-wide; first k=approachDepth floor cells behind doors exist and are flagged APPROACH3W_PROTECT.
  - No floor out of bounds; ore never overwrites floor/door; flags only from known bits.
- Performance: micro-benchmark 10 runs @64×64; report mean ± stddev; must be within budget skew-scaled to 96×64 target (10–20 ms).

## 15) Integration Notes
- ECS bridge: loader maps JSON to Tile components using TILE_TYPES/TILE_FLAGS in src/core/ecs-registry.js.
- Bevy/Rust parity: mirror structs; PRNG via deterministic PCG32 or XorShift; cross-language identical seeds not required this sprint (per-impl determinism only).
- Visuals: tint via palette tokens; minimap tokens reserved for future.
- Audio: lamp anchors and door centers may drive ambience later.

## 16) Risks & Assumptions
- Risk: Corridor marcher with backtracking may exceed JS budget on larger grids; mitigation: Manhattan-greedy with bounded detours and pre-checked feasibility.
- Risk: RNG substream misuse breaks determinism; mitigation: lint phase-local generators and forbid cross-phase consumption.
- Assumption: room-templates.json grids valid and include door metadata; biome JSON accepted as above in Sprint 1.