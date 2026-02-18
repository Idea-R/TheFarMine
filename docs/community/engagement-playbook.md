# Community Engagement Playbook — Hearth & Anvil (Sprint 1)

Owner: @theta (Community — Brewmaster Alehart)  
Cross-references:
- docs/community/build-in-public-template.md
- data/community/welcome-sequence.json
- docs/combat-systems/combat-design.md
- docs/technology-systems/crafting-design.md
- docs/world-generation/cave-gen-algorithm.md
- data/visual/color-palette.json (accessibility tokens)
- docs/audio-systems/audio-design.md (cross-domain examples)

---

## Purpose & Principles

- Kindness-first: we pour from a warm kettle—assume good intent, cool tempers fast.
- Ship-in-public: progress tastes better shared; default to transparent work-in-progress.
- Acknowledge-fast: quick nod beats perfect prose; reply in-thread within SLA.
- Route-by-domain: the right cask for the right brew; funnel to domain owners.
- Accessibility: everyone deserves a stool at the hearth; follow alt-text and quiet hours.

Promise for Sprint 1:
- Acknowledge suggestions within 24 hours; route to a domain owner within 48 hours.

---

## Channel Map (authoritative purposes + posting rules)

- {{channel.announcements}}
  - What belongs: staff-only updates, weekly Tuesday update, emergency notices, patch notes.
  - What doesn’t: discussion, Q&A, memes. It’s read-only.
  - Who posts: @brewmaster, @dev_master, designated @mods on rota with approval.
  - Etiquette: no @everyone outside Tue updates or hotfix; include concise summaries and links to threads; mark spoilers as ||spoilers||.

- {{channel.build_in_public}}
  - What belongs: weekly thread openers, WIP demos, dev replies, artifact links.
  - What doesn’t: general chat; move debates to thread replies or tavern.
  - Who posts: @dev with @brewmaster opener; community replies in-thread only.
  - Etiquette: reply-in-thread; archive by week; include alt-text for images/clips; use spoiler tags for unrevealed content.

- {{channel.tavern_talk}}
  - What belongs: general chat, light Q&A, links to active build-in-public threads and polls.
  - What doesn’t: bug reports or feature requests (redirect to {{channel.feedback}}).
  - Who posts: everyone; @mods keep the room hospitable.
  - Etiquette: reply-in-thread when linking topics; keep it SFW; use ||spoilers|| for major reveals; remind alt-text when posting media.

- {{channel.feedback}}
  - What belongs: feature ideas, bug reports, UX issues, art/audio/lore/perf notes. Use tags in first line: [idea], [bug], [ux], [art], [audio], [lore], [perf], and domain tags like [worldgen], [combat], [crafting], [ui].
  - What doesn’t: support for platform installs (use {{channel.playtests}} thread-of-the-build).
  - Who posts: everyone; @mods triage; @dev respond on domain items.
  - Etiquette: one topic per thread; short title, clear body; attach clips/images with alt-text; reply-in-thread only.

- {{channel.playtests}}
  - What belongs: signups, build links, known issues, platform tags [win], [mac], [web], build hashes.
  - What doesn’t: general feedback not tied to a specific build (redirect to {{channel.feedback}}).
  - Who posts: @dev for build drops; testers reply-in-thread per build.
  - Etiquette: use version/hash in titles; pin active build; include feedback form link; no spoilers without || ||.

- {{channel.mod_lounge}}
  - What belongs: rota notes, escalations, audit breadcrumbs, moderation decisions, retros.
  - What doesn’t: general dev chatter.
  - Who posts: @mods, @brewmaster, @dev_master, @bot automation logs.
  - Etiquette: document actions with message IDs; summarize live calls; keep threads tidy.

- {{channel.welcome}}
  - What belongs: bot-only greeter staging, rules overview, getting-started.
  - What doesn’t: member chat (locked).
  - Who posts: @bot only; @mods maintain pinned rules.
  - Etiquette: keep content short; link to {{channel.build_in_public}}, {{channel.feedback}}, {{channel.playtests}}.

