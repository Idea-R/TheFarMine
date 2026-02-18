# The Far Mine — Audio System & Sound Design (Sprint 1)

Owner: Echoheart Bellowsong (Zeta)  
Version: 0.1 (Sprint 1)  
Date: 2026-02-18

## 1) Title & Scope
- Title: The Far Mine — Audio System & Sound Design (Sprint 1)
- Scope: MVP Mine Level 1 vertical slice. Contracts are engine-agnostic for Phaser or similar, designed to map onto Bevy ECS per cross-team decision. This doc defines triggers, buses, voice limits, and minimal mixing/ducking suitable for immediate implementation.

## 2) Audio Pillars & Style Notes
- Pillars (tone + function):
  - Stone Sings Softly: the mine hums; subtle resonances imply depth and age.
  - Brass Breath: air, bellows, and soft brass tones signal motion and life.
  - Work Rhythms: mining and crafting form a human cadence—predictable, readable.
  - Diegetic First: in-world sources lead; UI is felt, not flashy.
  - Readable Telegraphs: short, bright cues for combat intent and outcomes.
- Timbre guidance:
  - Hammered dulcimer plucks, soft brass/bellows, felted percussive layers.
  - Air/steam textures, gentle crystal resonances for magical/mineral moments.
- Mixing north stars:
  - Warm midrange, controlled highs, “roomed” lows (not sub-heavy).
  - Fatigue-safe; minimal long reverb tails during action.
  - Keep clarity for footsteps/telegraphs over ambience.

## 3) Categories & Buses
- Categories: Ambience (beds + layers), SFX (mining, combat, interact), UI, Music.
- Bus layout:
  - Master
    - Ambience
    - Music
    - SFX
    - UI
- Ducking relationships:
  - SFX briefly ducks Ambience by up to -3 dB on strong impacts (600 ms decay).
  - Music sidechains gently to SFX by -2 dB during heavy combat (releases with 800 ms).
  - UI does not duck any bus.
- Voice limits (MVP):
  - Ambience: 4
  - Music: 2 (base + one layer)
  - SFX: 16
  - UI: 8
- Spill/steal policy:
  - Newest-preempt for low-priority loops (e.g., repeated minor rocks).
  - Protect critical: telegraphs, blocks, parries, heavy hits, UI confirm/error.

## 4) ECS Event Map (MVP)
- MineHitEvent{pos, tool, power} → sfx.mine.hit.[rock|copper|iron|quartz] (material via Tile.hardness/Tile.tileType)
- DamageEvent{source, target, amount, type} → sfx.combat.hit.[light|heavy] (weight by amount band)
- FootstepEvent{entity, material} → sfx.footstep.[stone|dirt|metal] (rate-limited)
- PlaySfxEvent{tag, pos} → direct route to manifest id (bridge for UI/one-offs)
- UiCommand{action, payload} → ui.[navigate|confirm|error|craft.complete]
- combat.TelegraphStart → sfx.combat.telegraph.whoosh
- combat.Swing.light → sfx.combat.swing.whoosh.light
- combat.Hit (unblocked) → sfx.combat.hit.light
- combat.Block → sfx.combat.block.impact
- combat.Parry → sfx.combat.parry.success
- poise.Break → sfx.combat.poise.break
- Ambience routing hooks:
  - On scene load Tavern: start amb.tavern.loopA (loop)
  - On biome load Crystal Caverns: start amb.biome.crystal_caverns.base.loopA; add optional layers [amb.layer.drip.sparse, amb.layer.crystal.resonance] based on depth scalar (see Section 6)

## 5) Trigger Rules & Priority/Ducking/Polyphony
- Mining rhythm:
  - Cadence derives from tool swingMs (data/items/tools.json).
  - On MineHitEvent: choose material variant by Tile.hardness; 3-way one-shot pool per material (round-robin + random offset).
  - Enforce min interval = 90 ms per emitter; pitch variance ±3%; gain variance ±1.5 dB.
- Combat intensity:
  - Hits and poise.Break increment a short-lived SFX “weight” meter. While weight > threshold, Ambience duck up to -3 dB, 600 ms decay to baseline.
