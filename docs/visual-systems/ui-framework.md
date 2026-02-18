# UI Framework — Brass, Gauges, and the Wayfinder (Sprint 1)

Provenance
- Owner: @eta (Visual Systems — Brightforge Crystalsmith)
- Audience: gameplay/render engineers (Phaser 3), UI/FX artists
- Cross-references:
  - data/visual/color-palette.json (authoritative tokens; see §4)
  - docs/visual-systems/style-guide.md (brass-and-crystal look, stroke weights, shadows)
  - docs/core-systems/ecs-architecture.md (§Renderable.tintToken usage and UI-facing components)
  - docs/combat-systems/combat-design.md (§8 Telegraphs — ensure telegraphs layer below HUD; UI overlay tokens)
  - docs/world-generation/cave-gen-algorithm.md (§12 Outputs & minimap — tile buffers, visited masks)
  - data/audio/sound-manifest.json (ui.* keys referenced in §11)
  - data/items/tools.json (hotbar/inventory sources)
  - docs/technology-systems/crafting-design.md (§8 UI bridges — inventory/crafting panel behaviors)

---

## 2) Goals & Scope (MVP)

Goals
- Brass-and-crystal HUD with strong readability and consistent tokenized theme.
- Health/Stamina gauges (top-left) with ticks, brass bezel, smooth lerp, optional pulse.
- Minimap (top-right) “Wayfinder” with chunk clamp, soft edge lock, and tokenized legend.
- Inventory grid pattern (5×4) and bottom hotbar (8 slots) with shared slot visuals.
- All colors via palette tokens; zero raw hex in code. Ready for palette loader.
- Fixed base tile size 16×16; display scale 3×–4× (nearest-neighbor); roundPixels true.
- Accessible text contrast per §12.

Non-goals (Sprint 1)
- Runtime skin switching (design for it; not shipping).
- Controller remap UI.
- Advanced quest journal (stub as reusable panel pattern only).

---

## 3) Canvas, Scale, and Safe Margins

- Base tile: 16×16 (design grid, icon silhouettes).
- Display scale: 3×–4× (nearest-neighbor). In Phaser: pixelArt true, roundPixels true.
- Safe HUD margin: 8 px at 1× from each canvas edge (→ 24–32 px at 3×–4×). Anchor HUD containers to edges within safe zones; never overlap world letterboxing.
- Z-ordering:
  - World (terrain, entities)
  - Telegraphs (from combat system) — must remain below HUD per docs/combat-systems/combat-design.md §8
  - HUD/UI (this framework)
  - Overlays/Debug (optional)
- Camera/UI: HUD in a dedicated UIScene; setScrollFactor(0) for all UI.

---

## 4) Theme Tokens Map (Authoritative, no hex)

Panels/Frames
- ui.panel.bg
- ui.panel.shadow
- ui.frame.brass
- ui.frame.copper
- ui.frame.crystal

Text
- ui.text.primary
- ui.text.secondary
- ui.text.muted
- ui.text.warning

Gauges
- ui.gauge.health.bg
- ui.gauge.health.fill
- ui.gauge.stamina.bg
- ui.gauge.stamina.fill
- ui.gauge.tick

Icons/Slots
- ui.icon.tint
- ui.slot.bg
- ui.slot.border
- ui.hotbar.slot.active
- ui.hotbar.slot.inactive

Minimap
- minimap.bg
- minimap.border
- minimap.tile.rock
- minimap.tile.floor
- minimap.tile.ore.copper
- minimap.tile.ore.iron
- minimap.tile.ore.quartz
- minimap.lamp
- minimap.player
- minimap.enemy

Effects/Mapping
- mapping.telegraph.arc.amber
- lighting.lampWarm
- lighting.crystalCool

Accessibility
- palette.accessibility.primaryOnPanelMinContrast

All references must resolve via data/visual/color-palette.json.

---

## 5) Typography & Fonts

Primary UI font
- Pixel-friendly sans with strong x-height at 3×–4×. Prefer a bitmap font for numerals and compact labels; otherwise a crisp pixel grid-aligned dynamic font.
- Family stack guidance:
  - Preferred bitmap: project-provided “Mine Sans Bitmap” (export as BMFont/AngelCode or Phaser JSON).
  - Dynamic fallback: "Noto Sans", "Inter Tight", "Arial", sans-serif (ensure crisp edges; avoid light weights).
