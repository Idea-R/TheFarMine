# The Far Mine — Community Engagement Playbook v0.1 (Sprint 1)

Owner: Brewmaster Alehart (Theta)  
Version: 0.1  
Date: 2026-02-18

This is the Discord-first community operations plan for Mine Level 1’s vertical slice. Targets: active dev coordination, newcomer onboarding, feedback triage, and lightweight rituals that convert daily chatter into progress signals.

---

## 1) Title & Scope

- Scope
  - Discord-first ops during Sprint 1, focused on:
    - Daily alignment of core contributors
    - Newcomer welcome and path to first post
    - Feedback intake and triage to issues
    - Lightweight, repeatable rituals with visible output
  - Coverage: All channels listed in the Channel Map; Friday live sessions; manual digest/triage

---

## 2) Goals & Success Criteria

- Goals
  - Keep contributors aligned daily
  - Welcome and retain newcomers
  - Convert chatter into actionable feedback
  - Celebrate visible progress

- Success (first 2 weeks)
  - ≥80% daily Hearthfire Roll Call participation from domain owners
  - ≤24h response on feedback threads (weekdays)
  - 2 build-in-public posts/week minimum
  - Newcomer welcome flow D1 response rate ≥90%

---

## 3) Channel Map

Guidance is “threads-first” to keep the surface tidy. Pins are for templates, checklists, and current builds only.

- #announcements
  - Purpose: Top-line beats; crucial updates; sprint framing.
  - Lead: Brewmaster (Theta).
  - Posting rules: Brewmaster-only posts; replies locked; emoji reactions allowed.
  - Permissions summary: Post = Brewmaster; Reply = locked; Threads = off.
  - Pin policy: Only Brewmaster pins; maintain ≤5 active pins (latest replaces oldest).

- #project-orchestration
  - Purpose: Daily Mine Mood + Hearthfire Roll Call threads; blocking/unblocking; plan of day.
  - Lead: Brewmaster (Theta).
  - Posting rules: Threads-only; 1 thread/day for Roll Call; mine mood post top-level then thread.
  - Permissions summary: Post = staff/core; Reply = everyone in thread; Threads = encouraged.
  - Pin policy: Pin latest roll call template + checklist; keep ≤3 pins.

- #build-in-public
  - Purpose: Weekly WIP clips/notes; in-flight progress; behind-the-scenes.
  - Lead: Founders/Core Devs (Alpha–Eta).
  - Posting rules: Use template; 1–2 posts/week; community replies encouraged.
  - Permissions summary: Post = devs/owners; Reply = everyone; Threads = encouraged for each post.
  - Pin policy: Pin post template + current week highlight; ≤4 pins.

- #tavern-talk
  - Purpose: General chat; meet-and-greet; off-topic within reason.
  - Lead: Moderators.
  - Posting rules: Light moderation; spoilers in threads; label WIP.
  - Permissions summary: Post/Reply = everyone; Threads = for extended topics.
  - Pin policy: Pin weekly vendor/self-promo thread; rotate weekly; ≤3 pins.

- #playtest-pit
  - Purpose: Session calls; test builds; bug repros; voice session links.
  - Lead: Brewmaster + domain owners during sessions.
  - Posting rules: Use pinned test checklist; link build hash; threads per session.
  - Permissions summary: Post = staff/devs; Reply = playtesters/staff; Threads = per session required.
  - Pin policy: Pin test checklist + latest build hash; ≤5 pins.

- #feedback-forge
  - Purpose: Feature/UX suggestions using [Feedback] template; tag domains.
  - Lead: Brewmaster (triage) + domain owners (response).
  - Posting rules: Template required; tags required; one topic per thread.
  - Permissions summary: Post = everyone; Reply = everyone; Threads = required; Owner acknowledges.
  - Pin policy: Pin template + tag key; ≤3 pins.

- #bug-reports
  - Purpose: Reproducible issues with required fields; link build hash.
  - Lead: Moderators (format) + dev owners (triage).
  - Posting rules: Use template; 1 bug/thread; add [bugs] + relevant domain tags.
  - Permissions summary: Post = everyone; Reply = everyone; Threads = required.
  - Pin policy: Pin template + repro guide; ≤3 pins.

- #lore-weave
  - Purpose: Narrative/language explorations; Mine Mood lexicon votes.
  - Lead: Epsilon (proposes) + Brewmaster (posts mood).
  - Posting rules: Thread per topic; emoji voting for lexicon candidates.
  - Permissions summary: Post/Reply = everyone; Threads = encouraged.
  - Pin policy: Pin lexicon index and vote key; ≤4 pins.

