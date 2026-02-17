# Community Engagement Playbook — The Tavern’s First Warrant (Sprint 1)

Owner: @theta (Community — Brewmaster Alehart)

Hello, friends. This is our first warrant: clear lanes, warm fire, quick refills. We’ll build in public, tend the tavern daily, and turn raw ore (feedback) into steel (action). This playbook is Sprint 1–ready and maps to our MVP cadence.

Cross-references:
- docs/narrative/founding-lore.md (§First Warrant)
- docs/visual-systems/style-guide.md (token-only policy)
- docs/audio-systems/audio-design.md (event hooks)
- docs/core-systems/ecs-architecture.md (domains)
- data/community/welcome-sequence.json (onboarding)
- docs/community/build-in-public-template.md (update ritual)

---

## 2) Goals & Principles (One-pager)

- Inclusive tavern ethos: everyone gets a stool; kindness first; punch up ideas, not people.
- Build in public by default: progress is shared weekly and midweek; no stealth ships.
- Feedback is ore to be refined: we mine, tag, sort, and smelt into tasks or learnings.
- Fast acknowledgments: 48 h SLA for public acks; disposition within 7 days.
- Celebrate small wins: shoutouts weekly; retro highlights even the tiniest polish.
- Tokens-only for colors in visuals: use tokens from style guide, never hard-coded hex.
- No dev DM black holes: route questions and feedback into channels; use threads and tags.

---

## 3) Channel Map & Purposes (Canonical)

Notes:
- Posting rights default to “All” unless specified.
- Slowmode: default 10 seconds for busy channels; can be raised during spikes.
- Thread use: if a post invites discussion longer than 3 replies, make a thread.
- Pinned resources checklists are per channel; owners keep pins fresh.

Public channels

1) #welcome
- Purpose: Greet newcomers, verify, point to house rules and first steps.
- Posting rights: All; welcome bot posts automated sequence.
- Slowmode/thread: 10 s slowmode; replies inline; staff thread for FAQs.
- Pinned resources:
  - Newcomer checklist
  - House rules summary
  - Links: #tavern, #build-in-public, #feedback-mine
  - Onboarding steps (maps to data/community/welcome-sequence.json)
  - Reaction role message (guild vibes) if enabled

2) #announcements
- Purpose: One-way ship logs; canonical updates; mirrors the Friday build-in-public summary.
- Posting rights: Brewmaster, Moderators, Dev domain owners.
- Slowmode/thread: No slowmode; replies disabled.
- Pinned resources:
  - Changelog index
  - Latest build-in-public thread link
  - Spotlight policy and consent note
  - Town Hall schedule and last transcript

3) #tavern
- Purpose: General chat; daily prompts; social glue and light Q&A.
- Posting rights: All.
- Slowmode/thread: 5–10 s slowmode; encouraged threads for long chats and spoilers.
- Pinned resources:
  - Daily prompt schedule
  - House rules and Three-Wide Law reminder
  - How to ask for help (use #feedback-mine/#bug-reports)
  - Weekly poll time (Mon)

4) #build-in-public
- Purpose: Weekly dev thread posts (Fri) + midweek “Clip & Peek” (Wed); transparent progress.
- Posting rights: All can react and ask in community thread; dev-only replies in section threads.
- Slowmode/thread: Threads required; top-level posts only by Brewmaster/mods/dev owners.
- Pinned resources:
  - Build-in-public template (docs/community/build-in-public-template.md)
  - Midweek clip specs (<=15 MB, 30–90s)
  - Asset token-only reminder (visual tokens policy)
  - Last 4 weekly threads index

5) #feedback-mine
- Purpose: Feature requests and UX notes; intake templates and emoji labels.
- Posting rights: All.
- Slowmode/thread: Threads required per submission; 10 s slowmode at channel root.
- Pinned resources:
  - Intake templates: Feature Card, UX Note, Balance Nudge
  - Emoji/tag taxonomy
  - SLA: 48 h ack, 7 d disposition
  - Routing matrix and how to @ domain owner after ack
  - Link to #dev-cabinet status updates

