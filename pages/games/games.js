document.addEventListener('DOMContentLoaded', () => {
  const progress = window.KidsGames.readProgress();
  const gamesGrid = document.getElementById('gamesGrid');

  window.KidsGames.gameCatalog.forEach(game => {
    const gameProgress = progress[game.key] || { completed: [] };
    const completed = Math.min(
      Array.isArray(gameProgress.completed) ? gameProgress.completed.length : 0,
      game.levels
    );
    const percentage = game.levels ? Math.round((completed / game.levels) * 100) : 0;

    const card = document.createElement('article');
    card.className = `game-card game-${game.key}`;
    card.tabIndex = 0;
    card.setAttribute('role', 'link');
    card.setAttribute('aria-label', `افتح لعبة ${game.title}`);
    card.addEventListener('click', event => {
      if (event.target.closest('a')) return;
      window.location.href = game.href;
    });
    card.addEventListener('keydown', event => {
      if (event.target !== card || !['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      window.location.href = game.href;
    });

    const icon = document.createElement('span');
    icon.className = 'game-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = game.icon;

    const details = document.createElement('div');
    details.className = 'game-details';

    const title = document.createElement('h2');
    title.textContent = game.title;

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
    details.append(title, levelCount, progressTrack);

    const launch = document.createElement('a');
    launch.className = 'launch-game';
    launch.href = game.href;
    launch.setAttribute('aria-label', `ابدأ ${game.title}`);
    launch.textContent = '▶';

    card.append(icon, details, launch);
    gamesGrid.appendChild(card);
  });
});