- #art-foundry
  - Purpose: Visual/UI shares; palette links; asset requests.
  - Lead: Art/UI owners.
  - Posting rules: Thread per asset/topic; include references.
  - Permissions summary: Post = devs/community; Reply = everyone; Threads = encouraged.
  - Pin policy: Pin palette, asset request template, delivery board link; ≤5 pins.

- #sound-forge
  - Purpose: SFX/music shares; manifest IDs; audition polls.
  - Lead: Audio owner.
  - Posting rules: Include manifest ID and short context; emoji polls for picks.
  - Permissions summary: Post = devs/community; Reply = everyone; Threads = encouraged.
  - Pin policy: Pin manifest index + poll key; ≤4 pins.

- #forge-log
  - Purpose: PR links, CI pings, build hashes; read-only firehose.
  - Lead: CI Bot.
  - Posting rules: Automated feed; no replies.
  - Permissions summary: Post = CI Bot; Reply = locked; Threads = off.
  - Pin policy: Pin “Latest build” pointer auto-updated by Brewmaster; ≤1 pin.

- #tavern-door
  - Purpose: Welcome and onboarding; reaction-roles.
  - Lead: Welcome Bot (manual SOP until wired) + Moderators.
  - Posting rules: One welcome thread/day; reactions grant @Playtesters and opt-in interest roles.
  - Permissions summary: Post = Brewmaster/Mods/Bot; Reply = newcomers; Threads = per-day.
  - Pin policy: Pin onboarding map + role legend + welcome DM link; ≤4 pins.

---

## 4) Roles & Mentions

- Roles
  - @Brewmaster (Theta): Runs rituals/templates/digests, triages community, keeps pins clean.
  - @Founders/Core Devs (Alpha–Eta): Daily Roll Call, weekly WIP, triage within SLA, attend Fri sessions.
  - @Moderators: Time-zone coverage, CoC enforcement, thread hygiene, welcome flow nudges.
  - @Playtesters: Opt-in via reaction in #tavern-door; pingable for builds/sessions.
  - @Bots: Welcome Bot, CI Bot, Digest Bot (manual SOP until wiring complete).

- Mention map
  - @here: Rare. Use for Friday live session starting now, critical hotfix notes, or build-breaking changes.
  - Domain mentions: Tag specific owner when a blocker exists or SLA is approaching; otherwise thread-only.
  - Thread-only: Routine feedback, WIP discussion, and non-blocking FYIs stay within threads; no channel-wide pings.

---

## 5) Rituals (exact formats and timing)

- Hearthfire Roll Call — daily at 10:00 PT in #project-orchestration
  - Format: “Focus (1 sentence) | Commit (one concrete deliverable by EOD) | Blockers (if any)”
  - Thread: One thread per day. Owners post by 10:15 PT; late arrivals add under the thread.

- Mine Mood — daily at 10:00 PT
  - Epsilon proposes by 09:50 PT: “Mine Mood: <Name> — <5-word vibe>”
  - Theta posts at 10:00 PT in #project-orchestration and cross-links to #lore-weave for lexicon votes.
  - Default: “Stillshift” if none by 10:05 PT.
  - Maintain a living lexicon with emoji votes; weekly top terms pinned.

- End-of-Day Hearth Digest — by 18:00 PT
  - Brief bullet per domain: commit hit/missed, notable clips/links, blockers escalated.
  - Posted in #project-orchestration (thread) and mirrored to #announcements if community-facing.

---

## 6) Two-Week Content Calendar (day-by-day beats)

Times default to PT. Assets live in shared drive or GitHub links. CTAs are thread-first.

