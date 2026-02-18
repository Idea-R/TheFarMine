# Build-in-Public Template — Weekly Taproom Update (Sprint 1)

Owner/Provenance: @theta (Community — Brewmaster Alehart)

Cross-refs:
- docs/community/engagement-playbook.md (§7 Weekly Rituals, §10 Moderation Rota)
- data/community/welcome-sequence.json (for channel tokens like {{channel.announcements}})
- docs/technology-systems/crafting-design.md (clip/PR examples)
- docs/combat-systems/combat-design.md (telegraphs, tuning notes)
- docs/visual-systems/style-guide.md (§Accessibility for alt-text)
- data/visual/color-palette.json (token mentions optional in copy)

Brewmaster’s note: Keep it warm, keep it crisp. Post within 10 minutes or it’s on me keg tab.


## 2) Posting Cadence & Where

- When: Tuesdays, 18:00 UTC (Sprint 1).
- Where:
  - Root post in {{channel.announcements}}
  - Link a new thread in {{channel.build_in_public}} (this is the long-form opener)
  - Cross-share a one-line invite in {{channel.tavern_talk}}
- Permissions:
  - @dev and @brewmaster can post in announcements
  - Everyone else: reply and discuss in the linked {{channel.build_in_public}} thread
- After posting: add {{thread_link}} back into the announcement and the tavern teaser.


## 3) Placeholder Tokens (authoritative)

Use these exactly as written:
- {{date_utc}} — ISO-like date in UTC (e.g., 2026-02-17)
- {{sprint}} — Sprint number (e.g., 1)
- {{week_index}} — Week number in the sprint or overall cadence (e.g., 03)
- {{clip1_url}} — Primary clip link (10–20s)
- {{clip2_url}} — Secondary clip link (optional)
- {{img1_url}} — Image/screenshot link (optional)
- {{alt1}} — Alt-text for clip/image 1
- {{alt2}} — Alt-text for clip/image 2
- {{pr_links_bullets}} — Bullet list of up to 5 PRs/commits in markdown link format
- {{next_goals_bullets}} — Bullet list of 3–5 next steps
- {{blockers_bullets}} — Bullet list of 1–3 risks or blockers
- {{spotlight_member}} — Community member handle
- {{spotlight_summary}} — One-line credit/thanks
- {{cta_line}} — One clear ask (vote, try a build, answer a question)
- {{hash_or_version}} — Build version or short git hash
- {{playtest_signups_url}} — Optional link to playtest signups
- {{thread_link}} — Link to the build-in-public thread (fill after posting)
- {{channel.*}} — Channel tokens from data/community/welcome-sequence.json (e.g., {{channel.announcements}}, {{channel.build_in_public}}, {{channel.tavern_talk}})


## 4) Short Variant (Announcements root — 4–6 lines max)

Use this for the Discord announcement. Keep it tidy, 6 lines max.

Paste-ready block:
```
Howdy, Taproom! Week {{week_index}} — Sprint {{sprint}} ({{date_utc}})
Shipped: [add 1–2 short fragments here, e.g., “Three‑Wide lanes”, “Burrower telegraphs”]
Next: [one line on the upcoming focus — e.g., “Tune pickfeel + UI polish on crafting.”]
Clips/Images: {{clip1_url}} {{clip2_url}} {{img1_url}} (alt-text added: {{alt1}} / {{alt2}})
Spotlight: {{spotlight_member}} — {{spotlight_summary}}
Join the thread → {{thread_link}} • {{cta_line}} {{playtest_signups_url}}
```


## 5) Long Variant (Thread opener in {{channel.build_in_public}})

Open the thread with this fuller breakdown. Keep bullets crisp.

Paste-ready block:
```
Week {{week_index}} — {{date_utc}} [Sprint {{sprint}}]

WHAT WE BUILT THIS WEEK
- [worldgen] …
- [combat] …
- [crafting/tech] …
- [ui/audio/lore] …

WHAT’S NEXT
{{next_goals_bullets}}

BLOCKERS / RISKS
{{blockers_bullets}}

FRESH POURS (CLIPS/SCREENS)
- Clip/Image A: {{clip1_url}}
  Alt: {{alt1}}
- Clip/Image B: {{clip2_url}} {{img1_url}}
  Alt: {{alt2}}

PRs / COMMITS OF NOTE (≤5)
{{pr_links_bullets}}

COMMUNITY SPOTLIGHT
- {{spotlight_member}} — {{spotlight_summary}}

CALL TO ACTION
- {{cta_line}} {{playtest_signups_url}}

VERSION / HASH
- {{hash_or_version}}
```
Notes:
- Keep PRs ≤5. If more, provide a single compare link in {{pr_links_bullets}}.
- Alt-text guidance: see docs/visual-systems/style-guide.md (§Accessibility for alt-text) and Section 7 below.


