# UI Framework — Brass Rims and Crystal Readings (Sprint 1)

Provenance
- Owner: @brightforge (Visual Systems — Master Crystalsmith)
- Voice: Brightforge Crystalsmith — brass rims for strength, crystal readings for clarity.

Cross‑references
- data/visual/color-palette.json (all tokens; token-only color policy, no raw hex)
- docs/visual-systems/style-guide.md (§Lighting, gauges)
- docs/core-systems/ecs-architecture.md (§Renderable, HUD scene)
- docs/world-generation/cave-gen-algorithm.md (§depth tints)
- docs/audio-systems/audio-design.md (§UI trifecta)
- data/items/tools.json (icons mapping)
- tools/ecs-registry.test.js (naming patterns only; dot-delimited, lower case)

---

## 2) Design Principles (HUD)
- Brass utility: functional brass frames, no filigree without purpose.
- Zero clutter in 3‑wide sightlines: nothing intrudes the core cone; edges only.
- Token‑driven colors: all color selections sourced from palette tokens; no raw hex.
- Readable at 3×–4× scale; author at 1×, render scaled with pixel-perfect math.
- Shape + icon redundancy: critical states reflect in bar shape, icons, and numbers.
- Never use raw hex; token-only policy enforced by ThemeLoader.

---

## 3) Coordinate & Scale Rules
- Base tile: 16×16 px (1× authoring).
- UI art authored 1×; runtime render at 3× or 4× (recommend 3× for MVP).
- Pixel-perfect: no linear filtering; use nearest-neighbor. Round all UI positions to integers post-scale.
- HUD is screen-space: a dedicated HUD Scene/Camera that ignores world scroll and parallax.
- Integer snapping:
  - At 3×, any 1× pixel maps to 3 device pixels; ensure all positions are multiples of 1 at 1× (multiples of 3 at device pixels).
  - Use Phaser’s setRoundPixels(true) on HUD camera; disable anti-alias on textures.

---

## 4) HUD Layout Map (MVP)

Anchoring
- Anchors map to screen edges with padding in tiles (tile = 16 px at 1×).
- Default HUD padding: 1 tile (16 px at 1×; 48 px at 3×).

Top-left (Anchor: tl) — Stacked Health/Stamina gauges + numeric readouts
- Geometry (1× authoring):
  - Gauge track (inner fill area): 96×8 px (width 6 tiles; height 0.5 tile).
  - Outer brass frame: 2 px thickness around track (ui.frame.brass).
  - Inner edge: 1 px inset stroke (ui.panel.edge) drawn inside the brass frame. Does not add to outer bounds.
  - Overall gauge bounding box (incl. frame): 100×12 px (96+2+2 by 8+2+2).
  - Vertical stack: Health (top), Stamina (below) separated by a 6 px gap.
- Rendering tokens:
  - Health: fill ui.gauges.healthFill; back ui.gauges.healthBack; outline ui.frame.brass and ui.frame.brassShadow; numeric ui.text.numbers.
  - Stamina: fill ui.gauges.staminaFill; back ui.gauges.staminaBack; outline tokens as Health; chevron notches every 12 px.
  - Numbers: right‑justified inside the frame’s interior; drop-shadow 1 px using ui.panel.bg; text ui.text.numbers; format current/max (e.g., “76/100”).
- Notches (Stamina): render small V-chevron nicks cut into the top edge every 12 px along track width; width 3 px, depth 2 px; token ui.panel.edge at 60–80% opacity for subtlety.
- Example positions at 1× (tl origin = (16,16)):
  - Health frame top-left: (16,16); Stamina frame top-left: (16,16 + 12 + 6) = (16,34).
- 3× examples:
  - Track 96×8 → 288×24 device px; frame thickness → 6 device px; gap → 18 device px.

Top-right (Anchor: tr) — Minimap panel
- Map content (1×): 64×48 px (4×3 tiles). Internally scaled 2× → final content area 128×96 px (still at 1× logical panel layout).
- Frame margin (inside brass to content): 6 px on all sides at 1×.
- Frame: ui.frame.brass with ui.frame.brassShadow; inner edge ui.panel.edge.
- Colors (token namespaces minimap.*):
  - Rooms = minimap.room
  - Corridors = minimap.corridor
  - Player = minimap.player
  - Enemies = minimap.enemy
  - Ore = minimap.ore
  - Background = minimap.bg
- Optional depth vignette: overlay using mapping.depthTint.l0 at low alpha (10–15%).
- 1× panel inner size: 128×96 (content) + margins 2×6 → 140×108. With 2 px frame, outer ≈ 144×112.
- 3× example outer: ~432×336 device px.

