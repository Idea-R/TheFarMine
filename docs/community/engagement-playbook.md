# The Far Mine — Community Engagement Playbook (Sprint 1 v0.1)

Author: Brewmaster Alehart (Theta)
Version/Date: v0.1 — 2026-02-19 (ISO-8601)
Status: Draft v0.1
Scope: Sprint 1 vertical slice community ops; Discord-first; supports 10:00 PT Hearthfire Roll Call and Mine Mood ritual.

## 1) Goals & Principles

Goals (Sprint 1 P4/P5 targets):
- Welcoming onboarding that gets a first hello within 24h.
- Clear communication channels with single-source-of-truth announcements.
- Feedback capture with triage SLA ≤48h and domain-owner acknowledgment in ≤24h.
- Steady rituals (daily Roll Call + Mine Mood; twice-weekly build-in-public) to set cadence.
- Build-in-public rhythm that shows momentum without oversharing spoilers.

Principles:
- Warm hearth tone: inviting, sturdy, no snark.
- Clarity over clutter: threads > long scrolls; pins summarize; limit cross-posting.
- Token-stable language: no promises of drops/airdrops; avoid speculative phrasing.
- Low-friction participation: templates, reaction roles, light asks.
- Respectful labor portrayal: industrious wonder, implied peril; no graphic harm; align to narrative boundaries.

## 2) Channel Map (purpose & posting rules)

For each channel: purpose • owner role • who posts • frequency • pins • allowed content • notes.

- #announcements
  - Purpose: One-way studio and milestone news; source of truth.
  - Owner: @Guildmaster
  - Who posts: @Guildmaster, delegated @Theta on approval.
  - Frequency: As needed (≤2/week).
  - Pins: All major updates; last 5 kept current.
  - Allowed: Releases, sprint notes, playtest windows, policy updates. No replies (locked); use threads for Q&A when opened.
- #project-orchestration
  - Purpose: Daily rituals and work sync.
  - Owner: @Theta
  - Who posts: @Theta, @Builders; community reacts only.
  - Frequency: Daily: 10:00 PT Hearthfire Roll Call + Mine Mood; EOD digests (Mon–Fri).
  - Pins: Ritual format, current week calendar, triage SLA.
  - Allowed: Roll call posts, Mine Mood, daily blockers/commitments, digests. Keep replies in thread; no off-topic chat.
- #tavern-talk
  - Purpose: General chat and light social.
  - Owner: @Theta/@Bellwethers
  - Who posts: Everyone.
  - Frequency: Ongoing; keep ≤2 concurrent hot threads.
  - Pins: FAQ, welcome map, spoiler-tag guide.
  - Allowed: Off-topic light chat, introductions, tasteful memes. Spoiler tags for deep-lore; no politics/NSFW.
- #build-in-public
  - Purpose: Dev clips/notes; build transparently.
  - Owner: All domain owners (@Builders)
  - Who posts: @Builders primary; community reacts/questions in thread.
  - Frequency: Twice weekly threads (Wed & Fri 12:30 PT) + ad-hoc clips (≤1/day).
  - Pins: Template, emoji checklist key, latest thread index.
  - Allowed: WIP clips, before/after, perf notes. Use weekly thread template; emoji-reaction checklist: ✅ shipped, 🔜 next, 🧪 test, 🪓 polish, 🐛 bug.
- #playtest-signups
  - Purpose: Recruit/notify @Playtesters.
  - Owner: @Theta
  - Who posts: @Theta; @Guildmaster on go/no-go.
  - Frequency: Per build (≤1/week in Sprint 1).
  - Pins: How to opt-in/out; current build notes.
  - Allowed: Signup calls, build instructions, schedules. Mentions: @Playtesters only.
- #ideas-and-feedback
  - Purpose: Feature suggestions and UX ideas.
  - Owner: @Theta
  - Who posts: Everyone using template.
  - Frequency: Ongoing; 1 idea per thread.
  - Pins: Intake template, tags/labels key, SLA.
  - Allowed: Suggestions labeled [idea]/[balance]/[ux]/[lore]. Keep focused; 1–2 images max; link evidence.
- #bug-reports
  - Purpose: Collect reproducible bugs; route to GitHub.
  - Owner: @Theta
  - Who posts: Everyone using repro template.
  - Frequency: Ongoing; 1 bug per thread.
  - Pins: Repro template, supported builds.
  - Allowed: Bugs with logs/clips/version; no feature requests. Theta mirrors confirmed to GitHub; thread linked back.
- #lore-corner
  - Purpose: Narrative snippets and prompts.
  - Owner: @Epsilon
  - Who posts: @Epsilon, @Lorekeepers; community replies in thread.
  - Frequency: 1–2/week.
  - Pins: Lexicon, spoiler guide, tone guardrails.
  - Allowed: Short prose, prompts, name polls. Spoiler tags for late-game lore.
