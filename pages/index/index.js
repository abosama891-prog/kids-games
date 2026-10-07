document.addEventListener('DOMContentLoaded', () => {
  const syncStorageKeys = {
    full: window.KidsGames.STORAGE_KEYS.fullSyncAt,
    partial: window.KidsGames.STORAGE_KEYS.partialSyncAt
  };

  function formatSyncTime(timestamp) {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return null;
    const parts = new Intl.DateTimeFormat('ar-EG', {
      weekday: 'long',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }).formatToParts(date);
    const value = type => parts.find(part => part.type === type)?.value || '';
    return `${value('weekday')} ${value('year')}/${value('month')}/${value('day')} ${value('hour')}:${value('minute')} ${value('dayPeriod')}`;
  }

  function updateSyncStatus() {
    let fullSyncAt = null;
    let partialSyncAt = null;
    try {
      fullSyncAt = localStorage.getItem(syncStorageKeys.full);
      partialSyncAt = localStorage.getItem(syncStorageKeys.partial);
    } catch (error) {
      console.error('Unable to read sync timestamps:', error);
    }

    const fullSyncText = document.getElementById('last-full-sync');
    const partialSyncText = document.getElementById('last-partial-sync');
    const formattedFullSync = fullSyncAt && formatSyncTime(fullSyncAt);
    const formattedPartialSync = partialSyncAt && formatSyncTime(partialSyncAt);
    fullSyncText.textContent = `آخر تحديث كلي: ${formattedFullSync || 'لم تتم مزامنة كاملة بعد'}`;
    partialSyncText.textContent = `آخر تحديث جزئي: ${formattedPartialSync || 'لا توجد حركات جديدة'}`;
  }

  updateSyncStatus();
  window.setInterval(updateSyncStatus, 60 * 1000);
  window.addEventListener('storage', event => {
    if (Object.values(syncStorageKeys).includes(event.key)) updateSyncStatus();
  });
  window.addEventListener('kids-games-full-sync', updateSyncStatus);
  window.addEventListener('kids-games-partial-sync', updateSyncStatus);

  const siteNav = document.getElementById('site-nav');
  const siteNavToggle = document.getElementById('site-nav-toggle');
  const navHiddenKey = window.KidsGames.STORAGE_KEYS.siteNavHidden;
  let isNavHidden = false;
  try {
    isNavHidden = localStorage.getItem(navHiddenKey) === 'true';
  } catch (error) {
    console.error('Unable to read navigation visibility preference:', error);
  }

  function updateSiteNavVisibility() {
    siteNav.classList.toggle('is-hidden', isNavHidden);
    siteNavToggle.classList.toggle('is-hidden', isNavHidden);
    siteNavToggle.setAttribute('aria-expanded', String(!isNavHidden));
    siteNavToggle.setAttribute('aria-label', isNavHidden ? 'إظهار شريط التنقل' : 'إخفاء شريط التنقل');
    siteNavToggle.title = isNavHidden ? 'إظهار شريط التنقل' : 'إخفاء شريط التنقل';
    siteNavToggle.textContent = isNavHidden ? '☰' : '⌃';
  }

  updateSiteNavVisibility();
  siteNavToggle.addEventListener('click', () => {
    isNavHidden = !isNavHidden;
    updateSiteNavVisibility();
    try {
      localStorage.setItem(navHiddenKey, String(isNavHidden));
    } catch (error) {
      console.error('Unable to save navigation visibility preference:', error);
    }
  });

  const currentUser = window.KidsGamesAuth?.getCurrentUser?.();
  if (!currentUser) {
    window.location.href = '../auth/index.html';
    return;
  }

  const userName = document.getElementById('current-user-name');
  const userRole = document.getElementById('current-user-role');
  const accountMenu = document.querySelector('.account-menu');
  const accountTrigger = document.querySelector('.account-trigger');
  const displayName = currentUser.fullName || currentUser.username || 'المستخدم';
  const isChild = currentUser.role === 'child';
  const avatarSymbols = {
    child: '🧒',
    girl: '👧🏻',
    engineer: '🧑🏻‍💻'
  };
  const userAvatar = document.getElementById('current-user-avatar');
  if (userName) userName.textContent = isChild ? `أهلًا يا ${displayName}!` : displayName;
  if (userAvatar) userAvatar.textContent = avatarSymbols[currentUser.avatar] || avatarSymbols.child;
  if (accountMenu) accountMenu.classList.toggle('child-account', isChild);
  if (accountTrigger) accountTrigger.setAttribute(
    'aria-label',
    isChild ? `حساب ${displayName}، بطل البرمجة` : `حساب ${displayName}`
  );
  if (userRole) {
    userRole.textContent = currentUser.role === 'admin'
      ? 'مدير'
      : currentUser.role === 'parent'
        ? 'ولي أمر'
        : currentUser.role === 'teacher'
          ? 'معلم'
          : currentUser.role === 'child'
            ? 'بطل البرمجة'
            : 'طفل';
  }

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      const cloud = await window.KidsGamesCloudReady;
      if (cloud.enabled) await cloud.signOut();
      else window.KidsGamesAuth.logoutUser();
      window.location.href = '../auth/index.html';
    });
  }

  const adminLink = document.getElementById('admin-link');
  if (adminLink) {
    adminLink.classList.toggle('hidden', !window.KidsGamesAuth.canAccess('manageUsers', currentUser));
  }

  const progress = window.KidsGames.readProgress();
  const games = window.KidsGames.gameCatalog;
  const totalLevels = games.reduce((total, game) => total + game.levels, 0);

  const totalStars = document.getElementById('total-stars');
  const lastLevel = document.getElementById('last-level');
  const levelStatus = document.getElementById('level-status');
  const completedLevelsElement = document.getElementById('completed-levels');
  const nextLevelElement = document.getElementById('next-level');
  const levelProgress = document.getElementById('level-progress');
  const progressTrack = levelProgress.parentElement;
  document.getElementById('total-level-count').textContent = totalLevels;
  progressTrack.setAttribute('aria-valuemax', totalLevels);

  totalStars.textContent = progress.stars || 0;
  const highest = Math.max(...games.filter(game => game.levels > 0).map(game => progress[game.key]?.currentLevel || 1));
  lastLevel.textContent = Math.min(highest, totalLevels);

  const completedLevels = games.reduce((total, game) => {
    if (!game.levels) return total;
    const completed = Array.isArray(progress[game.key]?.completed) ? progress[game.key].completed.length : 0;
    return total + Math.min(completed, game.levels);
  }, 0);
  completedLevelsElement.textContent = completedLevels;
  nextLevelElement.textContent = Math.min(highest, totalLevels);
  levelProgress.style.width = `${(completedLevels / totalLevels) * 100}%`;
  progressTrack.setAttribute('aria-valuenow', completedLevels);

  const statusText = highest <= 2 ? 'مبتدئ' : highest <= 4 ? 'متوسط' : 'متقدم';
  levelStatus.textContent = statusText;
});
