# Cave Generation — Mine L1 (Crystal Caverns)

Author: Deepdelver Caveborn (world_generation)
Sprint: 1
Target: src/world/gen/generator.js

## 1) Title & Scope

- Title: Cave Generation — Mine L1 (Crystal Caverns)
- Scope:
  - Deterministic, seed-driven generator for 2D tile maps
  - Uses room templates, corridor carving, optional CA smoothing, ore/lamp/spawn anchors
  - Targets 96×64 by default per biome-crystal-caverns.json
- Acceptance:
  - Seed-reproducible output
  - ≥90% of walkable floor tiles in the main connected component
  - Emits a JSON artifact and a simple PNG occupancy export


## 2) Inputs & Data Contracts

- Biome JSON: data/world/biome-crystal-caverns.json
  - Keys consumed (with clamps):
    - dims: { w, h } — map size
      - w ∈ [32..256], h ∈ [32..256]; default 96×64
    - approachDepth: integer length of straight, three-wide door approaches
      - clamp [2..8]; default recommended 3 or 4
    - roomBudget: { min, max, weights: { tunnel, cavern, ore_pocket } }
      - min ∈ [1..64], max ∈ [min..96]; weights normalized internally; each ∈ [0..1]
    - corridorJitter: float shaping lateral randomness in corridor routing
      - clamp [0..1]; recommended ≤ 0.6
    - ca: {
        enabled: boolean,
        iterations: int [0..8],
        birthThreshold: int [0..24], 5×5 Moore neighbor count to turn rock→floor,
        surviveThreshold: int [0..24] to keep floor
      }
    - ore: {
        rates: { copper, iron, quartz } each ∈ [0..1] density scalars,
        veins: { minLen [2..200], maxLen [minLen..400], branchChance [0..0.5], turnBias [-1..1] },
        pedagogy: {
          copperNearDoorBoost [0..4],
          ironAvoidDoorDepth [0..16],
          quartzAvoidDoorDepth [0..24],
          minDoorClearance [0..8] (general exclusion for all ores)
        }
      }
    - lamp: {
        spacingMin [3..24],
        spacingMax [spacingMin..48],
        avoidDoorDepth [0..12],
        avoidLampRadius [0..6],
        roomBellyCount: { min [0..32], max [min..64] }
      }
    - spawn: {
        minFromDoor [0..24],
        avoidLampRadius [0..8],
        corridorWeight [0..10],
        cavernWeight [0..10]
      }
    - audio: opaque ids (pass-through to metadata)
    - lore: opaque text/object (pass-through to metadata)
    - debug: { allowFallbackStraightCarve: boolean }
  - Any missing optional numeric field defaults to a safe mid-range value post-clamp.

- Room Templates: data/world/room-templates.json
  - Schema (array of templates):
    - {
        id: string (stable, unique),
        kind: "tunnel" | "cavern" | "ore_pocket" | "start" (optional kind),
        rotate: array<int> subset of [0, 90, 180, 270],
        stamp: array<string> (equal-length rows using glyphs),
        doorBands?: [
          { id?: string, normal?: "N"|"E"|"S"|"W" }
        ] (optional metadata; recomputed from glyphs when omitted)
      }
  - Glyph legend and invariants:
    - '#': rock (rim and solid mass)
    - '.': floor (walkable interior)
    - 'D': door band (must be exactly Three‑Wide contiguous band; becomes floor + DOOR_BAND flag)
    - 'O': ore preference (rock cell flagged ORE_PREF, never floor)
    - Three‑Wide: A door band is a straight 3-cell stripe on the stamp rim (horizontal or vertical), orthogonal to the room interior. Rotate preserves Three‑Wide.
    - Rim integrity: The outermost stamp boundary must remain '#', except where 'D' punches through. Rotations must preserve a continuous rock rim.
    - Approach run: Immediately interior to each 'D', the next approachDepth cells in the door normal direction must be '.' (interior floor) to allow the protected approach lane. The generator enforces this via APPROACH3W_PROTECT.
  - Rotate handling:
    - Rotation is applied to the stamp grid and implicitly to 'D' bands and normals.
    - doorBands.normal, when present, is rotated accordingly; if absent, the normal is autodetected by looking from each 'D' cell toward the room interior (the side with floor '.').

