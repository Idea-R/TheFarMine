# Build-in-Public — Weekly Update Template (Sprint 1)

Provenance: owner @theta (Community — Brewmaster Alehart)

Cross-refs:
- Ritual timing: docs/community/engagement-playbook.md
- Linked channels: data/community/welcome-sequence.json
- Tag examples: docs/combat-systems/combat-design.md, docs/technology-systems/crafting-design.md, docs/world-generation/cave-gen-algorithm.md

---

## Usage Notes

A steady pour wins the night. Keep it clear, short, and actionable. Use the Short Post in {{channel.announcements}}, then anchor a Thread Starter in {{channel.build_in_public}} for details and clips. Link the thread in {{channel.tavern_talk}} to pull folks into the tasting lane.

Checklist:
- Add sprint label and [tags] per bullet
- Include 1–3 clips/gifs with alt-text (<10s if possible)
- Pin the thread opener
- Tag domain owners as needed
- Add the Reaction Legend in the opener

Where/When:
- Post Summary in {{channel.announcements}} on Tue 18:00 UTC
- Start Thread in {{channel.build_in_public}} immediately after
- Cross-link in {{channel.tavern_talk}}

---

## Short Post — Announcements Snippet (discord-ready)

Template (copy, fill, and post in {{channel.announcements}}):
- [{{WEEK}}][{{SPRINT}}] Build-in-Public
- What shipped:
  - • {{SHIPPED_1}} [tag]
  - • {{SHIPPED_2}} [tag]
  - • {{SHIPPED_3}} [tag]
- What’s next:
  - • {{NEXT_1}} [tag]
  - • {{NEXT_2}} [tag]
- Join the thread: {{channel.build_in_public}}
- Drop feedback: {{channel.feedback}} | Sign up: {{channel.playtests}}
- Tags: [combat] [worldgen] [crafting] [ui] [audio] [lore]

Example (Sprint 1 — mentions Burrower, Three‑Wide rooms, tools.json):
- [Week 01][Sprint 1 — MVP Loop] Build-in-Public
- What shipped:
  - • Burrower baseline AI + lunge window [combat]
  - • Three‑Wide room templates pass A [worldgen]
  - • tools.json seed list (Pick, Torch) [crafting]
- What’s next:
  - • Encounter sandbox timing checks [combat]
  - • Palette polish on copper veins [worldgen]
- Join the thread: {{channel.build_in_public}}
- Drop feedback: {{channel.feedback}} | Sign up: {{channel.playtests}}
- Tags: [combat] [worldgen] [crafting] [ui] [audio] [lore]

---

## Thread Starter — Long Form (discord thread opener)

### What We Built This Week
- style-guide.md: first telegraph shapes + palette tokens [ui][combat]
- enemy-cave-burrower.json: lunge, burrow, surface tick tuned [combat]
- sound-manifest.json: stub IDs for mine/deny/footfall [audio]
- room-templates.json: Three‑Wide and Junction V1 [worldgen]
- combat-timing-service.js: windup/active/recover phases [combat]
- tools.json: Basic Pickaxe + Torch entries [crafting]
- Clip PR links attached below; see notes per media

### Clips & Screens
- {{CLIP_LINK_1}} — Alt: {{ALT_TEXT_1}} (keep under 10s; focus on a single moment)
- {{CLIP_LINK_2}} — Alt: {{ALT_TEXT_2}} (show input vs. output if timing-related)
- {{CLIP_LINK_3}} — Alt: {{ALT_TEXT_3}} (use fixed zoom; no shaky pans)

Note: Keep clips <10s where possible. Add clear alt-text for accessibility and async review.

### What’s Next (Up to 7 Days)
- Wire welcome-sequence bot handoff to channels [ui]
- ECS Audio bridge stub to manifest events [audio]
- Encounter sandbox pass for lunge timings [combat]
- Expand Three‑Wide variants with ore niches [worldgen]
- Crafting proto hookup: pick durability read [crafting]

### Help Wanted From the Guild
- Post a 5–10s clip of a mining break with Basic Pickaxe vs rock 3 [playtest]
- Try dodging Burrower lunge; note readable telegraph or not [feedback]
- Screenshot a Three‑Wide room that feels too samey [feedback]
- Audio pass: does deny sound read as “soft fail”? 5s clip [playtest]

