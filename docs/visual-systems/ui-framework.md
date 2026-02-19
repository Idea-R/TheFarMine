# The Far Mine — UI Framework (Sprint 1)

Author: Brightforge Crystalsmith (Eta)  
Version/Date: Draft v0.1 — 2026-02-19  
Status: Draft v0.1

Scope
- HUD and core menus for Mine L1 vertical slice at 1080p baseline.
- Engine-agnostic; includes Bevy integration notes.
- Aligns to data/visual/color-palette.json tokens and ECS Events/Components.
- Screen-space UI only (no 3D diegetic UIs in Sprint 1).


## 2) Visual Theme & Materials

Style notes (brass-and-crystal)
- Materials: warm brass frames with subtle bevel hints; crystal inlays for accents and selection states.
- Highlights: inner highlights along top/left edges (1 px inner line) and faint specular notches at corners. Avoid plastic shine.
- Shadows: restrained drop-shadows (1–2 px radius/offset at 1080p), scaled with UI scale factor. No heavy glow except for focus/emphasis.
- Runes: reserved for emphasis (selection, key focus, rare items) and should be sparse and readable.

Token mapping reference (color-palette.json)
- ui.panel.* — panel background/border/accent/fill.
- ui.bar.* — progress bars (health, stamina): back/fill/border.
- ui.hotbar.* — slot background/border/selection/focus.
- ui.icon.* — default/active/disabled tints.
- ui.text.* — primary/secondary/inverse/warn/error/info/success.
- ui.cursor — base cursor color(s)/outline.
- fx.ui_focus — pulse ring color/emissive.
- minimap.* — bg/ring/ticks/player/ally/poi.


## 3) Typography & Scale

Font shortlist (licenses; roles)
- Headers: Cinzel (OFL) or Caudex (OFL). Fallback: "Times New Roman", serif.
- Body: Inter (OFL) or Source Sans 3 (OFL). Fallback: Arial, Helvetica, sans-serif.
- Mono/Numeric: JetBrains Mono (OFL) or Roboto Mono (Apache 2.0). Fallback: "Courier New", monospace.
- Numeric readouts prefer tabular-nums (OpenType feature) where supported.

Type scale (1080p logical)
- Sizes (px): 12 (caption/meta), 14 (body min), 16 (body default), 20 (subhead), 24 (title).
- Pixel rounding: snap font size and baseline to integer pixels; align text containers to whole pixels; avoid subpixel scaling of glyphs.
- Line heights: 1.25–1.35 for body; 1.1–1.2 for UI labels.
- Accessibility: body text ≥14 px logical at 1.0 scale; ensure contrast pairs per accessibility.contrast_pairs (see palette). Minimum hit targets ≥32x32 px logical.


## 4) Layout Grid & Safe Areas

Grid (1920x1080)
- Safe margins: 24 px on all sides.
- 12-column grid inside safe area; gutter 16 px.
- Content width inside safe: 1920 − 48 = 1872 px. Gutters total: 11 × 16 = 176 px. Column width: (1872 − 176) / 12 ≈ 141.33 px.
- Placement guidance: use column multiples; round widths to even pixels to maintain crisp edges.

Scale policy
- Baseline scale = 1.0 at 1080p.
- Clamp overall UI scale between 0.85× and 1.25× (e.g., 720p → 0.85×; 1440p → 1.25×).
- Bars, icons, and borders snap to even pixel edges at final scale.

Z-order and layering
- HUD > tooltips > diegetic markers (world-space). Keep modals above all HUD.
- Reserved torso band: center-bottom 25% width × 15% height to avoid covering player torso.
  - At 1920×1080: 480×162 px, anchored bottom center, y = 1080 − 24 − 162 = 894, x = (1920 − 480)/2 = 720.


## 5) HUD Wireframe (Text Spec + ASCII Diagram)

