# Audio System — Stone, Steam, and Song (Sprint 1)

Provenance
- Owner: @zeta
- Author: Echoheart Bellowsong (Audio Systems)
- This document is authoritative for Sprint 1 audio behavior, APIs, and IDs.

Cross-references
- data/audio/sound-manifest.json
- docs/combat-systems/combat-design.md (§Events & cues)
- docs/technology-systems/crafting-design.md (§Mining/Crafting events)
- docs/world-generation/cave-gen-algorithm.md (§Lighting & depth)
- data/items/tools.json
- data/visual/color-palette.json
- Planned implementation: src/audio/audio-system.js


## 1) Design Pillars & MVP Goals

Principles
- Clarity over clutter: Every sound must communicate state or texture; avoid noise.
- Musical mining cadence: Repeated actions (mining, drilling) form a rhythmic bed that complements music.
- Readable telegraphs: Combat cues must be unambiguous and time-reliable.
- Tasteful ducking: Prioritize critical cues without harsh pumping.
- Lean web footprint: Minimal CPU/voice usage; predictable memory.

MVP goals
- Robust event→sound mapping driven by manifest and tool data.
- Depth-driven ambience with lightweight parameterization.
- Simple dynamic music blending hooks with bar alignment.


## 2) Runtime Architecture Overview

Audio buses
- Buses (must match sound-manifest.globals.buses):
  - master
  - music
  - sfx
  - ambient
  - ui

Voice management
- Per-category limits are read from manifest.globals.voiceLimits. Sprint 1 target caps:
  - music: 3
  - sfx: 16
  - ambient: 8
  - ui: 8
- Each play call carries:
  - priority (number)
  - polyphonyKey (optional string)
  - category (bus/category)
- Replacement policy:
  - If category limit reached:
    - Prefer not to steal same polyphonyKey if currently sustaining (see Polyphony).
    - Otherwise evict the lowest-priority voice in that category.
    - On priority tie, evict the oldest-started voice.
- PolyphonyKey collapse (see §6) applies before category limit evaluation:
  - If a voice with the same polyphonyKey is active and the asset specifies collapse=true, drop the new play or re-trigger per asset rule.

Routing defaults
- Defaults loaded from manifest.globals.routingDefaults:
  - Example: { category: "sfx", bus: "sfx", gain: 1.0, spatial: "2d" }
- Each asset may override:
  - bus, category, defaultGain, startAt, loop, spatialization mode, duck sends/targets.

Ducking matrix
- audio-system reads manifest.globals.ducking as a list of rules:
  - Each rule: { sourceBus, targetBus, amountDb, attackMs, holdMs, releaseMs, behavior }
  - behavior: "restart" (envelope restarts on each trigger), "accumulate" (extend hold), or "ignore" within hold.
- The mixer keeps an envelope per (sourceBus → targetBus) pair.
- Multiple concurrent sources on the same bus coalesce into a single envelope via:
  - attack: take max instantaneous level; restart if behavior=restart
  - hold: extend to max next expiry on new trigger if behavior=accumulate
- Envelope application is multiplicative gain on targetBus.

Preload strategy
- onBoot:
  - UI essentials: ui.click, ui.inventory.move, ui.tooltip.warn, ui.craft.start, ui.craft.complete
  - Minimal music bed (explore.base.loopA) for quick scene readiness if memory allows
- onScene:
  - Scene-specific ambiences/loops: ambient.mine.drip.loopA, ambient.mine.steam.hiss.loopA, ambient.tavern.loopA
  - Combat overlay and stingers: music.stinger.enterCombat, music.stinger.exitCombat, music.combat.overlay.perc.loopA
- lazy:
  - Rare/large SFX: mining.rareOre.hit, sfx.combat.poiseBreak, pick variant layers, drill coolDown if large sample
- Phaser loader usage:
  - Tagging: each asset has a loaderHint: "onBoot" | "onScene" | "lazy" from manifest; audio-system enqueues via scene.load.audio(key, url).
  - onScene assets load in scene preload; lazy assets requested on first play attempt (queue and play when ready unless critical; see §10).
  - Use scene.load.once('complete') to flip ready flags.
  - Decode on load completion to avoid first-play hitches where supported.


