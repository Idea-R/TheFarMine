# The Far Mine — Community Engagement Playbook (Sprint 1)

- Description: Actionable plan for Discord community operations during Sprint 1
- Owner: Brewmaster Alehart (Theta)
- Version: v0.1
- Date: 2026-02-18T00:00:00Z
- Scope: Channel/role map, daily rituals (Hearthfire Roll Call, Mine Mood), 2-week content calendar with concrete prompts, moderation/CoC, feedback triage SOP, onboarding, automation/scheduling, templates, risks, and iteration plan. Links to ready-to-use templates included.

## 1) Title & Purpose

- Title: The Far Mine — Community Engagement Playbook (Sprint 1)
- Purpose: Keep the community informed, welcomed, and productive as co-creators; align communications with sprint milestones and maintain momentum through daily rituals and weekly beats.
- Success metrics (Sprint 1, lightweight):
  - Time-to-acknowledge feedback: under 24 hours
  - Daily roll-call participation: number of replies per day (target: ≥ team size, stretch: +25% including community)
  - Weekly clip posts: at least 2 shipped to #build-in-public
  - Onboarding completion rate: percentage completing welcome sequence reactions/DM confirmations (target: ≥60% reach step 3 within 24h)

## 2) Channel & Role Map (Discord)

Channels (create and order as listed):

- #announcements
  - Purpose: One-way studio updates; cross-post key build-in-public wins and weekly digests.
  - Example posts: sprint goal pin, end-of-week digest, Lunchline Live recaps, survey links.
  - Permissions: Post-locked to staff (Theta, Domain Owners, Moderators). Everyone can react. Threads disabled.

- #project-orchestration
  - Purpose: Daily Mine Mood + Hearthfire Roll Call; EOD digests; sprint scaffolding.
  - Example posts: daily roll call prompt, Mine Mood callout, EOD wins/slips/carries.
  - Permissions: Post-locked to staff for top-level posts (Theta). Threads open for all replies in daily thread.

- #build-in-public
  - Purpose: Weekly dev updates, short clips, and links to PRs using the ready template.
  - Example posts: GIF/short video of a new mechanic; text + PR link using template.
  - Permissions: Staff can post top-level; community replies encouraged. Threads for each update.

- #feedback-forge
  - Purpose: Structured feedback threads; enforced tag taxonomy.
  - Example posts: “[worldgen] Ore seam variance vs seed 1234” thread; “[ui] HUD text readability @ scale”.
  - Permissions: Everyone can post using template; Moderators and Domain Owners manage tags/threads.

- #tavern-talk
  - Purpose: General chat; welcome greets and casual questions.
  - Example posts: intros, memes (tasteful), quick Q&A, milestone cheers.
  - Permissions: Open to all. Moderators keep convo aligned with CoC.

- #forge-log
  - Purpose: Merge logs and technical notes; link PRs and branches for transparency.
  - Example posts: “Merged PR #482 ‘Hammer swing timing’ to develop”; “Branch: feature/ui-hud-v2”.
  - Permissions: Staff post top-level; community read-only; threads open for clarifications.

- #playtest-pit
  - Purpose: Playtest calls, seed sharing, bug repro steps and session coordination.
  - Example posts: call for testers, test build hashes, repro templates with system specs.
  - Permissions: Everyone can post; @Playtesters is pingable. Moderators maintain thread hygiene.

- Optional domain lounges (create as needed)
  - #lore-inkwell — narrative beats, names, timelines; [lore]
  - #art-anvil — sprites, palettes, tilesets; [art]
  - #audio-bellows — SFX, ambiences, mixes; [audio]
  - #ui-brasspanel — HUD, typography, flows; [ui]
  - Permissions: Open posting; Domain Owners steward content and summaries.

Roles and responsibilities:

- @Theta (Brewmaster)
  - Owns daily rituals (Mine Mood, Hearthfire Roll Call), content calendar execution, onboarding, and EOD/weekly digests.
  - Keeps templates fresh and enforces formatting/tag hygiene.

- @Domain Owners (Alpha–Eta)
  - Acknowledge/triage feedback in their domain within 24–48 hours.
  - Provide weekly build-in-public clips or text+PRs; join Lunchline Live rotation.

- @Moderators
  - Enforce CoC, maintain thread hygiene, and run an off-hours ping rota.
  - Operate /report queue (when enabled) and log actions.

- @Playtesters
  - Opt-in role for build tries and feedback pings; priority tagging in #playtest-pit.

