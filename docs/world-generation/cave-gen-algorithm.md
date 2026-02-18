# Cave Generation — Lanes, Chambers, and Singing Stone (Sprint 1)

Provenance
- Owner: @beta (World Generation — Deepdelver Caveborn)
- This is my miner’s map: pragmatic, implementable, no mystic fog. Aligns with our ECS and data assets; every pick stroke here is deterministic.

Cross‑references
- data/world/room-templates.json
- data/world/biome-crystal-caverns.json
- docs/core-systems/ecs-architecture.md
- data/core/component-schemas.json (Tile)
- docs/technology-systems/crafting-design.md (§Hardness)
- docs/visual-systems/style-guide.md (§Tile size 16×16)
- data/audio/sound-manifest.json (lamp/cave ambience mentions only)
- docs/combat-systems/combat-design.md (Three‑Wide Law)

---

## 1) Goals & Constraints (Acceptance Targets)

- MVP map
  - Single level, deterministic per seed.
  - Generation budget: 10–20 ms at 96×64 tiles on mid‑tier desktop.
- Compliance
  - Three‑Wide Law for doors/lanes; doors are contiguous runs of 3 tiles and lanes stay ≥3 wide.
  - Doors have a 3‑tile band; corridors blend to preserve that width immediately past doors.
  - 12×12 actor collider lanes (with 16×16 tiles) comfortably fit in 3‑wide lanes.
  - Ore hardness gates match biome tile definitions and crafting design.
- Determinism
  - Fixed RNG stream segmentation by phase.
  - seed → stable layout and ore placement.
  - Acceptance test: hash-of-kinds (tileType + oreType) stable across runs for a given seed and inputs.

---

## 2) Data Contracts (Authoritative Inputs/Outputs)

Inputs
- seed: int|string → normalized to 32-bit (uint32).
- mapSize: { width:int, height:int } in tiles (default 96×64).
- biome: BiomeDef parsed from data/world/biome-crystal-caverns.json (version==1).
  - Required: tiles.rock.hardness, tiles.floor.hardness (if defined), tiles.ore.oreTypes[], oreSeeding.noise, tuning.*, lighting.*, minimap.tokens, decoration.*, spawnRules.*
- roomTemplates: parsed set from data/world/room-templates.json (version==1).
  - Each template has: id, grid (array of strings), rotate:bool, category:"cavern"|"tunnel"|"ore_vein"|..., door runs denoted by 'D', floor '.' and rock '#', ore-preference 'O'.

Outputs
- tilemap: 2D array [height][width] of TileCells:
  - { tileType:"rock"|"floor"|"rock.ore", hardness:int, oreType:string|"" }
  - hardness from biome.tiles.rock.hardness (default 3) or floor hardness if defined; ore adds hardnessDelta per ore type.
- metadata:
  - rooms: [RoomStamp] where RoomStamp = { id:int, tplId:string, aabb:{x0,y0,x1,y1}, doors:[Door], rotation:0|90|180|270 }
  - corridors: [CorridorPath] where CorridorPath = { id:int, fromDoorId:int, toDoorId:int, centerline:[{x:int,y:int}], aabb:{x0,y0,x1,y1} }
  - doors: [Door] where Door = { id:int, x:int, y:int, dir:"N"|"S"|"E"|"W", width:3, roomId:int }
  - lamps: [{ x:int, y:int }]
  - crystals: [{ x:int, y:int }]
  - oreSeeds: [{ x:int, y:int, oreId:string }]
  - spawnAnchors: [{ x:int, y:int, kind:string }]
  - minimapRaster: Uint8Array(width*height), values: 0 bg, 1 room, 2 corridor, 3 ore
  - warnings: string[]
- Door structure: width is fixed 3; x,y is center tile of the 3‑run.

Tile hardness mapping
- rock: biome.tiles.rock.hardness
- floor: biome.tiles.floor.hardness if defined else biome.tiles.rock.hardness - 1 (min 1)
- ore: rock.hardness + ore.hardnessDelta (e.g., iron +1, shard.quartz +2, copper +0)

---

## 3) RNG & Determinism Plan

- RNG streams segmented per phase to avoid order coupling:
  - R0 room placement
  - R1 corridor routing
  - R2 CA picks
  - R3 ore mask/noise
  - R4 cluster growth
  - R5 deco/lamps
  - R6 spawns
- Derive stream seeds via hash32(baseSeed, phaseId). Constants (phaseId):
  - R0: 0xA1B2C301
  - R1: 0xA1B2C302
  - R2: 0xA1B2C303
  - R3: 0xA1B2C304
  - R4: 0xA1B2C305
  - R5: 0xA1B2C306
  - R6: 0xA1B2C307
- Integer‑only RNG (xorshift32). Forbidden: Math.random.

