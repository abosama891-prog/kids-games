const boardElement = document.getElementById('board');
const starsElement = document.getElementById('stars');
const levelNumElement = document.getElementById('levelNum');
const titleElement = document.getElementById('title');
const feedbackElement = document.getElementById('feedback');
const programElement = document.getElementById('program');
const levelHintElement = document.getElementById('levelHint');
const boardWrapElement = document.querySelector('.board-wrap');

const levels = [
  {
    title: 'المستوى 1',
    hint: 'اذهب إلى الخضار في أقصر طريق',
    board: ['#####', '#S..#', '#.#.#', '#..G#', '#####'],
    tools: ['right', 'down']
  },
  {
    title: 'المستوى 2',
    hint: 'بعض الجدران تمنع الطريق',
    board: ['#####', '#S#.#', '#...#', '#.#G#', '#####'],
    tools: ['right', 'down']
  },
  {
    title: 'المستوى 3',
    hint: 'ابدأ بقفزة إلى اليمين، ثم انزل نحو الجزرة',
    board: ['#####', '#S#.#', '##..#', '###G#', '#####'],
    tools: ['down', 'jump']
  },
  {
    title: 'المستوى 4',
    hint: 'خطة أفضل من التعميم العشوائي',
    board: ['#####', '#S..#', '#.##.', '#...G', '#####'],
    tools: ['right', 'down', 'repeat2', 'repeat3']
  },
  {
    title: 'المستوى 5',
    hint: 'الهدف هو العبور بأمان',
    board: ['#####', '#S#.#', '#...#', '#...G', '#####'],
    tools: ['right', 'down', 'repeat2']
  }
];

let currentLevel = 0;
let stars = 0;
let program = [];
let isRunning = false;
let player = { x: 1, y: 1 };
let goal = { x: 3, y: 3 };
let lastDirection = { x: 1, y: 0 };
let completedLevels = new Set();
let boardAnimationTimeout;

function readProgress() {
  const progress = window.KidsGames.readProgress();
  const saved = progress.maze || { currentLevel: 1, unlocked: 1, completed: [] };
  const unlocked = window.KidsGames.getUnlockedLevel('maze', progress);
  currentLevel = Math.max(0, Math.min(Number(saved.currentLevel || 1), unlocked, levels.length) - 1);
  completedLevels = new Set((saved.completed || []).filter(level => Number.isInteger(level) && level >= 1 && level <= levels.length));
  stars = progress.maze?.stars || 0;
  starsElement.textContent = stars;
  window.KidsGames.renderGameHeader('maze', currentLevel + 1);
  return progress;
}

function saveProgress() {
  const progress = window.KidsGames.readProgress();
  const saved = progress.maze || { currentLevel: 1, unlocked: 1, completed: [] };
  const next = {
    ...progress,
    maze: {
      ...saved,
      currentLevel: currentLevel + 1,
      unlocked: Math.max(1, Math.min(Number(saved.unlocked || 1), levels.length))
    }
  };
  window.KidsGames.saveProgress(next);
}

function setFeedback(message, ok = true) {
  feedbackElement.textContent = message;
  feedbackElement.style.color = ok ? '#27ae60' : '#d35400';
}

function animateBoard(outcome) {
  clearTimeout(boardAnimationTimeout);
  boardWrapElement.classList.remove('maze-fail', 'maze-win');
  void boardWrapElement.offsetWidth;
  boardWrapElement.classList.add(`maze-${outcome}`);
  boardAnimationTimeout = setTimeout(() => {
    boardWrapElement.classList.remove(`maze-${outcome}`);
  }, 1500);
}

function renderBoard() {
  const board = levels[currentLevel].board;
  boardElement.innerHTML = '';

  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      const cell = document.createElement('div');
      const char = board[y][x];
      cell.className = 'cell';

      if (char === '#') cell.classList.add('wall');
      if (char === 'G') cell.classList.add('goal');
      if (x === player.x && y === player.y) cell.classList.add('player');

      if (x === player.x && y === player.y) {
        cell.textContent = '🐰';
      } else if (char === 'G') {
        cell.textContent = '🥕';
      } else if (char === '#') {
        cell.textContent = '🧱';
      }

      boardElement.appendChild(cell);
    }
  }
}

function getLevelLayout() {
  const board = levels[currentLevel].board;
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x] === 'S') player = { x, y };
      if (board[y][x] === 'G') goal = { x, y };
    }
  }
}

function movePlayer(dx, dy) {
  const board = levels[currentLevel].board;
  const nextX = player.x + dx;
  const nextY = player.y + dy;

  if (nextY < 0 || nextY >= board.length || nextX < 0 || nextX >= board[nextY].length) {
    animateBoard('fail');
    return false;
  }

  if (board[nextY][nextX] === '#') {
    animateBoard('fail');
    return false;
  }

  player = { x: nextX, y: nextY };
  renderBoard();
  if (nextX === goal.x && nextY === goal.y) {
    animateBoard('win');
    return 'win';
  }
  return true;
}

function moveInDirection(dx, dy) {
  lastDirection = { x: dx, y: dy };
  return movePlayer(dx, dy);
}

function addCommand(command) {
  if (isRunning) return;
  program.push({ command, repeat: 1 });
  renderProgram();
}

function addRepeat(value) {
  if (isRunning) return;
  if (!program.length) {
    setFeedback('❓');
    return;
  }
  program[program.length - 1].repeat = value;
  renderProgram();
}

