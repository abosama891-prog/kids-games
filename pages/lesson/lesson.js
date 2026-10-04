document.addEventListener('DOMContentLoaded', async () => {
  const lessons = [
    {
      key: 'commands',
      title: 'ما معنى الأمر في البرمجة؟',
      description: 'تعرّف على الأوامر التي تخبر الحاسوب بما يفعله.',
      image: 'commands.svg',
      sections: [
        {
          title: '✨ الفكرة البسيطة',
          paragraphs: ['الأمر هو تعليمات واضحة نطلب من الحاسوب تنفيذها. مثلما تطلب من صديقك أن يقفز، يمكنك أن تطلب من الشخصية أن تتحرك.'],
          examples: [['moveRight();', 'تحرّك خطوة إلى اليمين.']]
        },
        {
          title: '🧩 أمثلة على الأوامر',
          items: [
            ['moveUp();', 'تحرّك للأعلى'],
            ['moveDown();', 'تحرّك للأسفل'],
            ['moveLeft();', 'تحرّك لليسار'],
            ['moveRight();', 'تحرّك لليمين'],
            ['jump();', 'اقفز']
          ]
        },
        {
          title: '💡 جرّب بنفسك',
          paragraphs: ['تخيّل أن الأرنب أمامه خطوة إلى اليمين ثم قفزة. ما الأمران اللذان يحتاج إليهما؟ اخترهما من لعبة المتاهة وجرّب ترتيبك.'],
          examples: [['moveRight();  jump();', 'خطوتان تخبران الشخصية بما تفعله.']]
        }
      ]
    },
    {
      key: 'sequence',
      title: 'ترتيب الأوامر',
      description: 'اكتشف لماذا يغيّر ترتيب التعليمات نتيجة البرنامج.',
      image: 'sequence.svg',
      sections: [
        {
          title: '🪜 اتبع الخطوات بالترتيب',
          paragraphs: ['ينفّذ الحاسوب الأوامر واحدًا بعد الآخر، من أول أمر إلى آخر أمر. إذا تبدّل الترتيب، قد تصل الشخصية إلى مكان مختلف.'],
          examples: [['moveRight();  moveUp();', 'يمينًا أولًا، ثم إلى الأعلى.']]
        },
        {
          title: '🔄 قارن بين الترتيبين',
          items: [
            ['الترتيب الأول', 'تحرّك يمينًا ثم للأعلى.'],
            ['الترتيب الثاني', 'تحرّك للأعلى ثم لليمين.'],
            ['النتيجة', 'قد تنتهي في المكان نفسه، لكن الطريق والعوائق التي تقابلها تختلف.']
          ]
        },
        {
          title: '💡 جرّب بنفسك',
          paragraphs: ['في لعبة الرسم، ارسم طريقًا ينعطف مرتين. خطّط للخطوات بالترتيب قبل أن تبدأ، ثم جرّب طريقًا بترتيب مختلف.'],
          examples: [['ابدأ ← تحرّك ← انعطف ← أكمل', 'خطّة مرتبة أسهل في التنفيذ.']]
        }
      ]
    },
    {
      key: 'loops',
      title: 'التكرار والحلقات',
      description: 'استخدم التكرار لاختصار الأوامر التي تعيدها.',
      image: 'loops.svg',
      sections: [
        {
          title: '✨ أمر يتكرر؟ استخدم حلقة',
          paragraphs: ['إذا احتجت إلى تنفيذ الحركة نفسها مرات كثيرة، لا يلزمك كتابة الأمر مرارًا. الحلقة تعيد تنفيذه عنك.'],
          examples: [['repeat(4) { moveRight(); }', 'تحرّك أربع خطوات إلى اليمين.']]
        },
        {
          title: '🧠 لماذا نستخدم التكرار؟',
          items: [
            ['أوامر أقل', 'برنامج أقصر وأسهل في القراءة.'],
            ['أخطاء أقل', 'لا تنسَ كتابة إحدى الخطوات المتشابهة.'],
            ['تغيير أسرع', 'بدّل عدد التكرارات بدل تعديل كل أمر.']
          ]
        },
        {
          title: '💡 جرّب بنفسك',
          paragraphs: ['اجعل الشخصية تمشي ثلاث خطوات في الاتجاه نفسه. اكتبها كأوامر منفصلة، ثم اختصرها بحلقة تكرار.'],
          examples: [['repeat(3) { moveRight(); }', 'ثلاث حركات بأمر مختصر.']]
        }
      ]
    },
    {
      key: 'conditions',
      title: 'الشروط واتخاذ القرار',
      description: 'علّم برنامجك أن يختار ما يفعله حسب الموقف.',
      image: 'conditions.svg',
      sections: [
        {
          title: '🚦 ما الشرط؟',
          paragraphs: ['الشرط سؤال إجابته نعم أو لا. ينفّذ البرنامج أمرًا إذا تحقق الشرط، ويمكنه تنفيذ أمر آخر إذا لم يتحقق.'],
          examples: [['if (pathIsClear) { moveForward(); }', 'تحرّك إلى الأمام إذا كان الطريق مفتوحًا.']]
        },
        {
          title: '↔️ إذا / وإلا',
          items: [
            ['إذا كان الطريق مفتوحًا', 'تحرّك إلى الأمام.'],
            ['وإلا', 'اختر طريقًا آخر أو توقّف.'],
            ['القرار', 'افحص الموقف قبل اختيار الأمر المناسب.']
          ]
        },
        {
          title: '💡 جرّب بنفسك',
          paragraphs: ['في لعبة الجسور، فكّر: إذا كان النهر هادئًا فاعبر الجسر، وإلا فاستخدم المعدّية. هذا قرار يعتمد على حالة النهر.'],
          examples: [['if (riverIsCalm) { crossBridge(); } else { takeFerry(); }', 'اختيار طريقة عبور مناسبة.']]
        }
      ]
    },
    {
      key: 'debugging',
      title: 'اكتشاف الأخطاء وتصحيحها',
      description: 'تعلّم أن تبحث عن سبب الخطأ وتصلحه خطوة بخطوة.',
      image: 'debugging.svg',
      sections: [
        {
          title: '🧩 الخطأ جزء من التعلّم',
          paragraphs: ['إذا لم يعمل البرنامج كما توقعت، فهذا دليل يساعدك على اكتشاف ما يحتاج إلى تعديل. لا تغيّر كل شيء مرة واحدة.'],
          examples: [['توقّع ← شغّل ← لاحظ', 'قارن النتيجة بما كنت تتوقعه.']]
        },
        {
          title: '🛠️ خطوات التصحيح',
          items: [
            ['1. أعد التجربة', 'شغّل البرنامج ولاحظ أين تختلف النتيجة.'],
            ['2. حدّد السبب', 'افحص الأمر أو القطعة القريبة من مكان التوقف.'],
            ['3. غيّر شيئًا واحدًا', 'عدّل خطوة واحدة ثم شغّل البرنامج مجددًا.'],
            ['4. احتفظ بما نجح', 'لا تمسح الأجزاء الصحيحة أثناء الإصلاح.']
          ]
        },
        {
          title: '💡 جرّب بنفسك',
          paragraphs: ['في لعبة المتاهة، بدّل أمرًا واحدًا إذا اصطدمت الشخصية بحاجز. جرّب مرة أخرى، ولاحظ كيف غيّر هذا الأمر الطريق.'],
          examples: [['خطأ صغير + ملاحظة جيدة = تعلّم جديد', 'كل تجربة تقرّبك من الحل.']]
        }
      ]
    }
  ];

  const content = document.getElementById('lessonContent');
  const header = document.getElementById('lessonHeader');
  const title = document.getElementById('lessonTitle');
  const description = document.getElementById('lessonDescription');
  const tag = document.getElementById('lessonTag');
  const lessonImage = document.getElementById('lessonImage');
  const backButton = document.getElementById('lessonBack');
  const settingsMessage = new URLSearchParams(window.location.search).get('notice');
  const currentUser = window.KidsGamesAuth.getCurrentUser();
  if (!currentUser) {
    window.location.href = '../auth/index.html';
    return;
  }
  const isAdmin = currentUser.role === 'admin';
  let lessonSettings = window.KidsGames.getLessonSettings();
  let completedLevels = window.KidsGames.getCompletedLevelCount();

  function make(tagName, className, text) {
    const element = document.createElement(tagName);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function addExamples(container, examples) {
    examples.forEach(([codeText, meaning]) => {
      const example = make('div', 'example-box');
      example.append(make('code', '', codeText), make('span', '', meaning));
      container.appendChild(example);
    });
  }

  function renderSection(section) {
    const card = make('section', 'page-card info-card');
    card.appendChild(make('h2', '', section.title));
    (section.paragraphs || []).forEach(paragraph => card.appendChild(make('p', '', paragraph)));
    if (section.examples) addExamples(card, section.examples);
    if (section.items) {
      const list = make('ul', 'steps');
      section.items.forEach(([label, meaning]) => {
        const item = make('li');
        if (label.includes('();') || label.includes('{')) {
          item.append(make('code', '', label), document.createTextNode(` ${meaning}`));
        } else {
          item.append(make('strong', '', `${label}: `), document.createTextNode(meaning));
        }
        list.appendChild(item);
      });
      card.appendChild(list);
    }
    return card;
  }

  function renderLessonList(notice = '') {
    header.hidden = false;
    content.className = 'content-grid lesson-list';
    title.textContent = 'دروس البرمجة';
    description.textContent = isAdmin
      ? 'يمكنك استعراض جميع الدروس بصفتك مديرًا.'
      : `أكمل المستويات المطلوبة لفتح الدروس. أنجزت ${completedLevels} مستوى.`;
    tag.textContent = '📚 مسار تعلّم البرمجة';
    lessonImage.hidden = true;
    backButton.dataset.goBack = '../index/index.html';
    content.replaceChildren();
    if (notice) {
      const message = make('p', 'lesson-notice', notice);
      content.appendChild(message);
    }

    lessons.forEach(lesson => {
      const unlockAt = Number(lessonSettings[lesson.key] ?? lesson.unlockAt);
      const unlocked = isAdmin || completedLevels >= unlockAt;
      const card = make(unlocked ? 'a' : 'article', `page-card lesson-tile${unlocked ? '' : ' locked'}`);
      if (unlocked) {
        card.href = `?id=${lesson.key}`;
        card.setAttribute('aria-label', `افتح الدرس ${lesson.title}`);
      } else {
        card.setAttribute('aria-label', `الدرس مقفول. يُفتح بعد إكمال ${unlockAt} مستوى`);
      }
      const image = make('img', 'lesson-tile-image');
      image.src = new URL(`art/${lesson.image}`, window.location.href).href;
      image.alt = `صورة توضيحية لدرس ${lesson.title}`;
      image.draggable = false;
      card.append(image, make('h2', '', lesson.title));
      content.appendChild(card);
    });
  }

  function renderLockedLesson(lesson, unlockAt) {
    header.hidden = true;
    content.className = 'content-grid locked-message page-card';
    content.replaceChildren(
      make('div', 'locked-icon', '🔒'),
      make('h1', '', 'هذا الدرس لم يُفتح بعد'),
      make('p', '', `يُفتح درس «${lesson.title}» بعد إكمال ${unlockAt} مستوى من الألعاب. أنجزت حتى الآن ${completedLevels}.`),
      make('a', 'play-btn', 'العودة إلى الدروس')
    );
    content.querySelector('a').href = 'index.html';
  }

  function renderLesson(lesson) {
    header.hidden = false;
    content.className = 'content-grid';
    title.textContent = lesson.title;
    description.textContent = lesson.description;
    tag.textContent = '📚 درس البرمجة';
    lessonImage.src = new URL(`art/${lesson.image}`, window.location.href).href;
    lessonImage.alt = `صورة توضيحية لدرس ${lesson.title}`;
    lessonImage.hidden = false;
    backButton.dataset.goBack = 'index.html';
    content.replaceChildren(...lesson.sections.map(renderSection));
    const actions = make('div', 'footer-actions');
    const returnLink = make('a', 'back-btn', '📚 كل الدروس');
    returnLink.href = 'index.html';
    const gameLink = make('a', 'play-btn', '🎮 جرّب لعبة');
    gameLink.href = '../games/index.html';
    actions.append(returnLink, gameLink);
    content.appendChild(actions);
  }

  try {
    const cloud = await window.KidsGamesCloudReady;
    if (cloud.enabled && cloud.getCurrentUserId?.() === currentUser.id) {
      const savedSettings = await cloud.getLessonSettings();
      if (savedSettings) {
        lessonSettings = window.KidsGames.saveLessonSettings(savedSettings);
      } else if (currentUser.role === 'admin') {
        await cloud.saveLessonSettings(lessonSettings);
      }
    }
  } catch (error) {
    console.error('Unable to load shared lesson settings:', error);
    renderLessonList('تعذر تحميل إعدادات فتح الدروس؛ أعد تحميل الصفحة بعد التحقق من الاتصال.');
    return;
  }

  const lessonKey = new URLSearchParams(window.location.search).get('id');
  const selectedLesson = lessons.find(lesson => lesson.key === lessonKey);
  if (selectedLesson) {
    const unlockAt = Number(lessonSettings[selectedLesson.key] ?? selectedLesson.unlockAt);
    if (!isAdmin && completedLevels < unlockAt) {
      renderLockedLesson(selectedLesson, unlockAt);
      return;
    }
    renderLesson(selectedLesson);
    return;
  }

  renderLessonList(settingsMessage === 'saved' ? 'تم حفظ مستويات فتح الدروس.' : '');
});
