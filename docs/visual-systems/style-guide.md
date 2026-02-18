# Visual Style Guide — Brass, Stone, and Crystal (Sprint 1)

Author: Brightforge Crystalsmith (Visual Systems)
Provenance: owner @eta (Visual Systems — Brightforge Crystalsmith)

Cross-references:
- data/visual/color-palette.json (authoritative palette tokens)
- docs/combat-systems/combat-design.md (§10 Telegraphs, §14 Player Attack)
- docs/core-systems/ecs-architecture.md (§Renderable.tintToken)
- docs/world-generation/cave-gen-algorithm.md (§Three‑Wide law)
- data/world/room-templates.json
- data/combat/enemy-*.json
- docs/visual-systems/ui-framework.md (forthcoming)

Version: Sprint 1 (implementation-ready)



## 1) Scope and Intent

This guide defines pixel grid, palette token usage, character readability, animation timings, lighting and telegraph language, plus Phaser 3 integration and ECS tint token plumbing needed for Sprint 1. All color references must use tokens from data/visual/color-palette.json. Do not paste or rely on raw hex values in art notes, code, or comments.



## 2) Pixel Grid & Scale (Authoritative)

- Authoritative tile size: 16×16 pixels for Sprint 1.
- Display scale: target 3×–4× on the game canvas.
  - Configure Phaser for crisp nearest-neighbor upscaling (see §11).
- Character body box: 12×12 px inside the 16×16 tile, centered.
  - ECS Collider for the player and like-sized actors: Collider{w:12, h:12}; align to body box.
- Camera and lane law:
  - Honor the Three‑Wide door approaches from docs/world-generation/cave-gen-algorithm.md (§Three‑Wide law).
  - ≤110° attack arcs (see §8) inform camera composition; do not crop anticipation or contact silhouettes at edges.



## 3) Palette & Tokens (Do not paste hex)

State:
- All colors must resolve via data/visual/color-palette.json tokens at runtime.
- The build must fail on any asset or config that embeds a raw hex in place of a token.

Usage map examples (non-exhaustive):
- Terrain: terrain.rock.base / terrain.rock.shadow / terrain.rock.highlight, terrain.floor.base
- Ores: terrain.ore.copper.base | terrain.ore.copper.spark, ore.iron.*, ore.quartz.*
- UI: ui.panel.bg, ui.text.primary / ui.text.secondary, ui.frame.brass / ui.frame.copper / ui.frame.crystal, ui.gauge.*
- Characters: characters.player.*, characters.goblin.*, characters.outline.light / characters.outline.dark
- Effects: effects.hitFlash, effects.poiseBreakFlash, effects.debris.rockA / effects.debris.rockB, effects.smokePuff
- Mapping: mapping.telegraph.arc.amber, lighting.lampWarm, lighting.crystalCool
- Depth: mapping.depthTint.l0

Accessibility:
- Confirm ui.text.primary contrast ≥ 4.5:1 vs ui.panel.bg.
- Confirm ui.text.secondary contrast ≥ 3:1 vs ui.panel.bg.
- Use the accessibility block in data/visual/color-palette.json for automated checks; do not reduce alpha on primary text below 90% (see §13).



## 4) Materials & Render Motifs

- Brass
  - Use ui.frame.brass for frames, rivets, bezels.
  - Interaction state: brighten by +8–12% via shader or post-tint math; do not swap tokens.
- Copper
  - Use ui.frame.copper for accents.
  - Oxidized grime allowed: subtle dither mixing with terrain.rock.highlight; keep readable against ui.panel.bg.
- Crystal
  - Use ui.frame.crystal and terrain.ore.quartz.* for cool glows and facets.
  - Use additive or screen blend on VFX only; base sprite shading stays in palette.
- Rock/Soil
  - Use terrain.rock.base / shadow / highlight clusters.
  - Avoid heavy near-black clusters that collapse silhouettes; maintain outline contrast per §5.



## 5) Character Proportions & Readability

- Player (Dwarf)
  - Body: 12×12 px within tile; 1 px outline.
  - Outline: use characters.outline.light on dark terrain; switch to characters.outline.dark over bright crystals or lamp halos.
- Goblin Grunt
  - Hunched silhouette, 11×11 fit.
  - Skin/clothes: characters.goblin.*.
  - Weapon readability: blade/club thickness 2–3 px at peak frames.
- Cave Burrower
  - Low, wide head; 12×10 footprint; distinct mouth highlight for bite read.
  - Idle shiver: 2-frame micro-shake within box.
- Silhouette rules
  - Primary motion mass ≈ 60% of body area.
  - Secondary details ≤ 2 px thickness; avoid noise that competes with motion cues.



## 6) Animation Frame Counts & Timings (MVP)

Timing basis: 60 fps. See Appendix A for quick ms→frames.

