document.addEventListener('DOMContentLoaded', () => {
  const currentUser = window.KidsGamesAuth?.getCurrentUser?.();
  if (!currentUser) {
    window.location.href = '../auth/index.html';
    return;
  }

  const userName = document.getElementById('current-user-name');
  const userRole = document.getElementById('current-user-role');
  if (userName) userName.textContent = currentUser.fullName;
  if (userRole) {
    userRole.textContent = currentUser.role === 'admin'
      ? 'مدير'
      : currentUser.role === 'parent'
        ? 'ولي أمر'
        : currentUser.role === 'teacher'
          ? 'معلم'
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
