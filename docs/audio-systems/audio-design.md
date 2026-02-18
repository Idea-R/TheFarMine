# Audio System Design — Rhythm of Brass and Stone (Sprint 1)

Provenance
- Owner: @zeta (Audio Systems — Echoheart Bellowsong)
- Author: Echoheart Bellowsong (Audio Systems — Zeta)
- Scope: Implementation-ready contracts and behavior for src/audio/audio-system.js wired against data/audio/sound-manifest.json v1.

Cross-References
- data/audio/sound-manifest.json (authoritative asset, bus, and polyphony metadata)
- docs/technology-systems/crafting-design.md (§8 Audio/UI Event Bridge)
- docs/combat-systems/combat-design.md (§10 Events & Contracts)
- docs/world-generation/cave-gen-algorithm.md (§1 depth tint mention)
- src/core/ecs-registry.js (ENTITY_TYPES, IDs carried in events)
- data/visual/color-palette.json (mapping.* tokens; aligns with ambience depth tinting)
- Future companion: docs/audio-systems/music-direction.md (tempo, bar grid, arrangement)



## 1) Goals & MVP Scope

Priorities (Sprint 1)
- Audible clarity in busy scenes; crisp transient delivery under hit-stop.
- Three‑Wide readability support: midrange-forward SFX, restrained low-end; single-bus stereo, minimal spatial spread.
- Deterministic routing via manifest IDs; no implicit routing in code.
- Low-polyphony footprint on web; strict category limits; fair voice-steal.
- Bar-aligned music transitions with simple hysteresis; stingers quantized to bar.
- Depth-aware ambient layering with a single normalized depth scalar.

Acceptance Notes
- All sounds map 1:1 to manifest asset ids; no magic strings outside manifest.
- Event→Audio mapping binds to ECS events verbatim.
- Bus graph, emitter categories, voice rules, and collapse windows must honor manifest.globals (buses, categoryLimits, polyphony).
- Collapse windows match manifest.globals.polyphony.collapseWindowsMs exactly.



## 2) Bus Graph & Categories (Authoritative)

Buses (from manifest.globals.buses)
- master: root bus, receives all program audio.
- music: child of master. Hosts music loops and stingers.
- sfx: child of master. Hosts mining, combat, drill, and general SFX.
- ambient: child of master. Hosts environmental loops.
- ui: child of master. Hosts UI click/tooltip/crafting cues.
- Initial gains: read exactly from manifest.globals.buses[*].gain (linear 0..1). Do not override in code. Assets specify linear gain 0..1; bus trims are applied multiplicatively on top.

Category Limits (from manifest.globals.categoryLimits)
- music: 4 voices
- sfx: 16 voices
- ambient: 4 voices
- ui: 8 voices
- Enforced per-category; overflow triggers voice steal rules below.

Ducking Rules (from manifest.globals.ducking.rules)
- Rule 1: sfx ducks music. Purpose: let impacts/swing telegraphs cut through. Attack/release envelopes per manifest; fast attack, moderate release.
- Rule 2: combat overlay/hits further duck music (stronger than generic sfx). Purpose: increase combat clarity. Attack fast; release slower than Rule 1.
- Rule 3: stingers duck both music base and ambient. Purpose: spotlight transitions. Attack immediate; release long tail to avoid pumping.
- Rule 4: ui lightly ducks music (never ducks sfx). Purpose: tactile responsiveness without masking core action. Short attack and quick release.
- Implementation: envelopes are defined in manifest (amount, attackMs, holdMs, releaseMs). Audio engine reads them verbatim and applies on target buses.



## 3) Asset/ID Conventions and Preload Strategy

Representative Asset IDs (reference-only; actual metadata from manifest)
- Ambient:
  - ambient.mine.drip.loopA
  - ambient.mine.steam.hiss.loopA
  - ambient.tavern.loopA
- Mining:
  - sfx.mining.swing.pick.light
  - sfx.mining.hit.rock
  - sfx.mining.hit.ore
  - sfx.mining.break.stone
- Drill:
  - sfx.drill.spinUp
  - sfx.drill.bite.loopA
  - sfx.drill.coolDown
- Combat:
  - sfx.combat.telegraph.swing
  - sfx.combat.hit.light
  - sfx.combat.block
  - sfx.combat.poiseBreak
- UI:
  - ui.click
  - ui.inventory.move
  - ui.craft.start
  - ui.craft.complete
  - ui.tooltip.warn
