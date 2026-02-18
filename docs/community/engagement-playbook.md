# Community Engagement Playbook — The Claim’s Mouth Tavern (Sprint 1)

Provenance
- Owner: @theta (Community — Brewmaster Alehart)
- Steward: Brewmaster Alehart, keeper of good cheer and tidy threads
- Cross‑references:
  - docs/community/build-in-public-template.md
  - data/community/welcome-sequence.json (pending)
  - docs/visual-systems/ui-framework.md (token-only mention)
  - docs/technology-systems/crafting-design.md
  - docs/combat-systems/combat-design.md
  - docs/world-generation/cave-gen-algorithm.md

---

## 2) Purpose & Principles

Welcome to The Claim’s Mouth, where we mine feedback like ore and raise a mug to every co‑creator. We build in public, honor kindness and craft, and uphold a 48‑hour acknowledgement ethic for feedback. Speak plainly, help your kin, and let’s refine this world together.

Principles
- Accessible: clear language, alt‑text on media, zero gatekeeping.
- Actionable: requests and posts include steps, context, and desired outcomes.
- Respectful: assume good intent; critique the work, not the dwarf.
- Transparent: we share roadmaps, trade‑offs, and known issues openly.
- Time‑bounded: set expectations and stick to SLAs; communicate delays early.

---

## 3) Channel Map (Names, Purpose, Posting Rules)

General rules across channels
- Be kind, be specific, and mind spoilers. Always add alt‑text for images and clips.
- When in doubt, thread your replies. Keep media under 25 MB unless otherwise noted.
- Use tags in square brackets at the front of posts where applicable.

Channel: #announcements
- Purpose: One‑way official updates and release notes; links to threads for discussion.
- Who posts: @dev_master, @theta, designated @ROLE_DEVS with announce perms.
- Allowed content: Releases, hotfixes, milestones, event notices.
- Pin policy: Pin latest major; unpin older when superseded.
- Slowmode: On (60s) to discourage replies; discussion happens in linked threads.
- Cadence: Fridays + ad‑hoc for hotfixes.
- Example snippet:
  - Title: Patch 0.1.3 Hotfix is live
  - Body: Short summary + link to #patch-notes post + thread link for Q&A.

Channel: #tavern-talk
- Purpose: General chat; daily prompts; welcome mugs for newcomers.
- Who posts: Everyone; mods steer tone and prompt cadence.
- Allowed content: Light chat, introductions, non‑spoiler screenshots.
- Pin policy: House rules, current daily prompt, and welcome message.
- Slowmode: Off by default; 10s if >30 msgs in 10 minutes.
- Spoiler etiquette: Use threads with [spoiler] and mark content appropriately.
- Example snippets:
  - Daily Prompt: What’s your favorite mining rhythm this week? Short or long swings?
  - Welcome: Welcome @new! Grab a stool and tell us your favorite biome.

Channel: #build-in-public
- Purpose: Weekly dev threads following template; transparent progress.
- Who posts: @ROLE_DEVS for top posts; community replies in subthreads.
- Allowed content: WIP clips, gifs, bullet updates; link to issues/PRs.
- Pin policy: Pin current weekly top post; unpin previous week Monday.
- Slowmode: Top post channel off; subthreads off unless heated, then 10s.
- Media/alt‑text: Max 4 media per top post; include alt‑text for each.
- Example snippets:
  - Top Post: Sprint 1 — Week N Build in Public (link to template)
  - Thread Reply (dev): Addressing [worldgen] cavern layering—see commit abc123.

Channel: #feedback-mine
- Purpose: Collect structured feature and UX feedback.
- Who posts: Everyone; mods help tag and route.
- Allowed content: Suggestions, pain points, comparisons.
- Pin policy: Feedback form snippet; tagging guide; status legend.
- Slowmode: Off; 15s if volume spikes or dogpiling occurs.
- Tag conventions: [ui], [combat], [worldgen], [audio], [lore], [crafting], [accessibility]
- Example snippet (form):
  - Title: [ui] Tooltip overlap on 1440p
  - Context: Your setup, steps to see, desired change
  - Value: Why it helps
  - Attach: Screenshot with alt‑text

Channel: #bug-reports
- Purpose: Reproducible bug reports for dev tracking.
- Who posts: Everyone; mods ensure format is followed.
- Allowed content: Minimal repro steps, logs, seeds, versions.
- Pin policy: Report format, example, log collection tips.
- Slowmode: Off; 10s if misformatted flood.
- Required fields:
  - Version: e.g., 0.1.3
  - Seed/Map: e.g., 913572
  - Steps to Reproduce: numbered
  - Expected vs Actual:
  - Attachments: logs/clip (with alt‑text summary)
