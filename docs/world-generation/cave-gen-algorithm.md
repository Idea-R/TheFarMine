# Cave Generation — Lanes, Chambers, and the Singing Stone (Sprint 1)

Provenance
- Owner: @beta (World Generation — Deepdelver Caveborn)
- This is the authoritative Sprint 1 spec for cave generation implementable in Phaser 3, binding to the ECS Tile contract.
- Cross-references:
  - data/world/biome-crystal-caverns.json
  - data/world/room-templates.json
  - docs/core-systems/ecs-architecture.md (§Archetypes & Tile)
  - docs/technology-systems/crafting-design.md (§Hardness & gating)
  - docs/visual-systems/style-guide.md (§Lanes & lamps)
  - data/core/component-schemas.json (Tile component)
  - src/core/ecs-registry.js

As I, Deepdelver Caveborn, have learned from the Singing Stone: lay your lanes true, keep your chambers strong, and light the path for those who follow. The rest is bookkeeping.



## 2) Goals & Constraints (MVP)

- Three-wide Law everywhere (doors and corridors).
- Deterministic by seed (stable across runs and platforms).
- Fast: target 10–20 ms for 96×64 maps on a mid-tier desktop.
- Template-driven rooms from room-templates.json.
- Readable corridors with low-turn A*; no dead-end doors.
- Ore seeded per biome rules without blocking lanes; respects lane clearance.
- Lamps placed at every door and at fixed intervals down corridors.
- Spawn anchors along lanes with minimum separation and door exclusion.

Non-goals (Sprint 1)
- Multi-level maps, fluids (water/lava), biome blending, dynamic collapse.



## 3) Input & Output Contracts (Implementation-Oriented)

Entry point
- Function: generate in src/worldgen/cave-gen.js
- Signature:
  - generate({ seed:int|string, biomeId:string="biome.crystal.caverns", width?:int, height?:int }): MapData

Output MapData (all fields required unless noted)
- version:int
  - 1
- width:int, height:int
- tiles: TileCell[height][width]
  - TileCell = { tileType:"floor"|"rock"|"rock.ore", hardness:int, oreType:string } with oreType="" when not an ore cell
- rooms: array
  - [{ id:string, kind:"tunnel"|"cavern"|"ore_vein", bounds:{x:int,y:int,w:int,h:int}, rotation:int (0|90|180|270), doors:[{x:int,y:int,dir:"N"|"S"|"E"|"W"}] }]
- corridors: array (advisory; engine may rasterize from tiles)
  - [{ path:[{x:int,y:int}], width:int(=3) }]
- doors: array (flattened, deduplicated from rooms[].doors)
  - [{ x:int, y:int, dir:"N"|"S"|"E"|"W" }]
- lamps: array
  - [{ x:int, y:int, tintToken:string }]
- spawnAnchors: array
  - [{ x:int, y:int, kind:"enemy" }]
- minimap: object
  - { raster: uint8[height][width] } category encoding: 0=bg, 1=room, 2=corridor, 3=ore
- rng: object
  - { seed:string, streams: { rooms:int, corridors:int, ore:int, decor:int, lamps:int, spawns:int } }
  - Each int is the 32-bit sub-seed actually used to initialize that stream.
- hash:string
  - Deterministic XXH64 (or equivalent) over the raster of per-tile code derived only from tileType and oreType (see §5 and §9).

ECS integration note
- TileCell maps to Tile component data when instantiating entities or building the Phaser 3 tilemap layer.
  - tileType → solidity (rock/rock.ore solid; floor non-solid).
  - hardness → mining gate, honoring docs/technology-systems/crafting-design.md; tools.json.stats.miningPower must meet/exceed hardness.
  - oreType → drop table routing and mining VFX.
- The ECS registry (src/core/ecs-registry.js) must register Tile with fields: tileType (enum/string), hardness (int), oreType (string), and any rendering tokens required by the style guide.
- Do not derive gameplay from “advisory” structures (corridors/path), only from tiles and components.



## 4) Data Contracts Consumed

