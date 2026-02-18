# Audio System Design — Pulse of Stone and Steam (Sprint 1)

Provenance
- Owner: @zeta (Audio Systems — Echoheart Bellowsong)
- Runtime alignment: Phaser 3 (WebAudio)
- Cross-refs:
  - docs/combat-systems/combat-design.md (§17 Audio & VFX Bridges)
  - docs/technology-systems/crafting-design.md (§7/§11 Events & Bridges)
  - docs/world-generation/cave-gen-algorithm.md (§12 Output & flags)
  - docs/core-systems/ecs-architecture.md (§9 System Order — AudioEventBridge)
  - data/core/component-schemas.json (Renderable.depth)
  - docs/audio-systems/music-direction.md (dynamic layers)
  - data/world/biome-crystal-caverns.json (biome id)
  - Forthcoming: src/audio/audio-system.js (runtime)



## 2) Goals & MVP Scope

Goals
- Audible, readable feedback for mining/combat/UI.
- Ambient bed that sells Crystal Caverns.
- Deterministic, event-driven triggers with sane polyphony.
- Simple but musical ducking.
- Minimal debug overlay.

Scope (Sprint 1)
- Biomes: Crystal Caverns + Tavern only.
- Events: mining.*, combat.*, poise.*, basic UI, crafting.complete.
- Out of scope: VO, convolution reverb, positional occlusion.



## 3) Runtime Architecture (Buses & Mixer)

Bus topology (logical)
- Master → [Music, Ambience, SFX, UI].
  - Music: -14 LUFS target, limiter ceiling -1 dBFS, sidechain keyed by SFX hits.
  - Ambience: -20 LUFS target, wide stereo, slow AGC.
  - SFX: -16 LUFS target, transient-friendly, limiter with 3 ms attack/60 ms release.
  - UI: -18 LUFS target, always on top, no duck receive.

Ducking rules
- SFX sidechain ducks Music by -4 dB (attack 20 ms, release 220 ms).
- Parry/PoiseBreak stingers push Music -6 dB, shorter release 140 ms.
- Mining loop beds never duck SFX; Ambience ducks -2 dB during dense combat.

Voice limits
- Master 48; SFX 24; Ambience 8; Music 4; UI 6.
- Stealing: category-local, oldest-lowest-priority first; Music protected by priority unless in transition.

Implementation notes (Phaser 3 / WebAudio)
- We maintain logical buses as category gain scalars applied per-sound.
- For smooth duck/AGC: interpolate category target gains per frame using time constants (approx attack/release).
- WebAudio graph:
  - Access audio context via game.sound.context. If environment allows, create bus gain nodes:
    - MasterGain → [MusicBus, AmbienceBus, SFXBus, UIBus] → Destination.
    - Route each WebAudioSound.gainNode into its category bus. If direct rewire is not supported in the Phaser build, fall back to per-sound gain multiplication: finalGain = authoringVolume × categoryBusGain × emitterGain × distanceGain.
- Limiters:
  - Use DynamicsCompressorNode as a soft limiter per bus:
    - Music: threshold -3 dB, ratio 12:1, attack 5 ms, release 120 ms.
    - SFX: threshold -6 dB, ratio 8:1, attack 3 ms, release 60 ms.
    - Ambience: gentle: threshold -12 dB, ratio 3:1, attack 50 ms, release 600 ms.
  - If sidechain unavailable, emulate ducking by scheduling Music bus gain envelope on qualifying SFX triggers.

Envelope scheduling (duck)
- On qualifying SFX play:
  - target = -4 dB or -6 dB (convert to linear).
  - Apply: gain → min(target, current) with attack 20 ms (or 10 ms for parry), then relax to 0 dB with release 220 ms (or 140 ms).
- Overlapping ducks stack by taking the minimum target and the longest outstanding release.



## 4) Spatialization & 2D Mix Rules

- Panning law: equal-power stereo (use StereoPannerNode or azimuth pan math). Emitter.x vs camera center x → pan ∈ [-1..1], clamp.
- Distance curve (screen-space proxy):
  - dPx = distance in pixels between emitter and camera center.
  - gain = 1 / (1 + 0.0015 × dPx^2), clamped to [0.25..1].
- Spatialization:
  - Mining/impacts use spatialization.
  - UI, Music, and most Ambience are non-positional (center).
- Depth scalar:
  - depthMix ∈ [0..1]: derive from Renderable.depth normalized across scene (see §13).
  - Use depthMix to bias ambience sends and subtle LPF:
    - LPF cutoff = lerp(17 kHz, 9.5 kHz, depthMix).
    - Low-shelf EQ gain = lerp(0 dB, -3 dB, depthMix) @ 200 Hz.



## 5) Categories & Subcategories

