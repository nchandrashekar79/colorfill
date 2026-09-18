/*
 * ColorFill Kids — paint one shape per level, 50 levels played in any order.
 *
 * Free colouring: there is no right or wrong colour. The player presses and drags
 * inside the shape to paint it like a colouring book; strokes are clipped to the
 * shape outline. The shape is finished once it is 85% painted, then it is snapped
 * to a solid fill and the level is complete. Previous and next level buttons (and
 * the arrow keys) move between levels at any time. Stars reward colour variety,
 * score rewards the finished shape and the distinct colours used.
 *
 * Loaded with a plain <script src> (no modules) so the game also runs when the
 * file is opened directly from disk with file://.
 */
(function () {
    'use strict';

    var UNFILLED = '#ffffff';
    var OUTLINE_COLOUR = '#334155';
    var SELECTED_COLOUR = '#f59e0b';
    /* One shape at a time: a level is complete when its single shape is painted. */
    var SHAPES_PER_LEVEL = 1;
    var STORAGE_KEY = 'colorfill-kids-v2';
    var STAR_TWO_COLOURS = 3;
    var STAR_THREE_COLOURS = 6;
    var POINTS_PER_SHAPE = 10;
    var POINTS_PER_COLOUR = 25;
    var BOARD_WIDTH = 1000;
    var BOARD_HEIGHT = 560;
    var BRUSH_MIN_WIDTH = 16;
    var BRUSH_MAX_WIDTH = 48;
    var BRUSH_SIZE_RATIO = 0.09;
    var COVERAGE_CELLS = 32;
    var COVERAGE_TARGET = 0.85;
    var OUTLINE_WIDTH = 3;
    var SELECTED_WIDTH = 6;

    /* ==========================================================
       1. Shape library
       Every shape lives in a 100 x 100 unit box and is described with
       only M, L, C and Z commands, so scaling to any slot is a plain
       linear map of the numbers.
       ========================================================== */

    var SHAPE_CMDS = {
        circle:
            'M 50 0 C 77.6 0 100 22.4 100 50 C 100 77.6 77.6 100 50 100 ' +
            'C 22.4 100 0 77.6 0 50 C 0 22.4 22.4 0 50 0 Z',
        oval:
            'M 50 18 C 77.6 18 100 32.3 100 50 C 100 67.7 77.6 82 50 82 ' +
            'C 22.4 82 0 67.7 0 50 C 0 32.3 22.4 18 50 18 Z',
        square: 'M 6 6 L 94 6 L 94 94 L 6 94 Z',
        rect: 'M 2 26 L 98 26 L 98 74 L 2 74 Z',
        triangle: 'M 50 6 L 96 94 L 4 94 Z',
        rightTriangle: 'M 8 6 L 8 94 L 94 94 Z',
        diamond: 'M 50 2 L 98 50 L 50 98 L 2 50 Z',
        pentagon: 'M 50 2 L 95.66 35.17 L 78.21 88.83 L 21.79 88.83 L 4.34 35.17 Z',
        hexagon: 'M 98 50 L 74 91.57 L 26 91.57 L 2 50 L 26 8.43 L 74 8.43 Z',
        octagon:
            'M 94.35 68.37 L 68.37 94.35 L 31.63 94.35 L 5.65 68.37 L 5.65 31.63 ' +
            'L 31.63 5.65 L 68.37 5.65 L 94.35 31.63 Z',
        star4:
            'M 50 2 L 62.73 37.27 L 98 50 L 62.73 62.73 L 50 98 L 37.27 62.73 ' +
            'L 2 50 L 37.27 37.27 Z',
        star5:
            'M 50 2 L 61.29 34.47 L 95.66 35.17 L 68.26 55.93 L 78.21 88.83 ' +
            'L 50 69.2 L 21.79 88.83 L 31.74 55.93 L 4.34 35.17 L 38.71 34.47 Z',
        heart:
            'M 50 90 C 10 58 2 28 22 14 C 37 3 50 14 50 28 C 50 14 63 3 78 14 ' +
            'C 98 28 90 58 50 90 Z',
        crescent: 'M 50 2 C 22.4 2 2 22.4 2 50 C 2 77.6 22.4 98 50 98 C 92 74 92 26 50 2 Z',
        cross:
            'M 34 6 L 66 6 L 66 34 L 94 34 L 94 66 L 66 66 L 66 94 L 34 94 ' +
            'L 34 66 L 6 66 L 6 34 L 34 34 Z',
        trapezoid: 'M 24 12 L 76 12 L 96 88 L 4 88 Z',
        teardrop: 'M 50 4 C 62 26 92 44 92 64 C 92 84 73 96 50 96 C 27 96 8 84 8 64 C 8 44 38 26 50 4 Z',
        arrow: 'M 4 36 L 60 36 L 60 14 L 96 50 L 60 86 L 60 64 L 4 64 Z'
    };

    var SHAPE_LABELS = {
        circle: 'circle',
        oval: 'oval',
        square: 'square',
        rect: 'rectangle',
        triangle: 'triangle',
        rightTriangle: 'right triangle',
        diamond: 'diamond',
        pentagon: 'pentagon',
        hexagon: 'hexagon',
        octagon: 'octagon',
        star4: 'four point star',
        star5: 'five point star',
        heart: 'heart',
        crescent: 'crescent',
        cross: 'cross',
        trapezoid: 'trapezoid',
        teardrop: 'teardrop',
        arrow: 'arrow'
    };

    function round2(value) {
        return Math.round(value * 100) / 100;
    }

    /**
     * Map a unit-space path to a board slot.
     * Numbers alternate as x, y pairs, so scaling is a straight linear map.
     */
    function scalePath(cmds, slot) {
        var scaleX = slot.w / 100;
        var scaleY = slot.h / 100;
        var out = [];
        var index = 0;
        var tokens = cmds.split(' ');

        for (var i = 0; i < tokens.length; i++) {
            var token = tokens[i];
            if (!token) {
                continue;
            }
            if (/^[A-Za-z]$/.test(token)) {
                out.push(token);
                index = 0;
                continue;
            }
            var value = parseFloat(token);
            out.push(index % 2 === 0 ? round2(slot.x + value * scaleX) : round2(slot.y + value * scaleY));
            index++;
        }
        return out.join(' ');
    }

    /* ==========================================================
       2. Palette
       ========================================================== */

    var BASE_PALETTE = [
        '#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7',
        '#f97316', '#ec4899', '#06b6d4', '#14b8a6', '#6366f1',
        '#0ea5e9', '#84cc16', '#d946ef'
    ];

    function hslToHex(hue, saturation, lightness) {
        var s = saturation / 100;
        var l = lightness / 100;
        var chroma = (1 - Math.abs(2 * l - 1)) * s;
        var hp = (((hue % 360) + 360) % 360) / 60;
        var x = chroma * (1 - Math.abs((hp % 2) - 1));
        var rgb = [0, 0, 0];

        if (hp < 1) {
            rgb = [chroma, x, 0];
        } else if (hp < 2) {
            rgb = [x, chroma, 0];
        } else if (hp < 3) {
            rgb = [0, chroma, x];
        } else if (hp < 4) {
            rgb = [0, x, chroma];
        } else if (hp < 5) {
            rgb = [x, 0, chroma];
        } else {
            rgb = [chroma, 0, x];
        }

        var m = l - chroma / 2;
        return '#' + rgb.map(function (channel) {
            var value = Math.round((channel + m) * 255);
            return value.toString(16).padStart(2, '0');
        }).join('');
    }

    /** Level 1 gets 4 colours, every next level one more: 4 ... 13. */
    function makePalette(size) {
        var colours = BASE_PALETTE.slice(0, size);
        for (var i = BASE_PALETTE.length; i < size; i++) {
            colours.push(hslToHex((i * 41) % 360, 74, 52));
        }
        return colours;
    }

    /* ==========================================================
       3. Level table
       50 levels, one shape at a time. The shape cycles through the
       library while the size grows in ten steps, so no two levels
       look the same. A level is a single slot centred in the board.
       ========================================================== */

    var LEVEL_COUNT = 50;
    var LEVELS_PER_STEP = 5;
    var SIZE_STEPS = [200, 235, 270, 305, 340, 375, 410, 445, 480, 515];
    var SIZE_LABELS = ['Tiny', 'Small', 'Little', 'Medium', 'Medium', 'Big', 'Big', 'Huge', 'Huge', 'Giant'];
    var MAX_PALETTE_SIZE = BASE_PALETTE.length;
    var SHAPE_KEYS = Object.keys(SHAPE_CMDS);

    /** Build the level run: shape from the library, size from the step table. */
    function makeLevels() {
        var levels = [];
        for (var index = 0; index < LEVEL_COUNT; index++) {
            var step = Math.min(SIZE_STEPS.length - 1, Math.floor(index / LEVELS_PER_STEP));
            var side = SIZE_STEPS[step];
            var shape = SHAPE_KEYS[index % SHAPE_KEYS.length];
            levels.push({
                id: index + 1,
                name: SIZE_LABELS[step] + ' ' + SHAPE_LABELS[shape],
                paletteSize: Math.min(MAX_PALETTE_SIZE, 4 + Math.floor(index / LEVELS_PER_STEP)),
                slots: [{
                    shape: shape,
                    x: round2((BOARD_WIDTH - side) / 2),
                    y: round2((BOARD_HEIGHT - side) / 2),
                    w: side,
                    h: side
                }]
            });
        }
        return levels;
    }

    var LEVELS = makeLevels();

    /* ==========================================================
       4. DOM handles
       ========================================================== */

    var canvas = document.getElementById('board');
    var ctx = canvas.getContext('2d');
    /* Offscreen context with an identity transform: used for hit tests and for
       building the coverage masks. It must be board sized, because isPointInPath
       ignores points that fall outside the canvas. */
    var probeCanvas = document.createElement('canvas');
    probeCanvas.width = BOARD_WIDTH;
    probeCanvas.height = BOARD_HEIGHT;
    var probe = probeCanvas.getContext('2d');
    var paletteEl = document.getElementById('palette');
    var levelNameEl = document.getElementById('levelName');
    var scoreEl = document.getElementById('scoreValue');
    var filledEl = document.getElementById('filledValue');
    var coloursEl = document.getElementById('coloursValue');
    var starHintEl = document.getElementById('starHint');
    var undoBtn = document.getElementById('undoBtn');
    var clearBtn = document.getElementById('clearBtn');
    var prevBtn = document.getElementById('prevBtn');
    var nextBtn = document.getElementById('nextBtn');
    var soundBtn = document.getElementById('soundBtn');
    var levelsBtn = document.getElementById('levelsBtn');
    var levelsOverlay = document.getElementById('levelsOverlay');
    var levelGridEl = document.getElementById('levelGrid');
    var totalStarsEl = document.getElementById('totalStarsValue');
    var closeLevelsBtn = document.getElementById('closeLevelsBtn');
    var winOverlay = document.getElementById('winOverlay');
    var winStarsEl = document.getElementById('winStars');
    var winSummaryEl = document.getElementById('winSummary');
    var winPrevBtn = document.getElementById('winPrevBtn');
    var winNextBtn = document.getElementById('winNextBtn');
    var winReplayBtn = document.getElementById('winReplayBtn');
    var winLevelsBtn = document.getElementById('winLevelsBtn');
    var meterEl = document.getElementById('paintMeter');
    var meterFillEl = document.getElementById('meterFill');

    /* ==========================================================
       5. Progress (localStorage)
       ========================================================== */

    var progress = loadProgress();

    function loadProgress() {
        var fallback = { version: 1, stars: {}, best: {}, lastLevel: 1, muted: false };
        var raw;
        var parsed;

        try {
            raw = window.localStorage.getItem(STORAGE_KEY);
        } catch (error) {
            return fallback;
        }
        if (!raw) {
            return fallback;
        }
        try {
            parsed = JSON.parse(raw);
        } catch (error) {
            return fallback;
        }
        if (!parsed || typeof parsed !== 'object') {
            return fallback;
        }
        return {
            version: 1,
            stars: parsed.stars && typeof parsed.stars === 'object' ? parsed.stars : {},
            best: parsed.best && typeof parsed.best === 'object' ? parsed.best : {},
            lastLevel: Number.isInteger(parsed.lastLevel) ? clampLevel(parsed.lastLevel) : 1,
            muted: parsed.muted === true
        };
    }

    function saveProgress() {
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
        } catch (error) {
            /* storage may be full or blocked (private mode) — the game keeps working */
        }
    }

    function clampLevel(id) {
        if (!Number.isFinite(id)) {
            return 1;
        }
        return Math.min(LEVELS.length, Math.max(1, Math.round(id)));
    }

    /* ==========================================================
       6. Sound (WebAudio, no asset files)
       ========================================================== */

    var audioContext = null;

    function audio() {
        if (progress.muted) {
            return null;
        }
        var Ctor = window.AudioContext || window.webkitAudioContext;
        if (!Ctor) {
            return null;
        }
        if (!audioContext) {
            audioContext = new Ctor();
        }
        if (audioContext.state === 'suspended' && typeof audioContext.resume === 'function') {
            audioContext.resume();
        }
        return audioContext;
    }

    function tone(context, frequency, startAt, duration, volume, wave) {
        var oscillator = context.createOscillator();
        var gain = context.createGain();
        oscillator.type = wave || 'sine';
        oscillator.frequency.setValueAtTime(frequency, startAt);
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(volume, startAt + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startAt);
        oscillator.stop(startAt + duration + 0.03);
    }

    var SFX = {
        select: function () {
            var context = audio();
            if (!context) {
                return;
            }
            tone(context, 520, context.currentTime, 0.07, 0.1, 'triangle');
        },
        fill: function (colourIndex) {
            var context = audio();
            if (!context) {
                return;
            }
            tone(context, 430 + colourIndex * 55, context.currentTime, 0.16, 0.16, 'sine');
        },
        undo: function () {
            var context = audio();
            if (!context) {
                return;
            }
            var now = context.currentTime;
            tone(context, 420, now, 0.1, 0.13, 'triangle');
            tone(context, 300, now + 0.09, 0.13, 0.13, 'triangle');
        },
        win: function () {
            var context = audio();
            if (!context) {
                return;
            }
            var now = context.currentTime;
            [523.25, 659.25, 783.99].forEach(function (frequency, index) {
                tone(context, frequency, now + index * 0.14, 0.32, 0.18, 'triangle');
            });
        },
        star: function () {
            var context = audio();
            if (!context) {
                return;
            }
            tone(context, 1046.5, context.currentTime, 0.22, 0.14, 'sine');
        }
    };

    /* ==========================================================
       7. Game state
       ========================================================== */

    var state = {
        levelId: clampLevel(progress.lastLevel),
        palette: [],
        activeColor: null,
        selectedShapeId: null,
        strokes: [],
        filled: new Map(),
        activeStroke: null,
        won: false
    };

    /** Canvas scale, plus the brush/outline conversion from CSS pixels to board units. */
    var view = { scale: 1, unitsPerCssPx: 1 };
    var shapePaths = [];
    var shapeGrids = [];
    var lastMeterPercent = -1;

    function currentLevel() {
        return LEVELS[state.levelId - 1];
    }

    function filledCount() {
        return state.filled.size;
    }

    /**
     * The brush grows with the shape, so a small shape is not flooded by one
     * stroke and a big shape is not tedious to fill.
     */
    function brushWidth() {
        var slot = currentLevel().slots[0];
        var width = slot ? slot.w * BRUSH_SIZE_RATIO : BRUSH_MIN_WIDTH;
        return Math.round(Math.max(BRUSH_MIN_WIDTH, Math.min(BRUSH_MAX_WIDTH, width)));
    }

    /** Every colour used on this level, finished shape or not. */
    function distinctColourCount() {
        var seen = new Set();
        state.strokes.forEach(function (stroke) {
            seen.add(stroke.colour);
        });
        return seen.size;
    }

    function currentScore() {
        return filledCount() * POINTS_PER_SHAPE + distinctColourCount() * POINTS_PER_COLOUR;
    }

    function starTargets() {
        return {
            two: Math.min(STAR_TWO_COLOURS, state.palette.length),
            three: Math.min(STAR_THREE_COLOURS, state.palette.length)
        };
    }

    /** 1 star for filling everything, then one star per colour-variety target met. */
    function computeStars() {
        if (filledCount() < SHAPES_PER_LEVEL) {
            return 0;
        }
        var targets = starTargets();
        var distinct = distinctColourCount();
        var stars = 1;
        if (distinct >= targets.two) {
            stars++;
        }
        if (distinct >= targets.three) {
            stars++;
        }
        return stars;
    }

    /* ==========================================================
       8. Rendering
       ========================================================== */

    function prepareBoard() {
        var level = currentLevel();
        shapePaths = level.slots.map(function (slot) {
            return new Path2D(scalePath(SHAPE_CMDS[slot.shape], slot));
        });
        shapeGrids = level.slots.map(function (slot, index) {
            return createGrid(shapePaths[index], slot);
        });
    }

    /**
     * Coverage grid: the shape slot is divided into COVERAGE_CELLS x COVERAGE_CELLS
     * squares. Cells whose centre falls inside the outline form the mask. Painting
     * marks the cells the brush touches, so progress is measured without reading
     * back pixels.
     */
    function createGrid(path, slot) {
        var cells = COVERAGE_CELLS;
        var step = slot.w / cells;
        var mask = new Uint8Array(cells * cells);
        var maskCount = 0;

        for (var row = 0; row < cells; row++) {
            for (var column = 0; column < cells; column++) {
                var x = slot.x + (column + 0.5) * step;
                var y = slot.y + (row + 0.5) * step;
                if (probe.isPointInPath(path, x, y)) {
                    mask[row * cells + column] = 1;
                    maskCount++;
                }
            }
        }

        return {
            slot: slot,
            step: step,
            mask: mask,
            maskCount: maskCount,
            painted: new Uint8Array(cells * cells),
            paintedCount: 0
        };
    }

    function resetGrids() {
        shapeGrids.forEach(function (grid) {
            grid.painted = new Uint8Array(COVERAGE_CELLS * COVERAGE_CELLS);
            grid.paintedCount = 0;
        });
    }

    function coverageOf(shapeId) {
        var grid = shapeGrids[shapeId];
        if (!grid || grid.maskCount === 0) {
            return 0;
        }
        return grid.paintedCount / grid.maskCount;
    }

    /**
     * Size the backing store to the element box. The element box is owned by CSS
     * (width 100% + aspect-ratio), so this never changes layout — that would fire
     * another resize event and start a feedback loop.
     */
    function resizeCanvas() {
        var rect = canvas.getBoundingClientRect();
        var dpr = window.devicePixelRatio || 1;
        var cssWidth = Math.max(240, Math.round(rect.width || BOARD_WIDTH));
        var cssHeight = Math.max(140, Math.round(rect.height || (cssWidth * BOARD_HEIGHT) / BOARD_WIDTH));
        var pixelWidth = Math.round(cssWidth * dpr);
        var pixelHeight = Math.round(cssHeight * dpr);

        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
            canvas.width = pixelWidth;
            canvas.height = pixelHeight;
        }

        view.scale = canvas.width / BOARD_WIDTH;
        view.unitsPerCssPx = BOARD_WIDTH / cssWidth;
        renderBoard();
    }

    function renderBoard() {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(view.scale, 0, 0, view.scale, 0, 0);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';

        // 1. every shape starts as white paper
        ctx.fillStyle = UNFILLED;
        shapePaths.forEach(function (path) {
            ctx.fill(path);
        });

        // 2. finished shapes become a solid block of colour
        state.filled.forEach(function (colour, shapeId) {
            var path = shapePaths[shapeId];
            if (!path) {
                return;
            }
            ctx.save();
            ctx.clip(path);
            ctx.fillStyle = colour;
            ctx.fill(path);
            ctx.restore();
        });

        // 3. the brush work sits on top, like crayon over paint
        state.strokes.forEach(drawStroke);

        // 4. outlines last so the lines stay crisp
        shapePaths.forEach(function (path, index) {
            outlineShape(index);
        });
    }

    function renderPalette() {
        paletteEl.textContent = '';
        state.palette.forEach(function (colour, index) {
            var swatch = document.createElement('button');
            swatch.type = 'button';
            swatch.className = 'swatch' + (colour === state.activeColor ? ' is-active' : '');
            swatch.dataset.color = colour;
            swatch.style.backgroundColor = colour;
            swatch.setAttribute('aria-label', 'Colour ' + (index + 1));
            swatch.setAttribute('aria-pressed', colour === state.activeColor ? 'true' : 'false');
            paletteEl.appendChild(swatch);
        });
    }

    function outlineShape(shapeId) {
        var path = shapePaths[shapeId];
        if (!path) {
            return;
        }
        var selected = state.selectedShapeId === shapeId;
        ctx.strokeStyle = selected ? SELECTED_COLOUR : OUTLINE_COLOUR;
        ctx.lineWidth = (selected ? SELECTED_WIDTH : OUTLINE_WIDTH) * view.unitsPerCssPx;
        ctx.stroke(path);
    }

    function drawStroke(stroke) {
        var path = shapePaths[stroke.shapeId];
        if (!path) {
            return;
        }
        ctx.save();
        ctx.clip(path);

        if (stroke.kind === 'fill') {
            ctx.fillStyle = stroke.colour;
            ctx.fill(path);
        } else if (stroke.points.length === 1) {
            var dot = stroke.points[0];
            ctx.fillStyle = stroke.colour;
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, stroke.width / 2, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.strokeStyle = stroke.colour;
            ctx.lineWidth = stroke.width;
            ctx.beginPath();
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
            for (var i = 1; i < stroke.points.length; i++) {
                ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
            }
            ctx.stroke();
        }

        ctx.restore();
    }

    function drawSegment(shapeId, colour, width, from, to) {
        var path = shapePaths[shapeId];
        if (!path) {
            return;
        }
        ctx.save();
        ctx.clip(path);
        ctx.strokeStyle = colour;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
        ctx.restore();
    }

    function distanceToSegment(px, py, ax, ay, bx, by) {
        var dx = bx - ax;
        var dy = by - ay;
        var lengthSquared = dx * dx + dy * dy;
        var t = 0;
        if (lengthSquared > 0) {
            t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSquared));
        }
        return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    }

    /** Mark every grid cell the brush touched while moving from one point to the next. */
    function markContact(grid, from, to, radius) {
        if (!grid) {
            return;
        }
        var cells = COVERAGE_CELLS;
        var step = grid.step;
        var reach = radius * 1.15;
        var firstColumn = Math.max(0, Math.floor((Math.min(from.x, to.x) - reach - grid.slot.x) / step));
        var lastColumn = Math.min(cells - 1, Math.floor((Math.max(from.x, to.x) + reach - grid.slot.x) / step));
        var firstRow = Math.max(0, Math.floor((Math.min(from.y, to.y) - reach - grid.slot.y) / step));
        var lastRow = Math.min(cells - 1, Math.floor((Math.max(from.y, to.y) + reach - grid.slot.y) / step));

        for (var row = firstRow; row <= lastRow; row++) {
            for (var column = firstColumn; column <= lastColumn; column++) {
                var index = row * cells + column;
                if (grid.mask[index] === 0 || grid.painted[index] === 1) {
                    continue;
                }
                var x = grid.slot.x + (column + 0.5) * step;
                var y = grid.slot.y + (row + 0.5) * step;
                if (distanceToSegment(x, y, from.x, from.y, to.x, to.y) <= reach) {
                    grid.painted[index] = 1;
                    grid.paintedCount++;
                }
            }
        }
    }

    function fillGrid(grid) {
        if (!grid) {
            return;
        }
        for (var index = 0; index < grid.mask.length; index++) {
            if (grid.mask[index] === 1 && grid.painted[index] === 0) {
                grid.painted[index] = 1;
                grid.paintedCount++;
            }
        }
    }

    function markStroke(grid, stroke) {
        if (!grid) {
            return;
        }
        if (stroke.kind === 'fill') {
            fillGrid(grid);
            return;
        }
        if (stroke.points.length === 1) {
            markContact(grid, stroke.points[0], stroke.points[0], stroke.width / 2);
            return;
        }
        for (var i = 1; i < stroke.points.length; i++) {
            markContact(grid, stroke.points[i - 1], stroke.points[i], stroke.width / 2);
        }
    }

    /** Which shape sits under a board point — topmost shape first. */
    function shapeAt(point) {
        for (var index = shapePaths.length - 1; index >= 0; index--) {
            if (probe.isPointInPath(shapePaths[index], point.x, point.y)) {
                return index;
            }
        }
        return null;
    }

    function toBoardPoint(event) {
        var rect = canvas.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * BOARD_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * BOARD_HEIGHT
        };
    }

    /**
     * Live paint meter: the bar and the Painted stat both show how much of the
     * shape is covered, so progress is visible while dragging.
     */
    function updateMeter() {
        meterFillEl.style.backgroundColor = state.activeColor || '#2563eb';
        var percent = filledCount() >= SHAPES_PER_LEVEL ? 100 : Math.round(Math.min(1, coverageOf(0)) * 100);
        if (percent === lastMeterPercent) {
            return;
        }
        lastMeterPercent = percent;
        meterFillEl.style.width = percent + '%';
        meterEl.setAttribute('aria-valuenow', String(percent));
        filledEl.textContent = percent + '%';
    }

    function updateHud() {
        var level = currentLevel();
        var targets = starTargets();

        levelNameEl.textContent = 'Level ' + level.id + ' of ' + LEVELS.length + ' — ' + level.name;
        scoreEl.textContent = String(currentScore());
        coloursEl.textContent = String(distinctColourCount());
        updateMeter();

        if (filledCount() >= SHAPES_PER_LEVEL) {
            starHintEl.textContent = 'Shape finished — level complete!';
        } else {
            starHintEl.textContent =
                'Finish the shape for ★, use ' + targets.two + ' colours for ★★ and ' + targets.three + ' for ★★★.';
        }

        prevBtn.disabled = state.levelId === 1;
        nextBtn.textContent = state.levelId === LEVELS.length ? 'All levels' : 'Next level →';
        soundBtn.textContent = progress.muted ? 'Sound: off' : 'Sound: on';
        soundBtn.setAttribute('aria-pressed', progress.muted ? 'false' : 'true');
    }

    /* ==========================================================
       9. Actions
       ========================================================== */

    function selectShape(shapeId, silent) {
        state.selectedShapeId = shapeId;
        renderBoard();
        var slot = currentLevel().slots[shapeId];
        if (slot) {
            canvas.setAttribute(
                'aria-label',
                'Colouring board. Shape: ' + SHAPE_LABELS[slot.shape] +
                '. Press Enter to fill it. Arrow keys change level.'
            );
        }
        if (!silent) {
            SFX.select();
        }
    }

    function startStroke(shapeId, point) {
        state.activeStroke = {
            shapeId: shapeId,
            colour: state.activeColor,
            width: brushWidth(),
            kind: 'brush',
            points: [point]
        };
        state.strokes.push(state.activeStroke);
        markStroke(shapeGrids[shapeId], state.activeStroke);
        drawStroke(state.activeStroke);
        outlineShape(shapeId);
        updateMeter();
    }

    function extendStroke(point) {
        var stroke = state.activeStroke;
        if (!stroke) {
            return;
        }
        var from = stroke.points[stroke.points.length - 1];
        if (Math.hypot(point.x - from.x, point.y - from.y) < 1.5) {
            return;
        }
        stroke.points.push(point);
        markContact(shapeGrids[stroke.shapeId], from, point, stroke.width / 2);
        drawSegment(stroke.shapeId, stroke.colour, stroke.width, from, point);
        outlineShape(stroke.shapeId);
        updateMeter();
    }

    function endStroke() {
        var stroke = state.activeStroke;
        state.activeStroke = null;
        if (!stroke) {
            return;
        }

        var shapeId = stroke.shapeId;
        var previousColour = state.filled.get(shapeId);
        if (coverageOf(shapeId) >= COVERAGE_TARGET && previousColour !== stroke.colour) {
            state.filled.set(shapeId, stroke.colour);
            renderBoard();
            SFX.fill(distinctColourCount());
        }

        updateHud();
        if (state.filled.size === SHAPES_PER_LEVEL) {
            winLevel();
        }
    }

    /** Keyboard path: fill the highlighted shape in one go. */
    function quickFill(shapeId) {
        if (!state.activeColor || !shapePaths[shapeId]) {
            return;
        }
        var stroke = {
            shapeId: shapeId,
            colour: state.activeColor,
            width: brushWidth(),
            kind: 'fill',
            points: []
        };
        state.strokes.push(stroke);
        fillGrid(shapeGrids[shapeId]);

        var previousColour = state.filled.get(shapeId);
        state.filled.set(shapeId, stroke.colour);
        renderBoard();
        updateHud();

        if (previousColour !== stroke.colour) {
            SFX.fill(distinctColourCount());
        }
        if (state.filled.size === SHAPES_PER_LEVEL) {
            winLevel();
        }
    }

    function handleSwatchClick(colour) {
        state.activeColor = colour;
        renderPalette();
        updateMeter();
        SFX.select();
    }

    /** Rebuild coverage and fills from the stroke list (after undo, clear or undo-replay). */
    function replayStrokes() {
        resetGrids();
        state.strokes.forEach(function (stroke) {
            markStroke(shapeGrids[stroke.shapeId], stroke);
        });

        var lastColour = new Map();
        state.strokes.forEach(function (stroke) {
            lastColour.set(stroke.shapeId, stroke.colour);
        });

        var nextFilled = new Map();
        shapeGrids.forEach(function (grid, shapeId) {
            if (coverageOf(shapeId) >= COVERAGE_TARGET && lastColour.has(shapeId)) {
                nextFilled.set(shapeId, lastColour.get(shapeId));
            }
        });

        state.filled = nextFilled;
        renderBoard();
        updateHud();
    }

    function undo() {
        if (!state.strokes.length) {
            SFX.select();
            return;
        }
        state.strokes.pop();
        replayStrokes();
        SFX.undo();
    }

    function clearLevel() {
        state.strokes = [];
        state.filled.clear();
        state.activeStroke = null;
        state.selectedShapeId = null;
        state.won = false;
        lastMeterPercent = -1;
        resetGrids();
        renderBoard();
        updateHud();
        SFX.undo();
    }

    function winLevel() {
        if (state.won) {
            return;
        }
        state.won = true;

        var distinct = distinctColourCount();
        var stars = computeStars();
        var earned = currentScore();
        var previousBest = Number(progress.best[state.levelId]) || 0;

        progress.stars[state.levelId] = Math.max(Number(progress.stars[state.levelId]) || 0, stars);
        progress.best[state.levelId] = Math.max(previousBest, earned);
        progress.lastLevel = state.levelId;
        saveProgress();
        renderLevelGrid();

        winStarsEl.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        winSummaryEl.textContent =
            earned + ' points · ' + distinct + (distinct === 1 ? ' colour used' : ' colours used') +
            (earned > previousBest ? ' · new best!' : '');
        winPrevBtn.disabled = state.levelId === 1;
        winNextBtn.textContent = state.levelId === LEVELS.length ? 'All levels' : 'Next level →';
        winOverlay.hidden = false;

        SFX.win();
        for (var i = 0; i < stars; i++) {
            window.setTimeout(function () {
                SFX.star();
            }, 460 + i * 220);
        }
    }

    /* ==========================================================
       10. Levels: load, select, navigate
       ========================================================== */

    function loadLevel(id) {
        state.levelId = clampLevel(id);
        state.palette = makePalette(currentLevel().paletteSize);
        state.activeColor = state.palette[0];
        state.selectedShapeId = null;
        state.strokes = [];
        state.filled = new Map();
        state.activeStroke = null;
        state.won = false;

        progress.lastLevel = state.levelId;
        saveProgress();

        prepareBoard();
        resetGrids();
        renderPalette();
        resizeCanvas();
        lastMeterPercent = -1;
        updateHud();
        closeOverlays();
    }

    function goToNextLevel() {
        stepLevel(1);
    }

    function goToPreviousLevel() {
        stepLevel(-1);
    }

    /**
     * Move one level forward or back. The ends of the run do not wrap: before
     * level 1 nothing happens, past the last level the level list opens.
     */
    function stepLevel(delta) {
        var target = state.levelId + delta;
        if (target < 1) {
            SFX.select();
            return;
        }
        if (target > LEVELS.length) {
            openLevels();
            return;
        }
        loadLevel(target);
        SFX.select();
    }

    var SVG_NS = 'http://www.w3.org/2000/svg';

    /** Tiny inline preview of the level shape, drawn from the same path data. */
    function shapePreview(shapeKey) {
        var svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '0 0 100 100');
        svg.setAttribute('class', 'tile-shape');
        svg.setAttribute('aria-hidden', 'true');
        var path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', SHAPE_CMDS[shapeKey]);
        svg.appendChild(path);
        return svg;
    }

    function renderLevelGrid() {
        var total = 0;
        levelGridEl.textContent = '';

        LEVELS.forEach(function (level) {
            var stars = Math.min(3, Math.max(0, Number(progress.stars[level.id]) || 0));
            total += stars;

            var tile = document.createElement('button');
            tile.type = 'button';
            tile.className = 'level-tile' + (stars > 0 ? ' is-complete' : '');
            tile.dataset.level = String(level.id);
            tile.setAttribute('aria-label', 'Level ' + level.id + ' — ' + level.name + ', ' + stars + ' of 3 stars');

            var number = document.createElement('span');
            number.className = 'tile-num';
            number.textContent = String(level.id);

            var name = document.createElement('span');
            name.className = 'tile-name';
            name.textContent = level.name;

            var starRow = document.createElement('span');
            starRow.className = 'tile-stars';
            starRow.textContent = '★'.repeat(stars) + '☆'.repeat(3 - stars);

            tile.appendChild(number);
            tile.appendChild(shapePreview(level.slots[0].shape));
            tile.appendChild(name);
            tile.appendChild(starRow);
            levelGridEl.appendChild(tile);
        });

        totalStarsEl.textContent = total + ' / ' + LEVELS.length * 3;
    }

    function openLevels() {
        renderLevelGrid();
        winOverlay.hidden = true;
        levelsOverlay.hidden = false;
        closeLevelsBtn.focus();
    }

    function closeOverlays() {
        levelsOverlay.hidden = true;
        winOverlay.hidden = true;
    }

    function toggleSound() {
        progress.muted = !progress.muted;
        saveProgress();
        updateHud();
        if (!progress.muted) {
            SFX.select();
        }
    }

    /* ==========================================================
       11. Event wiring
       ========================================================== */

    canvas.addEventListener('pointerdown', function (event) {
        if (typeof event.button === 'number' && event.button !== 0) {
            return;
        }
        var point = toBoardPoint(event);
        var shapeId = shapeAt(point);
        if (shapeId === null) {
            state.selectedShapeId = null;
            renderBoard();
            return;
        }
        if (canvas.setPointerCapture) {
            try {
                canvas.setPointerCapture(event.pointerId);
            } catch (error) {
                /* synthetic or already released pointer: dragging still works */
            }
        }
        state.selectedShapeId = shapeId;
        startStroke(shapeId, point);
    });

    canvas.addEventListener('pointermove', function (event) {
        if (!state.activeStroke) {
            return;
        }
        extendStroke(toBoardPoint(event));
    });

    canvas.addEventListener('pointerup', endStroke);
    canvas.addEventListener('pointercancel', endStroke);

    canvas.addEventListener('focus', function () {
        if (state.selectedShapeId === null) {
            selectShape(0, true);
        }
    });

    canvas.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            quickFill(0);
            return;
        }
        if (event.key === 'ArrowRight' || event.key === 'PageDown') {
            event.preventDefault();
            goToNextLevel();
            return;
        }
        if (event.key === 'ArrowLeft' || event.key === 'PageUp') {
            event.preventDefault();
            goToPreviousLevel();
        }
    });

    paletteEl.addEventListener('click', function (event) {
        var node = event.target.closest ? event.target.closest('.swatch') : null;
        if (node) {
            handleSwatchClick(node.dataset.color);
        }
    });

    levelGridEl.addEventListener('click', function (event) {
        var tile = event.target.closest ? event.target.closest('.level-tile') : null;
        if (tile) {
            loadLevel(Number(tile.dataset.level));
        }
    });

    undoBtn.addEventListener('click', undo);
    clearBtn.addEventListener('click', clearLevel);
    prevBtn.addEventListener('click', goToPreviousLevel);
    nextBtn.addEventListener('click', goToNextLevel);
    soundBtn.addEventListener('click', toggleSound);
    levelsBtn.addEventListener('click', openLevels);
    closeLevelsBtn.addEventListener('click', closeOverlays);

    winNextBtn.addEventListener('click', goToNextLevel);
    winPrevBtn.addEventListener('click', goToPreviousLevel);
    winReplayBtn.addEventListener('click', function () {
        loadLevel(state.levelId);
    });
    winLevelsBtn.addEventListener('click', openLevels);

    levelsOverlay.addEventListener('click', function (event) {
        if (event.target === levelsOverlay) {
            closeOverlays();
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
            closeOverlays();
            return;
        }
        /* Arrow keys change level whenever no dialog is open and nothing is focused. */
        if (event.target !== document.body || !levelsOverlay.hidden || !winOverlay.hidden) {
            return;
        }
        if (event.key === 'ArrowRight') {
            event.preventDefault();
            goToNextLevel();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            goToPreviousLevel();
        }
    });

    /* ==========================================================
       12. Start
       ========================================================== */

    window.addEventListener('resize', resizeCanvas);
    loadLevel(state.levelId);
})();
