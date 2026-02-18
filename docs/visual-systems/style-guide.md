# Visual Style Guide — Brass, Stone, and Crystal Light (Sprint 1)

Owner/Provenance: @eta (Visual Systems — Brightforge Crystalsmith). By my beard and brazed axles, this one’s trimmed for engineers and pixel hands alike—no frills, just rivets.

Cross‑references:
- data/visual/color-palette.json (authoritative tokens)
- docs/combat-systems/combat-design.md (§Telegraphs, timings)
- docs/world-generation/cave-gen-algorithm.md (§Tile size 16×16)
- data/core/component-schemas.json (Renderable.tintToken)
- src/core/ecs-registry.js (Collider sizes)
- data/audio/sound-manifest.json (telegraph SFX mention)

---

## 1) Art Direction Summary

- Aesthetic: Steampunk dwarven pragmatism—brass and copper hardware, cool crystal light, warm lamps. Keep material reads clean: metal gleams, stone holds, crystal sings with edge highlights.
- Readability over noise: every pixel must earn its keep. Reserve dithers for controlled gradients only (crystal cores, lamp falloff edges).
- Reaffirmation: Three‑Wide Law applies in visuals. Doors and main corridors read as 3 tiles wide end‑to‑end; silhouettes, telegraphs, and lane safety reinforce the three‑wide combat flow.

---

## 2) Pixel Grid, Tile Size, and Scale

- Canonical tile size: 16×16 px (authoritative for Sprint 1; see docs/world-generation/cave-gen-algorithm.md).
- World render scale on screen: 3×–4×. All core sprites and UI affordances must remain crisp and legible at these scales.
- Pixel grid discipline:
  - No sub‑pixel transforms ever for world sprites. Positions and camera must snap to whole pixels at native 1×.
  - Phaser 3: enable pixelArt and roundPixels; Camera.setRoundPixels(true). Do not tween positions to fractional world coords.
  - Camera panning snaps to 1 px at world scale (i.e., 1 native pixel, not 1 scaled pixel).
- Parallax: future‑only. No parallax layers in MVP to avoid sub‑pixel drift.

---

## 3) Character Proportions & Collision Fit

- Canonical actor body: 12×12 px footprint centered within a 16×16 tile. Leaves 2 px ambient cushion per side for lane safety and overlap readability.
- Collider fit: match to 12×12 where possible (confirm against src/core/ecs-registry.js actual collider sizes; avoid expanding beyond 14×14 during Sprint 1).
- Alignment:
  - Feet anchor on lower third of the tile (baseline ≈ row 11–12 at 1×).
  - Use this baseline as pivot reference for melee arcs and mining swings.
- Silhouette rules:
  - Head/shoulders must read at 3× scale. Avoid helmet silhouettes merging with backplates; ensure negative space at neck/underarm.
  - Weapons must present a ≥5 px recognizable mass during active frames (blade edge, pick head, drill bit).
- Outline/tint usage:
  - Use palette tokens: `characters.player.outline`, `characters.goblin.outline`.
  - Implementation: 1 px inner outline or selective edge highlight on shadow‑side contours. Do not add full external strokes unless testing fails on busy backgrounds.

---

## 4) Animation Standards (Frame Counts & Timings)

- Target framerate: 60 fps (1 frame ≈ 16.67 ms). Animation system accepts ms per frame; hold durations may exceed a single 1/60 tick.

Player animations:
- Idle: 4 frames (gentle breath). Loop ≈ 520 ms (≈130 ms per frame).
- Walk: 6 frames. Loop ≈ 420 ms (≈70 ms per frame). Heel‑strike readable; avoid foot slide.
- Light Attack: 6 frames
  - Windup: 3 frames, total ≈ 300 ms (≈100 ms each).
  - Active: 2 frames, total ≈ 80 ms (≈40 ms each).
  - Recover: 1 frame, hold ≈ 420 ms.
  - Map to docs/combat-systems/combat-design.md: enable hitbox at Active start; clear at Active end; AttackEnd at Recover end.