Ambience
- biome.base.loop
- biome.layer.drip
- biome.layer.steam
- biome.layer.crystal_hum
- tavern.loop

SFX
- Mining:
  - swing.pick
  - swing.drill
  - hit.rock
  - hit.ore.copper
  - hit.ore.iron
  - hit.ore.quartz
  - break.rock
  - break.ore
  - deny.insufficient_power
  - deny.no_stamina
- Combat:
  - telegraph.whoosh
  - swing.whoosh.light
  - hit.light
  - block.impact
  - parry.ring
  - poise.break
  - enemy.vocal.goblin
  - burrower.surface (stub parity)
- Foley:
  - step.gravel (optional MVP-1)
  - ui.confirm, ui.cancel (routed to UI)

Music
- See docs/audio-systems/music-direction.md for layer ids and flows (we reference for duck hooks only).

UI
- click
- confirm
- error
- craft.complete



## 6) Event Bridge Contract (Authoritative Triggers)

Source events and payloads
- mining.Swing { playerId, toolId, tileX, tileY, eligible }
- mining.Progress { playerId, toolId, tileX, tileY, added, total, threshold }
- mining.Break { playerId, toolId, tileX, tileY, tileType, oreType }
- mining.Deny { playerId, toolId, tileX, tileY, reason }
- combat.TelegraphStart { attackerId, attackId, ... }
- combat.Hit { attackerId, victimId, attackId, damage, poiseDamage, wasBlocked, wasParried, hitStop }
- combat.AttackEnd { attackerId, attackId, ... }
- poise.Break { entityId, breakMs }
- poise.Recover { entityId, recoveredAtMs }
- ui.* (strings from UI system: ui.click, ui.confirm, ui.error, crafting.complete)

Mapping rules
- mining.Swing → sfx.mine.{pick|drill}.swing (toolId prefix detects pick vs drill). If eligible=false, route to sfx.mine.deny.soft (alias of deny.no_stamina at -3 dB).
- mining.Progress (eligible) → sfx.mine.hit.{rock|ore.copper|ore.iron|ore.quartz}
  - Throttle: max 7 Hz per-emitter.
  - Coalesce: identical materials within 40 ms collapse.
- mining.Break → sfx.mine.break.{rock|ore} with slightly higher priority; optional debris whoosh tail (if present in manifest tagged debris).
- mining.Deny.reason → sfx.mine.deny.{insufficient_power|no_stamina|out_of_range}
- combat.TelegraphStart → sfx.combat.telegraph.whoosh (120–180 ms; pan to attacker).
- combat.Hit:
  - If wasParried → sfx.parry.ring (ducks Music -6 dB).
  - Else if wasBlocked → sfx.block.impact (ducks Music -4 dB).
  - Else → sfx.combat.hit.light (ducks Music -4 dB).
- poise.Break → sfx.combat.poise.break (distinct glass/gear crack; -6 dB duck).
- ui.* map 1:1 to sfx.ui.*; crafting.complete → ui.craft.complete.

Debounce/Spam rules
- Global: identical Hit sounds within 30 ms collapse to 1.
- Telegraph per-attacker: max 1 every 300 ms.
- Mining per-cell (24 px) hit cap 2 concurrent (see §10).

Throttling and coalescing sketch
```
shouldPlay(key, emitterId, nowMs):
  // global collapse
  if recentGlobal[key] within 30ms: return false
  // per-emitter throttle tables
  if key.startsWith('sfx.mine.hit'):
    if nowMs - lastHitTime[emitterId] < 143ms: return false // ~7 Hz
    if dupWithin(emitterId, 40ms, material): return false
  if key == 'sfx.combat.telegraph.whoosh':
    if nowMs - lastTelegraph[attackerId] < 300ms: return false
  return true
```



## 7) Layering System — Depth- and Biome-driven Ambience

Biome L1 (Crystal Caverns)
- Base loop: amb.biome.crystal_caverns.base.loopA (broadband cave air + distant machinery hum).
- Layers:
  - amb.layer.drip.sparse
  - amb.layer.steam.hiss
  - amb.layer.crystal.resonance

Activation rules
- On biomeId = biome.crystal_caverns:
  - Start base.loopA at scene load; crossfade 1500 ms.
  - Lamps nearby (Tile.flags LAMP_ANCHOR within 5 tiles):
    - Add subtle steam hiss send; fade 400 ms on enter/exit.
  - Room size proxy (flood-fill or nav sample in camera frustum):
    - If area > threshold (tune: ~8–12 tiles radius), increase drip scheduler density.
  - Depth tint (depthMix):
    - Drive low shelf EQ (-1..-3 dB @ 200 Hz) and add 5–10% LPF as depth increases.

Tavern
- amb.tavern.loopA (steady, no duck receive).
- Crossfade to/from mine over 2.5 s on scene change.
- Preserve music continuity; only ambience switches.

