document.addEventListener('DOMContentLoaded', () => {
  const authMessage = document.getElementById('auth-message');
  const splashScreen = document.getElementById('splash-screen');
  const accountScreen = document.getElementById('account-screen');
  const loginPanel = document.getElementById('login-panel');
  const signupPanel = document.getElementById('signup-panel');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const showSignupButton = document.getElementById('show-signup');
  const showLoginButton = document.getElementById('show-login');
  const startButton = document.getElementById('start-button');
  const backToSplashButton = document.getElementById('back-to-splash');
  const splashLogo = document.getElementById('splash-logo');
  function normalizePin(value) {
    return String(value || '').replace(/[٠-٩۰-۹]/g, digit => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    });
  }

  function setMessage(text, type = 'success') {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
  }

  function redirectByRole(user) {
    if (user.role === 'admin') {
      window.location.href = '../admin/index.html';
      return;
    }
    window.location.href = '../index/index.html';
  }

  function showLogin() {
    splashScreen.hidden = true;
    accountScreen.hidden = false;
    signupPanel.hidden = true;
    loginPanel.hidden = false;
    setMessage('');
  }

  function showSignup() {
    splashScreen.hidden = true;
    accountScreen.hidden = false;
    loginPanel.hidden = true;
    signupPanel.hidden = false;
    signupForm.reset();
    document.getElementById('signup-full-name').focus();
    setMessage('');
  }

  function showSplash() {
    accountScreen.hidden = true;
    splashScreen.hidden = false;
    setMessage('');
  }

  startButton.addEventListener('click', showLogin);
  backToSplashButton.addEventListener('click', showSplash);

  const splashLogos = ['👾⚡', '🎮⚡', '🦾⚡', '🧠⚡', '🕹️⚡'];
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    let logoIndex = 0;
    window.setInterval(() => {
      splashLogo.classList.add('switching');
      window.setTimeout(() => {
        logoIndex = (logoIndex + 1) % splashLogos.length;
        splashLogo.textContent = splashLogos[logoIndex];
        splashLogo.classList.remove('switching');
      }, 180);
    }, 2200);
  }

  const currentUser = window.KidsGamesAuth?.getCurrentUser?.();

  const cloudReady = window.KidsGamesCloudReady.then(cloud => {
    if (currentUser) {
      redirectByRole(window.KidsGamesAuth.getCurrentUser() || currentUser);
    }
    return cloud;
  });

  showSignupButton.addEventListener('click', showSignup);
  showLoginButton.addEventListener('click', showLogin);

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = normalizePin(document.getElementById('password').value);
    const submitButton = loginForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const cloud = await cloudReady;
      const user = cloud.enabled
        ? await cloud.signInWithUsername(username, password)
        : /^\d{4}$/.test(password)
          ? await window.KidsGamesAuth.loginWithPin(username, password)
          : window.KidsGamesAuth.loginWithUsername(username, password);
      if (!user) {
        setMessage('اسم المستخدم أو كلمة المرور غير صحيحة.', 'error');
        return;
      }
      redirectByRole(user);
    } catch (error) {
      console.error('Unable to sign in with username:', error);
      const message = error.code === 'auth/too-many-requests'
        ? 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.'
        : error.code === 'functions/resource-exhausted'
          ? 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى.'
          : error.code === 'functions/unavailable'
            ? 'تعذر الاتصال بخدمة الحسابات. تحقق من اتصال الإنترنت.'
        : error.code === 'auth/network-request-failed'
          ? 'تعذر الاتصال بخدمة تسجيل الدخول. تحقق من اتصال الإنترنت.'
          : 'اسم المستخدم أو كلمة المرور غير صحيحة.';
      setMessage(message, 'error');
    } finally {
      submitButton.disabled = false;
    }
  });

  signupForm.addEventListener('submit', async event => {
    event.preventDefault();
    const fullName = document.getElementById('signup-full-name').value.trim();
    const username = document.getElementById('signup-username').value.trim().toLocaleLowerCase('en-US');
    const pin = normalizePin(document.getElementById('signup-pin').value);
    const pinConfirm = normalizePin(document.getElementById('signup-pin-confirm').value);
    const role = document.getElementById('signup-role').value;
    const avatar = signupForm.querySelector('input[name="avatar"]:checked')?.value || 'child';
    const submitButton = signupForm.querySelector('[type="submit"]');

    if (!/^[a-z0-9._-]{1,32}$/.test(username)) {
      setMessage('اسم المستخدم يجب أن يكون من 1 إلى 32 حرفًا إنجليزيًا أو رقمًا أو . _ -', 'error');
      return;
    }
    if (fullName.length === 0 || fullName.length > 60) {
      setMessage('اكتب اسمًا صحيحًا لا يتجاوز 60 حرفًا.', 'error');
      return;
    }
    if (!['child', 'teacher', 'parent'].includes(role)) {
      setMessage('اختر نوع حساب صحيحًا.', 'error');
      return;
    }
    if (!['child', 'girl', 'engineer'].includes(avatar)) {
      setMessage('اختر شخصية من القائمة.', 'error');
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setMessage('رمز الدخول يجب أن يتكون من 4 أرقام بالضبط.', 'error');
      return;
    }
    if (pin !== pinConfirm) {
      setMessage('رمزا الدخول غير متطابقين.', 'error');
      return;
    }

    submitButton.disabled = true;
    try {
      const cloud = await cloudReady;
      let user;
      if (cloud.enabled) {
        user = await cloud.createAccount(username, pin, fullName, role, avatar);
      } else {
        const createdUser = await window.KidsGamesAuth.addPinUser({
          username,
          fullName,
          pin,
          role,
          avatar,
          provider: 'local',
          status: 'active'
        });
        if (!createdUser) {
          setMessage('اسم المستخدم مستخدم بالفعل أو بيانات الحساب غير صالحة.', 'error');
          return;
        }
        user = await window.KidsGamesAuth.loginWithPin(username, pin);
        if (!user) throw new Error('تعذر تسجيل الدخول إلى الحساب المحلي الجديد.');
      }
      setMessage('تم إنشاء الحساب بنجاح. جارٍ فتح المنصة...');
      setTimeout(() => redirectByRole(user), 350);
    } catch (error) {
      console.error('Unable to create account:', error);
      const message = error.code === 'auth/email-already-in-use'
        ? 'اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر.'
        : error.code === 'functions/resource-exhausted'
          ? 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى.'
          : error.code === 'functions/already-exists'
            ? 'اسم المستخدم مستخدم بالفعل. اختر اسمًا آخر.'
            : error.code === 'functions/not-found'
              ? 'خدمة إنشاء الحسابات غير مهيأة بعد. تواصل مع مسؤول الموقع.'
              : error.code === 'functions/unavailable' || error.code === 'auth/network-request-failed'
                ? 'تعذر الاتصال بخدمة الحسابات. تحقق من اتصال الإنترنت.'
                : error.code === 'auth/operation-not-allowed'
                  ? 'إنشاء الحسابات غير مفعّل في إعدادات Firebase.'
                  : error instanceof TypeError || error.code === 'functions/invalid-argument'
                    ? error.message
                    : 'تعذر إنشاء الحساب. تحقق من البيانات ثم حاول مرة أخرى.';
      setMessage(message, 'error');
    } finally {
      submitButton.disabled = false;
    }
  });

});
