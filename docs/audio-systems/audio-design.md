# Audio System — Stone, Steam, and the Rhythm of the Pick (Sprint 1)

Provenance
- Owner: @zeta (Audio Systems — Echoheart Bellowsong)
- This is the implementable design for Sprint 1 of The Far Mine’s Audio System.
- Cross-references (token-only IDs; no raw hex anywhere):
  - docs/core-systems/ecs-architecture.md (§System Order, AudioSystem)
  - docs/combat-systems/combat-design.md (§Telegraphs & events)
  - docs/technology-systems/crafting-design.md (§Mining events & sfx tokens)
  - docs/world-generation/cave-gen-algorithm.md (§Lighting & rooms)
  - docs/audio-systems/music-direction.md (state machine)
  - data/visual/color-palette.json (tokens only; e.g., mapping.lighting.lampWarm, mapping.lighting.crystalCool)

Scope
- Audience: gameplay/audio programmers and data authors.
- Acceptance: implementable rules and full mapping of MVP events to sfx ids used by the manifest.

---

## 1) Audio Pillars (One-pager)
- Rhythmic mining bed: the game’s pulse is the pick; cadence-forward design couples sound to tool timing.
- Telegraph-first clarity: pre-hit cues are clean, high-contrast, and never masked by music.
- Headroom for SFX over music: music yields; impacts carry the story beat-to-beat.
- Mechanical-acoustic timbres: stone, iron, steam; minimal synthetic gloss in Sprint 1.
- Lane readability: narrow corridors avoid whip-panning; spatial cues stay stable and useful.
- Depth as tone: subtle low-band pressure and shimmer signal room scale and mineral presence.
- Token-only IDs: all content is addressed by tokens; no raw color hex or file-system leakage.

---

## 2) Buses, Mixing Topology, and Headroom
Bus graph
- master
  - bus.music
  - bus.sfx
  - bus.ambient
  - bus.ui

Nominal bus gains (master 0 dB)
- bus.music: −4 dB
- bus.sfx: 0 dB
- bus.ambient: −15 dB
- bus.ui: −6 dB

Sidechain ducking (as per music-direction.md; restated here)
- Mechanism: SFX events trigger an envelope on bus.music gain (no true sidechain node in Web Audio; implement scripted envelope).
- Priority order (highest to lowest): sfx.combat.poiseBreak > sfx.combat.hit.light > sfx.mining.pick.hitOre > other sfx.
- Duck profiles (attack/hold/release; linear in gain, equal-power perceived):
  - poiseBreak: −8 dB, 10 ms / 240 ms / 320 ms
  - hit.light: −5 dB, 12 ms / 140 ms / 220 ms
  - mining.hitOre: −3 dB, 12 ms / 100 ms / 180 ms
  - default sfx: −2 dB, 8 ms / 80 ms / 160 ms
- Stacking: on overlapping ducks, apply the strongest active reduction; do not sum. New envelopes may extend hold if stronger.

Polyphony and loop ownership
- Polyphony keys group related instances; last-wins for looping layers within a key.
  - Example: ambient.cavern.* share polyphonyKey "ambient.cavern". Starting a new cavern bed crossfades out the previous owner.
- Caps per category (global defaults; see manifest Global):
  - ambient: ≤12 total; per polyphonyKey default ≤2; lamps special-case ≤6
  - sfx: ≤24 total; per-id defaults: ≤4 (impacts), ≤2 (swings), ≤1 (unique one-shots like poiseBreak)
  - music: ≤4 total (bed + overlay + sparkle + stinger)
  - ui: ≤8 total; never stolen
- Stealing within a key: priority first (0 high → 3 low), then least-recently-used (LRU).

---

## 3) Categories & Subcategories (Authoritative)
Ambient (bus.ambient)
- Beds:
  - ambient.cavern.base.loopA — cavern air, subtle undertow
  - ambient.cavern.crystal.loopA — crystalline shimmer layer
