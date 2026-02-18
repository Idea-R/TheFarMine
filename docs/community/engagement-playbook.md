# The Far Mine — Community Engagement Playbook (Sprint 1)

Author: Brewmaster Alehart (Theta)  
Version/Date: Draft v0.1 — 2026-02-18  
Status: Draft (Theta review)

Scope: Discord-first community ops for Sprint 1 vertical slice; includes channels/roles, daily/weekly rituals, two-week content calendar, moderation & CoC summary, onboarding flow, SOPs/automation, and lightweight metrics.


## 1) Title & Metadata

- Title: The Far Mine — Community Engagement Playbook (Sprint 1)
- Author: Brewmaster Alehart (Theta), Draft v0.1 — 2026-02-18
- Scope:
  - Discord-first operations for Sprint 1 vertical slice
  - Channels and roles definition
  - Daily/weekly rituals (Hearthfire Roll Call, Mine Mood, beats)
  - Two-week content calendar (dated, actionable)
  - Moderation & CoC summary
  - Onboarding flow
  - SOPs: feedback triage, build-in-public, EOD digest
  - Automation plan and manual backup
  - Lightweight metrics and review cadence


## 2) Channel & Role Plan

Channel map (purpose, owner, posting rules, pins/tags):

- #project-orchestration (Theta-owned)
  - Purpose: The heartbeat. Daily Hearthfire Roll Call + Mine Mood; decisions; short announcements.
  - Owner: @Keeper (Theta)
  - Posting rules:
    - 10:00 PT Hearthfire Roll Call daily (thread-per-day required)
    - Decisions/announcements tagged [decision] or [announce]
    - Keep replies in daily thread; cross-link supporting evidence
  - Pin/Tag conventions:
    - Pins: Roll Call template, Mine Mood lexicon, EOD digest template
    - Tags: [roll-call], [mine-mood], [decision], [announce]
    - Thread names: YYYY‑MM‑DD Hearthfire

- #build-in-public
  - Purpose: Dev clips, PR links, WIP snaps; transparent delivery notes
  - Owner: @Smith (dev) rotating; coordinated by @Keeper
  - Posting rules:
    - Tue/Thu primary posts; open thread for each post; follow template
    - Limit 1 clip per person per week; raw capture acceptable
  - Pin/Tag conventions:
    - Pin: build-in-public template, alt-text guide
    - Tags: [clip], [PR], [WIP], [prompt]
    - Weekly summary thread pinned by Fri EOD

- #tavern-talk
  - Purpose: General chat; vibes, screenshots, introductions; community spotlights
  - Owner: @Bard (content helper)
  - Posting rules:
    - Spoilers use >!spoiler!< syntax
    - No support/bug intake; redirect to #playtest-queue
  - Pin/Tag conventions:
    - Pins: welcome icebreaker, spotlight queue form
    - Tags: [intro], [screenshot], [win], [meme]

- #playtest-queue
  - Purpose: Feedback intake and triage
  - Owner: @Mod + domain leads
  - Posting rules:
    - Start a thread using “Playtest Intake” template
    - SLA: acknowledge within 4 business hours
    - Use tags: [bug], [idea], [tuning], [lore], [ui]
  - Pin/Tag conventions:
    - Pin: Intake template, routing table, SLA banner
    - Status emojis in thread title: 🟡/🟢/🔧/📦/❌

- #lore-and-art
  - Purpose: Epsilon/Eta showcases, palette, lore crumbs
  - Owner: @Smith (Epsilon art), @Smith (Eta narrative)
  - Posting rules:
    - Use [lore] or [art] tag; spoiler cover for late-sprint content
    - Maintain palette and lexicon pins
  - Pin/Tag conventions:
    - Pins: palette board, style guide, lore index
    - Tags: [lore], [art], [process], [palette]

- #patch-notes (read-only)
  - Purpose: Release notes and hotfixes
  - Owner: @Keeper (posts), @Smith (approves)
  - Posting rules:
    - Only @Keeper/@Smith may post; link to build/PR
    - Changelog format with date and build hash
  - Pins: latest stable patch note

- #mod-lodge (private)
  - Purpose: Moderator ops; incident log; rota and checklists
  - Owner: @Mod lead, @Keeper
  - Posting rules:
    - Log all actions with timestamp template
    - Weekly rota pinned; handover notes required
  - Pins: enforcement ladder, incident log template, rota

Roles (color, permissions, etiquette):

