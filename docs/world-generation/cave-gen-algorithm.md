# Cave Generation — Lanes, Chambers, and the Singing Stone (Sprint 1)

Provenance: owner @beta (World Generation — Deepdelver Caveborn)

Cross‑references:
- data/world/biome-crystal-caverns.json
- data/world/room-templates.json
- docs/visual-systems/style-guide.md (§Tiles 16×16, lanes)
- docs/combat-systems/combat-design.md (§Three‑wide law)
- data/visual/color-palette.json (token‑only)
- docs/technology-systems/crafting-design.md (§Hardness)
- tools/ecs-registry.test.js (determinism hooks)

In these depths we do not trust luck; we bind chance to seed and stone. What follows is the implementor’s lantern: precise steps, stable streams, and lanes wide enough for fair battle.

## 1) Goals & Constraints (MVP)

Goals:
- Enforce 3‑wide fair lanes (corridors) for combat readability.
- Readable caverns with one dominant connected space.
- Ore pockets placed along seams (floor–rock edges) in believable clusters.
- Deterministic replays from a single seed across platforms.
- Performance target: under 20 ms for a 96×64 tile map on a mid‑tier laptop.

Non‑goals (MVP):
- Multi‑biome stitching.
- Dynamic cave collapse.
- Wave Function Collapse (WFC). We use lightweight cellular automata + authored room template stamping.

Output contract (MVP):
- Tiles with Tile component fields: tileType, hardness, oreType (optional).
- Props: lamps and crystal decor entities.
- Spawn anchors for enemies.
- Door tags (for corridor connections, AI/nav hints).

## 2) Coordinate System & Tile Schema

- Grid: 16×16 px tiles. Authoritative MVP size: width=96, height=64 (configurable).
- Layers: single gameplay layer (layer 0) in Sprint 1.
- Tile kinds used by generator:
  - "rock"
  - "floor"
  - "rock.ore" (with oreType set)
- Hardness resolution:
  - floor.hardness from biome.tiles.floor.hardness
  - rock.hardness from biome.tiles.rock.hardness
  - ore hardness = biome.tiles.ore.baseHardness (optionally overridden per ore type in future; see §11)

## 3) Randomness & Determinism

PRNG:
- Use a small, fast, seedable PRNG (xorshift32 or mulberry32). Reference implementation in §17.
- Derive named sub‑streams by hashing the core seed with a phase label (e.g., "rooms", "corridors") or by advancing an independent PRNG initialized with seed XOR phaseHash.

RNG streams (exclusive consumption per phase):
- seed.core — entry; map‑level layout decisions and fallback picks.
- seed.rooms — template selection and placement jitter.
- seed.corridors — tunnel digger target selection and direction persistence noise.
- seed.ore — ore seeding, ore type lottery, and cluster growth decisions.
- seed.decor — crystal decor scatter and clustering.
- seed.spawns — enemy anchor selection and weight lottery.

Stream usage rules:
- Each phase consumes only its stream; no cross‑phase consumption.
- When a phase must revisit a structure later (e.g., corridor lamps), use the same stream and deterministic traversal order.

Iteration order:
- Unless otherwise stated, iterate tiles in row‑major order, y outer ascending [0..height‑1], x inner ascending [0..width‑1]. This guarantees stable consumption across machines.

## 4) Pipeline Overview (Phase Order)