## 3) Event Bridge & Trigger Rules (Authoritative Contracts)

Overview
- AudioEventBridge subscribes to ECS/domain events and issues:
  - play(sfxId, options)
  - stop(sfxId or polyphonyKey)
  - setParameter(paramName, value, options)
- All ids must exist in data/audio/sound-manifest.json or be resolvable via data/items/tools.json mappings.

Event: mining.Swing
- Payload example:
  - { playerId, toolId, target: { tileType, hardness }, staminaOk: boolean, t: millis }
- Mapping:
  - Resolve tool audio from data/items/tools.json: tools[toolId].audio.*.
  - For pick-type tools (tool.audio.kind === "pick"):
    - play(tool.audio.swingId) with category sfx, priority "swings" (70), polyphonyKey "mine.swing.player:{playerId}" with 35 ms rate limit (see Timing).
  - For drill-type tools (tool.audio.kind === "drill"):
    - On first eligible hold (see mining.Progress), do not play Swing; spinUp handled in Progress rules.

Event: mining.Progress
- Fired periodically while mining is applying work.
- Payload example:
  - { playerId, toolId, dtMs, progress01, eligible: boolean, t: millis }
- Mapping:
  - For pick-type tools:
    - On eligible hit frame (engine should emit a distinct hit or set eligible && deltaHardness event), play(tool.audio.hitRockId or sfx.mine.hit.rock) with:
      - priority "pick hits" (80)
      - polyphonyKey "mine.hit.rock:{targetTileHash}" collapsed with 35 ms minimum gap per key (see §6).
  - For drill-type tools:
    - On eligible becomes true and drill not spinning:
      - play(tool.audio.spinUpId or sfx.drill.spinUp) priority 86; set flag drillActive[playerId]=true; record lastSpinUpAt=t.
      - After spinUp latency (asset attack), start loop bite:
        - play(tool.audio.biteLoopId or sfx.drill.bite.loop) looped, priority 86, polyphonyKey "drill.bite:{playerId}".
    - While eligible && drillActive: keep loop alive; refresh hysteresis timer.
    - If eligible becomes false (loss of target or stamina) or on release:
      - If loop is running: stop polyphonyKey "drill.bite:{playerId}" after minimum sustain (250 ms; see Hysteresis).
      - If lastSpinUpAt within 1200 ms: play(tool.audio.coolDownId or sfx.drill.coolDown) priority 86.

Event: mining.Break
- Payload example:
  - { playerId, toolId, target: { tileType, dropTable }, t: millis }
- Mapping:
  - Play break SFX: tool.audio.breakId if present else sfx.mine.break.generic
  - priority "mining break" (90), polyphonyKey "mine.break:{targetTileHash}" to avoid double-firing in multi-hit frames.

Event: mining.Deny
- Payload example:
  - { playerId, toolId, reason: "stamina" | "hardness" | "range", t: millis }
- Mapping:
  - Optional: future "deny thud". For MVP, route to UI warn:
    - play(ui.tooltip.warn) priority 52.
  - Note: Add stone thud variant in Sprint 2.

Event: crafting.Start / crafting.Complete / crafting.Canceled
- Payload example:
  - { stationId, recipeId, playerId, t: millis }
- Mapping:
  - crafting.Start → play(ui.craft.start) priority 54
  - crafting.Complete → play(ui.craft.complete) priority 56
  - crafting.Canceled → optional no-op in MVP

Event: combat.TelegraphStart
- Payload example:
  - { enemyId, telegraphType: "swing" | "stab" | "slam", t: millis, inAggro: boolean }
- Mapping:
  - play(sfx.combat.telegraph.swing) priority determined by telegraph content; default 75.
  - Music overlay arming (see Timing rules).

Event: combat.Hit
- Payload example:
  - { attackerId, victimId, hitType: "light" | "heavy" | "aoe", t: millis }
- Mapping:
  - play(sfx.combat.hit.light) default for MVP. Heavier types can map to sfx.combat.hit.heavy if present.
  - priority 82 for light, 88 for heavy.

