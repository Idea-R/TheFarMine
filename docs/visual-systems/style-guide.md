# Visual Style Guide — Brass, Crystal, and True Reads (Sprint 1)

Provenance
- Owner: @eta (Visual Systems — Brightforge Crystalsmith)
- Voice and stewardship: Brightforge Crystalsmith, master of the pixel grid and keeper of the lamp.
- Cross-references:
  - data/visual/color-palette.json
  - docs/visual-systems/ui-framework.md
  - docs/combat-systems/combat-design.md
  - docs/technology-systems/crafting-design.md
  - data/world/room-templates.json
  - data/world/biome-crystal-caverns.json

---

## 1) Art Direction Pillars

- Steampunk-dwarven materials: brass/copper fixtures, crystal light accents, chiselled stone forms.
- Brass/copper frames anchor UI and fixtures; crystal glow punctuates affordances and rare materials.
- Stone legibility first: textured but uncluttered, with subtle dither and purposeful edge breaks.
- Readable silhouettes at a glance; negative space around arms/tools maintained in key frames.
- No anti-aliasing at sprite edges; use hard, integer-aligned pixels only.
- Every pixel purposeful: no noise or stray singletons that do not improve read or depth.
- Token-driven colors only; all art must pull from palette tokens in data/visual/color-palette.json.

---

## 2) Pixel Grid & Tile Size (Locked)

- Base tile size (locked): 16×16 px.
- Rationale:
  - The Three‑Wide Law: lanes are 3 tiles (48 px), mapping cleanly to 12×12 actor bodies and tight hitboxes.
  - Efficient for web rendering; supports integer scaling without blur.
- Sprite scale target:
  - Desktop: 3×–4× integer-only scaling.
  - No fractional scaling; nearest-neighbor sampling only.
- Tile overhang policy:
  - Sprites may overhang within their own 16×16 cell by up to 2 px for highlights or accents.
  - Overhangs do not affect physics or hitboxes; the actor collider remains 12×12.

---

## 3) World Tiles & Autotile Guidance

- Rock, floor, and ore visual rules:
  - Rock: use terrain.rock.* tokens. Maintain medium contrast with 2–3 tone dither for depth; avoid banding.
  - Floor: use terrain.floor.* tokens. Lower contrast than rock to ensure actors and ore pop above; keep edges crisp.
  - Ore inlays: use terrain.ore.copper, terrain.ore.iron, terrain.ore.quartz tokens as accent veins. Add 1–3 pixel sparkle using effects.sparkRock and effects.sparkOre tints at vein edges or corners.
- Door bands:
  - Doorways are exactly 3 tiles wide (48 px).
  - Add subtle lampWarm accents (mapping.lighting.lampWarm) at the vertical jamb edges (1–2 px highlights) for navigational clarity.
- Autotile rules (4-way minimal):
  - Use 4-way adjacency (up/down/left/right) only; no 8-way soft joins and no anti-aliased diagonals.
  - Inner corners and borders are hard transitions; emphasize material breaks using terrain.rock.edge and terrain.floor.edge tokens where available.
  - Keep border thickness 1–2 px; no gradient ramps at tile edges.
- Clarity checks:
  - At 3× scale, autotile edges must read as single, unbroken lines with no stair-step “fuzz.”
  - Max of 1 sparkle per 4×4 px region on ore tiles to prevent visual noise.

---

## 4) Character Proportions & Silhouette

- Actor body box:
  - Collider: 12×12 px, centered inside each 16×16 sprite frame.
  - Feet anchor: last row (Y = 15) of the 16×16 frame; heel strike aligns to this pixel row.
- Player silhouette (dwarf):
  - Stout, compact torso; shoulder width ~10 px within the 12 px body.
  - Helmet crest rises 1–2 px above the brow line; keep crest width ≤6 px for clean read.
  - Beard or scarf accent 2–3 px tall; allow 1–2 px lateral swing during walk.
- Goblin Grunt:
  - Hunched, angular silhouette; forward-leaning stance.
  - Ear or pauldron spike reads at 1–2 px; no more than two spikes break the silhouette at once.
  - Base tint: characters.goblin.tint (all secondary hues derive from the token ramp).
- Read distance:
  - At 3× scale, Player vs Goblin silhouettes remain distinct at 2–3 tiles (32–48 px base distance).
  - Weapon/tool reads must be visible as at least a 2×2 px mass at 3× scale when in hand.

---

## 5) Animation Sets & Frame Counts (MVP)

General export guidance
- Frame size: uniform 16×16 across all frames.
- Feet: always bottom-aligned to Y = 15.
- Origin: consistent per subject; align to bottom-center for actors, bottom-left for placeables.
- Looping: Idle/Walk loops; others play-once then settle to a defined resting frame.

