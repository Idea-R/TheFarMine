# Cave Generation — The Three‑Wide Law and Singing Stone (Sprint 1)

Provenance
- Owner: @beta (World Generation — Deepdelver Caveborn)
- Voice: Deepdelver Caveborn — technical, seasoned, and fond of stone that sings when struck true.

Cross‑references
- docs/core-systems/ecs-architecture.md (§Tile, flags)
- docs/visual-systems/style-guide.md (§Three‑Wide door law, lighting)
- docs/technology-systems/crafting-design.md (§Hardness bands)
- docs/combat-systems/combat-design.md (§lane arcs ≤110°)
- data/visual/color-palette.json (mapping.* tokens)
- data/world/room-templates.json
- data/items/tools.json
- data/audio/sound-manifest.json (lamp/ambience triggers)

---

## 2) Goals & Non-goals (MVP)

Goals
- Deterministic generation: identical tiles for identical seeds and biome parameters.
- Readable three‑wide approaches: compliant with the Three‑Wide Law behind every door.
- Fast stamp‑and‑carve pipeline: target 10–20 ms @ 96×64 on mid‑tier desktop JS engine.
- Ore distribution that teaches tool gates (hardness 3/4/5/7).
- Lamp anchors for ambience and navigation rhythm.
- Enemy/lore hooks placed as lightweight anchors, not entities.

Non‑goals
- Multi‑level connectivity (no shafts to L2+).
- Dynamic cave collapse or real‑time terrain deformation.
- Biome blending or climate transitions within L1.

---

## 3) Map Space & Tile Palette (Authoritative)

Grid
- Dimensions: 96×64 tiles for Level 1 (L1). Origin at top‑left (x increases right, y increases down).

Tile types (authoritative enum for L1)
- rock
- floor
- ore.copper
- ore.iron
- ore.quartz

Hardness bands (authoritative for L1; see crafting-design.md)
- rock: 3
- ore.copper: 4
- ore.iron: 5
- ore.quartz: 7

Flags bitfield (names only; bit positions assigned in code per ecs-architecture.md)
- ROOM_FLOOR
- DOOR_BAND
- ORE_PREF
- LAMP_ANCHOR
- APPROACH3W_PROTECT

Door approach rule — The Three‑Wide Law
- Every door band must open into a straight, centered, 3×N lane of floor tiles behind it.
- N = biome.approachDepth (authoritative default in §13).
- Lane centerline aligns with the door band center; no turns within the first N tiles.

Palette handshake (visual tokens)
- rock → mapping.rock.base
- floor → mapping.floor.base
- ore.copper → mapping.ore.copper
- ore.iron → mapping.ore.iron
- ore.quartz → mapping.ore.quartz
- DOOR_BAND lanes may tint via mapping.floor.doorband overlay at render time.

---

## 4) Deterministic RNG Plan

Master seed
- 32‑bit int (signed in API, coerced to uint32 internally).

Substreams (creation order; names are canonical)
1) rng.rooms
2) rng.corridors
3) rng.ca
4) rng.ores
5) rng.lamps
6) rng.spawns

Construction
- Use splitmix32‑style stream splitting.
- Derive substream seeds by hashing master with unique constants:
  - subSeed[i] = SplitMix32(masterSeed ^ CONST[i]) where CONST[i] are fixed 32‑bit literals baked into code and versioned.
- Each substream implements nextUint32(), nextFloat01() with identical stepping across platforms.

Invariant
- Each stage consumes only its assigned substream.
- No cross‑stage random calls.
- Avoid data‑dependent iteration early‑outs that change RNG consumption order; isolate with local counters or dry‑run probes if necessary.

Golden stability
- Changing a stage must not change other stages’ outputs given fixed inputs.

---

## 5) High‑level Pipeline (Stages 0..8)