- #art-foundry
  - Purpose: Visual concepts and WIP.
  - Owner: @Eta
  - Who posts: @Eta, @Builders (art), community reacts.
  - Frequency: 1–2/week.
  - Pins: Style bible excerpt, feedback do/don’t.
  - Allowed: Concept sheets, UI comps, renders. Credit sources; no tracing.
- #sound-cavern
  - Purpose: Audio WIP and ambience.
  - Owner: @Zeta
  - Who posts: @Zeta; community reacts.
  - Frequency: 1/week in Sprint 1.
  - Pins: Loudness norms, content notes.
  - Allowed: WIPs, stems, ambience polls. Use spoiler for jump-scarey moments.
- #clips-and-screens
  - Purpose: Community media sharing.
  - Owner: @Theta
  - Who posts: Everyone.
  - Frequency: Ongoing; Spotlight pulled weekly.
  - Pins: Submission tips; Spotlight schedule.
  - Allowed: Screens, GIFs, shorts; must be your capture or credited.
- #mod-lounge (private)
  - Purpose: Moderator coordination and incident log.
  - Owner: @Bellwethers
  - Who posts: Mods, @Theta, @Guildmaster.
  - Frequency: As needed; weekly sync note.
  - Pins: CoC, SOPs, rota, incident log index.
  - Allowed: Reports, decisions, appeals, tooling.
- #welcome
  - Purpose: First touchpoint; auto greeter + FAQ.
  - Owner: @Bots (Mine Canary), backup @Bellwethers
  - Who posts: Bot, @Bellwethers.
  - Frequency: On join; weekly refresh.
  - Pins: Start-here map, role picker, CoC, top links.
  - Allowed: Intros, emoji to claim roles.

Pin conventions:
- Keep ≤5 active pins per channel; archive old pins to a “Pinned Archive” message with links.
- First pin = How-to for the channel. Last pin = Current week index/schedule.

## 3) Roles & Permissions

