# Visual Style Guide — Brass, Stone, and Crystal (Sprint 1)

Owner: @eta (Visual Systems — Brightforge Crystalsmith)

Provenance and cross‑references:
- Palette tokens: data/visual/color-palette.json (v1)
- UI framework: docs/visual-systems/ui-framework.md (upcoming)
- Combat telegraphs: docs/combat-systems/combat-design.md (§8 Telegraphs), data/combat/enemy-*.json (telegraph color dependency)
- Cave generation lanes: docs/world-generation/cave-gen-algorithm.md (§Three‑Wide)
- ECS tint contract: docs/core-systems/ecs-architecture.md (§Renderable.tintToken)

Purpose: This is the implementation-ready visual contract for Sprint 1. Artists, build to it. Engineers, wire to it. No loose bolts, no squeaky gears.

---

## 1) Pixel Grid & Scale (Authoritative)

- Tile size: 16×16 px (authoritative for Sprint 1).
  - Rationale: web-friendly, crisp silhouettes at 3×; texture memory and fill-rate remain tame; readable interaction lanes.
- ECS Collider default: 12×12 px, centered within the 16×16 tile.
  - Leaves a 2 px safety margin on all sides for lane reads and telegraphs.
- World scale:
  - Render at 3×–4× integer scale (CSS scale or Phaser camera zoom).
  - Target UI legibility tuned at 3× on desktop.
- Collision and body fit:
  - Actor physics bodies: 12×12 px. Visuals may exceed this (see character rules) but must not alter collision.
- Grid alignment rules:
  - Environment sprites (tiles, props, ore bands, doors): snap to the 16 px grid (x and y multiples of 16).
  - Characters:
    - May sub-pixel animate during movement.
    - On idle and frame holds, anchor feet to 16 px row lines (eliminate shimmer at integer zoom).

---

## 2) Palette & Tokens

- Source of truth: All in-engine colors resolve via data/visual/color-palette.json. No hard-coded hex in art notes or code.
- Required tokens for art tint overlays (minimum set for Sprint 1):
  - UI frames: ui.frame.copper, ui.frame.brass, ui.frame.crystal
  - Telegraphs: mapping.telegraph.arc.amber
  - Terrain: terrain.rock.base, terrain.rock.shadow, terrain.floor.base, terrain.ore.copper, terrain.ore.iron, terrain.ore.quartz, terrain.ore.*.spark
  - Characters: characters.player.base, characters.player.beard, characters.player.outline, characters.goblin.base, characters.goblin.outline
  - Metals and gear accents: metal.copper, metal.iron, metal.steel, metal.bronze (use for tools, buckles, readable highlights)
  - Effects: effects.hitFlash, effects.poiseBreakFlash, effects.debris.rockA, effects.debris.rockB, effects.smokePuff
  - Lighting and depth: mapping.lighting.lampWarm, mapping.lighting.crystalCool, mapping.depthTint.l0
  - Minimap: minimap.floor, minimap.rock, minimap.actor.player, minimap.actor.enemy, minimap.poi.ore
- Accessibility contract (engine-enforced via tokens):
  - Text on panels: ui.text.primary on ui.panel.bg ≥ 4.5:1 contrast
  - Secondary text: ui.text.secondary on ui.panel.bg ≥ 3:1
  - Gauges: fill vs bg ≥ 3:1
  - Note: The v1 palette satisfies these. Engineers must not bypass tokens; enforce via Renderable.tintToken (see ECS spec).

---

## 3) Character Proportions & Silhouette Language (MVP)

- Player dwarf (hero):
  - Collision: 12×12 px body.
  - Visual height: 12 px body mass; helmet plume/hair may exceed by up to +2 px (non-colliding).
  - Readable broad shoulders, stout legs; pick/drill silhouette must be clear in 16×16 cell.
  - Beard/hair region uses characters.player.beard for identity; keep tonal separation from body base by at least one palette step.
- Goblin (enemy baseline):
  - Visual height: ~11 px; wiry limbs; triangle-lean silhouette with a long arm accent (threat directionality).
  - Outline uses characters.goblin.outline (1 px inner accent stroke).
- Readability cues (all bipedal sprites, MVP):
  - Apply a 1 px inner outline accent using characters.*.outline. This is not a heavy black; it’s a protective tone for dark rock backdrops.
  - Primary hand/tool highlight uses metal.* tokens (avoid pure white; specular > base by 1–2 palette steps).
  - Keep head and hands 1 shade brighter than torso in idle/walk for target acquisition.

---

## 4) Animation Sets & Frame Counts (Per-action, MVP)

Global timing: 60 fps baseline. Combat windows align with docs/combat-systems/combat-design.md.

