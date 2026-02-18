# Guild Factions — Compacts of Brass and Stone

Owner/Provenance: @epsilon (Narrative Systems — Lorekeeper Runebeard)

Cross-References:
- docs/narrative/founding-lore.md (§Guild Compact, law.three_wide)
- data/dialogue/tavern-npc-keeper.json
- docs/technology-systems/crafting-design.md (§Stations)
- data/items/tools.json
- data/audio/sound-manifest.json (ambient.tavern.loopA mention only)
- docs/world-generation/cave-gen-algorithm.md (Three‑Wide lanes reference)

## Overview (Short Primer)

Claim’s Mouth is neutral ground, oath-watched and ledger-kept. Here, warrants are posted on rough boards, bounties sealed with brass wax, and every guild swears to keep blades sheathed so the contracts may speak first.

Competition turns into quests because ore is finite, time is dear, and pride weighs as much as iron. When three guilds disagree on method, they do not brawl—they measure you. Bring back proof, stamped and true, and the next door opens.

So step steady: the Union braces, the Concord listens, the Syndicate charges. All will pay for clean work, and all will test your mettle.

---

## Faction Catalog (Authoritative)

### The Brassbound Union (guild.brassbound)

Motto: “Measure twice, brace thrice.”

Profile: Stoic engineers who prize redundancy and verified margins. The Union keeps the lanes lawful broad—Three‑Wide, as the Compact allows—so carts turn, crews pass, and collapse chances dwindle. They write slow, mark true, and prefer ten small bites to one greedy mouthful. Risk posture is low; they lose no dwarf for want of one more strut.

Leader: Foreman Rivet Orm — Counts bolts by touch; can hear a brace sing off-key across a drift.

Station Affinity: They shepherd rookies through the workbench to forge progression, laying out clear recipes and checks. Expect guidance toward early iron unlocks and reinforcement patterns that map neatly to Stations in the crafting design.

Contracts: Surveys, lamping of corridors, reinforcement installs, and standardization of routes. They love proofs: a stamped tool, a measured span, a properly nested pin. Bring them a reinforced pick and show iron scored clean—no sparks wasted, no teeth chipped.

Reputation Boons (future dial): Small discount on repairs at Union-staffed Stations; increased durability checks pass-rate on reinforced tools when used in compliant lanes.

Why join them first: Their paths are safest; their expectations, clearest. With the Union backing you, iron ceases to be a rumor and becomes a rhythm.

```json
{
  "id": "guild.brassbound",
  "name": "Brassbound Union",
  "motto": "Measure twice, brace thrice.",
  "specialty": ["reinforcement","safe_lanes","iron_unlocks"],
  "leader": { "id": "npc.guild.brassbound.foreman", "name": "Foreman Rivet Orm" },
  "style": { "risk": "low", "ethos": "methodical" },
  "questHooks": [
    { "id": "hook.guild.brassbound.iron_trial", "title": "Iron Trial", "system": "crafting", "summary": "Forge tool.pick.t2.reinforced and prove its bite on iron.", "mvpSurface": "tavern_board" },
    { "id": "hook.guild.brassbound.lane_lamps", "title": "Lamp the Lanes", "system": "worldgen/ui", "summary": "Survey a corridor and mark two door-lamps on the map.", "mvpSurface": "npc_line" }
  ]
}
```

---

### The Pressureglass Concord (guild.pressureglass)

Motto: “Where light bends, stone yields.”

Profile: Scholars with dust on their sleeves. The Concord studies crystal lore and the way seams whisper before they show. Their curiosity is tempered by fieldcraft: sample, label, survive to test it later. Risk posture is medium—they’ll lean into the unknown but rope themselves to good notes.

Leader: Opticmaster Lysa Prismkeg — Reads faults by lantern-scatter; keeps a satchel of chips like a library.

Station Affinity: They dream of the steam_workshop—lenses, gauges, pressure safeties—yet accept that quartz gates much of their progress. Early on, they point delvers toward quartz handling and ore scouting patterns that teach collection discipline and site fidelity.

