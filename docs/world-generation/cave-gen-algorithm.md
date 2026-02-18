# Cave Generation — The Three‑Wide Law and the Singing Stone (Sprint 1)

Provenance
- Owner: @beta (World Generation — Deepdelver Caveborn)
- Authoring dwarf: Deepdelver Caveborn, Keeper of Picks, Trimmer of Specs
- Cross‑references (anchor your beard to these):
  - data/world/room-templates.json
  - data/world/biome-crystal-caverns.json
  - data/visual/color-palette.json
  - src/core/ecs-registry.js (Tile component)
  - docs/technology-systems/crafting-design.md (§Hardness)
  - docs/visual-systems/style-guide.md (§Tile size 16×16, doors; §6 tile index ranges)
  - data/audio/sound-manifest.json (lamp ambience: “Singing Stone” ambience optional)
  - docs/combat-systems/combat-design.md (§Three‑Wide lanes ref)


## 2) Scope & Acceptance

Scope (Sprint 1, Mine Level 1)
- Target map size: 96×64 tiles for tests; configurable via generateLevel({ w, h }).
- Biome: Crystal Caverns baseline; room templates limited to basic chambers and door bands (3‑wide).
- Movement/combat lanes: Three‑Wide invariant enforced for doors, approaches, corridors.

Deliverables (generator outputs)
- Tile grid: typed cells + flags via typed arrays:
  - tiles: Uint16Array (tile index, see style-guide §6)
  - hardness: Uint8Array
  - ore: Uint8Array (0=none, 1=copper, 2=iron, 3=quartz)
  - flags: Uint32Array (bitfield; see flags list)
- Anchors:
  - lamps: [{x,y}] with LAMP_ANCHOR flag set at those cells
  - enemy spawn anchors: [{x,y,kindId}] (no entities spawned here)
  - loot anchors: [{x,y}] (candidates)
- Minimap raster: Uint8Array codes {0:bg, 1:room, 2:corridor, 3:ore}
- Meta: deterministic hash, RNG salts, counts

Acceptance criteria
- Deterministic: same seed+params → identical outputs and hash.
- All doors exactly 3 tiles wide, with interior approach 3‑wide and depth ≥ 3.
- No orphan floor: all floor/corridor tiles form a single connected component reachable from at least one door.
- JSON inputs (room templates, biome) parse and validate; fail‑fast on schema errors.
- No floor on outer boundary except door bands.
- Indices conform to style-guide §6 (placeholder ranges acceptable in Sprint 1; final mapping later).


## 3) Tiles, Indices, and Components

Canon
- Canonical tile size: 16×16 px
- Three‑Wide lane body: 12×12 px usable footprint centered within 16×16 (2 px gutters)

Tile types and hardness (Sprint 1)
- rock: hardness=3
- floor (walkable): hardness=0..1 (biome may tint but hardness ignored for mining)
- door band (walkable): hardness=floor-equivalent (0..1)
- ore (in rock only):
  - copper: hardness=4
  - iron: hardness=5
  - quartz: hardness=6 or 7 (core vs rim/noise)

ECS Tile component contract (src/core/ecs-registry.js, Tile)
- Shape: { tileType:string, hardness:int, oreType:string|null, flags:uint32 }
  - tileType: "rock" | "floor" | "door" | "ore"
  - oreType: null | "copper" | "iron" | "quartz"
  - flags: bitfield below

Flags (bit indices; stable names, values may be in a shared constants module)
- ORE_PREF       = 0x00000001
- DOOR_BAND      = 0x00000002
- APPROACH3W     = 0x00000004
- LAMP_ANCHOR    = 0x00000008
- ROOM_STAMPED   = 0x00000010
- CORRIDOR       = 0x00000020
- SPAWN_CAND     = 0x00000040
- CA_LOCK        = 0x00000080  (corridor/door spine mask during CA)
- BORDER_GUARD   = 0x00000100  (outer boundary clamp)

Tile indices (renderer)
- Use docs/visual-systems/style-guide.md §6 for canonical indices.
- Sprint 1 placeholder ranges (do not ship to art; to be remapped):
  - rock: 10
  - floor: 20
  - door: 21
  - ore-copper: 30
  - ore-iron: 31
  - ore-quartz: 32
