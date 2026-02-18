# Founding Lore — The Far Mine and the First Warrant (Sprint 1)

Provenance: owner @epsilon (Narrative Systems — Lorekeeper Runebeard)

Cross‑references:
- data/dialogue/tavern-npc-keeper.json
- docs/technology-systems/crafting-design.md (§Hardness & tool tiers)
- docs/world-generation/cave-gen-algorithm.md (§Three‑wide law & lamps)
- docs/combat-systems/combat-design.md (enemy names)
- data/world/biome-crystal-caverns.json


## The Legend of the Bottomless Vein

The old picks say it began with a breath. One morning the hill sang—a low, even note—and a pasture sinkhole yawned into a ringed throat we now call Claim’s Mouth. The Resonant Hum thrummed from its stones, steady as heart iron, deepening the deeper we dared go. Clan singers named it the Stone’s Long Song: a measure older than rivers, patient as rust.

Practicalists set down that the mine’s “bottomless” habit is no curse, but a resonance fault. When strata are relieved of their old pressures by our cut, the fault recalculates its line and reveals the next verse of stone. Engineers mark that the song waxes with the seasons, and so do new layers. That is your working note: each season, the claim deepens as the Song turns its page.


## The First Warrant & The Truce at Claim’s Mouth

Skirmishes sparked when the first ore rushed daylight. Spears met shovels in the drift. To keep blood from salting good stone, elders drafted the First Warrant: a binding charter that paused clan quarrels, formed a neutral council, and set rules for claims, carts, and camp.

From it we keep the Three‑Wide Law. No corridor, drift, or gate is to be cut less than three dwarves abreast—one cart, one pick, one shield. Air flows cleaner, carts pass without jam, and retreat lines stay open when the rock spits teeth. Lamps at every door mark the living state of a tunnel: lit for safe and surveyed, dimmed for caution, dark for forbidden. Thus the Warrant set width and lamp together as a sacred safety—stone-sense turned statute, and now system.


## The Guild Compact — Birth of the Mining Guilds

With truce inked and output measured, profit and pride found their ledgers. Three houses of practice began to style themselves guilds and signed the Guild Compact: they would compete in yields and proofs, not in blades. Each keeps a face in the tavern for Brassbound Contracts, recruits by coin and boast, and tallies Depth‑Marks at doors like hymns in a book.

Their motives tangle as ever: profit for the quarter‑master, prestige for the sash and seal, and the proving of Deep Theory—the bet that the Stone’s Long Song can be mapped, tuned, and finally mastered. Names and colors of the three are for guild-factions.md; for now, know that their recruiters drink at the same tables and eye the same ledgers.


## Why the Mine Deepens — The Stone’s Long Song (Diegetic Framing)

Theories sung in the common room and scribed in the guild rooms:

- Resonance Rifts (tectonic‑rune feedback): Old runes in the hill catch and return the earth’s own tremor, carving self-similar patterns ahead of our cut. We take a slice; the song resolves the next.
- An Ancient Engine still turning: Somewhere under, a wheel or worm-screw moves by forgotten fuel, ratcheting strata like a clock that refuses to die.
- The Crystal Courts’ breathing strata: The great quartz beds are not dead; they expand and contract in a long inhale, shifting seams as if in council.

Non‑binding to engineers: for our ledgers and your schedules, each fresh depth is the mine’s “next verse,” unlocking with the seasons.


## What Sleeps Below — The Vanished Under‑Kin

Down past the damp, the spoil heaps show more than ore. We’ve found automata husks jammed in slate like barnacles of brass, eyes dark but hinges sound. On quartz faces, neat scars of rune‑math repeat in ratios anyone with a square can admire, yet none can finish. In ruin‑stone you’ll meet guardians with joints of jointless rock, built to hold a line that rust forgot.

We have no names for those builders that haven’t soured in the mouth. Call them the Under‑Kin and leave it lean. The Abyss and the Ancient Ruins keep their own oaths; our lamps are not invited, but they arrive all the same.


## Canonical Timeline (Concise Bullets)

- -3y: Hill pickers hear the first tremor‑song; kettles rattle a steady note.
- -2y: Claim’s Mouth collapses open; first ore rush to daylight.
- -18mo: Skirmishes flare; First Warrant drafted; Truce at Claim’s Mouth sealed.
- -12mo: Guild bounties posted; first lamp lines strung; Three‑Wide Law ratified.
- -3mo: Crystal Caverns charted; goblins and burrowers confirmed in the seams.
- Now: Season of First Lamps — player arrival and the Song’s next verse.


## Lexicon & Proper Nouns (Stable Tokens)

