document.addEventListener('DOMContentLoaded', () => {
  const commandCountElement = document.getElementById('commandCount');
  const programElement = document.getElementById('program');
  const frogToken = document.getElementById('frogToken');
  const feedbackElement = document.getElementById('feedback');
  const feedbackVisual = document.getElementById('feedbackVisual');
  const runButton = document.getElementById('runButton');
  const starsElement = document.getElementById('stars');
  const levelElement = document.getElementById('levelNum');
  const commandButtons = document.querySelectorAll('.command-btn');
  const helpButtons = document.querySelectorAll('.help-q');
  const lessonHelp = document.getElementById('lessonHelp');
  const learningGuide = document.getElementById('learningGuide');
  const pads = [
    { left: 18, top: 74 },
    { left: 33, top: 60 },
    { left: 52, top: 64 },
    { left: 27, top: 38 },
    { left: 55, top: 40 },
    { left: 78, top: 24 }
  ];
  const bugsOnPads = [1, 3, 4, 5];
  const nextPad = {
    jump: [1, 2, 4, 4, 5, null],
    up: [1, 3, 4, 4, 5, null],
    right: [1, 2, 4, 4, 5, null]
  };
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

  let position = 0;
  let commands = [];
  let eatenBugs = new Set();
  let isRunning = false;
  const frogProgress = getProgress().frog || { currentLevel: 1, unlocked: 1, completed: [], stars: 0 };
  starsElement.textContent = frogProgress.stars || 0;
  levelElement.textContent = '1';
  window.KidsGames.renderGameHeader('frog', 1);

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
    document.querySelectorAll('.pond-bug').forEach(bug => {
      bug.classList.toggle('eaten', eatenBugs.has(Number(bug.dataset.bug)));
    });
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
    setControlsDisabled(true);
    renderProgram();
    setFeedback('بدأت المغامرة.');

    for (const command of commands) {
      if (command === 'eat') {
        if (bugsOnPads.includes(position) && !eatenBugs.has(position)) {
          eatenBugs.add(position);
          updateBugs();
          setFeedback('أحسنت! التقط الضفدع حشرة.');
        } else {
          setFeedback('لا توجد حشرة على هذه الورقة.', true);
        }
        await wait(420);
        continue;
      }

      const destination = nextPad[command][position];
      if (destination === null || destination === undefined) {
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
    setControlsDisabled(false);
    renderProgram();

    if (eatenBugs.size === bugsOnPads.length) {
      completeLevel();
    } else if (!feedbackElement.classList.contains('error')) {
      setFeedback(`باقي ${bugsOnPads.length - eatenBugs.size} حشرات. أضف أوامرًا وأكمل الطريق.`);
    }
  }

  function completeLevel() {
    const result = window.KidsGames.completeGameLevel('frog', 1, 3, { currentLevel: 1, unlocked: 1 });
    starsElement.textContent = result.gameStars;
    window.KidsGames.showLevelVictory(1, 3, result.isFirstCompletion);
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

  getProgress();
  resetGame();
});
