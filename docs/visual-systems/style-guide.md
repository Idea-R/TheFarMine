# Visual Style Guide — Brass, Stone, and Crystal Light (Sprint 1)

Provenance
- Owner: @brightforge (Visual Systems — Master Crystalsmith)
- Version: Sprint 1, authoritative for pixel art and lighting integration

Cross-References
- data/visual/color-palette.json (all tokens)
- docs/visual-systems/ui-framework.md (§HUD & tokens)
- docs/combat-systems/combat-design.md (§Telegraphs & timings)
- docs/world-generation/cave-gen-algorithm.md (§Tiles, lanes, lamps)
- data/core/component-schemas.json (Renderable.tintToken)
- Planned source: src/ui/theme-loader.js



## 1) Art Direction North Star

Steampunk dwarven utility. Brass rims, oiled steel, soot—function first. We are underground: rock and dirt dominate, with crystal illumination as a cool secondary light. The brass is worn, the steel is scratched, and the dirt is honest.

Crystal light complements, never overwhelms. No modern bloom, no foggy glare. Let pixels do the talking: clusters and bands define form; material reads via edge control and spec accents. Telegraphs are clear, disciplined, and unambiguous.

Every pixel earns its keep. Lane legibility is sacred; gameplay silhouettes triumph over texture indulgence. Doors, lamps, and UI frames carry brass accents; combat clarity carries the scene.

Do / Don’t
- Do keep material bands tight and readable at 3× scale; emphasize edge bevels.
- Do use token-only colors from data/visual/color-palette.json; no raw hex in art or notes.
- Do preserve the three-wide corridor law; maintain floor vs wall splits at a glance.
- Don’t apply high-contrast dithering to UI elements; reserve micro-dither for terrain texturing sparingly.
- Don’t reuse combat telegraph tokens for UI fills or icons.
- Don’t apply modern bloom or softening filters; nearest-neighbor only.



## 2) Pixel Grid, Tile Size, and Scale

- Base tile size: 16×16 px. All world tiles, props, and collision baselines derive from this unit.
- Render scale: target 3× (fallback 4×). Use nearest-neighbor; disable smoothing everywhere.
- Camera and UI:
  - World: lock to integer pixels. Snap camera and sprite positions to full pixels to eliminate shimmer.
  - HUD: render in a separate Phaser scene/layer; token-only colors; do not inherit world tints.
- Safe outlines policy:
  - Avoid interior anti-aliasing inside sprite silhouettes; reserve subpixel flashes solely for VFX sparkles.
  - No pure black; deepest accents use terrain.rock.shadow.
  - Feet of characters snap to 16 px vertical grid alignment.



## 3) Tilesets & Materials (Terrain tokens)

Terrain material tokens and usage
- terrain.rock.base / terrain.rock.shadow / terrain.rock.highlight
  - Use for walls, occluders, and cliff faces.
  - Target luma deltas: shadow ~25–30% darker than base; highlight ~15–20% brighter than base.
  - Keep highlight bands thin; prioritize bevel edges over noisy textures.
- terrain.floor.dirt / terrain.floor.dirtShadow
  - Walkable floors; must separate from walls at 3× scale.
  - Avoid micro-contrast and heavy speckling; maintain confident planes for movement readability.
- terrain.ore.copper / terrain.ore.iron / terrain.ore.quartz
  - Ore veins as accents and pickups; used in tile deco and VFX sparks.
  - Keep vein pixels chunky and directional; 1–2 px glints with material-appropriate highlights.

Tile readability
- Lane edges beveled (subtle chamfer) to signal walkable boundaries.
- Ensure strong separation at 3×: if a floor tile meets a wall tile, a single-pixel value step and hue bias must read at screen speed.

Autotile guidance (MVP-lite)
- Walls: use 3-state edges—inner, outer, corner.
  - Inner: flush interior edges; minimal highlight.
  - Outer: exposed edge with a highlight band on light-facing side.
  - Corner: combined highlight/occlusion; prefer L-shaped single-pixel contour over noisy joins.
- Do not rely on transparent overlays; commit edges in the tile graphics with token-only colors.



## 4) Lanes & Three-Wide Law (Visual affordances)

