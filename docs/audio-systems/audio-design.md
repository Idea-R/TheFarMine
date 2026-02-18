# Audio System — Beds, Bells, and Brass (Sprint 1)

Provenance
- Owner: @zeta (Audio Systems — Echoheart Bellowsong)
- Voice: Echoheart Bellowsong — pragmatic, musical, and engine-facing

Cross-references
- data/audio/sound-manifest.json
- docs/core-systems/ecs-architecture.md (§Systems order, AudioEventBridge)
- docs/combat-systems/combat-design.md (§Events)
- docs/technology-systems/crafting-design.md (§Events & UI sounds)
- docs/world-generation/cave-gen-algorithm.md (§Audio ambience triggers)
- docs/visual-systems/style-guide.md (§Telegraph visuals)
- forthcoming docs/audio-systems/music-direction.md


## 2) Goals & Non-goals (MVP)

Goals
- Route domain events → sound-manifest ids deterministically
- Simple mixer with 4 buses (Music, Ambience, SFX, UI) and sidechain ducking
- Depth-aware ambience layering for Crystal Caverns
- Basic 2D spatialization for SFX
- Hysteresis rules for music/ambience state changes
- Clear priority/voice-stealing policy

Non-goals
- Realtime convolution/IR reverb
- Dynamic occlusion/early reflections
- Adaptive mixing per-loudness normalization
- VO pipeline


## 3) Mixer Topology & Buses

Authoritative bus graph
- Master → [Music, Ambience, SFX, UI]

Default faders (linear gain)
- Music = 0 dB (1.00)
- Ambience = −2 dB (≈0.79)
- SFX = 0 dB (1.00)
- UI = −3 dB (≈0.71)

Per-bus limiters (soft-knee, lookahead-free)
- Master: ceiling −0.8 dBFS, threshold −4 dB, ratio 8:1, attack 5 ms, release 120 ms
- Music: threshold −3 dB, ratio 4:1, attack 10 ms, release 180 ms
- Ambience: threshold −4 dB, ratio 3:1, attack 12 ms, release 220 ms
- SFX: threshold −3 dB, ratio 6:1, attack 3 ms, release 140 ms
- UI: threshold −3 dB, ratio 3:1, attack 2 ms, release 100 ms

Sidechain ducking
- SFX sends to duck Music; optional light send to Ambience
- Music duck envelope: attack 18 ms, release 280 ms
- Ambience duck envelope: attack 24 ms, release 220 ms
- UI never ducks Music/Ambience and is never ducked

Ducking law (authoritative)
- Each SFX play may specify duckSend.music ∈ [0..1] and duckSend.ambience ∈ [0..1] in the manifest (or default from routing rules below)
- Per frame: effectiveDuck = min(1.0, Σ activeSend_i • env_i), where env_i is the per-sound detector envelope (attack/release above)
- Convert effectiveDuck to gain:
  - MusicGain = 10^((−8 dB × effectiveDuck)/20)  // full duck = −8 dB
  - AmbGain = 10^((−3 dB × effectiveDuck)/20)   // full duck = −3 dB
- Detector is fed by SFX post-gain, pre-limiter

Default duckSend guidance (manifest or router)
- Whooshes (telegraphs/swings): music 0.15, amb 0.0
- Mining hit/progress: music 0.25, amb 0.1
- Mining break: music 0.50, amb 0.15
- Parry success: music 0.40, amb 0.10
- UI: 0.0 to both
- Cap effective duck to 1.0 (sum across simultaneous SFX)


## 4) Priority Ladder & Voice Management

Priority range: 0..100

Rungs (authoritative anchors)
- Ambience: 10–20 (beds and layers)
- UI: 25–35
- Telegraph/Swing: 38–45
- Mining Hits: 50
- Block: 58
- Breaks: 60–62
- PoiseBreak: 72
- Parry: 80
- Music: 88–90

Global per-bus caps (hard)
- Ambience: 4
- SFX: 24
- UI: 6
- Music: 2 (supports crossfade)

Per-asset caps
- Honor manifest maxVoices (e.g., mining.Progress.* maxVoices=3–4; combat.Swing.light maxVoices=3; parry success maxVoices=1)