- ECS Tile flags (during generation; bit layout fixed and used by the harness):
  - TILE_FLAGS:
    - ROOM_FLOOR        = 1 << 0
    - DOOR_BAND         = 1 << 1
    - ORE_PREF          = 1 << 2
    - LAMP_ANCHOR       = 1 << 3
    - APPROACH3W_PROTECT= 1 << 4
  - Notes:
    - Flags persist through stages except temporary masks cleared at Stage 4.
    - LAMP_ANCHOR does not alter tileType.

- Tile hardness bands and tileType enums (aligned with data/core/component-schemas.json and ecs-registry.js):
  - tileType: 'rock' | 'floor' | 'ore.copper' | 'ore.iron' | 'ore.quartz'
  - hardness:
    - rock: 3
    - floor: 0
    - ore.copper: 4
    - ore.iron: 5
    - ore.quartz: 7


## 3) Determinism & RNG Plan

- Global seed: uint32 (32-bit). Use xmur3 to derive stream seeds and mulberry32 for PRNGs.
  - xmur3(key) → 32-bit hash; mulberry32(s) → reproducible [0,1) floats and uint32s.
- Substreams (derive via xmur3(seed || biomeId || label)):
  - R_ROOM_PLACEMENT
  - R_DOOR_ROTATIONS
  - R_CORRIDOR_CARVE
  - R_CA
  - R_ORE
  - R_LAMPS
  - R_SPAWNS
  - R_TIEBREAKS
- Ordering guarantees:
  - Fixed pipeline stage order (0→7).
  - Stable sort by (template.id asc, placementIndex asc) wherever multiple valid choices exist.
  - Pathfinder neighbor enumeration order strictly NESW.
  - All set/dict iterations must be on arrays sorted lexicographically/numerically. No unsorted Object.keys iteration.


## 4) Pipeline Overview (Stages 0–7)

- Stage 0 — Init grid and masks
  - Allocate width×height tiles as rock with:
    - tileType='rock', hardness=3, flags=0
  - Bounds and coordinates:
    - x in [0..w-1], y in [0..h-1], origin at top-left, y increases downward
    - Row-major indexing: idx = y*w + x
  - Scratch masks:
    - DOOR_BAND and APPROACH3W_PROTECT tracked in flags
    - Separate temporary arrays permitted for CA and A* (cleared each stage)

- Stage 1 — Room Stamping
  - Budget:
    - Draw N from roomBudget with stable heuristic:
      - N = clamp(round(lerp(min, max, rng(R_ROOM_PLACEMENT).float())))
    - Ensure at least one of each kind (tunnel, cavern, ore_pocket) if available in templates and space allows; fill remaining slots by normalized weights.
  - Candidate sampling:
    - For each intended room placement, attempt up to K=24 candidates (or until success).
    - Rotation: choose uniformly from template.rotate[] using R_DOOR_ROTATIONS.
  - Validation:
    - Axis-aligned bounding box must be within [0..w-1]×[0..h-1].
    - Rim rock constraint: stamp perimeter must land on rock except door bands.
    - Door band clearance: all 'D' cells must be at least approachDepth+1 tiles from map boundary.
    - Collision: new stamp floors ('.' and 'D') cannot overlap any existing floor; rock may overlap rock.
  - Apply stamp:
    - '#' → leave as rock
    - '.' → set tileType='floor'? No: mark as ROOM_FLOOR flag only at this stage; final types in Stage 4
    - 'D' → mark as ROOM_FLOOR and DOOR_BAND
    - 'O' → ensure rock remains, set ORE_PREF
    - For each door band, mark a straight APPROACH3W_PROTECT corridor interior to the room of length approachDepth (3-wide in the door’s inward normal).
  - Persist door anchors:
    - For each door band, record:
      - DoorAnchor {
          id: stable increment,
          roomId: template instance id,
          band: [p0, p1, p2] (world-space 3 contiguous cells),
          center: pc (the middle cell),
          normal: { dx, dy } (unit vector pointing outward from room interior),
          kind: template.kind
        }

