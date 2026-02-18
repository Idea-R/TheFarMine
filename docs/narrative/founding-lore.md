# Founding Lore — The Far Mine and the Stones Below

Provenance: owner @epsilon (Narrative Systems — Lorekeeper Runebeard)

Cross-refs:
- docs/technology-systems/crafting-design.md (hardness gates)
- docs/combat-systems/combat-design.md (Three‑Wide Law nod)
- data/world/biome-crystal-caverns.json
- data/dialogue/tavern-npc-keeper.json
- data/visual/color-palette.json
- data/audio/sound-manifest.json (ambient.tavern.loopA)


## 2) Primer (Short Overview)

Claim’s Mouth is our warm-breathed tavern at the Mine’s lip, where mugs clink, gear mends, and warrants hang heavy as iron. When the lamps hum and ambient.tavern.loopA is in the air, you’re among kin and contract.

Below that threshold yawns the Far Mine, a legend made walkable. It is said to be bottomless not for depth alone but for the way it shifts, a spiral of strata that refuses to be finished. Spent claims curl away and new seams arrive as if the mountain were breathing.

The Guild Compacts keep us from cutting each other to ribbons. Warrants set rights, bounties tug coin, and the Three‑Wide Law keeps doors and lanes wide enough for shield and pride both. So we delve by custom as much as by courage.

And deeper than our oldest tale runs a whisper of an elder civilization. Some call them the Deepwrights, others the Prismwrights, who taught stone to sing and light to obey. Their handiwork glints in the Crystal Caverns and beyond for those with clear eyes.


## 3) The Legend of the Far Mine (Why it is Bottomless)

Ask a miner and they’ll spit: the Mine’s cursed or ensorcelled, a living spiral that hates a ledger. You clear a vein, and the walls take a new set. Your last maps turn to kindling before your next shift.

Ask a scholar and they’ll stroke a beard: the Mine sits upon an Under-Mechanism, a self-maintaining mantle lattice built by an elder folk. It senses stress, demand, and claim-flow, then rethreads caverns, slopes, and crystal seams in a repeating helix.

Both truths serve our work. The living strata-spiral is why delves never end, why seasons layer cleanly: old runs fold shut as new routes unfurl. As claims are spent, the lattice reknits, shaping fresh chambers, hazards, and seams within the same world’s bones.


## 4) The Elder Makers Below (Ancient Civilization)

We name them the Deepwrights, though among lorekeepers the softer word is Prismwrights. They were stone-programmers, carving hymns into crystal so earth-pressure bent to their will and light behaved like trained hounds.

Their leavings seed our future routes: Prism Archives that may still recall commands, Keystone Lathes that shape rock to a pattern, Choir-Drills that sing seams awake, and Ward Runes that keep roofs from grieving. Take the hint: survivals are likely in deeper biomes, and not all of them sleep.


## 5) Dwarven Founding at Claim’s Mouth (Guild Compact)

The First Warrant ended the last of the clan feuds at the Mine’s rim. We signed a neutral peace, raised a tavern called Claim’s Mouth, and swore the Three‑Wide Law so no shield caught a jamb and no comrade was crushed for lack of lane.

Guild politics matter because the Mine is appetite with rules. Warrants sort who may bite which seam, bounties make order of monsters, and claims hold the purse-strings for our vendors. When you upgrade a stall or take a contract, you’re oiling the same gear that keeps us from civil war.


## 6) Timeline (Concise, ID-stable Era Tags)

- era.deepwrights.prime — The Choir-Drills kindle the Under-Mechanism and the lattice takes its first breath. Pressure and light obey hymn and hand.
- era.deepwrights.vanishing — Prism Archives shutter and Ward Runes gutter. The old songs go quiet and the deep begins to drift unguided.
- era.dwarf.scouts.first_hearth — Scouts find the Warm Vent and kick stones into a cookfire. First tents, first mugs, first maps scribbled in soot.
- era.dwarf.first_warrant — The Claim’s Mouth compact is signed. Feuds settle, lanes are set three wide, and the tavern doors swing for all.
- era.guilds.brass_ascendant — Steamworks and brass set rhythm to delving. Lift-cages, pumps, and steady forges make deeper runs ordinary.
- era.mine.rethreading_observed — Miners note that spent claims curl shut and new seams open nearby. Scholars name the pattern a strata-spiral.
- era.current.sprint1 — The Crystal Caverns open to prospectors. Guild posts simple warrants; vendors stand ready for first upgrades.


## 7) Laws, Rites, and Superstitions (Systems-Linked)

- Three‑Wide Law: Doors and lanes are kept three wide so a shield wall, a wounded friend, and a full cart can pass. Worldgen honors it, and combat drills assume you’ve room to brace. See the nod in docs/combat-systems/combat-design.md for spacing sense.

