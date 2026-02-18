# Audio System Design — Stone Songs and Steam Whispers (Sprint 1)

Owner: @zeta (Audio Systems — Echoheart Bellowsong)

Cross-References:
- data/audio/sound-manifest.json (v1 — authoritative IDs, buses, categoryLimits, trims, ducking)
- docs/core-systems/ecs-architecture.md (§Systems order & AudioEventBridge)
- data/items/tools.json (swingIntervalMs, tool kind/pick tiers)
- data/combat/enemy-goblin-grunt.json, data/combat/enemy-cave-burrower.json (telegraphs, aggro windows)
- docs/world-generation/cave-gen-algorithm.md (§Lighting/Lamps mention for ambience presence)
- docs/visual-systems/style-guide.md (§Telegraphs: 6-frame action timing; hits on frame 4)
- docs/technology-systems/crafting-design.md (§Stations & timings)
- docs/audio-systems/music-direction.md (to be authored — base/explore/combat palette)


## 1) Intent, Scope, and Authority
This document is implementation-ready for Sprint 1 and binds the AudioEventBridge and AudioSystem to the manifest v1. All IDs and bus/category contracts herein must exist in data/audio/sound-manifest.json v1. Where timing alignment is required, the Conductor (bar tracker) is the source of musical truth.


## 2) Goals & Constraints (Acceptance Targets)

Goals:
- Audible feedback clarity: distinct cues for mining swing/hit/break, combat telegraphs/hits/blocks, UI actions.
- Low-latency event→SFX mapping: ≤ 8 ms scheduling overhead on hot path.
- Depth-aware ambience blend: ambient loops respond to depth scalar smoothly without pumping.
- Bar-aligned music layering: overlays and stingers align to bar with drift ≤ ±20 ms after first lock.
- Voice/ducking discipline: category caps respected; overlay ducks base/sparkle sanely; UI never vanishes.

Constraints:
- Platform: Web/Phaser 3; HTML5 Audio/WebAudio API.
- Concurrency caps: honor manifest.globals.categoryLimits by category.
- Preload policy: onBoot/scene/lazy as below.
- Bar-sync latency budget: ≤ ±20 ms by bar 2; maintain < ±10 ms thereafter via drift correction.


## 3) Audio Categories & Buses

Categories and buses (must match manifest.globals.buses):
- Categories: ambient, sfx, music, ui
- Buses:
  - master (root)
  - music (child of master)
  - sfx (child of master)
  - ambient (child of master)
  - ui (child of master)

Category behavior:
- music
  - Loudness: foundational; keep intelligible under sfx. Typical bus trim around -4 to -6 dB.
  - Polyphony: 3–5 concurrent (base + sparkle + one overlay + 0–1 stinger).
  - Collapse: per-layer uniqueness (one instance per music layer ID).
- sfx
  - Loudness: foreground. Hits target ≈ -12 LUFS short-term. Transients allowed.
  - Polyphony: high (12–20). Collapse by polyphonyKey per §4 to avoid flams.
- ambient
  - Loudness: bed, never masking sfx. Typical bus trim -6 to -9 dB. 2–4 concurrent.
  - Collapse: one instance per loop ID.
- ui
  - Loudness: readable over music; not over sfx transients. Bus trim often -8 to -10 dB, per-asset trims compensate.
  - Polyphony: 4–8. Collapse by key for rapid repeats (click/move).

Ducking matrix (restating manifest.globals.ducking intent):
- music.combat.overlay.* ducks music.explore.base.* by -4 dB and music.explore.sparkle.* by -6 dB
  - Envelope: attack 5 ms, hold 0 ms, release 600 ms (equal-power curve)
- music.stinger.* ducks music.explore.base.* by -3 dB
  - Envelope: attack 0 ms, hold 100 ms, release 500 ms
- sfx (category) ducks music (category) by -2 dB during strong transients (auto-detect via priority ≥ 82)
  - Envelope: attack 20 ms, hold 50 ms, release 250 ms
- ui (category) ducks music (category) by -1.5 dB on playback
  - Envelope: attack 2 ms, hold 0 ms, release 150 ms