- Player
  - Idle: 4 frames @ 180 ms/frame.
  - Walk: 6 frames @ 90 ms/frame. Footfall accents on frames 2 and 5 for future SFX sync.
  - Light Attack (pick): 6 frames. Map to combat-design.md §14:
    - Windup 300 ms, Active 80 ms, Recovery 420 ms.
    - Contact pose lands at windup + ~260 ms (≈40 ms before Active window) to allow whoosh anticipation.
  - Mining Swing: reuse Light Attack timing and major poses; ensure pick head reads at contact frame.
- Goblin Grunt
  - Idle: 3 frames @ 200 ms.
  - Step/Advance: 5 frames @ 100 ms.
  - Light Swipe: 5 frames; contact near frame 4.
- Cave Burrower
  - Idle: 3 frames @ 180 ms.
  - Lunge Bite: 5 frames; contact at frame 4, align with Active ~90 ms.
  - Burrow Ambush: 6 frames (submerge → rumble → emerge → snap); telegraph spans windup (§8).
- Hit/Flinch (all)
  - 2 frames @ 60 ms, overlay effects.hitFlash 1–2 frames.
- Constraints
  - Keep anticipation, smear, and overshoot within the 12×12 body box; avoid large excursions that desync with hitboxes.



## 7) Lighting & Glow Rules

- Lamps
  - Use mapping.lighting.lampWarm for halos.
  - Implement as a pre-baked radial sprite or Graphics radial fill with additive blend.
  - Falloff radius ≈ 48–64 px at 3× scale; scale proportionally at 4×.
- Crystals
  - Use mapping.lighting.crystalCool for rim/glow accents; facets stay in terrain.ore.quartz.*.
  - Prefer additive at 30–50% alpha; avoid washing out outlines.
- Depth tint
  - Apply mapping.depthTint.l0 as a low-opacity multiply layer for near-ground forms; future layers may add gradient stacks.
- UI lighting
  - Do not brighten or shade UI text with world lighting; UI remains flat-lit.



## 8) Telegraphs (Visual Language, Constraints)

- Arc overlays
  - Token: mapping.telegraph.arc.amber.
  - Stroke width: ≈ 2–3 px at 3× scale; max opacity 60% (alpha 0.6).
- Geometry
  - ArcDeg ≤ 110° (per combat-design.md §10).
  - Origin: attacker center; radius = rangePx from the AttackDef.
- Pre-flash
  - Brief 1-frame brighten of the arc at flashAtMs from AttackDef; respect range [−180..−80] ms relative to impact.
- Cancel
  - If AI feints (<40% windup), fade arc quickly in ≤100 ms.
  - CombatTimingService emits AttackEnd:canceled; remove arc immediately after fade completes.



## 9) VFX Micro-Library (MVP)

- Hit flash
  - Apply setTintFill with effects.hitFlash for 1–2 frames on the victim sprite; revert next frame.
- Poise break flash
  - Screen or additive pulse using effects.poiseBreakFlash over the victim; brief 120–180 ms.
- Mining debris
  - 3–5 px chunks tinted via effects.debris.rockA / effects.debris.rockB.
  - Lifespan 200–360 ms; small gravity; 1–2 px random rotation jitter.
- Dust puffs
  - Spawn 2–3 effects.smokePuff sprites during lamp placement and burrow ambush emerges.
  - Fade and scale over 180–260 ms; do not exceed UI layer brightness.



## 10) UI-Safe Iconography (HUD, hotbar, minimap)

- Icon base
  - Tint: ui.icon.tint; keep MVP icons monochrome-tinted for consistency.
  - Size: 12×12 within a 16×16 slot; center-aligned.
- Minimap
  - Use minimap.tile.* for terrain cells.
  - Entities: minimap.player, minimap.enemy, minimap.lamp.
- Borders and frames
  - Use ui.frame.brass / ui.frame.copper for borders and separators.
  - Active hotbar slot: ui.hotbar.slot.active.
- Text
  - ui.text.primary for main labels, ui.text.secondary for hints and cooldowns (contrast per §3, §13).



## 11) Phaser 3 Integration Notes

Rendering setup:
- Global
  - In Phaser.Game config: pixelArt: true, roundPixels: true, antialias: false.
  - Ensure textures are loaded without smoothing (Phaser will apply NEAREST when pixelArt true).
- Sprites
  - Use nearest-neighbor scaling; roundPixels true to avoid subpixel blur.
  - Base tint: sprite.setTint(getHex(tokenFromRenderableOrTheme)).
  - Flash: sprite.setTintFill(getHex('effects.hitFlash')); revert next frame via clearTint().
- Telegraphs
  - Draw with Phaser.GameObjects.Graphics.
  - Use lineStyle(widthPx, getHex('mapping.telegraph.arc.amber'), 0.6).
  - Keep stroke width stable in screen pixels:
    - widthPx = Math.max(2, Math.round(2 / camera.zoom)) at 3×; clamp to 3 for 4× if needed.