- Note: indices are renderer-facing only; ECS Tile carries semantic fields.


## 4) Determinism & RNG Plan

PRNG
- Use a small, fast deterministic PRNG: Mulberry32 or Xoshiro128**.
- Derive independent substreams; never share a stream between phases.
- Salting: baseSeed = seed ^ hash32(levelId) ^ hash32(biomeId)
  - stream seeds = hash32(baseSeed, "stream.name")

Named substreams (fixed call order per phase)
- stream.roomPlacement
- stream.doorChoice
- stream.corridorRouting
- stream.CA
- stream.oreNoise
- stream.oreCluster
- stream.decoration
- stream.lamps

Guardrails
- Each phase consumes only its stream in a consistent order.
- Do not branch PRNG calls on nondeterministic iteration orders; keep loops index-based.

Map hash
- mapHash(seed, params) → 64‑bit hex using stable FNV‑1a over final arrays:
  - Byte feed order: tiles, hardness, ore, flags (row‑major y=0..h‑1, x=0..w‑1)
  - Include w, h, levelId, biomeId in header

Pseudocode (RNG/hash stubs)
```
class Rng {
  constructor(seed32) { this.s = seed32 >>> 0; }
  next() { // Mulberry32
    let t = this.s += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0);
  }
  float() { return this.next() / 0x100000000; }
  int(n) { return this.next() % n; } // n>0
}

function hash32(seed, saltStr="") { /* stable FNV-1a 32-bit over seed + saltStr */ }
function fnv1a64(bytesU8) { /* stable 64-bit FNV-1a; return hex string */ }
```


## 5) Data Inputs & Validation (Schema‑lite)

Room templates (data/world/room-templates.json)
- Array of templates:
  - id: string
  - weight: number (>=0)
  - rotate: [0|90|180|270] allowed rotations (array)
  - grid: [string] rows, equal length; charset: {'#','F','D','O',' '}
    - '#': rock (solid)
    - 'F': floor (walkable)
    - 'D': door band (must appear as contiguous width 3 on the boundary in all allowed rotations)
    - 'O': ore preference marker (ORE_PREF flag; counts as rock unless over 'F' then ignored)
    - ' ': out-of-template (ignored; treated as rock)
  - meta: { minDoors:int, maxDoors:int, tags:[string] }
- Rules:
  - Rotations: generator may rotate 0/90/180/270 only if in rotate[].
  - Door band width must be exactly 3 and centered relative to room’s local wall segment.
  - Doors must lie on the outer boundary of the template’s non‑space extents.
  - Maintain a 1‑tile rock moat around stamped floors/doors relative to other rooms.
  - 'O' markers must not be on boundary; they seed ORE_PREF flag within the stamp.

Biome config (data/world/biome-crystal-caverns.json)
- version: string (pinned)
- tileTokens: { rock:int, floor:int, door:int, ore:{ copper:int, iron:int, quartz:int } }
- weights: { templateTags:{ [tag]:weight } }
- CA: { passes:int, rule:"4-5/5", protectCorridor:boolean }
- ore:
  - noise: { octaves:int, freq:float, seedOffset:int }
  - thresholds: { copper:float, iron:float, quartz:float } // 0..1
  - base: { copper:float, iron:float, quartz:float }
  - edgeBias: { k:float } // distance → probability slope
  - order: ["iron","copper","quartz"] // conflict priority
- lamps: { lampStride:int, nearDoorDepth:int, nearDoorThreshold:float }
- spawns:
  - enemies: [
      { kindId:"goblin_grunt", weight:1.0 },
      { kindId:"cave_burrower", weight:0.7 }
    ]
  - minDist: { door:int, lamp:int, wall:int }
  - roomBias: { cavern:1.2, chamber:1.0, corridor:0.6 }

