# Testing Patterns

> Line references describe the working tree at the time of writing and move with the code: if a link looks off after an edit, re-derive it from the symbol name in the same sentence.

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
- **Setup files and where they run:** none. Any future browser-level suite would need a harness page that loads `index.html` (or the three files) into a DOM environment, because `game.js` runs as an IIFE that immediately touches `document.getElementById` for ~30 elements (`game.js:770-807`) and, at the very end, calls `loadLevel(state.levelId)` (`game.js:2034`). **There is no exported API and no dependency-injection seam**, so the code cannot be imported and unit-tested in isolation today.

### 3) Test Scope Matrix

| Scope | Covered? | Typical target | Notes |
|-------|----------|----------------|-------|
| Unit | **No** | Pure functions that would be ideal first targets: `scalePath` (`game.js:571`, `hslToHex` (`game.js:605`, `polygonArea` (`game.js:358`, `simplifyLoop` (`game.js:368`, `distanceToSegment` (`game.js:1315`, `stepDirection` (`game.js:332`, `turnRank` (`game.js:344`, `clampLevel` (`game.js:851`, `computeStars`/`starTargets` (`game.js:1005-1012`, `makePalette` (`game.js:635`, `makeLevels` (`game.js:724`, `sizeRatioFor` (`game.js:706`, `groupOfShape` (`game.js:713`, `linePath` (`game.js:205` | All are module-private inside the IIFE — reachable only by extracting them or by testing through the UI/harness |
| Integration | **No** | Coverage-grid math against a canvas (`createGrid` `game.js:1050`, `markContact` `game.js:1359-1369`, `coverageOf` `game.js:1084`), `replayStrokes` after undo (`game.js:1604`), level loading (`loadLevel` `game.js:1689`), progress round-trip through `localStorage` (`game.js:812-847`) | Requires a real or headless canvas; `probe.isPointInPath` needs a board-sized context (`game.js:774-779`) |
| E2E | **No** | Core user flows: paint to 85 % → win dialog + stars persisted; Undo un-finishes; level list navigation and tabs; keyboard `Enter`/arrow keys; phone-width layout and rotation | Only manual browser testing is done today (`README.md:16-31`) |

### 4) Mocking and Isolation Strategy

- **Main mocking approach:** not established. For a future suite, the platform boundaries to fake are:
  - `localStorage` (`game.js:821`, `game.js:847`) — must be faked to test scale/private-mode behaviour.
  - `AudioContext` (`game.js:870`) — must be stubbed so tests do not need audio, and to test the "no audio API" path.
  - Canvas 2D context and `Path2D`/`isPointInPath` (`game.js:771`, `game.js:1072`, `game.js:1445`) — a real canvas (jsdom + `canvas`, or a browser runner) is needed; a hand-written stub would have to reimplement hit testing.
  - `ResizeObserver`, `devicePixelRatio`, `getBoundingClientRect` (`game.js:2029`, `game.js:1099`, `game.js:1098`) — needed to test layout/reshape paths deterministically.
- **Isolation guarantees:** none. All state lives in module-level singletons (`state` (`game.js:942`, `world` (`game.js:690`, `view` (`game.js:958`, `progress` (`game.js:810`, `LETTER_CACHE` (`game.js:282`, so any test would need to reload the page/IIFE between cases rather than reset a function.
- **Common failure mode to expect:** state bleed between cases, plus `LETTER_CACHE` making letter geometry available only after the first use (traced lazily on demand — `game.js:286-304`).

### 5) Coverage and Quality Signals

- **Coverage tool + threshold:** none. `[TODO]` if the team wants a gate.
- **Current reported coverage:** 0 % automated; correctness is currently established by manual play-testing and by the README's stated guarantees.
- **Known gaps / risky untested areas** (ranked by blast radius):
  1. **Win/undo interaction** — `state.won` is not cleared by `undo`/`replayStrokes` (`game.js:1604-1609`, so re-completing a level after undoing can silently skip the win handling in `winLevel` (`game.js:1652-1659`. The eraser path does reset it (`endErase`, (`game.js:1549-1560`, which makes the undo case an inconsistency rather than an outright design choice. See `CONCERNS.md`.
  2. **The eraser** — `unmarkContact` (`game.js:1370`, the `'erase'` branch of `endStroke` (`game.js:1519-1525` and `endErase` (`game.js:1549-1560` have no automated coverage in the repository; the invariants to protect are that coverage never goes negative, that the eraser is never counted as a colour (`distinctColourCount`, (`game.js:991`, and that undo replays erasures in order (`replayStrokes`, (`game.js:1604`.
  2. **Coverage completion threshold** — the 85 % rule (`COVERAGE_TARGET`, (`game.js:46` plus brush-reach fudge (`reach = radius * 1.15`, `game.js:1368`) is untested across shape sizes; small phone shapes and thin line patterns are the interesting cases.
  3. **Star math** — `starTargets` shrinks the thresholds to the palette size (`game.js:1017-1023`); the smallest palettes (4 colours) reach 3 stars at 3 and 4 colours. No test pins this behaviour.
  4. **Letter tracing** — depends on the installed font and on `getImageData` succeeding (`game.js:277`, `game.js:327-331`); output is not asserted anywhere, and the fallback path (`LETTER_FALLBACK`, (`game.js:281` is only exercised on failure.
  5. **Persistence compatibility** — `loadProgress` tolerates junk input (`game.js:812-847`) but there is no test covering corrupt JSON, wrong types, or a `lastLevel` beyond the level count.
  6. **Layout/reshape** — `reshapeBoard` rescales existing strokes on board shape change (`game.js:1141-1168`); the "paint survives rotation" promise (`README.md:102-105`) is manual-only.
  7. **Level generation invariants** — that `LEVELS.length === 78`, names are unique, and every level's `group` matches the level-list tabs (`game.js:727-746`, `game.js:716-726`).

### 6) Evidence

- `docs/codebase/.codebase-scan.txt` — `PERFORMANCE & TESTING`, `CI/CD PIPELINES`, `LINTING AND FORMATTING CONFIG`
- `git ls-files` — complete tracked file list (no test files)
- `README.md:16-31` — the only documented way to run the app (manual, in a browser)
- `game.js:2034` — unconditional `loadLevel(state.levelId)` at load, i.e. no test seam
- `game.js:770-807` — ~30 `getElementById` calls at load time, i.e. tests require a full DOM