- P0 Params: read biome, map size, entrance/exit intentions.
- P1 Solid Mask Bootstrap: random fill of rock/floor with density p_init (e.g., 0.45 rock). Force a 1‑tile‑thick rock boundary.
- P2 Cellular Automata (CA): run 2 iterations of 4/5 rule on 8‑neighbors. Clamp borders to rock. Output provisional floor/rock mask.
- P3 Connectivity & Main Cavern Assurance: flood fill floors; keep largest component; convert isolated pockets to rock unless near planned room anchors; queue links where applicable.
- P4 Room Stamping: place authored templates (tunnel, cavern, ore‑vein room) honoring min spacing, 3‑tile doorways, zClearance ≥3. Room floors carve over rock; store door anchors.
- P5 Corridor Carving (3‑Wide Law): connect door anchors and major regions using a best‑first digger with direction persistence. Carve exactly 3‑wide lanes with beveled corners; ensure 1‑tile clearance from room walls except at doors.
- P6 Lamp Placement: place lamps along corridors from biome.lighting.lamps (intervalTiles, atDoors). Emit props and tint hints.
- P7 Ore Seeding: bias seeds to floor–rock edges with biome.oreSeeding (edgeBias, noise.octaves/scale/threshold). Grow 4‑neighborhood clusters within rock; clamp per‑ore min/max; preserve corridor clearance.
- P8 Decoration Pass: scatter crystal decor in alcoves using biome.decoration (crystalOnAlcove, maxCrystals).
- P9 Enemy Spawn Anchors: sample along corridors and cavern interiors using spawnRules.enemyWeights and minSeparationTiles.
- P10 Finalization: stamp Tile components with hardness and oreType; emit props; derive minimap raster and navmask.

## 5) Cellular Automata Details

- Neighborhood: 8‑neighbors.
- Rule per iteration:
  - Count rockNeighbors in 8‑ring.
  - Next is rock if:
    - rockNeighbors ≥ 5, or
    - rockNeighbors ≥ 4 and the current cell is rock.
  - Else becomes/does floor.
- Iterations: exactly 2 (MVP).
- Borders: always rock (don’t update).
- Performance:
  - Maintain two uint8 buffers (current/next) where 1=rock, 0=floor.
  - Precompute/pack neighbor occupancy into an 8‑bit mask per cell when counting to reduce memory traffic.

Tunables (exposed):
- p_init: 0.42–0.48 (default 0.45).
- iters: 2.
- surviveThresh: 5.
- birthThresh: 4.

## 6) Connectivity & Cleanup

- Flood fill floors to identify connected components (use row‑major seed ordering with a queue).
- Keep the largest component as the primary cavern.
- Convert other floor components to rock, unless within R=6 tiles (Chebyshev or Manhattan ok; prefer Manhattan) of a planned room door/anchor. If preserved for proximity, queue a corridor link from the nearest of:
  - The component’s centroid to the nearest corridor node or
  - The nearest cell on the primary component’s boundary.
- Notch culling:
  - Any floor tile whose local 3×3 floor count < 3 becomes rock. This removes single‑tile notches that would breach 3‑wide fairness along lanes and room perimeters.

## 7) Corridor Carving (3‑Wide Lane Spec)

- Corridor width:
  - Exactly 3 tiles in straight runs.
  - Beveled corners (45° stair steps) to maintain apparent width ≥ 3 through turns.
- Algorithm: multi‑source best‑first digger
  - Sources: all door anchors (from stamped rooms) and main cavern centroid(s).
  - Grid: 4‑connected movement; diagonals disallowed for path edges (prevents corner grazing).
  - Cost: g(n) + h(n) with:
    - h(n): Manhattan heuristic to targets.
    - Turn penalty: +2.0 when direction changes relative to previous step.
    - Prefer staying in existing floor to reduce carving into rock by applying a small bonus (e.g., −0.2 cost) to floor cells.
  - Expansion halts when sources’ regions mutually connect and all door anchors are connected to the primary network (use union‑find or “connected set size” checks).
- Lane mask carving:
  - When stepping forward, clear a 3×1 stripe perpendicular to the forward direction centered on the path cell.
  - At a 90° turn, carve a 3×2 elbow that overlaps both the incoming and outgoing stripes, removing single‑tile spikes.
- Doorways:
  - For each room door, stamp a 3‑tile‑wide doorway extending outward one tile beyond the template boundary (straight out along dir).
  - Align corridor carving to meet this 3‑wide mouth.