- Dodge/Roll: 6 frames, total ≈ 360 ms (≈60 ms each). Exaggerate early squash; i‑frames centered (frames 3–4).
- Block:
  - Raise: 4 frames ≈ 120 ms (≈30 ms each).
  - Hold: 1 frame sustained until input release.
  - Lower: 3 frames ≈ 160 ms (≈53/54 ms each).
- Mine (Pick): 6 frames
  - Windup: 3 frames; Mining.Swing event fires on windup start.
  - Impact: frame 4; fire Mining.Progress or Mining.Break at this frame.
  - Follow‑through: 2 frames.
  - Recommended pacing: 6×80 ms = 480 ms total.
- Drill:
  - spinUp: 3 frames (trigger time) ≈ 60 ms each.
  - bite: 4‑frame loop ≈ 80 ms per frame until release.
  - coolDown: 3 frames ≈ 60 ms each.

Enemies (MVP):
- Telegraph strongly. 6–7 frame attacks with ≥3 windup frames (≥300 ms windup) before active.
- Apply the same hit/poise flashes standard as player.

Hit/Poise flashes:
- Single‑frame overlays using `effects.hitFlash` and `effects.poiseBreakFlash`.
- Implement as a 1‑frame sprite overlay or sprite.tint fill pulse lasting ≤80 ms.

---

## 5) Tileset & Autotile Conventions (Sprint 1 Simplified)

- Tileset atlas: contains terrain tiles for rock, floor, ores, and door bands (band = floor‑type visual with brass trim).
- Minimum set (MVP):
  - Rock variants (≥3): base stone, edge‑accent A/B. Avoid high‑frequency noise and heavy dithers.
  - Floor variants (≥3): slightly lighter than rock; subtle texture shift (grain direction or flatter wear).
  - Door band tile(s): floor‑compatible visuals with brass trim clearly signifying a 3‑tile‑wide doorway zone.
  - Ore overlays: copper, iron, quartz. Paint as embedded aggregates. Highlights:
    - `terrain.ore.*.spark` must sit ≈ 12–18% luminance above `terrain.rock.highlight` for readable sparkle without glare.
- Autotile:
  - MVP: manual stamping by world‑gen only. No 47‑tile autotile requirement in Sprint 1.
  - Soft guideline for future (47‑tile) noted, but do not pre‑allocate indices yet.

Proposed tile index ranges (DRAFT — confirm with @beta before locking):
- 0–15: rock/floor
- 16–23: doors/caps
- 24–31: copper
- 32–39: iron
- 40–47: quartz

> Caution — Placeholder indices:
> Do not hard‑wire these ranges until handshake is complete with world‑gen (owner @beta). Expect churn during the first integration pass.

---

## 6) Palette Usage & Tokens

- Use tokens from data/visual/color-palette.json only. No hardcoded hex in art notes, scripts, or shaders.
- Terrain tokens:
  - `terrain.rock.base`, `terrain.rock.shadow`, `terrain.rock.highlight`
  - `terrain.floor.base`, `terrain.floor.shadow`, `terrain.floor.highlight`
  - `terrain.ore.copper.base`, `terrain.ore.copper.spark`
  - `terrain.ore.iron.base`, `terrain.ore.iron.spark`
  - `terrain.ore.quartz.base`, `terrain.ore.quartz.highlight`
- UI/frames tokens:
  - `ui.frame.edge`, `ui.panel.bg`, `ui.panel.edge`, `ui.text.primary`, `ui.text.muted`, `ui.gauge.bg`, `ui.gauge.health`, `ui.gauge.stamina`
- Characters/effects tokens:
  - `characters.player.base`, `characters.player.outline`, `characters.goblin.base`, `characters.goblin.outline`
  - `effects.hitFlash`, `effects.poiseBreakFlash`, `effects.sparkRock`, `effects.sparkOre`, `effects.debris.rockA`, `effects.debris.rockB`, `effects.smokePuff`
- Lighting/mapping tokens:
  - `mapping.lighting.lampWarm`, `mapping.lighting.crystalCool`
  - `mapping.telegraph.arc.amber`
  - `mapping.depthTint.l0`
