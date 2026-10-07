document.addEventListener('DOMContentLoaded', () => {
  const query = new URLSearchParams(window.location.search);
  const unavailableGame = window.KidsGames.gameCatalog.find(game => game.key === query.get('unavailable'));
  const isAdmin = window.KidsGamesAuth.getCurrentUser()?.role === 'admin';
  const cachedSettings = window.KidsGames.getGameSettings();
  renderGames(cachedSettings, false);

  window.KidsGames.getEffectiveGameSettings().then(settings => {
    if (unavailableGame && settings.lockedGames.includes(unavailableGame.key) && !isAdmin) {
      window.location.replace(getMaintenanceHref(unavailableGame.key));
      return;
    }
    renderGames(settings, false);
  }).catch(error => {
    console.error('Unable to load game availability:', error);
    const message = document.getElementById('games-message');
    message.textContent = 'تعذر التحقق من حالة تحديثات الألعاب. أعد تحميل الصفحة قبل فتح أي لعبة.';
    message.hidden = false;
    renderGames(cachedSettings, true);
  });
});

function getMaintenanceHref(gameKey) {
  const url = new URL('maintenance.html', window.location.href);
  url.searchParams.set('game', gameKey);
  return url.href;
}

function renderGames(settings, availabilityUnknown) {
  const progress = window.KidsGames.readProgress();
  const gamesGrid = document.getElementById('gamesGrid');
  const message = document.getElementById('games-message');
  const isAdmin = window.KidsGamesAuth.getCurrentUser()?.role === 'admin';

  gamesGrid.replaceChildren();
  window.KidsGames.gameCatalog.forEach(game => {
    const locked = settings.lockedGames.includes(game.key);
    const blocked = locked && !isAdmin;
    const gameProgress = progress[game.key] || { completed: [] };
    const completed = Math.min(
      Array.isArray(gameProgress.completed) ? gameProgress.completed.length : 0,
      game.levels
    );
    const percentage = game.levels ? Math.round((completed / game.levels) * 100) : 0;

    const card = document.createElement('article');
    card.className = `game-card game-${game.key}${blocked ? ' is-locked' : ''}`;
    card.tabIndex = availabilityUnknown ? -1 : 0;
    card.setAttribute('role', 'link');
    card.setAttribute('aria-label', blocked ? `${game.title} متوقفة مؤقتًا للتحديث` : `افتح لعبة ${game.title}`);
    if (availabilityUnknown) card.setAttribute('aria-disabled', 'true');
    card.addEventListener('click', event => {
      if (event.target.closest('a')) return;
      if (availabilityUnknown) {
        message.textContent = 'تعذر التحقق من حالة تحديثات الألعاب. أعد تحميل الصفحة قبل فتح أي لعبة.';
        message.hidden = false;
        return;
      }
      window.location.href = blocked ? getMaintenanceHref(game.key) : game.href;
    });
    card.addEventListener('keydown', event => {
      if (event.target !== card || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      if (availabilityUnknown) {
        message.textContent = 'تعذر التحقق من حالة تحديثات الألعاب. أعد تحميل الصفحة قبل فتح أي لعبة.';
        message.hidden = false;
        return;
      }
      window.location.href = blocked ? getMaintenanceHref(game.key) : game.href;
    });

    const icon = document.createElement('span');
    icon.className = 'game-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = game.icon;

    const details = document.createElement('div');
    details.className = 'game-details';

    const title = document.createElement('h2');
    title.textContent = game.title;
    if (blocked) {
      const status = document.createElement('span');
      status.className = 'game-status';
      status.textContent = 'تحديثات جارية';
      details.append(title, status);
    } else {
      details.appendChild(title);
    }

    const levelCount = document.createElement('span');
    levelCount.className = 'level-count';
    levelCount.textContent = `${completed} / ${game.levels}`;

    const progressTrack = document.createElement('div');
    progressTrack.className = 'game-progress-track';
    progressTrack.setAttribute('role', 'progressbar');
    progressTrack.setAttribute('aria-label', `تقدم ${game.title}`);
    progressTrack.setAttribute('aria-valuemin', '0');
    progressTrack.setAttribute('aria-valuemax', String(game.levels));
    progressTrack.setAttribute('aria-valuenow', String(completed));

    const progressFill = document.createElement('div');
    progressFill.className = 'game-progress-fill';
    progressFill.style.width = `${percentage}%`;
    progressTrack.appendChild(progressFill);
    details.append(levelCount, progressTrack);

    const launch = document.createElement('a');
    launch.className = `launch-game${blocked ? ' is-locked' : ''}`;
    launch.href = availabilityUnknown ? '#' : blocked ? getMaintenanceHref(game.key) : game.href;
    launch.setAttribute('aria-label', blocked ? `${game.title} متوقفة مؤقتًا للتحديث` : `ابدأ ${game.title}`);
    launch.textContent = availabilityUnknown ? '…' : blocked ? '🔒' : '▶';
    if (availabilityUnknown) {
      launch.setAttribute('aria-disabled', 'true');
      launch.addEventListener('click', event => event.preventDefault());
    }

    card.append(icon, details, launch);
    gamesGrid.appendChild(card);
  });
}