---

## Weekly Rituals & Cadence (UTC)

- Tuesday 18:00 — Weekly Build-in-Public
  - Post in {{channel.announcements}} + create thread in {{channel.build_in_public}} (use template); teaser in {{channel.tavern_talk}}.
  - Checklist:
    - Pre (by @brewmaster, 17:45): confirm changelog bullets, visuals with alt-text, links to docs; schedule reminder (see Automation).
    - During (18:00–18:20): post announcement; open build thread; seed first 2–3 replies (combat/crafting/worldgen); monitor Qs.
    - After (by @dev leads, 18:20–24:00): reply to top questions; pin thread if momentum; archive last week.

- Thursday 17:00 — Feedback Triage Live (30 min)
  - Voice or async thread in {{channel.feedback}}; summarize outcomes.
  - Checklist:
    - Pre (16:45, @mods): filter new threads; label with reactions; prep handoff stubs.
    - During (17:00–17:30, @mods + @dev): confirm category; set 🧭/🧪/❔; assign owner; note repro needs.
    - After (by 18:00): post summary comment per thread; create tracker tickets if used; link back.

- Friday 16:00 — One-Question Poll in {{channel.tavern_talk}}
  - Close Sunday; announce result Monday.
  - Checklist:
    - Pre (15:45, @brewmaster): select poll template; verify options; ensure accessibility wording.
    - During (16:00): post poll; pin until Sunday; cross-link to relevant build thread.
    - After (Sun 20:00, @mods): close/unpin; Mon 12:00 share result snapshot.

- Rolling — Playtest Calls
  - When builds land, post call with version/hash and feedback form link.
  - Checklist:
    - Pre (by @dev): smoke test; draft known issues; generate build hash.
    - During (drop): post in {{channel.playtests}} with [win]/[mac]/[web]; pin; link form.
    - After (48h, @mods): digest feedback to {{channel.feedback}} threads; mark reactions.

Responsible roles per ritual: opener @brewmaster; triage @mods; domain replies @dev; automation @bot; overrides @dev_master.

---

## Moderation Standards & Guidelines

- Code of Conduct Summary
  - Be respectful; no harassment, slurs, or dogwhistles.
  - No spam or raids; spoilers labeled with || ||; SFW visuals only.
  - No doxxing; protect personal info; credit sources for art/audio/lore.

- Enforcement Ladder
  - Gentle nudge → Formal warning → 24h timeout → Ban.  
    Edge cases (threats, hate, sexual content) escalate immediately to @dev_master.

- Content Rules
  - Provide alt-text for images/videos; describe motion/UI/purpose briefly.
  - Avoid flashing/strobing content; caption clips where possible.
  - Reaction legend (staff use consistently):
    - 👍 shipped
    - 🧪 testing
    - 💡 idea
    - 🪓 mining
    - 🧭 bug confirmed

- Moderator Toolkit
  - Sample DM nudge:
    - “Heya—Brewmaster’s note: thanks for jumping in. Could you move that bug into {{channel.feedback}} with a [bug] tag and short repro? I’ll keep a stool warm for follow-ups. Cheers.”
  - Thread-merge policy: Merge only when topics are identical in scope/version; link old-to-new; preserve attributions.
  - Pinning rules: Pin only active build thread, current poll, or urgent notice; max 3 pins per channel; unpin within 72h or when superseded.

---

## Feedback Intake → Triage → Handoff (SLA)

- Intake (by reporters)
  - Post in {{channel.feedback}} with one topic per thread.
  - First line must contain a primary bracket tag: [bug] or [idea] (others allowed: [ux], [art], [audio], [lore], [perf], [worldgen], [combat], [crafting], [ui]).
  - Short title; body includes details; optional clip/image with alt-text.

- Acknowledgement (by rota @mods)
  - Within 24h: react and comment as needed.
    - 🧭 confirmed bug
    - 🧪 needs repro
    - ❔ needs info

