# Procedural Cave Generation — The First Descent (Sprint 1)

Provenance: owner @beta (World Generation — Deepdelver Caveborn). Cross-refs: data/world/room-templates.json (§6/§7 used), data/world/biome-crystal-caverns.json (this doc defines its schema and consumption), src/core/ecs-registry.js (§Tiles/ECS contracts), data/visual/color-palette.json (lighting tokens).

I, Deepdelver Caveborn, etch this plan upon the slate: poetic in spirit, precise in edge. Follow it and a level shall bloom from the stone the same way, each time, per seed.

---

## 1) Goals & MVP Constraints

- Fast: full generation under 20 ms for MVP map sizes.
- Deterministic per-seed: identical output given same seed, dimensions, and biome.
- 3‑wide corridor law: no traversable lane narrower than 3 tiles at any point.
- Readable lanes: orthogonal corridors with beveled bends; no single-tile notches.
- Spawn-safe cavern: guaranteed 5×5 clear floor patch, central to the first room.
- Parse/consume JSON templates/configs: room-templates.json and biome-crystal-caverns.json.
- Chunk-friendly for future: stable sub-stream RNGs and hashable coordinates for later streaming.

Non-goals (MVP):
- Overhangs/vertical stacking.
- Multi-layer crossings/bridges.
- Dynamic reflow/adaptive re-routing after placement.
- Fluids (water, lava).

---

## 2) Grid, Tiles, and Coordinate System

- Grid: integer cell lattice; each tile assumed 16×16 px in rendering. Logical generation strictly tile-based.
- Map size (MVP default): 96×72 tiles (width×height). Parameterizable via inputs; must be ≥48×48 and multiples of 3 preferred.
- Origin: world (0,0) at top-left tile. x increases rightward; y increases downward.
- Room-local coordinates: templates authored with (0,0) at top-left of template grid; placement anchor at template’s local (0,0) mapping to world (X0,Y0).

Tile states:
- 'rock': solid background; non-traversable.
- 'floor': traversable.
- 'rock.ore': solid; non-traversable; carries oreType string id (e.g., "ore.copper").
- Decoration overlays: separate prop entities (e.g., crystals, lamps) placed atop tiles; tile remains as above.

ECS contract (see src/core/ecs-registry.js):
- For each tile cell, instantiate ENTITY_TYPES.tile with components:
  - Position { x:int, y:int, layer:int=0 }
  - Tile { tileType:'rock'|'floor'|'rock.ore', oreType?:string }
  - Collider { solid:boolean } where solid = (tileType !== 'floor')
  - Renderable { depth:int=0, tintToken?:string }
- Tint tokens for ambient/lighting are derived from biome.lighting and color-palette tokens (data/visual/color-palette.json). No raw hex in world gen.

---

## 3) Randomness & Determinism

PRNG:
- Use a 32-bit seedable PRNG (xorshift32 or equivalent) with unsigned 32-bit arithmetic.
- Per-level seed = hash32(worldSeed, levelIndex). Derive named sub-streams to isolate phases:
  - graphRng, placementRng, pathRng, caRng, oreRng, decorRng.
- Sub-stream derivation: subSeed = hash32(levelSeed, stringHash("subname")).

Hashing guidance (chunk-safe):
- hash32(a,b) = splitmix32(a ^ (b + 0x9E3779B9) | 0), or a standard integer hash with avalanche.
- For future chunking, when sampling noise/PRNG per coordinate, derive a coordinate-stable index: coordSeed = hash32(levelSeed, hash32(x, y)) and use as xorshift32 state for single-sample draws. Do not advance shared global RNG inside inner loops over coordinates.

Utility:
- rand01(rng): returns float in [0,1). Use deterministic conversion: (rng.next() >>> 0) / 4294967296.
- intRange(rng, lo, hi): inclusive range via modulo bias-safe method if needed, or accept small bias for non-critical ties.

---

## 4) High-Level Pipeline (Overview)

Ordered generation steps:

1) Initialize grid to 'rock'.
2) Build room graph (spawn cavern + 1–2 tunnels + 1 ore pocket for MVP) using template metadata and a simple spanning plan.
3) Place rooms using templates (data/world/room-templates.json) with validation (door spans and rim seals).
4) Carve 3‑wide corridors along graph edges (centerline L-path with single bend; bevel corners).
5) Apply cellular automata smoothing pass to widen pockets and denoise edges (restricted to carved areas and masks).
6) Seed ore veins along floor–rock interfaces per biome-crystal-caverns.json (ore rules, rates by adjacency/depth/noise).
7) Place lighting/decoration per biome (lamps at door hubs, crystals in alcoves), emitting tokens only.
8) Validate connectivity (doors reachable), enforce 3‑wide law, and spawn-safe checks. Produce issue manifest.