Loader checks (fail‑fast)
- Version pin match; reject unknown.
- Charset validation for templates; unknown glyph → error with (templateId, row, col).
- Grid dims consistent; rectangular rows.
- Door count within [minDoors..maxDoors] after rotation; each door band exactly width 3; centered.
- No 'O' on boundary.
- For biome: all required fields present; thresholds/base ∈ [0,1]; lampStride ≥ 4; minDist ≥ 0.
- On failure: throw descriptive Error including path, key, and hint.


## 6) Generation Phases (Top‑Level Pipeline)

- Phase 0 — Init Grid: allocate typed arrays, fill with rock; mark BORDER_GUARD on outer ring.
- Phase 1 — Template Stamping: place N rooms (weighted selection) with 1‑tile moat.
- Phase 2 — Door Linking (Corridor Carving): connect all doors with Three‑Wide digger using MST‑guided A*.
- Phase 3 — Smoothing (Cellular Automata): 4‑5/5 rule; corridors/doors protected by CA_LOCK.
- Phase 4 — Door & Approach Enforcement: ensure 3×3 interior pad and ≥3‑deep 3‑wide approach.
- Phase 5 — Ore Seeding: bias by ORE_PREF + distance to floor, gated by biome ore noise; cluster.
- Phase 6 — Lamps & Decorations: place LAMP_ANCHOR along corridors and near door interiors per biome.
- Phase 7 — Spawn Anchors: mark enemy and loot anchor candidates with distance constraints.


## 7) Phase Details with Pseudocode

### 7.1 Template Placement

Behavior
- Rejection sampling on a jitter grid; try rotations allowed by template.rotate.
- Overlap test on grown mask (floors+doors dilated by 1) against existing floors/doors.
- Doors normalized and centered; record door cells with world coords.

Pseudocode
```
function placeTemplates(rng, maxRooms, templates, w, h, biomeWeights) -> placements[] {
  const occ = new Uint8Array(w*h); // 0=free, 1=blocked (grown)
  const placements = [];
  const jitter = 4; // tile step
  const candidates = gridJitteredPositions(w, h, jitter, rng);

  while (placements.length < maxRooms && candidates.length) {
    const pos = candidates.pop();
    const tpl = pickWeightedTemplate(templates, biomeWeights, rng);
    const rots = shuffleAllowedRotations(tpl.rotate, rng);
    let placed = false;
    for (const rot of rots) {
      const stamp = rotateTemplate(tpl, rot);
      if (!doorsAreValid(stamp)) continue;
      const { x0, y0 } = alignTopLeft(pos, stamp, w, h);
      if (!fitsInBounds(x0, y0, stamp, w, h)) continue;
      if (overlapsGrownMask(occ, stamp, x0, y0, w, h)) continue;
      // Stamp floors/doors; mark flags
      applyStamp(stamp, x0, y0, (gx,gy,ch) => {
        const i = gy*w+gx;
        if (ch === 'F') makeFloor(i);
        if (ch === 'D') { makeFloor(i); flags[i] |= DOOR_BAND|CA_LOCK; }
        if (ch === 'O') flags[i] |= ORE_PREF|ROOM_STAMPED; // does not change rock/floor
        if (ch === 'F' || ch === 'D') flags[i] |= ROOM_STAMPED;
      });
      growMask(occ, stamp, x0, y0, w, h); // 1-tile moat
      const doorCells = collectDoorWorldCells(stamp, x0, y0);
      placements.push({ id:tpl.id, rot, x:x0, y:y0, doorCells });
      placed = true; break;
    }
    // if not placed, continue trying other candidates
  }
  return placements;
}
```

### 7.2 Corridor Carving (Three‑Wide Digger)

Behavior
- Build a complete graph of door nodes.
- Connect greedily like an MST: sort edges by distance + room‑cross penalty; union‑find to avoid cycles until connected.
- For each connection, run A* on a coarse centerline grid (4‑connected), penalizing proximity to rooms to preserve 1‑tile rock buffer.
- Carve a 3‑tile‑wide stripe perpendicular to movement direction; set CORRIDOR|CA_LOCK flags; avoid pinches.
- Align corridor centerline with the middle of each 3‑wide door band; extend interior approach to depth ≥ 3.

