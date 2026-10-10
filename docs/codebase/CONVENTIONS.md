# Coding Conventions

> Derived from the three source files, not from a config file — **no linter or formatter is configured** in this repository, so these are observed conventions enforced only by review.

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files | lowercase, single word, no separator; kebab-case if a separator is ever needed | `game.js`, `styles.css`, `index.html` | `git ls-files`; historical `.github/copilot-instructions.md` |
| Functions/methods | `camelCase`, verb-first, descriptive of the effect | `brushWidth()`, `markContact()`, `replayStrokes()`, `syncCanvasSize()`, `renderLevelGrid()` | `game.js:964`, `game.js:1279`, `game.js:1500`, `game.js:1077`, `game.js:1661` |
| Variables | `camelCase`; plural for collections; short loop indices (`i`, `index`, `row`, `column`) | `activeStroke`, `shapeGrids`, `firstColumn` | `game.js:941`, `game.js:948`, `game.js:1286` |
| Constants | `SCREAMING_SNAKE_CASE` for module-level tunables | `COVERAGE_TARGET`, `BRUSH_MIN_CSS`, `STORAGE_KEY`, `LINE_THICKNESS` | `game.js:24-41`, `game.js:116` |
| Module-scope mutable state | lowercase noun, no prefix/suffix | `state`, `world`, `view`, `progress`, `audioContext` | `game.js:932`, `game.js:683`, `game.js:946`, `game.js:801`, `game.js:852` |
| DOM handle variables | element purpose + type suffix `El`/`Btn`, suffixed to avoid collision with the id | `undoBtn`, `levelGridEl`, `totalStarsEl`, `winStarsEl` | `game.js:760-795` |
| HTML ids | `camelCase` | `levelName`, `soundBtn`, `totalStarsValue`, `paintMeter` | `index.html:14-62` |
| CSS classes | `kebab-case`; state variants prefixed `is-` | `board-panel`, `meter-fill`, `level-tile`, `is-active`, `is-complete` | `styles.css:222`, `styles.css:254`, `styles.css:395`, `styles.css:207`, `styles.css:414` |
| CSS custom properties | `kebab-case` after a short scale-free name | `--ink-soft`, `--primary-dark`, `--radius` | `styles.css:3-14` |
| `data-*` attributes | single lowercase word; read back via `dataset` | `data-color`, `data-level`, `data-group` | `game.js:1199`, `game.js:1698`, `game.js:1727` |
| **Known naming inconsistency** | British "colour" dominates prose, stroke fields and function params, but American "color" appears in the active-colour state field and in `dataset`/CSS attribute names | `stroke.colour` (`game.js:1415`) vs `state.activeColor` (`game.js:935`); `handleSwatchClick(colour)` (`game.js:1492`) vs `swatch.dataset.color` (`game.js:1199`) | `game.js:935`, `game.js:1199`, `game.js:1415`, `game.js:1492` |

### 2) Formatting and Linting

- **Formatter:** none configured. Observed style, applied consistently:
  - 4-space indentation for all files (`game.js`, `styles.css`, `index.html` body).
  - Semicolons always present on statements.
  - Single quotes for all JS strings (`'use strict'`, `'#ffffff'`), double quotes only inside HTML attributes and inside a JS string that already contains single quotes (`game.js:267`: `'Arial, "Helvetica Neue", Helvetica, Verdana, sans-serif'`).
  - Multi-line object/array literals exploded one member per line with a trailing comma-free last member (`game.js:50-88`, `game.js:592-596`).
  - Blank line between functions; banner comments separated by blank lines.
  - Long single-expression calls wrapped so each argument group sits on its own line (`game.js:105-110`).