- Claim’s Mouth: The surface hub and primary access shaft; the round throat that began the Rush.
- First Warrant: The truce‑charter establishing council law for claims, safety, and adjudication.
- Three‑Wide Law: Sacred safety code mandating corridor width of three and a lamp at every door.
- Depth‑Marks: Ledger scratches near doors indicating surveyed depth, danger, and haul notes.
- Stone‑Song / Resonant Hum: The low vibration heard in the Mine; deepens with depth.
- Crystal Courts: A mythic ancient order credited with shaping quartz strata and strange ratios.
- Brassbound Contracts: Guild‑sealed job slips offered in taverns; formal quests by another name.


## System Hooks & ID References (Implementation Notes)

- Tools and hardness (align with docs/technology-systems/crafting-design.md §Hardness & tool tiers):
  - tool.pick.t1.basic mines soft seams and early rock; yields ore.copper and shard.quartz where permitted.
  - tool.pick.t2.reinforced required for mid‑hard seams and reinforced nodes; enables ore.iron and denser quartz.
  - tool.drill.t3.steam required for hardened bands and machine‑bound strata; enables core.steam and deep plates.
- Resources (stable IDs referenced in lore text only): ore.copper, ore.iron, shard.quartz, core.steam.
- Enemies (per docs/combat-systems/combat-design.md): enemy.goblin.grunt harasses lamp lines; enemy.cave.burrower undermines drifts.
- Worldgen alignment (docs/world-generation/cave-gen-algorithm.md §Three‑wide law & lamps):
  - Enforce corridor minimum width = 3 tiles; spawn door frames with lamp anchors.
  - Door lamps default lit on “surveyed”; toggle to dim/dark via state change for hazard flags.
- Biome reference (data/world/biome-crystal-caverns.json):
  - Crystal Caverns expose shard.quartz ratios; ambient hum pitched higher. Place Depth‑Marks at crystal thresholds.
- Dialogue hooks (data/dialogue/tavern-npc-keeper.json):
  - Tavern keeper references Brassbound Contracts, Three‑Wide Law reminders, and recent sightings of enemy.goblin.grunt near lamp caches.
- Ledger/UI notes:
  - Depth‑Marks mirror journal entries; auto‑append claim depth when player places a door lamp.
  - “Next verse” gating maps to season-based content unlocks; surface signage updates accordingly.


## Quest Seeds & Micro‑Hooks (For UI/Journal)

- Lamp the Line: A guild wants a lit corridor from Claim’s Mouth to the first ore face. Place lamps at every door and return with Depth‑Marks. questTag: contract.brassbound.lamp_line
- Hum Trace: Follow the Resonant Hum to its louder bend and mark three survey points in the Crystal Caverns. questTag: contract.deeptune.hum_trace
- Burrower Baffles: Install braces in a three‑wide drift and drive off a pack of burrowers before they collapse it. questTag: contract.safety.burrower_baffle
- Rust and Ratios: Recover a rune‑scored quartz shard without cracking it; deliver to the guild scribe intact. questTag: contract.scholar.quartz_ratio
- Steam to Spare: Source a core.steam from a hardened node using tool.drill.t3.steam; log hardness and return. questTag: contract.engine.steam_core
- Hold the Lamps: Defend a door‑lamp cache from enemy.goblin.grunt raids until the cart arrives. questTag: contract.guard.lamp_cache


## [HOOK] Tooltip Snippets (≤140 chars each)

[HOOK] Three‑Wide Law: one cart, one pick, one shield. Anything tighter is a tomb.

[HOOK] A lit door sings “surveyed.” Dim says “mind your step.” Dark means “turn back.”

[HOOK] The Stone’s Long Song deepens with depth. Season’s change brings the next verse.

[HOOK] Depth‑Marks are ledgers cut in stone. Read them, or repeat old mistakes.

[HOOK] Goblin grunts love lamp oil. Guard your light, or the dark will win.

[HOOK] Quartz keeps its own ratios. Chip the face and you ruin the proof.

[HOOK] A burrower hears a hollow before you do. Brace your drifts.

[HOOK] Basic picks bite copper; steam drills wake the old bones of the hill.


## Acceptance & Consistency Notes

- In‑character tone: mythic dwarven ledger‑speak by Lorekeeper Runebeard; concise and readable.
- Cross‑refs present and aligned: tavern NPC dialogue, crafting hardness tiers, cave‑gen three‑wide & lamps, combat enemy names, Crystal Caverns biome.
- Safety code: Three‑Wide Law and door‑lamp practice stated; matches worldgen spec.
- IDs referenced match manifests: tool.pick.t1.basic, tool.pick.t2.reinforced, tool.drill.t3.steam, ore.copper, ore.iron, shard.quartz, core.steam, enemy.goblin.grunt, enemy.cave.burrower.
- Names and tokens stable for UI reuse: Claim’s Mouth, First Warrant, Three‑Wide Law, Depth‑Marks, Stone‑Song/Resonant Hum, Crystal Courts, Brassbound Contracts.
- No raw color tokens or placeholder variables included.
- Season‑based unlocks framed diegetically as the mine’s “next verse.”
- Foreshadowing of Under‑Kin and ruins present; no final bosses named.