- CSS load notes (if using WebFontLoader in Phaser):
  - Load before creating text objects.
  - Ensure game config pixelArt: true; Text/BitmapText at integer positions.
  - Avoid subpixel transforms; use setOrigin(0, 0) where appropriate; round positions.

Phaser usage
```js
// Ensure pixelArt + roundPixels at game config; also in scene:
this.cameras.main.setRoundPixels(true);

// Text style (dynamic)
const stylePrimary = {
  fontFamily: '"Noto Sans","Arial",sans-serif',
  fontSize: '8px', // @1×; will be scaled by container/scene scale
  color: theme.getCssColor('ui.text.primary'), // optional helper that returns CSS rgb()
  align: 'left',
  stroke: theme.getCssColor('ui.panel.bg'),
  strokeThickness: 0 // enable only if needed
};

// BitmapText (preferred for slot numerals)
const label = this.add.bitmapText(x, y, 'mine-sans-bitmap', '1', 8);
label.setTint(theme.getHex('ui.text.muted'));
label.setScale(displayScale); // 3–4
```

Sizes and spacing
- Heading: ~10–12 px @1× (30–48 px at 3–4×).
- Body: ~7–8 px @1×.
- Panels: maintain ≥4 px line-height padding @1× (12–16 px at 3–4×). Titles gain extra 2 px spacing below.

---

## 6) HUD Layout Spec (Positions, Sizes, Motion)

Top-left: Health/Stamina gauges (stacked)
- Health bar
  - Size: 96×6 px @1× (288×18 @3×).
  - Background: ui.gauge.health.bg; Fill: ui.gauge.health.fill.
  - Ticks: every 8 px @1×; tick color ui.gauge.tick at 30% alpha; overlay lines.
- Stamina bar
  - Size: 96×4 px @1×.
  - Background: ui.gauge.stamina.bg; Fill: ui.gauge.stamina.fill.
  - Pulse: when ratio < 0.2, apply subtle alpha sine on fill (amplitude ≤ 20% alpha; frequency ≤ 2 Hz; see §12 motion limits).
- Brass bezel
  - Frame: 1–2 px using ui.frame.brass; inner lip (optional) ui.frame.copper, 1 px.
  - Shadow: ui.panel.shadow at low alpha; offset 1–2 px down-right.
- Positioning
  - Anchor to top-left within safe margin (8 px @1×).
  - Vertical stack: 2 px gap @1× between bars; labels (optional) above in ui.text.secondary.
- Update cadence (smoothing)
  - Each frame, approach target with per-second lerp:
    - Health: 12%/s; Stamina: 18%/s.
```js
// dt in seconds
function lerpPerSecond(current, target, ratePerSec, dt) {
  const t = Math.min(ratePerSec * dt, 1);
  return Phaser.Math.Linear(current, target, t);
}
```

Top-right: Minimap Panel — see §7.

Bottom-center: Hotbar — see §8.

Bottom-left: Tooltip/Context line
- Single-line helper. Text: ui.text.secondary on a ui.panel.bg strip with 2 px brass top stroke.
- Auto-show on interaction hint; hides after timeout.

---

## 7) Minimap Spec (Wayfinder)

Panel
- Viewport: 64×64 px @1× (192×192 @3×).
- Background: ui.panel.bg; Border: ui.frame.brass (outer), ui.frame.copper (inner lip).
- Surround panel shadow: ui.panel.shadow (3 px spread @1×).
- Outer frame (housing): may include rivet dots using ui.frame.brass at corners per style-guide.

Projection and panning
- 1 world tile → 1 px @1×.
- Clamp to current chunk if world exceeds viewport (docs/world-generation/cave-gen-algorithm.md §12).
- Center on player with soft edge lock:
  - When player approaches within 25% of viewport edge, begin panning toward center.
  - Deadzone rect = 50% viewport width/height; center player within when possible.

Legend mapping (strict)
- rock → minimap.tile.rock
- floor → minimap.tile.floor
- ore.copper → minimap.tile.ore.copper
- ore.iron → minimap.tile.ore.iron
- ore.quartz → minimap.tile.ore.quartz
- lamp anchors → minimap.lamp
- player dot → minimap.player
- enemies → minimap.enemy

