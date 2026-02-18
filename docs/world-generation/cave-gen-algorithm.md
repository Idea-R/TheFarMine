# Cave Generation — Lanes, Bellies, and Veins (Sprint 1)

Provenance
- Owner: @beta (World Generation — Deepdelver Caveborn)
- Voice: Deepdelver Caveborn — I sing of stone with a straightedge. Poetry in lanes, proofs in code.

Cross-References
- data/world/room-templates.json (v1)
- data/world/biome-crystal-caverns.json (shape defined herein)
- data/core/component-schemas.json (§Tile)
- docs/core-systems/ecs-architecture.md (§Tile flags)
- docs/visual-systems/style-guide.md (§Three‑Wide visuals)
- docs/technology-systems/crafting-design.md (§Hardness bands)
- docs/combat-systems/combat-design.md (§Three‑Wide lanes)

---

## 2) Scope & Acceptance (MVP)

Scope
- Single-level generator for Mine L1.
- Seeded determinism.
- Place 3 template types: tunnel, cavern, ore-pocket.
- Cellular automata (CA) smoothing.
- Corridor carving that upholds the Three‑Wide Law.
- Ore seeding (copper/iron/quartz bands per biome).
- Lamp anchors and enemy spawn anchors.
- Output ECS-friendly Tiles with flags.

Acceptance
- Given seed S and size (W,H), the generator returns a stable tile grid.
- Room templates honor door metadata and rotations.
- Three‑Wide approach lanes kept clear and straight for approachDepth.
- Biome JSON is read and applied.
- Outputs map cleanly to ECS Tile component per component-schemas.json.
- Hash-of-tiles stable across runs for same inputs.

---

## 3) Data Contracts & Flags (Authoritative)

Inputs
- seed:int|string — coerced to 32-bit; primary RNG seed.
- size:{ w:int, h:int } — tile dimensions (default 96×64).
- biomeId:string (default "biome.crystal_caverns") — loads data/world/biome-crystal-caverns.json.

Consumed Data
- data/world/room-templates.json v1 — authoritative grids/doors legend:
  - '#': solid rock boundary in template space
  - '.': floor carve
  - 'D': door band tile (doors appear exactly 3 contiguous along an edge)
  - 'O': ore-preferred rock reservation
  - ' ' (space): void treated as rock during stamp
- Biome JSON (defined in §11) — tile tokens, CA params, ore rules, lamp rules, spawn tables.

ECS Tile Mapping (component-schemas.json §Tile)
- Tile.tileType: "rock" | "floor" | "ore.copper" | "ore.iron" | "ore.quartz" (per biome mapping).
- Tile.hardness: int (defaults per biome: rock 3; floor 0; ores per ore entry).
- Tile.oreType: "" | "copper" | "iron" | "quartz".
- Tile.flags:uint32 bitfield; canonical bits:
  - 0x0001 ORE_PREF (template 'O')
  - 0x0002 DOOR_BAND (template 'D')
  - 0x0004 APPROACH3W (cells directly behind door kept clear ≥3)
  - 0x0008 LAMP_ANCHOR
  - 0x0010 ROOM_FLOOR
  - 0x0020 CORRIDOR_FLOOR
  - 0x0040 WALL (derived boundary between floor and rock)
  - 0x0080 SPAWN_ANCHOR
- Note: flags are additive; WALL is a derived helper, not required to be stamped to ECS if downstream does not need it.

---

## 4) RNG & Determinism Plan

- Single master seed split into named substreams via a JS-friendly 32-bit hash (SplitMix32-like) and XorShift32 next().
- Fixed acquisition order to avoid accidental drift:
  - R0.rooms — room count, template selection, rotations, placements
  - R1.corridors — door pairing, A* jitter, carve decisions
  - R2.CA — initial noise field and CA rule variants (if randomized)
  - R3.ore — vein starts, branching, ore type choices
  - R4.lamps — anchor scatter, keep-out jitter
  - R5.spawns — enemy anchor sampling

