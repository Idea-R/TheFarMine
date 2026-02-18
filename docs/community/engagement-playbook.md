# Community Engagement Playbook — Claim’s Mouth, Our Tavern (Sprint 1)

## 1) Title & Provenance
- Owner: @theta (Community — Brewmaster Alehart)
- Scope: Sprint 1 operational playbook for moderators and devs running Claim’s Mouth tavern
- Cross-references:
  - docs/community/build-in-public-template.md
  - data/community/welcome-sequence.json
  - docs/visual-systems/ui-framework.md
  - docs/technology-systems/crafting-design.md
  - docs/combat-systems/combat-design.md

## 2) Purpose & Principles
Purpose
- This tavern exists to welcome miners, smiths, and wayfarers into The Far Mine’s forge of ideas—where we share work-in-progress, gather respectful feedback, and shape a sturdier game together.

Principles
1) Warm Welcome Always
   - Greet newcomers; show them the hearth and where the mugs are kept.
2) Alt-text Always
   - Every image/clip must include alt-text. If they forget, nudge politely and add it.
3) Build-in-Public Cadence
   - Ship small, weekly. Show the rough edges. Invite reactions.
4) Respectful Dwarven Discourse
   - Debate ideas, not folks. Be stout, not sour. No slurs, no harassment.
5) Actionable Feedback
   - Tags, seeds, clips, and clear steps. We turn good notes into better builds.

## 3) Channel Map (Purpose, Posting Rules, Pacing)

### {{channel.announcements}}
- Purpose: One-way ship notes and key wayfinding; the notice board by the door.
- Who posts: @dev, @mod only.
- Allowed content: Release notes, schedule notices, major decisions, links to threads.
- Cadence: 1–3 posts/week; pin the latest sprint/major.
- Quick rules:
  - No replies (lock or redirect to threads).
  - Link out to {{channel.build_in_public}}, {{channel.patch_notes}}, or applicable threads.
- Pin policy: Keep 2–3 pins max: current sprint, latest patch, welcome orientation.
- Copy-ready pin:
  - “Welcome to Claim’s Mouth! Start in {{channel.welcome}}, join the weekly build thread in {{channel.build_in_public}}, and bring feedback (with tags) to {{channel.feedback_mine}}. All times UTC.”

### {{channel.build_in_public}}
- Purpose: Weekly hub thread to share WIP; gather reactions and threaded Q&A.
- Who posts: @dev primary; @mod facilitates; @everyone replies in threads.
- Allowed content: WIP clips, screenshots, short devlogs, polls linked to the thread.
- Cadence: New thread every Friday 17:00 UTC (see Section 4).
- Quick rules:
  - One parent thread per week. Mods pin the week’s thread; unpin last week.
  - All images/clips require alt-text in the parent post or within thread reply.
  - Reactions: use the reaction kit to keep signal clean.
- Reaction kit:
  - 👍 agree, 🧠 insightful, 🪓 want/need, 🐞 bug-spotted, 🧪 try-this, ❓ clarify
- Link to template: docs/community/build-in-public-template.md
- Copy-ready thread opener (post each Friday):
  - “Week [ISO date range]: At the anvil now—see notes below. Drop thoughts in replies, tag domain if deep-dive. Reactions guide above. Alt-text always. Cross-refs in {{channel.announcements}}.”

### {{channel.tavern_talk}}
- Purpose: General chat, light debate, and community camaraderie.
- Who posts: @everyone; @mod steers tone.
- Allowed content: On-topic game chat, light off-topic (max 10% of scroll), intros.
- Cadence: Ongoing; encourage daily sparks.
- Quick rules:
  - Keep off-topic in short bursts; move deep tangents to threads or DMs.
  - Alt-text for every image/clip. No NSFW. Be kind.
- Copy-ready room toast:
  - “Mugs up! Share what you mined today. One ask: alt-text on images and clips so all dwarves can see.”

### {{channel.feedback_mine}}
- Purpose: Structured player feedback using domain tags for fast routing.
- Who posts: @everyone; @mod triages.
- Allowed content: Tagged feedback with clip/seed/version and steps.
- Cadence: Ongoing; moderators sweep twice daily.
- Quick rules:
  - Start posts with tags: [ui], [combat], [worldgen], [crafting], [audio], [lore]
  - Include: seed, version/hash, repro steps, and 10–20s clip if visual.
- Copy-paste feedback template:
  ```
  [worldgen] Short title — what changed or surprised you?
  Version/hash: v0.## (commit #######)
  Seed/Map: 123456 | Biome: Basalt Depths
  Steps: 1) ... 2) ... 3) ...
  Expected vs Actual: ...
  Clip (10–20s) + Alt-text: link | “Describe what’s visible/heard”
  Notes: Any context (hardware, controls, mods disabled)
  ```