Reference pseudocode (see §15 for a full snippet)
- xorshift32.nextUint() → uint32
- xorshift32.nextFloat() → [0,1)

---

## 4) Map Initialization

- Allocate tilemap [h][w].
- Initialize all cells to rock:
  - tileType:"rock"
  - hardness: biome.tiles.rock.hardness (default 3)
  - oreType:""
- Parallel flag grids (Uint8Array, size w*h). Bitmasks:
  - ROOM = 1<<0
  - CORRIDOR = 1<<1
  - DOOR_BAND = 1<<2
  - ORE_PREF = 1<<3
- Maintain an explicit boolean ORE_PREF grid (or as flag bit above).

---

## 5) Phase 1 — Room Placement (Template Stamping)

Budget and sampling
- Attempts: biome.tuning.roomAttempts (default 14).
- Weighted template categories (default; allow biome override):
  - cavern: 5
  - tunnel: 4
  - ore_vein: 3
- For each attempt:
  - Pick a template by weight, then pick a concrete template in that category uniformly.
  - If template.rotate==true, choose rotation k ∈ {0,1,2,3} (0/90/180/270).
  - Choose random top‑left (x0,y0) within bounds with 1‑tile wall buffer to map edges after rotation.

Validation
- Charset enforced at load: '#' rock, '.' floor, 'D' door (floor), 'O' ore‑pref rock.
- Doors:
  - Only boundary cells may be 'D'.
  - 'D' must form contiguous runs of exactly width 3 and centered on side (check after rotation).
  - Placement reject if any door band would be OOB or overlap an existing room’s door band inconsistently (non‑collinear, offset).
- Overlap policy:
  - New floor ('.'/'D') may not overwrite existing floor.
  - Rock may overwrite rock only.
  - Enforce ≥1‑tile external buffer between distinct room walls except at door bands (which may touch corridor later). Use ROOM flag to track interior; for walls use derived adjacency during validation.
- Three‑Wide Law:
  - Validate that, post‑rotation, for each door, there is a ≥3‑tile clear approach inside the template for at least 3 tiles depth. Reject on failure.

Stamping rules
- For each template cell (tx,ty) mapped to (x,y):
  - '#': write rock (no flags). Clear ROOM flag for that cell.
  - '.': write floor (tileType:"floor", hardness per biome floor). Set ROOM flag.
  - 'D': write floor as above, set ROOM flag and DOOR_BAND flag.
  - 'O': write rock, set ORE_PREF flag.
- Record RoomStamp with computed AABB, doors (center x,y, dir, width=3), rotation, tplId.

---

## 6) Phase 2 — Corridor Planning and Carving

Door graph (nodes: door centers)
- Gather all Door nodes from stamped rooms.
- Candidate edges:
  - For each door d, find nearest door d' in a different room by Manhattan distance; add edge (d,d',dist).
  - De‑duplicate edges (min doorId order).
- Build MST:
  - Run Kruskal over candidate edges by distance ascending.
  - Tie‑break equal distance using R1.nextUint().
  - After MST, add k extra edges for loops: k = ceil(nDoors * 0.12), sampling from remaining edges biased to shorter first.

Path routing
- For each chosen edge (door A → door B):
  - Route on grid using A* (Manhattan heuristic) over a cost field:
    - Base cell cost: floor=1, rock=2.
    - Turning adds biome.tuning.corridor.turnCost (default 0.22). Implement cost as fixed‑point ints (e.g., scale 100) to avoid floats in open set.
  - Corridor width: carve a 3‑tile‑wide band centered on the routed centerline.
    - Rasterize centerline cells, then dilate by radius=1 using 4‑neighborhood (diamond) to achieve a 3‑wide passable lane.
  - Carving:
    - Set tileType:"floor" for carved cells (respecting that ore will only appear in rock); clear oreType if any.
    - Set CORRIDOR flag on carved cells.
    - Preserve DOOR_BAND cells and ensure the first step beyond a door remains 3‑wide (blend with dilation across the threshold).

---

## 7) Phase 3 — Connectivity Guarantee & Cleanup

- Flood‑fill from the first room floor cell across floor cells (ROOM|CORRIDOR). Collect unreachable ROOM/CORRIDOR regions.
- For each unreachable region:
  - Find its closest boundary cell to any reachable cell by Manhattan distance.
  - Route and carve a corridor as in Phase 2 to connect.
- Cleanup:
  - Smooth corridor corners minimally:
    - Remove single‑tile rock spikes: if a 2×2 block has three floors and one rock, flip that rock to floor, provided the local corridor width after change remains ≥3.

---

## 8) Phase 4 — Cellular Automata Smoothing (Rooms Only)

- Optional iterations: biome.tuning.ca.iterations (default 1; range 0–3).
- Masked region:
  - Include only room interior floors (ROOM flag).
  - Exclude DOOR_BAND and any CORRIDOR cells.
  - Additionally mask a 3‑tile depth behind each door (inward normal) to preserve approaches.