function renderProgram() {
  programElement.innerHTML = '';

  if (!program.length) {
    const empty = document.createElement('div');
    empty.style.color = '#7f8c8d';
    empty.textContent = '🐰　·　·　·　🥕';
    programElement.appendChild(empty);
    return;
  }

  program.forEach((item, index) => {
    const element = document.createElement('div');
    element.className = `program-item ${item.command}`;
    const labels = {
      up: '↑',
      down: '↓',
      left: '←',
      right: '→',
      jump: '🦘'
    };
    element.innerHTML = `${labels[item.command] || item.command}${item.repeat > 1 ? `<span class="repeat-badge">×${item.repeat}</span>` : ''}`;
    element.addEventListener('click', () => {
      program.splice(index, 1);
      renderProgram();
    });
    programElement.appendChild(element);
  });
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runProgram() {
  if (isRunning || !program.length) {
    if (!program.length) setFeedback('أضف أوامر أولًا.', false);
    return;
  }

  isRunning = true;
  const original = { ...player };
  lastDirection = { x: 1, y: 0 };
  setFeedback('');
  updateNextLevelButton();

  for (const step of program) {
    for (let i = 0; i < step.repeat; i += 1) {
      const result = executeCommand(step.command);
      if (result === 'win') {
        isRunning = false;
        winLevel();
        return;
      }
      if (result === false) {
        player = original;
        renderBoard();
        isRunning = false;
        setFeedback('');
        updateNextLevelButton();
        return;
      }
      await sleep(300);
    }
  }

  isRunning = false;
  updateNextLevelButton();
  if (player.x !== goal.x || player.y !== goal.y) {
    setFeedback('');
    animateBoard('fail');
  }
}

function executeCommand(command) {
  switch (command) {
    case 'up':
      return moveInDirection(0, -1);
    case 'down':
      return moveInDirection(0, 1);
    case 'left':
      return moveInDirection(-1, 0);
    case 'right':
      return moveInDirection(1, 0);
    case 'jump':
      return movePlayer(lastDirection.x * 2, lastDirection.y * 2);
    default:
      return true;
  }
}

function winLevel() {
  const levelNumber = currentLevel + 1;
  const result = window.KidsGames.completeGameLevel('maze', levelNumber, 3);
  const maze = result.gameProgress;
  completedLevels = new Set(maze.completed);
  const nextLevel = Math.min(levels.length, levelNumber + 1);
  const nextProgress = {
    ...result.progress,
    maze: {
      ...maze,
      currentLevel: nextLevel,
      unlocked: Math.max(Math.min(Number(maze.unlocked || 1), levels.length), nextLevel)
    }
  };
  window.KidsGames.saveProgress(nextProgress);
  starsElement.textContent = result.gameStars;
  window.KidsGames.renderGameHeader('maze', currentLevel + 1);
  window.KidsGames.showLevelVictory(levelNumber, 3, result.isFirstCompletion);
  if (currentLevel < levels.length - 1) {
    setTimeout(() => {
      currentLevel += 1;
      resetLevel();
    }, 1900);
  } else {
    setFeedback('');
  }
}

function resetLevel() {
  window.KidsGames.hideLevelVictory();
  clearTimeout(boardAnimationTimeout);
  boardWrapElement.classList.remove('maze-fail', 'maze-win');
  const board = levels[currentLevel].board;
  for (let y = 0; y < board.length; y += 1) {
    for (let x = 0; x < board[y].length; x += 1) {
      if (board[y][x] === 'S') {
        player = { x, y };
      }
      if (board[y][x] === 'G') {
        goal = { x, y };
      }
    }
  }

  titleElement.textContent = currentLevel + 1;
  levelNumElement.textContent = currentLevel + 1;
  levelHintElement.textContent = levels[currentLevel].hint;
  renderTools();
  lastDirection = { x: 1, y: 0 };
  program = [];
  renderProgram();
  renderBoard();
  setFeedback('');
  saveProgress();
  updateNextLevelButton();
}

function renderTools() {
  const tools = new Set(levels[currentLevel].tools);
  document.querySelectorAll('.dir-btn').forEach(button => {
    button.closest('.command-control').hidden = !tools.has(button.dataset.dir);
  });
  document.querySelectorAll('.extra-btn[data-repeat]').forEach(button => {
    button.closest('.command-control').hidden = !tools.has(`repeat${button.dataset.repeat}`);
  });
  const jumpButton = document.querySelector('.extra-btn.jump');
  jumpButton.closest('.command-control').hidden = !tools.has('jump');
}

function clearProgram() {
  program = [];
  renderProgram();
  setFeedback('');
}

function nextLevel() {
  const progress = window.KidsGames.readProgress();
  const unlocked = window.KidsGames.getUnlockedLevel('maze', progress);
  if (!isRunning && currentLevel + 1 < unlocked && currentLevel < levels.length - 1) {
    currentLevel += 1;
    resetLevel();
  }
}

function updateNextLevelButton() {
  const progress = window.KidsGames.readProgress();
  const unlocked = window.KidsGames.getUnlockedLevel('maze', progress);
  const nextButton = document.getElementById('nextLevelButton');
  const canAdvance = !isRunning && currentLevel + 1 < unlocked && currentLevel < levels.length - 1;
  nextButton.hidden = !canAdvance;
  nextButton.disabled = !canAdvance;
}

document.querySelectorAll('.dir-btn').forEach(button => {
  button.addEventListener('click', () => addCommand(button.dataset.dir));
});

document.querySelectorAll('.extra-btn[data-repeat]').forEach(button => {
  button.addEventListener('click', () => addRepeat(Number(button.dataset.repeat)));
});

document.querySelector('.extra-btn.jump').addEventListener('click', () => addCommand('jump'));
document.getElementById('runButton').addEventListener('click', runProgram);
document.getElementById('clearButton').addEventListener('click', clearProgram);
document.getElementById('nextLevelButton').addEventListener('click', nextLevel);
document.getElementById('resetButton').addEventListener('click', resetLevel);

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

readProgress();
resetLevel();