- Props and spots:
  - ambient.prop.lamp.hiss.loop — standing lamps, soft gas hiss
  - ambient.cavern.spot.* — steam valves, drip clusters (placeholder namespace for future)
- Token patterns: ambient.cavern.*, ambient.prop.*

SFX (bus.sfx)
- Mining:
  - sfx.mining.pick.swing — tool arc/whoosh
  - sfx.mining.pick.hitRock — stone contact
  - sfx.mining.pick.hitOre — brighter mineral ping
  - sfx.mining.break.stone — tile break tail (alias to hitRock+tail if needed)
  - sfx.mining.drill.spinUp — motor start
  - sfx.mining.drill.bite — periodic drilling bite
  - sfx.mining.drill.coolDown — motor stop/decay
  - Cadence ties to tool swingIntervalMs and drill pulse logic (see §7)
- Combat:
  - sfx.combat.telegraph.swing — windup air displacement
  - sfx.combat.hit.light — light weapon/body impact
  - sfx.combat.block — deflect/parry
  - sfx.combat.poiseBreak — armor/crack accent; peak priority
  - Enemy vocals: deferred beyond MVP (reserved namespace: sfx.vocal.*)
- Movement & Interaction (MVP-lite/optional):
  - sfx.move.footstep.stone — quiet, if included
- UI under UI category.

Music (bus.music)
- All music cues routed here; see docs/audio-systems/music-direction.md for state machine.
- Key references for sync: music.explore.base.loopA, music.explore.sparkle.loopB, music.combat.overlay.perc.loopA, music.stinger.enterCombat, music.stinger.exitCombat.

UI (bus.ui)
- ui.confirm, ui.cancel, ui.notif
- Short, quiet; never duck SFX or Ambient; may lightly tickle music (−1 dB max; optional).

---

## 4) Depth-Based Ambient Layering (Biome-aware)
Level 1 Biome: Crystal Caverns

Depth/space bands
- Spawn Cavern (Room tag: spawn): wide chamber; radius ~18 tiles
- Corridors (Path width ≤3 tiles): narrow passages
- Ore Pockets (Room tag: orePreferred): small, mineral-rich chambers

Rules
- Base bed:
  - ambient.cavern.base.loopA is always active while in-mine scenes are active (from onSpawnIntoCavern to scene end).
- Crystal shimmer:
  - Enable ambient.cavern.crystal.loopA if:
    - Within K = 10 tiles of ≥ N = 3 crystal-theme props, OR
    - Music layer music.explore.sparkle.loopB is active.
  - Sustain minimum 8 s after the last enabling condition; fade out over 300 ms.
- Lamp hiss:
  - Instantiate ambient.prop.lamp.hiss.loop at each lamp prop (token-matched to mapping.lighting.lampWarm).
  - Per-instance gain low: −24 dB nominal (relative to bus.ambient).
  - Polyphony cap: 6 instances globally; LRU if exceeded.

Transitions
- Crossfades: equal-power over 250–350 ms (choose based on CPU headroom: default 300 ms).
- Never hard-cut ambient beds; no bar-quantization (quantization is music-only).

Designer token intent
- When spawning shimmer, inspect nearby lighting tokens; prefer mapping.lighting.crystalCool zones to bias shimmer enable; never use raw hex.

---

## 5) Event Map — Systems → Audio Triggers (Implementation-Ready)
MiningSystem
- mining.swing → sfx.mining.pick.swing
  - Notes: rate-limited by tool swingIntervalMs (see §7).
- mining.hit.rock → sfx.mining.pick.hitRock
  - Optional: scale gain 0.85–1.0 by impact velocity fraction.
- mining.hit.ore → sfx.mining.pick.hitOre
  - Slightly brighter; triggers low-priority duck (see §2).
- mining.break.tile → sfx.mining.break.stone
  - MVP alias: if dedicated break missing, play sfx.mining.pick.hitRock and extend with tail or allow looped tail snippet.

CombatSystem
- combat.telegraph.start → sfx.combat.telegraph.swing
- combat.attack.hit → sfx.combat.hit.light
- combat.block → sfx.combat.block
- combat.poise.break → sfx.combat.poiseBreak

