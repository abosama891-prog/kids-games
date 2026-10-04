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

const levels = [
  { target: '🏠', hint: 'ارسم طريقًا آمنًا إلى البيت', start: [0, 3], goal: [6, 3], obstacles: [[3, 3, '🪨']] },
  { target: '🐟', hint: 'أوصل القطة إلى السمكة بين الأشجار', start: [0, 5], goal: [6, 1], obstacles: [[2, 4, '🌳'], [3, 3, '🌳'], [4, 2, '🌳']] },
  { target: '🌻', hint: 'اعبر البحيرة من الممر المفتوح', start: [0, 1], goal: [6, 5], obstacles: [[1, 3, '💧'], [2, 3, '💧'], [3, 3, '💧'], [4, 3, '💧'], [5, 3, '💧']] },
  { target: '🍎', hint: 'تجاوز الصخور في طريق التفاحة', start: [0, 5], goal: [6, 1], obstacles: [[2, 5, '🪨'], [2, 4, '🪨'], [3, 3, '🌵'], [4, 2, '🪨'], [4, 1, '🪨']] },
  { target: '🏰', hint: 'التف حول الغابة حتى القلعة', start: [0, 1], goal: [6, 5], obstacles: [[2, 1, '🌲'], [2, 2, '🌲'], [2, 3, '🌲'], [4, 3, '🌲'], [4, 4, '🌲'], [4, 5, '🌲']] },
  { target: '🎈', hint: 'اعبر الجسر فوق النهر', start: [0, 5], goal: [6, 1], obstacles: [[1, 3, '🌊'], [2, 3, '🌊'], [3, 3, '🌉'], [4, 3, '🌊'], [5, 3, '🌊']] },
  { target: '🧺', hint: 'اجمع الفاكهة من دون لمس الأشواك', start: [0, 3], goal: [6, 3], obstacles: [[2, 2, '🌵'], [2, 4, '🌵'], [3, 2, '🌵'], [3, 4, '🌵'], [4, 2, '🌵'], [4, 4, '🌵']] },
  { target: '⭐', hint: 'اتبع الممر المتعرج إلى النجمة', start: [0, 5], goal: [6, 1], obstacles: [[1, 4, '🪵'], [2, 4, '🪵'], [3, 3, '🪵'], [4, 2, '🪵'], [5, 2, '🪵']] },
  { target: '🐶', hint: 'مر بين الحواجز للوصول إلى صديقك', start: [0, 1], goal: [6, 5], obstacles: [[2, 1, '🪵'], [2, 2, '🪵'], [2, 4, '🪵'], [2, 5, '🪵'], [4, 1, '🪵'], [4, 2, '🪵'], [4, 4, '🪵'], [4, 5, '🪵']] },
  { target: '🌈', hint: 'ارسم طريقك عبر البوابة الملونة', start: [0, 5], goal: [6, 1], obstacles: [[1, 4, '🌳'], [2, 3, '🪨'], [3, 2, '🌵'], [4, 3, '🪨'], [5, 4, '🌳']] }
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

  drawLandmark(level.start, '🐱', '#e8a23d');
  drawLandmark(level.goal, level.target, color);
  level.obstacles.forEach(([column, row, icon]) => drawObstacle(column, row, icon));
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
  if (distance(end, pointFor(currentLevelData().goal)) <= GOAL_RADIUS && !pathTouchesObstacle) {
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
  if (distance(end, pointFor(currentLevelData().goal)) <= GOAL_RADIUS && !pathTouchesObstacle) {
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

  if (currentLevel < levels.length - 1) {
    nextLevelTimeout = setTimeout(() => {
      currentLevel += 1;
      loadLevel();
    }, 1450);
  }
}

function loadLevel() {
  clearTimeout(nextLevelTimeout);
  clearTimeout(animationTimeout);
  canvasWrap.classList.remove('draw-fail', 'draw-win');
  const level = currentLevelData();
  titleElement.textContent = currentLevel + 1;
  targetHintElement.textContent = `🐱 ➜ ${level.target}`;
  targetHintElement.setAttribute('aria-label', `ارسم طريقًا من القطة إلى ${level.target}`);
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