- Music:
  - music.explore.base.loopA
  - music.explore.sparkle.loopA
  - music.combat.overlay.perc.loopA
  - music.stinger.enterCombat
  - music.stinger.exitCombat

Preload Strategy (from manifest.globals.preload)
- onBoot: preload exactly the ids listed in manifest.globals.preload.onBoot (typically UI core, base music bed, minimal SFX). No extra ids.
- onScene: on scene enter, preload manifest.globals.preload.onScene for that scene key (e.g., “Mine”), including ambient loops and primary interaction SFX.
- Lazy loading: future biomes load their ambient/music/SFX packs upon first entry; evict least-recent packs on memory pressure. Do not lazy-load during combat entry—ensure combat overlay and stingers are either onBoot or pre-warmed onScene.



## 4) Event Bridge — Domain→Audio Mapping (Contracts)

Source Events (payloads verbatim; see cross-refs)
- MiningSystem emits:
  - mining.Swing { toolId, tileType, oreType|null, eligible }
  - mining.Progress { toolId, tileType, oreType|null, applied }
  - mining.Break { toolId, tileType, oreType|null, pos:{x,y} }
  - mining.Deny { reason:"hardness|stamina|angle", toolId }
- CombatSystem emits:
  - combat.TelegraphStart { attackerId, attackId, windupMs }
  - combat.AttackActivate { attackerId, attackId, ... }
  - combat.Hit { attackerId, victimId, attackId, blocked, damage:{health,poise}, poiseBreak }
  - combat.PoiseBreak { entityId, breakDurationMs }
  - combat.AttackEnd { attackerId, attackId }

Mapping Rules (MVP)
- mining.Swing:
  - If eligible === true: play sfx.mining.swing.pick.light (collapse key: mine.swing).
  - If eligible === false: silence for MVP (soft tick out-of-scope).
- mining.Progress:
  - If oreType is null: no immediate sound (let hit event handle).
  - If applied > 0 and tileType rock and oreType is null: play sfx.mining.hit.rock (collapse key: hits).
  - If oreType present: play sfx.mining.hit.ore (collapse key: hits).
- mining.Break: play sfx.mining.break.stone (highest mining priority).
- mining.Deny:
  - If reason === "stamina": play ui.tooltip.warn on UI bus.
  - If reason === "hardness": play ui.tooltip.warn on UI bus (MVP).
  - If reason === "angle": silent (MVP).
- combat.TelegraphStart: play sfx.combat.telegraph.swing (global; non-positional; collapse key may share with swings tier).
- combat.Hit:
  - If blocked === true: play sfx.combat.block (collapse key: combat.block).
  - Else: play sfx.combat.hit.light (collapse key: combat.hit.light).
  - If poiseBreak === true: also play sfx.combat.poiseBreak (do not collapse with hit).
- Drill state machine: see §7 for transitions and timings (spinUp → bite loop start/stop → coolDown).

Quick-Reference Mapping List (aligned to manifest IDs)
- mining.Swing → sfx.mining.swing.pick.light
- mining.Progress (rock/ore) → sfx.mining.hit.rock / sfx.mining.hit.ore
- mining.Break → sfx.mining.break.stone
- mining.Deny (stamina|hardness) → ui.tooltip.warn
- combat.TelegraphStart → sfx.combat.telegraph.swing
- combat.Hit (blocked:false) → sfx.combat.hit.light
- combat.Hit (blocked:true) → sfx.combat.block
- combat.PoiseBreak → sfx.combat.poiseBreak
- Drill SpinUp/Bite/CoolDown → sfx.drill.spinUp / sfx.drill.bite.loopA / sfx.drill.coolDown
- UI: click/inventory/craft start/complete → ui.click / ui.inventory.move / ui.craft.start / ui.craft.complete



## 5) Ambient Layering — Depth‑Based Mix Plan

Mine Scene (MVP)
- Active loops (ambient bus):
  - ambient.mine.drip.loopA
  - ambient.mine.steam.hiss.loopA
- Depth scalar input: normalized depth d ∈ [0..1] supplied by world/renderer (0 = shallow, 1 = deepest). Single scalar only; no per-axis panning in MVP.
- Per-loop gain trims (applied multiplicatively with bus gain):
  - dripGain(d) = lerp(0.75, 0.95, d)
  - steamGain(d) = lerp(0.80, 0.90, d)