- Clearance enforcement:
  - Maintain a 1‑tile rock buffer to room walls (except at doors). Implement by inflating room footprint by 1 when evaluating candidate path cells; those cells are disallowed for path centers.
- Post‑carve polish:
  - Remove orphan single‑tile rock spikes along corridor edges (scan 3×3 neighborhood; if a rock tile has ≥6 floor neighbors, flip to floor).

## 8) Room Templates — Data Contract & Placement

File: data/world/room-templates.json

Top‑level shape:
- version: 1
- rooms: array of RoomTemplate

RoomTemplate fields:
- id: string (e.g., "room.tunnel.t1", "room.cavern.t1", "room.ore_pocket.t1")
- kind: "tunnel" | "cavern" | "ore_vein"
- size: { w:int, h:int } (MVP ≤ 32×32)
- grid: array<string> of length h, each string length w. Charset:
  - "#": rock
  - ".": floor
  - "O": ore slot (preferred placement region; generator may still place ore)
  - "D": door (must correspond to floor adjacency)
- doors: array of { x:int, y:int, dir:"N"|"S"|"E"|"W" } — must match "D" tiles.
- tags: string[] (e.g., ["spawn_preferred","ore_preferred"])
- zClearance: int (MVP requires ≥3)
- rotate: optional boolean (default true). If true, rotations 0/90/180/270 are permitted.

Validator rules:
- Grid well‑formed: all rows equal length; only charset ["#",".","O","D"].
- Doors:
  - Every "D" in grid must have a matching entry in doors[] with identical (x,y).
  - Door cells must be adjacent to floor on the room interior side.
  - For any cardinal direction present among doors, at least one doorway must be 3‑tile aligned:
    - A run of three consecutive "D" cells collinear and centered on the door normal, with dir consistent across the run.
- zClearance ≥3.
- Size bounds respected.

Placement:
- Candidate positions sampled by Poisson disk with radius in [8..14] scaled by template size (larger rooms push to 12–14).
- Reject if:
  - Any non‑door floor cell would extend beyond current rock bounds or exit map.
  - Overlaps previously placed room footprints (inflate previous footprints by 1 tile to ensure clearance).
- Rotation: test all allowed rotations; pick the first that passes constraints using rngRooms() to order candidates.
- On successful placement:
  - Stamp floors over rock; preserve rock where "#" remains.
  - Record door anchors in world coords with dir applied post‑rotation.
  - Store roomId on door records.

## 9) Lamps & Lighting Pass

From biome.lighting:
- ambient token and lamps spec define visual tone and prop tint.

Placement rules:
- atDoors: if true, place 1 lamp centered 1–2 tiles outside each door along its outward normal. If a corridor immediately begins, place at 1 tile; else at 2 tiles, clamped to floor.
- intervalTiles: along long corridors, starting from the nearest door on each corridor run, place a lamp every N tiles.
- Spacing: never place a lamp within 4 tiles (Manhattan) of another lamp; skip or shift forward by +1 if conflict.
- Emit props with:
  - kind:"lamp"
  - Renderable.tintToken = biome.lighting.lamps.token
  - audioId = "ambient.prop.lamp.hiss.loop"

## 10) Ore Seeding & Cluster Growth

Eligibility:
- Seed candidates are floor–rock adjacency edges: rock tiles that have at least one 4‑neighbor floor tile.
- Seed probability:
  - p_edge = lerp(0.5, 1.0, edgeBias) when candidate is on an edge.
  - p_open = 1 − edgeBias × 0.2 for interior rock (low chance).
- Noise gate:
  - Evaluate fbm‑style noise with biome.oreSeeding.noise.{octaves,scale,threshold}. Sample at world coords (x*scale, y*scale). Accept only if noise ≥ threshold.

Ore selection:
- Weighted lottery over biome.tiles.ore.oreTypes (ids and weights).
- Tile assignment on seed and cluster growth:
  - Set tileType to "rock.ore"
  - Set oreType to selected id.