Pseudocode
```
function carveCorridors(rng, doorCells, w, h) {
  const edges = allDoorPairs(doorCells).map(e => ({
    a:e.a, b:e.b, cost: distance(e.a,e.b) + crossPenalty(e, flags, w,h)
  })).sort((e1,e2)=>e1.cost-e2.cost);

  const uf = new UnionFind(doorCells.length);
  const needed = doorCells.length - 1;

  for (const e of edges) {
    if (uf.connected(e.a.id, e.b.id)) continue;
    const path = astarCenterline(e.a.center, e.b.center, w,h, (cx,cy)=>{
      return costField(cx,cy, flags); // high near ROOM_STAMPED borders
    }, rng);
    carveStripePath(path, w, h, (cx,cy,dir)=>{
      carveStripe(cx,cy,dir, /*halfWidth=*/1);
    });
    enforceApproach3W(e.a, w, h);
    enforceApproach3W(e.b, w, h);
    uf.union(e.a.id, e.b.id);
    if (uf.count() === needed) break;
  }
}

function carveStripe(cx, cy, dir, halfWidth=1) {
  const swath = orthogonalCells(cx, cy, dir, halfWidth);
  for (const {x,y} of swath) {
    const i = y*w + x;
    makeFloor(i);
    flags[i] |= CORRIDOR|CA_LOCK;
  }
}
```

Constraints
- Turn smoothing: disallow turns tighter than 90° within 2 steps; optionally bevel corners (fill missing diagonals) while maintaining 3‑wide cross section.
- Keep at least 1‑tile rock buffer from ROOM_STAMPED where geometry allows; breach only as needed.

### 7.3 Cellular Automata Smoothing

Behavior
- Apply limited CA passes (biome.CA.passes) on a mask that excludes CA_LOCK cells (corridor cores and door bands).
- Rule “4‑5/5” (tunable): 
  - if rock and has ≥5 floor neighbors → flip to floor
  - if floor and has ≥5 rock neighbors → flip to rock
- Clamp boundaries: outer ring remains rock (BORDER_GUARD); no new floors touch outer edge except through door bands (already walkable).

Pseudocode
```
function smoothCA(rng, passes, w, h) {
  const tmp = new Uint8Array(w*h);
  for (let p=0; p<passes; p++) {
    for (let y=1; y<h-1; y++) for (let x=1; x<w-1; x++) {
      const i = y*w+x;
      if (flags[i] & CA_LOCK) { tmp[i] = tiles[i]; continue; }
      const n = countFloorNeighbors(x,y,w,h);
      const isFloor = isWalkable(tiles[i]);
      if (!isFloor && n >= 5) tmp[i] = T_FLOOR;
      else if (isFloor && (8-n) >= 5) tmp[i] = T_ROCK;
      else tmp[i] = tiles[i];
    }
    swap(tiles, tmp);
  }
}
```

### 7.4 Ore Seeding & Hardness Application

Behavior
- Compute distanceField over rock cells: distance to nearest floor (room or corridor).
- Base probability p = biome.ore[type].base + edgeBias(distance) + ORE_PREF boost.
- Sample oreNoise[type] ∈ [0,1] (from stream.oreNoise), place seeds where noise < thresholds[type] and random() < p.
- Grow clusters via seeded flood‑fill (stream.oreCluster); prevent overlap by priority order (biome.ore.order).
- Assign hardness per ore type; quartz core vs rim by inner noise.

Pseudocode
```
function seedOre(rngNoise, rngCluster, w,h, order) {
  const dist = computeDistanceFieldToFloor(w,h);
  const claimed = new Uint8Array(w*h); // 0 none, >0 ore type id
  for (const type of order) {
    const th = biome.ore.thresholds[type];
    for (let i=0;i<w*h;i++) {
      if (!isRock(i) || claimed[i]) continue;
      const p = biome.ore.base[type] + edgeBias(dist[i]) + ((flags[i]&ORE_PREF)?0.2:0);
      const noise = rngNoise.float();
      if (noise < th && rngNoise.float() < p) {
        growClusterFrom(i, type, rngCluster, claimed);
      }
    }
  }
  for (let i=0;i<w*h;i++) if (claimed[i]) {
    ore[i] = oreId(claimed[i]);
    tiles[i] = tileIndexForOre(claimed[i]);
    hardness[i] = hardnessForOre(claimed[i], /*rim=*/randomRim(rngCluster));
  }
}
```

