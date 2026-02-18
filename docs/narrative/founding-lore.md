# Founding Lore of The Far Mine — The Bottomless Oath (Sprint 1)

Provenance: owner @epsilon (Narrative Systems — Lorekeeper Runebeard)

Cross-References:
- docs/narrative/guild-factions.md (§The Dwarven Guild Compact)
- docs/world-generation/cave-gen-algorithm.md (§Three‑Wide law and biome ids)
- docs/technology-systems/crafting-design.md (§Stations/Tools ids)
- data/items/tools.json
- data/audio/sound-manifest.json (amb.tavern.loopA)
- docs/combat-systems/combat-design.md (enemy ids)



## Canonical Tokens Index (for engineers/UI)

Stable tokens referenced throughout the lore:
- lore.mine.the_far_mine — The Far Mine (proper noun)
- lore.law.three_wide — The Three‑Wide Law
- lore.place.tavern.hearth_and_anvil — "The Hearth & Anvil" tavern
- lore.guild.steamwrights | lore.guild.stonebinders | lore.guild.emberwatch — faction tokens
- lore.biome.crystal_caverns — Level 1 biome reference
- lore.civilization.underkings — the ancient makers below (placeholder token)
- lore.sound.ambient.tavern.loopA — tavern ambience cue (aligns with amb.tavern.loopA)

Note: tokens are stable and may be referenced by UI tooltips, quest journal, and ambient triggers; no mechanical promises implied.



## The Legend of the First Break (Origin of The Far Mine)

I was there the night the bedrock rang like a bell no hammer had struck. The sky held its breath and the hearth-coals sighed as though a draft had turned in the bones of the mountain. Then came the seam—no crack a mason would name, but a line of perfect unmaking—threading through basalt and schist as if the stone had remembered a door and opened it again. Our lanterns peered over the lip and found not a floor, only a vein diving straight down, a dark throat ribbed with crystals that caught the light and threw it back in patient colors.

We rigged lines to test it, ropes song‑tested, knots blessed with spit and brass, and dropped the plumb. It drank hemp for an hour with no bottom-tug. So the first of us made our bargains: breath for depth (for the air grows stingy below), brass for lift (for the winch must love you), and a little blood to wake the stone to our names—just the thumbprint smear on a pick’s neck, the way our grandfolks did when steel joined clan-work. Down we went, past seams that hummed. Each time we called, the answer came not as echo, but as harmonics—fifth upon third upon root—until the whole vein felt like a standing chord waiting for a hand.

When the rope coffers ran dry and still the plumb whispered down, we named it as true dwarves name: by its farthest measure. “Mark it,” I said, chalk to slate. “Write lore.mine.the_far_mine in the ledger and in your lungs. The Far Mine.” The name fit like a collar, and the crystals answered with a faint, glass‑sweet tremor. To this turn, the first descent is sung not for courage but for calibration, for we learned that night the vein listens to the pitch of our work. Some say that is why a hammer swings truer in the lore.biome.crystal_caverns, where the resonance steadies the wrist. I say only: hear before you hew.

> The stone keeps the songs we dare to sing within it.

> If you must descend, carry a story and a spare line.



## The Dwarven Guild Compact (Why guilds, why a tavern hub)

We were bright with the First Break and brighter still with envy. Claims were chalked twice over, lamp‑lines crossed like stubborn goats, and more than one cart came back brassed to splinters “by accident.” So we gathered in the only room all our boots consented to soil together—the common floor of lore.place.tavern.hearth_and_anvil. There, with tankards still and ledgers open, the three banners were lashed into one scroll: the Dwarven Guild Compact. It did not make us kin, but it made us predictable.

The Compact bound lamp to span and span to safety, codified the hewing lanes, and cooled the quarrels. The keep’s bell, not a supervisor’s glare, would end disputes. Door approaches hewed three across, and corridors kept to three palms of dwarf broad—what we now call the lore.law.three_wide—so haulers, wardens, and tinkerers might pass without bruised tempers or pinched lungs. The Hearth & Anvil stood neutral by oath; its long table became our coordinate of peace, our staging forge, our rumor mill and our rest. If a tune is playing there (and it is—lore.sound.ambient.tavern.loopA), you may trust for a few measures that your back is to a friendly wall.

Compact Articles (select):
- Lamps placed at measured spans; darkness between is a fine to all.
- Corridors and door approaches kept Three‑Wide by law and common sense.
- Ore rights by first chip, witnessed and inked; no ghost‑claims.
- No sabotage of tools or stations; a bent wrench is a bent future.
- The keeper’s bell ends disputes; hammers cool until dawn.