- Hardness:
  - hardness = biome.tiles.ore.baseHardness (MVP; future per‑ore overrides allowed).

Cluster growth:
- BFS over 4‑neighbors from each accepted seed, within rock or rock.ore tiles.
- Stop when cluster size hits per‑ore maxCluster (and not less than per‑ore minCluster; if undersized due to constraints, allow it to remain but prefer retries by seeding density rather than backtracking).
- Corridor clearance:
  - Maintain a buffer of 1 tile from corridor lanes (do not convert those rock tiles to ore).
  - If a growth step would breach a lane (convert floor or violate buffer), skip that neighbor. If the cluster cannot grow at least to minCluster without breaching, allow a small cluster (MVP: do not delete the start).
- Room interaction:
  - Ore may embed in room rock, but never convert floor.

## 11) Decoration Pass — Crystal Clusters

- If biome.decoration.crystalOnAlcove is true:
  - Detect alcoves:
    - Floor tiles with exactly 5 or 6 rock neighbors in the 8‑ring, or
    - One‑tile indentations along a wall line (floor tiles with two opposite rock neighbors and at least 2 diagonal rocks).
  - Place non‑blocking crystal props, up to biome.decoration.maxCrystals:
    - Bias selection toward tiles within 6 of corridors (Manhattan), unless that would exceed maxCrystals by >25%.
    - Maintain min spacing of 2 tiles between crystals.

## 12) Enemy Spawn Anchors

- Inputs: spawnRules.enemyWeights (id→weight), minSeparationTiles (default 8; see §19).
- Candidate sites:
  - Corridor centers (the middle cell of the 3‑wide stripe) excluding within 6 tiles of doors.
  - Cavern interiors: floor tiles in the largest component where the 8‑neighbor rock count is ≤3 (more open).
- Sampling:
  - Use rngSpawns() to reservoir‑sample candidates in row‑major order.
  - Enforce minSeparationTiles by rejecting candidates within the radius of any accepted spawn.
- Assignment:
  - For each accepted anchor, pick enemyId using weighted lottery over enemyWeights.
  - Normalize weights once at start; ensure deterministic order and consumption.

## 13) Output Data Structures (Engine Contract)

Tiles:
- 2D or flat array of length width*height.
- Each tile: { tileType: "rock"|"floor"|"rock.ore", hardness:int, oreType?:string }

Props:
- Array of { kind:"lamp"|"crystal", position:{x:int,y:int}, tintToken:string, audioId?:string }

Spawns:
- Array of { enemyId:string, x:int, y:int }

Doors:
- Array of { x:int, y:int, dir:"N"|"S"|"E"|"W", roomId:string }

Derived:
- navmask: boolean walkable array (true for floor, false for rock/rock.ore).
- minimap: token references per tile for color lookup (do not resolve colors here; see data/visual/color-palette.json).

## 14) Performance Notes

- Memory:
  - Reuse two CA buffers (uint8).
  - One flood fill buffer (uint16 component ids or int32 visited marks).
  - Avoid dynamic allocations in inner loops; preallocate queues/vectors (ring buffers).
- Complexity:
  - CA O(N).
  - Flood fill O(N).
  - Corridor routing approximately O(E log V) but sparse on grid; constrained to a few sources.
  - Ore and decor passes linear with small constants.
- Target:
  - < 20 ms at 96×64 on mid‑tier laptop JS runtime. Use typed arrays and inlined hot paths.

## 15) Acceptance & QA

- Determinism:
  - Same seed → same layout and outputs across platforms.
  - Test harness (tools/ecs-registry.test.js): generate a hash over:
    - Counts of tileType categories and oreType distribution.
    - Sorted list of door coordinates with dir and roomId.
    - Corridor lamp positions.