Biome config (data/world/biome-crystal-caverns.json)
- tiles
  - floor: { hardness:int } → used to stamp floor hardness
  - rock: { hardness:int } → used to initialize map and uncarved rock
  - ore:
    - baseHardness:int → added to ore hardness computation as baseline
    - oreTypes:[{ id:string, weight:number, hardnessDelta:int }] → lottery for ore type
    - laneClearanceTiles:int → minimum Manhattan radius from any corridor/door in which ore must not appear
- lighting
  - ambientTintToken:string → exported as global ambient token and used by renderer
  - lamps: { tintToken:string, intervalTiles:int } → interval for corridor lamp anchors; color token
  - crystalTintToken:string → decoration tint for crystals/props
- oreSeeding
  - noise: { scale:number, octaves:int, threshold:number } → deterministic sampler used to gate ore seed candidates
  - edgeBias:number (0..+), optional → multiplies seed score by (1 + edgeBias * normalizedDistanceFromRoomCenter)
  - cluster: { maxByOreId?: { [oreId]:int }, defaultMax:int } → BFS growth cap
- decoration
  - crystalOnAlcove:boolean
  - maxCrystals:int
  - clusterSize:[min:int, max:int]
  - minSeparation:int
- spawnRules
  - sampleIntervalTiles:int
  - minSeparationTiles:int
  - doorExclusionRadius:int
  - enemyWeights: { [enemyId]: number } → used by runtime spawner (exported at anchors)
- minimap
  - tokens: { bg:int, room:int, corridor:int, ore:int } → target category encodings for raster

Room templates (data/world/room-templates.json) — schema-lite
- rooms:[]
  - id:string (unique, stable)
  - kind:"tunnel"|"cavern"|"ore_vein" (freeform for now; used in rooms[].kind)
  - rotate:boolean → if true, allow 0/90/180/270 rotations
  - template:string[] → equal-length strings forming an orthonormal grid
    - Charset:
      - '#': rock (solid); wall
      - '.': floor (passable)
      - 'O': ore-preferred rock (solid) — flagged ORE_PREF
      - 'D': doorway floor (passable) — must occur on template boundary; exported as a 3-wide door (see §10)
    - Doorway grouping: templates must present doorways in runs of length 3 exactly centered, axis-aligned.

Hardness targets (Sprint 1)
- floor: 0–1 (configurable via biome.tiles.floor.hardness; default 0)
- rock (plain): 3 (via biome.tiles.rock.hardness; default 3)
- ore (tileType="rock.ore"): hardness := biome.tiles.ore.baseHardness + oreType.hardnessDelta
  - copper: +0 → typical 3–4
  - iron: +1 → typical 4–5
  - quartz: +2 → typical 5–7 (rare; MVP may present via decor/loot)
- Ensure consistency with tools.json.stats.miningPower thresholds.



## 5) Determinism & RNG Streams

PRNG definition
- Seed normalization: FNV-1a 32-bit on the UTF-8 string form of input seed (numbers are stringified).
- Substreams: for each label in ["rooms","corridors","ore","decor","lamps","spawns"], compute subSeed = FNV-1a(baseSeed, ":" + label). Each PRNG stream uses its own subSeed.
- PRNG core: splitmix32 or mulberry32; either is acceptable. Output uniform floats in [0,1) and 32-bit ints.

Order guarantees (must not change without bumping golden hashes)
1) Phase 1: load and stamp rooms (templates processed sorted by template.id, then deterministic placement order; rooms array sorted by id, then x, then y).
2) Phase 2: build corridor graph from doors (deterministic nearest-k; deterministic Kruskal-lite).
3) Phase 3: carve corridors (iterate edges sorted by length asc, then node ids).
4) Phase 4: optional CA touch.
5) Phase 5: seed ore.
6) Phase 6: decoration.
7) Phase 7: finalize lighting anchors.
8) Phase 8: spawn anchors.
9) Phase 9: validations and build outputs.
- Final map hash: compute a stable 64-bit hash (e.g., XXH64 seeded with 0) over a row-major stream of per-cell codes: code = 0 for floor, 1 for rock, 2 + oreIndex for rock.ore (oreIndex = stable index of oreTypes array in biome). Do not include hardness or flags.



## 6) High-Level Pipeline (Phases)