Voice stealing (authoritative)
- If bus cap reached or asset exceeds maxVoices:
  1) Steal lowest-priority voice on that bus
  2) Tie-breaker: oldest (longest playing) first
  3) If same asset id over maxVoices, prefer self-steal among same-id instances
- Steal fade-out: 20 ms linear to zero, then stop

Cooldown/debounce
- Per-triggerKey defaults (override in manifest if needed)
  - mining.Progress.*: minIntervalMs = 45
  - combat.Swing.light whoosh: minIntervalMs = 120
  - mining.Swing.* whoosh: minIntervalMs = 120
  - Hits (combat or mining progress tick): minIntervalMs = 50
  - Block/Parry: minIntervalMs = 80
  - UI click/confirm/error: minIntervalMs = 30
- Per-emitter local cooldown: 40 ms (prevents machine-gun duplicates from the same entity/source)


## 5) Spatialization Policy (2D)

- Panning: linear pan in [−1..+1] from camera center X
  - pan = clamp((x − cam.cx) / panRadiusPx, −1, +1)
  - panRadiusPx = cam.w / 2 by default
- Attenuation: inverse-lerp over radius
  - dist = distance2D({x,y}, {cam.cx, cam.cy})
  - near = 64 px, far = 320 px
  - t = clamp((dist − near)/(far − near), 0..1)
  - gain = 1 − t
- Non-spatial SFX (spatialized=false) floor at 0.2 gain when position unavailable; otherwise apply manifest.defaultGain
- Z-depth: not used in MVP; future hook reserved
- Stereo assets flagged loop=true are not spatialized; play centered at bus level

Emitter API notes (to mirror in src/audio/audio-system.js)
```ts
interface Vec2 { x:number; y:number; }
interface Camera { cx:number; cy:number; w:number; h:number; }

function computePanAtten(pos:Vec2, camera:Camera): { pan:number; gain:number };

function playOneShot(id:string, opts?: PlayOpts): void;
function startLoop(id:string, opts?: PlayOpts): void;     // starts if not already running
function stopLoop(id:string): void;
function ensureLoop(id:string, opts?: PlayOpts): void;    // idempotent start; no stacking

interface PlayOpts {
  x?:number; y?:number;              // world position
  pan?:number;                       // override pan
  volMul?:number;                    // multiply manifest gain
  pitchVarCents?:number;             // ± range; default depends on category
  entityId?:number;                  // for cooldown scoping and spatial source lookup
}
```


## 6) Event Bridge — Domain Events → triggerKey Routing (Authoritative)

Consumption rules
- Subscribe to ECS/EventBus after physics and animation cues (see docs/core-systems/ecs-architecture.md §Systems order, AudioEventBridge)
- Map domain event name and payload shape to a manifest triggerKey (id) and bus
- Apply cooldowns (global + per-triggerKey + per-entity)
- Determine spatialization (manifest flag + entity/world position if available)

Mappings (payload shapes and routing)
- mining.Swing { toolKind:"pick"|"drill" } → mining.Swing.pick | mining.Swing.drill
- mining.Progress { tileType:"rock"|"ore.copper"|"ore.iron"|"ore.quartz" } → mining.Progress.rock | mining.Progress.ore.copper | mining.Progress.ore.iron | mining.Progress.ore.quartz
- mining.Break { tileType:"rock"|"ore" } → mining.Break.rock | mining.Break.ore
- mining.Deny { reason:"insufficient_power"|"no_stamina"|"out_of_range" } → mining.Deny.insufficient_power | mining.Deny.no_stamina | mining.Deny.out_of_range (SFX bus; not UI)
- combat.TelegraphStart { attackerId, attackId, arcDeg, rangePx, flashAtMs } → combat.TelegraphStart
- combat.Swing.light (from timing or animation cue if present) → combat.Swing.light
- combat.Hit { wasBlocked:boolean, wasParried:boolean } →
  - if wasParried: combat.Parry.success
  - else if wasBlocked: combat.Block.impact
  - else: combat.Hit.light