Rendering approach
- Use Phaser.GameObjects.RenderTexture or Graphics for blitting single-pixel tiles (scaled by container).
- Update cadence: 4–8 Hz (250–125 ms). Only dirty tiles redraw:
  - Dirtiness sources: player moved cell, tile state changed, entity icon moved/appeared/disappeared.
- Performance: batch floor/rock as regions when possible to reduce per-pixel ops.

Fog of discovery (optional MVP hint)
- Dim non-visited tiles: multiply color by ui.panel.shadow at 30% alpha.
- Visited mask provided by world renderer (ref §12 in cave-gen doc).
- Ensure legend colors remain distinguishable under fog (use luminance-preserving multiplication).

---

## 8) Hotbar (Bottom-Center)

Layout
- Slots: 8 contiguous slots.
- Each slot: 16×16 px @1× (icon fit: 12×12). Border adds 1 px stroke.
- Spacing: 2 px between slots @1×.
- Alignment: center the full strip at bottom-center within safe margin.

Visual states
- Slot background: ui.slot.bg
- Border (default): ui.slot.border
- Inactive: ui.hotbar.slot.inactive subtle overlay
- Active highlight: ui.hotbar.slot.active (outer ring glow or thicker brass border)
- Cooldown overlay: radial wipe from top using ui.panel.shadow at 40% alpha; clockwise.

Labels
- Numerals “1–8” top-left corner of each slot in ui.text.muted (bitmap text preferred).
- Offset: 1 px inset from slot border @1×.

Selection rules
- Mirrors Inventory.selectedIndex (see ECS in §14). When selection changes, animate ring:
  - Duration: 120 ms; easing: cubic-out; slight scale pulse ≤ 5%.

Drag-and-drop (pattern-level)
- Hover target brightens brass border by +8–12% via shader/brightness mod; do not swap tokens.

---

## 9) Inventory Grid & Crafting Panels (Patterns)

Inventory
- Grid: 5×4 slots (25 total), same visuals as hotbar slots.
- Panel housing: ui.panel.bg with 2 px ui.frame.brass outer frame and 1 px ui.frame.copper inner lip.
- Title bar: brass band using ui.frame.brass with a thin ui.frame.crystal inlay strip (1 px) across the top.
- Scroll (if content > view): step scroll by slot rows; no kinetic bounce in MVP.

Crafting
- Left: recipe list column (scrollable if needed).
- Right: details pane with inputs/outputs and action button.
- Text color tokens:
  - Requirements met: ui.text.primary
  - Unmet: ui.text.warning
- Disabled recipe row: 60% alpha; show unmet constraints as a single concise line under row (no red walls).
- Interaction:
  - Attempt craft when unmet → play ui.error (see §11).
  - Successful craft → ui.craft.complete.

Bridging
- Data comes from data/items/tools.json and rules per docs/technology-systems/crafting-design.md (§8 UI bridges).

---

## 10) Panels, Dialogs, Tooltips

Panels/Dialogs
- Background: ui.panel.bg
- Frame: 2 px ui.frame.brass outer; 1 px ui.frame.copper inner lip.
- Drop shadow: 3 px using ui.panel.shadow (y-biased).
- Header: optional crystal accent line (ui.frame.crystal, 1 px) under title.

Tooltip
- Auto-size to content; 4 px padding @1×.
- Title: ui.text.primary (bold or heavier weight/bitmap variant).
- Body: ui.text.secondary.
- Optional icon: 12×12 placed to the left of text, tinted via ui.icon.tint.
- Placement: prefer above and to the right of cursor; clamp to viewport; 8 px safe margin to edges.

---

## 11) Interaction & Audio Hooks

Mapped to data/audio/sound-manifest.json (ui.* keys)
- Click/select: ui.click
- Confirm/accept: ui.confirm
- Invalid/denied/error: ui.error
- Craft complete: ui.craft.complete

Hover/Focus feedback
- Brighten brass frame by +8–12% using shader intensity or multiply toward white; do not change token identity.

---

## 12) Accessibility & Contrast Rules

- Contrast ratios on ui.panel.bg:
  - Primary text: ≥ 4.5:1
  - Secondary text: ≥ 3:1