Event: combat.Block
- Payload example:
  - { blockerId, perfect: boolean, t: millis }
- Mapping:
  - play(sfx.combat.block) priority 84
  - Note: perfect block variant slated for future (e.g., sfx.combat.block.perfect).

Event: combat.PoiseBreak
- Payload example:
  - { targetId, t: millis }
- Mapping:
  - play(sfx.combat.poiseBreak) priority 90

Event: ui.Interaction (generic)
- Payload example:
  - { kind: "click" | "inventory.move" | "tooltip.warn", t: millis }
- Mapping:
  - "click" → play(ui.click) priority 50
  - "inventory.move" → play(ui.inventory.move) priority 52
  - "tooltip.warn" (insufficient stamina/hardness gate message shown) → play(ui.tooltip.warn) priority 52

Timing rules & hysteresis
- Music combat overlay:
  - On first combat.TelegraphStart with inAggro=true:
    - Set combatState=active; request bar-aligned stinger:
      - schedule play(music.stinger.enterCombat) at next bar boundary (MusicConductor.alignToNextBar; see §7)
      - schedule enabling music.combat.overlay.perc.loopA at the same bar start (fade-in 1 bar)
  - While combat events continue, keep a "lastCombatEventAt" timestamp.
  - If 3000 ms pass without combat events:
    - schedule play(music.stinger.exitCombat) at next bar boundary
    - schedule fade-out/stop of music.combat.overlay.perc.loopA at bar end (1-bar fade)
    - clear combatState when overlay fully faded.
- Drill loop hysteresis:
  - bite loop minimum sustain: 250 ms from loop start; early stops are deferred until threshold.
  - coolDown triggers only if spinUp played within the last 1200 ms (lastSpinUpAt check).
- Mining swing rate limit:
  - For polyphonyKey groups "mine.swing.player:{playerId}" and "mine.hit.rock:{tileHash}":
    - Enforce ≥35 ms between plays per key. New triggers within window collapse (counted in debug metrics).


## 4) Depth-Driven Ambience Layering

Depth parameter
- depth01 ∈ [0..1], source of truth from world/scene:
  - Preferred: normalized player Y over map height (clamped 0..1).
  - Fallback heuristic by scene/biome:
    - tavern: 0.00
    - near-surface rooms: ~0.25
    - mid mine: ~0.50
    - deep mine: ~0.75+
- audio-system exposes setParameter("depth01", v) to ambience/music.

Ambient layers (MVP)
- ambient.mine.drip.loopA — base cave loop
- ambient.mine.steam.hiss.loopA — subtle machinery hiss
- ambient.tavern.loopA — hub ambience (exclusive to tavern scene)

Mixing rules
- In-mine scenes:
  - Ensure both mine layers are playing (looped), non-positional on ambient bus.
  - Volumes are modulated by depth01:
    - dripVol = clamp(0.32 + 0.18 * depth01, 0.0, 1.0)
    - steamVol = clamp(0.26 + 0.12 * (1 - |depth01 - 0.4| / 0.4), 0.0, 1.0)
      - This gives a gentle bell around mid-depths.
  - Optional subtle pan drift (static per session): ≤ ±0.1 to add width; keep coherent in mono.
- Tavern scene:
  - Stop mine layers; play ambient.tavern.loopA at manifest default gain.
- Re-application cadence:
  - Recompute and apply gains when |depth01 - lastDepth01| > 0.02 or every 500 ms, whichever first.
- Future: Use depth01 to drive reverb send and lowpass tilt on ambience/music tints.


## 5) Priority, Polyphony, and Limits

Category limits (restate; enforce per §2)
- music: 3
- sfx: 16
- ambient: 8
- ui: 8

Priority tiers (higher = more important)
- music.stinger.*: 100
- music.combat.overlay.*: 95
- mining break: 90
- drill loops (spinUp/bite/coolDown): 86
- pick hits: 80
- swings/telegraphs: 70–78
- UI: 50–56
- ambient: 40–50