Stochastic layer scheduler
- Drips: Poisson process with mean interval baseline 2200 ms; scale by room size (bigger room → shorter intervals).
- Crystal resonance: low-probability one-shots gated by camera stillness (no movement > 30 px for 2 s).



## 8) Mining Rhythm & Musicality

- Pick swing precedence:
  - Ensure swing lands slightly ahead of Progress hits; swing whoosh length ≈ windupMs.
  - Timing: for player light swing at 300 ms windup, schedule whoosh start at t0+(windup-300 ms), overlap such that whoosh crest hits contact -40 ms.
- Progress tick accents:
  - Small transient chinks alternate pan L/C on rapid sequences to avoid flamming; implement via left-center alternator per-emitter when inter-hit ≤ 200 ms.
- Breaks:
  - Insert silence tail (10–20 ms) post-last chink before debris burst to heighten release impression.



## 9) Combat Intensity & Hit-Stop Cohesion

Intensity meter I ∈ [0..1]
- Inputs: combat.Hit weight 1.0, combat.TelegraphStart weight 0.4, poise.Break weight 1.2.
- Window: 6 s exponential decay, τ = 2.2 s. Sum weights, normalize to [0..1] with soft clamp.
- Drives:
  - Music layer gains per docs/audio-systems/music-direction.md (map I to layer crossfades).
  - Ambience duck -2 dB when I > 0.6 (release with τ=600 ms).

Hit-stop cohesion
- Do not globally pause audio during hit-stop; allow tails to ring.
- For wasParried:
  - Play bell-like ring with short pre-delay (10 ms) to align with visual flash.
  - Trigger -6 dB Music duck envelope with faster attack (10 ms).



## 10) Priority, Polyphony, and Stealing

Priority ladder (high → low)
- parry.ring
- poise.break
- break.ore
- combat.hit
- block.impact
- mining.hit
- telegraph.whoosh
- ambience.layers
- UI
- footsteps

Stealing policy
- Category-local caps (SFX 24, Ambience 8, Music 4, UI 6).
- On exceed:
  - Evict oldest among the lowest-priority group in that category.
  - Protect currently duck-keying SFX until 80 ms have elapsed (avoid cutting transient heads).
- Coalesce rules:
  - Multiple mining.hit in same 24 px cell coalesce; per-cell concurrent cap 2.
  - Per-entity telegraph cap 1 active.

Suggested manifest priority values (guidance)
- parry.ring 95, poise.break 92, break.ore 88, combat.hit 80, block.impact 75, mining.hit 60, telegraph.whoosh 55, ambience.layers 40, UI 50, footsteps 30.



## 11) Asset & Manifest Conventions

File format
- OGG (Vorbis) primary or WAV for ultra-short UI.
- 44.1 kHz. Mono for SFX. Stereo for loops.
- Loop points: provide sample-accurate loopStart/loopEnd in manifest where needed.

Naming
- audio/{amb|sfx|ui|music}/.../id.ogg matched to manifest ids.

Manifest schema (authoritative for data/audio/sound-manifest.json)
- Fields:
  - id
  - filename
  - category: "ambience" | "sfx" | "music" | "ui"
  - subcategory?: string
  - triggerKey: string
  - priority: int (0..100)
  - volume: number (0..1)
  - loop: bool
  - maxVoices: int
  - spatialized: bool
  - bus: "Music" | "Ambience" | "SFX" | "UI"
  - duckSends?: { music: number, ambience: number }
  - tags?: [string]
  - notes?: [string]
  - loopStart?: int
  - loopEnd?: int

Domain event → triggerKey patterns (concise mapping)
- mining.Swing → sfx.mine.pick.swing | sfx.mine.drill.swing
- mining.Progress (rock) → sfx.mine.hit.rock
- mining.Progress (ore.copper) → sfx.mine.hit.ore.copper
- mining.Progress (ore.iron) → sfx.mine.hit.ore.iron
- mining.Progress (ore.quartz) → sfx.mine.hit.ore.quartz
- mining.Break (rock) → sfx.mine.break.rock
- mining.Break (ore) → sfx.mine.break.ore
- mining.Deny.insufficient_power → sfx.mine.deny.insufficient_power
- mining.Deny.no_stamina → sfx.mine.deny.no_stamina
- mining.Deny.out_of_range → sfx.mine.deny.out_of_range
- combat.TelegraphStart → sfx.combat.telegraph.whoosh
- combat.Hit (parried) → sfx.parry.ring
- combat.Hit (blocked) → sfx.block.impact
- combat.Hit (normal) → sfx.combat.hit.light
- poise.Break → sfx.combat.poise.break
- ui.click → ui.click
- ui.confirm → ui.confirm
- ui.error → ui.error
- crafting.complete → ui.craft.complete

