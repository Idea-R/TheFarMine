# The Far Mine — Founding Lore & Narrative Framework (Sprint 1)

- Version: v0.1 — Author: epsilon
- Cross-refs:
  - data/audio/sound-manifest.json → id: amb.tavern.loopA
  - data/world/biome-crystal-caverns.json → lore hooks present
  - data/dialogue/tavern-npc-keeper.json → keeper lines reference tavern treaty

---

## 1) Title Block

- Title: The Far Mine — Founding Lore & Narrative Framework (Sprint 1)
- Tokens:
  - `author.epsilon`
  - `audio.amb.tavern.loopA`
  - `biome.crystal-caverns`
  - `dialogue.tavern.npc.keeper`

---

## 2) The Lay of the Deep

Under Hearth & Anvil, our mountain city of cinders and kettles, a wound split the bedrock: the Drumfault. Its lip rang like a forge floor when carts crossed it, and the seam drank lantern smoke. We named it The Far Mine before we knew it had no floor.

Why bottomless? The old engineers speak of the Undertide—a long, slow slippage of voided seams and self-healing strata. Pressure meets vacancy; stone flows like thick pitch, resealing what it swallows and drawing the shaft ever on.

The First Descent was the Brass Nine. They lowered a bell of riveted bronze, etched with a cooling rune that never cooled. When they rang it, the rock answered. Their safety codex began with the Three‑Wide Law.

Below the first strata, the veins turn to glass and song. The Glassbound—precursors with a gift for crystal tuning—left wards, automata, and halls that carry a clear hum. Their ruins lie beneath the Crystal Caverns, where quartz remembers footsteps.

Competing guilds might have fought; instead, they swore the Guild Compact. The tavern at shafthead became the treaty hall—neutral ground where measures, not grudges, settle. Here, the Brasswrights’ Collegium, the Stonehand Union, and the Sluice & Scrip Cartel keep their oaths.

The Promise is steam, song, and stubbornness. Brass over bone, wit over weight. The Price is the same: no guarantee from machine or rune—only the measure of your hands and the company you keep.

---

## 3) Narrative Pillars

- Brass over Bone
  - Tools tell tales; upgrades feel earned and storied. Scratches, welds, and balance mark a miner as surely as a clan tattoo.
  - [HOOK] "Every tooth of brass remembers a seam."

- Laws of the Lantern
  - Proverbs and practice make courage measurable. The codex frames choices without commanding them, a light you can choose to carry.
  - [HOOK] "Light at spans; panic at none."

- Depth Has Memory
  - Decisions echo as subtle shifts: a familiar hum, a steadier hand, a wary glance. Seasons, routes, and scars accrue to the place itself.
  - [HOOK] "Stone keeps score in silence."

- Rivalry, Not Ruin
  - Guild competition sharpens edges without spilling cups. Victory is the seam won and the treaty kept, not the other dwarf undone.
  - [HOOK] "Win the seam, keep the peace."

- Songs of the Crystal
  - Audio and lore interlock; crystals carry story as tone. Listening is a practice; the mine hums richer for those who heed it.
  - [HOOK] "Quartz hums truer when you listen."

---

## 4) The Three‑Wide Law

- Keep lanes three across where able; two to work, one to pass or haul. Tight places earn a mark and a minder.
- Lamps at measured spans; count your lampspan aloud on the march, quiet on the come-back.
- Leave a turn pocket every stretch; no dead ends, no pride corners.

Implementation note: Flavor copy only; aligns with cave-gen approachDepth and corridor width heuristics. No runtime guarantees.

---

## 5) Places & Tokens

- `lore.place.tavern.hearth_and_anvil` — Neutral tavern perched over the shafthead. Treaty hall, notice board, and stew that forgives most sins. Ambience rides `audio.amb.tavern.loopA`.

- `lore.feature.drumfault` — The rupture seam that birthed the Far Mine. A ringing lip of stressed stone, forever settling, forever hungry.

- `lore.culture.glassbound` — Precursor crystalwrights who tuned the bedrock to carry song and command their bound automata. Their markings glow when harmonics are right.