- @Guildhand (member)
  - Color: Iron Gray
  - Permissions: Read/post in public channels; upload images; create threads; add reactions
  - Ping etiquette: Tag peers sparingly; no @here/@everyone

- @Prospector (playtester opt-in)
  - Color: Amber
  - Permissions: Same as @Guildhand + access to playtest pings and optional test builds channel (if enabled)
  - Assignment: Self-assign via reaction role on the welcome post (react with ⛏️ to toggle)

- @Smith (dev)
  - Color: Steel Blue
  - Permissions: Post in #patch-notes, manage threads in #build-in-public, use external links, embed
  - Ping etiquette: Prefer thread replies; when needed, @Prospector for targeted test asks

- @Bard (content helper)
  - Color: Plum
  - Permissions: Manage messages in #tavern-talk; pin/unpin; schedule events
  - Ping etiquette: Can @Prospector for spotlights and polls; avoid @everyone

- @Mod (moderator)
  - Color: Verdant
  - Permissions: Timeout/kick/ban; manage messages; view #mod-lodge
  - Ping etiquette: Use @here for safety-only incidents; otherwise DM escalations

- @Keeper (Theta)
  - Color: Gold
  - Permissions: Admin; create channels/roles; post global announcements
  - Ping etiquette: Reserve @everyone for service-impacting notices only


## 3) Rituals & Cadence

Hearthfire Roll Call (daily, 10:00 PT):
- Post location: #project-orchestration (thread-per-day)
- Template (post body):
  - Header: Hearthfire Roll Call — YYYY-MM-DD
  - Prompts:
    - Today I’m tending: …
    - My next pickaxe swing by EOD: …
    - Blocker (if any): …
  - Emoji key for quick standup:
    - ⛏️ working, 🔥 needs eyes, 🧭 decision needed, 💤 parked
- Threading rules:
  - All replies in the daily thread
  - If decision needed, prefix reply with 🧭 and tag [decision]
- EOD digest SOP (Mon–Fri):
  - 16:30–17:00 PT: @Keeper scrapes thread highlights
  - Summarize: decisions, blockers, shipped, pending
  - Post digest in thread and cross-link to #project-orchestration with [digest] tag

Mine Mood (daily flag):
- Process:
  - By 09:50 PT Epsilon proposes the day’s Mine Mood term (from lexicon)
  - @Keeper posts final at 09:55 PT; if none, fallback “Stillshift” auto-post at 10:05 PT
- Lexicon upkeep:
  - Living pin in #project-orchestration; Epsilon updates weekly
- Emoji vote:
  - Community reacts to the Mine Mood message; top 1–2 emojis carried into EOD digest
- Sample one-liners:
  - “Glimmerdeep — quiet gains; polish the shine.”
  - “Stonewhisper — small moves, crisp comms.”
  - “Lanternstride — steady pace, light the path.”
  - Fallback: “Stillshift — hold course; clear the way.”
- Posting format:
  - Mine Mood: TERM — 1‑line intent. Tag: [mine-mood] React to set the day’s vibe.

Weekly beats:
- Friday 12:30 PT “Lunchtime Delve” (15 min)
  - Agenda: 2x 5‑min clips (devs), 3‑min Q&A, 2‑min wrap
  - Roles: Host @Bard; Clips @Smith x2; Chat mod @Mod; Recording @Keeper
  - Streaming/clip SOP:
    - Go live in Stage or stream to #build-in-public thread
    - Record locally; upload 720p MP4; add alt text; post link in thread within 2 hours
- Midweek poll (Wed)
  - Poll flow: Draft by Tue EOD; post Wed 11:30 PT in #tavern-talk with [poll] tag; close Fri 10:00 PT; summarize in Friday Delve
- Sunday roundup (async)
  - By 15:00 PT Sun: @Bard posts highlights (clips, top feedback, Mine Mood emoji chart) + next-week focus


## 4) Two‑Week Content Calendar (Sprint 1)

Sprint 1 dates: D+0 = 2026-02-23 (Mon) to D+13 = 2026-03-08 (Sun). Times PT.

D+0 — Mon 2026-02-23
- 09:55 — #project-orchestration — Mine Mood (Epsilon/@Keeper) — [mine-mood]
- 10:00 — #project-orchestration — Hearthfire Roll Call (Theta) — thread “2026-02-23 Hearthfire”
- 12:00 — #tavern-talk — Welcome wave + icebreaker (Bard)
- 17:00 — #project-orchestration — EOD Digest (Theta) — [digest] (Mon–Fri)

