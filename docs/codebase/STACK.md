# Technology Stack

> Line references describe the working tree at the time of writing and move with the code: if a link looks off after an edit, re-derive it from the symbol name in the same sentence.

> Project: **ColorFill Kids** — a browser colouring game for kids (one shape per level, 78 levels).
> Scope of this document: `C:\Users\Admin\ai\basic_game` at branch `master`, commit `ea64584`.

## Core Sections (Required)

### 1) Runtime Summary

| Area | Value | Evidence |
|------|-------|----------|
| Primary language | JavaScript (ES5 **syntax** inside a single IIFE: `var`, function declarations, no modules/classes/arrow functions) | `game.js:14-16` (`(function () { 'use strict';`) |
| Runtime | Any modern browser engine. No Node.js runtime, no server required. Opened directly via `file://` or over HTTP. | `README.md:16-31`, `game.js:10-12` ("Loaded with a plain `<script src>` (no modules) so the game also runs when the file is opened directly from disk with `file://`") |
| Runtime features actually used | ES2015+ **library** features are used even though syntax is ES5: `Map`, `Set`, `Math.hypot`, `Number.isInteger`, `Number.isFinite`, `String.prototype.padStart`, `Uint8Array`, `Path2D`, `ResizeObserver`, `devicePixelRatio`, Pointer Events | `game.js:952` (`new Map()`), `game.js:992` (`new Set()`), `game.js:215` (`Math.hypot`), `game.js:837` (`Number.isInteger`), `game.js:852` (`Number.isFinite`), `game.js:630` (`padStart`), `game.js:1053` (`Uint8Array`), `game.js:1037` (`Path2D`), `game.js:2029-2030` (`ResizeObserver`), `game.js:1099` (`devicePixelRatio`), `game.js:1880-1900` (Pointer Events) |
| Package manager | **None.** No manifest of any kind. | Scan `STACK DETECTION`: "No recognized manifest files found in project root." |
| Module/build system | **None.** No bundler, no build step, no transpiler, no minifier. Plain `<link rel="stylesheet">` + `<script src>` tags. | `index.html:7`, `index.html:89`; `README.md:19-20` ("no build step, no dependencies, no server needed") |
| Version pinning | N/A — no dependencies to pin. No `.nvmrc`, `.python-version`, `Dockerfile`, or `go.mod`. | `git ls-files` output (only `.gitignore`, `README.md`, `game.js`, `index.html`, `styles.css`, `todo.md`) |

> **Note (deliberate constraint, not debt):** ES5 syntax with ES2015+ APIs is a documented compatibility strategy for `file://` loading, not an oversight. See `game.js:10-12`.

### 2) Production Frameworks and Dependencies

There are **no** production dependencies. The app ships zero third-party code.

| Dependency | Version | Role in system | Evidence |
|------------|---------|----------------|----------|
| (none) | — | — | No `package.json`, no lockfile, no `node_modules`, no CDN `<script>`/`<link>` tags in `index.html` |

Browser platform APIs used in place of libraries:

| Platform API | Role | Evidence |
|--------------|------|----------|
| Canvas 2D + `Path2D` | All painting, clipping, hit testing (`isPointInPath`) | `game.js:771`, `game.js:1049`, `game.js:1072`, `game.js:1445-1448` |
| WebAudio (`AudioContext` / `webkitAudioContext`) | Synthesised sound effects; no audio asset files | `game.js:860-939` |
| `localStorage` | Progress persistence (stars, best score, last level, mute) | `game.js:821`, `game.js:847` |
| Pointer Events + `setPointerCapture` | Painting input | `game.js:1940-1967` |
| `ResizeObserver` (feature-detected) | Board re-layout on element-box change | `game.js:2029-2030` |
| SVG DOM (`createElementNS`) | Level-list thumbnails | `game.js:1805-1831` |

### 3) Development Toolchain

| Tool | Purpose | Evidence |
|------|---------|----------|
| (none) | No linter, formatter, test runner, or CI configured | Scan `LINTING AND FORMATTING CONFIG`: "No linting or formatting config files found"; Scan `CI/CD PIPELINES`: "No CI/CD pipelines detected" |
| Python 3 (optional, developer convenience only) | Serve the folder over HTTP instead of `file://` | `README.md:26-30` (`python -m http.server`) |
| plain `git` | Version control | `.git` present; `git ls-files` |

### 4) Key Commands

```bash
# install  — nothing to install (no manifest, no dependencies)
# build    — nothing to build (static files are the artifact)

# run (option A: no server)
start index.html            # Windows; or double-click index.html

# run (option B: optional local HTTP server)
python -m http.server       # then open http://localhost:8000

# test     — no automated tests exist (see TESTING.md)
# lint     — no linter configured
# format   — no formatter configured
```

### 5) Environment and Config

- Config sources: **none** — there is no `.env`, `.env.example`, `config.json`, or settings file.
- Required env vars: **none.** The client reads no environment variables.
- Runtime state/config that substitutes for config:
  - `STORAGE_KEY = 'colorfill-kids-v3'` — `localStorage` namespace for progress (`game.js:24`).
  - Tunable gameplay constants, all inline literals at the top of `game.js`: `COVERAGE_TARGET = 0.85` (`game.js:49`), `COVERAGE_CELLS = 32` (`game.js:48`), `BRUSH_SIZE_RATIO/MIN/MAX` (`game.js:35-37`), `STAR_TWO_COLOURS/STAR_THREE_COLOURS` (`game.js:25-26`), `POINTS_PER_SHAPE/POINTS_PER_COLOUR` (`game.js:27-28`), `BOARD_WIDTH/BOARD_HEIGHT` (`game.js:31-32`).
  - Theme/config for visuals: CSS custom properties in `:root` (`styles.css:3-14`).
- Deployment/runtime constraints:
  - Must work from `file://` (no modules, no `fetch`; glyph raster uses an offscreen canvas and reads `getImageData`, which is same-origin-safe but still guarded by `try/catch` — `game.js:306-332`).
  - Requires a browser with `Path2D`, Pointer Events, and ideally WebAudio; degrades silently when a capability is missing (`game.js:868-871`, `game.js:2029`).
  - No server, no database, no network traffic at runtime.

### 6) Evidence

- `README.md` — stated intent: static site, no build step, no dependencies, no server
- `index.html` — page shell and the only script/style inclusions (`index.html:7`, `index.html:89`)
- `game.js:1-51` — banner comment and all tunable constants
- `game.js:860-939` — WebAudio integration
- `game.js:809-858` — `localStorage` integration
- `styles.css:1-14` — CSS custom properties (visual config surface)
- `docs/codebase/.codebase-scan.txt` — `STACK DETECTION`, `LINTING AND FORMATTING CONFIG`, `ENVIRONMENT VARIABLE TEMPLATES`
