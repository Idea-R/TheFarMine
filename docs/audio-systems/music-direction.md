# Music Direction — Dulcimer, Brass, and the Deep Hum (Sprint 1)

Provenance
- Owner: @zeta
- Audio Systems — Echoheart Bellowsong (author)

Cross-references
- docs/audio-systems/audio-design.md (§6 Music & Intensity Logic)
- data/audio/sound-manifest.json (music.* ids)
- docs/world-generation/cave-gen-algorithm.md (§Depth lanes)
- docs/visual-systems/ui-framework.md (§Events bindings)
- data/visual/color-palette.json (token-only)
- data/items/tools.json (tempo references for mining rhythm)

---

## 2) Aesthetic North Star

One-page brief
- Ensemble: steampunk dwarven chamber set. Earth-warm timbres with mechanical breath.
- Timbres:
  - Hammered dulcimer shimmer for work-song ostinatos and arpeggios.
  - Bellows/brass: baritone horn/euphonium (muted/light articulation).
  - Contrabass: steady deep hum (bowed/pizz for motion).
  - Pump organ/bellows pad: soft bed, no modern synth sheen.
  - Hand percussion: frame drum (felt mallets), shaker, soft brushes on low tom.
  - Idiophones: glass/crystal chimes sparingly for depth sparkle.
  - Musical foley: steam/gear ticks extremely low in mix (texture, not SFX).
- Mood targets:
  - Mine explore: patient momentum, quiet grit, head-down hope.
  - Tavern: warm bustle, hearth-close air (ambient only in MVP).
  - Combat overlay: percussive urgency layered atop explore without shifting harmonic ground.

---

## 3) Instrumentation Palette (MVP)

Core instruments
- Hammered dulcimer: close-mic shimmer, dry decay.
- Baritone horn / euphonium: cup-muted, light dynamics; no heroic blasts.
- Contrabass: fundamental drone and gentle ostinato (bowed/pizz).
- Pump organ / bellows pad: subtle breath noise, thin registration.
- Hand percussion: shaker (seed), frame drum (felt), low tom with brushes; avoid cymbal wash.
- Crystal chimes (idiophone): rare highlights; soft mallet or finger-pluck.
- Musical foley: faint steam puff, slow gear ticks on long cycles (musicalized, very low).

Texture and room
- Prefer a dry, close room. No heavy reverb in MVP.
- Stems delivered dry; engine will not provide convolution in Sprint 1.
- Avoid modern cymbal/sizzle; keep attacks soft and contained.

---

## 4) Tempo, Meter, and Cadence

- Explore base tempo: 92 BPM, 4/4. Use occasional 2-bar phrasing with 3+3+2 subdivisions to echo pick cadence (ref data/items/tools.json).
- Sparkle overlay: locked to 92 BPM; dotted-eighth arpeggios permitted; avoid polymeter or polyrhythm.
- Combat overlay: 116 BPM “feel” layered over the 92 BPM grid via a 3-over-4 accent pattern. Quantize starts to bar 1 so natural phasing occurs on any bar-aligned trigger.
- Loop lengths:
  - Explore base: 16 bars (bar-aligned loop).
  - Sparkle: 16 bars (bar-aligned loop).
  - Combat overlay (perc-led): 8 bars (bar-aligned loop).
- Include exact bar counts in filenames (see §9).

Approximate durations for QA (at 92 BPM, 4/4)
- 16 bars = 64 beats ≈ 41.74 s
- 8 bars = 32 beats ≈ 20.87 s

---

## 5) Harmonic Language & Keys

- Explore base: D Dorian center. Occasional modal lift to G Mixolydian. Avoid strong leading tones that force resolution at loop seams.
- Sparkle overlay: pentatonic figures and planed dyads fit over D Dorian. Never introduce conflicting thirds—keep color tones 2, 4, 6, and 5 dominant.
- Combat overlay: percussion-forward with tonal percussion tuned around D. No distinct chord changes; maintain compatibility with base center.
- Stingers:
  - Enter combat: brief IV → I modal cadence gesture (G flavor to D, without strong leading tone).
  - Exit combat: I sus2 resolving to open fifth (D–A), breath exhale.

---

## 6) Dynamic Layer System (Authoritative)

Layer-to-manifest mapping
- music.explore.base.loopA — primary bed
- music.explore.sparkle.loopB — crystal shimmer overlay
- music.combat.overlay.perc.loopA — percussive combat overlay
- music.stinger.enterCombat — one-shot
- music.stinger.exitCombat — one-shot

State machine & hysteresis (see audio-design §6)
- Enter combat:
  - Condition: inCombat true for ≥300 ms.
  - Actions: fade in combat overlay over 180–240 ms, trigger enterCombat stinger at state change, sidechain duck base by -3 dB for 600 ms.
- Exit combat:
  - Condition: inCombat false for ≥1500 ms.
  - Actions: fade out combat overlay over 340–480 ms, trigger exitCombat stinger, brief +1 dB makeup on base for 400 ms acceptable.

Gain targets before music bus
- Base loop nominal: 0.63 (manifest); bus.music at -4 dB (see manifest.globals.buses).
- Sparkle nominal: 0.60; engine defaults to 70% of nominal unless crystal density raises it (see §7).
- Combat overlay nominal: 0.62. Ensure no master clipping; stems must preserve ≥3 dBFS headroom.

---

## 7) Depth & Biome Modulation (Explore Layers)

Depth scalar routing (0..1) to explore pair
- Base gain scale: baseGain = 0.18 + 0.64 × depth
- Sparkle gain bias:
  - sparkleGain = 0.35 + clamp01(crystalDensity × 0.7) × 0.30
  - crystalDensity is biome-provided (0..1). Clamp result to [0.35, 0.65].
