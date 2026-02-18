# The Far Mine — Audio Design v0.1 (Sprint 1)

Owner: Echoheart Bellowsong (Zeta)  
Version: 0.1 — 2026-02-18  
Scope: Vertical slice Mine Level 1 (L1). Engine-agnostic audio design mapped to Bevy ECS events/resources and an AudioEventBridge layer.  
References:  
- data/audio/sound-manifest.json (source of truth for asset ids, polyphony, priority)  
- docs/audio-systems/music-direction.md (music palette and motifs; to be provided)

## 1) Title & Scope
- This brief defines the MVP audio implementation for Sprint 1: ambience bed(s), mining, core combat, footsteps, core UI, basic scene/biome/DepthScalar-driven layers.
- Contract-first: ECS events → AudioEventBridge → manifest ids. Bevy-agnostic audio backend (Wwise/FMOD/Bevy_kira ok) via adapter traits.

## 2) Audio Pillars & Style Notes
- Atmosphere-as-instrument
  - Cave as choir; brass and bellows textures; restrained reverb (early reflections + short tails, <1.4 s).
  - Do: emphasize resonant drones with subtle modulation; keep tails short to avoid smearing clarity.
  - Don’t: stack long lush pads; avoid washy high-frequency reverbs that mask pick strikes.

- Readability over roar
  - Clear telegraphs; distinct mining timbres per material; UI never masked.
  - Do: carve midrange for telegraphs (1.5–3 kHz) and clicks (2–5 kHz) via sidechain/EQ.
  - Don’t: let ambience overlap 1–4 kHz excessively; avoid layered hits that blur transient edges.

- Depth-breathing ambience
  - Layers fade with DepthScalar; minimal fatigue; slow, sparse details.
  - Do: gate layers with hysteresis and low duty cycle; keep variation subtle.
  - Don’t: introduce rapid/bright motifs that feel “surface-y” deeper down.

- Dwarven cadence
  - Mining and combat share a rhythmic grid (steady work-song feel); avoid clutter.
  - Do: align swing/telegraph/smash accents to implied 90–100 BPM grid where feasible.
  - Don’t: trigger flams from stacked variants; suppress micro-latency multiples.

## 3) Mix & Bus Diagram
- Buses: Master > Ambience, Music, SFX, UI
  - Optional sub-buses: SFX/Mining, SFX/Combat
- Target loudness:
  - Ambience/Music loops: ~ -14 LUFS integrated (pre-bus trims)
  - SFX one-shots: peak ≤ -1 dBFS; short-term LU ~ -16 to -12
  - UI: normalized to peak ≤ -6 dBFS; playback gain +2 dB vs SFX bed to cut through
- Ducking:
  - Strong hits and poise breaks duck Ambience by ~3 dB for 250 ms (attack 10 ms, release 120 ms). Hold resets on retrigger.
- Voice budget (MVP):
  - Total hard cap 24 voices
  - SFX active target ≤ 12 concurrent (steal on priority)
  - Per-id maxPoly set in manifest
  - Ambience layers 2–3; Music 1; UI 1–2
- Priority ranges (0–100; higher wins on steal):
  - Combat critical: 80–90
  - Mining: 60–70
  - UI: 55–70 (confirm high end)
  - Music: 30
  - Ambience beds: 20–35

ASCII bus + duck sends:
- [Master]
  - [Ambience]  <—(sidechain duck -3 dB, 10/120 ms, 250 ms)— [SFX/Combat strong hits, poise.break]
  - [Music]
  - [SFX]
    - [SFX/Mining]
    - [SFX/Combat]
  - [UI]

## 4) Spatialization & Rolloff
- Spatial=true assets pan/attenuate; UI/Music/Ambience base are non-spatial (ambi beds are stereo images).
- Rolloff: linear to -12 dB at 18 tiles; hard mute at 28 tiles. Pan law: -3 dB.
- Clamp non-finite positions/distances to safe defaults (0,0,0) with no pan offset; log once per id.
- Footstep rate limit: ≥ 100 ms between same-entity steps (see Section 7 for jittered cooldown).

