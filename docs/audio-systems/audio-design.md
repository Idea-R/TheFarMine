# The Far Mine — Audio System & Sound Design (Sprint 1 v0.1)

Author: Echoheart Bellowsong (Zeta)  
Version/Date: v0.1 — 2026-02-19 (ISO-8601)  
Status: Draft v0.1  
Scope: L1 vertical slice; Bevy ECS per P4; event-driven audio; placeholder assets allowed.


## 1) Audio Pillars & Style Notes

Pillars (concise):
- Stone Breath Before Steel — the cave speaks first; tools answer.
- Rhythm of Work — percussive, intentional motion telegraphs feedback.
- Steam and Signal — pressure, valves, and warning cues imply systems.
- Space Tells Distance — clarity through depth, not volume; distance cues over density.

Tonal palette:
- Instruments/voices: hammered dulcimer, small brass (cornet/alto), hand drums, bellows/air, crystal tings.
- Processing: restrained, short reverb; subtle pre-delay for spatial legibility; filtered lows at depth for pressure feel.
- Spatial cues: HF damping with distance; early reflections for close walls; widen only on music/ambience, keep SFX mostly mono.


## 2) Mix/Buses & Budgets

Bus diagram (textual):
- Master
  - Music
  - Ambience
  - SFX
    - Mining
    - Combat
    - Foley
  - UI

Targets (relative loudness and headroom):
- Master: integrated anchor approx −18 LUFS; true-peak ceiling −1.0 dBTP; 6 dB headroom preserved pre-limit.
- Music: −22 LUFS integrated; crest ≤ 12 dB.
- Ambience: −24 LUFS integrated; crest ≤ 10 dB.
- SFX: short-term around −18 LUFS target on sustained SFX; transients may peak to −6 dBFS; sub-bus trims per category.
- UI: −16 LUFS integrated; short transients allowed up to −6 dBFS; never ducked.

Concurrency caps (per scene):
- Ambience voices: 6
- SFX voices (total): 12 (Mining 5, Combat 5, Foley 4; flexible steal policy)
- UI voices: 4
- Music layers: 3 (bed + motif + stinger)

Ducking rules:
- Combat → Music: sidechain duck −4 dB, attack 40 ms, hold 400 ms, release 250 ms after last qualifying event (Impact/Telegraph).
- UI priority gain: post-fader +2 dB vs SFX during 120 ms window after UI onset; never duck UI.
- Mining transient protection: first 120 ms after a Mining swing/hit cannot be ducked or voice-stolen (lock flag on voice).
- Ambience auto-duck: −2 dB during dense SFX (≥8 concurrent) with slow attack/release (300/800 ms).

Memory/streaming:
- In-memory: short SFX and UI (≤1.5 s), loop stingers, one-shots; 48 kHz, 24-bit PCM WAV preferred for iteration.
- Streamed: ambience beds and music (≥3 s), OGG or WAV streamed with 250 ms prefetch, 2× buffer for loop points.


## 3) Event Map (Draft)

Conventions:
- trigger_key pattern uses dot-separated tokens; angle brackets <...> denote variable segments.
- sfx_tag rule resolves to a concrete manifest id.
- payload fields pulled verbatim from ECS event structs.
- bus maps to one of [Music, Ambience, SFX/Mining, SFX/Combat, SFX/Foley, UI].

Entries:
1) MineHitEvent{pos, tool, power, material}
- trigger_key: sfx.mining.hit.<material|rock|ore[.type]><.light|.medium|.heavy>
- payload_fields_used: pos, power, material
- sfx_tag rule: choose rock vs ore.<type>; map power → light(<0.33), medium(0.33–0.66), heavy(>0.66)
- bus: SFX/Mining
- priority: Mining
- cooldown_ms: 40 per-emitter (per tool or per target)
- polyphony group: impacts

2) DamageEvent{source, target, amount, type}
- trigger_key: sfx.combat.impact.<type><.light|.medium|.heavy>
- payload_fields_used: amount, type, target.pos
- sfx_tag rule: amount band sets light/medium/heavy; optional pitch scale by amount (±3 semitones clamp)
- bus: SFX/Combat
- priority: Impact
- cooldown_ms: 30 per target
- polyphony group: impacts

3) FootstepEvent{entity, material, speed}
- trigger_key: sfx.foley.foot.<material>
- payload_fields_used: entity, material, speed
- sfx_tag rule: route cadence by speed (spacing) and pick from small variation pool (round-robin or random no-repeat)
- bus: SFX/Foley
- priority: Foley
- cooldown_ms: 0 (cadence driven); per-entity rate-limit = 1 voice active
- polyphony group: footsteps-per-entity