Phase 0: Init grids
- Allocate width×height buffers:
  - tileKind: Uint8Array (0=floor,1=rock,2=rock.ore)
  - hardness: Uint8Array
  - oreIndex: Int16Array (-1 for none; otherwise index into biome.tiles.ore.oreTypes)
  - flags: Uint8Array bitfield (see Appendix A)
  - navmask: Uint8Array (0=blocked,1=walkable) — mirrors floor carving
- Initialize all cells to rock:
  - tileKind=1, hardness=biome.tiles.rock.hardness, oreIndex=-1, flags=0, navmask=0.

Phase 1: Room Placement & Stamping
- Load templates. Sort by id ascending for deterministic iteration.
- Placement:
  - Use rooms RNG to produce a Poisson-like jittered grid:
    - Compute an initial grid spacing based on average template footprint and map size.
    - For each grid site, attempt a small number of jittered placements (2–4) with rotation ∈ {0,90,180,270} if rotate:true, else 0.
  - Enforce:
    - Bounding box entirely inside map bounds.
    - No overlap with previously stamped floor or doorway (floor cells cannot overlap; rock-on-rock overlap allowed).
- Door validation:
  - Each 'D' must be on the boundary of the rotated template bounds.
  - Doors must appear in contiguous runs of exactly 3 cells orthogonal to the boundary; record center cell + direction.
- Stamping:
  - '#': leave as rock; set ROOM flag on boundary walls.
  - '.': set tileKind=0 (floor), hardness=biome.tiles.floor.hardness, navmask=1; set ROOM flag.
  - 'O': leave as rock; set ORE_PREF flag.
  - 'D': like '.', plus DOOR flag; also add to rooms[].doors with absolute coords and dir.
- Buffer ring:
  - Mark non-door exterior boundary cells with LANE_BUFFER flag to maintain 1-tile clearance for corridor carver.

Phase 2: Corridor Graph Build
- Nodes: each door cell becomes a node keyed as "rx,ry,roomId,index" with stable integer id assignment by sorted order.
- Candidate edges:
  - For each node, connect to k nearest distinct nodes by Manhattan distance (k=3; tunable), excluding nodes that are in the same room unless the room has ≥3 doors and we need hub variety (allow at most 1 intra-room edge).
- Edge selection:
  - Deduplicate undirected pairs; sort edges by (length asc, nodeAId asc, nodeBId asc).
  - Build at least a spanning forest using Kruskal-lite (union-find).
  - Optionally add a small fraction (p≈0.15) of extra short edges for loops; deterministic using corridors RNG.

Phase 3: Corridor Carving (Three-Wide Brush)
- For each selected edge:
  - Pathfinding:
    - 4-neighborhood A* with cost = 1 + turnPenalty (turnPenalty=0.2 default; see §9) when direction changes.
    - Constraints: cannot traverse ROOM walls; cannot step on LANE_BUFFER except stepping out from a DOOR; enforce stay ≥1 tile away from room non-door exteriors.
  - Rasterization:
    - Centerline path P. For each step, carve a 3-wide orthogonal band around P:
      - If moving horizontally, carve (x,y-1),(x,y),(x,y+1)
      - If vertically, carve (x-1,y),(x,y),(x+1,y)
    - Convert any rock to floor; clear ORE_PREF if present; set CORRIDOR flag; navmask=1; hardness=biome.tiles.floor.hardness.
  - Corner smoothing:
    - Where two orthogonal brushes meet, carve a single diagonal (bevel) cell to avoid pinched corners while retaining ≥3 width.
- Lamp anchors:
  - For each door, place a lamp 1–2 tiles outside the door along the path direction (choose 1 tile if valid; else 2).
  - Along corridors longer than intervalTiles, place at every biome.lighting.lamps.intervalTiles from each end, skipping cells within 1 tile of a door lamp.

Phase 4: Cellular Automata Touch (Optional Smooth Cavities)
- Objective: tiny alcoves that do not intrude on lanes.
- Operate on copy or bitmask over non-room, non-corridor areas only; exclude any cell within 2 tiles of a corridor centerline.
- Use B5678/S45678 for up to 2 iterations. Convert:
  - New 0-pools under small area threshold back to rock to reduce speckle.
  - Never create floor adjacent to a corridor if that would result in a cross-section <3.

