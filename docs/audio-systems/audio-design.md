# The Far Mine — Audio System Design (Sprint 1)

Author: Echoheart Bellowsong (Zeta)  
Version/Date: Draft v0.1 — 2026-02-18  
Status: Draft

Scope: MVP vertical slice covering Mine L1 and tavern hub. This document aligns runtime integration with data/audio/sound-manifest.json v1 and companion direction in music-direction.md.

References:
- Manifest: data/audio/sound-manifest.json (v1)
- Music Direction: docs/audio-systems/music-direction.md


## 1) Audio Pillars & Style Notes

Pillars (sonic identity):
- Industrial-musicality: tools and mechanisms as percussion; rhythm from labor and machinery.
- Breath/steam as lifeblood: hisses, valves, and bellows underpin motion and state changes.
- Stone resonance (Deepsong): low, harmonically rich resonances evoking depth and ancient mass.
- Dwarven warmth: UI and tavern lean warm/brassy/woody; friendly and sturdy.
- Clarity over clutter: strong prioritization and ducking; let key feedback read.

Category notes:
- Ambience: steady beds + subtle layers; low-mid “Deepsong” pads with intermittent details (drips, distant gear clanks).
- SFX: tactile transient focus; short to medium-short tails; minimal overlap; controlled low-end.
- UI: warm-brass clicks and soft thunks; clean, short, non-fatiguing.
- Music: restrained, layerable ostinati; loops/stems that leave space for SFX; no hard sync in Sprint 1.


## 2) Mix & Bus Plan (Text Diagram)

Buses and trims (relative, per manifest defaults; trims are guidance for authoring and runtime set-up):

- bus.master (0 dB)
  - bus.sfx (-1 dB)
  - bus.amb (-4 dB)
  - bus.music (-3 dB)
  - bus.ui (-2 dB)

Ducking strategy:
- Combat and key SFX send to a shared duck: duck.amb.soft (targets bus.amb only).
  - duck.amb.soft: attack 10 ms, hold 80 ms, release 250 ms, depth ≈ -6 dB.
- UI never ducks anything.
- Music protected from SFX ducking for MVP (no music duck sends enabled).

Target loudness (relative trims; not LUFS-calibrated for MVP):
- SFX authoring aim: integrated around -6 to -9 dB per asset (transient-forward).
- Ambience: ~4–6 dB under SFX bed; minimal transients.
- UI: slightly under core SFX, clean band-limited low-mid to avoid masking.


## 3) Event Map (ECS → triggerKey routing)

Notes:
- All triggerKeys here must match data/audio/sound-manifest.json v1 exactly.
- Asset ids (e.g., sfx.mine.hit.rock.v1) and var_groups must match manifest entries.
- Default category/bus, spatial flags, radius, poly caps, priorities follow manifest defaults unless overridden below.

Mappings:
- MineHitEvent{pos, tool, power, material?:"rock|copper|iron|quartz"} → event.MineHit.<material>
- FootstepEvent{entity, material?:"rock|dust|metal", pos?} → event.Footstep.<material>
- DamageEvent{source,target,amount,type} → event.Combat.hit.light
- Enemies emit event.Combat.telegraph.start (telegraph windup)
- PoiseBreakEvent → event.Combat.poise.break
- Optional swing phase → event.Combat.swing.light
- UiCommand{action:"navigate|confirm|error|craft.complete"} → ui.navigate / ui.confirm / ui.error / ui.craft.complete
- PlaySfxEvent{tag, pos?} → direct manifest id or triggerKey passthrough (utility)

Per-trigger defaults and overrides (align to manifest keys):
- event.MineHit.rock
  - asset: sfx.mine.hit.rock.v1 (var_group: vg.mine.rock)
  - category: sfx; spatial: true; radius: 12 m; max_poly_id: 3; priority: 72; duck: duck.amb.soft
- event.MineHit.copper
  - asset: sfx.mine.hit.copper.v1 (var_group: vg.mine.copper)
  - category: sfx; spatial: true; radius: 12 m; max_poly_id: 3; priority: 72; duck: duck.amb.soft
- event.MineHit.iron
  - asset: sfx.mine.hit.iron.v1 (var_group: vg.mine.iron)
  - category: sfx; spatial: true; radius: 12 m; max_poly_id: 3; priority: 72; duck: duck.amb.soft