- @Guildmaster (dev_master) — Color: Gold (#FFD166)
  - Duties: Top-level announcements, approvals, escalation decisions.
  - Mentions: Rare; only for major beats.
- @Builders (dev team) — Color: Forge Orange (#F77F00)
  - Duties: Domain owners Alpha–Eta; post WIP to #build-in-public; acknowledge feedback pings within 24h on own domain.
  - Mentions: Allowed in relevant threads for follow-ups.
- @Theta (Brewmaster) — Color: Hearth Red (#E63946)
  - Duties: Rituals host, calendar, triage routing, EOD digests, moderation support, automation.
  - Mentions: Open for ops questions; queues triage.
- @Bellwethers (Moderators) — Color: Evergreen (#2A9D8F)
  - Duties: Onboarding, CoC enforcement, off-hours watch, incident logging.
  - Mentions: For safety/mod help; off-hours rota noted in #mod-lounge.
- @Delvers (Community) — Color: Iron Gray (#6C757D)
  - Duties: Participate, react, report issues, follow templates.
  - Mentions: Not to ping @Guildmaster; use threads.
- @Playtesters (opt-in) — Color: Canary Yellow (#FFCC00)
  - Duties: Receive build pings, provide structured feedback.
  - Mentions: Only in #playtest-signups/build notices.
- @Lorekeepers (optional subgroup) — Color: Amethyst (#9B5DE5)
  - Duties: Narrative-crafters collaborating with @Epsilon.
  - Mentions: In #lore-corner only.
- @Bots — Color: Steel Blue (#4A90E2)
  - Duties: Welcome, reminders, reaction roles, scheduled posts.

Permissions:
- @everyone: Read most channels; post in social/feedback/bugs; no posting in #announcements.
- Mentions policy: Use role pings sparingly; @Playtesters only for builds; never @everyone outside #welcome onboarding notices.
- Thread etiquette: Start a thread for topics >3 messages; reply-in-thread to keep main channel clean; use descriptive thread titles; mark [RESOLVED] when closed.

## 4) Rituals & Cadence

- Hearthfire Roll Call (Daily, 10:00 PT)
  - Format: “Focus | Commit | Blockers”.
  - Flow: One thread per day in #project-orchestration; @Theta posts prompt; @Builders reply by 10:10 PT.
  - EOD Digest: 17:00 PT (Mon–Fri) summary with highlights, shipped items, blockers, and asks for community help.
- Mine Mood (Daily, 10:00 PT)
  - Prep: @Epsilon proposes by 09:50 PT.
  - Post: @Theta at 10:00 PT as “Mine Mood: <Name> — <5-word vibe>”.
  - Default: mood.stillshift if none received.
  - Voting: Emoji reactions encouraged; lexicon maintained in #lore-corner pin.
- Build-in-Public Updates
  - Schedule: Wed & Fri 12:30 PT in #build-in-public.
  - Template: What shipped | What’s next | Clip/GIF | Community spotlight. Link: docs/community/build-in-public-template.md
- Weekly Poll (Mon)
  - Light, actionable question; roadmapping signal; posted in #tavern-talk with 48h runtime.
- Feedback Friday (Fri EOD)
  - Curated thread in #ideas-and-feedback with top suggestions, decisions/next steps, and links to GitHub issues where applicable.

## 5) Moderation & CoC

Core rules:
- Be respectful; no slurs; no harassment; credit creators.
- No graphic content or NSFW.
- Spoilers tagged; use channel-appropriate content.
- Constructive critique: specific, kind, and actionable.

Content boundaries (narrative-aligned):
- Industrial peril implied, not graphic.
- Wonder over horror; no depictions of graphic injury.

Enforcement ladder:
- Nudge → Formal warning (logged) → Mute (24–72h) → Kick/Ban.
- Appeals: Open a mod ticket; reviewed in #mod-lounge; response within 72h.

Safety tools:
- Slowmode triggers on spikes; split heated threads; enforce spoiler tags; mod escalation rota visible in #mod-lounge; incident SOP pinned.

## 6) Feedback Intake & Triage SOP

Templates:
- Feature Request fields:
  - Title, Summary (2–3 lines), Problem it solves, Player impact, Rough flow, References/Clips.
- Bug Report fields:
  - Title, Build/Date, Steps to Repro, Expected, Actual, System (OS/GPU), Logs/Clips.

Routing:
- @Theta logs all valid items to shared triage sheet and links back.
- Domain owner acknowledgment ≤24h (emoji + short note).
- Triage classification ≤48h: [idea], [balance], [ux], [bug], [lore].
- Outcome posted back to thread: Accepted | In Review | Parked | Not Planned; include rationale.

Label use:
- Prefix thread titles with tag in square brackets.
- Add build number/date for traceability.

## 7) Two-Week Content Calendar (Sprint 1)

Daily beats (all times PT):
- Daily: 09:50 Epsilon mood proposal (private). 10:00 Mine Mood + Roll Call (#project-orchestration). 17:00 EOD digest (Mon–Fri).
- Mon: Weekly poll + Welcome spotlight.
- Tue: Clip from Beta/Gamma + feedback prompt.
- Wed: Build-in-public thread 12:30 + midweek Q&A.
- Thu: Lore nibble (Epsilon) or UI peek (Eta) alternating.
- Fri: Build-in-public thread 12:30 + Feedback Friday digest EOD.
- Weekend: Light prompt; low-touch moderation.

Week 1:
- Mon
  - 10:00 “Mine Mood: Emberfall — measured, steady heat”
  - 10:00 “Roll Call W1-Mon | Focus | Commit | Blockers”
  - 11:30 “Weekly Poll W1: Next tool to refine?” (#tavern-talk)
  - 14:00 “Welcome Spotlight W1: Say hello to <@user>” (#welcome)
  - 17:00 “EOD Digest W1-Mon — Highlights & Blockers” (#project-orchestration)
- Tue
  - 10:00 Mood/Roll Call as above
  - 12:00 “Dev Clip W1: Beta/Gamma — pathfinding corner cases” (#build-in-public, thread)
  - 15:00 “Feedback Prompt: Pathfinding feel — 1 thing to tweak?” (#ideas-and-feedback)
  - 17:00 EOD Digest
- Wed
  - 10:00 Mood/Roll Call
  - 12:30 “Build-in-Public W1-Wed — What shipped | What’s next | Clip/GIF | Spotlight” (#build-in-public)
  - 15:30 “Midweek Q&A Thread W1 — Ask the Builders” (#tavern-talk)
  - 17:00 EOD Digest
- Thu
  - 10:00 Mood/Roll Call
  - 13:00 “Lore Nibble W1: The Lantern Ledger (150 words)” (#lore-corner)
  - 17:00 EOD Digest
- Fri
  - 10:00 Mood/Roll Call
  - 12:30 “Build-in-Public W1-Fri — Week wrap + GIF” (#build-in-public)
  - 16:45 “Feedback Friday W1 — Top 5 + decisions” (#ideas-and-feedback)
  - 17:00 EOD Digest
- Sat
  - 10:30 “Weekend Prompt W1: Share your coziest cavern screenshot” (#clips-and-screens)
- Sun
  - 11:00 “Light Prompt W1: Favorite dwarven phrase?” (#tavern-talk)

Week 2:
- Mon
  - 10:00 Mood/Roll Call
  - 11:30 “Weekly Poll W2: Which ambience to polish next?” (#tavern-talk)
  - 14:00 “Welcome Spotlight W2: Wave to our new Delvers” (#welcome)
  - 17:00 EOD Digest
- Tue
  - 10:00 Mood/Roll Call
  - 12:00 “Dev Clip W2: Beta/Gamma — mining loop feel” (#build-in-public)
  - 15:00 “Feedback Prompt: Mining feel — tap/click cadence” (#ideas-and-feedback)
  - 17:00 EOD Digest
- Wed
  - 10:00 Mood/Roll Call
  - 12:30 “Build-in-Public W2-Wed — What shipped | What’s next | Clip/GIF | Spotlight” (#build-in-public)
  - 15:30 “Midweek Q&A Thread W2 — Systems focus” (#tavern-talk)
  - 17:00 EOD Digest
- Thu
  - 10:00 Mood/Roll Call
  - 13:00 “UI Peek W2: HUD readability (Eta)” (#art-foundry)
  - 17:00 EOD Digest
- Fri
  - 10:00 Mood/Roll Call
  - 12:30 “Build-in-Public W2-Fri — Sprint 1 wrap notes” (#build-in-public)
  - 16:45 “Feedback Friday W2 — Decisions + next steps” (#ideas-and-feedback)
  - 17:00 EOD Digest
- Sat
  - 10:30 “Weekend Prompt W2: Short clip of your favorite tunnel angle” (#clips-and-screens)
- Sun
  - 11:00 “Light Prompt W2: One word for the Mine Mood lexicon” (#lore-corner)

## 8) Onboarding & Automation Plan (Lightweight)

Reference files:
- Welcome sequence: data/community/welcome-sequence.json (5-step DM/Welcome flow).
- Build-in-public template: docs/community/build-in-public-template.md

If bot unavailable (Manual SOP):
- On join (within 15m): @Bellwethers DM “Welcome to The Far Mine! Start here: #welcome. Grab roles, read CoC, say hi in #tavern-talk.”
- Role selection: @Bellwethers offers @Playtesters opt-in via message with reaction ✅; manually assign.
- First 24h: @Theta posts a “Welcome Spotlight” mention in #welcome with two starter links.
- Scheduled posts: @Theta uses calendar reminders to post rituals at 10:00 PT and digests at 17:00 PT.
- Message templates:
  - Roll Call prompt: “Hearthfire Roll Call W#-D#: Focus | Commit | Blockers.”
  - Mine Mood: “Mine Mood: <Name> — <5-word vibe>.”
  - Digest: “EOD Digest W#-D#: Shipped | In-progress | Blockers | Asks.”

Automation wishlist:
- Scheduled messages (rituals, digests).
- Reaction roles for @Playtesters, @Lorekeepers.
- Slash commands: /mood <name> <vibe>, /rollcall start, /digest post, /triage <link> <label>.
- GitHub issue mirroring for #bug-reports with thread backlink.

## 9) Metrics & Review

Track weekly:
- New joins; first-message rate (% who post within 24h).
- Roll call participation % (Builders + opted team).
- Reaction count on build-in-public posts (median/mean).
- Feedback items triaged ≤48h; average acknowledgment time.
- Weekly active members (Discord insights).
- Playtest signup conversion (% of @Playtesters who test).

15-min Weekly review (Mon 09:30 PT):
- Check metrics vs targets; flag regressions.
- Review top 5 feedback threads; confirm outcomes posted.
- Pin hygiene audit (≤5 pins).
- Calendar adjust: add/remove beats to keep ≤2–3 key posts/day.
- Risks/blocks noted; assign owners; update #project-orchestration pin.

## 10) Risks & Assumptions

Risks:
- Automation delay stalls rituals.
- Domain-owner triage lag >48h.
- Content overload (too many posts).

Mitigations:
- Manual SOP ready; @Bellwethers backup posts.
- Triage rota by domain; @Theta nudges at 20h mark.
- Hard cap: ≤3 key beats/day; consolidate into digests.

Assumptions:
- 1080p desktop focus for shared assets.
- Daily availability at 10:00 PT for roll call/mood posts.
- Sprint 1 audience size fits lightweight moderation.

## 11) Acceptance Checklist (Sprint 1)

- Channel/role map present with owners, purposes, rules, pins.
- Daily rituals (Hearthfire Roll Call, Mine Mood) defined at 10:00 PT; EOD digests set.
- Two-week content calendar scheduled with times and titles.
- Moderation & CoC included with enforcement ladder and safety tools.
- Feedback intake templates, triage SLA, routing to GitHub defined.
- Onboarding/automation plan provided with manual SOP and wishlist.
- Links to build-in-public template and welcome sequence included.

— Brewmaster Alehart (Theta), tending the hearth and the heartbeat.