Bottom-center (Anchor: bc) — Hotbar
- Cells (1×): 6 slots × (24×24 px); gutter 4 px. Total width = 6×24 + 5×4 = 164 px; height = 24 px.
- Center aligned horizontally; anchored 16 px above bottom edge (1×).
- Slot rendering:
  - Frame: ui.frame.brass + ui.frame.brassShadow; slot bg ui.panel.bg.
  - Active slot: 2 px inner stroke ui.panel.edge + subtle glow using mapping.lighting.lampWarm at 20–30% blend (additive or screen; see Blend Modes).
  - Keybind glyphs (e.g., 1–6) bottom-right inside slot, text ui.text.secondary with 1 px bg drop.
- 3× example:
  - Slot 24×24 → 72×72 device px; gutter 12 device px; row width 492 device px.

Bottom-left (Anchor: bl) — Interaction prompts + UI trifecta sounds guidance
- Prompt pill (1×): 120×20 px; left icon + right text.
  - Background ui.panel.bg; border ui.panel.edge; text ui.text.primary.
  - Confirm/Cancel: trigger audio tokens ui.confirm / ui.cancel (see audio trifecta) and use ui.text.primary/ui.text.warning as applicable for text emphasis.
  - Icon rails follow data/items/tools.json iconKey when contextual.
- Minimum 4 px inner padding (1×).

Top-center (Anchor: tc, MVP-lite optional) — Notification ribbon
- Single-line ribbon (1×): 240×20 px; text in ui.text.primary with ui.panel.shadow drop.
- Autohide after 3 s; manual dismiss triggers ui.cancel.

---

## 5) Inventory Panel (Overlay)
- Panel behavior: slide-in from right; hidden by default; blocks world inputs while focused.
- Size (1×): width 240 px; height = screen height − 16 px top − 16 px bottom padding.
- Internal margins: 8 px content padding on all sides.
- Header:
  - Brass rail with title left-aligned in ui.text.primary.
  - Close button 24×24 px at top-right inside panel; hover state brightens ui.frame.brass.
- Grid:
  - 6 columns × 4 rows, cell 24×24 px, gutter 4 px.
  - Grid size: width 164 px; height 108 px; centered under header within panel content area.
  - Frames and backgrounds mirror Hotbar: ui.frame.brass/ui.frame.brassShadow and ui.panel.bg.
- Tooltip:
  - 180×auto pill near cursor; bg ui.panel.bg; border ui.panel.edge.
  - Title ui.text.primary; numbers ui.text.numbers; warnings (e.g., unusable) ui.text.warning.
  - 120 ms show delay; clamps to screen edges.
- Drag/Drop states:
  - Hover: slot edge brightens ui.frame.brass (increase value/contrast, not hue).
  - Invalid targets: flicker ui.text.warning overlay for 80 ms (two-frame blink at 25 fps); no hue shift on brass.

---

## 6) Gauge & Meter Specs
- Health/Stamina per HUD layout. Text always present; numbers do not occlude bar fill significantly at 3×.
- Reserved (not shown in MVP): Poise/Armor meter.
  - Token placeholder: ui.gauges.armorFill, ui.gauges.armorBack.
  - Leave code stub and container in hud.gauges for future enable.
- Damage flash:
  - Overlay on health track using effects.hitFlash; 120 ms decay to 0 alpha; non-additive (normal blend).
- Stamina low state:
  - Threshold: < 20%.
  - Effect: slow pulsing of fill brightness (sinusoid 1 Hz; ±12% value change, no hue shift) and a 1 px top stripe drawn in ui.panel.edge at 50% opacity for cadence.

---

## 7) Minimap Rendering Contract
- Rasterization (1× authoring):
  - Tiles: draw single pixels or 2× scaled buffer using minimap.* tokens.
  - Player: 3×3 px square in minimap.player with a 1 px brighter edge (ui.panel.edge or a brighter minimap.playerEdge token if available) on top/left to aid contrast.
  - Enemy: 3×3 px in minimap.enemy.
  - Ore: 2×2 px pips in minimap.ore, spaced to avoid moiré.
- Frame and shadow: ui.frame.brass for frame, ui.panel.shadow for outer drop.
- Door markers: 3‑chevron motif in ui.panel.edge at panel corners when doors within vision radius; 5×3 px per chevron, 2 px spacing.
- API inputs:
  - Source: derived minimap raster from worldgen/camera; bounds clamped to available world data.
  - Pan: center on player; clamp so panel border never shows beyond known map.
  - Depth vignette: modulate overlay using mapping.depthTint.l0 alpha-scaled to world.depth.scalar (see §12 event).

---

## 8) Icons & Sprites in UI
- Icon sizes: 16×16 and 24×24 px.
- Naming convention: ui/icon.{domain}.{name}_{size}.png (e.g., ui/icon.tools.pickaxe_24.png).
- Tools mapping: data/items/tools.json → ui.iconKey → resolve atlas frame.
- Slot rendering: apply 1 px drop-contrast under icon using ui.panel.bg (not full shadow; just contrast outline on lower-right).