- Week 1
  - Mon
    - Owner: Brewmaster (+ Art/UI owners)
    - Post time: 09:45 pre-pins; 10:00 kickoff in #announcements; Roll Call launch in #project-orchestration
    - Asset ask: Palette link + UI reference board; onboarding map pinned
    - CTA: React in #tavern-door for @Playtesters; post a 1-line intro
  - Tue
    - Owner: Beta (ECS/worldgen) + Brewmaster
    - Post time: 11:00 in #build-in-public
    - Asset ask: 10–30s cave-gen WIP clip + 1 screenshot
    - CTA: Reply 3 words on “mining feel”; tag [worldgen][ui] in follow-ups
  - Wed
    - Owner: Brewmaster (poll) + Epsilon (lore)
    - Post time: 12:00 in #tavern-talk (poll) + #lore-weave (teaser)
    - Asset ask: 1 lore teaser line; poll image optional
    - CTA: Vote on midweek check-in; propose 1 lexicon term in thread
  - Thu
    - Owner: Gamma (combat) or mining-impact owner
    - Post time: 14:00 in #build-in-public
    - Asset ask: 15–45s clip of combat timing or mining impact
    - CTA: Thread: “what felt late/early?” tag [combat] or [tools]
  - Fri (12:30 PT)
    - Owner: Brewmaster
    - Post time: 09:30 create Discord Event; 12:25 reminder @here; 12:30 live in voice
    - Asset ask: Agenda doc; recording note; 2–3 WIP clips from owners
    - CTA: Drop one question in event thread; react if you want speaking slot
  - Sat
    - Owner: Moderators
    - Post time: 10:00 in #tavern-talk
    - Asset ask: Screenshot Saturday prompt image
    - CTA: Share one screenshot; react with ⛏ if it matches the Mine Mood
  - Sun
    - Owner: Moderators
    - Post time: 16:00 in #tavern-talk
    - Asset ask: None
    - CTA: Chill thread: “one win, one wish” for next week

- Week 2
  - Mon
    - Owner: Delta (greybox) + Brewmaster
    - Post time: 10:30 in #playtest-pit
    - Asset ask: Greybox slice link + build hash + checklist
    - CTA: React in thread to get @Playtesters role; sign up for a 20-min slot
  - Tue
    - Owner: Zeta (crafting/systems)
    - Post time: 11:30 in #build-in-public
    - Asset ask: Crafting stub GIF/screenshot + data schema note
    - CTA: Propose 1 recipe; tag [tools][ui] with constraints
  - Wed
    - Owner: Eta (UI/Accessibility) + Moderators
    - Post time: 12:00 in #art-foundry
    - Asset ask: Palette check + UI contrast grid
    - CTA: List one accessibility concern; vote with ✅/🧭 for ready/direction
  - Thu
    - Owner: Audio owner
    - Post time: 13:00 in #sound-forge
    - Asset ask: 3 pickaxe impact timbre options (short WAV/MP3) with manifest IDs
    - CTA: Vote: 🇦/🇧/🇨; add “why” in thread; tag [audio]
  - Fri (12:30 PT)
    - Owner: Brewmaster
    - Post time: 09:30 event; 12:25 @here reminder; 12:30 live
    - Asset ask: Sprint close preview deck; thank-you reel (30–60s)
    - CTA: Share your standout moment; drop 1-line testimonial for reel

---

## 7) Moderation & CoC (concise)

- Respect first. No harassment, slurs, or personal attacks. Keep critique kind and specific.
- No leaks of private builds or internal docs outside approved channels.
- Spoilers go in threads; label WIP clearly.
- Vendor/self-promo belongs in the weekly #tavern-talk promo thread only.
- Enforcement ladder: nudge → move-to-thread → 12–24h timeout → ban. Edge cases escalate to founders.

---

## 8) Feedback Intake & Triage SOP