- ambient never ducks others; may be ducked by music overlay by -2 dB (attack 40 ms, release 400 ms)


## 4) Priority & Polyphony Rules

Global tie-break rules:
- Each asset declares: category, priority, polyphonyKey (optional), collapseWindowMs (optional).
- Admission order:
  1) If category at cap: drop lowest priority among currently playing within same polyphonyKey if any; else drop the oldest lowest-priority in category.
  2) If same priority and same polyphonyKey within collapse window: collapse (do not play new).
  3) Otherwise admit if under category cap.

Priority tiers (exact numbers for Sprint 1):
- 100: music.stinger.enterCombat, music.stinger.exitCombat
- 95: music.combat.overlay.perc.loopA
- 90: sfx.mining.break.stone
- 86: sfx.drill.spinUp, sfx.drill.bite.loop, sfx.drill.coolDown
- 84: sfx.combat.block
- 83: sfx.combat.poiseBreak
- 82: sfx.combat.hit.light, sfx.mining.hit.ore, sfx.mining.hit.rock
- 70: sfx.mining.swing.pick
- 56: ui.craft.complete
- 54: ui.craft.start, ui.tooltip.warn
- 52: ui.inventory.move
- 50: ui.click
- 48: ambient.tavern.loopA
- 46: ambient.mine.steam.hiss.loopA
- 44: ambient.mine.drip.loopA
- 82: music.explore.base.loopA (base music bed)
- 80: music.explore.sparkle.loopA (texture)

PolyphonyKey usage and collapse windows:
- mine.swing → sfx.mining.swing.pick, collapseWindowMs = 120
- mine.hit.rock → sfx.mining.hit.rock, collapseWindowMs = 40 (recommend 35–45)
- mine.hit.ore → sfx.mining.hit.ore, collapseWindowMs = 40 (recommend 35–45)
- mine.break → sfx.mining.break.stone, collapseWindowMs = 100
- drill.bite → sfx.drill.bite.loop (loop uniqueness; force single instance; collapseWindowMs = 200)
- combat.hit.light → sfx.combat.hit.light, collapseWindowMs = 45
- combat.block → sfx.combat.block, collapseWindowMs = 60
- ui.click → ui.click, collapseWindowMs = 30
- ui.inventory.move → ui.inventory.move, collapseWindowMs = 50
- music layer keys (unique): music.explore.base.loopA, music.explore.sparkle.loopA, music.combat.overlay.perc.loopA, music.stinger.enterCombat, music.stinger.exitCombat (by ID; single instance each)


## 5) Preload Strategy

onBoot (UI essentials):
- ui.click
- ui.inventory.move
- ui.tooltip.warn
- ui.craft.start
- ui.craft.complete

scene (entering Mine scene):
- sfx: sfx.mining.swing.pick, sfx.mining.hit.rock, sfx.mining.hit.ore, sfx.mining.break.stone
- sfx drill: sfx.drill.spinUp, sfx.drill.bite.loop, sfx.drill.coolDown
- sfx combat: sfx.combat.telegraph.swing, sfx.combat.hit.light, sfx.combat.block, sfx.combat.poiseBreak
- ambient: ambient.mine.drip.loopA, ambient.mine.steam.hiss.loopA
- music: music.explore.base.loopA, music.explore.sparkle.loopA, music.combat.overlay.perc.loopA
- stingers: music.stinger.enterCombat, music.stinger.exitCombat

lazy (MVP): none beyond placeholders if present in manifest; if a lazy asset is requested and not yet ready, play nothing and log once (see §12).


## 6) Event Bridge — Contracts & Mappings (Authoritative)

AudioEventBridge subscribes to the Domain EventBus (see docs/core-systems/ecs-architecture.md). All events are pure mappings with minimal branching. Payload shapes are exact.

Events and mappings:
- mining.Swing
  - Payload: { toolId:string, tileType:"air|rock|ore", oreType:string|null, eligible:boolean }
  - Gate: play only if toolId resolves to a pick kind in data/items/tools.json. Play sfx.mining.swing.pick if eligible===true; if eligible===false but tileType!="air" (near-eligible), play at -6 dB gain.
  - ID: sfx.mining.swing.pick (polyphonyKey: mine.swing)