- Stage 2 — Corridor Planning & Carving
  - Build a graph over DoorAnchors:
    - Initialize Union-Find with all door anchors.
    - Union all doors belonging to the same room instance.
    - While there are ≥2 components:
      - Enumerate candidate pairs (doorA in compA, doorB in compB) with Manhattan distance d.
      - Choose the pair with minimal d (stable-tie by doorA.id then doorB.id using R_TIEBREAKS only if exact ties persist).
      - Add to corridor plan; union the components.
      - Stop if an edge budget is hit: maxEdges = min(doorsCount*2, 4*roomsPlaced)
  - Carving policy:
    - For each chosen pair:
      - From each door, force a straight 3-wide run of length approachDepth (respect APPROACH3W_PROTECT).
      - Then route the remaining path with A* on a grid:
        - Costs:
          - base cost rock=1.0, floor=1.2 (soft bias to avoid cutting rooms)
          - protect cells (APPROACH3W_PROTECT) cost = +1000 (treated as forbidden)
          - door band cells are allowed only at endpoints
          - after 2×approachDepth from each door, add a jitter term:
            jitterCost = corridorJitter * U[0,1) from R_CORRIDOR_CARVE per cell
        - Heuristic: Manhattan distance h = |dx|+|dy|
        - Neighbor order: NESW
        - A* expansion cap: 12k nodes; on cap exceed:
          - If debug.allowFallbackStraightCarve, carve an L-shaped (axis-first) path with 3-wide imprint; otherwise fail the pair and continue.
      - Carving:
        - Set all path cells ±1 orthogonal (Three‑Wide) to ROOM_FLOOR '.'
        - Never carve outside bounds; never overwrite map rim outer boundary.
        - Hardness for corridor floors set in Stage 4.

- Stage 3 — Cavern CA Smoothing (optional per biome.ca.enabled)
  - Scope: only areas stamped by cavern-kind rooms; track their AABBs and masks.
  - Frozen cells: DOOR_BAND and APPROACH3W_PROTECT remain unchanged.
  - Cellular automata:
    - Neighborhood: 5×5 Moore (24 neighbors)
    - Iterate ca.iterations times:
      - For each eligible cell inside cavern AABB:
        - Count floor neighbors (ROOM_FLOOR).
        - Rock→floor if count ≥ birthThreshold
        - Floor→floor only if count ≥ surviveThreshold; else becomes rock
    - After CA, reassert Three‑Wide law for approachDepth tiles at each door.

- Stage 4 — Tile Finalization (types and hardness)
  - Floors: any ROOM_FLOOR → tileType='floor', hardness=0
  - Rock: remaining → tileType='rock', hardness=3
  - Preserve flags; clear temporary CA scratch; keep APPROACH3W_PROTECT if ore pedagogy distance requires it.

- Stage 5 — Ore Vein Seeding & Growth
  - Precompute door distance field by BFS:
    - Seed: all DOOR_BAND cells at distance 0
    - 4-neighborhood (NESW), walls and floors traversable; store distance per cell
  - Candidate rock cells:
    - Exclude any rock within:
      - minDoorClearance for all ores
      - ironAvoidDoorDepth for iron
      - quartzAvoidDoorDepth for quartz
    - Increase copper sampling weight within [1..copperNearDoorBoost] for cells within (approachDepth..approachDepth+4) of doors
  - Seed sources:
    - Combine:
      - Global random picks proportionate to ore.rates
      - ORE_PREF hints ('O' glyph) get a 3× weight boost as initial seeds
  - Vein growth (per seed):
    - VeinWalker {
        pos, dir (NESW), remainingLen, parentId?, rng
      }
    - Random walk in 4-neighborhood:
      - Length ∈ [veins.minLen..veins.maxLen] uniform
      - Each step choose turn with bias:
        - P(continue) = 0.6 - 0.3*|turnBias|
        - P(turn left/right) = 0.2 + 0.3*max(±turnBias,0)
      - With branchChance, spawn a child walker (remainingLen = floor(parent.remainingLen/2)) once per 4 steps max
      - Forbid entering: any floor, APPROACH3W_PROTECT, DOOR_BAND, and any cell within 2 tiles of DOOR_BAND
      - On commit:
        - Set tileType='ore.copper'|'ore.iron'|'ore.quartz' as chosen
        - Set hardness per ore mapping above