- Stage 0: Initialize grid to rock(hardness=3), flags=0; ingest biome parameters.
- Stage 1: Plan & stamp rooms from data/world/room-templates.json (rotations honored). Enforce: no overlap, exactly one door‑band per room, rock rim.
- Stage 2: Carve corridors between room door bands with Three‑Wide constraint; keep approachDepth straight before any turns; reserve DOOR_BAND and APPROACH3W_PROTECT.
- Stage 3: Cavern shaping via optional CA on cavern interiors only; mask protects Three‑Wide approaches.
- Stage 4: Floor finalization: normalize floors '.', door bands 'D'; verify closed rock rim.
- Stage 5: Ore vein seeding: prioritize 'O' ORE_PREF, then opportunistic rock; apply pedagogy gates.
- Stage 6: Lamp anchor placement: long corridors + cavern bellies by spacing; avoid door bands and spawn anchors.
- Stage 7: Spawn anchors: goblin and burrower candidates by biome weights and door distance heuristics; respect safety masks.
- Stage 8: Output assembly and hashes (via §12 meta plus §15 harness).

---

## 6) Room Stamp Contract (Stage 1)

Room template source
- File: data/world/room-templates.json (v1).
- MVP must include exactly three templates:
  - tunnel (linear, narrow)
  - cavern (belly)
  - ore_pocket (compact, ore‑pref spaces)
- Fields per template:
  - id:string
  - weight:number
  - rotate:[0|90|180|270] allowed rotations
  - grid: array of strings using legend:
    - '#': solid rock (explicit)
    - '.': floor
    - 'D': door band tiles (3‑wide or template‑defined width; straight and centered)
    - 'O': ore preference (ORE_PREF flag on rock)
    - ' ': void (ignored; treated as rock on stamp)
- Invariant: The interior directly behind each 'D' must contain ≥3 straight '.' tiles before any interior turn (template‑side contract).

Placement plan
- Attempt order:
  1) one tunnel
  2) one cavern
  3) one ore_pocket
  4) additional weighted picks until biome.roomBudget attempts are exhausted or no space remains.
- Rotations: uniformly from template.rotate with rng.rooms, weighted by template.weight at the template selection step (rotation is a separate uniform pick).
- Position sampling:
  - Sample (x,y) top‑left anchors within [1,1]..[w−tmplW−2, h−tmplH−2] to preserve a one‑tile rock rim.
  - AABB collision tested on non‑void ('#','.', 'D', 'O') cells.
- Collision & buffer:
  - AABB rejection if overlap with existing non‑rock tiles.
  - Buffer rule: maintain ≥1 rock tile between distinct rooms unless connected via a corridor. Enforcement: expand candidate AABB by 1 on all sides when checking against existing stamped room AABBs not earmarked for corridor union.
- Door metadata:
  - While stamping, collect per room: door { side: 'N'|'S'|'E'|'W', center:{x,y}, width:int }.
  - Enforce single door band per room (reject templates with multiple 'D' in MVP).
- Stamp effects:
  - '#',' ' → rock (hardness=3); clear flags.
  - '.' → floor; flags |= ROOM_FLOOR.
  - 'D' → floor; flags |= ROOM_FLOOR | DOOR_BAND.
  - 'O' → rock; flags |= ORE_PREF.
- Result contract: At least two successfully stamped rooms or abort with fallback (single start room + synthetic corridor stub to maintain playability).

Failure handling
- If roomBudget exhausted with <2 rooms placed, relax buffer to 0 for last two attempts; if still failing, place one minimal tunnel template at center.

---

## 7) Corridor Carving (Stage 2 — Three‑Wide)

Targets
- Connect all rooms by corridors into a single connected component (MST‑like greedy by distance between door centers).
- Input nodes: door band center points.

Planner
- Lattice: 4‑neighbor on grid cell centers, pruned to avoid map rim (keep one rock rim).
- Start/goal points snapped to door band centerlines.
- Cost:
  - Move straight (N,S,E,W): 1.0
  - Corner (turn between steps): corner penalty realized via A* with tie‑break; effective turn cost 1.4 by f=g+h with h=Manhattan and tie‑break factor.
- Approach constraint:
  - From both start and goal doors, disallow any change in heading until ≥ approachDepth tiles advanced into the interior direction defined by the door band normal.
- Reservation:
  - DOOR_BAND tiles and the first N=approachDepth tiles behind doors (APPROACH3W_PROTECT) are treated as reserved lanes; path may traverse them only in the forward direction (no lateral entry).
- Arc safety (combat design bridge):
  - Over any window of 3 carved center steps, the total heading bend must not exceed 110°. Reject candidates that violate; planner continues search.

Determinism
- A* open‑set tie‑break: sort by f then y then x (lexicographic). When exact ties remain, consult rng.corridors.nextUint32() % 2 to pick insertion order once per dequeue to maintain stability.

