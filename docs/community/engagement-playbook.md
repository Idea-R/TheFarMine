# The Far Mine — Community Engagement Framework (Sprint 1)

Owner: Brewmaster Alehart (Theta)  
Version: v1.0 — 2026-02-18

## 1) Title & Scope
- Scope: MVP vertical slice comms for a focused 2-week window. Prioritizes Discord activation, daily rituals, light automation with manual SOPs, and tight coordination with domain leads. Optimized for fast feedback, visible progress, and low-friction moderation.

## 2) Goals & North Stars
- Goals:
  - Fast feedback loops (ack within 24h; route within 12h)
  - Daily focus alignment via Roll Call + Mine Mood
  - Visible progress (build-in-public artifacts weekly)
  - Welcoming onboarding (newcomer guided within 6h)
  - Low-friction moderation (clear nudges; minimal overhead)
- Success signals:
  - Roll Call participation rate (daily ≥70% of active)
  - Response SLA hit rate ≥90%
  - Newcomer 48h retention ≥60%
  - Weekly highlights posted every Fri (0 misses)

## 3) Channel Map (purpose, who posts, cadence)
- #tavern-talk
  - Purpose: Public social chat; casual community hangout.
  - Allowed: Light chat, prompts, safe memes; no spoilers w/o tags.
  - Pins: Top prompts, weekly highlights, rules.
  - Mod: Gentle steer; spoiler tags enforced; tone warm.
  - Cadence: Brewmaster thread prompts 3x/week.

- #project-orchestration
  - Purpose: Production heartbeat; Roll Call + Mine Mood; EOD digests.
  - Allowed: Daily status, coordination replies; no off-topic.
  - Pins: Ritual templates, current sprint goals.
  - Mod: Keep on-topic; thread per day.
  - Cadence: Theta daily at 10:00 PT; EOD 17:30–18:00 PT.

- #build-in-public
  - Purpose: Weekly dev clips/screens; small PR spotlights.
  - Allowed: WIP clips (≤45s), screenshots, thread recaps, PR links.
  - Pins: Latest weekly post + template.
  - Mod: Ensure context + ask; spoiler tags for late-game.
  - Cadence: 1–2 posts/week; Theta templates threads.

- #feedback-triage
  - Purpose: Intake feature/bug ideas; tagging + routing.
  - Allowed: Templated posts; short repro clips; sketches.
  - Pins: SOP + tag legend + example.
  - Mod: Enforce template; merge dupes; redirect chatter to threads.
  - Cadence: Continuous; Theta sweeps 2x/day.

- #patch-notes (read-only)
  - Purpose: Release notes on merges/releases.
  - Allowed: Maintainers only (Theta/Ironforge).
  - Pins: Latest release + index.
  - Mod: Read-only; react-only.

- #art-audio-showcase
  - Purpose: Zeta/Eta WIPs; weekly palette/SFX polls.
  - Allowed: WIPs, polls, short clips; credit sources.
  - Pins: Current polls + asset sheet links.
  - Mod: SFW assets only; crediting required.

- #lore-sparks
  - Purpose: Epsilon’s lore hooks; Mine Mood lexicon curation.
  - Allowed: Short hooks, vocab, player sayings.
  - Pins: Lexicon link; submission format.
  - Mod: No major spoilers; tag [Spoiler] if needed.

- Private working channels (if used)
  - #alpha-core — Core systems sync; PR links; sprint board.
    - Allowed: Dev notes, clips; on-topic only. Pins: sprint goals. Mod: Builder-lead.
  - #beta-worldgen — Worldgen seeds, metrics, knobs.
    - Allowed: Seeds, diffs. Pins: current seeds. Mod: Beta lead.
  - #gamma-combat — Combat timings, telegraphs.
    - Allowed: Gifs, frames, traces. Pins: timing sheet. Mod: Gamma lead.
  - #delta-tools — Editor/tools UX + scripts.
    - Allowed: Tool drops, docs. Pins: tool index. Mod: Delta lead.
  - #eta-visuals — VFX/UI art drops.
    - Allowed: Renders, palettes. Pins: style guide. Mod: Eta lead.
  - #zeta-audio — SFX/music WIPs.
    - Allowed: Wavs/mp3, stems. Pins: audio map. Mod: Zeta lead.
  - #epsilon-lore — Lore docs/hooks.
    - Allowed: Drafts, glossary. Pins: canon index. Mod: Epsilon lead.
  - #theta-reports — Metrics, SLAs, cadences.
    - Allowed: Dashboards, notes. Pins: weekly report. Mod: Theta.

