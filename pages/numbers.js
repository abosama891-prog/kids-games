(function () {
    'use strict';
  
    // ========== 20 Levels ==========
    const LEVELS = [
      // المرحلة 1: المنطق (1-5)
      { type: 'order', nums: [3, 1, 2], answer: 1, hint: 'sort((a,b) => a-b) — ترتيب تصاعدي', stage: 'المنطق' },
      { type: 'order', nums: [5, 2, 8, 1], answer: 1, hint: 'الأصغر أولًا', stage: 'المنطق' },
      { type: 'seq', nums: [2, 4, null, 8], answer: 6, hint: 'for (i=2; i<=8; i+=2)', stage: 'المنطق' },
      { type: 'seq', nums: [1, 3, 5, null], answer: 7, hint: 'i += 2 — خطوة 2', stage: 'المنطق' },
      { type: 'seq', nums: [10, 8, 6, null], answer: 4, hint: 'i -= 2 — نزول', stage: 'المنطق' },
  
      // المرحلة 2: الشروط (6-10)
      { type: 'condition', question: 'الرقم أكبر من 5؟', numbers: [3, 7, 9, 5], answer: 7, hint: 'if (n > 5)', stage: 'الشروط' },
      { type: 'condition', question: 'الرقم زوجي؟', numbers: [3, 6, 7, 9], answer: 6, hint: 'if (n % 2 === 0)', stage: 'الشروط' },
      { type: 'condition', question: 'بين 10 و 20؟', numbers: [5, 25, 15, 30], answer: 15, hint: 'if (n >= 10 && n <= 20)', stage: 'الشروط' },
      { type: 'condition', question: 'يقبل القسمة على 3؟', numbers: [7, 8, 9, 10], answer: 9, hint: 'if (n % 3 === 0)', stage: 'الشروط' },
      { type: 'condition', question: 'مجموع أرقامه 5؟', numbers: [12, 23, 41, 15], answer: 23, hint: '2 + 3 = 5', stage: 'الشروط' },
  
      // المرحلة 3: الحلقات (11-15)
      { type: 'math', question: '1 + 2 + 3 + 4 + 5', answer: 15, hint: 'for (i=1; i<=5; i++) sum += i', stage: 'الحلقات' },
      { type: 'math', question: '1 + 2 + ... + 10', answer: 55, hint: 'sum = 10 × 11 ÷ 2', stage: 'الحلقات' },
      { type: 'math', question: 'الأرقام الزوجية 2+4+6+8', answer: 20, hint: '2 + 4 + 6 + 8', stage: 'الحلقات' },
      { type: 'math', question: '5! = 5 × 4 × 3 × 2 × 1', answer: 120, hint: 'result *= i', stage: 'الحلقات' },
      { type: 'math', question: 'الأعداد من 1 إلى 9', answer: 9, hint: 'for (i=1; i<=9; i++) count++', stage: 'الحلقات' },
  
      // المرحلة 4: الدوال (16-20)
      { type: 'math', question: '7 × 6', answer: 42, hint: 'function multiply(a, b) { return a * b; }', stage: 'الدوال' },
      { type: 'math', question: '45 + 38', answer: 83, hint: 'function add(a, b) { return a + b; }', stage: 'الدوال' },
      { type: 'math', question: '72 ÷ 8', answer: 9, hint: 'function divide(a, b) { return a / b; }', stage: 'الدوال' },
      { type: 'math', question: '(15 × 4) − 20', answer: 40, hint: 'function calc() { return 15*4 - 20; }', stage: 'الدوال' },
      { type: 'math', question: '2 ^ 8 = 2 × 2 × ... × 2', answer: 256, hint: 'function power(b, e) { return b ** e; }', stage: 'الدوال' }
    ];
  
    // ========== State ==========
    let currentLevel = 0;
    let stars = 0;
    let streak = 0;
    let answered = false;
  
    // ========== DOM ==========
    const numbersRow = document.getElementById('numbers-row');
    const answersEl = document.getElementById('answers');
    const messageEl = document.getElementById('message');
    const starsCount = document.getElementById('stars-count');
    const streakEl = document.getElementById('streak');
    const levelNum = document.getElementById('level-num');
    const stageName = document.getElementById('stage-name');
    const hintBox = document.getElementById('hint-box');
    const hintText = document.getElementById('hint-text');
    const levelsBar = document.getElementById('levels-bar');
  
    // ========== Progress ==========
    function loadProgress() {
      try {
        const saved = localStorage.getItem('numbers_progress');
        if (saved) {
          const p = JSON.parse(saved);
          currentLevel = Math.max(0, (p.currentLevel || 1) - 1);
          stars = p.stars || 0;
        }
      } catch (e) {}
    }
  
    function saveProgress(completed) {
      try {
        localStorage.setItem('numbers_progress', JSON.stringify({
          currentLevel: currentLevel + 1,
          stars: stars,
          completed: completed
        }));
      } catch (e) {}
      
      if (window.KidsGames && window.KidsGames.saveProgress) {
        try {
          window.KidsGames.saveProgress('numbers', {
            currentLevel: currentLevel + 1,
            stars: stars,
            unlocked: Math.max(currentLevel + 1, 1),
            completed: completed ? [currentLevel + 1] : []
          });
        } catch (e) {}
      }
    }
  
    // ========== Helpers ==========
    function shuffle(arr) {
      const a = [...arr];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    }
  
    function generateOptions(correct) {
      const options = new Set([correct]);
      let attempts = 0;
      while (options.size < 4 && attempts < 100) {
        attempts++;
        const offset = Math.floor(Math.random() * 20) - 10;
        const candidate = Math.max(0, correct + offset);
        if (candidate !== correct) options.add(candidate);
      }
      // لو ما وصلناش 4، نضيف أرقام متسلسلة
      let filler = correct + 1;
      while (options.size < 4) {
        options.add(filler);
        filler++;
      }
      return shuffle([...options]);
    }
  
    // ========== Render Levels Bar ==========
    function renderLevelsBar() {
      if (!levelsBar) return;
      levelsBar.innerHTML = '';
  
      for (let i = 0; i < LEVELS.length; i++) {
        const btn = document.createElement('button');
        btn.className = 'level-btn';
        btn.textContent = i + 1;
  
        if (i < currentLevel) {
          btn.classList.add('completed');
        } else if (i === currentLevel) {
          btn.classList.add('current');
        } else {
          btn.classList.add('locked');
        }
  
        (function (index) {
          btn.addEventListener('click', () => {
            if (index <= currentLevel) {
              currentLevel = index;
              answered = false;
              renderLevelsBar();
              renderLevel();
            }
          });
        })(i);
  
        levelsBar.appendChild(btn);
      }
  
      // Scroll to current level
      const currentBtn = levelsBar.children[currentLevel];
      if (currentBtn) {
        setTimeout(() => {
          currentBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }, 100);
      }
    }
  
    // ========== Render Level ==========
    function renderLevel() {
      if (currentLevel >= LEVELS.length) {
        showVictory();
        return;
      }
  
      answered = false;
      messageEl.textContent = '';
      messageEl.className = 'message';
      hintBox.classList.remove('visible');
  
      const level = LEVELS[currentLevel];
      levelNum.textContent = currentLevel + 1;
      stageName.textContent = level.stage;
      starsCount.textContent = stars;
      streakEl.textContent = streak;
  
      const qLabel = document.querySelector('.question-label');
      numbersRow.innerHTML = '';
      answersEl.innerHTML = '';
  
      // ===== Numbers Row =====
      if (level.type === 'order') {
        const shuffled = shuffle(level.nums);
        shuffled.forEach(n => {
          const box = document.createElement('div');
          box.className = 'number-box';
          box.textContent = n;
          numbersRow.appendChild(box);
        });
        qLabel.textContent = '🔍 اضغط على الرقم الأصغر';
  
      } else if (level.type === 'seq') {
        level.nums.forEach(n => {
          const box = document.createElement('div');
          box.className = 'number-box';
          if (n === null) {
            box.classList.add('hidden-box');
            box.textContent = '?';
            box.id = 'hidden-box';
          } else {
            box.textContent = n;
          }
          numbersRow.appendChild(box);
        });
        qLabel.textContent = '🔍 ما هو الرقم المفقود؟';
  
      } else if (level.type === 'condition') {
        level.numbers.forEach(n => {
          const box = document.createElement('div');
          box.className = 'number-box';
          box.textContent = n;
          numbersRow.appendChild(box);
        });
        qLabel.textContent = '🔍 ' + level.question;
  
      } else if (level.type === 'math') {
        const box = document.createElement('div');
        box.className = 'number-box hidden-box';
        box.style.width = 'auto';
        box.style.padding = '0 24px';
        box.style.fontSize = '22px';
        box.textContent = level.question;
        numbersRow.appendChild(box);
        qLabel.textContent = '🔍 احسب الناتج';
      }
  
      // ===== Hint =====
      hintText.textContent = level.hint;
  
      // ===== Answers =====
      const options = generateOptions(level.answer);
      options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'answer-btn';
        btn.textContent = opt;
        btn.addEventListener('click', () => checkAnswer(opt, btn));
        answersEl.appendChild(btn);
      });
  
      renderLevelsBar();
    }
  
    // ========== Check Answer ==========
    function checkAnswer(selected, btn) {
      if (answered) return;
      answered = true;
  
      const level = LEVELS[currentLevel];
      const isCorrect = selected === level.answer;
  
      document.querySelectorAll('.answer-btn').forEach(b => b.disabled = true);
  
      if (isCorrect) {
        btn.classList.add('correct');
        messageEl.textContent = '🎉 إجابة صحيحة!';
        messageEl.className = 'message success';
  
        stars += 3;
        streak++;
        starsCount.textContent = stars;
        streakEl.textContent = streak;
  
        const hiddenBox = document.getElementById('hidden-box');
        if (hiddenBox) {
          hiddenBox.textContent = level.answer;
          hiddenBox.classList.remove('hidden-box');
          hiddenBox.classList.add('correct');
        }
  
        hintBox.classList.add('visible');
        launchParticles(40);
        saveProgress(true);
  
        setTimeout(() => {
          currentLevel++;
          renderLevel();
        }, 2500);
      } else {
        btn.classList.add('wrong');
        messageEl.textContent = '❌ حاول مرة أخرى';
        messageEl.className = 'message error';
  
        streak = 0;
        streakEl.textContent = streak;
  
        setTimeout(() => {
          document.querySelectorAll('.answer-btn').forEach(b => {
            if (parseInt(b.textContent) === level.answer) {
              b.classList.add('correct');
            }
          });
          hintBox.classList.add('visible');
        }, 500);
  
        setTimeout(() => {
          renderLevel();
        }, 3000);
      }
    }
  
    // ========== Victory ==========
    function showVictory() {
      numbersRow.innerHTML = '<div class="number-box" style="width:auto;padding:0 24px;font-size:20px">🏆</div>';
      answersEl.innerHTML = '';
      hintBox.classList.remove('visible');
      messageEl.textContent = '🎊 مبروك! أكملت كل المستويات';
      messageEl.className = 'message success';
      launchParticles(100);
    }
  
    // ========== Particles ==========
    function launchParticles(count) {
      const colors = ['#7dd3fc', '#4ade80', '#fbbf24', '#f472b6', '#a78bfa'];
      const centerX = window.innerWidth / 2;
      const centerY = window.innerHeight / 2;
  
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div');
        p.className = 'particle';
        const color = colors[Math.floor(Math.random() * colors.length)];
        const size = 6 + Math.random() * 8;
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
        const distance = 100 + Math.random() * 250;
  
        p.style.cssText = `
          left: ${centerX}px;
          top: ${centerY}px;
          width: ${size}px;
          height: ${size}px;
          background: ${color};
          box-shadow: 0 0 10px ${color};
          --tx: ${Math.cos(angle) * distance}px;
          --ty: ${Math.sin(angle) * distance}px;
        `;
        document.body.appendChild(p);
        setTimeout(() => p.remove(), 1500);
      }
    }
  
    // ========== Init ==========
    function init() {
      loadProgress();
      renderLevelsBar();
      renderLevel();
    }
  
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  })();