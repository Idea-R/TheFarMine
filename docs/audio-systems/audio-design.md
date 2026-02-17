# Audio System — Beds, Picks, and Bellows (Sprint 1)

Owner: @zeta (Audio Systems — Echoheart Bellowsong)

Cross-references:
- data/audio/sound-manifest.json (§IDs, buses, volumes, priorities, polyphony, spatial flags)
- docs/world-generation/cave-gen-algorithm.md (§Lamps pass, depth lanes)
- data/visual/color-palette.json (token-only mentions: no literal values)
- data/items/tools.json (§audio ids)
- data/combat/enemy-*.json (§onTelegraph/onHit/etc.)
- docs/visual-systems/style-guide.md (§Sync cues)
- tools/ecs-registry.test.js (naming patterns only)



## 2) Goals & MVP Scope

Goals (sing clean, mix lean):
- Robust yet lean audio for web (low-latency, memory-aware).
- Deterministic layer control (music states and overlays reproducible).
- Depth-aware ambience (beds respond to world scalar).
- Crisp mining cadence (tight sync with animation).
- Combat intensity overlay (percussion layer + stingers).
- Zero-stutter loop handling (gapless, clickless).
- Simple spatialization for in-world props (pan+distance).
- Clear debug (HUD + logs, dev flag-gated).

MVP Scope (first chorus):
- Ambient beds: cavern base, crystal shimmer.
- Props: lamp hiss loops (registered per entity).
- Mining SFX: swing, hit, break, drill (spinUp/bite/coolDown).
- Combat SFX: telegraph, hit, block, poiseBreak.
- Music: base explore loop, sparkle overlay, combat percussion overlay, enter/exit stingers.
- UI trifecta: click/confirm/back (triggered via direct play calls by UI layer; out of event map).

Non-goals (this sprint):
- Convolution reverb, doppler/HRTF, voice-over, biome-dynamic mixing outside Crystal Caverns.



## 3) System Architecture Overview

Buses (manifest.globals.buses is authority):
- master → parent of all.
- music → music layers and stingers.
- sfx → mining, combat, props.
- ambient → ambient beds, lamp hiss (if flagged ambient).
- ui → UI sounds.

Voice Manager (deterministic priority and polyphony):
- Each manifest entry: { id, bus, priority, maxInstances?, polyphonyKey?, spatial? }.
- Priority: 0 is highest. Voice steal policy: lowest priority first; within same priority choose oldest; within same polyphonyKey choose oldest. Priority 0 must always preempt.
- Caps:
  - categoryDefaults: ambient 8, sfx 24, music 6, ui 12 (fallback only).
  - entry.maxInstances overrides.
  - polyphonyKey groups related IDs (e.g., sfx.mining.hit.rock.*). Enforced per-key cap.

Asset Loader:
- Read data/audio/sound-manifest.json at boot via loadManifest(urlOrObj).
- Decode small one-shots immediately; stream large loops (flag stream: true).
- Hints: sampleRate preserved; use WebAudio decodeAudioData; loop points honored if provided.
- Lazy decode allowed for rarely-used stingers.

Spatial Model (MVP):
- spatial=true entries: stereo pan by X in camera view; distance rolloff by pixels.
- Pan: pan = clamp((screenX - centerX)/halfWidth, -1..1).
- Gain rolloff: gain = 1 / (1 + d/pxFalloff). Default pxFalloff ≈ 480.



## 4) Categories & Contracts

Categories:
- ambient: intent = environmental beds/props; usually loop; spatial default = false for beds, true for props like lamps; bus = ambient.
- sfx: gameplay feedback; mostly one-shots (drill has loop); spatial default = true; bus = sfx.
- music: base/overlays/stingers; loops and one-shots; spatial = false; bus = music.
- ui: interface taps; one-shots; spatial = false; bus = ui.

Priority ladder:
- 0: critical (combat.poiseBreak).
- 1: combat/ui critical (telegraph, block, confirm).
- 2: common sfx (mining hits, enemy hits).
- 3: ambient beds/props.

PolyphonyKey semantics:
- Group cap per related family. Examples:
  - sfx.mining.hit.rock → maxInstances: 6 across hit variations.
  - sfx.mining.drill.state → one bite loop per drill entity (key includes entity).
  - ambient.cavern.base → single instance global bed.