Phase 5: Ore Seeding
- Candidates priority:
  - First: rock cells with ORE_PREF flag from templates.
  - Then: rock cells adjacent (4-neigh) to floor but outside laneClearanceTiles from any corridor or door.
- Scoring:
  - Sample deterministic noise (ore RNG) at scaled coordinates (noise.scale, octaves). Accept if noise ≥ threshold.
  - Multiply by (1 + edgeBias·d) where d is normalized distance from room centers/bounds (0 center to 1 edge) if edgeBias present.
- Type selection:
  - Weighted lottery over biome.tiles.ore.oreTypes (weights normalized at load).
- Cluster growth:
  - BFS from seed to rock neighbors, up to cluster.max (by ore id if provided; else defaultMax).
  - Stop growth that approaches closer than laneClearanceTiles to any corridor/door.
  - For each claimed cell: set tileKind=2 (rock.ore), oreIndex=oreTypes index, hardness = biome.tiles.ore.baseHardness + oreType.hardnessDelta.

Phase 6: Decoration (Crystals & Props)
- If biome.decoration.crystalOnAlcove:
  - Detect concavities: rock cells with at least 2 floor neighbors (8-neigh check is permissible; prefer 4-neigh≥2 for MVP).
  - Exclude cells within laneClearanceTiles of corridors.
  - Place clusters up to maxCrystals, with clusterSize range and minSeparation.
  - Append to props (if a props list exists in Sprint 1 build), else only emit lamps; lamps carry tintToken from biome.lighting.crystalTintToken for renderer consumption.

Phase 7: Lighting & Lamps Finalize
- Global ambient: biome.lighting.ambientTintToken.
- Consolidate lamp anchors; de-dup within radius 1; set tintToken = biome.lighting.lamps.tintToken.
- Lamps are emitted as MapData.lamps; rendering system instantiates ECS Light entities.

Phase 8: Spawn Anchors
- Along corridors, sample points every spawnRules.sampleIntervalTiles along the centerline or by scanning floor cells with CORRIDOR flag.
- Exclude within doorExclusionRadius of any door center; enforce minSeparationTiles between anchors.
- Emit anchors: { x, y, kind:"enemy" }, and attach biome.spawnRules.enemyWeights at runtime (not serialized here).

Phase 9: Validation & Output Build
- Connectivity: flood-fill from first room floor; verify every DOOR cell is connected and that all corridor floor cells are reachable.
- Width: scan all corridor-marked regions; every orthogonal cross-section perpendicular to local direction must contain ≥3 contiguous floor tiles (see §10).
- Door integrity: each room door must have corridor floor adjacent on its outward side.
- Lane buffers: no ore within biome.tiles.ore.laneClearanceTiles of corridors/doors.
- Minimap raster: emit categories per biome.minimap.tokens (room, corridor, ore, bg). bg for uncarved rock.
- Hash: compute 64-bit hash over per-cell codes (see §5).



## 7) Algorithms & Pseudocode

Note: Pseudocode favors clarity. Use typed arrays and object pools in production.

placeRooms(seed)
```
function placeRooms(biome, templates, map, rngRooms):
  sort(templates by id asc)
  rooms = []
  // derive grid spacing
  avgW = average(template.width)
  avgH = average(template.height)
  spacingX = max(8, floor(avgW * 1.5))
  spacingY = max(6, floor(avgH * 1.5))
  for gy in range(0, map.height, spacingY):
    for gx in range(0, map.width, spacingX):
      attempts = 0
      // pick a template deterministically per grid site
      t = templates[(hash32(gx,gy) ^ rngRooms.nextInt()) % templates.length]
      rotations = t.rotate ? [0,90,180,270] : [0]
      // jitter
      jx = clamp(gx + jitter(rngRooms, -2, +2), 0, map.width-1)
      jy = clamp(gy + jitter(rngRooms, -2, +2), 0, map.height-1)
      for r in rotations:
        bx, by, bw, bh = rotatedBounds(t, r)
        x = clamp(jx - floor(bw/2), 0, map.width - bw)
        y = clamp(jy - floor(bh/2), 0, map.height - bh)
        if not collidesFloor(map, x,y,t,r):
          roomId = t.id + "@" + x + "," + y
          doors = []
          stampTemplate(map, x,y,t,r, biome, rooms, doors)
          rooms.push({ id:roomId, kind:t.kind, bounds:{x,y,w:bw,h:bh}, rotation:r, doors })
          break // next grid site
  sort(rooms by id asc then bounds.x asc then bounds.y asc)
  return rooms
```

