# The Far Mine — Audio System & Sound Design (Sprint 1)

Owner: Echoheart Bellowsong (Zeta)  
Version: Sprint 1 v0.1 • Date: 2026-02-18

## 1) Title & Scope
- Scope (MVP): establish audio pillars; define event routing map ECS→Audio; initial SFX IDs/manifest placeholders; buses/mix with ducking; runtime budgets/polyphony; toolchain hooks.  
- Target stack: Rust + Bevy; keep bridge/interfaces engine-agnostic.

Deliverables this sprint:
- Stable triggerKey namespace (event.*) and manifest IDs (sfx.*, ui.*, amb.*) aligned to data/audio/sound-manifest.json.
- AudioEventBridge mapping for P4 ECS events.
- Preload set (top-10 SFX + 1 ambience bed).
- Mix/duck policy and category priorities.

## 2) Audio Pillars & Style Notes
- Dwarven work-song rhythm: steady, purposeful pulses that support cadence of mining and combat.
- Brass/steam timbres: subdued brass, valves, breathy bellows; warm but not blaring.
- Crystal harmonics: runic shimmer, hammered dulcimer-esque transients for ore/quartz feedback.
- Restraint in mix for readability: dynamic yet uncluttered; one-shot clarity over bed density.
- Dynamic but legible layers: ambience layers react to depth/biome; combat readable at all times.

Instrumentation adjectives:
- Percussion as pick rhythms; breathy bellows; hammered dulcimer; subdued brass; runic crystal shimmer.

## 3) Buses & Mix Diagram
Buses:
- Master
- Ambience (beds + layers)
- Music
- SFX (combat, mining, footsteps)
- UI

Signal flow and duck sends:
```
[Inputs] --> [SFX] ----->\
                          \---> [Master] --> Output
[Inputs] --> [UI] ------>/
[Inputs] --> [Ambience] -/     ^ 
                               | (Headroom -6 dBFS)
[Inputs] --> [Music] ----/     |
                   ^           |
                   | Duck Send from SFX:
                   |  - to Ambience (-3 dB, atk 10ms/hold 250ms/rel 120ms)
                   |  - to Music (disabled in MVP; hook exists)
```
Music layer note (forward hook): bar-aligned layer switches (quantize to next bar; 4/4 default, 120 BPM default; scheduling window ≥ 50 ms).

Nominal trims (relative to SFX bus at 0 dB):
- Ambience: -4 dB
- Music: -3 dB
- UI: -2 dB
- Master headroom policy: target true-peak ≤ -6 dBFS; integrated loudness guidance: SFX anchor around -16 to -18 LUFS short-term; Ambience -20 LUFS; Music -18 to -19 LUFS. These are guidance, not hard constraints.

## 4) Runtime Budgets & Polyphony
Memory:
- Per-scene preloaded SFX budget: ≤ 12–16 MB (44.1 kHz/16-bit PCM; consider ADPCM/FLAC where available).
- Streaming: Ambience beds and Music stream from disk (Ogg Vorbis/Opus), 128–160 kbps target.

Concurrency caps (global):
- SFX total: 24 voices
  - Combat: cap 8
  - Mining (hits): cap 6 (max 3 per material)
  - Footsteps: cap 3 (max 1 per material)
- UI: cap 6
- Ambience: beds cap 2; layers cap 4
- Music: cap 2 (main + optional layer; MVP uses 1)
Per-ID maxPoly (manifest defaults):
- sfx.footstep.* maxPoly 1 per material (rate-limit 90 ms)
- sfx.mine.hit.* maxPoly 3 per material
- sfx.combat.hit.light maxPoly 4
- sfx.combat.parry.success maxPoly 1
- sfx.combat.block.impact maxPoly 2
- sfx.combat.telegraph.whoosh maxPoly 2
Priorities (see §7).