---

## 5) Room Templates Consumption

Source: data/world/room-templates.json

Expectations:
- version == 1
- Must contain at least these three ids:
  - "room.spawn.cavern.s1" — primary spawn cavern with a labeled 5×5 spawn patch and 2–3 doors (EW/NS-aligned).
  - "room.pocket.ore.s1" — small ore-preferred bulb with 1–2 doors.
  - "room.tunnel.hub3.s1" — 3-door hub junction (T or Y shaped), pre-aligned to cardinal axes.
- Grid legend:
  - '#' = sealed rim/wall.
  - '.' = interior floor.
- Doors array semantics:
  - doors: [{ x:int, y:int, dir:'N'|'S'|'E'|'W', span:int=3 }]
  - Door spans are exactly 3 tiles wide, contiguous, aligned with dir, with interior immediately beyond door guaranteed floor.
- Spawn patch:
  - For "room.spawn.cavern.s1", spawnPatch: { x:int, y:int, w:int=5, h:int=5 } in local coords; this rectangle must be entirely '.' within the room interior.

Placement API (MVP):
- Selection: choose by id or tags. For MVP determinism, no rotation or mirroring. Author templates in both EW/NS variants as needed.
- Placement procedure:
  - Given world placement anchor (X0,Y0), paste template '.' into grid (set to floor).
  - Maintain border '#' as rock; only cut the door spans to allow corridor egress.
  - Record door portals in world coords: (wx, wy, dir) for all tiles in the 3-wide door span, marking the portal center (middle of span) as the corridor centerline start/end for pathing.
  - Ensure "rim seals": the outermost ring of the template remains rock except at door spans.

Validation upon placement:
- No overlap: existing floors may overlap new floors only if both are same room instance; otherwise reject and re-place with different offsets.
- Entire template must fit within world bounds.

---

## 6) Corridor Carving (3‑Wide Law)

Door portal representation:
- A door portal is (x:int, y:int, dir:'N'|'S'|'E'|'W'), where (x,y) is the center tile of a 3-tile span flush with the room’s rim; dir faces outbound.
- The 3 tiles of the span are collinear and orthogonal to dir; the template ensures the immediate interior strip is already '.'.

Pathfinding:
- Use an orthogonal L-path (Manhattan) with a single bend. Compute two candidates:
  - Horizontal-first then vertical.
  - Vertical-first then horizontal.
- Pick the candidate with fewer wall intrusions (i.e., number of centerline steps adjacent to room rims). On tie, use pathRng to decide.
- Keep centerline at least 1 tile from non-room rock where feasible by offsetting the bend coordinate by ±1 if it keeps 3‑wide clearance inside bounds (bounded attempts=2).

Carve rule:
- For each centerline step:
  - If moving horizontally (dx≠0): carve a 3×1 swath centered vertically on the step tile: cells {(x, y-1), (x, y), (x, y+1)} set to floor.
  - If moving vertically (dy≠0): carve a 1×3 swath centered horizontally: {(x-1, y), (x, y), (x+1, y)} set to floor.
- Bevel corners to avoid pinches:
  - At an L bend, also carve the diagonal shoulder to form a 2×2 bevel:
    - For a turn right→down (E→S): additionally set floor at (x+1, y+1).
    - For E→N: set (x+1, y-1). For W→S: set (x-1, y+1). For W→N: set (x-1, y-1).
  - Apply a corner mask ensuring no 1-tile diagonal choke remains.
- Collision fairness:
  - After carving, scan the corridor band; if any internal notch exists (a single rock tile touching floor on 3 sides), flip it to floor.
  - Maintain zClearance >= 3 everywhere along the corridor path.

Pseudocode (carving):

