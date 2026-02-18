# The Far Mine — Audio System & Sound Design (Sprint 1)

Author: Echoheart Bellowsong (Zeta)  
Version/Date: v0.1 — 2026-02-18  
Status: Draft v0.1

Scope: Mine L1 vertical slice; MVP pillars, event map, bus/mix diagram (described in text), top-10 SFX with placeholder sources, toolchain notes. Aligns to P4 contracts and Alpha/Gamma/Beta docs.

---

## 1) Audio Pillars & Style Notes

- Deepsong as ambience bed
- Labor rhythm (pickaxe) as meter
- Brass warmth vs crystal cool
- Readable telegraphs over mix
- Dynamic depth (ambient density by y-depth)

Stylistic palette:
- Materials: rock, copper, brass, crystal.
- Instrument colors: hammered dulcimer (percussive tone bed), brass (mellow/warm stabs), bellows/air (pressure and life).
- L1 caverns space: early reflections present, tail T60 ≈ 1.2–1.8 s, pre-delay 10–20 ms, darker high end below 6–8 kHz; spots (lamps/crystals) are close-miked/drier to read over bed.

---

## 2) Mix & Bus Diagram (Text Description)

Signal graph:
- Master
  - Music
  - Ambience
    - BedLoop
    - Spots
  - SFX
    - Mining
    - Combat
    - Movement
    - Foley
  - UI

Default gains (subject to tuning): Master 0 dB; Music −4 dB; Ambience −6 dB (BedLoop −7 dB, Spots −5 dB); SFX −3 dB (Mining −2 dB, Combat −2 dB, Movement −3 dB, Foley −4 dB); UI −6 dB.

Ducking rules (side-chain):
- Combat → Music: −3 dB during telegraph/hit windows; attack 40 ms, release 180 ms.
- UI → Ambience: −2 dB momentary; attack 10 ms, release 80 ms.
- Mining bursts → Ambience.Spots: −1 dB; attack 20 ms, release 120 ms.

Polyphony/priority targets (MVP):
- Global voice cap ≈ 24.
- Per-bus caps: SFX 12; Ambience 6; Music 2; UI 4.
- Priority tiers:
  - Critical: UI accept/cancel, combat telegraph, poise_break.
  - High: mining break, combat hits, ore pickup.
  - Normal: mining hits, footsteps, ambience spots.
  - Low: redundant footsteps, distant spots.
- Steal policy: oldest-lowest-priority first; if tie, lowest remaining duration.

Spatialization (engine-agnostic):
- 2D panning by x using equal-power law; pan range −1.0 (L) to +1.0 (R).
- Distance rolloff (linear): full volume within 1 m; fade to −12 dB at 20 m; hard-cull at 30 m (unless Critical).
- Depth scalar (0..1) influences Ambience:
  - BedLoop mix: +0 to +2 dB low shelf below 200 Hz as depth→1.
  - Global ambience low-pass: cutoff ≈ lerp(6 kHz @ depth 0, 2.5 kHz @ depth 1).

---

## 3) Event Map (ECS → Audio Trigger Keys)

Mapping table structure:
{ eventType, payloadFields, triggerKey, rateLimit/cooldown, spatial:boolean, notes }

Conventions:
- ECS events end with Event (exact token casing).
- Component/material tokens use snake_case (e.g., rock, crystal_lamp).
- triggerKey tokens are dot-scoped, lowercase.

UI:
- { UiCommandEvent, { action }, ui.click/ui.open/ui.close/ui.accept/ui.cancel, 50 ms per emitter, spatial:false, Map action to key; accept/cancel on confirm/escape. }
- { InventoryMoveEvent, { from,to }, ui.move, 80 ms per emitter, spatial:false, Quiet cue; drop uses ui.drop. }

Mining:
- { MineHitEvent, { pos, tool, power, material }, sfx.mining.hit.<material>.<intensity>, 40 ms per-emitter per-material, spatial:true, intensity from power−hardness bands (see §5). }
- { MineBreakEvent, { pos, tool, material }, sfx.mining.break.<material>, 120 ms per-emitter per-material, spatial:true, Emitted when hardness threshold crossed. }
- { InventoryChangeEvent, { item, delta }, sfx.pickup.ore, 100 ms per entity, spatial:false, Only for ore-class items (tagged ore). }

Movement:
- { FootstepEvent, { entity, material, pos? }, sfx.footstep.<material>, 220–280 ms per-entity, spatial:true, Alternate variants; randomize ±4% pitch. }