Elements and positions (1080p, scale 1.0)
- Health/Stamina Bars (bottom-left, stacked)
  - Size each: 360×20 px. Spacing: 8 px vertical.
  - Stamina (lower): x=24, y=1080−24−20=1036.
  - Health (upper): x=24, y=1008.
  - Tokens: ui.bar.health.*, ui.bar.stamina.*. Numeric value right-aligned inside bar; reserve 60 px at right for numbers (tabular-nums).

- Tool/Hotbar (bottom-center, 5–7 slots)
  - Slot: 64×64 px; gap 8 px. 7 slots width: 7×64 + 6×8 = 496 px.
  - Origin: x=(1920−496)/2=712, y=1080−24−64=992.
  - Tokens: ui.hotbar.slot_bg, ui.hotbar.border, ui.hotbar.selection, ui.text.secondary for keybinds.

- Minimap (top-right)
  - Size: 240×240 px; mask circular or rounded-square (r=16 px).
  - x=1920−24−240=1656, y=48 (with compass above).
  - Tokens: minimap.bg, minimap.ring, minimap.tick_major (N/E/S/W), minimap.tick_minor, minimap.player, minimap.poi.

- Compass ribbon (optional MVP)
  - Size: 240×16 px. x=1656, y=24. Heading tick centered; faint degree ticks.

- Interaction Prompt (above hotbar center)
  - Size: 640×32 px; center-aligned text with inline icon (24 px).
  - x=(1920−640)/2=640, y=944.
  - Tokens: ui.tooltip.bg/border, ui.text.primary, ui.icon.active.

- Ore Pickup Toasts (right of center-top)
  - Card: 360×56 px; queue downward; slide-in from +24 px x over 120 ms.
  - First toast: x=1160, y=24. Vertical spacing: 8 px.
  - Tokens: ui.info or ui.success variants; ui.text.inverse for text on colored bg.

Spacing, radii, shadows
- Inter-module spacing: 8–16 px. Internal padding for panels/cards: 12–16 px.
- Border radii: small (4 px) for bars/slots; medium (8–12 px) for panels/cards; minimap mask r=16 px if rounded-square.
- Drop-shadows: 1–2 px offset and radius, low opacity; scale with UI scale.

ASCII keylines (1080p overview, not to scale)
```
(0,0) +-----------------------------------------------------------------------------------+ (1920,0)
      |                                                                     [Compass]    |
      |                                                                 (1656,24 240x16)|
      |                                                           [Minimap 240x240]      |
      |                                                          (1656,48 to 1896,288)   |
      |                                                                                   |
      |                                   [Ore Toasts 360x56]                             |
      |                                   (1160,24)  stack ↓ (8 px)                       |
      |                                                                                   |
      |                                                                                   |
      |                                                                                   |
      |                                         [Interaction Prompt 640x32]               |
      |                                         (640,944)                                 |
      |                                                                                   |
      |         [Health 360x20] (24,1008)                                                 |
      |         [Stamina 360x20] (24,1036)                                                |
      |                                                                 [Hotbar 496x64]   |
      |                                                                 (712,992)         |
(0,1080)+---------------------------------------------------------------------------------+(1920,1080)
```
Reserved torso band (no HUD overlap): (720,894) → (1200,1056)


## 6) Inventory & Panel Wireframes (MVP)

Inventory panel
- Placement: center-left; panel body inside grid bounds.
- Grid: 8×4 slots; slot 48×48 px; gap 8 px. Grid size: width 8×48 + 7×8 = 440 px; height 4×48 + 3×8 = 216 px.
- Panel container: ~520×360 px (includes header, padding 16 px).
- Scroll: vertical if more than 32 items; wheel scroll 48 px per notch; scrollbar 6 px track, 12 px thumb min height.
- Hover tooltip: name (ui.text.primary), rarity tint strip (2–3 px at top, optional), short description (ui.text.secondary). Appears with 80 ms delay, offset (12,12).
- Drag: LMB hold 120 ms → drag icon; drag ghost at 80% scale; valid target highlights with ui.hotbar.selection; invalid target uses ui.cursor.invalid and red ring.
- Right-side detail panel: ~520×360 px to the right (gap 24 px). Shows large icon (96 px), name, stats, actions (Equip/Use/Drop).

