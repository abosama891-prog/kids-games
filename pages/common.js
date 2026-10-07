(function () {
  const APP_BASE_URL = new URL('../', document.currentScript.src);
  const STORAGE_KEYS = Object.freeze({
    serviceWorkerUpdateCheck: 'kids_games_sw_update_check_v1'
  });

  const gameCatalog = [
    { key: 'draw', title: 'الرسم', icon: '🎨', href: new URL('pages/draw/index.html', APP_BASE_URL).href, levels: 10, accent: '#f39c12' },
    { key: 'maze', title: 'CoD', icon: '🐰', href: new URL('pages/maze/index.html', APP_BASE_URL).href, levels: 20, accent: '#4a90e2' },
    { key: 'gas', title: 'المهندس', icon: '🌉', href: new URL('pages/gas/index.html', APP_BASE_URL).href, levels: 10, accent: '#e47645' },
    { key: 'frog', title: 'الضفدع', icon: '🐸', href: new URL('pages/frog/index.html', APP_BASE_URL).href, levels: 5, accent: '#86EFAC' },
    { key: 'potion', title: 'المختبر', icon: '🧪', href: new URL('pages/potion/index.html', APP_BASE_URL).href, levels: 3, accent: '#2DD4BF' },
    { key: 'robot', title: 'الألوان', icon: '🌈', href: new URL('pages/robot/index.html', APP_BASE_URL).href, levels: 10, accent: '#e47765' },
    { key: 'code-park', title: 'ملاهي البرمجة', icon: '🎢', href: new URL('pages/games/code-park.html', APP_BASE_URL).href, levels: 5, accent: '#FF6B6B' },
  ];
  const lessonCatalog = [
    { key: 'commands', title: 'ما معنى الأمر في البرمجة؟', icon: '📘', unlockAt: 1 },
    { key: 'sequence', title: 'ترتيب الأوامر', icon: '🔢', unlockAt: 3 },
    { key: 'loops', title: 'التكرار والحلقات', icon: '🔁', unlockAt: 5 },
    { key: 'conditions', title: 'الشروط واتخاذ القرار', icon: '🚦', unlockAt: 8 },
    { key: 'debugging', title: 'اكتشاف الأخطاء وتصحيحها', icon: '🔍', unlockAt: 12 },
    { key: 'code-park', title: 'ملاهي البرمجة', icon: '🎢', unlockAt: 15 },
  ];
  const defaultState = {
    stars: 0,
    unattributedStars: 0,
    ...Object.fromEntries(gameCatalog.map(game => [game.key, { currentLevel: 1, unlocked: 1, completed: [], stars: 0 }]))
  };

  function cloneState(value) {
    return JSON.parse(JSON.stringify(value));
  }

  let currentProgress = cloneState(defaultState);
  let lastSavedProgress = cloneState(defaultState);
  let progressSaveQueue = Promise.resolve();
  let lessonSettingsCache = Object.fromEntries(lessonCatalog.map(lesson => [lesson.key, lesson.unlockAt]));
  let gameSettingsCache = { lockedGames: [] };

  function normalizeProgress(parsed = {}) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new TypeError('Saved cloud progress must be an object.');
    }
    const savedUnattributedStars = Number(parsed.unattributedStars);
    const savedTotalStars = Number(parsed.stars);
    const state = {
      stars: 0,
      unattributedStars: Number.isFinite(savedUnattributedStars) && savedUnattributedStars > 0
        ? Math.floor(savedUnattributedStars)
        : 0
    };
    let gameStars = 0;
    gameCatalog.forEach(game => {
      const savedGame = parsed[game.key] || {};
      const completed = Array.from(new Set(
        (Array.isArray(savedGame.completed) ? savedGame.completed : [])
          .map(Number)
          .filter(level => Number.isInteger(level) && level >= 1 && level <= game.levels)
      ));
      const stars = Number.isFinite(Number(savedGame.stars)) && Number(savedGame.stars) >= 0
        ? Math.floor(Number(savedGame.stars))
        : completed.length * 3;
      state[game.key] = {
        ...defaultState[game.key],
        ...savedGame,
        stars,
        completed
      };
      gameStars += stars;
    });
    const legacyTotalStars = Number.isFinite(savedTotalStars) && savedTotalStars > 0
      ? Math.floor(savedTotalStars)
      : 0;
    state.unattributedStars = Math.max(state.unattributedStars, legacyTotalStars - gameStars, 0);
    state.stars = state.unattributedStars + gameStars;
    return state;
  }

  function mergeProgress(firstProgress, secondProgress) {
    const first = normalizeProgress(firstProgress);
    const second = normalizeProgress(secondProgress);
    const merged = {
      unattributedStars: Math.max(first.unattributedStars, second.unattributedStars)
    };
    gameCatalog.forEach(game => {
      const firstGame = first[game.key];
      const secondGame = second[game.key];
      const currentLevel = Math.max(firstGame.currentLevel, secondGame.currentLevel);
      merged[game.key] = {
        currentLevel,
        unlocked: Math.max(currentLevel, firstGame.unlocked, secondGame.unlocked),
        completed: [...new Set([...firstGame.completed, ...secondGame.completed])].sort((a, b) => a - b),
        stars: Math.max(firstGame.stars, secondGame.stars)
      };
    });
    merged.stars = merged.unattributedStars
      + gameCatalog.reduce((total, game) => total + merged[game.key].stars, 0);
    return merged;
  }

  function readProgress() {
    return cloneState(currentProgress);
  }

  async function saveProgress(nextState) {
    const nextProgress = normalizeProgress(nextState);
    currentProgress = nextProgress;
    const write = progressSaveQueue.then(async () => {
      const cloud = await window.KidsGamesCloudReady;
      if (!cloud?.enabled) throw new Error('Firebase is unavailable; game progress was not saved.');
      await cloud.saveProgress(nextProgress);
      lastSavedProgress = cloneState(nextProgress);
    });
    progressSaveQueue = write.catch(() => {});
    try {
      await write;
    } catch (error) {
      if (JSON.stringify(currentProgress) === JSON.stringify(nextProgress)) {
        currentProgress = cloneState(lastSavedProgress);
      }
      window.dispatchEvent(new CustomEvent('kids-games-save-error', {
          detail: { message: 'تعذر حفظ تقدمك في Firebase. تحقق من الاتصال ثم أعد تحميل الصفحة؛ لن تُحفظ هذه البيانات محليًا.' }
      }));
      console.error('Firebase progress save failed:', error);
      return false;
    }
    return cloneState(currentProgress);
  }

  function setGameProgress(gameKey, updates) {
    const state = readProgress();
    const current = state[gameKey] || { currentLevel: 1, unlocked: 1, completed: [] };
    state[gameKey] = { ...current, ...updates };
    if (updates.currentLevel && updates.currentLevel > state[gameKey].unlocked) {
      state[gameKey].unlocked = updates.currentLevel;
    }
    return saveProgress(state);
  }

  function addStars(amount) {
    const state = readProgress();
    state.stars = (state.stars || 0) + amount;
    state.unattributedStars = (state.unattributedStars || 0) + amount;
    saveProgress(state);
    return state;
  }

  // ✅ FIX #1 + #2: تبسيط حساب stars + تحديث currentLevel تلقائيًا
  function completeGameLevel(gameKey, levelNumber, starsAwarded, updates = {}) {
    const game = gameCatalog.find(item => item.key === gameKey);
    if (!game) {
      throw new RangeError(`Unknown game key: ${gameKey}`);
    }
    if (!Number.isInteger(levelNumber) || levelNumber < 1 || levelNumber > game.levels) {
      throw new RangeError('Level number must be within the game level range.');
    }
    if (!Number.isFinite(starsAwarded) || starsAwarded < 0) {
      throw new RangeError('Stars awarded must be a non-negative number.');
    }

    const progress = readProgress();
    if (levelNumber > getUnlockedLevel(gameKey, progress)) {
      throw new RangeError('Complete the previous level before completing this level.');
    }
    const current = progress[gameKey] || { currentLevel: 1, unlocked: 1, completed: [], stars: 0 };
    const isFirstCompletion = !current.completed.includes(levelNumber);
    const completed = [...current.completed, levelNumber].sort((a, b) => a - b);
    const gameStars = (Number(current.stars) || 0) + (isFirstCompletion ? Math.floor(starsAwarded) : 0);

    // تحديث currentLevel تلقائيًا بدون الاعتماد على updates
    const autoCurrentLevel = Math.max(
      Number(current.currentLevel) || 1,
      Math.min(levelNumber + 1, game.levels)
    );

    const gameProgress = {
      ...current,
      ...updates,
      currentLevel: updates.currentLevel ?? autoCurrentLevel,
      completed,
      stars: gameStars
    };

    // حساب إجمالي النجوم بشكل صريح
    let totalGameStars = 0;
    gameCatalog.forEach(item => {
      if (item.key === gameKey) {
        totalGameStars += gameStars;
      } else {
        totalGameStars += Number(progress[item.key]?.stars) || 0;
      }
    });

    const nextProgress = {
      ...progress,
      [gameKey]: gameProgress,
      stars: (Number(progress.unattributedStars) || 0) + totalGameStars
    };

    saveProgress(nextProgress);
    renderGameHeader(gameKey);
    return { progress: nextProgress, gameProgress, gameStars, totalStars: nextProgress.stars, isFirstCompletion };
  }

  function getUnlockedLevel(gameKey, progress = readProgress()) {
    const game = gameCatalog.find(item => item.key === gameKey);
    if (!game) throw new RangeError(`Unknown game key: ${gameKey}`);

    const user = window.KidsGamesAuth?.getCurrentUser?.();
    if (user?.role === 'admin') return game.levels;

    const completed = new Set(
      (Array.isArray(progress[gameKey]?.completed) ? progress[gameKey].completed : [])
        .map(Number)
        .filter(level => Number.isInteger(level) && level >= 1 && level <= game.levels)
    );
    let unlocked = 1;
    while (unlocked < game.levels && completed.has(unlocked)) unlocked += 1;
    return unlocked;
  }

  function renderLevelSelector(gameKey, container, currentLevel, onSelect, disabled = false) {
    const game = gameCatalog.find(item => item.key === gameKey);
    if (!game) throw new RangeError(`Unknown game key: ${gameKey}`);
    if (!(container instanceof HTMLElement)) throw new TypeError('A level selector container is required.');
    if (typeof onSelect !== 'function') throw new TypeError('A level selection callback is required.');

    const progress = readProgress();
    const unlocked = getUnlockedLevel(gameKey, progress);
    const completed = new Set(progress[gameKey]?.completed || []);
    const heading = document.createElement('span');
    heading.className = 'game-level-selector-title';
    heading.textContent = gameKey === 'code-park' ? 'المهام' : 'المستويات';
    heading.setAttribute('aria-hidden', 'true');

    const items = document.createElement('div');
    items.className = 'game-level-selector-items';
    for (let level = 1; level <= game.levels; level += 1) {
      const button = document.createElement('button');
      const isComplete = completed.has(level);
      const isUnlocked = level <= unlocked;
      button.type = 'button';
      button.className = 'game-level-choice';
      button.textContent = String(level);
      button.setAttribute('aria-label', `المستوى ${level}${isComplete ? '، مكتمل' : isUnlocked ? '' : '، مقفول'}`);
      button.setAttribute('aria-current', level === currentLevel ? 'step' : 'false');
      button.disabled = disabled || !isUnlocked;
      if (isComplete) button.classList.add('complete');
      if (!isUnlocked) button.classList.add('locked');
      button.addEventListener('click', () => onSelect(level - 1));
      items.appendChild(button);
    }

    container.classList.add('game-level-selector');
    container.replaceChildren(heading, items);
  }
    function getCompletedLevelCount(progress = readProgress()) {
    return gameCatalog.reduce((total, game) => {
      const completed = new Set(
        (Array.isArray(progress[game.key]?.completed) ? progress[game.key].completed : [])
          .map(Number)
          .filter(level => Number.isInteger(level) && level >= 1 && level <= game.levels)
      );
      return total + completed.size;
    }, 0);
  }

  function getLessonSettings() {
    return { ...lessonSettingsCache };
  }

  function saveLessonSettings(settings) {
    const maximum = gameCatalog.reduce((total, game) => total + game.levels, 0);
    const normalized = {};
    lessonCatalog.forEach(lesson => {
      const unlockAt = Number(settings[lesson.key]);
      if (!Number.isInteger(unlockAt) || unlockAt < 0 || unlockAt > maximum) {
        throw new RangeError(`Unlock level for ${lesson.key} must be between 0 and ${maximum}.`);
      }
      normalized[lesson.key] = unlockAt;
    });
    lessonSettingsCache = normalized;
    return normalized;
  }

  function normalizeGameSettings(settings) {
    const source = settings && typeof settings === 'object'
      ? (settings.availability && typeof settings.availability === 'object' ? settings.availability : settings)
      : settings;
    const rawLockedGames = Array.isArray(source)
      ? source
      : Array.isArray(source?.lockedGames)
        ? source.lockedGames
        : Array.isArray(source?.games)
          ? source.games
          : [];
    const validKeys = new Set(gameCatalog.map(game => game.key));
    const lockedGames = [...new Set(rawLockedGames.filter(key => typeof key === 'string' && validKeys.has(key)))];
    if (rawLockedGames.some(key => typeof key !== 'string' || !validKeys.has(key))) {
      console.warn('Ignoring unknown or invalid game availability entries.', rawLockedGames);
    }
    return { lockedGames };
  }

  function getGameSettings() {
    return { lockedGames: [...gameSettingsCache.lockedGames] };
  }

  function saveGameSettings(settings) {
    const normalized = normalizeGameSettings(settings);
    gameSettingsCache = normalized;
    return normalized;
  }

  async function getEffectiveGameSettings() {
    const cloud = await window.KidsGamesCloudReady;
    if (!cloud?.enabled) throw new Error('تعذر الاتصال بإعدادات Firebase.');
    const settings = await cloud.getGameSettings();
    if (settings) saveGameSettings(settings);
    return getGameSettings();
  }

  function renderGameHeader(gameKey, levelNumber) {
    const gameProgress = readProgress()[gameKey];
    const starsElement = document.querySelector('[data-game-stars]');
    const levelElement = document.querySelector('[data-game-level]');
    if (starsElement) starsElement.textContent = String(gameProgress?.stars || 0);
    if (levelElement && levelNumber !== undefined) levelElement.textContent = String(levelNumber);
    const nextButton = document.querySelector('[data-game-next]');
    if (nextButton && levelNumber !== undefined) {
      const unlocked = getUnlockedLevel(gameKey);
      const game = gameCatalog.find(item => item.key === gameKey);
      const canAdvance = Boolean(game && levelNumber < unlocked && levelNumber < game.levels);
      nextButton.hidden = !canAdvance;
      nextButton.disabled = !canAdvance;
    }
  }

  let victoryTimeout;

  function hideLevelVictory() {
    clearTimeout(victoryTimeout);
    document.querySelector('.level-victory')?.remove();
  }

  function showLevelVictory(levelNumber, starsAwarded, isFirstCompletion = true) {
    hideLevelVictory();

    const overlay = document.createElement('div');
    overlay.className = 'level-victory';
    overlay.setAttribute('role', 'status');
    overlay.setAttribute('aria-live', 'assertive');

    const card = document.createElement('section');
    card.className = 'level-victory-card';
    const title = document.createElement('h2');
    title.textContent = 'أحسنت! فزت بالمستوى';
    const level = document.createElement('p');
    level.className = 'level-victory-level';
    level.textContent = `المستوى ${levelNumber}`;
    const stars = document.createElement('div');
    stars.className = 'level-victory-stars';
    stars.setAttribute('aria-label', isFirstCompletion ? `ربحت ${starsAwarded} نجوم` : 'أعدت المستوى بنجاح');

    for (let index = 0; index < 3; index += 1) {
      const star = document.createElement('span');
      star.textContent = '★';
      star.classList.toggle('earned', isFirstCompletion && index < starsAwarded);
      stars.appendChild(star);
    }

    const message = document.createElement('p');
    message.className = 'level-victory-message';
    message.textContent = isFirstCompletion
      ? `ربحت ${starsAwarded} ${starsAwarded === 1 ? 'نجمة' : 'نجوم'}!`
      : 'أعدت المستوى بنجاح!';

    card.append(title, level, stars, message);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    victoryTimeout = window.setTimeout(hideLevelVictory, 1500);
  }

  // ✅ FIX #3: إضافة تحقق referrer &&
  function goBack(fallbackUrl) {
    const referrer = document.referrer;
    if (referrer && referrer !== window.location.href && referrer.startsWith(`${window.location.origin}/`)) {
      window.history.back();
      return;
    }
    window.location.href = fallbackUrl;
  }

  document.querySelectorAll('[data-go-back]').forEach(button => {
    button.addEventListener('click', () => goBack(button.dataset.goBack));
  });

  window.KidsGames = {
    STORAGE_KEYS,
    gameCatalog,
    lessonCatalog,
    defaultState,
    readProgress,
    saveProgress,
    setGameProgress,
    addStars,
    completeGameLevel,
    getUnlockedLevel,
    renderLevelSelector,
    getCompletedLevelCount,
    getLessonSettings,
    saveLessonSettings,
    getGameSettings,
    saveGameSettings,
    getEffectiveGameSettings,
    renderGameHeader,
    showLevelVictory,
    hideLevelVictory,
    goBack
  };
    const manifestLink = document.querySelector('link[rel="manifest"]');
  if (!manifestLink) {
    const link = document.createElement('link');
    link.rel = 'manifest';
    link.href = new URL('manifest.webmanifest', APP_BASE_URL).href;
    document.head.appendChild(link);
  }

  const themeColor = document.querySelector('meta[name="theme-color"]');
  if (!themeColor) {
    const meta = document.createElement('meta');
    meta.name = 'theme-color';
    meta.content = '#176b63';
    document.head.appendChild(meta);
  }

  if ('serviceWorker' in navigator) {
    const hadControllerOnLoad = Boolean(navigator.serviceWorker.controller);
    const dirtyForms = new Set();
    const formSnapshots = new WeakMap();
    let updateReloadStarted = false;
    let updateReloadPending = false;
    let serviceWorkerRegistration = null;
    const updateCheckInterval = 5 * 60 * 1000;
    const updateCheckStorageKey = STORAGE_KEYS.serviceWorkerUpdateCheck;

    function snapshotForm(form) {
      return Array.from(form.elements).map(control => ({
        control,
        value: control.value,
        checked: 'checked' in control ? control.checked : null
      }));
    }

    function formHasUnsavedChanges(form) {
      const snapshot = formSnapshots.get(form);
      if (!snapshot) return dirtyForms.has(form);
      return snapshot.some(({ control, value, checked }) =>
        control.value !== value || (checked !== null && control.checked !== checked)
      );
    }

    function rememberFormState(event) {
      const form = event.target.closest?.('form');
      if (!form || formSnapshots.has(form)) return;
      formSnapshots.set(form, snapshotForm(form));
    }

    function trackFormChanges(event) {
      const form = event.target.form;
      if (!form) return;
      if (!formSnapshots.has(form)) {
        dirtyForms.add(form);
      } else if (formHasUnsavedChanges(form)) {
        dirtyForms.add(form);
      } else {
        dirtyForms.delete(form);
      }
      if (updateReloadPending) reloadForServiceWorkerUpdate();
    }

    function hasUnsavedFormChanges() {
      return [...dirtyForms].some(form => form.isConnected && formHasUnsavedChanges(form))
        || Array.from(document.forms).some(form =>
          form.querySelector('button[type="submit"]:disabled, input[type="submit"]:disabled')
        );
    }

    function reloadForServiceWorkerUpdate() {
      if (!hadControllerOnLoad || updateReloadStarted) return;
      if (hasUnsavedFormChanges()) {
        updateReloadPending = true;
        showAppUpdateNotice();
        return;
      }
      updateReloadPending = false;
      updateReloadStarted = true;
      window.location.reload();
    }

    async function checkForServiceWorkerUpdate() {
      if (!serviceWorkerRegistration) return;

      let lastCheck = 0;
      try {
        lastCheck = Number(sessionStorage.getItem(updateCheckStorageKey)) || 0;
      } catch (error) {
        console.error('Unable to read the service worker update-check time:', error);
      }
      if (Date.now() - lastCheck < updateCheckInterval) return;

      try {
        sessionStorage.setItem(updateCheckStorageKey, String(Date.now()));
      } catch (error) {
        console.error('Unable to save the service worker update-check time:', error);
      }
      await serviceWorkerRegistration.update();
    }

    document.addEventListener('focusin', rememberFormState, true);
    document.addEventListener('pointerdown', rememberFormState, true);
    document.addEventListener('input', trackFormChanges, true);
    document.addEventListener('change', trackFormChanges, true);
    document.addEventListener('reset', event => {
      const form = event.target;
      window.setTimeout(() => {
        dirtyForms.delete(form);
        formSnapshots.delete(form);
        if (updateReloadPending) reloadForServiceWorkerUpdate();
      });
    }, true);

    const updateSubmissionObserver = new MutationObserver(() => {
      if (updateReloadPending) reloadForServiceWorkerUpdate();
    });
    updateSubmissionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['disabled'],
      subtree: true
    });

    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'APP_UPDATE_AVAILABLE' && hadControllerOnLoad) {
        showAppUpdateNotice(event.data.version);
      }
    });
    navigator.serviceWorker.addEventListener('controllerchange', reloadForServiceWorkerUpdate);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !serviceWorkerRegistration) return;
      checkForServiceWorkerUpdate().catch(error => {
        console.error('Unable to check for a service worker update:', error);
      });
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(new URL('sw.js', APP_BASE_URL).href, { updateViaCache: 'none' })
        .then(registration => {
          serviceWorkerRegistration = registration;
          return checkForServiceWorkerUpdate();
        })
        .catch(error => console.error('Unable to register or update the app service worker:', error));
    });

    function showAppUpdateNotice(version) {
      if (document.querySelector('.app-update-notice')) return;

      const notice = document.createElement('aside');
      notice.className = 'app-update-notice';
      notice.setAttribute('role', 'status');
      notice.setAttribute('aria-live', 'polite');

      const message = document.createElement('span');
      message.textContent = version ? `تحديث متاح (${version})` : 'تحديث متاح';

      const reloadButton = document.createElement('button');
      reloadButton.type = 'button';
      reloadButton.textContent = 'تحديث الآن';
      reloadButton.addEventListener('click', () => {
        if (hasUnsavedFormChanges()
          && !window.confirm('قد تفقد التعديلات غير المحفوظة في النموذج. هل تريد التحديث الآن؟')) {
          return;
        }
        window.location.reload();
      });

      const dismissButton = document.createElement('button');
      dismissButton.type = 'button';
      dismissButton.className = 'app-update-dismiss';
      dismissButton.textContent = 'لاحقًا';
      dismissButton.addEventListener('click', () => notice.remove());

      notice.append(message, reloadButton, dismissButton);
      document.body.appendChild(notice);
    }
  }

  const installPrompts = [...document.querySelectorAll('.app-install-prompt')];
  let installEvent = null;
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isEmbeddedBrowser = /Electron|Code\//i.test(navigator.userAgent);
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

  if (isInstalled) {
    installPrompts.forEach(prompt => { prompt.hidden = true; });
  } else {
    window.addEventListener('beforeinstallprompt', event => {
      event.preventDefault();
      installEvent = event;
    });

    window.addEventListener('appinstalled', () => {
      installPrompts.forEach(prompt => { prompt.hidden = true; });
    });

    installPrompts.forEach(prompt => {
      const button = prompt.querySelector('[data-install-app]');
      const help = prompt.querySelector('[data-install-help]');
      if (!button || !help) return;

      button.addEventListener('click', async () => {
        if (!window.isSecureContext) {
          help.textContent = 'لتثبيت التطبيق، افتح الموقع من اتصال آمن يبدأ بـ HTTPS.';
          help.hidden = false;
          return;
        }

        if (!installEvent) {
          help.textContent = isIOS
            ? 'في Safari اضغط «مشاركة» ثم «إضافة إلى الشاشة الرئيسية».'
            : isEmbeddedBrowser
              ? 'للتثبيت المباشر، افتح رابط الموقع في Chrome أو Edge؛ عارض VS Code لا يدعم نافذة التثبيت.'
              : 'افتح قائمة المتصفح ⋮ ثم اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية».';
          help.hidden = false;
          return;
        }

        const promptEvent = installEvent;
        installEvent = null;
        try {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice.outcome === 'accepted') {
            prompt.hidden = true;
          } else {
            help.textContent = 'يمكنك تثبيت التطبيق في أي وقت من قائمة المتصفح.';
            help.hidden = false;
          }
        } catch (error) {
          console.error('Unable to show the app install prompt:', error);
          help.textContent = 'تعذر فتح نافذة التثبيت. جرّب اختيار «تثبيت التطبيق» من قائمة المتصفح.';
          help.hidden = false;
        }
      });
    });
  }

  const ROLE_PERMISSIONS = {
    admin: ['dashboard', 'manageUsers', 'viewProgress', 'manageChildren', 'playGames', 'viewAchievements', 'viewLessons', 'manageLessons'],
    parent: ['viewProgress', 'manageChildren', 'playGames', 'viewAchievements'],
    child: ['playGames', 'viewAchievements', 'viewLessons'],
    teacher: ['manageLessons', 'viewProgress', 'playGames']
  };
  const isValidRole = role => Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role);
  let currentUserCache = null;

  function normalizeUser(user) {
    return {
      id: user.id,
      username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
      email: user.email || '',
      fullName: user.fullName || user.username || 'مستخدم',
      role: isValidRole(user.role) ? user.role : 'child',
      avatar: ['child', 'girl', 'engineer'].includes(user.avatar) ? user.avatar : 'child',
      provider: user.provider || 'local',
      status: user.status === 'inactive' ? 'inactive' : 'active'
    };
  }

  function getCurrentUser() {
    return currentUserCache ? { ...currentUserCache } : null;
  }

  function setCurrentUser(user) {
    currentUserCache = user ? normalizeUser(user) : null;
    return getCurrentUser();
  }

  function logoutUser() {
    currentUserCache = null;
    currentProgress = cloneState(defaultState);
    lastSavedProgress = cloneState(defaultState);
    return true;
  }

  function canAccess(permission, user = getCurrentUser()) {
    const currentUser = normalizeUser(user || {});
    const permissions = isValidRole(currentUser.role) ? ROLE_PERMISSIONS[currentUser.role] : [];
    return permissions.includes(permission);
  }

  window.KidsGamesAuth = {
    ROLE_PERMISSIONS,
    getCurrentUser,
    setCurrentUser,
    logoutUser,
    canAccess
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`تعذر تحميل ${src}`));
      document.head.appendChild(script);
    });
  }

  function normalizeMaintenanceSettings(settings) {
    const value = settings && typeof settings === 'object' ? settings : {};
    return {
      enabled: value.enabled === true,
      message: typeof value.message === 'string' ? value.message : '',
      expectedTime: typeof value.expectedTime === 'string' ? value.expectedTime : ''
    };
  }

  async function initializeCloud() {
    try {
      const response = await fetch(new URL('firebase-config.json', APP_BASE_URL), { cache: 'no-store' });
      if (!response.ok) throw new Error(`Firebase configuration request failed: ${response.status} ${response.statusText}`);
      const config = await response.json();
      const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
      if (requiredKeys.some(key => !config[key] || String(config[key]).startsWith('YOUR_'))) {
        throw new Error('Firebase configuration is incomplete.');
      }

      const version = '10.12.5';
      await loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-app-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-auth-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-functions-compat.js`);

      const firebase = window.firebase;
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      const auth = app.auth();
      const database = app.firestore();
      const functions = app.functions('us-central1');
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      let userProgressUnsubscribe = null;

      function setProgressFromCloud(progress) {
        currentProgress = normalizeProgress(progress || {});
        lastSavedProgress = cloneState(currentProgress);
      }

      async function syncAccount(firebaseUser) {
        const userRef = database.collection('users').doc(firebaseUser.uid);
        const snapshot = await userRef.get();
        if (!snapshot.exists) {
          throw new Error('تعذر العثور على ملف المستخدم في Firestore.');
        }
        const cloudData = snapshot.data();
        if (cloudData.status === 'inactive') {
          await auth.signOut();
          setCurrentUser(null);
          throw new Error('هذا الحساب غير نشط.');
        }

        const provider = firebaseUser.providerData.some(item => item.providerId === 'google.com') ? 'google' : 'local';
        const role = isValidRole(cloudData.role) ? cloudData.role : 'child';
        const user = normalizeUser({
          id: firebaseUser.uid,
          username: cloudData.username || (firebaseUser.email || '').split('@')[0],
          email: firebaseUser.email || '',
          fullName: cloudData.fullName || firebaseUser.displayName || cloudData.username || firebaseUser.email || 'مستخدم',
          role,
          avatar: cloudData.avatar || 'child',
          provider,
          status: 'active'
        });
        const progress = normalizeProgress(cloudData.progress || {});
        setCurrentUser(user);
        setProgressFromCloud(progress);
        userProgressUnsubscribe?.();
        userProgressUnsubscribe = userRef.onSnapshot(snapshot => {
          if (!snapshot.exists || getCurrentUser()?.id !== firebaseUser.uid) return;
          setProgressFromCloud(snapshot.data().progress || {});
        }, error => {
          console.error('Unable to synchronize progress from Firestore:', error);
          window.dispatchEvent(new CustomEvent('kids-games-save-error', {
            detail: { message: 'تعذر مزامنة التقدم مع Firebase. تحقق من الاتصال ثم أعد تحميل الصفحة.' }
          }));
        });
        return user;
      }

      async function readSettings() {
        if (!auth.currentUser) return;
        const [lessons, games] = await Promise.all([
          database.collection('settings').doc('lessons').get(),
          database.collection('settings').doc('games').get()
        ]);
        if (lessons.exists) {
          const saved = lessons.data().unlockAt || {};
          lessonSettingsCache = Object.fromEntries(lessonCatalog.map(lesson => {
            const unlockAt = Number(saved[lesson.key]);
            return [lesson.key, Number.isInteger(unlockAt) && unlockAt >= 0 ? unlockAt : lesson.unlockAt];
          }));
        }
        if (games.exists) gameSettingsCache = normalizeGameSettings(games.data().availability);
      }

      const cloud = {
        enabled: true,
        projectId: config.projectId,
        async syncAuthenticatedUser(firebaseUser) {
          const user = await syncAccount(firebaseUser);
          await readSettings();
          return user;
        },
        getCurrentUserId() {
          return auth.currentUser?.uid || null;
        },
        async listAccounts() {
          const snapshot = await database.collection('users').get();
          return snapshot.docs.map(document => {
            const account = document.data();
            return {
              ...account,
              id: document.id,
              uid: document.id
            };
          });
        },
        async createManagedAccount(account) {
          const result = await functions.httpsCallable('createAccount')({
            username: account.username,
            password: account.password,
            role: account.role
          });
          return result.data;
        },
        async updateAccount(account) {
          const result = await functions.httpsCallable('updateAccount')(account);
          return result.data;
        },
        async deleteAccount(account) {
          return (await functions.httpsCallable('deleteAccount')(account)).data;
        },
        async updateOwnProfile({ fullName, avatar, currentCredential = '', newCredential = '' }) {
          const result = await functions.httpsCallable('updateOwnProfile')({ fullName, avatar, currentCredential, newCredential });
          const current = getCurrentUser();
          setCurrentUser({ ...current, ...result.data });
          return getCurrentUser();
        },
        async getLessonSettings() {
          const snapshot = await database.collection('settings').doc('lessons').get();
          if (!snapshot.exists) return null;
          return snapshot.data().unlockAt || null;
        },
        async saveLessonSettings(unlockAt) {
          await database.collection('settings').doc('lessons').set({ unlockAt, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
          lessonSettingsCache = { ...unlockAt };
          return unlockAt;
        },
        async getGameSettings() {
          const snapshot = await database.collection('settings').doc('games').get();
          if (!snapshot.exists) return null;
          return snapshot.data().availability || null;
        },
        async saveGameSettings(availability) {
          await database.collection('settings').doc('games').set({ availability, updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
          gameSettingsCache = normalizeGameSettings(availability);
          return getGameSettings();
        },
        async getMaintenanceMode() {
          const snapshot = await database.collection('settings').doc('site').get();
          return snapshot.exists ? normalizeMaintenanceSettings(snapshot.data().maintenance) : normalizeMaintenanceSettings();
        },
        async saveMaintenanceMode(enabled, message, expectedTime) {
          const maintenance = normalizeMaintenanceSettings({ enabled, message, expectedTime });
          if (maintenance.message.length > 500 || maintenance.expectedTime.length > 80) {
            throw new RangeError('رسالة الصيانة أو وقت العودة أطول من المسموح.');
          }
          await database.collection('settings').doc('site').set({ maintenance, updatedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
          return maintenance;
        },
        subscribeMaintenanceMode(onChange, onError) {
          return database.collection('settings').doc('site').onSnapshot(snapshot => {
            onChange(snapshot.exists ? normalizeMaintenanceSettings(snapshot.data().maintenance) : normalizeMaintenanceSettings());
          }, onError);
        },
        async signOut() {
          await auth.signOut();
          logoutUser();
        },
        async saveProgress(progress) {
          const user = getCurrentUser();
          if (!auth.currentUser || !user || auth.currentUser.uid !== user.id) {
            throw new Error('سجّل الدخول إلى حساب Firebase قبل حفظ التقدم.');
          }
          const userRef = database.collection('users').doc(user.id);
          let savedProgress;
          await database.runTransaction(async transaction => {
            const snapshot = await transaction.get(userRef);
            if (!snapshot.exists || snapshot.data().status !== 'active') {
              throw new Error('تعذر العثور على ملف Firebase النشط لهذا الحساب.');
            }
            savedProgress = mergeProgress(snapshot.data().progress || {}, progress);
            transaction.set(userRef, {
              progress: savedProgress,
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          });
          setProgressFromCloud(savedProgress);
          return true;
        }
      };
      window.KidsGamesCloud = cloud;

      await new Promise((resolve, reject) => {
        let initialState = true;
        auth.onAuthStateChanged(async firebaseUser => {
          try {
            if (firebaseUser) {
              await syncAccount(firebaseUser);
              await readSettings();
            } else {
              userProgressUnsubscribe?.();
              userProgressUnsubscribe = null;
              setCurrentUser(null);
              currentProgress = cloneState(defaultState);
            }
            if (initialState) {
              initialState = false;
              resolve();
            }
          } catch (error) {
            if (initialState) {
              initialState = false;
              reject(error);
            } else {
              console.error('Unable to synchronize Firebase account state:', error);
            }
          }
        }, error => {
          if (initialState) {
            initialState = false;
            reject(error);
          } else {
            console.error('Firebase authentication state listener failed:', error);
          }
        });
      });
      return cloud;
    } catch (error) {
      console.error('Firebase initialization failed:', error);
      return { enabled: false, reason: 'firebase-unavailable', error };
    }
  }

  let resolveCloudReady;
  window.KidsGamesCloudReady = new Promise(resolve => {
    resolveCloudReady = resolve;
  });

  function scheduleCloudInitialization() {
    const initializeWhenIdle = () => {
      initializeCloud().then(resolveCloudReady).catch(error => {
        console.error('Cloud init failed:', error);
        resolveCloudReady({ enabled: false, reason: 'cloud-error' });
      });
    };

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(initializeWhenIdle, { timeout: 2000 });
    } else {
      window.setTimeout(initializeWhenIdle, 0);
    }
  }

  scheduleCloudInitialization();

  function isAdminPage() {
    return /\/pages\/admin(?:\/|$)/i.test(window.location.pathname);
  }

  function isAuthPage() {
    return /\/pages\/auth(?:\/|$)/i.test(window.location.pathname);
  }

  function showAccessScreen(title, message, { maintenance = false, expectedTime = '' } = {}) {
    let screen = document.getElementById('kids-games-access-screen');
    if (!screen) {
      screen = document.createElement('section');
      screen.id = 'kids-games-access-screen';
      screen.setAttribute('role', 'alert');
      screen.setAttribute('aria-live', 'assertive');
      Object.assign(screen.style, {
        position: 'fixed',
        inset: '0',
        zIndex: '2147483647',
        display: 'grid',
        placeItems: 'center',
        padding: '24px',
        background: 'linear-gradient(145deg, #102339, #173f51)',
        color: '#fff',
        font: '700 1rem/1.8 system-ui, sans-serif',
        textAlign: 'center',
        direction: 'rtl'
      });
      document.body.appendChild(screen);
    }
    const card = document.createElement('main');
    Object.assign(card.style, { width: 'min(100%, 540px)', padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,.1)' });
    const icon = document.createElement('div');
    icon.style.fontSize = '3rem';
    icon.textContent = maintenance ? '🛠️' : '⚙️';
    const heading = document.createElement('h1');
    heading.textContent = title;
    const details = document.createElement('p');
    details.textContent = message;
    card.append(icon, heading, details);
    if (expectedTime) {
      const time = document.createElement('p');
      const date = new Date(expectedTime);
      const displayTime = Number.isNaN(date.valueOf())
        ? expectedTime
        : new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      time.textContent = `وقت العودة المتوقع: ${displayTime}`;
      card.appendChild(time);
    }
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.textContent = 'تحديث';
    Object.assign(refresh.style, { padding: '12px 24px', border: '0', borderRadius: '12px', cursor: 'pointer', font: 'inherit' });
    refresh.addEventListener('click', () => window.location.reload());
    card.appendChild(refresh);
    screen.replaceChildren(card);
    return screen;
  }

  window.addEventListener('kids-games-save-error', event => {
    showAccessScreen('تعذر حفظ تقدمك', event.detail?.message || 'تعذر حفظ البيانات في Firebase. تحقق من الاتصال ثم أعد تحميل الصفحة؛ لن تُحفظ هذه البيانات محليًا.');
  });

  if (!isAdminPage() && !isAuthPage()) {
    const loadingScreen = showAccessScreen('جارٍ التحقق من اتصال Firebase', 'يتم تحميل حسابك وبياناتك السحابية بأمان.');
    window.KidsGamesCloudReady.then(async cloud => {
      if (!cloud?.enabled) {
        showAccessScreen('تعذر الاتصال بـ Firebase', 'لم يتم تحميل بياناتك أو حفظها محليًا. تحقق من الاتصال ثم أعد المحاولة.');
        return;
      }
      const user = getCurrentUser();
      const authUrl = new URL('pages/auth/index.html', APP_BASE_URL).href;
      const applyMaintenance = maintenance => {
        if (maintenance.enabled && user?.role !== 'admin') {
          showAccessScreen(
            'الموقع تحت الصيانة مؤقتًا',
            maintenance.message || 'نعمل على تحسين الموقع. يرجى العودة بعد قليل.',
            { maintenance: true, expectedTime: maintenance.expectedTime }
          );
        } else if (!user) {
          window.location.replace(authUrl);
        } else {
          document.getElementById('kids-games-access-screen')?.remove();
        }
      };
      const maintenance = await cloud.getMaintenanceMode();
      if (!user && !maintenance.enabled) {
        window.location.replace(authUrl);
        return;
      }
      applyMaintenance(maintenance);
      cloud.subscribeMaintenanceMode(applyMaintenance, error => {
        console.error('Unable to monitor site maintenance state:', error);
        showAccessScreen('تعذر التحقق من حالة الموقع', 'تعذر تحميل حالة الصيانة من Firebase. أعد المحاولة بعد التحقق من الاتصال.');
      });
      if (!user) return;

      const currentGame = gameCatalog.find(game =>
        new URL(game.href).pathname.replace(/\/+$/, '').toLowerCase() ===
        window.location.pathname.replace(/\/+$/, '').toLowerCase()
      );
      if (currentGame && user.role !== 'admin') {
        const settings = await getEffectiveGameSettings();
        if (settings.lockedGames.includes(currentGame.key)) {
          const maintenanceUrl = new URL('pages/games/maintenance.html', APP_BASE_URL);
          maintenanceUrl.searchParams.set('game', currentGame.key);
          window.location.replace(maintenanceUrl.href);
          return;
        }
      }
    }).catch(error => {
      console.error('Unable to initialize app access checks:', error);
      showAccessScreen('تعذر الاتصال بـ Firebase', 'لم يتم تحميل بياناتك. أعد المحاولة بعد التحقق من الاتصال.');
    });
  }
})();