Carve
- Once a polyline path of center cells exists:
  - For each center step, stamp a corridor cross‑section 3‑wide perpendicular to the local tangent.
  - Stamp floor tiles (ROOM_FLOOR).
  - For first approachDepth behind each door, also set APPROACH3W_PROTECT flag on the 3‑wide lane.
  - Preserve rock rim: clamp carving to [1..w−2]×[1..h−2].

Jitter
- Lateral wiggle permitted only after 2×approachDepth from both ends:
  - Amplitude: biome.corridorJitter ∈ [0..1] interpreted as probability per 4th step to offset centerline ±1 orthogonal cell if arc safety holds.
  - No jitter inside rooms or through DOOR_BAND/APPROACH3W_PROTECT zones.

Fallback
- If A* fails within bounded iterations (e.g., 16k node expansions), attempt straight‑line Manhattan carve with the same Three‑Wide law; if still blocked, reroute via an intermediate waypoint chosen on grid midline with rng.corridors.

---

## 8) Cavern CA Pass (Stage 3)

Scope
- Apply only within cells that were '.' in cavern‑kind rooms at stamp time.
- Mask out:
  - DOOR_BAND
  - APPROACH3W_PROTECT
  - One‑tile safety rim from map edges

Neighborhood rule (5×5 Moore)
- Birth threshold: ≥ biome.ca.birth (default 14)
- Survive threshold: ≥ biome.ca.survive (default 12)
- Iterations: biome.ca.iterations (default 2–3)
- Interpretation: Count rock neighbors within 2‑tile radius window. For each cell:
  - If floor and rockNeighbors ≥ survive → remain floor; else become rock.
  - If rock and rockNeighbors < birth → become floor; else remain rock.

Guarantees
- Do not create paths that erase approach lanes.
- Do not breach map rim.
- After CA, re‑normalize DOOR_BAND and APPROACH3W_PROTECT flags where applicable.

---

## 9) Ore Vein Seeding (Stage 5)

Inputs (from biome)
- oreRates: { copper:pct, iron:pct, quartz:pct } as target proportions relative to total eligible rock.
- vein: { minLen, maxLen, branchChance }

Seeding candidates
- Priority 1: tiles flagged ORE_PREF.
- Priority 2: generic rock adjacent to ROOM_FLOOR (corridors/rooms), but not within approachDepth of any DOOR_BAND centerline, at a reduced probability.

Growth algorithm
- For each ore type in order [copper, iron, quartz]:
  - Determine target tile count = round(oreRates[type] × eligibleRockCount).
  - Loop seeds from prioritized candidates with rng.ores; for each seed:
    - Start vein with chosen ore type if local pedagogy gate passes (below).
    - Random walk:
      - Length L ~ Uniform[minLen..maxLen] via rng.ores.
      - Step to one of 4 neighbors favoring:
        - Along corridor flanks (cells adjacent to ROOM_FLOOR but not floor)
        - Along room walls beyond approachDepth
      - With probability branchChance, spawn a secondary walker at current tile with remaining budget L/2.
    - Carving rule: set tileType to ore.* only if current tile is rock; never overwrite floors.
    - Hardness: assign per §3.

Pedagogy gates (tool progression)
- copper (hardness 4):
  - Prefer within 8 tiles of DOOR_BAND centerlines and early corridors.
  - Upweight seeds with ORE_PREF near spawn‑adjacent rooms.
- iron (hardness 5):
  - Prefer deeper: Manhattan distance ≥ 10 from nearest DOOR_BAND centerline or off main lanes.
  - Suppress within approachDepth bands.
- quartz (hardness 7):
  - Rare and remote: enforce minimum distance ≥ 16 from any DOOR_BAND; bias toward cavern walls and dead‑end pockets.
- Global clamp: do not exceed 1.25× target per type; if underfilled after two passes, allow spillover from P2 seeds.

---

## 10) Lamp Anchors (Stage 6)

Corridor placement
- Traverse each corridor polyline.
- Place an anchor every S tiles along arclength where S ~ biome.lampSpacing ± 1 tile jitter via rng.lamps.
- Offset lateral position by ±1 from corridor centerline where possible to keep 3‑wide passable.
- Exclusions:
  - Not within approachDepth+1 of any door band.
  - Not on tiles flagged APPROACH3W_PROTECT.
  - Not within 3 tiles of another lamp anchor.