- mining.Progress
  - Payload: { toolId:string, tileType:"rock|ore", oreType:string|null, applied:boolean }
  - On applied===true: if oreType!=null → sfx.mining.hit.ore else sfx.mining.hit.rock. Collapse via mine.hit.ore or mine.hit.rock. Add pitch variance ±2.5% for texture.

- mining.Break
  - Payload: { toolId:string, tileType:"rock|ore", oreType:string|null, pos:{x:number,y:number} }
  - Play sfx.mining.break.stone at pos (pan by screen X per §10). Apply random pitch variance ±3%. PolyphonyKey: mine.break.

- mining.Deny
  - Payload: { reason:"hardness"|"stamina"|"angle", toolId:string }
  - Map: reason==="stamina" → ui.tooltip.warn. Otherwise silent (MVP).

- drill.State
  - Payload: { state:"spinUp"|"bite"|"coolDown" }
  - Map: "spinUp" → sfx.drill.spinUp (one-shot), "bite" → sfx.drill.bite.loop (loop), "coolDown" → sfx.drill.coolDown (one-shot). Hysteresis per §7.

- combat.TelegraphStart
  - Payload: { attackerId:string, attackId:string, windupMs:number, useGlobalAudio?:boolean }
  - If useGlobalAudio!==false: play sfx.combat.telegraph.swing immediately (match style-guide windup).

- combat.Hit
  - Payload: { attackerId:string, victimId:string, blocked:boolean, poiseBreak:boolean }
  - Map: blocked===true → sfx.combat.block; else → sfx.combat.hit.light. Additionally, if poiseBreak===true → also play sfx.combat.poiseBreak (do not suppress hit).

- combat.Enter
  - Payload: { reason:"aggro" }
  - Map: trigger music.stinger.enterCombat (align:"bar"); enable music.combat.overlay.perc.loopA on next bar (see §8).

- combat.Exit
  - Payload: { reason:"clear" }
  - Map: trigger music.stinger.exitCombat (align:"bar"); fade out combat overlay over barsFade (see §8).

- crafting.Start
  - Payload: { recipeId:string }
  - Map: ui.craft.start

- crafting.Complete
  - Payload: { recipeId:string }
  - Map: ui.craft.complete

- ui.Click
  - Payload: { elementId?:string }
  - Map: ui.click

- ui.Inventory.Move
  - Payload: { from:string, to:string, itemId:string }
  - Map: ui.inventory.move

- ui.Tooltip.Warn
  - Payload: { reason:string }
  - Map: ui.tooltip.warn

Compact mapping table (event → manifest id[s]):
- mining.Swing → sfx.mining.swing.pick
- mining.Progress → sfx.mining.hit.ore | sfx.mining.hit.rock
- mining.Break → sfx.mining.break.stone
- mining.Deny(stamina) → ui.tooltip.warn
- drill.State(spinUp|bite|coolDown) → sfx.drill.spinUp | sfx.drill.bite.loop | sfx.drill.coolDown
- combat.TelegraphStart → sfx.combat.telegraph.swing
- combat.Hit(blocked|!blocked, +poiseBreak?) → sfx.combat.block | sfx.combat.hit.light (+ sfx.combat.poiseBreak)
- combat.Enter → music.stinger.enterCombat + music.combat.overlay.perc.loopA (next bar)
- combat.Exit → music.stinger.exitCombat + fade-out music.combat.overlay.perc.loopA
- crafting.Start → ui.craft.start
- crafting.Complete → ui.craft.complete
- ui.Click → ui.click
- ui.Inventory.Move → ui.inventory.move
- ui.Tooltip.Warn → ui.tooltip.warn


## 7) Mining Cadence & Drill Hysteresis

Picks:
- Cadence: use stats.swingIntervalMs from data/items/tools.json
  - T1 pick: 520 ms
  - T2 pick: 480 ms
- Timing:
  - Swing SFX (sfx.mining.swing.pick): at animation windup start.
  - Hit SFX (sfx.mining.hit.rock/ore): at impact, frame 4 of 6 (per style-guide), typically ~66% of swing interval; engine schedules via animation event or fixed delay.
