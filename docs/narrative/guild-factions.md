# Guild Factions — The Three Guilds of the First Warrant (Sprint 1)

Provenance
- Owner: @epsilon (Narrative Systems — Lorekeeper Runebeard)
- Author: Lorekeeper Runebeard, sworn to tidy ledgers and tidy myths alike

Cross‑References
- docs/narrative/founding-lore.md (§The Three Guilds and the First Warrant)
- docs/technology-systems/crafting-design.md (§Stations & Tiers)
- docs/combat-systems/combat-design.md (§3‑wide law)
- docs/world-generation/cave-gen-algorithm.md (§Lighting & lanes)
- data/visual/color-palette.json (token‑only references)

---

## TL;DR (Player‑Facing Summary)
- Three rival guilds share a hard truce at Claim’s Mouth: Brassbound (routes and ledgers), Emberforge (craft and recovery), Crystal Ordinate (survey and resonance).
- Brassbound favors contracts that mark and keep trade lanes lawful—lamp runs, 3‑wide audits, and escorted crates.
- Emberforge sends you to test tools, fetch broken gear, and keep the workbenches burning—practical tasks with heat and hurry.
- The Ordinate bids you listen to stone—chart crystal pockets, set safe markers per the 3‑wide law, and take resonance readings at seam edges.
- Each offers soft favors (tips, intros, better notice on postings) but no binding bargains beyond MVP.
- The Tavern posts and mediates all warrants; keep lamps lit and lanes lawful, and you’ll eat.

---

## Faction Overview (Comparative Glance)
At Claim’s Mouth, the First Warrant binds a competitive truce. No blades over ledgers; no sabotage of lamps. The Tavern is neutral ground—its noticeboard the law of jobs—and the keeper’s bell settles the order. Each guild pushes its edge, but all kneel to the 3‑wide law and the lamp rites, lest the dark take us all.

Specialties at a glance
- Brassbound Consortium — commerce and logistics: route surveying, lamp‑rite enforcement, escorted cargo and signage.
- Emberforge League — craft and recovery: workbench triage, tool trials, salvage of broken gear and lamp cages.
- Crystal Ordinate — survey and resonance: crystal seam mapping, safe‑lane scouting, resonance measurement and marking.

---

## Faction Entries

### Brassbound Consortium

- Name & Motto
  - Brassbound Consortium
  - Motto: “Count every rivet; claim every mile.”

- Crest/Sigil and Color Tokens
  - A stout ledger clasped with a ring of lamp‑coins, a road‑chain threading through. The clasp and chain gleam like ui.frame.brass; the neat tally marks are set in ui.text.numbers. Lamp icons call to mapping.lighting.lampWarm when painted on waystones.

- Temperament & Ethos
  - They are counters of costs and keepers of corridors—fair when watched, fierce when cheated. A Brassbound pledge is a road paved with clauses, and they honor it precisely if you do the same. They preach that good lamps make good trade, and a measured lane is a safe one. Speak to them in sums and distances and you’ll have their ear.

- Specialty & Play Focus
  - Focused on logistics under MVP: route surveying, lamp placement along designated corridors, and audits for the 3‑wide law. Expect escort runs, signage posts, and early‑warning errands where clarity of path matters more than heroics.

- Leader Seed NPC
  - Factor Hesta Ledgerband — polite as a bill and twice as firm; she asks you to “prove” a trade lane by lighting and measuring from Claim’s Mouth to the old Pump Bridge before first shift.

- Notable Members
  - Tallie Inkthumb — clerk with a memory for your past routes; hints at which crates matter to whose balance.
  - Jorren Barrelbrace — teamster captain who swears by the shortest lit lane; grumbles when the dark steals his time.

- Starting Favors
  - Their board runs thick with early tip‑offs on lamp‑rite breaches and unlit shortcuts; their clerks “just happen” to stack your name nearer the top of certain postings; a quiet word earns you cleaner descriptions on escort manifests.

- Rivalries & Tensions
  - With Emberforge: they curse “forge delays” that stall scheduled hauls; Emberforge retorts that brass can’t bind a cracked handle.
  - With Crystal Ordinate: they bristle when surveyors block a lane with instruments; the Ordinate insists the stone must be heard before the toll is taken.
  - Internal edge: numbers over niceties—if you waste steps, you’ll hear about it.