Preload list (MVP top-10 SFX + 1 ambience bed; manifest preload: true):
1) sfx.combat.hit.light
2) sfx.combat.parry.success
3) sfx.combat.block.impact
4) sfx.combat.telegraph.whoosh
5) sfx.combat.poise.break
6) sfx.mine.hit.rock.v1
7) sfx.mine.hit.copper.v1
8) sfx.mine.hit.iron.v1
9) sfx.mine.hit.quartz.v1
10) ui.craft.complete
Ambience bed: amb.biome.crystal_caverns.base.loopA

## 5) Event Map (ECS→AudioEventBridge→Manifest.triggerKey)
Bridge resolves ECS events to triggerKey (event.*). Manifests map triggerKey to one or more manifest IDs (sfx.*, ui.*, amb.*), selecting variants by var/random/material.

Mappings (exact ECS names/payloads):
- MineHitEvent { pos, tool, power }  
  → triggerKey: event.MineHit.{rock|copper|iron|quartz}  
  Material resolved from tile/tags at pos. Spatialized at pos. Example IDs: sfx.mine.hit.rock.v1..v3, sfx.mine.hit.copper.v1..v3, sfx.mine.hit.iron.v1..v3, sfx.mine.hit.quartz.v1..v3.

- FootstepEvent { entity, material }  
  → triggerKey: event.Footstep.{rock|dust|metal}  
  Spatial at entity.pos. Example IDs: sfx.footstep.rock.v1..v3, sfx.footstep.dust.v1..v3, sfx.footstep.metal.v1..v2.

- DamageEvent { source, target, amount, type }  
  → triggerKey: event.Combat.hit.light (MVP single variant; future heavies/elementals in later sprint).  
  Example ID: sfx.combat.hit.light.

- TelegraphStartEvent { source, target, windup_ms }  
  → triggerKey: event.Combat.telegraph.start  
  Example ID: sfx.combat.telegraph.whoosh.

- PlaySfxEvent { tag, pos }  
  → Direct passthrough: if tag matches manifest.id or triggerKey, play accordingly. Spatial if pos provided.

- UiCommand { action, payload }  
  → action mapping:  
    - Navigate → triggerKey: event.UI.navigate → ui.navigate  
    - Confirm → triggerKey: event.UI.confirm → ui.confirm  
    - Error → triggerKey: event.UI.error → ui.error  
    - CraftComplete → triggerKey: event.UI.craft.complete → ui.craft.complete

- Test hook: TestPingEvent {}  
  → triggerKey: event.Test.ping → sfx.test.ping

Compact routing (ECS [predicate] → triggerKey → example manifest ids):
- MineHitEvent [mat=rock] → event.MineHit.rock → sfx.mine.hit.rock.v1..v3
- MineHitEvent [mat=copper] → event.MineHit.copper → sfx.mine.hit.copper.v1..v3
- MineHitEvent [mat=iron] → event.MineHit.iron → sfx.mine.hit.iron.v1..v3
- MineHitEvent [mat=quartz] → event.MineHit.quartz → sfx.mine.hit.quartz.v1..v3
- FootstepEvent [mat=rock] → event.Footstep.rock → sfx.footstep.rock.v1..v3
- FootstepEvent [mat=dust] → event.Footstep.dust → sfx.footstep.dust.v1..v3
- FootstepEvent [mat=metal] → event.Footstep.metal → sfx.footstep.metal.v1..v2
- DamageEvent [any] → event.Combat.hit.light → sfx.combat.hit.light
- TelegraphStartEvent [any] → event.Combat.telegraph.start → sfx.combat.telegraph.whoosh
- PlaySfxEvent [tag="sfx.combat.swing.light"] → passthrough → sfx.combat.swing.light
- PlaySfxEvent [tag="event.Combat.hit.light"] → passthrough to event → sfx.combat.hit.light
- UiCommand [Confirm] → event.UI.confirm → ui.confirm
Ambience references for scene loads: amb.tavern.loopA, amb.biome.crystal_caverns.base.loopA, amb.layer.drip.sparse, amb.layer.crystal.resonance.

