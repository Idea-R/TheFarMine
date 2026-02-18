# The Far Mine — Community Engagement Playbook (Sprint 1, Theta)

Author: theta/Brewmaster Alehart  
Version/Date: v0.1 — 2026-02-18  
Status: Draft v0.1  
Scope: Discord-centric for Sprint 1 (MVP); designed to extend to Steam/Itch/Twitter in later sprints.

---

## 1) Purpose & Principles

Goals (Sprint 1):
- Keep newcomers oriented within 48h.
- Surface feedback quickly and route it to owners.
- Celebrate builds and progress in public.
- Maintain a respectful, tavern-like tone (PG-13).

Principles:
- Warm welcome: meet folks at the tavern door; invite the first small action.
- Clear lanes: channel map + templates reduce friction.
- Quick triage: light emoji labels + owner acks with clear SLAs.
- Build-in-public cadence: show work weekly; ask for specific clip/artifacts.
- Low-friction rituals: short, repeatable daily posts; staff owns the prompts.
- Data-light metrics: track only what we use weekly.

---

## 2) Channel & Role Plan (Discord Map)

Channel purposes, posting rules, cadence, and who can post/pin:

- #announcements
  - Purpose: Studio/game news; milestone beats; external links.
  - Rules: Staff-post only; keep replies in threads.
  - Cadence: Ad hoc (as needed).
  - Who: Theta + Owners can post; Theta pins major beats.

- #project-orchestration
  - Purpose: Daily Hearthfire Roll Call + Mine Mood; short coordination nudges.
  - Rules: Staff posts daily thread; all replies live in the thread of the day.
  - Cadence: Daily at 10:00 PT.
  - Who: Theta posts/pins; all reply in thread; Hearthkeepers manage threads.

- #build-updates
  - Purpose: Weekly build-in-public progress; clips, screenshots, short notes.
  - Rules: Primary posts by Domain Owners/Theta; community reacts and asks in thread.
  - Cadence: Weekly (Tue); ad hoc mid-week if needed.
  - Who: Owners + Theta post/pin; Hearthkeepers manage threads.

- #tavern-talk
  - Purpose: General chat; welcome mat; lightweight Q&A.
  - Rules: Be kind; thread long tangents; PG-13; tasteful alcohol references only.
  - Cadence: Ongoing.
  - Who: Everyone posts; Hearthkeepers can pin welcome posts and useful FAQs.

- #playtest-queue
  - Purpose: Playtest calls, seed codes, instructions, feedback link.
  - Rules: Theta posts calls; testers reply in thread with notes/template.
  - Cadence: Ad hoc (typically Wed).
  - Who: Theta posts/pins; Playtesters reply; Hearthkeepers manage threads.

- #bug-reports
  - Purpose: Structured bug intake.
  - Rules: Use template; 1 bug per message; staff labels via emoji; use threads for follow-ups.
  - Cadence: Ongoing.
  - Who: Everyone can post; Theta/Owners tag state and pin intake guide.

- #ideas-workbench
  - Purpose: Feature/UX ideas; quick voting via reactions.
  - Rules: 1 idea per message; encourage reaction voting; no promises; suggestions not directives.
  - Cadence: Ongoing; Theta compiles weekly top 3.
  - Who: Everyone posts; Theta routes; Owners acknowledge.

- #lore-forge
  - Purpose: Narrative/lore discussion; snippets from Epsilon.
  - Rules: Spoiler-tag long lore; keep UI-safe.
  - Cadence: Weekly spotlight (Thu) + ad hoc.
  - Who: Everyone posts; Epsilon pins canonical snippets.

- #art-smithy
  - Purpose: Visual/UI shares; WIP to finished; feedback threads.
  - Rules: Thread per share; tag [WIP] or [Review].
  - Cadence: Ad hoc; Week 2 Thu peek.
  - Who: Everyone posts; Eta pins key references.

- #audio-bellows
  - Purpose: Audio shares; SFX/music WIP; capture feedback.
  - Rules: Thread per clip; volume warnings if needed.
  - Cadence: Ad hoc.
  - Who: Everyone posts; Zeta pins key takes.

- #forge-requests
  - Purpose: Asset/clip requests from Theta to devs (what/why/when/format).
  - Rules: Theta posts requests; owners reply with link/status; mark fulfilled.
  - Cadence: Ad hoc; batch Tue/Thu.
  - Who: Theta posts; Owners fulfill; Theta pins open asks.

- #hearth-logs
  - Purpose: End-of-day digests, changelogs, and meeting notes.
  - Rules: Staff-post primary; replies in thread per digest.
  - Cadence: Mon–Fri by 18:00 PT.
  - Who: Theta posts/pins; Owners may append meeting notes in thread.