- Start both loops on scene enter (after preload). Adjust gains each render-second (≤10 Hz rate) to avoid zippering.
- Tavern Scene: play ambient.tavern.loopA only, fixed gain from manifest; no depth modulation in MVP.

Future Biomes
- Hook: ambient-controller swaps loop IDs based on biome tag; depth scalar reused if biome defines depth-linked layers.



## 6) Drill Hysteresis — Audio State Machine

States
- Idle → SpinUp → Bite(looping) → CoolDown → Idle

Triggers
- Enter SpinUp: tool hold begins on eligible tile; MiningSystem reports bite engagement.
- Transition to Bite: SpinUp one-shot completes OR bite engagement persists beyond debounce.
- Leave Bite: on release or ineligible contact loss > debounce window (120–180 ms). Immediately stop Bite loop.
- Enter CoolDown: on Bite end (one-shot).
- Return Idle: after CoolDown completion.

Assets
- sfx.drill.spinUp (one-shot; category sfx; priority “drill tier”)
- sfx.drill.bite.loopA (loop:true; category sfx; polyphony key drill.bite)
- sfx.drill.coolDown (one-shot)

Behavior Notes
- Debounce window: 120–180 ms; implement as manifest.globals.polyphony.collapseWindowsMs.drill.bite for suppression of flaps and as loop stop grace.
- pulseIntervalMs = 160 ms (gameplay timing) informs animation/hit-stop; audio bite remains continuous and should not be retriggered by each bite pulse.
- Hit-stop does not pause bite loop (see §11).



## 7) Polyphony, Priority, and Collapse Windows

Collapse Windows (from manifest.globals.polyphony.collapseWindowsMs)
- mine.swing: 120 ms
- hits: 40 ms
- drill.bite: 60 ms
- combat.hit.light: 35 ms
- combat.block: 35 ms
- ui.*: 30 ms

Mechanics
- Each asset maps to a polyphonyKey (examples):
  - sfx.mining.swing.pick.light → mine.swing
  - sfx.mining.hit.rock / sfx.mining.hit.ore → hits
  - sfx.drill.bite.loopA (start) → drill.bite
  - sfx.combat.hit.light → combat.hit.light
  - sfx.combat.block → combat.block
  - ui.* → ui.*
- Subsequent triggers within the window for the same key are dropped. Optional behavior “retrim instead of drop” is disabled for MVP unless specified in manifest.
- Windows are checked before voice allocation to avoid churn.

Priority Tiers (from manifest notes; compare on [0..100])
- Stingers: 100
- Break (e.g., sfx.mining.break.stone): 90
- Drill: 86
- Hit/Block: 84–86
- Swings/Telegraphs: ~70
- UI: mid‑50s
- Ambient: mid‑40s
- Base Music Beds: 80–82 (never stolen by stingers; see below)

Voice Stealing
- Within a category over limit: steal the lowest priority, then oldest if tie.
- Music category: stingers never steal base beds; beds sidechain-duck under stingers per ducking rule.
- SFX category: swings can be stolen before blocks/hits; drill one‑shots protected above swings.



## 8) Spatialization & Emitters (MVP-simple)

MVP Playback (non-positional)
- All playback is non-positional; emitters accept pos but it is ignored in MVP.
- Flat stereo, no panning/attenuation; clarity first.

Emitter/API Contracts (forward-compatible)
- Audio.play(id: string, opts?: { pos?: { x: number, y: number }, variations?: string[], gain?: number }): Promise<VoiceHandle>
- Audio.stop(id: string): void
- Audio.setBusGain(busId: "master"|"music"|"sfx"|"ambient"|"ui", gain: number): void
- Notes:
  - gain is linear [0..1] scalar applied per instance; multiplied by asset default gain and bus trims.
  - variations (if provided by manifest) allow pick from variant list; MVP may ignore if not present.



## 9) Music Conductor & Intensity Rules (MVP)

Loops
- Base: music.explore.base.loopA (persistent in exploration)
- Sparkle: music.explore.sparkle.loopA (optional layer; toggled by exploration intensity)
- Combat Overlay: music.combat.overlay.perc.loopA (enabled during combat state)

Stingers
- Enter Combat: music.stinger.enterCombat on first combat.TelegraphStart when not already in combat.
- Exit Combat: music.stinger.exitCombat when combat ends after calm hysteresis.