4) PlaySfxEvent{tag, pos}
- trigger_key: direct manifest tag
- payload_fields_used: tag, pos
- sfx_tag rule: passthrough; if tag startswith "ui.", force UI bus; else world SFX bus inferred by tag prefix
- bus: UI or SFX (by tag)
- priority: by bus default (UI=Critical, else category)
- cooldown_ms: per-tag registry default 60 unless override
- polyphony group: by tag

5) UiCommand{action, payload}
- trigger_key: ui.<click|open|error|confirm>
- payload_fields_used: action
- sfx_tag rule: map action to ui.click/open/error/confirm
- bus: UI
- priority: Critical
- cooldown_ms: 40 per action
- polyphony group: ui

6) TelegraphStartEvent{entity, attack_id, total_windup_ms}
- trigger_key: sfx.combat.telegraph.<enemy|attack_id>
- payload_fields_used: attack_id, total_windup_ms, entity.pos
- sfx_tag rule: attack_id maps to enemy family first, then specific if available; auto-extend to windup length for loops
- bus: SFX/Combat
- priority: Telegraph
- cooldown_ms: 100 per entity
- polyphony group: telegraphs

7) PoiseBreakEvent{entity, duration_ms}
- trigger_key: sfx.combat.poise_break
- payload_fields_used: entity.pos, duration_ms
- sfx_tag rule: one-shot plus optional short shimmer tail; no pitch randomization
- bus: SFX/Combat
- priority: Impact
- cooldown_ms: 300 per entity
- polyphony group: impacts

8) Ambient drivers (system, polled):
- trigger_key: sfx.amb.mine.<layer_id> and sfx.amb.oneshot.<type>
- payload_fields_used: depth_scalar (0..1), biome_token, mine_mood
- sfx_tag rule: compute layer weights from depth_scalar; biome selects bed types; mine_mood triggers swaps/one-shots
- bus: Ambience
- priority: Ambience
- cooldown_ms: per oneshot type 1000; beds looped
- polyphony group: ambience-per-zone


## 4) Trigger Rules, Priority, Polyphony & Cooldowns

Priority bands (highest → lowest):
- Critical (UI) > Telegraph > Impact > Mining > Foley > Ambience

Polyphony groups:
- mining_swings: max 3 per 200 ms window (distinct from hits)
- impacts: max 6 per 200 ms window
- footsteps-per-entity: max 1 concurrent per entity (new step replaces tail with short crossfade 20 ms)
- ambience-per-zone: max 1 per bed type (drips, vents, shimmer), crossfade 500 ms on changes
- telegraphs: max 2 per entity

Cooldowns and culling:
- Per-tag throttle registry: default 60 ms unless overridden above.
- Per-emitter throttle: default 40 ms for SFX with position.
- Spatial voice culling: do not spawn new voices beyond 40 meters; fade-out existing if distance > 50 m (250 ms fade).
- Distance-prioritized steal: prefer killing far/low-priority voices first.


## 5) Ambient Layering (Depth-Responsive)

Depth scalar (0..1): 0 near surface; 1 deepest. Timing: update at 10 Hz; smoothing with critically damped filter (τ ≈ 250 ms).

Layer curves (weights 0..1):
- Drips: w_drips = (1 − depth)^2
- Vents/pressure: w_vents = smoothstep(0.3, 0.8, depth)
- Runebloom hum: w_runes = smoothstep(0.6, 1.0, depth)
- Crystal shimmer bed (biome hook): w_shimmer = 0.5 × smoothstep(0.2, 0.9, depth)

Biome hooks (Crystal Caverns L1):
- Beds: sfx.amb.mine.shimmer.crystal + distant_wind
- One-shots: sfx.amb.oneshot.crystal_ting with 2–8 s randomized cooldown per zone
- Mine Mood tokens → ambience ids:
  - mood.stillshift → sfx.amb.mine.stillshift (quiet seam bed)
  - mood.pressure_rise → sfx.amb.mine.vents.medium
  - mood.echo_watch → sfx.amb.mine.shimmer.long

Spatial emitters:
- SoundEmitter component for lamps/vents: fields { sfx_tag, loop(bool), cooldown_ms, radius, max_voices(1), gain_db, start_offset_ms }
- Lamps: quiet loop with 600 ms cooldown for occasional sputter one-shots
- Vents: looped bed + periodic hiss one-shot (jittered intervals)