- 3‑Wide Law:
  - Corridors exactly 3 tiles wide in straight runs; bevels present at turns; no single‑tile spikes.
  - Room doorways at least 3‑wide where doors exist.
- Biome conformance:
  - Tile hardness matches biome values.
  - Tokens (tint, minimap) resolve via palette; generator outputs only token ids.
  - Lamps placed per interval and atDoors flags.
- Ore:
  - Clusters respect per‑type min/max.
  - Do not intrude into lanes or their 1‑tile clearance.
  - Relative rarity matches weights (e.g., quartz rarer than copper/iron).
- JSON sanity:
  - room-templates.json validates against schema‑lite; malformed templates rejected with actionable errors.
  - Biome JSON assumed valid (pre‑validated).

## 16) Pseudocode Annex

Note: All loops are row‑major y→x. rngCore(), rngRooms(), rngCorridors(), rngOre(), rngDecor(), rngSpawns() are independent seeded streams.

PRNG (mulberry32 example):
```js
function makeMulberry32(seed) {
  return function rng() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; // [0,1)
  };
}
```

Phase P0–P2: Bootstrap + CA
```js
function genInitialMask(w,h, p_init, rngCore) {
  const A = new Uint8Array(w*h); // 1=rock,0=floor
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const i = y*w+x;
    const border = (x===0||y===0||x===w-1||y===h-1);
    A[i] = border ? 1 : (rngCore() < p_init ? 1 : 0);
  }
  return A;
}

function stepCA(cur, nxt, w,h, survive=5, birth=4) {
  const idx = (x,y)=>y*w+x;
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const i = idx(x,y);
    if (x===0||y===0||x===w-1||y===h-1) { nxt[i]=1; continue; }
    let rn=0;
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
      if (dx===0 && dy===0) continue;
      rn += cur[idx(x+dx,y+dy)];
    }
    const wasRock = cur[i]===1;
    nxt[i] = (rn>=survive || (rn>=birth && wasRock)) ? 1 : 0;
  }
}
```

Phase P3: Connectivity & Cleanup
```js
function labelComponents(mask,w,h) {
  const comp = new Int32Array(w*h).fill(-1);
  const sizes = [];
  const Qx = new Int32Array(w*h), Qy=new Int32Array(w*h);
  let head=0, tail=0, cid=0;
  const push=(x,y)=>{Qx[tail]=x; Qy[tail]=y; tail++;};
  const pop=()=>({x:Qx[head],y:Qy[head],i:(Qy[head]*w+Qx[head++])});
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const i=y*w+x;
    if (mask[i]===0 && comp[i]===-1) {
      let sz=0; head=tail=0; push(x,y); comp[i]=cid;
      while (head<tail) {
        const {x:cx,y:cy} = pop();
        sz++;
        const nbr=[[1,0],[-1,0],[0,1],[0,-1]];
        for (const [dx,dy] of nbr) {
          const nx=cx+dx, ny=cy+dy;
          if (nx<=0||ny<=0||nx>=w-1||ny>=h-1) continue;
          const ni=ny*w+nx;
          if (mask[ni]===0 && comp[ni]===-1) { comp[ni]=cid; push(nx,ny); }
        }
      }
      sizes[cid]=sz; cid++;
    }
  }
  return {comp, sizes};
}

function cleanup(mask,w,h, roomsDoors, preserveR=6) {
  const {comp, sizes} = labelComponents(mask,w,h);
  let mainId=-1, best=0;
  for (let id=0; id<sizes.length; id++) if (sizes[id]>best) {best=sizes[id]; mainId=id;}
  // convert small comps to rock unless near a planned door/anchor
  const doorPts = roomsDoors.map(d=>({x:d.x,y:d.y}));
  for (let y=1; y<h-1; y++) for (let x=1; x<w-1; x++) {
    const i=y*w+x;
    if (mask[i]===0 && comp[i]!==mainId) {
      let keep=false;
      for (const p of doorPts) {
        const dist = Math.abs(p.x-x)+Math.abs(p.y-y); // Manhattan
        if (dist<=preserveR) { keep=true; break; }
      }
      if (!keep) mask[i]=1;
    }
  }
  // notch culling
  for (let y=1; y<h-1; y++) for (let x=1; x<w-1; x++) {
    const i=y*w+x; if (mask[i]!==0) continue;
    let floors=0;
    for (let dy=-1; dy<=1; dy++) for (let dx=-1; dx<=1; dx++) {
      if (mask[(y+dy)*w+(x+dx)]===0) floors++;
    }
    if (floors<3) mask[i]=1;
  }
}
```