### {{channel.bug_reports}}
- Purpose: Report reproducible defects; speed triage and routing.
- Who posts: @everyone; @mod confirms and routes.
- Allowed content: Bugs following schema below only.
- Cadence: Ongoing; daily triage pass at 10:00 and 18:00 UTC.
- Quick rules:
  - One bug per post. Include clip and repro steps.
  - Use emoji pipeline (see Section 6).
- Bug schema (copy-paste):
  ```
  Title: [BUG] concise summary
  Version/hash: v0.## (commit #######)
  Seed/Map: ###### | Biome: ______
  Repro Steps: 1) ... 2) ... 3) ...
  Expected: ...
  Actual: ...
  Clip (10–20s) + Alt-text: link | “Describe the issue shown”
  System/Browser: OS, CPU/GPU (or browser + version)
  Logs (if available): link
  ```
- Triage reactions:
  - 👀 seen, 🧭 routed, 🧪 needs repro, ✅ accepted, 🧱 not in scope

### {{channel.playtest_queue}}
- Purpose: Organize playtest signups and confirmations.
- Who posts: @everyone signs up; @mod coordinates.
- Allowed content: Signup reactions, windows, confirmations.
- Cadence: Windows Sat/Sun 18:00–20:00 UTC; call opens Wed.
- Quick rules:
  - Post a session card. Players react ✅ to claim a slot. First-come-first-served.
  - Mods DM confirmations 24h prior with build/version and voice/text channel info.
- Copy-ready session card:
  ```
  Playtest Window — Sat/Sun 18:00–20:00 UTC
  Build: v0.## (commit #######)
  Focus: [combat] parry frames | [worldgen] choke points
  Slots: 8
  How to join: React ✅ and ensure DMs open. We’ll confirm with a DM + checklist.
  ```

### {{channel.showcase}}
- Purpose: Community art, builds, and clips worthy of a proud mantle.
- Who posts: @everyone; @mod curates for spotlight.
- Allowed content: Original works only. Include alt-text.
- Cadence: Ongoing; 1 spotlight/week (see Section 4).
- Quick rules:
  - Include a consent line for rehost: “I consent to rehost on socials/site.”
  - Credit the maker; no third-party rip/ports.
- Copy-ready prompt:
  - “Share your proudest forge-fire! Add alt-text, and say if we can feature it in the community spotlight.”

### {{channel.patch_notes}}
- Purpose: Sprint and micro patch rollups; canonical changelog.
- Who posts: @dev primary; @mod assists.
- Allowed content: Detailed patch notes with links back to {{channel.announcements}} and relevant threads.
- Cadence: On every patch; sprint wrap weekly if needed.
- Quick rules:
  - One post per patch; index by ISO date and version/hash.
  - Link to docs: ui framework, crafting design, combat design when relevant.

### {{channel.rules}}
- Purpose: Short, clear code of conduct; enforcement link.
- Who posts: @mod only.
- Allowed content: Code of Conduct and link to moderation policy.
- Cadence: Static; update on policy changes.
- Quick rules:
  - Keep concise; pin; redirect disputes to {{channel.mod_lounge}} via DM.

### {{channel.welcome}}
- Purpose: Entry point for the welcome bot; orientation board.
- Who posts: Bot and @mod; no public chat.
- Allowed content: 5-message sequence, orientation links, role instructions.
- Cadence: Auto per-join; refreshed quarterly.

### {{channel.mod_lounge}}
- Purpose: Private mod room; escalations, decision logs, rota.
- Who posts: @mod, @dev (as invited).
- Allowed content: Incident notes, consensus records, schedule, tooling.
- Cadence: Daily check-in; incident-driven.
- Quick rules:
  - Document actions; use timestamps (UTC) and links to source messages.
  - Keep secure; no screenshots shared outside without consent.

## 4) Weekly Rituals & Cadence (UTC)
- Fridays 17:00 UTC — Build-in-Public Weekly Thread
  - Owner: @theta; backup: @mod.backup
  - Actions:
    - Post new thread in {{channel.build_in_public}} (template linked in docs/community/build-in-public-template.md)
    - Pin new, unpin last; cross-link in {{channel.announcements}} with a one-line summary.
- Sat/Sun 18:00–20:00 UTC — Playtest Windows
  - Signups in {{channel.playtest_queue}}; ✅ reactions; DM confirmations 24h prior.
  - After session: post recap thread under the week’s build-in-public.
- Midweek Poll — Wed 18:00 UTC
  - One focused question; post in {{channel.tavern_talk}} or {{channel.announcements}} with a thread; 48h duration; summarize outcome Friday.
- Community Spotlight — 1 item/week
  - Feature in the weekly build-in-public thread; credit creator; confirm consent.

## 5) Moderation Guidelines (MVP)
Tone
- Dwarven-warm and steady-handed. Pour generously, but keep the floor dry and safe.