- poise.Break { entityId, breakMs } → poise.Break
- enemy.goblin.vocal / enemy.burrower.surface → enemy.goblin.vocal | enemy.burrower.surface (1:1 ids)
- crafting.Complete { ... } → ui.craft.complete
- ui.click | ui.confirm | ui.error → ui.click | ui.confirm | ui.error (1:1 ids)
- scene.biome.enter.crystal_caverns → amb.biome.crystal_caverns.base.loopA (start bed)
- ambience.scheduler.drip.sparse → amb.layer.drip.sparse.loop (ensureLoop)
- ambience.layer.near_lamp → amb.layer.steam.near_lamp.loop (ensureLoop while any lamp visible)
- ambience.layer.depth_resonance → amb.layer.crystal.resonance.loop (ensureLoop)
- scene.enter.tavern → amb.tavern.loopA (ensureLoop) and MusicController.setState('Tavern') per music-direction

Quick-reference table
| Event name | Condition/payload | Manifest id (triggerKey) |
|---|---|---|
| mining.Swing | toolKind="pick" | mining.Swing.pick |
| mining.Swing | toolKind="drill" | mining.Swing.drill |
| mining.Progress | tileType="rock" | mining.Progress.rock |
| mining.Progress | tileType="ore.copper" | mining.Progress.ore.copper |
| mining.Progress | tileType="ore.iron" | mining.Progress.ore.iron |
| mining.Progress | tileType="ore.quartz" | mining.Progress.ore.quartz |
| mining.Break | tileType="rock" | mining.Break.rock |
| mining.Break | tileType="ore" | mining.Break.ore |
| mining.Deny | reason="insufficient_power" | mining.Deny.insufficient_power |
| mining.Deny | reason="no_stamina" | mining.Deny.no_stamina |
| mining.Deny | reason="out_of_range" | mining.Deny.out_of_range |
| combat.TelegraphStart | any | combat.TelegraphStart |
| combat.Swing.light | any | combat.Swing.light |
| combat.Hit | wasParried=true | combat.Parry.success |
| combat.Hit | wasParried=false, wasBlocked=true | combat.Block.impact |
| combat.Hit | both false | combat.Hit.light |
| poise.Break | any | poise.Break |
| enemy.goblin.vocal | any | enemy.goblin.vocal |
| enemy.burrower.surface | any | enemy.burrower.surface |
| crafting.Complete | any | ui.craft.complete |
| ui.click | any | ui.click |
| ui.confirm | any | ui.confirm |
| ui.error | any | ui.error |
| scene.biome.enter.crystal_caverns | enter biome | amb.biome.crystal_caverns.base.loopA |
| ambience.scheduler.drip.sparse | tick | amb.layer.drip.sparse.loop |
| ambience.layer.near_lamp | any lamp visible | amb.layer.steam.near_lamp.loop |
| ambience.layer.depth_resonance | enabled in biome | amb.layer.crystal.resonance.loop |
| scene.enter.tavern | enter scene | amb.tavern.loopA (+ music.tavern state) |


## 7) Ambience Layering & Depth Mix

Crystal Caverns bed (authoritative)
- amb.biome.crystal_caverns.base.loopA always on while player is in biome
- Target balance: −4 dB integrated vs typical SFX activity (ears above the bed, not below)

Layers
- Drip sparse
  - Source: AmbienceScheduler fires ambience.scheduler.drip.sparse at 18–28 s intervals with ±3 s jitter on start/stop boundaries
  - Route to amb.layer.drip.sparse.loop; very quiet under bed (−8 dB vs bed)
- Steam hiss near lamps
  - Source: world-gen anchors.lamps (docs/world-generation/cave-gen-algorithm.md)
  - MVP: single non-spatial loop amb.layer.steam.near_lamp.loop when any lamp is visible within camera bounds; off when none visible for 1.2 s (grace off)
- Crystal resonance
  - amb.layer.crystal.resonance.loop is enabled continuously while in caverns
  - Apply EQ shaped by depthMix: low-shelf + LPF

Depth scalar (depthMix)
- Definition: depthMix ∈ [0..1], 0 = entrance/top, 1 = deepest/bottom
- MVP derivation (single-level): depthMix = clamp01((camera.cy − mapTopY) / (mapBottomY − mapTopY))
  - mapTopY and mapBottomY provided by Scene; if absent, assume [0..mapHeightPx] in world coords