Contracts: Return clean shards, sketch alcoves, and listen for the long hum that rides quiet air near crystal. They value patient presence: stand, observe, and bring back signal over noise. Their warrants are often “see and say” tasks that wire neatly into mapping and sampling.

Reputation Boons (future dial): Better sale price when turning in quartz; soft map pings for likely crystal alcoves once you’ve proven a steady ear.

Why join them first: If your hands like samples and your eyes like patterns, the Concord’s leads will feed your maps and your purse in due time, without boiling your boots.

```json
{
  "id": "guild.pressureglass",
  "name": "Pressureglass Concord",
  "motto": "Where light bends, stone yields.",
  "specialty": ["crystal_lore","ore_scouting","quartz_handling"],
  "leader": { "id": "npc.guild.pressureglass.opticmaster", "name": "Opticmaster Lysa Prismkeg" },
  "style": { "risk": "medium", "ethos": "inquisitive" },
  "questHooks": [
    { "id": "hook.guild.pressureglass.quartz_scout", "title": "Quartz Scout", "system": "mining", "summary": "Return shard.quartz from a fresh seam and note the alcove depth.", "mvpSurface": "tavern_board" },
    { "id": "hook.guild.pressureglass.echo_listen", "title": "Echo Listen", "system": "worldgen/ui", "summary": "Stand still by a crystal alcove and log its hum for the Concord.", "mvpSurface": "npc_line" }
  ]
}
```

---

### The Cindersteam Syndicate (guild.cindersteam)

Motto: “Heat, haste, haul.”

Profile: Brash delvers who count wins by wagonload. The Syndicate chases throughput: hotter fires, faster drills, deeper runs, and the grit to shove past snarling things that fancy your ankles. They’re not reckless—just intolerant of idle rock. Risk posture is high; rewards scale to bruises earned.

Leader: Boss Torg Emberhaft — Laughs like a furnace door; times runs by the taste of steam.

Station Affinity: They push you toward tool.drill.t3.steam, stamina loops, and any Station tweak that keeps bits spinning and boots moving. Their advice runs blunt: assemble it, fuel it, breach with it, then brag with receipts.

Contracts: Drill demos, timed breaches, and bounty slips for nasties who prowl the fresher cuts. They relish tutorials that end in sweat: parry under pressure, keep the drill fed, and don’t let goblins make you drop your tea.

Reputation Boons (future dial): Reduced drill upkeep with Syndicate mechanics; bonus scrip on enemy trophy turn-ins when posted by their board.

Why join them first: If you like the roar of steam and the clarity of a ticking clock, they’ll turn your nerves into coin and your haste into habit.

```json
{
  "id": "guild.cindersteam",
  "name": "Cindersteam Syndicate",
  "motto": "Heat, haste, haul.",
  "specialty": ["throughput","drills","aggressive_delves"],
  "leader": { "id": "npc.guild.cindersteam.boss", "name": "Boss Torg Emberhaft" },
  "style": { "risk": "high", "ethos": "audacious" },
  "questHooks": [
    { "id": "hook.guild.cindersteam.drill_demo", "title": "Drill Demo", "system": "crafting", "summary": "Assemble tool.drill.t3.steam and breach a quartz seam under time.", "mvpSurface": "tavern_board" },
    { "id": "hook.guild.cindersteam.goblin_parry", "title": "Goblin Parry", "system": "combat", "summary": "Parry a goblin slash_sweep three times without taking a hit.", "mvpSurface": "npc_line" }
  ]
}
```

---

## Faction Differentiators (At-a-Glance)

- Brassbound Union: reinforcement, safe lanes, early iron. Risk: low. On-ramps: Iron Trial; Lamp the Lanes.
- Pressureglass Concord: crystal lore, ore scouting, quartz. Risk: medium. On-ramps: Quartz Scout; Echo Listen.
- Cindersteam Syndicate: throughput, drills, combat bounties. Risk: high. On-ramps: Drill Demo; Goblin Parry.