```
function carveCorridor(grid, startPortal, endPortal, pathRng):
  pathA = buildLPath(startPortal.center, endPortal.center, first='H')
  pathB = buildLPath(startPortal.center, endPortal.center, first='V')
  scoreA = corridorScore(grid, pathA)
  scoreB = corridorScore(grid, pathB)
  path = (scoreA < scoreB) ? pathA : (scoreB < scoreA ? pathB : (pathRng.nextBit() ? pathA : pathB))

  for step in path:
    if step.dir in {E,W}:
      carveFloor(grid, step.x, step.y-1)
      carveFloor(grid, step.x, step.y)
      carveFloor(grid, step.x, step.y+1)
    else:
      carveFloor(grid, step.x-1, step.y)
      carveFloor(grid, step.x, step.y)
      carveFloor(grid, step.x+1, step.y)

    if isCorner(step.prevDir, step.dir):
      dx = sign(step.x - step.prevX)
      dy = sign(step.y - step.prevY)
      carveFloor(grid, step.x + (dx==0? (step.dir==E?1:-1):dx), step.y + (dy==0? (step.dir==S?1:-1):dy)) // diagonal bevel

  fixNotchesInBand(grid, bandMaskFrom(path))
```

Masks:
- Notch fix checks 3×3 neighborhood; any rock with ≥3 orthogonal floor neighbors inside the corridor band flips to floor.
- Band mask: union of carved swaths plus 1-tile shoulder.

---

## 7) Cellular Automata Smoothing (Restricted)

Scope:
- Only within an influence mask: union of
  - Room interior floors,
  - Corridor bands and shoulders (1 tile beyond the 3‑wide),
  - Optional alcove candidates touching cavern walls.
- Never touch sealed rims (template border '#').

Initial state:
- open=1 for '.' (floor), wall=0 for '#' (rock or rock.ore treated as rock for CA).

Rule set (MVP, 2 iterations):
- For each cell c in mask:
  - Count sum = neighbors3x3_open(c) including self if open.
  - Promotion: if c is rock and sum >= 5 and c is adjacent (4-neighborhood) to any existing floor, set to floor.
  - Demotion: if c is floor and sum <= 2 and c is within caverns-only (not in strict corridor core), revert to rock.
- Clamp corridors:
  - After each iteration, enforce 3‑wide minimum along corridor core: re-carve any eroded centerline swaths.

Optional sprinkle (alcoves):
- With caRng and limits (maxAlcoves ≤ biome.decoration.maxCrystals), randomly convert a rock cell adjacent to exactly 2 floor neighbors into a single-tile alcove along cavern walls. Tag for crystal placement.

Pseudocode (smoothing):

```
function smoothCA(grid, mask, caRng, iterations=2):
  for it in 1..iterations:
    next = copyGridState(grid)
    for each (x,y) in mask:
      sum = sumOpen3x3(grid, x, y)
      if isRock(grid,x,y) and sum >= 5 and hasFloorCardinal(grid,x,y):
        next[x,y] = floor
      else if isFloor(grid,x,y) and sum <= 2 and inCavernMask(x,y):
        next[x,y] = rock
    grid = next
    enforceCorridorBands(grid)
  sprinkleAlcoves(grid, mask, caRng)
  return grid
```

---

## 8) Biome: Crystal Caverns Consumption & Schema

Source file: data/world/biome-crystal-caverns.json

Schema (version 1):

```
{
  "version": 1,
  "id": "biome.crystal.caverns",
  "tiles": {
    "floor": { "tileType": "floor", "hardness": int },
    "rock":  { "tileType": "rock",  "hardness": int },
    "ore": {
      "baseHardness": int,
      "oreTypes": [
        { "id": "ore.copper" | "ore.iron" | "shard.quartz", "weight": number, "minCluster": int, "maxCluster": int }
      ]
    },
    "decor": {
      "crystal": { "chance": number, "cluster": { "min": int, "max": int } }
    }
  },
  "lighting": {
    "ambient": "mapping.lighting.crystalCool",
    "lamps": { "token": "mapping.lighting.lampWarm", "intervalTiles": int, "atDoors": true }
  },
  "spawnRules": {
    "enemyWeights": { "enemy.goblin.grunt": number, "enemy.cave.burrower": number },
    "minSeparationTiles": int
  },
  "oreSeeding": {
    "edgeBias": number,
    "floorRockAdjacencyOnly": true,
    "noise": { "octaves": int, "scale": number, "threshold": number }
  },
  "decoration": { "crystalOnAlcove": true, "maxCrystals": int }
}
```