- **Linter:** none configured (scan `LINTING AND FORMATTING CONFIG`: "No linting or formatting config files found in project root"). No `.editorconfig`, `.eslintrc`, `.prettierrc`, or `package.json` lint script.
- **Most relevant observed rules** (enforced by convention, not tooling):
  1. `var` only — no `let`/`const`, no arrow functions, no classes, no template literals, no modules (`game.js:17` onwards).
  2. `'use strict';` at the top of the IIFE (`game.js:15`).
  3. Every function that is not self-evident carries a JSDoc comment (`/** ... */`).
  4. Guard-and-return early instead of nested conditionals (`game.js:1428`, `game.js:1751`, `game.js:1848`).
- **Run commands:** none — no lint or format script exists.

### 3) Import and Module Conventions

- **Import grouping/order:** N/A. There are no imports, no `require`, no `import`, no `<script type="module">`.
- **Alias vs relative policy:** N/A. All code lives in one scope.
- **Public exports/barrel policy:** nothing is exported. The entire app is one IIFE (`game.js:14` → `game.js:1906`) with private function declarations; the only outward-facing surface is the DOM (HTML ids/classes) and `localStorage`.
- **Consequence:** ordering inside the file is the only "module graph". Function declarations are hoisted, so later sections may be called from earlier ones; variable declarations are **not** hoisted, so `const`-style data (`SHAPE_CMDS`, `LEVELS`, `state`) must precede any run-time use (e.g. `loadLevel` is only called at `game.js:1905`).

### 4) Error and Logging Conventions

- **Error strategy:** *never throw, always degrade.* Every fallible platform call is wrapped in `try/catch` whose body is empty or returns a safe fallback:
  - `localStorage.getItem` → return default progress object (`game.js:808-812`).
  - `localStorage.setItem` → swallow (quota/private mode) with an explanatory comment (`game.js:833-838`).
  - `getImageData` → return `null`, which cascades to `LETTER_FALLBACK` (`game.js:317-321` → `game.js:289-300`).
  - `setPointerCapture` → swallow so a synthetic/already-released pointer still drags (`game.js:1776-1781`).
  - `letterLoops` inside `traceLetterPath` → return `null` on any throw (`game.js:510-517`).
- **Logging:** **none.** No `console.*`, no telemetry, no error reporting anywhere in the project (verified by a workspace-wide search for `console.` across `*.js`, `*.html`, `*.css` — zero matches).
- **Recovery over reporting:** failures fall back silently to a defined default (`LETTER_FALLBACK` square at `game.js:274`, default progress at `game.js:804`) and gameplay continues.
- **Sensitive-data redaction:** not applicable — the app stores no personal data, and `localStorage` holds only `{version, stars, best, lastLevel, muted}` (`game.js:804`).
- **Input validation posture:** all untrusted persisted input is type-checked before use (`parsed.stars && typeof parsed.stars === 'object'`, `Number.isInteger(parsed.lastLevel)`, `parsed.muted === true` — `game.js:826-829`), and level ids pass through `clampLevel` (`game.js:841-846`).

### 5) Testing Conventions

- **Test file naming/location rule:** none — there are no tests in the repository (`git ls-files` shows six files, none of them tests; scan `PERFORMANCE & TESTING` finds no configs).
- **Mocking strategy norm:** not established.
- **Coverage expectation:** none enforced; no coverage tool configured.
- **De facto verification today:** manual, in a browser — open `index.html` (`README.md:16-24`) or `python -m http.server` (`README.md:26-30`).
- Any test introduced later would need a convention decision; see `TESTING.md` and `CONCERNS.md`.

### 6) Evidence

- `game.js:1-41` — header comment, constants naming and comment style
- `game.js:1150-1191` — representative formatting (numbered `//` draw steps, wrapped calls)
- `game.js:797-846` — representative error handling (defensive parse, silent write failure)
- `styles.css:3-14`, `styles.css:191-215`, `styles.css:395-420` — CSS naming and `is-` state classes
- `index.html:13-63` — HTML id naming and ARIA attribute conventions
- `game.js:1193-1206` — representative DOM-building style and `dataset` usage
- `docs/codebase/.codebase-scan.txt` — `LINTING AND FORMATTING CONFIG`