## Why the Mine is Bottomless (Diegetic Explanation)

Ask ten miners and you’ll get eleven answers, but all rhyme. The Far Mine is bottomless because it is not a single shaft in the way a straw is a straw. It is a column of resonant strata stacked like organ pipes, each crystal bed swallowing sound and sight and handing both downward. Seams shift like fish in a dark river; where you mapped a sill yesterday you’ll find a throat today. The charts are honest, yet the rock is more so. Some feel a push at the soles a heartbeat before the lift groans—a pressure from old machines far below, the breath of a forge that forgot how to stop.

The old books from the brass-ages speak in guarded tongue about breath‑engines, and I have palmed stones that remembered a cut made a century prior: tap them and you’ll hear the tune they kept. “Stone that remembers,” we call it in the ledger, though no claim is made beyond the saying. Add to it the soft drift of plates old as the hills and the polite conspiracies of water, and you have a mine that leans away when chased and opens when you sing true. Bottomless? No. Only longer than we are patient, deeper than we are loud.

> Now and then, in changing seasons, the Mine turns in its sleep and settles deeper.



## What Sleeps Below (Ancient Civilization Seed)

We mark the deep signs with a placeholder token, lore.civilization.underkings, for the scrolls will need space for their proper name once we earn it. They were a maker‑caste, by all angles of the artifacts: brass etched with glyphs that read equally under oil‑light or spark, calibrations tucked into corners like jokes for apprentices. Their scripts are not ink but cut air—chamfered channels that sing when your lamp is at the right height. I have seen doors with no door, only a sentence in metal waiting for the pressure of a correct thumb and the warmth of a remembered tune.

Guardians? Aye. The hill‑legends say the Underkings set watchers to tend their engines, and some of those watchers woke badly. In the driftways we have found husks with spring‑spines and melted lenses, their brass pollen baked by time. Once in a rare while a thing moves that ought to be a relic, and we step light. Even the shallow routes grumble with agitators—a goblin grunt here, a cave burrower there (ledgered as enemy.goblin.grunt and enemy.cave.burrower in the combat scrolls)—as if stirred by vibrations they only half remember. We promise nothing by the telling; the telling is to keep our nerves oiled.

As for relics, the motifs repeat. Keys of steam: valves too fine for a smith’s guesswork, that confess to pressure like a musician to tempo. Stone‑bind runes: not magic, not yet, but a geometry that braces timber as if the mountain itself leans in. Ember‑wards: little sun‑traps set in filigree to keep watch‑fires forever on the verge of catching. Hooks for futures, these, and we’ll hang proper names on them when our wrists have the strength. Until then, we log, we listen, and we step back from brass that hums in the wrong key.



## The Three Guilds at First Light (Bridge to factions doc)

At the opening days, three banners rose over the chalk: the lore.guild.steamwrights with their gauges, pumps, and breath‑wise courage—makers of lifts, lines, and engines patient to pressure; the lore.guild.stonebinders with their squares and spans—keepers of supports, maps, and the calm that makes a wall stand; and the lore.guild.emberwatch with lanterns high and tempers banked—wardens of lanes, watchers of edges, and singers‑down of fear. They bickered like siblings and fought like cliffs, yet under the Compact their quarries fit: steam for motion, stone for meaning, ember for mercy. A mine learns the hands that handle it. The Far Mine learned these three.



## Keeper’s Marginalia (UI-safe snippets)

- Three‑Wide keeps carts friendly and lungs unpinched.
- A lamp every span; shadows eat more than courage.
- Copper sings bright; iron carries the tune.
- Quartz gates hum before they show; listen first.
- The Hearth & Anvil buys no quarrels, only silence.
- First chip marks the claim; ink makes it civil.
- Keep brass polite; pressure remembers insults.
- When the bell speaks, hammers rest and hearts do too.



## Integration Notes & Acceptance

Notes for engineers/designers:
- Tokens listed in §2 are stable for UI/journal. Avoid binding lore language to numeric promises.
- Ambient cue lore.sound.ambient.tavern.loopA aligns with data/audio/sound-manifest.json id amb.tavern.loopA.
- Cross-check ids: tools in data/items/tools.json; stations in docs/technology-systems/crafting-design.md; cave/biome ids per docs/world-generation/cave-gen-algorithm.md.
- Enemy ids enemy.goblin.grunt and enemy.cave.burrower are referenced narratively only; no encounter guarantees are implied by this file.

Acceptance checklist:
- Markdown parses; sections present; tone consistent; UI-safe snippets ≤90 chars.
- Tokens match across this file and guild-factions.md.
- No hard mechanical claims; purely narrative alignment with MVP systems.