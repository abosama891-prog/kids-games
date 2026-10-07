document.addEventListener('DOMContentLoaded', () => {
  const SIZE = 6;
  const directions = [
    { key: 'right', dx: 1, dy: 0, rotation: 90 },
    { key: 'down', dx: 0, dy: 1, rotation: 180 },
    { key: 'left', dx: -1, dy: 0, rotation: 270 },
    { key: 'up', dx: 0, dy: -1, rotation: 0 }
  ];
  const commandLabels = {
    forward: '↑',
    left: '↶',
    right: '↷',
    repeat: '×3',
    ifClear: '؟',
    call: 'ƒ()'
  };
  const guides = {
    nuri: {
      name: 'نوري',
      role: 'المخطط',
      color: '#6c88d1'
    },
    luma: {
      name: 'لوما',
      role: 'المهندسة',
      color: '#b577c4'
    },
    rafi: {
      name: 'رافي',
      role: 'خبير التكرار',
      color: '#d08b34'
    },
    sami: {
      name: 'سامي',
      role: 'مصمم الدوال',
      color: '#4b9b83'
    },
    lina: {
      name: 'لينا',
      role: 'حارسة الطريق',
      color: '#d36e58'
    }
  };
  const guideAssignments = ['nuri', 'luma', 'rafi', 'sami', 'lina', 'lina', 'rafi', 'nuri', 'sami', 'lina'];
  const scenes = [
    { title: 'ساحة الندى', caption: 'بلورتان تنتظرانك!', sky: '#b9e5ed', grass: '#b5d7a4', path: '#f9edc7', pathAlt: '#e9ddb7' },
    { title: 'شارع الأقواس', caption: 'انعطفي عند القوس!', sky: '#b7d8f1', grass: '#a8ceaa', path: '#f6e2bd', pathAlt: '#e9d4ae' },
    { title: 'حديقة النغمات', caption: 'كل بلورة تضيف لونًا!', sky: '#bce8d4', grass: '#86c58d', path: '#f3edc5', pathAlt: '#dce5ae' },
    { title: 'جسر الفوانيس', caption: 'اتبعي طريق الفوانيس!', sky: '#f3d0b7', grass: '#d8b68d', path: '#efdfbb', pathAlt: '#dfc59d' },
    { title: 'ممر الزهور', caption: 'تجنّبي الزهرة الشائكة!', sky: '#e5cbed', grass: '#a8ceaa', path: '#f5e2cb', pathAlt: '#e6d2bb' },
    { title: 'سوق الألوان', caption: 'الطريق الآمن من هنا!', sky: '#f4dcaa', grass: '#a7c99c', path: '#f1d5a8', pathAlt: '#e5c38f' },
    { title: 'نافورة الأمنيات', caption: 'اجمعي البلورات بحذر!', sky: '#b7e6e9', grass: '#9acbaf', path: '#f7edca', pathAlt: '#e9ddb5' },
    { title: 'حيّ الرسّامين', caption: 'خطوة وخطوة إلى اللون!', sky: '#f0c7cd', grass: '#a5c796', path: '#f1dfb9', pathAlt: '#e4cea7' },
    { title: 'طريق الغيوم', caption: 'دالتك تختصر الطريق!', sky: '#c9d2f4', grass: '#a4caad', path: '#f6e6c4', pathAlt: '#e8d6b2' },
    { title: 'قلب المدينة', caption: 'أعيدي البهجة للمدينة!', sky: '#f3d98d', grass: '#8fc392', path: '#f4e4b7', pathAlt: '#e5cfa1' }
  ];
  const crystalPalette = ['#f27d76', '#f4c34e', '#66bce0', '#a382d5', '#65bd90'];
  const levelData = [
    {
      concept: 'التسلسل',
      hint: 'يلا نبدأ!',
      start: { x: 0, y: 2, dir: 0 }, goal: { x: 5, y: 2 },
      energy: [{ x: 2, y: 2 }, { x: 4, y: 2 }], walls: [], hazards: [],
      tools: ['forward']
    },
    {
      concept: 'تغيير الاتجاه',
      hint: 'لفّي عند القوس.',
      start: { x: 0, y: 0, dir: 0 }, goal: { x: 5, y: 5 },
      energy: [{ x: 2, y: 0 }, { x: 5, y: 2 }], walls: [], hazards: [],
      tools: ['forward', 'left', 'right']
    },
    {
      concept: 'حلقة التكرار',
      hint: 'كرّري التقدّم!',
      start: { x: 0, y: 3, dir: 0 }, goal: { x: 5, y: 3 },
      energy: [{ x: 1, y: 3 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }], walls: [], hazards: [],
      tools: ['forward', 'left', 'right', 'repeat']
    },
    {
      concept: 'الدوال',
      hint: 'الدالة صديقتك!',
      start: { x: 0, y: 5, dir: 3 }, goal: { x: 5, y: 0 },
      energy: [{ x: 0, y: 3 }, { x: 2, y: 4 }, { x: 4, y: 2 }, { x: 4, y: 0 }],
      walls: [{ x: 2, y: 5 }, { x: 2, y: 3 }, { x: 3, y: 3 }, { x: 5, y: 4 }], hazards: [],
      tools: ['forward', 'left', 'right', 'define', 'call']
    },
    {
      concept: 'الشروط',
      hint: 'آمن؟ تأكدي أولًا.',
      start: { x: 0, y: 0, dir: 0 }, goal: { x: 5, y: 0 },
      energy: [{ x: 2, y: 0 }, { x: 5, y: 1 }], walls: [{ x: 1, y: 2 }, { x: 2, y: 2 }, { x: 3, y: 2 }],
      hazards: [{ x: 3, y: 0 }],
      tools: ['forward', 'left', 'right', 'ifClear']
    },
    {
      concept: 'التحقّق قبل الحركة',
      hint: 'في طريق تاني!',
      start: { x: 0, y: 2, dir: 0 }, goal: { x: 5, y: 2 },
      energy: [{ x: 1, y: 2 }, { x: 4, y: 2 }],
      walls: [{ x: 2, y: 3 }, { x: 3, y: 3 }, { x: 3, y: 1 }, { x: 5, y: 1 }],
      hazards: [{ x: 3, y: 2 }],
      tools: ['forward', 'left', 'right', 'ifClear']
    },
    {
      concept: 'حلقة مع شرط',
      hint: 'كرّري، بس خدي بالك!',
      start: { x: 0, y: 5, dir: 0 }, goal: { x: 5, y: 5 },
      energy: [{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 4, y: 5 }],
      walls: [{ x: 3, y: 4 }, { x: 3, y: 3 }], hazards: [{ x: 3, y: 5 }],
      tools: ['forward', 'left', 'right', 'repeat', 'ifClear']
    },
    {
      concept: 'تصحيح الأخطاء',
      hint: 'جرّبي طريقًا جديدًا!',
      start: { x: 0, y: 0, dir: 0 }, goal: { x: 5, y: 5 },
      energy: [{ x: 2, y: 0 }, { x: 2, y: 3 }, { x: 5, y: 3 }],
      walls: [{ x: 1, y: 1 }, { x: 1, y: 3 }, { x: 3, y: 3 }, { x: 4, y: 4 }],
      hazards: [{ x: 4, y: 3 }],
      tools: ['forward', 'left', 'right', 'repeat', 'ifClear', 'define', 'call']
    },
    {
      concept: 'إعادة استخدام الدوال',
      hint: 'دالتك تختصر الطريق!',
      start: { x: 0, y: 5, dir: 0 }, goal: { x: 5, y: 0 },
      energy: [{ x: 2, y: 5 }, { x: 2, y: 2 }, { x: 5, y: 2 }],
      walls: [{ x: 1, y: 4 }, { x: 3, y: 4 }, { x: 3, y: 1 }],
      hazards: [{ x: 4, y: 2 }],
      tools: ['forward', 'left', 'right', 'ifClear', 'define', 'call']
    },
    {
      concept: 'التحدي الأخير',
      hint: 'أنتِ قدّها!',
      start: { x: 0, y: 5, dir: 0 }, goal: { x: 5, y: 0 },
      energy: [{ x: 2, y: 5 }, { x: 2, y: 2 }, { x: 5, y: 2 }],
      walls: [{ x: 1, y: 4 }, { x: 1, y: 2 }, { x: 4, y: 4 }, { x: 4, y: 2 }],
      hazards: [{ x: 3, y: 5 }, { x: 3, y: 2 }, { x: 4, y: 1 }],
      tools: ['forward', 'left', 'right', 'repeat', 'ifClear', 'define', 'call']
    }
  ];

  const heroSvg = '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M17 27c-3-13 3-22 15-22 13 0 19 9 16 23l-4 11H20z" fill="#49314b" stroke="#633f37" stroke-width="2"/><path d="M19 27c0-10 5-15 13-15s13 5 13 15v9c0 9-6 15-13 15s-13-6-13-15z" fill="#f1bd91" stroke="#9d6248" stroke-width="2"/><path d="M18 28c1-13 7-19 16-18 7 1 11 5 13 13-7-1-11-5-14-9-3 6-8 10-15 14z" fill="#49314b"/><circle cx="27" cy="32" r="1.8" fill="#342b39"/><circle cx="39" cy="32" r="1.8" fill="#342b39"/><path d="M29 40q4 4 8 0" fill="none" stroke="#9d4e48" stroke-width="2" stroke-linecap="round"/><path d="M22 50q10-5 20 0l6 11H16z" fill="#d87859" stroke="#8e4d48" stroke-width="2"/><path d="M16 59h14M35 59h13" stroke="#60485a" stroke-width="4" stroke-linecap="round"/></svg>';
  const guideHair = {
    nuri: '<path d="M17 27c-2-12 4-20 15-20 11 0 17 7 15 20l-5-3-4-8-6 5-12 1z" fill="#503849"/>',
    luma: '<path d="M16 30c-3-15 4-23 16-23 13 0 19 9 16 24l-6-3-2-12-9 5-10-2z" fill="#623f36"/><path d="M16 27v20M48 26v20" stroke="#623f36" stroke-width="5" stroke-linecap="round"/>',
    rafi: '<path d="M18 27c-2-13 4-20 14-20 12 0 17 8 15 20l-7-7-8 2-8-4z" fill="#8b5432"/>',
    sami: '<path d="M17 28c-2-13 4-21 15-21 12 0 18 9 15 22l-6-4-2-9-8 4-10-2z" fill="#332f38"/><path d="M18 18q14-12 28 0" fill="none" stroke="#467b70" stroke-width="4"/>',
    lina: '<path d="M16 29c-2-15 5-22 16-22 12 0 18 9 16 24l-5-5-4-10-8 5-12 1z" fill="#a14d48"/><path d="M17 28 13 47M47 28l5 18" stroke="#a14d48" stroke-width="5" stroke-linecap="round"/>'
  };
  function personSvg(color, hair = '<path d="M17 27c-2-13 4-21 15-21 12 0 18 9 15 23l-6-4-4-10-8 5-10 1z" fill="#503849"/>') {
    return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M18 29c0-13 5-19 14-19s14 6 14 19v7c0 9-6 15-14 15S18 45 18 36z" fill="#f1bd91" stroke="#9d6248" stroke-width="2"/>${hair}<circle cx="27" cy="33" r="1.8" fill="#342b39"/><circle cx="39" cy="33" r="1.8" fill="#342b39"/><path d="M28 41q4 4 8 0" fill="none" stroke="#9d4e48" stroke-width="2" stroke-linecap="round"/><path d="M20 51q12-6 24 0l6 11H14z" fill="${color}" stroke="#4b4054" stroke-width="2"/></svg>`;
  }
  const guidePortraits = Object.fromEntries(
    Object.entries(guides).map(([key, guide]) => [key, personSvg(guide.color, guideHair[key])])
  );
  const progress = window.KidsGames.readProgress();
  const saved = progress.robot || { currentLevel: 1, unlocked: 1, completed: [] };
  let unlocked = window.KidsGames.getUnlockedLevel('robot', progress);
  let levelIndex = Math.max(0, Math.min(Number(saved.currentLevel || 1) - 1, unlocked - 1, levelData.length - 1));
  let completed = new Set(saved.completed || []);
  let player;
  let energy;
  let program = [];
  let customFunction = [];
  let isRunning = false;
  let functionDraft = [];

  const $ = id => document.getElementById(id);
  const boardElement = $('board');
  const programElement = $('program');
  const runButton = $('runButton');
  const feedbackElement = $('feedback');
  const successPanel = $('successPanel');

  function cellHas(items, x, y) {
    return items.some(item => item.x === x && item.y === y);
  }

  function setFeedback(message, state = '') {
    feedbackElement.textContent = message;
    feedbackElement.classList.toggle('error', state === 'error');
    feedbackElement.classList.toggle('success', state === 'success');
  }

  function resetPlayer() {
    const level = levelData[levelIndex];
    player = { ...level.start };
    energy = level.energy.map((item, index) => ({
      ...item,
      color: crystalPalette[(index + levelIndex) % crystalPalette.length],
      collected: false
    }));
    successPanel.hidden = true;
    setFeedback('');
    renderBoard();
  }

  function renderBoard() {
    const level = levelData[levelIndex];
    const scene = scenes[levelIndex];
    const boardFrame = boardElement.parentElement;
    boardFrame.style.setProperty('--scene-sky', scene.sky);
    boardFrame.style.setProperty('--scene-grass', scene.grass);
    boardElement.style.setProperty('--path-light', scene.path);
    boardElement.style.setProperty('--path-dark', scene.pathAlt);
    $('sceneTitle').textContent = scene.title;
    $('sceneCaption').textContent = scene.caption;
    $('colorCount').textContent = `${energy.filter(item => item.collected).length} / ${energy.length}`;
    boardElement.replaceChildren();
    boardElement.setAttribute('aria-label', `${scene.title}، المستوى ${levelIndex + 1}`);

    for (let y = 0; y < SIZE; y += 1) {
      for (let x = 0; x < SIZE; x += 1) {
        const cell = document.createElement('div');
        cell.className = 'board-cell';
        cell.setAttribute('aria-hidden', 'true');

        if (cellHas(level.walls, x, y)) {
          cell.classList.add('board-wall');
        } else if (cellHas(level.hazards, x, y)) {
          cell.classList.add('board-hazard');
        }

        const crystal = energy.find(item => item.x === x && item.y === y);
        if (crystal && !crystal.collected) {
          cell.classList.add('board-energy');
          const gem = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
          gem.classList.add('energy-gem');
          gem.setAttribute('viewBox', '0 0 48 48');
          gem.setAttribute('aria-hidden', 'true');
          gem.style.setProperty('--crystal-color', crystal.color);
          gem.innerHTML = '<polygon points="24,3 41,16 34,40 24,46 14,40 7,16"/><polygon points="24,6 24,43 14,38 9,17"/><path d="M14 15l7-7M34 16l4 2"/>';
          cell.appendChild(gem);
        } else if (crystal?.collected) {
          cell.classList.add('board-restored');
          const flower = document.createElement('span');
          flower.className = 'restored-flower';
          flower.style.setProperty('--crystal-color', crystal.color);
          flower.setAttribute('aria-hidden', 'true');
          flower.textContent = '✿';
          cell.appendChild(flower);
        }

        if (level.goal.x === x && level.goal.y === y) {
          cell.classList.add('board-station');
          const station = document.createElement('span');
          station.className = 'station-mark';
          cell.appendChild(station);
        }

        if (player.x === x && player.y === y) {
          const hero = document.createElement('span');
          hero.className = 'board-hero';
          hero.setAttribute('aria-label', 'سُها');
          hero.innerHTML = heroSvg;
          cell.appendChild(hero);
        }

        boardElement.appendChild(cell);
      }
    }
  }

  function renderProgram() {
    programElement.replaceChildren();
    if (!program.length) {
      const hint = document.createElement('span');
      hint.className = 'program-empty';
      hint.textContent = 'أضيفي أوامرك';
      programElement.appendChild(hint);
    } else {
      program.forEach((type, index) => {
        const step = document.createElement('button');
        step.type = 'button';
        step.className = 'program-step';
        step.dataset.type = type;
        step.setAttribute('aria-label', `إزالة الأمر ${commandLabels[type]} رقم ${index + 1}`);
        step.textContent = commandLabels[type];
        if (type === 'repeat') step.title = 'يكرر الأمر التالي ثلاث مرات';
        step.addEventListener('click', () => {
          if (isRunning) return;
          program.splice(index, 1);
          renderProgram();
        });
        programElement.appendChild(step);
      });
    }

    runButton.disabled = isRunning || program.length === 0;
    $('clearButton').disabled = isRunning || program.length === 0;
    $('resetButton').disabled = isRunning;
    document.querySelectorAll('.command-button').forEach(button => {
      const available = levelData[levelIndex].tools.includes(button.dataset.command);
      button.disabled = isRunning || !available || (button.dataset.command === 'call' && !customFunction.length);
    });
  }

  function renderLevels() {
    unlocked = window.KidsGames.getUnlockedLevel('robot');
    window.KidsGames.renderLevelSelector('robot', $('levelList'), levelIndex + 1, loadLevel, isRunning);
  }

  function loadLevel(index) {
    unlocked = window.KidsGames.getUnlockedLevel('robot');
    if (isRunning || index < 0 || index >= unlocked) return;
    levelIndex = index;
    program = [];
    renderTools();
    $('conceptTitle').textContent = levelData[index].concept;
    $('levelCount').textContent = String(index + 1);
    renderGuide(guideAssignments[index]);
    $('starsCount').textContent = String(window.KidsGames.readProgress().robot?.stars || 0);
    window.KidsGames.renderGameHeader('robot', index + 1);
    resetPlayer();
    renderProgram();
    renderLevels();
  }

  function renderTools() {
    const tools = new Set(levelData[levelIndex].tools);
    document.querySelectorAll('.command-button').forEach(button => {
      const isDirection = ['forward', 'left', 'right'].includes(button.dataset.command);
      button.closest('.command-control').hidden = !isDirection && !tools.has(button.dataset.command);
    });
  }

  function renderGuide(guideKey) {
    const guide = guides[guideKey];
    $('guideName').textContent = guide.name;
    $('guideRole').textContent = guide.role;
    $('guideHint').textContent = levelData[levelIndex].hint;
    $('guideAvatar').style.setProperty('--guide-color', guide.color);
    $('guideAvatar').innerHTML = guidePortraits[guideKey];
    document.querySelectorAll('.guide-team-card').forEach(card => {
      card.classList.toggle('active', card.dataset.guide === guideKey);
    });
  }

  function renderGuideRoster() {
    const roster = $('guideRoster');
    roster.replaceChildren();
    Object.entries(guides).forEach(([key, guide]) => {
      const card = document.createElement('div');
      card.className = 'guide-team-card';
      card.dataset.guide = key;
      card.setAttribute('aria-label', `${guide.name}، ${guide.role}`);
      card.innerHTML = guidePortraits[key];
      const name = document.createElement('span');
      name.textContent = guide.name;
      card.appendChild(name);
      roster.appendChild(card);
    });
  }

  function addCommand(type) {
    if (isRunning || !levelData[levelIndex].tools.includes(type) || type === 'call' && !customFunction.length) return;
    if (type === 'define') {
      functionDraft = [];
      renderFunctionDraft();
      $('functionDialog').showModal();
      return;
    }
    program.push(type);
    renderProgram();
  }

  function renderFunctionDraft() {
    const slots = $('functionSlots');
    slots.replaceChildren();
    for (let index = 0; index < 3; index += 1) {
      const slot = document.createElement('span');
      slot.className = `function-slot${functionDraft[index] ? ' filled' : ''}`;
      slot.textContent = functionDraft[index] ? commandLabels[functionDraft[index]] : String(index + 1);
      slots.appendChild(slot);
    }
  }

  function expandBlock(type, sourceIndex) {
    if (type === 'call') return customFunction.map(step => ({ type: step, sourceIndex }));
    return [{ type, sourceIndex }];
  }

  function expandProgram(commands) {
    const actions = [];
    for (let index = 0; index < commands.length; index += 1) {
      const type = commands[index];
      if (type === 'repeat') {
        if (index + 1 < commands.length) {
          const repeated = expandBlock(commands[index + 1], index + 1);
          for (let count = 0; count < 3; count += 1) actions.push(...repeated);
          index += 1;
        }
      } else {
        actions.push(...expandBlock(type, index));
      }
    }
    return actions;
  }

  function canMoveForward() {
    const direction = directions[player.dir];
    const x = player.x + direction.dx;
    const y = player.y + direction.dy;
    const level = levelData[levelIndex];
    return x >= 0 && x < SIZE && y >= 0 && y < SIZE &&
      !cellHas(level.walls, x, y) && !cellHas(level.hazards, x, y);
  }

  function collectEnergy() {
    const item = energy.find(candidate => !candidate.collected && candidate.x === player.x && candidate.y === player.y);
    if (!item) return false;
    item.collected = true;
    return true;
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  async function runProgram() {
    if (isRunning || !program.length) return;
    isRunning = true;
    setFeedback('انطلقي!');
    renderProgram();
    renderLevels();
    let skipNext = false;
    const actions = expandProgram(program);

    if (actions.length > 120) {
      isRunning = false;
      setFeedback('أوامر كثيرة!', 'error');
      renderProgram();
      renderLevels();
      return;
    }

    for (const action of actions) {
      if (skipNext) {
        skipNext = false;
        continue;
      }

      if (action.type === 'ifClear') {
        skipNext = !canMoveForward();
        setFeedback(skipNext ? 'تخطّي!' : 'آمن!');
        await wait(250);
        continue;
      }

      if (action.type === 'left') {
        player.dir = (player.dir + directions.length - 1) % directions.length;
      } else if (action.type === 'right') {
        player.dir = (player.dir + 1) % directions.length;
      } else if (action.type === 'forward') {
        const direction = directions[player.dir];
        const x = player.x + direction.dx;
        const y = player.y + direction.dy;
        const level = levelData[levelIndex];

        if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) {
          setFeedback('الحافة! جرّبي طريقًا ثانيًا.', 'error');
          break;
        }
        if (cellHas(level.walls, x, y)) {
          setFeedback('حاجز! غيّري المسار.', 'error');
          break;
        }
        if (cellHas(level.hazards, x, y)) {
          setFeedback('خطر! اختاري طريقًا آمنًا.', 'error');
          break;
        }
        player.x = x;
        player.y = y;
        collectEnergy();
      }

      renderBoard();
      await wait(230);
    }

    isRunning = false;
    renderProgram();
    renderLevels();
    const level = levelData[levelIndex];
    const allEnergyCollected = energy.every(item => item.collected);
    const reachedGoal = player.x === level.goal.x && player.y === level.goal.y;

    if (allEnergyCollected && reachedGoal) {
      completeLevel();
    } else if (!feedbackElement.classList.contains('error')) {
      const remaining = energy.filter(item => !item.collected).length;
      setFeedback(remaining ? `بقي ${remaining} بلورة!` : 'إلى البوابة!');
    }
  }

  function completeLevel() {
    const isFirstCompletion = !completed.has(levelIndex + 1);
    const score = program.length <= 5 ? 3 : program.length <= 9 ? 2 : 1;
    completed.add(levelIndex + 1);
    unlocked = Math.max(unlocked, Math.min(levelIndex + 2, levelData.length));
    const nextLevel = Math.min(levelIndex + 2, levelData.length);

    const award = window.KidsGames.completeGameLevel('robot', levelIndex + 1, score, {
      currentLevel: nextLevel,
      unlocked
    });
    unlocked = window.KidsGames.getUnlockedLevel('robot', award.progress);

    $('starsCount').textContent = String(award.gameStars);
    window.KidsGames.renderGameHeader('robot', levelIndex + 1);
    $('successMessage').textContent = 'يا سلام! رجعت الألوان!';
    $('starMessage').textContent = isFirstCompletion ? `+${score} نجوم!` : 'أحسنتِ!';
    $('nextLevelButton').textContent = levelIndex === levelData.length - 1 ? 'من جديد' : 'التالي';
    successPanel.hidden = true;
    window.KidsGames.showLevelVictory(levelIndex + 1, score, isFirstCompletion);
    setFeedback('وصلتِ!', 'success');
    renderLevels();
  }

  $('commandPalette').addEventListener('click', event => {
    const button = event.target.closest('[data-command]');
    if (button) addCommand(button.dataset.command);
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
        popup.classList.add('show');
        popup.setAttribute('aria-hidden', 'false');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });
  $('runButton').addEventListener('click', runProgram);
  $('resetButton').addEventListener('click', resetPlayer);
  $('clearButton').addEventListener('click', () => {
    if (isRunning) return;
    program = [];
    renderProgram();
    setFeedback('تم مسح البرنامج.');
  });

  $('functionPicks').addEventListener('click', event => {
    const button = event.target.closest('[data-step]');
    if (!button || functionDraft.length >= 3) return;
    functionDraft.push(button.dataset.step);
    renderFunctionDraft();
  });
  $('clearFunctionButton').addEventListener('click', () => {
    functionDraft = [];
    renderFunctionDraft();
  });
  $('saveFunctionButton').addEventListener('click', () => {
    if (functionDraft.length !== 3) {
      setFeedback('اختر ثلاث خطوات كاملة قبل حفظ الدالة.', 'error');
      return;
    }
    customFunction = [...functionDraft];
    $('callFunctionButton').disabled = false;
    $('functionDialog').close();
    setFeedback('حُفظت الدالة. أضفها إلى برنامجك متى احتجت إليها.', 'success');
    renderProgram();
  });
  $('nextLevelButton').addEventListener('click', () => {
    const next = levelIndex === levelData.length - 1 ? 0 : levelIndex + 1;
    loadLevel(next);
  });
  $('headerNextButton').addEventListener('click', () => {
    unlocked = window.KidsGames.getUnlockedLevel('robot');
    if (levelIndex + 1 < unlocked) loadLevel(levelIndex + 1);
  });

  renderGuideRoster();
  loadLevel(levelIndex);
});
