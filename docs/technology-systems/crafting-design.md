# Crafting & Mining Tools — Gears, Grit, and Good Steel (Sprint 1)

Provenance
- Owner: @delta (Technology Systems — Gearwright Steamforge)
- Authoring voice: Gearwright Steamforge
- Cross-references:
  - data/crafting/recipes.json
  - data/items/tools.json
  - docs/world-generation/cave-gen-algorithm.md (§Hardness & ore seeding)
  - data/core/component-schemas.json (Tile)
  - docs/combat-systems/combat-design.md (§Stamina)
  - docs/audio-systems/audio-design.md (§Event Bridge)
  - data/visual/color-palette.json (UI tokens for tool icons)

---

## 1) Goals & MVP Scope

- Three-tier progression in ~20–40 minutes of play:
  - T1 Basic Pick → T2 Reinforced Pick → T3 Steam Drill.
- Mining respects hardness gates and stamina pacing. Data is JSON-first so engineers can wire systems immediately.
- Acceptance notes:
  - JSON parse stability and strict key order honored.
  - Tool tiers feel meaningfully stronger at each unlock.
  - Swing/pulse cadence and event timing align with audio spec.

---

## 2) Resource Catalog (Stable Ids)

- Raw Ores:
  - ore.copper
  - ore.iron
- Crystal:
  - shard.quartz
- Power Core:
  - core.steam
- Tools:
  - tool.pick.t1.basic
  - tool.pick.t2.reinforced
  - tool.drill.t3.steam
- Station ids:
  - workbench (tier 1)
  - forge (tier 2)
  - steam_workshop (tier 3)

---

## 3) Stations & Craft Flow (MVP Mechanics)

- Workbench (Tier 1)
  - Purpose: crafts simple tools.
  - Fuel: none.
  - UI: progress bar.
  - timeMs: 6000 for T1.
- Forge (Tier 2)
  - Purpose: heavier recipes.
  - timeMs: 9000 for T2 tool.
  - Unlocks iron-gated tool.
- Steam Workshop (Tier 3)
  - Purpose: assembly and power routing.
  - timeMs: 14000 for T3 drill.

UI/UX behavior
- stationTier gates recipe visibility and craft button enable.
- If materials missing, show CTA: “Acquire X copper/iron/quartz/core.”
- On craft start: lock inputs, show station progress; on completion, push output to inventory.

---

## 4) World Tile Hardness & Gates (Authoritative for Sprint 1)

- Tile hardness mapping (from worldgen):
  - rock: hardness 3
  - copper vein: hardness 4
  - iron vein: hardness 5
  - quartz band: hardness 6–7
- Eligibility rule:
  - A tool can progress a tile if miningPower ≥ tile.hardness.
  - Quartz bands may spawn as hardness 6 or 7; the T3 drill covers both.

---

## 5) Mining Model (Numbers for MVP)

General
- Tiles track normalized break progress in [0.0–1.0]. On reach ≥ 1.0, tile breaks.
- On break: emit mining.Break and replace tile with floor + drops per loot table.

Picks (discrete swings)
- Action cadence: stats.swingIntervalMs.
  - T1: 520 ms per swing.
  - T2: 480 ms per swing.
- Eligibility gate: miningPower ≥ tile.hardness, else deny.
- Progress per swing:
  - progressAppliedNormalized = balances.progressPerSwing × toolEfficiencyVsHardness × pickHardnessFactor(hardness)
  - toolEfficiencyVsHardness:
    - 1.00 when tool.miningPower == tile.hardness
    - 1.15 when tool.miningPower ≥ tile.hardness + 1
  - pickHardnessFactor(h) = 3 / h
    - Rationale: “3 swings” baseline targets rock (h=3) with T1 balance.
- Tuning intent:
  - Require ~3 swings to break rock baseline with T1 (≈1.6 s).
  - Harder ores take proportionally more “HP-equivalent” via hardness scaling.

Drill (hold-to-pulse)
- Action cadence: stats.pulseIntervalMs; suggested 160 ms pulses while biting.
- Audio hysteresis states: spinUp → bite → coolDown per audio spec.
  - Only “bite” applies progress.
  - Stamina draw only while biting (see §7).
- Progress per pulse:
  - progressAppliedNormalized = balances.progressPerPulse × biteCoefficient × drillHardnessFactor(hardness)
  - biteCoefficient: 0.75 (recommended default while in bite state; 0 during spinUp/coolDown).
  - drillHardnessFactor(h) = 6 / h
    - Tuned so that versus quartz (h=6–7) the drill completes in ~2.4–2.8 s, i.e., about 1.2–1.4× T2-on-iron, but feels continuous.
- Suggested baseline:
  - balances.progressPerPulse = 0.09
  - With the above factors, quartz(6) ≈ 14–16 pulses (2.24–2.56 s); quartz(7) ≈ 16–18 pulses (2.56–2.88 s), subject to audio state entry/exit overhead.

