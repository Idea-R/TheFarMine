# The Far Mine — Founding Lore and Deep Oaths (Sprint 1)

Provenance: owner @epsilon (Narrative Systems — Lorekeeper Runebeard)

Cross-refs:
- docs/technology-systems/crafting-design.md (§Hardness)
- docs/world-generation/cave-gen-algorithm.md (§Three‑Wide Law, Tiles)
- docs/combat-systems/combat-design.md (§Telegraphs)
- data/visual/color-palette.json (ui.frame.brass, ui.frame.copper, ui.frame.crystal, mapping.depthTint.l0–l3)
- data/audio/sound-manifest.json (ambient.tavern.loopA)
- data/combat/enemy-goblin-grunt.json (surface foe baseline)
- data/items/tools.json (tier keys for T1–T3 and beyond)

"Stone remembers, brass records, and bread seals the bargain."

"Hold your lamp high; the dark bargains low."



## Executive Summary

A quake-night of Singing Stone split the hill’s heart and opened a spiraling claim whose breath smelled of old metal and warm crystal. Dwarven guilds converged by dawn; oaths were hammered, contracts inked in brass and blood, and lanes laid Three‑Wide to keep limbs and tempers intact.

Rumor with iron in it: far below turns an elder engine-world, the Underking’s Loom (lore.artifact.underloom). Its slow pulse redraws the deep, keeps the shaft ever-deepening, and wakes new halls by season. We mine the margins of a sleeping maker’s craft; when our tools harden, the doors yield.



## The Opening of Claim’s Mouth (Origin of the Bottomless Mine)

On the Shiver Year’s longest night, the hill sang. Not a song for ears—your bones took it in. Strata slipped like plates in a book, and the turf tore to show a black spiral, stones whirling inward as if the ground were remembering a staircase. Lanterns found not a cave but a throat, its walls oiled with mica and old soot, stepping down in patient circles. We named it the Far Mine (lore.location.far_mine), for even the first echo took too long to return.

Diegetic engine: Below the throat sits the Underking’s Loom (lore.artifact.underloom), a self-boring regulator from elder days. It spins slow as winter molasses, unpicking faults and weaving them shut behind it, pushing the crust to re-face itself. To us it reads as never-ending depth: galleries shift, doors rekey, seams refresh. The mine is “bottomless” because the Loom keeps drawing new arrangements forward as seasons turn and our bite gets sharper.

- Implementation notes:
  - Seasonal awakening frames worldgen reseeds and unlock flags; “doors shift” is narrative cover for procedural layouts (see docs/world-generation/cave-gen-algorithm.md §Tiles).
  - Early strata anchor to biome.crystal_caverns (MVP), with planned unlocks toward biome.magma_depths (future), biome.ashen_foundry (future), biome.rooted_shales (future).
  - Depth tint ties to mapping.depthTint.l0–l3 for surface-to-MVP layers; extend as tiers grow (data/visual/color-palette.json).



## The Guild Compact of Brass and Bread (Dwarven Mining Guilds)

When the claim’s mouth yawned, three banners reached it by breakfast and a fourth by noon. The Guild Council (lore.org.guild_council) was struck on an anvil plate, hot and brief:

- Rotating rights to surface the take by bell and ledger—no hoarder’s night runs.
- The Three‑Wide Law (lore.law.three_wide): every primary lane walks three dwarves abreast—one to haul, one to guard, one to mend—so no soul is pinched by greed or stone. (Aligns with docs/world-generation/cave-gen-algorithm.md §Three‑Wide Law.)
- Disputes settled by Bread and Brass: break a loaf together, then lay brass tallies; highest tally claims route for a watch, loser mans props and lamps.
- Telegraph-keeping: all fighters must read arc, stomp, and shimmer before striking; no glory charges in tight lanes. (See docs/combat-systems/combat-design.md §Telegraphs; mapping.telegraph.arc.amber.)

Factions (stubs for later detailing):
- guild.brassbound — book-and-bolt traditionalists; love a ledger, fear a shortcut.
- guild.steamwrights — boiler-brained optimists; if it hisses, they bless it.
- guild.runecarvers — etchers of wards and readers of old script; cautious, proud.



## The Ever-Deep Rationale (Why Bottomless)

Diegetic: The Loom redraws the deep like a patient tailor—hemming faults, cross-stitching crystal beds, and turning doors to new keys. We hear the Singing Stone (lore.phenomenon.singing_stone) before big shifts, and our lamps pick new hues as depths breathe. Seasons wake certain biomes, and guild rites mark which lanes are “warm.”

Engineering-friendly summary:
- Progression gates map to tool power and hardness (docs/technology-systems/crafting-design.md §Hardness).
  - T1 → rock seams/copper faces; props hold in sanded shale. (data/items/tools.json tier: T1)
  - T2 → iron-gated ribs and node clamps; pry bars bite iron tongues. (tier: T2)
  - T3 → quartz-veined locks and crystal knots; cutters hum true. (tier: T3)
  - Deeper locks imply future tiers (T4+), communicated as rumors/chants until shipped.
- “Bottomless” in MVP = season-based deepening + fresh layouts; not literal infinite shaft.
- Biome unlocks flagged by season + tier; diegetic “doors shifting” = worldgen variant roll.



## The Elder Makers Below (Ancient Civilization)

