document.addEventListener('DOMContentLoaded', async () => {
  const cloud = await window.KidsGamesCloudReady;
  if (!cloud?.enabled) return;
  const commandCountElement = document.getElementById('commandCount');
  const programElement = document.getElementById('program');
  const frogToken = document.getElementById('frogToken');
  const feedbackElement = document.getElementById('feedback');
  const feedbackVisual = document.getElementById('feedbackVisual');
  const runButton = document.getElementById('runButton');
  const starsElement = document.getElementById('stars');
  const levelElement = document.getElementById('levelNum');
  const levelSelector = document.getElementById('levelSelector');
  const commandButtons = document.querySelectorAll('.command-btn');
  const helpButtons = document.querySelectorAll('.help-q');
  const lessonHelp = document.getElementById('lessonHelp');
  const learningGuide = document.getElementById('learningGuide');
  const pondScene = document.getElementById('pondScene');
  const levelHint = document.getElementById('levelHint');
  const pads = [
    { left: 18, top: 74 },
    { left: 33, top: 60 },
    { left: 52, top: 64 },
    { left: 27, top: 38 },
    { left: 55, top: 40 },
    { left: 78, top: 24 }
  ];
  const levels = [
    {
      bugs: [1, 3, 4, 5],
      hint: 'اجمع الحشرات الأربع: اقفز إلى الورقة، ثم التقط الحشرة.',
      moves: {
        jump: [1, 2, 4, 4, 5, null],
        up: [null, 3, 4, 4, 5, null],
        right: [null, 2, 4, 4, 5, null]
      }
    },
    {
      bugs: [2, 4, 5],
      hint: 'اجمع ثلاث حشرات. اتبع الطريق المتفرع إلى الورقة الوسطى ثم إلى الأعلى.',
      moves: {
        jump: [1, 2, 4, 4, 5, null],
        up: [null, 3, 4, 4, 5, null],
        right: [null, 2, 4, 4, 5, null]
      }
    },
    {
      bugs: [1, 2, 4, 5],
      hint: 'أربع حشرات على طريق متعرّج. لا تنسَ الالتقاط قبل مواصلة القفز.',
      moves: {
        jump: [1, 2, 4, 4, 5, null],
        up: [null, 3, 4, 4, 5, null],
        right: [null, 2, 4, 4, 5, null]
      }
    },
    {
      bugs: [1, 2, 3, 4, 5],
      hint: 'اجمع الحشرات الخمس، بما فيها الورقة الجانبية، ثم تابع إلى النهاية.',
      moves: {
        jump: [1, null, 1, null, 2, null],
        up: [null, 3, 4, null, 5, null],
        right: [null, 2, null, 4, null, null]
      }
    },
    {
      bugs: [1, 2, 3, 4, 5],
      hint: 'اجمع الحشرات الخمس. قد تحتاج إلى الرجوع لورقة زرتها.',
      moves: {
        jump: [1, null, 4, null, 2, null],
        up: [null, 3, 1, null, 5, null],
        right: [null, 2, 4, 4, null, null]
      }
    }
  ];
  const commandNames = {
    jump: 'اقفز قطريًا',
    up: 'اقفز للأعلى',
    right: 'اقفز لليمين',
    eat: 'التقط حشرة'
  };
  const commandDrawings = {
    jump: '<path d="M7 31 29 9M14 9h15v15" />',
    up: '<path d="M18 34V6M6 18 18 6l12 12" />',
    right: '<path d="M4 18h28M20 6l12 12-12 12" />',
    eat: '<path d="M4 18q14-18 28 0M7 19q11 13 22 0M18 17v10" /><circle cx="11" cy="12" r="2" /><circle cx="25" cy="12" r="2" />'
  };

  const savedFrogProgress = getProgress().frog || { currentLevel: 1, unlocked: 1, completed: [], stars: 0 };
  let currentLevel = Math.min(
    Math.max((Number(savedFrogProgress.currentLevel) || 1) - 1, 0),
    window.KidsGames.getUnlockedLevel('frog') - 1,
    levels.length - 1
  );
  let position = 0;
  let commands = [];
  let eatenBugs = new Set();
  let isRunning = false;
  starsElement.textContent = savedFrogProgress.stars || 0;
  window.KidsGames.renderGameHeader('frog', currentLevel + 1);
  window.KidsGames.renderLevelSelector('frog', levelSelector, currentLevel + 1, selectLevel, isRunning);

  const bugElements = new Map(
    Array.from(document.querySelectorAll('.pond-bug'), bug => [Number(bug.dataset.bug), bug])
  );
  const bugTemplate = bugElements.values().next().value;
  for (let pad = 1; pad < pads.length; pad += 1) {
    if (bugElements.has(pad)) continue;
    const bug = bugTemplate.cloneNode(true);
    bug.dataset.bug = String(pad);
    pondScene.appendChild(bug);
    bugElements.set(pad, bug);
  }

  function getProgress() {
    return window.KidsGames.readProgress();
  }

  function setFeedback(message, isError = false) {
    feedbackElement.textContent = message;
    feedbackVisual.classList.toggle('error', isError);
    feedbackVisual.classList.toggle('success', Boolean(message) && !isError);
  }

  function updateFrogPosition() {
    frogToken.style.left = `${pads[position].left}%`;
    frogToken.style.top = `${pads[position].top}%`;
  }

  function updateBugs() {
    bugElements.forEach((bug, pad) => {
      bug.classList.toggle('eaten', eatenBugs.has(pad));
    });
  }

  function renderLevel() {
    const level = levels[currentLevel];
    levelElement.textContent = String(currentLevel + 1);
    levelHint.textContent = level.hint;
      // visual highlight to draw attention to the hint (animation class briefly applied)
      try {
        levelHint.classList.remove('hint-highlight');
        void levelHint.offsetWidth; // trigger reflow
        levelHint.classList.add('hint-highlight');
        window.setTimeout(() => levelHint.classList.remove('hint-highlight'), 900);
      } catch (e) {
        // ignore if levelHint is not present for some reason
      }
      document.querySelectorAll('.lily-pad').forEach(pad => {
        const index = Number(pad.dataset.pad);
        const hasBug = level.bugs.includes(index);
        pad.classList.toggle('has-bug', hasBug);
        pad.setAttribute('aria-label', hasBug ? 'ورقة عليها حشرة' : index === 0 ? 'ورقة البداية' : 'ورقة فارغة');
      });
      bugElements.forEach((bug, pad) => {
        const location = pads[pad];
        bug.hidden = !level.bugs.includes(pad);
        bug.style.setProperty('--x', `${location.left}%`);
        bug.style.setProperty('--y', `${location.top}%`);
      });
      window.KidsGames.renderGameHeader('frog', currentLevel + 1);
      window.KidsGames.renderLevelSelector('frog', levelSelector, currentLevel + 1, selectLevel, isRunning);
      updateBugs();
    }

  function createCommandDrawing(command) {
    const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    drawing.setAttribute('viewBox', '0 0 36 36');
    drawing.setAttribute('aria-hidden', 'true');
    drawing.innerHTML = commandDrawings[command];
    return drawing;
  }

  function renderProgram() {
    programElement.replaceChildren();
    commandCountElement.textContent = `${commands.length} ${commands.length === 1 ? 'أمر' : 'أوامر'}`;
    runButton.disabled = isRunning || commands.length === 0;

    if (!commands.length) {
      const emptyMessage = document.createElement('span');
      emptyMessage.className = 'program-empty';
      emptyMessage.textContent = 'لا توجد أوامر في الخطة';
      programElement.appendChild(emptyMessage);
      return;
    }

    commands.forEach((command, index) => {
      const button = document.createElement('button');
      button.className = 'program-item';
      button.type = 'button';
      button.setAttribute('aria-label', `إزالة الأمر ${index + 1}: ${commandNames[command]}`);
      button.disabled = isRunning;
      button.appendChild(createCommandDrawing(command));
      button.addEventListener('click', () => {
        commands.splice(index, 1);
        renderProgram();
      });
      programElement.appendChild(button);
    });
  }

  function setControlsDisabled(disabled) {
    commandButtons.forEach(button => {
      button.disabled = disabled;
    });
    document.getElementById('resetButton').disabled = disabled;
    document.getElementById('clearButton').disabled = disabled;
  }

  function wait(milliseconds) {
    return new Promise(resolve => window.setTimeout(resolve, milliseconds));
  }

  async function runProgram() {
    if (isRunning) return;
    if (!commands.length) {
      setFeedback('أضف أمرًا واحدًا على الأقل قبل التشغيل.', true);
      return;
    }

    isRunning = true;
    window.KidsGames.renderLevelSelector('frog', levelSelector, currentLevel + 1, selectLevel, isRunning);
    setControlsDisabled(true);
    renderProgram();
    setFeedback('بدأت المغامرة.');
    let runFailed = false;

    for (const command of commands) {
      if (command === 'eat') {
        if (levels[currentLevel].bugs.includes(position) && !eatenBugs.has(position)) {
          eatenBugs.add(position);
          updateBugs();
          setFeedback('أحسنت! التقط الضفدع حشرة.');
        } else {
          runFailed = true;
          setFeedback('لا توجد حشرة متبقية على هذه الورقة. أعد المحاولة.', true);
          break;
        }
        await wait(420);
        continue;
      }

      const destination = levels[currentLevel].moves[command][position];
      if (destination === null || destination === undefined) {
        runFailed = true;
        setFeedback('لا توجد ورقة في هذا الاتجاه. جرّب خطة أخرى.', true);
        break;
      }

      frogToken.classList.remove('jumping');
      void frogToken.offsetWidth;
      frogToken.classList.add('jumping');
      position = destination;
      updateFrogPosition();
      await wait(540);
      frogToken.classList.remove('jumping');
    }

    isRunning = false;
    window.KidsGames.renderLevelSelector('frog', levelSelector, currentLevel + 1, selectLevel, isRunning);
    setControlsDisabled(false);
    renderProgram();

    if (!runFailed && eatenBugs.size === levels[currentLevel].bugs.length) {
      completeLevel();
    } else if (!runFailed) {
      setFeedback(`باقي ${levels[currentLevel].bugs.length - eatenBugs.size} حشرات. أضف أوامرًا وأكمل الطريق.`);
    }
  }

  function completeLevel() {
    const nextLevel = Math.min(currentLevel + 2, levels.length);
    const result = window.KidsGames.completeGameLevel('frog', currentLevel + 1, 3, {
      currentLevel: nextLevel,
      unlocked: nextLevel
    });
    starsElement.textContent = result.gameStars;
    window.KidsGames.renderLevelSelector('frog', levelSelector, currentLevel + 1, selectLevel, isRunning);
    window.KidsGames.showLevelVictory(currentLevel + 1, 3, result.isFirstCompletion);
    setFeedback(result.isFirstCompletion ? 'رائع! جمعت كل الحشرات وربحت ثلاث نجوم.' : 'أكملت المهمة مرة أخرى! أحسنت.');
  }

  function resetGame(clearCommands = true) {
    window.KidsGames.hideLevelVictory();
    position = 0;
    eatenBugs = new Set();
    if (clearCommands) commands = [];
    frogToken.classList.remove('jumping');
    updateFrogPosition();
    updateBugs();
    renderProgram();
    setFeedback('');
  }

  function selectLevel(index) {
    if (isRunning || index < 0 || index >= window.KidsGames.getUnlockedLevel('frog') || index >= levels.length) return;
    currentLevel = index;
    window.KidsGames.setGameProgress('frog', { currentLevel: index + 1 });
    renderLevel();
    resetGame();
  }

  commandButtons.forEach(button => {
    button.addEventListener('click', () => {
      if (isRunning) return;
      commands.push(button.dataset.command);
      renderProgram();
      setFeedback('');
    });
  });

  runButton.addEventListener('click', runProgram);
  document.getElementById('resetButton').addEventListener('click', () => resetGame());
  document.getElementById('clearButton').addEventListener('click', () => resetGame());

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
        popup.setAttribute('aria-hidden', 'false');
        button.setAttribute('aria-expanded', 'true');
      }
    });
  });

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

  renderLevel();
  resetGame();
});