- Accessibility:
  - Maintain ≥4.5:1 contrast for `ui.text.primary` on `ui.panel.bg`. Gauges: foreground vs `ui.gauge.bg` ≥3:1.
  - Example token pairs (verified at 3× scale):
    - `ui.text.primary` on `ui.panel.bg` — passes ≥4.5:1
    - `ui.gauge.health` on `ui.gauge.bg` — passes ≥3:1
    - `ui.gauge.stamina` on `ui.gauge.bg` — passes ≥3:1
  - If palette adjustments are needed, update data/visual/color-palette.json and notify UI implementers.

---

## 7) Lighting & Shading Rules (MVP‑friendly)

- Global lighting: Faux only via sprite shading + halo sprites. No dynamic normal maps in MVP.
- Material read:
  - Rock: 3‑value ramp (shadow/base/highlight). Avoid banding; creases receive tight inner shadows.
  - Metal (brass/copper): stronger specular edge with 1 px bright highlight where angle turns to light.
  - Crystal: cool core with rim highlights using `terrain.ore.quartz.highlight` or `mapping.lighting.crystalCool` accents.
- Lamps:
  - Halo sprite tinted with `mapping.lighting.lampWarm`.
  - Blend: additive or screen at alpha ≈ 0.24–0.30.
  - Radius: ≈ 24–32 px at 1× (i.e., 72–96 px at 3×).
- Depth tint:
  - Apply `mapping.depthTint.l0` as a subtle screen overlay for Mine Level 1 only. Keep alpha gentle (≈0.06–0.10).
  - Shader hooks for depth ramping are future work; avoid per‑sprite multipliers in MVP.

---

## 8) Telegraph Visuals (Combat Readability)

- Color token: `mapping.telegraph.arc.amber` (authoritative).
- Stroke spec:
  - 2 px solid arc core, with a 1 px soft halo feathering outward (use alpha gradient).
  - Opacity ramps in over 80–120 ms; peak opacity below hard UI (avoid occluding silhouettes).
  - Flash behavior: align with flashAtMs from docs/combat-systems/combat-design.md; brief brightness spike ≤80 ms.
- Layering:
  - Render above floor/props and below entity hit flashes and silhouettes.
  - Z‑order: Floor < Props < Telegraph < Entities < HitFlashes < UI.
- Event sync (engine):
  - Show on `combat.TelegraphStart`.
  - Clear on `AttackEnd` or when interrupted.
  - SFX: bind to telegraph SFX id from data/audio/sound-manifest.json.

Implementation note (Phaser 3):
- Prefer pre‑baked arc sprites or RenderTexture draws snapped to whole pixels to avoid anti‑alias shimmer.
- If using Graphics, snap positions to integers and set line width to 2 at native scale; do not scale the Graphics object non‑integrally.

---

## 9) Effects & Particles

- Mining sparks:
  - Use `effects.sparkRock` for rock, `effects.sparkOre` for ore.
  - 3–5 particles per hit; size 1–2 px; short ballistic arc with slight gravity.
  - Lifetime: 120–220 ms; slight additive permissible, but default to normal blend for stone.
- Debris:
  - Sprites: `effects.debris.rockA`, `effects.debris.rockB` (3–5 px).
  - Gravity: medium (≈ 350–500 px/s² at 1× physics units).
  - Lifetime: ≈ 280–420 ms; fade in last 80 ms.
- Smoke puffs:
  - `effects.smokePuff` 2–3 frames; low alpha; expand then dissipate.
  - Frame pacing: ≈ 60–80 ms per frame.

Emitter guidelines (Phaser 3):
- Angle spread: ±25° from surface normal for sparks; random ±10° for debris.
- Speed: sparks 80–140 px/s; debris 60–120 px/s.
- Collide: optional. If cheap collision not available, fake with early fade and ground‑skid sprite where needed.

---

## 10) Export, Atlases, and Engine Integration (Phaser 3)

- Tools: Aseprite export or TexturePacker (Phaser 3 JSON hash/array).
- Atlas constraints:
  - Max size: 2048×2048 for MVP.
  - Trimming: enabled.
  - Extrude: 1 px.
  - Padding: 2 px between sprites; 2 px around border.