- Enforcement: if starting a sound would exceed the key cap, steal oldest within the key respecting priority.



## 5) Event Map — Triggers & Payload Contracts (Authoritative for MVP)

Canonical engine events and payload shapes. All positions are world-space pixels unless stated.

- mining.swing — { toolId, pos:{x,y}, tileType:"floor|rock|rock.ore" }
  - Plays: sfx.mining.pick.swing or tool-specific override from data/items/tools.json (field: audio.swingId).
  - Spatial: true at pos.

- mining.hit — { toolId, pos, tileType, oreType?:"ore.copper|ore.iron|shard.quartz", crit?:boolean }
  - Routing:
    - tileType == "rock" → sfx.mining.pick.hitRock
    - tileType == "rock.ore" → sfx.mining.pick.hitOre (variant by oreType optional via manifest variants)
    - Drill tools: if toolId ∈ tools.json where audio.kind=="drill", manage drill loops (see §7). Still fire a bite tick one-shot if specified (low gain).
  - Spatial: true at pos.
  - Priority: 2; polyphonyKey: sfx.mining.hit.rock.

- mining.break — { pos, tileType, oreType? }
  - Plays: sfx.mining.break.stone (ore variants optional).
  - Sidechain: duck music -2 dB for 200 ms (see §9).
  - Spatial: true at pos.

- tool.state.drill — { entityId, state:"spinUp|bite|coolDown", pos }
  - spinUp: play sfx.mining.drill.spinUp (one-shot), spatial at pos.
  - bite: start loop sfx.mining.drill.bite bound to entity emitter; continue until coolDown.
  - coolDown: play sfx.mining.drill.coolDown; stop loop if running with 150 ms fade.

- combat.telegraph — { enemyId, attackId, pos }
  - Plays: sfx.combat.telegraph.swing (or per-enemy override via data/combat/enemy-*.json onTelegraph).
  - Spatial: true.

- combat.hit — { sourceId, targetId, pos, damage }
  - Plays: sfx.combat.hit.light (choose medium/heavy by damage thresholds if manifest variants exist).
  - Spatial: true.

- combat.block — { pos }
  - Plays: sfx.combat.block.
  - Spatial: true.

- combat.poiseBreak — { pos }
  - Plays: sfx.combat.poiseBreak (priority 0).
  - Spatial: true.
  - Sidechain: duck music -4 dB for 500 ms (see §9).

- music.state — { inCombat:boolean, biomeId:"biome.crystal.caverns" }
  - Drives overlays and stingers (see §6).

- ambient.props.lamp.register — { entityId, pos }
  - Start loop: ambient.prop.lamp.hiss.loop attached to entity emitter (auto-stop on destroy/unload or unregister).

- ambient.props.lamp.unregister — { entityId }
  - Stop the hiss loop for the entity.

- scene.hub.enter
  - Stop mine beds; start ambient.tavern.loopA; stop combat overlay if any; reset music state.

- scene.mine.enter — { biomeId:"biome.crystal.caverns" }
  - Start ambient.cavern.base.loopA and ambient.cavern.crystal.loopA; begin explore base music (see §6).

Compact mapping (event → manifestId(s) + conditions):

| eventName                      | manifestId(s)                                 | conditions/notes                                  |
|--------------------------------|-----------------------------------------------|---------------------------------------------------|
| mining.swing                   | sfx.mining.pick.swing or tools.json audioId   | spatial @ pos                                     |
| mining.hit                     | sfx.mining.pick.hitRock / hitOre              | tileType switch; drill routes to §7               |
| mining.break                   | sfx.mining.break.stone                        | duck music -2 dB 200 ms                           |
| tool.state.drill: spinUp       | sfx.mining.drill.spinUp                       | one-shot; spatial                                 |
| tool.state.drill: bite         | sfx.mining.drill.bite (loop)                  | bound to entity; polyphony per drill              |
| tool.state.drill: coolDown     | sfx.mining.drill.coolDown + stop loop         | fade 150 ms                                       |
| combat.telegraph               | sfx.combat.telegraph.swing                    | or enemy-specific override                        |
| combat.hit                     | sfx.combat.hit.light (±variant)               | damage-based variant optional                     |
| combat.block                   | sfx.combat.block                              | —                                                 |
| combat.poiseBreak              | sfx.combat.poiseBreak                         | priority 0; duck music -4 dB 500 ms               |
| music.state                    | music.* (see §6)                              | inCombat, biomeId                                 |
| ambient.props.lamp.register    | ambient.prop.lamp.hiss.loop                   | per-entity; cap 6                                 |
| ambient.props.lamp.unregister  | — (stop loop)                                 | —                                                 |
| scene.hub.enter                | ambient.tavern.loopA; stop mine beds          | —                                                 |
| scene.mine.enter               | ambient.cavern.base.loopA; ambient.cavern.crystal.loopA; music.explore.base.loopA | biome gates                                       |



