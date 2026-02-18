# The Far Mine — Founding Lore & Narrative Framework (Sprint 1 Epsilon)

Author: epsilon (Lorekeeper Runebeard)  
Version/Date: v0.1 — 2026-02-18  
Status: Draft v0.1

Purpose: Anchor tone, world stakes, and shared tokens for UI, audio, and quests. Provide stable ids for cross-team reference and sprint-safe phrasing suitable for in-game surfaces.


## 1) Title & Metadata

- Document id: docs.narrative.founding_lore.sprint1_epsilon
- Owner: epsilon (Lorekeeper Runebeard)
- Scope: Founding myth, pillars, lexicon, hooks, and style guardrails for Sprint 1.


## 2) Founding Myth: The Bottomless Vein

They say the Far Mine was first heard before it was found. A seam above the old valley sang when frost split the cliff, a thin, bell-metal note that did not fade. Stonecutters followed the sound to a fault older than maps and set a trial shaft. The deeper they sank, the clearer the hum: layers answering layers like a choir underfoot. The shaft swallowed rope and day alike, and so the place took its name—Far, because the bottom kept walking away.

Miners now call that hum the Deepsong (id: lore.term.deepsong), the stone’s memory of heat, pressure, and time. The best among us learn to listen—the way dust eddies before a slump, the way a chisel rings at a crystal’s edge. We pass the trick hand to hand, not as magic but as craft: the ear laid to the rib, the palm to the pillar, the wordless count between drips.

When the First Descent vanished for three dawns and returned with half their number and twice their ore, the clans bound their rivalries into rule. At the mouth of Shaft One, we hammered the Oath of Brass (id: lore.term.brass_oath) into a plate set with three rivets a side: share air and light; mark your paths; no lone men in new stone. Thus were the guilds formalized—rights inked, disputes tallied, a law set three-wide so no lifeline would choke, and a seal (id: lore.term.rivet_mark) to bind bargains.

Deeper, the rock wears marks older than our words. Runic cuts, clean as fresh steel. Gears that never tarnish fixed inside geodes. Our scolars name the buried makers the Orecasters (id: lore.civ.orecasters), who tuned ore and crystal with engines of inscription. We mine their fragments and wonder whether their hands learned the Deepsong first—or taught it to the mountain.

At shift-change, the mine itself shifts. At dawn and dusk, when the cold and warmth trade reins, ribs settle and seams creep. Passages open a hand’s breadth here, pinch a boot there. Yet patterns persist: water still finds the low path; pillars still speak when strained; the Deepsong keeps its motif if your ear is true. So the Far Mine remains bottomless in practice and bottomed in principle: changing enough to demand respect, steady enough to be read by those who listen.


## 3) Tonal/Narrative Pillars

- id: pillar.industry_and_ritual — Industry and Ritual  
  Work is worship, and rhythm keeps you safe. Steam and song share the same breath.

- id: pillar.secrets_in_the_stone — Secrets in the Stone  
  The mine remembers. Players learn to read signs, hums, and marks as living guidance.

- id: pillar.steampunk_pragmatism — Steampunk Pragmatism  
  Tools are story. Brass isn’t flair; it’s function with meaning and cost.

- id: pillar.guilds_in_tension — Guilds in Tension  
  Cooperation edged by rivalry. Contracts, toasts, and quiet tallies shape every descent.

- id: pillar.depth_changes_all — Depth Changes All  
  The deeper truth reshapes beliefs. New finds recast old certainties without breaking tone.


## 4) Dwarven Content Boundaries & Style Guardrails

- No hard drop rates, guarantees, or numeric promises in lore, UI, or dialogue.
- Omens are suggestive, not prescriptive; frame as advice, not commands.
- Alcohol references remain tasteful; no glamorizing excess or caricature.
- No slurs. Avoid modern slang and out-of-world idioms.
- Do not bind color words to UI tokens (e.g., avoid “click the green” in diegesis).
- Keep tech grounded: brass/steam/runes have costs and maintenance.
- Names and oaths carry weight; do not use as throwaway jokes.
- Maintain consistency with guild law (e.g., Three‑Wide) across quest copy.
- Surface “moods” as tavern weather; no stat buffs implied in text.


## 5) Glossary (Stable IDs)