Substream Derivation (pseudo)
```
function hash32(x, tag) {
  // tag is a small constant per stream; x is 32-bit unsigned
  let h = (x ^ tag) >>> 0;
  h ^= h >>> 16; h = Math.imul(h, 0x7feb352d) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 0x846ca68b) >>> 0;
  h ^= h >>> 16;
  return h >>> 0;
}
function makeRNG(seed32) {
  let s = (seed32 || 1) >>> 0;
  return {
    next() { // XorShift32
      s ^= s << 13; s ^= s >>> 17; s ^= s << 5; s >>>= 0;
      return s >>> 0;
    },
    float() { return (this.next() >>> 0) / 4294967296; },
    int(lo, hi) { // inclusive
      const r = this.next() >>> 0;
      return lo + (r % (hi - lo + 1));
    },
    pick(arr) { return arr[this.int(0, arr.length - 1)]; },
    shuffleInPlace(arr) { for (let i=arr.length-1;i>0;--i){ const j=this.int(0,i); [arr[i],arr[j]]=[arr[j],arr[i]]; } }
  };
}
const S = coerceToUint32(seed);
const R0 = makeRNG(hash32(S, 0xA001));
const R1 = makeRNG(hash32(S, 0xA002));
const R2 = makeRNG(hash32(S, 0xA003));
const R3 = makeRNG(hash32(S, 0xA004));
const R4 = makeRNG(hash32(S, 0xA005));
const R5 = makeRNG(hash32(S, 0xA006));
```
Determinism Notes
- Iterate all loops in lexical row-major (y then x) order unless explicitly shuffled using the substream for that stage.
- All uniform sampling uses rng.float() as above; integer selections via rng.int(lo,hi).
- No reliance on JS object key order; arrays only.
- Preallocate fixed-size typed arrays; avoid GC churn during generation.

---

## 5) High-level Pipeline (Stages)

1) Initialize grids:
- Arrays length = W×H:
  - tType: Uint8 (0=rock, 1=floor, 2=ore.copper, 3=ore.iron, 4=ore.quartz)
  - hardness: Uint8 (per biome defaults)
  - flags: Uint32 (bitfield)
- Fill with rock defaults from biome. Track width=W, height=H.

2) Stamp N rooms from templates with collision checks and DOOR_BAND bands (N from biome range).
- Mark ROOM_FLOOR on '.'; DOOR_BAND on 'D'; ORE_PREF on 'O'.
- Enforce 1-tile rock moat around non-door edges.

3) Connect rooms: build a connectivity graph by pairing door bands and carve 3‑wide corridors.
- Carve CORRIDOR_FLOOR '.' cells ensuring Three‑Wide lanes and approach moats.

4) Fill/trim: ensure no isolated floors; enforce 1-tile rock rim at map bounds.

5) CA smoothing over rock/floor per biome params (interior only; preserve APPROACH3W and door lanes).

6) Wall derivation: mark WALL on rock cells 4-neigh adjacent to any floor.

7) Ore seeding: place ore overlays respecting ORE_PREF, derived WALLs, hardness gates, and biome quotas; avoid approach lanes and door bands; avoid high-openness lamp-keep zones (see §10).

8) Lamp placement: choose LAMP_ANCHOR near junctions/pads with spacing rules.

9) Spawn anchors: choose SPAWN_ANCHOR on floor cells with safe radii from doors/lamps; tag by biome spawn table (IDs only; instantiation later).

10) Emit ECS tile placements with final tileType/hardness/oreType/flags and compute stable hash.

---

## 6) Room Placement (Stage 2)

Count
- rooms = uniformInt(biome.rooms.min..biome.rooms.max) drawn from R0.
- Weighted template kinds with default targets: tunnel:6, cavern:5, ore_pocket:4. Guarantee at least one ore_pocket if space permits (fallback replaces last chosen kind on failure).
- Attempt placements in deterministic order of attempts; at most K=24 attempts per room.

Placement Grid & Rotation
- Each template defines width, height, rotate:[0,90,180,270] allowed.
- Select rotation via R0; rotate the template grid and door coordinates.
- Door bands: each template has exactly one door band per side used, consisting of exactly 3 contiguous 'D's on an edge. The “door center” is the middle of the three.

Collision & Moat
- Stamp rectangle must be entirely within [1..W-2]×[1..H-2] (preserve outer rim).
- No overlapping existing ROOM_FLOOR, DOOR_BAND, or APPROACH3W.
- A 1-tile rock moat must surround any newly carved floor except where the door band abuts map rock that will later corridor-connect; doors must be fully within bounds with at least approachDepth interior tiles available.