- Rule (applied to a copy, then committed):
  - For each rock cell adjacent (8‑neigh) to floor: if floorNeighbors ≥ 5 → convert to floor.
  - For each floor cell: if rockNeighbors ≥ 6 → keep floor (stability bias; do not convert to rock).
  - Ties: with probability 5% (R2), allow a reluctant conversion toward floor when floorNeighbors==4.
- Update ROOM flags to reflect added floors.

---

## 9) Phase 5 — Ore Seeding (Noise + Clustering)

Candidate cells
- Start from rock cells not within laneClearanceTiles (default 2) of any CORRIDOR or DOOR_BAND.
- Prioritize cells with ORE_PREF flag; optionally allow rock adjacent to floor if biome.oreSeeding.candidates.adjacentToFloor == true.
- Compute nearest distance to room walls for edge biasing (see below).

Noise mask
- Use coherent value noise per biome.oreSeeding.noise:
  - fields: { octaves:int, baseScale:float, lacunarity:float, gain:float, threshold:float, seedJitter:int }
  - Effective seed: hash32(baseSeed, R3_phase) ^ seedJitter
- Only cells with noise ≥ threshold qualify.

Seed selection
- Build candidate list:
  - First all ORE_PREF candidates sorted by noise descending.
  - Append remaining candidates sorted by noise descending.
- Edge bias: compute biasBonus = (distToWall <= 2 ? edgeBias : 0), default edgeBias=0.25; final score = noise + biasBonus.
- Select up to limits.maxSeeds (default 48 at 96×64; scale with area).
- Assign oreIds by biome.tiles.ore.oreTypes weights (defaults: copper 60, iron 34, shard.quartz 6).

Cluster growth
- Per ore type, get cluster limits from biome.oreSeeding.clusters.byOre[oreId] or fallback defaults:
  - Defaults (safe): copper {min:6,max:24}, iron {min:4,max:16}, shard.quartz {min:2,max:10}
- For each seed:
  - Run randomized BFS on rock‑only cells, avoiding laneClearance around corridors, until reaching max.
  - Ensure at least min: if truncated by constraints, retry growth directions from remaining rock neighbors before aborting.
  - Prevent overlap: reserve cells when enqueued/claimed; skip if already reserved.
- Commit ore cells:
  - tileType:"rock.ore"
  - oreType: oreId
  - hardness = biome.tiles.rock.hardness + ore.hardnessDelta (iron +1, shard.quartz +2, copper +0)
- Record oreSeeds for metadata.

---

## 10) Phase 6 — Lighting & Decoration

Lamps (metadata only)
- doorLampOffset (default 1): place one lamp doorLampOffset tiles into each corridor from every door center along the corridor centerline.
- intervalTiles (default 12): continue placing lamps along the routed centerline at this stride.
- Do not modify tiles. Visual system will spawn props against style guide (tile size 16×16).

Crystals
- If biome.decoration.crystalOnAlcove == true:
  - Find floor alcoves: floor cells with ≥5 rock neighbors in 8‑neigh.
  - Prefer near room edges (within 4 tiles of room walls).
  - Place up to maxCrystals (default 28), in clusters of size 1..3, minSeparationTiles (default 4).
  - Store crystals[] positions; tint via biome.lighting.crystals.tintToken at render time.

---

## 11) Phase 7 — Enemy Spawn Anchors

- Along corridors only if biome.spawnRules.preferCorridors == true.
- Sample stride: sampleEveryTiles (default 6) along corridor centerlines.
- Exclusions:
  - Skip within doorExclusionRadius (default 6) from any door.
  - Enforce minSeparationTiles (default 7) between anchors.
- For each anchor, choose kind by biome.spawnRules.enemyWeights (e.g., { scout:50, brawler:35, lurker:15 }).
- Do not spawn entities; only record anchors.

---

## 12) Minimap Rasterization

- Produce Uint8Array(h*w) minimapRaster:
  - 0: bg (unseen rock)
  - 1: room floors (ROOM flag and not CORRIDOR)
  - 2: corridor floors (CORRIDOR flag)
  - 3: ore (any tileType == "rock.ore")
- Tokens mapping lives in biome.minimap.tokens; renderer consumes mapping → colors/icons.

---

## 13) Data Structures & APIs (for src/worldgen/cave-generator.js)

ESM API
- generateLevel({ seed, width, height, biome, roomTemplates }): { tilemap, metadata }
- hashLevelKinds({ tilemap }): string — hex string hash of tileType/oreType across grid.
- rotateTemplate(template, rot90k): TemplateDef — rotates 0/90/180/270, re‑validates doors.

