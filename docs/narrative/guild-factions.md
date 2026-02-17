# Guild Factions — Brassbound, Emberforge, and the Crystal Ordinate (Sprint 1)

Provenance
- Owner: @epsilon (Narrative Systems — Lorekeeper Runebeard)

Cross‑references
- docs/narrative/founding-lore.md (§The Three Guilds)
- docs/technology-systems/crafting-design.md (§Stations & tiers)
- docs/combat-systems/combat-design.md (§Three‑wide law)
- docs/world-generation/cave-gen-algorithm.md (§Lanes & Rooms)
- data/visual/color-palette.json (token-only mentions)
- data/world/biome-crystal-caverns.json (spawn/lighting cues)

Token‑only color policy
- No raw hex. Use tokens only (examples: ui.frame.brass, ui.text.numbers, mapping.lighting.lampWarm, terrain.ore.iron, terrain.ore.quartz, mapping.lighting.crystalCool, effects.sparkRock, mapping.telegraph.emerge.amber, terrain.ore.*).


## TL;DR (Player‑Facing Summary)

- Three guilds share Claim’s Mouth under truce; no blood in the hub.
- Brassbound: ledgers, lamps, and fair lanes keep delves safe and paid.
- Emberforge: iron hunger; push deeper, strike faster, forge stronger.
- Crystal Ordinate: measure the stone’s song; map and mark hazards.
- Truce holds by the First Warrant: lanes three‑wide, lamps at doors.
- Work any board; your deeds tip favor, not the peace.


## Faction Overview (Compact)

- Brassbound Consortium — motto: “Measure true, bind in brass.”; specialty: salvage & standards; tags: salvage, lamp, audit, signage; favored tier: T1–T2 Lampworks/Signage; temperament: methodical, fair.
- Emberforge League — motto: “Heat the seam, strike the heart.”; specialty: forging & high‑tempo delves; tags: mining, tool_trial, hunt, scout; favored tier: T2–T3 Forge; temperament: bold, competitive.
- Crystal Ordinate — motto: “Mark the measure; heed the hum.”; specialty: survey & resonance; tags: resonance, quartz, lanemark, telegraph; favored tier: T1–T2 Survey/Cartography; temperament: meticulous, curious.


## The Brassbound Consortium

Voice
- The Brassbound keep ledgers like lanterns—clear, steady, and true. Where others rush, they measure. Where others brawl, they bind the rules like rivets over a strong frame.
- Profit, aye, but profit that endures. Brass frames and fair lanes: keep three‑wide for carts and comrades both, lamps at doors so no soul steps blind. Mark the depth; pay the tithe; bring the salvage home.

Motto
- “Measure true, bind in brass.”

Token cues
- ui.frame.brass, ui.text.numbers

Specialties
- Corridor standardization (lanes three‑wide, bevelled elbows)
- Lampworks and sconce routing (placement, spacing, resupply)
- Salvage rights and reclamation
- Contract law and signage (depth marks, room doors)

Player‑Facing Hooks
- “Light the run, earn the run.” — teaches lamp spacing and upkeep.
- “Ledger to lantern: count before cut.” — introduces depth marks.
- “Fair lanes, fair shares.” — corridor audits guide pathing habits.
- “Salvage speaks coin.” — recover fittings to learn combat→loot.
- “Stamp the truth.” — signage locks in navigational memory.

Contract Board — Sample Contracts
- contract.brassbound.sconce_resupply — Deliver 3 lamps placed along a corridor segment (tutorial: lamp spacing). Surfaces: quest board, tutorial tip.
- contract.brassbound.salvage_lamp_parts — Retrieve 2 lamp fittings from goblins (teaches combat → loot loop). Surfaces: quest board.
- contract.brassbound.lane_clearance.audit — Verify a 3‑wide corridor between two doors (minimap + navmask tour). Surfaces: quest board.
- contract.brassbound.ledger_stamp — Mark a Depth‑Mark at a room door (introduces signage). Surfaces: quest board.

NPC Touchpoints
- Quartermaster Brassline — contract issuer, pays on delivery.
- Clerk Gearscribe — reputation tallier, stamps the ledger.