Crafting panel stub
- Two columns in one panel:
  - Left: recipe list (filters as tabs above; tab min width 96 px). List row 48 px height with icon + name + rarity pip.
  - Right: recipe detail showing inputs (slots with counts), outputs (preview), Craft button.
- Disabled states: 60% opacity; desaturate icons by shifting to ui.icon.disabled; bar/button outlines remain visible with ui.panel.border.
- Progress bar: 240×12 px; tokens ui.bar.craft.back/fill; text overlay % (tabular-nums). Animate fill over craft duration; ease linear.

Panel tokens
- ui.panel.bg, ui.panel.border, ui.panel.accent
- ui.text.primary, ui.text.secondary
- ui.icon.default, ui.icon.active, ui.icon.disabled


## 7) States & Interactions

Buttons/slots
- Rest: panel/slot bg with border; icon tinted ui.icon.default.
- Hover: raise brightness +4–6%; add 1 px inner highlight; cursor = ui.cursor.default.
- Focus (keyboard/gamepad): fx.ui_focus ring (2 px) pulsing 1.2× scale of ring over 900 ms.
- Active/Pressed: depress 1 px; darker fill −6–8%; play sfx tag ui.click.
- Selection (hotbar/item): ui.hotbar.selection overlay (crystal glow) + rune accent at top edge.

Feedback colors and motion
- Error: ui.text.error or bg error with inverse text; shake 2 px for 80 ms (max 2 iterations).
- Warn: gentle pulse (opacity 90%→100%) 120 ms x3.
- Info/Success: slide-in 120 ms; fade-out 180 ms.

Cursor styles
- Default pointer (ui.cursor.default).
- Drag (ui.cursor.drag) with carried icon.
- Invalid (ui.cursor.invalid) with small red cross overlay.


## 8) Data & Token Contracts

Consumed tokens (color-palette.json)
- ui.panel.bg, ui.panel.border, ui.panel.accent
- ui.bar.health.back, ui.bar.health.fill, ui.bar.health.border
- ui.bar.stamina.back, ui.bar.stamina.fill, ui.bar.stamina.border
- ui.bar.craft.back, ui.bar.craft.fill
- ui.hotbar.slot_bg, ui.hotbar.border, ui.hotbar.selection
- ui.tooltip.bg, ui.tooltip.border
- ui.text.primary, ui.text.secondary, ui.text.inverse, ui.text.warn, ui.text.error, ui.text.info, ui.text.success
- ui.icon.default, ui.icon.active, ui.icon.disabled
- ui.cursor.default, ui.cursor.drag, ui.cursor.invalid
- fx.ui_focus.ring, fx.ui_focus.fill
- minimap.bg, minimap.ring, minimap.tick_major, minimap.tick_minor, minimap.player, minimap.ally, minimap.poi
- accessibility.contrast_pairs (pairs by key, e.g., text_primary_on_panel_bg)

Compact mapping table
| Element | Token(s) | Notes |
|---|---|---|
| Panels (bg/border) | ui.panel.bg, ui.panel.border | Nine-slice frame (3–4 px). |
| Panel accents | ui.panel.accent | Headers, separators. |
| Health bar | ui.bar.health.back/fill/border | Numeric uses ui.text.inverse within fill. |
| Stamina bar | ui.bar.stamina.back/fill/border | Same layout as health. |
| Craft progress | ui.bar.craft.back/fill | Linear fill L→R. |
| Hotbar slot | ui.hotbar.slot_bg, ui.hotbar.border | Keybind text = ui.text.secondary. |
| Hotbar selection | ui.hotbar.selection | Crystal glow overlay; add fx.ui_focus ring when focused. |
| Tooltips | ui.tooltip.bg, ui.tooltip.border, ui.text.primary | Shadow 1 px; arrow optional. |
| Minimap | minimap.* | Masked circle or r=16 square. |
| Text default | ui.text.primary, ui.text.secondary | Contrast vs. bg per accessibility pairs. |
| Status text | ui.text.warn/error/info/success | Toasts/prompts. |
| Icons | ui.icon.default/active/disabled | 1–2 bit tinting only. |
| Cursor | ui.cursor.default/drag/invalid | Swap on drag/invalid targets. |
| Focus ring | fx.ui_focus.ring/fill | 2 px ring, pulse. |

