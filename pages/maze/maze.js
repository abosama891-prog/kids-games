const boardElement = document.getElementById('board');
const starsElement = document.getElementById('stars');
const levelNumElement = document.getElementById('levelNum');
const titleElement = document.getElementById('title');
const feedbackElement = document.getElementById('feedback');
const programElement = document.getElementById('program');

const levels = [
  {
    title: 'المستوى 1',
    hint: 'اذهب إلى الخضار في أقصر طريق',
    board: ['#####', '#S..#', '#.#.#', '#..G#', '#####']
  },
  {
    title: 'المستوى 2',
    hint: 'بعض الجدران تمنع الطريق',
    board: ['#####', '#S#.#', '#...#', '#.#G#', '#####']
  },
  {
    title: 'المستوى 3',
    hint: 'استخدم القفزة بحكمة',
    board: ['#####', '#S..#', '##.#.', '#..G#', '#####']
  },
  {
    title: 'المستوى 4',
    hint: 'خطة أفضل من التعميم العشوائي',
    board: ['#####', '#S..#', '#.##.', '#...G', '#####']
  },
  {
    title: 'المستوى 5',
    hint: 'الهدف هو العبور بأمان',
    board: ['#####', '#S#.#', '#...#', '#.##G', '#####']
  }
];

let currentLevel = 0;
let stars = 0;
let program = [];
let isRunning = false;
let player = { x: 1, y: 1 };
let goal = { x: 3, y: 3 };

function readProgress() {
  const progress = window.KidsGames.readProgress();
  const saved = progress.maze || { currentLevel: 1, unlocked: 1, completed: [] };
  currentLevel = Math.max(0, Math.min((saved.currentLevel || 1) - 1, levels.length - 1));
  stars = progress.stars || 0;
  starsElement.textContent = stars;
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
      unlocked: Math.max(saved.unlocked || 1, currentLevel + 1)
    }
  };
  window.KidsGames.saveProgress(next);
}

function setFeedback(message, ok = true) {
  feedbackElement.textContent = message;
  feedbackElement.style.color = ok ? '#27ae60' : '#d35400';
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
    setFeedback('🚫');
    return false;
  }

  if (board[nextY][nextX] === '#') {
    setFeedback('🧱');
    return false;
  }

  player = { x: nextX, y: nextY };
  renderBoard();
  if (nextX === goal.x && nextY === goal.y) {
    setFeedback('🎉🥕', true);
    return 'win';
  }
  return true;
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
    if (!program.length) setFeedback('🤔');
    return;
  }

  isRunning = true;
  const original = { ...player };
  setFeedback('');

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
        return;
      }
      await sleep(300);
    }
  }

  isRunning = false;
  if (player.x !== goal.x || player.y !== goal.y) {
    setFeedback('🤔🥕');
  }
}

function executeCommand(command) {
  switch (command) {
    case 'up':
      return movePlayer(0, -1);
    case 'down':
      return movePlayer(0, 1);
    case 'left':
      return movePlayer(-1, 0);
    case 'right':
      return movePlayer(1, 0);
    case 'jump':
      return movePlayer(0, -2);
    default:
      return true;
  }
}

function winLevel() {
  const progress = window.KidsGames.readProgress();
  const maze = progress.maze || { currentLevel: 1, unlocked: 1, completed: [] };
  const nextStars = (progress.stars || 0) + 3;
  const nextCompleted = Array.from(new Set([...(maze.completed || []), currentLevel + 1]));
  const nextProgress = {
    ...progress,
    stars: nextStars,
    maze: {
      ...maze,
      completed: nextCompleted,
      currentLevel: currentLevel + 2,
      unlocked: Math.max(maze.unlocked || 1, currentLevel + 2)
    }
  };
  window.KidsGames.saveProgress(nextProgress);
  starsElement.textContent = nextStars;

  if (currentLevel < levels.length - 1) {
    setTimeout(() => {
      currentLevel += 1;
      resetLevel();
    }, 500);
  } else {
    setFeedback('🏆🎉', true);
  }
}

function resetLevel() {
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
  program = [];
  renderProgram();
  renderBoard();
  setFeedback('');
  saveProgress();
}

function clearProgram() {
  program = [];
  renderProgram();
  setFeedback('');
}

function nextLevel() {
  if (currentLevel < levels.length - 1) {
    currentLevel += 1;
    resetLevel();
  } else {
    setFeedback('🏁');
  }
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