- UI:
  - Non-positional one-shots; priority medium; never duck; short 10–20 ms attack to feel responsive.
- Polyphony coalescing:
  - Same-cell MineHitEvents within 40 ms coalesce into one louder variant (+2 dB, clamp to peak rules).
- Spatialization (MVP):
  - Stereo pan by x-position in viewport: left=-1, center=0, right=+1 (clamp beyond edges).
  - Rolloff: -6 dB per 24 tiles distance from camera center; minGain clamp -18 dB.
  - UI and Music are non-spatial.

## 6) Depth-Based Ambience Mix
- DepthScalar d ∈ [0..1] from GameTime/Transform or biome resource (0 = entry, 1 = target depth band).
- Use d to:
  - Crossfade ambience layers. Bring in amb.layer.crystal.resonance at d ≥ 0.35 (fade over 8 s).
  - Future: add sub-rumble from d ≥ 0.7.
  - Optional MVP note: lowpass Ambience subtly as d increases (e.g., -3 dB at 6 kHz by d=1). Skip if engine time is short.

## 7) Event Payload Assumptions & Bridge
- Bridge: ECS → manifest triggerKey with field extraction rules:
  - material: infer via Tile.hardness and Tile.tileType at pos; fallback from tool.power bands (low → rock, mid → copper, high → iron, very_high → quartz).
  - amount banding: amount < 8 → light; ≥ 8 → heavy (tunable constants).
  - position: use world pos for SFX spatialization; UI ignored.
- Resilience:
  - If Tile lookup fails, play generic sfx.mine.hit.rock.
  - If combat type missing, default sfx.combat.hit.light.
- Music transitions:
  - Future: bar-aligned transitions; MVP uses hard start/stop with 50 ms fades at boundaries to avoid clicks.

## 8) Top-10 Priority SFX (with placeholder sourcing plan)
- sfx.mine.hit.rock
  - Use: basic stone mining impact; 3 variants
  - Tone: dry, granular, woody overtones
  - Length: 180–260 ms
  - Loudness: short-term -14 LUFS, peak -1 dBFS
  - Layering: transient tick + body thud
  - Source: synthetic/foley; placeholder freesound refs TBD
- sfx.mine.hit.copper
  - Use: ore copper impact
  - Tone: metallic ping, soft body
  - Length: 160–220 ms
  - Loudness: -14 LUFS short, peak -1 dBFS
  - Layering: light ring + muted hit
- sfx.mine.hit.iron
  - Use: ore iron impact (harder, heavier)
  - Tone: dense clang, low mid weight
  - Length: 200–280 ms
  - Loudness: -14 LUFS short, peak -1 dBFS
  - Layering: hammer transient + short resonant tail
- sfx.mine.hit.quartz
  - Use: crystalline impact
  - Tone: bright, chimey, glass tick
  - Length: 140–200 ms
  - Loudness: -14 LUFS short, peak -1 dBFS
  - Layering: hi partials + soft body
- sfx.combat.telegraph.whoosh
  - Use: enemy wind-up telegraph
  - Tone: breathy, rising, airy
  - Length: 220–320 ms
  - Loudness: -14 LUFS short, peak -1 dBFS
  - Layering: filtered noise + soft brass swell
- sfx.combat.swing.whoosh.light
  - Use: light attack pass-by
  - Tone: fast, clean, minimal tail
  - Length: 120–180 ms
  - Loudness: -14 LUFS short, peak -1 dBFS
  - Layering: noise burst + dulcimer scrape
- sfx.combat.hit.light
  - Use: successful light hit (unblocked)
  - Tone: metal-on-hide, crisp
  - Length: 180–240 ms
  - Loudness: -14 LUFS short, peak -1 dBFS
  - Layering: impact tick + muted thud
- sfx.combat.block.impact
  - Use: player/enemy block contact
  - Tone: clang, short tail, authoritative
  - Length: 200–260 ms
  - Loudness: -14 LUFS short, peak -1 dBFS
  - Layering: metallic body + brief ring
