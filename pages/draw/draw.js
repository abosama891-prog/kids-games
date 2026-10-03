const THEME_ICONS = ['🐱', '🐰', '🐶', '🦊', '🐼', '🐯'];
const STEP = 60;
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const starsElement = document.getElementById('stars');
const levelNumElement = document.getElementById('levelNum');
const titleElement = document.getElementById('title');
const targetHintElement = document.getElementById('targetHint');
const feedbackElement = document.getElementById('feedback');
const programElement = document.getElementById('program');

const levels = [
  { target: '─', goal: p => p.lines >= 1 },
  { target: '━', goal: p => p.lines >= 4 && !p.hasTurned },
  { target: '⌜', goal: p => p.lines >= 4 && p.turns >= 1 },
  { target: '□', goal: p => p.lines >= 16 && p.closedSquare },
  { target: '△', goal: p => p.lines >= 12 && p.turns >= 6 },
  { target: '⭐', goal: p => p.lines >= 20 },
  { target: '◯', goal: p => p.lines >= 24 },
  { target: '🎨', goal: p => p.lines >= 28 }
];

let currentLevel = 0;
let program = [];
let isRunning = false;
let char = { x: canvas.width / 2, y: canvas.height / 2, angle: -90 };
let path = [];
let lineCount = 0;
let turnCount = 0;
let firstPoint = null;
let audioCtx = null;

function loadProgressState() {
  const progress = window.KidsGames.readProgress();
  const state = progress.draw || { currentLevel: 1, unlocked: 1, completed: [] };
  currentLevel = Math.max(0, Math.min(state.currentLevel - 1, levels.length - 1));
  starsElement.textContent = progress.stars || 0;
  return progress;
}

function saveProgress() {
  const progress = window.KidsGames.readProgress();
  const state = progress.draw || { currentLevel: 1, unlocked: 1, completed: [] };
  const desiredLevel = currentLevel + 1;
  const nextState = {
    ...progress,
    draw: {
      ...state,
      currentLevel: desiredLevel,
      unlocked: Math.max(state.unlocked || 1, desiredLevel)
    }
  };
  window.KidsGames.saveProgress(nextState);
}

function playTone(freq, duration = 0.08, delay = 0, type = 'sine', volume = 0.08) {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();
  }

  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = freq;
  gain.gain.value = volume;

  oscillator.connect(gain);
  gain.connect(audioCtx.destination);

  const startTime = audioCtx.currentTime + delay;
  oscillator.start(startTime);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
  oscillator.stop(startTime + duration);
}

function initChar() {
  char.x = canvas.width / 2;
  char.y = canvas.height / 2;
  char.angle = -90;
  path = [];
  lineCount = 0;
  turnCount = 0;
  firstPoint = { x: char.x, y: char.y };
  drawBoard();
}

function drawBoard() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#edf2f8';
  ctx.lineWidth = 1;

  for (let i = 0; i <= canvas.width; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  if (path.length > 0) {
    ctx.strokeStyle = '#e74c3c';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i += 1) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.stroke();
  }

  ctx.font = '44px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(THEME_ICONS[currentLevel % THEME_ICONS.length] || '🐱', char.x, char.y);

  const rad = (char.angle * Math.PI) / 180;
  const ax = char.x + Math.cos(rad) * 34;
  const ay = char.y + Math.sin(rad) * 34;
  ctx.fillStyle = '#f39c12';
  ctx.beginPath();
  ctx.arc(ax, ay, 6, 0, Math.PI * 2);
  ctx.fill();
}

function renderProgram() {
  programElement.innerHTML = '';

  if (program.length === 0) {
    const empty = document.createElement('div');
    empty.textContent = `🐱　·　·　·　${levels[currentLevel].target}`;
    empty.style.color = '#7f8c8d';
    empty.style.fontWeight = '700';
    programElement.appendChild(empty);
    return;
  }

  program.forEach((cmd, index) => {
    const item = document.createElement('div');
    item.className = `program-item ${cmd.type}`;
    const label = cmd.type === 'draw' ? '✏️' : cmd.type === 'right' ? '↪️' : '↩️';
    item.innerHTML = `${label}${cmd.repeat > 1 ? `<span class="repeat-badge">×${cmd.repeat}</span>` : ''}`;
    item.addEventListener('click', () => {
      if (isRunning) return;
      program.splice(index, 1);
      renderProgram();
    });
    programElement.appendChild(item);
  });
}

function setFeedback(text, isSuccess = false) {
  feedbackElement.textContent = text;
  feedbackElement.style.color = isSuccess ? '#27ae60' : '#e67e22';
}

function addCommand(type) {
  if (isRunning) return;
  program.push({ type, repeat: 1 });
  renderProgram();
  playTone(550, 0.04, 0, 'square', 0.05);
}

function addRepeat(value) {
  if (isRunning) return;
  if (!program.length) {
    setFeedback('❓');
    return;
  }
  program[program.length - 1].repeat = value;
  renderProgram();
  playTone(640, 0.05, 0, 'triangle', 0.05);
}

