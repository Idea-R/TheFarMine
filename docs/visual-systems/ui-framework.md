# UI Framework — Brass, Crystal, and Clear Reads (Sprint 1)

Owner: @eta (Visual Systems — Brightforge Crystalsmith)

Cross-references:
- data/visual/color-palette.json
- docs/visual-systems/style-guide.md
- docs/combat-systems/combat-design.md (§Stamina baseline, events)
- docs/technology-systems/crafting-design.md (§HUD tokens, mining cadence)
- docs/world-generation/cave-gen-algorithm.md (§Minimap raster)
- Planned: src/ui/theme-loader.js
- Planned: src/ui/hud/*.js modules


## 1) Title & Provenance
- This document is the authoritative Sprint 1 UI Framework spec for The Far Mine, authored in the Brightforge Crystalsmith workshop of Visual Systems. Implementation-ready; all colors must resolve from token names via the theme loader. No raw hex in code.


## 2) Design Pillars & MVP Goals
Design pillars:
- Clarity over clutter
- Brass framing with crystal accents
- Readable at 3x–4x scale
- Token-only colors (sourced exclusively from data/visual/color-palette.json)
- Minimal motion (sub-150 ms micro-animations) for feedback
- Screen-edge safe placement (no HUD encroachment on action bounds)
- Keyboard/mouse friendly, clean cursor affordances

MVP goals (Sprint 1):
- Fixed HUD with health and stamina gauges
- Hotbar (tools)
- Minimap
- Basic inventory grid overlay
- Tooltip system
- Dialog panel style
- All colors via data/visual/color-palette.json tokens


## 3) Display & Scaling Contracts
Base render assumptions:
- Base logical resolution: 320×180 (16:9). Primary desktop scale factors: 3x–4x (960×540 to 1280×720 logical upscales).
- Pixel snapping and rounding:
  - Use integer scale factors only (no fractional scaling) to preserve pixel-crisp edges.
  - In Phaser 3: set game config render.pixelArt = true, roundPixels = true; set cameras.main.roundPixels = true; when positioning UI, floor() final screen-space coordinates.
- Tile size (placeholder until confirmation):
  - If base tile is 16×16 (current assumption), 1 tile = 16 px at base scale; 2 tiles = 32 px.
  - If tile confirms to 32×32, double tile-derived values; computations below provide both 16- and 32-based notes.
- Expressing layout:
  - UI component sizes are given in absolute base pixels (px_base).
  - At runtime: px_screen = px_base × scale_factor.
  - For tile-relative placement at base: px_base = tiles × (tile_size_base). For 16→32 conversion, px_base_32 = px_base_16 × 2.
- Safe areas and margins:
  - Outer margin: 8 px at base (m_base = 8). Scales proportionally: m_screen = m_base × scale_factor.
  - After scaling, snap final positions to whole pixels.
  - Keep all 1 px borders at 1 px in base pixels before scale. Do not pseudo-scale border thickness.


## 4) Font Stack & Text Styles
- Primary pixel font: "Pixel Operator" (Regular and Bold).
- Fallbacks: "VT323", "Press Start 2P" (dense; reserve for headers only), system monospace as last resort.
- Web loading:
  - Ship WOFF2 variants; preload key styles for primary text. Use local() sources where available to reduce flash.
  - Licensing: "Pixel Operator" is free for commercial use; verify and attach license to repo in PR.
- Sizes at base scale (px_base):
  - ui.text.primary: 8 px
  - ui.text.secondary: 7 px
  - ui.text.muted: 7 px (lower contrast color token)
  - ui.text.warning: 8 px bold
- Letterspacing:
  - Pixel Operator: +0.25 px at base. Apply proportional tracking at scale, rounding to nearest 0.25 px before final whole-pixel snap.
- Smoothing:
  - Disable font smoothing where feasible; ensure pixelArt mode and roundPixels are active.
- Token mappings and contrast targets:
  - Tokens: ui.text.primary, ui.text.secondary, ui.text.muted, ui.text.warning
  - Contrast minimums over ui.panel.bg:
    - Primary ≥ 4.5:1
    - Secondary ≥ 3:1
  - If contrast fails at runtime theme, theme-loader should warn (log-once).


## 5) Token-Driven Theme Map (Authoritative)
Tokens consumed from data/visual/color-palette.json and their application:

- Frames and borders:
  - ui.frame.brass
  - ui.frame.copper
  - ui.panel.border
  - ui.panel.shadow

- Panels and text:
  - ui.panel.bg
  - ui.text.primary
  - ui.text.secondary
  - ui.text.muted
  - ui.text.warning

- Gauges:
  - ui.gauge.health.fill
  - ui.gauge.health.bg
  - ui.gauge.stamina.fill
  - ui.gauge.stamina.bg
  - ui.gauge.border

- Hotbar:
  - ui.hotbar.slot.bg
  - ui.hotbar.slot.active
  - ui.hotbar.slot.highlight
  - ui.icon.shadow

- Minimap:
  - minimap.bg
  - minimap.room
  - minimap.corridor
  - minimap.player
  - minimap.enemy
  - minimap.ore

- Mapping accents (visual cues, not for HUD fills; overlays reference only):
  - mapping.lighting.lampWarm
  - mapping.lighting.crystalCool
  - mapping.telegraph.arc.amber

Unknown tokens:
- UI must rely on theme-loader getColor(token). If token missing:
  - Log once: "theme:unknown-token:<token>"
  - Return debug.mask.exclude color (defined in palette) as fallback.


## 6) HUD Layout Spec (Coordinates, Anchors, Sizes)
Coordinate system:
- Origin: top-left (0,0) in base pixels (320×180).
- Safe margin: m = 8 px at base, scales proportionally.

Health/Stamina Gauges (top-left):
- Orientation: horizontal bars (stacked).
- Size per bar: width = 96 px, height = 8 px.
- Gap between bars: 4 px.
- Border: 1 px using ui.gauge.border; border inset (stroke centered inside bar rect).
- Fills: ui.gauge.health.fill and ui.gauge.stamina.fill.
- Background (underfill): ui.gauge.health.bg and ui.gauge.stamina.bg.
- Anchors and positions (base):
  - Health bar: x = m, y = m.
  - Stamina bar: x = m, y = m + 8 + 4 = m + 12.
- 16→32 tile note: these bars fit within 6 tiles (width) at 16 px; for a strict tile grid at 32 px, double to width 192 px, height 16 px, gap 8 px.

Hotbar (bottom-center):
- Slots: MVP supports 3–5; default 5 on wide screens.
- Slot size: 20×20 px (fits 16×16 icon with 2 px padding on each axis).
- Inter-slot gap: 2 px.
- States:
  - Inactive frame: ui.frame.brass
  - Active frame: ui.frame.copper
  - Slot background: ui.hotbar.slot.bg
  - Highlight overlay: ui.hotbar.slot.highlight (pulse on selection)
- Position (base):
  - n = slots_on_screen (default 5; compact 4 if width < 360 px; see Compact Layout).
  - total_w = n*20 + (n-1)*2.
  - x_origin = floor((screenW_base - total_w)/2).
  - y = screenH_base - m - 20.
  - Slot i rect: x_i = x_origin + i*(20+2), y_i = y.
- Animation:
  - Active slot pulse: brightness pulse 100% → 80% over 120 ms then ease back to 100% over 120 ms (one cycle on selection).
  - Optional highlight sweep: 250 ms left-to-right line using ui.hotbar.slot.highlight at 30% alpha.

Minimap (top-right):
- Panel size: 72×72 px at base.
- Border: 1 px using ui.panel.border.
- Shadow: ui.panel.shadow, 1 px offset, alpha 0.3.
- Background: minimap.bg.
- Player blip: 2×2 px, color minimap.player.
- Anchor:
  - x = screenW_base - m - 72
  - y = m
- Raster content:
  - Drawn inside with 1 px cells mapping worldgen raster to tokens (see §10).

Tooltip (contextual):
- Positioning:
  - Preferred: near cursor with offset (cursor_x + 8, cursor_y + 8), clamped to remain within screen minus safe margins.
  - Fallback (controller/no cursor): centered above hotbar, anchored to hotbar’s top edge minus 6 px.
- Panel:
  - Padding: 4 px all sides.
  - Background: ui.panel.bg; 1 px border ui.panel.border; shadow ui.panel.shadow.
- Text:
  - Primary line: ui.text.primary.
  - Secondary/muted details: ui.text.muted.
  - Warn variant: ui.text.warning.

Dialog panel (tavern and narrative):
- Width: max(70% of screen width, 220 px).
- Height: auto; max height: 70% of screen height with scroll if overflow (mouse wheel and drag scrollbar planned).
- Center screen; maintain safe margins.
- Portrait area: reserved box on left (future Sprint): width 64–96 px base (do not render in Sprint 1; leave padding).
- Close button: top-right corner of panel interior; use ui.frame.copper accent + icon with ui.icon.shadow at 30% alpha.
- Text: primary for body, secondary for speaker tags, warning for critical choices.

Compact layout (small screens):
- Condition: if screen width < 360 px (base-equivalent).
- Hotbar: reduce to 4 slots; recompute total_w and center as above.
- Minimap: shrink to 56×56 px; keep border at 1 px; same anchor rule.
- Gauges: unchanged; if overlap risk, allow hotbar y = screenH - m - 18 (reduce slot height to 18, icon 14, padding 2) as emergency compact variant.

Z-order/depth:
- Panels and HUD: Z_UI = 9000
- Tooltips: 9050
- Dialog: 9100
- Debug overlays: 9990


## 7) Components & Phaser 3 Integration Plan
Containers and IDs (authoritative):
- this.uiRoot (Phaser.Scene add.layer or container; depth = Z_UI)
- this.hud.gauges.healthBar
- this.hud.gauges.staminaBar
- this.hud.hotbar.container, children: slot_i (0..N-1)
- this.hud.minimap.container, this.hud.minimap.raster
- this.ui.tooltip.container
- this.ui.dialog.container

Construction order and lifecycle:
- create():
  - Initialize theme via theme-loader (await theme readiness if async).
  - Build uiRoot, set depth and roundPixels.
  - Draw vector frames with 1 px rects; pre-render repeated frames to RenderTexture or cached Graphics for performance.
  - Instantiate gauges, hotbar, minimap, tooltip container (hidden), dialog container (hidden).
  - Register event listeners (see bridges below).
- update(time, delta):
  - Apply micro-animations (pulses, sweeps, shakes) respecting ≤ 150 ms guidance.
  - Process throttled minimap updates (≤ 4 Hz) and camera-move triggers.
  - Clamp and snap positions after any camera or scale change.

Event bridges (contracts):
- Health/Stamina updates:
  - Source: ECS patches or domain events ("Health.value", "Stamina.value") containing current and max.
  - Behavior: Adjust bar fill width; apply color pulse when ≤ 25% (low).
- Hotbar selection:
  - Event: ui.hotbar.select(index)
  - Behavior: Set selected slot, play 120 ms pulse and optional 250 ms sweep.
- Inventory overlay toggle:
  - Event: ui.inventory.toggle()
  - Behavior: Show/hide inventory grid overlay; pause world input when open (engine-side).
- Minimap raster:
  - Event: world.minimap.update with uint8[][] payload.
  - Behavior: Recolor and blit using token map in §10.


## 8) Bars & Animation Micro-Cues
- Fill behavior:
  - MVP: immediate value jump accepted.
  - Optional easing: decreases ease-out 80 ms; increases ease-in 120 ms.
- Low-health pulse:
  - Threshold: ≤ 25% of max.
  - Effect: Bar border shifts toward ui.frame.copper at 2 Hz; overlay 30% alpha copper strip or entire border blink (2 Hz cap).
- Stamina deny feedback:
  - Trigger: Attempt action with insufficient stamina.
  - Effect: Bar container shake ±2 px over 90 ms; play tooltip.warn SFX (hook to audio domain).


## 9) Hotbar & Inventory UX
- Slot states:
  - empty
  - filled
  - selected
  - on-cooldown (future; dim overlay + radial wedge not in Sprint 1)
- Visuals:
  - Selected: ui.hotbar.slot.active frame; selection pulse 120 ms; optional 250 ms highlight sweep.
  - Empty: ui.hotbar.slot.bg only; show faint placeholder grid (1 px cross) optional.
- Input mapping hints:
  - Small key numbers above slots; ui.text.secondary; nudge y by -6 px from slot top.
- Inventory grid overlay:
  - Grid: 5×4 slots (MVP); slot size = hotbar slot size; same padding rules.
  - Scrolling: if more items, vertical scroll pages (Sprint 2).
  - Drag-and-drop: while dragging, render item icon with ui.icon.shadow at 30% alpha; snap to slots on drop.


## 10) Minimap Rendering Rules
- Raster source:
  - From worldgen: uint8 grid (0 bg, 1 room, 2 corridor, 3 ore).
- Token map:
  - 0 → minimap.bg (panel interior fill also uses ui.panel.bg behind raster for contrast)
  - 1 → minimap.room
  - 2 → minimap.corridor
  - 3 → minimap.ore
- Overlays:
  - Player blip: minimap.player, 2×2 px square at player’s tile-aligned position.
  - Enemy blips: minimap.enemy, 2×2 px squares layered above raster.
- Frame:
  - Border: ui.panel.border (1 px)
  - Shadow: ui.panel.shadow (offset 1 px, alpha 0.3)
- Update cadence:
  - On scene load (full draw)
  - Then throttled to 4 Hz OR immediately when camera movement exceeds 8 px since last draw (whichever first).


## 11) Theme Loader API Contract (for src/ui/theme-loader.js)
API (authoritative):
- getColor(token: string) → { hex: string, int: number }
  - Resolves token from data/visual/color-palette.json.
  - On unknown: log-once and return getColor("debug.mask.exclude").
- getTextStyle(kind: 'primary' | 'secondary' | 'muted' | 'warning') → Phaser TextStyle
  - Includes: fontFamily (stack), fontSize (per §4), fontStyle (bold for warning), letterSpacing, color (hex), align: 'left', resolution consistent with scale, metrics tuned for pixelArt.
- applyPanelStyle(graphics, { bgToken, borderToken, shadowToken })
  - Draw order: shadow (offset 1 px, alpha 0.3) → bg fill → 1 px border.
  - Uses tokens (default to ui.panel.bg/ui.panel.border/ui.panel.shadow if args absent).
- Logging policy:
  - onUnknownToken(token): log-once (console.warn) with token id and fallback token used.

Implementation notes:
- No raw hex in callers; theme-loader is single source of color truth.
- Provide getGaugeStyle(kind: 'health'|'stamina') helper (optional) mapping to fill/bg/border tokens for consistency.


## 12) Accessibility & Contrast
- Contrast targets:
  - Primary text ≥ 4.5:1 over ui.panel.bg
  - Secondary text ≥ 3:1 over ui.panel.bg
- Gauge distinguishability:
  - Health vs Stamina must differ by hue family and be outlined by ui.gauge.border.
- Non-color redundancies:
  - Distinct icon shapes for key states (e.g., pick vs drill), selected slot additional border thickness or corner nibs (1 px triangles).
- Motion safety:
  - All pulses ≤ 2 Hz.
  - Provide global toggle to disable pulses and shakes; respect OS “reduced motion” flag if detected.


## 13) Asset & Icon Guidance
- Icon atlas keys (from tools.json):
  - ui/icon.tools.pick_t1_24
  - ui/icon.tools.pick_t2_24
  - ui/icon.tools.drill_t3_24
- Sizing:
  - Icons intended for 16×16 rendering within 20×20 slots (2 px padding). 24 px sources may be downsampled; prefer native 16 px variants to avoid blur.
- Shadows:
  - Use ui.icon.shadow at 30% alpha.
  - Avoid Gaussian blur; use solid offset 1 px for pixel-crisp silhouette.


## 14) Implementation Checklist (Acceptance)
- HUD constructed with token-only colors resolved from data/visual/color-palette.json via theme-loader.
- Health/Stamina bars, hotbar, and minimap placed exactly per spec; responsive to events listed.
- Font stack ("Pixel Operator" with fallbacks) loaded; text styles applied; contrast targets met or warnings logged.
- Phaser containers and IDs match this document namespacing.
- No raw hex literals in code; all color usage routed through theme-loader.
- Pixel-crisp rendering verified at 3x and 4x scales; borders remain 1 px at base per-scale.
- Compact layout engages correctly when width < 360 px (4-slot hotbar, 56×56 minimap).


## 15) Open Questions & Versioning
Open questions (to confirm in Sprint 1):
- Base tile size: 16×16 vs 32×32 (document currently assumes 16×16; doubles scale for 32×32).
- Base logical resolution: 320×180 chosen for Sprint 1; confirm against camera and tile visibility goals.
- Final font pick: validate "Pixel Operator" legibility in-engine at 3x–4x; if not, trial "VT323" or a bitmap font export.

Versioning policy:
- Minor version bump for token additions/renames that do not alter anchors or container IDs; minor for placement tweaks within same anchors.
- Major version bump required if anchors, container IDs, event names, or base sizes change (breaking integration for src/ui/hud or theme-loader).
- Patch version for non-breaking clarifications and copy edits.

— Brightforge Crystalsmith, keeping the brass bright, the crystal clean, and the reads clear.