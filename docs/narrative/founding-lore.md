# The Far Mine — Founding Lore & Narrative Framework (Sprint 1 v0.1)

- Author: Lorekeeper Runebeard (Epsilon)
- Version/Date: v0.1, 2026-02-19
- Status: Draft v0.1
- Scope: Sprint 1 vertical slice; Level 1 only; tone and hooks fit for in-game snippets and docs.

## Tonal/Narrative Pillars

- Grim Industry, Warm Hearth — calloused hands, softer voices after shift.
- Ancient Depths, Living Steam — old stone listens; engines answer in breath.
- Oath Before Ore — vows bind harder than iron’s grain.
- Wonder Over Dread — awe first; peril implied, never dwelt upon.
- Songs in Crystal, Truth in Soot — memory glows; proof smudges the cheek.

## Founding Myth: “The Bottom That Fled”

The elders say the Mine once had a bottom you could spit upon. Then came the first Deepturn, when the bedrock slid like a sleeping whale. Paths rethreaded. Shafts bent back upon themselves. From that night, the bottom began to flee, and the stone learned the trick of changing its mind.

The rune-echo tides started soon after. In quiet watches you could hear a seam hum and fall silent, as if breath passed through it. Old hands listened with picks laid flat and claimed they could feel the bedrock’s pulse retreat another arm’s length with each tide.

In those days the Emberthrone clan dug a coalglass seam that sang like a wet saw. Their captains spoke the pick-oath at a crosscut—“return with what you carry or return not”—and the crew set their hearthbond. Some call that the first shape of the Guild Oath, sworn more to each other than to gold.

At a faultline they struck a steamspring. Pressure took a fingerboard like a reed and made it pipe. They learned to harness it: coils stolen warm from the rock, riveted to shells that walked if you fed them breath and prayer. The first automata were simple bellows on legs, but the elders say even those missed you when you slept elsewhere.

The Cost came next, counted in quiet. A collapse swallowed a laddered face; lamps went dim in a corridor that still glows in the telling. Expeditions vanished beyond the singing lifts—elevators that hummed on their own cadence. The taboo took hold: ride a singing lift and your name leaves the roll before you do.

Yet the Promise gleamed. Crystals that kept memory-light without smoke. Metals that shrugged rust like rain. Tools that sang true for three generations, and names etched in coalglass that never blurred. The Mine, they say, is bottomless not for lack of ground but because the ground prefers a deeper song each season.

So the Emberthrone and those who joined them bound their fortunes to the fleeing bottom. If the rock would not stand for them, they would follow its retreat and make a living bridge of oath, craft, and steam. Each Deepturn, they tapped the wall and listened for tomorrow.

## The Guild Compact (Overview)

The Dwarven Mining Guilds arose to keep the Mine’s hunger from turning us upon ourselves. Work is apportioned, disputes heard, and tallies kept by the Adjudicators, whose hammers strike thrice—once for claim, once for craft, once for crew. Competition is ritualized: we vie for seams and renown, but we leave the killing to the stone, not to kin.

Three cohorts steer much of the present talk: faction.guild.glassgear, faction.guild.brassbound, and faction.guild.coilhammers. Their charters differ, their songs do not always rhyme, yet all bend to the Compact. A breach of Compact means no shares, no shelter, and no names in the ledger. That, the elders say, is exile colder than rime.

Rivalry sharpens edges, not throats. When the Deepturn comes and paths reweave, crews share chalkmarks and breath if they must, for tomorrow the seam may favor any banner. The Compact keeps the Mine from becoming a tomb of grudges.

## What Lies Below (Ancient Civilization Sketch)

Whispers speak of the Lost Makers (lore.civ.makers), a people who tuned stone by song and reasoned with steam. Their craft ran in runic logic and memory-crystals bright enough to stain your thoughts with afterglow. If any taught the Mine to move, the elders say, it was them.

Hints remain. Some crystals carry lattice-songs you can hum into a lamp hood to coax a picture. Abandoned automata shells grow barnacle-runes where moisture lingers, as if the script were alive and hungry for pattern. Sealed lifts, long chained, hum on Stillshift days in keys no dwarf owns, as though attending meetings we were not invited to.