Internal types (succinct)
- TileCell: { tileType:"rock"|"floor"|"rock.ore", hardness:int, oreType:string|"" }
- RoomStamp: { id:int, tplId:string, aabb:{x0,y0,x1,y1}, doors:[Door], rotation:0|90|180|270 }
- Door: { id:int, x:int, y:int, dir:"N"|"S"|"E"|"W", width:3, roomId:int }
- CorridorPath: { id:int, fromDoorId:int, toDoorId:int, centerline:[{x:int,y:int}], aabb:{x0,y0,x1,y1} }
- Metadata: as specified in Outputs.
- Flags: parallel Uint8Array with ROOM, CORRIDOR, DOOR_BAND, ORE_PREF bits.

Indexing helpers
- idx(x,y) = y*width + x
- inBounds(x,y) = 0<=x<width and 0<=y<height

---

## 14) Pseudocode Snippets

RNG seeding and next()
```
function hash32(a,b) {
  // 32-bit mix (xorshift-based avalanche)
  let h = (a ^ 0x9E3779B9) >>> 0;
  h ^= (h << 7) >>> 0; h ^= (h >>> 9);
  h = (h + ((b ^ 0x85EBCA6B) >>> 0)) >>> 0;
  h ^= (h << 13) >>> 0; h ^= (h >>> 17);
  h = (h * 0x85EBCA6B) >>> 0;
  h ^= (h << 5) >>> 0; h ^= (h >>> 15);
  return h >>> 0;
}

function makeXorShift32(seed) {
  let s = (seed >>> 0) || 0xDEADBEEF;
  return {
    nextUint() {
      // xorshift32
      s ^= (s << 13) >>> 0;
      s ^= (s >>> 17);
      s ^= (s << 5) >>> 0;
      return s >>> 0;
    },
    nextFloat() {
      return (this.nextUint() >>> 0) / 0x100000000;
    },
    pick(arr) { return arr[this.nextUint() % arr.length]; },
    rangeInt(lo, hi) { // inclusive lo..hi
      const span = (hi - lo + 1) >>> 0;
      return lo + (this.nextUint() % span);
    }
  };
}
```

Room stamping with rotation, door detection, and AABB checks
```
function rotateTemplate(tpl, k) { // k in {0,1,2,3}
  const h = tpl.grid.length, w = tpl.grid[0].length;
  let out = new Array((k%2==0)?h:w).fill(0).map(()=>new Array((k%2==0)?w:h).fill(' '));
  for (let y=0; y<h; y++) for (let x=0; x<w; x++) {
    let cx=x, cy=y;
    if (k==1) { cx = h-1-y; cy = x; }
    else if (k==2) { cx = w-1-x; cy = h-1-y; }
    else if (k==3) { cx = y; cy = w-1-x; }
    out[cy][cx] = tpl.grid[y][x];
  }
  // Validate door runs of width 3 centered on sides
  // Returns new template with door meta computed
  return { ...tpl, grid: out.map(r=>r.join('')) };
}

function placeRoomAttempt(rng, tpl, rotK, topLeft, map, flags) {
  const rt = rotateTemplate(tpl, rotK);
  const H = rt.grid.length, W = rt.grid[0].length;
  const x0 = topLeft.x, y0 = topLeft.y;
  // Bounds with 1-tile wall buffer
  if (x0 < 1 || y0 < 1 || x0+W > map.width-1 || y0+H > map.height-1) return false;

  // Scan and collect doors, validate runs
  let doors = [];
  for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
    const ch = rt.grid[y][x];
    const gx = x0+x, gy = y0+y;
    // Overlap validation
    const f = flags[idx(gx,gy)];
    const isFloorNew = (ch=='.' || ch=='D');
    if (isFloorNew) {
      const existingFloor = (map[gy][gx].tileType !== "rock");
      if (existingFloor) return false;
    } else { // rock '#','O' can only overwrite rock
      if (map[gy][gx].tileType !== "rock") return false;
    }
    // Track door candidates at boundary
    if (ch=='D') {
      const onEdge = (x==0 || x==W-1 || y==0 || y==H-1);
      if (!onEdge) return false;
      doors.push({gx,gy,x,y});
    }
  }

  // Validate 3-wide contiguous door bands and determine dir
  let doorObjs = [];
  // Group by side and y/x
  // (Implementation detail omitted for brevity; ensure runs of exactly len 3 and centered)
  // Also ensure internal 3-tile clear approach of depth 3 past the door.

  // Stamp
  for (let y=0; y<H; y++) for (let x=0; x<W; x++) {
    const ch = rt.grid[y][x];
    const gx = x0+x, gy = y0+y;
    if (ch=='.' || ch=='D') {
      map[gy][gx].tileType = "floor";
      map[gy][gx].hardness = Math.max(1, (biome.tiles.floor?.hardness ?? (biome.tiles.rock.hardness-1)));
      map[gy][gx].oreType = "";
      flags[idx(gx,gy)] |= ROOM;
      if (ch=='D') flags[idx(gx,gy)] |= DOOR_BAND;
    } else if (ch=='#') {
      // rock stays as initialized
    } else if (ch=='O') {
      flags[idx(gx,gy)] |= ORE_PREF;
    }
  }

  // Record room stamp with doors (center tile coords and dir)
  return true;
}
```

