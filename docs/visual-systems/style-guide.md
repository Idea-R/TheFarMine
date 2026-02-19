# The Far Mine — Visual Style Guide (Sprint 1 v0.1)

Author: Brightforge Crystalsmith (Eta)  
Version/Date: v0.1 / 2026-02-19 (ISO-8601)  
Status: Draft v0.1

Scope: L1 vertical slice (side-view, tile-based). 1080p baseline (1920×1080). Authoring tile size 16×16 px. World unit = 1.0 per tile.  
Companion docs:
- docs/visual-systems/ui-framework.md
- data/visual/color-palette.json


## 2) Art Direction Pillars

- Brass-and-Crystal Utilitarianism — Functional dwarven engineering: riveted brass, tempered steel, practical forms accented by cut crystal power cores.
- Lantern-Lit Stone — Warm oil lamps and amber crystals carve visibility from cold cavern blues; local pools of light, deep cool shadows.
- Readable Silhouettes — Chunky, distinct shapes with strong negative space; clarity first at 3×–4× scale.
- Story-in-Wear — Edge wear, patina, soot, and grime communicate history without clutter; material age supports narrative beats.
- Restrained VFX Glow — Emissive accents are purposeful and capped; no bloom spill that muddies pixel edges.


## 3) Pixel Grid & Resolution Rules

- Authoring resolution: 16×16 px tiles; characters sized against 1 tile = 16 px.
- In-engine scale: 3× (48 px per tile) by default at 1080p; allow 4× (64 px) when camera framing permits. Choose per scene; do not mix within a shot.
- Camera scale and movement:
  - Camera and sprite transforms quantized to source-pixel grid at current scale. Rule: world positions snap to 1/16 tile increments (0.0625 world units) to avoid sub-pixel shimmer.
  - Parallax layers snap to half-step increments (0.03125 world units) only if visually stable at target scale.
- Outlines:
  - 1 px dark edge on midtones to separate forms near-background. Use palette tokens color.outline.dark or material-adjacent darkest ramp; avoid pure black except for deep shadow tokens color.shadow.deep.
  - No full object outlining; only contact and occlusion edges.
- Dithering & banding:
  - Use controlled dithering for stone gradients and fog falloff (checker or 50% ordered) at 1 px scale; avoid on small sprites where it causes flicker at 3×.
  - Avoid visible banding on metals; prefer 2–3 step ramps with micro-spec highlights to suggest curvature.
  - For fog/smoke, use diagonal dithering to soften alpha edges.


## 4) Material Language & Shading

Reference palette categories in data/visual/color-palette.json. Suggested tokens shown; exact RGB live in palette file.

- Brass
  - Base hues: color.brass.base.[1–3] (golden-ochre 35–45°). Shadows: color.brass.shadow.[1–2]. Highlights: color.brass.highlight.[1–2].
  - Highlights: small, high-contrast spec spots (1–2 px) plus a soft band; shift slightly toward warm yellow.
  - Edge specularity: bright edge on light-facing contours (1 px). Avoid banding; no pure white—cap at color.limit.metal.white.
  - Grime/oxidation: color.patina.green for seams/rivets (≤15% area), color.soot.dark for vent edges.
- Copper
  - Base: color.copper.base.[1–2] (red-orange 20–30°). Highlights: color.copper.highlight.[1–2].
  - Highlights broader than brass, slightly red-shifted. Allow subtle verdigris: color.patina.teal at recesses (sparingly).
- Iron/Steel
  - Base: color.steel.base.[1–3] (cool gray-blue). Highlights: color.steel.highlight.[1–2] with cool tint.
  - Edge spec: crisp rim on sharp bevels. Use color.scratch.light for wear lines (single-pixel).
  - Grime: color.oil.sheen for machine parts; avoid warm shifts.
- Oiled Wood
  - Base: color.wood.oiled.base.[1–3] (warm brown). Highlights: color.wood.oiled.highlight.[1–2] in thin streaks along grain.
  - Edge: low-spec; keep highlights sparse. Add color.soot.mid near handles/handholds.
