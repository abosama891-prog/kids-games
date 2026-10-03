document.addEventListener('DOMContentLoaded', () => {
  const levels = [
    {
      title: '1', concept: 'التسلسل', icon: '🧩', color: 'blue', colorName: 'أزرق',
      hint: '🏭 → ━ → ┗ → ━ → 🏠',
      route: ['straight', 'elbow', 'straight']
    },
    {
      title: '2', concept: 'ترتيب الأوامر', icon: '🧭', color: 'green', colorName: 'أخضر',
      hint: '🏭 → ┗ → ━ → ━ → ┗ → 🏠',
      route: ['elbow', 'straight', 'straight', 'elbow']
    },
    {
      title: '3', concept: 'الحلقات التكرارية', icon: '🔁', color: 'blue', colorName: 'أزرق',
      hint: '🔁 ×5　━　→　🏠',
      route: ['straight', 'straight', 'straight', 'straight', 'straight', 'elbow'],
      requireLoop: true
    },
    {
      title: '4', concept: 'الشرط If / Else', icon: '🔀', color: 'red', colorName: 'أحمر',
      hint: '🔴 ? ⬆️　:　⬇️',
      route: ['straight', 'elbow', 'straight'],
      requireCondition: true
    },
    {
      title: '5', concept: 'وإلا Else', icon: '🔀', color: 'blue', colorName: 'أزرق',
      hint: '🔵 ? ⬆️　:　⬇️',
      route: ['elbow', 'straight', 'straight', 'straight'],
      requireCondition: true
    },
    {
      title: '6', concept: 'اكتشاف الأخطاء', icon: '🪛', color: 'red', colorName: 'أحمر',
      hint: '💧　🔍　🛠️',
      route: ['straight', 'elbow', 'straight', 'straight'],
      requireLoop: true,
      requireCondition: true,
      starterProgram: [
        { type: 'pipe', shape: 'straight', repeat: 1 },
        { type: 'pipe', shape: 'straight', repeat: 1 },
        { type: 'pipe', shape: 'straight', repeat: 2 },
        { type: 'ifElse' }
      ]
    }
  ];

  const levelList = document.getElementById('level-list');
  const levelTitle = document.getElementById('level-title');
  const missionTitle = document.getElementById('mission-title');
  const conceptLabel = document.getElementById('concept-label');
  const levelIcon = document.getElementById('level-icon');
  const levelHint = document.getElementById('level-hint');
  const gasColor = document.getElementById('gas-color');
  const pipeTrack = document.getElementById('pipe-track');
  const programList = document.getElementById('program-list');
  const message = document.getElementById('mascot-message');
  const messageText = message.querySelector('p');
  const runButton = document.getElementById('run-button');
  const resetButton = document.getElementById('reset-button');
  const nextButton = document.getElementById('next-button');
  const ifElseButton = document.getElementById('if-else-button');
  const repeatCount = document.getElementById('repeat-count');
  const homeStation = document.getElementById('home-station');
  const cityLights = document.querySelector('.city-lights');
  const branchDiagram = document.getElementById('branch-diagram');
  const upperBranch = document.getElementById('upper-branch');
  const lowerBranch = document.getElementById('lower-branch');
  const starsElement = document.getElementById('stars');
  const levelCount = document.getElementById('level-count');
  let progress = window.KidsGames.readProgress();
  let gasProgress = progress.gas || { currentLevel: 1, unlocked: 1, completed: [] };
  let currentLevel = Math.max(0, Math.min((gasProgress.currentLevel || 1) - 1, levels.length - 1));
  let program = [];
  let isRunning = false;
  let isComplete = false;

  function setMessage(text, state = '') {
    messageText.textContent = text;
    message.className = `mascot-message ${state}`.trim();
  }

  function getExpandedRoute() {
    const pieces = [];
    program.forEach((instruction, tokenIndex) => {
      if (instruction.type !== 'pipe') return;
      for (let count = 0; count < instruction.repeat; count += 1) {
        pieces.push({ shape: instruction.shape, tokenIndex, repeat: instruction.repeat });
      }
    });
    return pieces;
  }

  function renderLevels() {
    levelList.replaceChildren();
    levels.forEach((level, index) => {
      const button = document.createElement('button');
      button.className = 'level-tab';
      button.type = 'button';
      button.textContent = String(index + 1);
      button.setAttribute('aria-label', `المستوى ${index + 1}`);
      button.disabled = index + 1 > gasProgress.unlocked;
      if (index === currentLevel) button.setAttribute('aria-current', 'step');
      button.addEventListener('click', () => selectLevel(index));
      levelList.appendChild(button);
    });
  }

  function createPipeGraphic(shape, color, id) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const baseId = `pipe-${currentLevel}-${id}`;
    const path = shape === 'straight' ? 'M 8 32 H 88' : 'M 22 7 V 32 Q 22 48 38 48 H 89';
    svg.setAttribute('viewBox', '0 0 96 64');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `
      <defs>
        <linearGradient id="${baseId}-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#f7fbfc"/><stop offset=".24" stop-color="#c8d2d6"/>
          <stop offset=".58" stop-color="#8e9ba1"/><stop offset=".82" stop-color="#dbe3e6"/>
          <stop offset="1" stop-color="#718087"/>
        </linearGradient>
        <linearGradient id="${baseId}-collar" x1="0" y1="0" x2="1" y2="0">
          <stop stop-color="#66747a"/><stop offset=".35" stop-color="#eef3f4"/>
          <stop offset=".65" stop-color="#a4b0b5"/><stop offset="1" stop-color="#536168"/>
        </linearGradient>
      </defs>
      <path d="${path}" fill="none" stroke="#526168" stroke-width="29" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${path}" fill="none" stroke="url(#${baseId}-metal)" stroke-width="23" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="${path}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".9"/>
      <path d="${shape === 'straight' ? 'M 11 23 H 85' : 'M 17 10 V 32 Q 17 44 35 44 H 84'}" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" opacity=".82"/>
      ${shape === 'straight'
        ? `<rect x="23" y="18" width="8" height="28" rx="2" fill="url(#${baseId}-collar)"/><rect x="65" y="18" width="8" height="28" rx="2" fill="url(#${baseId}-collar)"/>`
        : `<rect x="14" y="18" width="16" height="8" rx="2" fill="url(#${baseId}-collar)"/><rect x="56" y="38" width="8" height="16" rx="2" fill="url(#${baseId}-collar)"/>`}
      <circle cx="${shape === 'straight' ? '8' : '22'}" cy="${shape === 'straight' ? '32' : '7'}" r="4" fill="#e8eef0" stroke="#65747a" stroke-width="2"/>
      <circle cx="89" cy="${shape === 'straight' ? '32' : '48'}" r="4" fill="#e8eef0" stroke="#65747a" stroke-width="2"/>
    `;
    return svg;
  }

  function renderPipeTrack(leakAt = -1) {
    pipeTrack.replaceChildren();
    const route = getExpandedRoute();
    const visiblePieces = route.length ? route : [{ empty: true }];
    const gasColors = { red: '#e2534d', blue: '#369bd2', green: '#3aa675' };
    visiblePieces.slice(0, 8).forEach((piece, index) => {
      const node = document.createElement('span');
      node.className = `pipe-piece${piece.empty ? ' empty' : ''}${piece.repeat > 1 ? ' looped' : ''}${index === leakAt ? ' leaking' : ''}`;
      node.appendChild(createPipeGraphic(piece.shape || 'straight', piece.empty ? '#a9b5b9' : gasColors[levels[currentLevel].color], index));
      if (piece.repeat > 1) node.dataset.repeat = `×${piece.repeat}`;
      node.style.setProperty('--pipe-color', `var(--gas-${levels[currentLevel].color})`);
      node.setAttribute('aria-label', piece.empty ? 'أنبوب فارغ' : `${piece.shape === 'straight' ? 'مستقيم' : 'منحني'}${piece.repeat > 1 ? `، مكرر ${piece.repeat} مرات` : ''}`);
      pipeTrack.appendChild(node);
    });
    if (route.length > 8) {
      const overflow = document.createElement('span');
      overflow.className = 'pipe-piece';
      overflow.textContent = `+${route.length - 8}`;
      pipeTrack.appendChild(overflow);
    }
  }

  function renderProgram() {
    programList.replaceChildren();
    if (!program.length) {
      const empty = document.createElement('span');
      empty.className = 'program-empty';
      empty.textContent = '🏭　·　·　·　🏠';
      programList.appendChild(empty);
    }

    program.forEach((instruction, index) => {
      const token = document.createElement('span');
      token.className = `program-token${instruction.type === 'ifElse' ? ' filter-token' : ''}`;
      const icon = document.createElement('span');
      icon.className = 'token-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = instruction.type === 'ifElse' ? '🔀' : instruction.shape === 'straight' ? '━' : '┗';
      const label = document.createElement('span');
      label.className = 'visually-hidden';
      label.textContent = instruction.type === 'ifElse'
        ? 'إذا أحمر / وإلا'
        : `${instruction.repeat > 1 ? `كرر ${instruction.repeat} مرات: ` : ''}${instruction.shape === 'straight' ? 'مستقيم' : 'منحني'}`;
      const remove = document.createElement('button');
      remove.className = 'remove-token';
      remove.type = 'button';
      remove.setAttribute('aria-label', `حذف الأمر ${index + 1}`);
      remove.textContent = '×';
      remove.addEventListener('click', () => {
        if (isRunning) return;
        program.splice(index, 1);
        renderProgram();
      });
      token.append(icon, label, remove);
      programList.appendChild(token);
    });
    renderPipeTrack();
    updateBranch();
  }

  function updateBranch() {
    const level = levels[currentLevel];
    const hasCondition = program.some(instruction => instruction.type === 'ifElse');
    branchDiagram.hidden = !level.requireCondition;
    upperBranch.classList.toggle('active', hasCondition && level.color === 'red');
    lowerBranch.classList.toggle('active', hasCondition && level.color !== 'red');
    ifElseButton.disabled = !level.requireCondition || isRunning || hasCondition;
  }

  function renderLevel() {
    const level = levels[currentLevel];
    levelTitle.textContent = String(currentLevel + 1);
    missionTitle.textContent = '🏭 → 🏠';
    conceptLabel.textContent = level.concept;
    levelIcon.textContent = level.icon;
    levelHint.textContent = level.hint;
    gasColor.className = `gas-color ${level.color}`;
    gasColor.querySelector('span').textContent = `غاز ${level.colorName}`;
    levelCount.textContent = `${currentLevel + 1} / ${levels.length}`;
    starsElement.textContent = progress.stars || 0;
    repeatCount.value = '1';
    document.querySelectorAll('.repeat-button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    program = level.starterProgram ? level.starterProgram.map(item => ({ ...item })) : [];
    isComplete = false;
    homeStation.classList.remove('lit');
    cityLights.classList.remove('lit');
    nextButton.hidden = true;
    runButton.hidden = false;
    runButton.disabled = false;
    resetButton.disabled = false;
    document.querySelectorAll('.piece-button, .repeat-button').forEach(button => { button.disabled = false; });
    repeatCount.disabled = false;
    setMessage(level.concept === 'اكتشاف الأخطاء' ? '🧑‍🔧💧🔍' : '🏭 ➜ 🏠');
    renderLevels();
    renderProgram();
  }

  function selectLevel(index) {
    if (index + 1 > gasProgress.unlocked || isRunning) return;
    currentLevel = index;
    renderLevel();
  }

  function addPipe(shape) {
    if (isRunning || isComplete) return;
    program.push({ type: 'pipe', shape, repeat: Number(repeatCount.value) || 1 });
    repeatCount.value = '1';
    document.querySelectorAll('.repeat-button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    renderProgram();
  }

  function addConditional() {
    if (isRunning || isComplete || !levels[currentLevel].requireCondition) return;
    if (program.some(instruction => instruction.type === 'ifElse')) return;
    program.push({ type: 'ifElse' });
    renderProgram();
  }

  function firstErrorIndex(route) {
    const expected = levels[currentLevel].route;
    const length = Math.min(route.length, expected.length);
    for (let index = 0; index < length; index += 1) {
      if (route[index].shape !== expected[index]) return index;
    }
    return route.length === expected.length ? -1 : length;
  }

  function animateLeaking(errorIndex, text) {
    renderPipeTrack(errorIndex);
    setMessage(`🧑‍🔧 ${text}`, 'error');
    isRunning = false;
    runButton.disabled = false;
    resetButton.disabled = false;
    document.querySelectorAll('.piece-button, .repeat-button').forEach(button => { button.disabled = false; });
    repeatCount.disabled = false;
  }

  function saveWin() {
    const wasCompleted = gasProgress.completed.includes(currentLevel + 1);
    const completed = [...new Set([...gasProgress.completed, currentLevel + 1])].sort((a, b) => a - b);
    const nextUnlocked = Math.max(gasProgress.unlocked || 1, Math.min(levels.length, currentLevel + 2));
    gasProgress = {
      ...gasProgress,
      completed,
      currentLevel: Math.min(levels.length, currentLevel + 2),
      unlocked: nextUnlocked
    };
    progress = {
      ...progress,
      stars: (Number(progress.stars) || 0) + (wasCompleted ? 0 : 3),
      gas: gasProgress
    };
    window.KidsGames.saveProgress(progress);
    starsElement.textContent = progress.stars;
    renderLevels();
  }

  function finishLevel() {
    isComplete = true;
    homeStation.classList.add('lit');
    cityLights.classList.add('lit');
    saveWin();
    setMessage('🎉 🏙️ ✨　⭐+3', 'success');
    runButton.hidden = true;
    nextButton.hidden = currentLevel >= levels.length - 1;
    document.querySelectorAll('.piece-button, .repeat-button').forEach(button => { button.disabled = true; });
    repeatCount.disabled = true;
  }

  async function runProgram() {
    if (isRunning || isComplete) return;
    if (!program.length) {
      setMessage('🧑‍🔧 ➕ 🧩', 'error');
      return;
    }

    const level = levels[currentLevel];
    const route = getExpandedRoute();
    if (level.requireLoop && !program.some(instruction => instruction.type === 'pipe' && instruction.repeat > 1)) {
      setMessage('🔁 ×2　+', 'error');
      return;
    }
    if (level.requireCondition && !program.some(instruction => instruction.type === 'ifElse')) {
      setMessage('🔀 🔴⬆️　🔵⬇️', 'error');
      return;
    }

    isRunning = true;
    runButton.disabled = true;
    resetButton.disabled = true;
    document.querySelectorAll('.piece-button, .repeat-button').forEach(button => { button.disabled = true; });
    repeatCount.disabled = true;
    homeStation.classList.remove('lit');
    cityLights.classList.remove('lit');
    setMessage('🧑‍🔧　💨 ➜ 🏠');
    renderPipeTrack();

    for (let index = 0; index < Math.max(route.length, level.route.length); index += 1) {
      await new Promise(resolve => setTimeout(resolve, 260));
      if (!route[index] || route[index].shape !== level.route[index]) {
        animateLeaking(index, `💧　#${index + 1}　🔧`);
        return;
      }
      pipeTrack.children[index]?.classList.add('flowing');
    }

    await new Promise(resolve => setTimeout(resolve, 350));
    isRunning = false;
    finishLevel();
  }

  document.querySelectorAll('[data-piece]').forEach(button => {
    button.addEventListener('click', () => addPipe(button.dataset.piece));
  });

  ifElseButton.addEventListener('click', addConditional);
  document.querySelectorAll('.repeat-button').forEach(button => {
    button.addEventListener('click', () => {
      if (isRunning || isComplete) return;
      repeatCount.value = button.dataset.repeat;
      document.querySelectorAll('.repeat-button').forEach(item => {
        item.setAttribute('aria-pressed', String(item === button));
      });
    });
  });

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
        const buttonBounds = button.getBoundingClientRect();
        popup.style.setProperty('--code-popup-top', `${Math.min(buttonBounds.bottom + 6, window.innerHeight - 60)}px`);
        popup.classList.add('show');
        popup.setAttribute('aria-hidden', 'false');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  runButton.addEventListener('click', runProgram);
  document.getElementById('clear-button').addEventListener('click', () => {
    if (isRunning || isComplete) return;
    program = [];
    renderProgram();
  });
  resetButton.addEventListener('click', renderLevel);
  nextButton.addEventListener('click', () => {
    if (currentLevel < levels.length - 1 && currentLevel + 2 <= gasProgress.unlocked) selectLevel(currentLevel + 1);
  });

  renderLevel();
});