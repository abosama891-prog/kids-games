document.addEventListener('DOMContentLoaded', async () => {
  const cloud = await window.KidsGamesCloudReady;
  const currentUser = window.KidsGamesAuth.getCurrentUser();
  if (!cloud?.enabled || !currentUser || currentUser.role !== 'admin'
    || cloud.getCurrentUserId?.() !== currentUser.id) {
    window.location.href = '../auth/index.html';
    return;
  }

  const logoutButton = document.getElementById('logout-button');
  const usersTableBody = document.getElementById('users-table-body');
  const userForm = document.getElementById('user-form');
  const userDialog = document.getElementById('user-dialog');
  const connectionStatus = document.getElementById('account-connection');
  const adminMessage = document.getElementById('admin-message');
  const userSearch = document.getElementById('user-search');
  const roleFilter = document.getElementById('role-filter');
  const emailToggle = document.getElementById('email-toggle');
  const usersTable = document.getElementById('users-table');
  const emptyUsers = document.getElementById('empty-users');
  const dialogTitle = document.getElementById('dialog-title');
  const statusField = document.getElementById('status-field');
  const statusInput = document.getElementById('status');
  const roleField = document.getElementById('role-field');
  const passwordHint = document.getElementById('password-hint');
  const passwordConfirmationField = document.getElementById('password-confirmation-field');
  const passwordConfirmationInput = document.getElementById('password-confirmation');
  const saveUserButton = document.getElementById('save-user-button');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const roleInput = document.getElementById('role');
  const addUserButton = document.getElementById('add-user-button');
  const lessonSettingsForm = document.getElementById('lesson-settings-form');
  const lessonSettingsMessage = document.getElementById('lesson-settings-message');
  const gameSettingsForm = document.getElementById('game-settings-form');
  const gameSettingsList = document.getElementById('game-settings-list');
  const gameSettingsMessage = document.getElementById('game-settings-message');
  const siteMaintenanceForm = document.getElementById('site-maintenance-form');
  const siteMaintenanceEnabled = document.getElementById('site-maintenance-enabled');
  const siteMaintenanceMessage = document.getElementById('site-maintenance-message');
  const siteMaintenanceExpectedTime = document.getElementById('site-maintenance-expected-time');
  const siteMaintenanceStatus = document.getElementById('site-maintenance-status');
  let editingUserId = null;
  let cloudAccounts = [];
  const cloudApi = cloud;
  let gameSettingsSaveQueue = Promise.resolve();

  const defaultLessonSettings = window.KidsGames.getLessonSettings();
  Object.entries(defaultLessonSettings).forEach(([key, value]) => {
    const input = lessonSettingsForm.elements.namedItem(key);
    if (input) input.value = String(value);
  });

  window.KidsGames.gameCatalog.forEach(game => {
    const label = document.createElement('label');
    label.className = 'game-availability-option';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.name = game.key;
    input.value = game.key;
    input.checked = window.KidsGames.getGameSettings().lockedGames.includes(game.key);
    const title = document.createElement('span');
    title.textContent = `${game.icon} ${game.title}`;
    const status = document.createElement('small');
    status.textContent = 'إيقاف للتحديث';
    label.append(input, title, status);
    gameSettingsList.appendChild(label);
  });

  function saveGameAvailability() {
    gameSettingsSaveQueue = gameSettingsSaveQueue
      .then(async () => {
        const settings = {
          lockedGames: Array.from(gameSettingsForm.querySelectorAll('input[type="checkbox"]:checked'))
            .map(input => input.value)
        };
        try {
          gameSettingsMessage.className = '';
          gameSettingsMessage.textContent = 'جارٍ حفظ حالة الألعاب...';

          await cloud.saveGameSettings(settings);
          window.KidsGames.saveGameSettings(settings);
          gameSettingsMessage.textContent = 'تم حفظ حالة الألعاب ومزامنتها مع جميع المستخدمين.';
        } catch (error) {
          console.error('Unable to save game availability settings:', error);
          gameSettingsMessage.className = 'game-settings-message error';
          gameSettingsMessage.textContent = 'تعذر حفظ حالة الألعاب في Firebase. تحقق من الاتصال والصلاحيات ثم أعد المحاولة.';
        }
      });
    return gameSettingsSaveQueue;
  }

  gameSettingsForm.addEventListener('change', event => {
    if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
      saveGameAvailability();
    }
  });

  gameSettingsForm.addEventListener('submit', event => {
    event.preventDefault();
    saveGameAvailability();
  });

  async function saveMaintenanceMode(enabled, message, expectedTime) {
    return cloud.saveMaintenanceMode(enabled, message, expectedTime);
  }

  siteMaintenanceForm.addEventListener('submit', async event => {
    event.preventDefault();
    const saveButton = document.getElementById('save-site-maintenance');
    saveButton.disabled = true;
    siteMaintenanceStatus.className = '';
    siteMaintenanceStatus.textContent = 'جارٍ حفظ وضع الصيانة في Firebase...';
    try {
      const saved = await saveMaintenanceMode(
        siteMaintenanceEnabled.checked,
        siteMaintenanceMessage.value.trim(),
        siteMaintenanceExpectedTime.value ? new Date(siteMaintenanceExpectedTime.value).toISOString() : ''
      );
      siteMaintenanceEnabled.checked = saved.enabled;
      siteMaintenanceMessage.value = saved.message;
      siteMaintenanceStatus.textContent = 'تم حفظ وضع الصيانة، وسيُحدّث للمستخدمين المتصلين فورًا.';
    } catch (error) {
      console.error('Unable to save site maintenance mode:', error);
      siteMaintenanceStatus.textContent = 'تعذر حفظ وضع الصيانة في Firebase. تحقق من الاتصال والصلاحيات ثم أعد المحاولة.';
      siteMaintenanceStatus.className = 'error';
    } finally {
      saveButton.disabled = false;
    }
  });

  lessonSettingsForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!lessonSettingsForm.reportValidity()) return;
    const settings = Object.fromEntries(
      Array.from(lessonSettingsForm.elements)
        .filter(element => element instanceof HTMLInputElement)
        .map(input => [input.name, Number(input.value)])
    );
    try {
      await cloudApi.saveLessonSettings(settings);
      window.KidsGames.saveLessonSettings(settings);
      lessonSettingsMessage.className = '';
      lessonSettingsMessage.textContent = 'تم حفظ المستويات ومزامنتها مع جميع المستخدمين.';
    } catch (error) {
      console.error('Unable to save lesson unlock settings:', error);
      lessonSettingsMessage.className = 'error';
      lessonSettingsMessage.textContent = 'تعذر حفظ الإعدادات. تحقق من القيم واتصال Firebase.';
    }
  });

  function showMessage(text, type = 'success') {
    adminMessage.textContent = text;
    adminMessage.className = `admin-message ${type}`;
    adminMessage.hidden = false;
  }

  function createCell(row, text, label) {
    const cell = document.createElement('td');
    cell.dataset.label = label;
    cell.className = {
      'اسم المستخدم': 'username-cell',
      'معرّف الدخول': 'email-cell',
      'مصدر الحساب': 'provider-cell'
    }[label] || '';
    cell.textContent = text;
    row.appendChild(cell);
    return cell;
  }

  function createSelectCell(row, field, value, options, userId) {
    const cell = document.createElement('td');
    cell.className = `${field}-cell`;
    cell.dataset.label = field === 'role' ? 'الدور' : 'الحالة';
    const select = document.createElement('select');
    select.dataset.field = field;
    select.dataset.id = userId;
    select.dataset.value = value;
    const user = cloudAccounts.find(item => item.id === userId);
    select.disabled = user?.role === 'admin' || Boolean(cloudAccounts && userId === currentUser.id);
    select.setAttribute('aria-label', field === 'role' ? 'دور المستخدم' : 'حالة المستخدم');
    options.forEach(([optionValue, label]) => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = label;
      option.selected = value === optionValue;
      select.appendChild(option);
    });
    cell.appendChild(select);
    row.appendChild(cell);
  }

  function renderUsers() {
    let users;
    try {
      users = cloudAccounts;
    } catch (error) {
      console.error('Unable to render saved accounts:', error);
      usersTableBody.replaceChildren();
      emptyUsers.textContent = 'تعذر قراءة الحسابات المحفوظة. لم يتم تغيير البيانات.';
      emptyUsers.hidden = false;
      showMessage(error.message || 'تعذر قراءة الحسابات المحفوظة.', 'error');
      return;
    }
    emptyUsers.textContent = 'لا يوجد مستخدمون يطابقون البحث.';
    usersTableBody.replaceChildren();
    const query = userSearch.value.trim().toLocaleLowerCase();
    const selectedRole = roleFilter.value;
    const visibleUsers = users.filter(user => {
      const matchesQuery = !query || [user.username, user.email]
        .some(value => String(value || '').toLocaleLowerCase().includes(query));
      return matchesQuery && (!selectedRole || user.role === selectedRole);
    });
    emptyUsers.hidden = visibleUsers.length > 0;

    visibleUsers.forEach(user => {
      const row = document.createElement('tr');
      createCell(row, user.username, 'اسم المستخدم');
      createCell(row, user.email || '—', 'معرّف الدخول').classList.add('email-column');
      createSelectCell(row, 'role', user.role, [
        ['child', 'طفل'],
        ['parent', 'ولي أمر'],
        ['teacher', 'معلم'],
        ['admin', 'مدير']
      ], user.id);
      createSelectCell(row, 'status', user.status, [
        ['active', 'نشط'],
        ['inactive', 'غير نشط']
      ], user.id);
      createCell(row, user.provider === 'google' ? 'Google' : 'Firebase Auth', 'مصدر الحساب');

      const actions = document.createElement('td');
      actions.className = 'table-actions';
      actions.dataset.label = 'إجراءات';
      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'edit-action';
      editButton.dataset.action = 'edit';
      editButton.dataset.id = user.id;
      editButton.textContent = 'تعديل';
      editButton.setAttribute('aria-label', `تعديل ${user.username}`);
      const deleteButton = document.createElement('button');
      deleteButton.type = 'button';
      deleteButton.className = 'table-action';
      deleteButton.dataset.action = 'delete';
      deleteButton.dataset.id = user.id;
      deleteButton.textContent = 'تعطيل';
      deleteButton.disabled = user.id === currentUser.id;
      deleteButton.title = user.id === currentUser.id ? 'لا يمكن تعطيل الحساب المستخدم حاليًا.' : '';
      deleteButton.setAttribute('aria-label', `تعطيل ${user.username}`);
      actions.append(editButton, deleteButton);
      row.appendChild(actions);
      usersTableBody.appendChild(row);
    });
  }

  function openUserDialog(user = null) {
    editingUserId = user?.id || null;
    userForm.reset();
    userForm.dataset.mode = user ? 'edit' : 'add';
    dialogTitle.textContent = user ? 'تعديل بيانات المستخدم' : 'إضافة مستخدم جديد';
    saveUserButton.textContent = user ? 'حفظ المستخدم' : 'إضافة المستخدم';
    roleField.hidden = user?.role === 'admin';
    statusField.hidden = !user || user.role === 'admin';
    passwordInput.required = !user;
    passwordInput.value = '';
    passwordConfirmationInput.value = '';
    passwordInput.disabled = Boolean(user);
    passwordConfirmationInput.disabled = passwordInput.disabled;
    passwordConfirmationField.hidden = passwordInput.disabled;
    passwordConfirmationInput.required = !passwordInput.disabled && !user;
    usernameInput.disabled = Boolean(user);
    roleInput.disabled = user?.role === 'admin';
    statusInput.disabled = user?.role === 'admin';
    roleInput.title = '';
    statusInput.title = '';
    passwordInput.placeholder = user ? 'اتركها فارغة دون تغيير' : '6 أحرف على الأقل';
    passwordHint.textContent = user
      ? 'تغيير كلمة مرور مستخدم آخر غير متاح من التطبيق.'
      : 'مطلوبة للحساب الجديد (6 أحرف على الأقل).';
    if (user) {
      usernameInput.value = user.username;
      roleInput.value = user.role;
      statusInput.value = user.status;
      if (user.role === 'admin') {
        roleInput.title = 'لا يمكن تغيير صلاحية حساب المدير.';
        statusInput.title = 'لا يمكن تغيير حالة حساب المدير.';
      }
      if (user.provider === 'google') {
        passwordInput.disabled = true;
        passwordHint.textContent = 'تغيير كلمة المرور غير متاح لحساب Google.';
      }
    } else {
      passwordInput.disabled = false;
      roleInput.value = 'child';
    }
    userDialog.showModal();
    usernameInput.focus();
  }

  function validateUniqueIdentity(payload, excludedId = null) {
    const identities = new Set(
      [payload.username, payload.email]
        .map(value => String(value || '').trim().toLocaleLowerCase('en-US'))
        .filter(Boolean)
    );
    const users = cloudAccounts;
    return !users.some(user =>
      user.id !== excludedId &&
      [user.username, user.email]
        .some(value => identities.has(String(value || '').trim().toLocaleLowerCase('en-US')))
    );
  }

  function validatePasswordConfirmation() {
    const confirmationVisible = !passwordInput.disabled;
    passwordConfirmationField.hidden = !confirmationVisible;
    const confirmationRequired = confirmationVisible
      && (!userForm.dataset.mode || userForm.dataset.mode === 'add' || passwordInput.value.length > 0);
    passwordConfirmationInput.required = confirmationRequired;
    passwordConfirmationInput.setCustomValidity(
      confirmationRequired && passwordInput.value !== passwordConfirmationInput.value
        ? 'كلمتا المرور غير متطابقتين.'
        : ''
    );
  }

  async function refreshCloudAccounts() {
    cloudAccounts = await window.KidsGamesCloud.listAccounts();
    renderUsers();
  }

  addUserButton.addEventListener('click', () => {
    openUserDialog();
  });
  document.getElementById('close-dialog-button').addEventListener('click', () => userDialog.close());
  document.getElementById('cancel-dialog-button').addEventListener('click', () => userDialog.close());
  userDialog.addEventListener('click', event => {
    if (event.target === userDialog) userDialog.close();
  });
  userSearch.addEventListener('input', renderUsers);
  passwordInput.addEventListener('input', validatePasswordConfirmation);
  passwordConfirmationInput.addEventListener('input', validatePasswordConfirmation);
  roleFilter.addEventListener('change', renderUsers);
  emailToggle.addEventListener('click', () => {
    const isVisible = usersTable.classList.toggle('email-hidden') === false;
    emailToggle.setAttribute('aria-expanded', String(isVisible));
    emailToggle.textContent = isVisible ? '◉ إخفاء البريد' : '◉ إظهار البريد';
  });

  usersTableBody.addEventListener('change', async event => {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) return;
    const { id, field } = target.dataset;
    if (!id || !['role', 'status'].includes(field)) return;

    let user;
    try {
      user = cloudAccounts.find(item => item.id === id);
    } catch (error) {
      console.error('Unable to find the account to update:', error);
      showMessage(error.message || 'تعذر قراءة الحسابات.', 'error');
      return;
    }
    if (!user) {
      showMessage('تعذر العثور على الحساب. حدّث الصفحة وحاول مرة أخرى.', 'error');
      renderUsers();
      return;
    }
    let updated;
    try {
      updated = await cloud.updateAccount({
        uid: user.uid,
        oldUsername: user.username,
        username: user.username,
        role: field === 'role' ? target.value : user.role,
        status: field === 'status' ? target.value : user.status,
        email: user.email
      });
    } catch (error) {
      console.error('Unable to update Firebase account:', error);
      showMessage('تعذر تحديث الحساب السحابي.', 'error');
      await refreshCloudAccounts();
      return;
    }
    if (!updated) {
      showMessage('تعذر حفظ التغيير. لم يتم العثور على المستخدم.', 'error');
      await refreshCloudAccounts();
      return;
    }
    showMessage('تم حفظ التغيير في قاعدة البيانات.');
    await refreshCloudAccounts();
  });

  usersTableBody.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.action;
    const userId = target.dataset.id;

    if (action === 'edit' && userId) {
      let user;
      try {
        user = cloudAccounts.find(item => item.id === userId);
      } catch (error) {
        console.error('Unable to read account before deletion:', error);
        showMessage(error.message || 'تعذر قراءة الحسابات.', 'error');
        return;
      }
      if (user) openUserDialog(user);
      return;
    }
    if (action === 'delete' && userId) {
      if (userId === currentUser.id) {
        showMessage('لا يمكن حذف الحساب الذي تستخدمه حاليًا.', 'error');
        return;
      }
      const user = cloudAccounts.find(item => item.id === userId);
      if (!user || !window.confirm(`هل تريد تعطيل حساب "${user.username}"؟ لن يتمكن من تسجيل الدخول إلى المنصة.`)) return;

      try {
        await cloud.deleteAccount({ uid: user.uid, username: user.username });
      } catch (error) {
        console.error('Unable to delete Firebase account:', error);
        showMessage(error.message || 'تعذر حذف الحساب السحابي.', 'error');
        return;
      }
      await refreshCloudAccounts();
      showMessage('تم تعطيل الحساب. لم يتم حذف هويته من Firebase Authentication.');
    }
  });

  userForm.addEventListener('submit', async event => {
    event.preventDefault();
    const isEditing = userForm.dataset.mode === 'edit';
    const payload = {
      username: usernameInput.value.trim(),
      fullName: usernameInput.value.trim(),
      role: roleInput.value,
      status: isEditing ? statusInput.value : 'active'
    };
    if (passwordInput.value) payload.password = passwordInput.value;
    if (!isEditing) payload.password = passwordInput.value;
    if (!/^[a-z0-9._-]{1,32}$/i.test(payload.username)) {
      showMessage('اسم المستخدم يجب أن يكون من 1 إلى 32 حرفًا إنجليزيًا أو رقمًا أو . _ -.', 'error');
      usernameInput.focus();
      return;
    }
    validatePasswordConfirmation();
    if (!userForm.reportValidity()) return;
    if (!validateUniqueIdentity(payload, isEditing ? editingUserId : null)) {
      showMessage('اسم المستخدم مسجّل بالفعل. اختر اسمًا مختلفًا.', 'error');
      return;
    }

    let existing = null;
    try {
      existing = isEditing ? cloudAccounts.find(item => item.id === editingUserId) : null;
    } catch (error) {
      console.error('Unable to read account before saving:', error);
      showMessage(error.message || 'تعذر قراءة الحسابات.', 'error');
      return;
    }
    if (isEditing && !existing) {
      showMessage('تعذر العثور على الحساب. حدّث الصفحة وحاول مرة أخرى.', 'error');
      userDialog.close();
      renderUsers();
      return;
    }

    if (isEditing) {
      if (existing?.role === 'admin'
        && (payload.role !== existing.role || payload.status !== existing.status)) {
        showMessage('لا يمكن تغيير صلاحية المدير أو حالة حسابه.', 'error');
        return;
      }
      try {
        await cloud.updateAccount({
          uid: existing.uid,
          oldUsername: existing.username,
          email: existing.email || '',
          ...payload
        });
        userDialog.close();
        await refreshCloudAccounts();
        showMessage('تم تحديث بيانات الحساب في قاعدة البيانات.');
      } catch (error) {
        console.error('Unable to update Firebase account:', error);
        showMessage(error.message || 'تعذر حفظ التعديلات في قاعدة البيانات.', 'error');
      }
    } else {
      try {
        const added = await cloud.createManagedAccount(payload);
        userDialog.close();
        await refreshCloudAccounts();
        showMessage(`تم إنشاء حساب Firebase للمستخدم ${added.username}.`);
      } catch (error) {
        console.error('Unable to create Firebase account:', error);
        showMessage(error.message || 'تعذر إنشاء الحساب.', 'error');
      }
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        await cloud.signOut();
        window.location.href = '../auth/index.html';
      } catch (error) {
        console.error('Unable to sign out:', error);
        showMessage('تعذر تسجيل الخروج. حاول مرة أخرى.', 'error');
      }
    });
  }

  try {
      const savedSettings = await cloud.getLessonSettings();
      if (savedSettings) {
        window.KidsGames.saveLessonSettings(savedSettings);
        Object.entries(savedSettings).forEach(([key, value]) => {
          const input = lessonSettingsForm.elements.namedItem(key);
          if (input) input.value = String(value);
        });
      } else {
        await cloud.saveLessonSettings(defaultLessonSettings);
      }
      const savedGameSettings = await cloud.getGameSettings();
      if (savedGameSettings) {
        window.KidsGames.saveGameSettings(savedGameSettings);
      } else {
        await cloud.saveGameSettings(window.KidsGames.getGameSettings());
      }
      gameSettingsForm.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = window.KidsGames.getGameSettings().lockedGames.includes(input.value);
      });
      cloudAccounts = await cloud.listAccounts();
      const maintenance = await cloud.getMaintenanceMode();
      siteMaintenanceEnabled.checked = maintenance.enabled;
      siteMaintenanceMessage.value = maintenance.message;
      if (maintenance.expectedTime) {
        const expectedDate = new Date(maintenance.expectedTime);
        if (!Number.isNaN(expectedDate.valueOf())) {
          expectedDate.setMinutes(expectedDate.getMinutes() - expectedDate.getTimezoneOffset());
          siteMaintenanceExpectedTime.value = expectedDate.toISOString().slice(0, 16);
        }
      }
      renderUsers();
      connectionStatus.className = 'connection-status';
      connectionStatus.textContent = `الحسابات والتقدم مرتبطان بـ Firebase (${cloud.projectId}). يمكنك إنشاء الحسابات وإدارة أدوارها وحالاتها مباشرةً.`;
  } catch (error) {
    console.error('Unable to check account connection:', error);
    usersTableBody.replaceChildren();
    connectionStatus.className = 'connection-status offline';
    connectionStatus.textContent = 'تعذر تحميل الحسابات أو الإعدادات من Firebase. لم يتم استخدام نسخة محلية.';
  }
});