## 5) Event Map (ECS → AudioEventBridge)
Bridge consumes ECS events/resources and resolves to manifest triggerKey strings (bridge applies routing, spatial, priority, duck, variants).

- MineHitEvent { pos, tool, power, tile.material }
  - Routes:
    - rock → sfx.mine.hit.rock.v[1..3]
    - copper → sfx.mine.hit.copper.v[1..3]
    - iron → sfx.mine.hit.iron.v[1..3]
    - quartz → sfx.mine.hit.quartz.v[1..3]
  - Variant/power: pitch ±2–4% and gain ±1–2 dB scaled by power in [0..1]; cap at ±5%/±3 dB. Spatial=true (pos).

- FootstepEvent { entity, material, pos }
  - Routes: sfx.footstep.{stone|dirt|metal}
  - Per-entity cooldown gate (110–140 ms jitter). Spatial=true.

- DamageEvent { source, target, amount, type, pos? }
  - On resolved hit: sfx.combat.hit.light at impact pos (or target pos). Type may select future variants; MVP single id.

- UiCommand { action, payload }
  - Routes:
    - navigate → ui.navigate
    - confirm → ui.confirm
    - error → ui.error
    - craft.complete → ui.craft.complete
  - Non-spatial, bus=UI.

- PlaySfxEvent { tag, pos? }
  - Direct manifest id. Spatial iff pos provided and asset.spatial=true. Honors per-id maxPoly/priority.

- CombatTimingService hooks (telegraph/attacks)
  - Start telegraph: sfx.combat.telegraph.whoosh (non-spatial or spatial by attacker pos; MVP spatial=true)
  - Swing: sfx.combat.swing
  - Block: sfx.combat.block.impact
  - Parry: sfx.combat.parry.success
  - Poise break: sfx.combat.poise.break (flags ducking trigger)

- Scene/Depth/Biome
  - SceneLoad:tavern → amb.tavern.loopA
  - SceneLoad:mine_l1 → music.track.l1.sketchA (placeholder) + amb.biome.mine.base.loopA
  - BiomeLoad:crystal_caverns → amb.biome.crystal_caverns.base.loopA
  - DepthScalar d∈[0..1]:
    - d ≥ 0.20 → amb.layer.drip.sparse ON (off below 0.18)
    - d ≥ 0.35 → amb.layer.crystal.resonance ON (off below 0.33)

Note: triggerKey strings in manifest mirror these routes; bridge performs actual logic (priority, polyphony, spatial, duck).

## 6) Layering & Transitions
- Ambience layers: crossfade 800 ms on start/stop; hysteresis thresholds as above to prevent chatter.
- Music: single loop MVP; bar-aligned swaps reserved for later. Intro-skip flag support deferred.
- Combat intensity: none MVP; no dynamic mixing beyond ducking and per-cue priorities.

## 7) Concurrency, Polyphony, and Suppression
- Mining:
  - Per-material maxPoly=3.
  - Coalesce same-cell impacts within 40 ms to one playback (strongest power wins).
- Footsteps:
  - Per-entity cooldown 110–140 ms (uniform jitter) to humanize and avoid flam.
- Telegraph vs swing:
  - Allow both; telegraph must not be stolen by swing. If contention, raise telegraph priority by +5 transiently or use tie-break “older keeps, newer steals only if higher by ≥5”.

## 8) Asset List (MVP summary)
Source of truth: data/audio/sound-manifest.json  
- Ambience: 4
  - amb.biome.mine.base.loopA, amb.layer.drip.sparse, amb.layer.crystal.resonance, amb.tavern.loopA
