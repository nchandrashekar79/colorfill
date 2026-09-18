# ColorFill Kids

A small browser colouring game. Each level shows **one shape at a time**. Pick a
colour and paint inside the shape like a colouring book. There are 50 levels: the
shape cycles through the shape library while the slot grows from tiny (level 1) to
giant (level 50), and the palette grows from 4 colours to 13.

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
3. The shape is finished when it is 85% painted; it then snaps to a solid fill and
   the level is complete.

### Moving between levels

- **Previous level** and **Next level** sit under the board, and change level at any
  time — painting does not have to be finished first.
- The win dialog has the same buttons, plus **Play again** and **Levels**.
- **Levels** opens the level list: pick any of the 50 levels, with a shape preview,
  the level name and the stars earned for each one.
- On level 1 **Previous level** is disabled; on level 50 **Next level** opens the level
  list instead.
- **Keyboard:** arrow keys (`←` / `→`, or `PageUp` / `PageDown`) change level. With the
  board focused, `Enter` or `Space` fills the shape in one go.

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
| `game.js` | Everything else, in sections: shape library, palette, level table, sound, progress, canvas paint engine, actions, events |

### Notes on the implementation

- Shapes are described in a 100 × 100 unit box using only `M`, `L`, `C` and `Z` path
  commands, so scaling one definition to any slot size is a straight linear map. The
  level list reuses the same path data for its SVG thumbnails.
- The 50 levels are generated, not hand-written: `makeLevels()` steps through the shape
  library while a size step grows the slot in ten steps, so every level has a unique
  shape/size pair and a unique name.
- The board keeps the aspect ratio of its own box: 1000 × 560 logical units on a wide
  screen, square on a phone. A level stores a size *step* rather than a size in pixels,
  and the slot is placed from the short side of the current board, so the shape fills a
  phone screen instead of staying a fixed pixel size. The smallest step is raised on a
  nearly square board (`sizeRatioMin()`), because a third of a phone board is too small
  to paint with a finger. On resize or rotation the level is laid out again and the
  strokes are scaled with it, so paint survives the change.
- The brush is a fraction of the shape, kept inside a finger friendly band of 20–56 CSS
  pixels, so it feels the same on a phone as on a desktop. The outline is likewise 3 CSS
  pixels wide on any screen.
- The board is a single `<canvas>`. Hit testing uses `Path2D` with
  `isPointInPath`, and every stroke is clipped to its shape, so paint cannot leak
  outside the outline.
- Progress is measured on a 32 × 32 coverage grid: cells whose centre falls
  inside the outline form the mask, and painting marks the cells the brush touches.
  No per-frame pixel readback. The same number drives the paint meter under the board.
- Undo removes the last stroke and rebuilds coverage and fills from the remaining
  strokes, so undo also un-finishes the shape when appropriate.
- Sound is synthesised with WebAudio oscillators; there are no audio files. The audio
  context is created on the first click, as browsers require a user gesture.
