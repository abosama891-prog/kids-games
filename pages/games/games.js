const query = new URLSearchParams(window.location.search);
const unavailableGame = window.KidsGames.gameCatalog.find(game => game.key === query.get('unavailable'));
const isAdmin = window.KidsGamesAuth.getCurrentUser()?.role === 'admin';
const cachedSettings = window.KidsGames.getGameSettings();

renderGames(cachedSettings);

window.KidsGames.getEffectiveGameSettings().then(settings => {
  if (unavailableGame && settings.lockedGames.includes(unavailableGame.key) && !isAdmin) {
    window.location.replace(getMaintenanceHref(unavailableGame.key));
    return;
  }
  renderGames(settings);
}).catch(error => {
  console.error('Unable to load game availability:', error);
  const message = document.getElementById('games-message');
  message.textContent = 'تعذر التحقق من حالة تحديثات الألعاب؛ يتم عرض النسخة المحفوظة على هذا الجهاز.';
  message.hidden = false;
});

window.addEventListener('kids-games-game-settings', event => {
  const settings = event.detail;
  const locked = unavailableGame && settings.lockedGames.includes(unavailableGame.key);
  if (locked && !isAdmin) {
    window.location.replace(getMaintenanceHref(unavailableGame.key));
    return;
  }
  renderGames(settings);
});

function getMaintenanceHref(gameKey) {
  const url = new URL('maintenance.html', window.location.href);
  url.searchParams.set('game', gameKey);
  return url.href;
}

function renderGames(settings) {
  const progress = window.KidsGames.readProgress();
  const isAdmin = window.KidsGamesAuth.getCurrentUser()?.role === 'admin';

  window.KidsGames.gameCatalog.forEach(game => {
    const card = document.querySelector(`[data-game-key="${game.key}"]`);
    if (!card) {
      console.error(`Missing pre-rendered card for game: ${game.key}`);
      return;
    }
    const locked = settings.lockedGames.includes(game.key);
    const blocked = locked && !isAdmin;
    const gameProgress = progress[game.key] || { completed: [] };
    const completed = Math.min(
      Array.isArray(gameProgress.completed) ? gameProgress.completed.length : 0,
      game.levels
    );
    const percentage = game.levels ? Math.round((completed / game.levels) * 100) : 0;

    card.href = blocked ? getMaintenanceHref(game.key) : game.href;
    card.classList.toggle('is-locked', blocked);
    card.setAttribute('aria-label', blocked ? `${game.title} متوقفة مؤقتًا للتحديث` : `افتح لعبة ${game.title}`);
    const details = card.querySelector('.game-details');
    const title = details.querySelector('h2');
    let status = details.querySelector('.game-status');
    if (blocked) {
      if (!status) {
        status = document.createElement('span');
        status.className = 'game-status';
        title.after(status);
      }
      status.textContent = 'تحديثات جارية';
    } else {
      status?.remove();
    }

    const levelCount = details.querySelector('.level-count');
    levelCount.textContent = `${completed} / ${game.levels}`;
    const progressTrack = details.querySelector('.game-progress-track');
    progressTrack.setAttribute('aria-valuenow', String(completed));
    const progressFill = progressTrack.querySelector('.game-progress-fill');
    progressFill.style.width = `${percentage}%`;
    const launch = card.querySelector('.launch-game');
    launch.classList.toggle('is-locked', blocked);
    launch.textContent = blocked ? '🔒' : '▶';
  });
}