buildGraph(doors)
```
function buildGraph(doors, rngCorridors, k=3):
  nodes = doors.map((d,i)=> ({ id:i, x:d.x, y:d.y, roomId:d.roomId }))
  edges = set()
  // nearest-k
  for each n in nodes:
    cands = nodes.filter(m => m.id != n.id)
    cands.sort(by manhattan(n,m), then by m.id)
    for i in 0..min(k-1, cands.length-1):
      m = cands[i]
      if (n.roomId == m.roomId):
        if countEdgesWithinRoom(n.roomId) >= 1: continue
      a = min(n.id, m.id)
      b = max(n.id, m.id)
      edges.add({ a,b, dist:manhattan(n,m) })
  // sort edges
  sorted = Array.from(edges).sort(by dist asc, a asc, b asc)
  uf = new UnionFind(nodes.length)
  chosen = []
  // spanning
  for e in sorted:
    if uf.union(e.a, e.b):
      chosen.push(e)
  // add a few short loops deterministically
  for e in sorted:
    if chosen.length >= nodes.length + floor(nodes.length * 0.15): break
    if !connectsCycle(chosen, e):
      if rngCorridors.nextFloat() < 0.2: chosen.push(e)
  return { nodes, edges: chosen }
```

carveCorridor(path)
```
function carveCorridor(map, path, biome):
  for i from 1 to path.length-1:
    p0 = path[i-1]; p1 = path[i]
    dir = direction(p0, p1) // N,S,E,W
    // for each cell along the step, carve 3-wide orthogonal band
    for each (cx,cy) in orthogonalBand(p1.x, p1.y, dir): // three cells
      if withinBounds(cx,cy) and !isRoomWall(map, cx,cy):
        map.tileKind[idx(cx,cy)] = 0 // floor
        map.hardness[idx(cx,cy)] = biome.tiles.floor.hardness
        map.oreIndex[idx(cx,cy)] = -1
        setFlag(cx,cy, FLAG_CORRIDOR)
        clearFlag(cx,cy, FLAG_ORE_PREF)
        map.navmask[idx(cx,cy)] = 1
    // corner bevel
    if i < path.length-1:
      p2 = path[i+1]
      if turn(dir, direction(p1,p2)):
        bx, by = bevelCellForTurn(p0,p1,p2)
        carveFloorCell(map, bx, by, biome)
```

seedOre(candidates)
```
function seedOre(map, biome, rngOre, candidates):
  noise = makeNoise(biome.oreSeeding.noise, rngOre.seed)
  // build weighted lottery
  weights = normalize(biome.tiles.ore.oreTypes.map(o => o.weight))
  for each c in prioritized(candidates): // ORE_PREF first
    if distanceToLane(c) < biome.tiles.ore.laneClearanceTiles: continue
    score = noise.sample(c.x * scale, c.y * scale, octaves)
    if biome.oreSeeding.edgeBias:
      score *= 1 + biome.oreSeeding.edgeBias * edgeFactor(c)
    if score < biome.oreSeeding.noise.threshold: continue
    oreIdx = weightedPick(weights, rngOre)
    maxCluster = biome.oreSeeding.cluster.maxByOreId?.[oreId(oreIdx)]
                 ?? biome.oreSeeding.cluster.defaultMax
    BFSqueue = [c]
    grown = 0
    while BFSqueue not empty and grown < maxCluster:
      v = BFSqueue.pop()
      if !isRock(map, v) or distanceToLane(v) < biome.tiles.ore.laneClearanceTiles: continue
      setOre(map, v, oreIdx, biome)
      grown++
      for n in neighbors4(v):
        if isRock(map, n) and !visited(n): markVisited(n); BFSqueue.push(n)
```

