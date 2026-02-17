# Build in Public — Weekly Thread Template (Sprint 1)

Provenance
- Owner: @theta (Community — Brewmaster Alehart)
- Steward’s note from the Brewmaster: Aye, friends—keep it crisp, keep it kind, and keep it threaded. Pour your progress like a good stout: clear head, warm body, and finish with a call for feedback.

Cross-References
- Rituals & Cadence: docs/community/engagement-playbook.md (§Rituals & Cadence)
- Links & Channels (source of truth): data/community/welcome-sequence.json
- UI Framework + token-only policy: docs/visual-systems/ui-framework.md
- Crafting/Tech reference: docs/technology-systems/crafting-design.md
- Combat reference: docs/combat-systems/combat-design.md
- Worldgen reference: docs/world-generation/cave-gen-algorithm.md
- Audio direction: docs/audio-systems/music-direction.md


## 2) How to Use (Quick Ops)

- Step-by-step
  1) Copy the “Top Post — Copy/Paste Template” below.
  2) Replace all placeholders with curly braces (see Variables).
  3) Post as a NEW Thread in #build-in-public every Friday at 17:00 UTC.
  4) Immediately edit the post to add {{THREAD_LINK}}.
  5) Cross-post a 3–5 bullet summary to #announcements with a direct link to the thread.
  6) Create a first reply in the thread titled “Community Q&A” so players know where to ask. Keep replies threaded.

- Reaction kit (add to the top post)
  - :hammer_and_pick: :sparkles: :eyes: :memo:

- Thread etiquette
  - Devs reply under their own domain section (Core/Engine, Worldgen, etc.).
  - Community questions go in the “Community Q&A” reply thread.
  - Keep replies threaded; no cross-talk at root. We’re miners, not goats on a cliff.


## 3) Variables (Fill These)

- {{WEEK_NUM}} (e.g., 01)
- {{DATE_UTC}} (YYYY-MM-DD)
- {{SPRINT_NAME}} (e.g., Brass Rims and First Lamps)
- {{THREAD_LINK}} (add after posting)
- {{PLAYTEST_SIGNUP_LINK}}
- {{REPO_PR_SEARCH_URL}} (optional, e.g., a PR/commit search)
- {{CLIP_MAX_MB}} (guidance; default 15)


## 4) Top Post — Copy/Paste Template (Discord-Friendly Markdown)

```md
Week {{WEEK_NUM}} — {{SPRINT_NAME}} ({{DATE_UTC}})

TL;DR
- ...
- ...
- ...

What Shipped
- Core/Engine (@alpha)
  • ...
  • Tests: ...
  • Perf: ...
- Worldgen (@beta)
  • Seeds/Templates: ...
  • Lanes/Traversal validated: ...
  • Ore tuning: ...
- Combat (@gamma)
  • Timing windows: ...
  • TTK notes: ...
  • Telegraph polish: ...
- Tech/Crafting (@delta)
  • Recipes/Stats: ...
  • Mining gates: ...
  • UI hooks: ...
- Visual/UI (@eta)
  • Sprites/Tiles: ...
  • HUD/UI tweaks: ...
  • Token-only compliance: ...
- Audio (@zeta)
  • New stems/SFX: ...
  • Mix & hysteresis: ...
  • Loop fixes: ...
- Narrative (@epsilon)
  • Lore hooks: ...
  • NPC lines/contracts: ...
  • Copy updates: ...

Clips & Screens (<= {{CLIP_MAX_MB}}MB per clip; PNGs <= 4MB)
- Clip A: (attach file)
  Alt: ...
- Clip B: (attach file)
  Alt: ...
- Image A: (attach file)
  Alt: ...
- Image B: (attach file)
  Alt: ...

Next Up (Top 3)
1) ...
2) ...
3) ...

Risks/Blockers
- ...
- Ask: ...

Call for Feedback
- Prompt 1 → please drop notes in #feedback-mine
- Prompt 2 → log issues in #bug-reports (repro steps + clip if possible)
- Optional Prompt 3 → ...

Community Spotlight
- Shoutout/Capture: ...
  (Shared with consent. Thank you!)

Links & PRs
- ...
- ...
- ...
- ...
- ...
—or—
- PR/Search URL: {{REPO_PR_SEARCH_URL}}

Playtests
- Sign up: {{PLAYTEST_SIGNUP_LINK}}

Direct Thread Link (for cross-post): {{THREAD_LINK}}
```

Tip from the cask: Keep each bullet short enough to read between sips. If it takes more than two gulps, split the item.


## 5) Section Details & Guidance (Per Domain)

What “good” looks like per domain. Write plainly; link the deeper doc if you must.

- Core/Engine
  - Call out major systems integrated, feature flags toggled, and any refactors landed.
  - Note test coverage or key tests passing; cite flaky tests quarantined.
  - Include a concise perf note: frame times, memory shifts, hot spots identified, and any profiler notes.

