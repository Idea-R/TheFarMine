# Guild Factions of The Far Mine — Banners, Boasts, and Bargains (Sprint 1)

Provenance: owner @epsilon (Narrative Systems — Lorekeeper Runebeard)

Cross-References:
- docs/narrative/founding-lore.md (§The Dwarven Guild Compact)
- docs/technology-systems/crafting-design.md (§Stations, Tools)
- docs/combat-systems/combat-design.md (§Events & Enemy ids)
- data/world/biome-crystal-caverns.json (biome id)
- data/items/tools.json (tool ids)
- data/combat/enemy-*.json (enemy ids)
- docs/community/engagement-playbook.md (Brewmaster role echo)



## Canonical Faction Tokens (Index)

- lore.guild.steamwrights — The Steamwright Compact
  - Tagline: Tinkerers who yoke pressure and polish into honest work.
- lore.guild.stonebinders — The Stonebinder Lodge
  - Tagline: Oath-keepers who measure twice and tunnel true.
- lore.guild.emberwatch — The Emberwatch Covenant
  - Tagline: Vigil-keepers who bear the first lamp and last stand.

Tokens above are stable for save-data/UI and may be referenced by quests, vendors, and journals without change across sprints.



## Faction Profiles

### The Steamwright Compact (lore.guild.steamwrights)

- Motto: Where brass sings, stone yields.
- Crest & Colors: A toothed gear clasping a pick over rising steam. Brass frames and warm steel accents; highlights ride ui.frame.brass and characters.outline.light, soot-dark recesses trimmed in ui.shadow.deep.
- Ethos & Backstory:
  Born from the clinker-sparks of the early boilers, the Compact swore that clever hands make lighter burdens. When the first steam throat howled in the Far Mine, they tuned it to a worker’s rhythm, not a war drum. Their masters prize iteration and field-wisdom: sketch, forge, test, mend, then brag only if it holds. They honor the Compact of Guilds by delivering tools that any hall can service when the night deepens. Their elders still keep the ledger of burst seams and burned fingers, each scar a lesson inked in oil. Yet for all their caution, they love a trial by rock; the true measure of an idea is the sound it makes biting quartz. They stand cordial with book-lore but impatient with dithering, happiest when a forge’s breath fogs the visor and a prototype meets the seam.
- Specialty (Crafting/Stations):
  The Compact centers on crafting and station mastery. Their quests tend toward field trials and incremental refinements; rewards flavor as upgraded patterns, fit-tests, or refurbish rights—never promised as buffs, but framed as craftsmanship earned.
- Signature Assets (ids/examples):
  - Tools/Stations: tool.pick.t2.reinforced, tool.drill.t3.steam, station.steamworks.t3
  - Materials: mat.scrap.copper, mat.ore.iron
- Tavern Presence:
  In lore.place.tavern.hearth_and_anvil they annex a sturdy table, unrolling sketches beside dented mugs. The Keeper mutters they pay on time, in coin or clever fixes for a leaky tap.
- Player-Facing Quest Hooks:
  - Field-test a reinforced haft against a quartz seam
  - Escort a lamp line while a boiler cart hisses
  - Recover goblin scrap for a gear clearance check
  - Map vented shafts to site a safe steamworks bench
- Relationship Stance:
  - With Stonebinders: cooperate on safety rites and gauge sizes; friction over pace and tolerances.
  - With Emberwatch: admire courage on field tests; clash when risk appetite leaps past checklist.
- UI-safe Snippets:
  - Tight threads, true bite, no wasted swing.
  - Steam up, chin down, let the tool speak first.

---

### The Stonebinder Lodge (lore.guild.stonebinders)

- Motto: Measure deep, stand fast.
- Crest & Colors: A knotted cord encircling a three-marked door lintel. Cool granite tones, chalk-white lines, and oath-red knots; frames lean on ui.frame.iron and guide-stripes on ui.signal.line.
- Ethos & Backstory:
  The Lodge was hewn in the hush after a cave-in that taught law the hard way. They codified the lamp-law and the lore.law.three_wide so that every dwarf passes a door as if carrying a wounded friend. Their masters bind oaths like mortar: you do not cut corners where corners cut back. Patient surveyors, they read the grain of the world and listen for hollow boasts in stone. Yet tradition here is not stall; it is a rope line—move forward, hand to hand. In their halls, maps are living things, breathed on by chalk and sweat, updated by any who return. They resent slapdash rigging and celebrate the quiet hero who sets a brace no one notices until it holds. To them, the Mine is a long conversation: knock, wait, answer, and the mountain answers back.
- Specialty (Exploration/Worldgen savvy):
  The Lodge focuses on mapping, corridor law, and stable routes. Their tasks steer players to survey, stake, and tidy, with rewards framed as safe passage rights, signage kits, or improved wayfinding—not mechanical guarantees.
- Signature Assets (ids/examples):
  - Stations/Tools: station.workbench.t1, tool.pick.t1.basic, station.forge.t2
  - Enemies/Banes: enemy.cave.burrower (tracked hazard behavior)
- Tavern Presence:
  At lore.place.tavern.hearth_and_anvil they sit near the door, chalking maps on tabletops with patient taps. The Keeper says their coins are clean and their advice cleaner.