Combat:
- { TelegraphStartEvent, { archetype, pos? }, sfx.combat.telegraph.<archetype>, once per attack_id per phase, spatial:true, Critical priority; start of red-alert window. }
- { DamageEvent, { target_faction, amount, pos? }, sfx.combat.hit.<flesh|goblin|stone>, 50 ms per source, spatial:true, Select by target/material; amount bands map variants. }
- { PoiseBreakEvent, { entity, pos? }, sfx.combat.poise_break, 1 s per-entity, spatial:true, Critical stinger; one-shot. }
- { HitStopEvent, { duration_ms }, sfx.combat.hitstop, 150 ms per-emitter, spatial:false, Optional MVP OFF by default; toggleable. }

Ambience:
- { DepthStateEvent, { depth_scalar, mood }, amb.bed.l1.loop, 2.5 s min between changes, spatial:false, Crossfade variants by depth/mood. }
- { SoundEmitterProximityEvent, { kind:lamp|crystal, pos }, amb.spot.<kind>, 300 ms per-emitter, spatial:true, Loop start/stop based on proximity. }

Free trigger:
- { PlaySfxEvent, { tag, pos?, priority? }, <tag>, none, spatial:pos!=null, Direct pass-through to manifest id. }

---

## 4) Trigger Rules & Rate Limits

- Cooldowns/clustering:
  - Mining: 40 ms cooldown per-emitter per-material; cluster hits within 25 ms collapse to one with +1.5 dB gain (cap at −6 dBFS).
  - Footsteps: 200–260 ms per-entity; randomize interval within range for gait variance.
  - Telegraph: one-shot per attack_id per phase; re-allow on phase advance or cancel.
  - PoiseBreak: 1 s gate per entity.
- Intensity selection:
  - Mining intensity bands (power − hardness_ratio):
    - light < 0.3 → .light
    - 0.3–0.7 → .med
    - > 0.7 → .heavy
  - Damage amount bands (normalized 0..1 of target HP):
    - light < 0.2; med 0.2–0.5; heavy > 0.5; map to variant layers or gain +2 dB for heavy.
- Variance:
  - Pitch randomization ±3% for mining/footsteps; ±1% for telegraph; none for UI.
  - Start-time micro-offset 0–8 ms for stacked impacts to reduce phasing.

---

## 5) Depth-Based Ambience Plan (L1)

Depth scalar:
- Source: game resource (from Beta meta), depth_scalar ∈ [0,1], where 0.0 near surface band; 1.0 at y > 0.6h (60% of L1 vertical span).

Ambience layers:
- Bed loop (amb.bed.l1.loop): always on; two variants crossfaded by depth:
  - Shallow variant: lighter air, less low rumble, more drip detail.
  - Deep variant: stronger low air, occasional sub-rumble swells.
- Spots (amb.spot.*): intermittent drips/rumbles and lamp/crystal loops.
  - Spawn rates scale with depth:
    - Drips: 0.2–0.6 Hz (depth 0→1).
    - Rumbles: 0.02–0.08 Hz (depth 0→1).
    - Lamp/crystal: looped on proximity with hysteresis (enter 6 m, exit 8 m).

Transitions:
- Crossfade time ≥ 2.5 s; equal-power; maintain phase continuity (no hard restarts).
- Bar-locked swapping if Music present (placeholder: lock on next bar; assume 100–120 BPM; detect via Music bus metering; MVP may defer bar-lock and simply fade).

---

## 6) Top-10 Priority SFX (Sprint 1)

For each: length, sample rate, channels, loop, loudness, placeholder source.

1) sfx.mining.hit.rock.med
- 250–320 ms; 44.1 kHz; mono; one-shot
- Loudness: peak −6 dBFS; short-term −16 LUFS
- Source: hammer on slate/granite; layer chisel ping lightly; damp tail.

2) sfx.mining.break.rock
- 350–500 ms; 44.1 kHz; mono; one-shot
- Loudness: peak −6 dBFS; ST −15 LUFS
- Source: recorded rock crack + gravel cascade; add low-mid burst (120–250 Hz).

3) sfx.footstep.rock
- 120–180 ms (x4 alternates); 44.1 kHz; mono; one-shot
- Loudness: peak −6 dBFS; ST −20 LUFS
- Source: boot on stone/tile; tight decay; slight grit.

4) sfx.combat.telegraph.goblin
- 80–120 ms; 44.1 kHz; mono; one-shot
- Loudness: peak −6 dBFS; ST −18 LUFS
- Source: bright brass/amber ting; add transient enhancer; no tail.

