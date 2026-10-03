document.addEventListener('DOMContentLoaded', () => {
  const authMessage = document.getElementById('auth-message');
  const loginPanel = document.getElementById('login-panel');
  const rolePanel = document.getElementById('role-panel');
  const loginForm = document.getElementById('login-form');
  const roleButtons = document.querySelectorAll('.role-btn');
  const googleButton = document.getElementById('google-login-button');
  const googleSetupMessage = document.getElementById('google-setup-message');
  const adminRoleButton = document.querySelector('.role-btn.admin');
  let signedInUser = null;

  function setMessage(text, type = 'success') {
    authMessage.textContent = text;
    authMessage.className = `auth-message ${type}`;
  }

  function showRoleSelection(user) {
    signedInUser = user;
    loginPanel.hidden = true;
    rolePanel.hidden = false;
    adminRoleButton.hidden = user.role !== 'admin';
    document.getElementById('signed-in-name').textContent = `تم تسجيل الدخول: ${user.fullName}`;
    setMessage('اختر الدور للمتابعة.');
  }

  function redirectByRole(user) {
    if (user.role === 'admin') {
      window.location.href = '../admin/index.html';
      return;
    }
    window.location.href = '../index/index.html';
  }

  const currentUser = window.KidsGamesAuth?.getCurrentUser?.();
  if (currentUser) {
    showRoleSelection(currentUser);
  }

  window.KidsGamesCloudReady.then(cloud => {
    googleButton.disabled = !cloud.enabled;
    if (!cloud.enabled) {
      googleSetupMessage.textContent = cloud.reason === 'missing-config'
        ? 'تسجيل Google يحتاج إعداد Firebase أولًا.'
        : 'تعذر الاتصال بخدمة الحسابات السحابية.';
    }
  });

  loginForm.addEventListener('submit', event => {
    event.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const user = window.KidsGamesAuth.loginWithUsername(username, password);
    if (!user) {
      setMessage('اسم المستخدم أو كلمة المرور غير صحيحة.', 'error');
      return;
    }
    showRoleSelection(user);
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
      showRoleSelection(user);
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
      const cloud = await window.KidsGamesCloudReady;
      if (updatedUser.provider === 'google' && cloud.enabled && !(await cloud.saveProfile(updatedUser))) {
        setMessage('تعذر حفظ نوع الحساب على حسابك.', 'error');
        return;
      }
      setMessage(`أهلًا ${updatedUser.fullName}`, 'success');
      setTimeout(() => redirectByRole(updatedUser), 350);
    });
  });

  document.getElementById('change-account').addEventListener('click', async () => {
    const cloud = await window.KidsGamesCloudReady;
    if (cloud.enabled) await cloud.signOut();
    else window.KidsGamesAuth.logoutUser();
    signedInUser = null;
    rolePanel.hidden = true;
    loginPanel.hidden = false;
    setMessage('');
  });
});