validate(map)
```
function validate(map, rooms, doors, corridors, biome):
  // connectivity
  start = first room floor cell
  reach = floodFill(map.navmask, start)
  for d in doors:
    assert(reach.has(d.x,d.y), "Door not connected")
  // width check (local direction heuristic)
  for each corridor cell c:
    dir = estimateFlowDir(c) // from path or local gradient
    band = orthogonalTriplet(c, dir)
    assert(band.all(isFloor), "Corridor width < 3 at " + c)
  // door integrity
  for d in doors:
    ox, oy = stepOut(d.x, d.y, d.dir)
    assert(isFloor(ox,oy), "Door without outward corridor at " + d)
  // lane clearance
  r = biome.tiles.ore.laneClearanceTiles
  for each ore cell o:
    assert(distanceToNearestLane(o) >= r, "Ore intrudes on lane at " + o)
```



## 8) Performance Notes

- Allocate typed arrays once: Uint8Array for tileKind, hardness, flags, navmask; Int16Array for oreIndex.
- Maintain reusable open/closed sets for A*; object pools for path nodes.
- Precompute 4- and 8-neighbor offset arrays for tight loops.
- Use bitmasks in flags rather than booleans.
- Prefer inlined Manhattan distance and a small binary heap for A*; keep A* grid costs in a ring buffer keyed by frame id to avoid clearing.
- Noise: cache octave sums per row when feasible; avoid per-cell allocations.
- Complexity:
  - Rooms: O(R) for attempted stamps with cheap overlap test (bitmask bounding boxes).
  - Corridors: O(E·L) where L is path length; small k keeps E modest.
  - Ore: BFS bounded by cluster size; early reject via noise threshold.
- Target: 10–20 ms at 96×64 on mid-tier desktop; turn CA off (0 iter) if budget tight.



## 9) Tuning Table (Safe Ranges)

- A* turnPenalty: 0.15–0.35 (default 0.20). Higher straightens corridors.
- Lamp interval: 10–14 tiles (default from biome.lighting.lamps.intervalTiles).
- Ore noise.scale: 0.10–0.16; threshold: 0.54–0.62; octaves: 1–3.
- Ore cluster size (typical):
  - copper: 2–6 tiles
  - iron: 2–5 tiles
  - quartz: 1–3 tiles (rare)
- CA iterations: 0–2 (default 1; 0 for MVP speed).



## 10) Three-Wide Law & Door Geometry

- Three-Wide Law (formal): For any corridor path segment with a forward step direction v ∈ {(1,0),(-1,0),(0,1),(0,-1)}, the cross-section orthogonal to v at each path cell must contain a contiguous run of at least 3 floor tiles centered on the path cell. This run must be fully floor, not ore, and not diagonal-only connections.
- Doorways: must be exactly 3 contiguous floor tiles on a room boundary, centered on the wall normal, axis-aligned. Record the central tile as the door position and the outward normal as dir.
- Carving start: begin corridor carving 1 tile outside the door, ensuring the door run remains intact and the corridor immediately meets the Three-Wide Law.
- Room buffer: maintain a 1-tile clearance (LANE_BUFFER) from all non-door room exteriors to prevent corridors from hugging walls or clipping decorative geometry.



## 11) Biome Overrides & Extensibility

Biome fields affecting phases
- tiles.rock.hardness, tiles.floor.hardness → affects stamping and mining gates.
- tiles.ore.baseHardness, tiles.ore.oreTypes[], tiles.ore.laneClearanceTiles → ore hardness, selection, and clearance.
- oreSeeding.noise, oreSeeding.edgeBias, oreSeeding.cluster → ore density and shape.
- lighting.ambientTintToken, lighting.lamps.tintToken, lighting.lamps.intervalTiles → rendering tokens and lamp cadence.
- decoration.* → crystal/prop placement density and look.
- spawnRules.* → spawn anchor cadence and density.
- minimap.tokens → exported category ids.

Future hooks (non-binding)
- Room-corridor style matching (WFC patterns; door skinning).
- Multi-biome depth layers and transitions.
- Hazards (chasms, steam vents), fluid cells.
- Room sequencers and theme playlists by depth.



## 12) JSON Schema-Lite Validation

room-templates.json loader checks
- Required keys per entry: id:string, kind:string, rotate:boolean, template:string[] (≥1 row; all rows equal length).
- Charset: only '#', '.', 'O', 'D' allowed.
- Door rules:
  - All 'D' must lie on the boundary of the template rect.
  - Doors must occur in runs of length exactly 3 cells, orthogonal to the boundary.
  - Each run’s center cell is unique; runs cannot touch corners diagonally.