- Routing Matrix (default owner; can be reassigned)
  - [worldgen] → @beta
  - [core/ecs] → @alpha
  - [combat/enemies] → @gamma
  - [crafting/mining] → @delta
  - [audio] → @zeta
  - [lore/narrative] → @epsilon
  - [ui/ux/accessibility] → @alpha with visibility to @theta

- Handoff Format (5-line summary; post in thread + team tracker)
  - Title:
  - Category: [bug]/[idea] + domain tags
  - Steps/Repro or Rationale:
  - Expected vs Actual:
  - Assets/Links: (clips with alt-text, logs, build hash)

- Resolution
  - Upon fix/decision: post closure note in original thread, tag reporter, and prefix title with ✅. Link to changelog/build thread if applicable.

---

## Tagging & Thread Taxonomy

- Canonical primary tags (first line, square brackets): [bug], [idea], [worldgen], [combat], [crafting], [ui], [audio], [lore], [perf].
- Secondary shorthand in body is fine with #hashtags (e.g., #pathfinding), but primary bracket tag is required.
- Thread title format examples:
  - “[bug][worldgen] Cave entrance spawns inside village fence (build a1f92c)”
  - “[idea][crafting] Smelter queue shows estimated time per ingot”
  - “[ux][ui] Tooltip obscures hotbar on 1280×720 windowed”
- Renaming policy: @mods may clarify titles for scope/version; keep original phrasing in body; add build hash when known.

---

## Accessibility Musts

- Alt-text guidance: 1–2 sentences. Describe what’s visible, relevant motion/UI, and purpose (“UI shows new pickaxe tier icon pulsing to indicate upgrade available”).
- Color tokens: reference by token names in data/visual/color-palette.json; do not paste hex codes.
- Caption short clips where possible; avoid flashing/strobing elements.
- Quiet hours: no @everyone pings outside Tuesday announcements and rare hotfix alerts.

---

## Roles & Rota (MVP)

- Roles
  - @brewmaster (owner)
  - @mods (rota)
  - @dev (domain owners and contributors)
  - @dev_master (override)
  - @bot (automation)

- MVP Rota (UTC; adjust as volunteers join)
  - 08:00–12:00 — Mod A
  - 12:00–16:00 — Mod B
  - 16:00–20:00 — Brewmaster/devs overlap for rituals
  - 20:00–00:00 — Mod C (volunteer ask)
  - 00:00–08:00 — Low-traffic: acknowledge within 8h; @bot auto-responses where possible.

- Escalation Tree and Response Targets
  - Content issues → on-duty @mods (target: 30m during rota, 8h overnight)
  - Technical disputes → domain @dev owner (target: 24–48h)
  - Safety/harassment → immediate @dev_master + @brewmaster (target: immediate action)
  - Automation failures → @bot maintainer (target: 4h during workday)

---

## Automation & Welcome Flow

- Reference: data/community/welcome-sequence.json
- Trigger: Member joins → @bot sends 5-message DM/channel sequence:
  1) Warm welcome + code of conduct summary.
  2) Quick intro prompt with example.
  3) How to give feedback (tag + one-topic-per-thread).
  4) Accessibility tips (alt-text, quiet hours).
  5) Links: {{channel.build_in_public}}, {{channel.feedback}}, {{channel.playtests}}.
- Scheduled Messages
  - Tue 17:55 UTC: weekly thread reminder in {{channel.build_in_public}} (staff-only visibility until 18:00, or post with “go live” copy at 18:00).
  - Fri 16:00 UTC: poll template post in {{channel.tavern_talk}} (toggleable).
- Logging
  - @bot writes audit breadcrumbs (joins, scheduled posts, command runs) to {{channel.mod_lounge}} with timestamps and message IDs.

---

## Metrics & Review (lightweight)