## 6) Asset Ask Checklist (lightweight)

Prep under 10 minutes:
- 1–2 short clips (10–20s) or 1–2 screenshots.
- 1–2 sentence summary per active domain this week (worldgen/combat/tech/art/audio/lore).
- 1–3 PR links (optional) or a single compare link.
- One community spotlight (optional; skip if none this week).
- One clear CTA line.
Note: If any domain is under crunch, skip clips; text-only is acceptable per the playbook.


## 7) Alt-text Guidance (accessibility must-do)

- Be compact (1–2 sentences). Describe key motion, visible UI text, and the purpose of the clip/screen. Avoid “image of” redundancy.
- Name critical feedback cues (e.g., hit sparks, warning telegraphs, resource counters) and outcomes (success/fail, gain/loss).
- If color is the only differentiator, mention it; palette tokens (from data/visual/color-palette.json) can be referenced if helpful.

Example alt-text snippets:
- Mining clip: “First-person pickaxe strikes on iron seam; spark VFX and +3 Iron counter pop in top-right; stamina ring dips to 40% on third swing; vein collapses clean.”
- Goblin telegraph: “Goblin raises torch; orange cone telegraph widens for 0.6s, then lunge forward; player sidesteps left, no damage taken; ‘Perfect Dodge’ text flashes.”


## 8) Tag & Threading Guidance

- Required thread title: Week {{week_index}} — {{date_utc}} [Sprint {{sprint}}]
- Suggested tags in first line: [worldgen], [combat], [crafting], [ui], [audio], [lore] (only what applies)
- Reminders:
  - Keep all replies in the thread.
  - Pin the opener within the thread.
  - Add {{thread_link}} back to the announcement and tavern teaser once created.


## 9) Snippet Library (ready-to-paste)

Announcements — Short opener:
```
Howdy, Taproom! Week {{week_index}} — Sprint {{sprint}} ({{date_utc}})
Shipped: [add 1–2 short fragments here, e.g., “Three‑Wide lanes”, “Burrower telegraphs”]
Next: [one line on the upcoming focus — e.g., “Tune pickfeel + UI polish on crafting.”]
Clips/Images: {{clip1_url}} {{clip2_url}} {{img1_url}} (alt-text added: {{alt1}} / {{alt2}})
Spotlight: {{spotlight_member}} — {{spotlight_summary}}
Join the thread → {{thread_link}} • {{cta_line}} {{playtest_signups_url}}
```

Build-in-public — Thread opener:
```
Week {{week_index}} — {{date_utc}} [Sprint {{sprint}}]

WHAT WE BUILT THIS WEEK
- [worldgen] …
- [combat] …
- [crafting/tech] …
- [ui/audio/lore] …

WHAT’S NEXT
{{next_goals_bullets}}

BLOCKERS / RISKS
{{blockers_bullets}}

FRESH POURS (CLIPS/SCREENS)
- Clip/Image A: {{clip1_url}}
  Alt: {{alt1}}
- Clip/Image B: {{clip2_url}} {{img1_url}}
  Alt: {{alt2}}

PRs / COMMITS OF NOTE (≤5)
{{pr_links_bullets}}

COMMUNITY SPOTLIGHT
- {{spotlight_member}} — {{spotlight_summary}}

CALL TO ACTION
- {{cta_line}} {{playtest_signups_url}}

VERSION / HASH
- {{hash_or_version}}
```

Tavern cross-post teaser (one-liner):
```
Taproom Tuesday is up! Thread → {{thread_link}} • React: 👍 shipped • 🧪 testing • 💡 ideas • 🪓 mining
```

Reaction key suggestion:
- 👍 on shipped items
- 🧪 for testing/try-it
- 💡 for ideas/suggestions
- 🪓 for mining/worldgen love


## 10) Examples (filled samples for Sprint 1)

