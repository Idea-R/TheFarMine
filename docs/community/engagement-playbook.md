# Community Engagement Playbook — The Taproom Ledger (Sprint 1)

Owner: @theta (Community — Brewmaster Alehart)

Provenance and cross-references:
- data/community/welcome-sequence.json (welcome flow)
- docs/community/build-in-public-template.md (upcoming; thread template)
- docs/visual-systems/style-guide.md (§Accessibility)
- docs/technology-systems/crafting-design.md (cadence references for build-in-public)
- docs/combat-systems/combat-design.md (for [combat] feedback tags)
- docs/world-generation/cave-gen-algorithm.md (for [worldgen] tag)
- data/audio/sound-manifest.json (for [audio] tag)

Authoritative for: Sprint 1 (MVP Discord)

---

## 2) Goals & Success Criteria (Sprint 1)

Goals:
- Welcome newcomers smoothly within 48 hours; guide them to say hello and tag feedback.
- Maintain weekly build-in-public thread cadence with clips/links, without overburdening devs.
- Run one light-weight poll and one feedback session per week.
- Keep conversations kind, focused, and searchable (tags + threads).

Success metrics (targets):
- Time-to-first-reply for new intros ≤ 12h
- Weekly update posted by Tue 18:00 UTC
- ≥ 5 tagged feedback posts/week
- Mod response SLA ≤ 24h on [bug] + [crash]

---

## 3) Channel Map & Purposes (authoritative for Sprint 1)

Use these channel tokens; replace with real IDs at deployment. Each item lists Purpose, Allowed posts, and Mod notes.

- {{channel.welcome}}
  - Purpose: Automated welcome-sequence for new arrivals.
  - Allowed: Bot messages only (welcome, starter tips, links).
  - Mod notes: No chatter. Pin latest rules link. Verify bot reactions fire.

- {{channel.rules}}
  - Purpose: Code of Conduct, safety resources, spoiler policy, quick summaries.
  - Allowed: Read-only; mods/devs/brewmaster update posts.
  - Mod notes: Keep a short summary at top. Update edit date when changed.

- {{channel.tavern_talk}}
  - Purpose: General chat; low-stakes social and light off-topic.
  - Allowed: Daily hello thread; casual discussion; light memes (PG-13).
  - Mod notes: Encourage alt-text for images/clips. Use slowmode during spikes (start 5s; increase to 15–30s if needed). Nudge to threads for deeper topics.

- {{channel.announcements}}
  - Purpose: Dev team and Brewmaster updates; weekly build-in-public links; patch notes.
  - Allowed: Read-only for @dev, @mod, @brewmaster, @bot system posts.
  - Mod notes: Keep posts concise; pin the weekly build thread. Lock comments; direct discussion into linked threads.

- {{channel.build_in_public}}
  - Purpose: Weekly dev threads per team/domain.
  - Allowed: One new thread per team per week using template; replies in threads only.
  - Mod notes: Enforce template use (see docs/community/build-in-public-template.md). Convert stray replies to the right thread.

- {{channel.playtest_queue}}
  - Purpose: Playtest signups, schedules, and distribution of test keys/URLs when ready.
  - Allowed: Signup posts; schedule updates; threads per session.
  - Mod notes: Archive threads after sessions. No sharing of keys outside session threads.

- {{channel.feedback_mine}}
  - Purpose: Feature/UX feedback with tags for discoverability.
  - Allowed: New posts must start with tags: [ui], [combat], [worldgen], [crafting], [audio], [lore]; optional [bug] or [suggestion].
  - Mod notes: One thread per topic; ensure tags present; request repro info when needed. Cross-ref docs where relevant.

- {{channel.bug_reports}}
  - Purpose: Bugs only; triage-ready details.
  - Allowed: Reports must include version/hash, seed (if worldgen), repro steps, and a 10–20s clip or screenshot with alt-text.
  - Mod notes: One thread per bug. Add status emoji on first reply. Escalate [crash] within SLA.

- {{channel.media_clips}}
  - Purpose: Short gameplay clips and screenshots.
  - Allowed: 10–20s clips or single images; alt-text strongly encouraged.
  - Mod notes: Move feedback-y posts to feedback_mine; remind to add tags there.

- {{channel.moderation_log}}
  - Purpose: Private mod room for escalations and decisions.
  - Allowed: Mods/brewmaster/dev leads only. Logs, decisions, templates.
  - Mod notes: Log all formal warnings/timeouts/bans with links and timestamps.

---

## 4) Roles & Permissions

Roles:
- @dev (core developers, domain owners)
- @mod (moderators)
- @brewmaster (community owner; escalation point)
- @guild (members)
- @bot (automation)

