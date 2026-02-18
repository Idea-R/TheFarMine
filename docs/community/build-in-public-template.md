# Build-in-Public — Weekly Thread Template (Sprint 1)

Provenance
- Owner: @theta (Community — Brewmaster Alehart)
- Voice: Brewmaster Alehart, your stout host of the Far Mine taproom.

Cross-references
- docs/community/engagement-playbook.md
- data/community/welcome-sequence.json
- docs/visual-systems/ui-framework.md
- docs/technology-systems/crafting-design.md
- docs/combat-systems/combat-design.md
- docs/world-generation/cave-gen-algorithm.md


## 2) Usage Notes (Moderator Quick Start)

- Who posts: @theta or backup mod on duty.
- When: Fridays 17:00 UTC (cadence per playbook).
- Where: Post in {{channel.build_in_public}} as a new weekly thread; cross-link in {{channel.announcements}}.
- How:
  - Paste the Top Post Template.
  - Fill placeholders and dates.
  - Attach 1–3 short clips or GIFs with alt-text.
  - Add the Reaction Kit to the top post.
  - Pin the thread.
- Media guidance:
  - Duration/size: 10–20 s MP4/WebM, or <4 MB GIF.
  - Pixel art clarity: export at 3×–4× scale.
  - Alt-text: include 1–2 sentences describing action, UI, and outcome.


## 3) Reaction Kit

- Default reactions on top post: ["🛠️","✨","📜","🍻","✅"]
- Optional domain emojis by section:
  - Mining ⛏️, Combat ⚔️, Worldgen 🗺️, Crafting 🔧, UI 🧰, Audio 🎧, Lore 📖


## 4) Top Post Template (Thread Opener)