Corridor MST and path routing with turnCost
```
function buildDoorGraph(doors, rng) {
  let edges = [];
  for (let i=0;i<doors.length;i++){
    let bestJ=-1, bestD=1e9;
    for (let j=0;j<doors.length;j++){
      if (doors[i].roomId===doors[j].roomId) continue;
      const d = Math.abs(doors[i].x-doors[j].x)+Math.abs(doors[i].y-doors[j].y);
      if (d<bestD){bestD=d;bestJ=j;}
    }
    if (bestJ>=0) {
      const a=Math.min(i,bestJ), b=Math.max(i,bestJ);
      edges.push({a,b, w:bestD});
    }
  }
  // De-dup
  edges = Object.values(edges.reduce((m,e)=>{
    const k=`${e.a}:${e.b}`; if(!m[k]||e.w<m[k].w) m[k]=e; return m;
  },{}));
  // Kruskal
  edges.sort((e1,e2)=> e1.w===e2.w ? ((rng.nextUint()&1)?-1:1) : e1.w-e2.w);
  const uf = makeUnionFind(doors.length);
  let mst=[];
  for (const e of edges){
    if (uf.find(e.a)!==uf.find(e.b)){ uf.union(e.a,e.b); mst.push(e); }
  }
  // Add loops
  const extra = Math.ceil(doors.length*0.12);
  const rest = edges.filter(e=>!mst.includes(e));
  for (let i=0;i<extra && i<rest.length;i++) mst.push(rest[i]);
  return mst;
}

function routeAStar(start, goal, map, flags, turnCostFP /* e.g., 22 for 0.22 scaled by 100 */) {
  const W=map[0].length,H=map.length;
  const open = new MinHeap((a,b)=>a.f-b.f);
  const came = new Int32Array(W*H).fill(-1);
  const g = new Uint32Array(W*H).fill(0xFFFFFFFF);
  const dirIn = new Int8Array(W*H).fill(-1);
  const startIdx = idx(start.x,start.y), goalIdx = idx(goal.x,goal.y);

  g[startIdx]=0; open.push({i:startIdx,f:0});
  const neigh = [{dx:1,dy:0,di:0},{dx:-1,dy:0,di:1},{dx:0,dy:1,di:2},{dx:0,dy:-1,di:3}];

  function cellCost(i){ // floor=1, rock=2
    const t = map[iToY(i)][iToX(i)].tileType;
    return (t==="rock")?200 : 100; // scaled by 100
  }

  while(!open.isEmpty()){
    const cur = open.pop(); const i = cur.i;
    if (i===goalIdx) break;
    const cx=iToX(i), cy=iToY(i);
    for (const n of neigh){
      const nx=cx+n.dx, ny=cy+n.dy;
      if (nx<0||ny<0||nx>=W||ny>=H) continue;
      const ni=idx(nx,ny);
      let step = cellCost(ni);
      if (dirIn[i]!==-1 && dirIn[i]!==n.di) step += turnCostFP; // turn penalty
      const ng = g[i] + step;
      if (ng < g[ni]) {
        g[ni]=ng; came[ni]=i; dirIn[ni]=n.di;
        const h = (Math.abs(nx-goal.x)+Math.abs(ny-goal.y))*100;
        open.push({i:ni, f: ng+h});
      }
    }
  }
  // Reconstruct
  let path=[]; let i=goalIdx;
  if (came[i]===-1) return []; // fallback: straight Manhattan later
  while(i!==-1){ path.push({x:iToX(i),y:iToY(i)}); i=came[i]; }
  path.reverse();
  return path;
}

function carveCorridor(centerline, map, flags) {
  // Dilate radius=1 in 4-neigh around each centerline cell
  const W=map[0].length,H=map.length;
  const Q=[];
  const pushCell=(x,y)=>{
    if(x<0||y<0||x>=W||y>=H) return;
    const i=idx(x,y);
    // mark floor
    map[y][x].tileType="floor";
    map[y][x].oreType="";
    flags[i]|=CORRIDOR;
  };
  for (const p of centerline) {
    pushCell(p.x,p.y);
    pushCell(p.x+1,p.y);
    pushCell(p.x-1,p.y);
    pushCell(p.x,p.y+1);
    pushCell(p.x,p.y-1);
  }
}
```

