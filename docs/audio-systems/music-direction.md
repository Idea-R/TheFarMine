# Music Direction — Hammer, Bellows, and Brass (Sprint 1)

Provenance: owner @zeta (Audio Systems — Echoheart Bellowsong)

Cross-refs: data/audio/sound-manifest.json (asset ids), docs/audio-systems/audio-design.md (§10 Music Conductor, §11 Ducking), docs/combat-systems/combat-design.md (§10 Events), data/visual/color-palette.json (mapping.depthTint.l0), docs/technology-systems/crafting-design.md (§8 Events & Bridges).

---

## 1) Aesthetic North Star (MVP)
Dwarven chamber ensemble: hammered dulcimer carries sparkling ostinati, low brass (tenor horn/euphonium) breathes modal weight, hand percussion adds industrious pulse, and soft bellows/steam textures exhale in the bed with occasional crystal glints. The tone is calm and industrious for exploration, with percussive clarity for Three‑Wide reads, unobtrusive looping, and a fast, lightweight overlay path for combat.

---

## 2) Instrument Palette & Roles
- Hammered Dulcimer — ostinati/arpeggios; mid-high register; sparkle layer.
- Low Brass (Euph/Tenor Horn) — long tones, modal pedal points; warmth/weight.
- Hand Percussion — frame drum, shakers, light clacks; provides combat overlay cells.
- Bellows/Steam Textures — breathing beds; depth tint pairing.
- Crystal Accents — light plucks/glints for explore.sparkle.

Production notes: dry-to-room IR only (small stone chamber), subtle tape overdrive for cohesion, web-safe headroom (−3 dBFS peak per stem).

---

## 3) Asset IDs & Stems (authoritative)
Exact ids (must match manifest):

- music.explore.base.loopA — base exploration bed (dulcimer + brass pad + bellows bed printed as a single stereo loop for MVP).
  - Target loudness: −18 LUFS integrated, peak ≤ −3 dBFS.
  - Loop length: 16 bars.
  - Alignment: align:"bar".
- music.explore.sparkle.loopA — add-on sparkle layer (dulcimer upper ostinato and crystal plucks) — loop:true, align:"bar".
  - Target loudness: −22 LUFS integrated (submix layer), peak ≤ −6 dBFS.
  - Loop length: 8 bars.
  - Alignment: align:"bar".
- music.combat.overlay.perc.loopA — percussion overlay (frame drum + sticks) — loop:true, align:"bar".
  - Target loudness: −16 LUFS integrated, peak ≤ −3 dBFS.
  - Loop length: 4 bars.
  - Alignment: align:"bar".
- music.stinger.enterCombat — 1–2 bar brass swell + drum pickup; align:"bar".
  - Target loudness: −14 LUFS short-term max, peak ≤ −1 dBFS.
  - Length: 2 bars recommended (MVP).
  - Alignment: align:"bar" (queued next bar).
- music.stinger.exitCombat — 1–2 bar cadential release; align:"bar".
  - Target loudness: −14 LUFS short-term max, peak ≤ −1 dBFS.
  - Length: 2 bars recommended (MVP).
  - Alignment: align:"bar" (queued next bar).

---

## 4) Tempo, Meter, and Keys
- Tempo/Meter: 92 BPM, 4/4 across all assets (fixed MVP).
- Bar length: 4 beats; 1 bar ≈ 2.609 s at 92 BPM.
- Keys/Modes: D Dorian/D minor color; avoid leading-tone cadences for clean looping.
- Engineering note: Conductor holds a global 92 BPM bar/beat clock; all align:"bar" assets start/stop at bar boundaries; stingers are queued and fire on the next bar.

---

## 5) Loop Construction & Seam Rules
- All loops are exact whole-bar multiples with seamless cycle points at zero-crossings; ambience tails must be printed entirely within the loop region so the last sample leads cleanly to the first.
- Recommended loop lengths (MVP):
  - explore.base.loopA: 16 bars.
  - explore.sparkle.loopA: 8 bars (harmonically compatible subset of base).
  - combat.overlay.perc.loopA: 4 bars (tight re-entry).
- Tail handling: bake reverbs/delays into the loop body; no external/continuing tails beyond loop end.

---

## 6) Layer States & Intensity Model
- Explore Calm: base only.
- Explore Curious: base + sparkle (triggered by light milestones; can be manually toggled in MVP).
- Combat Engaged: base + combat overlay; enter stinger on first combat.TelegraphStart when not already in combat.
- Combat Cooldown: remain in Combat during hysteresis, then play exit stinger and drop overlay.

Hysteresis:
- Enter: play enter stinger immediately (queued to next bar); overlay starts on the next bar boundary.
- Exit: require 4 full bars with no combat events (TelegraphStart/Hit) before scheduling exit stinger; overlay stops on the bar boundary preceding the exit stinger if needed (never mid-bar).

---

## 7) Loudness Targets & Balancing
Per-asset integrated LUFS targets:
- explore.base.loopA: −18 LUFS, peak ≤ −3 dBFS.
- explore.sparkle.loopA: −22 LUFS (submix layer), peak ≤ −6 dBFS.
- combat.overlay.perc.loopA: −16 LUFS, peak ≤ −3 dBFS.
- Stingers (enter/exit): −14 LUFS short-term max, peak ≤ −1 dBFS.

