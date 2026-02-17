# Founding Lore — The First Warrant and the Bottomless Vein (Sprint 1)

Provenance
- Owner: @epsilon (Narrative Systems — Lorekeeper Runebeard)
- Cross-refs:
  - docs/narrative/guild-factions.md (§The Three Guilds)
  - docs/world-generation/cave-gen-algorithm.md (§Lanes & Rooms)
  - docs/technology-systems/crafting-design.md (§Stations & tiers)
  - docs/combat-systems/combat-design.md (§Three‑wide law & telegraphs)
  - data/visual/color-palette.json (token-only mentions)
  - data/combat/*.json (enemy teaches)
- Color/Light Token Policy: Colors, lights, and telegraphs are referenced only by palette tokens (see data/visual/color-palette.json). No raw hex permitted anywhere in narrative text or UI strings.

## TL;DR (Player-Facing Summary)
- The Far Mine is a living seam beneath Claim’s Mouth, ever-shifting and rich—if you keep your wits.
- It is “bottomless” by fault, steam, or design; none agree, all return with new stone underfoot.
- The First Warrant binds the three guilds to shared lanes, lamp rites, salvage, and ledgered claims.
- At Claim’s Mouth, the guilds hold truce under the Tavern Keeper’s eye and chalk.
- Below lie elder signs—measured cuts and humming crystal—that speak of a civilization before dwarves.
- Honor the Lane Law and the lamps; the depth keeps its own count.

## The Origin of Claim’s Mouth (In-World Chronicle)
We found the wound at dawn, a sinkhole rimmed in frost and old ash, the earth puckered like a scar that never healed. A rope, a joke, a dare, and then the first lantern went over, its glow a coin falling into a thirsty throat.

The air answered with a low hum from seams of crystal, and in that sound we heard both welcome and warning. We fixed the first lanterns—tokens of mapping.lighting.lampWarm—at the lip, then the second, then the third, learning that light sets the heartbeat of a crew.

In those first descents a tunnel narrowed and took three beards at the shoulders to squeeze through, side-by-side. When the goblins came squealing, we learned the wisdom hard: three across to fight or flee, no more, no less. That day we swore the lanes shall be three-wide or not at all.

We chalked marks for rooms off the lanes—broad bellies for breath and work—tying our steps to room-templates the earth would keep making and remaking. The cave’s logic grew familiar: lanes to carry us, rooms to hold us, lamps to bind them.

From that mouth outward, we traced the skeleton of a city we had yet to build, and the mine felt us like a sleeper stirs when a hearth is poked. The first map was wrong by evening; by morning, the second was right enough to live.

So I, Runebeard, set down the law: three-wide lanes, lamp-warm halls, rooms like bellies to rest—and when the earth shifts again, we shift with it. See docs/world-generation/cave-gen-algorithm.md (§Lanes & Rooms) for the templates that keep us breathing.

## The First Warrant — Oaths, Measures, and the Law
The First Warrant is the binding charter sworn by the Brassbound Consortium, Emberforge League, and Crystal Ordinate, with the Tavern Keeper of Claim’s Mouth as witness and steward. It holds our peace where ore and pride would sooner quarrel.

Core Tenets
- Lane Law (Three‑Wide): All active corridors within the claim shall be maintained three tiles wide for passage and fair combat. This keeps traffic clear and telegraphs readable, as codified in docs/combat-systems/combat-design.md (§Three‑wide law & telegraphs).
- Lamp Rites & Signage: Crews shall place and tend mapping.lighting.lampWarm at marked intervals; sanctioned signage and frames use ui.frame.brass to guide hands and eyes.
- Right of Salvage & Return: Gear and scrap retrieved from the lanes and rooms return to their crew’s ledger; repaired at stations per docs/technology-systems/crafting-design.md (§Stations & tiers).
- Ledger Marks for Claims: Boundaries, quotas, and Depth-Marks are recorded with ui.text.numbers; disputes are settled by the Warrant board in the Tavern.

Player-Facing Callouts
- Corridor Width: Every main corridor you traverse will read three tiles wide; chokepoints belong to rooms, not lanes.
- Lamp Placements: Lamp hooks and nodes appear at Warrant intervals; you’ll see mapping.lighting.lampWarm anchor points.
- Contract Postings: Claim notices and salvage rights appear on ui.frame.brass boards with ui.text.numbers tallying quotas.
- Fair Fights: Enemy telegraphs respect lane width—your block, dodge, and counter timing stays legible and honest.

## Why the Mine Is Bottomless (Three Theories, One Warning)

A) The Resonant Fault
Some say the fault under Claim’s Mouth is a harp stretched across the world’s ribs. Where terrain.ore.quartz and other seams cross, the stone hums and shifts, singing new halls into the places of old. In the glow of mapping.lighting.crystalCool, we’ve watched a wall unweave and breathe itself elsewhere.

This theory says the map is written in chords, not ink. Strike the wrong note and yesterday’s room becomes today’s bend. It’s why the lanes must be three-wide and lit, that the song keeps passage trued for a while and our feet find a pattern again.

B) Steam of the World
Others claim the mine rides the world’s hot breath. Far below, a Steam Core bellows; its pulses push and pull the under-ways like a smith’s lungs against a bellows bag. Old tunnels sweat, slump, and shift, and what was true at dawn can buckle by dusk.

Today we skirt warm cracks and listen at vents; tomorrow we may forge Magma Depths into the Warrant, when season and steel allow. Until then, the heat reminds us: the earth is not still, and your map is an idea on a sweating hand.

C) The Clockwork Archive
A few, with quiet voices, speak of the Makers Below and their Archive—a great mechanism that turns strata like pages in a ledger. You hear the tick in the dark between picks, and you find brass-etched plates that read nothing you know. Perhaps the mine is a library, and we are the dust.

If so, then the lanes are margins kept clear by an older mind. It will turn the page when it pleases. If we are wise, we’ll learn to read the edges and step when the gears whisper.

One Warning
Believe any theory you like, but mark this: deeper seasons demand deeper oaths. Each new depth will test the Warrant’s tenets; walk only as your gear, lamps, and crew can keep the law. Depth counts in more than numbers.

## The Makers Below (Elder Civilization Sketch)
Before our chisels sang, there was an order that measured the stone. We name them The Ordinate of Stone and Signal, for their works bind rock to rhythm and sign. Their motifs run in arcs too pure for accident and in crystals tuned to hum when lamps are quenched.

Their halls favor resonant lines over ornament; a whisper at one end will find you three rooms later. Their machines—if machines they are—prefer balance: three lanes, six pillars, twelve steps. To enter is to feel judged by a rule you never learned.

When the Ordinate wished to speak, they did it with signal, not tongue. A plate might glow, a seam might shiver; a shape in dust aligns only when your lamp passes. Expect mapping.telegraph.emerge.amber on thresholds where something old chooses to wake.

We have glimpsed the Wardens—guardians set to keep measure, not murder. They stand with patience, moving when ratios break: strike wrong, crowd the lanes, or shadow the lamps, and they answer. We’ll meet them in a season where our courage is tiered to match.

Environmental Tells for Designers
- Three-chevron lane markers, carved low at knee-height, to reinforce the Lane Law in ancient stone.
- Resonance obelisks: slender pillars that hum near mapping.lighting.crystalCool, aligning footfall to cadence.
- Brass-etched plates inset in lintels, inscribed with unknown numerals and countersunk along ui.frame.brass motifs.

## The Three Guilds at Truce (Bridge to Faction Doc)
Brassbound Consortium
- Makers of measures and keepers of ledgers. They trust the Warrant most and say the mine is a contract the earth cannot break. Their colors lean to ui.frame.brass, their motto: “Count it, claim it.” See docs/narrative/guild-factions.md for contracts.

Emberforge League
- Fire-first delvers who read the Mine’s breath as promise. They favor lamp heat and swing fast, treating mapping.lighting.lampWarm as hearth and omen. Their motto: “Heat the path, then walk it.” Truce holds their temper at Claim’s Mouth.

Crystal Ordinate
- Quiet listeners to stone and song. They favor mapping.lighting.crystalCool and speak of resonance as law older than kings. Their motto: “Hear the depth before you see it.” They interpret the bottomless shifts as deliberate design.

## Enemies as Teachers (Design-Facing Notes)
Goblin Grunt — data/combat/enemy-goblin-grunt.json
- Lamp rats of the lanes: they scavenge where mapping.lighting.lampWarm keeps courage high, darting at the edges to test your guard.
- Teaches block and timing: their jabs telegraph fair within three-wide, inviting parry, counter, or step-punish per docs/combat-systems/combat-design.md.
- Myth shard: they fear the dark hum and treat lamps as totems; break a lamp and they howl at the Resonance.

Cave Burrower — data/combat/enemy-cave-burrower.json
- A tunneled sprinter that feels the beat of your steps. The ground answers with mapping.telegraph.emerge.amber before it breaches.
- Teaches dodge/spacing: hold center-lane, step out at the halo, punish the tail; spacing discipline makes survival, not greed.
- Myth shard: it “drinks” hum from seams; where terrain.ore.quartz is near, it grows bold and breaks twice.

## Founding Terms & Lexicon (For UI/Tooltips)
- Claim’s Mouth: The surface sinkhole and town hub; truce ground and Warrant hall.
- Warrant: Binding charter of lanes, lamps, salvage, and ledgers; enforced at the Tavern.
- Lamp Rite: Crew duty to place and tend mapping.lighting.lampWarm at marked intervals.
- Lane Law: The three‑wide rule for corridors; fairness in traffic and combat.
- Resonance: The hum of crystal seams that reorders stone and mind.
- Brass-Tithe: The small fee paid in coin or scrap to maintain ui.frame.brass boards and signals.
- Depth-Mark: The recorded floor you’ve proven; tracked with ui.text.numbers on the ledger.
- Steam Core: The deep engine of heat some claim bellows beneath all.

## [HOOK] Micro-Snippets for UI (≤140 chars each)
[HOOK] Three-wide saves beards. Keep the Lane Law or the wall will teach you.
[HOOK] Tend your lamps. mapping.lighting.lampWarm keeps fear and goblins small.
[HOOK] Hear the hum? mapping.lighting.crystalCool means the stone may move.
[HOOK] Bottomless is a promise, not a boast. Mark your Depth and return.
[HOOK] The Warrant holds at Claim’s Mouth. Settle it at the board, not the blade.
[HOOK] mapping.telegraph.emerge.amber on stone? Step aside, let the beast miss.
[HOOK] Salvage returns to those who return. Repair, then descend wiser.
[HOOK] Three guilds, one truce. Break it, and the Mine breaks you.

## IDs & Designer Hooks (Copy-Paste Ready)
- lore.mine.first_warrant — Defines the charter; surfaces: codex, contract flavor, tavern VO.
- lore.mine.bottomless.theories — Three causes for shifting depth; surfaces: codex, loading tips.
- lore.guilds.truce — Terms of peace at Claim’s Mouth; surfaces: codex, UI banner tips.
- lore.resonance.rules — How resonance justifies generation; surfaces: codex, tutorial hints.
- lore.lanes.law — Three-wide corridor mandate; surfaces: tooltips, level-gen notes.
- lore.lamps.rites — Placement and tending of mapping.lighting.lampWarm; surfaces: tutorial UI.
- lore.elders.ordinal — Sketch of the Ordinate of Stone and Signal; surfaces: codex, ruin placards.
- lore.depth.cautions — Season/depth admonitions; surfaces: loading tips, death screen notes.
- lore.tavern.claims_mouth — Tavern Keeper as witness; surfaces: dialog, hub signage.
- lore.crafting.salvage_rights — Right of salvage and repair links; surfaces: station UI, contracts.
- lore.ui.ledger_marks — ui.text.numbers claims and Depth-Marks; surfaces: HUD, board UI.
- lore.enemies.goblins — Grunt myth and teaching role; surfaces: enemy codex, tutorial prompts.
- lore.enemies.burrower — Burrower telegraph and spacing lesson; surfaces: enemy codex, tips.
- lore.elders.telegraph — mapping.telegraph.emerge.amber meanings; surfaces: tutorial, ruin events.

## Continuity & Acceptance Checklist
- Aligns with Sprint 1 specs; introduces no mechanical contradictions.
- Uses token-only mentions for all colors/lights/telegraphs; no raw hex anywhere.
- Corridors/lane language enforces the three‑wide law and maps to cave-gen rules.
- Elder civilization hints are non-binding and reserve mechanics for later seasons.
- [HOOK] lines are each ≤140 characters, single-line, ready for UI.
- Enemy telegraphs and fairness align with docs/combat-systems/combat-design.md.
- Crafting references tie only to existing repair/station tiers in Sprint 1.
- Names and terms match docs/narrative/guild-factions.md for the three guilds.
- Cross-references to data/combat/*.json point to MVP enemy configs.
- Mirror dialogue/entry IDs when tavern JSON lands; keep lore.* IDs consistent across systems.