5) sfx.combat.hit.goblin
- 220–320 ms; 44.1 kHz; mono; one-shot
- Loudness: peak −6 dBFS; ST −16 LUFS
- Source: leather slap + fruit/gel strike; subtle cloth rustle.

6) sfx.combat.poise_break
- 350–450 ms; 44.1 kHz; stereo (narrow) or mono; one-shot
- Loudness: peak −6 dBFS; ST −14 LUFS
- Source: resonant brass plate hit + short swell; keep decay < 450 ms.

7) sfx.ui.click
- 60–100 ms; 44.1 kHz; mono; one-shot
- Loudness: peak −10 dBFS; ST −22 LUFS
- Source: small brass switch/click; unobtrusive, no harsh >8 kHz.

8) sfx.pickup.ore
- 180–260 ms; 44.1 kHz; mono; one-shot
- Loudness: peak −8 dBFS; ST −20 LUFS
- Source: crystal tinkles + small brass chime; quick shimmer.

9) amb.bed.l1.loop
- 20–40 s seamless loop; 44.1 kHz; stereo; loop=true
- Loudness: integrated −18 LUFS; peaks ≤ −6 dBFS
- Source: cave air, distant rumbles, faint drips; loop seam crossfade and DC-free.

10) amb.spot.lamp
- Continuous loop; 44.1 kHz; mono; loop=true
- Loudness: integrated −22 LUFS; peaks ≤ −10 dBFS
- Source: warm mantle lamp hiss with subtle flutter; steady-state.

---

## 7) File Naming & Manifest Conventions

- IDs: dot-scoped lowercase tokens, e.g., sfx.mining.hit.rock.med
- Optional version suffix: .v1 before extension, e.g., sfx.mining.hit.rock.med.v1.ogg
- Directory layout:
  - assets/audio/sfx/...
  - assets/audio/amb/...
  - assets/audio/music/...
  - assets/audio/ui/...
- Manifest: data/audio/sound-manifest.json maps id → file path (+ bus, priority, loop).
- Loop metadata: loopStart/loopEnd frames optional (future); MVP uses full-file loop points only.

Example entries (conceptual):
- id: sfx.mining.hit.rock.med → assets/audio/sfx/mining/hit/rock_med.v1.ogg
- id: amb.bed.l1.loop → assets/audio/amb/bed/l1_loop.v1.ogg

---

## 8) Toolchain & Engine Notes (Engine-agnostic)

Authoring:
- Work at 48 kHz, 24-bit; export runtime at 44.1 kHz OGG Vorbis q6.
- Mono for spot SFX; stereo for ambience beds and wide stingers as needed.
- Normalize peaks conservatively (see targets) and trim silences; embed loop tags if available.

Runtime API sketch:
- Audio.play(tag, opts { pos?, vol?=1.0, pitch?=1.0, priority?=Normal, bus?=SFX, loop?=false })
- Audio.setBusGain(bus, gainDb); Audio.sidechain(sourceBus, targetBus, { amountDb, attackMs, releaseMs })
- Voice manager: enforce caps and priority-steal policy as §2.

Bevy integration (initial):
- Use bevy_kira_audio for MVP or a thin custom mixer wrapper later.
- AudioEventBridge system in Events stage maps ECS events to trigger keys per §3.
- Depth scalar provided via resource; AmbienceSystem maintains bed variant crossfades and spot spawns.

Budget:
- Memory: ≤ 10 MB resident (hot SFX + bed + 1–2 spots).
- Voice cap: 24 global, per-bus caps as §2; streaming for long amb beds if available.

---

## 9) Acceptance, Risks & Next Steps

Acceptance (Sprint 1):
- Event map covers UI, mining, movement, combat, ambience (+ free trigger).
- Top-10 SFX defined with technical targets and placeholder sources.
- Mix/bus, ducking, polyphony, and spatialization rules actionable.
- Toolchain and file/manifest conventions specified.

Risks:
- Material strings must align with P4 tokens (snake_case); mismatch will mute routing.
- Ducking and loudness require in-engine audition to finalize intelligibility.
- Concurrency caps may need adjustment under stress (combat + mining overlap).
- Loop seam artifacts if exports lack precise zero-crossing alignment.

Next steps:
- Author data/audio/sound-manifest.json and docs/audio-systems/music-direction.md.
- Confirm ECS payload shapes with Alpha/Gamma/Delta owners; finalize token lists for materials/archetypes.
- Implement AudioEventBridge + initial mixers; wire ducking rules.
- Produce and import Top-10 SFX placeholders; first in-engine audition; iterate gains/filters.