- Stage 6 — Lamp Anchor Placement
  - Along corridors:
    - For each corridor polyline (center path used during carving), march from door centerline.
    - Step spacing S ∈ [spacingMin..spacingMax] drawn per placement with R_LAMPS.
    - Place on floor offset ±1 from centerline (alternate sides) to reduce crowding.
    - Avoid within avoidDoorDepth of any door and avoid within avoidLampRadius of any existing LAMP_ANCHOR.
    - Mark flags |= LAMP_ANCHOR (tileType unchanged).
  - In cavern bellies:
    - For each cavern room instance:
      - Estimate belly as flood-fill of room floors excluding a 2-tile band near doors.
      - Compute centroid; accept only cells with ≥5 rock-adjacent neighbors (pillars/edges) as less preferred.
      - Place roomBellyCount ∈ [min..max] at R_LAMPS-weighted random floor cells farthest from doors and outside avoidLampRadius of others.

- Stage 7 — Enemy Spawn Anchors
  - Eligible floor cells:
    - Distance from nearest door ≥ spawn.minFromDoor
    - Avoid within spawn.avoidLampRadius of any LAMP_ANCHOR
  - Weighting:
    - Corridor bias: +spawn.corridorWeight for cells flagged via corridor carve pass (optionally track with an internal CORRIDOR mask or infer by linearity)
    - Cavern bias: +spawn.cavernWeight for cells inside cavern room AABBs with ≥3 rock neighbors
    - Simple two-kind mix example:
      - goblin: proportional to corridor bias
      - burrower: proportional to cavern bias
  - Produce a spawn list of { x, y, weights: { goblin, burrower } }


## 5) Connectivity & Validation

- Compute connected components using 4-neighborhood (NESW) over floor cells (tileType='floor' or ore is not walkable).
- Main component ratio:
  - ratio = (floor cells in largest component) / (total floor cells)
  - Assert ratio ≥ 0.90
- Assert all DoorAnchors' center cells lie in the main component.
- Assert Three‑Wide law:
  - For every door, the first approachDepth steps inward form a continuous 3-wide unobstructed floor rectangle.
- Optional: assert room rim integrity (outer ring remains rock) except at door bands.


## 6) Pseudocode — generate_map(seed, w, h)

- Data structures:
  - Tile { tileType: enum, hardness: int, flags: uint16 }
  - DoorAnchor {
      id: int, roomId: int,
      band: [{x,y},{x,y},{x,y}],
      center: {x,y},
      normal: {dx,dy}, kind: string
    }
  - VeinWalker { pos:{x,y}, dir:{dx,dy}, remaining:int, oreKind, rng }

- Helpers:
  - rng = makeRng(seed): { float(): [0,1), int(max): [0..max-1], uint32() }
  - subRng(label) = mulberry32(xmur3(seed + '|' + biomeId + '|' + label))
  - idx(x,y) = y*w + x
  - inBounds(x,y) = 0≤x<w && 0≤y<h
  - neighborsNESW(x,y) = [{x,y-1},{x+1,y},{x,y+1},{x-1,y}]

- High-level:
  - function generate_map(seed, w, h, biome, templates):
    1) rngs = {
         rooms: subRng('R_ROOM_PLACEMENT'),
         rots: subRng('R_DOOR_ROTATIONS'),
         carve: subRng('R_CORRIDOR_CARVE'),
         ca: subRng('R_CA'),
         ore: subRng('R_ORE'),
         lamps: subRng('R_LAMPS'),
         spawns: subRng('R_SPAWNS'),
         tie: subRng('R_TIEBREAKS')
       }
    2) grid = initGrid(w,h)  // Stage 0
    3) stampState = stampRooms(biome, templates, grid, rngs.rooms, rngs.rots) // Stage 1
       // returns { roomsPlaced[], doorAnchors[], roomAABBsByKind }
    4) plan = connectDoors(stampState.doorAnchors, grid, biome, rngs.tie) // Stage 2 plan (pairs)
    5) for each pair in plan: path = routeAStar(pair, grid, biome, rngs.carve); carveCorridor(path, biome.approachDepth, grid)
    6) if biome.ca.enabled: runCavernCA(grid, stampState.roomAABBsByKind.cavern, biome, rngs.ca) // Stage 3
    7) finalizeTiles(grid) // Stage 4
    8) doorDist = buildDoorDistanceField(grid) // for ore pedagogy
    9) seedAndGrowVeins(grid, biome, rngs.ore, doorDist) // Stage 5
    10) placeLamps(grid, stampState, biome, rngs.lamps) // Stage 6
    11) placeEnemyAnchors(grid, stampState, biome, rngs.spawns) // Stage 7
    12) validateConnectivity(grid, stampState.doorAnchors, biome) // Section 5
    13) return exportArtifacts(grid, biome, seed, stampState)