- Worldgen
  - Specify seeds/templates changed and why (e.g., room density, corridor variance).
  - Confirm traversal lanes validated (spawn safety, exits reachable, no soft-locks).
  - Mention ore/biome tuning and observed distribution; attach before/after mini-maps if helpful.

- Combat
  - Describe timing windows adjusted (parry, dodge i-frames) and the rationale.
  - TTK notes: expected vs observed for baseline kit; mention armor/weapon tiers in test.
  - Telegraph polish: readability upgrades, wind-up frames, VFX/SFX sync.

- Tech/Crafting
  - List new/changed recipes and stat deltas; tie to progression beats or mining gates.
  - Note any gate checks (tool tier, stamina thresholds) and resource sinks/sources.
  - UI hooks connected (tooltips, compare, disabled states) and errors handled.

- Visual/UI
  - New sprites/tiles, HUD tweaks, iconography. Include visibility/contrast notes.
  - Verify focus order, controller/KB navigation, and font fallback behavior.
  - Token-only compliance: no raw hex values in Discord copy; align with docs/visual-systems/ui-framework.md.

- Audio
  - New stems/SFX landed; naming scheme and bus routing.
  - Mix updates: headroom, sidechain, ducking, and any hysteresis thresholds adjusted.
  - Loop fixes: click-pop removal, phase alignment, seamless loop points.

- Narrative
  - Lore hooks placed; quest/NPC contract beats aligned with sprint theme.
  - New NPC barks/lines; context and triggers; localization notes if any.
  - Copy cleanups: UI strings and error messages; tone check per tavern ethic.


## 6) Media & Accessibility Rules

- Formats:
  - Clips: MP4/WebM/GIF, each ≤ {{CLIP_MAX_MB}}MB (guidance: 15MB).
  - Images: PNG ≤ 4MB.
- Provide 1–2 concise sentences of alt text directly under each media item.
- Keep motion readable: avoid rapid flashes; 24–30fps is a fine pour.
- Avoid raw hex color codes in Discord posts. Reference tokens and palettes only in docs (see docs/visual-systems/ui-framework.md).
- Ensure captions or on-screen labels are legible at mobile sizes.
- For audio clips, note loudness and any warnings (e.g., “sudden impact at 0:14”).


## 7) Cross-Post Summary Template (#announcements)

```md
Build in Public — Week {{WEEK_NUM}} ({{DATE_UTC}}): {{SPRINT_NAME}}

- …
- …
- …
- …
- Feedback & Playtests — 48h Ack: share notes in #feedback-mine, join sessions via #playtest-queue.

Hero:
- (attach 1 image or clip)

Read the full thread: {{THREAD_LINK}}
```

Guide: 3–5 bullets, one hero media, one link. Keep it snappy as a fresh-poured ale.


## 8) Midweek “Clip & Peek” Mini-Template (Wed)

```md
Midweek Clip & Peek — Week {{WEEK_NUM}}
Here’s a wee look at what’s brewing since Friday: (one-paragraph teaser, 1–2 sentences).

- Clip: (attach 1 clip, <= {{CLIP_MAX_MB}}MB)
  Alt: (1–2 sentences)

Question for you fine folk:
- (1 focused prompt, e.g., “Does the new dodge timing feel readable without UI cues?”)

Reply in-thread with your take; keep it tidy under this post.
```


## 9) Thread Management Checklist

- Pin the top post in the thread.
- Add reactions: :hammer_and_pick: :sparkles: :eyes: :memo:
- If needed, mention @ROLE_MODS for moderation eyes.
- By Sunday UTC:
  - Edit the top post: mark completed items with ✅ inline.
  - Mark carryovers with :arrow_right: and queue for next week.
  - Summarize any hot feedback with 1–2 bullets and link notable replies.


## 10) Example Filled Template (Succinct)