- Lighting sprites (lamps, crystals)
  - Use additive blendMode; pre-baked radial textures or Graphics fills tinted with mapping.lighting.lampWarm or mapping.lighting.crystalCool.
  - For depth tints, draw a fullscreen or tile-aligned multiply layer tinted with mapping.depthTint.l0 beneath actors but above the floor.
- ECS bridge
  - Read Renderable.tintToken (docs/core-systems/ecs-architecture.md §Renderable.tintToken).
  - Resolve via palette loader: token → getHex(token). A missing or unknown token is a development error and should assert/fail loudly.
  - Depth ordering: Renderable.depth aligns with ECS layering; telegraph arcs render above actors but below UI.

Example snippets (pseudo-JS; resolve tokens at runtime only):
```js
// Palette resolution (no raw hex; tokens only)
const getHex = (token) => Palette.resolve(token); // from data/visual/color-palette.json

// Sprite setup
sprite.setOrigin(0.5, 0.5);
sprite.setTint(getHex(entity.renderable.tintToken)); // e.g., characters.player.cloth

// Hit flash (1–2 frames)
sprite.setTintFill(getHex('effects.hitFlash'));
this.time.delayedCall(32, () => sprite.clearTint());

// Telegraph draw
const g = this.add.graphics().setDepth(telegraphDepth);
const px = (v) => Math.max(2, Math.round(v / this.cameras.main.zoom));
g.lineStyle(px(2), getHex('mapping.telegraph.arc.amber'), 0.6);
g.beginPath();
g.arc(attacker.x, attacker.y, rangePx, Phaser.Math.DegToRad(startDeg), Phaser.Math.DegToRad(endDeg), false);
g.strokePath();
```



## 12) Export & Naming Conventions

- Sprite atlases
  - sprites/{actor}/{actor}_sheet.png
  - Example: sprites/player/player_sheet.png
- Atlas JSON frame naming
  - {anim}.{frameIndex}
  - Examples: idle.0..3, walk.0..5, attack.0..5
- VFX atlases
  - effects/common_sheet.png
  - Frame ids: vfx.debris.rockA.0..n, vfx.debris.rockB.0..n, vfx.smokePuff.0..n
- Enemy sheets
  - sprites/goblin/goblin_sheet.png, sprites/burrower/burrower_sheet.png
  - Align frame indices with timings listed in §6.



## 13) Accessibility & Readability Checks

- Contrast
  - Ensure ui.text.primary meets or exceeds palette.accessibility ≥ 4.5:1 vs ui.panel.bg.
  - Ensure ui.text.secondary ≥ 3:1 vs ui.panel.bg.
  - Do not alpha-wash primary text below 90% opacity.
- Motion
  - Avoid strobing; cap rapid repeats at ≤ 12 Hz.
  - Keep hit flashes to 1–2 frames; avoid alternating full-screen inversions.
- Outline switching
  - Use characters.outline.light vs characters.outline.dark to preserve 1 px outline readability across bright/dark backgrounds.



## 14) Acceptance Checklist

- Tiles are 16×16; character bodies 12×12; collision aligns to body box.
- Animation counts and timings provided for Player, Goblin Grunt, and Cave Burrower.
- Palette tokens mapped for terrain, ores, UI, characters, effects, mapping, and depth tint; no raw hex anywhere.
- Telegraphs defined: token, geometry, opacity, pre-flash, cancel behavior.
- Lighting rules for lamps/crystals with additive usage; depth tint token specified.
- Phaser 3 hooks defined: pixelArt/roundPixels, tint/fill, telegraph Graphics, additive lights.
- ECS bridge documented: Renderable.tintToken resolution, depth ordering, dev error on missing token.
- Export and naming conventions documented.
- File is ready for artist and engineer handoff for Sprint 1.



## Appendix A) Quick Timing Table (60 fps)

- 60 ms ≈ 4 frames
- 80 ms ≈ 5 frames
- 100 ms ≈ 6 frames
- 300 ms ≈ 18 frames
- 420 ms ≈ 25 frames
- 560 ms ≈ 34 frames



## Appendix B) Future Hooks

- Theme loader stub
  - src/ui/theme-loader.js: centralize token → hex resolution, stateful theme variants, and hover/active brightening (+8–12%) for ui.frame.brass via shader/post-process.
- HUD and minimap stubs
  - Provide early HUD and minimap scenes to validate palette consumption and contrast (tokens only):
    - HUD: ui.panel.bg, ui.text.primary/secondary, ui.gauge.*, ui.frame.brass/copper, ui.hotbar.slot.active, ui.icon.tint
    - Minimap: minimap.tile.*, minimap.player, minimap.enemy, minimap.lamp
- Depth stack evolution
  - Extend mapping.depthTint.* for multi-layer caves in later sprints; keep current l0 as baseline.
- Telegraph service API
  - Finalize CombatTimingService hooks for flashAtMs, AttackEnd:canceled, and arc lifetime management per combat-design.md §10/§14.