- Signature Contracts
  - Lamp Rite Run: “Carry fresh lamp‑oil and set lamps at marked stones; send the dark scurrying so the morning haul runs true.” id: contract.brassbound.lamp_run.t1
  - Lane Audit — 3‑Wide Compliance: “Walk the corridor with gauge and chalk; mark choke points that break the 3‑wide law and post temporary cautions.” id: contract.brassbound.lane_audit.t1
  - Signage Post & Paint: “Plant wayposts and paint distance marks in ui.text.numbers where the walls turn; keep the chain of signs unbroken.” id: contract.brassbound.signage_post.t1
  - Crate Escort to Tally Point: “See a sealed crate to the counting bench; keep petty hands and prowlers off until the stamp is set.” id: contract.brassbound.crate_escort.t1
  - Ore Pocket Chart for Toll: “Sketch ore pockets along the route to forecast toll rates and congestion; note any side‑niche for future storage.” id: contract.brassbound.ore_scout.t1

- Seasonal Seeds (Future)
  - Automaton salvage rumored in a collapsed weigh‑station—if the limbs still turn, the miles will fly.
  - A bonded way‑house charter to stitch far lamps into a single, never‑dark chain.

---

### Emberforge League

- Name & Motto
  - Emberforge League
  - Motto: “Heat, Hammer, Honor.”

- Crest/Sigil and Color Tokens
  - A square‑faced hammer above a travel anvil, ringed by a glow like mapping.lighting.lampWarm. Iron rivets and copper seams flash terrain.ore.iron and terrain.ore.copper across their aprons.

- Temperament & Ethos
  - Work is worship—fix the tool, then judge the task. They prize craftplain speech and proven hands; a promise is tempered like steel, with heat and patience. They forgive honest breaks and punish careless ones. When the lamps flicker, they step toward the hiss, not away.

- Specialty & Play Focus
  - Focused on crafting and recovery under MVP: run tool trials, fetch broken gear, refit lamp cages, and haul parts to stations defined in Stations & Tiers. Expect errands that keep benches hot and hands ready.

- Leader Seed NPC
  - Master Bellara Firevise — measured gaze, soot on the brow; asks you to temper a pick on the road anvil and prove it by biting clean into a test seam before the heat dies.

- Notable Members
  - Keel Sparks — apprentice with big ideas and short handles; needs someone steady on the haul.
  - “Old Soot” Morric — lamp‑cage tinkerer who can hear a rattle two ladders off; pays in stories and spare pins.

- Starting Favors
  - An open bench “when there’s a lull,” a scrap of advice that saves a swing, and early whispers about where a rivet crate fell or a cage rattles wrong.

- Rivalries & Tensions
  - With Brassbound: grinds over “rate before repair”—they’ll not have a ledger outrank a cracked haft.
  - With Crystal Ordinate: scoffs that soft‑soled surveyors hush hammers mid‑strike; Ordinate complains the League rattles their readings.
  - Internal edge: pride—botch a fix and they’ll remember the sound it made.

- Signature Contracts
  - Tool Trial — Pick Temper: “Heat, quench, and prove a pick by cutting test bites in marked rock; bring back the chip to show temper.” id: contract.emberforge.tool_trial.pick.t1
  - Repair Haul — Broken Treads: “Fetch a snapped cart tread from a spillway; time matters before the next load shudders through.” id: contract.emberforge.repair_haul.t1
  - Salvage — Lost Drillhead: “Track a dropped drillhead to a side‑fall and winch it free; watch your footing when the stone growls.” id: contract.emberforge.salvage_drillhead.t1
  - Lamp Cage Refit: “Carry spare cages and swap out rattlers in a dim loop so the glow stays true.” id: contract.emberforge.lamp_refit.t1
  - Recover Rivet Crate: “Find the crate that bounced from the mule rail and return it before the shift turns cold.” id: contract.emberforge.rivet_crate_recover.t1

- Seasonal Seeds (Future)
  - A hot seam breach that needs mobile quench rigs and nerve.
  - A road‑hammer prototype that hums through shale if someone can keep its heart lit.