Iconography rules
- Icons authored on a 16 px minimum grid; export at 1x (vector or crisp bitmap); align to even pixels when scaled.
- 1-bit/2-bit tinting only; no baked gradients; rely on ui.icon.* tints.
- Stroke weights: 1–1.5 px at 16 px base; scale proportionally.


## 9) Integration Notes (Bevy/ECS)

Components/Events
- Resource: UIState { inventory_open: bool, crafting_open: bool, hotbar_selection: u8, scale: f32 }
- Event: UiCommand { kind: Click/Open/Close, target: UiTargetId }
- Event: PlaySfxEvent { tag: "ui.click" | "ui.open" | "ui.close" | "ui.error" } (per audio doc)
- Systems: route input → UiCommand; open/close transitions with 80–120 ms tween.

Asset pipeline
- Icons: atlas "ui/icons@1x.png" with JSON/ron map; names: tool_<id>, res_<id>, sys_<name>.
- Panels: nine-slice frames; frame thickness 3–4 px (outer border included).
- Fonts: load as assets with feature flags for tabular-nums where available.

Scaling in Bevy UI
- Use logical units and apply a UI scale factor resource (targeting 1.0 at 1080p).
- Derive: ui_scale = clamp(screen_height / 1080.0, 0.85, 1.25).
- Set ImagePlugin to nearest for pixel-perfect sprites; round node sizes/positions to integers post-scale.
- Snap transform rounding: round translation.xy after layout.


## 10) Acceptance & Test Plan

Checklist
- HUD positions match coordinates at 1080p baseline.
- Contrast meets accessibility.contrast_pairs for all text vs. bg.
- Wireframes render with placeholder assets (solid fills, 1–2 px borders).
- Hotbar selection visibly distinct (glow + ring).
- Minimap legible at 240×240 px; N/E/S/W ticks readable.
- All body text ≥14 px logical; hit targets ≥32×32 px.

Manual test matrix
- 1920×1080 fullscreen (scale=1.0): verify pixel-snapped edges; no overlap with torso band.
- 2560×1440 fullscreen (scale→1.25 clamp): verify scaled shadows/borders; hotspots still ≥32 px.
- 1280×720 windowed (scale→0.85 clamp): verify text legibility; minimap still ≥204×204 px after scale; hotbar centered and unobstructed.


## Appendices

A) HUD ASCII diagram with labeled coordinates/sizes
```
Top-right:
  Compass: (1656,24) 240x16
  Minimap: (1656,48) 240x240, circular/rounded mask

Top-center-right:
  Ore Toasts: first at (1160,24) 360x56, next y+=64 (56+8)

Bottom-center:
  Hotbar: origin (712,992), 7 slots 64x64, gap 8; total 496x64

Bottom-left:
  Health:  (24,1008) 360x20 (health on top)
  Stamina: (24,1036) 360x20

Center-bottom reserved torso band:
  (720,894) → (1200,1056) no HUD overlap
```

B) Token swatch mini-map (hex from palette)
- Note: Use actual hex from data/visual/color-palette.json during implementation; examples below must be replaced by palette values.
- ui.panel.bg — [hex from palette]
- ui.panel.border — [hex from palette]
- ui.bar.health.fill — [hex from palette]
- ui.bar.stamina.fill — [hex from palette]
- ui.hotbar.selection — [hex from palette]
- ui.text.primary — [hex from palette]
- ui.text.inverse — [hex from palette]
- ui.icon.active — [hex from palette]
- fx.ui_focus.ring — [hex from palette]
- minimap.ring — [hex from palette]