- Stage 0:
  - function initGrid(w,h):
    - tiles = new Array(w*h)
    - for i in 0..w*h-1: tiles[i] = { tileType:'rock', hardness:3, flags:0 }
    - return { w,h,tiles }

- Stage 1:
  - function stampRooms(biome, templates, grid, rngRooms, rngRots):
    - choose N = clamp(round(lerp(min,max,rngRooms.float())))
    - poolKinds = ensure at least one of each available kind
    - remaining = N - requiredKinds.length
    - weighted fill from templates by kind weights (stable by template.id)
    - placed=[], anchors=[]
    - for each chosen template in stable order:
      - for attempt in 1..24:
        - rot = pick from template.rotate using rngRots
        - stampRot = rotateStamp(template.stamp, rot)
        - aabb = random top-left (x0,y0) so that aabb in bounds
        - if validatePlacement(stampRot, x0,y0, grid, biome.approachDepth):
          - applyStamp(stampRot, x0,y0, grid)
          - doors = extractDoorBands(stampRot, x0,y0, rot)
          - for each doorBand:
            - set flags: DOOR_BAND on band cells, ROOM_FLOOR on band and interior '.'
            - markApproachProtect(doorBand, biome.approachDepth, grid)
            - anchors.push(makeDoorAnchor(doorBand))
          - placed.push({ id: placed.length, templateId: template.id, aabb, kind: template.kind })
          - break attempt
    - return { roomsPlaced: placed, doorAnchors: anchors, roomAABBsByKind: indexByKind(placed) }

  - function validatePlacement(stamp, x0,y0, grid, approachDepth):
    - ensure all '#' and 'O' can overlap any, but '.' and 'D' do not overlap existing ROOM_FLOOR
    - ensure all 'D' bands are ≥ approachDepth+1 from boundary
    - ensure rim integrity: perimeter '#' except at 'D'
    - return true/false

  - function markApproachProtect(doorBand, depth, grid):
    - inward = -doorBand.normal (toward room interior)
    - for k in 1..depth:
      - for each of the 3 columns aligned with band centerline:
        - p = center + inward*k + lateral offset [-1,0,1]
        - set flags |= APPROACH3W_PROTECT; also ensure ROOM_FLOOR where stamp had floor

- Stage 2:
  - function connectDoors(doorAnchors, grid, biome, rngTie):
    - uf = UnionFind(doorAnchors.length); union all doors of the same roomId
    - edges=[]
    - while multiple components and edges.length < maxEdges:
      - best = null
      - for each pair (a,b) in different components:
        - d = |ax-bx| + |ay-by|
        - if d < best.d or tie: use stable tiebreak by (a.id,b.id) and rngTie only if identical
        - best = {a,b,d}
      - edges.push(best)
      - uf.union(best.a.id, best.b.id)
    - return edges

  - function routeAStar(pair, grid, biome, rngCarve):
    - start = pair.a.center; goal = pair.b.center
    - locked: write a straight Three‑Wide approach of length approachDepth from each door; record fringe cells as startFringe and goalFringe
    - A* from startFringe to goalFringe on centerline grid:
      - gCost[y*w+x] = inf; parent[y*w+x] = -1
      - open = binary heap keyed by f=g+h; break ties by increasing g then lexicographic (x,y)
      - for neighbor in NESW:
        - base = (tile at n is rock ? 1.0 : 1.2)
        - if tile has APPROACH3W_PROTECT and not in start/goal protected corridor: skip (cost+1000 forbidden)
        - if beyond 2*approachDepth from both doors: base += biome.corridorJitter * rngCellJitter(n)
        - update if g'+h' improves
    - reconstruct center path; return list of center cells (polyline)

  - function carveCorridor(path, approachDepth, grid):
    - for each center cell c along path:
      - carve 3-wide orthogonal imprint:
        - if vertical step: set (x-1,x,x+1,y) to ROOM_FLOOR
        - if horizontal step: set (x,y-1..y+1) to ROOM_FLOOR
      - do not overwrite outside bounds or hard-forbidden cells