Rules
- Ores replace rock only; never overwrite floors or door bands.
- Priority default: iron > copper > quartz (overridable per biome).

### 7.5 Lamps & Decorations

Behavior
- Corridor lamps: every L tiles (biome.lampStride), seeded phase offset, on corridor centerline; avoid cells within 2 tiles of door bands.
- Room lamps: behind doors at interior depth=2 if darkness score (distance to nearest lamp/corridor opening) ≥ threshold.

Pseudocode
```
function placeLamps(rng, w,h) {
  const stride = biome.lamps.lampStride;
  let phase = rng.int(stride);
  forEachCorridorCenterline(w,h, (idx, stepFromStart)=>{
    if ((stepFromStart + phase) % stride === 0 && farFromDoor(idx,2)) {
      flags[idx] |= LAMP_ANCHOR;
      anchors.lamps.push(ixy(idx));
    }
  });
  forEachDoorInterior(w,h, (centerIdx)=>{
    if (interiorDarkEnough(centerIdx)) {
      flags[centerIdx] |= LAMP_ANCHOR;
      anchors.lamps.push(ixy(centerIdx));
    }
  });
}
```

Note
- Entities are not spawned here; only anchors/flags. “Singing Stone” ambience may use these anchors (data/audio/sound-manifest.json).

### 7.6 Spawn Anchor Marking

Behavior
- Mark enemy/loot candidates on walkable tiles with distances:
  - ≥ 4 from door bands
  - ≥ 3 from lamp anchors
  - ≥ 2 from walls (rock)
- Weight by room kind (cavern heavier than corridor).

Pseudocode
```
function markSpawns(rng, w,h) {
  for (let y=1;y<h-1;y++) for (let x=1;x<w-1;x++) {
    const i = y*w+x;
    if (!isWalkable(tiles[i])) continue;
    if (distToFlag(i, DOOR_BAND) < 4) continue;
    if (distToFlag(i, LAMP_ANCHOR) < 3) continue;
    if (distToWall(i) < 2) continue;
    flags[i] |= SPAWN_CAND;
    const kindId = pickEnemyKindByBiome(rng, biome.spawns.enemies, localRoomBias(i));
    anchors.enemies.push({ x, y, kindId });
    if (rng.float() < 0.1) anchors.loot.push({ x, y }); // light loot sprinkling
  }
}
```


## 8) Data Contracts & APIs

WorldGen API (src/world/gen/cave-gen.js)
- generateLevel(params) → LevelGrid
```
/**
 * @param {object} params
 * @param {number} params.seed
 * @param {number} params.levelId
 * @param {string} params.biomeId
 * @param {number} params.w
 * @param {number} params.h
 * @returns {LevelGrid}
 */
function generateLevel({ seed, levelId, biomeId, w=96, h=64 }) { /* ... */ }

/**
 * LevelGrid
 * tiles: Uint16Array (w*h)
 * hardness: Uint8Array (w*h)
 * ore: Uint8Array (w*h) // 0 none, 1 copper, 2 iron, 3 quartz
 * flags: Uint32Array (w*h)
 * anchors: {
 *   lamps: [{x,y}],
 *   enemies: [{x,y,kindId}],
 *   loot: [{x,y}]
 * }
 * meta: {
 *   hash: string, // 16-char 64-bit hex
 *   rng: { seed:number, salts:{ [streamName]:number } },
 *   rooms:int, corridors:int,
 *   metrics?: { corridorLen:int, oreCells:{copper:int,iron:int,quartz:int}, lamps:int, placeFails:int }
 * }
 */
```

Loader/Validator APIs
```
function loadRoomTemplates(path="data/world/room-templates.json") -> { templates:Template[], version:string }
function validateRoomTemplates(templates) -> void // throws Error with context

function loadBiomeConfig(id, path=`data/world/biome-${id}.json`) -> BiomeConfig
function validateBiomeConfig(cfg) -> void // throws Error with context
```

