# ColorFill Kids

A small browser colouring game. Each level shows **one shape at a time**. Pick a
colour and paint inside the shape like a colouring book. There are 50 levels: the
shape cycles through the shape library while the slot grows from tiny (level 1) to
giant (level 50), and the palette grows from 4 colours to 13.

Written as a plain static site: no build step, no dependencies, no server needed.

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
  library while a size table grows the slot in ten steps, so every level has a unique
  shape/size pair and a unique name.
- The brush width is a fraction of the shape size (16–48 board units), so a tiny shape
  is not flooded by one stroke and a giant shape is not tedious to fill.
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