6) #bug-reports
- Purpose: Bugs only; clear repros; emoji tags for platform/state.
- Posting rights: All.
- Slowmode/thread: Threads required per bug; 10 s slowmode at root.
- Pinned resources:
  - Bug report template
  - Emoji key (OS, build, severity)
  - Known issues list (rotating)
  - How to attach logs/clips

7) #screenshots
- Purpose: Art and playtest captures; opt-in to community spotlight via reaction.
- Posting rights: All.
- Slowmode/thread: 10 s slowmode; threads for multi-image sets or breakdowns.
- Pinned resources:
  - Spotlight nomination instruction (react with ⭐)
  - Consent and repost policy
  - Capture tips (token-only colors for UI overlays)

8) #lore-codex
- Purpose: Lore chatter; quotes from Runebeard; links to docs.
- Posting rights: All.
- Slowmode/thread: 10 s slowmode; threads for long theories; spoiler tags as needed.
- Pinned resources:
  - Lore index and canon notes
  - Spoiler policy
  - Link to docs/narrative/founding-lore.md

9) #playtest-queue
- Purpose: Signups, session briefs, and schedules for MVP-light playtests.
- Posting rights: All signups; Captains post sessions.
- Slowmode/thread: Threads per session; no slowmode in threads.
- Pinned resources:
  - Signup format and debrief template
  - Session calendar
  - Focus areas for current sprint
  - Rewards policy

Staff/limited channels (names indicative; actual IDs to be inserted)

10) #mod-lounge
- Purpose: Moderation queue, incident summaries, off-hours alerts.
- Posting rights: Brewmaster, Moderators.
- Slowmode/thread: Threads per incident; no slowmode in threads.
- Pinned resources:
  - Incident log template
  - Enforcement ladder
  - Off-hours contact chain
  - Weekly mod rota

11) #dev-cabinet
- Purpose: Routing board for triage and status pings per domain.
- Posting rights: Brewmaster, Moderators, Dev domain owners.
- Slowmode/thread: One ongoing thread per domain; status notes pinned weekly.
- Pinned resources:
  - Routing matrix and labels
  - Triage board link
  - SLA reminders
  - Friday sweep checklist

---

## 4) Roles & Ownership

Public-facing roles
- Brewmaster (community lead): @theta — owns cadence, SLAs, announcements, spotlight.
- Moderators (UTC rota): cover welcomes, safety, triage intake, and queue hygiene.
- Guild Reps (Brassbound, Emberforge, Ordinate): amplify prompts, surface guild-flavored feedback.
- Playtest Captains: schedule sessions, run briefs/debriefs, ensure bug/feedback threads are created.

Dev domain owners (see docs/core-systems/ecs-architecture.md)
- @alpha — Core (systems glue, ECS foundations, performance)
- @beta — Worldgen (biomes, resource veins, topology)
- @gamma — Combat (AI, timings, damage, abilities)
- @delta — Tech/Crafting (machines, recipes, economy loops)
- @eta — Visual (shaders, VFX, UI skin; token-only compliance)
- @epsilon — Narrative (quests, lore surfaces, VO text)

Feedback routing
- Labels map to domains (see §6). Once a submission is acknowledged by a moderator, the mod adds the label and pings the domain owner in the appropriate #dev-cabinet domain thread with a link. Domain owner reacts with 🧭 when triage-reviewed and adds a status note.

---

## 5) Rituals & Cadence (UTC; adaptable)

Weekly
- Monday 16:00 — #tavern poll (feature taste or art vote). Scheduler posts; closes in 48 h.
- Wednesday 17:00 — “Clip & Peek” in #build-in-public (30–90s gif/clip). Dev owner rotates weekly; community thread for questions.
- Friday 16:00 — Build-in-public thread (use template). Brewmaster posts; domain owners reply in their sections within 2 h; cross-post 3-bullet summary to #announcements at 18:00.
- Sunday 19:00 — Retro & Roadsigns thread in #tavern. Shoutouts + next week’s top 3 goals. Includes 5-min metrics skim.