Bar Alignment
- Assets with align:"bar" in manifest must start/stop on next bar boundary.
- Conductor uses a default project tempo/grid defined in music-direction.md (MVP placeholder; quantize = 1 bar).
- Stingers queue to the next bar; overlay in/out crossfades aligned to bar.

Hysteresis
- Combat state remains active for ≥4 bars after the last combat event (Telegraph/Hit/AttackEnd). After hysteresis:
  - Fade out music.combat.overlay.perc.loopA over 1 bar (unless manifest specifies a different crossfade).
  - Trigger music.stinger.exitCombat queued to next bar.
- If new combat event arrives during fade, re-enable overlay at next bar (cancel exit stinger).



## 10) Ducking & Hit‑Stop Interactions

Ducking Recap
- Apply the four manifest-defined rules exactly (see §2). Envelopes are attack/hold/release time-domain gain trims on target buses.
- Ordering: ducking is applied after voice routing and before final bus output; multiple ducks sum in dB domain (or multiply linearly) per engine implementation, clamped to floor.

Hit‑Stop
- Hit-stop does not pause audio playback; no time-stretch or pitch freeze in MVP.
- Short SFX cut through via category priority and ducking on music/ambient. Ensure impacts remain audible during freeze frames.



## 11) Debug & Telemetry Hooks

Dev Overlay (recommendation)
- Active voices by bus (count + per-voice id).
- Recent Event→Asset mapping (ring buffer of 16).
- Polyphony counters per key and last-trigger timestamps.
- Conductor bar/beat display; next-quantize ETA.

Logging (dev builds)
- Warn once if an event arrives with unknown mapping key or asset id not found in manifest.
- Include the offending event name and indicative payload keys; no spam (rate-limit).



## 12) Quick-Reference Mapping Table (Engineer-facing)

- mining.Swing → sfx.mining.swing.pick.light
- mining.Progress rock/ore → sfx.mining.hit.rock / sfx.mining.hit.ore
- mining.Break → sfx.mining.break.stone
- mining.Deny(stamina|hardness) → ui.tooltip.warn
- combat.TelegraphStart → sfx.combat.telegraph.swing
- combat.Hit(blocked:false) → sfx.combat.hit.light
- combat.Hit(blocked:true) → sfx.combat.block
- combat.PoiseBreak → sfx.combat.poiseBreak
- drill: SpinUp/Bite/CoolDown → sfx.drill.spinUp / sfx.drill.bite.loopA / sfx.drill.coolDown
- UI: click/inventory/craft start/complete → ui.click / ui.inventory.move / ui.craft.start / ui.craft.complete



## 13) Integration Notes & Order of Operations

Systems Order (runtime)
- ECS emits domain event
- AudioEventBridge resolves mapping → asset id(s), category, polyphonyKey
- Polyphony check and collapse window gating
- Voice allocation by category with priority; apply voice steal if required
- Route to bus; apply per-instance gain; engage ducking envelopes if any

Scene Lifecycle
- On Scene enter:
  - Preload manifest.globals.preload.onScene set for the scene.
  - Start ambient base loops (Mine: drip + steam; Tavern: tavern loop).
  - Start exploration base music bed(s) as per music-direction.md.
- On Scene exit:
  - Stop ambient gracefully (short fade).
  - Maintain music bed continuity if next scene shares context; else fade per manifest.

Audio System Contracts (src/audio/audio-system.js)
- init(manifest: ManifestV1): void
  - Build bus graph from manifest.globals.buses; set initial gains.
  - Register category limits, priorities, ducking rules, and polyphony windows.
- handleEvent(name: string, payload: object): void
  - Implement mappings in §4; forbid non-manifest ids.
- setDepthScalar(depth01: number): void
  - Apply ambient gain trims per §5 (clamped [0..1], update at ≤10 Hz).
- conductor.tick(timeMs: number): void
  - Maintain bar grid; quantize starts/stops for align:"bar" assets; enforce hysteresis in §9.



## 14) Acceptance Checklist

- All mappings point to ids that exist in data/audio/sound-manifest.json.
- Bus graph, category limits, ducking rules, and collapse windows match manifest.globals exactly.
- Drill hysteresis states and triggers are defined and unambiguous; debounce 120–180 ms respected.
- Bar-aligned music rules with 4‑bar combat hysteresis are documented.
- Ambient depth plan specified with a single normalized depth scalar input and gain formulas.
- Concise quick-reference mapping provided for engineers (see §§4 and 12).



— Echoheart Bellowsong, Audio Systems — Zeta