Stamping Rules
- '.': set tType=floor; hardness=floorHardness (usually 0); flags|=ROOM_FLOOR.
- 'D': set tType=floor; flags|=DOOR_BAND|ROOM_FLOOR; then stamp APPROACH3W:
  - From the door center and its flanking two tiles, step inward along the template normal for depth=max(3, biome.approachDepth). For each of these cells:
    - Carve to floor, flags|=APPROACH3W|ROOM_FLOOR.
    - Keep exactly 3-wide straight; mask these cells from later CA and ore seeding.
- 'O': leave as rock; flags|=ORE_PREF (do not carve yet).
- '#', ' ': leave as rock.

Three‑Wide Enforcement
- Immediately behind the central 'D', the approach lane must be 3 tiles wide, straight, depth ≥ biome.approachDepth.
- If template omits a full approach interior, the placer carves it additively.
- Mark a “no-touch mask” for APPROACH3W to survive CA, ore, lamps, and spawns.

---

## 7) Corridor Carving (Stage 3)

Goal
- Connect all placed rooms into a single connected component via their door centers.

Nodes & Weights
- Gather all door centers (x,y); group by spatial buckets (e.g., 8×8) for O(E log V) proximity scans.
- Build a candidate edge set weighted by w = ManhattanDistance(a,b) × (1 + jitter), where jitter ∈ [−biome.corridors.jitter..+biome.corridors.jitter] sampled from R1.
- Compute a spanning tree (Prim or Kruskal). Optional: add a few extra low-weight edges (≤10%) for loops.

Pathfinding
- If biome.corridors.method == "astar":
  - A* on grid, 4-neighborhood, heuristic = ManhattanDistance.
  - Cost:
    - rock: 1
    - floor: 2
    - crossing ROOM_FLOOR boundary except at door cells: ∞ (forbid)
    - out-of-bounds or rim: ∞
  - Start at source door center, goal at target door center.
- Else "manhattan" fallback:
  - Carve an L-shaped path by choosing bend point (x=src.x, y=dst.y) or (dst.x, src.y), pick the one with fewer FLOOR collisions; break ties randomly via R1.

Carving
- Trace the path cells; snap to orth segments.
- Thicken to 3-wide, centered on the path:
  - For each path cell (x,y), carve the cross-section perpendicular to segment direction: (x+dx⊥,y+dy⊥) for offsets −1,0,+1.
  - Do not overwrite map rim.
  - If overlapping APPROACH3W or DOOR_BAND, preserve those flags; union in CORRIDOR_FLOOR on carved cells.
- Door Blending
  - For the first biome.approachDepth cells from each door into the interior, force straight alignment with the door normal; do not curve before depth is met.

Performance Dial
- On 96×64, if A* stalls (>2 ms per corridor on measured budget), switch to "manhattan" carve for remaining edges within the same seed run to uphold time budget deterministically.

---

## 8) Cellular Automata Smoothing (Stage 5)

Initial Field
- Start from current floor map (ROOM_FLOOR ∪ CORRIDOR_FLOOR ∪ APPROACH3W).
- Optional pre-noise: with probability biome.ca.preNoisePercent per border-adjacent rock, flip to floor to grow bellies; default 0.

Rule
- Neighborhood: 8-neigh if biome.ca.use8 else 4-neigh.
- Counts: birth if neighborFloors ≥ rules.birthMin; survive if neighborFloors ≥ rules.surviveMin.
- Iterations: biome.ca.iterations (0–3).
- Mask: Cells with APPROACH3W|DOOR_BAND|CORRIDOR_FLOOR|ROOM_FLOOR remain floor regardless of CA outcome (they are injected post-step each iteration).

Post-fix
- Remove singleton floor pixels (4-neigh count=0 → rock).
- Fill 1‑tile rock specks fully enclosed in floor (4-neigh all floor → floor).
- Maintain outer 1-tile rim as rock.

---

## 9) Ore Vein Seeding (Stage 7)

Inputs
- biome.tiles.ores entries: id→{ tileType, hardness, density, minCluster, maxCluster }.
- Optional extensions (future-safe): depthBands, exclusions.