Permissions snapshot:

- #announcements and #project-orchestration: post-locked to staff; threads open for replies where noted.
- #forge-log: staff top-level only; threads open.
- Others: open posting with tag and template guidance; Moderators can slowmode when needed.

## 3) Rituals

Hearthfire Roll Call (daily)

- Schedule: 10:00 PT in #project-orchestration
- Template: “Focus (1 sentence) | Commit (1 deliverable by EOD) | Blockers (if any)”
- Threading: Brewmaster posts the top-level prompt; all replies go into the single daily thread labelled with date (YYYY-MM-DD).
- EOD (by 17:30 PT): Brewmaster posts a 3–6 bullet digest (wins, slips, carries) in the same thread; tag Domain Owners as needed.

Mine Mood Integration

- Process:
  - By 09:50 PT: Epsilon proposes label + one-line vibe to Theta via DM or #project-orchestration internal note.
  - 10:00 PT: Theta posts the Mine Mood alongside the Roll Call.
- Format: “Mine Mood: <Name> — <5-word vibe>”
- Fallback: If no proposal by 10:05 PT, default to “Stillshift — steady hands, quiet picks” and log the miss.
- Lexicon: Living list of Mine Mood names and short descriptors tracked here: docs/narrative/founding-lore.md
- Community input: Emoji votes in daily thread suggest additions; Theta curates monthly.

Weekly Beats

- Friday 12:30 PT: Lunchline Live — short demo/clip or GIF + Q&A thread in #build-in-public; recap cross-posted to #announcements with top-3 takeaways and links.

## 4) Two-Week Content Calendar (Sprint 1)

Notes
- D+0 is Sprint Day 0 (Monday). Adjust exact calendar dates on sprint start.
- Daily Mine Mood + Roll Call at 10:00 PT by Theta unless noted.
- Each item includes Owner, Post Time (PT), CTA, and Asset/ID checklist.

Week 1 (D+0–D+4)