### Known Issues (MVP Honesty Board)
- Telegraph arc opacity spikes on stacked overlaps [combat][ui]
- Mining deny sound routes UI bus instead of SFX [audio]
- Burrower surface tick snaps on uneven tiles [combat]
- Room seams expose void on Z‑pass edges [worldgen]
- Torch flicker timing drifts after scene load [audio][ui]

### Community Spotlight
- Shout to @mineshaft for the copper vein color test — crisp and readable at a glance.
- Nominate next week: drop a link in {{channel.tavern_talk}} with [spotlight].

### How to Test This Build
1) Grab build: see pinned “Latest Build” in {{channel.build_in_public}} (hash {{BUILD_HASH}} — {{BUILD_DATE}})
2) Controls: WASD move, Space dodge, Left Click mine, Right Click torch
3) Try:
   - Mine copper in a Three‑Wide room; note readability [worldgen]
   - Dodge Burrower lunge; note timing window clarity [combat]
4) Report: post in {{channel.feedback}} with tags like [combat] [worldgen] [audio]
5) Include OS, build hash, and a 5–10s clip or screenshot with alt-text

### Links & References
- GDD v1.0
- style-guide.md
- docs/technology-systems/crafting-design.md
- docs/combat-systems/combat-design.md
- sound-manifest.json

---

## Reaction Legend & Thread Etiquette

Legend:
- 👍 shipped
- 🧭 confirmed bug
- 🧪 testing
- 💡 idea
- 🪓 mining
- 🔧 WIP
- 🎬 clip

Etiquette:
- Reply in-thread; keep one topic per reply chain
- Alt-text required for media
- Keep clips under 10s when possible; stable camera, readable HUD

---

## Fill-in Variables Block

Copy this block to the top of your thread before posting:
- WEEK: e.g., Week 02
- SPRINT: e.g., Sprint 1 — MVP Loop
- BUILD_HASH: e.g., 1a2b3c4
- BUILD_DATE: e.g., 2026-02-18
- CLIP_LINK_1: e.g., https://clips.example/clip1
- ALT_TEXT_1: e.g., “Burrower windup arc and lunge; player dodges right”
- CLIP_LINK_2: e.g., https://clips.example/clip2
- ALT_TEXT_2: e.g., “Mining copper vein in Three‑Wide; sparks and break timing”
- CLIP_LINK_3: e.g., https://clips.example/clip3
- ALT_TEXT_3: e.g., “Deny sound on wrong tool; UI hint visible”
- LINKS:
  - {{channel.build_in_public}}
  - {{channel.feedback}}
  - {{channel.playtests}}

---

## Examples (Two fully filled samples)

Example A — Worldgen + Visuals Focus:
- Short Post ({{channel.announcements}}):
  - [Week 02][Sprint 1 — MVP Loop] Build-in-Public
  - What shipped:
    - • Three‑Wide room var set + ore niches [worldgen]
    - • style-guide.md: telegraph shapes pass A [ui][combat]
    - • Copper vein palette tweak for readability [worldgen]
  - What’s next:
    - • Room seam audit + UV pass [worldgen]
    - • Telegraph contrast check in dark scenes [ui]
  - Join the thread: {{channel.build_in_public}}
  - Drop feedback: {{channel.feedback}} | Sign up: {{channel.playtests}}
  - Tags: [combat] [worldgen] [crafting] [ui] [audio] [lore]