---

### Crystal Ordinate

- Name & Motto
  - Crystal Ordinate
  - Motto: “Where stone sings, we listen.”

- Crest/Sigil and Color Tokens
  - A faceted crystal above a survey compass, its light a cool thread of mapping.lighting.crystalCool. Edges catch terrain.ore.quartz glints in their chalks and medallions.

- Temperament & Ethos
  - They speak softly and measure twice, once with tools and once with the heart. To them, the mine is a choir—some notes feed the lamps, others call the burrowers. They put safety in the line before speed in the tally. If you’ll hush and heed, they’ll show you where the floor stops pretending to be floor.

- Specialty & Play Focus
  - Focused on surveying under MVP: resonance readings at seam edges, crystal charting, and safe‑lane scouting under the 3‑wide law. Expect marking, listening posts, and quiet escorts for instruments.

- Leader Seed NPC
  - Survey‑Mistress Lyss of the Third Tone — eyes half on you, half on the wall; asks you to set three hush‑marks and take a resonance reading where the fault hums.

- Notable Members
  - Dain Chordwright — maps the mine on threads and notes; swears he can hear a lamp’s mood.
  - Sera of the Chalk — leaves clean, cold marks that glow like a held breath; needs a watcher while she writes.

- Starting Favors
  - Early tremor warnings scribed onto your route, an annotated scrap of a crystal pocket, and a loaned hum‑stone to test a lamp’s steadiness.

- Rivalries & Tensions
  - With Brassbound: refuse to carve signs into singing faces; Brassbound calls it foot‑dragging.
  - With Emberforge: ask hammers to throttle down near faultlines; the League calls it coddling.
  - Internal edge: impatience with loud feet—if you clatter, they close their books.

- Signature Contracts
  - Resonance Read — Seam Edge: “Set a listening cone, count the pulses, and chalk the number where it’s safe to stand.” id: contract.ordinate.resonance_read.t1
  - Crystal Chart — Pocket Sketch: “Trace a crystal pocket’s bounds and note the cold spots; leave the wall unbitten.” id: contract.ordinate.crystal_chart.t1
  - Safe Passage — Mark 3‑Wide: “Scout a corridor and lay quiet marks to certify safe width and shoulder room.” id: contract.ordinate.safe_passage.mark.t1
  - Lantern Test — Faultline: “Walk a hush‑line with a fresh lantern and log every flicker against the wall’s hum.” id: contract.ordinate.lantern_test.t1
  - Silent Escort — Survey Kit: “Keep loiterers and curious gobbos off while an instrument runs; no shouting unless the rock shouts first.” id: contract.ordinate.silent_escort.t1

- Seasonal Seeds (Future)
  - A resonance lock in the deep that won’t open for steel—only for the right note held long enough.
  - A choir‑map that redraws itself as the stone shifts, if powered by a river of quiet light.

---

## Gameplay Tie‑Ins & Hooks (for Designers)

Design mappings by guild
- Brassbound Consortium
  - Worldgen lanes: tasks that validate 3‑wide corridors, require player to read/extend signage, and place lamps at algorithmic lane nodes (see §Lighting & lanes).
  - Mining stations: light logistics through way‑stations adjacent to Stations & Tiers benches; players shuttle parts/oil between nodes.
  - Enemy teaches: crate escorts favor chokepoints where Goblin/block is taught via shield/brace prompts; occasional path clear for lane compliance.
  - Color tokens for signage: ui.frame.brass frames on posts; ui.text.numbers for distance marks; mapping.lighting.lampWarm implied on lit nodes.

- Emberforge League
  - Mining stations: direct interaction with crafting benches (Stations & Tiers); fetch/repair loops demonstrate station adjacency and resource return.
  - Worldgen lanes: salvage hauls reinforce the need for 3‑wide clearances to drag or carry objects safely.
  - Enemy teaches: salvage/repair routes commonly stir Burrower/dodge moments (ground tells) and a few Goblin/block checks near benches.
  - Color tokens for signage: mapping.lighting.lampWarm around work areas; terrain.ore.iron and terrain.ore.copper accents on tool signage.