- D+0 (Mon)
  - Daily: Mine Mood + Roll Call (Owner: Theta, 10:00)
    - CTA: Reply in thread with Focus | Commit | Blockers.
    - Assets/IDs: N/A
  - Sprint goal pin + channel map refresher (Owner: Theta, 11:30, #announcements)
    - CTA: React with ✅ after reading; ask setup questions in #tavern-talk.
    - Assets/IDs: docs/community/engagement-playbook.md; Channel list snippet; sprint goals bullet list (paste)
- D+1 (Tue)
  - Build-in-Public clip (Alpha/Beta focus) (Owner: Alpha or Beta, 12:15, #build-in-public)
    - CTA: Drop thoughts in #feedback-forge with [worldgen]; include seed if applicable.
    - Assets/IDs: clips/w1-d1-worldgen-seams.mp4; PR link(s); seed IDs: 1247, 3301; refs: data/art/color-palette.json
- D+2 (Wed)
  - Midweek Poll: Feel of mining hits (rock vs copper) (Owner: Epsilon, 13:00, #tavern-talk)
    - CTA: Vote and comment with sound ID favorites; tag [audio].
    - Assets/IDs: data/audio/sound-manifest.json -> sfx_mine_hit_rock_v1/v2, sfx_mine_hit_copper_v1/v2; short GIF of strike
- D+3 (Thu)
  - Build-in-Public clip (Gamma/Delta focus) (Owner: Gamma or Delta, 12:15, #build-in-public)
    - CTA: In #feedback-forge, start a thread with [combat][tools] on timing/readability.
    - Assets/IDs: clips/w1-d3-combat-tools-tune.gif; PR #512; branch feature/combat-timing; inputs: docs/community/build-in-public-template.md
- D+4 (Fri)
  - Lunchline Live (Owner: Theta host; rotating demo by Domain Owner, 12:30, #build-in-public)
    - CTA: Post questions in the event thread; upvote topics to prioritize answers.
    - Assets/IDs: event banner assets/community/lunchline-live.png; stream link (Discord Stage); notes doc link
  - End-of-week digest (Owner: Theta, 16:30, #announcements)
    - CTA: React with 🪓 if read; reply with 1 clip you want expanded next week.
    - Assets/IDs: top-3 PRs; top-5 feedback threads; Mine Mood recap links

Week 2 (D+5–D+9)

- D+5 (Mon)
  - Daily: Mine Mood + Roll Call (Owner: Theta, 10:00)
  - Lore spotlight: Orecasters (Owner: Epsilon, 11:45, #lore-inkwell or #announcements if lounge absent)
    - CTA: In #feedback-forge, tag [lore] with 1 tooltip snippet idea (≤120 chars).
    - Assets/IDs: docs/narrative/founding-lore.md (section: Orecasters); lore_tooltips_v0.csv
- D+6 (Tue)
  - UI HUD peek (Eta wireframe) (Owner: Eta, 12:00, #build-in-public)
    - CTA: Start a [ui] thread on legibility at 85% scale; include monitor DPI or device info.
    - Assets/IDs: ui/wireframes/hud_v2.png; figma link; font IDs from data/art/color-palette.json typography notes
- D+7 (Wed)
  - Audio bed A/B (amb.tavern vs mine_l1) (Owner: Epsilon, 13:00, #audio-bellows or #build-in-public)
    - CTA: Vote A or B; in #feedback-forge tag [audio] with 1 context where it excels/fails.
    - Assets/IDs: data/audio/sound-manifest.json -> amb_tavern_v1, amb_mine_l1_v2; 30s MP3 snippets
- D+8 (Thu)
  - Build-in-Public clip (integration slice) (Owner: Alpha+Gamma pair, 12:15, #build-in-public)
    - CTA: Report issues in #feedback-forge with [bugs]; include repro steps and build hash.
    - Assets/IDs: clips/w2-d4-integration-slice.mp4; build hash: 0.9.0-alpha+2023; PRs: #540 #541; repro template link below
- D+9 (Fri)
  - Lunchline Live (Owner: Theta host; demo by Delta/Eta, 12:30, #build-in-public)
    - CTA: Ask 1 question live; vote on next sprint’s focus poll at end.
    - Assets/IDs: event banner assets/community/lunchline-live.png; clip/gif of feature; poll link stub
  - Sprint wrap thread + survey link stub (Owner: Theta, 16:30, #announcements)
    - CTA: Complete 3-min survey; reply with top 1 win and 1 wish.
    - Assets/IDs: survey stub (forms/sprint1-retro-draft); top-5 feedback decisions; velocity snapshot

## 5) Moderation & Code of Conduct (CoC)

Tenets

- Dwarven kindness: assume good intent; be welcoming to newcomers.
- Constructive craft: critique the work, not the worker; be specific and actionable.
- No slurs or hate speech, zero tolerance.
- Tasteful alcohol references only; no encouragement of harmful behavior.
- Spoilers must be tagged and placed behind spoiler formatting.
- No promises of drops/rates or misleading representations of rewards.

Enforcement ladder

- Step 1: Gentle nudge (public or DM) with guidance and link to CoC.
- Step 2: Thread guide — move or split threads; apply proper tags and templates.
- Step 3: Temporary timeout (up to 24–72h) with written rationale logged.
- Step 4: Admin review for bans or longer actions; consensus among Moderators + Theta.

Reporting

- DM @Moderators or use /report (when enabled).
- Escalation path: Moderator on duty → Moderator lead → Theta (final arbiter).
- Moderator log: timestamp, user, issue, action, link, follow-up date.

## 6) Feedback Triage SOP

Where and how

- Location: #feedback-forge
- One topic per thread; enforce tags at the start of the title using the taxonomy:
  - [combat], [worldgen], [ui], [audio], [lore], [tools], [bugs]
- Use the starter post template below; attach clips/saves as needed.

SLA

- Acknowledge within 24 hours by the Domain Owner or Theta.
- Triage within 48 hours into one of:
  - backlog (accepted, not this sprint)
  - sprint-consider (evaluate for current sprint scope)
  - needs-repro (request more info or steps)
  - closed (duplicate, out-of-scope, or resolved)

Tracking

- Lightweight sheet columns:
  - date, tag(s), summary, owner, status, link (Discord thread/PR), decision
- Weekly surfacing: Top-5 items (by community impact/feasibility) highlighted in Friday digest.

Starter post template (copy-ready)

```
Title: [<tag>] <short, specific title>
Body:
• Summary: <1–2 sentences, include context>
• Steps/Repro: <numbered steps, include seed/build hash if relevant>
• Expected vs Actual: <concise contrast>
• Attachments: <clips, screenshots, save/seed, logs>
• System/Build: OS/GPU (if relevant), build hash
• Priority: low | medium | high
```

## 7) Onboarding & Welcome Flow

Reference

- Sequence file: data/community/welcome-sequence.json
  - 5 steps: welcome, rules/CoC, how to contribute, current sprint, feedback guide

Manual SOP (until bot)

- Theta posts a welcome greet in #tavern-talk when a new member joins (mention username, invite to react for @Playtesters).
- Theta DMs step 1 of the sequence, linking:
  - CoC summary and channel map
  - docs/community/engagement-playbook.md (this doc)
  - docs/community/build-in-public-template.md
  - docs/narrative/founding-lore.md (for Mine Mood lexicon)
- Pin references in #tavern-talk for easy access.
- React role: Newcomers add ⚒️ in #tavern-talk to receive @Playtesters.

Future automation

- Wire JSON sequence to the welcome bot; run test in staging first.
- Metrics: percentage reaching step 3 (how to contribute) within 24h; track opt-ins to @Playtesters.

## 8) Automation & Scheduling Plan

Tools

- Use Discord scheduled events and scheduled messages where available.
- Manual checklists as fallback; keep a daily log (Google Doc or Notion).

Daily checklist (09:45–10:15 PT)

- 09:45: Confirm Mine Mood from Epsilon; if absent, prepare Stillshift fallback.
- 10:00: Post Mine Mood + Hearthfire Roll Call in #project-orchestration.
- 10:05–10:15: Log participants; DM gentle nudges to missing core team; set reminder for EOD digest at 17:15.

Posting helpers

- Use docs/community/build-in-public-template.md for all dev updates.
- Keep short links to assets ready; verify IDs against:
  - data/audio/sound-manifest.json
  - data/art/color-palette.json

## 9) Templates (inline, copy-ready)

Hearthfire Roll Call (top post, max 3 lines)

```
Mine Mood: <Name> — <5-word vibe>
Hearthfire Roll Call (reply in thread): Focus | Commit | Blockers
Note: EOD digest at 17:30 PT — keep commits realistic, axes sharp.
```

EOD Digest (3–6 bullets)

```
EOD Digest — <YYYY-MM-DD>
• Wins: <top 1–2 concrete outcomes w/ links>
• Slips: <brief note, no blame, link if relevant>
• Carries: <items moving to tomorrow, owner named>
• Feedback: <top thread(s) surfaced, decision state>
• Shoutouts: <1–2 contributors/community boosts>
```

Feedback thread starter (for #feedback-forge)

```
Title: [<tag>] <short, specific title>
Body:
• Summary: <1–2 sentences>
• Steps/Repro: <numbered steps; include seed/build hash>
• Expected vs Actual: <clear contrast>
• Attachments: <clips/screens/logs>
• System/Build: <OS/GPU/Build hash>
• Priority: low | medium | high
```

Cross-links

- Build-in-public template: docs/community/build-in-public-template.md
- Mine Mood lexicon: docs/narrative/founding-lore.md
- Audio IDs: data/audio/sound-manifest.json
- Color/typography references: data/art/color-palette.json

## 10) Risks & Mitigations

- Risk: Delayed Mine Mood proposal
  - Mitigation: Default to Stillshift at 10:05; log miss; Epsilon/Theta retro weekly to prevent recurrence.
- Risk: Clip asset delays
  - Mitigation: Use GIF fallback or text + PR links; set 24h buffer asks for Domain Owners; maintain a “spare clip” folder.
- Risk: Off-hours moderation gap
  - Mitigation: Draft a UTC rota; recruit 1–2 community volunteers; enable slowmode overnight as needed.
- Risk: Thread sprawl in #feedback-forge
  - Mitigation: Moderators merge duplicates; weekly tag audit; pin template.
- Risk: Low roll-call participation
  - Mitigation: Friendly pings + spotlight wins in digests; keep prompts tight; rotate a fun mini-prompt on Fridays.

## 11) Review & Iteration Plan

- Mid-sprint retro (end of D+6):
  - Review rituals (Roll Call, Mine Mood cadence), participation metrics, and SLA adherence.
  - Adjust content calendar for D+7–D+9 based on asset readiness and feedback density.
- Versioning:
  - Publish v0.2 with SLA tweaks or channel adjustments if needed; update #announcements pin.
- Post-sprint:
  - Compile metric snapshot (ack times, roll-call counts, clip cadence, onboarding completion).
  - Propose Sprint 2 refinements (automation level, additional lounges, expanded templates).

— Signed with a steady hand and a warm mug,  
Brewmaster Alehart (Theta)