Reputation Track (MVP‑lite)
- Prospect (Tier 0) — Perks: shop discount +2%; lamp stock +1 segment.
- Boundhand (Tier 1) — Perks: shop discount +5%; lamp stock +2; signage kit coupon.
- Brass Oath (Tier 2) — Perks: shop discount +10%; bulk lamp crate; audit fees waived.


## The Emberforge League

Voice
- Emberforge runs hot where stone runs deepest. Heat the seam, strike the heart: iron sings to the brave hand. They prize break‑speed, clean cadence, and tools that take a beating and ask for more.
- Their pushes are bold, but not brainless; a quick dodge is worth a dozen potions. Risk is a furnace—temper yourself, then step back in.

Motto
- “Heat the seam, strike the heart.”

Token cues
- terrain.ore.iron, effects.sparkRock

Specialties
- Tool upgrades and durability trials
- Iron extraction and vein pressure management
- High‑tempo delves under time pressure
- Break‑speed experiments and stamina pacing

Player‑Facing Hooks
- “Rhythm breaks rock.” — teaches mining cadence and stamina.
- “Trust your edge.” — field‑test prototype tools with tradeoffs.
- “Step, then strike.” — dodge windows before counter‑hits.
- “Smell the seam.” — learn to read hardness and vein density.

Contract Board — Sample Contracts
- contract.emberforge.iron_pull — Mine 8 ore.iron under time pressure (teaches mining rhythm/cadence). Surfaces: quest board.
- contract.emberforge.tool_trial.t2 — Field‑test Reinforced Pick (durability + stamina tutorial). Surfaces: quest board, tooltip.
- contract.emberforge.burrower_counter — Hunt 2 Cave Burrowers after dodge lesson (combat mastery task). Surfaces: quest board.
- contract.emberforge.vein_scout — Tag a high‑hardness seam (oreSeeding seam reading). Surfaces: quest board, tutorial tip.

NPC Touchpoints
- Foreman Cindershod — posts pushes, times your runs.
- Smith Ashbraid — grants tool rewards, manages rep gates.

Reputation Track (MVP‑lite)
- Spark (Tier 0) — Perks: forge queue −10% time; iron sell‑rate +2%.
- Flame (Tier 1) — Perks: queue −20%; iron sell‑rate +5%; borrow test tools.
- Forgehand (Tier 2) — Perks: queue −35%; iron sell‑rate +10%; mod slots coupon.


## The Crystal Ordinate

Voice
- The Ordinate listens where others only swing. Stone carries memory in its resonance; rooms hum, seams whisper, hazards telegraph. They map those murmurs so all may pass.
- Their craft is careful: measure three times, place once. Lanes marked, corners beveled, notes inked in cool light. The mountain is not an enemy; it is an instrument.

Motto
- “Mark the measure; heed the hum.”

Token cues
- mapping.lighting.crystalCool, terrain.ore.quartz, mapping.telegraph.emerge.amber

Specialties
- Survey and mapping with precision pips
- Resonance lore at seam edges
- Quartz recovery and calibration shards
- Hazard signage and telegraph study

Player‑Facing Hooks
- “Hear before harm.” — read telegraphs to survive hits.
- “Edges hum truest.” — stand at seams for resonance readings.
- “Corners remember.” — place lanemarks to show safe turns.
- “Glass for the graph.” — gather quartz to fund mapping.

Contract Board — Sample Contracts
- contract.ordinate.resonance_read — Stand at three seam edges; record resonance (ore seam tutorial). Surfaces: quest board, tutorial tip.
- contract.ordinate.quartz_sample — Deliver 3 shard.quartz (ties to loot/crafting). Surfaces: quest board.
- contract.ordinate.lanemark_chevrons — Place 3 lane markers at elbows (bevel corners teach). Surfaces: quest board.
- contract.ordinate.telegraph_log — Observe a telegraph and survive hit window (combat reading task). Surfaces: quest board, rumor.

NPC Touchpoints
- Adept Auralin — issues surveys, loans instruments.
- Scribe Meridian — codex keeper, posts findings.