function executeCommand(type) {
  if (type === 'draw') {
    const rad = (char.angle * Math.PI) / 180;
    const nextX = char.x + Math.cos(rad) * STEP;
    const nextY = char.y + Math.sin(rad) * STEP;

    if (nextX < 20 || nextX > canvas.width - 20 || nextY < 20 || nextY > canvas.height - 20) {
      setFeedback('🚫');
      return 'fail';
    }

    char.x = nextX;
    char.y = nextY;
    path.push({ x: char.x, y: char.y });
    lineCount += 1;
    playTone(400 + lineCount * 18, 0.06, 0, 'sine', 0.06);
  } else if (type === 'right') {
    char.angle += 90;
    turnCount += 1;
    playTone(620, 0.05, 0, 'triangle', 0.05);
  } else if (type === 'left') {
    char.angle -= 90;
    turnCount += 1;
    playTone(500, 0.05, 0, 'triangle', 0.05);
  }

  drawBoard();
  return 'ok';
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runProgram() {
  if (isRunning) return;
  if (!program.length) {
    setFeedback('🤔');
    return;
  }

  isRunning = true;
  setFeedback('');
  path = [];
  lineCount = 0;
  turnCount = 0;
  initChar();

  for (const cmd of program) {
    for (let i = 0; i < cmd.repeat; i += 1) {
      const result = executeCommand(cmd.type);
      await sleep(220);
      if (result === 'fail') {
        isRunning = false;
        return;
      }
    }
  }

  isRunning = false;
  checkWin();
}

function checkWin() {
  const stats = {
    lines: lineCount,
    turns: turnCount,
    hasTurned: turnCount > 0,
    closedSquare: false
  };

  if (path.length > 1) {
    const last = path[path.length - 1];
    if (Math.abs(last.x - firstPoint.x) < 18 && Math.abs(last.y - firstPoint.y) < 18) {
      stats.closedSquare = true;
    }
  }

  if (levels[currentLevel].goal(stats)) {
    winLevel();
  } else {
    setFeedback('🤔🎯');
  }
}

function winLevel() {
  const progress = window.KidsGames.readProgress();
  const state = progress.draw || { currentLevel: 1, unlocked: 1, completed: [] };
  const currentNumber = currentLevel + 1;
  const nextCompleted = Array.from(new Set([...(state.completed || []), currentNumber]));
  const nextStars = (progress.stars || 0) + 3;
  const nextState = {
    ...progress,
    stars: nextStars,
    draw: {
      ...state,
      currentLevel: Math.max(state.currentLevel || 1, currentNumber + 1),
      unlocked: Math.max(state.unlocked || 1, currentNumber + 1),
      completed: nextCompleted
    }
  };

  window.KidsGames.saveProgress(nextState);
  starsElement.textContent = nextStars;
  setFeedback('🎉⭐', true);

  if (currentLevel < levels.length - 1) {
    setTimeout(() => {
      currentLevel += 1;
      loadLevel();
    }, 500);
  } else {
    setTimeout(() => {
      setFeedback('🏆🎉', true);
    }, 400);
  }
}

function clearProgram() {
  program = [];
  renderProgram();
  initChar();
  setFeedback('');
}

function loadLevel() {
  const level = levels[currentLevel];
  titleElement.textContent = currentLevel + 1;
  targetHintElement.textContent = level.target;
  levelNumElement.textContent = currentLevel + 1;
  program = [];
  renderProgram();
  initChar();
  setFeedback('');
  saveProgress();
}

function nextLevel() {
  if (currentLevel < levels.length - 1) {
    currentLevel += 1;
    loadLevel();
  } else {
    setFeedback('🏁');
  }
}

document.querySelectorAll('.cmd-btn[data-cmd]').forEach(button => {
  button.addEventListener('click', () => addCommand(button.dataset.cmd));
});

document.querySelectorAll('.cmd-btn[data-repeat]').forEach(button => {
  button.addEventListener('click', () => addRepeat(Number(button.dataset.repeat)));
});

document.getElementById('clearButton').addEventListener('click', clearProgram);
document.getElementById('runButton').addEventListener('click', runProgram);
document.getElementById('nextLevelButton').addEventListener('click', nextLevel);
document.getElementById('resetButton').addEventListener('click', loadLevel);

document.querySelectorAll('.help-q').forEach(button => {
  button.addEventListener('click', () => {
    const popup = button.parentElement.querySelector('.code-popup');
    const opening = !popup.classList.contains('show');

    document.querySelectorAll('.code-popup.show').forEach(openPopup => {
      openPopup.classList.remove('show');
      openPopup.setAttribute('aria-hidden', 'true');
    });
    document.querySelectorAll('.help-q[aria-expanded="true"]').forEach(openButton => {
      openButton.setAttribute('aria-expanded', 'false');
    });

    if (opening) {
      popup.classList.add('show');
      popup.setAttribute('aria-hidden', 'false');
      button.setAttribute('aria-expanded', 'true');
    }
  });
});

loadProgressState();
loadLevel();
