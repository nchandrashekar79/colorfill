# Coding Conventions

> Line references describe the working tree at the time of writing and move with the code: if a link looks off after an edit, re-derive it from the symbol name in the same sentence.

> Derived from the three source files, not from a config file — **no linter or formatter is configured** in this repository, so these are observed conventions enforced only by review.

## Core Sections (Required)

### 1) Naming Rules

| Item | Rule | Example | Evidence |
|------|------|---------|----------|
| Files | lowercase, single word, no separator; kebab-case if a separator is ever needed | `game.js`, `styles.css`, `index.html` | `git ls-files`; historical `.github/copilot-instructions.md` |
| Functions/methods | `camelCase`, verb-first, descriptive of the effect | `brushWidth()`, `markContact()`, `replayStrokes()`, `syncCanvasSize()`, `renderLevelGrid()` | `game.js:980`, `game.js:1336`, `game.js:1668`, `game.js:1109`, `game.js:1833` |
| Variables | `camelCase`; plural for collections; short loop indices (`i`, `index`, `row`, `column`) | `activeStroke`, `shapeGrids`, `firstColumn` | `game.js:953`, `game.js:960`, `game.js:1338` |
| Constants | `SCREAMING_SNAKE_CASE` for module-level tunables | `COVERAGE_TARGET`, `BRUSH_MIN_CSS`, `STORAGE_KEY`, `LINE_THICKNESS` | `game.js:17-48`, `game.js:126` |
| Module-scope mutable state | lowercase noun, no prefix/suffix | `state`, `world`, `view`, `progress`, `audioContext` | `game.js:942`, `game.js:690`, `game.js:958`, `game.js:810`, `game.js:862` |
| DOM handle variables | element purpose + type suffix `El`/`Btn`, suffixed to avoid collision with the id | `undoBtn`, `levelGridEl`, `totalStarsEl`, `winStarsEl` | `game.js:770-807` |
| HTML ids | `camelCase` | `levelName`, `soundBtn`, `totalStarsValue`, `paintMeter` | `index.html:14-63` |
| CSS classes | `kebab-case`; state variants prefixed `is-` | `board-panel`, `meter-fill`, `level-tile`, `is-active`, `is-complete` | `styles.css:229`, `styles.css:261`, `styles.css:402`, `styles.css:214`, `styles.css:421` |
| CSS custom properties | `kebab-case` after a short scale-free name | `--ink-soft`, `--primary-dark`, `--radius` | `styles.css:3-14` |
| `data-*` attributes | single lowercase word; read back via `dataset` | `data-color`, `data-level`, `data-group` | `game.js:1243`, `game.js:1870`, `game.js:1904` |
| **Known naming inconsistency** | British "colour" dominates prose, stroke fields and function params, but American "color" appears in the active-colour state field and in `dataset`/CSS attribute names | `stroke.colour` (`game.js:1544`) vs `state.activeColor` (`game.js:949`); `handleSwatchClick(colour)` (`game.js:1652`) vs `swatch.dataset.color` (`game.js:1243`) | `game.js:949`, `game.js:1243`, `game.js:1544`, `game.js:1652` |

### 2) Formatting and Linting

- **Formatter:** none configured. Observed style, applied consistently:
  - 4-space indentation for all files (`game.js`, `styles.css`, `index.html` body).
  - Semicolons always present on statements.
  - Single quotes for all JS strings (`'use strict'`, `'#ffffff'`), double quotes only inside HTML attributes and inside a JS string that already contains single quotes (`game.js:277`: `'Arial, "Helvetica Neue", Helvetica, Verdana, sans-serif'`).
  - Multi-line object/array literals exploded one member per line with a trailing comma-free last member (`game.js:60-98`, `game.js:602-606`).
  - Blank line between functions; banner comments separated by blank lines.
  - Long single-expression calls wrapped so each argument group sits on its own line (`game.js:115-120`).