- Do not render primary text below 90% alpha.
- Colorblind safety:
  - Gauges: differentiate health vs stamina by both color and geometry (width/height + tick cadence).
  - Minimap legend uses distinct luminance steps; do not rely on hue alone.
- Motion limits:
  - Shimmer/pulse ≤ 12 Hz overall; gauge low-stamina pulse ≤ 2 Hz.
  - Provide UX flag to disable gauge pulse entirely.
- Verification token: palette.accessibility.primaryOnPanelMinContrast used in tests to assert minimum contrast.

---

## 13) Phaser 3 Integration & Theme Loader Contract

UI Scene setup
- Dedicated UIScene with Containers:
  - hudContainer (top-left gauges)
  - minimapContainer (top-right)
  - hotbarContainer (bottom-center)
  - panelsContainer (dialogs, inventory, tooltips)
- All UI objects setScrollFactor(0) and integer positions; scene camera roundPixels true.

Theme loader API (src/ui/theme-loader.js)
- loadPalette(scene): Promise<void>
  - Preloads and parses data/visual/color-palette.json; resolves when tokens are ready.
- getHex(token: string): number
  - Returns Phaser-compatible numeric color for token.
- getRGB(token: string): { r: number, g: number, b: number }
- getCssColor(token: string): string
  - Optional helper that returns "rgb(r,g,b)" for Text color fields.
- assertToken(token: string): void
  - Throws if token is unknown; used in dev assertions.

Usage examples
```js
import * as theme from '../ui/theme-loader';

// On scene create
await theme.loadPalette(this);

// Sprites / icons
iconSprite.setTint(theme.getHex('ui.icon.tint'));

// Graphics fills and strokes
g.lineStyle(1, theme.getHex('ui.frame.brass'), 1.0);
g.fillStyle(theme.getHex('ui.panel.bg'), 1.0);
g.fillRect(x, y, w, h);

// Text (dynamic)
const txt = this.add.text(x, y, 'Health', {
  fontFamily: '"Noto Sans","Arial",sans-serif',
  fontSize: '8px',
  color: theme.getCssColor('ui.text.primary')
});
```

Reactive theme swap (future)
- All UI elements store token keys, not literal colors.
- Expose refreshTheme() on UI components to re-pull colors via theme.getHex/getRGB.
- Avoid caching resolved hex beyond a single render pass when in dev mode.

ECS tint integration
- Respect docs/core-systems/ecs-architecture.md (§Renderable.tintToken): when UI elements host sprites with Renderable.tintToken, resolve via theme loader instead of hardcoded values.

---

## 14) Data & ECS Contracts

Read-only ECS sources for UI
- Health component: current, max (floats/ints). Provide normalized ratio for smoothing.
- Stamina component: current, max; regen state (optional).
- Inventory.selectedIndex: integer 0–7 for hotbar mirroring.
- PlayerTag + Transform/Position: tile coordinates for minimap centering.
- Tile buffer/meta for minimap raster:
  - Tile types: rock, floor, ore.copper, ore.iron, ore.quartz (match legend).
  - Lamps (anchors/placed lights), enemies, and player positions as lightweight lists.
  - Optional visited mask for fog.

Update flow
- HUD gauges: subscribe to Health/Stamina changes; also poll per frame for smoothing.
- Minimap: subscribe to tile dirty events from world renderer; throttle to 4–8 Hz.
- Hotbar: subscribe to Inventory.selectedIndex; animate on change.

Stable token IDs (exact strings)
- ui.panel.bg
- ui.panel.shadow
- ui.frame.brass
- ui.frame.copper
- ui.frame.crystal
- ui.text.primary
- ui.text.secondary
- ui.text.muted
- ui.text.warning
- ui.gauge.health.bg
- ui.gauge.health.fill
- ui.gauge.stamina.bg
- ui.gauge.stamina.fill
- ui.gauge.tick
- ui.icon.tint
- ui.slot.bg
- ui.slot.border
- ui.hotbar.slot.active
- ui.hotbar.slot.inactive
- minimap.bg
- minimap.border
- minimap.tile.rock
- minimap.tile.floor
- minimap.tile.ore.copper
- minimap.tile.ore.iron
- minimap.tile.ore.quartz
- minimap.lamp
- minimap.player
- minimap.enemy
- mapping.telegraph.arc.amber
- lighting.lampWarm
- lighting.crystalCool
- palette.accessibility.primaryOnPanelMinContrast