- Collapse windows:
  - mine.swing: 120 ms
  - mine.hit.rock / mine.hit.ore: 35–45 ms (default 40 ms)
- Gating:
  - Do not emit more than one mine.swing per 240 ms per toolId if eligible===false to avoid spam.
  - Pitch variance: ±2.5% on hits to de-mudanize repeats.

Drill hysteresis (state machine):
- On first valid pulse after input hold:
  - Play sfx.drill.spinUp immediately.
  - Schedule sfx.drill.bite.loop to start after min(spinUp file duration, 120 ms); loop continuously.
- During bite:
  - Continue loop while input held AND mining.Progress events continue.
  - Idle timeout: if no valid mining.Progress for 240 ms, treat as release (see below).
  - Gate hits: during bite, allow sfx.mining.hit.rock/ore at most 1 per 2 mining.Progress pulses (50% rate) to avoid noise bed.
- On release or idle timeout:
  - Stop sfx.drill.bite.loop with a 60 ms fade-out.
  - Play sfx.drill.coolDown once.
- Re-entrancy:
  - If spinUp requested while bite is active, ignore (debounce).
  - If bite requested during spinUp’s initial delay, coalesce to one loop start (no double-start).


## 8) Combat Intensity & Music Layering Rules

- Enter combat:
  - Condition: first enemy within aggro range; global combat state peaceful→engaged.
  - Actions:
    - Schedule music.stinger.enterCombat with align:"bar".
    - Enable music.combat.overlay.perc.loopA starting at the next bar boundary.
    - Duck explore.sparkle per ducking matrix (overlay precedence).
  - Cooldown: 2 s minimum before a new enter stinger can play.

- Exit combat:
  - Condition: 3 s without any enemy flagged in combat state.
  - Actions:
    - Schedule music.stinger.exitCombat align:"bar".
    - Fade out music.combat.overlay.perc.loopA over barsFade=1 (one full bar).
    - Restore sparkle layer by §9 rule on next bar.
  - Cooldown: 2 s minimum before a new exit stinger can play.

- Spam prevention:
  - If multiple Enter/Exit flaps within cooldown, only the first in each window triggers stinger and layer change.


## 9) Ambient & Depth-Based Layering

Depth scalar (contract; confirm source provides depth ∈ [0..1] per Mine Level 1):
- ambient.mine.drip.loopA gain = lerp(0.30, 0.42, depth)
- ambient.mine.steam.hiss.loopA gain = lerp(0.24, 0.38, clamp(depth - 0.2, 0, 0.8) / 0.8)

Biome transitions:
- MVP: single biome; no crossfade beyond depth gain rules.
- Future: multi-biome handoff: 2–4 s equal-power crossfade between ambient sets.

Tavern scene:
- Enable ambient.tavern.loopA.
- MVP music rule: keep explore base off in tavern; only tavern loop plays (music-direction.md may override later).


## 10) Spatialization & Positioning (MVP Simplified)

- SFX: simple 2D pan by screen X in [-1..1] via StereoPannerNode. No distance rolloff in MVP.
- Ambient/Music: non-positional (center).
- Future (not MVP): distance-based attenuation and vertical pan bias for long caverns.


## 11) Mixing & Start Trims

Reference loudness targets (authoring guidance):
- SFX hits: ≈ -12 LUFS short-term
- Music base: ≈ -18 LUFS integrated post-trim