Ducking tags in manifest
- For SFX that should key duck: set duckSends.music to 1.0 (weight); parry/poise break set to 1.5. Ambience duck only via intensity system, not per-SFX.



## 12) Emitter API & Integration Notes

Emitter attachment
- For spatial SFX, anchor to entityId with fallback to world XY. When entity is destroyed, decay emitter (fade 120 ms) then release.
- Camera listener: one listener at camera center; update panner each frame.

Bridge adapter (AudioEventBridge)
- Runs after gameplay event emitters and before frame end (see §13 System Order).
- Translates domain events into playOneShot / ensureLoop with resolved triggerKey via manifest.

Core API (pseudo-signatures)
```
playOneShot(triggerKeyOrId: string, opts?: {
  entityId?: number,
  position?: { x: number, y: number },
  gain?: number,           // 0..1; default 1
  pitchVar?: number,       // ± percentage; default 0.03 (3%)
  startAtMs?: number,      // offset into buffer
  priorityOverride?: number,
  tags?: string[]
}): VoiceHandle

ensureLoop(id: string, opts?: {
  entityId?: number,
  position?: { x: number, y: number },
  gain?: number,
  spatialized?: boolean
}): LoopHandle

stopLoop(idOrHandle: string | LoopHandle, opts?: { fadeMs?: number }): void

attachEmitter(entityId: number, initialXY: { x: number, y: number }): void
updateEmitter(entityId: number, xy: { x: number, y: number }): void
releaseEmitter(entityId: number): void
```

Per-frame update
- AudioSystem.update(dt):
  - Update camera listener position and depthMix.
  - For each emitter: compute pan (equal-power), distance gain, and apply to active voices.
  - Resolve bus duck envelopes (SFX → Music).
  - Enforce voice limits and stealing.
  - Advance ambience layer schedulers.

Pitch variation
- Default ±3% random pitch per one-shot (except UI). Cap pitch var for parry/poise to ±1% to preserve tonal identity.

Mining timing assist
- When both mining.Swing and mining.Progress are received for same playerId and tile within 120 ms, schedule Progress SFX at swingContactTime + 0..15 ms jitter to avoid exact coincidence (musical glue).



## 13) Handshakes & Dependencies

Events
- Confirm exact event names/payloads as listed in §6 (alpha/gamma/delta). AudioEventBridge relies on consistent naming; mismatch logs a dev-only warning.

Depth scalar source
- Primary: use Renderable.depth (data/core/component-schemas.json) normalized per scene to [0..1] as depthMix.
- Alternate: expose Audio.depthMix [0..1] from player/camera system for camera-centric ambience when scene lacks stable depth range.

Biome id source
- From scene meta or worldgen output meta.biomeId (docs/world-generation/cave-gen-algorithm.md §12). Must equal "biome.crystal_caverns" for L1 ambience set.

System order (ECS)
- AudioEventBridge executes after Combat/Mining logic emit events and before Render submission:
  - See docs/core-systems/ecs-architecture.md (§9): place AudioEventBridge after StateResolutionSystem and before VFXSystem to keep A/V sync.
- src/audio/audio-system.js will expose AudioEventBridge hooks and run its update late in the frame to capture final camera position.



## 14) Debug & Tooling

Minimal overlay
- Shows:
  - Last 12 resolved events → sound ids (with timestamps).
  - Per-bus meters (RMS + peak), voice counts per category.
  - Current combat intensity I and active duck envelope on Music.
  - depthMix and current biome id.

Performance/log gate
- Dev-only; sampling at 10 Hz for overlay and logs.
- Toggle via URL param ?audioDebug=1 or localStorage.audioDebug=true.
- Truncate spam: coalesced events show a small ×n badge.



## 15) Risks & Dials

Risks
- Loudness and duck balances require in-engine tuning per hardware.
- Phaser node access differences across versions may constrain hard bus routing (fallback to per-sound gain multipliers).

Dials (tunable ranges)
- Duck amounts ±2 dB.
- Voice caps ±25%.
- Hit coalesce window 20–50 ms.
- Mining tick throttle 5–9 Hz.
- Intensity τ 1.6–3.0 s; ambience duck threshold I 0.5–0.7.



## 16) Acceptance Checklist

- Event→SFX rules cover MVP mining/combat/UI and ambience (Crystal Caverns + Tavern).
- Bus/ducking/polyphony documented and feasible in Phaser/WebAudio with graceful fallbacks.
- Manifest schema defined and aligned with triggerKey ids used in domain docs.
- Handshakes (events, depth source, biome id, system order) explicit and implementable.
- Ready to implement src/audio/audio-system.js MVP and author data/audio/sound-manifest.json next.

Echo the caverns, steady and true; let every strike, step, and shimmer sing in time with the stone.