- **Linter:** none configured (scan `LINTING AND FORMATTING CONFIG`: "No linting or formatting config files found in project root"). No `.editorconfig`, `.eslintrc`, `.prettierrc`, or `package.json` lint script.
- **Most relevant observed rules** (enforced by convention, not tooling):
  1. `var` only — no `let`/`const`, no arrow functions, no classes, no template literals, no modules (`game.js:17` onwards).
  2. `'use strict';` at the top of the IIFE (`game.js:15`).
  3. Every function that is not self-evident carries a JSDoc comment (`/** ... */`).
  4. Guard-and-return early instead of nested conditionals (`game.js:1557`, `game.js:1928`, `game.js:2031`).
- **Run commands:** none — no lint or format script exists.

### 3) Import and Module Conventions

- **Import grouping/order:** N/A. There are no imports, no `require`, no `import`, no `<script type="module">`.
- **Alias vs relative policy:** N/A. All code lives in one scope.
- **Public exports/barrel policy:** nothing is exported. The entire app is one IIFE (`game.js:14` → `game.js:2035`) with private function declarations; the only outward-facing surface is the DOM (HTML ids/classes) and `localStorage`.
- **Consequence:** ordering inside the file is the only "module graph". Function declarations are hoisted, so later sections may be called from earlier ones; variable declarations are **not** hoisted, so `const`-style data (`SHAPE_CMDS`, `LEVELS`, `state`) must precede any run-time use (e.g. `loadLevel` is only called at `game.js:2034`).

### 4) Error and Logging Conventions

- **Error strategy:** *never throw, always degrade.* Every fallible platform call is wrapped in `try/catch` whose body is empty or returns a safe fallback:
  - `localStorage.getItem` → return default progress object (`game.js:820-824`).
  - `localStorage.setItem` → swallow (quota/private mode) with an explanatory comment (`game.js:845-850`).
  - `getImageData` → return `null`, which cascades to `LETTER_FALLBACK` (`game.js:281-281` → `game.js:299-310`).
  - `setPointerCapture` → swallow so a synthetic/already-released pointer still drags (`game.js:1954-1959`).
  - `letterLoops` inside `traceLetterPath` → return `null` on any throw (`game.js:520-527`).
- **Logging:** **none.** No `console.*`, no telemetry, no error reporting anywhere in the project (verified by a workspace-wide search for `console.` across `*.js`, `*.html`, `*.css` — zero matches).
- **Recovery over reporting:** failures fall back silently to a defined default (`LETTER_FALLBACK` square at `game.js:284`, default progress at `game.js:816`) and gameplay continues.
- **Sensitive-data redaction:** not applicable — the app stores no personal data, and `localStorage` holds only `{version, stars, best, lastLevel, muted}` (`game.js:816`).
- **Input validation posture:** all untrusted persisted input is type-checked before use (`parsed.stars && typeof parsed.stars === 'object'`, `Number.isInteger(parsed.lastLevel)`, `parsed.muted === true` — `game.js:838-841`), and level ids pass through `clampLevel` (`game.js:851-861`.

### 5) Testing Conventions

- **Test file naming/location rule:** none — there are no tests in the repository (`git ls-files` shows six files, none of them tests; scan `PERFORMANCE & TESTING` finds no configs).
- **Mocking strategy norm:** not established.
- **Coverage expectation:** none enforced; no coverage tool configured.
- **De facto verification today:** manual, in a browser — open `index.html` (`README.md:16-24`) or `python -m http.server` (`README.md:26-30`).
- Any test introduced later would need a convention decision; see `TESTING.md` and `CONCERNS.md`.

### 6) Evidence

- `game.js:1-51` — header comment, constants naming and comment style
- `game.js:1182-1234` — representative formatting (numbered `//` draw steps, wrapped calls)
- `game.js:809-858` — representative error handling (defensive parse, silent write failure)
- `styles.css:3-14`, `styles.css:198-222`, `styles.css:402-427` — CSS naming and `is-` state classes
- `index.html:13-64` — HTML id naming and ARIA attribute conventions
- `game.js:1236-1250` — representative DOM-building style and `dataset` usage
- `docs/codebase/.codebase-scan.txt` — `LINTING AND FORMATTING CONFIG`