- Thread Starter ({{channel.build_in_public}}):
  - What We Built This Week
    - room-templates.json: Three‑Wide V1.1 + Junction cap [worldgen]
    - style-guide.md: neutral palette tokens added [ui]
    - Copper vein sprite mask cleanup pass [worldgen]
    - Torch falloff curve tweak for walls [ui]
  - Clips & Screens
    - https://clips.example/a1 — Alt: Walkthrough of Three‑Wide w/ copper node
    - https://clips.example/a2 — Alt: Telegraph icon pass on dark tile
  - What’s Next (Up to 7 Days)
    - UV seam sweep on junction edges [worldgen]
    - Telegraphed hazards contrast pass [ui]
    - Palette test: desat stone on deeplayers [worldgen]
  - Help Wanted From the Guild
    - Post a screen of a flat-looking room; mark coords [feedback]
    - 5–10s clip showing telegraph readability in torchlight [playtest]
  - Known Issues (MVP Honesty Board)
    - Room seam shows void on Z‑edge [worldgen]
    - Telegraph alpha pops on overlap [ui]
    - Torch flicker drifts post-load [audio][ui]
  - Community Spotlight
    - @caver posted a clean ore readability mock. Nominate next in {{channel.tavern_talk}} [spotlight]
  - How to Test This Build
    - Pull build {{BUILD_HASH}} — {{BUILD_DATE}} from pin
    - Walk 3 rooms; find copper; mine once; note palette legibility
    - Report to {{channel.feedback}} with [worldgen][ui]
  - Links & References
    - GDD v1.0, style-guide.md, crafting-design.md, combat-design.md, sound-manifest.json

Example B — Combat + Audio Focus:
- Short Post ({{channel.announcements}}):
  - [Week 03][Sprint 1 — MVP Loop] Build-in-Public
  - What shipped:
    - • Burrower lunge timing in service layer [combat]
    - • sound-manifest.json hooks for mine/deny [audio]
    - • tools.json: pick/torch cleanup [crafting]
  - What’s next:
    - • Encounter sandbox checks on hit-stop [combat]
    - • ECS Audio bridge stub to events [audio]
  - Join the thread: {{channel.build_in_public}}
  - Drop feedback: {{channel.feedback}} | Sign up: {{channel.playtests}}
  - Tags: [combat] [worldgen] [crafting] [ui] [audio] [lore]

- Thread Starter ({{channel.build_in_public}}):
  - What We Built This Week
    - combat-timing-service.js: windup/active frames [combat]
    - enemy-cave-burrower.json: lunge/surface tick tune [combat]
    - sound-manifest.json: deny/mine SFX IDs [audio]
    - tools.json: durability field placeholder [crafting]
  - Clips & Screens
    - https://clips.example/b1 — Alt: Lunge telegraph → dodge → safe window
    - https://clips.example/b2 — Alt: Wrong-tool deny sound vs UI hint
    - https://clips.example/b3 — Alt: Hit-stop feel on strike (WIP)
  - What’s Next (Up to 7 Days)
    - Encounter sandbox pass on hit-stop [combat]
    - Audio bridge stub (ECS → manifest) [audio]
    - Torch cue sidechain test vs music [audio]
  - Help Wanted From the Guild
    - Record a 5–10s dodge vs lunge; did you read windup? [playtest]
    - Does deny SFX feel “soft fail” not error? Note vibe. [feedback]
    - Share any stutter in timing service under load [playtest]
  - Known Issues (MVP Honesty Board)
    - Lunge arc opacity spikes on overlap [combat][ui]
    - Deny SFX on UI bus; too bright in mix [audio]
    - Surface tick snaps on uneven tiles [combat]
  - Community Spotlight
    - @pickmaster’s timing grid notes saved a pass. Nominate in {{channel.tavern_talk}} [spotlight]
  - How to Test This Build
    - Grab build {{BUILD_HASH}} — {{BUILD_DATE}} from pin
    - Enter test cave; bait lunge; dodge; rate clarity 1–5
    - Mine once with wrong tool; note SFX + hint
    - Report to {{channel.feedback}} with [combat][audio]
  - Links & References
    - GDD v1.0, style-guide.md, crafting-design.md, combat-design.md, sound-manifest.json

---

## Posting Checklist (concise)
- Tue 18:00 UTC confirmed
- Post Short in {{channel.announcements}}
- Create Thread in {{channel.build_in_public}}
- Cross-link in {{channel.tavern_talk}}
- Pin the thread opener
- Add Reaction Legend to opener
- Schedule Thu triage reminder

---

## Acceptance Checklist (for this template)
- Copy-pasteable to Discord with placeholders
- Includes Short + Long formats
- Reaction legend present
- Tags align with engagement-playbook
- Alt-text guidance included
- Links use stable {{channel.*}} tokens