## 6) Top-10 Priority SFX (MVP)

- 1) sfx.mining.swing.light — SFX — pick swing, light — target: −18 LUFS short-term, peak ≤ −6 dBFS
- 2) sfx.mining.hit.rock.light — SFX — light rock impact — peak ≤ −6 dBFS
- 3) sfx.mining.hit.ore.copper — SFX — ore impact shard — brighter HF, peak ≤ −6 dBFS
- 4) sfx.pickup.ore — SFX/UI — ore pickup glint — short, −16 LUFS ST, peak ≤ −6 dBFS
- 5) sfx.combat.telegraph.goblin — SFX — goblin windup cue — steady −20 LUFS, no harsh HF
- 6) sfx.combat.impact.medium — SFX — body/armor impact — low-mid punch, peak ≤ −5 dBFS
- 7) sfx.combat.poise_break — SFX — stagger ring — clear mid-high ring, peak ≤ −6 dBFS
- 8) sfx.foley.foot.rock — SFX — boot on stone — controlled low thump, peak ≤ −8 dBFS
- 9) ui.click — UI — menu/workbench click — −16 LUFS, tight transient
- 10) sfx.amb.mine.stillshift — Ambience — quiet seam bed — −24 LUFS integrated, seamless loop

Note: full manifest to follow in data/audio/sound-manifest.json.


## 7) File Naming & Versioning

