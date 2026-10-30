# Squeek Courier design system

## Overview

Squeek Courier is a short, free arcade game for keyboard and touch players. A warm garden illustration carries the visual identity: cream paper, brown type, sunflower gold, muted leaves, and one rust-colored primary action. The game is the first substantial surface; the introduction stays compact. The live hamster panel explains the pace beside the game on a wide screen and follows it on a narrow one.

The source of truth is [src/styles.css](src/styles.css), [src/App.tsx](src/App.tsx), [src/Icons.tsx](src/Icons.tsx), and the Canvas artwork in [src/game/render.ts](src/game/render.ts). These are implemented decisions, not a proposed redesign.

## Colors

CSS uses hex primitives and semantic aliases in `:root`. Components use the semantic roles for the main interface. Canvas and SVG artwork keep their own illustration colors.

| Semantic token | Exact value / primitive | Use |
| --- | --- | --- |
| `--color-page` | `--cream-50`, `#f9f6ed` | Page background |
| `--color-surface` | `#fffcf4` | Board chrome, start/pause/result panel, select, help dialog |
| `--color-surface-muted` | `--cream-100`, `#f2eddf` | Hamster panel and quiet hover surfaces |
| `--color-text` | `--brown-900`, `#342e26` | Headings, primary content, scores |
| `--color-text-secondary` | `--brown-600`, `#726858` | Descriptions, labels, secondary actions |
| `--color-border` | `--cream-200`, `#e4ddcd` | Dividers and quiet control borders |
| `--cream-300` | `#c9bfa9` | Stronger board/select/direction borders |
| `--color-accent` | `--orange-600`, `#b7442e` | Primary action fill, link hover, low-time emphasis |
| `--color-accent-hover` | `--orange-700`, `#993722` | Primary action hover |
| `--color-on-accent` | `#fffaf0` | Primary action text and icon |
| `--color-success` | `--green-700`, `#4d6441` | Fresh-signal cue, explanatory signal text, held direction border |
| `--color-success-bg` | `--green-100`, `#ebeedc` | Held direction background |
| `--color-focus` | `#72502f` | Three-pixel focus outline, four-pixel offset |

The field and its caption use `#e0e7b9`. The renderer's `C` palette adds path `#f1e3bc`, path edge `#ddcfaa`, leaves `#6c8d50` / `#93ad66` / `#526f43`, cream `#fff6df`, and roof `#c8583e`. Collectible seeds use gold `#f1c95e` with a dark outline and pale stripe. Rocks have an angular gray-green silhouette; the courier and house have distinct shapes. Text labels accompany signal color, practice mode, basket count, and low time.

The measured contrast evidence and the limits of automated measurements over Canvas are recorded in [artifacts/validation.md](artifacts/validation.md). No dark theme or unused status palette is implemented.

## Typography

Two locally bundled variable WOFF2 families are declared in `src/styles.css`:

- **DM Sans**, `sans-serif` fallback, normal style, declared variable weight range 100–1000. Interface use is limited to 400 and 600, with the brand at 700.
- **Fraunces**, `Georgia, serif` fallback, normal style, declared variable range 100–900. Display headings use 700.

Files live in `public/fonts/` and are preloaded in `index.html`. Their OFL licenses ship alongside them. There is no font CDN request at runtime. Intended font loading was checked in the browser.

| Token | Size at a 16px root | Role |
| --- | --- | --- |
| `--text-small` | 14px | Captions, secondary copy, status, keyboard hints |
| `--text-body` | 16px | Actions, native select, primary supporting copy |
| `--text-title` | 20px | Brand, help subheadings, mobile overlay headings and counters |
| `--text-section` | 28px | Overlay headings, desktop counters, mobile page heading |
| `--text-display` | 40px | Desktop page heading |

Display line height is 1.15, with −0.035em tracking for the main desktop heading and −0.025em for smaller display headings. The mobile overlay heading has natural tracking. Body line height is 1.5; longer descriptions use 1.6. Headings balance wrapping; descriptions use pretty wrapping. Counters use tabular numerals. There is no uppercase label system or monospace prose. The final review found two families, three weights, and five sizes overall.

## Layout

`site-wrap` is centered, at most 1304px wide including its 40px inline padding. The main desktop grid is `minmax(0, 1fr) 282px`, separated by 28px. All content follows shared leading and trailing edges. The introduction is compact, followed by the mode selector, scoreboard, and field.

The spacing vocabulary in `:root` is 4, 8, 12, 16, 24, 32, and 48px. The source also uses 20, 28, and 40px where component proportions or the outer layout require them. Typical groups use 6–12px internally and 20–32px between groups. The game instructions are three aligned columns on desktop.

The field uses one grid cell. An empty, noninteractive `::before` with an 800:520 aspect ratio gives the garden its normal height. The canvas is absolutely positioned within the cell and does not contribute intrinsic dimensions to the grid. Start/pause/result content shares that grid cell in normal flow, allowing it to grow taller for large text. This avoids Canvas intrinsic-size feedback in WebKit and prevents overlays from covering unrelated chrome. The renderer scales its logical 800 × 520 world to the actual backing buffer, capped at 2× device pixel ratio.

Implemented breakpoints:

