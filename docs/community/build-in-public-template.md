# Build-in-Public — <Week Label> (<YYYY-MM-DD>)

Owner: <Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta> — @<owner1> @<owner2>
Links: [PRs Merged]() • [Branch]() • [Build Hash]() • [Demo Clip]()
Sprint/Scope: <e.g., Sprint 1 — L1 Vertical Slice>

## What Landed (3–5)
- Keep ≤100 chars; 1 link per bullet; add acceptance note; use stable IDs/tokens.
- <desc using ids like ui.hud.pip or sfx.mine.hit.rock.v1> (<link>) — acceptance: <note>
- <desc> (<link>) — acceptance: <note>
- <desc> (<link>) — acceptance: <note>
- <desc> (<link>) — acceptance: <note>

## What’s Next (3–4)
- [<Owner>] <Task> — Done when <clear, testable criterion>.
- [<Owner>] <Task> — Done when <clear, testable criterion>.
- [<Owner>] <Task> — Done when <clear, testable criterion>.
- [<Owner>] <Task> — Done when <clear, testable criterion>.

## Call for Feedback
- <Prompt 1> → Reply in #feedback-forge thread; tag [combat] [worldgen] [ui] [audio] [lore] [tools] [bugs].
- <Prompt 2> → Reply in #feedback-forge thread; tag [combat] [worldgen] [ui] [audio] [lore] [tools] [bugs].

## Clip/Media Panel
- 10–30s MP4 or GIF; 1080p preferred; show input overlay if timing-sensitive.
- Filename: buildinpublic_<YYYYMMDD>_<domain>_<slug>.(mp4|gif)
- Alt text (≤120 chars): <describe action, key read, and result>

## Data & IDs Cross-Refs
- List all IDs you referenced. Verify against repo manifests.
- Reference files:
  - docs/combat-systems/combat-design.md
  - data/audio/sound-manifest.json
  - data/visual/color-palette.json
  - docs/narrative/founding-lore.md

| ID/token                              | Kind     | Source file                                      |
|---------------------------------------|----------|--------------------------------------------------|
| <DamageEvent>                         | event    | docs/combat-systems/combat-design.md             |
| <sfx.mine.hit.rock.v1>                | sfx id   | data/audio/sound-manifest.json                   |
| <mapping.telegraph.arc.amber>         | palette  | data/visual/color-palette.json                   |
| <mood.stillshift>                     | lore id  | docs/narrative/founding-lore.md                  |
| <ui.hud.stamina.pip>                  | ui id    | docs/combat-systems/combat-design.md             |

## Risks/Blockers
- <risk> — mitigation/ask: <what you need> (@<who>)

## Community Spotlight (optional)
- <shout-out ≤140 chars with link to thread/comment>

## Footer
- [ ] All links resolve (PR/branch/build/clip)
- [ ] Media under 15 MB or hosted
- [ ] IDs verified against repo
- [ ] Feedback thread created in #feedback-forge with tags
- [ ] Cross-posted to #forge-log if code merged

— Brewmaster Alehart (Theta) or domain owner


---

# Example Stub (copy/paste)

Build-in-Public — Week 07 (2026-02-18)

Owner: Theta — @brewmaster.aleth
Links: [PRs Merged]() • [Branch]() • [Build Hash]() • [Demo Clip]()
Sprint/Scope: Sprint 2 — L1 Mining Loop

## What Landed (3–5)
- Retimed pick cadence to 10 swings/6.0s using DamageEvent (https://git.example/pr/421)
  — acceptance: 6.0s ±0.1s at 60 fps
- Telegraph tint: mapping.telegraph.arc.amber applied to L1 (https://git.example/commit/a1b2c3)
  — acceptance: readable vs lava at 1080p
- Rock vs copper hits layer sfx.mine.hit.* v1 (https://git.example/pr/430)
  — acceptance: mix peak ≤ -6 dBFS, no clip
- HUD pips bound to ui.hud.stamina.pip (https://git.example/pr/433)
  — acceptance: 5 states map to fatigue thresholds
- Campfire save event.save.campfire.v1 (https://git.example/commit/d4e5f6)
  — acceptance: autosave on rest, icon flashes 300 ms

## What’s Next (3–4)
- [Theta] Wire sprint toggle HUD — Done when pip flicker <1f @60fps.
- [Delta] Balance copper HP — Done when 3-hit delta ≤1 across tools.tier.t1.
- [Beta] Add footstep sfx ids — Done when 6 mats map to sfx.step.* in manifest.
- [Gamma] Telegraphed sweep VFX — Done when arc color passes WCAG AA over lava.

## Call for Feedback
- Mining hit feel: rock vs copper — which reads better? → Reply in #feedback-forge; tag [audio] [ui].
- Telegraph arc timing: 300 ms vs 400 ms — which teaches better? → Reply in #feedback-forge; tag [combat].

## Clip/Media Panel
- 10–30s MP4 or GIF; 1080p preferred; show input overlay if timing-sensitive.
- Filename: buildinpublic_20260218_theta_mining-cadence.mp4
- Alt text: Miner swings pick; rock and copper hits differ; stamina pips drop; amber arc warns.

## Data & IDs Cross-Refs
- Verified against repo manifests.

| ID/token                              | Kind     | Source file                                      |
|---------------------------------------|----------|--------------------------------------------------|
| DamageEvent                           | event    | docs/combat-systems/combat-design.md             |
| sfx.mine.hit.rock.v1                  | sfx id   | data/audio/sound-manifest.json                   |
| sfx.mine.hit.copper.v1                | sfx id   | data/audio/sound-manifest.json                   |
| mapping.telegraph.arc.amber           | palette  | data/visual/color-palette.json                   |
| ui.hud.stamina.pip                    | ui id    | docs/combat-systems/combat-design.md             |
| event.save.campfire.v1                | event    | docs/combat-systems/combat-design.md             |
| mood.stillshift                       | lore id  | docs/narrative/founding-lore.md                  |

## Risks/Blockers
- Need goblin tint tokens finalized by Wed — @Eta — mitigation: temp map to palette.warn.goblin.

## Community Spotlight (optional)
- Shout-out @orewhisperer for copper timing tests. Log here: https://forum.example/t/7921

## Footer
- [ ] All links resolve (PR/branch/build/clip)
- [ ] Media under 15 MB or hosted
- [ ] IDs verified against repo
- [ ] Feedback thread created in #feedback-forge with tags
- [ ] Cross-posted to #forge-log if code merged

— Brewmaster Alehart (Theta)