Before our grandmothers’ stones were laid, gear-scribes and crystal weavers walked the warm dark. We name them the Elder Makers (lore.civilization.elders). They bound heat into chores, taught rock to remember, and set guardians to mind their stitches. Their intent—so the runes suggest—was to stitch fault-lines and harvest deep heat with gentler hands than quakes provide. But stewards left too long grow strange.

- Remnants:
  - Regulator Shrines (lore.site.regulator_shrines): pillar-rings with runic throttles; turn the right word, and the hall breathes easier.
  - Guardians (lore.guardian.designations): layered brass and bone-crystal; current seen pattern: guardian.tier1.sentinel (lane-favoring, arc-telegraph, amber glow).
- Present state:
  - The Loom keeps its rota, blind to us; regulators drift from scripts to feral routines.
  - Some automata honor lanes; some have forgotten and crush the middle. Read your telegraphs.



## Tales from the Taproom (Diegetic Hooks for Tavern Dialogue)

- hook.tavern.rookie_rules — Three‑Wide, lamp left, haul middle, guard right. Surfaces: tooltips, tutorial.
- hook.tavern.ore_gates — “If your pick sings flat, the rock says ‘later.’” Surfaces: crafting UI hint.
- hook.tavern.goblins_lane_law — Goblins cheat the lane; read their swing’s amber arc. Surfaces: combat tutorial.
- hook.tavern.singing_stone — Hear the floor hum? Colors run deeper next watch. Surfaces: loading tips.
- hook.tavern.brass_compact — Bread, then brass; fight after the tally. Surfaces: hub dialogue.
- hook.tavern.underloom_rumor — Something below is weaving us new doors. Surfaces: loading tips.
- hook.tavern.shrine_whisper — Twist the right rune, and the air turns kind. Surfaces: exploration hint.
- hook.tavern.tool_tiers — New teeth, new doors; sharpen before you swagger. Surfaces: crafting UI hint.

Notes:
- Keep ≤120 chars; Tavern Keeper paraphrases tone per surface.
- Link goblin lines to data/combat/enemy-goblin-grunt.json baseline where applicable.



## Timeline Shards (Compact, usable)

- lore.era.before_deep — Before-Deep: Elder Makers weave heat and stitch faults; Loom set turning.
- lore.era.shiver_year — The Shiver Year: Singing Stone splits the hill; the claim’s mouth opens.
- lore.era.brass_compact — The Brass Compact: guilds bind the Three‑Wide and tally rights.
- lore.era.season_of_crystals — Season of Crystals (MVP): crystal caverns wake; T1→T3 tools bite.



## Glossary & Stable Tokens

- The Far Mine → lore.location.far_mine
- Three‑Wide Law → lore.law.three_wide
- The Underloom (Underking’s Loom) → lore.artifact.underloom
- Guild Council → lore.org.guild_council
- The Singing Stone → lore.phenomenon.singing_stone
- Elder Makers → lore.civilization.elders
- Regulator Shrines → lore.site.regulator_shrines
- Guardian Designations → lore.guardian.designations (e.g., guardian.tier1.sentinel)
- Biome: Crystal Caverns → biome.crystal_caverns
- Biome: Magma Depths → biome.magma_depths
- Telegraph Arc Amber → mapping.telegraph.arc.amber
- UI Frames (brass, copper, crystal) → ui.frame.brass | ui.frame.copper | ui.frame.crystal
- Depth Tint Map (levels 0–3) → mapping.depthTint.l0 | mapping.depthTint.l1 | mapping.depthTint.l2 | mapping.depthTint.l3
- Tavern Ambience Loop → ambient.tavern.loopA



## Myths vs. Mechanics Notes (Guardrails)

- “Doors shift” is narrative dressing; actual reconfiguration driven by procedural generation and season flags.
- “Bottomless” in MVP means periodic depth extension, not infinite continuous descent.
- Elder regulators and guardians exist; their exact effects and patterns unlock by tiered progression.
- Telegraph reading is lore and mechanic; exact timings follow combat design, not tavern bragging.
- Seasonal awakening is cadence language; precise dates remain live-ops knobs.
- Guild faction claims color dialogue and cosmetics; no promised stat edges without explicit feature notes.



## Cross-System Anchors

- Worldgen: Doors/approaches framed as Loom redraw; enforce Three‑Wide corridors where declared (docs/world-generation/cave-gen-algorithm.md).
- Combat: Telegraph motifs mapped to mapping.telegraph.arc.amber and peers; goblin grunt uses baseline telegraphs (data/combat/enemy-goblin-grunt.json).
- Crafting/Progression: Hardness tiers inform gate text and shrine “key” hints (docs/technology-systems/crafting-design.md §Hardness; data/items/tools.json).
- Audio: Hub/tavern uses ambient.tavern.loopA; depth hums layer by mapping.depthTint.* cues where supported.
- Visual: Depth tint anchors to mapping.depthTint.l0–l3; UI frames by tier use ui.frame.copper → ui.frame.brass → ui.frame.crystal.



## Acceptance Checklist

- Internal consistency with existing systems (worldgen lanes, telegraphs, hardness).
- Stable tokens match current manifests (color palette and audio ids present).
- Hook blurbs are concise and UI-safe (≤120 chars) with surfaces noted.
- No hard promises beyond MVP: depth = seasonal unlocks + new layouts; future tiers flagged as rumors.
- Pull quotes included and suitable for loading tips.
- Faction stubs and elder tokens stable for cross-file references.