Room placement
- For cavern bellies (post‑CA) with area ≥ 25 floor tiles:
  - Place 1–2 anchors at local maxima of distance‑from‑wall (use 5×5 distance transform peaks).
  - Must be ≥ approachDepth+2 from any door band and ≥ 5 from corridor entries.

Output
- Emit anchors only (flags |= LAMP_ANCHOR, plus entry in anchors.lamps). Lighting sprites and audio cues are runtime.

Audio bridge
- Each placed LAMP_ANCHOR becomes an ambience trigger candidate:
  - sound-manifest.json key: ambience.lamp.crystal or ambience.lamp.coal per biome.
  - Triggered at runtime when lamp is lit or player within audible radius.

---

## 11) Spawn Anchors (Stage 7)

Goblin (corridor skirmisher)
- Habitat:
  - Prefers tunnels and corridors with small cover pockets (adjacent rock on ≥2 sides).
- Constraints:
  - Minimum distance from any door band center ≥ biome.spawn.minFromDoor.
  - Avoid tiles with LAMP_ANCHOR within 5 tiles.
- Placement:
  - Sample candidate ROOM_FLOOR tiles along corridors with rng.spawns and weight by cover (number of adjacent rocks).
  - Emit kindId = "goblin.miner" (example).

Burrower (cavern ambusher)
- Habitat:
  - Cavern floors near walls (distance‑to‑wall in [1..2]).
- Constraints:
  - Avoid LAMP_ANCHOR within 5 tiles.
  - Avoid APPROACH3W_PROTECT and DOOR_BAND completely.
- Placement:
  - Sample in cavern bellies with rng.spawns weighted by shadow (inverse local light proxy if available; else distance to lamp anchors).
  - Emit kindId = "burrower.stoneworm" (example).

Output contract
- Anchors only: anchors.spawns = [{x,y,kindId}]
- No entities spawned at gen time; runtime spawner owns lifecycle, difficulty, and population caps.

---

## 12) Outputs & API

Generator API (mirrors src/world/gen/generator.js)
- generateLevel({ seed:int, biomeId:string, width:int=96, height:int=64 }) → {
  tiles: TypedArray|FlatArray of per‑tile records { tileType, hardness, flags },
  meta: {
    biomeId,
    seed,
    dims: { w, h },
    rngPlan: {
      master:uint32,
      substreams:{ rooms:uint32, corridors:uint32, ca:uint32, ores:uint32, lamps:uint32, spawns:uint32 }
    },
    stats: { rooms:int, corridors:int, floors:int }
  },
  anchors: {
    lamps: [{ x:int, y:int }],
    spawns: [{ x:int, y:int, kindId:string }]
  },
  debug?: {
    corridors: [{ points: [{x:int,y:int}] }],
    rooms: [{ id:string, aabb:{x0,y0,x1,y1}, door:{ side, center:{x,y}, width:int } }]
  }
}

Tile write rules (authoritative)
- '.' → tileType=floor; hardness=0 (ignored by dig); flags |= ROOM_FLOOR
- 'D' → tileType=floor; flags |= DOOR_BAND | ROOM_FLOOR; plus APPROACH3W_PROTECT behind N tiles along lane
- 'O' → tileType=rock; flags |= ORE_PREF
- '#' or ' ' → tileType=rock; flags unchanged

Data handshake (ECS bridge)
- Tile record layout must match ecs-architecture.md §Tile:
  - Suggest packed struct per tile: u8 type, u8 hardness, u16 flags (or u32 flags per platform), row‑major.
- Color mapping via data/visual/color-palette.json mapping.* tokens per §3.

Hashes (reported via §15)
- meta includes rngPlan and dims used to derive the golden hash of tiles+flags.

---

## 13) Biome Parameters (Crystal Caverns defaults)

File: data/world/biome-crystal-caverns.json (expected fields)