- Crystal
  - Base: color.crystal.base.[amber|cold|violet]. Highlights: color.crystal.facet.light; inner glow: color.crystal.glow.[tone].
  - Faceting: 2–3 value steps per face; hard transitions. Use rim light where backlit.
  - Emissive rules:
    - Emissive pixels use emissive tokens color.emissive.[amber|cold] with luminance ceiling: max 0.85 relative (≈ value ≤ 217/255). Do not exceed color.limit.glow.max.
    - Inner glow is 1–3 px from core, not full fill; preserve facet edges.
    - Bloom-safe: halo sprites separate (vfx.glow.soft.*) at low alpha; avoid stacking more than 2 layers.
- Stone
  - Base: color.stone.cold.[1–3] (cool slate) and color.stone.warm.[1–2] near lamps.
  - Shading: broad ramps with subtle noise/dither. Edge chips with color.stone.highlight.chalk (single-pixel).
  - Wetness: color.stone.wet.sheen sparingly near water seams.
- Steam/Smoke
  - Palette: color.vapor.light, color.vapor.mid, color.vapor.dark with temperature tints: .warm for near lamps, .cold for distant.
  - Transparency: 25–60% alpha; never fully opaque. Use additive only for hot jets (vfx.steam.jet.hot).
  - Animation cadence: 4-frame cycles at 8 fps; scale movement upward drift 0.5–1 px/frame at 3× scale.


## 5) Character & Creature Proportions

- Dwarf (player baseline)
  - Standing height: occupies ~14–15 px of a 16 px tile; head peaks ≤15 px to leave 1 px ceiling cushion.
  - Ratios: head 5 px tall (grid-aligned), torso 6 px, legs 4 px (overlap), arms 3–4 px thickness at shoulder tapering to 2 px.
  - Silhouette: broad shoulders, short legs, stout boots. Beard silhouette breaks chest line but avoid merging with torso outline.
  - Pickaxe arc: readable 120–140° sweep; ensure negative space around arc; head of pickaxe 3–4 px with 1 px bright spec.
- Goblin Grunt
  - Stance height: ~13 px; hunched with long forearms. Triangular head/ears create distinct top silhouette.
  - Weapons: short spear/club; ensure windup pose exaggerates rear arm pullback for readability.
- Cave Burrower
  - Stance height: ~10–12 px above ground when surfaced; elongated body with prominent mandibles.
  - Silhouette: oval carapace, wedge head; tail used to telegraph retreat. Underground: dust plume glyphs substitute body.


## 6) Animation Specs (MVP counts)

Frame counts are source frames; fps are target playback at 3× scale. Use even timing unless noted. Hit-stop pauses animation but preserves frame index.

- Player Dwarf
  - Idle: 4 frames @ 6–8 fps (subtle lantern sway/beard flutter).
  - Walk: 6 frames @ 8–10 fps; strong head bob; pickaxe strapped bounce 2 px amplitude.
  - Light Attack: 6–7 frames @ 10–12 fps; impact frame marked with vfx.hit.rock.light.
  - Heavy Attack: 9–11 frames @ 10 fps; 2–3 frame telegraph at start (shoulder load).
  - Hitstun: 2 frames @ 4–6 fps (blink/jerk).
  - Mine Swing: reuse Light Attack frames for MVP; adjust SFX/VFX tokens to mining variants.
  - Pickup: 2 frames @ 8 fps (quick crouch/hand reach).
- Goblin Grunt
  - Idle: 3 frames @ 6 fps (ear twitch).
  - Walk: 4 frames @ 8 fps.
  - Jab: 6 frames @ 10–12 fps; extend-lunge-recover readability.
  - Swing Telegraph: 3 distinct frames @ 6 fps; exaggerate windup silhouette.
- Cave Burrower
  - Burrow (loop): 4 frames @ 8 fps; dust ring rotates.
  - Emerge Attack: 8 frames @ 10 fps; 2-frame anticipatory crack in ground.
  - Retreat: 4 frames @ 8 fps; tail last-visible.
- FX Cycles
  - Steam Puff: 4 frames @ 8 fps; scale up 1 px per frame; alpha fades.
  - Crystal Twinkle: 4 frames @ 6 fps; 1 px sparkle hopping across facets; respect emissive ceiling.
  - Ore Pickup Glint: 3 frames @ 12 fps; quick starburst; clamp brightness to color.limit.fx.white.