- rotate:true implies the rotated templates obey the same door/boundary rule (validate by rotating at load once).
- Reject overlapping contradictory glyphs (N/A in single template).

biome-crystal-caverns.json loader checks
- Required top-level keys: tiles, lighting, oreSeeding, decoration, spawnRules, minimap.
- tiles.rock.hardness:int, tiles.floor.hardness:int, tiles.ore.baseHardness:int present.
- tiles.ore.oreTypes is non-empty; each oreTypes[i]: { id:string, weight:number>0, hardnessDelta:int }.
- oreSeeding.noise: { scale:number>0, octaves:int>=1, threshold:number in [0,1] }.
- lighting.lamps.intervalTiles:int>=6; tokens are strings (existence validated by higher-level renderer/style system).
- spawnRules.sampleIntervalTiles>=4, minSeparationTiles>=4, doorExclusionRadius>=2.
- minimap.tokens contains { bg, room, corridor, ore } ints in [0,255].
- Normalize weights for oreTypes and spawnRules.enemyWeights on load.



## 13) Integration with ECS & Rendering

- Tile instantiation:
  - For each cell: either create a Tile entity with Tile component or populate a Phaser 3 Tilemap layer backed by ECS data.
  - Collider: tileType "rock" and "rock.ore" are solid; "floor" is not.
  - Visuals: the renderer picks sprite/tile indices per docs/visual-systems/style-guide.md; lamp tint and ambient tokens applied there.
- Tile component (data/core/component-schemas.json)
  - Fields expected: tileType (enum/string), hardness (int), oreType (string).
  - Optional flags or metadata can be stored externally; the MapData to ECS adapter handles translation.
- Minimap raster: export as MapData.minimap.raster; UI layer consumes per docs/ui-framework.md.
- Mining gating: on mining attempt, compare tool.miningPower (from tools.json.stats.miningPower) against hardness. Ore cells also reference oreType for drop resolution.
- Registry: src/core/ecs-registry.js registers the Tile component and any Light/Lamp/SpawnAnchor archetypes used to instantiate lamps and anchors.



## 14) Determinism Tests & CI Hook

Acceptance harness
- For seeds: [1, 2, 3, 42, 1337], generate with biomeId "biome.crystal.caverns" at width=96, height=64.
- Persist for each:
  - MapData.hash
  - rng.streams object (diagnostic)
- CI compares hashes against golden set checked into tests. Any algorithmic change that affects tiles requires:
  - Updating golden hashes and bumping a minor version tag in this spec or biome file.
- Ensure build agents run with identical Node/JS engine math semantics; avoid Math.random and floating non-determinisms (use integer PRNG where possible).
- The final hash must depend only on tileType and oreType (per §5), not on lamps or spawns.



## 15) Acceptance Checklist (Sprint 1)

- Deterministic output given seed and biome.
- Corridors and doors strictly honor Three-Wide Law.
- Lamps at every door and at configured intervals along corridors.
- Ore never intrudes within laneClearanceTiles of any corridor or door.
- JSON configs parse and pass schema-lite validation.
- Room templates respected including all rotations; doors on boundaries only.
- Performance within 10–20 ms budget at 96×64 on target desktop.
- Connectivity validated; all doors connect to the lane network.



## Appendices

### A) Tile/Flag Encoding Table (compact)

Tile kind codes (tileKind Uint8)
- 0: floor
- 1: rock
- 2: rock.ore

Flags bitfield (flags Uint8; bit set = 1)
- 0x01 ROOM — floor/wall cells stamped by rooms (informational)
- 0x02 CORRIDOR — floor carved by corridor carver
- 0x04 DOOR — doorway floor cell (center of the 3-wide door run)
- 0x08 ORE_PREF — rock preferred for ore seeding
- 0x10 LANE_BUFFER — 1-tile buffer around room non-door exterior
- 0x20 CA_PROTECTED — reserved; prevents CA from altering
- 0x40 RESERVED
- 0x80 RESERVED