Any rename requires PR across style-guide, ui-framework, and palette.

---

## 15) Wireframes (ASCII, not to scale)

Safe margin: 8 px @1×

Top-left gauges
```
[8px]┌─────────────────────────────────────────────────────────── canvas ───────────────────────────────────────────────────────────┐
      │ TL safe                                                                                                                    │
      │  ┌──────────────────────── HEALTH (96×6) ────────────────────────┐                                                         │
      │  │[brass 1–2px] [bg] [fill→→→→→→→→→→] [ticks every 8px]         │                                                         │
      │  └───────────────────────────────────────────────────────────────┘                                                         │
      │  ┌──────────── STAMINA (96×4) ────────────┐                                                                             TR│
      │  │[brass][bg][fill pulsates <20%]        │                                                                                │
      │  └───────────────────────────────────────┘                                                                                │
```

Top-right minimap (64×64 @1× inside frame)
```
                                                    ┌────────────────────────────────────────────────────┐ [8px]
                                                    │ [brass 2px][copper 1px][bg]                        │
                                                    │  ┌──────────────────────────────────────────────┐   │
                                                    │  │                64×64 tiles                   │   │
                                                    │  │   • player • enemies • lamps                 │   │
                                                    │  └──────────────────────────────────────────────┘   │
                                                    └────────────────────────────────────────────────────┘
```

Bottom-center hotbar (8 slots, 16×16 each, 2 px spacing)
```
                                   [centered]
                     [ ... world ... ]
        ─────────────────────────────────────────────────────────────────────────────
                             ┌───┬───┬───┬───┬───┬───┬───┬───┐
                             │1  │2  │3  │4  │5  │6  │7  │8  │  ← numerals in ui.text.muted
                             │   │   │   │   │   │   │   │   │  icons 12×12; active shows ring
                             └───┴───┴───┴───┴───┴───┴───┴───┘
        ─────────────────────────────────────────────────────────────────────────────
```

---

## 16) Acceptance Checklist

- HUD gauges:
  - Sizes match spec (Health 96×6, Stamina 96×4 @1×).
  - Ticks at 8 px; brass bezel and shadow present.
  - Lerp rates implemented (12%/s health, 18%/s stamina); low-stamina pulse within motion limits.
- Minimap:
  - Viewport 64×64 @1×; framed with brass/copper; bg tokenized.
  - Legend uses strict tokens; 1 tile → 1 px mapping.
  - Soft edge lock at 25%; chunk clamp; dirty-tile redraw at 4–8 Hz.
  - Optional fog uses ui.panel.shadow at ~30% alpha.
- Hotbar:
  - 8 slots (16×16 @1×, 2 px spacing), centered; icons 12×12.
  - Active/inactive states with correct tokens; cooldown radial wipe using ui.panel.shadow at 40% alpha.
  - Labels 1–8 in ui.text.muted; selection pulse 120 ms cubic-out.
- Inventory/Crafting patterns:
  - Inventory 5×4 with shared slot visuals; brass frame + crystal inlay title.
  - Crafting met/unmet text color tokens; disabled row at 60% alpha; audio hook on invalid.
- Panels/Tooltips:
  - Panel bg/frame/shadow tokens; tooltip padding and text styles; optional icon support.
- Accessibility:
  - Contrast rules enforced; colorblind-friendly cues; motion limits and disable flag for pulses.
- Phaser integration:
  - UIScene with containers; roundPixels true; setScrollFactor(0); nearest-neighbor scaling.
  - Theme loader contract implemented (loadPalette, getHex, getRGB, assertToken, optional getCssColor).
  - Usage examples compile without raw hex.
- Data/ECS:
  - Read-only consumption of Health/Stamina, Inventory.selectedIndex, Player position, Tile buffer/meta.
  - Stable token IDs enumerated and match data/visual/color-palette.json.
- Audio hooks mapped to data/audio/sound-manifest.json ui.* keys.
- No raw hex values appear; all colors use tokens.
- Ready for engineer/artist implementation in Sprint 1.

---