| Field | Type | Default | Notes |
|---|---|---|---|
| id | string | "biome.crystal_caverns" | Stable id |
| name | string | "Crystal Caverns" | Display name |
| dims | {w:int,h:int} | {96,64} | L1 defaults |
| approachDepth | int | 3 | Three‑Wide depth N |
| roomBudget | int|min..max | 6..10 | Attempt range; clamp to grid size |
| corridorJitter | float | 0.25 | 0..1 amplitude |
| ca.iterations | int | 2 | Cavern CA passes |
| ca.birth | int | 14 | 5×5 birth threshold |
| ca.survive | int | 12 | 5×5 survive threshold |
| oreRates.copper | float | 0.045 | Fraction of eligible rock |
| oreRates.iron | float | 0.025 | Fraction of eligible rock |
| oreRates.quartz | float | 0.008 | Fraction of eligible rock |
| vein.minLen | int | 6 | Tiles |
| vein.maxLen | int | 18 | Tiles |
| vein.branchChance | float | 0.2 | 0..1 per step |
| lampSpacing.min | int | 8 | Corridor spacing lower bound |
| lampSpacing.max | int | 10 | Corridor spacing upper bound |
| spawn.weights.goblin | float | 1.0 | Relative to burrower |
| spawn.weights.burrower | float | 0.8 | Relative |
| spawn.minFromDoor | int | 6 | Tiles |
| audio.ambience | string | "biome.crystal.bed" | sound-manifest.json key |
| lore.tokens | string[] | ["lore.law.three_wide"] | For UI tips |

Computed runtime parameter
- lampSpacing draw: S ~ Uniform[ lampSpacing.min .. lampSpacing.max ] with rng.lamps per corridor segment.

---

## 14) Performance Plan

Complexity
- Room stamping: O(roomBudget × templateArea) with early reject via AABB.
- Corridors: A* over ≤ 96×64 nodes; edges ~ 4 per node; connections ≤ rooms−1.
- CA: masked over cavern interiors only; typical coverage 20–40% of map.
- Ores: number of seeds bounded by oreRates × rockCount; random walks capped by maxLen and branchChance.
- Anchors: linear scans of corridor polylines and cavern floor sets.

Allocation strategy
- Reuse:
  - One grid buffer for tileType
  - One for hardness
  - One for flags (u16/u32)
  - Scratch buffers: A* open/closed with pooling; CA double buffer over masked region only; distance fields local to rooms.
- Avoid per‑tile object creation; prefer typed arrays and integer encodings.

Guardrails
- A* node expansion cap (e.g., 20k) with fallback straight carve.
- CA early convergence check (no changes → break).
- Ore seeding two‑pass limit; bail after exceeding 1.25× target.
- Corridor jitter evaluated every 4th step only.

Targets
- 10–20 ms on 96×64 in Node/Chromium baseline; log stats.meta if exceeding 25 ms.

---

## 15) Determinism & Golden Hash Harness

Harness script contract
- File: scripts/worldgen-golden-harness.js
- Input: seed:int, biome JSON blob, width, height.
- Procedure:
  - Call generateLevel(...)
  - Extract tiles buffer + flags buffer, concatenate in row‑major order.
  - Compute SHA‑256 over the concatenated bytes.
  - Emit JSON: { seed, biomeId, dims, sha256, stats }
- CI:
  - Maintain golden hashes for 5 canonical seeds per biome (e.g., [1, 12345, 22222, 314159, 424242]).
  - Fail PR if any hash diverges unless intentionally updated with version bump.

Debug toggles
- --visualize=corridors,approach → dumps ASCII of paths and protected lanes.
- --dump-anchors → writes anchors JSON to tmp for inspection.

Versioning
- Any change to RNG consumption order or stage semantics requires incrementing a generator minor version noted in meta and updating goldens.

---

## 16) Acceptance Checklist

Functional
- Deterministic outputs for fixed seeds and params (goldens match).
- Every stamped room has exactly one door band; every door honors Three‑Wide approach of length N.
- Corridors are carved 3‑wide everywhere; no pinch points.
- CA modifies only cavern interiors and preserves approach lanes and rim.
- Ore seeding prioritizes ORE_PREF and respects pedagogy gates; no floors overwritten.
- Lamp anchors placed per spacing and exclusions; not within approach lanes.
- Spawn anchors respect habitat and distance constraints.

Integration
- API shape matches §12 and is consumable by ECS tile system.
- Tile flags conform to ecs-architecture.md; render uses palette tokens as mapped.
- Audio ambience triggers available via anchors and meta.biomeId.

Performance
- Generation within 10–20 ms average; spikes under 25 ms; stats logged.

Diagnostics
- Debug outputs available and stable; hashes reproducible.