- Example snippet:
  - Title: [worldgen] Stalactites spawn inside player on seed 913572
  - Steps: 1–3 listed; Expected/Actual; Logs attached.

Channel: #playtest-queue
- Purpose: Organize playtest signups and session details.
- Who posts: @theta, @ROLE_MODS; testers reply in threads.
- Allowed content: Signup forms, UTC time slots, expectations.
- Pin policy: Current signup link, calendar, expectations doc.
- Slowmode: Off; 15s during rush.
- Note: No NDA for Sprint 1; screenshots allowed, no datamining tools.
- Example snippet:
  - Playtest Window: Sat/Sun 18:00–20:00 UTC
  - Signup: Link + timezone conversion tip
  - Expectation: Be on latest build; join voice if comfy; file feedback same day.

Channel: #patch-notes
- Purpose: Compact changelogs tied to commits/PRs with emoji legend.
- Who posts: @ROLE_DEVS; @theta may mirror.
- Allowed content: Versioned notes only; each note links to PR/commit.
- Pin policy: Latest patch and legend post pinned.
- Slowmode: On (15s) to keep clean.
- Emoji legend: 🛠️ in‑progress, ✅ shipped, 🧊 parked, 🔬 needs repro
- Example snippet:
  - 0.1.3 — Shipped ✅
  - Added: Pickaxe windup timing adjust (#142)
  - Fixed: Cave collapse sound culling (commit abc123)

Channel: #lore-scribes
- Purpose: Narrative ideas and world flavor; lexicon tokens only.
- Who posts: Everyone; @epsilon curates.
- Allowed content: Short vignettes, item names, location seeds; no future season spoilers.
- Pin policy: Lexicon tokens guide; submission do’s/don’ts.
- Slowmode: Off.
- Example snippet:
  - Token: “Stone‑Whisper” — a miner’s superstition about echoes before a collapse.

Channel: #art-pit
- Purpose: Share screenshots, sprites, mockups; token‑only palette mention.
- Who posts: Everyone; @eta eyes for cohesion.
- Allowed content: 3× scale previews encouraged, PNG/JPEG under 10 MB; alt‑text required.
- Pin policy: Palette tokens, export settings, alt‑text examples.
- Slowmode: Off; 10s during drops.
- Example snippet:
  - [sprite] 3× scale lantern mock — alt: “Warm brass lantern, teardrop glass, soft vignette.”

Channel: #mod-lounge (private, optional)
- Purpose: Escalations, rota handoffs, canned replies and decisions.
- Who posts: @ROLE_MODS, @theta.
- Allowed content: Internal notes, incident logs, shift start/end check‑ins.
- Pin policy: Handoff template, escalation matrix, current rota.
- Slowmode: Off.
- Example snippet:
  - Shift Start (UTC): 17:00 — Watching #feedback-mine. Open acks: 3. Escalation watch: none.

House rules post (pin in #tavern-talk)
- Be kind; be constructive; keep it SFW. Add alt‑text to media. Spoilers in marked threads only. Use tags in #feedback-mine and formats in #bug-reports. 48h acknowledgement ethic in effect.

---

## 4) Rituals & Cadence (Weekly/Monthly)

Build‑in‑Public Weekly — Fridays 17:00 UTC
- Use template: docs/community/build-in-public-template.md
- Reaction kit to add on publish: 👍 🔬 🧭 💎
- Cross‑post steps:
  - Post top message in #build-in-public and pin.
  - Share link in #announcements with one‑line summary.
  - Create discussion thread from the top post; seed first 3 subthreads by domain ([worldgen], [combat], [crafting]).

Midweek “Clip & Peek” — Wednesdays 17:00 UTC
- Mini template:
  - 1 clip (≤20s) or 3 screenshots max
  - 1 focused question
  - Links: related PR/issue
- Targeted prompt: Ask for a single choice or a short sentence response.

Weekly Poll — Mondays
- One focused poll (e.g., “Mining rhythm feel: snappy vs weighty?”)
- Run in #tavern-talk, link results in #build-in-public Friday.
- Close poll Thursday 23:59 UTC; tally and post Friday AM UTC.

Playtest Windows — Sat/Sun 18:00–20:00 UTC
- Signup workflow:
  - Post times and form link in #playtest-queue
  - Confirm build version and branch
  - Assign voice/text channel thread
- Expectations: Be on time, file feedback within 24h, record short clips if possible.
- Feedback form link: pinned in #playtest-queue.

Community Spotlight — 1 per week
- Post in #tavern-talk and cross‑link to #art-pit or #lore-scribes.
- Consent: Ask creator in thread before spotlight; get “✅” reaction consent.

---

## 5) Feedback Intake & Triage (48h Ack SLA)

Acknowledgement SLA
- Acknowledge all feedback within 48h (UTC business days).
- Canned ack examples:
  - Aye, noted! I’ll route this to {owner} and circle back within 48h.
  - Thanks for the vein of insight, friend. Logged and sent to {owner}; we’ll follow up in‑thread.

Tagging scheme
- Prefix tags in #feedback-mine and #bug-reports:
  - [ui], [combat], [worldgen], [crafting], [audio], [lore], [accessibility]

Routing matrix (owner → backup)
- worldgen → @beta (backup @alpha)
- combat → @gamma (backup @alpha)
- crafting/tech → @delta (backup @alpha)
- visual/ui → @eta (backup @alpha)
- audio → @zeta (backup @alpha)
- narrative → @epsilon (backup @theta)
- community/process → @theta

Triage checklist
- Reproduce/clarify: ask for steps, seed, version, or video if missing.
- Label with tags and priority (low/med/high) in the thread.
- Link to issue/PR: drop compact link in the feedback thread top reply.
- Set status: open → queued → in‑progress → shipped → parked.
- Update thread on status changes; mark “Resolved ✅” or “Parked 🧊” with reason.

SLA exceptions policy
- If volume spikes or owner is unavailable:
  - Post a delay notice in the thread: “Heads up: delay on full review until {date UTC} due to {reason}. Your report is safe in the keg.”
  - Batch‑acknowledge items with a grouped summary reply.
  - Escalate to backup after 24h without owner response.

---

## 6) Moderation Guidelines (MVP)

Code of Conduct (short)
- Be kind; no harassment or slurs.
- Keep content SFW; credit original creators.
- Consent before spotlighting or sharing others’ work.
- Respect spoilers and media limits; add alt‑text to all media.

Enforcement ladder
- Gentle nudge: Friendly reminder and link to house rules.
- Formal warning: Note violation and consequence if repeated.
- Timeout: 24h read‑only; explain appeal path.
- Ban: For severe or repeated violations; log in #mod-lounge.
- Examples:
  - Off‑topic spam in #bug-reports → Nudge + move to #tavern-talk.
  - Repeated spoiler drops → Warning + temporary slowmode.
  - Harassment → Immediate timeout or ban depending on severity.

Spoiler policy
- Use [spoiler] in title and thread; use built‑in spoiler tags where available.
- No future season spoilers in #lore-scribes.

Media limits and alt‑text
- Max 4 media per post (unless prompted otherwise); ≤25 MB each.
- Required alt‑text: brief, descriptive; mention motion/intensity for accessibility.

Conflict resolution script
- Aye, I hear your frustration. Let’s keep our boots steady. Here’s what I’m understanding: {summary}. What would a good outcome look like to you? We’ll take it step by step and route it to {owner}.

Defusing heated feedback
- Acknowledge emotion; restate issue; shift to specifics; move to thread or DM if needed; apply slowmode for 10–30s if back‑and‑forth spikes.

---

## 7) Roles & Permissions

Roles
- @ROLE_MODS — moderation, pins, slowmode, thread management.
- @ROLE_DEVS — post in #announcements, start #build-in-public threads, manage #patch-notes.
- @ROLE_PLAYTESTERS — access to #playtest-queue threads and voice.
- @ROLE_NEWCOMERS — standard access; read‑only in #announcements.

Permissions
- Pin: @ROLE_MODS, @theta, designated @ROLE_DEVS.
- Post in #announcements: @dev_master, @theta, approved @ROLE_DEVS.
- Start threads in #build-in-public: @ROLE_DEVS; community replies in subthreads.
- Manage polls: @ROLE_MODS, @theta.

Volunteer mod rota
- Coverage windows: Weekdays 16:00–22:00 UTC; Weekends 16:00–22:00 UTC.
- Expectations: Check pins, clear reports, meet 48h ack ethic, post shift handoff.
- Handoff format: Post in #mod-lounge with UTC start/end, open items, pending acks, escalations.

---

## 8) Ops Checklists

Pre‑post (Fridays for Build‑in‑Public)
- Collect bullets from each domain (worldgen, combat, crafting/tech, visual/ui, audio, narrative).
- Grab 1–3 clips or 3–5 images; compress; add alt‑text.
- Verify media under limits; filenames human‑readable.
- Link to commits/PRs and relevant docs:
  - docs/technology-systems/crafting-design.md
  - docs/combat-systems/combat-design.md
  - docs/world-generation/cave-gen-algorithm.md
  - docs/visual-systems/ui-framework.md (token-only mention)
- Schedule post for 17:00 UTC; draft #announcements summary.

Post‑publish
- Add reaction kit (👍 🔬 🧭 💎).
- Pin top post in #build-in-public; unpin last week.
- Cross‑post link to #announcements with 1‑liner.
- Seed domain subthreads with context and first questions.

End‑of‑week tidy (Sun)
- Mark each subthread item done/carryover.
- Archive decisions and link to associated issues/PRs.
- Summarize highlights in #tavern-talk for Monday poll context.

---

## 9) Canned Responses Library

Ack & Route
- Aye, noted! I’ll route this to {owner} and circle back within 48h.

Need Repro Info
- Thanks for the report! Can you add version, steps to reproduce, and expected vs actual? A short clip helps too.

Need Seed/Version
- To chase this vein proper, we’ll need your build version and world seed. Drop those in and we’ll dig in.

Thanks for Clip
- That clip’s a gem—thanks! Saved to the log and passed to {owner}.

Out‑of‑Scope (Parking)
- Appreciate the idea. It’s outside our current sprint, so I’m parking it 🧊. We’ll revisit after Sprint 1.

Civility Nudge
- Let’s keep our tools sharp and our words kinder. Critique the work, not the dwarf. Thank you.

Spoiler Nudge
- Mind flagging that as a spoiler and moving details into a [spoiler] thread? Cheers.

Media Alt‑Text Reminder
- Quick nudge: please add alt‑text to your image/clip so all miners can see what you see.

Delay Notice
- Heads up: review will be delayed until {date UTC} due to {reason}. Your report’s in the keg; we’ll follow up.

Thread Redirect
- Great topic—let’s continue in this thread to keep the tavern tidy: {thread link}.

Duplicate Merge
- We’ve got a matching vein here: {link}. I’ll merge notes and keep updates in that thread.

---

## 10) Issue/PR Linking Conventions

Compact formats
- PR: repo#123 (short title)
- Issue: repo#456 — one‑liner summary
- Commit: abc1234 — short message
- Branch: feature/{domain}-{short-name} (e.g., feature/worldgen-cavern-layers)

Usage in posts
- “Tracking in repo#142; current state 🛠️.”
- “Fixed in abc1234; status ✅ shipped in 0.1.3.”

Emoji legend for states
- 🛠️ in‑progress
- ✅ shipped
- 🧊 parked
- 🔬 needs repro

---

## 11) Onboarding Hooks & Links

- Welcome sequence: data/community/welcome-sequence.json (pending) — will DM newcomers with orientation and rules.
- Jump links
  - Start here: #tavern-talk (pinned welcome)
  - Feedback: #feedback-mine (form pinned)
  - Bugs: #bug-reports (format pinned)
  - Updates: #announcements and #patch-notes
- Current sprint overview: see #build-in-public pinned post.
- Token‑only policy: For visual/UI system references and palette, use tokens defined in docs/visual-systems/ui-framework.md; do not paste proprietary assets or color codes.

---

## 12) Metrics & Review (Lightweight)

Weekly tally (captured every Monday UTC)
- New members count
- Median time to first message (first‑talk)
- Posts in #feedback-mine
- 48h ack compliance %
- Playtest signups and show‑ups
- Spotlight posts made

Spreadsheet schema (columns)
- week_start_utc
- new_members
- median_first_talk_min
- feedback_posts
- ack_within_48h_pct
- playtest_signups
- playtest_attended
- spotlights
- notes

How to pull Discord insights
- Use Server Insights (if available) for join and engagement; export counts manually weekly.
- Sample manual pull: count new join events, search #feedback-mine by date range, sample acks with keyword “Aye, noted!”.

---

## 13) Escalation & Safety

Urgent path (abuse/spam)
- Immediate actions: delete spam, timeout offender, lock thread if needed.
- Ping: @theta and on‑duty @ROLE_MODS in #mod-lounge with a brief incident note.
- Evidence: screenshot and link; log time in UTC.

Off‑hours fallback
- If no mod responds within 10 minutes, enable server‑wide slowmode (10–30s) in impacted channels and leave a pinned notice.
- DM @theta with “URGENT” prefix.

Criteria for slowmode
- >30 messages in 5 minutes on one topic
- Heated exchanges with 3+ participants ignoring nudge
- Flood of low‑quality posts in #bug-reports or #feedback-mine

---

## 14) Acceptance & Maintenance

Acceptance checklist
- Channels have clear purpose and posting rules.
- Templates and canned replies are linked and ready.
- SLAs defined and visible in pinned posts.
- Routing matrix set with owners and backups.
- Tone matches The Claim’s Mouth: warm, practical, and respectful.

Versioning
- Version: Sprint 1 v1.0
- Propose edits: open a thread in #mod-lounge with [playbook] prefix and summary; upon approval, update this file and note change in #announcements (minor) or #tavern-talk (major).

---

## Appendices

### A) Sample Filled Posts

Build‑in‑Public Top Post (Friday 17:00 UTC)
- Title: Sprint 1 — Week 2 Build in Public
- What’s brewing
  - [worldgen] Layered caverns now respect biome moisture thresholds (repo#142) 🛠️
  - [combat] Pickaxe windup tweaked for weightier feel (abc1234) 🔬 Need impressions
  - [crafting] Smelter UI mock (token‑only colors) in thread; feedback welcome
- Clips (with alt‑text)
  - Clip 1 (15s): alt “Player descends into layered caverns; fog deepens with depth.”
- Ask of the tavern
  - Which mining rhythm feels better: snappy or weighty? Vote in Monday’s poll.
  - Share one line on cavern visibility at torchlight range.
- Links
  - PRs: repo#142, repo#151
  - Docs: docs/world-generation/cave-gen-algorithm.md; docs/visual-systems/ui-framework.md (token-only)

Midweek “Clip & Peek” (Wednesday 17:00 UTC)
- Title: Clip & Peek — Torchlight Falloff Test
- Clip (12s): alt “Torch casts warm cone; stalagmites fade at edge.”
- Question (pick one): Prefer linear or eased falloff at 6–8m? React 👍 for linear, 💡 for eased.
- Link: Commit def5678; feedback thread here.

Weekly Poll (Monday)
- Question: Mining rhythm feel this sprint?
  - Option A: Snappy swings (faster input, less windup)
  - Option B: Weighty swings (longer windup, chunkier impact)
- Close: Thu 23:59 UTC
- Results posted Fri in #build-in-public.

### B) Moderator Handoff Template

Shift Handoff — {date} (UTC)
- On‑duty: {mod_handle}
- Window: {start_utc} → {end_utc}
- Open items (threads/links)
  - {link} — awaiting owner {owner}; ack sent? {yes/no}
- Pending acks (due by when)
  - {link} — due {timestamp_utc}
- Escalations
  - {brief summary} — current status
- Slowmode/locks applied
  - #{channel} — {duration} — reason
- Notes
  - {anything future mod should know}
- Next on‑duty: {mod_handle} at {time_utc}

### C) Channel/Role ID Placeholders (TODO)

- Channel IDs
  - #announcements: TODO_CHANNEL_ANNOUNCEMENTS
  - #tavern-talk: TODO_CHANNEL_TAVERN_TALK
  - #build-in-public: TODO_CHANNEL_BUILD_IN_PUBLIC
  - #feedback-mine: TODO_CHANNEL_FEEDBACK_MINE
  - #bug-reports: TODO_CHANNEL_BUG_REPORTS
  - #playtest-queue: TODO_CHANNEL_PLAYTEST
  - #patch-notes: TODO_CHANNEL_PATCH_NOTES
  - #lore-scribes: TODO_CHANNEL_LORE_SCRIBES
  - #art-pit: TODO_CHANNEL_ART_PIT
  - #mod-lounge: TODO_CHANNEL_MOD_LOUNGE

- Role IDs
  - @ROLE_MODS: TODO_ROLE_MODS
  - @ROLE_DEVS: TODO_ROLE_DEVS
  - @ROLE_PLAYTESTERS: TODO_ROLE_PLAYTESTERS
  - @ROLE_NEWCOMERS: TODO_ROLE_NEWCOMERS

- Owners
  - @theta: TODO_USER_THETA
  - @dev_master: TODO_USER_DEV_MASTER
  - @alpha: TODO_USER_ALPHA
  - @beta: TODO_USER_BETA
  - @gamma: TODO_USER_GAMMA
  - @delta: TODO_USER_DELTA
  - @eta: TODO_USER_ETA
  - @zeta: TODO_USER_ZETA
  - @epsilon: TODO_USER_EPSILON

Raise your mugs, mind your threads, and let’s keep the mine singing.