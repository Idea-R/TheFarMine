# The Far Mine — Visual Style Guide v0.1 (Sprint 1)

Owner: Brightforge Crystalsmith (Eta)  
Version: 0.1 • Date: 2026-02-18  
Scope: Side-view vertical slice of Mine Level 1. Defines pixel specs, palette usage, character proportions, animation baselines, lighting and telegraphs. Engine-agnostic; maps to Bevy assets via visuals/ui modules.

---

## 1) Title & Scope
- Authoritative for Sprint 1 vertical slice of Mine L1.
- Includes: pixel grid and scale, palette/material tokens, character sizing, animation frame counts, lighting/shading rules, telegraphs/VFX, ore readability, HUD token links.
- Implementation note: map tint and UI tokens through visuals bridge to Bevy asset handles; no engine lock-in.

## 2) Art Direction Pillars
- Brass & Crystal Utility
  - Tools and fixtures read as functional dwarven kit: brass housings, crystal insets, visible fasteners.
  - Accept: brass lamp with rivets and a cyan crystal sight-glass; pickaxe head with iron body and brass collar. Guardrail: avoid overly ornate filigree; form serves function.
- Readable in the Gloom
  - Foreground gameplay elements pop against cool, crushed cave midtones.
  - Accept: player and foes rim-lit against rock; UI at AA contrast. Guardrail: avoid neon saturation in caves; reserve high-chroma for telegraphs/VFX.
- Dwarven Craft Geometry
  - Chunky, confident shapes; beveled edges, stepped facets; minimal dithering.
  - Accept: 45° chamfers, stepped arcs; Guardrail: no wispy/feathery linework that muddies the read at 3×.
- Motion With Meaning
  - Animation supports gameplay timing; anticipation and recovery are legible.
  - Accept: squash before burrower lunge, clear windup pose before goblin slash. Guardrail: avoid continuous micro-wiggles that mask telegraphs.

## 3) Pixel Grid & Tile Scale
- Tile size (authoritative): 16×16 px. World units: 1 tile = 1.0 unit (per P4).
- Camera scale target: 3×–4× at 1080p. At 3×, all silhouettes and telegraphs must be readable at a glance.
- Alignment:
  - Sprites anchor feet to integer pixel rows.
  - No subpixel camera or sprite transforms for MVP (lock camera and entities to the pixel grid).
  - Padding: keep 1 px transparent buffer around export slices to prevent texture bleeding.

## 4) Palette & Materials
- Source of truth: data/visual/color-palette.json (version 1).
- Key token families we rely on:
  - terrain.* (rocks, floors, ores), materials.* (metals, crystals), ui.* (HUD), mapping.telegraph.arc.* (combat telegraphs), characters.* (base tints).
- Material references (stable ids):
  - Brass: [material.metal.brass] (use near [ui.accent.brass] for hot highlights)
  - Copper: [material.metal.copper]
  - Iron: [material.metal.iron]
  - Crystals: [material.crystal.cyan], [material.crystal.amethyst]
- Accessibility targets (HUD):
  - [ui.text.primary] ≥ 4.5:1 contrast on [ui.panel.bg]
  - [ui.text.secondary] ≥ 3.0:1 on [ui.panel.bg]
  - [ui.text.inverted] ≥ 4.5:1 on [ui.panel.bg_inverted]
  - Note: full contrast audit queued (Sprint 2).
- Swatch guidance (spec/gloss notes):
  - Brass: warm mid; tight, bright spec hit 1–2 px near [ui.accent.brass]; shadows skew slightly green.
  - Copper: redder mid; broader, softer highlights; oxide shadow taps a desaturated teal.
  - Iron: neutral-cool mid; crisp, small highlights; shadows go cooler and can approach [terrain.rock.shadow] for contact.

## 5) Character Proportions & Readability
- Player (Dwarf):
  - Height: 14–16 px body within a 16×16 tile.
  - Head: ~5 px tall; beard/bevel silhouette beats internal detail.
  - Width: single tile; 1–2 px shoulder overhang acceptable during action.
- Enemy baselines:
  - Goblin Grunt: 12–14 px tall; lanky silhouette; base [characters.goblin.base] with accents [characters.goblin.accent].
  - Cave Burrower: fills most of 16×16 horizontally; squat ellipse; base [characters.burrower.base].
- Silhouette rules:
  - Maintain high-contrast edges against terrain using lighter rims or darker cuts as needed.
  - Avoid internal noise and high-frequency dithers; preserve readability at 3×.

## 6) Animation & Frame Counts (MVP)
- Player:
  - Idle: 3 frames (subtle lamp-breath), 6–8 FPS.
  - Walk: 6 frames, 8–10 FPS.
  - Light attack (shared mining/combat cadence): 4 windup, 2 active, 3 recovery (~9 total).
  - Hit-stun: 2-frame hold.
- Goblin Grunt:
  - Idle: 2 frames; Walk: 6 frames; Light slash: 7–9 frames (windup/active/recover per combat-design.md).
- Burrower:
  - Lunge (MVP): 8–9 frames; visible squash in windup.
