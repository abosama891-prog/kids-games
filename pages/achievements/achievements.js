document.addEventListener('DOMContentLoaded', () => {
  const progress = window.KidsGames.readProgress();
  const mazeCompleted = Array.isArray(progress.maze?.completed) ? progress.maze.completed.length : 0;
  const drawCompleted = Array.isArray(progress.draw?.completed) ? progress.draw.completed.length : 0;
  const gasCompleted = Array.isArray(progress.gas?.completed) ? progress.gas.completed.length : 0;
  const completedTotal = mazeCompleted + drawCompleted + gasCompleted;
  const stars = Number(progress.stars) || 0;

  const achievements = [
    { title: 'أول خطوة', description: 'أكمل أول مستوى لك في أي لعبة.', icon: '🚀', value: completedTotal, target: 1, unit: 'مستوى', accent: '#0f9b8e' },
    { title: 'جامع النجوم', description: 'اجمع 15 نجمة من مغامراتك.', icon: '⭐', value: stars, target: 15, unit: 'نجمة', accent: '#e6a23c' },
    { title: 'مستكشف المتاهة', description: 'أكمل أول مستوى في مغامرة المتاهة.', icon: '🐰', value: mazeCompleted, target: 1, unit: 'مستوى', accent: '#4285a8' },
    { title: 'بطل المتاهة', description: 'أكمل جميع مستويات المتاهة الخمسة.', icon: '🧭', value: mazeCompleted, target: 5, unit: 'مستويات', accent: '#267a70' },
    { title: 'فنان الأشكال', description: 'أكمل أول مستوى في لعبة الرسم.', icon: '🎨', value: drawCompleted, target: 1, unit: 'مستوى', accent: '#db7750' },
    { title: 'رسام محترف', description: 'أكمل جميع مستويات الرسم الثمانية.', icon: '🖌️', value: drawCompleted, target: 8, unit: 'مستويات', accent: '#9563a5' },
    { title: 'مهندس صغير', description: 'أكمل أول مستوى في مهندس الغاز الذكي.', icon: '🔧', value: gasCompleted, target: 1, unit: 'مستوى', accent: '#e47645' },
    { title: 'منقذ المدينة', description: 'أنر منازل المدينة بإكمال مستويات الغاز الستة.', icon: '🏙️', value: gasCompleted, target: 6, unit: 'مستويات', accent: '#328a78' }
  ];

  document.getElementById('totalStars').textContent = stars;
  document.getElementById('earnedCount').textContent = `${achievements.filter(item => item.value >= item.target).length} / ${achievements.length}`;
  document.getElementById('completedCount').textContent = completedTotal;

  const nextAchievement = achievements.find(item => item.value < item.target);
  document.getElementById('nextGoal').textContent = nextAchievement
    ? `${nextAchievement.title}: ${Math.min(nextAchievement.value, nextAchievement.target)} من ${nextAchievement.target}`
    : 'أكملت كل الأوسمة!';
  document.getElementById('progressSummary').textContent = completedTotal
    ? `أكملت ${completedTotal} ${completedTotal === 1 ? 'مستوى' : 'مستويات'} حتى الآن. واصل التقدم!`
    : 'أكمل مستوى لتحصل على أول وسام.';

  document.getElementById('badgesGrid').innerHTML = achievements.map(item => {
    const earned = item.value >= item.target;
    const percentage = Math.min(100, Math.round((item.value / item.target) * 100));
    const current = Math.min(item.value, item.target);

    return `
      <article class="badge-card ${earned ? 'earned' : 'locked'}" style="--badge-accent: ${item.accent}">
        <div class="badge-topline">
          <span class="badge-icon" aria-hidden="true">${item.icon}</span>
          <span class="badge-status">${earned ? '✓ حصلت عليه' : '🔒 لم يُفتح بعد'}</span>
        </div>
        <h3>${item.title}</h3>
        <p>${item.description}</p>
        <div class="badge-progress-label"><span>التقدم</span><span>${current} / ${item.target} ${item.unit}</span></div>
        <div class="progress-track" role="progressbar" aria-label="التقدم نحو ${item.title}" aria-valuemin="0" aria-valuemax="${item.target}" aria-valuenow="${current}">
          <div class="progress-fill" style="width: ${percentage}%"></div>
        </div>
      </article>
    `;
  }).join('');

  const games = [
    { title: 'مغامرة المتاهة', icon: '🐰', completed: mazeCompleted, total: 5, href: '../maze/index.html' },
    { title: 'مكتشف الأشكال', icon: '🎨', completed: drawCompleted, total: 8, href: '../draw/index.html' },
    { title: 'مهندس الغاز الذكي', icon: '🔧', completed: gasCompleted, total: 6, href: '../gas/index.html' }
  ];

  document.getElementById('gameProgressGrid').innerHTML = games.map(game => `
    <a class="game-progress-item" href="${game.href}">
      <span class="game-progress-icon" aria-hidden="true">${game.icon}</span>
      <span class="game-progress-copy"><strong>${game.title}</strong><span>${Math.min(game.completed, game.total)} من ${game.total} مستويات مكتملة</span></span>
      <span class="game-progress-count">${Math.round((Math.min(game.completed, game.total) / game.total) * 100)}٪</span>
    </a>
  `).join('');
});