Candidate Cells
- Rock cells (tType=rock) inside bounds [1..W-2]×[1..H-2].
- Bias candidates that are:
  - WALL-adjacent (post Stage 6) or one step interior to walls (veins hug the living earth).
  - ORE_PREF flagged (×2 weight if ore.id matches intended type for L1 copper-first bias).

Targets
- For each ore type:
  - target = floor(density × rockCellsCount).
  - Clamp: ≥ minCluster, ≤ rockCellsCount.

Exclusions
- Do not place ore on cells with flags & (DOOR_BAND|APPROACH3W).
- Keep ≥2 tiles away from any DOOR_BAND or APPROACH3W (use Manhattan radius).
- Avoid lamp-keep zones: WALL cells with high openness score (see §10 “openness” definition), reserve a 1-tile halo on adjacent rock so lamps won’t be suffocated by ore visuals.

Growth
- For each seed (sampled using weighted reservoir with R3 until target reached):
  - Start at a candidate rock cell; assign ore tileType and hardness; set oreType.
  - Grow via bounded random walk + BFS:
    - queue = [seed]; placed = 1; steps = R3.int(minCluster, maxCluster).
    - While queue not empty and placed < steps:
      - pop cell c; for each shuffled neighbor in 4-neigh:
        - if rock, not excluded, and random p=0.6 passes: convert to same ore; push; placed++.
      - With small chance p=0.2, branch by re-adding seed to queue to create lobes.
  - Respect bounds and never overwrite floor or WALL flags (WALL is derived on rock; ore over WALL is allowed — you keep WALL on the adjacent rock, not on the ore cell).

Output
- Ore overlay realized by setting:
  - tType to biome.tiles.ores[id].tileType index
  - hardness to ore.hardness
  - oreType to id
  - flags unchanged except existing ORE_PREF remains.

---

## 10) Lamps & Spawn Anchors (Stages 8–9)

Openness Score (for lamp context)
- For a floor cell f, openness = count of floor cells in a 5×5 (or radius-2) window.
- Junctions/pads have higher openness.

Lamps
- Anchor candidates:
  - WALL cells adjacent to floor where the adjacent floor has openness ≥ T (T≈10 in 5×5).
  - At least biome.lamps.minSpacing from existing LAMP_ANCHORs (grid distance).
  - ≥2 tiles away from the centerline of any DOOR_BAND approach.
- Placement:
  - For each candidate in row-major order with R4-shuffled tie-breaks, place a lamp anchor on the adjacent floor cell; flags|=LAMP_ANCHOR on that floor.
  - Density target: floor(biome.lamps.targetPerFloorTiles × totalFloorTiles). Clamp [1, totalFloorTiles/6].
- Note: We only flag anchors here; actual lamp entities are created downstream per style-guide.

Spawns
- Candidates:
  - Floor cells with flags & (ROOM_FLOOR|CORRIDOR_FLOOR) and not APPROACH3W, not LAMP_ANCHOR.
  - Distance constraints:
    - ≥ biome.spawns.minDistFromDoor (from any DOOR_BAND center).
    - ≥ biome.spawns.minDistFromLamp (from any LAMP_ANCHOR).
- Sampling (Poisson-disk-lite):
  - Grid-step radius r = max(minDistFromLamp, minDistFromDoor) − 1.
  - Sweep row-major; accept a cell if no already-accepted anchor is within r (Manhattan or Euclidean; pick Manhattan for cache-friendliness). Use R5 to jitter acceptance by small probability (±10%) to avoid rigid patterns.
- Tagging:
  - flags|=SPAWN_ANCHOR on selected cells.
  - Store only anchor positions; enemy factory will read biome.spawns.table to instantiate.

---

## 11) Biome Config (Authoritative shape for data/world/biome-crystal-caverns.json)