Reputation Track (MVP‑lite)
- Initiate (Tier 0) — Perks: map hint pips +1; survey pay +2%.
- Measurer (Tier 1) — Perks: hint pips +2; survey pay +5%; free lanemark kit.
- Ordinate (Tier 2) — Perks: hint pips +3; survey pay +10%; rare resonance leads.


## Truce & The First Warrant — Faction Interplay

- By the First Warrant, witnessed nightly by the Tavern Keeper of Claim’s Mouth, no guild raises hand against another within the hub. Contract boards stand side by side, and all postings honor the Three‑Wide Law: lanes held to three‑wide between doors, lamps mounted at each room threshold, and salvage rights tallied by marked depth. Disputes go to ledger, not to knives, in keeping with the Acceptance recorded in founding‑lore.md.


## Contract Hooks Index (Copy/Paste IDs)

- contract.brassbound.sconce_resupply — Place 3 lamps along a corridor; teaches spacing. Surfaces: quest board, tutorial tip.
- contract.brassbound.salvage_lamp_parts — Retrieve 2 lamp fittings from goblins; combat→loot loop. Surfaces: quest board.
- contract.brassbound.lane_clearance.audit — Verify 3‑wide lane between doors; navmask tour. Surfaces: quest board.
- contract.brassbound.ledger_stamp — Mark a Depth‑Mark at a room door; signage intro. Surfaces: quest board.
- contract.emberforge.iron_pull — Mine 8 ore.iron on a timer; cadence lesson. Surfaces: quest board.
- contract.emberforge.tool_trial.t2 — Field‑test Reinforced Pick; durability/stamina. Surfaces: quest board, tooltip.
- contract.emberforge.burrower_counter — Hunt 2 Cave Burrowers after dodge tip. Surfaces: quest board.
- contract.emberforge.vein_scout — Tag a high‑hardness seam; reading seams. Surfaces: quest board, tutorial tip.
- contract.ordinate.resonance_read — Take 3 resonance reads at seam edges. Surfaces: quest board, tutorial tip.
- contract.ordinate.quartz_sample — Deliver 3 shard.quartz for study. Surfaces: quest board.
- contract.ordinate.lanemark_chevrons — Place 3 lane markers at elbows. Surfaces: quest board.
- contract.ordinate.telegraph_log — Observe a telegraph, survive window. Surfaces: quest board, rumor.

Reserved (Season growth; names only, non‑binding)
- contract.shared.depthmark_scout — Scout unmarked doors; propose depth marks. Surfaces: rumor, quest board.
- contract.shared.lamp_ignition — Relight 4 dark lamps in one pass. Surfaces: tutorial, quest board.
- contract.shared.goblin_block_drill — Clear a goblin block with 3‑wide restore. Surfaces: quest board.


## Implementation Notes

- Contracts JSON (MVP stub, non‑binding fields):
  - id: stable string (e.g., contract.brassbound.sconce_resupply)
  - guild: brassbound | emberforge | ordinate | shared
  - name: short display name
  - summary: ≤140 chars for UI
  - objectives[]: atomic steps with counts/locations
  - rewards: currency, items, rep deltas
  - surfaces[]: quest_board | tutorial | tooltip | rumor
- Integration pointers:
  - Resource ids (iron, copper, quartz) from data/items/resources.json (use terrain.ore.* where applicable).
  - Enemy ids (goblin, Cave Burrower) from data/combat/*.json.
  - Color/lighting tokens from data/visual/color-palette.json; never inline hex.
  - Biome spawn/lighting cues from data/world/biome-crystal-caverns.json.

Acceptance & QA Checklist
- Distinct ethos and specialties per guild; mottos present.
- 12 sample contracts with stable ids across three guilds.
- Hooks touch MVP enemies, tools, lamps, and lanes (Three‑Wide Law).
- All color mentions via tokens; no raw hex codes.
- Player‑facing copy tight; TL;DR and summaries ≤140 chars where noted.
- Terminology consistent with founding‑lore.md (First Warrant, Acceptance, Three‑Wide Law, Claim’s Mouth).
- NPC touchpoints and MVP‑lite reputation tracks with perk hooks included.