- Post template (required in #feedback-forge)
  - [Title]
  - [Context] where you saw it; build/hash
  - [Problem] what’s off and why it matters
  - [Suggested Outcome] desired player/dev experience
  - [Rough Priority] low/med/high
  - [Refs] screenshots, clips, links

- Tag taxonomy
  - [combat], [worldgen], [ui], [audio], [lore], [tools], [bugs]

- SLA and workflow
  - Acknowledge: Domain owner replies within 24h on weekdays.
  - Pre-triage: Brewmaster tags/threads within 12h; ensures template completeness.
  - Routing: High-signal items converted to GitHub issues (label: community). Link back to the Discord thread and paste the issue link in the thread header.
  - States: Acknowledged → Need Repro → In Backlog → In Progress → Shipped. Update thread on state changes.

- Conversion criteria
  - Clear problem/outcome
  - Repro steps or concrete example
  - Aligned with sprint scope or explicitly parked

---

## 9) Automation Plan (MVP) + Manual SOP

- MVP now (manual but reliable)
  - Manual posts + pinned templates
  - Google Sheet: feedback log (ID, tags, owner, status, GH link)
  - Discord Scheduled Events for Friday sessions
  - CI Bot already posts to #forge-log; Brewmaster updates “Latest build” pin

- Near-term wiring
  - Welcome Bot reads data/community/welcome-sequence.json
  - Reaction-role for @Playtesters in #tavern-door
  - Weekly digest via simple script (reads roll call thread + #forge-log)

- Daily manual checklists (Theta/Mods)
  - 09:45: Prep Roll Call thread; ping Epsilon for Mine Mood
  - 10:00: Post Mine Mood + Roll Call
  - 12:00/16:00: Feedback triage sweep (#feedback-forge, #bug-reports)
  - 18:00: Compile and post End-of-Day Hearth Digest

---

## 10) Templates (inline quick refs; full versions linked)

- Roll Call (post in daily thread)
  - “Focus: <1 sentence> | Commit: <one EOD deliverable> | Blockers: <if any>”
  - Example: “Focus: polish cave-light falloff | Commit: push LUT variant B with switch | Blockers: CI stuck on macOS runner”

- Digest snippet (per domain)
  - Owner: <name/role>
  - Commit: <what was promised> → Result: <hit/missed + 1-line reason>
  - Links: <PR/clip/build>
  - Blockers: <if any, who’s needed>

- Build-in-public skeleton
  - Title: [WIP] <feature/area> — <one-liner>
  - Clip/Screens: <embed/link>
  - What changed: <3 bullets>
  - What we’re testing for: <2 bullets>
  - CTA: <one prompt> (Please reply in thread)
  - Full template: docs/community/build-in-public-template.md

- Welcome DM bullets
  - “Welcome to The Far Mine!”
  - Where to start: #tavern-door, #tavern-talk
  - How to help: #playtest-pit, #feedback-forge (use template)
  - Stay aligned: #project-orchestration daily thread
  - Opt-in roles: react in #tavern-door for @Playtesters
  - Full sequence: data/community/welcome-sequence.json

---

## 11) Metrics & Review

- Track (daily/weekly)
  - Daily Roll Call participation %
  - Feedback acknowledged <24h (count/ratio)
  - # of WIP posts/week (target ≥2)
  - Newcomer conversion: first post within 48h
  - Sentiment skim: weekly “vibe” tag from moderators (👍/😐/⚠️)

- Weekly 15-min retro (Fri post-session or Mon morning)
  - What landed
  - What felt performative
  - One tweak for next week
  - Owner: Brewmaster; notes pinned in #project-orchestration

---

## 12) Risks & Mitigations

- Risk: Domain owners overloaded
  - Mitigation: Limit asks to one concrete clip/post per week; Brewmaster drafts scaffolds/templates.
- Risk: Automation lag
  - Mitigation: Manual SOP with pinned checklists; volunteer mods cover late hours; keep scripts simple.
- Risk: Ritual fatigue
  - Mitigation: Keep daily posts minimal; rotate spotlight; skip non-essentials on heavy build days.

---

## Appendix A: Emoji Key (vote meanings)

- 👍 Agree/ship direction
- ✅ Looks good — no action needed
- 🧭 Needs direction/tweak
- ⛏ Fits current Mine Mood
- 🧪 Needs testing/repro
- 🐛 Bug spotted
- 🕯 Stillshift (default mood) acknowledgement
- 📌 Request pin (moderator will review)
- 🇦 🇧 🇨 Poll choices (audio/UI/etc.)
- ❗ Urgent (mods/devs review)

Use only one “summary” reaction per user on polls; stack others for nuance if needed.

---

## Appendix B: Tag Dictionary

- [combat]: Timing, hit feedback, damage curves, enemy interactions
- [worldgen]: Cave layout, biome rules, prop density, seeds
- [ui]: HUD, menus, palette, contrast, input legibility
- [audio]: SFX/Music, mix, spatialization, timbre selection
- [lore]: Names, terms, Mine Mood lexicon, narrative beats
- [tools]: Mining/crafting tools, durability, recipes, workbenches
- [bugs]: Crashes, repro steps, erroneous states (pair with build hash)

Tag rules
- Minimum one domain tag; add [bugs] if reporting a defect.
- Include build hash from #forge-log when relevant.

---

## Appendix C: Time Zones (PT baseline)

- PT (Pacific): UTC−8 standard / UTC−7 DST (baseline for times here)
- ET (Eastern): UTC−5 / UTC−4
- UTC: always +0 (use for bots/schedules if needed)
- CET: UTC+1 / UTC+2
- IST (India): UTC+5:30
- AET (Sydney): UTC+10 / UTC+11

When unsure, default to PT and add UTC in parentheses for live events.