## 6) Music & Intensity Logic (MVP)

Layers:
- Base explore layer: music.explore.base.loopA
  - On scene.mine.enter: start, fade in 600 ms.
- Sparkle overlay: music.explore.sparkle.loopB
  - ON by default at low gain in Crystal Caverns; modulated by crystalDensity or depth scalar; sidechain down -1 to -2 dB during combat overlay.
- Combat overlay: music.combat.overlay.perc.loopA
  - Engage when music.state.inCombat == true; fade in 180–240 ms; fade out 340–480 ms after calm.
- Stingers:
  - Enter combat: music.stinger.enterCombat (one-shot), sidechain duck base -3 dB for 600 ms.
  - Exit combat: music.stinger.exitCombat (one-shot), same ducking.

Hysteresis (timers):
- Enter combat: require inCombat true for ≥ 1.0 s before enabling overlay.
- Exit combat: require inCombat false for ≥ 1.5 s before disabling overlay.
- Stingers: enter fires on enter threshold; exit fires on exit threshold.

State diagram (textual):
- Explore (base+sparkle) → [inCombat true sustained 1.0 s] → Combat (base+sparkle sidechained, percussion overlay ON, enter stinger)
- Combat → [inCombat false sustained 1.5 s] → Explore (overlay OFF, exit stinger)
- Scene transitions:
  - scene.mine.enter: force Explore start; resume timers.
  - scene.hub.enter: stop overlays; stop base; start ambient.tavern.loopA.



## 7) Emitter & Loop Management

Emitter API (engine-facing):
- createEmitter(id, opts:{ pos:{x,y}, followEntityId?, maxDistancePx?, loopId? })
- updateEmitter(id, { pos:{x,y} })
- stopEmitter(id, { fadeMs })

Policies:
- Drill loop:
  - One active bite loop per drill entity (polyphonyKey: sfx.mining.drill.state.entity:{entityId}).
  - spinUp: play one-shot; does NOT start loop.
  - bite: startLoop(sfx.mining.drill.bite, emitterKey=drill:{entityId}) if not running; bind to followEntityId when available.
  - coolDown: play coolDown; stopLoop(emitterKey, { fadeMs:150 }).
- Lamp hiss:
  - On ambient.props.lamp.register: createEmitter(lamp:{entityId}, { pos, loopId:ambient.prop.lamp.hiss.loop, maxDistancePx:640 }).
  - Polyphony cap 6 globally (polyphonyKey ambient.prop.lamp.hiss).
  - Auto-stop: on unregister, entity destroy, or chunk unload.
- Ambient beds:
  - Global non-spatial emitters (no follow). Singletons enforced by polyphonyKey (e.g., ambient.cavern.base).



## 8) Depth-Based Ambient Layering

Depth scalar contract:
- Event: world.depth.scalar.changed — { value:number in [0,1] }
- Source: docs/world-generation/cave-gen-algorithm.md depth lanes or pseudo-depth from room kind / entrance distance.

Mix rules:
- ambient.cavern.base.loopA:
  - Base nominal volume range 0.22–0.30 (manifest defaults).
  - Apply scale: gainScalar = 0.18 + 0.64 * depth; finalGain = nominal * gainScalar.
- ambient.cavern.crystal.loopA:
  - Crossfade vs base using crystalDensity ∈ [0,1] (from generator) or depth > 0.35 fallback.
  - Rule: crystalGainScalar = clamp(max(depth - 0.35, 0) * 1.5, 0, 1) unless explicit crystalDensity provided, then use that.
  - Crossfade guideline: as crystalGainScalar rises, reduce base by up to -3 dB smoothly.