## 6) Layering & Ambience Rules
- Structure: base bed + optional layers, controlled by on/off events (amb.layer.*.{on|off}).
- Hysteresis: debounce 250 ms between toggles; fade times 500–1200 ms (bed crossfades 1200 ms; layers 600 ms).
- Scene loads:
  - Tavern: amb.tavern.loopA (bed only).
  - Mine L1: amb.biome.crystal_caverns.base.loopA (bed) + amb.layer.drip.sparse (layer on).
  - Crystal resonance layer (amb.layer.crystal.resonance) comes on near crystal clusters; auto-off when far (10 m hysteresis).
- One-shots do not hard-duck Music; combat one-shots duck Ambience -3 dB briefly (see §7).

Bridge behaviors:
- Ensures single instance per bed (restarts via musical bar-align not required in MVP).
- Debounce and smooth fades on layer state changes.
- Spatialize layer one-shots lightly (min spread), beds are non-spatial stereo.

## 7) Ducking & Priority
Ducking sends:
- Combat hits, parry, poise break send to Ambience duck bus: -3 dB, attack 10 ms, hold 250 ms, release 120 ms.
- UI never ducks.
- Music ducking disabled in MVP (send path exists for later).

Priority ranges (manifest-aligned):
- Combat: 80–90 (e.g., hit.light=85, parry.success=90, poise.break=88)
- Mining: 60–70 (mine.hit.*=65)
- UI: 55–70 (confirm=65, error=70, navigate=58, craft.complete=66)
- Ambience beds: 20–35 (beds=30, layers=35)
- Music: 30

Voice-steal policy:
- Prefer stealing lowest-priority, oldest; never steal beds/Music unless forced.

## 8) Initial SFX List & Placeholders
Preload true (see §4):
1) sfx.combat.hit.light — Layered leather/wood smack + low brass thud; transient limited for clarity.
2) sfx.combat.parry.success — Bright metallic ring + crystal shimmer tail; subtle stereo widening.
3) sfx.combat.block.impact — Heavy shield/body thunk; damped resonance; short tail.
4) sfx.combat.telegraph.whoosh — Airy whoosh with breathy bellows texture; fast rise.
5) sfx.combat.poise.break — Crack + falling chime cluster; brief sub hit.
6) sfx.mine.hit.rock.v1 — Slate crack + granular grit burst.
7) sfx.mine.hit.copper.v1 — Brighter ping, soft metallic ring.
8) sfx.mine.hit.iron.v1 — Darker, weightier ring; longer decay.
9) sfx.mine.hit.quartz.v1 — Brittle chime + airy sparkle.
10) ui.craft.complete — Soft dulcimer triad + bellows puff; short.

File naming/versioning:
- audio/sfx/<domain>/<name>_vN.wav (e.g., audio/sfx/mine/mine_hit_iron_v1.wav)
- Manifest IDs: sfx.<domain>.<name>.vN (e.g., sfx.mine.hit.iron.v1)
- Loops end with _loop.wav; manifest IDs: *.loopA/B (e.g., amb.biome.crystal_caverns.base.loopA)

## 9) Toolchain & Integration Notes
Engine:
- Primary: Bevy (Rust). Keep AudioEventBridge engine-agnostic.

AudioEventBridge API (Rust pseudocode):
- fn route_event(ev: &EcsEvent, assets: &SoundManifest) -> Option<PlayRequest>
- struct PlayRequest {
    id: String,           // manifest.id chosen (e.g., "sfx.mine.hit.iron.v1")
    bus: AudioBus,        // SFX, UI, Ambience, Music
    spatial: bool,
    pos: Option<Vec3>,    // world position if spatial
    volume: f32,          // linear 0.0–1.0
    priority: u8,         // 0–100
    var: Option<String>,  // variant/material (e.g., "iron")
    duck_sends: DuckMask, // flags for Ambience/Music ducks
}

JS prototype hook (for tools/sandbox):
- function routeEvent(ev, manifest) -> PlayRequest | null