Polyphony keys and collapse rules
- "mine.hit.rock:{tileHash}" — collapse concurrent impacts per tile; 35 ms min gap per key.
- "drill.bite:{playerId}" — single instance per player; start/stop gated by hysteresis.
- "music.overlay.combat" — single-instance overlay guard; re-entrance reuses layer with fades.
- "ui.click" — allow up to 3 overlapping without key; if polyphonyKey used, collapse within 20 ms (optional).
- "sfx.combat.telegraph:{enemyId}" — collapse duplicates within 50 ms for the same enemy to avoid double posts.

Replacement strategy detail
- When stealing due to limits, avoid stealing:
  - An asset with priority ≥ the incoming asset.
  - A sustaining loop with a polyphonyKey equal to the incoming (unless the incoming is a stop/replace).
- Oldest wins on tie to favor recency of new cues.


## 6) Music Layering & Bar Alignment Hooks

Transport contract
- MusicConductor interface (MVP stub in audio-system):
  - getBPM(): number — returns 92
  - getTimeSignature(): { numerator: 4, denominator: 4 }
  - getCurrentBar(): integer
  - getCurrentBeat(): integer (1..4)
  - getTimeToNextBarMs(): number
  - alignToNextBar(callback): schedules callback at next bar start with ±10 ms tolerance
- If no engine-level conductor is available:
  - Use timer-based approximation at 92 BPM (bar = 4 beats ≈ 2608.695 ms).
  - Maintain drift correction by timestamping bar starts and clamping scheduling error within ±10 ms.

Layer set (MVP)
- explore.base.loopA — always on in-mine (after load), low priority music bed.
- explore.sparkle.loopB — optional shimmer, engages on discovery states (ore cluster found, room enter).
- combat.overlay.perc.loopA — percussive overlay for combat intensity.
- Stingers:
  - music.stinger.enterCombat
  - music.stinger.exitCombat

State machine
- Enter Mine:
  - Start explore.base.loopA (fade-in 1 bar).
- Discovery event (e.g., ore found, room enter):
  - Enable explore.sparkle.loopB for 8 bars, 1-bar fade-in/out; retrigger within active window extends to next 8-bar boundary.
- Combat overlay (see §3 Timing):
  - Stingers aligned to next bar; overlay crossfades on bar starts.
- Exit Mine or enter Tavern:
  - Fade out explore layers over 1–2 bars as scene switches; start ambient.tavern.loopA.


## 7) Emitter & 2D Spatialization Rules

MVP spatialization
- Most assets mixed in 2D (centered) to simplify.
- Simple pan law for localized SFX (enemy hits, large breaks) when a world position is available:
  - Compute normalized x offset = (emitterX - cameraCenterX) / (viewportWidth/2)
  - pan = clamp(offset, -0.7, 0.7)
  - Apply gentle distance attenuation within radius=320 px:
    - dist = distance(emitter, listener)
    - gainMul = 1.0 for dist ≤ 64; then linear falloff to 0.6 at 320 px (clamp ≥ 0.6 to avoid overly quiet cues)
- Ambient and music are non-positional.

Emitter API expectations (for future expansion)
- playAt(sfxId, { x, y, category?, priority?, polyphonyKey? })
- stopByKey(polyphonyKey)
- setEmitterParams(polyphonyKey, { pan?, gain?, lpHz? })
- Internally, positional sounds still route to sfx bus with per-voice pan/gain.


## 8) Mixing Targets & Loudness Notes

Targets
- Music bus: around -16 to -18 LUFS integrated (content-dependent).
- SFX: transient peaks -6 to -8 dBFS; average comfortable under mix bed.
- UI: -10 to -12 LUFS short-term for legibility over music.
- In-manifest trims are starting points; expect post-audition tweaks.

Safety and headroom
- No limiter in MVP master chain.
- Avoid clipping through:
  - Conservative default gains.
  - Ducking on overlays and heavy transients per manifest.globals.ducking.
  - Priority/voice limits to prevent overcrowding.


## 9) Error Handling & Fallbacks

- Unknown sfxId:
  - Log-once warning: [Audio] Unknown sfxId "<id>" — ignoring.
  - No-op; do not throw.