Biome transitions:
- scene.mine.enter (biome.crystal.caverns):
  - Start both beds; immediately set gains based on current depth/crystalDensity; ramp 300–500 ms to avoid pops.
- scene.hub.enter:
  - Stop mine beds over 300 ms; start ambient.tavern.loopA (non-spatial, low bed).



## 9) Mixing, Ducking, and Priorities

Initial bus gains (advisory; manifest governs):
- master: 0 dB
- music: -4 dB
- sfx: 0 dB
- ambient: -15 dB
- ui: -6 dB

Sidechain rules (pseudo):
- On combat.poiseBreak:
  - setBusDb(music, current - 4 dB) with attack 60 ms; hold 500 ms; release 200 ms to baseline.
- On mining.break.stone:
  - setBusDb(music, current - 2 dB) with attack 10 ms; hold 220 ms; release 120 ms.
- Stingers (enter/exit):
  - base duck -3 dB for 600 ms; attack 30 ms; release 240 ms.
- UI and SFX are not ducked in MVP.

Steal policy (voice manager):
- Sort candidates by (priority asc, isPolyphonyKeyMatch desc, startTime asc).
- Steal first candidate; never steal a currently sidechained bus process.
- Ensure priority 0 always plays: if no free slot, steal any non-priority-0.



## 10) Asset & ID Authority

- data/audio/sound-manifest.json is the single source of truth for:
  - IDs, filenames/URLs, categories, buses, base volumes (linear or dB as manifest defines), priorities, maxInstances, polyphonyKey, spatial flags, loop points, streaming hints.
- All audio ids referenced by data/items/tools.json and data/combat/enemy-*.json must resolve to manifest entries. If a tool/enemy defines an override (e.g., audio.swingId, audio.telegraphId), audio-system resolves it via manifest.



## 11) Implementation Contract for src/audio/audio-system.js

Public API (promise-returning where async):
- loadManifest(urlOrObj) → Promise<void>
  - Accepts URL string or manifest object; validates schema.
- init(context?) → Promise<void>
  - Wires WebAudio or Phaser Sound manager; sets up buses per manifest.globals.buses; prepares voice manager.
- play(id, opts:{ pos?, followEntityId?, allowPolyphony?, volume? })
  - Resolves id from manifest; applies spatialization if spatial=true and pos provided; respect allowPolyphony (default true).
- startLoop(id, emitterKey, opts)
  - Starts or reuses a looping emitter keyed by emitterKey; sets loop points if provided.
- stopLoop(emitterKey, { fadeMs? })
  - Fades and stops the keyed loop.
- setBusDb(bus, db)
  - Adjusts target bus gain with smoothing (ms as per sidechain rule in effect).
- setMusicState({ inCombat, biomeId })
  - Updates music state machine; engages overlays/stingers per §6.
- setDepthScalar(value)
  - Updates depth mixing per §8.
- registerLamp(entityId, pos); unregisterLamp(entityId)
  - Convenience wrappers that emit ambient.props.lamp.register/unregister.

Engine event bindings (subscribe to):
- mining.swing → handler:
  - id = tools.json override or sfx.mining.pick.swing; play(id, { pos }).
- mining.hit → handler:
  - if tool is drill-kind: ensure drill state machine; else choose hitRock/hitOre; play with pos.
- mining.break → handler:
  - play sfx.mining.break.stone at pos; schedule duck music -2 dB 220 ms.
- tool.state.drill → handler:
  - switch(state): spinUp → play spinUp; bite → startLoop(bite, drill:{entityId}); coolDown → play coolDown; stopLoop(drill:{entityId}, 150).
- combat.telegraph → handler:
  - choose override from enemy JSON (onTelegraph) or default; play at pos (priority 1).
- combat.hit → handler:
  - choose hit variant; play at pos (respect hit-stop timing, §13).
- combat.block → handler:
  - play at pos.
- combat.poiseBreak → handler:
  - play priority 0; trigger duck rule.
- music.state → handler:
  - setMusicState(payload).
- ambient.props.lamp.register → handler:
  - create emitter and start hiss loop if polyphony allows (cap 6).
- ambient.props.lamp.unregister → handler:
  - stop emitter loop with 180–240 ms fade.
- scene.hub.enter / scene.mine.enter → handler:
  - swap ambient beds; start/stop music layers; clear combat overlay.