Strict JSON (no comments). Keys and order:
```
{
  "version": 1,
  "id": "biome.crystal_caverns",
  "name": "Crystal Caverns",
  "tiles": {
    "rock": { "tileType": "rock", "hardness": 3 },
    "floor": { "tileType": "floor", "hardness": 0 },
    "ores": {
      "copper": { "tileType": "ore.copper", "hardness": 4, "density": 0.012, "minCluster": 3, "maxCluster": 7 },
      "iron":   { "tileType": "ore.iron",   "hardness": 5, "density": 0.006, "minCluster": 2, "maxCluster": 5 },
      "quartz": { "tileType": "ore.quartz", "hardness": 7, "density": 0.003, "minCluster": 2, "maxCluster": 4 }
    }
  },
  "rooms": { "min": 6, "max": 10 },
  "approachDepth": 3,
  "ca": {
    "use8": true,
    "rules": { "birthMin": 5, "surviveMin": 4 },
    "iterations": 2,
    "preNoisePercent": 0.0
  },
  "corridors": { "method": "astar", "jitter": 0.15 },
  "lamps": { "minSpacing": 7, "targetPerFloorTiles": 0.06 },
  "spawns": { "minDistFromDoor": 5, "minDistFromLamp": 6, "table": [{ "id": "enemy.goblin.grunt", "weight": 7 }, { "id": "enemy.cave.burrower", "weight": 5 }] },
  "notes": [ "Hardness gates align with crafting-design.md: rock 3, copper 4, iron 5, quartz 6–7." ]
}
```

Field Documentation
- version:int — schema version; must equal 1.
- id:string — unique biome id; used to load this config.
- name:string — display name.
- tiles:
  - rock.tileType:string — ECS Tile.tileType for rock; must match art/tech strings.
  - rock.hardness:int — default hardness for rock; clamp [0,255].
  - floor.tileType:string — ECS string for walkable floor.
  - floor.hardness:int — default floor hardness; typically 0.
  - ores: map by ore id:
    - tileType:string — ECS string "ore.copper|ore.iron|ore.quartz".
    - hardness:int — mining hardness clamp [0,255].
    - density:number — fraction 0..1 of rock cells targeted; clamp [0, 0.05] for L1.
    - minCluster:int, maxCluster:int — cluster size bounds; clamp [1, 64], min ≤ max.
- rooms: { min:int, max:int } — inclusive; clamp to [1, 32], min ≤ max.
- approachDepth:int — Three‑Wide interior straight run; clamp [3, 6].
- ca:
  - use8:boolean — 8-neighborhood if true, else 4.
  - rules.birthMin:int — clamp [1, 8].
  - rules.surviveMin:int — clamp [0, 8].
  - iterations:int — clamp [0, 3].
  - preNoisePercent:number — 0..0.2; default 0.0.
- corridors:
  - method:string — "astar" or "manhattan".
  - jitter:number — 0..0.5 multiplicative perturbation for MST weights.
- lamps:
  - minSpacing:int — Manhattan spacing between anchors; clamp [3, 12].
  - targetPerFloorTiles:number — anchors per floor tile; clamp [0, 0.2].
- spawns:
  - minDistFromDoor:int — clamp [3, 12].
  - minDistFromLamp:int — clamp [3, 12].
  - table: array of { id:string, weight:int>0 }.
- notes: array of strings; informational.

---

## 12) Output Format & API (Engineer Contract)

Function (JS/TS pseudocode)
```
generateLevel({ seed, w=96, h=64, biomeId="biome.crystal_caverns" }) => {
  width:int, height:int,
  tiles: Array<{ x:int, y:int, tileType:string, hardness:int, oreType:string, flags:uint32 }>,
  meta: { seed:int, biomeId:string, hash:string, rooms:int, corridors:int, lamps:int, spawnAnchors:int }
}
```

Emission Strategy
- MVP emits full grid (W×H entries) to simplify downstream ECS stamping and make hashing deterministic.
- tileType strings pulled from biome.tiles.* and biome.tiles.ores.*.
- oreType: "", "copper", "iron", or "quartz" per tileType.

Stable Hash
- Compute 32-bit FNV-1a over row-major tiles using (tileTypeIndex:uint8, hardness:uint8, flags:uint32).
- Do not include coordinates, to remain independent of serialization specifics.
- Represent as 8-hex uppercase string for meta.hash.

ECS Bridge
- TileFactory maps each tile to ECS:
  - createEntityOf('Tile', {
      Position:{ x: x*16, y: y*16 },
      Tile:{ tileType, hardness, oreType, flags }
    })
- Coordinate scale (16) must match Phaser tile size; adjust if art pipeline changes.

---

## 13) Pseudocode & Reference Implementations