- Asset not loaded:
  - If asset has loaderHint != "onBoot":
    - Queue lazy load; mark a pending play request if not critical.
    - For critical gameplay categories (combat/mine):
      - Silent fallback (drop the play), record telemetry counter "missing-asset-hit".
- Unknown tool audio mapping:
  - If toolId exists but tool.audio.* missing:
    - Fallback to generic pick/drill ids:
      - pick: sfx.mine.pick.swing, sfx.mine.hit.rock, sfx.mine.break.generic
      - drill: sfx.drill.spinUp, sfx.drill.bite.loop, sfx.drill.coolDown
  - If toolId missing entirely: warn-once and no-op for non-critical events; still use generic for mining.Progress/Break if possible.
- Unknown color/palette tokens are out of scope for audio system (UI responsibility).


## 10) Debugging & Telemetry

Debug overlay toggles (audioSystem._debug.uiEnabled)
- Active voices list (id, category, priority, age, polyphonyKey).
- Per-bus gains and ducking envelopes (attack/hold/release state, dB).
- Current music state: active layers, bars-to-transition, BPM, bar/beat.
- Depth01 readout and applied ambient gains.

Log counters (audioSystem._debug.counters)
- voiceDropsByCategory
- polyphonyCollapses
- missingAssetHits
- duckingActivations
- barAlignCallbacksFired / LateByMs (histogram)
- rateLimitedEvents (by key)

Hooks
- audioSystem._debug.registerInspector(fn): subscribe to periodic snapshots (e.g., every 500 ms).


## 11) Integration Steps & TODOs

Contracts to implement in src/audio/audio-system.js
- Manifest loader:
  - Load data/audio/sound-manifest.json; build index by sfxId; apply globals (buses, routingDefaults, ducking, voiceLimits).
- Bus graph:
  - Create buses: master/music/sfx/ambient/ui with gain nodes and ducking processors.
- Event subscriptions:
  - Bridge ECS/domain events listed in §3 to play/stop/setParameter.
- Play/stop/hysteresis:
  - Implement priority and polyphony handling; 35 ms min-gap per key.
  - Drill hysteresis (250 ms sustain; 1200 ms cooldown gating).
- Music conductor stub:
  - Provide 92 BPM, 4/4; bar-alignment scheduler with ±10 ms tolerance.
- Depth parameter listener:
  - Subscribe to scene/world depth provider; compute depth01 and apply ambience curves.
- Preload orchestrator:
  - Enqueue onBoot/onScene/lazy via Phaser loader; lazy on-demand with queue and telemetry.

Dependencies to confirm
- Depth01 source:
  - Scene/world service to provide normalized player depth (Y / mapHeight) and scene kind (tavern vs mine).
- Player-held drill input state:
  - Ability to detect hold start/release and eligibility (Progress event semantics).
- Bar-alignment feasibility:
  - Ensure music base loop timing is exposed or adopt conductor stub consistently across scenes.

TODOs (Sprint 1)
- Wire ducking matrix consumption from manifest.globals.ducking.
- Define default ducking rules in manifest (e.g., UI ducks music by -4 dB short; combat stingers duck music by -6 dB).
- Confirm tool audio ids in data/items/tools.json and populate generics in manifest.
- Author initial gain trims and test in browser (Chrome/Firefox) for CPU/voice budget.


## 12) Acceptance Checklist (Sprint 1)

- Event→SFX mappings cover mining, combat, crafting, and UI per specs.
- Pick vs drill behavior implemented (swing/hit vs spinUp/bite/coolDown with hysteresis).
- Depth-driven ambience adjusts as defined; tavern vs mine scenes switch ambience sets.
- Priorities, polyphony, and ducking align to manifest; voice limits enforced per category.
- Music overlay state machine and bar-aligned stingers defined and functional with conductor stub.
- Preload strategy in place using Phaser loader hints; lazy loading falls back gracefully.
- Debug overlay and telemetry counters present; basic inspection works.
- Documented ids resolve in data/audio/sound-manifest.json and tools.json (or have defined generics).
- No runtime hard clips under nominal play; headroom maintained.