- Frame-to-time mapping (respect clamps: windup [200..700] ms, active [70..120] ms, recovery [200..600] ms):
  - Player light: 300 / 90 / 340 ms
  - Goblin light: 260 / 100 / 300 ms
  - Burrower lunge: 420 / 90 / 380 ms
  - Mining swing (shares player light): 300 / 90 / 340 ms
- Export guidance: even frame spacing unless design calls stagger; map exact timings in state machine, not per-frame durations.

## 7) Lighting & Shading Rules
- Cave lighting: baked sprite shading + simple in-engine tinting. No heavy per-pixel faux HDR for MVP.
- Light sources:
  - Warm lamps: [effects.light.warm]
  - Crystal bioluminescence: [effects.light.cold]
- Shading style:
  - 2–3 tone ramps per material.
  - Cast shadow bias toward terrain; darkest crush reserved for terrain mass, not characters.
  - Ore specular flecks: 1–2 px highlights in material hue; do not over-dither.
- Lamp fixtures:
  - Fixture sprite uses [terrain.lamp.glow] brass hues; non-emissive in sprite.
  - Emissive aura rendered by engine via [effects.light.warm] with opacity/blur in visuals module.

## 8) Telegraphs & VFX
- Telegraph arcs:
  - Default: [mapping.telegraph.arc.amber]
  - Danger: [mapping.telegraph.arc.red]
  - Confirm: [mapping.telegraph.arc.green]
  - Opacity handled in visuals (≤ 0.6), bloom OFF for MVP.
- Hit/VFX tokens:
  - Damage flash: [effects.hit.flash] (brief overlay)
  - Mining sparks: [effects.mine.spark] (1–3 px particles; tint bias to copper/iron/quartz)
  - Steam/smoke puffs: [effects.smoke.steam] (short-lived, low opacity)

## 9) Environmental Tiles & Ore Reads
- Rock/floor:
  - Base rock: [terrain.rock.base] with subtle, low-frequency texture.
  - Floor distinctness: use [terrain.floor.dust] to separate walkable planes from walls.
- Ores (glance-readable via token color and pattern density):
  - Copper: [terrain.ore.copper] — warm flecks in 2–3 px clusters.
  - Iron: [terrain.ore.iron] — cooler, chunkier seams 3–4 px.
  - Quartz (preview): [terrain.ore.quartz] — bright facets, sparser; rare in L1 per cave-gen.

## 10) UI/HUD Visual Language (cross-link)
- See docs/visual-systems/ui-framework.md for bezel rules, crystal accents, layout.
- Health bar: [ui.health.bar]; Stamina bar: [ui.stamina.bar].
- Minimap palette: [mapping.minimap.*] token family maps terrain vs entities.
- Brass bezel and crystal accents should align to [ui.accent.brass] and [material.crystal.cyan]/[material.crystal.amethyst].

## 11) Font Shortlist (HUD/small labels)
- Press Start 2P (bitmap-style, high legibility at 3×; OFL via Google Fonts).
- VT323 (mono, clean strokes at small sizes; OFL via Google Fonts).
- Atkinson Hyperlegible (vector fallback; rasterize to pixel grid at export; OFL).
- Pixel Operator (regular/mono; screen-optimized; license: free for commercial—verify file in repo).
- Final pick pending in-engine render tests (kerning/contrast at 3×/4×).

## 12) Moodboard Link (reference images)
https://miro.com/app/board/uXjV-FarMine—Brass-and-Crystal-Mood  
Curation: brass lamps, rivets, pressure gauges, cyan/amethyst crystal veins, miners’ gear, rugged rock strata.

## 13) Integration Notes & Tokens
- Stable token references used here: [characters.goblin.base], [mapping.telegraph.arc.amber], [ui.accent.brass], [mapping.minimap.*], [Renderable.tintToken] (ecs-architecture.md).
- Cross-file alignment:
  - Telegraph colors mirror combat-design.md guidance.
  - visuals bridge maps sprite layers to tint via [Renderable.tintToken].
  - Audio cues referenced in audio docs; none embedded here.
- Delivery expectations:
  - Artists: name layers/slices predictably (entity_state_frame e.g., dwarf_walk_03); keep feet-alignment guides.
  - Engineers: map tint tokens and opacity in visuals/ui modules; no runtime re-hues outside declared tokens.

## 14) Test & Acceptance Checklist
- HUD contrast: [ui.text.primary], [ui.text.secondary], [ui.text.inverted] pass on [ui.panel.bg]/[ui.panel.bg_inverted].
- Sprite readability at 3× and 4× on 1080p.
- Telegraph arcs visible over terrain; no confusion with [terrain.ore.copper] at typical opacity (≤0.6).
- Tile seams clean on 16 px grid; no subpixel artifacts; no texture bleeding at edges.
- Ores distinguishable by hue and cluster size at gameplay speed.

## 15) Risks & Assumptions
- Risk: font readability/spacing at in-engine scaling and shader pipelines.
- Assumption: 16 px tiles suffice for MVP readability/performance; camera locked to pixel grid.
- Token stability: ids in data/visual/color-palette.json are stable for Sprint 1; any rename requires announce + migration note across visuals/ui and combat-design.md.

By my steady hand and the gleam of brass, this guide stands as bedrock for Sprint 1. Keep your pixels honest and your light true.