(function () {
  const APP_BASE_URL = new URL('../', document.currentScript.src);
  const STORAGE_KEY = 'kids_games_progress_v1';

  const gameCatalog = [
    { key: 'maze', title: 'المتاهة', icon: '🐰', href: new URL('pages/maze/index.html', APP_BASE_URL).href, levels: 5, accent: '#4a90e2' },
    { key: 'draw', title: 'الرسم', icon: '🎨', href: new URL('pages/draw/index.html', APP_BASE_URL).href, levels: 8, accent: '#f39c12' },
    { key: 'gas', title: 'مهندس الغاز الذكي', icon: '🔧', href: new URL('pages/gas/index.html', APP_BASE_URL).href, levels: 6, accent: '#e47645' },
    { key: 'frog', title: 'بركة الضفدع', icon: '🐸', href: new URL('pages/frog/index.html', APP_BASE_URL).href, levels: 1, accent: '#86EFAC' },
    { key: 'potion', title: 'مختبر الجرعات', icon: '🧪', href: new URL('pages/potion/index.html', APP_BASE_URL).href, levels: 3, accent: '#2DD4BF' }
  ];

  const defaultState = {
    stars: 0,
    ...Object.fromEntries(gameCatalog.map(game => [game.key, { currentLevel: 1, unlocked: 1, completed: [] }]))
  };

  function cloneState(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function progressStorageKey() {
    const user = window.KidsGamesAuth?.getCurrentUser?.();
    return user?.id ? `${STORAGE_KEY}_${user.id}` : STORAGE_KEY;
  }

  function readProgress() {
    try {
      const key = progressStorageKey();
      let raw = localStorage.getItem(key);
      if (!raw && key !== STORAGE_KEY) {
        raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          localStorage.setItem(key, raw);
          localStorage.removeItem(STORAGE_KEY);
        }
      }
      if (!raw) return cloneState(defaultState);
      const parsed = JSON.parse(raw);
      const state = { stars: Number(parsed.stars || 0) };
      gameCatalog.forEach(game => {
        const savedGame = parsed[game.key] || {};
        state[game.key] = {
          ...defaultState[game.key],
          ...savedGame,
          completed: Array.isArray(savedGame.completed) ? savedGame.completed : []
        };
      });
      return state;
    } catch (error) {
      return cloneState(defaultState);
    }
  }

  function saveProgress(nextState) {
    localStorage.setItem(progressStorageKey(), JSON.stringify(nextState));
    window.KidsGamesCloud?.saveProgress?.(nextState)?.catch(error => console.error('Progress sync failed:', error));
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
    saveProgress(state);
    return state;
  }

  function goBack(fallbackUrl) {
    const referrer = document.referrer;
    if (referrer.startsWith(`${window.location.origin}/`) && referrer !== window.location.href) {
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
    defaultState,
    readProgress,
    saveProgress,
    setGameProgress,
    addStars,
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
      navigator.serviceWorker.register(new URL('sw.js', APP_BASE_URL).href).catch(() => {});
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
      id: user.id || user.username || crypto.randomUUID(),
      username: user.username || (user.email ? user.email.split('@')[0] : 'user'),
      password: user.password || '',
      email: user.email || '',
      fullName: user.fullName || user.username || 'مستخدم',
      role: ROLE_PERMISSIONS[user.role] ? user.role : 'child',
      provider: user.provider || 'local',
      status: user.status === 'inactive' ? 'inactive' : 'active'
    };
  }

  function getUsers() {
    try {
      const stored = localStorage.getItem(USERS_STORAGE_KEY);
      if (!stored) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
        return [...defaultUsers];
      }
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed) || parsed.length === 0) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
        return [...defaultUsers];
      }
      return parsed.map(normalizeUser);
    } catch (error) {
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(defaultUsers));
      return [...defaultUsers];
    }
  }

  function saveUsers(users) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users.map(normalizeUser)));
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
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(normalized));
    return normalized;
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

  function loginWithUsername(username, password) {
    const user = getUsers().find(item => {
      const matchesUser = (item.username || '').trim().toLowerCase() === (username || '').trim().toLowerCase();
      const matchesEmail = (item.email || '').trim().toLowerCase() === (username || '').trim().toLowerCase();
      return (matchesUser || matchesEmail) && String(item.password || '') === String(password || '');
    });

    if (!user || user.status === 'inactive') return null;
    return setCurrentUser(user);
  }

  function canAccess(permission, user = getCurrentUser()) {
    const currentUser = normalizeUser(user || {});
    const permissions = ROLE_PERMISSIONS[currentUser.role] || [];
    return permissions.includes(permission);
  }

  function addUser(userPayload) {
    const users = getUsers();
    const next = normalizeUser({
      ...userPayload,
      id: userPayload.id || `user-${Date.now()}`,
      username: userPayload.username || userPayload.email?.split('@')[0] || 'new-user',
      password: userPayload.password || '123456',
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

    const nextUser = normalizeUser({
      ...users[index],
      ...updates,
      role: ROLE_PERMISSIONS[updates.role] ? updates.role : users[index].role,
      status: updates.status === 'inactive' ? 'inactive' : 'active'
    });

    users[index] = nextUser;
    saveUsers(users);
    return nextUser;
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
    canAccess,
    addUser,
    updateUser,
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
    const merged = { stars: Math.max(Number(localProgress.stars || 0), Number(cloudProgress.stars || 0)) };
    gameCatalog.forEach(game => {
      const localGame = localProgress[game.key] || defaultState[game.key];
      const cloudGame = cloudProgress[game.key] || defaultState[game.key];
      const currentLevel = Math.max(Number(localGame.currentLevel || 1), Number(cloudGame.currentLevel || 1));
      merged[game.key] = {
        currentLevel,
        unlocked: Math.max(currentLevel, Number(localGame.unlocked || 1), Number(cloudGame.unlocked || 1)),
        completed: [...new Set([...(localGame.completed || []), ...(cloudGame.completed || [])])]
      };
    });
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

      const firebase = window.firebase;
      const app = firebase.apps.length ? firebase.app() : firebase.initializeApp(config);
      const auth = app.auth();
      const database = app.firestore();
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

      async function syncAccount(firebaseUser, reloadIfChanged = false) {
        const userRef = database.collection('users').doc(firebaseUser.uid);
        const snapshot = await userRef.get();
        const cloudData = snapshot.exists ? snapshot.data() : {};
        if (cloudData.status === 'inactive') {
          await auth.signOut();
          logoutUser();
          throw new Error('هذا الحساب غير نشط.');
        }

        const user = normalizeUser({
          id: firebaseUser.uid,
          username: (firebaseUser.email || '').split('@')[0],
          email: firebaseUser.email || '',
          fullName: firebaseUser.displayName || firebaseUser.email || 'مستخدم Google',
          role: ROLE_PERMISSIONS[cloudData.role] ? cloudData.role : 'child',
          provider: 'google',
          status: 'active'
        });
        setCurrentUser(user);

        const localProgress = readProgress();
        const progress = cloudData.progress
          ? mergeProgress(localProgress, cloudData.progress)
          : localProgress;
        const changed = JSON.stringify(localProgress) !== JSON.stringify(progress);
        localStorage.setItem(progressStorageKey(), JSON.stringify(progress));
        await userRef.set({
          email: user.email,
          fullName: user.fullName,
          role: user.role,
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
        if (firebaseUser) syncAccount(firebaseUser, true).catch(error => console.error(error));
      });

      return {
        enabled: true,
        async signInWithGoogle() {
          const provider = new firebase.auth.GoogleAuthProvider();
          provider.setCustomParameters({ prompt: 'select_account' });
          const result = await auth.signInWithPopup(provider);
          return syncAccount(result.user);
        },
        async signOut() {
          await auth.signOut();
          logoutUser();
        },
        async saveProfile(user) {
          if (!auth.currentUser || auth.currentUser.uid !== user.id) return false;
          await database.collection('users').doc(user.id).set({
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            provider: user.provider,
            status: user.status,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          return true;
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
    } catch (error) {
      console.error('Cloud setup failed:', error);
      return { enabled: false, reason: 'cloud-error' };
    }
  }

  window.KidsGamesCloudReady = initializeCloud();
})();