Copy-paste block:
```
Week {{YYYY-MM-DD}} — Stone, Steam, and Small Victories

Pull a stool, miners! The kettles sing, the gears turn, and we’ve shaved new edges on old stone. Reply in subthreads by section so the ledger stays tidy—and mind your alt-text on any clips so every dwarf at the table can follow.

Jump to: ⛏️ Core Loop | 🔧 Mining & Crafting | ⚔️ Combat | 🗺️ Worldgen | 🧰 UI & Visuals | 🎧 Audio | 📖 Lore & Tavern | ✨ Community Spotlight | 🛠️ Playtest | 📜 Feedback

CTA: Tell us your favorite moment this week or drop a clip in a subthread. First round of root-ale goes to the spiciest bug squash!
```
Anchors for the jump list when posted in Markdown:
- ⛏️ [Core Loop — End-to-End](#core-loop--end-to-end)
- 🔧 [Mining & Crafting](#mining--crafting)
- ⚔️ [Combat](#combat)
- 🗺️ [Worldgen](#worldgen)
- 🧰 [UI & Visuals](#ui--visuals)
- 🎧 [Audio](#audio)
- 📖 [Lore & Tavern](#lore--tavern)
- ✨ [Community Spotlight](#community-spotlight)
- 🛠️ [Call for Playtesters](#call-for-playtesters-inline-snippet)
- 📜 [Feedback Prompt](#feedback-prompt-guided)


## 5) Section Templates (Fill-in Blocks)

Note: When filled, keep each section within 800–1200 characters for readability.


### 5a) Core Loop Progress (General)

Header: Core Loop — End-to-End

Template:
```
Core Loop — End-to-End

- Built: {{one-liner on mine → craft → return checks; eg. “copper pick to furnace to anvil to stash validated across two seeds.”}}
- Next: {{immediate next stones to lay; eg. “hook stash to shop UI; add return-to-camp prompt”}}
- Risks/unknowns: {{quick note; eg. “desync on stash write when host migrates; mining fatigue timing TBD”}}

Media: [Clip/PNG] (Alt-text: {{1–2 sentences describing start-to-finish path, any blockers, and success criteria}})
```


### 5b) Mining & Crafting

Header: Mining & Crafting

Template:
```
Mining & Crafting

- Tools: {{T1/T2/T3 status; ids: tool.pick.t1.basic / tool.pick.t2.reinforced / tool.drill.t3.steam}}
- Hardness gates: {{rock 3, copper 4, iron 5, quartz 6–7 — feel checks; eg. “reinforced hits iron in 6 swings; feels fair?”}}
- Recipes: {{crafted items + timings; eg. “copper bar 6s smelt; iron 10s; steam head 15s assemble”}}

Media: [Clip/PNG] (Alt-text: {{tool tier used, node type, swing count to break, craft UI feedback}})
Refs: see docs/technology-systems/crafting-design.md for schema and IDs.
```


### 5c) Combat

Header: Combat

Template:
```
Combat

- Enemy tuning: {{what changed; eg. “Goblin Grunt wind-up +6f; recovery -4f”}}
- Telegraphs/readability: {{notes on silhouettes, flashes, trails}}
- Hit-stop & stamina: {{observations; eg. “6f hit-stop on heavy feels chunky; stamina regen stalls at 30% under guard”}}

Media: [Clip/PNG] (Alt-text: {{attack seen, dodge window in frames, damage/stagger outcome}})
```


### 5d) Worldgen & Biomes

Header: Worldgen

Template:
```
Worldgen

- Crystal Caverns: {{room/door validation; ore seeding observations; eg. “L-shaped rooms place 2 doors avg; quartz veins cluster depth 3–5”}}
- Three‑Wide Law: {{compliance checks; eg. “main corridors ≥3 tiles; 2-tile choke found at seed 81293”}}

Media: [Screenshot/Minimap] (Alt-text: {{room shapes, door counts, corridor widths, ore density summary}})
```


### 5e) UI & Visuals

Header: UI & Visuals

Template:
```
UI & Visuals

- HUD: {{bars, hotbar, minimap updates; eg. “stamina bar gains tick marks; hotbar numbers at 3× scale”}}
- Palette/tokens: {{sprite reads at 3×–4×; icon contrast; particle pass}}

Media: [PNG] (Alt-text: {{UI elements shown, scale factor, legibility outcome}})
```


### 5f) Audio

Header: Audio

Template:
```
Audio

- Mining cadence: {{swing layers; drill hysteresis behavior}}
- Ambience: {{cave beds, steam vents, tavern underbed routing}}
- Music: {{stingers/overlay state behavior in tests; eg. “combat overlay fades 600ms after last tag”}}

Media: [Short clip with audio] (Alt-text: {{what layers are audible, transitions, perceived loudness}})
```


### 5g) Lore & Tavern

Header: Lore & Tavern

Template:
```
Lore & Tavern

- Hooks added: {{Keeper lines; glossary seeds in tooltips/dialog}}
- UI tooltip hooks: {{where deployed; eg. “ore names link to codex entry; 2/6 localized”}}

Media: [PNG/Text] (Alt-text: {{snippet of lines, who speaks, trigger condition}})
```


## 6) Community Spotlight (Template)

```
Community Spotlight ✨

- Miner: {{name/handle}}
- Share: {{screenshot/idea/clip summary}}
- Consent: {{on-file/DM permission received on {{YYYY-MM-DD}}}}

Media: [Community share, rehosted or embedded] (Alt-text: {{describe content and credit}})
```


## 7) Call for Playtesters (Inline Snippet)

```
Playtest Call 🛠️

Windows: Sat/Sun 18:00–20:00 UTC in {{channel.playtest_queue}}. React with ✅ if you can make it; we’ll DM a calendar block. Fresh builds, friendly goblins (mostly).
```


## 8) Feedback Prompt (Guided)

```
Guided Feedback 📜

This week’s focus: {{e.g., “How do iron-gated veins feel with the Reinforced Pick? Too stingy, just right, or generous?”}}

Post in {{channel.feedback_mine}} with tags: [ui], [combat], [worldgen], [crafting], [audio], [lore].
Bugs to {{channel.bug_reports}} with version, seed, and a short clip or screenshot (alt-text included).
```


## 9) Moderator Checklist (Pre/Post)

- Pre-post
  - Gather 1–3 clips (10–20 s) or <4 MB GIFs.
  - Confirm alt-text is present and descriptive.
  - Update dates/placeholders.
  - Verify cross-links and file references.
  - Prepare Reaction Kit and assign owners for subthread replies.
- Post
  - Add default reactions to top post.
  - Pin the thread.
  - Cross-link in {{channel.announcements}}.
  - Start subthreads per section with the starter prompts prefilled.


## 10) Subthread Starter Templates

Copy-paste one-liners to seed replies (remember alt-text on images/clips):

- Mining Clip Thread — tell us if the cadence hammers or hinders. ⛏️
- Combat Timing Thread — could you read the jab vs sweep in time? ⚔️
- Worldgen Room Fits — doors in threes behaving? 🗺️
- Crafting Bench Talk — recipes too dear or just right? 🔧
- UI Readability — does the HUD sing at 3×–4×? 🧰
- Audio Ears-On — layers muddy or meaty? 🎧
- Lore Sips — Keeper lines land or need more foam? 📖


## 11) Example Filled Thread (Annotated)

Note: Fictitious, compact example using placeholders and tone. No internal doc links.

Top Post (example)
```
Week 2026-03-06 — Stone, Steam, and Small Victories

Pull a stool, miners! We tightened bolts on the core loop and taught goblins some manners. Reply in subthreads and add alt-text to any shiny you share.

Jump to: ⛏️ Core Loop | 🔧 Mining & Crafting | ⚔️ Combat | 🗺️ Worldgen | 🧰 UI & Visuals | 🎧 Audio | 📖 Lore & Tavern | ✨ Community Spotlight | 🛠️ Playtest | 📜 Feedback

Tell us your favorite moment this week or drop a clip in a subthread.
```

Core Loop — End-to-End (example)
```
- Built: Copper → Furnace → Anvil → Stash path clean across seeds 101 and 81293.
- Next: Hook stash to shop UI; add return-to-camp prompt after craft complete.
- Risks/unknowns: Host migration can drop stash write (1/20 repro).

Media: [Clip] (Alt-text: Player mines copper, smelts bar in 6s, crafts pick upgrade, deposits in stash; UI confirms.)
```

Mining & Crafting (example)
```
- Tools: tool.pick.t1.basic ✅ / tool.pick.t2.reinforced ✅ / tool.drill.t3.steam ⏳ (fx pass pending)
- Hardness gates: rock 3, copper 4 feel brisk; iron 5 at 6 swings w/ T2 feels fair; quartz 7 too spiky at 12 swings.
- Recipes: copper bar 6s, iron bar 10s, steam head 15s; anvil tooltip shows costs.

Media: [GIF] (Alt-text: Reinforced pick breaks iron in 6 hits; sparks show tier; anvil recipe lights up on bar deposit.)
```

Combat (example)
```
- Enemy tuning: Goblin Grunt wind-up +6f; recovery -4f; damage -1.
- Telegraphs/readability: Added red trail to sweep; jab keeps white flicker only.
- Hit-stop & stamina: Heavy hit-stop 6f chunky-good; stamina regen too stingy under guard (stalls at ~30%).

Media: [Clip] (Alt-text: Player blocks jab, rolls through sweep on red trail cue; counter heavy staggers grunt.)
```

Worldgen (example)
```
- Crystal Caverns: L-rooms place 2 doors avg; quartz veins cluster depth 3–5; copper sparse at spawn.
- Three‑Wide Law: 2-tile choke at seed 81293, depth 2; flagged for fix.

Media: [Minimap] (Alt-text: Overlay shows ≥3-tile corridors except one choke; ore heatmap highlights quartz cluster.)
```

UI & Visuals (example)
```
- HUD: Stamina ticks added; hotbar numerals at 3×; minimap border softens.
- Palette/tokens: Goblin silhouette thicker outline; spark particles toned down 10%.

Media: [PNG] (Alt-text: HUD at 3× scale with ticked stamina bar; icons remain legible.)
```

Audio (example)
```
- Mining cadence: Pick swing layers align at 110 BPM; drill hysteresis smooths spin-up.
- Ambience: Low cave bed + distant drip; tavern underbed -6dB on dialogue.
- Music: Combat overlay fades 600ms after last tag; no clash heard.

Media: [Clip] (Alt-text: Hear steady pick rhythm, brief combat swell, clean fade back to ambience.)
```

Lore & Tavern (example)
```
- Hooks added: Keeper greets first iron craft; glossary stub for “Steamhead.”
- UI tooltip hooks: Ore names link to codex; 2/6 localized.

Media: [PNG] (Alt-text: Dialogue box: “Iron’s a stern friend—treat it warm.” triggers on first iron bar.)
```

Community Spotlight (example)
```
- Miner: @shale_whisper
- Share: Quartz seam route screenshot with safe torches.
- Consent: DM permission received on 2026-03-05

Media: [Screenshot] (Alt-text: Curved corridor with quartz glint; torches mark safe path; credit @shale_whisper.)
```

Playtest Call (example)
```
Sat/Sun 18:00–20:00 UTC in {{channel.playtest_queue}} — React ✅ and we’ll DM a calendar block.
```

Guided Feedback (example)
```
This week: Do iron-gated veins feel fair with the Reinforced Pick?

Post in {{channel.feedback_mine}} with tags; bugs to {{channel.bug_reports}} with version/seed/clip (alt-text too).
```


## 12) ID Placeholders & Conventions

- Reserved tokens:
  - {{channel.build_in_public}}
  - {{channel.announcements}}
  - {{channel.feedback_mine}}
  - {{channel.bug_reports}}
  - {{channel.playtest_queue}}
- Date formatting: {{YYYY-MM-DD}} (ISO 8601)


## 13) Acceptance Checklist (for this template)

- Copy-paste ready for moderators.
- Each section designed to fit within ≤1200 chars when filled.
- Dwarven tavern voice throughout (Brewmaster Alehart).
- Alt-text reminders present in Usage, Top Post, and Media slots.
- Reaction Kit specified with defaults and domain emojis.
- Subthread starter one-liners included.
- Channel placeholders used; no internal dev-only links in example section.