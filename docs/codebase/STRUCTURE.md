# Codebase Structure

> Flat, single-page static site. There are **no subdirectories of source code** — the entire application is three files at the repository root.

## Core Sections (Required)

### 1) Top-Level Map

| Path | Purpose | Evidence |
|------|---------|----------|
| `index.html` (90 lines) | Page shell: HUD (title, score/painted/colours stats, sound + levels buttons), palette panel, `<canvas id="board">`, paint meter, action row, level-list overlay, win overlay. Only script/style entry. | `index.html:1-90`; `README.md:76` ("Page shell: HUD, palette, board canvas, paint meter, level actions, level list and win dialogs") |
| `game.js` (1906 lines, 69 KB) | Complete application logic in one IIFE, split into 12 numbered sections (see §3). Shape library, letter tracing, palette, level table, sound, progress, canvas paint engine, actions, event wiring, start-up. | `game.js:1-1906`; `README.md:78` |
| `styles.css` (510 lines) | Layout and visual style; responsive down to phone widths (single `@media (max-width: 700px)` block). | `styles.css:1-510`, breakpoint at `styles.css:460`; `README.md:77` |
| `README.md` (114 lines) | Project intent, run instructions, gameplay/stars rules, file table, implementation notes. | `README.md:1-114` |
| `todo.md` (1 line) | Scratch requirement note, not a structured backlog. | `todo.md:1` — "create lines stright, vertical line, slash lines, circle, off circle , full circle" |
| `.gitignore` (24 lines) | Ignore rules. **Java/BlueJ-oriented template** (`.class`, `.jar`, `.ctxt`, `hs_err_pid*`) with no entries relevant to this JS project. | `.gitignore:1-24` |
| `.github/` | **Empty directory.** No workflows, no instructions file, no templates. (An unrelated `.github/copilot-instructions.md` was committed in `adb1f2e` and deleted in `64cc44f`.) | `dir /a /b .github` → no output; `git log --diff-filter=D -- .github/copilot-instructions.md` → `64cc44f` |
| `docs/codebase/` | Output location of this knowledge base. Not tracked by git (currently `?? docs/`). | `git status --short` → `?? docs/` |

### 2) Entry Points

- **Main runtime entry:** `index.html` — the only HTML document; it loads `game.js` last so the DOM is available when the IIFE runs (`index.html:88`, `<script src="game.js"></script>` before `</body>`).
- **JavaScript entry (single):** the IIFE in `game.js:14`; execution starts at `loadLevel(state.levelId)` at `game.js:1905`.
- **Secondary entry points:** none. No workers, no CLI, no server, no tests, no build scripts.
- **How entry is selected:** by opening the HTML file; there is no manifest `main`, no `scripts.start`, no CI job.

### 3) Module Boundaries

`game.js` is one file, so "boundaries" are the 12 in-file sections delimited by `/* ==== */` banners. Each section is a real boundary: it may call later sections (function hoisting) but owns its own globals.

| Section (file line) | What belongs here | What must not be here |
|---------------------|-------------------|------------------------|
| 1. Shape library — `game.js:43` | `SHAPE_CMDS`, `SHAPE_LABELS` and helpers `formatPoint`, `arcSegments`, `straightLine`, `arcPoints`, `linePath`, `round2`, `scalePath`, `isLetterKey`, `shapeCommands`, `letterPixels`, contour/trace helpers | Any DOM painting, scoring, or level numbering |
| 1a. Line patterns — `game.js:106` | The eight pre-writing patterns generated from a centerline (`LINE_PATTERN_KEYS`, `LINE_PATTERN_POINTS`, `LINE_THICKNESS`) | Hand-written path data for letters or shapes |
| 1b. Letter shapes — `game.js:251` | Glyph raster, edge following, Douglas-Peucker simplification, fit-to-box, `LETTER_CACHE`, `LETTER_FALLBACK` | Level numbering or palette logic |
| 2. Palette — `game.js:588` | `BASE_PALETTE` (13 colours), `hslToHex`, `makePalette` | Shape geometry |
| 3. Level table — `game.js:636` | Size steps and ratios, `groupOfShape`, `makeLevels`, `layoutSlots`, `LEVELS`, `LEVEL_GROUPS`, `world`, `boardWideness` | Rendering or input handling |
| 4. DOM handles — `game.js:756` | Every `getElementById` result, the main `ctx`, and the offscreen `probe` context | Behaviour; this section only caches nodes |
| 5. Progress — `game.js:797` | `loadProgress`, `saveProgress`, `clampLevel` (`localStorage`) | UI rendering |
| 6. Sound — `game.js:848` | `audio()`, `tone()`, the `SFX` object | Game rules |
| 7. Game state — `game.js:928` | The `state`, `view`, `shapePaths`, `shapeGrids` singletons and derived getters (`currentLevel`, `brushWidth`, `distinctColourCount`, `currentScore`, `starTargets`, `computeStars`) | Drawing calls |
| 8. Rendering — `game.js:1009` | `prepareBoard`, coverage grid, canvas sizing, `renderBoard`, palette/tile/tab rendering, stroke and outline drawing | Level navigation and event registration |
| 9. Actions — `game.js:1392` | Stroke lifecycle, `undo`, `clearLevel`, `winLevel`, `replayStrokes`, swatch handling | DOM event listeners |
| 10. Levels — `game.js:1579` | `loadLevel`, `stepLevel`, level-list building, overlay open/close, `toggleSound` | Canvas drawing internals |
| 11. Event wiring — `game.js:1760` | All `addEventListener` calls and their handlers | Business rules (delegates to sections 9/10) |
| 12. Start — `game.js:1896` | `resize` / `orientationchange` / `ResizeObserver` registration and the initial `loadLevel` call | Feature logic |

### 4) Naming and Organization Rules

- **File naming:** lowercase, no separators for single-word names (`game.js`); kebab-case when a separator is needed (evidenced by the historical `.github/copilot-instructions.md`). No directory nesting for source.
- **Directory organization:** none — a flat root. Grouping is expressed by **numbered in-file sections** with banner comments, not by folders.
- **Import/path conventions:** N/A — no imports, no exports, no `<script type="module">`, no path aliases. Everything shares the IIFE closure scope.
- **Generated vs source:** nothing is generated or compiled; every file in the repo is hand-authored source. (There is no `dist/`, `build/`, or `node_modules/`, and `docs/codebase/.codebase-scan.txt` is the only tool output.)

### 5) Evidence

- `git ls-files` (tracked: `.gitignore`, `README.md`, `game.js`, `index.html`, `styles.css`, `todo.md`)
- `git status --short` (`?? docs/`)
- `index.html:1-90` (DOM structure and script include)
- `game.js:43`, `106`, `251`, `588`, `636`, `756`, `797`, `848`, `928`, `1009`, `1392`, `1579`, `1760`, `1896` (section banners)
- `docs/codebase/.codebase-scan.txt` — `DIRECTORY TREE`, `ENTRY POINTS`, `CODE METRICS`