We do not claim them as gods or ghosts. We call them Makers because the work outlived the workers. Their proofs are in the seams, and their warnings in the silence between.

## Mine Mood Lexicon v0.1

- mood.stillshift — Stillshift: hush of cooling stone.
- mood.gearwhisper — Gearwhisper: faint clinks, far-off chains.
- mood.rimebreath — Rimebreath: lantern frost, brittle echoes.
- mood.coalseethe — Coalseethe: warm vents, soft hammers.
- mood.runebloom — Runebloom: crystals hum, thoughts ring.
- mood.slagrain — Slagrain: dustfall, patient drips counting.
- mood.tremorhymn — Tremorhymn: floor murmurs, ribs reply.
- mood.chainprayer — Chainprayer: links sway, measured creak chorus.
- mood.hearthglow — Hearthglow: stew steam, boots thawing quiet.

Usage guidelines:
- Keep lines brief (5–7 words), no spoilers, mood not plot.
- Map each to ambient SFX tags (e.g., sfx.amb.mine.stillshift).
- Use Discord format: Mine Mood: <Name> — <5–7-word vibe>.
- Prefer consistent cadence; avoid character quotes.

## Glossary (v0.1)

- term.deepturn — Deepturn: A shift when the rock “moves” and paths reweave; crews mark walls and wait it out.
- term.steamspring — Steamspring: A pressure-well that feeds engines and baths; sweet warmth, cruel pressure.
- term.rune-echo — Rune-echo: Residual song in crystal veins; a hum like memory remembering itself.
- term.hearthbond — Hearthbond: Oath between crew and captain; eat, labor, and answer together.
- term.singing_lift — Singing Lift: Forbidden elevators that hum of their own accord; taboo rides end in silence.
- term.pick-oath — Pick-oath: First vow to return with what you carry; no burden greater than your word.
- term.gearfast — Gearfast: Ritual halt to fix and think; tools down, minds up, tempers cool.
- term.lampwright — Lampwright: Keeper of light and breath; tends oil, mantles, and the counting of air.
- term.coalglass — Coalglass: Black crystal used for memory etchings; takes a keen mark, keeps it.
- term.bedrock_wind — Bedrock Wind: Phantom draft felt deep below; no tunnel earns it, yet it comes.

## Content Boundaries & Safety Notes

- Industrial peril implied, not depicted in graphic detail; focus on craft and caution.
- No graphic gore; injuries referenced obliquely and respectfully.
- No slurs or demeaning caricatures; dwarven labor portrayed with dignity.
- Wonder preferred over horror; awe and mystery lead tone.
- Avoid hard system claims; keep mythic hedges in narrative beats.
- Respect taboos as cultural texture, not shock devices.

## Integration Notes & Hooks

- Stable tokens used: mood.*, lore.civ.makers, term.*, faction.guild.* for cross-file alignment.
- Placement hooks: tavern tips in data/dialogue/tavern-npc-keeper.json; L1 room lore props in anchors.rooms.
- Ambient mapping: mood.* → sfx.amb.mine.<token_tail> (e.g., stillshift, gearwhisper).
- Quest seed anchors (expand in factions doc): room.tunnel, room.cavern, room.ore, anchors.lights.
- Adjudicator mentions enable dialogue barks and arbitration events in Level 1.

## Risks & Assumptions

- Risk: lore tokens collide with audio/visual IDs. Mitigation: prefix mood./term./lore. and log to shared manifest.
- Assumption: “Mine Mood” posted daily; Zeta maps moods to ambient layers within sfx.amb.mine.*.

## Acceptance Checklist

- Founding myth present with bottomless rationale via Deepturn, retreating bedrock, rune-echo tides.
- Ancient civilization (lore.civ.makers) sketched with atmospheric hints.
- Tonal/Narrative pillars listed (3–5 bullets).
- Guild Compact overview with adjudicator tradition and non-genocidal rivalry; factions referenced via tokens.
- Mine Mood Lexicon includes 7–10 labels with usage notes.
- Glossary includes 10 dwarven terms with flavorful, non-mechanical definitions.
- Stable tokenization used consistently across sections.