Spatialization details:
- Given world pos → project to screen (engine-provided).
- pan = clamp((screenX - centerX)/halfWidth, -1..1).
- d = distance from camera center; gain = 1 / (1 + d/pxFalloff); default pxFalloff = 480; minGain clamp 0.08 for audibility if needed per asset.

Loop seam handling:
- Prefer pre-trimmed loop files; honor manifest loopStart/loopEnd if present.
- If engine supports gapless looping (WebAudio AudioBufferSourceNode with loop points), use it.
- Safety crossfade at loop start 10–20 ms for streamed assets to avoid clicks.
- Start/stop fades: standard 30–60 ms unless otherwise specified (drill 150 ms coolDown).



## 12) Mining Rhythm Rules

Cadence targets:
- Pickaxe T1: 520 ms swing cycle.
- Pickaxe T2: 480 ms swing cycle.
- Drill bite pulse: 140 ms accent tick (optional quiet one-shot layered with loop).

Scheduling and sync:
- MiningSystem emits mining.hit on the animation strike keyframe (preferred).
- If only mining.swing provided, schedule a synthetic mining.hit at t = swingTime + 70–90 ms (default 80 ms) for alignment.
- sfx.mining.pick.swing should fire at swing windup start; sfx.mining.pick.hit* at strike; sfx.mining.break.stone at break frame.

Anti-spam:
- Polyphony cap for sfx.mining.hit.* (polyphonyKey sfx.mining.hit.rock) set to maxInstances 6.
- Enforce a 40 ms minimum interval per polyphonyKey to prevent machine-gun overlaps in clustered strikes.



## 13) Combat Intensity & Hit-Stop Integration

- Hit and block sounds must fire exactly on the frame the hit-stop begins; audio should not be time-stretched during freeze.
- telegraph plays on windup start (enemy onTelegraph) to align with visual cue tokens per docs/visual-systems/style-guide.md.
- poiseBreak overrides other combat sounds in perceptual prominence via priority 0 and ducking; it still coexists (no mute) with hit/block if they coincide, but its bus-sidechain ensures clarity.



## 14) Debug & Tools

Debug HUD (dev only):
- Toggle: DEBUG_AUDIO_HUD.
- Show active voices per bus (master aggregate + per-bus counts).
- List last 12 events with timestamps, chosen id, priority, polyphonyKey, steal decision.
- Visualize spatial emitters: small icon per emitter, panner value indicator, and falloff radius ring (use color-palette.json tokens only).

Log policy:
- Gate under DEBUG_AUDIO flag.
- On each play/startLoop/stopLoop:
  - Print: [AUDIO] event=<name> id=<manifestId> prio=<n> key=<polyKey> action=<play|steal victim|startLoop|stopLoop> bus=<name>.
- Suppress in production builds.



## 15) Acceptance & QA Checklist

- IDs and events:
  - All MVP interactions in §5 exercised; all ids resolve in data/audio/sound-manifest.json; tools/enemy overrides honored.
- Loops and beds:
  - Explore base, sparkle, and combat overlay transition without pops; loop points clean; start/stop fades applied.
- Voice management:
  - Caps and polyphonyKey enforcement verified; priority 0 always plays; deterministic steal order.
- Drill machine:
  - spinUp → bite loop → coolDown path correct; one loop per drill entity; 150 ms stop fade.
- Lamps:
  - Lamp hiss registration/unregistration works; global cap 6 respected; auto-stop on destroy/unload.
- Depth and biome:
  - world.depth.scalar.changed modulates bed gains smoothly; crystal crossfade audible and stable; scene transitions behave.
- Music state:
  - Hysteresis: 1.0 s enter, 1.5 s exit confirmed; enter/exit stingers fire once; overlays fade per §6.
- Mixing and ducking:
  - Bus gains initialized per advisory; sidechain rules for poiseBreak and mining.break verified (attack/hold/release).
- Rhythm and sync:
  - Mining swing → hit alignment within 10–15 ms; fallback scheduling works; anti-spam caps respected.
- Combat timing:
  - Hit/block audible during hit-stop; telegraph on windup; poiseBreak dominates perceptually.
- Debug:
  - HUD renders counts and emitters; logs show event/id/priority/polyphony decisions; flags gate correctly.
- Visual references:
  - Any visual color mentions use tokens from data/visual/color-palette.json only; no raw hex anywhere.