```md
Week 01 — Brass Rims and First Lamps (2026-02-13)

TL;DR
- First playable loop: mine → craft → skirmish → tavern hand-in.
- Goblin Burrower tuned; dodge i-frames clarified.
- World seed stable for MVP single level; ore mix balanced for 3 starter recipes.

What Shipped
- Core/Engine (@alpha)
  • Save/load v0.2 merged; autosave on zone change.
  • Tests: 18 new unit tests, 4 integration tests for inventory; all green.
  • Perf: frame time -1.6ms avg in hub; GC spikes reduced with pooled projectiles.
- Worldgen (@beta)
  • Seed TFM-01 locked; template pass increased safe spawns by 12%.
  • Lanes validated: no soft-locks; exit beacon always reachable within 3 rooms.
  • Ore tuning: Copper:Tin 3:1; Coal pockets widened for early lamp crafting.
- Combat (@gamma)
  • Dodge window 12f → 14f; parry window unchanged (6f).
  • TTK: Goblin Burrower 3–4 light hits with starter pick; heavies 2–3.
  • Telegraph polish: wind-up VFX brightened; audio cue -1dB pre-hit.
- Tech/Crafting (@delta)
  • New recipes: Lamp (oil+coal), Pick Reinforcement (tin band), Simple Bandage (cloth).
  • Gates: Tin-band requires Tier 1 workbench; lamp equip unlocks dim caves lane.
  • UI hooks: recipe tooltips show stat deltas; disabled states localized.
- Visual/UI (@eta)
  • New tiles: damp stone set; lamp glow sprite; HUD stamina bar contrast +8%.
  • HUD tweaks: damage flash reduced duration; focus order fixed on Bench UI.
  • Token-only compliance: palette tokens referenced; no raw hex in copy.
- Audio (@zeta)
  • Stems: Tavern lute loop v0.3; pick strike SFX variants x4.
  • Mix: duck ambient -3dB on combat start; hysteresis 200ms to avoid pumping.
  • Loop fixes: cave drip seamless at 60bpm grid.
- Narrative (@epsilon)
  • Tavern intro lines (Alekeeper + Foreman) with consented VO scratch.
  • Contract: “Light the Way” ties lamp crafting to first delve.
  • Copy: Bench UI microcopy tightened; matches tavern ethic.

Clips & Screens (<= 15MB per clip; PNGs <= 4MB)
- Clip A: (attached) “burrower_dodge_showcase.mp4”
  Alt: Player demonstrates 14f dodge window vs Burrower lunge in dim cave with lamp equipped.
- Image A: (attached) “tavern_hub_tileset.png”
  Alt: Tavern hub with new damp stone tiles and warmer lute ambience indicator in HUD.

Next Up (Top 3)
1) Burrower AI burrow-exit variance (reduce repeat patterns).
2) Workbench Tier 2 scaffolding (no recipes yet).
3) Cave illumination falloff tuning for lamp tiers.

Risks/Blockers
- Rare inventory desync on quick equip-swap (repro low). Ask: repro clips to #bug-reports.
- Worldgen edge: isolated ore vein spawn in dead-end (needs path widen).

Call for Feedback
- Does the Burrower telegraph read clearly before the lunge? Drop notes in #feedback-mine.
- Any stutter entering the tavern hub on mid-spec GPUs? Clips + specs to #bug-reports.
- Recipe UI: are stat deltas clear without hovering long?

Community Spotlight
- Shoutout: @RuneMason for a crisp clip of the first lamp craft in the tavern (shared with consent). 🍻

Links & PRs
- Save/Load v0.2: https://github.com/the-far-mine/game/pull/123
- Dodge tuning pass: https://github.com/the-far-mine/game/pull/124
- Worldgen seed lock TFM-01: https://github.com/the-far-mine/game/pull/125
- Bench UI tokens: https://github.com/the-far-mine/game/pull/126

Playtests
- Sign up: https://forms.example.com/tfm-playtest

Direct Thread Link (for cross-post): https://discord.com/channels/111111111111111111/222222222222222222/333333333333333333
```


## 11) QA & Acceptance for Use

- Renders cleanly in Discord: headings, bullets, and attachments display as intended.
- Sections are concise; top post fits on one screen for most readers before “Read more.”
- Media is under size limits; alt text present under each media item.
- Links resolve to the right channels/resources; jump mentions are correct (#feedback-mine, #bug-reports, #playtest-queue).
- Tone matches tavern ethic: warm, respectful, purposeful.
- Prompts invite actionable, bounded feedback (not vague “what do you think?”).
- Sunday loop-closure edits applied (✅ for done, :arrow_right: for carryover).


## 12) Notes for Automation (Optional)

- If scheduler bot present:
  - Cron window: Fridays 16:55–17:05 UTC.
  - Channel IDs: supply env vars (e.g., TFM_BUILD_PUBLIC_CHANNEL_ID, TFM_ANNOUNCEMENTS_CHANNEL_ID).
  - Thread creation: subject “Week {{WEEK_NUM}} — {{SPRINT_NAME}} ({{DATE_UTC}})”.
  - Template variable injection: environment-backed (WEEK_NUM, DATE_UTC, SPRINT_NAME, CLIP_MAX_MB, PLAYTEST_SIGNUP_LINK, REPO_PR_SEARCH_URL).
  - After post, bot updates {{THREAD_LINK}} and posts the #announcements summary using Section 7.
- Fallback:
  - Manual post at 17:00 UTC; paste from Section 4; then Section 7 to #announcements.
  - Confirm reactions and pin are applied.
  - Create “Community Q&A” reply immediately to channel questions properly.

From my cask to your craft: show your work, keep it neighborly, and let the stone sing.