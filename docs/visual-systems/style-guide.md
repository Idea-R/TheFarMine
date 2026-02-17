# Visual Style Guide — Brass, Stone, and Crystal Light (Sprint 1)

Provenance: owner @brightforge (Visual Systems — Master Crystalsmith)

Cross-references (read these alongside, hammer to anvil):
- docs/core-systems/ecs-architecture.md (§Renderable.tintToken, Collider sizes)
- docs/world-generation/cave-gen-algorithm.md (§Tiles 16×16, lighting tokens)
- docs/combat-systems/combat-design.md (§Three-wide law, telegraph colors)
- docs/audio-systems/music-direction.md (§Sync cues mention)
- data/visual/color-palette.json (token-only)
- data/combat/*.json (collider/hitbox fairness)
- data/world/room-templates.json (zClearance >=3)


## 1) Art Direction Pillars (One-pager)

- Steampunk dwarven utility: everything looks built for work first, ornament second. Rivets you can count, joints that look serviceable, wear that tells use.
- Brass hardware + crystal lumens: warm brass frames and fixtures, cool crystal light accents. Metal reads weighty; crystal reads lively.
- Readable silhouettes in three-wide lanes: every actor and prop must read cleanly within 48 px corridors at 3×–4× display scale.
- Restrained speculars: no plastic shine. Brass gets tight highlights; iron stays matte; crystals get discreet facet glints.
- Token-driven lighting and palettes: all color from data/visual/color-palette.json, referenced by tokens only. No raw hex. No per-asset freelancing.
- Animation as micro-story: each loop communicates intent and timing (windup, commit, recovery), built to sync with audio cues.
- Consistency over flourish: effects and telegraphs use approved tokens and blends, never hijack UI channels.


## 2) Pixel Grid & Resolution

- Authoritative tile size: 16×16 px per grid cell (matches cave-gen).
- Authoring scale: paint at 1×. In-engine display scale: integral 3× or 4× recommended.
- Camera and lanes:
  - Corridors and combat lanes are 3 tiles (48 px) wide per docs/combat-systems/combat-design.md (Three-wide law).
  - Maintain clear negative space around actor silhouettes within lanes; avoid silhouette breaches into adjacent lanes unless clearly telegraphed.
- Motion and sampling:
  - Art: no subpixel painting (align all edges to 1 px grid).
  - Engine: may move entities at subpixel precision; renderer must sample sprites pixel-perfect (nearest-neighbor, no linear filtering) and snap final composited output to the scaled pixel grid.
- Parallax/depth layers (logical, not an exhaustive engine enum):
  - Background (BG): distant rock planes and deep props; apply depth tint via mapping.depthTint.l0.
  - Midground (MG): traversable terrain tiles, props flush with lanes.
  - Actors (ACT): characters, interactive pickups.
  - Foreground VFX (FX): dust, sparks, close overlays that should sit above actors but below HUD.
  - HUD (UI): interface panels and gauges.
- Layering rule of thumb: BG < MG < ACT < FX < UI. Do not place gameplay-relevant telegraphs above HUD.


## 3) Color & Materials (Token-Only)

Use tokens from data/visual/color-palette.json exclusively. If a token is missing, request addition; do not introduce hex.

- Brass frames/trim:
  - ui.frame.brass (HUD frames, brass props, sconces, hinges)
- Warm lamp light:
  - mapping.lighting.lampWarm
- Crystal glow (cool):
  - mapping.lighting.crystalCool
- Terrain base/shadows:
  - terrain.rock.base
  - terrain.rock.shadow
  - terrain.floor.dirt
- Ores:
  - terrain.ore.copper
  - terrain.ore.iron
  - terrain.ore.quartz
- Characters:
  - characters.player.tint
  - characters.goblin.tint
  - characters.burrower.tint
- UI text/gauges:
  - ui.text.primary
  - ui.text.numbers
  - ui.text.warning
  - ui.gauges.healthFill
  - ui.gauges.staminaFill
- Effects:
  - effects.hitFlash
  - effects.poiseBreakFlash
  - effects.sparkRock
  - effects.sparkOre

Material notes (practical craft):
- Brass vs copper: brass elements (frames, fixtures) get ui.frame.brass with small, hard spec hits; copper ore studs use terrain.ore.copper, read redder and slightly duller, with broader, softer highlights.
- Iron vs rock: iron (terrain.ore.iron) renders matte with minimal highlight; separate from terrain.rock.shadow by value, not by outline.
- Quartz: base with terrain.ore.quartz; add specular hint using sparse 1 px dither/sparkle; rim and bloom accents use mapping.lighting.crystalCool at low opacity on facets. Keep sparkle density low to avoid noise.


## 4) Lighting & Shading Rules (2D Pixel Lighting)

- Primary lighting: baked/tinted pixels in the sprite/tiles; do not rely on dynamic normal maps in Sprint 1. Use simple additive or overlay passes for lamps and crystals.
- Lamps:
  - Soft radial vignette using mapping.lighting.lampWarm.
  - Falloff in 3–4 rings (concentric steps of 1 px or 2 px thickness as needed at 1×).
  - Inner ring additive strength: cap at 60% to avoid bloom blowout and preserve palette discipline.
- Crystal shimmer:
  - Use mapping.lighting.crystalCool on facet rims and 1–2 px bloom pips.
  - Prefer overlay/screen blends; keep pulses brief (1–2 frames) to suggest life without UI confusion.
- Depth tint:
  - Apply mapping.depthTint.l0 to BG planes and distant props to reduce apparent saturation/contrast (~−10–15% “feel”). Implementation via a single-pass multiply/overlay using the depth tint token.
- Telegraph overlays:
  - mapping.telegraph.emerge.amber rendered with screen/add at 35–55% alpha depending on urgency (see docs/combat-systems/combat-design.md).
  - Never reuse telegraph tokens for UI fills or persistent HUD elements.


## 5) Character Proportions & Silhouette

- Baseline sprite boxes (authored areas):
  - Player: 16×16 authored; functional silhouette centered to fit a 12×12 Collider (see docs/core-systems/ecs-architecture.md §Collider sizes). Head:body:legs ≈ 3:6:7 px vertical proportions. Tools (pick/drill) may extend 4–6 px outside the box during attacks; ensure separate hit/hurt volumes in data/combat/*.json.
  - Goblin / Burrower: 16×16 authored; keep body occupancy ≈12×12 to honor lane margins and maintain fair dodging windows.
- Readability:
  - Use a dark edge only where contact or self-shadow warrants it; avoid full black outline. Let lampWarm/crystalCool provide ambient rims when near sources.
  - Keep negative space under arms and between legs during motion readable at 3× scale.
- Pivots and feet:
  - Pivot should sit at foot centerline to stabilize ground contact. Keep toe and heel frames consistent across animations.


## 6) Animation Standards (Frame Counts & Timings)

Author at 1×. Engine may time-scale but must preserve frame order. Respect audio sync cues (docs/audio-systems/music-direction.md).

- Idle:
  - 4 frames, 140 ms per frame. Subtle beard sway, lamp blink, or idle tool jiggle.
- Walk:
  - 6 frames, 90 ms per frame. Emit footfall events on contact frames for audio sync.
- Mine (T1/T2 picks):
  - 6 frames total — windup 2, strike 1, follow-through 2, recover 1.
  - Total duration target: ~520 ms (T1) / ~480 ms (T2).
  - Impact key on strike frame; spawn spark VFX on that frame only.
- Drill (T3):
  - Spin-up 4 frames loop; bite 2-frame pulse loop at ~140 ms pulses; cool-down 3 frames.
- Dodge:
  - 6 frames, 220 ms total; 1–2 px smear lines allowed in mid frames to sell speed (keep within 16×16 authoring box).
- Hit-react:
  - 2–3 frames with hit-stop compatibility; engine may freeze on impact frame for 22–46 ms as per combat-design.
- Enemy telegraphs:
  - Each attack has a distinct windup pose. Ensure the emerge halo telegraph appears ≥520 ms prior to burst/hit for burrowers and similar emergence attacks.
- Sprite naming (atlas guidance):
  - {entity}/{action}_f{01..NN}.png (e.g., player/walk_f01.png). Keep zero-padded indices for deterministic packing.


## 7) Terrain & Props Style

- Tiles (16×16):
  - Floor and rock each require 3–4 subtle alternates to break patterns. Vary crack direction, pebble clusters, and lichen chips; avoid high-contrast noise.
  - Embed ore studs using terrain.ore.* tokens; distribute at sub-tile scales that still read at 3×.
- Corridors:
  - Beveled wall edges facing lanes to visually enforce the 3-wide rule. Avoid single-pixel spikes and “porcupine” noise at boundaries.
- Lamps:
  - Brass sconce body with a glass/lens specular accent; keep spec tight and restrained. Pair visually with audio ambient.prop.lamp.hiss.loop by adding a tiny animated shimmer (2-frame subtle glint is sufficient).
- Crystals:
  - Cluster shapes in 8–12 px groups with 3–5 principal facets. Provide a sparkle mask (1 px markers within the 16×16) for VFX placement; do not exceed 3 sparkle points per tile.
- Clearance:
  - Respect data/world/room-templates.json zClearance >=3 when placing tall props; nothing in BG/MG may visually collide with ACT silhouettes within the 3-tile lanes.


## 8) Effects & Feedback

- Hit flashes:
  - Apply effects.hitFlash additively to the victim sprite for 1–2 frames at impact; for poise break, layer effects.poiseBreakFlash stronger (+ brief screen shake per combat).
- Mining sparks:
  - Rock: effects.sparkRock with 2–3 particles, 80–120 ms life.
  - Ore: effects.sparkOre brighter, briefer (50–90 ms), fewer but sharper particles.
- Break debris:
  - 2–3 chip sprites each for rock and ore variants. Gravity drift with mild horizontal variance; lifetime ~300–450 ms; fade last 80 ms.
- Damage numbers (MVP-lite):
  - Use ui.text.numbers; 1 px drop-contrast shadow using ui.panel.bg behind glyphs. Float upward 8–12 px over 300–420 ms.


## 9) Telegraph Visuals

- Arc swings:
  - Thin amber arc 2–3 px thick using mapping.telegraph.emerge.amber.
  - Render above actors (FX) but below HUD. Arc tip should align with strike frame timing.
- Ground halo (burrower):
  - Dithered ring with inner crack hints. Fade-in 200–240 ms, hold through windup, then hard clear at hit frame. Use screen/add blend; never exceed 55% alpha equivalent.


## 10) UI Visual Sync & Iconography Notes

- HUD frames:
  - Use ui.frame.brass for decorative frames; panels use ui.panel.bg. Maintain simple bevel/pixel trim consistent with brass hardware elsewhere.
- Icons:
  - Size in multiples of 16×16 or 24×24 px depending on slot spec in ui-framework.md. Keep silhouettes bold; avoid micro-line detail <1 px at 1×.
- Gauges:
  - Health uses ui.gauges.healthFill; stamina uses ui.gauges.staminaFill. Ensure shapes differ (e.g., solid bar vs segmented chevrons) for accessibility.
- Fonts:
  - See ui-framework.md for full selection; ensure ui.text.primary, ui.text.warning are used per state and maintain contrast over ui.panel.bg.


## 11) ECS Alignment & Engine Notes

- Renderable:
  - Use Renderable.tintToken for any runtime tinting. Do not bake non-palette tints into sprites. Layer assignment must place sprites according to BG/MG/ACT/FX/UI stack.
- Collider:
  - Default actor Collider fits within 12×12 px centered in 16×16 sprite box unless specified otherwise. Ensure visual silhouette does not routinely exceed collider except during intentional attack frames.
- Combat fairness:
  - Hitboxes/hurtboxes defined in data/combat/*.json must align with readable silhouettes; no “invisible reach.” Telegraph color tokens must match mapping.telegraph.* definitions.
- Lighting tokens:
  - Runtime light decals and overlays must reference mapping.lighting.* tokens (see cave-gen for token placement hints).
- Subpixel:
  - Transform can hold subpixel positions; Renderer must snap draw to the scaled pixel grid to avoid shimmer.


## 12) Accessibility & Contrast

- Text:
  - Ensure ui.text.primary over ui.panel.bg meets strong contrast. Avoid busy backgrounds under text; add 1 px shadow or plate where needed.
- Gauges:
  - Health vs stamina must be distinguishable at a glance by both color and form (solid vs segmented, distinct end-cap shapes).
- Colorblind safety:
  - Never encode critical states solely in hue. Add iconography, patterning (e.g., chevrons/dots), or blink cadence differences for warnings and telegraphs.


## 13) Export & Pipeline Notes

- Atlas packing:
  - Pack to power-of-two textures (e.g., 1024×1024 or 2048×2048) with 2–4 px padding between frames to prevent bleed at 3×–4×.
  - Maintain deterministic order: directory name, then filename ascending by frame index.
- Frame edges:
  - Trim transparent bounds but keep consistent pivot metadata (feet center). Do not crop action frames beyond intended 16×16 authored region if it would alter pivot.
- Alpha:
  - Disable premultiplied alpha on export; engine expects straight alpha and will handle blend modes explicitly.
- Filtering:
  - Nearest-neighbor only. Disable mipmaps. Ensure sprite sampling lands on integer boundaries at the chosen scale.
- Naming:
  - {entity}/{action}_f{01..NN}.png for raster; ensure folder names match entity IDs used by ECS/Animator binding.
- Source control hygiene:
  - Store only final PNGs (and optional minimal metadata); no embedded hex or palette overrides within assets.


## 14) Acceptance & QA Checklist

Before you stamp your maker’s mark, confirm:

- Tiles are 16×16; authored sprites align to 1 px grid; renderer shows 3×–4× with nearest-neighbor.
- Corridors and actor silhouettes respect the Three-wide law (48 px lanes). No silhouette drift into neighboring lanes during neutral states.
- Collider fits: player/enemy bodies occupy ≈12×12 within 16×16; attack extensions are intentional and defined in data/combat/*.json.
- Telegraph overlays use mapping.telegraph.emerge.amber at 35–55% with screen/add and are readable ≥520 ms before impact when required.
- Lighting uses tokens only: mapping.lighting.lampWarm, mapping.lighting.crystalCool, and depth tint via mapping.depthTint.l0. No improvised hues.
- All colors, materials, and UI elements reference tokens that exist in data/visual/color-palette.json. Zero raw hex anywhere.
- Brass, iron, copper, and quartz read as distinct materials per notes; speculars are restrained.
- Animation counts and timings match this guide; footfalls and impacts emit sync cues per docs/audio-systems/music-direction.md. Hit-stop frames behave correctly.
- Effects follow tokens and lifetimes; sparks and debris read cleanly at 3× with no over-noise.
- Exported atlases are power-of-two, padded, with straight alpha; no filtering artifacts; pivots consistent.
- Room templates respect zClearance >=3; BG/MG elements do not visually collide with ACT silhouettes.
- UI gauges and text maintain strong contrast and accessibility; health vs stamina differentiated by color and form.

If any item fails, return to the bench and refine. The mine’s dark, but with brass, stone, and crystal light set right, every strike will sing.