- Naming conventions:
  - Spritesheets:
    - `sprites/player_*`
    - `sprites/enemy_goblin_*`
    - `sprites/enemy_burrower_*`
    - `terrain/tiles_v1.png`
    - `ui/ui_atlas_v1.png`
    - `fx/fx_common_v1.png`
  - Frame IDs: snake_case. Example: `player_walk_0` … `player_walk_5`.
  - Animation defs: planned in `src/visual/anim-registry.js` (future). For now, scene init may register temporary anims.
- Tinting:
  - Use `Renderable.tintToken` from data/core/component-schemas.json, resolved by theme‑loader.
  - Do not export pre‑tinted color variants where a tint will suffice.
- Blend modes:
  - Additive only for lamp halos and crystal glints.
  - Normal everywhere else. Avoid multiply/darken pipelines in MVP.

---

## 11) Minimap Visuals

- Tokens:
  - `minimap.bg`, `minimap.room`, `minimap.corridor`, `minimap.ore`, `minimap.player`, `minimap.enemy`
- Mapping:
  - Use raster value mapping from docs/world-generation/cave-gen-algorithm.md to determine room/corridor/solid/ore.
  - Draw at 1 px per world tile on the HUD layer. Use nearest‑neighbor scaling for any zoom.
  - Crisp edges: snap to integer pixels; no smoothing.
- Priority:
  - Player dot above enemy blips above terrain marks.
  - Use simple flicker/pulse for player dot at 1–2 px amplitude max.

---

## 12) Accessibility & UX Guardrails

- Flashes: full‑screen flashes capped at ≤80 ms. Prefer localized entity hit flashes.
- Color‑blind checks:
  - Health (warm amber‑red) vs Stamina (cool teal) must remain distinguishable over `ui.gauge.bg`. Ensure each ≥3:1.
  - If ambiguity is detected, add patterning (subtle notch or tick texture) to gauge fill.
- Text legibility:
  - At 3×–4×, primary UI text must exceed minimum x‑height of 6 native px at 3× (i.e., 18 px on screen).
  - Final font selection and sizing deferred to ui-framework.md, but sprite labels and numbers should obey contrast rules above.

---

## 13) Production Checklist (Acceptance)

- Tiles are 16×16; actors fit 12×12 with 2 px safe padding.
- Animation frame counts and timings match this guide and the combat/mining docs.
- Palette: only tokens from data/visual/color-palette.json used. No raw hex.
- Telegraph visuals use `mapping.telegraph.arc.amber` and follow stroke/opacity rules.
- Atlas export follows size, padding, extrude, and naming conventions.
- Camera and sprites snap to pixel grid. No sub‑pixel transforms.
- Blend modes restricted to additive for halos/glints; otherwise normal.

---

## 14) Open Questions & Handshake Notes

- Tile index ranges require confirmation with @beta (world‑gen) before freezing.
- Final font choice and UI text sizing will be locked in ui-framework.md; run readability checks at 3× and 4× at that time.
- Provide 2–3 tiny pixel mock references (rooms + a combat frame) in a later asset pass; attach as an appendix in a future revision.

---

## Appendix A) Timing‑to‑Frame Maps

Player Light Attack (6 frames; total ≈ 800 ms):
| Frame | Segment  | Duration (ms) | Cumulative (ms) | Events/Notes                         |
|------:|----------|---------------|-----------------|--------------------------------------|
| 1     | Windup   | 100           | 0–100           | Prep pose, weight shift              |
| 2     | Windup   | 100           | 100–200         |                                      |
| 3     | Windup   | 100           | 200–300         |                                      |
| 4     | Active   | 40            | 300–340         | Enable hitbox; play swing whoosh SFX |
| 5     | Active   | 40            | 340–380         | Maintain hitbox                      |
| 6     | Recover  | 420           | 380–800         | Disable hitbox; AttackEnd at 800 ms  |