Phase P4: Room Stamping (selection + placement)
```js
function placeRooms(mask,w,h, templates, rngRooms) {
  const placed=[];
  const occupancy = new Uint8Array(w*h); // inflated footprints
  const candidates = poissonSampleCandidates(w,h, rngRooms); // returns ordered list
  for (const tpl of shuffled(templates, rngRooms)) {
    const rots = tpl.rotate!==false ? [0,1,2,3] : [0];
    for (const r of rots) {
      for (const c of candidates) {
        const ok = canStamp(tpl, r, c.x, c.y, mask, occupancy, w,h);
        if (!ok) continue;
        stampRoom(tpl, r, c.x, c.y, mask, occupancy, placed);
        break;
      }
    }
  }
  return placed; // includes door anchors world-space
}
```

Phase P5: Corridor Carving
```js
function carveCorridors(mask,w,h, doors, mainCentroid, rngCorridors) {
  const blocked = inflateRoomsAsBlocked(doors, mask, w,h); // 1-tile buffer
  const goals = new Set(doors.map(d=>dAnchorId(d)).concat([cellId(mainCentroid)]));
  const frontier = new MinHeap(); // keyed by f
  const prev = new Int32Array(w*h).fill(-1);
  const dirPrev = new Int8Array(w*h).fill(-1); // 0:N,1:E,2:S,3:W
  // seed with all anchors
  for (const a of goals) frontier.push({id:a, f:0, g:0, dir:-1});

  const visited = new Uint8Array(w*h);
  while (!frontier.isEmpty()) {
    const cur = frontier.pop();
    if (visited[cur.id]) continue;
    visited[cur.id]=1;
    // connect if cur touches another connected region (union-find omitted here)
    for (const nb of neighbors4(cur.id,w,h)) {
      if (blocked[nb]) continue;
      const stepDir = stepDirection(cur.id, nb, w);
      const turn = (cur.dir!==-1 && cur.dir!==stepDir) ? 2.0 : 0.0;
      const terrainBonus = (isFloor(nb,mask)? -0.2 : 0.0);
      const g = cur.g + 1 + turn + terrainBonus;
      const hcost = heuristicToAny(nb, goals, w,h);
      frontier.push({id:nb, f:g+hcost, g, dir:stepDir});
      if (prev[nb]===-1) { prev[nb]=cur.id; dirPrev[nb]=stepDir; }
    }
  }
  // Reconstruct and carve each path between anchors/main centroid
  for (const path of extractConnectorPaths(prev, goals)) {
    for (let k=1; k<path.length; k++) {
      const id = path[k];
      const dir = dirPrev[id];
      carveStripe3(mask, id, dir, w,h); // clear 3-wide perpendicular
      if (k>1 && dir!==dirPrev[path[k-1]]) carveElbow3x2(mask, id, dir, dirPrev[path[k-1]], w,h);
    }
  }
}
```

Phase P6: Lamps
```js
function placeLamps(corridorCenters, doors, lampsSpec, rngDecor) {
  const lamps=[];
  if (lampsSpec.atDoors) {
    for (const d of doors) {
      const p = offsetFromDoor(d, 1); // or 2 if blocked
      if (isFloorXY(p)) lamps.push({x:p.x,y:p.y});
    }
  }
  // Along corridors: stride by intervalTiles, avoid within 4 tiles of existing
  for (const run of corridorRuns(corridorCenters)) {
    let step=lampsSpec.intervalTiles;
    for (let i=step; i<run.length; i+=step) {
      const c = run[i];
      if (!withinNOfAny(c, lamps, 4)) lamps.push(c);
    }
  }
  return lamps;
}
```

