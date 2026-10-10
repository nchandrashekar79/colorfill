# Testing Patterns

> **Headline: this repository has no automated tests, no test framework, no CI, and no coverage tooling.** This document records that fact precisely, and identifies what a future test setup would need to cover and where the seams are.

## Core Sections (Required)

### 1) Test Stack and Commands

- **Primary test framework:** **none.** There is no `package.json`, so no `scripts.test`; no `jest`, `vitest`, `mocha`, `karma`, `playwright` or `cypress` config file; no test file of any kind.
- **Assertion/mocking tools:** none installed.
- **Commands:**

```bash
# run all tests        — not available (no test runner)
# run unit tests       — not available
# run integration tests— not available
# run e2e tests        — not available
# run coverage         — not available

# the only way to exercise the app today (manual):
start index.html                 # open in a browser
python -m http.server            # optional: then http://localhost:8000
```

Evidence: scan `PERFORMANCE & TESTING` → "No performance testing configs detected"; scan `CI/CD PIPELINES` → "No CI/CD pipelines detected"; `git ls-files` lists exactly six files, none under `test/`, `tests/`, `__tests__/` or `spec/`, and none matching `*.test.*`/`*.spec.*`.

### 2) Test Layout

- **Test file placement pattern:** does not exist. Source is a flat root of three files (`index.html`, `styles.css`, `game.js`), so a test would have to establish a new convention (co-located `*.test.js` next to `game.js`, or a new `tests/` directory). **[ASK USER]** which convention to adopt.
- **Naming convention:** none established.
- **Setup files and where they run:** none. Any future browser-level suite would need a harness page that loads `index.html` (or the three files) into a DOM environment, because `game.js` runs as an IIFE that immediately touches `document.getElementById` for ~30 elements (`game.js:760-795`) and, at the very end, calls `loadLevel(state.levelId)` (`game.js:1905`). **There is no exported API and no dependency-injection seam**, so the code cannot be imported and unit-tested in isolation today.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | **No** | Pure functions that would be ideal first targets: `scalePath` (`game.js:564`), `hslToHex` (`game.js:598`), `polygonArea` (`game.js:351`), `simplifyLoop` (`game.js:361`), `distanceToSegment` (`game.js:1267`), `stepDirection` (`game.js:325`), `turnRank` (`game.js:337`), `clampLevel` (`game.js:841`), `computeStars`/`starTargets` (`game.js:985-1007`), `makePalette` (`game.js:628`), `makeLevels` (`game.js:717`), `sizeRatioFor` (`game.js:699`), `groupOfShape` (`game.js:706`), `linePath` (`game.js:198`) | All are module-private inside the IIFE — reachable only by extracting them or by testing through the UI/harness |
| Integration | **No** | Coverage-grid math against a canvas (`createGrid`/`markContact`/`coverageOf`, `game.js:1030-1077`, `1279-1305`), `replayStrokes` after undo (`game.js:1500`), level loading (`loadLevel`, `game.js:1583`), progress round-trip through `localStorage` (`game.js:803-838`) | Requires a real or headless canvas; `probe.isPointInPath` needs a board-sized context (`game.js:760-765`) |
| E2E | **No** | Core user flows: paint to 85 % → win dialog + stars persisted; Undo un-finishes; level list navigation and tabs; keyboard `Enter`/arrow keys; phone-width layout and rotation | Only manual browser testing is done today (`README.md:16-31`) |

### 4) Mocking and Isolation Strategy

- **Main mocking approach:** not established. For a future suite, the platform boundaries to fake are:
  - `localStorage` (`game.js:809`, `game.js:835`) — must be faked to test scale/private-mode behaviour.
  - `AudioContext` (`game.js:858`) — must be stubbed so tests do not need audio, and to test the "no audio API" path.
  - Canvas 2D context and `Path2D`/`isPointInPath` (`game.js:761`, `game.js:1040`, `game.js:1339`) — a real canvas (jsdom + `canvas`, or a browser runner) is needed; a hand-written stub would have to reimplement hit testing.
  - `ResizeObserver`, `devicePixelRatio`, `getBoundingClientRect` (`game.js:1902`, `game.js:1079`, `game.js:1078`) — needed to test layout/reshape paths deterministically.
- **Isolation guarantees:** none. All state lives in module-level singletons (`state` `game.js:932`, `world` `game.js:683`, `view` `game.js:946`, `progress` `game.js:801`, `LETTER_CACHE` `game.js:275`), so any test would need to reload the page/IIFE between cases rather than reset a function.
- **Common failure mode to expect:** state bleed between cases, plus `LETTER_CACHE` making letter geometry available only after the first use (traced lazily on demand — `game.js:276-294`).

### 5) Coverage and Quality Signals

- **Coverage tool + threshold:** none. `[TODO]` if the team wants a gate.
- **Current reported coverage:** 0 % automated; correctness is currently established by manual play-testing and by the README's stated guarantees.
- **Known gaps / risky untested areas** (ranked by blast radius):
  1. **Win/undo interaction** — `state.won` is not cleared by `undo`/`replayStrokes` (`game.js:1500-1532`), so re-completing a level after undoing can silently skip the win handling in `winLevel` (`game.js:1547-1550`). See `CONCERNS.md`.
  2. **Coverage completion threshold** — the 85 % rule (`COVERAGE_TARGET`, `game.js:39`) plus brush-reach fudge (`reach = radius * 1.15`, `game.js:1285`) is untested across shape sizes; small phone shapes and thin line patterns are the interesting cases.
  3. **Star math** — `starTargets` shrinks the thresholds to the palette size (`game.js:985-991`); the smallest palettes (4 colours) reach 3 stars at 3 and 4 colours. No test pins this behaviour.
  4. **Letter tracing** — depends on the installed font and on `getImageData` succeeding (`game.js:267`, `game.js:317-321`); output is not asserted anywhere, and the fallback path (`LETTER_FALLBACK`, `game.js:274`) is only exercised on failure.
  5. **Persistence compatibility** — `loadProgress` tolerates junk input (`game.js:813-830`) but there is no test covering corrupt JSON, wrong types, or a `lastLevel` beyond the level count.
  6. **Layout/reshape** — `reshapeBoard` rescales existing strokes on board shape change (`game.js:1109-1136`); the "paint survives rotation" promise (`README.md:96-99`) is manual-only.
  7. **Level generation invariants** — that `LEVELS.length === 78`, names are unique, and every level's `group` matches the level-list tabs (`game.js:717-736`, `game.js:706-716`).

### 6) Evidence

- `docs/codebase/.codebase-scan.txt` — `PERFORMANCE & TESTING`, `CI/CD PIPELINES`, `LINTING AND FORMATTING CONFIG`
- `git ls-files` — complete tracked file list (no test files)
- `README.md:16-31` — the only documented way to run the app (manual, in a browser)
- `game.js:1905` — unconditional `loadLevel(state.levelId)` at load, i.e. no test seam
- `game.js:760-795` — ~30 `getElementById` calls at load time, i.e. tests require a full DOM