- Override hook: World/Scene may set depthMix directly (e.g., multi-layer caverns, elevators)

Depth-driven processing (applied at layer and bus)
- Crystal resonance EQ
  - Low-shelf @ 200 Hz: gain_shelf(d) = lerp(+0 dB, +4 dB, d)
  - LPF cutoff: f_c(d) = lerp(8000 Hz, 2200 Hz, d); Q = 0.707
- Ambience bus tilt (broad air change)
  - High-shelf @ 5.5 kHz: gain_air(d) = lerp(0 dB, −3 dB, d)
  - Apply at Ambience bus after per-layer processing


## 8) Music & Hysteresis Hooks (overview)

States (see details in music-direction.md)
- Tavern
- MineIdle
- MineEngaged (light combat)
- MineIntense (stacked threats)

Hysteresis and triggers (authoritative)
- Downshift (e.g., Intense → Engaged → Idle): require musicStateMinHoldMs = 4000 (4 s) with no qualifying upshift triggers
- Upshift
  - Immediate (gate: 1.5 s sustained) when enemy proximity or threat index ≥ threshold, or upon combat.Hit event while enemies nearby
  - music-direction.md defines thresholds and exact ids (music.*)
- Alignment
  - If music tempo/bar provided: align layer toggles and crossfades to next bar boundary
  - If unknown: use fade windows 300–500 ms depending on delta state (shorter for Idle→Engaged, longer for Engaged→Intense)
- Crossfade via Music bus (cap 2 voices); sidechain duck from SFX remains active


## 9) Runtime Contracts & APIs to Implement (src/audio/audio-system.js)

Modules and responsibilities

- ManifestLoader
  - Parse data/audio/sound-manifest.json; validate ordered keys; expose lookup by id
  - Validate presence of: id, bus, gain, priority, maxVoices, spatialized, loop, tags?, duckSend defaults?
```ts
interface ManifestEntry {
  id:string;
  bus:'Music'|'Ambience'|'SFX'|'UI';
  gain:number;                 // linear
  priority:number;             // 0..100
  maxVoices?:number;           // default 1 if loop, 3 if one-shot unless overridden
  spatialized?:boolean;        // default true for SFX, false for Music/UI
  loop?:boolean;
  pitchVarCentsDefault?:number;// e.g., 30 for swings/hits, 0 for UI
  duckSend?: { music?:number; ambience?:number }; // 0..1
  cooldownMs?:number;          // per-triggerKey override
}
class ManifestLoader {
  load(path:string): Promise<void>;
  get(id:string): ManifestEntry|undefined;
  has(id:string): boolean;
  allIds(): string[];
}
```

- Buses/Mixer
  - Create 4 buses with gain nodes; parent to Master; implement per-bus limiter and global Master limiter
  - Implement sidechain duck aggregation from SFX to Music/Ambience
```ts
type BusName = 'Master'|'Music'|'Ambience'|'SFX'|'UI';
class Mixer {
  setBusGain(bus:Exclude<BusName,'Master'>, linear:number): void;
  setMasterGain(linear:number): void;
  getBusNode(bus:Exclude<BusName,'Master'>): AudioNode;  // for diagnostics
  setDuckSends(musicDepth:number, ambienceDepth:number): void; // 0..1, post-aggregated
}
```

- Emitter
  - One-shots, loops, ensureLoop semantics (idempotent)
  - Pitch variation defaults: swings/hits ±30 cents; UI = 0 cents
```ts
function playOneShot(id:string, opts?:PlayOpts): void;
function startLoop(id:string, opts?:PlayOpts): void;
function stopLoop(id:string): void;
function ensureLoop(id:string, opts?:PlayOpts): void;
```

- Event Handlers (AudioEventBridge)
  - Subscribe to EventBus; map payloads per §6; apply cooldowns; choose spatialization; assign priority and duckSend from manifest or defaults
```ts
function onEvent(name:string, payload:any): void;
```

- VoiceMgr
  - Enforce per-asset maxVoices and per-bus caps; implement priority ladder and steal policy
```ts
class VoiceMgr {
  canPlay(id:string, bus:BusName, priority:number, entityId?:number): boolean;
  registerPlay(id:string, bus:BusName, priority:number, entityId?:number): void;
  activeCount(bus:BusName): number;
}
```

