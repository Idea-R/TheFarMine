# The Far Mine — Founding Lore & Bedrock Myth (Sprint 1)

- Author: Lorekeeper Runebeard (Epsilon)
- Version/Date: v0.1 — 2026-02-18
- Status: Draft v0.1
- Scope: Establish origin of The Far Mine, why it is bottomless, who/what sleeps below, guild motives, and gameplay-facing hooks for L1. Narrative support for world-gen, audio, and UI text; no mechanical promises.

---

## 1) Lore Primer (Concise Overview)

The Far Mine is a world-spiral of stone and shadow, a wound in the crust where seams of ore, steam, and old machinery are laid bare like strings on a great hammered harp. It is both a place and an echo, cut by calamity, guided by pattern, and forever humming under the boots of those who dare the ladders.

Dwarves came because the rock called in two tongues: coin and song. Surface veins thinned; brassworks thirsted; and the old prospectors swore they could feel the ground thrumming a half-forgotten measure, the Deepsong. Guild charters followed, winches sang, and the Tavern at the Rim lit its lamps as the first neutral hearth and last good ale before the drop.

It seems endless because the strata down there do not behave as honest bedrock should. Layers fold, loop, and slide past each other on fault-spirals that move from time to time, turning a known seam sideways or revealing an untouched face. When the rock is in mood.stillshift, the seams lie quiet and maps hold. When the stone enters mood.stonewake, the spiral stirs and new cuts open where none ought to be.

Powers echo below beyond mere heat and pressure. The Deepsong—resonance in stone—threads through the Mine like a buried bell. And older than dwarves, the Quiet Makers worked the depths with brass and crystal, leaving wards, conduits, and guardians that still answer the hum. The Far Mine is thus not only wealth, but a long conversation in metal and echo.

---

## 2) The Bedrock Myth — "The Deepsong and the Broken Anvil"

Dwarves tell that in the first forge-time the world rang on one great Anvil of Ages. The smith was no dwarf, but Stone itself, shaping mountains with patient blows. Each strike set the Deepsong true, a chord that kept seam to seam and depth to depth. Then came the Great Strike—too proud, too hard—and the Anvil cracked.

Where the Anvil broke, the strata folded in upon the wound, spiraling like a cooling spring. That spiral is the Far Mine, a well of bent layers, where echoes travel strangely and seams meet themselves like old friends in lanternlight. The Deepsong did not die; it split. Now it wavers, sometimes sweet, sometimes sour, a tune that needs taming.

Brasscraft is our answer to a broken chord. Brass warms to the Deepsong, carries it, and can be tuned to it. Pipes, gauge, and keywheel—these are not only tools but little choirs, each a way to read the hum and set our hands to the work. When the song is right, steam runs kinder, drills bite cleaner, and a crew can feel the seam breathe through their soles.

---

## 3) Why the Mine is Bottomless (Diegetic Model)

- Folded Strata: The Far Mine is a helix of rock beds bent around a fault core. Layers that should lie flat instead arc and return, so a long descent can pass the same formation at a new face without true repetition. To a ledger it’s a loop; to a miner it’s new ground.

- Spiral Drift States:
  - mood.stillshift — quiet seam; the loop holds steady. Old chalk-marks tally true. Good for mapping and measured advance.
  - mood.stonewake — stirred seam; the fault-spiral slips. Faces shear, vents re-route, waypoints tilt. Good for bold cuts and fresh finds.
  - mood.emberhum — warm clangor; hearth-state near works and lamps where the Deepsong sits friendly in the brass.
  - mood.gearmurmur — focused craft; shop-state where tools, lathes, and minds align to the task.

- Diegetic Justification: The fault-spiral’s slow flex explains why known routes may change and new seams appear. It implies breadth without a promise of literal infinity. Crews speak of “the Mine turning in its sleep,” and that is truth enough for our charts.

- Systems Note: These states are narrative gloss for procedural generation, not mechanics. Use tokens for ambience, naming, or UI flavor without binding game behavior.

---

## 4) The Ancient Below — The Quiet Makers

Name: The Quiet Makers (also “Underbraziers” in old shaft-slang).

Profile: Brass-and-crystal engineers of a prior age, they read the Deepsong as scripture and machine-code both. Their craft set runic circuits into bedrock, strung crystal conduits through fault seams, and raised silent guardians that stand watch where the song is most tangled.

Relics:
- Runic circuits that carry signal through stone; some still warm to touch when the hum is high.
- relic.crystal.conduit lengths, grown not cast, that route resonance like water through pipe.
- Silent guardians—statue-kin that neither breathe nor rust, keyed to wards and wake only when a pattern is wrong.