- event.MineHit.quartz
  - asset: sfx.mine.hit.quartz.v1 (var_group: vg.mine.quartz)
  - category: sfx; spatial: true; radius: 12 m; max_poly_id: 3; priority: 72; duck: duck.amb.soft

- event.Footstep.rock
  - asset: sfx.footstep.rock.v1 (var_group: vg.footstep.rock)
  - category: sfx; spatial: true; radius: 8 m; max_poly_id: 1; priority: 56; duck: none
- event.Footstep.dust
  - asset: sfx.footstep.dust.v1 (var_group: vg.footstep.dust)
  - category: sfx; spatial: true; radius: 8 m; max_poly_id: 1; priority: 56; duck: none
- event.Footstep.metal
  - asset: sfx.footstep.metal.v1 (var_group: vg.footstep.metal)
  - category: sfx; spatial: true; radius: 8 m; max_poly_id: 1; priority: 56; duck: none

- event.Combat.telegraph.start
  - asset: sfx.combat.telegraph.whoosh
  - category: sfx; spatial: true; radius: 14 m; max_poly_id: 2; priority: 80; duck: duck.amb.soft
- event.Combat.swing.light
  - asset: sfx.combat.swing.light
  - category: sfx; spatial: true; radius: 14 m; max_poly_id: 3; priority: 81; duck: duck.amb.soft
- event.Combat.hit.light
  - asset: sfx.combat.hit.light
  - category: sfx; spatial: true; radius: 14 m; max_poly_id: 3; priority: 84; duck: duck.amb.soft
- event.Combat.poise.break
  - asset: sfx.combat.poise.break
  - category: sfx; spatial: true; radius: 16 m; max_poly_id: 2; priority: 95; duck: duck.amb.soft

- ui.navigate
  - asset: ui.navigate
  - category: ui; spatial: false; radius: n/a; max_poly_id: 2; priority: 58; duck: none
- ui.confirm
  - asset: ui.confirm
  - category: ui; spatial: false; radius: n/a; max_poly_id: 2; priority: 70; duck: none
- ui.error
  - asset: ui.error
  - category: ui; spatial: false; radius: n/a; max_poly_id: 2; priority: 66; duck: none
- ui.craft.complete
  - asset: ui.craft.complete
  - category: ui; spatial: false; radius: n/a; max_poly_id: 2; priority: 72; duck: none


## 4) Priority, Polyphony, and Budgets

Priority bands (10–100):
- 90–100: critical feedback (parry.success, poise.break)
- 80–89: combat swings/telegraphs
- 65–79: core interactions (mine hits, UI confirm, craft complete)
- 50–64: footsteps, nav/UI light
- 25–49: ambience/music layers

Polyphony caps:
- Global: max_poly_global = 64 (manifest default).
- Per-id caps (MVP):
  - Mine hits: 3
  - Footsteps: 1
  - Combat hit: 3
  - Telegraph: 2
  - UI: 2

Memory budget (Sprint 1 desktop, 48 kHz/16-bit):
- Ambience + music preloads ≤ 6–8 MB total (looped 10–30 s).
- SFX preload tops ≤ 3–5 MB.
- Total target ≤ 14 MB.


## 5) Top-10 Priority SFX (MVP)

- sfx.combat.poise.break → event.Combat.poise.break
- sfx.combat.hit.light → event.Combat.hit.light
- sfx.combat.telegraph.whoosh → event.Combat.telegraph.start
- sfx.combat.swing.light → event.Combat.swing.light
- sfx.mine.hit.rock.v1 (var_group: vg.mine.rock) → event.MineHit.rock
- sfx.mine.hit.copper.v1 → event.MineHit.copper
- sfx.mine.hit.iron.v1 → event.MineHit.iron
- sfx.mine.hit.quartz.v1 → event.MineHit.quartz
- ui.craft.complete → ui.craft.complete
- ui.confirm → ui.confirm

Variation:
- Use var_group round-robin where provided (e.g., vg.mine.rock, vg.footstep.rock) for alternates and to reduce repetition.


## 6) Implementation Notes (Engine-agnostic, Bevy/ECS friendly)