## 4) Roles & Permissions
- Roles:
  - @Guildmate (default), @Delver (playtester opt-in), @Barkeep (mods), @Builder (devs), @Domain Leads (Alpha/Beta/Gamma/Delta/Epsilon/Zeta/Eta/Theta), @Announce (ping-limited).
- Permissions:
  - Read-only posts (#patch-notes): Theta, Ironforge, Domain Leads.
  - Thread creation: All except in read-only; default encouraged.
  - Pinning: Barkeep, Theta, Domain Leads.
  - @Announce: Theta + Domain Leads only; max 1 ping/day server-wide.

## 5) Daily Rituals
- Hearthfire Roll Call (10:00 PT in #project-orchestration)
  - Template: “Focus | Commit | Blockers” (one-liner each). New thread per day.
  - Owner: Theta; fallback macro if Theta AFK. Async replies allowed until 14:00 PT.
  - EOD Digest: 17:30–18:00 PT — bullets: wins, slips, blockers escalated.
- Mine Mood (approved process)
  - By 09:50 PT: Epsilon proposes label + 5‑word vibe; Theta posts 10:00 PT.
  - Default (10:05 PT no proposal): “Stillshift — quiet seam.”
  - Lexicon: docs/narrative/founding-lore.md; Emoji voting: 👍 adds to lexicon at ≥7 votes in 24h; ties resolved by Epsilon.

## 6) Two‑Week Content Calendar (Sprint 1 window)
- Week 1
  - Mon: Kickoff pin; Mine Mood + Roll Call; feedback thread for room templates.
    - Owner: Theta; Asset LT: n/a; Window: 10:00–10:15 PT; Fallback: reuse prior sprint kickoff copy.
  - Tue: Build-in-public micro-clip (worldgen seed pass) + quick poll (lamp spacing feel).
    - Owner: Beta + Theta; Asset LT: 24h (clip by Mon 16:00); Window: 11:30–12:00 PT; Fallback: seed screenshots + poll.
  - Wed: Midweek Miner Q&A thread; spotlight: audio telegraph whoosh.
    - Owner: Zeta + Theta; Asset LT: 24h (whoosh wav/gif by Tue 16:00); Window: 12:00–12:30 PT; Fallback: waveform image + context.
  - Thu: Crafting peek (Reinforced Pickaxe data card); naming suggestions (10 slots).
    - Owner: Delta + Eta + Theta; Asset LT: 24h (data card by Wed 16:00); Window: 11:00–11:30 PT; Fallback: raw stats text + temp icon.
  - Fri 12:30 PT: Lunchtime Live share—greybox slice demo notes; screenshot thread; recap post EOD.
    - Owner: Alpha + Theta; Asset LT: 48h (build notes by Wed 12:00); Window: 12:30–13:00 PT + recap 17:45; Fallback: recorded clip + annotated shots.

- Week 2
  - Mon: Combat timing trace snippet; invite reaction feedback.
    - Owner: Gamma; Asset LT: 24h (trace image by Fri prior 16:00); Window: 10:30–11:00 PT; Fallback: frame timings table.
  - Tue: UI wireframe preview; palette vote emojis.
    - Owner: Eta; Asset LT: 24h; Window: 11:30–12:00 PT; Fallback: low-fi sketch + color swatches.
  - Wed: Lore hook—Three‑Wide Law proverb thread; collect player sayings.
    - Owner: Epsilon; Asset LT: 24h; Window: 10:45–11:15 PT; Fallback: short text-only hook.
  - Thu: Enemy focus—Goblin Grunt telegraph gif; ask readability notes.
    - Owner: Gamma + Zeta; Asset LT: 48h; Window: 12:00–12:30 PT; Fallback: sprite sheet + audio cue mp3.
  - Fri: Sprint recap; community spotlight; next steps CTA.
    - Owner: Theta; Asset LT: gather all week via pins; Window: 17:30–18:00 PT; Fallback: text recap w/o media.

## 7) Feedback Intake & Triage SOP
- Intake template (required in #feedback-triage): [Area] [Brief] [Why it matters] [Repro/Sketch].
- Tag set:
  - area.{worldgen, combat, tools, ui, audio, lore}
  - state.{new, ack, queued, closed}
  - priority.{p1, p2, p3}
- Routing:
  - Theta assigns domain owner in-thread within 12h; owner acknowledges within 24h via emoji + 1–2 line note; state flips to ack/queued.
- Weekly sweep:
  - Top 5 items exported to #build-in-public Friday recap with outcomes/next steps.

## 8) Moderation Guidelines (lightweight)
- Code of conduct:
  - Be kind; critique ideas, not people.
  - Use spoiler tags for sensitive content.
  - SFW assets only; credit creators.
  - No DM harassment; report via mod ping.
- De-escalation: nudge → split thread → temp mute (12–24h) → admin escalate.
- Off-hours: temporary on-call rota with UTC coverage (Barkeep North America → Barkeep EU → Theta). Recruiting 1–2 volunteer Barkeeps.

## 9) Automation Plan / Manual SOP
- Automation (planned):
  - Welcome bot DM from data/community/welcome-sequence.json (5 steps).
  - Scheduled daily Mine Mood + Roll Call via bot/Scheduled Events.
  - Emoji reaction-to-tag for @Delver opt-in.
- Manual fallbacks (until bots land):
  - Prewritten Roll Call + Mine Mood macros posted at 10:00 PT.
  - Copy-paste EOD Digest template; fill from daily thread skim.
  - Human DM welcome using 5-step sequence.
- SLAs:
  - New member hello within 6h.
  - Feedback acknowledgement within 24h.
  - Weekly recap every Fri (no skip).

## 10) Templates & Snippets
- Roll Call (paste in #project-orchestration)
  ```
  Hearthfire Roll Call — {YYYY-MM-DD}
  Focus: …
  Commit: …
  Blockers: …
  (Reply in thread; one-liners. Async until 14:00 PT.)
  ```
- EOD Digest
  ```
  EOD Digest — {YYYY-MM-DD}
  Wins: • … • …
  Slips: • …
  Blockers escalated: • …
  Next: • …
  ```
- Asset Request (to devs/art/audio)
  ```
  Request: {asset name}
  Purpose/context: {1 line}
  Specs: {clip ≤45s mp4 1080p 30fps | img 1920x1080 png}
  Due: {date time PT} (lead-time ≥24h)
  Alt acceptable: {fallback}
  Thread link: {#channel/thread}
  ```
- Build-in-public thread skeleton: see docs/community/build-in-public-template.md

## 11) Metrics & Review
- Metrics:
  - Daily Roll Call participation (# posters)
  - Feedback queue size/age (median days open)
  - Newcomers greeted (count/6h SLA hit %)
  - Emoji votes on Mine Mood additions
  - Weekly unique posters (server-wide)
- Tooling: Basic spreadsheet + Discord server insights. Review cadence: Mondays 11:00 PT in #theta-reports; post summary to #project-orchestration.

## 12) Risks & Assumptions
- Risks & mitigations:
  - Domain owners overloaded → SLA misses; Mitigate: rotate on-call, delegate triage to Theta/Barkeep, scope smaller asks.
  - Automation delay → manual fatigue; Mitigate: macro library, scheduled reminders, recruit 1 helper.
  - Rituals feel performative to newcomers; Mitigate: explain “why” in pins, invite lightweight reactions, spotlight community contributions weekly.
- Assumptions: PT-friendly core hours; small active dev crew; assets can be produced within 24–48h when scoped to micro-clips/screens.