---

## 9) Fonts & Text
- Goals: crisp raster at 3×–4×; numerics prioritized for gauges and counts.
- Pairing:
  - Primary body/numbers: Pixel Operator (8pt). Fallback: Pixel Operator Mono for strict alignment.
  - Header/accent (optional): Silkscreen for panel labels and hotbar captions, used sparingly.
- Sizes at 3×:
  - Base body: ~12 px logical (from 4 px base at 1×).
  - Numbers: 1 step larger where needed for legibility (e.g., 5 px base at 1× → 15 px at 3×).
  - Line-height: 1.0–1.1; no subpixel AA; pixel hinting on.
- Accessibility contrast:
  - ui.text.primary over ui.panel.bg ≥ 4.5:1.
  - ui.text.secondary ≥ 3:1 against ui.panel.bg.

CSS @font-face (pack fonts as WOFF2 in assets/fonts/)
```css
@font-face {
  font-family: "Pixel Operator";
  src: url("/assets/fonts/PixelOperator8.woff2") format("woff2");
  font-display: swap;
}
@font-face {
  font-family: "Pixel Operator Mono";
  src: url("/assets/fonts/PixelOperatorMono8.woff2") format("woff2");
  font-display: swap;
}
@font-face {
  font-family: "Silkscreen";
  src: url("/assets/fonts/Silkscreen.woff2") format("woff2");
  font-display: swap;
}
body {
  font-family: "Pixel Operator", "Pixel Operator Mono", monospace;
  image-rendering: pixelated;
}
```

Phaser loader note
- Preload via this.load.font is not native; ship as CSS-injected or use a WebFont loader.
- Ensure UI construction waits for document.fonts.ready before text metrics are locked in HUDScene.

---

## 10) Theme & Tokens Integration

ThemeLoader contract (planned): src/ui/theme-loader.js
- Token-only color policy is enforced here. Never pass raw hex around the codebase.

API
- init(paletteJson)
  - Input: parsed JSON from data/visual/color-palette.json.
  - Side effects: builds token map and precomputes Phaser integer tints.
- getColor(token): returns { hex: "#RRGGBB", int: 0xRRGGBB }.
- getTextStyle(kind): returns Phaser-compatible style object (fontFamily, fontSize, color, strokeThickness, stroke).

Default text styles
- body: ui.text.primary
- numbers: ui.text.numbers
- header: ui.text.primary (or accent variant if defined)
- tooltip: ui.text.secondary with ui.panel.edge stroke 1 px

Failsafe
- Unknown token: log once (warn) and return debug.mask.exclude (conspicuous magenta/black per palette design), so violations are visible.

Example (skeleton)
```js
// src/ui/theme-loader.js
export class ThemeLoader {
  #palette = {};
  #warned = new Set();

  init(paletteJson) {
    this.#palette = paletteJson || {};
    return this;
  }

  getColor(token) {
    const entry = this.#palette[token];
    if (!entry) return this.#fail(token);
    // Expect entry.hex like "#AABBCC" in palette JSON
    const hex = entry.hex;
    const int = parseInt(hex.replace("#","0x"), 16);
    return { hex, int };
  }

  getTextStyle(kind = "body") {
    const fontFamily = '"Pixel Operator","Pixel Operator Mono",monospace';
    const colorToken = {
      body: "ui.text.primary",
      numbers: "ui.text.numbers",
      header: "ui.text.primary",
      tooltip: "ui.text.secondary",
    }[kind] || "ui.text.primary";

    const color = this.getColor(colorToken).hex;
    const stroke = this.getColor("ui.panel.edge").hex;

    return {
      fontFamily,
      fontSize: 8, // 1× authoring; scaled by camera (3×/4×)
      color,
      stroke,
      strokeThickness: 1,
    };
  }

  #fail(token) {
    if (!this.#warned.has(token)) {
      console.warn(`[ThemeLoader] Unknown token: ${token}`);
      this.#warned.add(token);
    }
    const hex = this.#palette["debug.mask.exclude"]?.hex || "#FF00FF";
    const int = parseInt(hex.replace("#","0x"), 16);
    return { hex, int };
  }
}
```

Usage patterns
- Gauges, minimap, hotbar, inventory, prompts: read colors via ThemeLoader.getColor(token).
- No inline hex. Component constructors accept token ids or pre-resolved colors from ThemeLoader.
- Text creation uses ThemeLoader.getTextStyle(kind).

---

## 11) Scene & Containers (Phaser 3 Implementation Notes)
- Dedicated HUDScene with fixed camera that ignores world transforms.
- Root containers (naming follows tools/ecs-registry.test.js pattern: dot-delimited lower-case):
  - hud.gauges (top-left)
  - hud.minimap (top-right)
  - hud.hotbar (bottom-center)
  - hud.prompts (bottom-left)
  - hud.notifications (top-center)
  - hud.inventory (overlay; hidden by default)