Field meanings and defaults (guidance):
- version: must be 1.
- tiles.floor.tileType: literal "floor"; hardness: 1–3 (tool interaction; non-functional here).
- tiles.rock.tileType: literal "rock"; hardness: 2–5.
- tiles.ore.baseHardness: 3–6; applied to all 'rock.ore' unless overridden by gameplay.
- tiles.ore.oreTypes: weighted list; minCluster/maxCluster in tiles; ranges: min 2–5, max 6–14.
  - Note: "shard.quartz" is normally used as decoration (props), not ore tiles, unless explicitly included here.
- tiles.decor.crystal: chance 0.0–1.0 per alcove; cluster sizes 1–4 typical.
- lighting.ambient: token key to data/visual/color-palette.json; drives Renderable.tintToken for tiles.
- lighting.lamps.token: token key for lamp props; intervalTiles: 8–16 typical; atDoors: if true, place one lamp per doorway hub.
- spawnRules.enemyWeights: relative weights; minSeparationTiles: 3–5 typical; used by separate spawn system (token-only here).
- oreSeeding.edgeBias: 0.2–0.8; higher biases selection toward strong edges.
- oreSeeding.floorRockAdjacencyOnly: if true, ores appear only along seams (required for MVP).
- oreSeeding.noise: octaves 1–3; scale 8–24; threshold 0.5–0.7.
- decoration.crystalOnAlcove: if true, fill alcoves with crystals; maxCrystals: global cap for the map (e.g., 24).

Lighting tokens:
- Only tokens are emitted by generator. Rendering pipeline maps tokens to actual colors via data/visual/color-palette.json. Do not embed hex/rgb values in world generation.

---

## 9) Ore Vein Seeding Algorithm (Crystal Caverns)

Edge detection (seams):
- Collect floor cells that have at least two rock neighbors among N,S,E,W. These are seam edge candidates.

Noise bias:
- Sample 2D value-noise or fast Perlin with biome.noise.scale and octaves. Normalize to [0,1].
- A seam cell qualifies as a seed if noise >= biome.noise.threshold and a secondary bias coin rand01(oreRng) < (1 - biome.oreSeeding.edgeBias) + adjacencyBoost.
  - adjacencyBoost: +0.1 when near "orePreferred" templates (e.g., within 4 tiles of "room.pocket.ore.s1").

Cluster growth:
- Choose oreType via weighted lottery from tiles.ore.oreTypes (oreRng).
- Sample cluster target size S in [minCluster, maxCluster].
- Flood-fill from the seed using 4-neighborhood; expand preferentially along floor–rock boundaries and into rock cells adjacent to floor.
- Stop when |cluster| == S or no candidates remain.
- Mark chosen rock cells as 'rock.ore' with oreType; do not convert floor cells to ore.

Spacing rule:
- Maintain a minimum Euclidean spacing R between cluster centers (e.g., R=6 tiles) to avoid crowding.
- Never encroach upon corridor cores; maintain at least 2 tiles of rock buffer from the 3‑wide corridor band.
- Prefer placement along cavern shoulders and in ore pocket bulbs by applying a lower noise threshold (e.g., -0.1) within 3 tiles of "orePreferred" rooms.

Post-process:
- Clamp global counts per ore type to soft caps (derived from map area and biome weights), thinning least significant peripheral tiles if exceeded.
- Ensure "ore.iron" is rarer than "ore.copper": enforce weight/cluster count ratio or downsample iron clusters if necessary.
- "shard.quartz" appears as decoration props unless explicitly included in oreTypes; do not place as 'rock.ore' otherwise.

---

## 10) Spawn-Safe & Validation Passes

Checks:
- 5×5 spawn area (from spawnPatch) is all 'floor' and within bounds.
- Connectivity: From spawn center, BFS over 'floor' to all door portal centers. All must be reachable.
- 3‑wide law: For every row and column intersecting corridors/rooms, ensure minimal traversable width ≥3. Detect by scanning floor runs and verifying no 1-tile choke; re-carve if necessary or log a manifest issue if correction fails.
- Ore counts respect biome caps; verify iron < copper in count or area; quartz props handled separately.
- ECS preflight: All tiles mappable to ENTITY_TYPES.tile with correct Collider.solid; lighting tokens resolvable from palette.

Manifest:
- Compile issues: [{ code, severity, message, at:{x,y}?, extra? }]. Severity: info|warn|error. The generator returns this manifest for debug logs.

---