- Mining: 12 variants (4 materials × 3 var): sfx.mine.hit.(rock|copper|iron|quartz).v1–v3
- Footsteps: 3: sfx.footstep.stone, sfx.footstep.dirt, sfx.footstep.metal
- Combat core: 6: sfx.combat.hit.light, .swing, .block.impact, .parry.success, .telegraph.whoosh, .poise.break
- UI: 4: ui.navigate, ui.confirm, ui.error, ui.craft.complete
- Passthrough: 1: sfx.debug.ping (PlaySfxEvent testing)
- Music: 1: music.track.l1.sketchA
Naming/versioning: lowercase; folders by role; variants suffixed vN (v1..v3). No spaces; use dots.

## 9) Top-10 Priority SFX (explicit for acceptance)
- sfx.combat.hit.light — Core feedback for successful hits; tight, woody-metallic transient with brief low-mid thump.
- sfx.combat.parry.success — High-skill cue; bright, bell-brass chime with fast transient and short tail.
- sfx.combat.block.impact — Defensive clarity; heavier, damped metallic thunk with lower-pitched ring.
- sfx.combat.telegraph.whoosh — Anticipation/readability; low-noise air/bellows sweep, midrange-focused.
- sfx.combat.poise.break — State change; impactful crack + descending brass burst, brief sidechain duck trigger.
- sfx.mine.hit.rock.v1 — Baseline mining; gritty stone chip, dry transient, minimal tail.
- sfx.mine.hit.copper.v1 — Material readability; softer malleable metallic ping with warm mid tone.
- sfx.mine.hit.iron.v1 — Heavier metallic snap with darker ring; more weight than copper.
- sfx.mine.hit.quartz.v1 — Brittle, glassy tick with crystalline overtones; higher brightness.
- ui.craft.complete — Positive reinforcement; short pentatonic bell dyad, clear and unobtrusive.

## 10) Toolchain & Implementation Notes
- Assets:
  - 44.1 kHz / 24-bit WAV
  - Mono: SFX/UI
  - Stereo: Ambience/Music
- Runtime:
  - AudioEventBridge (Bevy system set) reads: MineHitEvent, FootstepEvent, DamageEvent, UiCommand, PlaySfxEvent; subscribes to CombatTimingService hooks; observes DepthScalar, SceneLoad, BiomeLoad.
  - Applies variant selection (test-seeded RNG optional), spatialization flags, priority, duck sends, per-id maxPoly, cooldown/coalesce.
- Memory:
  - Decoded SFX total ≤ 8 MB
  - Ambience/Music streamed from disk
  - Preload: Top-10 SFX + one ambience bed (amb.biome.mine.base.loopA)
- Testing hooks:
  - Bridge exposes counters per route (event→cue map)
  - Fixed-seed RNG toggle (test-only) for deterministic variant/pitch
  - Debug: sfx.debug.ping via PlaySfxEvent { tag, pos? }

## 11) Acceptance, Test Plan, Risks
- Acceptance:
  - All MVP interactions mapped via ECS→AudioEventBridge
  - Top-10 SFX identified and referenced by id
  - Implementable with provided events/resources; ducking and DepthScalar layering functional
- Tests:
  - Unit: event→id resolution (material→mining variants; UI commands)
  - Mining coalesce: impacts within 40 ms in same cell collapse to one
  - Ducking: poise.break and strong hits trigger Ambience duck parameters
  - Depth hysteresis: layers on at 0.20/0.35; off at 0.18/0.33; crossfade ~800 ms
  - Footstep cooldown: per-entity jittered window respected
- Risks:
  - ECS payload drift (e.g., missing tile.material) can break routing; mitigate with defaults + logging
  - In-engine balance requires trims despite LUFS targets; provide per-bus trims in config
  - Bevy audio backend differences (kira vs. custom) bridged by adapter; verify sidechain/duck emulation
  - Voice cap contention in combat clusters; tune priorities and per-id maxPoly early

— Echoheart Bellowsong, keeping the mine singing softly and the picks speaking clearly.