Player Mine (Pick) (6 frames; total ≈ 480 ms @ 80 ms/frame):
| Frame | Segment        | Duration (ms) | Cumulative (ms) | Events/Notes                                     |
|------:|----------------|---------------|-----------------|--------------------------------------------------|
| 1     | Windup         | 80            | 0–80            | Fire Mining.Swing at frame start                 |
| 2     | Windup         | 80            | 80–160          |                                                  |
| 3     | Windup         | 80            | 160–240         |                                                  |
| 4     | Impact         | 80            | 240–320         | Fire Mining.Progress/Break; spawn sparks/debris  |
| 5     | Follow‑through | 80            | 320–400         |                                                  |
| 6     | Follow‑through | 80            | 400–480         |                                                  |

Player Dodge/Roll (6 frames; total ≈ 360 ms @ 60 ms/frame):
| Frame | Duration (ms) | Cumulative (ms) | I‑frames | Notes                         |
|------:|---------------|-----------------|---------:|-------------------------------|
| 1     | 60            | 0–60            |    No    | Squash start                  |
| 2     | 60            | 60–120          |    No    | Launch                        |
| 3     | 60            | 120–180         |   Yes    | Peak velocity                 |
| 4     | 60            | 180–240         |   Yes    | Maintain, low silhouette      |
| 5     | 60            | 240–300         |    No    | Recover                       |
| 6     | 60            | 300–360         |    No    | Settle, return to idle pivot  |

Enemy Telegraph + Attack (7 frames; example pacing):
| Frame | Segment  | Duration (ms) | Cumulative (ms) | Events/Notes                                      |
|------:|----------|---------------|-----------------|---------------------------------------------------|
| 1     | Windup   | 100           | 0–100           | TelegraphStart; draw arc; telegraph SFX           |
| 2     | Windup   | 100           | 100–200         | Telegraph opacity ramp                            |
| 3     | Windup   | 100           | 200–300         | flashAtMs spike                                   |
| 4     | Active   | 60            | 300–360         | Enable hitbox; clear telegraph                    |
| 5     | Active   | 60            | 360–420         | Maintain hitbox                                   |
| 6     | Recover  | 120           | 420–540         | Disable hitbox                                    |
| 7     | Recover  | 160           | 540–700         | AttackEnd                                         |

Implementation notes:
- Animator frame counts must match art; engineer timings must match tables. If art frame pacing differs, adjust per‑frame durations, not frame count, unless coordinated.

---

## Appendix B) Token Quick Reference (Painter’s Hand)

Use tokens from data/visual/color-palette.json. If any are missing, propose additions via palette PR; do not hardcode hex.

Terrain (stone/floor/ore):
- `terrain.rock.shadow`, `terrain.rock.base`, `terrain.rock.highlight`
- `terrain.floor.shadow`, `terrain.floor.base`, `terrain.floor.highlight`
- `terrain.ore.copper.base`, `terrain.ore.copper.spark`
- `terrain.ore.iron.base`, `terrain.ore.iron.spark`
- `terrain.ore.quartz.base`, `terrain.ore.quartz.highlight`

Metal and fittings:
- `metal.brass.shadow`, `metal.brass.base`, `metal.brass.highlight`
- `metal.copper.shadow`, `metal.copper.base`, `metal.copper.highlight`

Crystal and light:
- `mapping.lighting.crystalCool`, `crystal.quartz.highlight`

Characters and outlines:
- `characters.player.base`, `characters.player.outline`
- `characters.goblin.base`, `characters.goblin.outline`

Effects:
- `effects.hitFlash`, `effects.poiseBreakFlash`
- `effects.sparkRock`, `effects.sparkOre`
- `effects.debris.rockA`, `effects.debris.rockB`
- `effects.smokePuff`

UI and gauges:
- `ui.panel.bg`, `ui.frame.edge`
- `ui.text.primary`, `ui.text.muted`
- `ui.gauge.bg`, `ui.gauge.health`, `ui.gauge.stamina`

Mapping/Telegraph:
- `mapping.telegraph.arc.amber`
- `mapping.depthTint.l0`
- `minimap.bg`, `minimap.room`, `minimap.corridor`, `minimap.ore`, `minimap.player`, `minimap.enemy`

— Hammer steady, pixels true.