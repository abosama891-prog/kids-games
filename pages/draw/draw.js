const BOARD_SIZE = 420;
const GRID_SIZE = 7;
const CELL_SIZE = BOARD_SIZE / GRID_SIZE;
const START_RADIUS = 34;
const GOAL_RADIUS = 30;
const STROKE_RADIUS = 12;
const OBSTACLE_RADIUS = 23;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const starsElement = document.getElementById('stars');
const levelNumElement = document.getElementById('levelNum');
const titleElement = document.getElementById('title');
const targetHintElement = document.getElementById('targetHint');
const feedbackElement = document.getElementById('feedback');
const canvasWrap = document.querySelector('.canvas-wrap');

const beadCircleOutline = createBeadCircleOutline();
const beadStarOutline = createBeadStarOutline();
const beadRainbowOutline = createBeadRainbowOutline();

function createBeadCircleOutline() {
  return Array.from({ length: 49 }, (_, index) => {
    const angle = (135 + index * 7.5) * Math.PI / 180;
    return [3 + Math.cos(angle) * 2.1, 3 + Math.sin(angle) * 2.1];
  });
}

function createBeadStarOutline() {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? 2.15 : 1.05;
    return [3 + Math.cos(angle) * radius, 3 + Math.sin(angle) * radius];
  });
}

function createBeadRainbowOutline() {
  const outer = Array.from({ length: 13 }, (_, index) => {
    const angle = (180 + index * 15) * Math.PI / 180;
    return [3 + Math.cos(angle) * 2.1, 4.8 + Math.sin(angle) * 2.1];
  });
  const inner = Array.from({ length: 13 }, (_, index) => {
    const angle = (360 - index * 15) * Math.PI / 180;
    return [3 + Math.cos(angle) * 1.35, 4.8 + Math.sin(angle) * 1.35];
  });
  return [...outer, ...inner];
}

const levels = [
  { target: '🏠', hint: 'ارسم طريقًا آمنًا إلى البيت', start: [0, 3], goal: [6, 3], obstacles: [[3, 3, '🪨']] },
  { target: '🐟', hint: 'أوصل القطة إلى السمكة بين الأشجار', start: [0, 5], goal: [6, 1], obstacles: [[2, 4, '🌳'], [3, 3, '🌳'], [4, 2, '🌳']] },
  { target: '🌻', hint: 'اعبر البحيرة من الممر المفتوح', start: [0, 1], goal: [6, 5], obstacles: [[1, 3, '💧'], [2, 3, '💧'], [3, 3, '💧'], [4, 3, '💧'], [5, 3, '💧']] },
  {
    target: '🙂',
    hint: 'أكملي الجزء الناقص من خرز الوجه المبتسم.',
    start: beadCircleOutline[0],
    goal: beadCircleOutline[36],
    obstacles: [],
    beadShape: {
      kind: 'smile',
      outline: beadCircleOutline,
      gapEdges: Array.from({ length: 12 }, (_, index) => index + 36),
      tracePath: [48, 46, 44, 42, 40, 38, 36].map(index => beadCircleOutline[index])
    }
  },
  {
    target: '🍎',
    hint: 'أكملي الجزء الناقص من خرز التفاحة.',
    start: [2, 5.15],
    goal: [4, 5.15],
    obstacles: [],
    beadShape: {
      kind: 'apple',
      fill: '#e77d55',
      outline: [[2, 5.15], [4, 5.15], [4.8, 4.3], [5.05, 3.3], [4.7, 2.25], [4.05, 1.75], [3.45, 2.05], [3, 1.8], [2.55, 2.05], [1.95, 1.75], [1.3, 2.2], [0.95, 3.3], [1.2, 4.2], [2, 5.15]],
      gapEdges: [0],
      tracePath: [[2, 5.15], [2.45, 5.35], [3, 5.42], [3.55, 5.35], [4, 5.15]]
    }
  },
  {
    target: '🏰',
    hint: 'أكملي الجزء الناقص من خرز القلعة.',
    start: [1, 5.5],
    goal: [5, 5.5],
    obstacles: [],
    beadShape: {
      kind: 'castle',
      fill: '#63a7db',
      outline: [[1, 5.5], [5, 5.5], [5, 3.5], [4.4, 3.5], [4.4, 2.5], [3.8, 2.5], [3.8, 3.5], [3.4, 3.5], [3.4, 1.8], [2.6, 1.8], [2.6, 3.5], [2.2, 3.5], [2.2, 2.5], [1.6, 2.5], [1.6, 3.5], [1, 3.5]],
      gapEdges: [0],
      tracePath: [[1, 5.5], [2, 5.5], [3, 5.5], [4, 5.5], [5, 5.5]]
    }
  },
  {
    target: '🎈',
    hint: 'أكملي الجزء الناقص من خرز البالون.',
    start: [2, 4.8],
    goal: [4, 4.8],
    obstacles: [],
    beadShape: {
      kind: 'balloon',
      fill: '#55b8cb',
      outline: [[2, 4.8], [1.2, 4.1], [1, 3], [1.35, 2], [2.1, 1.4], [3, 1.1], [3.9, 1.4], [4.65, 2], [5, 3], [4.8, 4], [4, 4.8]],
      gapEdges: [10],
      tracePath: [[2, 4.8], [2.45, 5.2], [3, 5.45], [3.55, 5.2], [4, 4.8]]
    }
  },
  {
    target: '🧺',
    hint: 'أكملي الجزء الناقص من خرز السلة.',
    start: [1, 2.5],
    goal: [5, 2.5],
    obstacles: [],
    beadShape: {
      kind: 'basket',
      fill: '#c47b49',
      outline: [[1, 2.5], [5, 2.5], [4.5, 5.5], [1.5, 5.5]],
      gapEdges: [0],
      tracePath: [[1, 2.5], [2, 2.28], [3, 2.2], [4, 2.28], [5, 2.5]]
    }
  },
  {
    target: '⭐',
    hint: 'أكملي الجزء الناقص من خرز النجمة.',
    start: beadStarOutline[6],
    goal: beadStarOutline[8],
    obstacles: [],
    beadShape: {
      kind: 'star',
      fill: '#f3aa39',
      outline: beadStarOutline,
      gapEdges: [6, 7],
      tracePath: [beadStarOutline[6], beadStarOutline[7], beadStarOutline[8]]
    }
  },
  {
    target: '🌈',
    hint: 'أكملي الجزء الناقص من خرز قوس قزح.',
    start: beadRainbowOutline[4],
    goal: beadRainbowOutline[8],
    obstacles: [],
    beadShape: {
      kind: 'rainbow',
      fill: '#9873cb',
      outline: beadRainbowOutline,
      gapEdges: [4, 5, 6, 7],
      tracePath: Array.from({ length: 7 }, (_, index) => {
        const angle = (240 + index * 10) * Math.PI / 180;
        return [3 + Math.cos(angle) * 2.1, 4.8 + Math.sin(angle) * 2.1];
      })
    }
  }
];