## 11) Data → ECS Instantiation Contracts

Tiles:
- For each cell:
  - entity = spawn(ENTITY_TYPES.tile)
  - Position { x, y, layer:0 }
  - Tile { tileType, oreType? }
  - Collider { solid: tileType !== 'floor' }
  - Renderable { depth:0, tintToken: biome.lighting.ambient }
- Note: Additional depth modulation or per-depth tints may be added by rendering/effects; generator sets only ambient token.

Decorations & lighting (props):
- Lamps: spawn at door hubs and at intervalTiles along long corridors, using Renderable.tintToken = biome.lighting.lamps.token.
- Crystals: spawn in alcoves or along designated decoration surfaces. Use prop ids and tokens only (no colors here).
- Props are separate entities (ENTITY_TYPES.prop or similar), with Placement snapped to tile centers.

All tokens must exist in data/visual/color-palette.json; missing tokens are logged in manifest.

---

## 12) API Surface (Generator Module)

Proposed JS module:

- generateLevel({ seed:int, width:int, height:int, biomeId:string }): returns
  - {
      grid: TileCell[][],
      rooms: RoomInstance[],
      corridors: Path[],
      ores: OreCluster[],
      props: PropInstance[],
      portals: DoorPortal[],
      manifest: Issue[]
    }

Types:
- TileCell:
  - { x:int, y:int, tileType:'rock'|'floor'|'rock.ore', oreType?:string }
- RoomInstance:
  - { id:string, bounds:{ x:int, y:int, w:int, h:int }, doors: DoorPortal[], spawnPatch?:{ x:int, y:int, w:int, h:int }, tags?:string[] }
- DoorPortal:
  - { x:int, y:int, dir:'N'|'S'|'E'|'W', span:int=3, roomId:string }
- Path:
  - { from:DoorPortal, to:DoorPortal, centerline: {x:int,y:int}[], bandMask?:Bitset2D }
- OreCluster:
  - { oreType:string, tiles:{x:int,y:int}[], seed:{x:int,y:int} }
- PropInstance:
  - { id:string, x:int, y:int, tintToken?:string, tags?:string[] }
- Issue:
  - { code:string, severity:'info'|'warn'|'error', message:string, at?:{x:int,y:int}, extra?:any }

Determinism contract:
- Same inputs → same outputs byte-for-byte for grid/rooms/corridors/ores/props/portals.
- Only manifest ordering and info-level messages may vary if non-critical; prefer stable ordering.

Error handling:
- Invalid biome/template version → throws with code 'E_SCHEMA_VERSION'.
- Placement failure after N retries → returns manifest error 'E_PLACEMENT' and falls back to minimal straight tunnel plan if possible.
- Token resolution failure → manifest warn 'W_TOKEN_MISSING'.

---

## 13) Pseudocode Blocks

placeRooms:

```
function placeRooms(grid, roomTemplates, graphRng, placementRng, width, height):
  instances = []

  // 1) Place spawn cavern near center-left
  spawnTpl = getTemplateById("room.spawn.cavern.s1")
  spawnX = max(2, floor(width * 0.2) - floor(spawnTpl.w/2))
  spawnY = clamp(floor(height/2 - spawnTpl.h/2), 2, height - spawnTpl.h - 2)
  placeTemplate(grid, spawnTpl, spawnX, spawnY)
  rec = recordRoom(spawnTpl, spawnX, spawnY)
  instances.push(rec)

  // 2) Optionally place hub and ore pocket
  hubTpl = getTemplateById("room.tunnel.hub3.s1")
  oreTpl = getTemplateById("room.pocket.ore.s1")
  // Simple offsets to the right; adjust Y with small jitter for variation
  offY = intRange(placementRng, -4, 4)
  hubX = clamp(spawnX + spawnTpl.w + 6, 2, width - hubTpl.w - 2)
  hubY = clamp(spawnY + offY, 2, height - hubTpl.h - 2)
  placeTemplateIfClear(grid, hubTpl, hubX, hubY) && instances.push(recordRoom(hubTpl, hubX, hubY))

  oreX = clamp(hubX + hubTpl.w + 8, 2, width - oreTpl.w - 2)
  oreY = clamp(hubY + intRange(placementRng, -6, 6), 2, height - oreTpl.h - 2)
  placeTemplateIfClear(grid, oreTpl, oreX, oreY) && instances.push(recordRoom(oreTpl, oreX, oreY, tags:['orePreferred']))

  return instances
```