Player (16×16 each frame)
- Idle: 4 frames, 140 ms/frame. Gentle beard/steam puff; beard cycles ±1 px; steam uses effects.hitFlash faintly as warmth flicker—do not exceed 1 px plume thickness.
- Walk: 6 frames, 90 ms/frame. Vertical bob 2 px total amplitude; tool hand remains readable as a distinct 2×2 px cluster.
- Mine (pick): 6 frames, total ≈520 ms to match swingIntervalMs; impact at frame 4.
  - Suggested timing: [80, 90, 110, 60 (impact), 90, 90] ms.
  - Impact frame shows effects.debris.rockA/B 3-frame burst hook.
- Block: 3 frames raise (total 120 ms → 40 ms/frame), then 1 hold frame (static). Hold frame must not drift subpixel; shield edge ≥2 px thick.
- Dodge: 6 frames, total 360 ms (60 ms/frame). Include motion streaks using effects.hitFlash at 25% opacity-equivalent in engine; no baked blur.

Goblin Grunt
- Idle: 4 frames, 140 ms/frame. Subtle shoulder twitch; ear spike wiggle ≤1 px.
- Walk: 6 frames, 90 ms/frame. Hunch bob 1–2 px; maintain forward lean.
- Slash:
  - Frames: windup/strike/recover = 5/2/4 frames
  - Windows (ms): 420/90/480 respectively
  - Impact: first strike frame (apply effects.hitFlash to victim on contact).
- Stab:
  - Frames: windup/strike/recover = 4/2/4 frames
  - Windows (ms): 280/80/420 respectively
  - Impact: first strike frame; forward thrust extends weapon 2 px beyond body cell within allowed overhang.

Mining VFX
- Rock hit: 3-frame chip burst using effects.debris.rockA and effects.debris.rockB; each frame 60–80 ms; particles travel 2–4 px.
- Ore hit: 3-frame sparkle overlay using effects.sparkOre; sparkle axis rotates across frames by 45° increments; size 1–3 px.

---

## 6) Lighting & Depth Rules (Token-Driven)

- Ambient tint (Sprint 1): mapping.depthTint.l0 per biome. No pre-baked ambient gradients in sprites.
- Lamps:
  - Use mapping.lighting.lampWarm for door lamps and lane markers.
  - Paint 1–2 px specular highlights on adjacent floor/rock tiles to suggest spill; never exceed 2 px radius for static props.
- Crystals:
  - Use mapping.lighting.crystalCool on props and accents.
  - In-engine additive/screen blend for glows only; do not bake bloom into sprites.
- Telegraphs:
  - Use mapping.telegraph.arc.amber.
  - Visual spec: 1 px halo line (outer) plus a 2 px thick arc line (inner).
  - Flash timings: follow flashAtMs cues defined in docs/combat-systems/combat-design.md.
- Shadow treatment:
  - UI: ui.panel.shadow only (token-driven), reserved for panels/elevations.
  - In-world: prefer sprite-level dithered shadow bands (1–2 px) directly beneath actors, using the darkest available local terrain.* shadow tokens (e.g., terrain.floor.shadow or terrain.rock.shadow). No soft drop shadows.

---

## 7) Effects & Hit Feedback

- Hit-Flash:
  - Apply effects.hitFlash as a brief overlay.
  - Attacker: 22 ms hit-stop window.
  - Victim: 42 ms hit-stop window.
  - Overlay clips to the actor’s silhouette; do not glow outside sprite bounds.
- Poise Break:
  - Use effects.poiseBreakFlash as a radial pulse 6–8 px radius from actor center.
  - Single pulse, no camera shake in MVP.
- Mining break:
  - Debris cloud using effects.debris.rockA/B.
  - 4–6 particles per hit; lifespan 200–320 ms; ballistic arc up to 4 px with 1 px gravity steps.

---

## 8) Palette Consumption & Contrast

- Token-only usage:
  - All colors must reference tokens from data/visual/color-palette.json.
  - Do not commit raw hex codes in source art or notes.
- Contrast targets:
  - Ore vs rock: ore accent cluster must maintain ≥20% luminance delta versus adjacent rock highlight tone.
  - UI text: contrast ratio ≥4.5:1 relative to its background as per docs/visual-systems/ui-framework.md.
- Accessibility pairs:
  - Health: ui.gauge.health.fill (warm amber-red family).
  - Stamina: ui.gauge.stamina.fill (cool teal family).
  - Avoid pure red/green oppositions for critical states; use hue and luminance contrast in tandem.