D+1 — Tue 2026-02-24
- 09:55 — #project-orchestration — Mine Mood (Epsilon/@Keeper)
- 10:00 — #project-orchestration — Hearthfire Roll Call (Theta)
- 11:30 — #build-in-public — Primary Post (Smith) — clip [link], PR [link]; open thread; alt text included
- 17:00 — #project-orchestration — EOD Digest (Theta)

D+2 — Wed 2026-02-25
- 09:55 — #project-orchestration — Mine Mood (Epsilon/@Keeper)
- 10:00 — #project-orchestration — Hearthfire Roll Call (Theta)
- 11:30 — #tavern-talk — Midweek Poll (Bard) — [poll] Feature/Biome/QoL
- 16:00 — #lore-and-art — Lore crumb or palette post (Eta/Epsilon) — [lore]/[art]
- 17:00 — #project-orchestration — EOD Digest (Theta)

D+3 — Thu 2026-02-26
- 09:55 — #project-orchestration — Mine Mood
- 10:00 — #project-orchestration — Hearthfire Roll Call
- 11:30 — #build-in-public — Primary Post (Smith) — clip [link], PR [link]
- 15:30 — #playtest-queue — Triage spotlight (Mod) — 3 top 🟡 → 🟢 updates
- 17:00 — #project-orchestration — EOD Digest

D+4 — Fri 2026-02-27
- 09:55 — #project-orchestration — Mine Mood
- 10:00 — #project-orchestration — Hearthfire Roll Call
- 12:30 — #build-in-public (Stage/stream) — Lunchtime Delve (Bard host; Smith clips x2) — recording [link]
- 14:30 — #build-in-public — Weekly summary thread (Keeper) — links [link]
- 17:00 — #project-orchestration — EOD Digest

D+5 — Sat 2026-02-28
- 09:55 — #project-orchestration — Mine Mood
- 10:00 — #tavern-talk — Weekend share: “Show your prettiest vein” (Bard)
- 13:00 — #lore-and-art — Weekend sketch drop (Epsilon/Eta)

D+6 — Sun 2026-03-01
- 10:30 — #tavern-talk — Sunday coffee check-in (light touch) (Bard)
- 15:00 — #project-orchestration — Sunday roundup (Bard) — highlights + next focus

D+7 — Mon 2026-03-02
- 09:55 — #project-orchestration — Mine Mood
- 10:00 — #project-orchestration — Hearthfire Roll Call
- 12:15 — #playtest-queue — SLA reminder + top 🟢 list (Mod)
- 17:00 — #project-orchestration — EOD Digest

D+8 — Tue 2026-03-03
- 09:55 — #project-orchestration — Mine Mood
- 10:00 — #project-orchestration — Hearthfire Roll Call
- 11:30 — #build-in-public — Primary Post (Smith) — clip [link], PR [link]
- 16:00 — #tavern-talk — Community spotlight (Bard) — screenshot/story [link]
- 17:00 — #project-orchestration — EOD Digest

D+9 — Wed 2026-03-04
- 09:55 — #project-orchestration — Mine Mood
- 10:00 — #project-orchestration — Hearthfire Roll Call
- 11:30 — #tavern-talk — Midweek Poll (Bard) — [poll]
- 16:00 — #lore-and-art — Process gif (Epsilon) — [art]
- 17:00 — #project-orchestration — EOD Digest

D+10 — Thu 2026-03-05
- 09:55 — #project-orchestration — Mine Mood
- 10:00 — #project-orchestration — Hearthfire Roll Call
- 11:30 — #build-in-public — Primary Post (Smith) — clip [link], PR [link]
- 15:30 — #playtest-queue — Triage updates (Mod)
- 17:00 — #project-orchestration — EOD Digest

D+11 — Fri 2026-03-06
- 09:55 — #project-orchestration — Mine Mood
- 10:00 — #project-orchestration — Hearthfire Roll Call
- 12:30 — #build-in-public (Stage/stream) — Lunchtime Delve — recording [link]
- 14:30 — #build-in-public — Weekly summary thread (Keeper)
- 17:00 — #project-orchestration — EOD Digest

D+12 — Sat 2026-03-07
- 09:55 — #project-orchestration — Mine Mood
- 11:00 — #tavern-talk — Weekend share: “Your coziest campfire kit” (Bard)

D+13 — Sun 2026-03-08
- 10:30 — #tavern-talk — Sunday coffee check-in (Bard)
- 15:00 — #project-orchestration — Sunday roundup (Bard)