const themeColors = ['#f3aa39', '#63a7db', '#55b8cb', '#e77d55', '#6aa879', '#559ac1', '#c47b49', '#9873cb', '#e48e56', '#ed7c78'];
let currentLevel = 0;
let completedLevels = new Set();
let isDrawing = false;
let hasDrawn = false;
let path = [];
let pathTouchesObstacle = false;
let animationTimeout;
let nextLevelTimeout;
let audioCtx = null;

function readProgress() {
  const progress = window.KidsGames.readProgress();
  const saved = progress.draw || { currentLevel: 1, unlocked: 1, completed: [] };
  const unlocked = window.KidsGames.getUnlockedLevel('draw', progress);
  currentLevel = Math.max(0, Math.min((Number(saved.currentLevel) || 1) - 1, unlocked - 1, levels.length - 1));
  completedLevels = new Set((saved.completed || []).filter(level => Number.isInteger(level) && level >= 1 && level <= levels.length));
  starsElement.textContent = progress.draw?.stars || 0;
  window.KidsGames.renderGameHeader('draw', currentLevel + 1);
}

function saveCurrentLevel() {
  const progress = window.KidsGames.readProgress();
  const saved = progress.draw || { currentLevel: 1, unlocked: 1, completed: [] };
  window.KidsGames.saveProgress({
    ...progress,
    draw: {
      ...saved,
      currentLevel: currentLevel + 1,
      unlocked: window.KidsGames.getUnlockedLevel('draw', progress)
    }
  });
}

function pointFor([column, row]) {
  return { x: (column + 0.5) * CELL_SIZE, y: (row + 0.5) * CELL_SIZE };
}

function currentLevelData() {
  return levels[currentLevel];
}

function createBeadCircleOutline() {
  return Array.from({ length: 49 }, (_, index) => {
    const angle = (135 + index * 7.5) * Math.PI / 180;
    return [3 + Math.cos(angle) * 2.1, 3 + Math.sin(angle) * 2.1];
  });
}