Monthly
- Last Thursday 17:30 — Light Town Hall (30 min) with Q&A; transcript and timestamps posted to #announcements within 24 h.

---

## 6) Feedback Intake & Triage (SLA-backed)

Intake templates (copy/paste)
- Feature Card — propose new or improved capability.
- UX Note — pain points in flows or clarity.
- Balance Nudge — small tuning suggestions.

Labels via emoji taxonomy (see §14)
- [UX], [Combat], [Worldgen], [Crafting], [UI], [Lore] plus severity and platform emojis.

SLA
- Acknowledge within 48 h: “Got it, thanks for mining this ore. Logged as [label]; we’ll circle back.”
- Disposition within 7 days (Accept, Park, Clarify, Close):
  - Accept: “Accepted for backlog under [domain]. Tracking in Triage: Accepted.”
  - Park: “Parked for later sprints; not in current scope but noted.”
  - Clarify: “Need more detail—see questions in thread and update the template.”
  - Close: “Closing due to dupe/out of scope; linked the canonical thread.”

Routing matrix (label → domain owner)
- [UX], [UI] → @eta (Visual) with cross-check by @alpha for feasibility.
- [Combat] → @gamma.
- [Worldgen] → @beta.
- [Crafting] → @delta.
- [Lore] → @epsilon.

How to @-mention once acknowledged
- Moderator adds label emojis on the top post, then posts: “Routing to @owner in #dev-cabinet > [Domain] thread.” Include a link. Owner adds 🧭 in #dev-cabinet when triage-reviewed and posts a one-liner status.

Triage board structure (Notion/Sheet MVP)
- Columns: New → In Review → Accepted → Parked → Closed.
- Cards: link to Discord thread, label(s), reporter, owner, decision date.
- Weekly sweep: Fridays 14:00–15:00 UTC, before build-in-public drafting.

---

## 7) Moderation & Safety Rules

House rules
- Be dwarven-kind: respect first; welcome new hands.
- No harassment, hate, or personal attacks.
- Keep critique actionable: describe problem, impact, proposed next step.
- No spam or self-promo without prior ok.
- Spoilers in threads with tags; mark clearly; no leaks.
- No NSFW content.

Three‑Wide Law (metaphor)
- Keep lanes clear: no dogpiles. If two are deep in a thread, give room for a third voice before re-entering. Mods may slowmode or split threads to keep the road safe.

Enforcement ladder (with examples)
- Gentle nudge: “Let’s keep it constructive; take a breath.” For off-topic drifts or tone.
- Formal warning: DM + note in #mod-lounge. For repeated tone issues or minor rule breaks.
- 24 h mute: Applied for harassment, slurs, or ignoring warnings.
- Ban: Severe harassment, threats, doxxing, or repeat bad-faith behavior.

Escalation
- Immediate Brewmaster ping (@theta) for threats/self-harm. Use platform tools to reach Trust & Safety if needed.
- Off-hours alert chain (UTC): Mod on duty → Backup mod → Brewmaster.

Incident logging (minimal template in #mod-lounge)
- Who: users involved (IDs)
- What: summary and rule invoked
- Where: channel/thread link
- Action taken: nudge/warn/mute/ban
- Follow-up: timeline and owner

---

## 8) Onboarding Flow (maps to welcome-sequence.json)

Five steps
1) Warm welcome: auto-greet with tavern tone and how to get started.
2) House rules: short summary + link to full rules; emoji confirm.
3) How to contribute: where to chat (#tavern), where to give feedback (#feedback-mine), where to report bugs (#bug-reports).
4) Current sprint focus: top 3 goals for the week; link to latest build-in-public.
5) How to playtest/give feedback: #playtest-queue signup and templates.

First quest
- Say hello in #welcome and choose a guild vibe (Brassbound/Emberforge/Ordinate) via reaction roles (optional).
- Prompt: post a screenshot in #screenshots or answer the weekly poll in #tavern.