- Material ramps:
  - Brass/copper use ui.metal.brass.* and ui.metal.copper.* where provided; keep highlight to shadow within 3–4 steps for readability at 3× scale.

---

## 9) Export & Atlas Conventions

- Directory layout:
  - assets/sprites/player/...
  - assets/sprites/enemies/...
  - assets/sprites/fx/...
  - assets/sprites/tiles/...
- Naming format:
  - {category}/{subject}_{anim}_{size}_{variant}.png
  - Example: player/dwarf_walk_16x16_A.png
- Texture atlas keys:
  - ui/icon.tools.pick_t1_24
  - ui/icon.tools.pick_t2_24
  - ui/icon.tools.drill_t3_24
- Padding and margins:
  - Maintain 2 px spacing between frames and around sprite bounds in atlases to prevent bleeding at 3×–4× scale.
- Consistency:
  - No mixed sizes within a single strip; one animation = one size.
  - Trim transparent bounds only if the bottom alignment (feet Y = 15) and origin are preserved.

---

## 10) Phaser Integration Notes

- Tilemaps:
  - Tile size: 16×16.
  - Tile indices stable per atlas order; lock ordering once authored to prevent runtime mismatches.
- Rendering:
  - Use integer-only scaling; set snapToPixel = true and roundPixels = true.
  - Ensure pixelArt = true and antialias = false in renderer settings.
- Origins and alignment:
  - World sprites: containers origin at bottom-left for tilemaps; actors use bottom-center to keep feet aligned to ground.
- Depth layering:
  - World base: 0..1000
  - Actors: 200..400
  - FX: 450..600
  - UI: ≥9000 (per ui-framework.md)
- Blend modes:
  - Crystals and telegraphs may use additive/screen as specified; all others normal.

---

## 11) Minimap Visual Contract (Art Hooks)

- Tokens for raster:
  - minimap.bg
  - minimap.room
  - minimap.corridor
  - minimap.ore
  - minimap.player
  - minimap.enemy
- Blip sizes:
  - Player/enemy blips are 2×2 px at UI scale; keep hard-edged, no outlines.
- No alpha gradients; only solid token fills; ensure corridor vs room tokens remain distinguishable at 1 px thickness.

---

## 12) Telegraphed Attack Visuals (MVP)

- Arc overlay:
  - Thickness: 2 px sweep with a 1 px halo.
  - Color: mapping.telegraph.arc.amber.
- Timing:
  - Pre‑impact flash 120–90 ms before active window.
  - Turn off at recovery start as defined per attack timelines in docs/combat-systems/combat-design.md.
- Audio binding:
  - UseGlobalAudio: true.
  - SFX key: sfx.combat.telegraph.swing.

---

## 13) Lane & Door Compliance (Three‑Wide Law)

- Doorways:
  - Exactly 3 tiles wide; keep jambs straight vertical with lampWarm accents at edges.
- Lanes:
  - Interior approaches maintain 3-tile clear bands; no decorative intrusion into player path.
- Bodies and hitboxes:
  - Enemy/player sprites must respect the 12×12 colliders centered in their 16×16 frames; weapons/tools may overhang ≤2 px with no collider change.

---

## 14) Style Do/Don’t Board

- Do:
  - Strong silhouettes and clean negative space.
  - Token-only colors with disciplined ramps.
  - Crisp edges and integer movement; subtle 2–3 tone dither in rock and brass.
  - Clearly marked ore sparkles limited to 1–3 px.
- Don’t:
  - Subpixel floats or fractional scales.
  - Soft anti-aliasing or feathered edges.
  - Neon saturation clashes that overpower crystal accents.
  - Micro-details that vanish at 3×–4× scale or break the read.

---

## 15) Open Questions

- Final font micro-kerning behavior at 3×–4× scale (see ui-framework.md): confirm per-platform rasterization quirks.
- Confirm whether bosses (post-MVP) require 32×32 hero sprites and corresponding collider exceptions.

---

## 16) Acceptance Checklist

- Tile size locked to 16×16; actor body 12×12 alignment defined and feet anchored at Y = 15.
- Animation frame counts and timings match combat/mining specs, including impact frames and hit-stop windows.
- Lighting and telegraph rules use palette tokens only; no baked bloom; additive/screen restricted to crystals/telegraphs.
- Export/atlas conventions specified; Phaser integration guidance covers scaling, pixel snapping, depth, and blend modes.
- World tiles, autotile edges, ore inlays, and door bands adhere to Three‑Wide Law with token-driven accents.
- Cohesive steampunk-dwarven tone and clear readability maintained at 3×–4× scale across all assets.

—

Forge well, keep the edges true, and let the crystal light guide the player’s eye.