Roles & Permissions:
- Domain Owners: Alpha (ECS), Beta (Worldgen), Gamma (Combat), Delta (Tech/Crafting), Epsilon (Narrative), Zeta (Audio), Eta (Visual/UI), Theta (Community). Use @Owners for cross-domain pings.
- Moderators (Hearthkeepers): Can pin, manage threads, enforce CoC; maintain a light rota with UTC coverage (see Appendix).
- Playtesters: Opt-in role; receive playtest pings; access #playtest-queue focuses.
- Everyone: Read/post per-channel rules; bug/idea templates encouraged but not required.

Posting cadences summary:
- Daily: #project-orchestration (Mine Mood + Roll Call), #hearth-logs (EOD Digest).
- Weekly: #build-updates (Tue).
- Ad hoc: #announcements, #playtest-queue, #forge-requests.

---

## 3) Rituals & Daily Flow

Mine Mood (daily):
- By 09:50 PT: Epsilon proposes label + 5-word vibe to Theta.
- 10:00 PT: Theta posts in #project-orchestration: Mine Mood: <Name> — <5-word vibe>
- Default fallback: Stillshift — quiet seam.

Hearthfire Roll Call (daily 10:00 PT):
- Theta posts daily thread with template:
  - Focus (1 sentence) | Commit (one EOD deliverable) | Blockers (if any)
- Everyone replies by 10:20 PT. Theta reacts ✅ when commits land; ❗ if blockers remain at EOD.