---

## Reputation & Progression Notes (MVP‑Safe)

- Ladder (0–3): Rank 0 Unbonded; Rank 1 Hand; Rank 2 Proven; Rank 3 Sworn.
- Triggers (simple, event-driven):
  - Item turn-ins: shard.quartz, enemy trophies, stamped tools.
  - Crafts: completion of specified tool tiers (e.g., tool.pick.t2.reinforced, tool.drill.t3.steam).
  - Surveys/marks: lane lamps placed, alcoves logged.
  - Tutorials cleared: parry streaks, timed breaches.
- Boons (flavor only for Sprint 1; future integration points):
  - Brassbound: light repair discount at Union Stations; higher chance to avoid tool wear in Three‑Wide lanes.
  - Pressureglass: improved quartz sale rates; occasional crystal alcove pings on map after listen tasks.
  - Cindersteam: lower drill upkeep; bonus scrip multipliers for posted bounties.
- Notes:
  - Reputation accrues per guild; neutral ground persists in Claim’s Mouth.
  - UI should surface current rank tag and next warrant unlock condition.
  - All numbers are dials for later tuning; no balances implied here.

---

## Quest Hook Index (Stable IDs)

- hook.guild.brassbound.iron_trial — Iron Trial — system: crafting — surface: tavern_board
- hook.guild.brassbound.lane_lamps — Lamp the Lanes — system: worldgen/ui — surface: npc_line
- hook.guild.pressureglass.quartz_scout — Quartz Scout — system: mining — surface: tavern_board
- hook.guild.pressureglass.echo_listen — Echo Listen — system: worldgen/ui — surface: npc_line
- hook.guild.cindersteam.drill_demo — Drill Demo — system: crafting — surface: tavern_board
- hook.guild.cindersteam.goblin_parry — Goblin Parry — system: combat — surface: npc_line

---

## Integration Notes (For Engineers/Designers)

- Contracts:
  - IDs are stable and lowercase with dots: guild.*, hook.guild.*.
  - Quest hooks are MVP-safe, mapping to existing systems: mining, crafting, combat, worldgen/ui.
  - No raw color/audio tokens in prose; only conceptual mentions. NPC ids can be created later to match leaders.
  - DialogueSystem may surface short faction taglines in NPC chatter; keep mottos ≤70 chars for UI fit.
- Data blocks:
  - Exact schema per block: id, name, motto, specialty[], leader{}, style{}, questHooks[] (order preserved).
  - Summaries ≤120 chars for reuse on boards/tooltips.
- Worldgen ties:
  - Brassbound “safe lanes” align with Three‑Wide lanes; lamp marks are map annotations.
  - Concord alcove “echo listen” is a stand-still timer near crystal-tagged tiles; log only, no audio token names.
  - Syndicate drill demo assumes tool.drill.t3.steam is craftable per Stations.
- Surfaces:
  - tavern_board = posted warrant UI.
  - npc_line = single-line prompt from a leader or keeper.

---

## UI Snippets [HOOK]

- [HOOK] Brassbound Union: Steady hands win iron, not bravado. Brace it, then bite it.
- [HOOK] Pressureglass Concord: Listen to the stone; it hums before it yields.
- [HOOK] Cindersteam Syndicate: Make it hot, make it fast, drag it home.
- [HOOK] Claim’s Mouth posts are live—pick a board, earn your mark.

---

## Versioning & Acceptance

v1.0

Acceptance Checklist:
- Exactly 3 factions with distinct mottos, specialties, and leaders.
- Each faction has a machine-scrapable data block with keys: id, name, motto, specialty[], leader{}, style{}, questHooks[].
- Exactly 6 total quest hooks (2 per guild) with MVP-safe targets/surfaces.
- IDs conflict with none in existing data (tools/enemies/audio).
- Tone: dwarven, clear, approachable; lengths fit UI.