CA pass masked by corridors and door approach
```
function caSmoothRooms(map, flags, iterations, rng) {
  const W=map[0].length,H=map.length;
  for (let it=0; it<iterations; it++){
    const nextTypes = new Uint8Array(W*H); // 0 rock, 1 floor, 2 ore-rock (treated as rock for CA)
    for (let y=0;y<H;y++) for (let x=0;x<W;x++){
      const i=idx(x,y);
      const t=map[y][x].tileType;
      nextTypes[i]=(t==="floor")?1:0;
    }
    for (let y=1;y<H-1;y++) for (let x=1;x<W-1;x++){
      const i=idx(x,y);
      const masked = (flags[i]&CORRIDOR) || (flags[i]&DOOR_BAND) || isInDoorApproachMask(x,y,flags);
      if (masked) continue;
      const isFloor = (map[y][x].tileType==="floor");
      let floorN=0, rockN=0;
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++){
        if (dx===0&&dy===0) continue;
        const t=map[y+dy][x+dx].tileType;
        if (t==="floor") floorN++; else rockN++;
      }
      if (!isFloor && floorN>=5) nextTypes[i]=1;
      else if (isFloor && rockN>=6) nextTypes[i]=1; // stability: keep floor
      else if (!isFloor && floorN==4 && rng.nextFloat()<0.05) nextTypes[i]=1;
    }
    // Commit
    for (let y=0;y<H;y++) for (let x=0;x<W;x++){
      const i=idx(x,y);
      if (nextTypes[i]===1) {
        map[y][x].tileType="floor";
        map[y][x].oreType="";
        flags[i]|=ROOM;
      }
    }
  }
}
```

Ore seed selection and cluster growth
```
function valueNoise2D(x, y, seed) {
  // Grid hash at integer lattice; bilinear interpolate
  const xi=Math.floor(x), yi=Math.floor(y);
  const xf=x - xi, yf=y - yi;
  function h(ix,iy){
    let v = hash32(hash32(ix>>>0, seed), iy>>>0);
    return (v & 0xFFFF) / 0xFFFF; // [0,1]
  }
  const v00=h(xi,yi), v10=h(xi+1,yi), v01=h(xi,yi+1), v11=h(xi+1,yi+1);
  const sx = xf*xf*(3-2*xf);
  const sy = yf*yf*(3-2*yf);
  const ix0 = v00 + (v10 - v00)*sx;
  const ix1 = v01 + (v11 - v01)*sx;
  return ix0 + (ix1 - ix0)*sy;
}

function octaveNoise2D(x,y, conf, seed){
  let amp=1, freq=conf.baseScale, sum=0, norm=0;
  for (let o=0;o<conf.octaves;o++){
    sum += valueNoise2D(x*freq, y*freq, seed + o*0x9E3779B9) * amp;
    norm += amp;
    freq *= conf.lacunarity;
    amp *= conf.gain;
  }
  return sum / Math.max(1e-6, norm);
}

function selectOreSeeds(map, flags, biome, baseSeed){
  const W=map[0].length,H=map.length;
  const noiseConf = biome.oreSeeding.noise;
  const seed = hash32(baseSeed, 0xA1B2C304) ^ (noiseConf.seedJitter|0);
  const laneClear = biome.oreSeeding?.laneClearanceTiles ?? 2;
  let cands=[];
  for (let y=0;y<H;y++) for (let x=0;x<W;x++){
    const i=idx(x,y);
    if (map[y][x].tileType!=="rock") continue;
    if (nearCorridorOrDoor(flags, x,y, laneClear)) continue;
    if (!(flags[i]&ORE_PREF) && biome.oreSeeding?.candidates?.adjacentToFloor) {
      if (!anyNeighborIsFloor(map, x,y)) continue;
    }
    const n = octaveNoise2D(x, y, noiseConf, seed);
    if (n < noiseConf.threshold) continue;
    const edgeDist = distToRoomWall(flags, x,y);
    const bias = (edgeDist<=2) ? (biome.oreSeeding?.edgeBias ?? 0.25) : 0;
    const score = n + bias + ((flags[i]&ORE_PREF)? 0.1 : 0);
    cands.push({x,y,score, pref: !!(flags[i]&ORE_PREF)});
  }
  // Sort: ORE_PREF first by score desc, then others by score desc
  cands.sort((a,b)=>{
    if (a.pref!==b.pref) return a.pref? -1 : 1;
    return b.score - a.score;
  });
  const limit = biome.oreSeeding?.limits?.maxSeeds ?? Math.floor((W*H)/(96*64) * 48);
  return cands.slice(0, limit);
}

function assignOreIds(seeds, biome, rng){
  const weights = biome.tiles.ore.oreTypes; // [{id,weight,hardnessDelta},...]
  const total = weights.reduce((s,w)=>s+w.weight,0);
  function pickOre(){
    let r = rng.nextUint()%total;
    for (const w of weights){ if (r < w.weight) return w; r -= w.weight; }
    return weights[0];
  }
  return seeds.map(s=>({ ...s, ore: pickOre() }));
}

function growClusters(seeds, map, flags, biome, baseSeed){
  const W=map[0].length,H=map.length;
  const laneClear = biome.oreSeeding?.laneClearanceTiles ?? 2;
  const claimed = new Uint8Array(W*H);
  const noiseRng = makeXorShift32(hash32(baseSeed, 0xA1B2C305));
  const byOre = biome.oreSeeding?.clusters?.byOre || {};
  for (const s of seeds){
    const lim = byOre[s.ore.id] || {min:6,max:16};
    const q=[{x:s.x,y:s.y}];
    const cells=[];
    // Reserve seed if rock and not near corridor
    if (map[s.y][s.x].tileType!=="rock") continue;
    claimed[idx(s.x,s.y)]=1; cells.push({x:s.x,y:s.y});
    while(q.length && cells.length < lim.max){
      const cur = q.shift();
      const neigh = shuffle4([{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}], noiseRng);
      for (const n of neigh){
        const nx=cur.x+n.dx, ny=cur.y+n.dy;
        if (nx<0||ny<0||nx>=W||ny>=H) continue;
        const i=idx(nx,ny);
        if (claimed[i]) continue;
        if (map[ny][nx].tileType!=="rock") continue;
        if (nearCorridorOrDoor(flags, nx,ny, laneClear)) continue;
        claimed[i]=1; q.push({x:nx,y:ny}); cells.push({x:nx,y:ny});
        if (cells.length>=lim.max) break;
      }
    }
    if (cells.length < lim.min) {
      // Try to greedily expand into diagonal rocks if allowed
      const diag = [{dx:1,dy:1},{dx:-1,dy:1},{dx:1,dy:-1},{dx:-1,dy:-1}];
      for (const c of [...cells]){
        for (const d of diag){
          const nx=c.x+d.dx, ny=c.y+d.dy;
          if (nx<0||ny<0||nx>=W||ny>=H) continue;
          const i=idx(nx,ny);
          if (claimed[i]) continue;
          if (map[ny][nx].tileType!=="rock") continue;
          if (nearCorridorOrDoor(flags, nx,ny, laneClear)) continue;
          claimed[i]=1; cells.push({x:nx,y:ny});
          if (cells.length>=lim.min) break;
        }
        if (cells.length>=lim.min) break;
      }
    }
    // Commit ore
    for (const c of cells){
      map[c.y][c.x].tileType="rock.ore";
      map[c.y][c.x].oreType=s.ore.id;
      map[c.y][c.x].hardness = biome.tiles.rock.hardness + (s.ore.hardnessDelta|0);
    }
  }
}
```

