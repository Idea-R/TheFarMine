# Community Engagement Playbook — Hearth, Hammer, and Good Order (Sprint 1)

Provenance
- Owner: @theta (Community — Brewmaster Alehart)
- Voice: Warm and crisp, straight as a pick handle.

Cross-References
- docs/community/build-in-public-template.md
- data/community/welcome-sequence.json (forthcoming)
- docs/combat-systems/combat-design.md
- docs/technology-systems/crafting-design.md
- docs/world-generation/cave-gen-algorithm.md
- docs/audio-systems/audio-design.md


## 1) Principles & Tone

- We are a family of co-creators: respectful, sturdy, and curious.
- Clear lanes: channels and tags keep our tunnels tidy.
- Fast acknowledgement: every voice gets a nod; no echoing voids.
- Kind moderation: correct softly, praise loudly, enforce fairly.
- Build-in-public honesty: we share wins, warts, and why.

Accessibility: Always include alt-text for images and ≤10s clips; prefer high-contrast, readable formatting, and clear, descriptive subject lines with bracket-tags for screen reader friendliness.


## 2) Channel Map (authoritative; use {{channel.*}} tokens)

Channel: {{channel.announcements}}
- Purpose: One-way notices from the team; the weekly update header lives here.
- Allowed Content: Release notes, playtest calls, schedule shifts, policy updates.
- Keeper Notes: Only Moderators/Devs post; reactions ON; thread replies OFF.
- Posting Cadence: Weekly Tuesday update (18:00 UTC) + as-needed notices.
- Pin Policy: Pin the current week’s header; unpin prior week when new header posts.

Channel: {{channel.build_in_public}}
- Purpose: Dev updates and discussion threads; use the template.
- Allowed Content: Progress clips, diagrams, checklists, milestone notes, replies.
- Keeper Notes: Start one new thread per week using the template; keep opener updated.
- Posting Cadence: Weekly thread synced to Tuesday update.
- Pin Policy: Pin the weekly thread opener until next week.

Channel: {{channel.tavern_talk}}
- Purpose: General chat; community hearth.
- Allowed Content: Screenshots, ≤10s clips, friendly chatter, short questions.
- Keeper Notes: Encourage threads for hot topics; keep spoiler warnings upfront.
- Posting Cadence: Free-flow; set slowmode (5s) if pace spikes.
- Pin Policy: Pin a rotating “How to Help This Week” message during peak events.

Channel: {{channel.feedback}}
- Purpose: Structured feature feedback and ideas.
- Allowed Content: Posts using bracket-tags and the provided template.
- Keeper Notes: Require bracket-tags in subject; move bug repros to {{channel.bug_reports}} when clear.
- Posting Cadence: Continuous; triage every Thu 18:00–18:30 UTC.
- Pin Policy: Pin “How to post feedback” and the template snippet.

Channel: {{channel.playtests}}
- Purpose: Playtest calls, sign-ups, builds, session details.
- Allowed Content: Call posts, schedules, links, voice/text coordination, results summaries.
- Keeper Notes: Use reaction legend on each call post; lock thread after session wrap.
- Posting Cadence: Call on Fri; session Sat 16:00–18:00 UTC (Sprint 1).
- Pin Policy: Pin the current week’s call; unpin after debrief post.

Channel: {{channel.bug_reports}}
- Purpose: Formal bug intake with reproducible steps.
- Allowed Content: [bug] posts with Expected vs Actual, system info, minimal clips.
- Keeper Notes: Enforce repro steps; combine dupes via link and close as duplicate.
- Posting Cadence: Continuous; acknowledge within 24h; triage on Thu.
- Pin Policy: Pin posting template and “How to capture a 10s clip + alt-text.”

Channel: {{channel.welcome}}
- Purpose: Bot-led onboarding and first steps.
- Allowed Content: Welcome flow, rules, FAQs, simple intro messages.
- Keeper Notes: Powered by {{bot.welcome.id}} sequence; keep replies tidy; direct questions to {{channel.tavern_talk}} or {{channel.feedback}}.
- Posting Cadence: Auto on join; steward greetings within 12h.
- Pin Policy: Pin rules, FAQ stub, and “Start Here” message.