Error contracts
- Throw Error(message, { cause:{ path, key, value, hint } }) where supported.
- Messages include template id/rotation/coordinates or biome key for quick fix.


## 9) Performance Plan

Targets (96×64 on mid‑tier laptop, single thread)
- Placement: 3–6 ms (grid jitter; small overlap checks; preallocated masks)
- Corridors: 3–6 ms (A* over sparse centerline; reuse node arrays)
- CA: 2–4 ms (fixed kernel; branchless neighbors)
- Ore: 1–3 ms (one distance field; linear passes)
- Lamps/Spawns: <2 ms

Implementation notes
- Preallocate all typed arrays; avoid growing arrays in hot loops.
- Reuse scratch buffers (queues, masks, distance fields).
- Store directions as small ints; avoid object churn.
- Bitflags in Uint32; branchless masks where possible.
- Deterministic iteration (row‑major) to keep RNG call counts fixed.


## 10) Three‑Wide Law Guarantees & Invariants

Guarantees
- Doors: exactly 3 contiguous tiles on room boundary, center aligned to corridor centerline.
- Interior approach: 3‑wide, depth ≥ 3 tiles behind each door band.
- Corridors: constant 3‑tile width; no diagonal pinches; no single‑tile chokepoints.
- Clearance: maintain ≥1‑tile rock buffer from room walls, except at merges and door mouths.
- Boundary: no floor touches the outer border except designated door bands.

Validation checklist (post‑gen)
- Every door band has a 3×3 walkable interior pad.
- BFS from any door reaches all walkable cells (no orphan floor).
- All corridor spans are width=3 orthogonally; no holes.
- Outer border free of floors; flags[BORDER_GUARD] ring intact.

Auto‑repair steps (bounded)
- If approach depth < 3: extend floor inward up to depth=3 (mark APPROACH3W).
- If corridor pinch detected: widen by carving neighbors (respect CA_LOCK).
- If border leak: backfill to rock and clear flags.
- If irreparable after 3 attempts: discard layout, reseed Phase 1 (up to K=4 retries); hard‑fail after K with diagnostic dump.


## 11) Minimap Rasterization

Mapping
- floor ‘.’ and door ‘D’ → minimap.room/corridor tokens using same code (renderer disambiguates by flags):
  - room floor (ROOM_STAMPED without CORRIDOR): code 1
  - corridor (CORRIDOR): code 2
- rock ‘#’ → code 0 (bg)
- ore in rock → code 3 (minimap.ore over bg)
- Player/enemy icons handled by HUD using color-palette.json (not part of raster codes)

Output
- Uint8Array mm of size w*h, row‑major.
- Fill rule:
  - if isRock(i) and ore[i]>0 → 3
  - else if flags[i]&CORRIDOR → 2
  - else if isWalkable(tiles[i]) → 1
  - else → 0


## 12) Testing & CI Harness

Golden tests
- Seeds: [1, 2, 3, 42, 1337], dims 96×64, biome “crystal-caverns”.
- For each: run generateLevel, compute meta.hash (FNV‑1a 64‑bit hex), compare to checked‑in goldens.

Schema checks
- Validate room templates and biome JSONs on load; CI fails on error.
- Assert Three‑Wide invariants; assert no orphan floor; assert boundary clamp.

Debug dumps (dev‑only)
- ASCII export:
  - '#': rock, '.': floor, 'D': door band, '=': corridor, 'O': ore
- PNG minimap export (tiny) using minimap codes for quick visual spot checks.

Determinism watchdog
- CI step runs twice per seed; hashes must match identically.
- Optional log to verify stream usage counts (dev builds).


## 13) Error Handling & Diagnostics

Determinism guardrails
- One PRNG stream per phase; assert no cross‑phase stream usage in dev (toggleable).
- Fixed iteration order; all randomness pulled via injected rng.

Metrics (returned in meta.metrics and loggable)
- rooms placed, placement failures
- corridor total length (centerline steps)
- ore cells by type
- lamp count
- spawn candidates count
- CA passes applied
- retries performed (if any)