Permissions quick matrix:
- Post in {{channel.announcements}}: @dev, @mod, @brewmaster, @bot only.
- Pin messages: @mod, @brewmaster, designated @dev leads in their threads/channels.
- Apply/edit forum tags (feedback_mine, bug_reports): @mod, @brewmaster, @dev domain owners.
- Toggle slowmode in {{channel.tavern_talk}}: @mod, @brewmaster.
- Manage threads (rename, archive, move): @mod, @brewmaster; @dev in build_in_public.
- View {{channel.moderation_log}}: @mod, @brewmaster, designated @dev lead.
- Start threads in build_in_public: @dev, @brewmaster (as backup).
- Everyone (@guild) can post in tavern_talk, media_clips, feedback_mine, bug_reports (subject to rules).

---

## 5) Moderation Guidelines (Code of Conduct summary + actions)

Conduct principles:
- Be kind; critique ideas, not kin. No slurs, harassment, or dogpiles.
- Keep spoilers tagged; respect content warnings.
- Use alt-text for images/clips; avoid flashing content.
- Stay on topic; use tags and threads to keep the taproom tidy.

Enforcement ladder (recommended windows):
1) Gentle nudge in-thread (within minutes of issue spotted).
2) Formal warning via DM (within 1 hour if behavior continues or is medium severity).
3) 24h timeout (apply within 15 minutes after ignored warning or for serious first offenses).
4) Ban (with mod consensus; document in moderation_log immediately).

Escalation flow:
- If safety risk (threats, hate speech, doxxing): immediate timeout → post incident summary in moderation_log → notify @brewmaster + @dev lead with links and screenshots.
- If legal/IP concerns: delete content, preserve evidence in moderation_log, notify @brewmaster.

Spoilers policy:
- Use spoiler tags for plot, surprises, and late-game systems. If a dev leak occurs: delete, DM the poster explaining, and note in moderation_log.

---

## 6) Onboarding Flow & First 48 Hours

Welcome bot:
- Source: data/community/welcome-sequence.json
- Token replacement: Replace channelToken placeholders (e.g., {{channel.welcome}}) with actual channel IDs before enabling.
- Cadence: Messages dispatch with staggered delays of 0/1500/1500/1500/1500 ms (first is immediate, next four spaced by 1.5s each).
- Dry-run in a test server; confirm reactions and link targets.

Mod checklist for new joins:
- React with 👋 to their first tavern hello within 12h.
- If no hello in 24h, post a friendly ping in {{channel.tavern_talk}} linking {{channel.welcome}} and {{channel.rules}}.
- For first-time posters, point them to {{channel.feedback_mine}} with tag examples and to {{channel.bug_reports}} for issues.
- If they post a clip/image, remind about alt-text once (warmly).

---

## 7) Weekly Rituals (Cadence & Templates)

Build-in-Public (weekly):
- Schedule: Draft on Mon; Post Tue 18:00 UTC in {{channel.announcements}}. Create/attach a thread in {{channel.build_in_public}} using docs/community/build-in-public-template.md.
- Assets ask: 1–2 short clips (10–20s) or 1–2 screenshots per domain ([combat], [worldgen], [crafting], [audio], [ui], [lore]). If blocked, text-only is fine—no last-minute pings.
- Cross-link: Pin the announcement. Post a one-line invite in {{channel.tavern_talk}} linking the thread.

Poll (weekly, Fri):
- Topic examples: UI readability, ore find rates, favorite enemy read.
- Mechanics: Single question, ≤ 4 options, run for 48h. Post results summary on Mon with a one-line takeaway.

Feedback Session (weekly, Sun UTC window):
- Format: Threaded Q&A in {{channel.feedback_mine}}; tag focus rotates weekly (e.g., Week 1 [combat], Week 2 [worldgen], Week 3 [ui]/[crafting], Week 4 [audio]/[lore]).
- Preparation: 2 seed questions and 1 clip or screenshot if available.
- Wrap-up: Summarize top 3 takeaways and current statuses by end of day Sun.

Note: Cadence references in docs/technology-systems/crafting-design.md inform how much we ask of devs—keep asks small and predictable.

---

## 8) Feedback Triage & SLAs

Tag grammar for members:
- Primary domain tag required: [ui], [combat], [worldgen], [crafting], [audio], [lore]
- Optional: [bug] or [suggestion] appended after the domain tag
- Example: “[combat] [suggestion] Goblin arc too wide?”

Mod triage checklist (24h SLA on all, 12–24h for [bug]/[crash]):
- Validate tags; edit to add missing tags where appropriate and comment noting the change.
- For [bug] or worldgen issues: request version/hash, seed, repro steps, 10–20s clip or screenshot with alt-text.
- Post a first-reply summary with bullets and add one status emoji:
  - 🔎 investigating
  - 🧪 queued (for playtest or internal repro)
  - ✅ accepted (will implement/fix)
  - 🧰 backlog (accepted but unscheduled)
  - ❌ out-of-scope