Scene/Worldgen Hooks
- onSpawnIntoCavern → start ambient.cavern.base.loopA (polyphonyKey: ambient.cavern; loop true)
- onEnterOrePocket (template tag orePreferred) → raise shimmer send by +2 dB for 12 s (if shimmer active); if inactive, temporarily enable shimmer with same 12 s timeout, then respect normal rules.
- onLampPlaced (future) or when lamp props load → instantiate ambient.prop.lamp.hiss.loop at prop positions (spatial true).

Music State Hooks (delegated to music-direction)
- Enter combat: trigger music.stinger.enterCombat; enable music.combat.overlay.perc.loopA.
- Exit combat: trigger music.stinger.exitCombat; disable overlay; resume music.explore.base.loopA; sparkle layer music.explore.sparkle.loopB per exploration rules.

---

## 6) Trigger Rules & Cadence Logic
Mining rhythm coupling
- Swing playback
  - Tie to tool swingIntervalMs.
  - Retrigger clamp: minimum 0.8 × swingIntervalMs between sfx.mining.pick.swing plays per tool to avoid double fires on animation overlaps.
- Drill pulses
  - On press: sfx.mining.drill.spinUp (debounce 600 ms; ignore repeated presses until coolDown completes or idle ≥500 ms).
  - While held: sfx.mining.drill.bite every 300 ms pulse window if targetable tile present; skip if no contact.
  - On release or idle >500 ms: sfx.mining.drill.coolDown.

Combat intensity sanity
- Hit stacking guard
  - Coalesce hits from the same attacker→victim pair within 40 ms; keep the first (or the higher-damage one if both known).
- Telegraph overlap
  - If a hit lands within <120 ms of its telegraph, attenuate sfx.combat.telegraph.swing by −6 dB to prevent smear; never cancel the hit.

Biome transitions
- Crystal shimmer activation
  - Enable when crystal prop count ≥3 within a 12-tile radius OR music.explore.sparkle.loopB is active.
  - Hold for at least 8 s after last true condition; fade-out 300 ms.

---

## 7) Spatialization, Attenuation, and Panning (Top-Down 2D)
Positional rules
- Panning
  - Equal-power pan using normalized X offset from screen center: pan = clamp(−1..+1).
  - Corridor fairness: if path width ≤3 tiles (corridor), cap |pan| at 0.6 for SFX and 0.5 for Ambient spots.
- Distance attenuation (screen-space)
  - Reference distances: center = 0 dB; half-screen = −6 dB; full-screen edge = −12 dB (linear ramp between).
  - Beyond screen edge: clamp to −18 dB minimum before cull (if any).
- Y-axis psychoacoustics (optional MVP)
  - In large caverns (spawn/rooms), apply subtle low-pass send as Y increases downward: up to −3 dB at 6 kHz.
- Reverb send (single “cavern plate” bus)
  - Ambient beds: 20% send.
  - Crystal shimmer: 30% send.
  - Mining/impact: dry; on break and poiseBreak, momentary 10% send with a 250 ms send envelope tail.

Non-positional
- UI and Music are non-positional and ignore panning/attenuation, honoring only bus gains and sidechain rules.

---

## 8) Data Contracts — Manifest Schema (Authoritative for data/audio/sound-manifest.json)
Shape
- File is a JSON object with:
  - global: object (version, buses, defaults, decode hints)
  - entries: array of sound entry objects

Global
- version: number (1)
- buses: object of { [busName]: { gainDb: number } }
  - Example defaults: { master: {0}, music: {−4}, sfx: {0}, ambient: {−15}, ui: {−6} }
- defaults:
  - maxInstancesPerCategory: { ambient: 12, sfx: 24, music: 4, ui: 8 }
  - decoding: { preferredFormat: "ogg", sampleRate: 44100, streamingLoops: true }
  - reverbSendIds: { cavernPlate: "bus.reverb.cavern" } (implementation detail; optional)