Room Placement Loop
```
function placeRooms(biome, templates, R0) {
  const target = R0.int(biome.rooms.min, biome.rooms.max);
  const chosen = weightedTemplateSequence(target, R0); // ensures at least one ore_pocket
  let placedRooms = [];
  for (let idx=0; idx<chosen.length; idx++) {
    const tplBase = chosen[idx];
    let placed=false;
    for (let attempt=0; attempt<24 && !placed; attempt++) {
      const rot = R0.pick(tplBase.rotate);
      const tpl = rotateTemplate(tplBase, rot);
      const x0 = R0.int(1, W - tpl.w - 2);
      const y0 = R0.int(1, H - tpl.h - 2);
      if (!fitsWithMoat(tpl, x0, y0)) continue;
      if (!doorsHaveInteriorDepth(tpl, x0, y0, biome.approachDepth)) continue;
      stampTemplate(tpl, x0, y0);
      stampApproachBands(tpl, x0, y0, biome.approachDepth);
      placedRooms.push({ x0, y0, tpl });
      placed = true;
    }
  }
  return placedRooms;
}
```

Door Pairing + Carve
```
function connectRooms(doors, biome, R1) {
  // doors: [{x,y,normal:{dx,dy},roomId}]
  const edges = computeMSTEdges(doors, biome.corridors.jitter, R1);
  let carved=0;
  for (const e of edges) {
    const ok = carveCorridor(e.a, e.b, biome, R1);
    if (ok) carved++;
  }
  return carved;
}
```

A* Path Carve and Thickening
```
function carveCorridor(a, b, biome, R1) {
  const path = (biome.corridors.method === "astar")
    ? astar(a, b, cellCost, heuristicManhattan)
    : manhattanLPath(a, b, R1);
  if (!path) return false;

  // Blend straight from doors for approachDepth
  enforceStraightFromDoor(path, a, biome.approachDepth);
  enforceStraightFromDoor(path, b, biome.approachDepth);

  // Carve 3-wide
  for (let i=0;i<path.length;i++) {
    const p = path[i]; const dir = segmentDir(path, i);
    const perp = perpendicular(dir);
    for (let off=-1; off<=1; off++) {
      const x = p.x + perp.dx*off, y = p.y + perp.dy*off;
      if (!inBoundsInner(x,y)) continue;
      carveFloorAt(x,y, CORRIDOR_FLOOR);
    }
  }
  return true;
}

function cellCost(x,y) {
  if (!inBoundsInner(x,y)) return Infinity;
  if (isRim(x,y)) return Infinity;
  const f = flags[idx(x,y)];
  const isDoor = (f & DOOR_BAND) !== 0;
  if ((f & ROOM_FLOOR) && !isDoor) return 999999; // forbid crossing rooms
  return (tType[idx(x,y)] === ROCK) ? 1 : 2;
}
```

CA Iteration
```
function runCA(biome, R2) {
  for (let iter=0; iter<biome.ca.iterations; iter++) {
    nextFloorMask.clear();
    forEachInterior((x,y, i) => {
      const f = flags[i];
      const preserve = (f & (APPROACH3W|DOOR_BAND|CORRIDOR_FLOOR|ROOM_FLOOR)) !== 0;
      if (preserve) { nextFloorMask.set(i, true); return; }
      const n = countNeighborFloors(x,y, biome.ca.use8);
      const isFloor = (tType[i] !== ROCK);
      const next = isFloor ? (n >= biome.ca.rules.surviveMin) : (n >= biome.ca.rules.birthMin);
      if (next) nextFloorMask.set(i, true);
    });
    applyFloorMask(nextFloorMask);
  }
  postFixIslandsAndSpecks();
}
```

Ore Cluster Growth
```
function seedOres(biome, R3) {
  const rockCells = collectRockCells();
  const openLampKeep = computeLampKeepZones(); // from WALL + openness

  for (const [id, ore] of oresInOrder(biome)) {
    const target = Math.min(rockCells.length, Math.max(ore.minCluster, Math.floor(ore.density * rockCells.length)));
    let placed=0;
    const weighted = weightCandidates(rockCells, (i) => {
      if (inApproachHalo(i) || inDoorHalo(i)) return 0;
      if (openLampKeep.has(i)) return 0;
      let w = isWallAdj(i) ? 2 : 1;
      if (flags[i] & ORE_PREF) w *= 2;
      return w;
    });
    let tries=0;
    while (placed < target && tries < rockCells.length*2) {
      const i = pickWeightedIndex(weighted, R3);
      if (i < 0) break;
      const count = R3.int(ore.minCluster, ore.maxCluster);
      placed += growOreClusterFrom(i, count, id, ore.hardness, R3);
      tries++;
    }
  }
}
```