Fate: When the spiral began to grind and the tune split wild, they withdrew into the Hollow Loom—place.vault.hollow_loom—a vault-city threaded through stone like a shuttle through weft. Some say they sleep there; others say they listen still, hands on levers, fixing what can be fixed in patient cycles.

---

## 5) The Dwarven Guilds Arrive

First Descent: A handful of rope-brave crews lowered into the new-cut well, working by oil-lamp and gut. They found old brass humming, ore like ripe fruit, and heat enough to run a dozen kettles. They staked the Rim, burned a line, and marked a neutral square where no guild-claim would stand.

Guild Accords: To keep the peace and the lifts running, the guilds forged the Accords: share the Rim, settle claims by assay and witness, and keep a tavern where all flags hang. Thus rose place.tavern.rimfire at the lip—a hearth of hot brass and stout benches—where maps trade hands and songs ride higher than oaths.

Factions (bridge to docs/narrative/guild-factions.md):
- guild.hammerwrights — Motto seed: “Make it hold.”
- guild.glassvein — Motto seed: “See the seam.”
- guild.smokestack — Motto seed: “Feed the fires.”

Anchor Sites:
- place.shaft.kingsdrop — the long fall, first main lift by the Accords.
- place.tavern.rimfire — neutral hearth; permit board, stew, and small miracles.
- place.vault.hollow_loom — the Quiet Makers’ hidden city, not on public maps.

---

## 6) Tonal Pillars (Narrative)

- Brass-warmth over cold depths; lamplight softens iron rules.
- Labor as liturgy; each strike a prayer, each bolt a vow.
- Secrets hum; you learn by listening with your hands.
- Wit and grit; a good plan is better with a better wrench.
- Songs carry farther than shouts; keep time, keep together.

---

## 7) Naming & Token Conventions (Narrative-facing)

- Moods
  - mood.stillshift — quiet seam
  - mood.stonewake — stirred seam
  - mood.emberhum — warm clangor
  - mood.gearmurmur — focused craft

- Factions
  - guild.hammerwrights
  - guild.glassvein
  - guild.smokestack

- Places
  - place.tavern.rimfire
  - place.shaft.kingsdrop
  - place.vault.hollow_loom

- Artifacts
  - relic.crystal.conduit
  - relic.brass.keywheel

Notes:
- Use snake_case, dot-scoped ids per repo conventions.
- Tokens above are UI-safe; include in strings to align narrative, audio, and visual cues.

---

## 8) Integration Hooks & UI-safe Excerpts

One-liners [HOOK] (≤ 90 chars):
- [HOOK] The stone hums—set your boots and listen.
- [HOOK] Folded strata ahead; seams may turn on the hour.
- [HOOK] Brass warms where the Deepsong runs close.
- [HOOK] Quiet Makers’ marks—mind your pick and your pulse.
- [HOOK] Rimfire stands neutral; pay your due, share your map.
- [HOOK] In stillshift it keeps; in stonewake it speaks.

Tavern flavor snippets (150–220 chars):
- The lamps at place.tavern.rimfire glow in mood.emberhum. Maps sprawl, mugs clink, and someone taps a wrench to the rail, hunting the beat of the Deepsong beneath the floorboards. “Hush, now. Hear it turn.”

- “We cut true in mood.stillshift,” the foreman says, rolling chalk between scarred fingers. “Then the fault stirred. A wall slid like a drawer and there she was—new face, old ore. The Mine turned kindly tonight.”

- A sigil flares along a relic.crystal.conduit, quick as breath. “Quiet Makers,” the barkeep mutters. “They wired the dark to listen. If you hear boots that aren’t yours, set a brass.keywheel and wait.”

---

## 9) Acceptance & Cross-links

Alignment:
- docs/world-generation/cave-gen-algorithm.md — Folded Strata provides a narrative gloss for deterministic seeds, route volatility, and perceived novelty.
- docs/audio-systems/audio-design.md — Deepsong underpins ambience layers, state transitions (mood.*), and brasscraft timbres.
- data/visual/color-palette.json — “Brass-warmth vs deep-cool” contrast telegraphed; tokens above present for tagging.

Risks/Assumptions:
- Avoids mechanical promises; mood.* tokens are narrative-only unless systems bind them.
- IDs stable through Sprint 1 (Epsilon); changes require cross-team note and minor version bump.
- The Quiet Makers’ capabilities are outlined but not exhaustively defined; future sprints may expand without contradiction.

---