Timing notes:
- Use 1–2 frame hit-stop on impact (Combat system) to enhance weight; hold on peak impact frame.
- Blend-tree not required MVP; state-to-state hard cuts are acceptable if silhouettes remain clear.


## 7) Lighting & Effects Rules

- Light tokens (use palette mapping):
  - light.crystal.amber — warm amber (radius: small 2.0 tiles, medium 3.5 tiles). Intensity: 0.8 base, 1.0 peak.
  - light.lamp.oil — neutral-warm (radius: 2.5 tiles). Intensity: 0.7 base. Slight 0.02 flicker amplitude @ 1.5 Hz.
  - light.crystal.cold — cool blue (radius: 3.0 tiles). Intensity: 0.75 base.
- Rim/backlight:
  - In caves, apply 1 px cool rim (color.rim.cold) on shadow edges if backlit by cold sources; warm rim (color.rim.warm) near lamps.
  - Limit rim to 30–40% of contour length to avoid cartooning.
- Emissive pixel limits:
  - Per sprite, emissive coverage ≤ 12% of on-screen pixels; cluster in contiguous shapes; no checkerboard emissives.
  - Soft halo hints: use vfx.glow.soft.[amber|cold] at ≤35% alpha, 1–3 px expansion at source scale.
- Telegraph visuals:
  - Map to Gamma events (TelegraphStartEvent).
  - Suggested vfx_token: vfx.telegraph.flash.amber (for player heavy), vfx.telegraph.flash.cold (enemy ambush), vfx.telegraph.dust.rise (burrow start).
  - Flash palette: color.telegraph.flash.[amber|cold], with quick two-step ramp then decay over 120–180 ms.


## 8) Iconography & Tokens

- Icon grid:
  - 16×16 px canvas. Live glyph area 14×14 px; 1 px padding all sides.
  - Stroke weight: 1 px primary; 2 px for primary fills; outlines use color.icon.outline.on-dark or .on-light variants.
  - On-dark variant uses lighter fills with dark edge; on-light variant inverts as needed for ≥4.5:1 contrast.
- Stable namespaces (examples):
  - Sprites: sprite.player.dwarf.t0, sprite.enemy.goblin.grunt, sprite.enemy.burrower.t0
  - Items/Icons: icon.item.ore.copper, icon.item.ore.iron, icon.tool.pickaxe.t1
  - Tiles: tile.cavern.rock.base, tile.cavern.rubble.small, tile.cavern.ore.overlay.copper
  - VFX: vfx.hit.rock.light, vfx.glow.soft.amber, vfx.telegraph.flash.amber, vfx.steam.puff.small
  - Lights: light.crystal.amber, light.lamp.oil, light.crystal.cold
- File naming:
  - snake.case mirroring tokens, e.g., sprite.player.dwarf.t0.png, icon.item.ore.copper.png
  - Folder hints:
    - assets/sprites/player/, assets/sprites/enemy/
    - assets/tiles/cavern/
    - assets/vfx/
    - assets/icons/
  - Atlases keep token parity in metadata (see Integration).


## 9) Palette & Accessibility

- Palette categories (see data/visual/color-palette.json):
  - terrain.*, ui.*, characters.*, effects.*, lights.*
- Contrast targets:
  - Primary UI text vs background ≥ 4.5:1.
  - Secondary text vs background ≥ 3.0:1.
  - HUD bars: ensure foreground over dark stone meets ≥ 3.5:1; provide stroke/backer token ui.bar.backer.dark with 1 px inset.
- Testing checklist:
  - In-engine read test at 3× and 4× scales; verify silhouettes and icon line weights.
  - Colorblind-safe pairs for critical cues: telegraph vs idle glow must differ by both hue and luminance (use telegraph cold vs idle warm, or vice versa).
  - Flash/flicker safety: avoid >3 Hz hard flashes for accessibility; prefer ramped flashes.


## 10) Tile & Deco Rules (L1 — Crystal Caverns)