function createBeadStarOutline() {
  return Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const radius = index % 2 === 0 ? 2.15 : 1.05;
    return [3 + Math.cos(angle) * radius, 3 + Math.sin(angle) * radius];
  });
}

function createBeadRainbowOutline() {
  const outer = Array.from({ length: 13 }, (_, index) => {
    const angle = (180 + index * 15) * Math.PI / 180;
    return [3 + Math.cos(angle) * 2.1, 4.8 + Math.sin(angle) * 2.1];
  });
  const inner = Array.from({ length: 13 }, (_, index) => {
    const angle = (360 - index * 15) * Math.PI / 180;
    return [3 + Math.cos(angle) * 1.35, 4.8 + Math.sin(angle) * 1.35];
  });
  return [...outer, ...inner];
}

function playTone(frequency, duration = 0.08) {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;
  if (!audioCtx) audioCtx = new AudioContextClass();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = frequency;
  gain.gain.value = 0.06;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  const startTime = audioCtx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration);
}

function drawBackdrop() {
  const level = currentLevelData();
  const color = themeColors[currentLevel % themeColors.length];
  const background = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
  background.addColorStop(0, '#f7fbef');
  background.addColorStop(1, '#e8f2dc');
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, BOARD_SIZE, BOARD_SIZE);

  for (let row = 0; row < GRID_SIZE; row += 1) {
    for (let column = 0; column < GRID_SIZE; column += 1) {
      const x = column * CELL_SIZE;
      const y = row * CELL_SIZE;
      ctx.fillStyle = (row + column) % 2 ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.42)';
      ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
    }
  }

  ctx.strokeStyle = 'rgba(107, 139, 101, 0.11)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= GRID_SIZE; i += 1) {
    const position = i * CELL_SIZE;
    ctx.beginPath();
    ctx.moveTo(position, 0);
    ctx.lineTo(position, BOARD_SIZE);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, position);
    ctx.lineTo(BOARD_SIZE, position);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.2;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(BOARD_SIZE - 14, 16, 58, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  if (level.beadShape) {
    drawBeadShape(level);
  } else {
    drawLandmark(level.start, '🐱', '#e8a23d');
    drawLandmark(level.goal, level.target, color);
  }
  level.obstacles.forEach(([column, row, icon]) => drawObstacle(column, row, icon));
}