Runtime gains:
- Music bus initialGain: −4.0 dB (per manifest.globals.buses.music).
- Conductor may apply ±2 dB trims to overlays to maintain headroom when SFX ducking is active (see §9). Maintain combined music peak headroom ≥ −2 dBFS under typical SFX load.

---

## 8) Ducking & Sidechain Plan
- As per manifest.globals.ducking.rules: SFX momentarily duck Music and Ambient by ~3–4 dB with 12–20 ms attack and 180–260 ms release (nominal 3.5 dB, 16 ms, 220 ms).
- UI ducks Music slightly less (~2–3 dB; same envelope).
- Stingers are exempt from ambient ducking; SFX may still duck stingers modestly (1–2 dB) to preserve hit clarity. Ensure manifest flags reflect this exemption for ambient-to-stinger.

---

## 9) Conductor Behaviors (Engineer Contract)
Conductor API expectations (docs/audio-systems/audio-design.md §10/§11 compliant):
- Music.startLayer(id, { align:"bar"|"immediate" })
- Music.stopLayer(id, { align:"bar"|"immediate" })
- Music.playStinger(id, { align:"bar" }) — queues to the next bar; does not interrupt running layers.
- Music.setTempo(bpm) — MVP fixed 92.
- Music.getBarBeat() → { bar:int, beat:int (1..4) }

Event wiring (docs/combat-systems/combat-design.md §10 Events):
- On first combat.TelegraphStart when not in combat: Music.playStinger("music.stinger.enterCombat", {align:"bar"}); Music.startLayer("music.combat.overlay.perc.loopA", {align:"bar"}).
- During combat (any combat.TelegraphStart/Hit): maintain overlay; reset exit hysteresis timer.
- On combat calm (no combat events for ≥4 bars): queue Music.playStinger("music.stinger.exitCombat", {align:"bar"}) for next bar; Music.stopLayer("music.combat.overlay.perc.loopA", {align:"bar"}) on the boundary that precedes exit stinger if overlapping.

Edge cases:
- If a new combat event arrives while exit stinger is queued or exit is in progress: cancel exit stinger and keep/restore overlay; system remains in combat state.
- Starting explore.sparkle.loopA is non-destructive and must phase-align to base on bar start; stopping it must be bar-quantized (no fades mid-bar beyond micro-fade at seam for click prevention).
- Crafting/technology bridges (docs/technology-systems/crafting-design.md §8) do not alter music state in MVP; they only generate SFX that engage normal ducking.

---

## 10) Scene Integration & Depth Tint Sync
- Mine scene enter:
  - Start music.explore.base.loopA immediately (align:"immediate" ok at scene load; it naturally locks to bar 1 of the global clock).
  - Keep music.explore.sparkle.loopA off by default; allow debug/manual toggle.
  - Optional MVP: bind normalized depth scalar [0..1] to a gentle lowpass on the bellows layer inside the base bed (2–3 dB tonal shift across range), visually paired to data/visual/color-palette.json mapping.depthTint.l0. If not implemented, keep musical bed static and let Ambience own depth.
- Tavern scene:
  - Stop all Mine music layers gracefully on bar boundaries.
  - No combat overlay in Tavern; rely on tavern ambient only.

---

## 11) Composer Delivery Specs
- File format: 48 kHz / 24-bit WAV per stem; stereo interleaved.
- Loop conformance: region length equals exact bar multiples at 92 BPM; seamless cycle with tails baked-in.
- Naming: filenames exactly match manifest ids (e.g., music.explore.base.loopA.wav).
- Provide: bar count per asset, BPM confirmation, and a separate 1-bar count-in reference render (click or stick) for verification.

---

## 12) QA & Audition Checklist
- Verify loop seams at 92 BPM in-engine; no clicks or ambience discontinuities.
- Confirm bar alignment of overlays/stingers, and hysteresis behavior (enter immediate on next bar; exit only after 4 idle bars).
- Validate that ducking envelopes feel natural under frequent SFX (mining/combat hits); stingers remain intelligible yet not overpowering.
- Confirm overall mix under hit-stop moments remains musical; no time scaling or tempo warble.
- Check combined peaks under typical SFX do not exceed −2 dBFS on the master.

---

## 13) Risks & Dials
- Risks: fixed BPM limits flexibility across future biomes; combat overlay may feel busy under dense SFX.
- Dials (tunable at runtime):
  - Overlay gain trim: ±2 dB (Conductor).
  - Exit hysteresis: 3–6 bars.
  - Sparkle participation: on/off gate.
  - Stinger length: 1–2 bars (use 2 bars by default in MVP).

---

## 14) Acceptance Checklist
- Asset ids align 1:1 with data/audio/sound-manifest.json.
- Tempo/meter fixed and documented; loop lengths defined in bars.
- Bar-quantized start/stop behaviors and hysteresis rules are explicit.
- Loudness targets and peak ceilings provided; ducking assumptions match manifest.
- Conductor API and event wiring unambiguous and compliant with docs/audio-systems/audio-design.md (§10, §11).