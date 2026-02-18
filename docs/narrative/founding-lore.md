# The Far Mine — Founding Lore & Narrative Framework (Sprint 1)

Owner: Lorekeeper Runebeard (Epsilon)  
Version: v0.1 — 2026-02-18

Scope: Applies to Mine Level 1 vertical slice while setting the backbone for future seasons. Stable tokens included in brackets for cross-team hooks. This doc favors concise, diegetic language without promising mechanics.


## 1) Title Block

- Title: The Far Mine — Founding Lore & Narrative Framework (Sprint 1)  
- Owner: Lorekeeper Runebeard (Epsilon)  
- Version/Date: v0.1 — 2026-02-18  
- Scope Note: Covers Level 1 vertical slice with forward-compatible world law. Tokens and tones herein seed later depths and seasons.


## 2) Narrative Pillars

- Stone Keeps the Score
  - Intent: The world remembers every strike and oath; consequence echoes.
  - Acceptance:
    - Scars in walls tell who mined and why.
    - NPC lines recall prior shifts and spills.
  - Do-not: Do not reset consequences between sessions or scenes without diegetic cover.

- Steam Serves the Stubborn
  - Intent: Effort harnesses pressure; grit turns hazard into help.
  - Acceptance:
    - Tools and rigs look patched, purposeful, and earn their keep.
    - Audio favors hisses, valves, cadence over spectacle.
  - Do-not: Do not make steam magic; keep it mechanical and fallible.

- Guild Fires, Shared Hearth
  - Intent: Rival guilds compete fiercely, yet gather at one warm center.
  - Acceptance:
    - Conflicts cool within [lore.place.tavern.hearth_and_anvil].
    - Banners differ, mugs clink the same.
  - Do-not: Do not escalate rivalries to civil war in L1 scope.

- Depth Has a Memory
  - Intent: The Mine breathes in patterns; deeper layers reply to surface deeds.
  - Acceptance:
    - Echo motifs repeat across biomes with variation.
    - Recurring symbols: brass helix, crystal rune, pressure glyph.
  - Do-not: Do not foreshadow entities we cannot surface this season.


## 3) Origin of The Far Mine

- The Legend (mythic): When the skyfall engine tore the mountain’s crown, its heart met the ley-crystal’s hum. The Bedrock Choir woke, sang one long inhale, and the stone opened in answer—no bottom, only breath and memory.
- The Account (dieg.): An ancient impact drive lodged beneath the peak caused a resonant faulting event with local ley crystals. Subsequent collapses formed a near-vertical complex threaded by stable caverns and strata.
- Designer Note: “Bottomless” is expressed via biome layering and season-based deepening; each season unlocks a new strata band below [lore.place.biome.crystal_caverns], maintaining continuity with prior layers.


## 4) The Ancient Below — The Stratum-Forgers

- Name: The Stratum-Forgers [lore.civ.stratum_forgers] — a pressure-wise people who wrote in gradients and served the weight.
- Hallmarks:
  - Brass helixes that regulate flow and force (visual and mechanical motif).
  - Crystal runes etched to “tune” caverns.
  - Pressure glyphs marking safe thresholds on stone and steel.
- Concrete Artifacts/Motifs:
  - Pressure Helix Core [lore.artifact.pressure_helix]: nested brass coils with valve-keys; emits low hiss when aligned.
  - Crystal Rune Plate (Alpha) [lore.script.crystal_rune.alpha]: triangular quartz wafer with inlaid silver lines.
  - Threshold Glyph Set [lore.glyph.pressure.setA]: chiseled chevrons paired with dot-counting.
- Notes:
  - Their ruins are maintainable but not mystical; dwarves “read” them by craft and caution.
  - Surfaces remain legible at Level 1; deeper semantics reserved for later seasons.


## 5) The Dwarven Moment

- Why Now:
  - Surface seams have thinned; guild charters demand new lifeblood.
  - The Guild Moot ratified shared-rights entry under the Hearth Oath.
  - The Mine’s breaths—slow pulses felt through mugs and rails—now cadence faster, like a door willing to be opened.
- Intro Tooltip Beats (short):
  - “Seams gone lean; the Far Mine calls.”
  - “Charters inked, tempers checked at the hearth.”
  - “Feel it? The stone is breathing in.”


## 6) Places & Tokens (stable IDs)

- [lore.place.tavern.hearth_and_anvil] — The Hearth & Anvil
  - Description: Warm hub of mugs, ledgers, and grudges cooled by song. Neutral ground under the Hearth Oath.
  - Cross-File Notes: Ambience bed [amb.tavern.loopA]. Visuals: oak, soot-bronze, ember orange; signage telegraph may use [mapping.telegraph.arc.amber] sparingly for hazard callouts near the forge.