- Route to domain owners:
  - Mention the domain owner (“blackboard” style note) and/or link the GitHub issue when enabled.
  - Edit the top post or first moderator reply to include “Routed: <link or @mention>”.

Domain owner acknowledgements (48h ideal):
- Acknowledge receipt with a quick note and status emoji.
- Provide rough ETA or “backlog.”
- If silence > 48h: @brewmaster posts a gentle nudge; if still silent, roll into the next weekly roundup.

---

## 9) Message Snippets & Templates

Welcome nudge in tavern_talk:
“Welcome to the taproom! If you’re new, say hello here and check the quick-start in {{channel.welcome}} and our house rules in {{channel.rules}}. Pull up a stool—what brought you to The Far Mine?”

Feedback tagging reminder:
“Mind tagging your post so others can find it later? Use one domain tag up front like [ui], [combat], [worldgen], [crafting], [audio], or [lore], plus optional [bug] or [suggestion]. Example: ‘[worldgen] [suggestion] Ore veins feel sparse in early caves.’ Thanks!”

Bug report checklist:
“To help the smiths fix it fast, please add:
- Game version/hash
- Seed (if worldgen)
- Repro steps (1–2 lines)
- 10–20s clip or screenshot with alt-text
Post that in {{channel.bug_reports}} if it’s a bug. We’ll triage within 24h.”

Build-in-public thread opener (short):
“Weekly pour is ready! This thread follows our template (see docs/community/build-in-public-template.md). Highlights below; replies in this thread please. If you’ve got thoughts, tag them in {{channel.feedback_mine}} with the right domain label.”

---

## 10) Events Calendar (UTC) & Rota

Rota (moderation coverage):
- Mon–Tue: @brewmaster primary
- Wed–Thu: Mod A
- Fri–Sat: Mod B
- Sun: @brewmaster or backup

Off-hours policy:
- Reaction-only within 12h; escalate only for safety issues or [crash]/[bug] storms.

Calendar blocks (UTC):
- Tue 18:00 — Weekly build-in-public update
- Fri 16:00 — Poll launch (48h window)
- Sun 17:00–20:00 — Feedback session focus thread

---

## 11) Accessibility & UX Guardrails (Community)

- Always include alt-text on images and brief descriptions on clips.
- Prefer 10–20s clips over long videos; avoid flashing/strobe imagery.
- Thread titles: tags first, question or statement after. Example: “[combat] Goblin arc too wide?”
- Contrast and readability: follow docs/visual-systems/style-guide.md (§Accessibility) when preparing assets.
- Use spoiler tags for late-game content, puzzles, and narrative reveals.

---

## 12) Metrics & Review

Weekly metrics to capture (how-to in one line):
- New joins: Export from server insights; log weekly delta.
- % greeted within 12h: Sample last week’s intros; count 👋 within 12h / total intros.
- # feedback threads: Count new threads in feedback_mine for the week.
- Time-to-first-dev-ack: Average hours from post time to first @dev reply on top 10 active threads.
- Poll votes: Total votes and option breakdown; add one-line takeaway.

Review ritual:
- 15-minute Monday check-in (mods + brewmaster + available dev lead):
  - What worked (1–2 bullets)
  - What needs adjusting (1–2 bullets)
  - Risks or load concerns
  - Action items with owners (due next Mon)

---

## 13) Tools & Automation Hooks

Welcome bot config:
- Replace channelToken placeholders with actual channel IDs in data/community/welcome-sequence.json.
- Dry-run in a test server before go-live; verify timing (0/1500/1500/1500/1500 ms), links, and reaction adds.
- Enable only after {{channel.rules}} is populated and pinned in {{channel.welcome}}.

Future (post-MVP, not in scope for Sprint 1):
- Slash commands for tagging (e.g., /tag [combat] [suggestion]).
- Lightweight bug report form feeding {{channel.bug_reports}} with required fields.

---

## 14) Risk Notes & Load Management

- Keep asset asks minimal to respect developer load; if any domain is under crunch, skip clips and post text-only updates.
- Avoid performative rituals—if a ritual isn’t adding player value or clarity, trim it.
- Centralize discussion in threads to prevent rework; link once, reference often.
- Watch for tag creep; keep the tag set stable this sprint.

---

## 15) Acceptance Checklist

- Channels defined with purposes and moderation notes, using deployment tokens.
- Rituals scheduled with concrete times and copy blocks ready.
- Triage SLAs, statuses, and routing to domain owners are explicit and feasible.
- Welcome flow integrated via data/community/welcome-sequence.json with timing and token replacement.
- Metrics list prepared with simple collection notes for weekly review.

Brewmaster’s last word: Keep the tap clean, the kegs light, and the conversation easy to find.