Restated initial trims from manifest v1 (asset-level gain applied at load):
- music.explore.base.loopA: -3.0 dB (bed under sfx)
- music.explore.sparkle.loopA: -6.0 dB (texture shimmer)
- music.combat.overlay.perc.loopA: -4.0 dB (sits above base without clipping bus)
- music.stinger.enterCombat: -3.0 dB
- music.stinger.exitCombat: -3.0 dB
- ambient.mine.drip.loopA: -10.0 dB (low-level detail)
- ambient.mine.steam.hiss.loopA: -12.0 dB (air bed)
- ambient.tavern.loopA: -8.0 dB (room tone)
- sfx.mining.swing.pick: -2.0 dB (leading gesture)
- sfx.mining.hit.rock: -2.0 dB (stone bite)
- sfx.mining.hit.ore: -1.5 dB (brighter transient)
- sfx.mining.break.stone: -1.0 dB (broadband burst)
- sfx.drill.spinUp: -3.0 dB
- sfx.drill.bite.loop: -6.0 dB (bed under hits)
- sfx.drill.coolDown: -3.0 dB
- sfx.combat.telegraph.swing: -4.0 dB (clear but not alarming)
- sfx.combat.hit.light: -1.5 dB
- sfx.combat.block: -1.0 dB
- sfx.combat.poiseBreak: -0.5 dB (emphatic)
- ui.click: -8.0 dB
- ui.inventory.move: -8.0 dB
- ui.tooltip.warn: -6.0 dB
- ui.craft.start: -7.0 dB
- ui.craft.complete: -6.0 dB

Start trims (head-silence removal) at decode:
- Remove up to 15–25 ms head silence on short SFX (mining/combat/UI) where present.
- Loops have zero-crossing-aligned loop points; no fade pops.

Hit-Stop interaction:
- Do not scale audio playback rate with hit-stop in MVP. Allow natural tails; envelope not clamped.


## 12) Failure Modes & Fallbacks

- Missing id: log once per session with category and id; do not substitute; do not crash.
- Over-cap voices: drop lowest-priority, oldest within same polyphonyKey first; if none share key, drop global oldest of lowest priority in that category.
- Preload failure: mark asset unavailable; on play request, skip and log once (throttle repeats).


## 13) Debugging & Telemetry

Debug overlay (toggle via dev flag):
- Last 6 domain events mapped (timestamp, event name → id).
- Active voices per category with priority bars and polyphonyKey.
- Current music layer states and bar position (bar index, ms into bar, drift estimate).
- Live ducking envelopes per source (overlay→base, sfx→music, ui→music).

Console logs (dev only; throttled):
- CollapsedByPolyphonyKey counters (per key).
- Per-event mapping trace at debug level (event payload, resolved id, gain/pan, priority, gate/collapse reason).


## 14) Implementation Notes for src/audio/audio-system.js

Loader:
- Parse data/audio/sound-manifest.json v1.
- Build bus graph: master → {music,sfx,ambient,ui}; apply bus trims from manifest.globals.
- Create category voice managers with manifest.globals.categoryLimits.
- Honor preload hints (onBoot/scene/lazy). Decode as AudioBuffer on WebAudio; hold weak refs for lazy.

AudioSystem API (stable for Sprint 1):
- play(id:string, opts?:
  { gain?:number, pan?:number, loop?:boolean, polyphonyKey?:string, priority?:number,
    startAtMs?:number, stopAfterMs?:number, align?:'bar', position?:{x:number,y:number} }): Promise<VoiceHandle>
- stop(target:string|{polyphonyKey:string}|VoiceHandle, opts?:{fadeMs?:number}): void
- setBusGain(busId:'master'|'music'|'sfx'|'ambient'|'ui', gain:number): void
- setAmbientDepth(depth01:number): void
- setMusicState(state:{ combat:boolean, sparkle:boolean }): void
- setDucking(duckSpec?:Partial<typeof manifest.globals.ducking>): void

Event wiring:
- AudioEventBridge subscribes to ECS/Domain EventBus.
- For each event in §6, resolve exact manifest ID(s), compute gain/pan, and call AudioSystem.play. Keep hot paths branch-light. Use polyphonyKey per §4.

Conductor (bar tracker):
- bpm=92, timeSig=4/4. msPerBeat = 60,000/92 ≈ 652.1739 ms; msPerBar = msPerBeat*4 ≈ 2608.6956 ms.
- Maintain high-resolution clock anchored to AudioContext.currentTime.
- align:"bar" scheduling:
  - On first lock, schedule to next bar boundary; compensate subsequent triggers with drift correction to keep |drift| ≤ 10 ms; never exceed ±20 ms.
- Provide getBarPosition(): { barIndex:number, msIntoBar:number, driftMs:number }.