Break condition
- When accumulated progress ≥ 1.0:
  - Emit mining.Break { toolId, tileType, oreType|null, pos:{x,y} }.
  - Replace/convert tile and spawn drops according to loot rules.

---

## 6) Stamina & Durability (MVP-simple)

Stamina (see Combat §Stamina: regen 14/s, 600 ms delay)
- T1 pick: staminaCostPerSwing = 10
- T2 pick: staminaCostPerSwing = 12 (heavier but faster outcomes)
- T3 drill: staminaCostPerSec = 22 while biting; 0 during spinUp/coolDown
- Intent: chain-swings drain fast enough to encourage brief pauses; ~5–6 T1 swings before empty if no pause (regen delay 600 ms).

Durability
- T1: durabilityMax 120; durabilityPerSwing 1
- T2: durabilityMax 180; durabilityPerSwing 1
- T3: durabilityMax 240; durabilityPerSecWhileBiting 2
- On breakage: tool becomes unusable until repaired/replaced (MVP may disable repair UI; counter still decrements for future loop).

---

## 7) Audio/UI Event Bridge (Contracts)

MiningSystem emits events per audio-design.md §Event Bridge:

- mining.Swing
  - Payload: { toolId, tileType, oreType|null, eligible }
- mining.Progress
  - Payload: { toolId, tileType, oreType|null, applied }  // applied = normalized delta this action
- mining.Break
  - Payload: { toolId, tileType, oreType|null, pos:{x,y} }
- mining.Deny
  - Payload: { reason:"hardness"|"stamina"|"angle", toolId }

UI expectations
- If reason=="stamina": show deny tooltip (“Catching your breath…”) near stamina bar.
- If reason=="hardness": grey out swing impact, slight bounce animation on tool, and hint “Needs stronger tool.”
- Hook audio timing to swing/pulse intervals; respect hysteresis transitions for drill.

---

## 8) Data Contracts (Authoritative JSON Schemas)

A) data/crafting/recipes.json (already landed)
- version:int == 1
- recipes: array[3]; each entry uses exact keys and order:
  - id, name, stationId, stationTier, timeMs, inputs[], output, notes[]
- Concrete timings must equal landed file:
  - T1: 6000 ms; T2: 9000 ms; T3: 14000 ms
- Ids must align with tool ids in this document.

B) data/items/tools.json (to be authored now)
- Strict JSON (UTF-8, no comments). Top-level exact shape and key order:
  - { "version": 1, "tools": [ ToolDef, ToolDef, ToolDef ] }
- ToolDef exact keys and order:
  - id, name, kind, tier, miningPower, stats, balances, ui, notes
- stats object key order:
  - swingIntervalMs, staminaCostPerSwing, pulseIntervalMs, staminaCostPerSec, durabilityMax, durabilityPerSwing, durabilityPerSecWhileBiting
- balances object key order:
  - progressPerSwing, progressPerPulse
- ui object key order:
  - iconId, tintToken
- Concrete entries (Sprint 1 values):

```json
{
  "version": 1,
  "tools": [
    {
      "id": "tool.pick.t1.basic",
      "name": "Basic Pick",
      "kind": "pick",
      "tier": 1,
      "miningPower": 4,
      "stats": {
        "swingIntervalMs": 520,
        "staminaCostPerSwing": 10,
        "pulseIntervalMs": null,
        "staminaCostPerSec": null,
        "durabilityMax": 120,
        "durabilityPerSwing": 1,
        "durabilityPerSecWhileBiting": null
      },
      "balances": {
        "progressPerSwing": 0.34,
        "progressPerPulse": null
      },
      "ui": {
        "iconId": "ui/icon.tools.pick_t1_24",
        "tintToken": "ui.frame.copper"
      },
      "notes": [
        "Tier 1 pick: eligible up to hardness 4 (rock, copper).",
        "Baseline ~3 swings on rock; equal hardness on copper.",
        "Crafted at workbench."
      ]
    },
    {
      "id": "tool.pick.t2.reinforced",
      "name": "Reinforced Pick",
      "kind": "pick",
      "tier": 2,
      "miningPower": 5,
      "stats": {
        "swingIntervalMs": 480,
        "staminaCostPerSwing": 12,
        "pulseIntervalMs": null,
        "staminaCostPerSec": null,
        "durabilityMax": 180,
        "durabilityPerSwing": 1,
        "durabilityPerSecWhileBiting": null
      },
      "balances": {
        "progressPerSwing": 0.39,
        "progressPerPulse": null
      },
      "ui": {
        "iconId": "ui/icon.tools.pick_t2_24",
        "tintToken": "ui.frame.iron"
      },
      "notes": [
        "Tier 2 pick: eligible up to hardness 5 (adds iron).",
        "Efficiency bonus vs hardness ≤4 applies.",
        "Crafted at forge."
      ]
    },
    {
      "id": "tool.drill.t3.steam",
      "name": "Steam Drill",
      "kind": "drill",
      "tier": 3,
      "miningPower": 7,
      "stats": {
        "swingIntervalMs": null,
        "staminaCostPerSwing": null,
        "pulseIntervalMs": 160,
        "staminaCostPerSec": 22,
        "durabilityMax": 240,
        "durabilityPerSwing": null,
        "durabilityPerSecWhileBiting": 2
      },
      "balances": {
        "progressPerSwing": null,
        "progressPerPulse": 0.09
      },
      "ui": {
        "iconId": "ui/icon.tools.drill_t3_24",
        "tintToken": "ui.frame.crystal"
      },
      "notes": [
        "Tier 3 drill: eligible up to hardness 7 (quartz 6–7).",
        "Hold-to-bite pulses with audio hysteresis (spinUp/bite/coolDown).",
        "Crafted at steam_workshop."
      ]
    }
  ]
}
```