- Corridors default to three tiles wide. Maintain unbroken floor read across center lane.
- Belly the center tile gently for natural tunnels when the room template allows; never pinch below three-world-tiles clear width in visuals.
- Door arches: 3×1 portals. Brass framing via ui.frame.brass appears only in props/decals layered over base tiles; never bake brass frames into floor/wall base tiles.
- Keep decorative insertions off the lane core. Place clutter and decals to side lanes or walls.



## 5) Character & Enemy Proportions

Collider and canvas
- ECS collider baseline: 12×12 body.
- Sprite canvas:
  - Player: 16×20–24 canvas. Feet lock to the 16 px grid. Maintain headroom in three-wide lanes.
  - Allow extra vertical head pixels for arcs and weapon swing readability.

Enemies (lane-safe)
- Goblin Grunt: wiry; 16×18–20. Forward blade reach visible; keep hitboxes lane-safe (no bleed into walls at 3×).
- Cave Burrower: low profile; 16×16–18. Forward-biased snap/jaw arc; body mostly below centerline when moving.

Silhouette rules
- Readable at 3×. No pure black outlines—use terrain.rock.shadow for deepest accents and interior cuts.
- Reserve highlights for metal edges and blades; cloth and leather stay matte with controlled banding.



## 6) Animation Specs & Frame Counts (MVP)

Global timing
- Reference: 60 FPS (16.67 ms per frame). See Appendix A for ms ↔ frames cheat sheet.
- Mark strike frames explicitly in filenames or X-annotations for engineering sync.

Player
- Idle: 4 frames @ ~120 ms each; subtle breathing. No camera jitter.
- Walk: 6 frames @ ~80 ms; align footfalls for SFX and dust puffs.
- Light attack: 6–7 frames total mapped to combat spec
  - Windup 240 ms ≈ 14–15 frames
  - Active 80 ms ≈ 5 frames
  - Recovery 320 ms ≈ 19 frames
  - Mark the strike frame index (e.g., atk_light_f04) as the first active frame.
- Dodge: 8 frames over 320 ms; i-frames centered in first 220 ms; minimal body stretch.
- Block: Raise 3 frames (120 ms total), then hold loop of 2 frames with subtle stance shift.

Mining
- Pick swing: 5–6 frames.
  - swingIntervalMs per tool: T1 520 ms; T2 480 ms.
  - Strike around frame 3 (70–90 ms after start) for SFX and hit-check sync.
- Drill: 3-state
  - spinUp: 4 frames.
  - bite loop: 3–4 frames pulsing at ~140 ms cadence.
  - coolDown: 3 frames with spin decel.

Enemies (example timings; align with enemy JSONs)
- Goblin slash_sweep: windup ~25 frames, active ~6, recovery ~29.
- Goblin stab_jab: windup ~17 frames, active ~5, recovery ~25.
- Burrower emerge_burst: windup ~37 frames with ground halo, active ~7, recovery ~31.

Hit-stop visual cue
- On Hit event: freeze involved actors per combat spec and overlay effects.hitFlash for ~120 ms fade. Do not modify sprite alpha; apply an overlay sprite using token tint.



## 7) Effects & Telegraphs

Telegraph tokens (never for UI fills)
- mapping.telegraph.emerge.amber — ground halo; additive or screen at low alpha.
- mapping.telegraph.arc.amber — swing arcs; 1–2 px wide at 1×.

VFX tokens
- effects.hitFlash — brief full-sprite overlay on hits.
- effects.poiseBreakFlash — stronger, slightly longer flash for guard/poise breaks.
- effects.sparkRock — neutral rock impact sparks; use on pick misses or burrower exits.
- effects.sparkOre — brighter ore impact sparks; use when striking ore tiles.
- effects.debris.dust — light dust burst for footsteps and soft impacts.
- effects.debris.chipRock — small chips for rock hits.
- effects.debris.chipOre — small, brighter chips for ore hits.

Telegraph readability policy
- Never use mapping.lighting.crystalCool for telegraph halos.
- Arcs at 1–2 px (1×) expand proportionally at 3×; avoid jagged diagonals via consistent 1:1 and 2:1 stair steps.
- Ground halo rings fade outward with token steps, not semi-transparent pixels. Engine applies blend and alpha; assets remain opaque.



## 8) Lighting & Tints