Lamp/Spawn Sampling
```
function placeLamps(biome, R4) {
  const candidates = [];
  forEachWallAdjacentFloor((x,y,i) => {
    if (nearApproachCenterline(x,y,2)) return;
    const open = openness5x5(x,y);
    if (open >= opennessThreshold) candidates.push({x,y,i, open});
  });
  // Sort by openness desc, then row-major; optional R4 shuffle on equal openness
  candidates.sort((a,b)=> b.open - a.open || a.i - b.i);
  const target = clamp(Math.floor(biome.lamps.targetPerFloorTiles * totalFloor()), 1, Math.floor(totalFloor()/6));
  const chosen = [];
  for (const c of candidates) {
    if (tooCloseToAny(c, chosen, biome.lamps.minSpacing)) continue;
    flags[c.i] |= LAMP_ANCHOR;
    chosen.push(c);
    if (chosen.length >= target) break;
  }
  return chosen.length;
}

function placeSpawns(biome, R5) {
  const r = Math.max(biome.spawns.minDistFromDoor, biome.spawns.minDistFromLamp) - 1;
  const anchors = [];
  forEachFloor((x,y,i) => {
    const f = flags[i];
    if ((f & (APPROACH3W|LAMP_ANCHOR)) !== 0) return;
    if (!((f & (ROOM_FLOOR|CORRIDOR_FLOOR)) !== 0)) return;
    if (distToNearestDoor(x,y) < biome.spawns.minDistFromDoor) return;
    if (distToNearestLamp(x,y) < biome.spawns.minDistFromLamp) return;
    if (tooCloseToAny({x,y}, anchors, r)) return;
    if (R5.float() < 0.1) return; // light jitter to avoid regularity
    flags[i] |= SPAWN_ANCHOR;
    anchors.push({x,y});
  });
  return anchors.length;
}
```

---

## 14) Performance Notes & Dials

Target
- 10–20 ms at 96×64 on a mid-tier laptop.

Hotspots
- A* on dense maps.
- Excessive allocations.

Dials
- corridors.method: "manhattan" fallback (single-bend) if perf is tight.
- ca.iterations: 0–2 for speed; 2 default.
- rooms count range: reduce max in biome.rooms for speed.
- ore densities: lower to reduce clustering work.

Implementation Tips
- Preallocate typed arrays:
  - tType: Uint8Array(W*H)
  - hardness: Uint8Array(W*H)
  - flags: Uint32Array(W*H)
- Utility buffers: BitSet/Uint8Array for masks; pooled queues (Int32Array ring buffers) for BFS/A*.
- Keep indices linear: i = y*W + x.
- Early exits: stop corridor MST when all rooms connected (track DSU).
- Cache neighbor offsets; avoid creating objects inside loops.
- Use integer math where possible.

---

## 15) Three‑Wide Law (Formal Invariants)

Invariants
- Door bands are exactly 3 contiguous tiles on a room boundary face (template provides them).
- Immediately interior to each door band, the approach lane remains exactly 3 tiles wide, straight, for at least approachDepth cells.
- No decorations, ores, lamps, or spawn anchors within the approach lane.
- CA cannot erode the approach lane.
- Corridors must align orthogonally into the approach lane; no diagonal entry.

Validation (fail-fast or repair)
```
function validateThreeWide(biome) {
  for (const door of doorCenters) {
    const normal = door.normal;
    for (let d=0; d<biome.approachDepth; d++) {
      const y = door.y + normal.dy*(d+1);
      const x0 = door.x - normal.dx*(1) + normal.dy*(0) + normal.dx*0; // compute lateral axis
      // Build lateral basis (lx,ly) perpendicular to normal
      const lx = (normal.dy !== 0) ? 1 : 0;
      const ly = (normal.dx !== 0) ? 1 : 0;
      let count=0;
      for (let off=-1; off<=1; off++) {
        const x = door.x + normal.dx*(d+1) + lx*off;
        const y = door.y + normal.dy*(d+1) + ly*off;
        if (!inBounds(x,y)) return false;
        const i = idx(x,y);
        if (tType[i] !== FLOOR) return repairCarveFloor(i); // repair
        if ((flags[i] & APPROACH3W) === 0) flags[i] |= APPROACH3W;
        count++;
      }
      if (count !== 3) return false;
    }
  }
  return true;
}
```
Repair strategy: carve missing cells to floor and mark APPROACH3W; clear any ore/lamp/spawn flags encountered.