- Weekly tracked (simple sheet; export basic Discord insights):
  - New members
  - Welcome completion %
  - Thread replies (build-in-public)
  - Median acknowledgement time in {{channel.feedback}}
  - Poll participants
  - Playtest signups per build
- Ritual retro: 10-minute Friday check in {{channel.mod_lounge}} to list tweaks, blockers, and one improvement for next week.

---

## Templates & Snippets

- Build-in-Public (Short)
```
Title: Hearth & Anvil — Week N Highlights (build <hash>)
What’s new:
- <1–2 crisp bullets>
- <link to doc/PR if public>
Screens/Clips: <attach with alt-text>
What we’re chewing on next:
- <1 bullet per domain>
Ask us anything in-thread. 🫖
```

- Build-in-Public (Long)
```
Title: Hearth & Anvil — Week N Deep-Dive (build <hash>)
Highlights:
1) Combat: <summary> (docs/combat-systems/combat-design.md)
2) Crafting: <summary> (docs/technology-systems/crafting-design.md)
3) Worldgen: <summary> (docs/world-generation/cave-gen-algorithm.md)
Media (with alt-text): <attachments>
Open Questions:
- <question 1>
- <question 2>
Links: previous week thread, relevant PRs.
```

- 5-Line Handoff (copy into tracker + thread)
```
Title: <short, scoped>
Category: [bug]/[idea] + [domain]
Steps/Repro or Rationale: <clear steps or value prop>
Expected vs Actual: <concise>
Assets/Links: <clips (with alt-text), logs, build hash, doc refs>
```

- Mod Nudge DM
```
Heya! Thanks for the report. Could you pop that into {{channel.feedback}} with a [bug] or [idea] tag on the first line and a short title? One topic per thread helps the devs route fast. I’ll keep a stool free for follow-ups. 🍻 —Brewmaster
```

- Closure Note
```
✅ Closed: <reason/fix>. Landed in build <hash>. Thanks <@reporter> for the clear repro—added you to the changelog shoutouts. If it resurfaces, reply here and we’ll reopen.
```

- Poll Snippets (Sprint-Scoped)
```
Poll: Which crafting UI tweak helps most this week?
- Condensed smelter queue
- Live material deficit hints
- Tool durability color tokens (see data/visual/color-palette.json)

Poll: Preferred cave encounter pacing?
- Fewer, tougher enemies
- More, lighter skirmishes
- Dynamic based on ore tier

Poll: Audio feedback for mining crits—what’s clearer?
- Pitch-up chime
- Low thump + sparkle tail
- Haptic-style rhythmic click (for future controller)
```

---

## Incident Response & Edge Cases

- Spam Raid
  - Enable slowmode server-wide; lock {{channel.tavern_talk}} to members-only post or temporarily read-only.
  - Notify @dev_master and @brewmaster.
  - Post status in {{channel.announcements}} with timeframe and next update.
  - After: prune, ban sources, document in {{channel.mod_lounge}} with message IDs.

- Content Dispute
  - Move to DMs with involved parties; restate CoC; seek common ground or agree to pause.
  - Document summary and outcomes in {{channel.mod_lounge}}.

- Safety
  - Immediate timeout/ban for harassment or threats; retain message IDs and export logs.
  - Notify @dev_master; note actions in {{channel.mod_lounge}}.

---

## Acceptance Checklist

- Channels have clear purposes and etiquette defined.
- Weekly rituals scheduled with pre/during/after checklists and roles.
- SLAs explicit for acknowledgement (24h) and routing (48h).
- Routing matrix present with domain owners.
- Moderation standards, enforcement ladder, and reaction legend included.
- Accessibility guidance included; color tokens referenced, quiet hours defined.
- Automation flow and scheduled messages defined; logging to {{channel.mod_lounge}}.
- Metrics for weekly review outlined; retro scheduled.
- Templates and snippets provided; cross-doc tokens align with build-in-public and welcome docs.
- Ready to pin in {{channel.announcements}} and {{channel.mod_lounge}}.