- Idle:
  - 4 frames; subtle 2–3 px vertical bob and micro tool sway.
  - Loop 400–600 ms.
- Walk/Run:
  - 6 frames; 100–120 ms/frame baseline; adjust by movement speed.
  - At least 2 frames with explicit planted foot for grounded read.
- Light Attack (pick swing):
  - 6–7 frames total.
  - Timing guide: ~300 ms windup, ~80 ms active, ~420 ms recovery.
  - Key poses: windup (tool back), contact (impact), follow-through (extension).
- Mining Swing (eligible rock):
  - 6 frames; emphasize contact frame (wider smear), coordinate with hit flash.
- Drill (steam):
  - Three-state set:
    - spinUp: 4 frames, 160–220 ms total
    - bite loop: 4 frames, loops steadily (no drift); sound-synced
    - coolDown: 3 frames, 140–200 ms total
- Hit‑react:
  - 2 frames; 80–120 ms pop; include 1–2 px positional smear/knockback.
- Poise Break/Stun:
  - 3 frames looping wobble for ~800 ms; head and tool lag emphasized.
- Death (enemy):
  - 6 frames collapse; handoff to debris VFX (shards/smoke) at final 1–2 frames.
- Sprite export naming:
  - {entity}.{action}.{variant}.png (e.g., player.walk.base.png, goblin.attack.sickle.png)
  - Export as horizontal strips at 16 px multiples; each frame aligned to 16×16 cell bounds.
  - Atlas JSON optional in Sprint 1; permissible to use frame dimensions inferred from strip length.

---

## 5) Environment & Tiles

- Tile taxonomy (16×16 each):
  - rock (wall), floor (walkable), ore overlays (copper, iron, quartz), door bands (D), approach lanes.
  - No baked lighting into tiles. Lighting arrives via engine halos and overlay tints.
- Edge shading:
  - rock.wall uses terrain.rock.shadow for interior edges; avoid pure black.
  - Floor meets rock with a crisp 1 px dark lip to separate planes.
- Ore readability:
  - Ore overlays blend onto rock using terrain.ore.* tokens.
  - Embed 2–4 px spark accents using terrain.ore.*.spark at restrained density (≤10% of ore pixels) to avoid twinkle noise at 3×.
- Three‑Wide Law visuals:
  - Behind any door band ‘D’, maintain a clean 3‑tile floor lane for ≥3 tiles depth (docs/world-generation/cave-gen-algorithm.md §Three‑Wide).
  - No decorative protrusions, posts, rubble, or torches intruding into this lane. Telegraphs and pathing rely on this clarity.

---

## 6) Lighting & Effects Rules

- Lamps:
  - Halo color: mapping.lighting.lampWarm.
  - Visual: 2 px bright inner ring + soft quad-sprite halo with additive blend.
  - Radius: ~24–32 px; opacity 0.35–0.5; ensure UI remains unwashed.
- Crystals:
  - Halo color: mapping.lighting.crystalCool.
  - Sharper falloff than lamps; radius 16–24 px.
  - Optional subtle brightness animation 0.85–1.0 at 1–2 Hz.
- Depth tint:
  - mapping.depthTint.l0 applied as a subtle scene overlay by engine.
  - Artists keep base sprites neutral; do not pre-bake depth.
- Hit flashes and poise:
  - On contact frames, overlay effects.hitFlash (sprite tintFill or additive overlay).
  - Poise break uses effects.poiseBreakFlash as a brief pulse; optional 1 px outline bloom for 1–2 frames.
- Smoke/debris:
  - Particle tint tokens: effects.debris.rockA, effects.debris.rockB, effects.smokePuff.
  - Favor 45° shard vectors on mining breaks; 6–10 particles per event for MVP.

---

## 7) Telegraphs (Visual Contract)

- Arc visuals:
  - Stroke: 2 px core stroke + 1 px outer halo using mapping.telegraph.arc.amber at 30–50% opacity.
  - Conform to arcs ≤110° per combat doc (§8).
- Lifecycle:
  - Visible only during windup. Optional pre-flash via flashAtMs before active.
  - Clear immediately on AttackEnd or cancel; no lingering.
- Occlusion rules:
  - Telegraphs must not obscure actor sprite center by more than 60% cumulative opacity.
  - Maintain floor and lane readability; do not mask HUD elements.

Note: Enemy telegraph color may be data-driven per data/combat/enemy-*.json. Default to mapping.telegraph.arc.amber unless overridden by enemy entry.

---

## 8) UI Iconography & HUD Sprite Guidance (Pointers)

