# The Far Mine — UI Framework & HUD v0.1 (Sprint 1)

Owner: Brightforge Crystalsmith (Eta)  
Version: v0.1 • Date: 2026-02-18

Scope: MVP HUD (health, stamina, tool, minimap/compass, hotbar), menu/inventory placement, typography, spacing, tokens, and Bevy integration hooks. This doc is implementation-ready for wiring the Bevy UI, HUD layout, and color/font assets.


## 1) Baseline & Grid

- Resolution target: 1920x1080 (1080p reference).
- Tile size: 16 px; scale factor: 3x–4x (test both; default 3x for MVP build).
- Layout grid: 8 px base unit (aligned to tile multiples: 8, 16, 24, 32).
- Safe margins: 24 px inset from all edges.
- Z-layers:
  - gameplay: 0
  - HUD: 100
  - overlays/tooltips: 200
  - debug: 900


## 2) Typography (shortlist + usage)

- Primary UI: Atkinson Hyperlegible (Regular/Bold)
  - Usage: labels, HUD numerals, notifications.
  - Sizes (3x default): primary 18 px; secondary 16 px. Numerals can be optically nudged +1 px tracking when needed.
- Alternate fallback: Inter (Medium/Bold)
  - Usage: automatic fallback with similar metrics.
- Pixel accent (numbers-only option): VT323 (Regular)
  - Usage: counters/timers only; avoid for paragraph labels due to readability.
- Guidance:
  - Avoid faux-outline. Use subtle shadow:
    - Preferred: soft shadow using effects.smoke.steam at 30% alpha, 1–2 px offset.
    - Alternate: 1 px drop using terrain.rock.shadow.
- Licensing: Open-source (SIL/OFL).
- Font asset paths:
  - assets/fonts/AtkinsonHyperlegible/AtkinsonHyperlegible-Regular.ttf
  - assets/fonts/AtkinsonHyperlegible/AtkinsonHyperlegible-Bold.ttf
  - assets/fonts/Inter/Inter-Medium.ttf
  - assets/fonts/Inter/Inter-Bold.ttf
  - assets/fonts/VT323/VT323-Regular.ttf


## 3) Color Tokens & Accessibility

- Palette source: data/visual/color-palette.json (version 1, author eta).
- Core UI tokens (exact ids):
  - ui.panel.bg, ui.panel.bg_inverted
  - ui.panel.frame.brass, ui.panel.frame.rivet
  - ui.accent.brass, ui.accent.crystal
  - ui.text.primary, ui.text.secondary, ui.text.inverted
  - ui.health.bar, ui.health.bar_shadow
  - ui.stamina.bar, ui.stamina.bar_shadow
  - ui.icon.slot.bg, ui.icon.slot.border
  - ui.cursor.highlight
- Minimap tokens (mapping.*):
  - mapping.minimap.bg
  - mapping.minimap.rock, mapping.minimap.floor
  - mapping.minimap.ore.copper, mapping.minimap.ore.iron
  - mapping.minimap.player, mapping.minimap.enemy, mapping.minimap.exit
- Contrast targets:
  - Primary text ≥ 4.5:1 on ui.panel.bg
  - Secondary text ≥ 3.0:1 on ui.panel.bg
  - Inverted text ≥ 4.5:1 on ui.panel.bg_inverted
- Accessibility audit: Pending. Verify in-engine at 3x and 4x scale; adjust ui.text.* or panel bg tokens if sub-threshold.


## 4) HUD Layout (positions/sizes/tokens)

Top-left cluster (Health/Stamina) — anchor at (24, 24):
- Health bar
  - id: hud.health_bar
  - pos: x=24, y=24; size: w=280, h=18
  - fill: ui.health.bar; track: ui.health.bar_shadow
  - frame: ui.panel.frame.brass (2 px stroke)
  - text: Atkinson Bold 18 px, color ui.text.primary, content "current/max"
- Stamina bar
  - id: hud.stamina_bar
  - pos: x=24, y=48; size: w=220, h=12 (6 px gap below health)
  - fill: ui.stamina.bar; track: ui.stamina.bar_shadow
  - frame: ui.panel.frame.brass (1–2 px)
  - text: optional percent label right-aligned in bar, ui.text.secondary 16 px