- Stage 3:
  - function runCavernCA(grid, cavernAABBs, biome, rngCA):
    - For each cavern AABB:
      - for it in 1..biome.ca.iterations:
        - next = copy of current flags for AABB
        - for each cell (x,y) in AABB:
          - if flags has DOOR_BAND or APPROACH3W_PROTECT: continue
          - count floor in 5×5 neighborhood
          - if current is rock and count ≥ birthThreshold: next becomes ROOM_FLOOR
          - else if current is floor and count ≥ surviveThreshold: keep; else rock
        - commit next
      - reassertApproaches(doorBandsInAABB, approachDepth)

- Stage 4:
  - function finalizeTiles(grid):
    - for each tile:
      - if flags & ROOM_FLOOR: tileType='floor', hardness=0
      - else: tileType='rock', hardness=3

- Stage 5:
  - function buildDoorDistanceField(grid):
    - dist = Uint16Array(w*h).fill(0xFFFF)
    - q = queue; enqueue all DOOR_BAND cells with dist=0
    - BFS NESW; if newDist < dist[n]: dist[n]=newDist; enqueue
    - return dist

  - function seedAndGrowVeins(grid, biome, rngOre, doorDist):
    - eligibleRock = list of rock cells not excluded by pedagogy distances
    - seeds = pick count proportional to ore.rates; weight boost where ORE_PREF set and for copper near doors
    - for each seed:
      - oreKind chosen by normalized ore.rates (respect local boosts)
      - init walker with dir chosen NESW
      - for step in 1..len:
        - candidate = turn/continue by turnBias and rngOre
        - if candidate invalid (out of bounds, not rock, too close to door/protect): pick alternate; if none, stop
        - set tileType='ore.'+oreKind; set hardness per mapping
        - with branchChance, spawn child walker (once per 4 steps max)

- Stage 6:
  - function placeLamps(grid, stampState, biome, rngLamps):
    - Corridors:
      - for each corridor centerline polyline:
        - d=0; side=+1
        - while d < length:
          - S = randint[spacingMin..spacingMax]
          - pos = advance by S; if within avoidDoorDepth of any door, continue
          - pick offset cell at ±1 from centerline normal; if LAMP_ANCHOR within avoidLampRadius skip
          - flags |= LAMP_ANCHOR; record in metadata
          - side *= -1
          - d += S
    - Caverns:
      - for each cavern AABB:
        - count = randint[roomBellyCount.min..max]
        - pick far-from-doors floor cells near centroid; apply avoidLampRadius
        - flags |= LAMP_ANCHOR; record

- Stage 7:
  - function placeEnemyAnchors(grid, stampState, biome, rngSpawns):
    - build eligible floor set with constraints (minFromDoor, avoidLampRadius)
    - for each candidate:
      - weights.goblins = corridorWeight if on corridor else 1
      - weights.burrower = cavernWeight if in cavern belly else 1
      - normalize; accept by roulette selection against random threshold to thin density
    - record anchors { x,y,weights }

- Validation:
  - function validateConnectivity(grid, doorAnchors, biome):
    - components = labelComponents4(grid where tileType='floor')
    - largest = component with max size
    - ratio = largest.size / totalFloorCount
    - assert ratio ≥ 0.90
    - assert all doorAnchors.center ∈ largest
    - assertApproachThreeWide(doorAnchors, biome.approachDepth)

- Export:
  - function exportArtifacts(grid, biome, seed, stampState):
    - json = toJSONShape(...)
    - png = encodePNGOccupancy(...)
    - return { json, png }

- Ties and heuristics:
  - A* open set tie-break: lower h, then lower g, then lexicographic (x asc, y asc)
  - Door pair tie-break: (distance, a.id, b.id); if exact tie on all, consume one rng from R_TIEBREAKS to pick stable side (documented but should be rare)