- note: All references by id; no raw hex; align ids with all design docs.

Entry (each element in entries array)
- id: string (e.g., "sfx.mining.pick.hitRock") — unique
- category: "ambient" | "sfx" | "music" | "ui"
- file: string (asset path relative to /assets/audio/)
- bus: "music" | "sfx" | "ambient" | "ui"
- loop: boolean
- volume?: number (0..1 linear) — nominal authoring playback level
- gainDb?: number — mutually exclusive with volume; if both provided, gainDb wins
- priority: 0 | 1 | 2 | 3 (0 = highest)
- polyphonyKey?: string (grouping key; e.g., "ambient.cavern")
- maxInstances?: number (cap per id or per polyphonyKey when used at group level)
- spatial?: boolean (positional panner attached if true)
- tags?: string[] (debug/filters; e.g., ["mining","rock","light"])

Validation rules
- id must be unique; category must match id prefix for sanity (warning if not).
- bus must exist in global.buses.
- If loop = true and spatial = true, ensure stable positioning (do not chase listener rapidly).

---

## 9) MVP Sound List (Authoritative Coverage Checklist)
Ambient
- ambient.cavern.base.loopA — slow air pressure bed of the caverns, breathy and wide.
- ambient.cavern.crystal.loopA — delicate harmonic shimmer, cool and glassy.
- ambient.prop.lamp.hiss.loop — soft gas hiss with faint flutter, never sharp.

Mining SFX
- sfx.mining.pick.swing — short whoosh matching pick arc speed.
- sfx.mining.pick.hitRock — mid-heavy stone knock with dusty tail.
- sfx.mining.pick.hitOre — brighter metallic ping layered over stone.
- sfx.mining.break.stone — crack and crumble tail for tile destruction.
- sfx.mining.drill.spinUp — motor start with torque ramp.
- sfx.mining.drill.bite — gritty cyclic bite pulse, minimal tonal whine.
- sfx.mining.drill.coolDown — motor coast-down with bearing tick.

Combat SFX
- sfx.combat.telegraph.swing — airy windup cue, clear but not loud.
- sfx.combat.hit.light — concise impact with body/metal blend.
- sfx.combat.block — firm deflect, short ring; no harsh sizzle.
- sfx.combat.poiseBreak — emphatic armor crack with low thunk.

Music (for reference; see music-direction.md)
- music.explore.base.loopA — exploration bed; unobtrusive groove.
- music.explore.sparkle.loopB — overlay sparkle for crystals and discovery.
- music.combat.overlay.perc.loopA — percussive combat overlay.
- music.stinger.enterCombat — brisk tension up-shift.
- music.stinger.exitCombat — release/resolve flourish.
- ambient.tavern.loopA — warm diegetic bed for hub/town (routed to bus.ambient).

UI
- ui.confirm — gentle click/ting; quick decay.
- ui.cancel — soft back/brush; slightly lower pitch.
- ui.notif — subtle chime; never piercing.

---

## 10) Implementation Notes (Phaser 3 / Web Audio)
Loader
- Preload manifest JSON (data/audio/sound-manifest.json).
- Validate schema; build index by id.
- Enqueue assets via Phaser loader (this.load.audio with key=id, URLs from file).
- Decode before scene enter (use this.sound.decodeAudio on Phaser 3.60+ or manual AudioContext.decodeAudioData).
- Fallback on decode fail: log warning; replace entry with silent stub (1-frame buffer) to keep logic stable.

Routing
- Acquire AudioContext (Phaser’s game.sound.context).
- Build bus GainNodes: master → (music|sfx|ambient|ui) → destination.
- Build scripted ducking: a GainNode before bus.music; manipulate gain with setValueAtTime/linearRampToValueAtTime per envelopes in §2.
- Optional DynamicsCompressor on master with gentle knee to tame peaks (bypass by default in MVP).
- Reverb: single Send GainNode from sources to a convolver (cavern plate impulse); feed returns to master at controlled level.

