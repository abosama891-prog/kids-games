document.addEventListener('DOMContentLoaded', () => {
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
      requireLoop: true
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
      requireCondition: true
    },
    {
      title: '8', concept: 'كتابة برنامج أقصر', ageBand: 'متقدم · مناسب للأعمار 12–15', icon: '⚡', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'ابنِ الجسر بأمرين فقط: كرّر الألواح ثم أضف منحدرًا.',
      route: ['deck', 'deck', 'deck', 'deck', 'ramp'],
      requireLoop: true,
      maxInstructions: 2
    },
    {
      title: '9', concept: 'تصحيح برنامج متكرر', ageBand: 'متقدم · مناسب للأعمار 12–15', icon: '🛠️', riverState: 'calm', riverLabel: 'النهر هادئ',
      hint: 'أصلح آخر قطعة في الجسر مع الاحتفاظ بالألواح المتكررة.',
      route: ['deck', 'ramp', 'deck', 'deck', 'ramp'],
      requireLoop: true,
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
    levelList.replaceChildren();
    levels.forEach((level, index) => {
      const button = document.createElement('button');
      button.className = 'level-tab';
      button.type = 'button';
      button.textContent = String(index + 1);
      button.setAttribute('aria-label', `المستوى ${index + 1}: ${level.concept}`);
      button.disabled = index + 1 > window.KidsGames.getUnlockedLevel('gas');
      if (index === currentLevel) button.setAttribute('aria-current', 'step');
      button.addEventListener('click', () => selectLevel(index));
      levelList.appendChild(button);
    });
  }

  function createCrossingPieceGraphic(shape, index) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const baseId = `crossing-${currentLevel}-${index}`;
    svg.setAttribute('viewBox', '0 0 96 64');
    svg.setAttribute('aria-hidden', 'true');
    const graphics = {
      deck: '<path d="M5 29h86v20H5z" fill="url(#' + baseId + '-wood-side)" stroke="#543b2a" stroke-width="3"/><path d="M7 24h82v8H7z" fill="url(#' + baseId + '-wood)" stroke="#6d492e" stroke-width="2"/><path d="M12 25v6m12-6v6m12-6v6m12-6v6m12-6v6m12-6v6m12-6v6" stroke="#f0c98e" stroke-width="1.5" opacity=".75"/><path d="M12 37h72M12 43h72" stroke="#d4a16c" stroke-width="1.5" opacity=".72"/><path d="M17 24v-5m62 5v-5" stroke="#485960" stroke-width="3"/><circle cx="17" cy="19" r="2" fill="#d9e0dd"/><circle cx="79" cy="19" r="2" fill="#d9e0dd"/>',
      ramp: '<path d="M5 49h31l27-29h28v18H70L43 57H5z" fill="url(#' + baseId + '-wood-side)" stroke="#543b2a" stroke-width="3" stroke-linejoin="round"/><path d="M8 44h29l26-28h25v7H67L40 51H8z" fill="url(#' + baseId + '-wood)" stroke="#6d492e" stroke-width="2" stroke-linejoin="round"/><path d="m15 43 20 0m26-22h18M45 44l14-15" stroke="#edc38a" stroke-width="1.5"/><path d="M22 51 30 43m20-1 8-9m13-15h8" stroke="#59402d" stroke-width="2"/>',
      support: '<path d="M8 23h80v10H8z" fill="url(#' + baseId + '-wood)" stroke="#5a3e2b" stroke-width="2"/><path d="M33 32h30l7 27H26z" fill="url(#' + baseId + '-concrete)" stroke="#59666a" stroke-width="3"/><path d="M20 59h56M38 36l-5 18m23-18 5 18" stroke="#899598" stroke-width="2"/><path d="M5 60q12-6 24 0t24 0 24 0 19 0" fill="none" stroke="#77b9c5" stroke-width="3"/><path d="M14 26v4m13-4v4m42-4v4m13-4v4" stroke="#edc38a" stroke-width="1.5"/>',
      ferry: '<path d="M9 38h78L75 53H24z" fill="url(#' + baseId + '-hull)" stroke="#354a52" stroke-width="3" stroke-linejoin="round"/><path d="M19 43h57M29 49h40" stroke="#f2b985" stroke-width="1.5" opacity=".75"/><path d="M32 18h35v20H32z" fill="url(#' + baseId + '-cabin)" stroke="#5c5546" stroke-width="3"/><path d="M27 17h45v5H27z" fill="#ded5bd" stroke="#5c5546" stroke-width="2"/><path d="M37 23h10v9H37zm15 0h10v9H52z" fill="#9ed4de" stroke="#506b70" stroke-width="1.5"/><path d="M5 58q11-7 22 0t22 0 22 0 22 0" fill="none" stroke="#63a9bd" stroke-width="3"/><path d="m16 61 8-2m31 2 9-2m17 2 7-2" stroke="#d3edf0" stroke-width="1.5"/>'
    };
    svg.innerHTML = `
      <defs>
        <linearGradient id="${baseId}-wood" x2="0" y2="1"><stop stop-color="#d29a5d"/><stop offset=".45" stop-color="#a96d3e"/><stop offset="1" stop-color="#80502f"/></linearGradient>
        <linearGradient id="${baseId}-wood-side" x2="0" y2="1"><stop stop-color="#a56c40"/><stop offset="1" stop-color="#65432c"/></linearGradient>
        <linearGradient id="${baseId}-concrete" x2="1" y2="0"><stop stop-color="#939b99"/><stop offset=".48" stop-color="#d0d0c7"/><stop offset="1" stop-color="#858f8e"/></linearGradient>
        <linearGradient id="${baseId}-hull" x2="0" y2="1"><stop stop-color="#efab67"/><stop offset=".5" stop-color="#c7603d"/><stop offset="1" stop-color="#763d32"/></linearGradient>
        <linearGradient id="${baseId}-cabin" x2="0" y2="1"><stop stop-color="#f4dfac"/><stop offset="1" stop-color="#c9a66e"/></linearGradient>
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
    const slotWidth = Math.min(160, cityScene.clientWidth * 0.58 / slotCount);
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

  function renderLevel() {
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
    repeatCount.value = '1';
    document.querySelectorAll('.repeat-button').forEach(button => button.setAttribute('aria-pressed', 'false'));
    program = level.starterProgram ? level.starterProgram.map(item => ({ ...item })) : [];
    isComplete = false;
    homeStation.classList.remove('lit');
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
    setMessage(`🧑‍🔧 ${text}`, 'error');
    isRunning = false;
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
    homeStation.classList.add('lit');
    cityLights.classList.add('lit');
    const firstCompletion = saveWin();
    setMessage(firstCompletion ? '🎉 🏙️ ✨　⭐+3' : '🎉 🏙️ ✨', 'success');
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
    runButton.disabled = true;
    resetButton.disabled = true;
    document.querySelectorAll('.piece-button, .repeat-button').forEach(button => { button.disabled = true; });
    repeatCount.disabled = true;
    homeStation.classList.remove('lit');
    crossingTraveler.classList.remove('crossing', 'arrived');
    cityLights.classList.remove('lit');
    setMessage('يجري اختبار الجسر والمعدّية...');
    renderPipeTrack();

    const expectedRoute = level.conditionalRoutes?.[level.riverState] || level.route;
    for (let index = 0; index < Math.max(route.length, expectedRoute.length); index += 1) {
      await new Promise(resolve => setTimeout(resolve, 260));
      if (!route[index] || route[index].shape !== expectedRoute[index]) {
        animateLeaking(index, `المعبر غير مكتمل عند القطعة ${index + 1}. راجع ترتيبها أو عدد التكرار.`);
        return;
      }
      pipeTrack.children[index]?.classList.add('flowing');
    }

    setMessage('الجسر جاهز! تعبر الشاحنة الآن إلى الهدف...');
    crossingTraveler.classList.add('crossing');
    await new Promise(resolve => setTimeout(resolve, 1700));
    crossingTraveler.classList.add('arrived');
    isRunning = false;
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