- lore.term.deepsong — The mine’s hum; stone memory skilled ears can read.
- lore.term.three_wide — Three‑Wide Law: keep three abreast; never choke a lifeline.
- lore.term.brass_oath — Founding oath; binds safety, shares, and signals in brass.
- lore.term.gearbless — Short benediction over tools before shift.
- lore.term.lampwatch — Night shift; lamps high, talk low.
- lore.term.pitwhisper — Quiet warning passed on breath near danger.
- lore.term.ore_rights — Claimed shares recorded by guild; disputes settled at board.
- lore.term.rivet_mark — Guild seal struck in brass to sign a pact.
- lore.term.slag_story — Playful exaggeration; truth with the dross left on.
- lore.term.steam_benediction — Safety check litany at boilers and winches.
- lore.term.seamreading — Craft of hearing/seeing stress in stone and crystal.
- lore.term.chalk_mark — Temporary path/risk marks; wiped after shift.
- lore.term.depth_tithe — Small cut of haul set aside for fallen and repairs.
- lore.term.tally_beads — Slide-beads cord for counts: carts, hours, crews.
- lore.term.brass_tab — Personal tag in brass; used for check‑in and muster.


## 6) Mine Mood Lexicon + Guidelines

- mood.stillshift — Stillshift — "quiet seam, steady hands" — Use for routine, calm workdays.
- mood.gearbless — Gearbless — "tools true, luck modest" — Use when prep is key; humble tone.
- mood.lampwatch — Lampwatch — "lamps high, eyes sharper" — Night work; vigilance without alarm.
- mood.emberrest — Emberrest — "low coals, gentle voices" — Wind-down hours; reflective beats.
- mood.pitwhisper — Pitwhisper — "stone hush, secrets near" — Tension close; keep prose spare.
- mood.hammerhymn — Hammerhymn — "work-song carries, bold pace" — Confident push; team cadence.
- mood.borestorm — Borestorm — "steam high, tempers hot" — Friction and noise; mind safety cues.
- mood.runehaze — Runehaze — "crystal hum, thoughts stray" — Weird finds; sensory detail up.
- mood.deepturn — Deepturn — "shafts shift, maps breathe, adapt" — Layout drift; emphasize caution.
- mood.candlemoot — Candlemoot — "crew meets, stories trade steady" — Social hub; rumor circulation.

Daily use guideline:
- Proposal cadence: Epsilon posts internal proposal by 09:50 PT.  
- Publishing: Theta posts daily selection by 10:00 PT.  
- Format string: Mine Mood: <Name> — <5-word vibe>  
- Notes: Treat as tavern weather. Avoid mechanical promises or implied buffs/debuffs.


## 7) Cross-Team Hooks & IDs

- place: lore.place.tavern.hearth_and_anvil — The Hearth & Anvil (home hub)
- ambience: amb.tavern.loopA — Ambient loop in sound manifest
- civ: lore.civ.orecasters — Ancient runic-engine civilization below
- dialogue-terms: lore.term.three_wide, lore.term.deepsong — Approved for NPC usage
- Note: Dialogue file data/dialogue/tavern-npc-keeper.json references these ids. Keep ids stable through Sprint 1 and confirm ambienceId/path parity with Team Zeta.


## 8) Naming & Style Appendix

Naming conventions:
- Dwarven given names favor hard consonants and forge/rune compounds (e.g., Kad- / Bryn- / -forge / -rune).
- Surnames often occupational or deed-bound (e.g., Stoneweld, Gearwright, Emberkept).
- Guild names: function + material/action (e.g., Chain & Cartage, Brassline Tally).
- Place names: tangible anchor + craft term (e.g., Copper Stoop, Windlass Court).

ID conventions:
- Dot-delimited snake_case for data ids (e.g., lore.term.deepsong).
- No kebab-case. Avoid spaces. Maintain lowercase after domain segments.

Example name seeds (for writers and design; The Hearth & Anvil already claimed):
- Given names: Kadrin Forgeborn; Brynja Runeshard; Thorek Emberkept; Maela Gearwright; Durn Stoneweld; Ysra Coilthane; Borik Rivetlock; Keera Brassline.
- Guild epithets: Chain‑and‑Cart; Brassline Tally; Pillarwatch Circle; Emberkeep Fellowship.
- Tavern/place seeds: The Copper Stoop; The Bent Pick; The Steam & Stone; Windlass Court; The Sump Lantern.


## 9) Integration & Acceptance Notes

Acceptance criteria:
- Internally consistent founding myth anchored on Deepsong and Oath of Brass.
- 3–5 clear tonal pillars with stable ids.
- Glossary with ≥10 terms, ids, and UI-safe one-liners.
- Mine Mood lexicon (≥8) with ids, 5-word vibes, and usage guideline ready for daily use.

Risks/Assumptions:
- Lore hints remain non-binding; no mechanical guarantees implied.
- All ids remain stable through Sprint 1; any change requires cross-discipline sign-off.
- Confirm amb.tavern.loopA path and naming parity with Zeta’s sound manifest.
- Maintain Three‑Wide Law and safety ritual references consistently across UI, quests, and VO.

Signed, with brass and breath,  
— Epsilon (Lorekeeper Runebeard)