Lamp placement along polyline center
```
function placeLamps(corridors, doors, biome) {
  const lamps=[];
  const off = biome.lighting?.lamps?.doorLampOffset ?? 1;
  const stride = biome.lighting?.lamps?.intervalTiles ?? 12;
  for (const c of corridors){
    // Assume centerline is contiguous path from door A to door B
    const pts = c.centerline;
    // Place near each end
    const ends = [off, Math.max(pts.length-1-off, 0)];
    for (const e of ends){
      if (pts[e]) lamps.push({x:pts[e].x,y:pts[e].y});
    }
    // Stride along
    for (let k=off+stride; k<pts.length-off; k+=stride){
      lamps.push({x:pts[k].x,y:pts[k].y});
    }
  }
  return lamps;
}
```

---

## 15) Performance Notes

- Use flat arrays where hot (Uint8Array/Uint32Array) and compute idx(x,y)=y*W+x.
- Parallel flag buffers (ROOM, CORRIDOR, DOOR_BAND, ORE_PREF) in one Uint8Array to reduce cache lines.
- Reuse working arrays (open sets, visited, flood fill queues).
- Avoid allocations in tight loops; pre-allocate neighbor buffers and heaps.
- Path routing optimization:
  - Coarse first: if Manhattan corridor between doors is obstacle‑free, skip full A* and carve straight, else fall back to A*.
  - Cache neighbor offsets and precompute cell base costs.
- Noise: value noise with bilinear interpolation; scale inputs to avoid large float ops (e.g., pre-multiply to fixed‑point if profiling requires).
- Door and corridor blending: batch dilations per corridor to reduce redundant writes.

---

## 16) Validation & Acceptance Checks

- Validate JSON versions and required fields before use:
  - room-templates.json: version==1, templates[].grid rectangular, charset only '#', '.', 'D', 'O', rotate:bool.
  - biome-crystal-caverns.json: version==1, tiles.rock.hardness, tiles.ore.oreTypes[].{id,weight,hardnessDelta}, oreSeeding.noise.*, tuning.*, minimap.tokens present.
- Door geometry:
  - Three‑Wide Law: check runs of exactly 3 cells at boundary; 3‑tile clear approach inside room ≥3 tiles depth.