Hardness (Uint8)
- floor: biome.tiles.floor.hardness (default 0)
- rock: biome.tiles.rock.hardness (default 3)
- rock.ore: biome.tiles.ore.baseHardness + oreTypes[i].hardnessDelta

Ore index (Int16)
- -1: none
- ≥0: index into biome.tiles.ore.oreTypes array



### B) Example Map Walkthrough (non-normative)

Seed=1337, width=96, height=64, biome=biome.crystal.caverns
- Rooms placed: 9
  - Mix of caverns and tunnels from room-templates.json; all door runs 3-wide and boundary-aligned.
- Doors: 18 total (average 2 per room)
- Corridor graph:
  - Candidate edges: 40; chosen edges (spanning+loops): 17
  - All doors connected; 2 short loops for interest.
- Carving:
  - Corridor tiles carved: ~1,250 floor cells (3-wide lanes throughout)
  - Corner bevels applied at 14 corners
- Lamps:
  - Door lamps: 18
  - Corridor lamps (interval 12): 21
  - Total lamps: 39 (tintToken=biome.lighting.lamps.tintToken)
- Ore:
  - laneClearanceTiles=2 respected (0 violations)
  - Copper: 92 tiles across 24 clusters
  - Iron: 61 tiles across 17 clusters
  - Quartz: 14 tiles across 8 clusters
- Minimap categories:
  - room: ~1,100
  - corridor: ~1,250
  - ore: ~167
  - bg: remainder as rock
- Connectivity: 100% of doors reachable
- MapData.hash: 64-bit hex e.g., "7f6a2d1c31b9e8ab" (placeholder; refer to CI goldens)

Note: Counts will vary with actual templates; this example demonstrates expected magnitudes and relationships.



### C) Reference Constants (defaults; override via biome where applicable)

- PRNG: FNV-1a 32-bit seed; mulberry32 stream per label
- A*
  - turnPenalty: 0.20
  - neighbor model: 4-neigh
- Corridor width: 3 (immutable in Sprint 1; Three-Wide Law)
- Lamp interval: biome.lighting.lamps.intervalTiles (default 12)
- laneClearanceTiles (ore): biome.tiles.ore.laneClearanceTiles (default 2)
- Ore noise:
  - scale: 0.12
  - octaves: 2
  - threshold: 0.58
- Ore clusters:
  - defaultMax: 5
  - per-ore overrides supported via oreSeeding.cluster.maxByOreId
- CA:
  - iterations: 1
  - rule: B5678/S45678
  - corridor exclusion: ≥2 tiles



## Implementation Notes (Phaser 3 specifics)

- Use a single dynamic tilemap layer for terrain; encode floor/rock/ore as tile indices mapped from tileKind and oreType; collision toggled by property.
- Lamps: either Phaser Lights (with tint) or ECS light sprites placed at MapData.lamps positions.
- Minimap: draw from minimap.raster to a RenderTexture or bitmap data each generation; color mapping per biome.minimap.tokens.
- Keep generation pure (no Phaser API in generator); feed MapData into a world-instantiation system that bridges ECS and Phaser.



## RNG and Hash Reference Implementations (for consistency)

FNV-1a (32-bit)
```
function fnv1a32(str):
  h = 0x811c9dc5
  for each byte b in utf8(str):
    h ^= b
    h = (h * 0x01000193) >>> 0
  return h >>> 0
```

Mulberry32
```
function mulberry32(seed):
  s = seed >>> 0
  return {
    nextInt: () => {
      s = (s + 0x6D2B79F5) >>> 0
      let t = Math.imul(s ^ (s >>> 15), 1 | s)
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t
      return ((t ^ (t >>> 14)) >>> 0)
    },
    nextFloat: () => (nextInt() / 0x100000000)
  }
```

XXH64 over per-cell codes (portable JS)
```
function mapHash(map):
  // per §5 code: floor=0, rock=1, rock.ore=2+oreIndex
  const seed = 0n
  let h = xxh64_init(seed)
  for y in 0..map.height-1:
    for x in 0..map.width-1:
      code = cellCode(x,y)
      h = xxh64_update_u32(h, code)
  return hex(xxh64_digest(h))
```


That’s the lay of the stone for Sprint 1. Keep your lanes three wide, your lamps steady, and your hash unwavering.