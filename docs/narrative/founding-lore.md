# The Far Mine — Founding Lore and Deep Law (Sprint 1)

Provenance
- Owner: @epsilon (Narrative Systems — Lorekeeper Runebeard)
- Authorial voice: Lorekeeper Runebeard, Keeper of Tall Tales and Tight Specs
- Cross-references
  - docs/world-generation/cave-gen-algorithm.md (§Three‑Wide law, tiles/flags)
  - docs/technology-systems/crafting-design.md (§Hardness bands)
  - docs/combat-systems/combat-design.md (§Telegraphs tone)
  - data/world/biome-crystal-caverns.json (tileType, hardness)
  - data/combat/enemy-goblin-grunt.json (enemy ids)



## Canon Boundaries (Short)

- The Mine is “bottomless” in legend; in practice, strata repeat, drift, and recurse to imply depth. No claim of literal infinite runtime is made.
- Hardness gates 3/4/5/7 are diegetic as crystal temper bands within the strata; mapping to material and tool progression remains purely mechanical.
- The Three‑Wide approach before any sealed door is an old Guild law; it binds to generation rules for approachDepth and corridor widths.
- Automata remnants and guardian constructs exist in the deep law; their active presence may be staged post‑MVP.
- Lore never contradicts gameplay specs; if conflict arises, specs are primary and lore is revised.



## The Origin of the Abyssal Vein (Mythic Core)

The old engineers tell that the world once wore a crown of iron teeth. A World‑Gear, vast as a mountain and round as a prayer, bit into the bedrock to drink its heat. When its teeth met the stubborn heart of the continent, the shaft itself learned to fold upon its layers, turning paths back into themselves like braided rope. Thus the Vein unspools forever to the eye, yet coils close enough for a dwarf to return by smell and chalk.

In the brass age below, a single shining artery of alloy rode the crystals like a rail. The Underwrights of Orrin‑Runes set their forges along it until the day of the Sundering. Their Great Brass Vein shattered from crown to heel, scattering shards that still sing when struck. Since that breaking, every seam of quartz remembers a note of that first fracture; some seams temper the pick, others turn it aside.

The Breath Below is no mere draft. The Mine exhales through bellies of steam, the old boilers and rock‑lungs of the deep waking and sleeping with the grind of the world. Passages open where the heat swells them and close where the chill clamps them, so that last shift’s map is tomorrow’s joke. Lamps gutter or glow by the whim of these sighs, and every wick trimmed is a pact renewed with the dark.

Some claim the World‑Gear stalled and still hums faintly underfoot. Some swear the Brass Vein bled into the stone and now moves like a river of memory. All agree the Vein is a way of ways, not a single line, and it listens to footsteps like a drum hears a march.

Engineer’s Reading
- The Mine appears endless because strata, motifs, and pathing patterns repeat, drift, and phase‑fold via procedural rules. This is a diegetic wrapper for level continuity and variety; no promise of literal infinity is made in code or content.



## The Dwarven Guild Compact (Founding Framework)

When the mouth of The Far Mine yawed open in a thaw year, claims were shouted, staked, and broken as quick as a pick’s first bite. From that racket the Guilds hammered out a Compact: each claim recorded beneath the Charter‑stamp, each haul tallied upon the Tally‑Scales, and each grievance cooled with proper ale before the Brewmaster’s bench. Thus did hunger for the Vein learn the habit of order.

The social contract runs through the Tavern as a main beam. Politics and petitions stay to the common tables; claim marks are posted on the east board at first lamp; the Brewmaster serves as neutral arbiter, taking suggestions and grievances alike, brewing what can be brewed, shelving what cannot. What the tavern hears, the ledger remembers, and what the ledger holds, the Guild enforces.

It is said the Compact kept the Three‑Wide law alive: never squeeze a fight through a knothole. There’s room for a shield, a shoulder, and a stretcher—if the approach was cut honest. So was safety carved where greed would have shaved it thin.

#### **First Faction Slot**
- Token reserved: `lore.guild.hammerwrights`

#### **Second Faction Slot**
- Token reserved: `lore.guild.stonescribes`

#### **Third Faction Slot**
- Token reserved: `lore.guild.brassbound`



## The Buried Civilization Below (Primary Mystery)

The Underwrights of Orrin‑Runes (`lore.civ.underwrights`) shaped the deep with sound and sign. They tuned crystal halls by note and number, teaching quartz to carry orders like song along a lattice of resonant seams. Their doors thought in rune‑logic, admitting hands that could answer, and their servitors marched by clock and bell.

Their rise was steady iron: crystal acoustics, brass logic, and steam discipline woven into a single craft. Their fall, called Gearfall, was a sudden discord. Some say a mis‑tuned keystone cracked the Brass Vein; some whisper a door answered the wrong question. Fragments remain—corridors that still hum a working tone, sealed vault mouths that blink awake at the scrape of steel.

Corrupted automatons and half‑sleeping guardians drift the dark like shed tools that learned to walk. They are not legion in the upper bands, but their spoor—scored brass, tar of old grease, a metronome knock—turns up whenever the Vein bends back on an old path. What can be salvaged may yet feed craft and cunning in seasons to come.

Lexicon artifacts
- `lore.artifact.singing_keystone`
- `lore.artifact.brass_codex`
- `lore.artifact.bellows_heart`



