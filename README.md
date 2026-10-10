# ColorFill Kids

A small browser colouring game. Each level shows **one shape at a time**. Pick a
colour and paint inside the shape like a colouring book. There are 78 levels: eight
pre-writing **line patterns** first (standing line, sleeping line, right and left
slanting lines, right, left, up and down curves), then the shape library from a circle
to an arrow, then the alphabet — capital `A` to `Z`, and then small `a` to `z` — while
the slot grows from tiny (level 1) to giant (level 78) and the palette grows from 4
colours to 13.

Written as a plain static site: no build step, no dependencies, no server needed. The
board is wide on a desktop screen and square on a phone, so the shape stays big on
small screens.

## Run it

Open `index.html` in a browser (double-click works — the script is a plain
`<script src>` with no modules, so `file://` is fine).

Optional, if you prefer serving over HTTP:

```powershell
python -m http.server
```

Then open <http://localhost:8000>.

## How to play

1. Pick a colour from the palette.
2. Press and drag inside the shape to paint it. Strokes stay inside the outline.
3. **Eraser** turns the brush into an eraser, which takes colour away again; picking a
   colour always switches back to the brush. The active tool shows on the button —
   plain **Eraser** for the brush, `🧽 Eraser: on` for the eraser. The eraser is wider
   than the brush, and a swipe that leaves the shape less than 85% painted withdraws
   the solid fill, so the level has to be finished again.
4. The shape is finished when it is 85% painted; it then snaps to a solid fill and
   the level is complete.

**Lock** in the header holds the page still while drawing: while it is on the page cannot
scroll, pan or select, so a stroke that reaches the edge of the board cannot drag the
board out of view. The setting is remembered, like the sound setting.

### Moving between levels

- **Previous level** and **Next level** sit under the board, and change level at any
  time — painting does not have to be finished first.
- The win dialog has the same buttons, plus **Play again** and **Levels**.
- **Levels** opens the level list, with a shape preview, the level name and the stars
  earned for each one. The list is split into three menus: **Line Patterns** (levels
  1–8), **Shapes** (levels 9–26) and **Alphabets** (levels 27–78, in a capital `A`–`Z`
  block and a small `a`–`z` block). It opens on the menu the current level belongs to;
  the arrow keys move between menus while a tab has focus.
- On level 1 **Previous level** is disabled; on level 78 **Next level** opens the level
  list instead.
- **Keyboard:** arrow keys (`←` / `→`, or `PageUp` / `PageDown`) change level. With the
  board focused, `Enter` or `Space` fills the shape in one go and `E` switches between
  the brush and the eraser.

### Stars and score

| Stars | Requirement |
| --- | --- |
| ★ | The shape is finished |
| ★★ | At least 3 different colours used (or every colour, on the smallest palettes) |
| ★★★ | At least 6 different colours used (or every colour, on the smallest palettes) |

Score is additive and never penalised: 10 points for the finished shape plus 25 points
for each different colour used, so experimenting with colours is always rewarded.
Best score, stars and the last level played are saved in `localStorage`, together with
the sound setting.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | Page shell: HUD, palette, board canvas, paint meter, level actions, level list and win dialogs |
| `styles.css` | Layout and visual style, responsive down to phone widths |
| `game.js` | Everything else, in sections: shape library, traced letters, palette, level table, sound, progress, canvas paint engine, actions, events |

### Notes on the implementation

- Shapes are described in a 100 × 100 unit box using only `M`, `L`, `C` and `Z` path
  commands, so scaling one definition to any slot size is a straight linear map. The
  level list reuses the same path data for its SVG thumbnails.
- The letter levels use the same box and the same commands, but their outlines are
  *traced* rather than written by hand: `traceLetterPath()` rasters a bold sans-serif
  glyph, follows the edge between glyph and background pixel by pixel, simplifies the
  result, and fits it to the 100 × 100 box. Contours are directed so a counter (the
  hole in an `O`, the bowl of an `a`) is wound the other way, which is what makes the
  non-zero fill, the clip and the hit test treat it as a hole. Each letter is traced
  once per session and cached, so a letter level costs a few milliseconds the first
  time it is opened. The level list draws letters as SVG text instead, to keep the
  dialog instant.
- The 78 levels are generated, not hand-written: `makeLevels()` walks the shape keys
  in order while ten size steps are spread evenly over the run, so every level has a
  unique shape/size pair and a unique name. Every level also carries a `group`
  (`lines`, `shape`, `capital` or `small`), which is what the level list tabs filter on.
- The line patterns are generated the same way as every other shape, from a centerline
  and a thickness: a straight line is two points, a curve is a sampled circular arc.
  `linePath()` offsets the centerline to both sides by half the thickness, closes it
  with two round caps and emits the usual `M`/`L`/`C`/`Z` commands, so a pattern is a
  closed band in the 100 × 100 box — it fills, clips, hit tests and previews in the
  level list with no change to the paint engine.
- The board keeps the aspect ratio of its own box: 1000 × 560 logical units on a wide
  screen, square on a phone. A level stores a size *step* rather than a size in pixels,
  and the slot is placed from the short side of the current board, so the shape fills a
  phone screen instead of staying a fixed pixel size. The smallest step is raised on a
  nearly square board (`sizeRatioMin()`), because a third of a phone board is too small
  to paint with a finger. On resize or rotation the level is laid out again and the
  strokes are scaled with it, so paint survives the change.
- The brush is a fraction of the shape, kept inside a finger friendly band of 20–56 CSS
  pixels, so it feels the same on a phone as on a desktop. The outline is likewise 3 CSS
  pixels wide on any screen. The eraser is the same band multiplied by
  `ERASER_SIZE_MULTIPLIER`, so it stays finger friendly while clearing a mistake fast.
- The eraser is a stroke like any other: it is painted in the paper's white and clipped
  to the shape, so it needs no separate layer, and redraw, undo, replay and the resize
  rescale all treat it the same way. It clears the coverage cells it passes (so the paint
  meter drops with it) and is never counted as a colour, for stars or for score.
- The board is a single `<canvas>`. Hit testing uses `Path2D` with
  `isPointInPath`, and every stroke is clipped to its shape, so paint cannot leak
  outside the outline.
- A stroke is followed with `setPointerCapture`, and a pointer released anywhere —
  including outside the board — closes the stroke through a `document` level
  `pointerup`, so a stroke never carries on from wherever the finger comes back. The
  lock button adds a body class that turns page scrolling, panning and selection off
  while it is on.
- Progress is measured on a 32 × 32 coverage grid: cells whose centre falls
  inside the outline form the mask, and painting marks the cells the brush touches.
  No per-frame pixel readback. The same number drives the paint meter under the board.
- Undo removes the last stroke and rebuilds coverage and fills from the remaining
  strokes, so undo also un-finishes the shape when appropriate.
- Sound is synthesised with WebAudio oscillators; there are no audio files. The audio
  context is created on the first click, as browsers require a user gesture.