Compact mapping: channel → primary bracket-tags
- {{channel.announcements}} → [playtest], [lore], [accessibility]
- {{channel.build_in_public}} → [combat], [worldgen], [crafting], [ui], [audio], [lore]
- {{channel.tavern_talk}} → [lore] (optional; tags not required)
- {{channel.feedback}} → [combat], [worldgen], [crafting], [ui], [audio], [accessibility]
- {{channel.playtests}} → [playtest] (+ target tags as needed)
- {{channel.bug_reports}} → [bug] (+ domain tags as needed)
- {{channel.welcome}} → [accessibility] (when relevant)


## 3) Bracket-Tag Lexicon (authoritative)

- [combat]: Damage, poise, telegraphs, parries, stamina, enemy AI behavior. Use for mechanics or balance.
- [worldgen]: Cave layout, ore veins, door bands, biome distribution, seed behavior.
- [crafting]: Stations, recipes, tools, durability, materials, progression via crafting.
- [ui]: HUD, menus, input mapping, readability, control prompts, accessibility UI.
- [audio]: SFX, ambience, music layers, mix, spatial cues, volume norms.
- [lore]: Narrative elements, world flavor, naming, item descriptions, toasts.
- [bug]: Reproducible defects; always include repro steps and system info.
- [playtest]: Calls, sign-ups, schedules, goals for sessions, debriefs.
- [accessibility]: Alt-text, color/contrast, input options, captions, content warnings.

Example subject lines (good practice)
- [crafting] Copper pick feels slow vs rock 3
- [combat] Parry window unclear on axe brute heavy swing
- [worldgen] Iron veins sparse near door bands on seed 91A
- [ui][accessibility] Tooltip text too small at 1080p (85% UI scale)


## 4) Rituals & Cadence (UTC)

- Weekly Build-in-Public (Tue 18:00 UTC)
  - Short Post: {{channel.announcements}}
  - Thread: {{channel.build_in_public}} (use docs/community/build-in-public-template.md)
  - Cross-link: Drop a friendly pointer in {{channel.tavern_talk}} with one-liner summary.

- Triage Hour (Thu 18:00–18:30 UTC)
  - Mods/Devs sweep new feedback and bugs, acknowledge outstanding posts, update statuses, and post a short “Triage Summary” reply in {{channel.feedback}}.

- Open Playtest Window (Sat 16:00–18:00 UTC)
  - Call posted on Fri with 3–5 targeted asks.
  - Reaction legend on call post: ✅ can attend, ❌ can’t, 🧪 can focus test, 📹 will clip, 🐞 found bug (after session thread).

- Monthly Lore Toast (future hook)
  - Placeholder beyond Sprint 1; proposed first Friday of each month, 17:00 UTC.


## 5) Moderation Guidelines (code of conduct + enforcement)

Conduct
- Be civil; no harassment, hate speech, personal attacks, or dogpiles.
- Critique ideas, not people; be kind, concrete, and specific.
- Spoiler etiquette: mark major plot/mechanics reveals; use threads for spoilers.
- Media length: ≤10s per clip unless staff request more; include alt-text.
- Alt-text required for all images/clips; warn for flashing or intense audio.

Enforcement steps (escalate as needed)
- Gentle nudge: “Hey, friend—please add alt-text to that clip. Thanks!” (example: missing alt-text; mild off-topic in {{channel.tavern_talk}}).
- Formal warning: “This is a formal warning: keep critiques on the idea and skip the jabs.” (example: snide remarks at a player’s skill).
- Cooldown: 24–72h timeout with note logged. (example: repeated thread-derails after warning.)
- Ban (severe/zero tolerance): immediate for slurs, doxxing, threats, NSFW. Keep evidence, notify @theta.

Roles and permissions
- Keeper (Brewmaster): @theta — full permissions; can pin, slowmode, lock, announce, adjust SLAs.
- Moderators: {{role.mod.id}} — can pin, slowmode, lock, move posts, set channel topics, enforce steps.
- Stewards (trusted helpers): may tag owners, remind templates, mark emojis for ack; cannot lock or ban.