Primary light sources
- mapping.lighting.lampWarm — door lamps and brass accents; warm key light.
- mapping.lighting.crystalCool — biome crystals; cool fill.

Phaser blending guidance
- Use additive for mapping.lighting.lampWarm at ~0.6 strength; clamp to avoid clipping on ui.frame.brass and characters.metal.brass.
- Use screen or light additive for mapping.lighting.crystalCool at ~0.4–0.5 strength.
- Avoid per-pixel softness; use crisp sprites tinted via tokens with engine blend.

Depth tinting
- mapping.depthTint.l0 / mapping.depthTint.l1 — optional vignette layers for minimap and far background planes. Apply as full-screen quads in the world scene behind props.

Token-only contract
- Never hardcode hex. Use Renderable.tintToken (data/core/component-schemas.json). The engine resolves hex via ThemeLoader.



## 9) UI Icon & Atlas Conventions (coordination)

- Icon sizes: 16×16 and 24×24 px.
- Naming: ui/icon.{domain}.{name}_{size}.png (e.g., ui/icon.tools.pick_16.png).
- Tools map to data/items/tools.json via ui.iconKey.
- Icon drop shadow: 1 px using ui.panel.bg on the lower-right to lift from panel surface.
- 9-slice frames for brass rails/windows:
  - Use ui.frame.brass corners and edges.
  - Pack atlases to power-of-two sheets. Nearest-neighbor sampling; no extraneous padding beyond 1 px gutters.
- Text and glyphs use ui.text.primary and ui.text.secondary only; no embedded raster text in icons.



## 10) Palette Consumption & ThemeLoader Contract

All colors must originate from data/visual/color-palette.json tokens. No raw hex in art, JSON, or comments.

Planned ThemeLoader API (src/ui/theme-loader.js)
- init(paletteJson)
  - Loads token → color map once at boot. Validates domains.
- getColor(token): returns { hexString, int }
  - Logs a single warning on unknown token and returns debug.mask.exclude.
- getTextStyle(kind): returns Phaser-compatible text style using ui.* tokens (e.g., primary, secondary, disabled).
- Example usage (pseudocode):
  - const c = ThemeLoader.getColor('mapping.lighting.lampWarm').int; sprite.setTint(c);
  - const style = ThemeLoader.getTextStyle('primary'); scene.add.text(x, y, label, style);

Example token domains
- UI: ui.text.primary, ui.text.secondary, ui.panel.bg, ui.frame.brass
- Terrain: terrain.rock.base, terrain.rock.shadow, terrain.rock.highlight, terrain.floor.dirt, terrain.floor.dirtShadow, terrain.ore.copper, terrain.ore.iron, terrain.ore.quartz
- Mapping: mapping.lighting.lampWarm, mapping.lighting.crystalCool, mapping.telegraph.emerge.amber, mapping.telegraph.arc.amber, mapping.depthTint.l0, mapping.depthTint.l1
- Effects: effects.hitFlash, effects.poiseBreakFlash, effects.sparkRock, effects.sparkOre, effects.debris.dust, effects.debris.chipRock, effects.debris.chipOre
- Characters: characters.metal.brass, characters.cloth.dark, characters.skin.dwarf (examples for material bands; do not invent new tokens without palette update)



## 11) Rendering & Depth Ordering (Phaser 3)

World depth layering order (low → high)
- 0–99: floor and ground decals
- 100–199: small props (ankle-high to knee)
- 200–299: characters and enemies
- 300–399: tall props (above waist)
- 400–499: VFX telegraphs and transient effects
- HUD/UI: separate scene or top display list; never interleave with world

Rendering settings
- PixelArt mode on; roundPixels true. No linear filtering or smoothing.
- Snap sprite positions to integers. Weapon arcs align to pixel stairs; avoid subpixel rotations except for brief sparkle sprites.
- Use sprite.setTint(ThemeLoader.getColor(token).int) exclusively. If multiple tints are needed, use layered sprites or pipelines, not per-vertex hacks.



## 12) Accessibility & Readability

- Contrast targets:
  - ui.text.primary over ui.panel.bg ≥ 4.5:1
  - ui.text.secondary over ui.panel.bg ≥ 3:1