- AmbienceScheduler
  - Drip/steam/resonance enable/disable; depthMix update hook
```ts
class AmbienceScheduler {
  setBiome(biomeId:string|undefined): void;
  setDepthMix(d:number): void;              // 0..1
  tick(dtMs:number): void;                  // schedule drip intervals and visibility polls
  setLampVisibility(anyVisible:boolean): void;
}
```

- MusicController
  - Start/stop themes, manage layers, crossfades; expose setState(state) used by higher-level Director
```ts
type MusicState = 'Tavern'|'MineIdle'|'MineEngaged'|'MineIntense';
class MusicController {
  setState(s:MusicState): void;
  getState(): MusicState;
  setTempoInfo(bpm?:number, beatsPerBar?:number): void;
}
```

- Utility (Spatial)
```ts
function computePanAtten(pos:Vec2, camera:Camera): { pan:number; gain:number };
```


## 10) Parameter Targets & Tuning Dials

Mining cadence
- mining.Swing.* whoosh arrives ≈40 ms before active mining window
- mining.Progress.* hits land on each progress tick; default volMul 0.80
- mining.Break.* sharper transient; slightly louder than progress; default volMul 0.90; duckSend.music = 0.50 (light duck), duckSend.ambience = 0.15

Combat feel
- combat.TelegraphStart whoosh quiet: −8 dB relative to combat.Hit.light (set manifest gain or runtime volMul ≈0.40 if hit is 1.00)
- combat.Parry.success: bright, high priority (80), short pre-delay; duckSend.music = 0.40
- combat.Block.impact: shorter tail than hit, slightly lower than hit (volMul ≈0.85 of hit)
- combat.Hit.light: full body; priority ~64; pitchVarCents default ±25 cents

Global dials (centralized constants)
- whooshVarCents = ±40
- hitVarCents = ±25
- minIntervalMs per event as in §4 defaults
- Global SFX headroom = 6 dB (keep integrated mix below Master ceiling)
- Ambience spectral tilt follows depthMix (see §7); verify speech/intellegibility (UI) remains clear


## 11) Data Validations & Acceptance

Manifest id validation (startup)
- All ids referenced in this doc must exist in data/audio/sound-manifest.json:
  - mining.Swing.pick, mining.Swing.drill
  - mining.Progress.rock, mining.Progress.ore.copper, mining.Progress.ore.iron, mining.Progress.ore.quartz
  - mining.Break.rock, mining.Break.ore
  - mining.Deny.insufficient_power, mining.Deny.no_stamina, mining.Deny.out_of_range
  - combat.TelegraphStart, combat.Swing.light, combat.Hit.light, combat.Block.impact, combat.Parry.success
  - poise.Break
  - enemy.goblin.vocal, enemy.burrower.surface
  - ui.craft.complete, ui.click, ui.confirm, ui.error
  - amb.biome.crystal_caverns.base.loopA, amb.layer.drip.sparse.loop, amb.layer.steam.near_lamp.loop, amb.layer.crystal.resonance.loop
  - amb.tavern.loopA and music.* ids per music-direction.md
- TriggerKey strings align exactly with manifest ids (case- and dot-precise)
- Mixer/bus names match manifest bus fields: 'Music'|'Ambience'|'SFX'|'UI'

Acceptance checklist
- Event → triggerKey mappings cover MVP events from combat/crafting/mining exactly as in §6
- DepthMix policy defined and implementable; override hook exposed (AmbienceScheduler.setDepthMix)
- Priority ladder, ducking policy, and voice caps implemented and consistent with manifest priorities/maxVoices
- API surface for src/audio/audio-system.js is explicit; functions callable in isolation for tests
- Sidechain duck aggregation sums sends and caps at 1.0; attack/release match §3


## 12) Testing Plan

Unit tests
- Event mapping matrix
  - Given each event shape in §6, verify resolved manifest id and bus
  - Verify combat.Hit routing precedence: parry overrides block overrides light
- Music hysteresis
  - Upshift when proximity sustained ≥1.5 s; downshift only after ≥4 s without triggers
  - Bar-align stub: with bpm/beat info, schedule next-bar transition; without, use 300–500 ms fade
