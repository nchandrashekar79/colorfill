# Architecture

## Core Sections (Required)

### 1) Architectural Style

- **Primary style:** single-scope, **data-driven immediate-mode rendering over a retained stroke list**, organised as *layers by concern inside one file*.
- **Why this classification (evidence-backed):**
  - *Data-driven:* every shape is a **path string in a normalised 100 × 100 unit box** (`SHAPE_CMDS`, `game.js:50-88`) and levels are **generated** from that table rather than authored (`makeLevels`, `game.js:717-736`). One linear map (`scalePath`, `game.js:564-586`) turns any shape into any board slot.
  - *Retained stroke list + replay:* paint is stored as commands in `state.strokes` (`game.js:939`) and re-marked/re-drawn after undo, clear, or board reshape (`replayStrokes`, `game.js:1500-1521`; `drawStroke`, `game.js:1218-1246`).
  - *Immediate mode:* nothing is retained per pixel; `renderBoard` (`game.js:1150-1191`) redraws four layers from state on each change.
  - *Layers by concern inside one IIFE:* twelve numbered sections in `game.js` (banners at lines 43, 106, 251, 588, 636, 756, 797, 848, 928, 1009, 1392, 1579, 1760, 1896).
- **Primary constraints that shape the design:**
  1. **Must run from `file://` with no modules and no bundler** (`game.js:10-12`; `README.md:19-24`). This forces a single closure-scoped IIFE, ES5 syntax, and no `fetch`/imports.
  2. **One shape per level, and only one** (`SHAPES_PER_LEVEL = 1`, `game.js:21`). Several call sites hardcode shape index `0` (`coverageOf(0)` in `updateMeter` `game.js:1360`, `quickFill(0)` in the canvas keydown handler `game.js:1805`, `selectShape(0, true)` on focus `game.js:1798`).
  3. **The board's aspect ratio is owned by CSS, not JS** (`styles.css:229-237`; on phones `styles.css:503-505` sets `aspect-ratio: 1 / 1`). JS reads the element box and derives the logical board from it, never writing layout (`syncCanvasSize`, `game.js:1077-1107`), which avoids a resize feedback loop.

### 2) System Flow

```text
index.html (DOM shell + <script src="game.js">)
  -> IIFE start-up: constants -> shape table (SHAPE_CMDS + line patterns + letter label keys)
       -> makeLevels() builds LEVELS (game.js:754) -> DOM handles cached (game.js:756)
       -> progress = loadProgress() (game.js:801) -> state singletons (game.js:932)
       -> event wiring (game.js:1760) -> loadLevel(state.levelId) (game.js:1905)
  -> loadLevel: clampLevel -> makePalette -> syncCanvasSize -> prepareBoard
       (Path2D per slot + coverage grid) -> resetGrids -> renderPalette -> renderBoard -> updateHud
  -> input: pointerdown -> toBoardPoint -> shapeAt (probe.isPointInPath) -> startStroke
       -> markStroke (coverage grid) + drawStroke -> pointermove -> extendStroke
       -> pointerup -> endStroke
  -> endStroke: coverageOf(shapeId) >= COVERAGE_TARGET(0.85)
       -> state.filled.set(shapeId, colour) -> renderBoard
       -> state.filled.size === SHAPES_PER_LEVEL -> winLevel
  -> winLevel: computeStars/currentScore -> progress.stars/best/lastLevel -> saveProgress (localStorage)
       -> win overlay shown (no navigation away from the page)
```

