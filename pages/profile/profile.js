document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = window.KidsGamesAuth?.getCurrentUser?.();
  if (!currentUser) {
    window.location.href = '../auth/index.html';
    return;
  }

  const form = document.getElementById('profile-form');
  const fullNameInput = document.getElementById('full-name');
  const currentCredentialInput = document.getElementById('current-credential');
  const newCredentialInput = document.getElementById('new-credential');
  const confirmCredentialInput = document.getElementById('confirm-credential');
  const credentialSection = document.getElementById('credential-section');
  const credentialHelp = document.getElementById('credential-help');
  const message = document.getElementById('profile-message');
  const saveButton = form.querySelector('[type="submit"]');
  const isGoogleAccount = currentUser.provider === 'google';

  fullNameInput.value = currentUser.fullName || currentUser.username || '';
  const selectedAvatar = form.querySelector(`input[name="avatar"][value="${currentUser.avatar}"]`)
    || form.querySelector('input[name="avatar"][value="child"]');
  selectedAvatar.checked = true;

  if (isGoogleAccount) {
    credentialSection.hidden = true;
    credentialHelp.textContent = 'تُدار كلمة مرور هذا الحساب من حساب Google.';
  }

  function normalizePin(value) {
    return String(value || '').replace(/[٠-٩۰-۹]/g, digit => {
      const code = digit.charCodeAt(0);
      return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
    });
  }

  function showMessage(text, isError = false) {
    message.textContent = text;
    message.classList.toggle('error', isError);
    message.hidden = false;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    message.hidden = true;
    if (!form.reportValidity()) return;

    const fullName = fullNameInput.value.trim();
    const avatar = form.querySelector('input[name="avatar"]:checked')?.value;
    const currentCredential = currentCredentialInput.value;
    const newCredential = normalizePin(newCredentialInput.value);
    const confirmCredential = normalizePin(confirmCredentialInput.value);
    const changingCredential = Boolean(currentCredential || newCredential || confirmCredential);

    if (!fullName || fullName.length > 60) {
      showMessage('أدخل اسمًا صحيحًا لا يتجاوز 60 حرفًا.', true);
      return;
    }
    if (changingCredential && (isGoogleAccount || !currentCredential || !newCredential || !confirmCredential)) {
      showMessage('أكمل خانات كلمة المرور الحالية والجديدة والتأكيد.', true);
      return;
    }
    if (changingCredential && newCredential !== confirmCredential) {
      showMessage('تأكيد كلمة المرور الجديدة غير متطابق.', true);
      return;
    }
    if (changingCredential && !/^\d{4}$/.test(newCredential)
      && (newCredential.length < 6 || newCredential.length > 128)) {
      showMessage('استخدم رمزًا من 4 أرقام أو كلمة مرور من 6 إلى 128 حرفًا.', true);
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = 'جارٍ الحفظ...';
    try {
      const cloud = await window.KidsGamesCloudReady;
      const updates = {
        fullName,
        avatar,
        ...(changingCredential ? { currentCredential, newCredential } : {})
      };
      if (cloud.enabled) await cloud.updateOwnProfile(updates);
      else await window.KidsGamesAuth.updateOwnProfile(updates);

      currentCredentialInput.value = '';
      newCredentialInput.value = '';
      confirmCredentialInput.value = '';
      showMessage('تم حفظ بيانات حسابك بنجاح.');
    } catch (error) {
      console.error('Unable to update own profile:', error);
      showMessage(error.message || 'تعذر حفظ بيانات الحساب. حاول مرة أخرى.', true);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = 'حفظ التغييرات';
    }
  });
});