- Rite of First Spark: Before biting harder stone, a delver brings a tool to the forge or steam workshop for its first true temper. Sparks fly, oaths are sworn, and the bite improves. This is our tale-side of hardness gates as set in docs/technology-systems/crafting-design.md.

- Lantern Praxis: We hang warm lamps at a mouth to mark it safe and true. A line of steady light reads as haven, and we keep them trimmed so the dark does not lie. Stray colors and wandering glows are distrusted as wild stone.


## 8) Places & Proper Nouns (Glossary with Stable IDs)

- place.tavern.claims_mouth — Claim’s Mouth is the neutral tavern at the Far Mine’s lip, a hearth for warrants, ale, and uneasy truces.
- myth.device.under_mechanism — The Under-Mechanism is the elder lattice that senses stress and rethreads caverns in a living spiral.
- culture.deepwrights — The Deepwrights, called Prismwrights by lorekeepers, carved hymns into crystal to command pressure and light.
- charter.first_warrant — The First Warrant is the charter that founded Claim’s Mouth, ended the feuds, and fixed the Three‑Wide Law.
- rite.first_spark — The Rite of First Spark is a forge-blessing where a tool earns its temper and a delver earns the tool.
- law.three_wide — The Three‑Wide Law is the custom that keeps lanes and doors broad enough for safety, honor, and swift retreat.


## 9) UI Tooltip Hooks [HOOK]

[HOOK] Stone laughs at a dull bite. Temper tools or turn back.

[HOOK] Keep lanes three wide so shield, pick, and pride fit through.

[HOOK] Claim's Mouth waits warm; spend your haul, wet your whistle, plan deeper.

[HOOK] The Mine rethreads spent claims. Maps age like bread, so eat quick.

[HOOK] Sing low near crystal; the Deepwrights carved ears into the light.

[HOOK] Lanterns in a line mark a safe mouth. Stray glow means wild stone.

[HOOK] Choir-Drills wake old seams. If walls hum, brace and mind the roof.

[HOOK] Hard rock? Tier up at the forge; sparks buy teeth the stone respects.


## 10) Quest & Event Seeds (Immediate, MVP-safe)

- hook.quartz.scouting: Scout the Seam — Slip past the lamp band, find a bright vein, and return with shard.quartz. Target: mining. Surface: tavern board.

- hook.goblin.telegraph: Read the Swing — Parry a goblin’s slash_sweep three times without a scratch, then report to the Keeper. Target: combat. Surface: NPC line in data/dialogue/tavern-npc-keeper.json.

- hook.forge.rite: First Spark Temper — Complete the Rite of First Spark by crafting tool.pick.t2.reinforced. Target: crafting. Surface: tavern board and forge prompt.

- hook.lantern.praxis: Trim the Line — Replace three guttering lamps along the safe mouth and note any stray glows. Target: exploration. Surface: tavern board.

- hook.keystone.fragment: Odd Cut Stone — Recover a keystone fragment etched with prism script from the Crystal Caverns. Target: exploration/lore. Surface: NPC line, later vendor upgrade.

- hook.threewide.repair: Clear the Jam — Widen a pinched passage to lawful breadth so carts can pass. Target: mining/build. Surface: guild notice at Claim’s Mouth.


## 11) Integration Notes (For Engineers/Designers)

- The Under-Mechanism myth is the diegetic wrapper for procgen and season depth. Safe to surface in loading tooltips and short NPC lines.

- No raw color or audio tokens appear in the lore body; only conceptual mentions. File references are listed in Cross-refs and stable IDs in Glossary and Quest Seeds. Color usage should align with data/visual/color-palette.json. Ambient loop reference limited to ambient.tavern.loopA in data/audio/sound-manifest.json.

- Text discipline: all [HOOK] lines are 140 characters or fewer. Names and IDs are stable. Avoid heavy punctuation in UI strings; keep them plain-spoken.

- Three‑Wide Law informs lane and door generation and matches spacing assumptions in docs/combat-systems/combat-design.md. Crafting tiers mirror hardness gates in docs/technology-systems/crafting-design.md.

- Biome tie-in: Crystal Caverns content aligns with data/world/biome-crystal-caverns.json. Tavern Keeper lines align with data/dialogue/tavern-npc-keeper.json.


## 12) Versioning & Acceptance

v1.0

Acceptance checklist:
- Contains sections 1–11
- Includes 6–8 [HOOK] lines (≤140 chars)
- Uses stable ids for glossary and hooks
- No conflicts with existing ids (tools, audio, biome)
- Tone: dwarven, clear, approachable