---

## 9) Tool Tier Behaviors & Unlocks

- T1 Basic Pick (miningPower 4)
  - Mines: rock (3), copper (4)
  - Bounces/deny on: iron (5), quartz (6–7)
- T2 Reinforced Pick (miningPower 5)
  - Adds: iron (5)
  - Still bounces on: quartz (6–7)
- T3 Steam Drill (miningPower 7)
  - Mines all above including quartz (6–7)
  - Continuous bite with audio hysteresis; pulses apply progress only while biting

---

## 10) Balancing Targets & Pacing

Early loop resources
- T1: obtain 8x ore.copper → craft Basic Pick
- T2: obtain mixed 6x ore.copper + 6x ore.iron → craft Reinforced Pick
- T3: obtain 10x ore.iron + 2x shard.quartz + 1x core.steam → assemble Steam Drill

Target per-tile times (eligible hardness)
- T1 on rock: ~1.6 s (≈3 swings @520 ms)
- T1 on copper: ~2.0 s (≈4 swings @520 ms, equal hardness)
- T2 on iron: ~2.2 s target; practical 2.0–2.3 s with 0.39 balance + 480 ms cadence
- T3 on quartz: ~2.4–2.8 s continuous bite; softer tiles complete faster under drill hardness scaling

Stamina cadence
- Regen 14/s with 600 ms delay. Chain swinging drains in clusters:
  - T1: ~5–6 swings before bottoming out if no pause.
  - T2: similar cluster length; faster break times reduce time-to-ore.

---

## 11) Repairs (MVP Decision)

- Option A (recommended): disable repair UIs for Sprint 1; durability still decrements to collect telemetry and support future loop.
- Option B (fallback): enable simple repair at:
  - workbench (T1/T2) using copper/iron respectively
  - steam_workshop (T3) using iron + quartz
- Keep disabled by default for Sprint 1.

---

## 12) Integration Notes

- MiningSystem reads:
  - Tile (tileType, hardness, oreType) from data/core/component-schemas.json
  - Held/selected tool definition from data/items/tools.json
- Enforce stamina gates via ECS clamping; if insufficient, emit mining.Deny { reason:"stamina" } and do not consume durability.
- Eligibility:
  - If miningPower < hardness: emit mining.Deny { reason:"hardness" } and play “bounce” feedback; no stamina or durability cost.
- Angle/aim:
  - If raycast/angle invalid per tool cone, emit mining.Deny { reason:"angle" }.
- Visual/UI tokens for tool icons must exist in atlas and map tintToken via data/visual/color-palette.json at runtime.

---

## 13) Acceptance Checklist

- Data
  - data/items/tools.json present, strictly valid JSON, exact key order, and with the three concrete ToolDef entries as specified.
  - Ids match recipes in data/crafting/recipes.json; station timings T1 6000 ms, T2 9000 ms, T3 14000 ms.
- Mechanics
  - Hardness gates: T1≤4, T2≤5, T3≤7; behavior matches worldgen hardness mapping.
  - Picks use discrete swings; drill uses hold-to-pulse with audio hysteresis.
  - Stamina costs apply exactly as defined; no draw during spinUp/coolDown for drill.
  - Durability decrements per action; broken tools are unusable.
- Timing and Feel
  - Swing intervals and pulse cadence align with audio event timing.
  - T1/T2/T3 time-to-break hit target ranges on eligible tiles.
- Events & UI
  - mining.Swing / mining.Progress / mining.Break / mining.Deny emitted with exact payload shapes.
  - UI shows stamina tooltip on deny; greys out/bounce on hardness deny.
- Engineering Readiness
  - Numbers parse and are testable; document is implementation-ready for MiningSystem and UI gating.