Announcements — Filled sample:
```
Howdy, Taproom! Week 03 — Sprint 1 (2026-02-17)
Shipped: Three‑Wide lanes in early mines, Burrower telegraphs tuned
Next: Lock pickaxe timing + polish crafting UI pass (slots + hover help).
Clips/Images: https://clips.example.com/three-wide-lanes.mp4 https://clips.example.com/burrower-telegraph.mp4 (alt-text added: See thread A/B)
Spotlight: @quartzling — Surfaced a repro of the stuck-node bug with a clean video + logs. Cheers!
Join the thread → https://discord.com/channels/000/000/1234567890 • Try the nightly and tell us how the new tunnels feel: https://play.example.com/signup
```

Build-in-public — Thread opener (filled sample):
```
Week 03 — 2026-02-17 [Sprint 1]

WHAT WE BUILT THIS WEEK
- [worldgen] Early shafts now generate Three‑Wide lanes; improved pathability and camera clearance.
- [combat] Burrower lunge telegraphs retimed to 0.6s windup; cone VFX clarified; dodge window consistent.
- [crafting/tech] recipes.json schema locked; added validation on load and error surfacing in UI.
- [ui] Context hover help for crafting slots; focus order cleaned for keyboard.
- [audio] New pickaxe hit layers on stone vs. ore; subtle stamina dip cue.

WHAT’S NEXT
- Tune pickaxe impact timing and stamina cost curve (short playtest).
- Wire compare-link bot into {{channel.build_in_public}} for PR digests.
- First pass on accessibility labels for crafting slots and error toasts.
- Add Burrower “near miss” audio to reinforce dodge window.

BLOCKERS / RISKS
- Perf spikes in dense ore rooms under particle load (investigating emitter pooling).
- Rare stuck-node in cave graph when backfilling collapsed veins (repro improving).

FRESH POURS (CLIPS/SCREENS)
- Clip A: https://clips.example.com/three-wide-lanes.mp4
  Alt: First-person run through new Three‑Wide tunnel; camera clears beams cleanly; pathing nodes show smooth turns.
- Clip B: https://clips.example.com/burrower-telegraph.mp4
  Alt: Goblin Burrower raises torch; orange cone widens ~0.6s then lunge; player dodges left; “Perfect Dodge” flashes.

PRs / COMMITS OF NOTE (≤5)
- [PR #241 — Three‑Wide generator + navmesh pass](https://git.example.com/farmine/game/pull/241)
- [PR #244 — Burrower telegraph timing + VFX cone](https://git.example.com/farmine/game/pull/244)
- [Compare — crafting schema lock](https://git.example.com/farmine/game/compare/0.1.0-alpha.2...0.1.0-alpha.3)

COMMUNITY SPOTLIGHT
- @quartzling — Clear repro + logs for stuck-node cave graph; unblocked our test pass. Thank you!

CALL TO ACTION
- Try the nightly in the test branch and rate tunnel “feel” (1–5) in the thread. 🧪 https://play.example.com/signup

VERSION / HASH
- 0.1.0-alpha.3 (hash 7f3a2c1)
```

Alt-text (as referenced “See thread A/B” in the announcement):
- A: “First-person run through new Three‑Wide tunnel; camera clears beams cleanly; pathing nodes show smooth turns.”
- B: “Goblin Burrower raises torch; orange cone widens ~0.6s then lunge; player dodges left; ‘Perfect Dodge’ flashes.”


## 11) Roles & Handoff

- Prepare draft (Mon): @brewmaster + @dev domain leads gather clips, bullets, and CTA.
- Post/pin (Tue 18:00 UTC): @brewmaster (backup: on-duty mod).
- Monitor thread (Tue–Thu): rota per engagement-playbook §10; acknowledge questions within 24h; collect actionables for next sprint review.


## 12) Acceptance Checklist

- Template is copy-pasteable with clear placeholders (tokens listed, blocks provided).
- Short and long variants present and Discord-suitable.
- Accessibility alt-text guidance included with examples.
- Asset ask is lightweight and respects developer load.
- Cross-refs and channel tokens align with engagement-playbook.md and welcome-sequence.json.

Brewmaster’s closing: Keep the pours fresh and the notes honest. See you Tuesday at 18:00 UTC in {{channel.announcements}} and down-thread in {{channel.build_in_public}}.