- Overlaps:
  - Floors never overwrite floors; 1‑tile external buffer enforced.
- Connectivity:
  - After corridors and Phase 3, flood‑fill covers all ROOM and CORRIDOR floors.
- Determinism test:
  - hashLevelKinds returns stable hash for a given seed and inputs. Integrate into CI with 2–3 known seeds after assets freeze.
- Metadata warnings:
  - Record any rejected room attempts due to door invalidation or overlap.
  - Record fallback straight corridors when A* fails.

hashLevelKinds reference
```
function hashLevelKinds({tilemap}) {
  let h = 0x811C9DC5; // FNV-1a base
  for (let y=0;y<tilemap.length;y++){
    const row = tilemap[y];
    for (let x=0;x<row.length;x++){
      const t = row[x].tileType; // "rock","floor","rock.ore"
      // Map to small ints
      const k = (t==="rock")?1: (t==="floor")?2:3;
      h ^= k; h = (h * 0x01000193) >>> 0;
      if (k===3) { // ore
        const o = stringHash32(row[x].oreType);
        h ^= o; h = (h * 0x01000193) >>> 0;
      }
    }
  }
  return ("00000000"+(h>>>0).toString(16)).slice(-8);
}
function stringHash32(s){
  let h=0; for (let i=0;i<s.length;i++){ h=(h*31 + s.charCodeAt(i))>>>0; } return h>>>0;
}
```

---

## 17) Integration Touchpoints

- MiningSystem expects per‑tile hardness, tileType, oreType; enforce hardness gates per crafting‑design.md.
- UI minimap consumes raster and uses biome.minimap.tokens.
- Audio: Only lamp placements feed the light prop spawner; cave ambience referenced in manifest, but no audio spawned here.
- ECS: Tilemap is a component layer; entities for breakables are optional and not MVP.

---

## 18) Open Dials (Tuning)

Biome/default safe ranges (honor biome JSON if present)
- corridor.turnCost: default 0.22 (range 0.0–0.6)
- roomAttempts: default 14 (range 6–24 depending on map size)
- ca.iterations: default 1 (range 0–3)
- ore.limits.maxSeeds: default 48 at 96×64 (scale with area; range 16–96)
- ore oreTypes weights: copper 60, iron 34, shard.quartz 6 (sums arbitrary; keep copper dominant)
- laneClearanceTiles: default 2 (range 1–4)
- lamps.intervalTiles: default 12 (range 8–18)
- lamps.doorLampOffset: default 1 (range 1–2)
- crystals.maxCrystals: default 28 (range 8–48)
- spawns.sampleEveryTiles: default 6 (range 4–10)
- spawns.minSeparationTiles: default 7 (range 5–12)
- doorExclusionRadius: default 6 (range 4–10)

---

## 19) Acceptance Checklist (for this doc)

- Phases 1–7 covered with implementable steps and pseudocode.
- Contracts align with data/world/room-templates.json and data/world/biome-crystal-caverns.json.
- Determinism plan defined; RNG segmentation specified; Math.random forbidden.
- Three‑Wide Law honored for doors and lanes; 3‑tile door bands preserved.
- Minimap raster and spawn anchors defined for system consumers.

---

## 20) Implementation Outline (JS module author quick path)

- Normalize seed to uint32, derive R0..R6 via hash32(seed, phaseId).
- Init tilemap rock + flags.
- Phase 1: Attempt room stamps by weighted category, rotate, validate, stamp, collect doors/rooms.
- Phase 2: Build door graph, MST + loops, A* routing with turn penalty, carve 3‑wide by dilation.
- Phase 3: Flood‑fill connectivity; connect stragglers; corner cleanup.
- Phase 4: Optional CA smoothing masked to room interiors excluding door approaches and corridors.
- Phase 5: Noise mask (R3), seed selection with edge bias and ORE_PREF, assign ore types, grow clusters (R4), commit ore tiles.
- Phase 6: Lamps along corridor centerlines; crystals into alcoves.
- Phase 7: Corridor spawn anchors with spacing and door exclusion.
- Minimap rasterization.
- Compute hashLevelKinds for acceptance.
- Return { tilemap, metadata }.

---

## Appendix: Helper Notes

- Direction from door to interior:
  - For a door on the North edge of a room stamp, interior is South (dir:"N" means door faces North outwards; approach mask extends to South).
- Door approach mask computation:
  - For each door center, step 3 tiles inward along dir normal; mark those cells as approach‑protected.
- Corridor vs room minimap assignment:
  - If a floor cell has CORRIDOR flag → minimap 2; else if ROOM → 1.
- Tile size reminder:
  - 16×16 pixels; 3‑wide lanes are 48 px, ample for 12×12 actor colliders (combat doc’s Three‑Wide Law).

---

Here ends my chalk‑markings on the wall. Follow them, and the caves will open on schedule, every time, exactly as the seed decrees.