Scaling & layout
- On resize:
  - Recompute anchor rects using screen width/height at 1× logical scale.
  - Place containers using edge anchors and padding (16 px at 1×).
  - Snap all container x/y to integers; rely on HUD camera setRoundPixels(true).

Blend modes
- HUD: normal blend for all elements.
- Active hotbar glow: use additive or screen with mapping.lighting.lampWarm at 20–30% opacity.
- Telegraphs/effects: rendered below HUD in world scene, not part of HUDScene.

---

## 12) Data Bindings & Events
Subscribe to game events (via ECS or central event bus):

- player.health.changed → update health gauge fill length and numbers (ui.text.numbers).
- player.stamina.changed → update stamina gauge and low‑state pulsing toggle.
- inventory.changed → redraw grid, counts, and slot states.
- selection.hotbar.changed → update active slot highlight and focus ring.
- world.depth.scalar.changed → update minimap depth vignette intensity using mapping.depthTint.l0.
- ui.prompt.show / ui.prompt.hide → show/hide prompt pill (bottom-left).

Audio bindings (UI trifecta)
- ui.confirm on accept/commit actions.
- ui.cancel on dismiss/close.
- ui.notif for notification ribbon and significant state changes (inventory full, etc.).

---

## 13) States, Focus, and Input
- Focus ring (controller/keyboard): 1 px inner highlight + corner ticks (3 px ticks) drawn in ui.panel.edge inside the frame; never shifts layout.
- Tooltip behavior: 120 ms delay; persists while hovered/focused; clamps to screen edges; tracks cursor at 8 px offset (1×).
- Pause overlay: full-screen 40% black using ui.panel.shadow as color basis, alpha 0.4; HUD elements desaturated by ~20% (shader or tint matrix), interaction disabled except pause menu.

---

## 14) Accessibility & Contrast
- Colorblind safety:
  - Health: solid bar profile.
  - Stamina: chevron notches + pulsing stripe in low state.
  - Low‑health icon (heart) and low‑stamina icon (chevrons) overlay near respective gauges when thresholds are met.
- Text contrast targets:
  - ui.text.primary ≥ 4.5:1 vs ui.panel.bg.
  - ui.text.secondary ≥ 3:1 vs ui.panel.bg.
- Isolation: mapping.telegraph.* tokens are never reused for UI fills to prevent misassociation with critical world telegraphs.

---

## 15) Asset & Pipeline Notes
- Atlas:
  - Pack UI elements into ui.atlas.png/.json; frames include icons, chevrons, 9‑slice brass panel parts.
  - Use power‑of‑two texture sizes (e.g., 512×512) to ease GPU handling.
- 9‑slice:
  - Brass panels: corners (4×) + edges + center tile. Preserve 2 px frame thickness. Inner 1 px edge is separate overlay slice.
  - Minimap panel and prompt pill can use 9‑slice for scalable frames.
- Filtering:
  - Nearest-neighbor sampling only. Set game config pixelArt: true; set texture antialias to false.

---

## 16) Acceptance & QA Checklist
- Layout:
  - All HUD elements anchored, positioned, and sized per spec; scales cleanly at 3× and 4×.
- Gauges:
  - Health and stamina bars render at correct dimensions; stamina chevrons every 12 px; damage flash 120 ms; stamina low pulse under 20%.
- Minimap:
  - Uses minimap.* tokens; player/enemy/ore sizes 3×3/3×3/2×2 px at 1×; depth vignette responds to world.depth.scalar.
- Hotbar:
  - Active slot highlight visible (2 px stroke + lampWarm glow); keybind glyphs placed bottom-right; icons map from data/items/tools.json ui.iconKey.
- Inventory:
  - Grid aligns; drag/hover states brighten brass; invalid flicker 80 ms in ui.text.warning; tooltip styles match tokens.
- Text & Fonts:
  - Fonts load (WOFF2); crisp at 3×–4×; numbers are legible; no subpixel AA.
- Tokens:
  - No raw hex; all colors sourced via ThemeLoader from data/visual/color-palette.json. Unknown tokens fallback to debug.mask.exclude and warn once.
- Events:
  - Subscriptions update UI without stutter; audio ui.confirm/ui.cancel/ui.notif mapped appropriately.
- Implementation:
  - HUDScene implemented with fixed camera; containers named with dot‑delimited lower-case pattern; integer snapping verified.
  - ThemeLoader contract documented and implemented at src/ui/theme-loader.js with init, getColor, getTextStyle.

---

Brass holds the frame; crystal carries the truth. Build to the tokens, and the mine will read clean at three scales and two heartbeats.