- [lore.place.mine.entry_l1] — Entry Shaft L1 Staging
  - Description: Winch-house, musters, and a prayer-board of nicked slate. First breath before the dark.
  - Cross-File Notes: Sub-bass creak layer; lamp color neutral-warm. Safety marks can reference [lore.glyph.pressure.setA] motifs as paint stencils.

- [lore.place.biome.crystal_caverns] — The Crystal Caverns (L1 framing)
  - Description: Veins of clear and milk-glass crystal, singing faint on rail strike. Beautiful, brittle, and bright.
  - Cross-File Notes: Visual palette: cool blues, prismatic highlights; sparkle SFX on footstep close. Arc hazards should telegraph with [mapping.telegraph.arc.amber] against cool background.


## 7) Guilds Overview (forward reference)

Guilds circle the same fire with different tempers: one prizes chain and leverage, one flame and glass, one keel and song. Competitions are counted fair by the Hearth Oath within [lore.place.tavern.hearth_and_anvil]. See docs/narrative/guild-factions.md for expanded briefs. Hook IDs: [guild.bronze_chain], [guild.glassflame], [guild.keelsong].


## 8) Glossary — Dwarven Terms

- [lore.term.three_wide_law]: Rule: three can pass abreast.
- [lore.term.hearthcount]: The tally of shared meals.
- [lore.term.breath_of_stone]: Felt pulse through rails, timed.
- [lore.term.chip_spark]: First bright chip that proves seam.
- [lore.term.deep_mark]: Carved sign claiming safe path.
- [lore.term.cup_of_steam]: Break-time; small fix and sip.
- [lore.term.stone_listen]: Quiet minute to hear strain.
- [lore.term.oathband]: Woven cord marking guild trust.
- [lore.term.tally_hook]: Ledger notch for work owed.
- [lore.term.gritshare]: Spare effort given, no coin.


## 9) Mine Mood Lexicon

Usage: One daily Mine Mood sets social tone and copy flavor without implying buffs.

- [mood.stillshift] — Stillshift — “quiet seam, steady hands prevailing”
  - Use when cadence is calm and incidents low; ideal for safety-forward messaging and onboarding.

- [mood.slagwhistle] — Slagwhistle — “steam hisses, tempers run hot”
  - Use when heat/pressure themes foreground; nudge caution without threat inflation.

- [mood.starveflame] — Starveflame — “thin rations, thrift and grit”
  - Use on resource-lean beats; celebrate thrift and planning.

- [mood.gearbless] — Gearbless — “gears align, easy going now”
  - Use for smoother days; suggest flow, not power.

- [mood.deepchord] — Deepchord — “stone hums, echoes carry truths”
  - Use when lore, memory, and listening scenes rise.

- [mood.pickdance] — Pickdance — “fast swings, bright chip-sparks”
  - Use to cheer brisk work; crisp, upbeat copy.

- [mood.lampwatch] — Lampwatch — “lamps trimmed, shadows kept small”
  - Use to highlight vigilance, checklists, and buddying.

- [mood.rivetsong] — Rivetsong — “hammer beats, hearts in time”
  - Use for communal push moments and guild unity.

- [mood.rainsunder] — Rainsunder — “drips steady, patience in drops”
  - Use to frame slow progress and method.

Guidelines:
- Format: “Mine Mood: <Name> — <5-word vibe>”
- Cadence: One post per real-world day; roll at daily reset UTC.
- Tone Guardrails: Evoke feeling, never promise bonuses, stats, or drops.
- Do Not: Imply mechanical effects, timers, or difficulty changes.
- Tagging: UiCommand may include [ui.command.mood.post] with [mood.*] token; Dialogue loader can read [mood.*] tags for future line selection (non-blocking).


## 10) Integration Notes & IDs

Cross-file alignment checklist:
- Tavern location token: [lore.place.tavern.hearth_and_anvil] (used by data/dialogue/tavern-npc-keeper.json).
- Ambience bed: [amb.tavern.loopA] (exists in audio manifest per Zeta doc).
- Telegraph color token: [mapping.telegraph.arc.amber] (exists in data/visual/color-palette.json).

Hooks for UI/Audio:
- UI: Mine Mood posts via [ui.command.mood.post]; include [mood.<id>] and rendered line.
- Audio: Mood may soft-select ambience stems (optional, non-binding). Dialogue loader can surface [mood.*] tags for variant lines in future seasons.


## 11) Risks & Assumptions

- ID Collisions: All lore.* and mood.* tokens reserved; coordinate additions via namespace registry.
- Diegetic vs. Mechanics: Language suggests feel, not function. No implied buffs, difficulty, or timers.
- Season Layering: “Bottomless” delivered by staged biome unlocks; later strata must preserve visible continuity with prior layers.
- Visual Motifs: Brass/crystal/pressure glyphs must remain readable at L1; deeper semantics deferred without retcon.
- Guild Scope: Rivalry kept verbal and procedural in L1; no hard PvP narrative beats until factions doc greenlights.