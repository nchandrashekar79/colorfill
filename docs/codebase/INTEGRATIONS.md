# External Integrations

> **Headline:** ColorFill Kids has **no outbound integrations**. It is a fully client-side, offline-capable static page. Everything below is a *browser platform* integration rather than a third-party service.

## Core Sections (Required)

### 1) Integration Inventory

| System | Type (API/DB/Queue/etc) | Purpose | Auth model | Criticality | Evidence |
|--------|--------------------------|---------|------------|-------------|----------|
| (none external) | — | No HTTP calls, no third-party APIs, no CDN assets, no analytics, no backend | N/A | — | Workspace-wide search for `fetch(`, `XMLHttpRequest`, `https`/`http` in source: only `game.js:1633` (`SVG_NS = 'http://www.w3.org/2000/svg'`, an XML namespace string, not a network call) and `README.md:26` (a localhost URL in docs). No `<script src>`/`<link href>` to any external host in `index.html:7`/`index.html:88`. |
| Browser `localStorage` | Client-side persistence | Stars, best score, last level, mute setting | Same-origin only; no credentials | Medium (progress loss only) | `game.js:24`, `game.js:797-846` |
| WebAudio (`AudioContext` / `webkitAudioContext`) | Platform API | Synthesised sound effects; no audio files shipped | None (no permission prompt; user gesture required) | Low (decorative) | `game.js:848-927` |
| Canvas 2D + `Path2D` | Platform API | Painting, clipping, hit testing, glyph rasterisation | None | **Critical** (core gameplay) | `game.js:761`, `game.js:1017`, `game.js:1040`, `game.js:307` |
| DOM / SVG (`createElement`, `createElementNS`) | Platform API | Palette buttons, level tiles, level-list thumbnails, overlays | None | High | `game.js:1195-1206`, `game.js:1633-1659`, `game.js:1693-1718` |
| Pointer Events + `setPointerCapture` | Platform API | Brush input on mouse/touch/pen | None | **Critical** | `game.js:1763-1789` |
| `ResizeObserver`, `window.resize`, `orientationchange`, `devicePixelRatio` | Platform API | Re-layout the board and rescale paint on size/orientation/zoom change | None | Medium | `game.js:1077-1107`, `game.js:1900-1904` |
| GitHub remote (`nchandrashekar79/basic_game`, branch `master`) | Source hosting | Version control only; not used by the runtime | Developer credentials | Low | `git branch -a`, `git log --oneline` |

### 2) Data Stores

| Store | Role | Access layer | Key risk | Evidence |
|-------|------|--------------|----------|----------|
| `window.localStorage`, key `colorfill-kids-v3` | Persists `{version: 1, stars: {levelId: 0-3}, best: {levelId: score}, lastLevel: number, muted: boolean}` | `loadProgress()` (read + defensive parse) and `saveProgress()` (write) — the only two access points in the codebase | **(a)** Blocked/unavailable storage (private mode, disabled cookies) silently disables persistence; **(b)** changing `STORAGE_KEY` discards all prior progress — already happened once for v2 → v3; **(c)** no size reclamation, though the data is bounded by `LEVELS.length` (78) | `game.js:24`, `game.js:801`, `game.js:803-831`, `game.js:833-838`; scan `SECURITY & COMPLIANCE`: no store config (no DB, no cache service) |

There is no server-side database, cache, queue or file store of any kind.

### 3) Secrets and Credentials Handling

- **Credential sources:** none. No `.env`, `.env.example`, `.env.sample`, or secrets manager; the app reads no environment variables (scan `ENVIRONMENT VARIABLE TEMPLATES`: "No .env.example or .env.template found").
- **Hardcoding checks:** workspace-wide search found no API keys, tokens, passwords or connection strings. The only literals of note are the storage key (`game.js:24`), colour hex values (`game.js:592-596`, `styles.css:3-14`) and the SVG XML namespace (`game.js:1633`).
- **Rotation or lifecycle notes:** N/A — nothing to rotate. Runtime state is limited to non-sensitive gameplay data in `localStorage`, readable only by pages on the same origin.

### 4) Reliability and Failure Behavior

- **Retry/backoff:** none needed (no network). Not applicable.
- **Timeout policy:** none needed. No asynchronous I/O beyond local platform calls.
- **Circuit-breaker / fallback behaviour:** implemented at each platform boundary, degrading silently rather than throwing:
  - `localStorage` read failure → default progress object (`game.js:804-811`).
  - `localStorage` write failure (quota or blocked) → swallowed, game continues (`game.js:833-838`, with an explanatory inline comment at `game.js:836`).
  - Glyph raster failure (`getImageData` throws, e.g. tainted/refused context) → `null` → `LETTER_FALLBACK` square path so the level is still paintable (`game.js:317-321`, `game.js:289-300`, `game.js:274`).
  - `setPointerCapture` throwing (synthetic or already-released pointer) → swallowed; dragging still works (`game.js:1776-1781`).
  - Missing `AudioContext`/`webkitAudioContext` → sound is skipped (`game.js:857-861`); sound starts muted if `progress.muted` (`game.js:855-857`).
  - Missing `ResizeObserver` → feature-detected and skipped, relying on `resize`/`orientationchange` (`game.js:1902-1904`).
  - Corrupt/absent `lastLevel` → clamped by `clampLevel()` (`game.js:826-828`, `game.js:841-846`).
- **User-visible failure mode:** worst realistic case is "progress does not persist" or "letters render as a plain square"; gameplay itself never blocks.

### 5) Observability for Integrations

- **Logging around external calls:** **none.** No `console.*`, no error reporting, no telemetry (verified by workspace-wide search for `console.` → zero matches). `try/catch` blocks are intentionally silent.
- **Metrics/tracing coverage:** none. No RUM, no analytics, no performance marks.
- **Missing visibility gaps:**
  1. No way to learn that a user's `localStorage` is blocked → silent loss of stars (`game.js:833-838`).
  2. No way to learn that a glyph raster failed → letters silently become the fallback square (`game.js:274`).
  3. No capture of uncaught errors or canvas context failures (`game.js:763` assumes `getContext('2d')` succeeds).
  4. No deployment/version marker surfaced to the client, so the running revision cannot be identified from a bug report.

### 6) Evidence

- `game.js:797-846` — the only persistence integration (read + write + clamping)
- `game.js:848-927` — the only audio integration (`audio()`, `tone()`, `SFX`)
- `game.js:303-323` — offscreen canvas glyph raster (platform service boundary)
- `game.js:1633` — the only absolute URL in source, an XML namespace constant
- `index.html:7`, `index.html:88` — the only external resource references (both local files)
- `docs/codebase/.codebase-scan.txt` — `ENVIRONMENT VARIABLE TEMPLATES`, `SECURITY & COMPLIANCE`, `CONTAINERS & ORCHESTRATION`, `CI/CD PIPELINES`