## 7) Export Artifacts

- JSON map export (MVP shape used by golden-hash harness):
  - {
      version: 1,
      biomeId: string,
      seed: uint32,
      w: int,
      h: int,
      palette: { // fixed indices for tiles
        "R": "rock",
        "F": "floor",
        "C": "ore.copper",
        "I": "ore.iron",
        "Q": "ore.quartz"
      },
      tiles: array<string> of length h, each string length w using characters in palette keys,
      flagsPacked?: string (base64 of Uint16Array w*h in row-major; optional),
      metadata: {
        doors: array<{ x:int, y:int, normal:{dx,dy} }>, // center of each door band
        lamps: array<{ x:int, y:int }>,
        spawns: array<{ x:int, y:int, weights:{ goblin:number, burrower:number } }>,
        audio?: biome.audio (pass-through),
        lore?: biome.lore (pass-through)
      }
    }
  - Note: Only tiles and metadata are hashed for golden output unless harness specifies flagsPacked.

- PNG occupancy export:
  - 2-bit legend (indexed-color PNG):
    - 0: rock (RGB 20,20,24)
    - 1: floor (RGB 180,185,190)
    - 2: ore (any ore) (RGB 255,140,0)
    - 3: reserved (RGB 0,0,0)
  - Encoder:
    - Use pngjs or UPNG.js; alternatively write raw indexed PNG with PLTE and tRNS omitted
    - Per pixel index:
      - tileType rock→0, floor→1, ore.*→2
    - Deterministic row-major write, no filtering (filter type 0) for stable hashing


## 8) Performance Notes

- Target budget: 10–20 ms at 96×64 in release builds
- Allocation discipline:
  - Reuse typed arrays for A* gCost/hCost/parent, CA scratch, BFS queues
  - Preallocate BFS/A* queues to w*h capacity
- A* limits:
  - Cap expansions per corridor at 12k; on cap, if biome.debug.allowFallbackStraightCarve is true, carve Manhattan L-shape; else skip the edge
- Determinism audit:
  - Sort templates by id before selection
  - Iterate candidate pairs in sorted door id order
  - No reliance on JS object property iteration order; always sort arrays explicitly
  - All RNG consumption accounted and substreamed; never read RNG inside hash/equality functions


## 9) Integration Contracts

- Consumed by src/world/gen/generator.js; aligns with ecs-registry TILE_FLAGS and Tile component schema
- Minimap uses color-palette.json tokens (minimap.tiles.*) for visualization (out of scope; generator only emits JSON/PNG with palette clarity)
- Audio ambience ids pulled from biome.audio.* are copied to JSON metadata; no audio logic in generator


## 10) Sample Output

- Canonical seed: 1337
- The harness content pass will include:
  - JSON grid (64×64 example) subset:
    - tiles (first 8 rows × 32 cols snippet):
      - "################...................."
      - "################..............FFFF.."
      - "###############.........FFFFF.FFF.."
      - "#########FFFFF.........FFFCF.FFF..#"
      - "#########F..FF..........FFFI.FFF..#"
      - "#########F..FF..........FFFF.FFF..#"
      - "#########F..FF...........FFF.QFF..#"
      - "#########FFFFF............FF.FFF..#"
    - metadata.doors: [{ x:12, y:18, normal:{dx:0,dy:-1} }, ...]
    - metadata.lamps: [{ x:20, y:22 }, { x:28, y:22 }, ...]
    - metadata.spawns: [{ x:34, y:30, weights:{ goblin:0.7, burrower:0.3 } }, ...]
  - PNG occupancy (64×64):
    - Indexed PNG with legend defined above; visually shows corridors (light), caverns (light), and ores (orange)
  - Connectivity report:
    - total floor tiles: 2431
    - main component tiles: 2278
    - ratio: 0.937 (PASS)
    - all DoorAnchors in main component: true


## 11) DOD Checklist

- [ ] Deterministic with fixed seed
- [ ] >90% connectivity
- [ ] JSON + PNG artifacts emitted by harness
- [ ] Room templates and biome inputs validated (schema-lite checks)
- [ ] Three‑Wide law honored for all doors