- sfx.combat.parry.success
  - Use: perfect parry feedback
  - Tone: bright, clean, celebratory ring
  - Length: 120–180 ms
  - Loudness: -14 LUFS short, peak -1 dBFS
  - Layering: crystal ping + soft air puff
- ui.craft.complete
  - Use: crafting completion feedback
  - Tone: soft anvil ding + puff
  - Length: 250–350 ms
  - Loudness: -14 LUFS short, peak -1 dBFS
  - Layering: dulcimer pluck + air/bellows breath

## 9) File/Manifest Conventions
- Manifest path: data/audio/sound-manifest.json
- Schema fields (engine-agnostic):
  - id: string (e.g., sfx.mine.hit.rock)
  - filename: string (relative to assets/audio/)
  - category: enum [ambience, music, sfx, ui]
  - triggerKey: string (event-facing alias; allows routing from ECS bridge)
  - volume: float (linear gain multiplier; 1.0 default)
  - loop: bool
  - priority: enum [critical, high, medium, low]
  - maxPoly: int (per id)
  - spatial: enum [none, 2d_pan]
  - duckBus?: string|null (bus to duck when this plays; default null)
  - tags[]: string array (e.g., ["material:rock", "variant:1"])
- Required ids for MVP (must exist):
  - amb.tavern.loopA
  - amb.biome.crystal_caverns.base.loopA
  - amb.layer.drip.sparse
  - amb.layer.crystal.resonance
  - sfx.combat.telegraph.whoosh
  - sfx.combat.swing.whoosh.light
  - sfx.combat.hit.light
  - sfx.combat.block.impact
  - sfx.combat.parry.success
  - sfx.combat.poise.break
  - sfx.mine.hit.[rock|copper|iron|quartz]
  - ui.craft.complete

## 10) Toolchain Assumptions (MVP)
- Authoring:
  - 44.1 kHz, 16-bit WAV.
  - Mono for SFX; stereo for ambience/music.
  - Normalization: peak -1 dBFS.
  - Loudness: loops at -14 LUFS integrated; SFX trimmed relatively to mix, guideline -14 LUFS short-term per item above.
- Build:
  - Copy assets + manifest JSON; no runtime DSP beyond pan/gain; optional one-pole lowpass reserved for depth.
- Testing tools:
  - Console AudioEventBridge logger (prints event → triggerKey → id).
  - Debug mute/solo per bus; real-time duck meters for SFX→Ambience and SFX→Music.

## 11) Minimal Test Plan
- Unit tests:
  - MineHitEvent(material) maps to correct sfx.mine.hit.* id.
  - combat events map as specified (telegraph, swing.light, hit, block, parry, poise.break).
  - UiCommand(craft.complete) → ui.craft.complete.
  - Coalescing: two MineHitEvents same cell within 40 ms produce one voice.
- Integration:
  - Load Tavern scene → amb.tavern.loopA starts, loops.
  - Load Crystal Caverns biome → amb.biome.crystal_caverns.base.loopA plays; depth d≥0.35 fades in amb.layer.crystal.resonance; optional drip layer toggles via depth or state.
  - Mine rock tile → sfx.mine.hit.rock plays; voice counts remain ≤16 under burst mining.
  - Crafting completes → ui.craft.complete fires; no duck on other buses.
- QA notes:
  - Audit clipping at Master and SFX bus; verify peaks stay ≤ -1 dBFS per asset and bus headroom ≥ 3 dB.
  - Confirm ducking decay feels natural (600–800 ms) and does not mask footsteps.
  - Stress test: concurrent mining + combat maintains polyphony within limits and protects critical cues.

## 12) Risks & Assumptions
- Event payload naming may drift; request quick confirm from Alpha on final ECS fields.
- Ducking and intensity thresholds will need retune after first in-engine audition.
- DepthScalar source (Transform vs. biome system) to be finalized; placeholder resource acceptable for Sprint 1.
- Limited runtime DSP constrains ambience evolution; acceptable for MVP.
- Asset sourcing: placeholders may be used initially; replace with authored content in Sprint 2.

— Echoheart Bellowsong (Zeta), Audio Systems and Sound Design