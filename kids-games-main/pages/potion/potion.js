document.addEventListener('DOMContentLoaded', () => {
  const slotsElement = document.getElementById('pipeSlots');
  const programBox = document.getElementById('programBox');
  const flowPath = document.getElementById('flowPath');
  const startVessel = document.getElementById('startVessel');
  const endVessel = document.getElementById('endVessel');
  const successMark = document.getElementById('successMark');
  const runButton = document.getElementById('runButton');
  const starsElement = document.getElementById('stars');
  const levelElement = document.getElementById('levelNum');
  const levelSelector = document.getElementById('levelSelector');
  const headerNextButton = document.querySelector('[data-game-next]');
  const feedback = document.getElementById('feedback');
  const feedbackVisual = document.getElementById('feedbackVisual');
  const status = document.getElementById('levelStatus');
  const pipeButtons = document.querySelectorAll('.command-btn[data-pipe]');
  const helpButtons = document.querySelectorAll('.help-q');
  const lessonHelp = document.getElementById('lessonHelp');
  const learningGuide = document.getElementById('learningGuide');

  const pipesInfo = {
    h: { label: 'أنبوب أفقي', code: 'pipeHorizontal()', path: 'M0 50H100' },
    v: { label: 'أنبوب رأسي', code: 'pipeVertical()', path: 'M50 100V0' },
    ld: { label: 'منعطف يسار لأسفل', code: 'pipeLeftDown()', path: 'M0 50H50V100' },
    ul: { label: 'منعطف يسار لأعلى', code: 'pipeLeftUp()', path: 'M0 50H50V0' },
    rd: { label: 'منعطف أعلى لليمين', code: 'pipeRightUp()', path: 'M50 0V50H100' },
    ru: { label: 'منعطف أسفل لليمين', code: 'pipeRightDown()', path: 'M50 100V50H100' }
  };

  const levels = [
    {
      solution: ['h', 'h', 'ul', 'ru', 'h'],
      points: [{ x: 16.7, y: 73.3 }, { x: 33.4, y: 73.3 }, { x: 50.1, y: 73.3 }, { x: 50.1, y: 46.6 }, { x: 66.8, y: 46.6 }],
      start: { x: 8.35, y: 73.3 },
      end: { x: 83.5, y: 46.6 }
    },
    {
      solution: ['h', 'h', 'ld', 'rd', 'h'],
      points: [{ x: 16.7, y: 20 }, { x: 33.4, y: 20 }, { x: 50.1, y: 20 }, { x: 50.1, y: 46.6 }, { x: 66.8, y: 46.6 }],
      start: { x: 8.35, y: 20 },
      end: { x: 83.5, y: 46.6 }
    },
    {
      solution: ['h', 'h', 'ld', 'v', 'v'],
      points: [{ x: 16.7, y: 20 }, { x: 33.4, y: 20 }, { x: 50.1, y: 20 }, { x: 50.1, y: 46.6 }, { x: 50.1, y: 73.3 }],
      start: { x: 8.35, y: 20 },
      end: { x: 50.1, y: 86.5 }
    }
  ];

  const progress = window.KidsGames.readProgress();
  const saved = progress.potion || { currentLevel: 1, unlocked: 1, completed: [] };
  let levelIndex = Math.min(
    Math.max(Number(saved.currentLevel || 1) - 1, 0),
    window.KidsGames.getUnlockedLevel('potion', progress) - 1,
    levels.length - 1
  );
  let placedPipes = Array(5).fill(null);
  let selectedSlot = 0;
  let selectedPipe = null;
  let isBrewing = false;
  starsElement.textContent = saved.stars || 0;

  function announce(message, stateName = '') {
    feedback.textContent = message;
    feedbackVisual.classList.toggle('error', stateName === 'error');
    feedbackVisual.classList.toggle('success', stateName === 'success');
  }

  function selectLevel(index) {
    const unlocked = window.KidsGames.getUnlockedLevel('potion');
    if (isBrewing || index < 0 || index >= unlocked || index >= levels.length) return;
    window.KidsGames.hideLevelVictory();
    levelIndex = index;
    placedPipes = Array(5).fill(null);
    selectedSlot = 0;
    selectedPipe = null;
    successMark.replaceChildren();
    announce('', '');
    renderScene();
  }

  function addPath(svg, className, pathData) {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('class', className);
    svg.appendChild(path);
  }

  function createPipeDrawing(type, extraClass = '') {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    if (extraClass) svg.setAttribute('class', extraClass);

    if (!type || !pipesInfo[type]) {
      svg.classList.add('empty-socket');
      addPath(svg, 'socket-ring', 'M34 50a16 16 0 1 0 32 0a16 16 0 1 0-32 0');
      addPath(svg, 'socket-mark', 'M44 50h12M50 44v12');
      return svg;
    }

    addPath(svg, 'pipe-metal', pipesInfo[type].path);
    addPath(svg, 'pipe-inner', pipesInfo[type].path);
    addPath(svg, 'pipe-highlight', pipesInfo[type].path);
    return svg;
  }

  function createCauldron() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 100 100');
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = '<path d="M17 27h66l-7 48a10 10 0 0 1-10 9H34a10 10 0 0 1-10-9z" fill="#536b5c" stroke="#304b40" stroke-width="6"/><path d="M12 27h76M27 19q23-19 46 0" fill="none" stroke="#304b40" stroke-width="8" stroke-linecap="round"/><path d="M29 51q21-9 42 0l-4 27H33z" fill="#56b990"/><path d="M37 48q13-6 26 0" fill="none" stroke="#c9f6d7" stroke-width="3"/>';
    return svg;
  }

  function updateFlowGuide() {
    flowPath.replaceChildren();
    const level = levels[levelIndex];
    const points = [level.start, ...level.points, level.end];
    for (let index = 0; index < points.length - 1; index += 1) {
      const start = points[index];
      const end = points[index + 1];
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const isHorizontal = start.y === end.y;
      path.setAttribute('d', isHorizontal
        ? `M${start.x} ${start.y}H${end.x}`
        : `M${start.x} ${start.y}V${end.y}`);
      path.setAttribute('class', 'pipe-guide');
      flowPath.appendChild(path);
    }
  }

  function renderScene() {
    const level = levels[levelIndex];
    window.KidsGames.renderLevelSelector('potion', levelSelector, levelIndex + 1, selectLevel, isBrewing);
    levelElement.textContent = String(levelIndex + 1);
    window.KidsGames.renderGameHeader('potion', levelIndex + 1);
    const availablePipes = new Set(level.solution);
    pipeButtons.forEach(button => {
      button.closest('.command-help-control').hidden = !availablePipes.has(button.dataset.pipe);
    });
    slotsElement.replaceChildren();
    updateFlowGuide();

    level.points.forEach((point, index) => {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `pipe-slot${selectedSlot === index ? ' selected' : ''}${placedPipes[index] ? ' installed' : ''}`;
      slot.style.setProperty('--x', `${point.x}%`);
      slot.style.setProperty('--y', `${point.y}%`);
      slot.dataset.slot = String(index);
      slot.setAttribute('aria-label', placedPipes[index]
        ? `الوصلة ${index + 1}: ${pipesInfo[placedPipes[index]].label}. اضغط لتغييرها`
        : `فجوة تركيب الأنبوب ${index + 1}`);
      if (placedPipes[index]) {
        slot.appendChild(createPipeDrawing(placedPipes[index]));
      } else {
        slot.appendChild(createPipeDrawing(null));
      }
      slot.addEventListener('click', () => {
        if (isBrewing) return;
        selectedSlot = index;
        if (selectedPipe) installPipe(selectedPipe, index);
        else renderScene();
      });
      slot.addEventListener('dragover', event => event.preventDefault());
      slot.addEventListener('drop', event => {
        event.preventDefault();
        const type = event.dataTransfer.getData('text/plain');
        if (pipesInfo[type]) installPipe(type, index);
      });
      slotsElement.appendChild(slot);
    });

    startVessel.style.left = `${level.start.x}%`;
    startVessel.style.top = `${level.start.y}%`;
    endVessel.style.left = `${level.end.x}%`;
    endVessel.style.top = `${level.end.y}%`;
    endVessel.replaceChildren(createCauldron());
    renderProgram();
  }

  function renderProgram() {
    programBox.replaceChildren();
    placedPipes.forEach((pipe, index) => {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = `program-slot${pipe ? ' filled' : ''}`;
      slot.setAttribute('aria-label', pipe
        ? `إزالة ${pipesInfo[pipe].label} من الموضع ${index + 1}`
        : `الموضع ${index + 1} فارغ`);
      slot.appendChild(createPipeDrawing(pipe));
      slot.addEventListener('click', () => {
        if (isBrewing || !placedPipes[index]) return;
        placedPipes[index] = null;
        selectedSlot = index;
        selectedPipe = null;
        announce('', '');
        renderScene();
      });
      programBox.appendChild(slot);
    });
    runButton.disabled = isBrewing || placedPipes.some(pipe => pipe === null);
  }

  function installPipe(type, index) {
    if (isBrewing || !pipesInfo[type]) return;
    placedPipes[index] = type;
    selectedPipe = null;
    const nextEmpty = placedPipes.findIndex(pipe => pipe === null);
    selectedSlot = nextEmpty === -1 ? index : nextEmpty;
    announce('', '');
    renderScene();
  }

  function selectPipe(button) {
    if (isBrewing) return;
    const type = button.dataset.pipe;
    const emptySlot = placedPipes.findIndex(pipe => pipe === null);
    if (emptySlot === -1) {
      announce('كل الفجوات مركّب فيها أنبوب. اختر وصلة على الصورة لتغييرها.', 'error');
      return;
    }
    selectedPipe = type;
    const target = placedPipes[selectedSlot] === null ? selectedSlot : emptySlot;
    installPipe(type, target);
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  function setControlsDisabled(disabled) {
    document.querySelectorAll('.pipe-slot, .program-slot, .command-btn, #resetButton, #clearButton')
      .forEach(button => { button.disabled = disabled; });
    runButton.disabled = disabled || placedPipes.some(pipe => pipe === null);
  }

  async function brewPotion() {
    if (isBrewing) return;
    if (placedPipes.some(pipe => pipe === null)) {
      announce('أكمل تركيب الأنابيب أولًا.', 'error');
      return;
    }

    isBrewing = true;
    window.KidsGames.renderLevelSelector('potion', levelSelector, levelIndex + 1, selectLevel, isBrewing);
    setControlsDisabled(true);
    announce('يجري تدفق السائل في الأنابيب.');
    await wait(1350);

    const level = levels[levelIndex];
    const correct = placedPipes.every((pipe, index) => pipe === level.solution[index]);
    isBrewing = false;
    window.KidsGames.renderLevelSelector('potion', levelSelector, levelIndex + 1, selectLevel, isBrewing);
    setControlsDisabled(false);

    if (!correct) {
      announce('توقف السائل عند وصلة غير مناسبة. افحص اتجاه الأنبوب وحاول مرة أخرى.', 'error');
      return;
    }

    const nextLevel = Math.min(levelIndex + 2, levels.length);
    const award = window.KidsGames.completeGameLevel('potion', levelIndex + 1, 3, {
      currentLevel: nextLevel,
      unlocked: Math.max(Number(saved.unlocked) || 1, nextLevel)
    });
    window.KidsGames.renderLevelSelector('potion', levelSelector, levelIndex + 1, selectLevel, isBrewing);
    starsElement.textContent = String(award.gameStars);
    window.KidsGames.showLevelVictory(levelIndex + 1, 3, award.isFirstCompletion);

    flowPath.querySelectorAll('.pipe-guide').forEach(path => path.classList.add('flowing'));
    announce('اكتمل تدفق السائل ووصل إلى المرجل.', 'success');
    status.textContent = `اكتمل المستوى ${levelIndex + 1}.`;
    if (levelIndex < levels.length - 1) {
      isBrewing = true;
      window.KidsGames.renderLevelSelector('potion', levelSelector, levelIndex + 1, selectLevel, isBrewing);
      setControlsDisabled(true);
      await wait(1900);
      levelIndex += 1;
      placedPipes = Array(5).fill(null);
      selectedSlot = 0;
      selectedPipe = null;
      isBrewing = false;
      announce('', '');
      renderScene();
      setControlsDisabled(false);
      return;
    }

    successMark.innerHTML = '<svg viewBox="0 0 48 48"><path d="m9 25 10 10L39 13" /></svg>';
    status.textContent = 'اكتملت جميع مستويات المختبر.';
  }

  function resetLab() {
    if (isBrewing) return;
    window.KidsGames.hideLevelVictory();
    placedPipes = Array(5).fill(null);
    selectedSlot = 0;
    selectedPipe = null;
    successMark.replaceChildren();
    announce('', '');
    renderScene();
  }

  pipeButtons.forEach(button => {
    button.draggable = true;
    button.addEventListener('click', () => selectPipe(button));
    button.addEventListener('dragstart', event => {
      event.dataTransfer.setData('text/plain', button.dataset.pipe);
      event.dataTransfer.effectAllowed = 'copy';
    });
  });

  runButton.addEventListener('click', brewPotion);
  document.getElementById('resetButton').addEventListener('click', resetLab);
  document.getElementById('clearButton').addEventListener('click', resetLab);
  headerNextButton.addEventListener('click', () => {
    const latest = window.KidsGames.readProgress();
    if (isBrewing || levelIndex + 1 >= window.KidsGames.getUnlockedLevel('potion', latest)) return;
    window.KidsGames.hideLevelVictory();
    levelIndex += 1;
    placedPipes = Array(5).fill(null);
    selectedSlot = 0;
    selectedPipe = null;
    renderScene();
  });

  helpButtons.forEach(button => {
    if (button === lessonHelp) return;
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
        positionCodePopup(popup);
        popup.setAttribute('aria-hidden', 'false');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

  function positionCodePopup(popup) {
    popup.style.transitionProperty = 'none';
    popup.style.setProperty('--horizontal-shift', '0px');
    const rect = popup.getBoundingClientRect();
    const shift = rect.left < 8
      ? 8 - rect.left
      : rect.right > window.innerWidth - 8
        ? window.innerWidth - 8 - rect.right
        : 0;
    popup.style.setProperty('--horizontal-shift', `${shift}px`);
    popup.getBoundingClientRect();
    popup.style.removeProperty('transition-property');
  }

  function positionCodePopups() {
    document.querySelectorAll('.code-popup').forEach(positionCodePopup);
  }

  positionCodePopups();
  window.addEventListener('resize', positionCodePopups);

  lessonHelp.addEventListener('click', () => {
    const opening = learningGuide.hidden;
    learningGuide.hidden = !opening;
    lessonHelp.setAttribute('aria-expanded', String(opening));
  });
  document.getElementById('closeGuide').addEventListener('click', () => {
    learningGuide.hidden = true;
    lessonHelp.setAttribute('aria-expanded', 'false');
    lessonHelp.focus();
  });

  renderScene();
});