Phase P7: Ore
```js
function seedAndGrowOre(mask,w,h, biome, rngOre, laneBuffer) {
  const oresOut=[];
  const noise = makeFBM(biome.oreSeeding.noise, rngOre); // deterministic params
  for (let y=1; y<h-1; y++) for (let x=1; x<w-1; x++) {
    const i=y*w+x;
    if (!isRock(mask[i])) continue;
    const edge = has4NeighborFloor(mask,w,h,x,y);
    const p = edge ? lerp(0.5,1.0, biome.oreSeeding.edgeBias)
                   : 1 - biome.oreSeeding.edgeBias*0.2;
    if (rngOre() < p && noise(x,y) >= biome.oreSeeding.noise.threshold) {
      const oreId = weightedPick(biome.tiles.ore.oreTypes, rngOre);
      const lim = getOreLimits(oreId, biome); // {min,max}
      const size = growClusterBFS(x,y, oreId, lim, mask, laneBuffer, rngOre);
      // keep even if <min due to constraints; MVP does not backtrack
    }
  }
  return oresOut;
}
```

Phase P8: Decor
```js
function placeCrystals(mask,w,h, biome, corridors, rngDecor) {
  if (!biome.decoration.crystalOnAlcove) return [];
  const alcoves=[];
  for (let y=1; y<h-1; y++) for (let x=1; x<w-1; x++) {
    if (!isFloor(mask[y*w+x])) continue;
    const r8 = rockCount8(mask,w,h,x,y);
    const indent = isWallIndent(mask,w,h,x,y);
    if ((r8===5 || r8===6) || indent) {
      alcoves.push({x,y, dToLane: distToCorridor({x,y}, corridors)});
    }
  }
  // Bias near corridors
  alcoves.sort((a,b)=>a.dToLane-b.dToLane);
  const out=[];
  const cap = biome.decoration.maxCrystals|0;
  for (const a of alcoves) {
    if (out.length>=cap) break;
    if (out.every(p=>manhattan(p,a)>=2)) out.push({x:a.x,y:a.y});
  }
  return out;
}
```

Phase P9–P10: Spawns and Finalization
```js
function placeSpawns(candidates, weights, minSep, rngSpawns) {
  const selected=[];
  const norm = normalizeWeights(weights);
  for (const c of candidates) {
    if (selected.every(s=>manhattan(s,c)>=minSep)) {
      selected.push({x:c.x,y:c.y, enemyId: weightedPickNorm(norm, rngSpawns)});
    }
  }
  return selected;
}

function finalize(tmask,w,h, biome, ores, lamps, crystals) {
  const tiles = new Array(w*h);
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    const i=y*w+x;
    const kind = tmask[i]===0 ? "floor" : "rock";
    let tileType = kind, oreType=undefined, hardness;
    if (isOreAt(i)) { tileType="rock.ore"; oreType=getOreType(i); }
    if (tileType==="floor") hardness = biome.tiles.floor.hardness;
    else if (tileType==="rock") hardness = biome.tiles.rock.hardness;
    else hardness = biome.tiles.ore.baseHardness;
    tiles[i] = { tileType, hardness, ...(oreType?{oreType}:null) };
  }
  const props = [
    ...lamps.map(p=>({kind:"lamp", position:p, tintToken: biome.lighting.lamps.token, audioId:"ambient.prop.lamp.hiss.loop"})),
    ...crystals.map(p=>({kind:"crystal", position:p, tintToken: biome.decoration.tintToken }))
  ];
  const navmask = tiles.map(t=>t.tileType!=="rock" && t.tileType!=="rock.ore");
  const minimap = tiles.map(t=>tileTypeToPaletteToken(t.tileType));
  return { tiles, props, navmask, minimap };
}
```

