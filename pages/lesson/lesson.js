document.addEventListener('DOMContentLoaded', () => {
  const playButton = document.querySelector('.play-btn');
  if (playButton) {
    playButton.addEventListener('click', () => {
      const progress = window.KidsGames.readProgress();
      const state = progress.maze || { currentLevel: 1 };
      if (state.currentLevel) {
        window.location.href = '../maze/index.html';
      }
    });
  }
});