- Player-Facing Quest Hooks:
  - Mark a three-wide corridor through the first quartz beds
  - Set braces where burrowers soften pillars
  - Survey a safe route to a copper seam and back
  - Post lamp-law placards at risky junctions
- Relationship Stance:
  - With Steamwrights: welcome calibrated tools; argue when prototypes skip proofing.
  - With Emberwatch: respect vigilance; bridle at rash charges that scuff lamp-law.
- UI-safe Snippets:
  - Chalk first, charge later.
  - A wide door saves a narrow breath.

---

### The Emberwatch Covenant (lore.guild.emberwatch)

- Motto: Hold the light, send the dark running.
- Crest & Colors: A lifted lantern flanked by crossing hammers. Ember-orange cores with smoke-gray edges; warning bands marked in ui.signal.warn and lamplight picked by ui.glow.warm.
- Ethos & Backstory:
  The Covenant took shape when the first goblin raid skittered like knives over slate. They vowed to be the first awake and last asleep, their lamps ever at the lip of shadow. Not war-mad, but war-ready, they drill in close quarters where echo lies. They study enemy habits the way others study ore grain, because a predictable foe is a mined seam of safety. Their chaplains bless helmets and footings alike, preaching that courage without care is a broken lantern. Emberwatch stories are short, sharp, and told with fists thudding tabletops—each a lesson on when to fall back and when to surge. They honor the Compact by escorting the fragile and meeting the night halfway, adopting any trick that brings their people home, be it steam’s hiss or chalk’s truth, so long as the lamp keeps burning.
- Specialty (Combat/Tactics):
  The Covenant emphasizes patrols, escorts, and counter-ambush craft. Their quests cue scouting, timed response, and den-clearing; rewards shade toward safe-escort favors or training tales, not stat promises.
- Signature Assets (ids/examples):
  - Enemies: enemy.goblin.grunt, enemy.cave.burrower
  - Tools/Materials: tool.pick.t2.reinforced, mat.ore.iron
- Tavern Presence:
  In lore.place.tavern.hearth_and_anvil they keep to the walls, eyes on doors, buying a round for bruised knuckles. The Keeper says their lamp never gutters, even in a draft.
- Player-Facing Quest Hooks:
  - Escort a lamp line through a goblin-prone bend
  - Bait and trace a burrower to its soft tunnel
  - Recover a fallen banner near iron markers
  - Drill a rally knock into fresh door lintels
- Relationship Stance:
  - With Steamwrights: hungry for new kit; chafe at delays for polish and proofs.
  - With Stonebinders: share lamp-law; bristle when caution stalls a hot trail.
- UI-safe Snippets:
  - Keep the light moving.
  - Hear the rock, then hit the thing in it.



## Relationship Web (Compact Matrix)

- Steamwrights ↔ Stonebinders: trade tool precision for route safety; quarrel when pace outruns proof.
- Steamwrights ↔ Emberwatch: spark together on field trials; strain when bold leaps skip safeguards.
- Stonebinders ↔ Emberwatch: tradition tempers daring; both insist the lamp-law holds in any rush.



## Quest Hook Library (All Factions, Re-usable Seeds)

- [mining] Trace a safe three-wide to fresh copper and chalk the turns
- [crafting] Bench-test a basic pick on quartz and report wear marks
- [combat] Scout goblin grunt patrol beats near the old brace line
- [mining] Flag burrower sink-soft floors before hauling starts
- [crafting] Salvage copper scrap to true a wobbling drill collar
- [combat] Run a two-lamp escort through a choke and back clean
- [mining] Tap-map a suspected hollow behind iron streaks
- [crafting] Align forge tongs at station.forge.t2 for heavy heads
- [combat] Set a rally knock pattern on three new doors



## Integration Notes & Stable IDs

- Stable tokens for systems:
  - Faction tokens: lore.guild.steamwrights | lore.guild.stonebinders | lore.guild.emberwatch
  - Tavern: lore.place.tavern.hearth_and_anvil
  - Laws: lore.law.three_wide (door approach discipline)
  - Biome: lore.biome.crystal_caverns
- Engineering handshake notes:
  - QuestJournal UI may reference faction tokens for banners/icons; apply palette tokens from data/visual/color-palette.json. No hex values in this document.
  - Audio: ambient cues may include lore.sound.ambient.tavern.loopA in Tavern scenes; confirm id with @zeta when manifest lands.
  - Flavor-first language only; avoid implying mechanical buffs or guarantees in text.



## Tavern Keeper Cross-Tie (Dialogue Seeds)

- On The Steamwright Compact:
  - Steamwrights fixed my tap and charged me less than a spill
  - If it hisses they grin and call it progress
  - They test steel the way I test ale, often and honest

- On The Stonebinder Lodge:
  - Lodge folk leave chalk lines straighter than my bar
  - Three wide at the door, they drill it into you
  - They pay for maps and pay again if the chalk holds

- On The Emberwatch Covenant:
  - Emberwatch drink with backs to the wall and eyes on mine
  - Their lamp makes even bad nights polite
  - When trouble knocks they are already halfway to the door



## Acceptance Checklist

- Three factions present with distinct identities, mottos, specialties, and hooks.
- All UI-safe lines within 90–120 chars as specified; faction tokens stable and consistent.
- References align with existing ids and MVP scope: tools, stations, materials, enemies.
- Document parses as Markdown, consistent Lorekeeper Runebeard voice, ready to commit to docs/narrative/.