- Base tiles:
  - Rock: tile.cavern.rock.base with 3 variants; subtle value variation via dither noise.
  - Rubble: tile.cavern.rubble.small/large; edges feathered with 1 px dark contact to ground.
  - Ore overlay: tile.cavern.ore.overlay.[copper|iron|crystal]; overlay sits atop base with 1 px highlight and 1 px occlusion shadow.
- Edges & ledges:
  - Walkable ledge top gets 1 px light top edge (color.stone.highlight.chalk) and 1 px dark underside (color.shadow.contact) for readability.
  - Non-walkable backdrop edges soften with 50% dither into darkness; avoid top-edge highlight.
- Deco density caps:
  - Foreground deco coverage ≤ 18% of screen pixels; midground ≤ 25%; keep gameplay silhouettes clear.
  - Do not place animated deco within 1 tile of key interaction hotspots unless telegraphed clearly.
- Collision clarity:
  - Solid tiles use crisp top highlight + bottom shadow. Passable/backdrop lacks top highlight and uses lowered contrast.
  - Interactive ore veins add subtle twinkle (vfx.ore.twinkle.low) at ≤ 0.5 Hz; non-interactive crystal clusters remain static.


## 11) Integration Notes (Engine/ECS)

- Bevy components mapping:
  - SpriteRef { token: "sprite.player.dwarf.t0" } on entities; tokens resolve to TextureAtlas indices.
  - Light { color_token: "light.crystal.amber", radius_tiles: f32, intensity: f32 } with system mapping to palette colors.
  - VfxEmitter { vfx_token: "vfx.hit.rock.light" } triggered via Combat events.
- Layering / z-order:
  - Order (back-to-front): background parallax < tiles (bg) < interactables/decals < player/enemies < foreground deco < UI.
  - Z buckets per layer; discrete steps (e.g., -200..200). Player over tile, under foreground deco.
- Event tokens (from Combat/Audio):
  - On TelegraphStartEvent { source, style }: spawn vfx.telegraph.flash.[amber|cold], optional vfx.telegraph.dust.rise for ground targets.
  - On HitEvent { material: Rock/Metal/Flesh }: map to vfx.hit.[rock|metal|flesh].[light|heavy] and play SFX tokens; apply 1–2 frame hit-stop.
- Asset packing/scaling:
  - Atlas size: 512×512 (or 1024×1024 for enemies+vfx). Grid: 16 px cells with 2 px padding to prevent bleeding.
  - Nearest-neighbor sampling; mipmaps off; point clamp. Scale via transform (3×/4×).
- Tiled/LDtk pipeline (future-ready):
  - Tilesets exported with token fields matching tile.* namespace.
  - Layer naming conventions: bg.mid, bg.far, tiles.solid, tiles.backdrop, deco.fg, markers.spawn.


## 12) Risks & Assumptions

- Risks:
  - Token drift across teams leading to broken references; mitigate with token registry and pre-commit validation.
  - Font legibility not yet finalized; UI contrast may require palette adjustments.
  - Palette refinement pending full contrast audit on 3×/4× scale and colorblind simulations.
- Assumptions:
  - 16 px tiles; 1080p baseline presentation.
  - ECS token lookups stable per P4; interfaces remain unchanged for Sprint 1.
  - No dynamic per-pixel lighting; all light is sprite/halo-based for MVP.


## 13) Acceptance Checklist

- Art Direction Pillars present and concise.
- Tile size (16 px) and 3×/4× scaling rules stated; camera/sub-pixel avoidance defined.
- Material and shading rules for brass, copper, steel, wood, crystal, stone established; emissive and steam/smoke guidance included.
- Character and enemy proportions specified; pickaxe arc readability noted.
- Animation counts and fps for player, goblin, burrower, and core FX listed; hit-stop interaction covered.
- Lighting and VFX tokens mapped; rim/backlight and emissive limits defined; telegraph mapping to Gamma events included.
- Icon grid/stroke/padding rules; token namespaces and file naming with folder hints provided.
- Palette and accessibility targets referenced; testing checklist includes colorblind-safe cues.
- Tile/deco rules for L1 Crystal Caverns defined; collision clarity addressed.
- Engine/ECS integration with Bevy components, layering, events, and atlas packing noted.