Newcomer checklist (pinned in #welcome)
- Read house rules.
- Pick a guild vibe (optional).
- Visit #tavern and say hello.
- Skim latest #build-in-public thread.
- Bookmark #feedback-mine templates.
- Optional: sign up in #playtest-queue.

---

## 9) Build-in-Public Operations

- Use docs/community/build-in-public-template.md each Friday.
- Asset asks per week:
  - One short clip/gif (<=15 MB, 30–90s).
  - 1–2 WIP screenshots (UI visuals must use tokens-only colors).
  - 1 PR link per domain if feasible; fallback to text bullets if not ready.
- Thread hygiene:
  - Top post: summary + sections per domain (Core, Worldgen, Combat, Tech/Crafting, Visual, Narrative).
  - Replies: dev-only under each section; one community Q&A thread linked at the bottom.
- Spotlight segment:
  - Reserve 1 block for Community Spotlight (see §10); include credit/consent note.

---

## 10) Community Spotlight

Nomination
- React with ⭐ to a post in #screenshots or submit via a simple form stub (collected by bot to #feedback-mine threads).

Criteria
- Constructive presence, helpful feedback, or a memorable capture/playtest moment.

Consent and credit
- Confirm in DMs before posting; use agreed handle and credit line.
- Usage rights: permission for repost on our social channels and Discord embeds only.

Friday slot
- One per week in the build-in-public thread; optional mini Q&A (3 questions) or a build tip from the featured community member.

---

## 11) Playtest Loop (MVP-light)

Signup message format (in #playtest-queue)
- Session tag: [Region][Date][Time UTC]
- Focus: lanes, goblin block, burrower dodge, copper/iron cadence (update per sprint)
- Slots: N players
- Build: hash or version
- Voice: yes/no
- Requirements: platform, controller/mouse

Session length
- 20–30 minutes target, back-to-back allowed with 5-minute reset.

During session
- Captains read a 60-second brief: goals and what to observe.
- Encourage short clips of issues (<=15 MB).

Bug/feedback capture
- Use Bug Report and UX Note templates in #bug-reports and #feedback-mine; create a thread per item from debrief.

Post-session
- Debrief thread linked to signup; top comment summarizes top 3 findings; tag with labels.

Rewards
- Shoutouts in Sunday Retro & Roadsigns.
- Names on wall-of-thanks in #announcements monthly.

---

## 12) Tools & Automation

Bots
- Welcome bot: consumes data/community/welcome-sequence.json to DM/prompt steps in #welcome.
- Reaction Roles: assign guild vibes.
- Scheduler: posts Monday poll, Wednesday clip reminder, Friday build-in-public, Sunday retro.
- Feedback form collector: converts lightweight form submissions into #feedback-mine threads with labels.

Posting calendar (UTC windows; cron-like)
- Mon Poll: 15:55 post, 16:00 open; close at Wed 16:00.
- Wed Clip: 16:45 reminder DM to owner; 17:00 post.
- Fri Build-in-Public: 15:30 draft reminder; 16:00 post; 18:00 #announcements summary.
- Sun Retro: 18:30 reminder; 19:00 post.

---

## 13) Metrics & Review

Weekly KPIs
- New members
- DAU/MAU
- First-message rate (within 48 h)
- Feedback items created
- 48 h acknowledgment %
- 7 d disposition %
- Playtest signups

Sources
- Discord Insights
- Simple Google Sheet/Notion (placeholder link: to be inserted)
- Manual mod tally for MVP (mod rota apportions counts)

Review ritual
- Sunday Retro includes a 5-minute metrics skim and “one improvement we’ll try next week.”
- If 48 h acks drop below 90%, raise rota coverage or simplify intake.

---

## 14) Templates (Copy/Paste Ready)

Feature Card
```
Title:
Summary (1–2 sentences):
Why (player value):
Scope (what this is / is not):
Mock or reference (optional):
Labels: [UX]/[UI]/[Combat]/[Worldgen]/[Crafting]/[Lore]
Attachments:
```

UX Note
```
Context (where in the flow):
Observed friction:
Expected outcome:
Evidence (clip/screenshot):
Severity: 🟢 minor / 🟡 moderate / 🔴 major
Labels: [UX]/[UI]
```

Balance Nudge
```
System (e.g., goblin block, burrower dodge, copper/iron cadence):
Current feel (numbers if known):
Suggested nudge:
Why it matters (player impact):
Labels: [Combat]/[Crafting]
```

Bug Report
```
Build/Version:
Platform/Specs:
Area:
Steps to Repro:
Expected:
Actual:
Frequency: ⏱️ once / ♻️ sometimes / 🔁 always
Evidence (clip/log):
Severity: 🟢 cosmetic / 🟡 gameplay / 🔴 blocker
Tags: OS [🪟/🍎/🐧], Input [⌨️/🎮], Net [📶]
```

Quick Poll (for #tavern, Mon)
```
Question:
Option A:
Option B:
Option C (optional):
Closes: [date/time UTC]
Notes: vote in reactions, discuss in thread
```

Retro & Roadsigns Agenda (Sun)
```
Small wins (3–5 bullets):
Spotlight shoutouts:
What we learned (1–3 bullets):
Top 3 goals next week:
KPI skim:
- New members:
- First-message rate:
- 48 h ack % / 7 d disposition %:
- Playtest signups:
```

Mod Queue Entry (for #mod-lounge)
```
Link:
Summary:
Rule invoked:
Action taken:
Next step/owner:
Follow-up by (UTC date):
```

Emoji/tag taxonomy and usage examples
- Domain labels (place on top post):
  - [UX] 🧭
  - [UI] 🖼️
  - [Combat] ⚔️
  - [Worldgen] 🗺️
  - [Crafting] ⚙️
  - [Lore] 📜
- Severity (stackable):
  - 🟢 minor
  - 🟡 moderate
  - 🔴 major/blocker
- Platform/Context:
  - OS: 🪟 Windows, 🍎 macOS, 🐧 Linux
  - Input: ⌨️ keyboard/mouse, 🎮 controller
  - Net: 📶 online, 📴 offline
- Workflow signals (staff):
  - 👀 seen/acknowledged
  - 🧭 triage-reviewed
  - 📥 accepted
  - 🗂️ parked
  - ✅ closed
- Example usage:
  - “UI text overlap on inventory grid” 🖼️ 🟡 🪟
  - “Goblin block window too tight with latency” ⚔️ 🟡 📶
  - “Copper nodes clustering too close to spawn” 🗺️ 🟡

---

## 15) Acceptance & Continuity Checklist

- Channels created and purposed with pins populated:
  - #welcome, #announcements, #tavern, #build-in-public, #feedback-mine, #bug-reports, #screenshots, #lore-codex, #playtest-queue, #mod-lounge, #dev-cabinet.
- Rituals scheduled with UTC times; Scheduler configured for Mon/Wed/Fri/Sun posts.
- Triage SLA defined and visible in #feedback-mine; board created with columns (New → In Review → Accepted → Parked → Closed).
- Moderation rules and enforcement ladder pinned; off-hours chain documented; incident template ready.
- Onboarding mapped to data/community/welcome-sequence.json; newcomer checklist pinned in #welcome; reaction roles (optional) configured.
- Templates present and linked in pins; bug and feedback threads tested.
- Token-only policy for any visual references enforced; devs reminded in #build-in-public pins (see docs/visual-systems/style-guide.md).
- Consistent with founding lore tone and “First Warrant” spirit (see docs/narrative/founding-lore.md).
- Event hooks cross-check with audio design where relevant (see docs/audio-systems/audio-design.md).
- Domain routing aligned with ECS domains (see docs/core-systems/ecs-architecture.md).

Raise a mug when each box is ticked, then we sail into Sprint 1 together.