Code of Conduct (short)
- Be kind. Critique ideas, not people.
- No slurs, harassment, or dogpiles.
- Use spoiler tags as needed; label threads [SPOILER] in titles.
- Alt-text for all images/clips. No NSFW.

Intervention Ladder
1) Nudge (light public or DM)
   - Use when: missed alt-text, gentle off-topic drift, mild sarcasm toward a person.
   - Copy: “Hey friend—mind adding alt-text/moving this to thread? Thanks!”
2) Warn (DM + optional public thread note)
   - Use when: repeated behavior after nudge, heated tone, rule brushes.
   - Copy: “We need to keep the tavern safe and focused. Please follow X rule. Next step is timeout.”
3) Timeout (24h)
   - Use when: insults, veiled slurs, derailment after warn, spoiler blasts.
   - Log in {{channel.mod_lounge}} with links, UTC time, and rule cited.
4) Ban (consensus in {{channel.mod_lounge}})
   - Use when: harassment, slurs, hate, spam raids, doxxing, or repeated timeouts.
   - Require: two-mod agreement; document reasoning and evidence.

Content Boundaries
- No NSFW. No leaks of third-party or partner assets. Keep datamined spoilers behind [SPOILER] and in marked threads. Remove and warn as needed.

## 6) Feedback Intake & Triage Flow
Emoji Pipeline (apply in {{channel.feedback_mine}} and {{channel.bug_reports}})
- 👀 seen (mod acknowledged)
- 🧭 routed (assigned to domain owner)
- 🧪 needs repro (ask for steps/clip/logs)
- ✅ accepted (goes to backlog/issue)
- 🧱 not in scope (kind explanation + link to roadmap/why)

Routing Matrix
- [worldgen] → @beta
- [combat] → @gamma
- [crafting] → @delta
- [audio] → @zeta
- [visual/ui] → @eta
- [lore] → @epsilon
- Community ops owner: @theta (oversees flow)

SLA Targets (MVP)
- Acknowledge (👀) within 24h UTC
- Route (🧭) within 48h UTC
- Close loop within 5 days with decision or mark [backlog]

Triage Checklist
- Tags present (domain)
- Version/hash included
- Seed/map + repro steps included
- 10–20s clip + alt-text (if visual/audio)
- System/browser noted (for bugs)
- Kind follow-up if missing info

## 7) Engagement Tactics (Templates & Prompts)
Pointers
- Use docs/community/build-in-public-template.md for weekly openers and structure.
- Pair each dev clip with one focused question and a reaction ask (from the kit).

Copy-ready thread sparks (one-liners)
1) “Worldgen Room Fits — did the three-tile doors behave for you?”
2) “Combat Timing — are parry windows readable at torchlight speed?”
3) “Crafting UI — which step felt murky: selecting alloy or assigning fuel?”
4) “Audio Peaks — which sound is too brassy in caves: pickaxe, footsteps, or UI pings?”
5) “Lore Threads — did the miner’s journal hint too loudly or just right?”
6) “UI Contrast — can you parse focus state on dim monitors? What fails first?”

Alt-text reminder snippet
- “Alt-text helps every dwarf at the table. Add 1–2 lines describing key motion, text, and contrast. Example: ‘Top-down room; three-tile stone door; goblin enters; parry spark at frame 12; UI prompt flickers.’”

Lightweight poll template
```
Midweek Poll — Focus: [topic]
Options: A) ... B) ... C) ...
Closes: [ISO date] 18:00 UTC
Thread replies: share why you chose your pick.
```

## 8) Onboarding & Welcome Flow
How the JSON is used
- data/community/welcome-sequence.json defines the 5-message welcome sequence (copy, links, delays). The welcome bot reads the JSON on member join and posts to {{channel.welcome}} and/or DM based on config flags.

Steps
1) Upon join → DM or {{channel.welcome}} sequence (5 messages; see JSON)
   - Includes: house rules, channel map, alt-text primer, role info, current week’s thread.
2) Auto-post public welcome ping
   - Message in {{channel.announcements}} or {{channel.tavern_talk}}:
     - “Welcome, @newcomer! Say hi in {{channel.tavern_talk}}, grab roles (if available), and peek at this week’s forge: {{channel.build_in_public}}.”
3) Starter quests (first week)
   - “Post one tagged feedback item in {{channel.feedback_mine}} with a short clip this week.”
   - “React ✅ in {{channel.playtest_queue}} to join a playtest window.”

## 9) Roles & Permissions (MVP)
Roles
- @dev — core team; post in announcements/patch; create official threads.
- @mod — moderation; manage threads, pins, slowmode; run triage and playtests.
- @community — helpers; greet, nudge alt-text, compile spotlights (no punitive powers).
- @everyone — members; post in general, feedback, bugs, showcase.