---

## 17) Tuning Dials & Risks

Tuning dials
- approachDepth: 3–5
- lampSpacing: 7–11 (min/max bounds)
- vein length: ±30% via minLen/maxLen
- CA thresholds: birth/survive and iterations
- corridorJitter amplitude: 0..0.4 typical

Risks
- A* performance under dense obstacles (mitigate with caps and fallback).
- RNG substream misuse causing golden drift (enforce code review checklist).
- Overfilling ores near doors (monitor target clamps and pedagogy weights).
- CA eroding intended combat lanes if masks misapplied.

---

## 18) Worked Example (Seed Walkthrough)

Seed: 12345, Biome: Crystal Caverns (defaults)

Sketch grid fragment (not to scale):
- Legend: '#' rock, '.' floor, 'D' door band, '≈' corridor floor, '░' APPROACH3W_PROTECT, 'O' ore pref, '✦' lamp anchor

1) Rooms stamped (Stage 1)
- Tunnel (rot 0) at y≈20:
  DDD...
  ...###
- Cavern (rot 90) at y≈35; door band on north wall:
  ###DDD###
  ##.....##
  ##..O..##
  ##.....##
  #########
- Ore pocket near x≈70 with O sprinkled inside rock.

2) Corridor planned (Stage 2)
- Connect tunnel.D → cavern.D
- A* path straight south for N=3 (Three‑Wide), then gentle east bend (≤110°).
- Carved 3‑wide; first 3 tiles behind each door flagged APPROACH3W_PROTECT.

ASCII slice (centerline only for clarity):
  y=20  ...DDD░░░≈≈≈≈≈≈≈
  y=21      ...░░░≈≈≈≈≈≈≈
  y=22      ...░░░≈≈≈≈≈≈≈
                        ↓
  y=35            ###DDD░░░.....

3) CA (Stage 3)
- Applied inside cavern belly; door band and approach lanes untouched.
- Edges softened; belly remains contiguous.

4) Floors finalized (Stage 4)
- All intended floors are '.'; door bands 'D'; rim is intact.

5) Ores (Stage 5)
- Seed copper near corridor walls within 8 tiles of doors.
- Iron deeper into belly sides; quartz one rare vein at far south wall.
- No floor overwrites.

6) Lamps (Stage 6)
- Corridor spacing S~9: one lamp roughly every 9 tiles, offset ±1.
- Cavern gets 2 anchors at distance‑from‑wall peaks.
- Example anchors:
  - Corridor at (x≈44,y≈28): ✦
  - Cavern at (x≈60,y≈37): ✦

7) Spawns (Stage 7)
- Goblin anchor along corridor near a cover pocket (adjacent rock on two sides), ≥6 tiles from doors.
- Burrower near cavern wall, ≥5 tiles from any lamp.

Result
- meta.stats: rooms=3, corridors=1, floors≈900 (example)
- rngPlan seeds recorded; SHA‑256 computed over tiles+flags.

---

## 19) Integration Notes

ECS tile write order
- Initialize arrays (tileType, hardness, flags) → Stage writes in order 0..7.
- After each stage that mutates tiles, update flags immediately to keep later stages mask‑correct (especially APPROACH3W_PROTECT before CA and ores).

Render minimap tokens
- Map tileType to palette tokens:
  - rock → mapping.rock.minimap
  - floor → mapping.floor.minimap
  - ore.* → mapping.ore.minimap
  - DOOR_BAND overlay tint via mapping.floor.doorband.minimap
- Lamps: minimap ping when runtime lamp entity spawns; anchors alone are not lit.

Audio ambience triggers
- On level load: start biome bed track from sound-manifest.json using meta.biomeId → audio.ambience.
- On lamp activation near anchors: trigger ambience.lamp.* one‑shots or loops per biome.

Lore hooks
- Expose lore tokens via meta or a side‑channel: ["lore.law.three_wide"] so UI can hint “The stone respects three‑wide ways.”

Bridges and data handshakes
- tools.json: ensure hardness gates align with 3/4/5/7 to teach pick tiers.
- combat-design.md: corridor arcs adhere to ≤110° local bends for fair lane fights.
- style-guide.md: Three‑Wide door law enforced; lighting cadence respects spacing.

The stone is set, the lanes are sung: three wide for welcome, and deeper for the daring.