## 5) Moderation & CoC (Concise)

Tone pillars:
- Respectful craft: critique the work, not the person
- Zero harassment: no slurs, hate speech, dogpiles, or brigading
- Constructive critique: clear, actionable, minimal snark, cite repros

Enforcement ladder:
- 1) Warn (public or DM) → 2) Timeout (12–24h) → 3) Kick/Ban
- Log all actions in #mod-lodge using:
  - [UTC ISO] Actor: @ModName
  - Subject: @User
  - Incident: brief summary + link
  - Action: warn/timeout/kick/ban (duration if timeout)
  - Notes: evidence links, screenshots

Sensitive topics:
- No politics, religion, or real-world disputes in gameplay channels
- Spoilers:
  - Use >!spoiler text!< in #tavern-talk, #lore-and-art
- Asset leaks policy:
  - No sharing unannounced builds/assets; takedown on sight; ban for repeated/fraudulent sources

Link to full CoC: [to be expanded — /docs/community/code-of-conduct.md]  
Interim rules block for server pins:
- Be kind. No harassment.
- Keep content PG‑13; spoilers tagged.
- Use #playtest-queue for bugs/ideas with template.
- No leaks or datamining. No trading/selling.
- Mods’ decisions stand; appeal once via DM.


## 6) Onboarding Flow (Overview)

Mirrors data/community/welcome-sequence.json:
- Step 1: Welcome
  - Message: “Welcome to The Far Mine! I’m Brewmaster Alehart. Grab a stool.”
  - CTA: Buttons — “Read Rules” 📜, “Become Prospector” ⛏️, “Say Hello” 🍻
- Step 2: Rules snapshot
  - Short CoC bullets + link; Acknowledge ✅ to proceed
- Step 3: How to contribute
  - Explain #build-in-public, #playtest-queue, #tavern-talk
  - CTA: “See Today’s Roll Call” 🔥 (deep link to daily thread)
- Step 4: Current sprint explainer
  - One paragraph on Sprint 1 vertical slice goals + Friday Delve time
  - CTA: “Add Delve to Calendar” 🗓️
- Step 5: How to give feedback
  - Direct to #playtest-queue; template preview; SLA promise
  - CTA: “Open Feedback Thread” 🧵

Role self-assign:
- Prospector: React ⛏️ on the welcome message to toggle @Prospector
- Fallback: @Mod can assign manually

First-hour engagement tips:
- React to today’s Mine Mood in #project-orchestration
- Introduce yourself in #tavern-talk with 3‑prompt icebreaker:
  - Your favorite tool in a mine
  - One cozy game you love
  - What you’re hoping to find in The Far Mine


## 7) Feedback Triage SOP

Intake formats:
- Start a thread in #playtest-queue titled: “[tag] Short summary — platform/build”
- Include minimum repro:
  - Build/hash, platform, steps, expected vs actual, media link, specs if relevant
- Tags: [bug], [idea], [tuning], [lore], [ui]

SLA:
- Acknowledge within 4 business hours (🟡 → 🟢 or request info)

Routing table (example domains):
- Alpha — Core systems, save/load, simulation (e.g., autosave stalls)
- Beta — Gameplay/mining mechanics, tools, combat (e.g., pickaxe swing timing)
- Gamma — Platform/infra, launcher, auth, perf spikes (e.g., GPU hitch)
- Delta — UX/UI, menus, HUD, input mapping (e.g., slider clipping)
- Epsilon — Art/animation/VFX (e.g., ore shimmer too bright)
- Eta — Narrative/lore/strings (e.g., item description mismatch)
- Zeta — QA/tooling/build pipeline (e.g., broken test harness)
- Theta — Community/comm ops/CoC (e.g., moderation concern)

Status emojis (place at start of thread title):
- 🟡 triage — received/pending route
- 🟢 accepted — validated/queued
- 🔧 in‑progress — under active work
- 📦 shipped — fix in latest build
- ❌ parked — won’t do/not now (explain briefly)

Ops flow:
- Step 1: @Mod acknowledges, applies tag + 🟡, assigns domain mention
- Step 2: Domain lead reviews; sets 🟢 or requests more info
- Step 3: When picked up, switch to 🔧; add link to task/PR
- Step 4: On deployment, set 📦; note build hash
- Step 5: If deferred, set ❌ with reason; close thread politely


## 8) Build‑in‑Public Posting SOP

Cadence:
- Tue/Thu primary posts, 11:30 PT; 1 clip/person/week max