- Voice stealing
  - Overfill SFX with mixed priorities; assert lowest-priority oldest is stolen
  - Exceed per-asset maxVoices; assert self-steal among same-id first
- Loop idempotency
  - ensureLoop twice does not stack voices; stopLoop halts exactly one logical loop instance
- Duck aggregation
  - Multiple concurrent SFX with duckSend present; verify sum capped to 1.0 and correct Music/Ambience gain

Sandbox manual (debug scene)
- Spawn Crystal Caverns with lamp anchors visible; observe:
  - amb.biome.crystal_caverns.base.loopA persistent
  - amb.layer.steam.near_lamp.loop toggles with camera framing
  - amb.layer.crystal.resonance.loop EQ shifts when moving vertically (depthMix)
- Mining: swing pick vs rock and each ore; hear whoosh early, progress ticks, breaks louder; verify light music duck on break
- Combat: goblin and burrower encounters; telegraph whoosh quiet; block vs parry distinction; poise break cuts through
- Crafting: ui.craft.complete on completion; UI clicks/confirm/error route to UI bus
- Check mixer meters: SFX ducking Music on heavy action; UI never ducks and is never ducked


## 13) Quick Reference (1-page engineer cheat)

- mining.Swing.pick → SFX prio 42 id=mining.Swing.pick (duck M 0.15)
- mining.Swing.drill → SFX prio 44 id=mining.Swing.drill (duck M 0.15)
- mining.Progress.rock → SFX prio 50 id=mining.Progress.rock (cooldown 45 ms)
- mining.Progress.ore.copper → SFX prio 50 id=mining.Progress.ore.copper
- mining.Progress.ore.iron → SFX prio 50 id=mining.Progress.ore.iron
- mining.Progress.ore.quartz → SFX prio 50 id=mining.Progress.ore.quartz
- mining.Break.rock → SFX prio 61 id=mining.Break.rock (volMul 0.90, duck M 0.50)
- mining.Break.ore → SFX prio 62 id=mining.Break.ore (volMul 0.90, duck M 0.50)
- mining.Deny.insufficient_power → SFX prio 32 id=mining.Deny.insufficient_power
- mining.Deny.no_stamina → SFX prio 32 id=mining.Deny.no_stamina
- mining.Deny.out_of_range → SFX prio 32 id=mining.Deny.out_of_range
- combat.TelegraphStart → SFX prio 40 id=combat.TelegraphStart (−8 dB target)
- combat.Swing.light → SFX prio 45 id=combat.Swing.light (whooshVar ±40c)
- combat.Hit.light → SFX prio 64 id=combat.Hit.light (hitVar ±25c)
- combat.Block.impact → SFX prio 58 id=combat.Block.impact (short tail)
- combat.Parry.success → SFX prio 80 id=combat.Parry.success (bright; duck M 0.40)
- poise.Break → SFX prio 72 id=poise.Break
- enemy.goblin.vocal → SFX prio 36 id=enemy.goblin.vocal
- enemy.burrower.surface → SFX prio 38 id=enemy.burrower.surface
- ui.click → UI prio 30 id=ui.click (no var)
- ui.confirm → UI prio 32 id=ui.confirm (no var)
- ui.error → UI prio 35 id=ui.error (no var)
- ui.craft.complete → UI prio 34 id=ui.craft.complete
- amb.biome.crystal_caverns.base.loopA → Ambience prio 12 id=amb.biome.crystal_caverns.base.loopA
- amb.layer.drip.sparse.loop → Ambience prio 14 id=amb.layer.drip.sparse.loop
- amb.layer.steam.near_lamp.loop → Ambience prio 16 id=amb.layer.steam.near_lamp.loop
- amb.layer.crystal.resonance.loop → Ambience prio 18 id=amb.layer.crystal.resonance.loop
- amb.tavern.loopA → Ambience prio 12 id=amb.tavern.loopA
- music.* themes → Music prio 88–90 id=music.(Tavern|MineIdle|MineEngaged|MineIntense) (2-voice crossfade)


---

Until the brass swells and the pick sings, I’ll keep the buses tidy and the beats on time. Echoheart out.