## Timeline (Diegetic, Bullet Scale)

- Deep Age — the Underwrights tune the crystals.
- Gearfall — collapse scatters the servitors.
- Guild Dawn — dwarves discover The Far Mine mouth.
- The Compact — factions formalize claims.
- Present Delve — player enters L1: Crystal Caverns.



## Places & Tokens (Stable IDs for Systems)

- `lore.place.tavern.hearth_and_anvil` — The Hearth & Anvil, neutral ground under Guild sight; anchor for community flow; cross‑ref tavern NPC manifest in data/dialogue/tavern-npc-keeper.json.
- `lore.law.three_wide` — The Three‑Wide Law mandates a three‑stride approach before sealed doors; connects to approachDepth and corridor width flags; cross‑ref docs/world-generation/cave-gen-algorithm.md (§Three‑Wide law).
- `lore.biome.crystal_caverns` — Narrative name for the entry biome; maps to `biome.crystal_caverns`; cross‑ref data/world/biome-crystal-caverns.json (tileType, hardness).
- `lore.materials.copper|iron|quartz` — Common ores and crystal; maps to `mat.ore.copper`, `mat.ore.iron`, and `mat.crystal.quartz`; cross‑ref docs/technology-systems/crafting-design.md (§Hardness bands).
- `lore.sound.ambient.tavern.loopA` — Ambient tavern bed used in the Hearth & Anvil; confirm presence and filename in data/audio/sound-manifest.json with @zeta.



## Myth-to-Mechanic Bridges (Engineer Notes)

- Hardness gates ← crystal temper bands of the Vein; map to hardness 3/4/5/7 without altering balance curves.
- Stamina and Poise ← “heart‑wind” and “stance” metaphors; no mechanical rule changes implied.
- Lamps and halos ← guild lantern rites; align with existing lamp placement and falloff rules.
- The Three‑Wide law ← respected in Tavern talk; binds to corridor generation and approachDepth pre‑door checks.
- Enemy ids ← `enemy.goblin.grunt` and `enemy.cave.burrower` named in‑lore as “surface‑scavver” and “sink‑worm”; cross‑ref data/combat/enemy-goblin-grunt.json.
- Telegraphs tone ← strikes “speak before they bite” per combat design; cross‑ref docs/combat-systems/combat-design.md (§Telegraphs tone).



## [HOOK] Lines (UI-safe, ≤90 chars each)

- Three strides wide behind a door, or the dark will pinch your beard.
- Quartz sings when the right steel hums back.
- The Mine breathes warm as a forge, listen to the heart-wind.
- Below the brass fell, and the crystals remembered.
- Claim true, tally fair, or the Brewmaster closes your book.
- The gear that bored the world left teeth in the stone.
- Lamps are vows against the dark, trimmed and true.
- Surface-scavvers sniff the spill, keep your stance.
- Sink-worms love a lone bootprint in soft dust.
- Doors heed rune and weight, not whispers.



## Tavern Seeds (Diegetic Anchors)

- Old hands say the Underwrights taught quartz to carry orders farther than a shout.
- Three chalk lines before a door, else the stretcher will not fit back through.
- Brass glitters in broken seams, and bad luck follows any pocket that steals it.
- The Brewmaster’s Charter‑stamp bites truer than a magistrate’s seal, so mind your mark.
- When the steam rises at shift‑change, expect the passage you knew to twist on you.
- Some nights the Tally‑Scales tick by themselves like a clock with one tooth left.



## Integration & Cross-check Notes

- [ ] Confirm audio id `ambient.tavern.loopA` present in data/audio/sound-manifest.json (with @zeta).
- [ ] Keep tileType strings exact: `rock`, `floor`, `ore.copper`, `ore.iron`, `ore.quartz`.
- [ ] Validate that [HOOK] lines meet UI length on all surfaces (hotbar tips, loading).
- [ ] No color tokens hard‑coded in lore; align with style-guide.md for palette handling.
- [ ] Verify `biome.crystal_caverns` hardness bands align to 3/4/5/7 in data/world/biome-crystal-caverns.json.
- [ ] Ensure `lore.law.three_wide` is referenced where approachDepth or corridor enforcement is surfaced to UI.



## Risks & Guardrails

- “Bottomless” can be misread as literally endless play; preferred phrasing is “seems without end” or “folds upon itself.” Do not claim infinity in any UI or VO.
- Lore metaphors (heart‑wind, crystal song) must not imply unplanned mechanics; keep them as texture, not systems.
- Automata references establish future hooks; ensure MVP content does not promise active construct encounters beyond enemy list.
- Faction tokens are placeholders; do not surface names or perks until guild-factions.md lands.
- Keep diegetic names mapped to technical ids where players might see them; avoid leaking raw ids in surface text.



## Acceptance Checklist

- [ ] Lore tone consistent with Lorekeeper Runebeard; mythic yet precise.
- [ ] Tokens stable, snake‑cased, and aligned with existing ids or planned manifests.
- [ ] [HOOK] lines ≤90 chars, standalone, non‑promissory, JSON‑safe (no quotes required).
- [ ] Cross‑refs present and accurate to current repo paths.
- [ ] Document parses as Markdown (UTF‑8) and is ready to commit under docs/narrative/.