- Crystal Ordinate
  - Worldgen lanes: safe‑lane scouting leverages lane width data and lighting variance to teach the 3‑wide law via quiet marks.
  - Mining stations: minimal; focus on data capture at seam edges and along faultlines, feeding back to map overlays.
  - Enemy teaches: resonance readings foreshadow Burrower/dodge beats (tremor cues), and low‑risk Goblin/block only if noise escalates.
  - Color tokens for signage: mapping.lighting.crystalCool for chalk marks and resonance beacons; terrain.ore.quartz as visual glints in survey notes.

Quest id stub lists (string ids only)
- Brassbound: contract.brassbound.lamp_run.t1, contract.brassbound.lane_audit.t1, contract.brassbound.signage_post.t1, contract.brassbound.crate_escort.t1, contract.brassbound.ore_scout.t1
- Emberforge: contract.emberforge.tool_trial.pick.t1, contract.emberforge.repair_haul.t1, contract.emberforge.salvage_drillhead.t1, contract.emberforge.lamp_refit.t1, contract.emberforge.rivet_crate_recover.t1
- Ordinate: contract.ordinate.resonance_read.t1, contract.ordinate.crystal_chart.t1, contract.ordinate.safe_passage.mark.t1, contract.ordinate.lantern_test.t1, contract.ordinate.silent_escort.t1

---

## Dialogue Seeds (For Tavern Keeper & NPCs)

Brassbound Consortium — Tavern Keeper’s voice
- “Mind the ui.frame.brass on their notice—if it’s ringed, it’s on the clock.”
- “They’ll pay in neat ui.text.numbers, but only if your lamps match their mapping.lighting.lampWarm marks.”
- “Brassbound folk love a straight lane and a straight tale; cut neither.”
- “Crate run posted—small hands in the dark, so keep your shield high and your temper low.”
- “Three‑wide or no wide, that’s their creed; save them a choke and they’ll save you a scold.”
- “Paint’s fresh on the wayposts; don’t smudge their ui.text.numbers unless you fancy a lecture.”
- “If a ledger walks in, it’s wearing boots called Tallie and Jorren.”

Emberforge League — Tavern Keeper’s voice
- “When mapping.lighting.lampWarm blooms at the bench, the League smiles.”
- “They’ll trade a tale for a toolmark; terrain.ore.iron on the apron means business.”
- “Pick trials tonight—bite clean, bring back chips, and keep your knuckles whole.”
- “Hear that clatter? terrain.ore.copper rivets loose again—go earn an easy fix.”
- “They don’t haggle much; they glare until the metal agrees.”
- “If a cage rattles on your route, swap it or Old Soot will haunt your sleep.”
- “Forge folk forgive a stumble, not a shortcut.”

Crystal Ordinate — Tavern Keeper’s voice
- “If mapping.lighting.crystalCool shivers, hush—Ordinate ears are open.”
- “Their chalk on the wall is worth a lamp; see the terrain.ore.quartz glint and step where it points.”
- “They’ll ask you to listen first, walk second; pays in quiet and safe returns.”
- “Faultline lantern test posted—count flickers, count breaths, count your luck.”
- “Survey kit wants a shadow, not a shout; gobbos hate a watcher.”
- “Brass hates their pauses, Forge hates their whispers, but the rock loves them fine.”
- “Lyss of the Third Tone can hear a tremor in a toast—mind your mug.”

---

## Acceptance & Continuity Checklist
- Three distinct factions with clear mottos, colors (token‑only), tones, and specialties consistent with founding‑lore.md.
- All Signature Contracts are MVP‑feasible: lamp placement runs, 3‑wide lane audits, ore/crystal charting, escorted hauls, salvage and repairs, resonance readings.
- Specialty & Play Focus map to MVP systems: worldgen lanes and lighting, Stations & Tiers crafting, 3‑wide law, and basic enemy teaches (Goblin/block vs. Burrower/dodge).
- No mechanical promises beyond flavor “Starting Favors”; no contradictions with established First Warrant truce.
- Color references use tokens only from data/visual/color-palette.json; no raw hex or engine specifics.
- The Tavern mediates warrants, neutral per founding‑lore.md; lamp rites and 3‑wide law upheld across entries.
- Contract id stubs formatted for later data authoring; unique and namespaced by faction.