---

## 16) Testing & Deterministic Harness

Golden Hash
- For seeds [1,2,3,1337,9001] at 96×64, commit meta.hash values to repo.
- CI regenerates and compares; diffs fail build.

Unit Checks
- Template stamp invariants: no floor touches rim except at door band approach.
- Connectivity: all ROOM_FLOOR/CORRIDOR_FLOOR in one component; BFS over floors must visit all.
- Three‑Wide preserved: validateThreeWide() passes.
- Ore counts: for each ore, actual count within ±10% of biome target.
- Flags integrity: DOOR_BAND count multiple of 3; APPROACH3W depth ≥ biome.approachDepth.

Timing
- Benchmark on CI target: ensure <20 ms budget; if breached, auto-switch corridors.method to "manhattan" and flag a perf warning.

---

## 17) Risks & Open Questions

Risks
- A* scaling on larger maps; mitigated by "manhattan" fallback and bucketed adjacency.
- Integration strings: tileType and oreType must remain stable across systems; coordinate with art/tech before renaming.
- Lamps vs. ore visual overlap: current keep-out heuristic may be conservative; adjust openness threshold if anchors seem sparse.

Open Questions
- Depth bands for ores (future): hook exists but not populated in L1 biome.
- Multi-level features (rivers, chasms, rune-doors) will require expanded flags and carve stages.
- Entity density caps per chunk for streaming scenes (Phaser culling): not addressed here.

---

## 18) Acceptance Checklist

- Data contracts (inputs, outputs, flags) are explicit and versioned.
- Stages and algorithms are unambiguous with pseudocode for all critical paths.
- Three‑Wide invariants are formalized and validated with repair option.
- Biome JSON shape for Crystal Caverns is defined and documented.
- Deterministic RNG substreams are documented with derivation code.
- Performance dials and a testing plan (golden hashes, unit checks) are present.

---

## Appendix: Implementation Skeleton

Top-Level
```
function generateLevel({ seed, w=96, h=64, biomeId="biome.crystal_caverns" }) {
  // Load biome
  const biome = loadBiome(biomeId);
  const W=w|0, H=h|0, N=W*H;

  // RNG substreams
  const S = coerceToUint32(seed);
  const R0 = makeRNG(hash32(S,0xA001)), R1 = makeRNG(hash32(S,0xA002));
  const R2 = makeRNG(hash32(S,0xA003)), R3 = makeRNG(hash32(S,0xA004));
  const R4 = makeRNG(hash32(S,0xA005)), R5 = makeRNG(hash32(S,0xA006));

  // Grids
  const tType = new Uint8Array(N);
  const hardness = new Uint8Array(N);
  const flags = new Uint32Array(N);
  initRock(tType, hardness, flags, biome);

  // Stage 2
  const rooms = placeRooms(biome, loadTemplates(), R0);
  const doorCenters = collectDoorCenters(rooms);

  // Stage 3
  const corridors = connectRooms(doorCenters, biome, R1);

  // Stage 4
  trimIslandsAndEnforceRim();

  // Stage 5
  runCA(biome, R2);

  // Stage 6
  deriveWalls();

  // Stage 7
  seedOres(biome, R3);

  // Stage 8
  const lamps = placeLamps(biome, R4);

  // Stage 9
  const spawns = placeSpawns(biome, R5);

  // Stage 10: Emit + hash
  const outTiles = emitTilesFullGrid(W,H,tType,hardness,flags,biome);
  const hash = fnv1aTiles(outTiles);
  return {
    width: W, height: H,
    tiles: outTiles,
    meta: { seed:S, biomeId: biome.id, hash, rooms: rooms.length, corridors, lamps, spawnAnchors: spawns }
  };
}
```