Tool readout (below stamina):
- Icon slot
  - id: hud.tool.icon_slot
  - pos: x=24, y=68; size: w=40, h=40
  - bg: ui.icon.slot.bg; border: ui.icon.slot.border (2 px)
  - icon render: up to 32x32 artwork; scale-to-fit in a 28x28 content box centered (leave 6 px inner padding)
- Tool label
  - id: hud.tool.label
  - pos: x=24+40+8=72, y=68; size: w=320, h=20
  - font: Atkinson 16 px; color: ui.text.secondary
  - content: current tool name (“Copper Pick”)
- Durability strip
  - id: hud.tool.durability
  - pos: x=28, y=108; size: w=32, h=2
  - style: ui.panel.frame.rivet ticks (segment the 32 px width into pips; fill proportionally)

Top-right minimap/compass — anchor at (screen_right - 24, 24):
- Minimap panel
  - id: hud.minimap.panel
  - outer frame box: w=200, h=136; top-left at x=1696, y=24
  - viewport (content): w=192, h=128; inset by 4 px each side
  - bg: mapping.minimap.bg
  - frame: ui.panel.frame.brass (2 px); corner rivets: ui.panel.frame.rivet
  - color mapping: mapping.minimap.rock/floor/ore.copper/ore.iron/player/enemy/exit
- Compass ring (overlay)
  - id: hud.minimap.compass
  - thin ring drawn over panel viewport; stroke: ui.accent.brass (1–2 px)
  - cardinal ticks at N/E/S/W; optional “N” rune in ui.text.secondary 14 px

Bottom-center hotbar:
- Bar container
  - id: hud.hotbar
  - row of 5 slots; each slot w=40, h=40; gutter=8
  - total width=232; anchor center-bottom
  - first slot top-left: x=844, y=1016
- Slots
  - ids: hud.hotbar.slot_1 .. slot_5
  - slot bg/border: ui.icon.slot.bg / ui.icon.slot.border
  - selected highlight: ui.cursor.highlight (2 px outer stroke anim)
  - quick key labels: “1–5” at slot top-left, inset 3 px, ui.text.secondary 14–16 px
  - icon content box per slot: 28x28 centered; scale icons to fit

Notifications (top-center):
- Toast panel
  - id: hud.toast
  - auto-width; max 640 px; min 240 px; height auto (single line)
  - anchor top-center at y=24; bg=ui.panel.bg_inverted; text=ui.text.inverted; frame=ui.panel.frame.brass
  - used for “Recipe learned”, “Craft complete” (paired SFX: ui.craft.complete)

Tooltip (hover/inspect):
- id: hud.tooltip
- small inverted panel near cursor (offset: +12 x, +12 y)
- tokens: ui.panel.bg_inverted + ui.text.inverted
- z: 200


## 5) ASCII Wireframe (1080p reference)

+--------------------------------------------------------------1920px--------------------------------------------------------------+
| HLTH[██████████████████████████████████████      ]  STAM[██████████████      ]                                                 MM |
| Tool: [◼] Copper Pick  Dur||||                                                                                                  |
|                                                                                                                             +----|
|                                                                                                                             |MAP |
|                                                                                                                             |    |
|                                                                                                                             |    |
|                                                                                                                             +----|
|                                                                                                                                |
|                                                                                                                                |
|                                                          GAMEPLAY AREA                                                         |
|                                                                                                                                |
|                                                                                                                                |
|                                                                                                                                |
|                                                     [1][2][3][4][5]                                                            |
+-------------------------------------------------------------------------------------------------------------------------------+

Legend: HLTH uses ui.health.*, STAM uses ui.stamina.*, Tool slot uses ui.icon.slot.*, map uses mapping.minimap.*.


## 6) Interaction & States