Data sources:
- data/audio/sound-manifest.json (source of truth for IDs, buses, priorities, maxPoly, preload)
- docs/combat-systems/combat-design.md (event contracts)
- data/visual/color-palette.json (telegraph color tokens for alignment only)
Testing hooks:
- sfx.test.ping via triggerKey "event.Test.ping" to validate routing path.

## 10) Mixing Targets & QA Plan
Targets:
- SFX are anchors; no clipping; Master true-peak ≤ -6 dBFS.
- Relative balance: SFX 0 dB, Music -3 dB, Ambience -4 dB, UI -2 dB trims (adjust in-engine).

In-engine audition checklist:
- Mining cadence clarity: three rapid hits do not smear; per-material timbre distinct.
- Telegraph readability: whoosh audible over beds without harshness.
- Parry sparkle does not mask immediate follow-up hit.
- Footsteps rate-limit sane at sprint speed; no machine-gunning.
- Ambience layers fade cleanly with hysteresis; no flange at crossfades.
- Ducking envelopes feel natural; Ambience recovers smoothly.

Unit tests (bridge):
- Event→triggerKey mapping correctness (per event in §5).
- Material resolution from tile tags for MineHitEvent.
- Preload set presence in manifest (IDs in §4).
- Polyphony clamps respected per-ID and per-category.
- Passthrough PlaySfxEvent resolves IDs and triggerKeys.
- Spatial routing assigns entity.pos where applicable.

## 11) Risks & Assumptions
Assumptions:
- P4 ECS event names/payloads remain stable; if they change, only bridge table requires update.
- data/audio/sound-manifest.json will adopt IDs and maxPoly/priority ranges as specified.

Risks and mitigation:
- Mix trims/ducking may require iteration without in-engine audition. Mitigate with:
  - Debug overlay: show active voices, priorities, duck gains.
  - Counters on voice steals per category.
  - Per-ID meters (peak/short-term LUFS) and recent-play histograms.
  - Test scene with spam toggles for amb.layer.* and bursty combat.

---

## Appendix A) Quick Reference Table
ECS → triggerKey → manifest ID(s)
- MineHitEvent [rock] → event.MineHit.rock → sfx.mine.hit.rock.v1..v3
- MineHitEvent [copper] → event.MineHit.copper → sfx.mine.hit.copper.v1..v3
- MineHitEvent [iron] → event.MineHit.iron → sfx.mine.hit.iron.v1..v3
- MineHitEvent [quartz] → event.MineHit.quartz → sfx.mine.hit.quartz.v1..v3
- FootstepEvent [rock] → event.Footstep.rock → sfx.footstep.rock.v1..v3
- FootstepEvent [dust] → event.Footstep.dust → sfx.footstep.dust.v1..v3
- FootstepEvent [metal] → event.Footstep.metal → sfx.footstep.metal.v1..v2
- DamageEvent → event.Combat.hit.light → sfx.combat.hit.light
- TelegraphStartEvent → event.Combat.telegraph.start → sfx.combat.telegraph.whoosh
- PlaySfxEvent [tag="sfx.combat.swing.light"] → passthrough → sfx.combat.swing.light
- PlaySfxEvent [tag="event.Combat.hit.light"] → passthrough → sfx.combat.hit.light
- UiCommand [Navigate] → event.UI.navigate → ui.navigate
- UiCommand [Confirm] → event.UI.confirm → ui.confirm
- UiCommand [Error] → event.UI.error → ui.error
- UiCommand [CraftComplete] → event.UI.craft.complete → ui.craft.complete
Ambience scenes/layers:
- Tavern scene → amb.tavern.loopA
- Mine L1 bed → amb.biome.crystal_caverns.base.loopA
- Layer optional → amb.layer.drip.sparse, amb.layer.crystal.resonance

Buses/priorities (quick):
- Combat 80–90; Mining 60–70; UI 55–70; Ambience beds 20–35; Music 30.
Ducking (quick):
- Combat one-shots duck Ambience -3 dB (10/250/120 ms). UI/Music no duck in MVP.