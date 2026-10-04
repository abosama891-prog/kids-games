document.addEventListener('DOMContentLoaded', () => {
  const authMessage = document.getElementById('auth-message');
  const loginPanel = document.getElementById('login-panel');
  const rolePanel = document.getElementById('role-panel');
  const loginForm = document.getElementById('login-form');
  const roleButtons = document.querySelectorAll('.role-btn');
  const googleButton = document.getElementById('google-login-button');
  const googleSetupMessage = document.getElementById('google-setup-message');
  let signedInUser = null;

  function setMessage(text, type = 'success') {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
  }

  function showRoleSelection(user) {
    signedInUser = user;
    if (user.role === 'admin') {
      redirectByRole(user);
      return;
    }
    loginPanel.hidden = true;
    rolePanel.hidden = false;
    document.getElementById('signed-in-name').textContent = `تم تسجيل الدخول: ${user.fullName}`;
    setMessage('اختر الدور للمتابعة.');
  }

  function redirectByRole(user) {
    if (user.role === 'admin') {
      window.location.href = '../index/index.html';
      return;
    }
    window.location.href = '../index/index.html';
  }

  const currentUser = window.KidsGamesAuth?.getCurrentUser?.();

  const cloudReady = window.KidsGamesCloudReady.then(cloud => {
    googleButton.disabled = !cloud.enabled;
    if (!cloud.enabled) {
      googleSetupMessage.textContent = cloud.reason === 'missing-config'
        ? 'تسجيل الدخول ومزامنة التقدم يحتاجان إعداد Firebase أولًا.'
        : 'تعذر الاتصال بخدمة الحسابات السحابية.';
    }
    if (currentUser) {
      if (cloud.enabled) redirectByRole(window.KidsGamesAuth.getCurrentUser() || currentUser);
      else showRoleSelection(currentUser);
    }
    return cloud;
  });

  loginForm.addEventListener('submit', async event => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const submitButton = loginForm.querySelector('[type="submit"]');
    submitButton.disabled = true;
    try {
      const cloud = await cloudReady;
      const user = cloud.enabled
        ? await cloud.signInWithUsername(username, password)
        : window.KidsGamesAuth.loginWithUsername(username, password);
      if (!user) {
        setMessage('اسم المستخدم أو كلمة المرور غير صحيحة.', 'error');
        return;
      }
      if (cloud.enabled) redirectByRole(user);
      else showRoleSelection(user);
    } catch (error) {
      console.error('Unable to sign in with username:', error);
      const message = error.code === 'auth/too-many-requests'
        ? 'محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.'
        : error.code === 'auth/network-request-failed'
          ? 'تعذر الاتصال بخدمة تسجيل الدخول. تحقق من اتصال الإنترنت.'
          : 'اسم المستخدم أو كلمة المرور غير صحيحة.';
      setMessage(message, 'error');
    } finally {
      submitButton.disabled = false;
    }
  });

  googleButton.addEventListener('click', async () => {
    googleButton.disabled = true;
    setMessage('جارٍ الاتصال بحساب Google...');
    try {
      const cloud = await window.KidsGamesCloudReady;
      if (!cloud.enabled) {
        setMessage('يجب إعداد Firebase لتسجيل الدخول بحساب Google.', 'error');
        return;
      }
      const user = await cloud.signInWithGoogle();
      redirectByRole(user);
    } catch (error) {
      const message = error.code === 'auth/popup-closed-by-user'
        ? 'تم إغلاق نافذة Google قبل إكمال الدخول.'
        : error.code === 'auth/unauthorized-domain'
          ? 'أضف نطاق الموقع إلى النطاقات المسموح بها في Firebase.'
          : error.code === 'auth/operation-not-allowed'
            ? 'فعّل تسجيل الدخول عبر Google في إعدادات Firebase.'
            : 'تعذر تسجيل الدخول بحساب Google.';
      setMessage(message, 'error');
    } finally {
      googleButton.disabled = false;
    }
  });

  roleButtons.forEach(button => {
    button.addEventListener('click', async () => {
      if (!signedInUser) return;
      const selectedRole = button.dataset.role;
      if (selectedRole === 'admin' && signedInUser.role !== 'admin') return;

      const updatedUser = window.KidsGamesAuth.updateUser(signedInUser.id, { role: selectedRole });
      if (!updatedUser) {
        setMessage('تعذر حفظ نوع الحساب.', 'error');
        return;
      }
      signedInUser = window.KidsGamesAuth.setCurrentUser(updatedUser);
      setMessage(`أهلًا ${updatedUser.fullName}`, 'success');
      setTimeout(() => redirectByRole(updatedUser), 350);
    });
  });

  document.getElementById('change-account').addEventListener('click', async () => {
    const cloud = await window.KidsGamesCloudReady;
    if (cloud.enabled && cloud.getCurrentUserId?.()) await cloud.signOut();
    else window.KidsGamesAuth.logoutUser();
    signedInUser = null;
    rolePanel.hidden = true;
    loginPanel.hidden = false;
    setMessage('');
  });
});
