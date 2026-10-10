# Architecture

> Line references describe the working tree at the time of writing and move with the code: if a link looks off after an edit, re-derive it from the symbol name in the same sentence.

## Core Sections (Required)

### 1) Architectural Style

- **Primary style:** single-scope, **data-driven immediate-mode rendering over a retained stroke list**, organised as *layers by concern inside one file*.
- **Why this classification (evidence-backed):**
  - *Data-driven:* every shape is a **path string in a normalised 100 × 100 unit box** (`SHAPE_CMDS`, (`game.js:57-91` and levels are **generated** from that table rather than authored (`makeLevels`, (`game.js:724-724`. One linear map (`scalePath`, (`game.js:571-571` turns any shape into any board slot.
  - *Retained stroke list + replay:* paint is stored as commands in `state.strokes` (`game.js:955`) and re-marked/re-drawn after undo, clear, or board reshape (`replayStrokes`, (`game.js:1604-1609`); `drawStroke`, (`game.js:1266-1277`.
  - *Immediate mode:* nothing is retained per pixel; `renderBoard` (`game.js:1170-1216`) redraws four layers from state on each change.
  - *Layers by concern inside one IIFE:* twelve numbered sections in `game.js` (banners at lines 43, 106, 251, 588, 636, 756, 797, 848, 928, 1009, 1392, 1579, 1760, 1896).
- **Primary constraints that shape the design:**
  1. **Must run from `file://` with no modules and no bundler** (`game.js:10-12`; `README.md:19-24`). This forces a single closure-scoped IIFE, ES5 syntax, and no `fetch`/imports.
  2. **One shape per level, and only one** (`SHAPES_PER_LEVEL = 1`, `game.js:21`). Several call sites hardcode shape index `0` (`coverageOf(0)` in `updateMeter` (`game.js:1432`, `quickFill(0)` in the canvas keydown handler `game.js:1988`, `selectShape(0, true)` on focus `game.js:1976`).
  3. **The board's aspect ratio is owned by CSS, not JS** (`styles.css:236-244`; on phones `styles.css:510-512` sets `aspect-ratio: 1 / 1`). JS reads the element box and derives the logical board from it, never writing layout (`syncCanvasSize`, (`game.js:1097-1097`, which avoids a resize feedback loop.

### 2) System Flow

```text
index.html (DOM shell + <script src="game.js">)
  -> IIFE start-up: constants -> shape table (SHAPE_CMDS + line patterns + letter label keys)
       -> makeLevels() builds LEVELS (game.js:759) -> DOM handles cached (game.js:761)
       -> progress = loadProgress() (game.js:807) -> state singletons (game.js:938)
       -> event wiring (game.js:1846) -> loadLevel(state.levelId) (game.js:1997)
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
1. **Boot:** `index.html:89` loads `game.js`; the IIFE at `game.js:14` runs to the last line `game.js:2035`.
2. **Level model:** `makeLevels()` (`game.js:727`) spreads ten size steps over 78 shape keys, producing `{id, name, shape, group, step, paletteSize, slots}` (`game.js:734-743`); `layoutSlots()` (`game.js:753-763`) is called later because it needs the current board size.
3. **Preparation:** `prepareBoard()` (`game.js:1045-1052`) builds one `Path2D` from `scalePath(shapeCommands(shape), slot)` and one coverage grid per slot; `createGrid` (`game.js:1050-1050` marks mask cells whose centre passes `probe.isPointInPath`.
4. **Paint:** pointer handlers (`game.js:1940-1967`) start/extend/end a stroke; coverage is advanced analytically with `eachContactCell`/`markContact` (`game.js:1359-1369` — no pixel readback (`README.md:106-108`).
5. **Completion or erasure:** `endStroke` (`game.js:1519-1525` branches on `stroke.kind`: a brush stroke promotes the shape to a solid fill at ≥ 85 % coverage and calls `winLevel` once `state.filled.size === SHAPES_PER_LEVEL`; an eraser stroke withdraws that fill instead when coverage falls back below the target (`endErase`, (`game.js:1549-1560`.
6. **Persistence + feedback:** `winLevel` (`game.js:1652-1659` merges stars/best score into `progress` and calls `saveProgress()` (`game.js:845-850`), then shows the win overlay and plays the win/star tones.

### 3) Layer/Module Responsibilities

| Layer or module | Owns | Must not own | Evidence |
|-----------------|------|--------------|----------|
| Shape library (§1/1a/1b) | Unit-space geometry, path strings, glyph tracing, `scalePath` | Board pixels, scoring, level ids | `game.js:53-597` |
| Level table (§3) | Level generation, level groups, size steps, slot layout, `world` dimensions | Canvas drawing, event handling | `game.js:646-765` |
| DOM handles (§4) | Cached element references, main `ctx`, offscreen `probe` context | Behaviour | `game.js:766-808` |
| Progress (§5) | `localStorage` read/write, defensive parsing, level clamping | UI | `game.js:809-858` |
| Sound (§6) | Lazy `AudioContext`, `tone()`, `SFX` cues | Game rules | `game.js:860-939` |
| Game state (§7) | `state`, `view`, `shapePaths`, `shapeGrids`; derived values (brush width, distinct colours, score, stars) | Drawing, DOM events | `game.js:940-1040` |
| Rendering (§8) | Canvas sizing, coverage grid, draw pipeline, palette/tile/tab DOM rendering | Level navigation, input | `game.js:1041-1499` |
| Actions (§9) | Stroke lifecycle, undo/clear, win handling, replay | Registering listeners | `game.js:1466-1684` |
| Levels/navigation (§10) | `loadLevel`, `stepLevel`, overlay open/close, sound toggle, level list | Drawing internals | `game.js:1750-1936` |
| Event wiring (§11) | All listener registration and thin handlers | Business rules | `game.js:1876-2022` |
| Start (§12) | Resize observers + first `loadLevel` | Feature logic | `game.js:2024-2035` |

### 4) Reused Patterns

| Pattern | Where found | Why it exists |
|---------|-------------|---------------|
| Module/closure (IIFE + `'use strict'`) | `game.js:14-2035` | Single private scope with no globals leaked; required by the no-modules `file://` constraint |
| Data-driven table + generator | `SHAPE_CMDS` (`game.js:57`; `makeLevels` (`game.js:724`; `linePath` (`game.js:205` | 78 levels derived from 18 hand-written shapes, 8 generated line patterns and 52 traced letters, instead of hand-authoring 78 definitions |
| Lazy memoisation | `shapeCommands` + `LETTER_CACHE` (`game.js:282-290`; cached once per session per `README.md:94-98` | Letter tracing costs a glyph raster and contour walk, so it is deferred until a letter level is opened |
| Singleton mutable state | `state` (`game.js:942`, `world` (`game.js:690`, `view` (`game.js:958`, `progress` (`game.js:810`, `audioContext` (`game.js:862` | Only one level, one board and one board size exist at a time |
| Layered draw pipeline | `renderBoard` steps 1–4 `game.js:1185-1211` | Paper → solid fills → crayon strokes → outlines last keeps lines crisp |
| Command replay / idempotent rebuild | `replayStrokes` (`game.js:1604`; `resetGrids` (`game.js:1077` | Undo, clear and board reshape all rebuild coverage + fills from `state.strokes`, so the model is the single source of truth |
| Command objects with a `kind` discriminator | `stroke.kind` is `'brush'`, `'fill'` or `'erase'`, dispatched in `drawStroke` (`game.js:1266`, `markStroke` (`game.js:1392`, `endStroke` (`game.js:1519` and picked by `toolWidth` (`game.js:985` | One stroke list carries painting, whole-shape fills and erasures, so undo, clear, replay and the resize rescale need no special cases for the eraser |
| Symmetric grid traversal | `eachContactCell` (`game.js:1331` drives both `markContact` (`game.js:1359` and `unmarkContact` (`game.js:1370` | Paint and erase must use exactly the same cell bounds and distance test, otherwise the two directions would disagree |
| Guard / dirty check | `syncBoardLayout` (`game.js:1158`; `syncCanvasSize` (`game.js:1097`; `lastMeterPercent` (`game.js:961` (guarded in `updateMeter`, (`game.js:1432-1433` | Avoids redundant layout work, DOM churn and resize feedback loops |
| Graceful degradation | `LETTER_FALLBACK` (`game.js:281`); `try/catch` on storage `game.js:812-855`, `getImageData` `game.js:327-331`, `setPointerCapture` `game.js:1891-1897`; feature detection `game.js:868`, `game.js:2029` | Blocked storage, refused glyph raster or a missing API must never break gameplay |
| Adapter over platform API | `audio()` `game.js:866`; `toBoardPoint` (`game.js:1420`; `createGrid`/`shapeAt` via `probe` | Isolates browser differences (`AudioContext` vs `webkitAudioContext`, CSS px vs board units, canvas-origin hit tests) |

### 5) Known Architectural Risks

- **All logic in one 2035-line file with no enforced boundaries.** Sections are conventions only; nothing prevents cross-section coupling. The file is among the top-churn files (5 commits in the last 90 days — scan `HIGH-CHURN FILES`). Impact: higher regression risk per edit, no unit-test seams.
- **Global singletons cross section boundaries.** `state`, `world`, `view`, `shapePaths` and `shapeGrids` are mutated from several sections, so initialisation order matters implicitly: §4 caches DOM nodes at load, `world.height` is only correct after `syncCanvasSize()` (`game.js:1109`), and `letterPixels` needs a usable canvas context. Impact: a future "split into modules" refactor must untangle this ordering.
- **`SHAPES_PER_LEVEL = 1` is assumed, not enforced.** `coverageOf(0)`, `quickFill(0)` and `selectShape(0)` hardcode index 0 (`game.js:1467`, `game.js:1988`, `game.js:1976`) while the meter/win logic uses counts. Impact: raising `SHAPES_PER_LEVEL` would silently break the meter and the keyboard fill target.
- **`state.won` is a latch that `undo` still never clears.** `winLevel` returns early when `state.won` is true (`game.js:1653-1656`); `state.won` is reset by `loadLevel` (`game.js:1689`), `clearLevel` (`game.js:1639`) and by an eraser stroke that drops coverage below the target (`endErase`, `game.js:1549-1560`) — but **not** by `undo` (`game.js:1629-1638`) or `replayStrokes` (`game.js:1604-1609`). Impact: win → `Escape` (closes overlays, `game.js:2006-2008`) → `Undo` → re-finish the shape produces **no** win dialog and **no** persisted score, while the same sequence with the eraser works. See `CONCERNS.md`.
- **Coverage grid assumes square slots.** `createGrid` uses `slot.w` for both axes (`game.js:1063-1067`); this is only safe because `layoutSlots` always emits a square slot (`game.js:778-779`, `w: side, h: side`). Impact: any future non-square slot (e.g. a rectangle exercise) would break mask coverage silently.
- **No observability.** Zero `console.*`, telemetry or error reporting (verified by workspace-wide search), so a runtime failure on a user's device is invisible. Impact: field bugs can only be reproduced, never diagnosed from data.

### 6) Evidence

- `index.html:89` — script include (entry point wiring)
- `game.js:1-51` — top-level design comment and constants
- `game.js:1170-1216` — `renderBoard` four-layer pipeline
- `game.js:1466-1684` — action layer (stroke lifecycle, undo, win)
- `game.js:1876-2022` — event wiring
- `game.js:2024-2035` — start-up and observers
- `README.md:86-121` — documented implementation notes (incl. `README.md:106-108` on the coverage grid)
- `docs/codebase/.codebase-scan.txt` — `HIGH-CHURN FILES`, `CODE METRICS`