- Damage flash: pulse health bar fill to effects.hit.flash for 50–80 ms on DamageEvent; do not recolor text to avoid flicker.
- Low stamina: when <20%, overlay ui.stamina.bar_shadow at 40% alpha pulsing at 600 ms; limit to ≤2 Hz.
- Selection focus: hotbar selected slot border animates with ui.cursor.highlight (2 px outer stroke, subtle 800 ms glow loop).
- Disabled slot: dim slot bg to 60% alpha overlay of terrain.rock.shadow; keep border visible at 100% to retain affordance.
- Tooltip show/hide: fade 80 ms in/out; clamp inside screen bounds with 12 px padding.


## 7) Bevy Integration Notes

Components/Resources:
- Resource: UIState { hud_visible: bool, focus_slot: Option<u8> }
- Components: Health { current, max }, Stamina { current, max }, Inventory, Tool { id, name, icon_index, durability, durability_max }
- Resource: ColorLUT(HashMap<String, Color>) loaded from data/visual/color-palette.json
- Resource: MinimapBuffer { width, height, tiles: Vec<TileKind> }

Events:
- UiCommand { action: UiAction, payload: Option<String> } 
  - actions: ui.navigate, ui.confirm, ui.error, ui.craft.complete
- PlaySfxEvent { id: SfxId } for sounds (e.g., SfxId::UiCraftComplete)

Systems/Plugins:
- HudLayoutPlugin
  - On startup: spawn root nodes with absolute anchors; read window size; compute scale = max(1.0, min(w/1920.0, h/1080.0)); apply to HUD via Transform scale or Style with percent/px mix; letterbox-safe (do not exceed reference layout bounds).
  - Spawn node ids as described (see Appendix B).
- HudUpdateSystem
  - Subscribe to Health/Stamina changes; set bar widths to w * (current/max)
  - Query Tool; set icon atlas index, label text, durability pips (floor(dur/max * 32))
  - Manage hotbar selection highlight from UIState.focus_slot
- MinimapSystem (stub)
  - Draw 1 px cells (at HUD scale) into a texture; color map via mapping.minimap.* tokens
  - Update player/enemy markers each frame; clamp to viewport
- ToastSystem
  - Listen for UiCommand::ui.craft.complete → show hud.toast, fire PlaySfxEvent(SfxId::UiCraftComplete), auto-hide after 2.5 s

Assets:
- Fonts: assets/fonts/… (see Typography)
- Frames/rivets (nine-slice): assets/ui/frames/brass_frame_9s.png, assets/ui/frames/rivet.png (MVP placeholders OK)
- Icon atlas: assets/ui/icons.png (includes tools/resources)
- Minimap render target: assets/runtime/minimap.png (generated at runtime)

Token → Color mapping:
- At init, read data/visual/color-palette.json; build ColorLUT keyed by token id string; UI nodes read from ColorLUT once and cache handles. Provide dev command to reload palette at runtime (debug layer 900).


## 8) Sizing & Spacing Scale

- Spacing scale: 4 / 8 / 12 / 16 px; default gutter: 8 px; outer margin: 24 px.
- Bars: heights: 6 / 12 / 18 px; rounded ends optional (radius 4 px; masked by brass frame).
- Icons: artwork 32x32; render within 28x28 content box inside 40x40 slot to preserve frame/labels.
- Frames: brass frame stroke 2 px where possible; 1 px for small controls (stamina bar).


## 9) Iconography Rules

- Style: brass-and-crystal silhouettes; strong 1–2 px inner line; highlights in ui.accent.brass.
- Tool icons: tint by material tokens (material.metal.copper/iron, material.crystal.cyan for glows).
- Avoid oversaturation; stay within defined palette tokens. Keep silhouettes readable at 28 px.


## 10) Accessibility & QA Checklist

- Text contrast meets targets on ui.panel.bg and ui.panel.bg_inverted at 3x and 4x scale.
- Minimap 1 px cell legibility: ore vs rock distinct with mapping.minimap.*.
- Controller/keyboard: focus ring visible on hotbar and menu list via ui.cursor.highlight.
- Motion comfort: pulse ≤ 2 Hz; damage flash ≤ 80 ms; no continuous flashing.
- Font rendering: verify numeral clarity (Atkinson, VT323) with MSDF/SDF settings; adjust hinting if needed.


