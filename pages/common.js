(function () {
  (function () {
  // ✅ أوقف تنفيذ هذا الكود بالكامل في صفحات الإدارة
  if (window.location.pathname.includes('/admin/')) {
    return;
  }

  const APP_BASE_URL = new URL('../', document.currentScript.src);
  const APP_BASE_URL = new URL('../', document.currentScript.src);
  const STORAGE_KEY = 'kids_games_progress_v1';
  const LESSON_SETTINGS_KEY = 'kids_games_lesson_unlocks_v1';
  const GAME_SETTINGS_KEY = 'kids_games_availability_v1';

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
    return user?.id ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;
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
      if (!raw && key !== STORAGE_KEY) {
        raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          safeSetItem(key, raw);
          localStorage.removeItem(STORAGE_KEY);
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

  async function saveProgress(nextState) {
    safeSetItem(progressStorageKey(), JSON.stringify(nextState));
    try {
      const cloud = await window.KidsGamesCloudReady;
      if (cloud?.enabled && typeof cloud.saveProgress === 'function') {
        await cloud.saveProgress(nextState);
      }
    } catch (error) {
      console.error('Progress sync failed:', error);
    }
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
      const saved = JSON.parse(localStorage.getItem(LESSON_SETTINGS_KEY) || '{}');
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
    safeSetItem(LESSON_SETTINGS_KEY, JSON.stringify(normalized));
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
      const saved = localStorage.getItem(GAME_SETTINGS_KEY);
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
    if (!safeSetItem(GAME_SETTINGS_KEY, JSON.stringify(normalized))) {
      throw new Error('Unable to save game availability settings on this device.');
    }
    return normalized;
  }

  async function getEffectiveGameSettings() {
    const cloud = await window.KidsGamesCloudReady;
    if (!cloud.enabled) return getGameSettings();
    const savedSettings = await cloud.getGameSettings();
    return savedSettings ? saveGameSettings(savedSettings) : getGameSettings();
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
    STORAGE_KEY,
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
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(new URL('sw.js', APP_BASE_URL).href, { updateViaCache: 'none' })
        .catch(error => console.error('Unable to register the app service worker:', error));
    });
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

  const AUTH_STORAGE_KEY = 'kids_games_current_user_v1';
  const USERS_STORAGE_KEY = 'kids_games_users_v1';

  const ROLE_PERMISSIONS = {
    admin: ['dashboard', 'manageUsers', 'viewProgress', 'playGames', 'manageLessons'],
    parent: ['viewProgress', 'manageChildren', 'playGames', 'viewAchievements'],
    child: ['playGames', 'viewAchievements', 'viewLessons'],
    teacher: ['manageLessons', 'viewProgress', 'playGames']
  };

  const defaultUsers = [
    {
      id: 'admin-demo',
      username: 'admin',
      password: 'admin123',
      email: 'admin@gmail.com',
      fullName: 'مدير النظام',
      role: 'admin',
      provider: 'local',
      status: 'active'
    },
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
      role: ROLE_PERMISSIONS[user.role] ? user.role : 'child',
      avatar: ['child', 'girl', 'engineer'].includes(user.avatar) ? user.avatar : 'child',
      pinSalt: user.pinSalt || '',
      pinHash: user.pinHash || '',
      provider: user.provider || 'local',
      status: user.status === 'inactive' ? 'inactive' : 'active'
    };
  }

  function getUsers() {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (!stored) {
        safeSetItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
        return [...defaultUsers];
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        safeSetItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
        return [...defaultUsers];
      }
      return parsed.map(normalizeUser);
    } catch (error) {
      safeSetItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
      return [...defaultUsers];
    }
  }

  function saveUsers(users) {
    safeSetItem(USERS_STORAGE_KEY, JSON.stringify(users.map(normalizeUser)));
    return users.map(normalizeUser);
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!raw) return null;
      const user = JSON.parse(raw);
      return normalizeUser(user);
    } catch (error) {
      return null;
    }
  }

  function setCurrentUser(user) {
    const normalized = normalizeUser(user);
    const { password, pinSalt, pinHash, ...sessionUser } = normalized;
    safeSetItem(AUTH_STORAGE_KEY, JSON.stringify(sessionUser));
    return normalizeUser(sessionUser);
  }

  function logoutUser() {
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
    if (!/^[a-z0-9._-]{3,32}$/.test(normalized)) {
      throw new TypeError('اسم المستخدم يجب أن يتكون من 3 إلى 32 حرفًا إنجليزيًا أو رقمًا أو . _ -');
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

    if (!user || user.status === 'inactive') return null;
    // رفض الدخول لو الحساب مش local (Google) أو كلمة السر فاضية
    if (!user.password || String(user.password).length === 0) return null;
    if (user.provider && user.provider !== 'local') return null;

    return setCurrentUser(user);
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
    if (!/^[a-z0-9._-]{3,32}$/.test(username) || !fullName || fullName.length > 60 || !/^\d{4}$/.test(pin)) {
      return null;
    }

    const users = getUsers();
    if (users.some(user => user.username.toLocaleLowerCase() === username)) return null;
    const salt = window.crypto.getRandomValues(new Uint8Array(16));
    const pinHash = await hashLocalPin(pin, salt);
    const next = normalizeUser({
      ...userPayload,
      id: uuid(),
      username,
      fullName,
      password: '',
      pinSalt: encodeBytes(salt),
      pinHash: encodeBytes(pinHash),
      provider: 'local',
      status: 'active'
    });
    users.push(next);
    saveUsers(users);
    return next;
  }

  async function loginWithPin(username, pin) {
    const normalizedUsername = String(username || '').trim().toLocaleLowerCase('en-US');
    const normalizedPin = normalizePin(pin);
    if (!/^\d{4}$/.test(normalizedPin)) return null;
    const user = findUserByIdentifier(normalizedUsername);
    if (!user || user.status === 'inactive' || user.provider !== 'local' || !user.pinSalt || !user.pinHash) return null;
    const actual = await hashLocalPin(normalizedPin, decodeBytes(user.pinSalt));
    const expected = decodeBytes(user.pinHash);
    if (actual.length !== expected.length) return null;
    let mismatch = 0;
    for (let index = 0; index < actual.length; index += 1) mismatch |= actual[index] ^ expected[index];
    return mismatch === 0 ? setCurrentUser(user) : null;
  }

  function canAccess(permission, user = getCurrentUser()) {
    const currentUser = normalizeUser(user || {});
    const permissions = ROLE_PERMISSIONS[currentUser.role] || [];
    return permissions.includes(permission);
  }

  function addUser(userPayload) {
    const username = String(userPayload.username || '').trim();
    const email = String(userPayload.email || '').trim().toLowerCase();
    const fullName = String(userPayload.fullName || '').trim();
    const password = String(userPayload.password || '');
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!username || !fullName || (email && !emailPattern.test(email)) || password.length < 6) return null;

    const users = getUsers();
    if (users.some(user =>
      user.username.toLocaleLowerCase() === username.toLocaleLowerCase() ||
      (email && user.email.toLocaleLowerCase() === email)
    )) return null;

    const next = normalizeUser({
      ...userPayload,
      id: userPayload.id || uuid(),   // ✅ FIX #5
      fullName,
      username,
      email,
      password,
      role: userPayload.role || 'child',
      provider: userPayload.provider || 'local',
      status: userPayload.status || 'active'
    });

    users.push(next);
    saveUsers(users);
    return next;
  }

  function updateUser(id, updates) {
    const users = getUsers();
    const index = users.findIndex(user => user.id === id);
    if (index === -1) return null;

    const nextUsername = updates.username === undefined ? users[index].username : String(updates.username).trim();
    const nextEmail = updates.email === undefined ? users[index].email : String(updates.email).trim().toLowerCase();
    const nextFullName = updates.fullName === undefined ? users[index].fullName : String(updates.fullName).trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!nextUsername || !nextFullName || (nextEmail && !emailPattern.test(nextEmail)) || users.some((user, userIndex) =>
      userIndex !== index &&
      (user.username.toLocaleLowerCase() === nextUsername.toLocaleLowerCase() ||
        (nextEmail && user.email.toLocaleLowerCase() === nextEmail))
    )) return null;

    const nextUser = normalizeUser({
      ...users[index],
      ...updates,
      username: nextUsername,
      email: nextEmail,
      fullName: nextFullName,
      role: ROLE_PERMISSIONS[updates.role] ? updates.role : users[index].role,
      status: updates.status === 'inactive' ? 'inactive' : 'active'
    });

    users[index] = nextUser;
    saveUsers(users);
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
    if (current && current.id === id) {
      logoutUser();
    }

    const nextUsers = users.filter(user => user.id !== id);
    saveUsers(nextUsers);
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
      await loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-auth-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${version}/firebase-functions-compat.js`);

      const firebase = window.firebase;
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      const auth = app.auth();
      const database = app.firestore();
      const functions = app.functions('us-central1');
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
          username: cloudData.username || token.claims.username || (firebaseUser.email || '').split('@')[0],
          email: firebaseUser.email || '',
          fullName: cloudData.fullName || initialProfile?.fullName || firebaseUser.displayName || cloudData.username || firebaseUser.email || 'مستخدم Google',
          role: ROLE_PERMISSIONS[token.claims.role]
            ? token.claims.role
            : (ROLE_PERMISSIONS[cloudData.role] ? cloudData.role : (ROLE_PERMISSIONS[initialProfile?.role] ? initialProfile.role : 'child')),
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

        if (reloadIfChanged && changed) {
          const reloadKey = `kids_games_cloud_sync_${firebaseUser.uid}`;
          if (!sessionStorage.getItem(reloadKey)) {
            sessionStorage.setItem(reloadKey, '1');
            window.location.reload();
          } else {
            sessionStorage.removeItem(reloadKey);
          }
        } else {
          sessionStorage.removeItem(`kids_games_cloud_sync_${firebaseUser.uid}`);
        }
        return user;
      }

      auth.onAuthStateChanged(firebaseUser => {
        if (firebaseUser && !accountCreationInProgress) {
          syncAccount(firebaseUser, true).catch(error => console.error(error));
        }
      });

      window.KidsGamesCloud = {
        enabled: true,
        projectId: config.projectId,
        getCurrentUserId() {
          return auth.currentUser?.uid || null;
        },
        async signInWithUsername(username, password) {
          if (/^\d{4}$/.test(String(password || ''))) {
            const result = await functions.httpsCallable('authenticateUsername')({
              username,
              password
            });
            const credential = await auth.signInWithCustomToken(result.data.token);
            return syncAccount(credential.user);
          }
          const localUser = findUserByIdentifier(username);
          let previousLocalProgress = null;
          if (localUser?.provider === 'local') {
            try {
              const storedProgress = localStorage.getItem(`${STORAGE_KEY}_${localUser.id}`);
              previousLocalProgress = storedProgress ? JSON.parse(storedProgress) : null;
            } catch (error) {
              console.error('Unable to read legacy local progress:', error);
            }
          }
          const credential = await auth.signInWithEmailAndPassword(usernameEmail(username), password);
          return syncAccount(credential.user, false, previousLocalProgress);
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
          if (!/^\d{4}$/.test(String(pin || ''))) throw new TypeError('رمز الدخول يجب أن يتكون من 4 أرقام بالضبط.');
          accountCreationInProgress = true;
          try {
            const result = await functions.httpsCallable('registerAccount')({
              username: normalizedUsername,
              pin,
              fullName: normalizedFullName,
              role,
              avatar
            });
            const credential = await auth.signInWithCustomToken(result.data.token);
            return await syncAccount(credential.user, false, null, {
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
            try {
              const result = await functions.httpsCallable('updateOwnProfile')({
                fullName,
                avatar,
                currentCredential,
                newCredential
              });
              return setCurrentUser({ ...current, ...result.data });
            } catch (error) {
              const legacyAccount = error.code === 'functions/failed-precondition'
                && error.message.includes('الحساب القديم');
              const functionNotDeployed = error.code === 'functions/not-found';
              if (legacyAccount) {
                const firebaseUser = auth.currentUser;
                if (!firebaseUser?.email) {
                  throw new Error('تعذر التحقق من الحساب القديم. تواصل مع مدير النظام.');
                }
                const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, currentCredential);
                await firebaseUser.reauthenticateWithCredential(credential);
                await firebaseUser.getIdToken(true);
                const result = await functions.httpsCallable('updateOwnProfile')({
                  fullName,
                  avatar,
                  currentCredential,
                  newCredential
                });
                return setCurrentUser({ ...current, ...result.data });
              }
              if (newCredential.length < 6 || !functionNotDeployed) throw error;

              const firebaseUser = auth.currentUser;
              if (!firebaseUser?.email) {
                throw new Error('تعذر التحقق من الحساب القديم. تواصل مع مدير النظام.');
              }
              const credential = firebase.auth.EmailAuthProvider.credential(firebaseUser.email, currentCredential);
              await firebaseUser.reauthenticateWithCredential(credential);
              await firebaseUser.updatePassword(newCredential);
              await firebaseUser.updateProfile({ displayName: fullName });
              await database.collection('users').doc(current.id).update({
                fullName,
                avatar,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
              });
              return setCurrentUser({ ...current, fullName, avatar });
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

  window.KidsGamesCloudReady = initializeCloud();

  const currentGame = gameCatalog.find(game =>
    new URL(game.href).pathname.replace(/\/+$/, '').toLowerCase() ===
    window.location.pathname.replace(/\/+$/, '').toLowerCase()
    return;
}                                   
  );
  const currentUser = window.KidsGamesAuth.getCurrentUser();
  if (currentGame && currentUser?.role !== 'admin') {
    const accessCheck = document.createElement('div');
    accessCheck.setAttribute('role', 'status');
    accessCheck.setAttribute('aria-live', 'assertive');
    accessCheck.textContent = `لحظة واحدة، نتحقق من توفر لعبة ${currentGame.title}.`;
    Object.assign(accessCheck.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '2147483647',
      display: 'grid',
      placeItems: 'center',
      padding: '24px',
      background: 'rgba(16, 35, 57, 0.92)',
      color: '#fff',
      font: '800 1.1rem/1.8 system-ui, sans-serif',
      textAlign: 'center',
      direction: 'rtl'
    });
    document.body.appendChild(accessCheck);

    window.KidsGames.getEffectiveGameSettings().then(settings => {
      if (!settings.lockedGames.includes(currentGame.key)) {
        accessCheck.remove();
        return;
      }
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