- Icon grid: 16×16 base; export at 2×–3× for UI scale.
- Material language: consistent use of metal.* and ui.frame.* tokens for bevels, borders, and sockets; crystal.* accents for interactives.
- Gauges:
  - Health: ui.gauge.health.fill on ui.gauge.health.bg
  - Stamina: ui.gauge.stamina.fill on ui.gauge.stamina.bg
  - Ensure ≥3:1 contrast; avoid thin single-pixel checker patterns.
- Hotbar:
  - Slots: ui.hotbar.slot.bg with ui.hotbar.slot.active ring when selected.
  - Bevels leverage ui.frame.copper|brass|crystal based on theme.
- Inventory items:
  - 16×16 with 1 px outline; avoid heavy pure-black interiors.
  - Use 2–3 tone ramps; keep specular one step, not white-out.

(Full layout and component states defer to docs/visual-systems/ui-framework.md.)

---

## 9) Export & Asset Packaging

- File format:
  - PNG (indexed or RGBA). Avoid semi-transparent interior pixels except in VFX/halos.
  - Keep clean alpha edges; no premultiplied fringe.
- Atlases:
  - Prefer per-domain atlases to reduce draw calls:
    - characters, enemies, environment, ui
  - Maintain stable frame order across strips for deterministic playback.
- Naming and foldering:
  - assets/characters/player/player.walk.base.png
  - assets/enemies/goblin/goblin.attack.sickle.png
  - assets/environment/ore/ore.copper.overlay.png
  - assets/ui/icons/icon.pick.base.png
- Source retention:
  - Store layered Aseprite/PSD in art_source (not shipped).
  - Use frame tags matching action names (idle, walk, attack_light, mine, drill_spinUp, drill_bite, drill_coolDown, hit, stun, death).

---

## 10) Phaser 3 Integration Notes (Engineer Contract)

- Camera and scaling:
  - Use integer zoom (3×–4×). Set roundPixels:true on cameras for crisp stepping.
  - Snap world objects intended to grid to multiples of 16 px; characters may move sub-pixel, but foot-plant frames should align to 16 px rows.
- Tint application (ECS):
  - Renderable.tintToken (docs/core-systems/ecs-architecture.md) resolves to palette hex from data/visual/color-palette.json.
  - Base tints: sprite.setTint(hex).
  - Flash overlays (hit/poise): sprite.setTintFill(hex) for one or two frames; clear immediately.
- Telegraph layer:
  - Dedicated Graphics or RenderTexture above terrain, below HUD.
  - strokeStyle/lineStyle uses mapping.telegraph.arc.amber; additive or normal blend depending on background—default normal to preserve floor read.
  - Clear between frames; avoid accumulation.
- Lighting overlays:
  - Draw lamp/crystal halos after sprites, before HUD.
  - Use additive blend for halos; control opacity via token-driven alpha (0.35–0.5 lamps, 0.3–0.45 crystals).
- Depth tint:
  - Apply mapping.depthTint.l0 as a fullscreen quad or camera postFX. Artists will not bake depth.
- Minimap and HUD:
  - Use minimap.* and ui.* tokens exclusively (details deferred to ui-framework.md).

---

## 11) QA & Accessibility Checklist

- Character outline contrast verified over terrain. Player and goblin outlines distinct using characters.*.outline.
- Floor/rock separation readable at 3× scale; 1 px floor lip present.
- Telegraph arcs readable, do not mask HUD, and comply with ≤110° arc spec.
- Gauges and text meet stated contrast ratios via palette tokens; no hard-coded colors.
- No single-pixel elements thinner than 1 px at native scale; avoid high-frequency noise and dot crawl at 3×.
- Tools and threat direction clear on keyframes (contact frames identifiable within 80 ms window).

---

## 12) Risks & Dials

- Risk: Over-busy ore pixels reduce enemy read.
  - Dial: Reduce terrain.ore.*.spark density; cap at ≤10% of ore pixels.
- Dial: Outline intensity for characters via characters.*.outline brightness (±10% from base).
- Dial: Lamp halo opacity 0.35–0.5 to balance scene mood against UI contrast.
- Dial: Telegraph halo opacity 0.3–0.5 to prevent over-occlusion at actor center.

---

## 13) Acceptance Checklist

- Tile size (16×16) and body proportions (12×12 collider) fixed and documented.
- Animation frame counts and timings provided for all MVP actions.
- Environment edge shading and ore readability rules implemented.
- Lighting and telegraph rules align with combat timing and audio cues.
- Palette token usage mandated; no hard-coded hex values in art or code paths.
- Phaser integration hooks clear: roundPixels, tint application, layer ordering, additive halos, telegraph rendering.

---

Forge it true, keep it readable, and let the brass sing against the stone. — Brightforge Crystalsmith