Positional
- For spatial entries, create PannerNode (stereo panning or 3D panner in equal-power mode) with parameters for corridor caps (apply pan clamp in software).

Scheduler
- Subscribe AudioSystem to game event bus per ecs-architecture.md order.
- Fire immediate sounds for SFX/UI; defer music transitions to music-direction state machine (quantize there only).
- Enforce coalescing and cadence clamps at scheduler layer (see §6).

Stealing policy
- Sort candidates by priority, then LRU within polyphonyKey; do not steal ui.* or stingers (music.stinger.*).
- For loops with shared polyphonyKey (ambient.cavern), use last-wins with crossfade.

Debug
- Toggleable overlay: list active ids, bus meters (RMS per 200 ms window), polyphony counts, duck state (current dB and time to release).

---

## 11) Performance & Memory Targets
- Max concurrent decoded buffers: ≤32 (stream long loops or share buffers).
- CPU: AudioSystem <0.3 ms/frame average (measured over 200 frames); duck envelopes batch updates (one per audio tick).
- Asset sizes:
  - Loops: <1.2 MB OGG each (≥44.1 kHz, VBR ~128–160 kbps acceptable).
  - One-shots: <80 KB average; hard cap 160 KB for outliers (poiseBreak).
- Convolver impulse: ≤500 ms stereo IR; size budget <350 KB.

---

## 12) QA & Acceptance Checklist
- All referenced ids exist in manifest (entries array) and have valid bus/category mappings.
- System events fire correct ids (see §5 and Appendix A).
- Music ducking is audible yet not distracting; poiseBreak clearly steps forward; recovery feels natural.
- Ambient transitions are smooth (no clicks); crossfades respect 250–350 ms window.
- Mining cadence audibly matches tool timing (swingIntervalMs and drill pulses).
- Telegraphs always precede hits; overlap attenuation applies (−6 dB within 120 ms).
- Spatialization avoids harsh L/R swings in corridors; pan cap respected.
- No raw hex values in this document; all colors/lighting referenced by tokens; token paths resolve in color-palette.json.
- Performance targets met under stress test: 24 SFX + 3 ambients + 2 music layers sustained without XRuns.

---

## 13) Appendix A — Event → Id Quick Table

| System/Event                 | Audio Id                         |
|-----------------------------|----------------------------------|
| mining.swing                | sfx.mining.pick.swing            |
| mining.hit.rock             | sfx.mining.pick.hitRock          |
| mining.hit.ore              | sfx.mining.pick.hitOre           |
| mining.break.tile           | sfx.mining.break.stone           |
| combat.telegraph.start      | sfx.combat.telegraph.swing       |
| combat.attack.hit           | sfx.combat.hit.light             |
| combat.block                | sfx.combat.block                 |
| combat.poise.break          | sfx.combat.poiseBreak            |
| onSpawnIntoCavern           | ambient.cavern.base.loopA        |
| onEnterOrePocket            | ambient.cavern.crystal.loopA (+2 dB send/12 s) |
| onLampPlaced / props load   | ambient.prop.lamp.hiss.loop      |
| music.enterCombat (pointer) | music.stinger.enterCombat        |
| music.exitCombat (pointer)  | music.stinger.exitCombat         |

Notes
- Music overlays (enable/disable) per docs/audio-systems/music-direction.md:
  - Explore bed: music.explore.base.loopA
  - Sparkle overlay: music.explore.sparkle.loopB
  - Combat overlay: music.combat.overlay.perc.loopA

---

## 14) Appendix B — Future Notes (Non-binding)
- Occlusion/obstruction: lowpass and early reflection duck in dense rock; raycast-informed.
- Multi-bus reverbs: small room vs large cavern sends blended by room metrics.
- Enemy-specific vocals and taxonomy: sfx.vocal.* with species tags.
- Gear foley layering: tool-specific movement layers (chains, buckles, drill idle rattle).
- Dynamic lamp ignition/extinguish cues: micro one-shots tied to lighting token transitions (mapping.lighting.*).