- `lore.law.three_wide` — First codex line from the Brass Nine. Three across, lamps at spans, pockets to turn. Habit, not decree.

- `lore.shrine.bellseat` — A carved plinth near shafthead where the Brass Nine’s bell once rested. Miners tap tools here before shift; one ring means “all eyes open.”

- `lore.sluice.brassway` — Pipe-choked gallery that channels warm condensate and fines. Hums with valve-song; guild runners trade rumors where steam conceals smiles.

- `lore.ruin.glassbound-ward` — A warded threshold in the Crystal Caverns. Glassbound sigils lie dormant until chorus swells; then guardians drift like sleeping thoughts.

---

## 6) Dwarven Glossary

- Undertide (UN-der-tide) — Slow tectonic slip of voided seams and self-healing strata that lengthens the shaft. Pseudoscience with teeth.
  [UI] The deep that moves.

- Seam-sense (SEEM-sens) — Intuitive reading of stone by sound, grit, and breath. Learned, then trusted.
  [UI] Read rock by feel.

- Bellseat (BELL-seet) — The honored plinth for the Brass Nine’s bell; also any ritual tool-rest near the shaft.
  [UI] Tap tools here.

- Pickbeat (PIK-beet) — The steady rhythm of productive work; also a crew’s shared tempo.
  [UI] Keep the tempo.

- Lampspan (LAMP-span) — Standard distance between lamps in tunnels; often paced and called.
  [UI] Count your light.

- Rune-weld (ROON-weld) — Fused metal joint etched with cooling script; holds truer under strain, or so we swear.
  [UI] Etched seams hold.

- Slag oath (SLAG-ohth) — Gruff promise given over waste and dross; binding by pride if not by law.
  [UI] Promise in grit.

- Vaultsong (VAWLT-song) — Resonant hum of a stable chamber; miners listen for it before trusting the roof.
  [UI] Hear the roof.

- Gearwhisper (GEER-whis-per) — The subtle chuff and hiss of healthy mechanisms; wrong notes warn.
  [UI] Brass breath low.

- Depth-tithe (DEPTH-tyth) — The accepted cost paid to the mine: time, trinket, or scar. Tallied only in stories.
  [UI] The mine takes some.

---

## 7) Mine Mood Lexicon & Guidelines

- Stillshift — Quiet seam, held breath.
- Gearwhisper — Brass breath low.
- Pickbeat — Steady hands, small wins.
- Emberwatch — Tempers banked, eyes bright.
- Quartz Choir — Crystal hum carries.
- Ironbound — Workmanlike, no flourish.
- Lanternwake — Warm light, long odds.
- Burrower’s Lull — Tread soft, listen close.
- Guild Murmur — Deals brewing, smiles thin.

Posting rules:
- 5-word vibe max.
- No mechanical promises.
- Post by 09:50 PT.
- Theta posts at 10:00 PT.
- Maintain living lexicon in docs.
- Emoji vote before changes.

---

## 8) Integration Notes

- All lore IDs herein are narrative-only; no runtime guarantees implied.
- Audio bed for tavern scenes: `audio.amb.tavern.loopA` in sound-manifest.json (present).
- [HOOK] lines capped ≤90 chars; safe for tooltips and popovers.
- Terms align with cave-gen approachDepth, corridor width, and combat telegraph amber tone.
- Crystal Caverns hooks map to data/world/biome-crystal-caverns.json; avoid prescriptive triggers.

---

## 9) Risks & Assumptions

- Risk: Readers may infer mechanics from proverbs; we keep phrasing as habit and custom.
- Assumption: Guilds doc at docs/narrative/guild-factions.md will define:
  - Brasswrights’ Collegium
  - Stonehand Union
  - Sluice & Scrip Cartel

---

## 10) Minimal Test Plan

- UI length pass:
  - All [HOOK] lines ≤90 chars.
  - Mine Mood labels: vibes ≤5 words.
- Manifest cross-check:
  - audio id `amb.tavern.loopA` present in sound-manifest.json.
  - No missing glossary or place tokens referenced above.