Steps with evidence:
1. **Boot:** `index.html:88` loads `game.js`; the IIFE at `game.js:14` runs to the last line `game.js:1905`.
2. **Level model:** `makeLevels()` (`game.js:717`) spreads ten size steps over 78 shape keys, producing `{id, name, shape, group, step, paletteSize, slots}` (`game.js:724-733`); `layoutSlots()` (`game.js:743-753`) is called later because it needs the current board size.
3. **Preparation:** `prepareBoard()` (`game.js:1013-1020`) builds one `Path2D` from `scalePath(shapeCommands(shape), slot)` and one coverage grid per slot; `createGrid` (`game.js:1030-1055`) marks mask cells whose centre passes `probe.isPointInPath`.
4. **Paint:** pointer handlers (`game.js:1763-1789`) start/extend/end a stroke; coverage is advanced analytically with `markContact` (`game.js:1279-1305`) — no pixel readback (`README.md:100-102`).
5. **Completion:** `endStroke` (`game.js:1443-1463`) promotes the shape to a solid fill at ≥ 85 % coverage and calls `winLevel` once `state.filled.size === SHAPES_PER_LEVEL`.
6. **Persistence + feedback:** `winLevel` (`game.js:1546-1577`) merges stars/best score into `progress` and calls `saveProgress()` (`game.js:833-838`), then shows the win overlay and plays the win/star tones.

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| Shape library (§1/1a/1b) | Unit-space geometry, path strings, glyph tracing, `scalePath` | Board pixels, scoring, level ids | `game.js:43-587` |
| Level table (§3) | Level generation, level groups, size steps, slot layout, `world` dimensions | Canvas drawing, event handling | `game.js:636-755` |
| DOM handles (§4) | Cached element references, main `ctx`, offscreen `probe` context | Behaviour | `game.js:756-796` |
| Progress (§5) | `localStorage` read/write, defensive parsing, level clamping | UI | `game.js:797-846` |
| Sound (§6) | Lazy `AudioContext`, `tone()`, `SFX` cues | Game rules | `game.js:848-927` |
| Game state (§7) | `state`, `view`, `shapePaths`, `shapeGrids`; derived values (brush width, distinct colours, score, stars) | Drawing, DOM events | `game.js:928-1008` |
| Rendering (§8) | Canvas sizing, coverage grid, draw pipeline, palette/tile/tab DOM rendering | Level navigation, input | `game.js:1009-1391` |
| Actions (§9) | Stroke lifecycle, undo/clear, win handling, replay | Registering listeners | `game.js:1392-1578` |
| Levels/navigation (§10) | `loadLevel`, `stepLevel`, overlay open/close, sound toggle, level list | Drawing internals | `game.js:1579-1759` |
| Event wiring (§11) | All listener registration and thin handlers | Business rules | `game.js:1760-1894` |
| Start (§12) | Resize observers + first `loadLevel` | Feature logic | `game.js:1896-1906` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Module/closure (IIFE + `'use strict'`) | `game.js:14-1906` | Single private scope with no globals leaked; required by the no-modules `file://` constraint |
| Data-driven table + generator | `SHAPE_CMDS` `game.js:50`; `makeLevels` `game.js:717`; `linePath` `game.js:198` | 78 levels derived from 18 hand-written shapes, 8 generated line patterns and 52 traced letters, instead of hand-authoring 78 definitions |
| Lazy memoisation | `shapeCommands` + `LETTER_CACHE` `game.js:276-294`; cached once per session per `README.md:88-92` | Letter tracing costs a glyph raster and contour walk, so it is deferred until a letter level is opened |
| Singleton mutable state | `state` `game.js:932`, `world` `game.js:683`, `view` `game.js:946`, `progress` `game.js:801`, `audioContext` `game.js:852` | Only one level, one board and one board size exist at a time |
| Layered draw pipeline | `renderBoard` steps 1–4 `game.js:1160-1190` | Paper → solid fills → crayon strokes → outlines last keeps lines crisp |
| Command replay / idempotent rebuild | `replayStrokes` `game.js:1500`; `resetGrids` `game.js:1057` | Undo, clear and board reshape all rebuild coverage + fills from `state.strokes`, so the model is the single source of truth |
| Guard / dirty check | `syncBoardLayout` `game.js:1138`; `syncCanvasSize` `game.js:1077`; `lastMeterPercent` `game.js:949` (guarded in `updateMeter`, `game.js:1363-1365`) | Avoids redundant layout work, DOM churn and resize feedback loops |
| Graceful degradation | `LETTER_FALLBACK` `game.js:274`; `try/catch` on storage `game.js:806-845`, `getImageData` `game.js:317-321`, `setPointerCapture` `game.js:1775-1781`; feature detection `game.js:858`, `game.js:1902` | Blocked storage, refused glyph raster or a missing API must never break gameplay |
| Adapter over platform API | `audio()` `game.js:854`; `toBoardPoint` `game.js:1346`; `createGrid`/`shapeAt` via `probe` | Isolates browser differences (`AudioContext` vs `webkitAudioContext`, CSS px vs board units, canvas-origin hit tests) |

### 5) Known Architectural Risks

- **All logic in one 1906-line file with no enforced boundaries.** Sections are conventions only; nothing prevents cross-section coupling. The file is among the top-churn files (5 commits in the last 90 days — scan `HIGH-CHURN FILES`). Impact: higher regression risk per edit, no unit-test seams.
- **Global singletons cross section boundaries.** `state`, `world`, `view`, `shapePaths` and `shapeGrids` are mutated from several sections, so initialisation order matters implicitly: §4 caches DOM nodes at load, `world.height` is only correct after `syncCanvasSize()` (`game.js:1077`), and `letterPixels` needs a usable canvas context. Impact: a future "split into modules" refactor must untangle this ordering.
- **`SHAPES_PER_LEVEL = 1` is assumed, not enforced.** `coverageOf(0)`, `quickFill(0)` and `selectShape(0)` hardcode index 0 (`game.js:1360`, `game.js:1805`, `game.js:1798`) while the meter/win logic uses counts. Impact: raising `SHAPES_PER_LEVEL` would silently break the meter and the keyboard fill target.
- **`state.won` is a latch that undo never clears.** `winLevel` returns early when `state.won` is true (`game.js:1547-1550`); `state.won` is reset only by `loadLevel` (`game.js:1591`) and `clearLevel` (`game.js:1538`) — not by `undo` (`game.js:1523-1532`) or `replayStrokes` (`game.js:1500-1521`). Impact: win → `Escape` (closes overlays, `game.js:1878-1880`) → `Undo` → re-finish the shape produces **no** win dialog and **no** persisted score. See `CONCERNS.md`.
- **Coverage grid assumes square slots.** `createGrid` uses `slot.w` for both axes (`game.js:1031-1035`); this is only safe because `layoutSlots` always emits a square slot (`game.js:768-769`, `w: side, h: side`). Impact: any future non-square slot (e.g. a rectangle exercise) would break mask coverage silently.
- **No observability.** Zero `console.*`, telemetry or error reporting (verified by workspace-wide search), so a runtime failure on a user's device is invisible. Impact: field bugs can only be reproduced, never diagnosed from data.

### 6) Evidence

- `index.html:88` — script include (entry point wiring)
- `game.js:1-41` — top-level design comment and constants
- `game.js:1150-1191` — `renderBoard` four-layer pipeline
- `game.js:1392-1578` — action layer (stroke lifecycle, undo, win)
- `game.js:1760-1894` — event wiring
- `game.js:1896-1906` — start-up and observers
- `README.md:80-110` — documented implementation notes (incl. `README.md:100-102` on the coverage grid)
- `docs/codebase/.codebase-scan.txt` — `HIGH-CHURN FILES`, `CODE METRICS`