## 11) Risks & Assumptions

- Token ids remain stable; any rename requires ColorLUT updates and retest.
- Minimap performance tied to tile buffer size; if slow, switch to chunked redraw (dirty rects).
- Bevy text rendering may need hinting adjustments; numerals must remain crisp on bars and counters.
- Hotbar/icon scaling: final pixel-fit pass required to avoid sampling blur at 3x and 4x.


## 12) Menu/Inventory Placement (Sprint 1 stubs)

- Pause/Menu panel (overlay)
  - id: menu.pause
  - center-screen modal; w=720, h=480; bg=ui.panel.bg; frame=ui.panel.frame.brass; z=200
- Inventory panel
  - id: menu.inventory
  - left-center anchor; top-left x=24, y=180; w=480, h=720
  - grid slots: 6x8 cells at 40x40, gutter 8; same ui.icon.slot.* tokens; selection uses ui.cursor.highlight


## Appendix A) Token Reference (concise)

UI Panels/Frames:
- ui.panel.bg — default panel background
- ui.panel.bg_inverted — inverted panel background
- ui.panel.frame.brass — brass frame stroke
- ui.panel.frame.rivet — rivet corners/ticks

Accents/Text:
- ui.accent.brass — compass ring/ticks, highlights
- ui.accent.crystal — special highlights/glows
- ui.text.primary — key labels/numerals
- ui.text.secondary — secondary labels/hints
- ui.text.inverted — text on inverted panels
- ui.cursor.highlight — selection/focus border

Bars:
- ui.health.bar — health fill
- ui.health.bar_shadow — health track/shadow
- ui.stamina.bar — stamina fill
- ui.stamina.bar_shadow — stamina track/shadow

Slots:
- ui.icon.slot.bg — slot background
- ui.icon.slot.border — slot border

Minimap:
- mapping.minimap.bg — panel background fill
- mapping.minimap.rock — walls/rock
- mapping.minimap.floor — floor
- mapping.minimap.ore.copper — copper ore
- mapping.minimap.ore.iron — iron ore
- mapping.minimap.player — player marker
- mapping.minimap.enemy — enemy marker
- mapping.minimap.exit — exit/ladder


## Appendix B) Wireframe Metrics (1920x1080 reference, top-left origin)

- Safe margin: 24 px inset on all edges.

Top-left cluster:
- hud.health_bar: x=24, y=24, w=280, h=18
- hud.stamina_bar: x=24, y=48, w=220, h=12
- hud.tool.icon_slot: x=24, y=68, w=40, h=40
- hud.tool.label: x=72, y=68, w=320, h=20
- hud.tool.durability: x=28, y=108, w=32, h=2

Top-right minimap/compass:
- hud.minimap.panel (outer): x=1696, y=24, w=200, h=136
- hud.minimap.viewport (content): x=1704, y=32, w=192, h=128
- hud.minimap.compass: overlays viewport bounds; ring stroke width 1–2 px

Top-center notifications:
- hud.toast: anchor center-x=960, top y=24; min w=240, max w=640, auto h

Bottom-center hotbar:
- hud.hotbar.slot_1: x=844, y=1016, w=40, h=40
- hud.hotbar.slot_2: x=892, y=1016, w=40, h=40
- hud.hotbar.slot_3: x=940, y=1016, w=40, h=40
- hud.hotbar.slot_4: x=988, y=1016, w=40, h=40
- hud.hotbar.slot_5: x=1036, y=1016, w=40, h=40
- quick key label inset: +3 x, +3 y inside each slot

Tooltip:
- hud.tooltip: near cursor; default offset +12 x, +12 y; clamp to screen minus 12 px padding on all sides

Menu/Inventory (stubs):
- menu.pause: center modal, x=600, y=300, w=720, h=480
- menu.inventory: x=24, y=180, w=480, h=720

Z-order confirmation:
- gameplay: 0; hud.*: 100; menu.*, hud.tooltip, hud.toast: 200; debug: 900

End of v0.1. Implement as specified; deviations require updating Appendix B anchors and token references.