| Width | Behavior |
| --- | --- |
| Above 1120px | 40px page padding, 282px sidebar, full keyboard hint and basket slots |
| At/below 1120px | 28px padding, 248px sidebar, narrower gaps, basket-slot decoration hidden |
| At/below 900px | One main column; the hamster panel becomes a compact horizontal grid below the game |
| At/below 620px | 16px padding; 78px minimum header; 28px page heading; utility icons retain accessible names; touch controls appear; keyboard hints hide; instructions stack |
| Below 360px | 12px padding, smaller brand, tighter local spacing; controls retain their target sizes |

The mode toolbar and scoreboard wrap when text needs more space. Text containers grow rather than clip. Live/practice mode is always named by the select and hamster panel; an additional practice label appears on the active field. Purely decorative field captions hide while an overlay is present. Touch movement uses `touch-action: none` only on direction buttons; the rest of the page retains scrolling and zooming.

Rendered checks cover 320, 390, 768, 900, 1120, and 1440 CSS pixels in Chromium and WebKit, plus 200% root-text enlargement. Native browser zoom, physical devices, and every possible viewport were not tested.

## Elevation and depth

The outer board and controls use structural borders, not shadows. The sidebar uses a quiet tonal background. The start/pause/result overlay uses `0 8px 32px #3e49251a` with no border; the native help dialog uses `0 16px 70px #342e2633` and a `#342e266b` backdrop. The field has an isolated stacking context. No gradients, background textures, floating page chrome, or shadows on bordered surfaces are used in the interface.

## Shapes

The desktop board and overlay use 14px radii, the help dialog 16px, and inputs/actions 8px. Direction buttons use 9px. Mobile board/sidebar radii are 12px; mobile overlays use 10px. Native utility controls have 6px rounding. The seed, home, rock, and hamster silhouettes are deliberate game artwork, not generic interface badges.

## Components

- **Brand / utility navigation** (`App`, `HamsterMark`, `Icon`): left-aligned home link, right-aligned sound toggle and help action. Sound exposes `aria-pressed`; both icon utilities retain explicit accessible labels on mobile. Sound is off initially.
- **Mode field** (`App`, `.mode-field`): native labeled select, three fixed modes. Disabled while a run is in progress. Changing mode after a result resets the route so a completed score cannot be copied into another mode's record.
- **Scoreboard** (`.scoreboard`, `.stat`, `.pause-button`): delivered total, remaining seconds, basket capacity, pause/resume. Numbers do not announce every frame; important game events use the persistent polite status region. Pause is unavailable before a run.
- **Game overlay** (`.scene-overlay`, `.start-panel`): ready, personal pause, telemetry wait, and completed states. One filled primary action per state. Missing/stale data provides retry, a truthful explanation, and an end-run path. Ready users can choose explicitly labeled practice. Completion focuses Play again.
- **Primary / secondary actions** (`.primary-button`, `.text-button`, `.utility`): primary uses rust fill; secondary actions use understated text or utility placement. Hover is enabled only for hover-capable pointers. All controls expose focus; disabled actions use native `disabled` and nearby explanatory text.
- **Direction pad** (`.touch-controls`, `.dpad`, `.direction`): four 44px targets, six-pixel gaps, hold-to-move. Pointer capture, pointerup/cancel, capture loss, and blur release held input. A static held color accompanies pointer state. Keyboard activation of direction buttons is also handled.
- **Rhythm panel** (`.rhythm-panel`, `Wheel`): truthful live or simulated status, actual RPM only for valid live measurements, observation age, retry, and a plain explanation of the current game behavior. A running wheel rotates only without reduced motion; reduced motion removes cosmetic animation. Actual rock movement is essential game behavior.
- **Help dialog** (`.help-dialog`): native modal dialog with a named heading, close control, backdrop dismissal, Escape support, focus containment, and native focus return. Opening it during play pauses the run; closing it leaves an explicit resume action.
- **Instruction row and footer**: the three rules share an icon/title/body shape. The footer landmark includes the local-storage explanation and the public telemetry source.

High-frequency interactions update text and fill colors immediately. Press feedback uses only a 120ms transform transition. Press scales to 0.96 only when reduced motion is not requested. There are no entrance animations, celebratory flashes, or automatic sound. Game particle bursts and courier bob are omitted under reduced motion. Hidden pages and blurred windows pause the run.

## Do's and don'ts

- Start with `site-wrap`, the existing type roles, and semantic color tokens for another surface. Reuse the same shared alignment edges and ordinary sentence case.
- Keep the garden and its primary action above an explanatory section. Put controls and directions beside the action they explain.
- Use one filled action in an overlay. Use the existing utility or text action pattern for peers.
- Preserve the separation between live measurements and explicitly simulated practice. Never display invented live data or imply scores are shared across browsers.
- Keep artwork in `render.ts` / `Icons.tsx`; do not replace game objects with externally hosted images or introduce a font CDN dependency.
- Preserve the field's sizing spacer and out-of-flow canvas arrangement. Test overlays with enlarged text and resize in both browser engines after changing it.
- Keep new prose readable without motion or color. Preserve native controls, explicit labels, focus styles, and the reduced-motion guards.
