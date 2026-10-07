document.addEventListener('DOMContentLoaded', async () => {
  const currentUser = window.KidsGamesAuth?.getCurrentUser?.();
  if (!currentUser || currentUser.role !== 'admin') {
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
  const maintenanceForm = document.getElementById('maintenance-form');
  const maintenanceToggle = document.getElementById('maintenance-toggle');
  const maintenanceMessageInput = document.getElementById('maintenance-message');
  const maintenanceExpectedTimeInput = document.getElementById('maintenance-expected-time');
  const maintenanceSaveButton = document.getElementById('save-maintenance');
  const maintenanceStatus = document.getElementById('maintenance-status');
  let editingUserId = null;
  let cloudAccounts = null;
  let cloudApi = null;
  let maintenanceEnabled = false;
  let gameSettingsSaveQueue = Promise.resolve();

  const defaultLessonSettings = window.KidsGames.getLessonSettings();
  Object.entries(defaultLessonSettings).forEach(([key, value]) => {
    const input = lessonSettingsForm.elements.namedItem(key);
    if (input) input.value = String(value);
  });

  function updateMaintenanceToggle() {
    maintenanceToggle.textContent = maintenanceEnabled ? 'إيقاف وضع الصيانة' : 'تفعيل وضع الصيانة';
    maintenanceToggle.setAttribute('aria-pressed', String(maintenanceEnabled));
  }

  async function getMaintenanceMode() {
    if (!cloudApi) throw new Error('يجب الاتصال بحساب مدير Firebase لقراءة وضع الصيانة.');
    return cloudApi.getMaintenanceMode();
  }

  async function saveMaintenanceMode(enabled, message, expectedTime) {
    if (!cloudApi) throw new Error('يجب الاتصال بحساب مدير Firebase لحفظ وضع الصيانة.');
    return cloudApi.saveMaintenanceMode({ enabled, message, expectedTime });
  }

  maintenanceToggle.addEventListener('click', () => {
    maintenanceEnabled = !maintenanceEnabled;
    updateMaintenanceToggle();
  });

  maintenanceForm.addEventListener('submit', async event => {
    event.preventDefault();
    maintenanceSaveButton.disabled = true;
    maintenanceStatus.className = '';
    maintenanceStatus.textContent = 'جارٍ حفظ إعداد الصيانة...';
    try {
      const saved = await saveMaintenanceMode(
        maintenanceEnabled,
        maintenanceMessageInput.value.trim(),
        maintenanceExpectedTimeInput.value || null
      );
      maintenanceEnabled = saved.enabled;
      updateMaintenanceToggle();
      maintenanceStatus.textContent = 'تم حفظ وضع الصيانة ومزامنته مع المستخدمين.';
    } catch (error) {
      console.error('Unable to save maintenance mode:', error);
      maintenanceStatus.className = 'error';
      maintenanceStatus.textContent = error.message || 'تعذر حفظ وضع الصيانة. تحقق من اتصال Firebase وصلاحيات المدير.';
    } finally {
      maintenanceSaveButton.disabled = !cloudApi;
    }
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
        let savedLocally = false;

        try {
          window.KidsGames.saveGameSettings(settings);
          savedLocally = true;
          gameSettingsMessage.className = '';
          gameSettingsMessage.textContent = 'جارٍ حفظ حالة الألعاب...';

          if (cloudApi && currentUser.role === 'admin'
            && cloudApi.isCurrentUserLinked?.()) {
            await cloudApi.saveGameSettings(settings);
            gameSettingsMessage.textContent = 'تم حفظ حالة الألعاب ومزامنتها مع جميع المستخدمين.';
          } else {
            gameSettingsMessage.textContent = 'تم حفظ حالة الألعاب على هذا الجهاز فقط.';
          }
        } catch (error) {
          console.error('Unable to save game availability settings:', error);
          gameSettingsMessage.className = 'game-settings-message error';
          gameSettingsMessage.textContent = savedLocally
            ? 'حُفظت الإعدادات على هذا الجهاز، وتعذرت مزامنتها. تحقق من اتصال Firebase ثم أعد المحاولة.'
            : 'تعذر حفظ الإعدادات على هذا الجهاز. تحقق من مساحة التخزين ثم أعد المحاولة.';
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

  lessonSettingsForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (!lessonSettingsForm.reportValidity()) return;
    const settings = Object.fromEntries(
      Array.from(lessonSettingsForm.elements)
        .filter(element => element instanceof HTMLInputElement)
        .map(input => [input.name, Number(input.value)])
    );
    try {
      if (cloudAccounts && cloudApi) await cloudApi.saveLessonSettings(settings);
      window.KidsGames.saveLessonSettings(settings);
      lessonSettingsMessage.className = '';
      lessonSettingsMessage.textContent = cloudAccounts
        ? 'تم حفظ المستويات ومزامنتها مع جميع المستخدمين.'
        : 'تم حفظ مستويات الفتح على هذا الجهاز.';
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

  function getVisibleAccounts() {
    const localAccounts = window.KidsGamesAuth.getUsers();
    if (!cloudAccounts) return localAccounts;
    const cloudIds = new Set(cloudAccounts.map(user => user.id));
    const cloudUsernames = new Set(cloudAccounts.map(user => user.username.toLocaleLowerCase()));
    return [
      ...cloudAccounts,
      ...localAccounts.filter(user =>
        !cloudIds.has(user.id) && !cloudUsernames.has(user.username.toLocaleLowerCase())
      )
    ];
  }

  function findAccount(userId) {
    return cloudAccounts?.find(user => user.id === userId)
      || window.KidsGamesAuth.getUsers().find(user => user.id === userId)
      || null;
  }

  function isCloudAccount(userId) {
    return Boolean(cloudAccounts?.some(user => user.id === userId));
  }

  function createSelectCell(row, field, value, options, userId) {
    const cell = document.createElement('td');
    cell.className = `${field}-cell`;
    cell.dataset.label = field === 'role' ? 'الدور' : 'الحالة';
    const select = document.createElement('select');
    select.dataset.field = field;
    select.dataset.id = userId;
    select.dataset.value = value;
    const user = findAccount(userId);
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
      users = getVisibleAccounts();
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
      createCell(row, user.provider === 'google' ? 'Google' : 'محلي', 'مصدر الحساب');

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
      deleteButton.textContent = 'حذف';
      deleteButton.disabled = isCloudAccount(user.id) || user.id === currentUser.id;
      deleteButton.title = isCloudAccount(user.id) ? 'حذف الحسابات السحابية غير متاح من هذه اللوحة.' : '';
      deleteButton.setAttribute('aria-label', `حذف ${user.username}`);
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
    passwordInput.disabled = (Boolean(cloudAccounts) && Boolean(user)) || user?.provider === 'google';
    passwordConfirmationInput.disabled = passwordInput.disabled;
    passwordConfirmationField.hidden = passwordInput.disabled;
    passwordConfirmationInput.required = !passwordInput.disabled && !user;
    usernameInput.disabled = Boolean(cloudAccounts) && Boolean(user);
    roleInput.disabled = user?.role === 'admin';
    statusInput.disabled = user?.role === 'admin';
    roleInput.title = '';
    statusInput.title = '';
    passwordInput.placeholder = user ? 'اتركها فارغة دون تغيير' : '6 أحرف على الأقل';
    passwordHint.textContent = cloudAccounts && user
      ? 'تُدار كلمة المرور من Firebase Console.'
      : user
        ? 'اختيارية؛ اتركها فارغة للإبقاء على كلمة المرور الحالية.'
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
    const users = getVisibleAccounts();
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
      user = findAccount(id);
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
    if (isCloudAccount(id)) {
      try {
        updated = await window.KidsGamesCloud.updateAccount({
          uid: user.uid,
          oldUsername: user.username,
          username: user.username,
          role: field === 'role' ? target.value : user.role,
          status: field === 'status' ? target.value : user.status,
          email: user.email
        });
      } catch (error) {
        console.error('Unable to update cloud account:', error);
        showMessage('تعذر تحديث الحساب السحابي.', 'error');
        await refreshCloudAccounts();
        return;
      }
    } else {
      try {
        updated = window.KidsGamesAuth.updateUser(id, { [field]: target.value });
      } catch (error) {
        console.error('Unable to save local account changes:', error);
        showMessage(error.message || 'تعذر حفظ التغيير.', 'error');
        renderUsers();
        return;
      }
    }
    if (!updated) {
      showMessage('تعذر حفظ التغيير. لم يتم العثور على المستخدم.', 'error');
      if (isCloudAccount(id)) await refreshCloudAccounts();
      else renderUsers();
      return;
    }
    if (id === currentUser.id && !isCloudAccount(id)) window.KidsGamesAuth.setCurrentUser(updated);
    showMessage(isCloudAccount(id) ? 'تم حفظ التغيير في قاعدة البيانات.' : 'تم حفظ التغيير على هذا الجهاز.');
    if (isCloudAccount(id)) await refreshCloudAccounts();
    else renderUsers();
  });

  usersTableBody.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.action;
    const userId = target.dataset.id;

    if (action === 'edit' && userId) {
      let user;
      try {
        user = findAccount(userId);
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
      const user = findAccount(userId);
      if (!user || !window.confirm(`هل تريد حذف حساب "${user.username}"؟ لا يمكن التراجع عن ذلك.`)) return;

      if (isCloudAccount(userId)) {
        showMessage('حذف الحسابات السحابية غير متاح من هذه اللوحة.', 'error');
        return;
      }
      try {
        if (!window.KidsGamesAuth.deleteUser(userId)) {
          showMessage('تعذر الحذف. يجب أن يبقى مدير واحد على الأقل، وتأكد من إمكانية حفظ البيانات.', 'error');
          return;
        }
      } catch (error) {
        console.error('Unable to delete local account:', error);
        showMessage(error.message || 'تعذر حذف الحساب.', 'error');
        return;
      }
      renderUsers();
      showMessage('تم حذف الحساب من قائمة هذا الجهاز.');
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
      existing = isEditing ? findAccount(editingUserId) : null;
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
      if (isCloudAccount(editingUserId)) {
        try {
          await window.KidsGamesCloud.updateAccount({
            uid: existing.uid,
            oldUsername: existing.username,
            email: existing.email || '',
            ...payload
          });
          userDialog.close();
          await refreshCloudAccounts();
          showMessage('تم تحديث بيانات الحساب في قاعدة البيانات.');
        } catch (error) {
          console.error('Unable to update cloud account:', error);
          showMessage('تعذر حفظ التعديلات في قاعدة البيانات.', 'error');
        }
        return;
      }
      let updated;
      try {
        updated = window.KidsGamesAuth.updateUser(editingUserId, payload);
      } catch (error) {
        console.error('Unable to save local account changes:', error);
        showMessage(error.message || 'تعذر حفظ التعديلات.', 'error');
        return;
      }
      if (!updated) {
        showMessage('تعذر حفظ التعديلات. راجع البيانات وحاول مرة أخرى.', 'error');
        return;
      }
      if (editingUserId === currentUser.id) window.KidsGamesAuth.setCurrentUser(updated);
      userDialog.close();
      renderUsers();
      showMessage('تم تحديث بيانات الحساب محليًا.');
    } else {
      if (payload.role === 'admin') {
        showMessage('إنشاء حساب مدير يحتاج إلى خدمة موثوقة؛ اختر طفلًا أو ولي أمر أو معلمًا.', 'error');
        return;
      }
      if (!cloudAccounts || !cloudApi) {
        let added;
        try {
          added = window.KidsGamesAuth.addUser({
            ...payload,
            provider: 'local',
            localOnly: true
          });
        } catch (error) {
          console.error('Unable to create local account:', error);
          showMessage(error.message || 'تعذر إنشاء الحساب على هذا الجهاز.', 'error');
          return;
        }
        if (!added) {
          showMessage('تعذر إضافة الحساب. راجع البيانات وحاول مرة أخرى.', 'error');
          return;
        }
        userDialog.close();
        renderUsers();
        showMessage(`تم إنشاء حساب ${added.username} على هذا الجهاز فقط؛ تعذر التحقق من Firebase.`);
        return;
      }
      let added;
      try {
        added = await cloudApi.adminCreateAccount(payload.username, payload.password, payload.role);
      } catch (error) {
        console.error('Unable to create account:', error);
        showMessage(error.message || 'تعذر إنشاء الحساب.', 'error');
        return;
      }
      if (!added) {
        showMessage('تعذر إضافة الحساب. راجع البيانات وحاول مرة أخرى.', 'error');
        return;
      }
      userDialog.close();
      try {
        await refreshCloudAccounts();
        showMessage(`تم إنشاء حساب ${added.username} في Firebase بنجاح.`);
      } catch (error) {
        console.error('Account was created, but the cloud account list could not be refreshed:', error);
        showMessage(`تم إنشاء الحساب ${added.username}، لكن تعذر تحديث القائمة. أعد تحميل الصفحة.`, 'error');
      }
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        if (cloudApi?.isCurrentUserLinked?.()) await cloudApi.signOut();
        else window.KidsGamesAuth.logoutUser();
        window.location.href = '../auth/index.html';
      } catch (error) {
        console.error('Unable to sign out:', error);
        showMessage('تعذر تسجيل الخروج. حاول مرة أخرى.', 'error');
      }
    });
  }

  renderUsers();
  let localAccountExists = currentUser.localOnly || currentUser.id.endsWith('-demo');
  try {
    localAccountExists ||= window.KidsGamesAuth.getUsers().some(account => account.id === currentUser.id);
  } catch (error) {
    console.error('Unable to identify the admin account source:', error);
  }
  if (!currentUser.cloudUid && localAccountExists) {
    connectionStatus.className = 'connection-status offline';
    connectionStatus.textContent = 'هذا حساب محلي؛ لا توجد مزامنة Firebase. الحسابات والإعدادات المحلية متاحة على هذا الجهاز.';
    maintenanceStatus.textContent = 'وضع الصيانة السحابي متاح بعد تسجيل الدخول بحساب مدير Firebase.';
    return;
  }
  connectionStatus.textContent = 'جارٍ التحقق من ربط الحساب...';

  try {
    const loadCloudAdminData = async () => {
      const cloud = await window.KidsGamesCloudReady;
      if (!cloud.enabled || !cloud.isCurrentUserLinked?.()
        || cloud.getCurrentUserId?.() !== currentUser.id || currentUser.role !== 'admin') {
        return { cloud };
      }

      cloudApi = cloud;
      const [savedSettings, savedGameSettings, accounts, maintenance] = await Promise.all([
        cloud.getLessonSettings(),
        cloud.getGameSettings(),
        cloud.listAccounts(),
        getMaintenanceMode()
      ]);
      return { cloud, savedSettings, savedGameSettings, accounts, maintenance };
    };
    const result = await loadCloudAdminData();

    const { cloud } = result;
    if (cloud.enabled && result.accounts) {
      cloudApi = cloud;
      maintenanceEnabled = result.maintenance.enabled;
      maintenanceMessageInput.value = result.maintenance.message
        || 'الموقع تحت الصيانة مؤقتًا. سنعود قريبًا.';
      maintenanceExpectedTimeInput.value = result.maintenance.expectedTime || '';
      updateMaintenanceToggle();
      maintenanceToggle.disabled = false;
      maintenanceSaveButton.disabled = false;
      if (result.savedSettings) {
        window.KidsGames.saveLessonSettings(result.savedSettings);
        Object.entries(result.savedSettings).forEach(([key, value]) => {
          const input = lessonSettingsForm.elements.namedItem(key);
          if (input) input.value = String(value);
        });
      } else {
        cloud.saveLessonSettings(defaultLessonSettings).catch(error => {
          console.error('Unable to initialize cloud lesson settings:', error);
        });
      }
      if (result.savedGameSettings) {
        window.KidsGames.saveGameSettings(result.savedGameSettings);
      } else {
        cloud.saveGameSettings(window.KidsGames.getGameSettings()).catch(error => {
          console.error('Unable to initialize cloud game settings:', error);
        });
      }
      gameSettingsForm.querySelectorAll('input[type="checkbox"]').forEach(input => {
        input.checked = window.KidsGames.getGameSettings().lockedGames.includes(input.value);
      });
      cloudAccounts = result.accounts;
      renderUsers();
      connectionStatus.className = 'connection-status';
      connectionStatus.textContent = `الحسابات والتقدم مرتبطان بـ Firebase (${cloud.projectId}).`;
    } else if (!cloud.enabled) {
      connectionStatus.className = 'connection-status offline';
      connectionStatus.textContent = 'قاعدة Firebase غير مفعّلة؛ الحسابات والتقدم محفوظان محليًا على هذا الجهاز.';
    } else {
      connectionStatus.className = 'connection-status partial';
      connectionStatus.textContent = `Firebase جاهز (${cloud.projectId})، لكن جلسة المدير ليست حسابًا سحابيًا. سجّل الدخول بحساب مدير Firebase لإدارة الحسابات السحابية.`;
    }
  } catch (error) {
    console.error('Unable to check account connection:', error);
    connectionStatus.className = 'connection-status offline';
    connectionStatus.textContent = 'تعذر التحقق من الاتصال السحابي. الحسابات المحلية متاحة على هذا الجهاز.';
  }
});