carveCorridors:

```
function carveCorridors(grid, rooms, pathRng):
  edges = planEdges(rooms) // connect spawn -> hub -> ore if present; else spawn->ore
  paths = []
  for e in edges:
    s = pickDoorFacing(e.fromRoom, e.toRoom) // choose door portals with aligned dirs
    t = pickDoorFacing(e.toRoom, e.fromRoom)
    p = carveCorridor(grid, s, t, pathRng)
    paths.push({ from:s, to:t, centerline:p.centerline })
  return paths
```

smoothCA:

```
function buildMask(grid, rooms, paths):
  mask = Bitset2D(width, height)
  // Mark room interiors and corridor bands (+1 shoulder)
  for r in rooms: markRoomMask(mask, r)
  for p in paths: markBand(mask, p.centerline, shoulder=1)
  return mask

function smoothPhase(grid, rooms, paths, caRng):
  mask = buildMask(grid, rooms, paths)
  grid = smoothCA(grid, mask, caRng, iterations=2)
  return grid
```

seedOres:

```
function seedOres(grid, biome, oreRng, rooms, paths):
  seams = collectSeamCells(grid)
  seeds = []
  for c in seams:
    n = sampleNoise(c.x, c.y, biome.oreSeeding.noise, oreRng) // deterministic if noise is hash-based
    nearOrePref = nearTaggedRoom(c, rooms, tag='orePreferred', radius=4) ? 0.1 : 0.0
    if n >= biome.oreSeeding.noise.threshold - nearOrePref:
      if distanceToCorridor(c, paths) >= 2:
        seeds.push(c)
  clusters = []
  spatial = buildSpatialHash(width, height, cell=8)
  for s in seeds:
    if tooCloseToExisting(s, clusters, R=6, spatial): continue
    oreType = weightedPick(biome.tiles.ore.oreTypes, oreRng)
    S = intRange(oreRng, oreType.minCluster, oreType.maxCluster)
    tiles = growCluster(grid, s, S, oreRng)
    if tiles.length >= 2:
      markOre(grid, tiles, oreType.id)
      clusters.push({ oreType:oreType.id, tiles, seed:{x:s.x, y:s.y} })
      spatial.insert(s.x, s.y, clusters.length-1)
  enforceOreCaps(clusters, biome, grid)
  return clusters
```

---

## 14) Performance Notes

- Target: <20 ms for 96×72 tiles on a mid-tier laptop.
- Use typed arrays (Uint8Array) for grid state and masks; avoid object allocation in inner loops.
- CA iterations ≤ 2; neighbor sums via rolling window if profiling justifies; otherwise 3×3 summation with precomputed strides.
- Noise sampling bounded: cache gradients for Perlin or use hash-based value-noise with no allocations.
- Corridor carving O(path length); masks updated in-place.
- Minimize RNG calls; where possible, use deterministic tie-break rules.

---

## 15) Debugging & Visualization

Optional debug layers (toggle via flags):
- Door portals (draw 3-tile spans with direction arrows).
- Corridor centerlines and carved bands.
- Seam edges (floor cells with ≥2 rock cardinals).
- CA masks (influence vs. rim seals).
- Ore cluster seeds and extents.
- Props (lamps/crystals) placement markers.
- Print seed, sub-seeds, timings per phase.

---

## 16) Testing & Acceptance Checklist

- Room placement:
  - No overlaps between distinct rooms.
  - All doors on template rims; 3-tile spans properly aligned.
- Corridors:
  - 3‑wide throughout; beveled at bends; no single-tile notches.
- Spawn:
  - 5×5 area intact, floor, reachable to all door portals.
- Ores:
  - Seeded along floor–rock seams; maintain spacing; avoid corridor bands.
  - Iron rarer than copper; quartz appears as props unless configured as ore.
- ECS:
  - Tiles instantiate with correct Position, Tile, Collider, Renderable (depth=0, layer=0).
  - Lighting tokens resolve in color-palette.
- Determinism:
  - Replay with fixed seed yields identical grid and placements.
- Manifest:
  - Empty or only info-level notes under normal runs.

---

## 17) Future Extensions (Notes Only)

- WFC-driven room variants and organic corridors beyond L-paths.
- Dynamic lamp frequency based on path length and branching factor.
- Multi-entrance caverns and cyclic graphs.
- Biome mixing and transitions.
- Abyssal chasms with bridges and edge-rails.