Posting Powers
- {{channel.announcements}}: locked to @dev/@mod
- {{channel.patch_notes}}: @dev primary (assist @mod)
- {{channel.feedback_mine}} / {{channel.bug_reports}} / {{channel.tavern_talk}} / {{channel.showcase}}: open to @everyone
- Thread management: @mod

Backup Rota (weekend coverage for @theta)
- Primary backup: @mod.backup
- Secondary backup: @mod.sentinel

## 10) Metrics & Review
Weekly taps (pull by Monday 12:00 UTC)
- New members (weekly)
- 24h welcome completion rate (reached message 5 / total joined)
- Number of feedback items tagged (by domain)
- Triage SLA hit rate (24h/48h/5-day)
- Playtest signups (✅) and show rate
- Thread reactions and replies (weekly build thread)

Tooling
- Discord Insights (member growth, messages, engagement)
- Manual tally sheet (Google Sheet)
  - Columns: Date (ISO), New Members, Welcome Complete %, Feedback Count, SLA Hit %, Playtest ✅, Show %, Build Thread Reactions, Build Thread Replies, Notes/Top 3

Monday 17:00 UTC Standup (10 min)
- Review metrics
- Decide Top 3 actions (assign owner, due ISO date)
- Log decisions in {{channel.mod_lounge}}

## 11) Bot & Automation Notes (MVP wiring)
Placeholders (to be replaced with actual IDs)
- {{id.channel.announcements}}
- {{id.channel.build_in_public}}
- {{id.channel.tavern_talk}}
- {{id.channel.feedback_mine}}
- {{id.channel.bug_reports}}
- {{id.channel.playtest_queue}}
- {{id.channel.showcase}}
- {{id.channel.patch_notes}}
- {{id.channel.rules}}
- {{id.channel.welcome}}
- {{id.channel.mod_lounge}}

Events (MVP)
- Welcome bot
  - On member join: post 5-message sequence (from JSON); add 👋 reaction to message 1 upon completion.
- Reaction roles (if used)
  - Stub only; document mapping in a separate config later.
- Thread auto-pinner
  - Manual in MVP: @mod pins new weekly build thread; unpins prior.

Logging
- Summarize moderation actions daily in {{channel.mod_lounge}}:
  - Format: [ISO date] [Action] [User] [Channel/Link] [Rule] [Owner] [Notes]

## 12) Voice, Style, and Accessibility
Brewmaster tone examples
- Intro: “Welcome to Claim’s Mouth—warm stone, bright fire. Pull a stool and show us what you’re hammering.”
- Nudge: “Friend, your craft shines—add alt-text so every dwarf can admire the grain.”
- Outro: “That’s the pour for this week. Keep your edges sharp and your tempers cooler.”

Alt-text best practices (pixel art clips)
- Describe key motion, UI states, and timing cues (frames/seconds).
- Note contrast and readability (e.g., “dark basalt floor; pale UI tooltip flickers”).
- Keep it 1–2 lines; include sound cues if meaningful.

Accessibility reminders
- Use sufficient color contrast in images (aim WCAG AA).
- Timezones always UTC; dates as ISO (YYYY-MM-DD).
- Avoid flashing imagery; warn if >3 flashes/second.

## 13) Escalation & Crisis Handling
Spam/Raids (immediate steps)
- Enable slow mode (30–120s) in active channels.
- Lock {{channel.announcements}} and {{channel.welcome}} to @dev/@mod only.
- Toggle temporary member screening (if available).
- Ping @mod and coordinate in {{channel.mod_lounge}}.
- Remove spam, ban obvious bots, and document actions.

Harassment Reports
- Move to DM with reporter; acknowledge and thank them.
- Collect links, screenshots, and timestamps (UTC).
- Discuss with a second mod in {{channel.mod_lounge}}; decide per ladder.
- Act within the guideline ladder; inform both parties as appropriate.
- Record outcome with evidence and rationale.

## 14) Acceptance Checklist
- Strategy actionable (weekly cadence, channel rules, and templates present)
- Roles and permissions clear (owners, backups, posting powers)
- Channel purposes and pacing defined, with pin/thread policies
- Triage flow defined with emoji pipeline, routing, and SLA targets
- Onboarding flow references data/community/welcome-sequence.json
- Accessibility reminders included (alt-text, contrast, UTC, ISO dates)
- Moderator quick references included (copy-ready pins, templates, prompts)

Cross-refs and Useful Links
- Build-in-public template: docs/community/build-in-public-template.md
- Welcome sequence JSON: data/community/welcome-sequence.json
- UI Framework: docs/visual-systems/ui-framework.md
- Crafting Design: docs/technology-systems/crafting-design.md
- Combat Design: docs/combat-systems/combat-design.md

Pour steady, post true, and keep the hearth bright.