function drawBeadShape(level) {
  const beadShape = level.beadShape;
  const outline = beadShape.outline.map(pointFor);
  const gapEdges = new Set(beadShape.gapEdges);
  const center = pointFor([3, 3]);
  const palette = beadShape.kind === 'smile'
    ? ['#b77cd0', '#9270b4', '#d29be0']
    : [beadShape.fill, themeColors[currentLevel % themeColors.length], '#fff3d0'];

  ctx.save();
  ctx.beginPath();
  outline.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = beadShape.kind === 'smile' ? '#ffffff' : beadShape.fill;
  ctx.fill();
  ctx.globalAlpha = 1;

  if (beadShape.kind === 'smile') {
    ctx.fillStyle = '#655477';
    ctx.beginPath();
    ctx.ellipse(center.x - 42, center.y - 28, 8, 14, 0, 0, Math.PI * 2);
    ctx.ellipse(center.x + 42, center.y - 28, 8, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (beadShape.kind === 'apple') {
    ctx.strokeStyle = '#7a5738';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(center.x, center.y - 100);
    ctx.lineTo(center.x + 7, center.y - 127);
    ctx.stroke();
    ctx.fillStyle = '#69a96a';
    ctx.beginPath();
    ctx.ellipse(center.x + 22, center.y - 117, 18, 8, -0.35, 0, Math.PI * 2);
    ctx.fill();
  } else if (beadShape.kind === 'castle') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    [[2.9, 2.5], [4.1, 3.1], [1.9, 3.1]].forEach(([column, row]) => {
      const point = pointFor([column, row]);
      ctx.fillRect(point.x - 9, point.y - 12, 18, 24);
    });
  } else if (beadShape.kind === 'balloon') {
    ctx.strokeStyle = 'rgba(63, 128, 150, 0.58)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(center.x, pointFor([3, 5.35]).y);
    ctx.quadraticCurveTo(center.x - 30, center.y + 145, center.x + 13, BOARD_SIZE - 16);
    ctx.stroke();
  } else if (beadShape.kind === 'basket') {
    ctx.strokeStyle = 'rgba(128, 76, 39, 0.34)';
    ctx.lineWidth = 5;
    for (let index = 0; index < 4; index += 1) {
      const y = center.y + index * 27;
      ctx.beginPath();
      ctx.moveTo(center.x - 95, y);
      ctx.lineTo(center.x + 95, y);
      ctx.stroke();
    }
  } else if (beadShape.kind === 'star') {
    ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
    ctx.beginPath();
    ctx.arc(center.x, center.y, 13, 0, Math.PI * 2);
    ctx.fill();
  } else if (beadShape.kind === 'rainbow') {
    ctx.globalAlpha = 0.7;
    ['#f28b63', '#efc452', '#69b987', '#67aee0'].forEach((color, index) => {
      const point = pointFor([3, 5.5 - index * 0.12]);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, 7, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  for (let index = 0; index < outline.length; index += 1) {
    if (gapEdges.has(index)) continue;
    const start = outline[index];
    const end = outline[(index + 1) % outline.length];
    const length = distance(start, end);
    const beadCount = Math.max(1, Math.floor(length / 12));
    for (let beadIndex = 0; beadIndex < beadCount; beadIndex += 1) {
      const ratio = (beadIndex + 0.5) / beadCount;
      const x = start.x + (end.x - start.x) * ratio;
      const y = start.y + (end.y - start.y) * ratio;
      ctx.save();
      ctx.shadowColor = 'rgba(53, 48, 62, 0.18)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.fillStyle = palette[(index + beadIndex) % palette.length];
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.68)';
      ctx.beginPath();
      ctx.arc(x - 1.5, y - 1.5, 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  [level.start, level.goal].forEach((position, index) => {
    const point = pointFor(position);
    ctx.save();
    ctx.fillStyle = index === 0 ? '#fff4dc' : '#e9f8f1';
    ctx.strokeStyle = index === 0 ? '#e8a23d' : '#59aa88';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(point.x, point.y, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.font = '19px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(index === 0 ? '✏️' : level.target, point.x, point.y + 1);
    ctx.restore();
  });
}

function drawLandmark(cell, icon, color) {
  const { x, y } = pointFor(cell);
  const isStart = icon === '🐱';
  ctx.save();
  ctx.shadowColor = 'rgba(45, 65, 43, 0.2)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#fffef9';
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 25, 0, Math.PI * 2);
  ctx.stroke();
  ctx.font = '36px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x, y + 1);

  if (!isStart) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(x + 18, y - 18, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#e8aa32';
    ctx.fillText('★', x + 18, y - 18);
  }
}

function drawObstacle(column, row, icon) {
  const { x, y } = pointFor([column, row]);
  ctx.save();
  ctx.shadowColor = 'rgba(51, 74, 43, 0.22)';
  ctx.shadowBlur = 7;
  ctx.shadowOffsetY = 4;
  const stone = ctx.createRadialGradient(x - 9, y - 10, 2, x, y, OBSTACLE_RADIUS);
  stone.addColorStop(0, 'rgba(255,255,255,0.96)');
  stone.addColorStop(1, 'rgba(224,233,214,0.94)');
  ctx.fillStyle = stone;
  ctx.beginPath();
  ctx.arc(x, y, OBSTACLE_RADIUS, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.font = '31px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, x, y + 1);
}

function drawPath() {
  if (path.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let index = 1; index < path.length; index += 1) {
    ctx.lineTo(path[index].x, path[index].y);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = 18;
  ctx.stroke();
  const pencil = ctx.createLinearGradient(0, 0, BOARD_SIZE, BOARD_SIZE);
  pencil.addColorStop(0, pathTouchesObstacle ? '#ed695b' : '#f1a632');
  pencil.addColorStop(1, pathTouchesObstacle ? '#d64950' : '#e98535');
  ctx.strokeStyle = pencil;
  ctx.lineWidth = 11;
  ctx.shadowColor = pathTouchesObstacle ? 'rgba(184,55,50,0.28)' : 'rgba(138,86,30,0.25)';
  ctx.shadowBlur = 5;
  ctx.stroke();
  ctx.restore();
}

function drawBoard() {
  ctx.clearRect(0, 0, BOARD_SIZE, BOARD_SIZE);
  drawBackdrop();
  drawPath();
}

function canvasPoint(event) {
  const bounds = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - bounds.left) * (BOARD_SIZE / bounds.width),
    y: (event.clientY - bounds.top) * (BOARD_SIZE / bounds.height)
  };
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function distanceToSegment(point, start, end) {
  const segmentLengthSquared = (end.x - start.x) ** 2 + (end.y - start.y) ** 2;
  if (!segmentLengthSquared) return distance(point, start);
  const projection = Math.max(0, Math.min(1,
    ((point.x - start.x) * (end.x - start.x) + (point.y - start.y) * (end.y - start.y)) /
      segmentLengthSquared
  ));
  return distance(point, {
    x: start.x + projection * (end.x - start.x),
    y: start.y + projection * (end.y - start.y)
  });
}

function distanceToPolyline(point, points) {
  let nearest = Infinity;
  for (let index = 1; index < points.length; index += 1) {
    nearest = Math.min(nearest, distanceToSegment(point, points[index - 1], points[index]));
  }
  return nearest;
}

function matchesTraceShape(level) {
  if (distance(path[path.length - 1], pointFor(level.goal)) > GOAL_RADIUS) return false;
  const tracePath = level.beadShape.tracePath.map(pointFor);
  const expectedLength = tracePath.slice(1).reduce(
    (total, point, index) => total + distance(tracePath[index], point),
    0
  );
  const drawnLength = path.slice(1).reduce(
    (total, point, index) => total + distance(path[index], point),
    0
  );
  if (drawnLength < expectedLength * 0.78) return false;
  if (path.some(point => distanceToPolyline(point, tracePath) > 26)) return false;

  for (let index = 1; index < tracePath.length; index += 1) {
    const start = tracePath[index - 1];
    const end = tracePath[index];
    const samples = Math.ceil(distance(start, end) / 8);
    for (let sample = 0; sample <= samples; sample += 1) {
      const ratio = sample / samples;
      const point = {
        x: start.x + (end.x - start.x) * ratio,
        y: start.y + (end.y - start.y) * ratio
      };
      if (distanceToPolyline(point, path) > 30) return false;
    }
  }
  return true;
}

function segmentTouchesObstacle(from, to) {
  const length = distance(from, to);
  const samples = Math.max(1, Math.ceil(length / 7));
  const level = currentLevelData();
  return level.obstacles.some(([column, row]) => {
    const obstacle = pointFor([column, row]);
    for (let index = 0; index <= samples; index += 1) {
      const ratio = index / samples;
      const sample = {
        x: from.x + (to.x - from.x) * ratio,
        y: from.y + (to.y - from.y) * ratio
      };
      if (distance(sample, obstacle) < OBSTACLE_RADIUS + STROKE_RADIUS) return true;
    }
    return false;
  });
}

function animateBoard(outcome) {
  clearTimeout(animationTimeout);
  canvasWrap.classList.remove('draw-fail', 'draw-win');
  void canvasWrap.offsetWidth;
  canvasWrap.classList.add(`draw-${outcome}`);
  animationTimeout = setTimeout(() => canvasWrap.classList.remove(`draw-${outcome}`), 1400);
}

function resetDrawing() {
  isDrawing = false;
  hasDrawn = false;
  path = [];
  pathTouchesObstacle = false;
  clearTimeout(animationTimeout);
  canvasWrap.classList.remove('draw-fail', 'draw-win');
  feedbackElement.textContent = '';
  drawBoard();
}

function onPointerDown(event) {
  if (isDrawing) return;
  const start = pointFor(currentLevelData().start);
  const point = canvasPoint(event);
  if (distance(point, start) > START_RADIUS) {
    animateBoard('fail');
    return;
  }
  event.preventDefault();
  canvas.setPointerCapture(event.pointerId);
  isDrawing = true;
  hasDrawn = true;
  pathTouchesObstacle = false;
  path = [start];
  playTone(520);
  drawBoard();
}

function onPointerMove(event) {
  if (!isDrawing) return;
  event.preventDefault();
  recordPoint(canvasPoint(event));
}

function recordPoint(point) {
  const bounded = {
    x: Math.max(0, Math.min(BOARD_SIZE, point.x)),
    y: Math.max(0, Math.min(BOARD_SIZE, point.y))
  };
  const previous = path[path.length - 1];
  if (distance(previous, bounded) < 3) return;
  if (segmentTouchesObstacle(previous, bounded)) pathTouchesObstacle = true;
  path.push(bounded);
  drawBoard();
}

function onPointerUp(event) {
  if (!isDrawing) return;
  const end = pathFor(event);
  recordPoint(end);
  isDrawing = false;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  const level = currentLevelData();
  const completed = level.beadShape
    ? matchesTraceShape(level)
    : distance(end, pointFor(level.goal)) <= GOAL_RADIUS && !pathTouchesObstacle;
  if (completed) {
    winLevel();
  } else {
    animateBoard('fail');
  }
}

function pathFor(event) {
  if (event && Number.isFinite(event.clientX) && Number.isFinite(event.clientY)) {
    const point = canvasPoint(event);
    if (point.x >= 0 && point.x <= BOARD_SIZE && point.y >= 0 && point.y <= BOARD_SIZE) return point;
  }
  return path[path.length - 1] || pointFor(currentLevelData().start);
}

function checkPath() {
  if (!hasDrawn || path.length < 2) {
    animateBoard('fail');
    return;
  }
  const end = path[path.length - 1];
  const level = currentLevelData();
  const completed = level.beadShape
    ? matchesTraceShape(level)
    : distance(end, pointFor(level.goal)) <= GOAL_RADIUS && !pathTouchesObstacle;
  if (completed) {
    winLevel();
  } else {
    animateBoard('fail');
  }
}

function winLevel() {
  if (isDrawing) isDrawing = false;
  clearTimeout(nextLevelTimeout);
  animateBoard('win');
  playTone(760, 0.18);
  const levelNumber = currentLevel + 1;
  const result = window.KidsGames.completeGameLevel('draw', levelNumber, 3);
  const completed = result.gameProgress.completed;
  completedLevels = new Set(completed);
  const nextLevel = Math.min(levels.length, levelNumber + 1);
  const unlocked = Math.min(levels.length, Math.max(Number(result.gameProgress.unlocked) || 1, nextLevel));
  window.KidsGames.saveProgress({
    ...result.progress,
    draw: {
      ...result.gameProgress,
      completed,
      currentLevel: nextLevel,
      unlocked
    }
  });
  starsElement.textContent = result.gameStars;
  hasDrawn = false;
  window.KidsGames.showLevelVictory(levelNumber, 3, result.isFirstCompletion);

  if (currentLevel < levels.length - 1) {
    nextLevelTimeout = setTimeout(() => {
      currentLevel += 1;
      loadLevel();
    }, 1750);
  }
}

function loadLevel() {
  clearTimeout(nextLevelTimeout);
  window.KidsGames.hideLevelVictory();
  clearTimeout(animationTimeout);
  canvasWrap.classList.remove('draw-fail', 'draw-win');
  const level = currentLevelData();
  titleElement.textContent = currentLevel + 1;
  targetHintElement.textContent = level.beadShape ? `✏️ ➜ ${level.target}` : `🐱 ➜ ${level.target}`;
  targetHintElement.setAttribute('aria-label', level.beadShape
    ? `أكملي الجزء الناقص من شكل ${level.target}`
    : `ارسم طريقًا من القطة إلى ${level.target}`);
  canvas.setAttribute('aria-label', level.beadShape
    ? `ارسم الجزء الناقص من الخرز لإكمال شكل ${level.target}`
    : 'المس القطة واسحب لرسم طريق إلى الهدف، مع تجنب العوائق');
  document.getElementById('levelHint').textContent = level.hint;
  levelNumElement.textContent = currentLevel + 1;
  resetDrawing();
  saveCurrentLevel();
  window.KidsGames.renderGameHeader('draw', currentLevel + 1);
  updateNextLevelButton();
}

function updateNextLevelButton() {
  const progress = window.KidsGames.readProgress();
  const unlocked = window.KidsGames.getUnlockedLevel('draw', progress);
  const nextButton = document.getElementById('nextLevelButton');
  const canAdvance = currentLevel + 1 < unlocked && currentLevel < levels.length - 1;
  nextButton.hidden = !canAdvance;
  nextButton.disabled = !canAdvance;
}

function nextLevel() {
  const progress = window.KidsGames.readProgress();
  const unlocked = window.KidsGames.getUnlockedLevel('draw', progress);
  if (currentLevel + 1 < unlocked) {
    currentLevel += 1;
    loadLevel();
  }
}

canvas.addEventListener('pointerdown', onPointerDown);
canvas.addEventListener('pointermove', onPointerMove);
canvas.addEventListener('pointerup', onPointerUp);
canvas.addEventListener('pointercancel', () => {
  if (isDrawing) {
    isDrawing = false;
    animateBoard('fail');
  }
});
document.getElementById('runButton').addEventListener('click', checkPath);
document.getElementById('resetButton').addEventListener('click', resetDrawing);
document.getElementById('nextLevelButton').addEventListener('click', nextLevel);

readProgress();
loadLevel();
