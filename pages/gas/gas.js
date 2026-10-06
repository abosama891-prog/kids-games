document.addEventListener('DOMContentLoaded', async () => {
  const cloud = await window.KidsGamesCloudReady;
  if (!cloud?.enabled) return;
  const levels = [
    {
      title: '1', concept: 'ترتيب الخطوات', ageBand: 'مبتدئ · مناسب للأعمار 6–8', icon: '🌉', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'ضع سطح الجسر ثم منحدر الصعود ثم أكمل السطح.',
      route: ['deck', 'ramp', 'deck']
    },
    {
      title: '2', concept: 'دعائم الجسر', ageBand: 'مبتدئ · مناسب للأعمار 6–8', icon: '🪵', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'ابنِ المنحدر والسطح، ولا تنسَ وضع دعامة تحت الجسر.',
      route: ['ramp', 'deck', 'support', 'deck', 'ramp']
    },
    {
      title: '3', concept: 'التكرار', ageBand: 'مبتدئ · مناسب للأعمار 6–8', icon: '🔁', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'كرّر وضع ألواح الجسر بدل إضافة كل لوح وحده.',
      route: ['deck', 'deck', 'deck', 'deck', 'deck', 'ramp'],
      requireLoop: true,
      repeatCounts: [5]
    },
    {
      title: '4', concept: 'الشرط إذا', ageBand: 'متوسط · مناسب للأعمار 9–11', icon: '🔀', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'إذا كان النهر هادئًا ابنِ جسرًا؛ وإذا ارتفع استخدم المعدّية.',
      conditionalRoutes: {
        calm: ['deck', 'ramp', 'deck'],
        high: ['ferry']
      },
      requireCondition: true
    },
    {
      title: '5', concept: 'إذا وإلا', ageBand: 'متوسط · مناسب للأعمار 9–11', icon: '⛴️', riverState: 'high', riverLabel: 'النهر مرتفع',
      hint: 'اختبر شرط ارتفاع الماء: اختر المعدّية عند ارتفاعه، وإلا ابنِ جسرًا.',
      conditionalRoutes: {
        calm: ['deck', 'support', 'deck', 'ramp'],
        high: ['ferry']
      },
      requireCondition: true
    },
    {
      title: '6', concept: 'اكتشاف الخطأ', ageBand: 'متوسط · مناسب للأعمار 9–11', icon: '🪛', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'هناك قطعة غير مناسبة في الجسر. اكتشفها واستبدلها.',
      route: ['deck', 'ramp', 'deck', 'deck'],
      starterProgram: [
        { type: 'piece', shape: 'deck', repeat: 1 },
        { type: 'piece', shape: 'ramp', repeat: 1 },
        { type: 'piece', shape: 'deck', repeat: 1 },
        { type: 'piece', shape: 'ramp', repeat: 1 }
      ]
    },
    {
      title: '7', concept: 'شرط مع تكرار', ageBand: 'متقدم · مناسب للأعمار 12–15', icon: '🧠', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'اختر الجسر أو المعدّية حسب حالة النهر، وكرّر خطوات البناء.',
      conditionalRoutes: {
        calm: ['deck', 'deck', 'deck', 'deck', 'deck', 'ramp'],
        high: ['ferry', 'ferry']
      },
      requireLoop: true,
      repeatCounts: [2, 5],
      requireCondition: true
    },
    {
      title: '8', concept: 'كتابة برنامج أقصر', ageBand: 'متقدم · مناسب للأعمار 12–15', icon: '⚡', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'ابنِ الجسر بأمرين فقط: كرّر الألواح ثم أضف منحدرًا.',
      route: ['deck', 'deck', 'deck', 'deck', 'ramp'],
      requireLoop: true,
      repeatCounts: [4],
      maxInstructions: 2
    },
    {
      title: '9', concept: 'تصحيح برنامج متكرر', ageBand: 'متقدم · مناسب للأعمار 12–15', icon: '🛠️', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'أصلح آخر قطعة في الجسر مع الاحتفاظ بالألواح المتكررة.',
      route: ['deck', 'ramp', 'deck', 'deck', 'ramp'],
      requireLoop: true,
      repeatCounts: [2],
      starterProgram: [
        { type: 'piece', shape: 'deck', repeat: 1 },
        { type: 'piece', shape: 'ramp', repeat: 1 },
        { type: 'piece', shape: 'deck', repeat: 2 },
        { type: 'piece', shape: 'deck', repeat: 1 }
      ]
    },
    {
      title: '10', concept: 'مهمة إنقاذ المدينة', ageBand: 'متقدم · مناسب للأعمار 12–15', icon: '🏙️', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'اختر شرط العبور، واستخدم الدعامات والتكرار لإنقاذ المدينة.',
      conditionalRoutes: {
        calm: ['deck', 'deck', 'support', 'ramp', 'deck', 'deck', 'deck'],
        high: ['ferry', 'ferry']
      },
      requireLoop: true,
      repeatCounts: [2, 3],
      requireCondition: true
    }
  ];

  const levelList = document.getElementById('level-list');
  const levelTitle = document.getElementById('level-title');
  const missionTitle = document.getElementById('mission-title');
  const conceptLabel = document.getElementById('concept-label');
  const challengeBand = document.getElementById('challenge-band');
  const levelIcon = document.getElementById('level-icon');
  const levelHint = document.getElementById('level-hint');
  const gasColor = document.getElementById('gas-color');
  const pipeTrack = document.getElementById('pipe-track');
  const cityScene = document.querySelector('.city-scene');
  const scene3D = window.BridgeBuilder3D;
  const programList = document.getElementById('program-list');
  const message = document.getElementById('mascot-message');
  const messageText = message.querySelector('p');
  const runButton = document.getElementById('run-button');
  const resetButton = document.getElementById('reset-button');
  const nextButton = document.getElementById('next-button');
  const headerNextButton = document.getElementById('headerNextButton');
  const ifElseButton = document.getElementById('if-else-button');
  const repeatCount = document.getElementById('repeat-count');
  const homeStation = document.getElementById('home-station');
  const crossingTraveler = document.getElementById('crossing-traveler');
  const cityLights = document.querySelector('.city-lights');
  const branchDiagram = document.getElementById('branch-diagram');
  const upperBranch = document.getElementById('upper-branch');
  const lowerBranch = document.getElementById('lower-branch');
  const starsElement = document.getElementById('stars');
  const levelCount = document.getElementById('level-count');
  let progress = window.KidsGames.readProgress();
  let gasProgress = progress.gas || { currentLevel: 1, unlocked: 1, completed: [] };
  let currentLevel = Math.max(0, Math.min(
    (gasProgress.currentLevel || 1) - 1,
    window.KidsGames.getUnlockedLevel('gas', progress) - 1,
    levels.length - 1
  ));
  let program = [];
  let isRunning = false;
  let isComplete = false;
  let mouseDrag = null;
  let touchDrag = null;
  let suppressPieceClick = false;

  function setMessage(text, state = '') {
    messageText.textContent = text;
    message.className = `mascot-message ${state}`.trim();
  }

  function getExpandedRoute() {
    const pieces = [];
    program.forEach((instruction, tokenIndex) => {
      if (instruction.type !== 'piece') return;
      for (let count = 0; count < instruction.repeat; count += 1) {
        pieces.push({ shape: instruction.shape, tokenIndex, repeat: instruction.repeat });
      }
    });
    return pieces;
  }

  function renderLevels() {
    window.KidsGames.renderLevelSelector('gas', levelList, currentLevel + 1, selectLevel, isRunning);
  }

  function createCrossingPieceGraphic(shape, index) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const baseId = `crossing-${currentLevel}-${index}`;
    svg.setAttribute('viewBox', '0 0 96 64');
    svg.setAttribute('aria-hidden', 'true');
    const graphics = {
      deck: '<ellipse cx="49" cy="51" rx="43" ry="7" fill="#203b3c" opacity=".2"/><path d="m9 27 73 0 10 16-74 0z" fill="url(#' + baseId + '-wood-side)" stroke="#543b2a" stroke-width="2.5" stroke-linejoin="round"/><path d="m18 17 64 0 10 16-74 0z" fill="url(#' + baseId + '-wood)" stroke="#65442d" stroke-width="2" stroke-linejoin="round"/><path d="m18 17 10 0 10 16-10 0zm20 0 10 0 10 16-10 0zm20 0 10 0 10 16-10 0zm20 0 4 0 10 16-4 0z" fill="#e0b477" opacity=".62"/><path d="m28 18 10 14m10-14 10 14m10-14 10 14" stroke="#754c30" stroke-width="1" opacity=".58"/><path d="m14 32 74 0m-64 5 67 0" stroke="#d39b5e" stroke-width="1.5" opacity=".7"/><path d="m20 39 72 0" stroke="#4c5552" stroke-width="2"/><circle cx="24" cy="40" r="1.8" fill="#d9e0dd"/><circle cx="45" cy="40" r="1.8" fill="#d9e0dd"/><circle cx="66" cy="40" r="1.8" fill="#d9e0dd"/><path d="m14 20 3 7m56-7 3 7" stroke="#a7b2b0" stroke-width="2"/>',
      ramp: '<ellipse cx="48" cy="53" rx="43" ry="6" fill="#203b3c" opacity=".2"/><path d="m8 47 28 0 27-28 25 0 0 17-19 0-25 25-36 0z" fill="url(#' + baseId + '-wood-side)" stroke="#543b2a" stroke-width="2.5" stroke-linejoin="round"/><path d="m11 40 26 0 26-27 24 0 0 8-20 0-25 27-31 0z" fill="url(#' + baseId + '-wood)" stroke="#65442d" stroke-width="2" stroke-linejoin="round"/><path d="m16 39 18 0m8-3 10-11m18-9 11 0" stroke="#edc38a" stroke-width="1.6"/><path d="m14 46 25 0 26-27m-17 27 5 7m20-35 2 9" fill="none" stroke="#76502f" stroke-width="2"/><path d="m18 44 7 0m10 0 5 0m17-18 5-5m13-4 7 0" stroke="#b8c0bd" stroke-width="2"/><circle cx="22" cy="44" r="1.5" fill="#e2e5df"/><circle cx="74" cy="17" r="1.5" fill="#e2e5df"/>',
      support: '<ellipse cx="49" cy="58" rx="38" ry="5" fill="#203b3c" opacity=".18"/><path d="m13 20 68 0 9 12-70 0z" fill="url(#' + baseId + '-wood)" stroke="#65442d" stroke-width="2"/><path d="m20 32 14 0-4 19-17 0zm40 0 14 0 8 19-18 0z" fill="url(#' + baseId + '-concrete)" stroke="#626b68" stroke-width="2"/><path d="m15 49 19 0 0 8-22 0zm45 0 20 0 4 8-24 0z" fill="#808987" stroke="#59615f" stroke-width="1.5"/><path d="m18 24 63 0m-51 11-3 13m47-12 5 13" fill="none" stroke="#8a5734" stroke-width="1.5"/><path d="m24 35-5 12m8-12-4 12m42-12 5 12m3-12 5 12" stroke="#aeb7b3" stroke-width="1"/><path d="m11 19 5-4 65 0 9 4" fill="none" stroke="#485c60" stroke-width="2"/><circle cx="23" cy="27" r="1.7" fill="#d9e0dd"/><circle cx="73" cy="27" r="1.7" fill="#d9e0dd"/><path d="M5 59q10-4 20 0t20 0 20 0 20 0" fill="none" stroke="#77b9c5" stroke-width="2.5"/>',
      ferry: '<ellipse cx="49" cy="54" rx="40" ry="6" fill="#173d4a" opacity=".22"/><path d="m7 37 82 0-11 15-49 0z" fill="url(#' + baseId + '-hull)" stroke="#354a52" stroke-width="2.5" stroke-linejoin="round"/><path d="m13 39 68 0m-56 7 48 0" stroke="#edc08e" stroke-width="1.5" opacity=".85"/><path d="m23 32 9-18 35 0 13 18z" fill="url(#' + baseId + '-cabin)" stroke="#5c5546" stroke-width="2"/><path d="m19 32 58 0 6 5-66 0z" fill="#d6c8a8" stroke="#5c5546" stroke-width="1.5"/><path d="m36 18 11 0 0 10-15 0zm17 0 11 0 6 10-17 0z" fill="url(#' + baseId + '-glass)" stroke="#506b70" stroke-width="1.5"/><path d="m38 18 0 9m17-9 5 9" stroke="#e5f7f5" stroke-width="1.5"/><path d="m28 32 0 4m8-4 0 4m27-4 0 4m8-4 0 4" stroke="#364d52" stroke-width="1.5"/><path d="m15 52 5 4m18-4 5 4m19-4 5 4m11-4 4 4" stroke="#d9edf0" stroke-width="1.5"/><circle cx="23" cy="34" r="2.3" fill="#d94c3e" stroke="#fff" stroke-width="1"/>'
    };
    svg.innerHTML = `
      <defs>
        <linearGradient id="${baseId}-wood" x2="0" y2="1"><stop stop-color="#d29a5d"/><stop offset=".45" stop-color="#a96d3e"/><stop offset="1" stop-color="#80502f"/></linearGradient>
        <linearGradient id="${baseId}-wood-side" x2="0" y2="1"><stop stop-color="#a56c40"/><stop offset="1" stop-color="#65432c"/></linearGradient>
        <linearGradient id="${baseId}-concrete" x2="1" y2="0"><stop stop-color="#939b99"/><stop offset=".48" stop-color="#d0d0c7"/><stop offset="1" stop-color="#858f8e"/></linearGradient>
        <linearGradient id="${baseId}-hull" x2="0" y2="1"><stop stop-color="#efab67"/><stop offset=".5" stop-color="#c7603d"/><stop offset="1" stop-color="#763d32"/></linearGradient>
        <linearGradient id="${baseId}-cabin" x2="0" y2="1"><stop stop-color="#f4dfac"/><stop offset="1" stop-color="#c9a66e"/></linearGradient>
        <linearGradient id="${baseId}-glass" x2="0" y2="1"><stop stop-color="#d8f5f1"/><stop offset="1" stop-color="#63a1ae"/></linearGradient>
      </defs>
      ${graphics[shape] || graphics.deck}
    `;
    return svg;
  }

  function renderPipeTrack(leakAt = -1) {
    pipeTrack.replaceChildren();
    const route = getExpandedRoute();
    const level = levels[currentLevel];
    const expectedRoute = level.conditionalRoutes?.[level.riverState] || level.route;
    const slotCount = Math.max(1, route.length, expectedRoute.length);
    const slotWidth = Math.min(160, cityScene.clientWidth * 0.68 / slotCount);
    pipeTrack.style.setProperty('--crossing-slot-width', `${slotWidth}px`);
    Array.from({ length: Math.min(slotCount, 8) }, (_, index) => route[index] || { empty: true }).forEach((piece, index) => {
      const node = document.createElement('span');
      node.className = `pipe-piece${piece.empty ? ' empty' : ''}${piece.repeat > 1 ? ' looped' : ''}${index === leakAt ? ' leaking' : ''}`;
      const shape = piece.shape || 'deck';
      node.appendChild(createCrossingPieceGraphic(shape, index));
      if (piece.repeat > 1) node.dataset.repeat = `×${piece.repeat}`;
      node.style.setProperty('--pipe-color', levels[currentLevel].riverState === 'high' ? '#398ca5' : '#4ba27b');
      const pieceName = { deck: 'سطح جسر', ramp: 'منحدر', support: 'دعامة', ferry: 'معدّية' }[shape];
      node.setAttribute('aria-label', piece.empty ? `خانة بناء فارغة ${index + 1}` : `${pieceName}${piece.repeat > 1 ? `، مكرر ${piece.repeat} مرات` : ''}`);
      pipeTrack.appendChild(node);
    });
    if (route.length > 8) {
      const overflow = document.createElement('span');
      overflow.className = 'pipe-piece';
      overflow.textContent = `+${route.length - 8}`;
      pipeTrack.appendChild(overflow);
    }
    scene3D?.setPlan(
      Array.from({ length: Math.min(slotCount, 8) }, (_, index) => route[index] || { empty: true }),
      level.riverState === 'high'
    );
  }

  function renderProgram() {
    programList.replaceChildren();
    if (!program.length) {
      const empty = document.createElement('span');
      empty.className = 'program-empty';
      empty.textContent = '🧑‍🔧　·　·　·　🏠';
      programList.appendChild(empty);
    }

    program.forEach((instruction, index) => {
      const token = document.createElement('span');
      token.className = `program-token${instruction.type === 'ifElse' ? ' filter-token' : ''}`;
      const icon = document.createElement('span');
      icon.className = 'token-icon';
      icon.setAttribute('aria-hidden', 'true');
      const pieceIcons = { deck: '🪵', ramp: '↗️', support: '🏗️', ferry: '⛴️' };
      icon.textContent = instruction.type === 'ifElse' ? '🔀' : pieceIcons[instruction.shape];
      const label = document.createElement('span');
      label.className = 'visually-hidden';
      label.textContent = instruction.type === 'ifElse'
        ? 'إذا كان النهر هادئًا / وإلا'
        : `${instruction.repeat > 1 ? `كرر ${instruction.repeat} مرات: ` : ''}${{ deck: 'سطح جسر', ramp: 'منحدر', support: 'دعامة', ferry: 'معدّية' }[instruction.shape]}`;
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
    upperBranch.classList.toggle('active', hasCondition && level.riverState === 'calm');
    lowerBranch.classList.toggle('active', hasCondition && level.riverState === 'high');
    ifElseButton.disabled = !level.requireCondition || isRunning || hasCondition;
  }

  function updateToolVisibility(level) {
    const routes = level.conditionalRoutes
      ? Object.values(level.conditionalRoutes)
      : [level.route];
    const availablePieces = new Set(routes.flat());
    document.querySelectorAll('.piece-button[data-piece]').forEach(button => {
      button.closest('.command-control').hidden = !availablePieces.has(button.dataset.piece);
    });
    ifElseButton.closest('.command-control').hidden = !level.requireCondition;
    const repeatCounts = new Set(level.repeatCounts || []);
    document.querySelectorAll('.repeat-button').forEach(button => {
      button.closest('.command-control').hidden =
        !level.requireLoop || !repeatCounts.has(Number(button.dataset.repeat));
    });
  }

  function renderLevel() {
    window.KidsGames.hideLevelVictory();
    const level = levels[currentLevel];
    levelTitle.textContent = String(currentLevel + 1);
    missionTitle.textContent = '🧑‍🔧 → 🌉 → 🏠';
    conceptLabel.textContent = level.concept;
    challengeBand.textContent = level.ageBand;
    levelIcon.textContent = level.icon;
    levelHint.textContent = level.hint;
    gasColor.className = `gas-color ${level.riverState}`;
    gasColor.querySelector('span').textContent = level.riverLabel;
    levelCount.textContent = String(currentLevel + 1);
    starsElement.textContent = gasProgress.stars || 0;
    window.KidsGames.renderGameHeader('gas', currentLevel + 1);
    updateToolVisibility(level);
    repeatCount.value = '1';
    document.querySelectorAll('.repeat-button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    program = level.starterProgram ? level.starterProgram.map(item => ({ ...item })) : [];
    isComplete = false;
    homeStation.classList.remove('lit');
    cityScene.classList.remove('is-building');
    scene3D?.setBuilding(false);
    scene3D?.resetCrossing();
    crossingTraveler.classList.remove('crossing', 'arrived');
    cityLights.classList.remove('lit');
    nextButton.hidden = true;
    runButton.hidden = false;
    runButton.disabled = false;
    resetButton.disabled = false;
    document.querySelectorAll('.piece-button, .repeat-button').forEach(button => { button.disabled = false; });
    repeatCount.disabled = false;
    setMessage(`🧑‍🔧　${level.concept}　➜　🏠`);
    renderLevels();
    renderProgram();
  }

  function selectLevel(index) {
    if (index + 1 > window.KidsGames.getUnlockedLevel('gas') || isRunning) return;
    currentLevel = index;
    renderLevel();
  }

  function addCrossingPiece(shape) {
    if (isRunning || isComplete) return;
    program.push({ type: 'piece', shape, repeat: Number(repeatCount.value) || 1 });
    repeatCount.value = '1';
    document.querySelectorAll('.repeat-button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    renderProgram();
  }

  function createPieceDrag(button, shape, pointerId, clientX, clientY) {
    return { button, shape, pointerId, startX: clientX, startY: clientY, moved: false, ghost: null };
  }

  function movePieceDrag(drag, event) {
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 8) {
      drag.moved = true;
      drag.ghost = drag.button.cloneNode(true);
      drag.ghost.classList.add('piece-drag-ghost');
      document.body.appendChild(drag.ghost);
    }
    if (!drag.moved) return;
    event.preventDefault();
    drag.ghost.style.left = `${event.clientX}px`;
    drag.ghost.style.top = `${event.clientY}px`;
    pipeTrack.classList.toggle('drop-target', Boolean(document.elementFromPoint(event.clientX, event.clientY)?.closest('#pipe-track')));
  }

  function finishPieceDrag(drag, event) {
    if (!drag.moved) return;
    event.preventDefault();
    drag.ghost.remove();
    pipeTrack.classList.remove('drop-target');
    suppressPieceClick = true;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (target?.closest('#pipe-track')) addCrossingPiece(drag.shape);
    else setMessage('أفلت القطعة داخل خانات الجسر فوق النهر.', 'error');
    window.setTimeout(() => { suppressPieceClick = false; }, 0);
  }

  function addConditional() {
    if (isRunning || isComplete || !levels[currentLevel].requireCondition) return;
    if (program.some(instruction => instruction.type === 'ifElse')) return;
    program.unshift({ type: 'ifElse' });
    renderProgram();
  }

  function firstErrorIndex(route) {
    const level = levels[currentLevel];
    const expected = level.conditionalRoutes?.[level.riverState] || level.route;
    const length = Math.min(route.length, expected.length);
    for (let index = 0; index < length; index += 1) {
      if (route[index].shape !== expected[index]) return index;
    }
    return route.length === expected.length ? -1 : length;
  }

  function animateLeaking(errorIndex, text) {
    renderPipeTrack(errorIndex);
    cityScene.classList.remove('is-building');
    scene3D?.setBuilding(false);
    scene3D?.resetCrossing();
    setMessage(`🧑‍🔧 ${text}`, 'error');
    isRunning = false;
    renderLevels();
    runButton.disabled = false;
    resetButton.disabled = false;
    document.querySelectorAll('.piece-button, .repeat-button').forEach(button => { button.disabled = false; });
    repeatCount.disabled = false;
  }

  function saveWin() {
    const nextUnlocked = Math.max(window.KidsGames.getUnlockedLevel('gas'), Math.min(levels.length, currentLevel + 2));
    const result = window.KidsGames.completeGameLevel('gas', currentLevel + 1, 3, {
      currentLevel: Math.min(levels.length, currentLevel + 2),
      unlocked: nextUnlocked
    });
    progress = result.progress;
    gasProgress = result.gameProgress;
    window.KidsGames.saveProgress(progress);
    starsElement.textContent = gasProgress.stars;
    window.KidsGames.renderGameHeader('gas', currentLevel + 1);
    renderLevels();
    return result.isFirstCompletion;
  }

  function finishLevel() {
    isComplete = true;
    cityScene.classList.remove('is-building');
    homeStation.classList.add('lit');
    cityLights.classList.add('lit');
    const firstCompletion = saveWin();
    setMessage(firstCompletion ? '🎉 🏙️ ✨　⭐+3' : '🎉 🏙️ ✨', 'success');
    window.KidsGames.showLevelVictory(currentLevel + 1, 3, firstCompletion);
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
    if (level.requireLoop && !program.some(instruction => instruction.type === 'piece' && instruction.repeat > 1)) {
      setMessage('اختر زر التكرار قبل إضافة قطعة بناء.', 'error');
      return;
    }
    if (level.requireCondition && !program.some(instruction => instruction.type === 'ifElse')) {
      setMessage('أضف شرط النهر ليختار بين بناء الجسر واستخدام المعدّية.', 'error');
      return;
    }
    if (level.maxInstructions && program.length > level.maxInstructions) {
      setMessage(`التحدي يحتاج ${level.maxInstructions} أوامر فقط. استخدم التكرار لاختصار البرنامج.`, 'error');
      return;
    }

    isRunning = true;
    renderLevels();
    cityScene.classList.add('is-building');
    scene3D?.setBuilding(true);
    scene3D?.resetCrossing();
    runButton.disabled = true;
    resetButton.disabled = true;
    document.querySelectorAll('.piece-button, .repeat-button').forEach(button => { button.disabled = true; });
    repeatCount.disabled = true;
    homeStation.classList.remove('lit');
    crossingTraveler.classList.remove('crossing', 'arrived');
    cityLights.classList.remove('lit');
    setMessage('بدأ المهندس بتركيب القطع وفحص ثباتها...');
    renderPipeTrack();

    const expectedRoute = level.conditionalRoutes?.[level.riverState] || level.route;
    for (let index = 0; index < Math.max(route.length, expectedRoute.length); index += 1) {
      await new Promise(resolve => setTimeout(resolve, 340));
      if (!route[index] || route[index].shape !== expectedRoute[index]) {
        animateLeaking(index, `المعبر غير مكتمل عند القطعة ${index + 1}. راجع ترتيبها أو عدد التكرار.`);
        return;
      }
      const piece = pipeTrack.children[index];
      piece?.classList.add('installing');
      scene3D?.installPiece(index);
      await new Promise(resolve => setTimeout(resolve, 220));
      piece?.classList.remove('installing');
      piece?.classList.add('installed', 'flowing');
    }

    setMessage('اكتمل التركيب وفحص السلامة. تعبر الشاحنة الآن إلى الهدف...');
    scene3D?.setBuilding(false);
    scene3D?.animateCrossing();
    crossingTraveler.classList.add('crossing');
    await new Promise(resolve => setTimeout(resolve, 1700));
    crossingTraveler.classList.add('arrived');
    isRunning = false;
    renderLevels();
    finishLevel();
  }

  document.querySelectorAll('[data-piece]').forEach(button => {
    button.draggable = false;
    button.addEventListener('click', () => {
      if (suppressPieceClick) {
        suppressPieceClick = false;
        return;
      }
      addCrossingPiece(button.dataset.piece);
    });
    button.addEventListener('mousedown', event => {
      if (event.button !== 0 || isRunning || isComplete) return;
      mouseDrag = createPieceDrag(button, button.dataset.piece, null, event.clientX, event.clientY);
    });
    button.addEventListener('pointerdown', event => {
      if (event.pointerType === 'mouse' || isRunning || isComplete) return;
      touchDrag = createPieceDrag(button, button.dataset.piece, event.pointerId, event.clientX, event.clientY);
    });
  });

  document.addEventListener('mousemove', event => {
    if (mouseDrag) movePieceDrag(mouseDrag, event);
  });
  document.addEventListener('mouseup', event => {
    if (!mouseDrag) return;
    finishPieceDrag(mouseDrag, event);
    mouseDrag = null;
  });
  document.addEventListener('pointermove', event => {
    if (touchDrag && touchDrag.pointerId === event.pointerId) movePieceDrag(touchDrag, event);
  }, { passive: false });
  document.addEventListener('pointerup', event => {
    if (!touchDrag || touchDrag.pointerId !== event.pointerId) return;
    finishPieceDrag(touchDrag, event);
    touchDrag = null;
  });
  document.addEventListener('pointercancel', event => {
    if (!touchDrag || touchDrag.pointerId !== event.pointerId) return;
    touchDrag.ghost?.remove();
    touchDrag = null;
    pipeTrack.classList.remove('drop-target');
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
    if (currentLevel < levels.length - 1 && currentLevel + 2 <= window.KidsGames.getUnlockedLevel('gas')) selectLevel(currentLevel + 1);
  });
  headerNextButton.addEventListener('click', () => nextButton.click());

  renderLevel();
});