AudioEventBridge:
- Listens on ECS event bus.
- Resolves payloads → triggerKey (e.g., material map to event.MineHit.rock).
- Chooses asset via manifest lookup; applies var_group round-robin; enqueues with:
  - bus (from manifest category), priority, spatial params (pos, radius), duck sends.

SoundEmitter component (optional per-entity):
- Overrides: spatial_on/off, radius (m), pitch_rand (±%), vol_rand (± dB).
- Sticky tags: material (for footsteps), tool type (hammer/pick), faction (for future filters).
- Depth scalar: float [0..1] used later for ambience weighting/mix contributions.

Ambience Layering (MVP behavior):
- Per-room/biome: base loop + 0–2 detail layers (e.g., drip, crystal resonance).
- Boolean toggles per zone; simple crossfades on enter/exit (250–500 ms).
- Volume automation to be tuned after first in-engine pass.

Bar alignment:
- Not required for SFX in Sprint 1.
- Music stems/states per music-direction.md; no hard sync yet.

Toolchain:
- Assets: WAV 48 kHz/16-bit PCM.
- Simple loader; no middleware.
- Stable ids with .v1 suffix where versioned; do not re-encode during sprint.


## 7) Trigger Rules & Rate-limiting

- MineHit:
  - 1:1 with resolved tile material.
  - Suppress duplicates within 40 ms on the same emitter.
  - Var_group alternation for variation.

- Footsteps:
  - Emit cadence ≥ 320 ms when speed > threshold.
  - Material from tile underfoot (fallback: rock).
  - Per-entity cooldown; no overlap (max_poly_id 1).

- Combat:
  - Telegraph at windup start (flashAtMs-aligned if available).
  - Swing on active start.
  - Hit on confirmed collision.
  - Poise break when poise ≤ 0; ensure it is not suppressed by hit cooldowns.

- UI:
  - One-shots; never duck.
  - Debounce 120 ms to avoid repeat-press stacking.

- PlaySfxEvent:
  - If tag matches manifest id, play directly.
  - If tag matches triggerKey, resolve via manifest mapping.


## 8) Testing Plan (MVP)

Unit-style harness:
- Validate event → triggerKey resolution for all mapped events.
- Enforce per-id poly caps and global cap behavior (64).
- Verify ducking send applied only to bus.amb and not to bus.music or bus.ui.

Manual audition checklist:
- Mine four materials; confirm variation and material correctness.
- Walk footsteps on rock; confirm cadence and cooldown.
- Combat dummy: telegraph → swing → hit; force poise break.
- UI: navigate, confirm, error, craft.complete; confirm no ducking or stacking.


## 9) Risks & Assumptions

- Event payload shapes pending Alpha confirmation; material strings must match biome/tool ids.
- Loudness and duck depths likely require retune after first in-engine pass.
- Concurrency in clustered combat may need raising per-id or global poly beyond current caps.
- Assumes manifest v1 contains all listed triggerKeys and asset ids/var_groups.


## 10) Acceptance & References

Acceptance for Sprint 1:
- Event map implemented and functional (Mine L1 + tavern).
- Top-10 SFX playable via ECS triggers with correct buses, priorities, and ducking.
- Behavior aligns with data/audio/sound-manifest.json v1.

References:
- data/audio/sound-manifest.json v1
- docs/narrative/founding-lore.md (context for ambience ids)
- data/world/biome-crystal-caverns.json (mining_audio_map)


## Appendix A) Quick Map (cheat sheet)

ECS → triggerKey:
- MineHitEvent (rock) → event.MineHit.rock
- MineHitEvent (copper) → event.MineHit.copper
- MineHitEvent (iron) → event.MineHit.iron
- MineHitEvent (quartz) → event.MineHit.quartz

- FootstepEvent (rock) → event.Footstep.rock
- FootstepEvent (dust) → event.Footstep.dust
- FootstepEvent (metal) → event.Footstep.metal

- TelegraphStartEvent (enemy) → event.Combat.telegraph.start
- SwingStart → event.Combat.swing.light
- DamageEvent (confirmed) → event.Combat.hit.light
- PoiseBreakEvent → event.Combat.poise.break

- UiCommand:navigate → ui.navigate
- UiCommand:confirm → ui.confirm
- UiCommand:error → ui.error
- UiCommand:craft.complete → ui.craft.complete

- PlaySfxEvent{tag} → manifest id or triggerKey passthrough (utility)