Clip guidance:
- Length: 10–30 seconds
- Format: MP4/web-friendly; 720p+; add 1–2 line alt text describing motion/action
- If public repo: link PR/commit; otherwise summarize change scope

Post template (see docs/community/build-in-public-template.md):
- What shipped:
- What’s next:
- A snag we hit:
- Community prompt:

Threading:
- Create a thread per post; keep follow-ups, questions, and updates in thread
- End-of-week summary on Fri EOD linking all threads


## 9) Automation & Manual Backup

Lightweight automation:
- Use Discord Scheduled Events for:
  - Friday Lunchtime Delve (weekly, 12:30 PT)
- If bot available:
  - Scheduled messages for Mine Mood (09:55) and Roll Call (10:00) with pre-filled snippets
  - Reaction-role for @Prospector on welcome post

Manual SOP (no bot):
- Message snippets (pinned in #project-orchestration):
  - Mine Mood: “Mine Mood: TERM — one-liner. [mine-mood] React below.”
  - Roll Call: “Hearthfire Roll Call — YYYY-MM-DD” + prompts + thread
- Checklist (daily owner: @Keeper, backup @Bard):
  - 09:50 Confirm Mine Mood term with Epsilon
  - 09:55 Post Mine Mood
  - 10:00 Post Roll Call (create thread)
  - 17:00 Post EOD Digest (Mon–Fri)
- Calendar invites:
  - Team Google Calendar entries for daily/weekly beats; 10‑min pre-reminders
- Failover plan (OOO):
  - If owner misses 09:58 ping, backup posts “Stillshift” at 10:05 and proceeds

JSON integration note:
- data/community/welcome-sequence.json is consumed by welcome bot for stepwise onboarding
- Fallback manual DM script:
  - “Welcome to The Far Mine! I’m Brewmaster. Start here: #project-orchestration Roll Call, grab @Prospector ⛏️, say hi in #tavern-talk. Feedback? #playtest-queue template pinned. Glad you’re here!”


## 10) Metrics & Review

Weekly metrics (Mon AM snapshot):
- New members (past 7 days)
- First-message rate (% who post within 48h)
- Roll Call participation (unique posters/day, average)
- Feedback items opened and acknowledged within SLA (count, % on-time)
- Mine Mood emoji votes (avg reactions/post, top emoji)

Google Sheet schema (one-pager):
- Tab: Weekly_Summary
  - week_start (date, Mon)
  - new_members (int)
  - first_msg_rate_pct (float)
  - avg_rollcall_unique (float)
  - feedback_opened (int)
  - feedback_ack_on_time_pct (float)
  - avg_mood_reacts (float)
  - notes (text)
- Collection cadence: Every Mon 09:00 PT by @Keeper; post snapshot chart in #project-orchestration


## 11) Assets & Templates Index

- docs/community/build-in-public-template.md — build-in-public post fields and examples
- data/community/welcome-sequence.json — welcome flow consumed by bot
- Pinned snippets (store in docs/community/snippets.md and pin excerpts):
  - Hearthfire Roll Call:
    - “Hearthfire Roll Call — YYYY-MM-DD
       Today I’m tending: …
       My next pickaxe swing by EOD: …
       Blocker (if any): …”
  - Mine Mood:
    - “Mine Mood: TERM — one-liner intent. [mine-mood]”
  - EOD digest template:
    - “EOD Digest — YYYY-MM-DD
       Shipped: …
       Decisions: …
       Blockers: …
       Tomorrow’s focus: …
       Links: [threads/clips]”
- Patch notes format: docs/community/patch-notes-format.md (optional if needed)


## 12) Risks & Assumptions

- Risk: Dev bandwidth for clips
  - Mitigation: 1 clip/person/week max; allow raw capture; Bard can trim
- Risk: Automation not fully wired
  - Mitigation: Manual SOP with pinned snippets; rota with backup; calendar holds
- Risk: Domain owners miss SLA
  - Mitigation: Daily EOD digest nudges; @Mod escalates to @Keeper after 1 business day; summarize misses in Monday snapshot

Acceptance checklist:
- Two weeks scheduled with concrete dates/times (above)
- Roll Call and Mine Mood formats specified and ready to post
- SOPs are step‑by‑step and executable today
- References to docs/community/build-in-public-template.md and data/community/welcome-sequence.json included

Brewmaster’s closing note:
- Keep the fire lit, keep it kind, keep it moving. Steady Lanternstride, team.