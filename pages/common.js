(function () {
  const DEV_MODE = true;
  const APP_BASE_URL = new URL('../', document.currentScript.src);
  const STORAGE_KEYS = Object.freeze({
    progress: 'kids_games_progress_v1',
    progressForUser: userId => `${STORAGE_KEYS.progress}_${userId}`,
    lessonSettings: 'kids_games_lesson_unlocks_v1',
    gameSettings: 'kids_games_availability_v1',
    authSession: 'kids_games_current_user_v1',
    users: 'kids_games_users_v1',
    siteNavHidden: 'kids_games_site_nav_hidden',
    fullSyncAt: 'kids_games_full_sync_at_v1',
    partialSyncAt: 'kids_games_partial_sync_at_v1',
    serviceWorkerUpdateCheck: 'kids_games_sw_update_check_v1',
    cloudSyncReload: userId => `kids_games_cloud_sync_${userId}`,
    legacyAdminBackups: ['oldAdmin', 'adminBackup']
  });

  // ✅ FIX #5: uuid helper مع fallback للمتصفحات القديمة
  function uuid() {
    return (window.crypto && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

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

  function progressStorageKey() {
    const user = window.KidsGamesAuth?.getCurrentUser?.();
    return user?.id ? STORAGE_KEYS.progressForUser(user.id) : STORAGE_KEYS.progress;
  }

  // ✅ FIX #6: معالجة QuotaExceededError
  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error('LocalStorage write failed:', error);
      return false;
    }
  }

  function readProgress() {
    try {
      const key = progressStorageKey();
      let raw = localStorage.getItem(key);
      if (!raw && key !== STORAGE_KEYS.progress) {
        raw = localStorage.getItem(STORAGE_KEYS.progress);
        if (raw) {
          if (safeSetItem(key, raw)) {
            localStorage.removeItem(STORAGE_KEYS.progress);
          }
        }
      }
      if (!raw) return cloneState(defaultState);
      const parsed = JSON.parse(raw);
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
    } catch (error) {
      console.error('Unable to read saved game progress:', error);
      return cloneState(defaultState);
    }
  }

  let cloudSyncQueue = Promise.resolve();
  let cloudProgressSyncInterval = null;

  function stopCloudProgressSync() {
    if (cloudProgressSyncInterval === null) return;
    window.clearInterval(cloudProgressSyncInterval);
    cloudProgressSyncInterval = null;
  }

  function syncCloudProgress(progress = readProgress(), recordFullSync = false) {
    if (isLocalOnlySession()) return Promise.resolve(false);
    const write = cloudSyncQueue.then(async () => {
      const cloud = await window.KidsGamesCloudReady;
      if (!cloud?.enabled || typeof cloud.saveProgress !== 'function') return false;
      if (!cloud.isCurrentUserLinked?.()) return false;
      const saved = await cloud.saveProgress(readProgress() || progress);
      if (!saved) return false;
      if (saved && recordFullSync) {
        safeSetItem(STORAGE_KEYS.fullSyncAt, new Date().toISOString());
        window.dispatchEvent(new Event('kids-games-full-sync'));
      }
      return saved;
    });
    cloudSyncQueue = write.catch(error => {
      console.error('Firebase progress synchronization failed:', error);
    });
    return write;
  }

  function startCloudProgressSync() {
    if (cloudProgressSyncInterval !== null) return;
    syncCloudProgress(readProgress(), true).catch(error => {
      console.error('Initial cloud progress synchronization failed:', error);
    });
    cloudProgressSyncInterval = window.setInterval(() => {
      syncCloudProgress(readProgress(), true).catch(error => {
        console.error('Scheduled cloud progress synchronization failed:', error);
      });
    }, 5 * 60 * 1000);
  }

  async function syncCloudNow() {
    if (isLocalOnlySession()) return false;
    const cloud = await window.KidsGamesCloudReady;
    if (!cloud?.enabled || typeof cloud.saveProgress !== 'function' || !cloud.isCurrentUserLinked?.()) {
      throw new Error('Firebase is unavailable; local progress is still saved.');
    }
    const synced = await syncCloudProgress(readProgress(), true);
    if (!synced) throw new Error('Cloud synchronization did not complete.');
    return true;
  }

  function saveProgress(nextState) {
    safeSetItem(progressStorageKey(), JSON.stringify(nextState));
    safeSetItem(STORAGE_KEYS.partialSyncAt, new Date().toISOString());
    window.dispatchEvent(new Event('kids-games-partial-sync'));
    syncCloudProgress(nextState).catch(error => {
      console.error('Progress remains saved locally; cloud synchronization will retry:', error);
    });
    return nextState;
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
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.lessonSettings) || '{}');
      return Object.fromEntries(lessonCatalog.map(lesson => {
        const unlockAt = Number(saved[lesson.key]);
        return [lesson.key, Number.isInteger(unlockAt) && unlockAt >= 0 ? unlockAt : lesson.unlockAt];
      }));
    } catch (error) {
      console.error('Unable to read lesson unlock settings:', error);
      return Object.fromEntries(lessonCatalog.map(lesson => [lesson.key, lesson.unlockAt]));
    }
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
    if (!safeSetItem(STORAGE_KEYS.lessonSettings, JSON.stringify(normalized))) {
      throw new Error('Unable to save lesson settings on this device.');
    }
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
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.gameSettings);
      if (!saved) return { lockedGames: [] };
      const parsed = JSON.parse(saved);
      return normalizeGameSettings(parsed);
    } catch (error) {
      console.error('Unable to read game availability settings:', error);
      return { lockedGames: [] };
    }
  }

  function saveGameSettings(settings) {
    const normalized = normalizeGameSettings(settings);
    if (!safeSetItem(STORAGE_KEYS.gameSettings, JSON.stringify(normalized))) {
      throw new Error('Unable to save game availability settings on this device.');
    }
    return normalized;
  }

  async function getEffectiveGameSettings() {
    if (isLocalOnlySession()) return getGameSettings();
    const cloud = await window.KidsGamesCloudReady;
    if (!cloud.enabled || !cloud.isCurrentUserLinked?.()) return getGameSettings();
    try {
      const savedSettings = await cloud.getGameSettings();
      return savedSettings ? saveGameSettings(savedSettings) : getGameSettings();
    } catch (error) {
      console.error('Unable to load cloud game settings; using this device copy:', error);
      return getGameSettings();
    }
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
    STORAGE_KEY: STORAGE_KEYS.progress,
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
    syncCloud: syncCloudNow,
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
    let allowReloadWithUnsaved = false;
    let automaticUpdateTimer = null;
    let serviceWorkerRegistration = null;
    const updateCheckInterval = 5 * 60 * 1000;
    const automaticUpdateDelay = 60 * 1000;
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
      if (updateReloadPending) {
        if (serviceWorkerRegistration?.waiting || serviceWorkerRegistration?.installing) applyWaitingServiceWorker();
        else reloadForServiceWorkerUpdate();
      }
    }

    function hasUnsavedFormChanges() {
      return [...dirtyForms].some(form => form.isConnected && formHasUnsavedChanges(form))
        || Array.from(document.forms).some(form =>
          form.querySelector('button[type="submit"]:disabled, input[type="submit"]:disabled')
        );
    }

    function reloadForServiceWorkerUpdate() {
      if (!hadControllerOnLoad || updateReloadStarted) return;
      if (hasUnsavedFormChanges() && !allowReloadWithUnsaved) {
        updateReloadPending = true;
        showAppUpdateNotice();
        return;
      }
      updateReloadPending = false;
      updateReloadStarted = true;
      window.location.reload();
    }

    function applyWaitingServiceWorker(confirmIfDirty = false) {
      const updateWorker = serviceWorkerRegistration?.waiting || serviceWorkerRegistration?.installing;
      if (!updateWorker) return false;
      if (hasUnsavedFormChanges()) {
        if (confirmIfDirty && !window.confirm('قد تفقد التعديلات غير المحفوظة في النموذج. هل تريد التحديث الآن؟')) {
          return false;
        }
        if (!confirmIfDirty) {
          updateReloadPending = true;
          showAppUpdateNotice();
          return false;
        }
        allowReloadWithUnsaved = true;
      }
      if (automaticUpdateTimer !== null) {
        window.clearTimeout(automaticUpdateTimer);
        automaticUpdateTimer = null;
      }
      updateReloadPending = false;
      updateWorker.postMessage({ type: 'SKIP_WAITING' });
      return true;
    }

    function handleWaitingServiceWorker() {
      if (!serviceWorkerRegistration?.waiting && !serviceWorkerRegistration?.installing) return;
      showAppUpdateNotice();
      if (automaticUpdateTimer !== null) return;
      automaticUpdateTimer = window.setTimeout(() => {
        automaticUpdateTimer = null;
        applyWaitingServiceWorker();
      }, automaticUpdateDelay);
    }

    async function checkForServiceWorkerUpdate(force = false) {
      if (!serviceWorkerRegistration) return;
      if (serviceWorkerRegistration.waiting) {
        handleWaitingServiceWorker();
        return;
      }

      let lastCheck = 0;
      try {
        lastCheck = Number(sessionStorage.getItem(updateCheckStorageKey)) || 0;
      } catch (error) {
        console.error('Unable to read the service worker update-check time:', error);
      }
      if (!force && Date.now() - lastCheck < updateCheckInterval) return;

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
        if (updateReloadPending) {
          if (serviceWorkerRegistration?.waiting || serviceWorkerRegistration?.installing) applyWaitingServiceWorker();
          else reloadForServiceWorkerUpdate();
        }
      });
    }, true);

    const updateSubmissionObserver = new MutationObserver(() => {
      if (updateReloadPending) {
        if (serviceWorkerRegistration?.waiting || serviceWorkerRegistration?.installing) applyWaitingServiceWorker();
        else reloadForServiceWorkerUpdate();
      }
    });
    updateSubmissionObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['disabled'],
      subtree: true
    });

    navigator.serviceWorker.addEventListener('controllerchange', reloadForServiceWorkerUpdate);
    navigator.serviceWorker.addEventListener('message', event => {
      if (event.data?.type === 'APP_UPDATE_AVAILABLE' && hadControllerOnLoad) {
        handleWaitingServiceWorker();
      }
    });

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible' || !serviceWorkerRegistration) return;
      checkForServiceWorkerUpdate(true).catch(error => {
        console.error('Unable to check for a service worker update:', error);
      });
    });

    window.addEventListener('load', () => {
      navigator.serviceWorker.register(new URL('sw.js', APP_BASE_URL).href, { updateViaCache: 'none' })
        .then(registration => {
          serviceWorkerRegistration = registration;
          if (registration.waiting && hadControllerOnLoad) handleWaitingServiceWorker();
          registration.addEventListener('updatefound', () => {
            const installingWorker = registration.installing;
            if (!installingWorker) return;
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'installed' && hadControllerOnLoad) {
                handleWaitingServiceWorker();
              }
            });
          });
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
      message.textContent = `تم إصدار تحديث جديد${version ? ` (${version})` : ''}. من فضلك حدّث التطبيق للحصول على أحدث الميزات.`;

      const reloadButton = document.createElement('button');
      reloadButton.type = 'button';
      reloadButton.textContent = 'تحديث الآن';
      reloadButton.addEventListener('click', () => {
        applyWaitingServiceWorker(true);
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

  const AUTH_STORAGE_KEY = STORAGE_KEYS.authSession;
  const USERS_STORAGE_KEY = STORAGE_KEYS.users;

  const ROLE_PERMISSIONS = {
    admin: [
      'dashboard',
      'manageUsers',
      'viewProgress',
      'manageChildren',
      'playGames',
      'viewAchievements',
      'viewLessons',
      'manageLessons'
    ],
    parent: ['viewProgress', 'manageChildren', 'playGames', 'viewAchievements'],
    child: ['playGames', 'viewAchievements', 'viewLessons'],
    teacher: ['manageLessons', 'viewProgress', 'playGames']
  };
  const isValidRole = role => Object.prototype.hasOwnProperty.call(ROLE_PERMISSIONS, role);

  const localAdmin = {
    id: 'admin-demo',
    username: 'abosama891',
    password: 'vK8!mR4@Qz2#Lp9$Xc7',
    email: 'admin@gmail.com',
    fullName: 'مدير النظام',
    role: 'admin',
    provider: 'local',
    status: 'active'
  };
  const defaultUsers = [
    localAdmin,
    {
      id: 'parent-demo',
      username: 'parent',
      password: 'parent123',
      email: 'parent@gmail.com',
      fullName: 'ولي الأمر',
      role: 'parent',
      provider: 'local',
      status: 'active'
    },
    {
      id: 'child-demo',
      username: 'child',
      password: 'child123',
      email: 'child@gmail.com',
      fullName: 'طفل تجريبي',
      role: 'child',
      provider: 'local',
      status: 'active'
    }
  ];

  function normalizeUser(user) {
    return {
      id: user.id || user.username || uuid(),   // ✅ FIX #5: استخدام uuid() بدل crypto.randomUUID()
      username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
      password: user.password || '',
      email: user.email || '',
      fullName: user.fullName || user.username || 'مستخدم',
      role: isValidRole(user.role) ? user.role : 'child',
      avatar: ['child', 'girl', 'engineer'].includes(user.avatar) ? user.avatar : 'child',
      pinSalt: user.pinSalt || '',
      pinHash: user.pinHash || '',
      provider: user.provider || 'local',
      status: user.status === 'inactive' ? 'inactive' : 'active',
      localOnly: user.localOnly === true,
      cloudUid: typeof user.cloudUid === 'string' ? user.cloudUid : null
    };
  }

  function clearLegacyAdminStorage() {
    try {
      STORAGE_KEYS.legacyAdminBackups.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Unable to remove legacy local admin backups:', error);
      throw new Error('تعذر تنظيف بيانات المدير المحلي القديمة على هذا الجهاز.');
    }

    let rawSession;
    try {
      rawSession = localStorage.getItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Unable to read the local admin session:', error);
      throw new Error('تعذر قراءة جلسة المدير المحلي على هذا الجهاز.');
    }
    if (!rawSession) return;

    let session;
    try {
      session = JSON.parse(rawSession);
    } catch (error) {
      console.error('The saved local session is invalid:', error);
      return;
    }
    if (session.id !== localAdmin.id || session.username !== 'admin') return;

    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (error) {
      console.error('Unable to clear the outdated local admin session:', error);
      throw new Error('تعذر إنهاء جلسة المدير المحلي القديمة على هذا الجهاز.');
    }
  }

  function getUsers() {
    clearLegacyAdminStorage();

    let stored;
    try {
      stored = localStorage.getItem(USERS_STORAGE_KEY);
    } catch (error) {
      console.error('Unable to read saved accounts:', error);
      throw new Error('تعذر الوصول إلى الحسابات المحفوظة على هذا الجهاز.');
    }
    if (!stored) {
      if (!safeSetItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers))) {
        throw new Error('تعذر تهيئة الحسابات على هذا الجهاز. تحقق من مساحة التخزين ثم أعد المحاولة.');
      }
      return [...defaultUsers];
    }

    let parsed;
    try {
      parsed = JSON.parse(stored);
    } catch (error) {
      console.error('Saved account data is invalid; preserving the stored data:', error);
      throw new Error('تعذر قراءة الحسابات المحفوظة. لم يتم استبدال البيانات.');
    }
    if (!Array.isArray(parsed) || parsed.some(user => !user || typeof user !== 'object')) {
      throw new Error('صيغة بيانات الحسابات المحفوظة غير صالحة. لم يتم استبدال البيانات.');
    }

    let localAdminSeen = false;
    let usersChanged = false;
    const users = parsed.map(normalizeUser).filter(user => {
      if (user.id !== localAdmin.id) return true;
      if (localAdminSeen) {
        usersChanged = true;
        return false;
      }
      localAdminSeen = true;
      const isLegacyAdmin = user.username === 'admin';
      if (isLegacyAdmin || user.role !== localAdmin.role) {
        usersChanged = true;
        Object.assign(user, {
          username: localAdmin.username,
          ...(isLegacyAdmin ? { password: localAdmin.password } : {}),
          role: localAdmin.role
        });
      }
      return true;
    });
    if (usersChanged && !safeSetItem(USERS_STORAGE_KEY, JSON.stringify(users))) {
      throw new Error('تعذر تحديث بيانات المدير المحلي القديمة على هذا الجهاز.');
    }
    return users.filter(user => DEV_MODE || user.id !== localAdmin.id);
  }

  function saveUsers(users) {
    const normalizedUsers = users.map(normalizeUser);
    if (!safeSetItem(USERS_STORAGE_KEY, JSON.stringify(normalizedUsers))) {
      return null;
    }
    return normalizedUsers;
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
      if (user.id === localAdmin.id && user.username === 'admin') {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      if (!DEV_MODE && user.id === localAdmin.id) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
      return normalizeUser(user);
    } catch (error) {
      return null;
    }
  }

  function setCurrentUser(user) {
    const normalized = normalizeUser(user);
    if (normalized.localOnly) stopCloudProgressSync();
    const { password, pinSalt, pinHash, ...sessionUser } = normalized;
    safeSetItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
    return normalizeUser(sessionUser);
  }

  let localAccountIds = null;

  function isLocalOnlySession(user = getCurrentUser()) {
    if (!user) return true;
    if (user.cloudUid === user.id) return false;
    if (user.localOnly || user.id.endsWith('-demo')) return true;
    if (localAccountIds?.has(user.id)) return true;
    if (localAccountIds) return false;
    localAccountIds = new Set();
    try {
      window.KidsGamesAuth?.getUsers?.().forEach(account => localAccountIds.add(account.id));
      return localAccountIds.has(user.id);
    } catch (error) {
      console.error('Unable to identify the local account before cloud synchronization:', error);
      return false;
    }
  }

  function logoutUser() {
    stopCloudProgressSync();
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return true;
  }

  function findUserByIdentifier(identifier) {
    const value = String(identifier || '').trim().toLowerCase();
    if (!value) return null;
    return getUsers().find(user => {
      const username = (user.username || '').trim().toLowerCase();
      const email = (user.email || '').trim().toLowerCase();
      return username === value || email === value;
    }) || null;
  }

  function usernameEmail(username) {
    const normalized = String(username || '').trim().toLocaleLowerCase('en-US');
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) return normalized;
    if (!/^[a-z0-9._-]{1,32}$/.test(normalized)) {
      throw new TypeError('أدخل اسم مستخدم صالحًا أو بريدًا إلكترونيًا صحيحًا.');
    }
    return `${normalized}@accounts.kids-games.invalid`;
  }

  // ✅ FIX #4: منع دخول حسابات Google بكلمة سر فاضية
  function loginWithUsername(username, password) {
    const user = getUsers().find(item => {
      const matchesUser = (item.username || '').trim().toLowerCase() === (username || '').trim().toLowerCase();
      const matchesEmail = (item.email || '').trim().toLowerCase() === (username || '').trim().toLowerCase();
      return (matchesUser || matchesEmail) && String(item.password || '') === String(password || '');
    });

    if (!user || (!DEV_MODE && user.id === 'admin-demo') || user.status === 'inactive') return null;
    // رفض الدخول لو الحساب مش local (Google) أو كلمة السر فاضية
    if (!user.password || String(user.password).length === 0) return null;
    if (user.provider && user.provider !== 'local') return null;

    return setCurrentUser({ ...user, localOnly: true, cloudUid: null });
  }

  function encodeBytes(bytes) {
    return btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''));
  }

  function normalizePin(value) {
    return String(value || '').replace(/[٠-٩۰-۹]/g, character => {
      const code = character.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    });
  }

  function decodeBytes(value) {
    return Uint8Array.from(atob(value), character => character.charCodeAt(0));
  }

  async function hashLocalPin(pin, salt) {
    if (!window.crypto?.subtle) throw new Error('تشفير الجهاز غير متاح. افتح الموقع عبر HTTPS ثم حاول مرة أخرى.');
    const key = await window.crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      'PBKDF2',
      false,
      ['deriveBits']
    );
    const digest = await window.crypto.subtle.deriveBits({
      name: 'PBKDF2',
      salt,
      iterations: 250000,
      hash: 'SHA-256'
    }, key, 256);
    return new Uint8Array(digest);
  }

  async function addPinUser(userPayload) {
    const username = String(userPayload.username || '').trim().toLocaleLowerCase('en-US');
    const fullName = String(userPayload.fullName || '').trim();
    const pin = normalizePin(userPayload.pin);
    const role = userPayload.role || 'child';
    const avatar = userPayload.avatar || 'child';
    if (!/^[a-z0-9._-]{1,32}$/.test(username)
      || !fullName || fullName.length > 60
      || !['child', 'parent', 'teacher'].includes(role)
      || !['child', 'girl', 'engineer'].includes(avatar)
      || !/^\d{6,128}$/.test(pin)) {
      return null;
    }

    if (identityExists(getUsers(), username, '')) return null;
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const pinHash = await hashLocalPin(pin, salt);
    const users = getUsers();
    if (identityExists(users, username, '')) return null;
    const next = normalizeUser({
      ...userPayload,
      id: uuid(),
      username,
      fullName,
      role,
      avatar,
      password: '',
      pinSalt: encodeBytes(salt),
      pinHash: encodeBytes(pinHash),
      provider: 'local',
      status: 'active'
    });
    users.push(next);
    if (!saveUsers(users)) return null;
    return next;
  }

  async function loginWithPin(username, pin) {
    const normalizedUsername = String(username || '').trim().toLocaleLowerCase('en-US');
    const normalizedPin = normalizePin(pin);
    if (!/^(?:\d{4}|\d{6,128})$/.test(normalizedPin)) return null;
    const user = findUserByIdentifier(normalizedUsername);
    if (!user || user.status === 'inactive' || user.provider !== 'local' || !user.pinSalt || !user.pinHash) return null;
    const actual = await hashLocalPin(normalizedPin, decodeBytes(user.pinSalt));
    const expected = decodeBytes(user.pinHash);
    if (actual.length !== expected.length) return null;
    let mismatch = 0;
    for (let index = 0; index < actual.length; index += 1) mismatch |= actual[index] ^ expected[index];
    return mismatch === 0 ? setCurrentUser({ ...user, localOnly: true, cloudUid: null }) : null;
  }

  function canAccess(permission, user = getCurrentUser()) {
    const currentUser = normalizeUser(user || {});
    const permissions = isValidRole(currentUser.role) ? ROLE_PERMISSIONS[currentUser.role] : [];
    return permissions.includes(permission);
  }

  function identityExists(users, username, email, excludedId = null) {
    const identities = new Set(
      [username, email]
        .map(value => String(value || '').trim().toLocaleLowerCase('en-US'))
        .filter(Boolean)
    );
    return users.some(user =>
      user.id !== excludedId &&
      [user.username, user.email]
        .some(value => identities.has(String(value || '').trim().toLocaleLowerCase('en-US')))
    );
  }

  function addUser(userPayload) {
    const username = String(userPayload.username || '').trim().toLocaleLowerCase('en-US');
    const email = String(userPayload.email || '').trim().toLowerCase();
    const fullName = String(userPayload.fullName || '').trim();
    const password = String(userPayload.password || '');
    const role = userPayload.role || 'child';
    const status = userPayload.status || 'active';
    const provider = userPayload.provider || 'local';
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!/^[a-z0-9._-]{1,32}$/.test(username)
      || !fullName || fullName.length > 60
      || (email && !emailPattern.test(email))
      || password.length < 6 || password.length > 128
      || !isValidRole(role)
      || !['active', 'inactive'].includes(status)
      || !['local', 'google'].includes(provider)
      || !['child', 'girl', 'engineer'].includes(userPayload.avatar || 'child')) return null;

    const users = getUsers();
    if (identityExists(users, username, email)) return null;

    const next = normalizeUser({
      ...userPayload,
      id: userPayload.id || uuid(),   // ✅ FIX #5
      fullName,
      username,
      email,
      password,
      role,
      provider,
      status
    });

    users.push(next);
    if (!saveUsers(users)) return null;
    return next;
  }

  function updateUser(id, updates) {
    const users = getUsers();
    const index = users.findIndex(user => user.id === id);
    if (index === -1) return null;
    if ((updates.role !== undefined && !isValidRole(updates.role))
      || (updates.status !== undefined && !['active', 'inactive'].includes(updates.status))) return null;
    const nextUsername = updates.username === undefined
      ? users[index].username
      : String(updates.username).trim().toLocaleLowerCase('en-US');
    const nextEmail = updates.email === undefined ? users[index].email : String(updates.email).trim().toLowerCase();
    const nextFullName = updates.fullName === undefined ? users[index].fullName : String(updates.fullName).trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (users[index].role === 'admin' && (
      (updates.role !== undefined && updates.role !== users[index].role)
      || (updates.status !== undefined && updates.status !== users[index].status)
    )) return null;
    if (!nextUsername
      || (updates.username !== undefined && !/^[a-z0-9._-]{1,32}$/.test(nextUsername))
      || !nextFullName
      || (nextEmail && !emailPattern.test(nextEmail))
      || identityExists(users, nextUsername, nextEmail, id)) return null;

    const nextRole = updates.role === undefined
      ? users[index].role
      : (isValidRole(updates.role) ? updates.role : users[index].role);
    const nextStatus = updates.status === undefined
      ? users[index].status
      : (updates.status === 'inactive' ? 'inactive' : (updates.status === 'active' ? 'active' : users[index].status));
    const nextUser = normalizeUser({
      ...users[index],
      ...updates,
      username: nextUsername,
      email: nextEmail,
      fullName: nextFullName,
      role: nextRole,
      status: nextStatus
    });

    users[index] = nextUser;
    if (!saveUsers(users)) return null;
    return nextUser;
  }

  async function updateOwnProfile({ fullName, avatar, currentCredential, newCredential }) {
    const current = getCurrentUser();
    if (!current) throw new Error('سجّل الدخول أولًا.');
    const normalizedFullName = String(fullName || '').trim();
    if (!normalizedFullName || normalizedFullName.length > 60) {
      throw new TypeError('أدخل اسمًا صحيحًا لا يتجاوز 60 حرفًا.');
    }
    if (!['child', 'girl', 'engineer'].includes(avatar)) {
      throw new TypeError('اختر شخصية صحيحة.');
    }

    const users = getUsers();
    const index = users.findIndex(user => user.id === current.id);
    if (index === -1) throw new Error('تعذر العثور على بيانات الحساب المحلي.');
    const user = users[index];
    const changesCredential = newCredential !== undefined && String(newCredential) !== '';
    const updates = { fullName: normalizedFullName, avatar };

    if (changesCredential) {
      const oldCredential = String(currentCredential || '');
      const nextCredential = String(newCredential);
      let oldCredentialMatches = false;
      if (user.pinSalt && user.pinHash) {
        const normalizedOldPin = normalizePin(oldCredential);
        const normalizedNewPin = normalizePin(nextCredential);
        if (!/^\d{4}$/.test(normalizedOldPin) || !/^\d{4}$/.test(normalizedNewPin)) {
          throw new TypeError('رمز الدخول يجب أن يتكون من 4 أرقام بالضبط.');
        }
        const actual = await hashLocalPin(normalizedOldPin, decodeBytes(user.pinSalt));
        const expected = decodeBytes(user.pinHash);
        if (actual.length === expected.length) {
          let mismatch = 0;
          for (let byteIndex = 0; byteIndex < actual.length; byteIndex += 1) {
            mismatch |= actual[byteIndex] ^ expected[byteIndex];
          }
          oldCredentialMatches = mismatch === 0;
        }
        if (!oldCredentialMatches) throw new Error('رمز الدخول الحالي غير صحيح.');
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        updates.pinSalt = encodeBytes(salt);
        updates.pinHash = encodeBytes(await hashLocalPin(normalizedNewPin, salt));
      } else {
        if (nextCredential.length < 6 || nextCredential.length > 128) {
          throw new TypeError('كلمة المرور الجديدة يجب أن تتكون من 6 إلى 128 حرفًا.');
        }
        oldCredentialMatches = user.provider === 'local'
          && String(user.password || '') === oldCredential;
        if (!oldCredentialMatches) throw new Error('كلمة المرور الحالية غير صحيحة.');
        updates.password = nextCredential;
      }
    }

    const updated = updateUser(current.id, updates);
    if (!updated) throw new Error('تعذر حفظ بيانات الحساب.');
    return setCurrentUser(updated);
  }

  function deleteUser(id) {
    const users = getUsers();
    const current = getCurrentUser();
    const target = users.find(user => user.id === id);

    if (!target) return false;
    if (target.role === 'admin' && users.filter(user => user.role === 'admin').length <= 1) {
      return false;
    }
    const nextUsers = users.filter(user => user.id !== id);
    if (!saveUsers(nextUsers)) return false;
    if (current && current.id === id) logoutUser();
    return true;
  }

  window.KidsGamesAuth = {
    AUTH_STORAGE_KEY,
    USERS_STORAGE_KEY,
    ROLE_PERMISSIONS,
    defaultUsers,
    getUsers,
    saveUsers,
    getCurrentUser,
    setCurrentUser,
    logoutUser,
    loginWithUsername,
    loginWithPin,
    addPinUser,
    canAccess,
    addUser,
    updateUser,
    updateOwnProfile,
    deleteUser,
    findUserByIdentifier
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

  function mergeProgress(localProgress, cloudProgress) {
    let cloudGameStars = 0;
    gameCatalog.forEach(game => {
      const cloudGame = cloudProgress[game.key] || {};
      const completed = Array.isArray(cloudGame.completed) ? cloudGame.completed : [];
      cloudGameStars += Number.isFinite(Number(cloudGame.stars))
        ? Math.max(0, Number(cloudGame.stars))
        : completed.length * 3;
    });
    const cloudUnattributedStars = Math.max(
      Number(cloudProgress.unattributedStars || 0),
      Number(cloudProgress.stars || 0) - cloudGameStars,
      0
    );
    const merged = {
      unattributedStars: Math.max(Number(localProgress.unattributedStars || 0), cloudUnattributedStars)
    };
    gameCatalog.forEach(game => {
      const localGame = localProgress[game.key] || defaultState[game.key];
      const cloudGame = cloudProgress[game.key] || defaultState[game.key];
      const currentLevel = Math.max(Number(localGame.currentLevel || 1), Number(cloudGame.currentLevel || 1));
      merged[game.key] = {
        currentLevel,
        unlocked: Math.max(currentLevel, Number(localGame.unlocked || 1), Number(cloudGame.unlocked || 1)),
        completed: [...new Set([...(localGame.completed || []), ...(cloudGame.completed || [])])],
        stars: Math.max(
          Number(localGame.stars || 0),
          Number.isFinite(Number(cloudGame.stars)) ? Math.max(0, Number(cloudGame.stars)) : (cloudGame.completed || []).length * 3
        )
      };
    });
    merged.stars = merged.unattributedStars + gameCatalog.reduce((total, game) => total + merged[game.key].stars, 0);
    return merged;
  }

  async function initializeCloud() {
    try {
      const response = await fetch(new URL('firebase-config.json', APP_BASE_URL), { cache: 'no-store' });
      if (!response.ok) return { enabled: false, reason: 'missing-config' };
      const config = await response.json();
      const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
      if (requiredKeys.some(key => !config[key] || String(config[key]).startsWith('YOUR_'))) {
        return { enabled: false, reason: 'missing-config' };
      }

      const version = '10.12.5';
      await loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-app-compat.js`);
      await Promise.all([
        loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-auth-compat.js`),
        loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore-compat.js`)
      ]);

      const firebase = window.firebase;
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      const auth = app.auth();
      const database = app.firestore();
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      let accountCreationInProgress = false;

      async function syncAccount(firebaseUser, reloadIfChanged = false, previousLocalProgress = null, initialProfile = null) {
        const userRef = database.collection('users').doc(firebaseUser.uid);
        const snapshot = await userRef.get();
        const cloudData = snapshot.exists ? snapshot.data() : {};
        if (cloudData.status === 'inactive') {
          await auth.signOut();
          logoutUser();
          throw new Error('هذا الحساب غير نشط.');
        }

        const token = await firebaseUser.getIdTokenResult();
        const provider = firebaseUser.providerData.some(item => item.providerId === 'google.com') ? 'google' : 'local';
        const user = normalizeUser({
          id: firebaseUser.uid,
          cloudUid: firebaseUser.uid,
          username: cloudData.username || token.claims.username || (firebaseUser.email || '').split('@')[0],
          email: firebaseUser.email || '',
          fullName: cloudData.fullName || initialProfile?.fullName || firebaseUser.displayName || cloudData.username || firebaseUser.email || 'مستخدم Google',
          role: isValidRole(cloudData.role)
            ? cloudData.role
            : (isValidRole(token.claims.role)
              ? token.claims.role
              : (isValidRole(initialProfile?.role) ? initialProfile.role : 'child')),
          avatar: cloudData.avatar || initialProfile?.avatar || 'child',
          provider,
          status: cloudData.status === 'inactive' ? 'inactive' : 'active'
        });
        setCurrentUser(user);

        const localProgress = previousLocalProgress || readProgress();
        const progress = cloudData.progress
          ? mergeProgress(localProgress, cloudData.progress)
          : localProgress;
        const changed = JSON.stringify(localProgress) !== JSON.stringify(progress);
        safeSetItem(progressStorageKey(), JSON.stringify(progress));
        await userRef.set({
          username: user.username,
          email: user.email,
          fullName: user.fullName,
          role: user.role,
          avatar: user.avatar,
          provider: user.provider,
          status: user.status,
          progress,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
        startCloudProgressSync();

        if (reloadIfChanged && changed) {
          const reloadKey = STORAGE_KEYS.cloudSyncReload(firebaseUser.uid);
          if (!sessionStorage.getItem(reloadKey)) {
            sessionStorage.setItem(reloadKey, '1');
            window.location.reload();
          } else {
            sessionStorage.removeItem(reloadKey);
          }
        } else {
          sessionStorage.removeItem(STORAGE_KEYS.cloudSyncReload(firebaseUser.uid));
        }
        return user;
      }

      auth.onAuthStateChanged(firebaseUser => {
        const appUser = getCurrentUser();
        if (firebaseUser && appUser?.id === firebaseUser.uid
          && !isLocalOnlySession(appUser) && !accountCreationInProgress) {
          syncAccount(firebaseUser, true).catch(error => console.error(error));
        }
      });

      window.KidsGamesCloud = {
        enabled: true,
        projectId: config.projectId,
        getCurrentUserId() {
          return auth.currentUser?.uid || null;
        },
        isCurrentUserLinked() {
          const user = getCurrentUser();
          return Boolean(auth.currentUser && user
            && auth.currentUser.uid === user.id
            && user.cloudUid === auth.currentUser.uid);
        },
        async signInWithUsername(username, password) {
          const localUser = findUserByIdentifier(username);
          let previousLocalProgress = null;
          if (localUser?.provider === 'local') {
            try {
              const storedProgress = localStorage.getItem(STORAGE_KEYS.progressForUser(localUser.id));
              previousLocalProgress = storedProgress ? JSON.parse(storedProgress) : null;
            } catch (error) {
              console.error('Unable to read legacy local progress:', error);
            }
          }

          const credential = await auth.signInWithEmailAndPassword(usernameEmail(username), password);
          return syncAccount(credential.user, false, previousLocalProgress);
        },
        async adminCreateAccount(username, password, role) {
          const admin = auth.currentUser;
          if (!admin || getCurrentUser()?.id !== admin.uid || getCurrentUser()?.role !== 'admin') {
            throw new Error('يجب تسجيل الدخول بحساب مدير سحابي لإنشاء حساب.');
          }
          if (!['child', 'parent', 'teacher'].includes(role)) {
            throw new TypeError('إنشاء حساب مدير يحتاج إلى خدمة موثوقة.');
          }
          const normalizedUsername = String(username || '').trim().toLocaleLowerCase('en-US');
          if (!/^[a-z0-9._-]{1,32}$/.test(normalizedUsername)) {
            throw new TypeError('اسم المستخدم يجب أن يكون من 1 إلى 32 حرفًا إنجليزيًا أو رقمًا أو . _ -.');
          }
          if (typeof password !== 'string' || password.length < 6 || password.length > 128) {
            throw new TypeError('كلمة المرور يجب أن تتكون من 6 إلى 128 حرفًا.');
          }

          const appName = `kids-games-admin-create-${uuid()}`;
          const secondaryApp = firebase.initializeApp(config, appName);
          const secondaryAuth = secondaryApp.auth();
          let createdUser = null;
          try {
            await secondaryAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);
            const credential = await secondaryAuth.createUserWithEmailAndPassword(
              usernameEmail(normalizedUsername),
              password
            );
            createdUser = credential.user;
            await createdUser.updateProfile({ displayName: normalizedUsername });
            await secondaryApp.firestore().collection('users').doc(createdUser.uid).set({
              username: normalizedUsername,
              email: createdUser.email || '',
              fullName: normalizedUsername,
              role,
              avatar: 'child',
              provider: 'local',
              status: 'active',
              progress: cloneState(defaultState),
              updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return { uid: createdUser.uid, username: normalizedUsername, role, status: 'active' };
          } catch (error) {
            if (createdUser) {
              try {
                await createdUser.delete();
              } catch (cleanupError) {
                console.error('Unable to remove Auth account after profile creation failed:', cleanupError);
              }
            }
            throw error;
          } finally {
            try {
              await secondaryAuth.signOut();
              await firebase.app(appName).delete();
            } catch (cleanupError) {
              console.error('Unable to clean up secondary Firebase Auth session:', cleanupError);
            }
          }
        },
        async createAccount(username, pin, fullName, role, avatar) {
          const normalizedUsername = String(username || '').trim().toLocaleLowerCase('en-US');
          const normalizedFullName = String(fullName || '').trim();
          const allowedRoles = ['child', 'teacher', 'parent'];
          const allowedAvatars = ['child', 'girl', 'engineer'];
          if (!normalizedFullName || normalizedFullName.length > 60) {
            throw new TypeError('أدخل اسمًا صحيحًا لا يتجاوز 60 حرفًا.');
          }
          if (!allowedRoles.includes(role)) throw new TypeError('اختر نوع حساب صحيحًا.');
          if (!allowedAvatars.includes(avatar)) throw new TypeError('اختر شخصية من القائمة.');
          if (!/^\d{6,128}$/.test(String(pin || ''))) throw new TypeError('رمز الدخول يجب أن يتكون من 6 إلى 128 رقمًا.');
          accountCreationInProgress = true;
          try {
            const credential = await auth.createUserWithEmailAndPassword(
              usernameEmail(normalizedUsername),
              String(pin)
            );
            await credential.user.updateProfile({ displayName: normalizedFullName });
            return await syncAccount(credential.user, false, null, {
              username: normalizedUsername,
              fullName: normalizedFullName,
              role,
              avatar
            });
          } finally {
            accountCreationInProgress = false;
          }
        },
        async listAccounts() {
          const snapshot = await database.collection('users').orderBy('username').get();
          return snapshot.docs.map(document => ({ id: document.id, uid: document.id, ...document.data() }));
        },
        async updateAccount(account) {
          const ref = database.collection('users').doc(account.uid);
          await ref.update({
            role: account.role,
            status: account.status,
            email: account.email || '',
            fullName: account.fullName || account.username,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return { ...account, id: account.uid };
        },
        async updateOwnProfile({ fullName, avatar, currentCredential = '', newCredential = '' }) {
          const current = getCurrentUser();
          if (!current || current.id !== auth.currentUser?.uid) {
            throw new Error('انتهت جلسة الدخول. سجّل الدخول مرة أخرى.');
          }
          if (currentCredential || newCredential) {
            const firebaseUser = auth.currentUser;
            if (!firebaseUser?.email) {
              throw new Error('تعذر التحقق من بيانات الحساب الحالية.');
            }
            const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, currentCredential);
            await firebaseUser.reauthenticateWithCredential(credential);
            if (newCredential) {
              if (newCredential.length < 6 || newCredential.length > 128) {
                throw new TypeError('كلمة المرور الجديدة يجب أن تتكون من 6 إلى 128 حرفًا.');
              }
              await firebaseUser.updatePassword(newCredential);
            }
          }
          await auth.currentUser.updateProfile({ displayName: fullName });
          await database.collection('users').doc(current.id).update({
            fullName,
            avatar,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return setCurrentUser({ ...current, fullName, avatar });
        },
        async getLessonSettings() {
          const snapshot = await database.collection('settings').doc('lessons').get();
          if (!snapshot.exists) return null;
          return snapshot.data().unlockAt || null;
        },
        async saveLessonSettings(unlockAt) {
          await database.collection('settings').doc('lessons').set({
            unlockAt,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return unlockAt;
        },
        async getGameSettings() {
          const snapshot = await database.collection('settings').doc('games').get();
          if (!snapshot.exists) return null;
          return snapshot.data().availability || null;
        },
        async saveGameSettings(availability) {
          await database.collection('settings').doc('games').set({
            availability,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return availability;
        },
        async getMaintenanceMode() {
          const snapshot = await database.collection('settings').doc('site').get();
          const settings = snapshot.exists ? snapshot.data() : {};
          const maintenance = settings.maintenance || {};
          return {
            enabled: maintenance.enabled === true,
            message: typeof maintenance.message === 'string' ? maintenance.message : '',
            expectedTime: typeof maintenance.expectedTime === 'string' ? maintenance.expectedTime : null
          };
        },
        async saveMaintenanceMode({ enabled, message, expectedTime }) {
          const maintenance = {
            enabled: enabled === true,
            message: String(message || '').trim().slice(0, 500),
            expectedTime: expectedTime ? String(expectedTime) : null
          };
          await database.collection('settings').doc('site').set({
            maintenance,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          return maintenance;
        },
        watchMaintenanceMode(onChange, onError) {
          if (typeof onChange !== 'function') throw new TypeError('A maintenance mode listener is required.');
          return database.collection('settings').doc('site').onSnapshot(snapshot => {
            const settings = snapshot.exists ? snapshot.data() : {};
            const maintenance = settings.maintenance || {};
            onChange({
              enabled: maintenance.enabled === true,
              message: typeof maintenance.message === 'string' ? maintenance.message : '',
              expectedTime: typeof maintenance.expectedTime === 'string' ? maintenance.expectedTime : null
            });
          }, error => {
            if (typeof onError === 'function') onError(error);
            else console.error('Unable to watch maintenance mode:', error);
          });
        },
        async signOut() {
          await auth.signOut();
          logoutUser();
        },
        async saveProgress(progress) {
          const user = getCurrentUser();
          if (!auth.currentUser || !user || auth.currentUser.uid !== user.id) return false;
          await database.collection('users').doc(user.id).set({
            progress,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          return true;
        }
      };
      return window.KidsGamesCloud;
    } catch (error) {
      console.error('Cloud setup failed:', error);
      return { enabled: false, reason: 'cloud-error' };
    }
  }

  window.KidsGamesCloudReady = new Promise(resolve => {
    const startCloud = () => initializeCloud().then(resolve);
    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(startCloud, { timeout: 1000 });
    } else {
      window.setTimeout(startCloud, 0);
    }
  });
  const adminPagePath = new URL('pages/admin/', APP_BASE_URL).pathname;
  if (!window.location.pathname.startsWith(adminPagePath)) {
    let maintenanceScreen = null;
    let inertPageElements = [];

    function hideMaintenanceScreen() {
      if (!maintenanceScreen) return;
      maintenanceScreen.remove();
      maintenanceScreen = null;
      inertPageElements.forEach(({ element, wasInert }) => {
        element.inert = wasInert;
      });
      inertPageElements = [];
    }

    function renderMaintenanceScreen(settings) {
      if (!settings.enabled) {
        hideMaintenanceScreen();
        return;
      }

      if (!maintenanceScreen) {
        maintenanceScreen = document.createElement('main');
        maintenanceScreen.className = 'maintenance-screen';
        maintenanceScreen.setAttribute('role', 'alert');
        maintenanceScreen.setAttribute('aria-live', 'assertive');
        Object.assign(maintenanceScreen.style, {
          position: 'fixed',
          zIndex: '2147483647',
          inset: '0',
          display: 'grid',
          placeItems: 'center',
          overflowY: 'auto',
          padding: '24px',
          background: 'radial-gradient(circle at top, #253545, #101820 68%)',
          color: '#f4f7f9',
          fontFamily: 'inherit',
          textAlign: 'center',
          boxSizing: 'border-box'
        });
        const panel = document.createElement('section');
        panel.className = 'maintenance-screen-panel';
        Object.assign(panel.style, {
          width: 'min(560px, 100%)',
          padding: 'clamp(26px, 7vw, 48px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '22px',
          background: 'rgba(25, 38, 50, 0.92)',
          boxShadow: '0 24px 70px rgba(0, 0, 0, 0.38)',
          boxSizing: 'border-box'
        });
        const icon = document.createElement('span');
        icon.className = 'maintenance-screen-icon';
        icon.setAttribute('aria-hidden', 'true');
        icon.textContent = '🛠️';
        Object.assign(icon.style, { display: 'block', marginBottom: '14px', fontSize: '3rem' });
        const title = document.createElement('h1');
        title.textContent = 'الموقع تحت الصيانة مؤقتًا';
        Object.assign(title.style, { margin: '0 0 14px', color: '#fff', fontSize: 'clamp(1.5rem, 5vw, 2.1rem)' });
        const message = document.createElement('p');
        message.className = 'maintenance-screen-message';
        Object.assign(message.style, { margin: '10px 0', color: '#d3dde5', lineHeight: '1.8', overflowWrap: 'anywhere' });
        const expectedTime = document.createElement('p');
        expectedTime.className = 'maintenance-screen-time';
        Object.assign(expectedTime.style, { margin: '10px 0', color: '#d3dde5', lineHeight: '1.8', overflowWrap: 'anywhere' });
        const refreshButton = document.createElement('button');
        refreshButton.type = 'button';
        refreshButton.textContent = 'تحديث';
        Object.assign(refreshButton.style, {
          marginTop: '18px',
          padding: '11px 24px',
          border: '0',
          borderRadius: '12px',
          background: '#57c4b2',
          color: '#102729',
          font: 'inherit',
          fontWeight: '800',
          cursor: 'pointer'
        });
        refreshButton.addEventListener('click', () => window.location.reload());
        panel.append(icon, title, message, expectedTime, refreshButton);
        maintenanceScreen.appendChild(panel);
        inertPageElements = Array.from(document.body.children)
          .filter(element => element !== maintenanceScreen)
          .map(element => ({ element, wasInert: element.inert }));
        inertPageElements.forEach(({ element }) => {
          element.inert = true;
        });
        document.body.appendChild(maintenanceScreen);
      }

      maintenanceScreen.querySelector('.maintenance-screen-message').textContent =
        settings.message || 'الموقع تحت الصيانة مؤقتًا. سنعود قريبًا.';
      const expectedTime = maintenanceScreen.querySelector('.maintenance-screen-time');
      if (settings.expectedTime) {
        const expectedDate = new Date(settings.expectedTime);
        expectedTime.textContent = Number.isNaN(expectedDate.getTime())
          ? `وقت العودة المتوقع: ${settings.expectedTime}`
          : `وقت العودة المتوقع: ${new Intl.DateTimeFormat('ar-EG', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          }).format(expectedDate)}`;
        expectedTime.hidden = false;
      } else {
        expectedTime.textContent = '';
        expectedTime.hidden = true;
      }
    }

    window.KidsGamesCloudReady.then(cloud => {
      if (!cloud?.enabled || typeof cloud.watchMaintenanceMode !== 'function') return;
      cloud.watchMaintenanceMode(renderMaintenanceScreen, error => {
        console.error('Unable to check maintenance mode:', error);
      });
    }).catch(error => console.error('Unable to initialize maintenance mode check:', error));
  }

  const currentGame = gameCatalog.find(game =>
    new URL(game.href).pathname.replace(/\/+$/, '').toLowerCase() ===
    window.location.pathname.replace(/\/+$/, '').toLowerCase()
  );
  const currentUser = window.KidsGamesAuth.getCurrentUser();
  if (currentGame && currentUser?.role !== 'admin') {
    window.KidsGames.getEffectiveGameSettings().then(settings => {
      if (!settings.lockedGames.includes(currentGame.key)) return;
      const maintenanceUrl = new URL('pages/games/maintenance.html', APP_BASE_URL);
      maintenanceUrl.searchParams.set('game', currentGame.key);
      window.location.replace(maintenanceUrl.href);
    }).catch(error => {
      console.error('Unable to check game availability:', error);
      const maintenanceUrl = new URL('pages/games/maintenance.html', APP_BASE_URL);
      maintenanceUrl.searchParams.set('game', currentGame.key);
      maintenanceUrl.searchParams.set('verify', 'failed');
      window.location.replace(maintenanceUrl.href);
    });
  }
})();