End-of-Day Ember Digest (Mon–Fri by 18:00 PT, #hearth-logs):
- Summarize: landed commits vs. stated commits, notable clips/PRs, open blockers (owner + ETA), and nudges for tomorrow.

---

## 4) Moderation & CoC (Lightweight)

Tone:
- Dwarven camaraderie; PG-13. No slurs, harassment, or personal attacks. Alcohol references tasteful and infrequent.

Enforcement ladder:
- Gentle reminder → Thread steer → Timeout (24h) → Ban (owners review).
- Encourage threads for tangents to keep main channels tidy.

Content boundaries:
- Avoid making mechanical promises; treat feedback as suggestions.
- No pile-ons; critique ideas, not people.

---

## 5) Feedback Intake & Triage SOP

Bug Reports (#bug-reports):
- Template:
  - Title:
  - Steps:
  - Expected:
  - Actual:
  - Seed/Build:
  - System (OS/GPU/CPU):
- Labels (emoji first reaction; Theta applies within 12h):
  - 🟥 critical | 🟧 major | 🟨 minor | 🟩 polish
- State tags (via message edit or thread title): triaged | needs-info | in-progress | resolved | known-issue.
- Use a thread per bug for follow-ups; close thread when resolved.

Ideas (#ideas-workbench):
- One idea per message; clear title + 1–2 lines of impact.
- Community reacts; Theta compiles weekly top 3 (by reactions + feasibility).
- Routing: Theta → domain owner; Owner acknowledges within 48h SLA (emoji + 1-line note).
- Status comment tags: exploring | parked | slated | not-now (with brief why).

Clips/Artifacts (#forge-requests):
- Theta posts: what | why | when | format (e.g., 10–15s MP4, 1080p; HUD overlay on).
- Owner replies with asset/PR link + OK-to-share note.
- Theta files to #build-updates and pins if public-facing.

---

## 6) Content Calendar (First 2 Weeks Overview)

Week 1 (Sprint 1):
- Daily: Mine Mood + Roll Call + EOD Digest.
- Tue: Build-in-public mini — ECS + Worldgen seed demo request.
- Wed: Playtest call — seed map 64×64; feedback form link.
- Thu: Lore spotlight — Deepsong term + 3 lines UI-safe copy.
- Fri 12:30 PT: Lunchtime Live Peek (10–15 min): cave gen walkthrough + pickaxe T0 stamina demo; Q&A thread.

Week 2 (Sprint 1 wrap):
- Daily rituals continue.
- Tue: Combat tuning note — TTK target + telegraph clip ask.
- Thu: Visual/UI palette peek — HUD wireframe + color tokens.
- Fri: Sprint 1 recap post + community kudos.

Checklist (owners per beat and asset asks):
- Tue W1 — Build mini
  - Owners: Alpha (ECS), Beta (Worldgen), Theta (post)
  - Assets: 20–30s clip of ECS system toggles; 2 seed screenshots (64×64, 256×256); one-line changelog bullets.
- Wed W1 — Playtest call
  - Owners: Theta (call), Beta (seed), Delta (build link), Gamma (known issues)
  - Assets: Seed code + build link; feedback form URL; 5-step install/run instructions.
- Thu W1 — Lore spotlight
  - Owners: Epsilon (copy), Eta (thumbnail), Theta (post)
  - Assets: Deepsong term (name + 3 UI-safe lines); 1 image (1280×720).
- Fri W1 — Live Peek
  - Owners: Beta (cave gen), Gamma (pickaxe stamina), Theta (host/mod)
  - Assets: Live scene or pre-recorded 2× 60–90s clips; Q&A seed questions (3–5 prompts); stream link.
- Tue W2 — Combat tuning note
  - Owners: Gamma (TTK target), Zeta (telegraph SFX optional), Theta (post)
  - Assets: 15–20s telegraph clip; stat table screenshot (if safe).
- Thu W2 — Visual/UI palette peek
  - Owners: Eta (HUD + tokens), Theta (post)
  - Assets: HUD wireframe PNG; color tokens (hex + names); accessibility note.
- Fri W2 — Sprint 1 recap + kudos
  - Owners: Theta (write), All Owners (one kudos each)
  - Assets: 3 highlight clips/images; top 5 community shout-outs; next sprint teaser (1 line).

---

## 7) Automation Plan (Lightweight for MVP)

Welcome:
- Day 1 manual: Theta greets newcomers in #tavern-talk.
- Then: Bot reads data/community/welcome-sequence.json; DMs staggered messages (immediate, +24h, +72h).
- Fallback: Theta pings newcomers in #tavern-talk with quick-start.

Scheduled Posts:
- Use Discord scheduled messages for 10:00 PT daily Roll Call.
- Calendar reference: docs/community/calendar.md (owner: Theta).

Reactions → Labels:
- Week 1: Manual mod SOP for emoji → label/states (no bot).
- Week 2: Revisit automation; Alpha to review channel IDs for wiring.

---

## 8) Onboarding Flow (Quick Path)

Newcomer (within 5 minutes):
- Say hello in #tavern-talk; skim #announcements; read pinned CoC.
- Grab Playtester role (opt-in) if interested.
- See current sprint and how to help (pin in #build-updates).
- Post first thought in #ideas-workbench or try the current playtest seed (when available).

Welcome sequence (data/community/welcome-sequence.json):
- Message 1: Warm welcome + channel map highlights + CoC link.
- Message 2: How to join today’s Roll Call (lurking allowed) + first small action.
- Message 3: Build-in-public post pointer + how to react/ask in threads.
- Message 4: Playtest quick-start (seed/build link flow) + feedback template.
- Message 5: Where to drop ideas/bugs + how we triage + opt-in roles.

---

## 9) Metrics & Review Cadence

Weekly review (Mon, 20 min, Theta + available Owners):
- New joins; first-message latency (median).
- Roll Call participation % (team + community where relevant).
- Bug triage SLA (% labeled <12h).
- Idea ACK SLA (% acknowledged <48h).
- Reactions/comments on build posts (week-over-week).
- Output: Short note in #hearth-logs with 2 nudges for improvement.
- Tools: Simple Google Sheet + Discord insights export; no screenshots of private data shared publicly.

---

## 10) Risks & Assumptions

Risks:
- Owner time constraints for clips/acks.
  - Mitigation: Minimal asks; batch on Tue/Thu; Theta drafts; use short clips (<=30s).
- Automation lag.
  - Mitigation: Manual SOP in Week 1; Alpha gets channel IDs early; reassess Week 2.

Assumptions:
- Channel map stable for Sprint 1.
- Channel IDs shared with Alpha for bot wiring by Day 3.
- Times in PT; UTC noted in rota.

---

## 11) Appendices

Templates (copy-paste blocks):

- Roll Call (post this as the thread opener in #project-orchestration at 10:00 PT):
  - Mine Mood: <Name> — <5-word vibe>
  - Reply format (by 10:20 PT):
    - Focus: <1 sentence>
    - Commit: <one EOD deliverable>
    - Blockers: <if any>

- EOD Ember Digest (post in #hearth-logs by 18:00 PT):
  - Date: <YYYY-MM-DD> | Mine Mood: <Name>
  - Commits Landed:
    - <@user> — <commit/deliverable>
  - Notable Clips/PRs:
    - <link> — <1 line context>
  - Open Blockers:
    - <owner> — <issue> — ETA/need
  - Nudges for Tomorrow:
    - <short actionable nudge>

- Build-in-Public Weekly Post (summary; full template at docs/community/build-in-public-template.md):
  - Title: This Week in The Far Mine — Sprint 1, Week <#>
  - Highlights (3 bullets):
  - Clip/Shot:
    - <link> — <what to look for>
  - What We Need From You:
    - <specific ask + where to reply>
  - Known Issues:
    - <1–3 quick notes>
  - Next Up:
    - <1–2 teaser bullets>

Quick Moderator Rota (Week 1, UTC windows):
- Theta (primary): 17:00–02:00 UTC (09:00–18:00 PT) — rituals + labels + EOD.
- Hearthkeeper A (EU, TBD): 09:00–13:00 UTC — daytime EU watch, thread tidying.
- Hearthkeeper B (APAC, TBD): 02:00–06:00 UTC — late UTC/early APAC watch.
- Coverage notes: If gaps occur, prioritize #tavern-talk and #bug-reports; escalate bans to Owners.

--- 

End of Playbook (Sprint 1, Theta). Steady hands on the bellows, and we’ll keep the hearth bright.