---

## Appendix A: Template Placement Details (Rim Seals and Doors)

- When pasting a template:
  - For each cell:
    - '.' → set to floor unless already floor (idempotent).
    - '#' → leave as rock; do not allow CA to erode border '#' (mark as rim).
  - For each door in doors[]:
    - If dir == 'E' or 'W': The door span occupies three tiles vertically centered at (x,y) extending along y; verify all three are on the template rim; set to floor.
    - If dir == 'N' or 'S': Span occupies three tiles horizontally centered at (x,y) along x; set to floor.
  - Record portals: center tile (x,y) with dir; span=3.

---

## Appendix B: PRNG and Hashing Reference

xorshift32:

```
function XorShift32(seed):
  state = seed >>> 0
  function next():
    x = state
    x ^= (x << 13) >>> 0
    x ^= (x >>> 17) >>> 0
    x ^= (x << 5) >>> 0
    state = x >>> 0
    return state
  return { next, nextFloat: () => (next() >>> 0) / 4294967296, nextBit: () => (next() & 1) }
```

splitmix-like hash:

```
function hash32(a, b):
  x = (a ^ 0x9E3779B9) + (b >>> 0) + 0x85EBCA6B
  x = (x ^ (x >>> 16)) * 0x85EBCA6B >>> 0
  x = (x ^ (x >>> 13)) * 0xC2B2AE35 >>> 0
  x = x ^ (x >>> 16)
  return x >>> 0

function stringHash(s):
  h = 2166136261
  for each ch in s: h = (h ^ ch.charCodeAt(0)) * 16777619 >>> 0
  return h >>> 0
```

Chunk-safe sample:

```
function coordRand(levelSeed, x, y, tag):
  s = hash32(levelSeed, hash32((x<<16) ^ y, stringHash(tag)))
  rng = XorShift32(s)
  return rng.nextFloat()
```

---

## Appendix C: Corridor Corner Masks

- Ensure corners carve a 2×2 to avoid diagonal snags:

Patterns (F=floor, R=rock)
- Turn E→S:
  - Before:
    (x,y): step
    Carve: (x,y-1),(x,y),(x,y+1) and then (x+1,y),(x+1,y+1),(x,y+1)
  - Guarantee (x+1,y+1)=F

Apply equivalent symmetric patterns for other turn pairs.

---

## 18) High-Level Generator Pseudocode (Orchestration)

```
function generateLevel({ seed, width=96, height=72, biomeId="biome.crystal.caverns" }):
  levelSeed = hash32(seed, 1) // levelIndex=1 for Mine Level 1
  graphRng  = XorShift32(hash32(levelSeed, stringHash("graph")))
  placementRng = XorShift32(hash32(levelSeed, stringHash("place")))
  pathRng   = XorShift32(hash32(levelSeed, stringHash("path")))
  caRng     = XorShift32(hash32(levelSeed, stringHash("ca")))
  oreRng    = XorShift32(hash32(levelSeed, stringHash("ore")))
  decorRng  = XorShift32(hash32(levelSeed, stringHash("decor")))

  biome = loadBiome(biomeId) // validate against §9 schema

  grid = makeGrid(width, height, fill='rock')
  rooms = placeRooms(grid, loadRoomTemplates(), graphRng, placementRng, width, height)
  paths = carveCorridors(grid, rooms, pathRng)
  grid  = smoothPhase(grid, rooms, paths, caRng)
  ores  = seedOres(grid, biome, oreRng, rooms, paths)
  props = placeProps(grid, rooms, paths, decorRng, biome) // lamps + crystals by tokens
  portals = collectPortals(rooms)

  manifest = validateAll(grid, rooms, paths, ores, biome, portals)
  return { grid, rooms, corridors:paths, ores, props, portals, manifest }
```

Place props (lighting/decoration summary):
- Lamps:
  - If biome.lighting.lamps.atDoors: place one lamp at each room door’s interior-side shoulder.
  - Along corridors longer than intervalTiles: place lamps every intervalTiles from the nearer hub.
- Crystals:
  - If decoration.crystalOnAlcove: place crystals at alcove tiles; cluster crystals per tiles.decor.crystal.cluster; respect maxCrystals.

---

By these strata and strictures, the First Descent shall be hewn: swift, stable, and clear as a well-cut gem.