Diagnostics on hard‑fail
- Include seed, levelId, biomeId, stream salts, phase name.
- Optionally dump masks (occupancy, CA_LOCK) and first 256 PRNG outputs per stream for repro.


## 14) Future Dials (Post‑MVP)

- Autotile upgrade to 47‑tile set (walls/corners) for visuals.
- Biome blending at borders and sub‑biomes.
- Multi‑level transitions (shafts, lifts) with reserved anchors.
- Richer decoration passes (crystals, rubble, stalagmites).
- Alternative corridor generators (worm, Voronoi connectors).
- Per‑room enemy themes and scripted encounters.
- Ambient “Singing Stone” lamp audio regions.


## 15) Acceptance Checklist

- Determinism: seed+params → stable hash; CI goldens pass.
- Three‑Wide Law holds:
  - Doors width=3; interior approach ≥ 3‑deep; corridors constant width=3.
- Connectivity: no orphan floor; BFS from any door reaches all walkables.
- Boundary: no floors on map edge except door bands.
- Ore: seeded per biome thresholds/bias, never on walkables, proper hardness.
- JSON inputs: parsed and validated; version pins respected.
- Performance: within stated budget at 96×64 on target machine.
- Outputs: align with ECS Tile expectations; minimap codes correct; anchors populated.


## Appendix A — High‑Level Pipeline Stub (for implementers)

```
function generateLevel({ seed, levelId, biomeId, w=96, h=64 }) {
  // Streams
  const baseSeed = seed ^ hash32(levelId) ^ hash32(biomeId);
  const rng = {
    roomPlacement: new Rng(hash32(baseSeed, "roomPlacement")),
    doorChoice:    new Rng(hash32(baseSeed, "doorChoice")),
    corridorRouting:new Rng(hash32(baseSeed, "corridorRouting")),
    CA:            new Rng(hash32(baseSeed, "CA")),
    oreNoise:      new Rng(hash32(baseSeed, "oreNoise")),
    oreCluster:    new Rng(hash32(baseSeed, "oreCluster")),
    decoration:    new Rng(hash32(baseSeed, "decoration")),
    lamps:         new Rng(hash32(baseSeed, "lamps")),
  };

  // Phase 0
  const tiles = new Uint16Array(w*h).fill(T_ROCK);
  const hardness = new Uint8Array(w*h).fill(3);
  const ore = new Uint8Array(w*h).fill(0);
  const flags = new Uint32Array(w*h).fill(0);
  markBorder(flags, w,h, BORDER_GUARD);

  // Load configs
  const templates = loadRoomTemplates().templates;
  const biome = loadBiomeConfig(biomeId);

  // Validate
  validateRoomTemplates(templates);
  validateBiomeConfig(biome);

  // Phase 1
  const placements = placeTemplates(rng.roomPlacement, biome.maxRooms||8, templates, w,h, biome.weights);
  const doors = collectAllDoors(placements);

  // Phase 2
  carveCorridors(rng.corridorRouting, doors, w,h);

  // Phase 3
  smoothCA(rng.CA, biome.CA.passes||2, w,h);

  // Phase 4
  enforceAllDoorApproaches(doors, w,h);

  // Phase 5
  seedOre(rng.oreNoise, rng.oreCluster, w,h, biome.ore.order||["iron","copper","quartz"]);

  // Phase 6
  const anchors = { lamps:[], enemies:[], loot:[] };
  placeLamps(rng.lamps, w,h);

  // Phase 7
  markSpawns(rng.decoration, w,h);

  // Minimap
  const minimap = rasterizeMinimap(w,h);

  // Hash
  const hash = fnv1a64(concatTyped(tiles, hardness, ore, flags));

  return {
    w, h, tiles, hardness, ore, flags,
    anchors,
    minimap,
    meta: { hash, rng:{ seed, salts:mapSalts(rng) }, rooms:placements.length, corridors:countCorridors(flags),
      metrics: collectMetrics(w,h, flags, ore) }
  };
}
```

May your arrays be tight, your streams be split, and your lanes be three‑wide, as decreed by the Combat Council (docs/combat-systems/combat-design.md §Three‑Wide).