## 17) JSON Schema‑Lite (Appendix) for room-templates.json

This is a minimal, implementation‑practical validator spec. Use this to produce clear authoring errors.

```json
{
  "type": "object",
  "required": ["version", "rooms"],
  "properties": {
    "version": { "type": "integer", "enum": [1] },
    "rooms": {
      "type": "array",
      "minItems": 1,
      "items": {
        "type": "object",
        "required": ["id","kind","size","grid","doors","tags","zClearance"],
        "properties": {
          "id": { "type": "string", "minLength": 1 },
          "kind": { "type": "string", "enum": ["tunnel","cavern","ore_vein"] },
          "size": {
            "type": "object",
            "required": ["w","h"],
            "properties": {
              "w": { "type": "integer", "minimum": 1, "maximum": 32 },
              "h": { "type": "integer", "minimum": 1, "maximum": 32 }
            }
          },
          "grid": {
            "type": "array",
            "minItems": { "$ref": "#/rooms/items/properties/size/properties/h" },
            "maxItems": { "$ref": "#/rooms/items/properties/size/properties/h" },
            "items": {
              "type": "string",
              "pattern": "^[#.OD]+$",
              "minLength": { "$ref": "#/rooms/items/properties/size/properties/w" },
              "maxLength": { "$ref": "#/rooms/items/properties/size/properties/w" }
            }
          },
          "doors": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["x","y","dir"],
              "properties": {
                "x": { "type": "integer", "minimum": 0 },
                "y": { "type": "integer", "minimum": 0 },
                "dir": { "type": "string", "enum": ["N","S","E","W"] }
              }
            }
          },
          "tags": { "type": "array", "items": { "type": "string" } },
          "zClearance": { "type": "integer", "minimum": 3 },
          "rotate": { "type": "boolean" }
        },
        "additionalProperties": false
      }
    }
  },
  "postValidate": [
    "All rows in grid equal length and equal to size.w; grid.length == size.h.",
    "Each 'D' in grid has a matching entry in doors with identical (x,y).",
    "Each door cell 'D' is adjacent (4-neighbor) to a floor '.' within the template.",
    "For each direction in {N,S,E,W} present among doors, at least one 3-tile aligned doorway exists: three consecutive 'D' cells collinear and oriented with dir.",
    "Charset strictly in ['#','.', 'O', 'D']."
  ]
}
```

Notes:
- The "postValidate" array lists custom validators to implement in code; JSON Schema alone cannot fully express these structural constraints.

## 18) Tuning Defaults (MVP Table)

Authoritative defaults (configurable via biome or generator params):
- Map size: width=96, height=64
- CA:
  - p_init=0.45
  - iters=2
  - surviveThresh=5
  - birthThresh=4
- Corridor routing:
  - turnPenalty=2.0
  - floorBonus=−0.2
- Lamps:
  - atDoors=true
  - intervalTiles=9
- Ore noise:
  - octaves=2
  - scale=0.12
  - threshold=0.58
- Ore edgeBias=0.7
- Spawn minSeparationTiles=8
- Decoration:
  - crystalOnAlcove=true
  - maxCrystals=28

## 19) Future Hooks (Non‑binding)

- Multi‑biome stacks: boundary membranes to blend tiles, lighting, and ore tables per depth.
- Secret rooms: keyed door glyphs and noise‑gated stampers behind soft rock.
- Collapsed tunnels: rubble fields with dig hardness modifiers and path penalties.
- Puddles/slopes: fluid tiles, slip modifiers, and light reflections.
- WFC overlays: post‑corridor ornamentation for stalactites, struts, and murals.

---

May your seed be strong, and your lanes run true. The Singing Stone remembers each choice; with these rules, we make it sing the same song every time.