# Squeek Courier

A free browser game for Squeekchain. Drive a hamster courier around an illustrated garden, collect up to five sunflower seeds, avoid rocks, and return to the central house to score during a 60-second run.

The game is original React / TypeScript / Canvas work, inspired by the owner's [reference prototype](https://squeekcourier.fun/). It has no wallet connection, payment, gambling, blockchain transaction, or token reward.

## Run and rebuild

Use Node.js 20.19+ or 22.12+ and npm.

```sh
npm ci
npm run dev
```

For a production preview:

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`dist/` is the complete production website and is included with the source and `package-lock.json`. Vite's `base: './'` makes scripts, styles, fonts, favicon, and share image resolve under a static-hosting subdirectory. No server rewrites, environment variables, API keys, or backend are required. Serve `dist/` over HTTP(S), rather than opening its HTML with `file://`.

## Play

- Choose **Live hamster**, **Practice · resting**, or **Practice · running** before a run.
- Select **Start delivering** (or **Start practice run**).
- Move using arrow keys or W A S D. On a touchscreen, hold the direction buttons below the garden.
- Drive over seeds to collect them. The basket holds five. Return to the house in the center to bank them.
- A rock bump drops one carried seed and briefly slows the courier. Brief collision protection prevents repeated immediate losses.
- Use Space, Escape, or the pause button to pause. Opening help, leaving the window, or hiding the page also pauses play. Resume explicitly after a personal pause.
- At zero seconds, only delivered seeds count. Play again, or select another mode.

Best scores are kept only in this browser's local storage, with independent records for live, resting practice, and running practice. There is no shared leaderboard. If storage is blocked, play still works and the result explains that records last for the visit. Sound is optional and starts off.

## Live rhythm and practice

The only runtime network dependency is the public [Squeekchain status API](https://api.squeekchain.com/v1/status). Polling runs every 10 seconds, with a seven-second request timeout. The implementation consumes schema version 1 and `measurement.coreStatus`, `freshness`, `observedAt`, `staleAfterSeconds`, and `rpmMilli`.

| Hamster state | Courier speed | Rocks |
| --- | --- | --- |
| `IDLE` / resting | 142 world units/second | Stay at their last positions |
| `SPINNING` / running | 210 world units/second | Move around their original positions |

Live play stops its timer, movement, collisions, and scoring when a request fails, the browser signals offline, the schema is invalid, freshness is not `online`, the observation is older than the smaller of the service's freshness window and 30 seconds, the local receipt is 30 seconds old, or the observation is more than five seconds in the future. Fresh data resumes an otherwise unpaused live run. Retry and end-run controls remain available. Unknown hamster states fail closed. Slower active frames count their full elapsed time; physics displacement is bounded to avoid jumps.

Both practice modes use an explicitly simulated, fixed rhythm. They remain playable without telemetry once the website has loaded. Practice never supplies invented live RPM, silently replaces a live run, or changes a live record. The mode stays locked for the duration of a run; end the run to choose another.

## Browser checks

```sh
npx playwright install chromium webkit
npm run test:browser
```

The browser script serves the existing `dist/` at `/preview/`, launches the browser, and closes both when finished. It validates the production export, rather than a development server. Playwright's Linux system libraries must be available. Results and screenshots go into `test/scratch/browser-validation/`; these are temporary and are not runtime dependencies.

Recorded worker result (2026-10-30): the production build and typecheck passed; all 12 engine/telemetry tests, 28 production browser checks across Chromium and WebKit, four additional game-flow checks, and 16/16 taste checks passed. The game and its start action were confirmed on the first 390px screen. Physical devices, screen readers, native browser zoom, and audible sound were not tested.

`npm test` runs deterministic engine and telemetry tests. To regenerate the included 1200 × 630 social image after changing its artwork:

```sh
node scripts/generate-social.mjs
npm run build
```

For actual worker results, fixed findings, coverage of all six Better Interface domains, and remaining limitations, see [artifacts/validation.md](artifacts/validation.md). The final implemented design system is in [DESIGN.md](DESIGN.md).

## Static delivery and deployment

Publish the contents of **`dist/`** as the site root. The assignment's publisher consumes this export and assigns its deployment address after submission. A public deployment URL is not available inside this build session; the reference prototype URL is not presented as the new deployment. No publishing command or external hosting account was used.

All fonts and runtime artwork are local. Dependency installations, browser binaries, caches, and temporary operating-system libraries are outside the submitted repository. No ignore file was added or changed. See [artifacts/NOTICE.md](artifacts/NOTICE.md) for font and design-guidance attribution.
