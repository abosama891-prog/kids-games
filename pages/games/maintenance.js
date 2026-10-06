document.addEventListener('DOMContentLoaded', async () => {
  const cloud = await window.KidsGamesCloudReady;
  if (!cloud?.enabled) return;
  const query = new URLSearchParams(window.location.search);
  const game = window.KidsGames.gameCatalog.find(item => item.key === query.get('game'));
  const title = document.getElementById('maintenance-title');
  const message = document.getElementById('maintenance-message');
  const progress = document.querySelector('.progress-dots');

  if (query.get('verify') === 'failed') {
    title.textContent = 'تعذر التحقق من حالة اللعبة';
    message.textContent = 'لم نتمكن من الاتصال للتحقق من التحديث. ارجع إلى الألعاب وحاول مرة أخرى بعد قليل.';
    progress.hidden = true;
    return;
  }
  if (!game) {
    title.textContent = 'اختر لعبة من القائمة!';
    message.textContent = 'ارجع إلى صفحة الألعاب واختر مغامرتك المفضلة.';
    progress.hidden = true;
    return;
  }

  title.textContent = `لعبة ${game.title} في ورشة التحديث!`;
  try {
    const settings = await window.KidsGames.getEffectiveGameSettings();
    const isAdmin = window.KidsGamesAuth.getCurrentUser()?.role === 'admin';
    if (isAdmin || !settings.lockedGames.includes(game.key)) {
      window.location.replace(game.href);
    }
  } catch (error) {
    console.error('Unable to verify game availability from the maintenance page:', error);
    title.textContent = 'تعذر التحقق من حالة اللعبة';
    message.textContent = 'لم نتمكن من الاتصال للتحقق من التحديث. ارجع إلى الألعاب وحاول مرة أخرى بعد قليل.';
    progress.hidden = true;
  }
});