Escalation path
- Page a core dev when: crash data needed, security/exploit risk, or blocker during live playtest. Tag the domain owner (see Routing Map) and move into a thread.
- Hot topics: if replies >20/min or tone degrades, enable slowmode (10–30s), summarize, and move to a single thread or schedule a cooldown per enforcement ladder.


## 6) Feedback & Triage Workflow (SLA-backed)

Intake
- Players post in {{channel.feedback}} with bracket-tags and the template.

Acknowledge (≤24h)
- A Mod/Steward reacts with an emoji state and replies if clarification needed.

Route (≤48h)
- Tag the domain owner in-thread (e.g., @gamma for [combat]). If accepted for tracking, link the internal ticket/PR, or note “queued” for backlog.

Close-the-loop
- When shipped or resolved, reply in the original thread with a brief note and add 👍 shipped.

Compact emoji legend (states)
- 🧭 confirmed bug — Reproduced by staff; moving to tracker.
- 💡 idea — Feature/UX suggestion; under review.
- 🧪 needs test — Needs targeted playtest or more data.
- ❓ needs info — Awaiting details from reporter.
- 📌 routed — Tagged domain owner; under triage.
- 🔧 in progress — Actively being worked on.
- 👍 shipped — Landed in a public build.
- 💤 parked — Not in scope for Sprint 1 (may revisit).


## 7) Posting Templates (copy blocks)

Feedback Post (player)
Subject example: [crafting] Copper pick feels slow vs rock 3
```
[crafting] <short topic>
Build/date: e.g., 0.1.3 (2026-02-18)
What happened:
What you expected:
Repro steps:
1)
2)
3)
Clip (≤10s) + alt-text: <link> — alt: <describe what’s visible/audible and outcome>
System/browser: OS, GPU, CPU, RAM; or Browser + version
```

Bug Report (player)
```
[bug][<domain>] <short topic>
Build/date: e.g., 0.1.3 (2026-02-18)
Severity: crash/blocker/major/minor/cosmetic
Environment: OS, GPU, CPU, RAM; display; peripherals
Expected:
Actual:
Repro steps:
1)
2)
3)
Clip (≤10s) + alt-text: <link> — alt: <describe the failure and on-screen cues>
Logs (if available): <link or snippet>
```

Mod Acknowledgement (staff)
```
Thanks for the clear report! Marking 🧪 needs test and looping in @<owner> within 48h. We’ll follow up here; if we confirm, we’ll link the ticket and track to 👍 shipped.
```


## 8) Build-in-Public Process (staff how-to)

Reference
- Use docs/community/build-in-public-template.md for the weekly thread structure.

Checklist summary
- Gather 1–3 short clips (≤10s) with alt-text; add a one-liner per clip.
- Start the weekly thread in {{channel.build_in_public}}; pin the opener.
- Add reaction legend to header: ✅ want more, ❓ unclear, 🐞 spotted issue, 💡 idea spark.
- Tag domain owners for sections (e.g., [worldgen] → @beta).
- Post a brief header in {{channel.announcements}} linking the thread.
- Cross-link a friendly summary in {{channel.tavern_talk}}.
- Schedule a Thu triage reminder for items surfaced in replies.


## 9) Playtest Protocol

Sign-up flow ({{channel.playtests}})
- Post call on Fri with session window (Sat 16:00–18:00 UTC), build link, goals, and target tags.
- Use reaction legend on call post: ✅ can attend, ❌ can’t, 🧪 can focus test, 📹 will clip, 🐞 found bug (after session summary).

Focused tasks
- Ask for 3–5 specific goals (e.g., “Mine iron veins near door bands,” “Test parry window vs axe brute,” “Try two crafting station recipes”).

Clips and alt-text
- Keep captures ≤10s; include alt-text describing action, context, and outcome; flag flashing lights or loud spikes.

Crash reporting
- If you crash: note timestamp, steps just before, attach logs if possible; file in {{channel.bug_reports}} with [bug] and session tag [playtest].