- Health vs stamina: do not rely on red/green alone. Combine hue separation with pattern redundancy:
  - Health bar: solid fill band.
  - Stamina bar: chevroned band (consistent diagonal rhythm).
- Colorblind resilience:
  - Avoid red/green exclusivity in critical telegraphs. Use shape language (arc, halo, icon) plus timing.
  - State differences get unique silhouettes and motion cues, not just color.



## 13) Export & File Guidelines

- File format: PNG only. Opaque pixel policy: no fractional alpha in spritesheets or tiles.
  - Softness is achieved by token step patterns; engine blends apply translucency in runtime, not in pixel art.
- No embedded color profiles; preserve exact palette mapping.
- Edges: keep alpha fully 0 or 255 in VFX cutouts where applicable; avoid semi-transparent fringe.
- Spritesheets:
  - Frames grid-aligned to 16×N cells.
  - Frame naming uses zero-padded indices (e.g., idle_f01, idle_f02…).
  - Loop seams tested at 3× scale for temporal and spatial continuity.
- Before commit: run a token audit—verify all tints and UI styles reference tokens from data/visual/color-palette.json.



## 14) Acceptance & QA Checklist

- Tiles and sprites adhere to 16×16 base; character feet snap to grid.
- Corridors remain visually three tiles wide; no art intrusions into the center lane.
- Telegraph tokens used correctly; never reused for UI fills.
- Effects use effects.* tokens; hit-stop overlays respect effects.hitFlash durations.
- Animations align to combat/mining timings and strike frame annotations are present.
- All colors reference tokens in color-palette.json via Renderable.tintToken or ThemeLoader.
- Atlases pack cleanly, power-of-two; assets read crisp at 3×–4×; no smoothing.
- Depth ordering matches specified ranges; HUD isolated from world scene.



## Appendices

### A) Quick timing cheat sheet (ms ↔ frames at 60 FPS; 16.67 ms per frame)
- 50 ms ≈ 3 fr
- 66 ms ≈ 4 fr
- 80 ms ≈ 5 fr
- 100 ms ≈ 6 fr
- 120 ms ≈ 7 fr
- 160 ms ≈ 10 fr
- 200 ms ≈ 12 fr
- 240 ms ≈ 14–15 fr
- 280 ms ≈ 17 fr
- 320 ms ≈ 19 fr
- 400 ms ≈ 24 fr
- 480 ms ≈ 29 fr
- 520 ms ≈ 31 fr
Rule of thumb: frames ≈ round(ms / 16.67)

### B) Example strike frame annotations

Player Light Attack (7 frames total)
- atk_light_f01–f03: Windup (f03 ends at ~240 ms)
- atk_light_f04–f05: Active (Strike at f04; SFX and hit-check at f04 start)
- atk_light_f06–f07: Recovery (~320 ms total recovery)

Pick Swing (6 frames total; T1 520 ms)
- pick_f01–f02: Raise
- pick_f03: Strike (70–90 ms from start; align to hit and effects.sparkRock/Ore)
- pick_f04–f06: Follow-through and settle

File naming notes
- Annotate strike frames in asset notes or a sidecar JSON for engineering (e.g., "strikeFrame": 4).

### C) Token index used in this doc

UI
- ui.text.primary
- ui.text.secondary
- ui.panel.bg
- ui.frame.brass

Terrain
- terrain.rock.base
- terrain.rock.shadow
- terrain.rock.highlight
- terrain.floor.dirt
- terrain.floor.dirtShadow
- terrain.ore.copper
- terrain.ore.iron
- terrain.ore.quartz

Mapping
- mapping.lighting.lampWarm
- mapping.lighting.crystalCool
- mapping.telegraph.emerge.amber
- mapping.telegraph.arc.amber
- mapping.depthTint.l0
- mapping.depthTint.l1

Effects
- effects.hitFlash
- effects.poiseBreakFlash
- effects.sparkRock
- effects.sparkOre
- effects.debris.dust
- effects.debris.chipRock
- effects.debris.chipOre

Characters (examples for material bands)
- characters.metal.brass
- characters.cloth.dark
- characters.skin.dwarf

Debug and Fallback
- debug.mask.exclude



— Signed, Brightforge Crystalsmith
Our brass holds true, our stones read clean, and our crystals light the way.