## 15) Quick Reference (Engineer Cheat Sheet)

Event → ID(s):
- mining.Swing → sfx.mining.swing.pick
- mining.Progress(applied true, oreType?):
  - oreType!=null → sfx.mining.hit.ore
  - else → sfx.mining.hit.rock
- mining.Break → sfx.mining.break.stone
- mining.Deny(stamina) → ui.tooltip.warn
- drill.State:
  - spinUp → sfx.drill.spinUp
  - bite → sfx.drill.bite.loop
  - coolDown → sfx.drill.coolDown
- combat.TelegraphStart → sfx.combat.telegraph.swing
- combat.Hit:
  - blocked → sfx.combat.block
  - not blocked → sfx.combat.hit.light
  - if poiseBreak true → also sfx.combat.poiseBreak
- combat.Enter → music.stinger.enterCombat (bar) + music.combat.overlay.perc.loopA (next bar)
- combat.Exit → music.stinger.exitCombat (bar) + fade-out overlay (1 bar)
- crafting.Start → ui.craft.start
- crafting.Complete → ui.craft.complete
- ui.Click → ui.click
- ui.Inventory.Move → ui.inventory.move
- ui.Tooltip.Warn → ui.tooltip.warn

Drill state machine (text):
- idle → [input hold + valid pulse] → spinUp (play) → after ≤120 ms → bite.loop (start/loop)
- bite.loop → [Progress keeps coming] → stay; [no Progress ≥240 ms OR input release] → fade 60 ms → coolDown (play) → idle
- While in bite.loop: throttle mining.hit.* to ≤ 1 per 2 pulses

Music state transitions:
- peaceful→engaged: enter stinger (bar), enable overlay on next bar, duck sparkle/base per matrix
- engaged→peaceful (3 s clear): exit stinger (bar), fade overlay 1 bar, restore sparkle next bar
- Stinger cooldown: 2 s

Ambient depth formulae:
- drip gain = 0.30 + (0.42 - 0.30) * depth
- steam gain = 0.24 + (0.38 - 0.24) * clamp((depth - 0.2)/0.8, 0, 1)

Priority table (selected):
- 100 stingers; 95 combat overlay; 90 break; 86 drill; 84 block; 82–83 combat hits/poise; 82 core music base; 80 sparkle; 70 swings; 50–56 UI; 44–48 ambient

Polyphony collapse windows:
- mine.swing 120 ms; mine.hit.* 40 ms; combat.hit.light 45 ms; ui.click 30 ms; ui.inventory.move 50 ms


## 16) Acceptance Checklist

- Categories, buses, and categoryLimits restated; ducking matrix envelopes explicit.
- Depth-based ambient gains defined; tavern and biome rules covered.
- Mining cadence (T1 520 ms, T2 480 ms), swing/hit/break triggers, and collapse windows specified.
- Drill hysteresis defined (spinUp→bite loop→coolDown), with gating and fades.
- Combat music layering with bar-aligned stingers/overlay and anti-spam cooldown provided.
- Event→SFX mappings align with manifest v1 IDs:
  - sfx.mining.swing.pick
  - sfx.mining.hit.rock
  - sfx.mining.hit.ore
  - sfx.mining.break.stone
  - sfx.drill.spinUp
  - sfx.drill.bite.loop
  - sfx.drill.coolDown
  - sfx.combat.telegraph.swing
  - sfx.combat.hit.light
  - sfx.combat.block
  - sfx.combat.poiseBreak
  - music.explore.base.loopA
  - music.explore.sparkle.loopA
  - music.combat.overlay.perc.loopA
  - music.stinger.enterCombat
  - music.stinger.exitCombat
  - ambient.mine.drip.loopA
  - ambient.mine.steam.hiss.loopA
  - ambient.tavern.loopA
  - ui.click
  - ui.inventory.move
  - ui.tooltip.warn
  - ui.craft.start
  - ui.craft.complete
- Priority, polyphony, and collapse rules explicit; preload strategy present.
- API surface and Conductor details sufficient to implement src/audio/audio-system.js.
- Debug overlay and telemetry notes included to verify behavior live.