Long-form notes
- Drop extended write-ups as a thread under the call post or in {{channel.feedback}} with relevant tags.

Consent
- Public community; no NDA; spoiler-safe captures; staff may quote anonymized feedback in update notes.


## 10) Automation & Tooling (MVP notes)

Welcome Bot
- Trigger: data/community/welcome-sequence.json
- Behavior: {{bot.welcome.id}} posts a 5-step sequence with links to {{channel.welcome}}, {{channel.tavern_talk}}, {{channel.feedback}}, {{channel.build_in_public}}, and the tags guide.

Reaction roles (future)
- Opt-in pings: [playtest], [accessibility], [lore], [news] (to be mapped to stable roles).
- Placeholder IDs: {{role.mod.id}}, {{role.steward.id}}, {{role.playtest.id}}, {{role.news.id}}

Slash snippets (future)
- /feedback-template → Inserts feedback code block.
- /bug-template → Inserts bug report code block.

Ops placeholders
- Bot/App IDs: {{bot.welcome.id}}, {{bot.utility.id}}
- Fill these in deployment notes; do not alter token names in this doc.


## 11) Metrics & Review (weekly)

Minimal sheet fields
- New joins
- First-post rate (% of new joins posting within 72h)
- Feedback count
- Ack ≤24h rate
- Routed ≤48h rate
- Playtest participants
- Clips posted (≤10s with alt-text)
- Top tags by volume

Source and ritual
- Source: Discord Insights + manual counts from {{channel.feedback}} and {{channel.playtests}}.
- Review: 15-minute pass during Thu triage; note 1–2 actions for next week in the triage summary.


## 12) Domain Owners & Routing Map (Sprint 1)

Tag owners
- @alpha — core/ECS
- @beta — worldgen
- @gamma — combat
- @delta — crafting/tech
- @eta — visuals/UI
- @zeta — audio
- @epsilon — narrative
- @theta — community

Routing tip
- If uncertain, tag @theta and the most likely owner; we’ll redirect and note 📌 routed.


## 13) Onboarding Journey (ties to welcome JSON)

Path
1) Arrival → {{channel.welcome}}: bot sequence introduces rules and how to post.
2) Read rules (pinned) and FAQ stub (pinned: “FAQ — First Mug’s Worth”).
3) Say hello in {{channel.tavern_talk}} with a screenshot or favorite mining tale.
4) (Future) React to pick a ping role, e.g., [playtest].
5) Drop your first thought in {{channel.feedback}} using bracket-tags and the template.
6) Watch the Tuesday update: header in {{channel.announcements}}, thread in {{channel.build_in_public}}.

Quick links
- FAQ (stub): pinned in {{channel.welcome}} — includes posting norms, alt-text guide, and tag lexicon.
- Build-in-public: weekly thread pinned in {{channel.build_in_public}}.


## 14) Content Calendar (first 4 weeks, suggestions)

- Week 1: Three‑Wide Law explainer + ore gates; request mining clips with [worldgen][crafting].
- Week 2: Combat telegraphs + poise; run a “parry ring” hunt with [combat].
- Week 3: Crafting stations tour; peek at recipe JSON with [crafting][ui].
- Week 4: Ambience layers demo; lamp anchors walk with [audio][lore].


## 15) Acceptance & Maintenance

Acceptance checklist (Sprint 1 ready)
- Channels defined with Purpose/Allowed/Cadence/Pin Policy.
- Bracket-tag lexicon present and referenced in templates.
- Emoji legend for states posted and used in triage.
- SLAs stated: ack ≤24h, route ≤48h, close-the-loop on ship.
- Rituals calendared (Tue/Thu/Sat) with clear cross-linking.
- Copy-pasteable templates provided.
- Domain owners mapped; routing guidance clear.
- Metrics fields listed; weekly review slotted.

Change process
- Update via PR; summarize material changes (SLAs, rituals, moderation policy) in {{channel.announcements}} and refresh pins in {{channel.welcome}} and {{channel.feedback}}.