- Naming: snake.case.tokens.wav/ogg (e.g., mining.hit.ore.copper_light_v001.wav)
- Sample rate: 48 kHz; bit depth: 24-bit PCM for WAV; OGG for streamed beds/music.
- Channel layout: mono for SFX/foley; stereo for ambience/music.
- Version suffixes: _v001, _v002, increment on content change (not gain-only tweaks).
- Folder plan:
  - audio/sfx/*
  - audio/amb/*
  - audio/ui/*
  - audio/music/*


## 8) Implementation Notes (Engine-Agnostic → Bevy)

Architecture:
- Event bridge system subscribes to ECS events and resolves manifest tags and mix route, spawns voices via AudioServer.
- Components:
  - SoundEmitter { sfx_tag: String, loop: bool, cooldown_ms: u32, radius: f32, gain_db: f32, start_offset_ms: u32 }
  - AudioListener2D { pan_scale: f32, distance_scale: f32 }
- Spatialization:
  - 2D panning from world.x; pan law equal-power.
  - Distance rolloff primarily from world.y-depth (and absolute distance); HF damping with distance.
  - HRTF: deferred; placeholder stereo spread for near-field SFX.

Pseudocode: handle_event
```
fn handle_event(e: AudioEvent) {
  let req = match e {
    MineHitEvent{pos, power, material, ..} => {
      let band = band_from(power);
      let tag = format!("sfx.mining.hit.{}.{}", resolve_material(material), band);
      make_req(tag, Bus::SfxMining).with_pos(pos)
           .with_priority(Priority::Mining)
           .with_group(Group::Impacts)
           .with_cooldown_ms(40)
    }
    DamageEvent{target, amount, type_, ..} => {
      let band = band_from(amount);
      let tag = format!("sfx.combat.impact.{}.{}", type_, band);
      make_req(tag, Bus::SfxCombat).with_pos(get_pos(target))
           .with_priority(Priority::Impact)
           .with_group(Group::Impacts)
           .with_pitch(jitter_from_amount(amount))
           .with_cooldown_ms(30)
    }
    FootstepEvent{entity, material, speed} => {
      let tag = format!("sfx.foley.foot.{}", material);
      make_req(tag, Bus::SfxFoley).with_pos(get_pos(entity))
           .with_priority(Priority::Foley)
           .with_group(Group::Footsteps(entity))
           .with_rate_hint(speed_to_spacing(speed))
    }
    PlaySfxEvent{tag, pos} => {
      let bus = if tag.starts_with("ui.") { Bus::Ui } else { infer_bus(&tag) };
      make_req(tag, bus).maybe_pos(pos)
    }
    UiCommand{action, ..} => {
      let tag = ui_tag_from(action);
      make_req(tag, Bus::Ui).with_priority(Priority::Critical)
           .with_group(Group::Ui)
           .with_cooldown_ms(40)
    }
    TelegraphStartEvent{entity, attack_id, total_windup_ms} => {
      let tag = telegraph_tag_from(attack_id);
      make_req(tag, Bus::SfxCombat).with_pos(get_pos(entity))
           .with_priority(Priority::Telegraph)
           .with_group(Group::Telegraphs(entity))
           .with_expected_len_ms(total_windup_ms)
    }
    PoiseBreakEvent{entity, duration_ms} => {
      make_req("sfx.combat.poise_break", Bus::SfxCombat)
           .with_pos(get_pos(entity))
           .with_priority(Priority::Impact)
           .with_group(Group::Impacts)
           .with_cooldown_ms(300)
    }
  };
  audio_server.submit(req);
}
```

Pseudocode: voice_steal
```
fn voice_steal(policy: &Policy, new_req: &Req) -> Option<VoiceId> {
  // Reject if exceeds hard caps per bus/group
  if !caps_allows(new_req) { return None; }
  // Find candidates ranked by (priority, locked, distance, age, loudness)
  let mut candidates = active_voices()
    .filter(|v| !v.locked_transient) // mining protection
    .filter(|v| v.group != new_req.group || !group_hard_limit(new_req.group))
    .collect::<Vec<_>>();
  candidates.sort_by_key(|v| (
    v.priority.rank(),             // lower rank means lower priority
    v.locked_transient as i32,     // prefer unlocked
    dist_bucket(v.pos),            // farther first
    v.age_ms,                      // older first
    v.current_rms_db               // quieter first
  ));
  candidates.first().map(|v| v.id)
}
```

Pseudocode: ambient_update
```
fn ambient_update(depth: f32, biome: Biome, mood: Mood) {
  let wd = (1.0 - depth).powi(2);
  let wv = smoothstep(0.3, 0.8, depth);
  let wr = smoothstep(0.6, 1.0, depth);
  let ws = 0.5 * smoothstep(0.2, 0.9, depth);

  set_layer("sfx.amb.mine.drips", wd);
  set_layer(biome_shimmer(biome), ws);
  set_layer("sfx.amb.mine.vents", wv);
  set_layer("sfx.amb.mine.runebloom", wr);

  if let Some(tag) = mood_to_oneshot(mood) {
    trigger_oneshot_if_cooldown(tag, 1000);
  }
}
```


## 9) Test Plan (MVP)

Unit-ish:
- Event → tag resolution (power/amount banding; material/biome routing).
- Priority ordering and sidechain: Combat ducks Music by −4 dB with correct envelope.
- Cooldown: per-emitter (mine hits), per-tag (UI) respected.
- Polyphony caps: impacts (6/200 ms), mining_swings (3/200 ms), footsteps per-entity (1) enforced.
- Voice stealing: lower-priority, far, quiet voices culled first; mining transient lock honored.

Integration:
- MineHitEvent at light/medium/heavy maps to correct rock/ore assets and gains reflect intensity.
- TelegraphStartEvent plays immediately and sustains through windup duration; impact follows without starvation.
- UI click never starved even under SFX load; post-fader +2 dB uplift observed during 120 ms window.
- Ambient layers smoothly crossfade as depth_scalar changes; no pops on loop boundaries.


## 10) Risks & Assumptions

Assumptions:
- ECS event payloads align with P4 contracts; depth_scalar resource available at ~10 Hz; Mine Mood posted at least once per in-game day or scene shift.
- Placeholder assets permissible (v0.1), final balance pass planned after first in-engine audition.

Risks:
- Tag drift across teams (naming mismatches).
- Loudness balance without consistent reference monitor.
- Overlapping duckers causing pumping in dense scenes.

Mitigations:
- Token registry and sound-manifest.json as single source of truth; CI check for orphan tags.
- Quick gain pass after first playtest; maintain reference pink-noise cal at −20 dBFS = 83 dB SPL (room adjusted).
- Cap cumulative ducking (min floor −6 dB for Music); visualize meters in debug overlay.


## 11) Acceptance Checklist

- Pillars stated and tonal palette defined.
- Mix buses, budgets, and ducking rules documented.
- Event map drafted with trigger patterns, payload use, bus, priority, cooldowns, and polyphony groups.
- Trigger rules, priority bands, polyphony, and cooldowns defined.
- Depth-responsive ambient layering with biome hooks specified.
- Top-10 priority SFX listed with stable ids and initial mix targets.
- File naming and versioning rules provided.
- Implementation notes and pseudocode for bridge, voice steal, and ambient update included.
- Test plan (unit-ish + integration) present.
- Risks, assumptions, and mitigations recorded.