- No key or tempo changes with depth in MVP.

Notes
- Depth lanes per docs/world-generation/cave-gen-algorithm.md supply the depth value.
- Visual palette cues (token-only, data/visual/color-palette.json) may co-vary but do not modulate music in MVP.

---

## 8) Cue Map & Triggers (Copy/Paste)

Scene transitions
- scene.mine.enter → start music.explore.base.loopA and music.explore.sparkle.loopB at next bar boundary. Engine may free-run clock; provide bar-aligned loop points for seamlessness.
- scene.hub.enter → stop mine music layers; start ambient.tavern.loopA (music deferred; ambient only in MVP).

Combat events
- music.state { inCombat } → manage overlay and stingers per §6 hysteresis. All overlay/stinger triggers align to bar starts when latency permits (see §12).

---

## 9) Stem Prep & File/Loop Specs (Authoritative for assets)

Delivery
- Format: OGG, 44.1 kHz, 16-bit, stereo for all loops and stingers.
- Loudness: -16 LUFS integrated target; true-peak ≤ -3 dBFS.
- Stems are dry; no bus reverb printed.

Looping
- Bar-aligned loop points; ensure zero-crossings at boundaries.
- Include 10–20 ms pre-roll safety inside files; if engine supports metadata loop points, set precise LoopStart/LoopEnd. Otherwise hard-trim and QA for gapless playback.

File naming (exact)
- music/explore_base_loopA_92bpm_16bar.ogg → id music.explore.base.loopA
- music/explore_sparkle_loopB_92bpm_16bar.ogg → id music.explore.sparkle.loopB
- music/combat_overlay_perc_loopA_92bpm(116feel)_8bar.ogg → id music.combat.overlay.perc.loopA
- music/stinger_enter_combat_92bpm_barAligned.ogg → id music.stinger.enterCombat
- music/stinger_exit_combat_92bpm_barAligned.ogg → id music.stinger.exitCombat

Phase and onset discipline
- Sparkle and combat overlay must begin with silence or a light pickup ≤50 ms to avoid transient pops when faded in mid-phrase.
- Strongest accents land on beat 1. Avoid hard transients in the first 20 ms of the file.

---

## 10) Mixing & Sidechain Targets

Buses & headroom
- Follow manifest.globals.buses (music at -4 dB).
- Maintain ≥6 dB headroom on master under worst-case SFX bursts.

Engine-driven sidechain ducks
- combat.poiseBreak → duck music by -4 dB for 500 ms (attack 60 ms, release 200 ms).
- mining.break.stone → duck music by -2 dB for 220 ms (fast attack/release).

Internal music-bus stem balance (guidance)
- Base: 0 dB
- Sparkle: -4 dB
- Combat overlay: -2 dB

---

## 11) Tavern Ambient (MVP)

- No music bed in MVP. ambient.tavern.loopA suffices for Sprint 1.
- Direction note (Season 2): introduce hurdy-gurdy drone + low chatter loop in D mixolydian family for musical continuity with mine key center.

---

## 12) Implementation Notes for Engineers

Engine API usage
- setMusicState({ inCombat, biomeId })
- setDepthScalar(value) → affects explore base/sparkle per §7.
- On scene.mine.enter: start explore.base, then sparkle (same bar). Prevent duplicate starts via polyphonyKey.
- Overlay and stingers managed via hysteresis in §6.

Bar-aware fades
- Prefer aligning overlay fade-in to the next bar if estimated trigger latency <200 ms.
- If >200 ms, trigger immediately but use 180–240 ms ramp to the musical grid (start at low-energy segment per §9).

Ordering & polyphony caps
- Start order: base → sparkle; overlays/stingers follow state changes.
- Use polyphonyKey per id (e.g., "music.explore.base.loopA") with maxVoices=1 to avoid double-start/race.

Safety & QA hooks
- On combat enter: schedule stinger at bar boundary; overlay fade can begin immediately if boundary miss would exceed latency budget.
- Ensure bar-aligned loop points are respected even if streams begin late; engine clock should snap subsequent loop cycles.

---

## 13) Composer Checklist (QA)

- [ ] All stems at -16 LUFS integrated; true-peak ≤ -3 dBFS
- [ ] Bar-aligned loop points; zero-crossings; gapless re-entry verified
- [ ] Overlay rhythmic grid aligns to 92 BPM base; 3-over-4 accent for 116-feel overlay only
- [ ] Harmonic language avoids leading-tone traps at loop seam; D Dorian center maintained
- [ ] Stingers trimmed, bar-aligned attack; enter = IV→I gesture, exit = I sus2 → open fifth
- [ ] File names exactly match manifest ids; bar counts and BPM encoded in filename
- [ ] Sparkle avoids conflicting thirds; pentatonic/planed dyads only
- [ ] Initial 20 ms transient control; overlays begin with ≤50 ms light pickup
- [ ] Dry stems; no printed reverb; mechanical foley subtle and musical
- [ ] Durations noted (16-bar ≈ 41.74 s; 8-bar ≈ 20.87 s at 92 BPM)

---

## 14) Acceptance

- Stems integrate with current engine logic without audible pops.
- Music maintains headroom under SFX, follows bus targets, and sidechain ducks per §10.
- Overlays/stingers feel musical within the hysteresis windows in §6; bar-aware behavior honored where feasible.
- Depth and biome modulation of explore layers perform as defined in §7.
- All ids and filenames match data/audio/sound-manifest.json and naming in §9.

Echoheart Bellowsong hums the rails: dulcimer sparks, brass breathes, the deep hum holds true.