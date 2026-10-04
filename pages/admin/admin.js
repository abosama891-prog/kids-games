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
  const emailField = document.getElementById('email-field');
  const emailInput = document.getElementById('email');
  const statusField = document.getElementById('status-field');
  const statusInput = document.getElementById('status');
  const passwordHint = document.getElementById('password-hint');
  const saveUserButton = document.getElementById('save-user-button');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const roleInput = document.getElementById('role');
  const addUserButton = document.getElementById('add-user-button');
  const lessonSettingsForm = document.getElementById('lesson-settings-form');
  const lessonSettingsMessage = document.getElementById('lesson-settings-message');
  let editingUserId = null;
  let cloudAccounts = null;
  let cloudApi = null;

  const defaultLessonSettings = window.KidsGames.getLessonSettings();
  Object.entries(defaultLessonSettings).forEach(([key, value]) => {
    lessonSettingsForm.elements.namedItem(key).value = String(value);
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
    cell.textContent = text;
    row.appendChild(cell);
    return cell;
  }

  function createSelectCell(row, field, value, options, userId) {
    const cell = document.createElement('td');
    cell.dataset.label = field === 'role' ? 'الدور' : 'الحالة';
    const select = document.createElement('select');
    select.dataset.field = field;
    select.dataset.id = userId;
    select.dataset.value = value;
    select.disabled = Boolean(cloudAccounts && userId === currentUser.id);
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
    const users = cloudAccounts || window.KidsGamesAuth.getUsers();
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
      deleteButton.disabled = Boolean(cloudAccounts) || user.id === currentUser.id;
      deleteButton.title = cloudAccounts ? 'الحذف من Firebase Console.' : '';
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
    emailField.hidden = !user;
    statusField.hidden = !user;
    passwordInput.required = !user;
    passwordInput.value = '';
    passwordInput.disabled = Boolean(cloudAccounts) || user?.provider === 'google';
    usernameInput.disabled = Boolean(cloudAccounts);
    emailInput.disabled = Boolean(cloudAccounts);
    passwordInput.placeholder = user ? 'اتركها فارغة دون تغيير' : '6 أحرف على الأقل';
    passwordHint.textContent = cloudAccounts
      ? 'تُدار كلمة المرور من Firebase Console.'
      : user
        ? 'اختيارية؛ اتركها فارغة للإبقاء على كلمة المرور الحالية.'
        : 'مطلوبة للحساب الجديد (6 أحرف على الأقل).';
    if (user) {
      usernameInput.value = user.username;
      emailInput.value = user.email || '';
      roleInput.value = user.role;
      statusInput.value = user.status;
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
    const username = payload.username.toLocaleLowerCase();
    const email = payload.email.toLocaleLowerCase();
    const users = cloudAccounts || window.KidsGamesAuth.getUsers();
    return !users.some(user =>
      user.id !== excludedId &&
      (user.username.toLocaleLowerCase() === username || (email && user.email.toLocaleLowerCase() === email))
    );
  }

  async function refreshCloudAccounts() {
    cloudAccounts = await window.KidsGamesCloud.listAccounts();
    renderUsers();
  }

  addUserButton.addEventListener('click', () => {
    if (cloudAccounts) {
      showMessage('أنشئ الحساب من Firebase Console باستخدام البريد المعرّف المذكور في التعليمات.', 'error');
      return;
    }
    openUserDialog();
  });
  document.getElementById('close-dialog-button').addEventListener('click', () => userDialog.close());
  document.getElementById('cancel-dialog-button').addEventListener('click', () => userDialog.close());
  userDialog.addEventListener('click', event => {
    if (event.target === userDialog) userDialog.close();
  });
  userSearch.addEventListener('input', renderUsers);
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

    const user = (cloudAccounts || window.KidsGamesAuth.getUsers()).find(item => item.id === id);
    const updated = cloudAccounts
      ? await window.KidsGamesCloud.updateAccount({
        uid: user.uid,
        oldUsername: user.username,
        username: user.username,
        role: field === 'role' ? target.value : user.role,
        status: field === 'status' ? target.value : user.status,
        email: user.email
      }).catch(error => {
        console.error('Unable to update cloud account:', error);
        showMessage('تعذر تحديث الحساب السحابي.', 'error');
        return null;
      })
      : window.KidsGamesAuth.updateUser(id, { [field]: target.value });
    if (!updated) {
      showMessage('تعذر حفظ التغيير. لم يتم العثور على المستخدم.', 'error');
      if (cloudAccounts) await refreshCloudAccounts();
      else renderUsers();
      return;
    }
    if (id === currentUser.id && !cloudAccounts) window.KidsGamesAuth.setCurrentUser(updated);
    showMessage(cloudAccounts ? 'تم حفظ التغيير في قاعدة البيانات.' : 'تم حفظ التغيير على هذا الجهاز.');
    if (cloudAccounts) await refreshCloudAccounts();
    else renderUsers();
  });

  usersTableBody.addEventListener('click', async event => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement)) return;
    const action = target.dataset.action;
    const userId = target.dataset.id;

    if (action === 'edit' && userId) {
      const user = (cloudAccounts || window.KidsGamesAuth.getUsers()).find(item => item.id === userId);
      if (user) openUserDialog(user);
      return;
    }
    if (action === 'delete' && userId) {
      if (userId === currentUser.id) {
        showMessage('لا يمكن حذف الحساب الذي تستخدمه حاليًا.', 'error');
        return;
      }
      const user = (cloudAccounts || window.KidsGamesAuth.getUsers()).find(item => item.id === userId);
      if (!user || !window.confirm(`هل تريد حذف حساب "${user.username}"؟ لا يمكن التراجع عن ذلك.`)) return;

      if (cloudAccounts) {
        showMessage('لحذف حساب سحابي، احذفه من Firebase Authentication ثم احذف ملفه من Firestore.', 'error');
        return;
      }
      if (!window.KidsGamesAuth.deleteUser(userId)) {
        showMessage('تعذر الحذف. يجب أن يبقى مدير واحد على الأقل.', 'error');
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
      email: isEditing ? emailInput.value.trim().toLowerCase() : '',
      role: roleInput.value,
      status: isEditing ? statusInput.value : 'active'
    };
    if (passwordInput.value) payload.password = passwordInput.value;
    if (!isEditing) {
      payload.provider = 'local';
      payload.password = passwordInput.value;
    }
    if (!userForm.reportValidity()) return;
    if (cloudAccounts && !isEditing) {
      showMessage('أنشئ الحساب أولًا من Firebase Console، ثم يسجّل المستخدم الدخول مرة واحدة.', 'error');
      return;
    }
    if (!cloudAccounts && !validateUniqueIdentity(payload, isEditing ? editingUserId : null)) {
      showMessage('اسم المستخدم أو البريد الإلكتروني مستخدم في حساب آخر.', 'error');
      return;
    }

    if (isEditing) {
      const existing = (cloudAccounts || window.KidsGamesAuth.getUsers()).find(item => item.id === editingUserId);
      if (cloudAccounts) {
        try {
          await window.KidsGamesCloud.updateAccount({
            uid: existing.uid,
            oldUsername: existing.username,
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
      const updated = window.KidsGamesAuth.updateUser(editingUserId, payload);
      if (!updated) {
        showMessage('تعذر حفظ التعديلات. راجع البيانات وحاول مرة أخرى.', 'error');
        return;
      }
      if (editingUserId === currentUser.id) window.KidsGamesAuth.setCurrentUser(updated);
      userDialog.close();
      renderUsers();
      showMessage('تم تحديث بيانات الحساب محليًا.');
    } else {
      const added = window.KidsGamesAuth.addUser(payload);
      if (!added) {
        showMessage('تعذر إضافة الحساب. راجع البيانات وحاول مرة أخرى.', 'error');
        return;
      }
      userDialog.close();
      renderUsers();
      showMessage(`تمت إضافة ${added.username} إلى حسابات هذا الجهاز.`);
    }
  });

  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      try {
        const cloud = await window.KidsGamesCloudReady;
        if (cloud.enabled && cloud.getCurrentUserId?.()) await cloud.signOut();
        else window.KidsGamesAuth.logoutUser();
        window.location.href = '../auth/index.html';
      } catch (error) {
        console.error('Unable to sign out:', error);
        showMessage('تعذر تسجيل الخروج. حاول مرة أخرى.', 'error');
      }
    });
  }

  try {
    const cloud = await window.KidsGamesCloudReady;
    if (cloud.enabled && cloud.getCurrentUserId?.() === currentUser.id && currentUser.role === 'admin') {
      cloudApi = cloud;
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
      cloudAccounts = await cloud.listAccounts();
      addUserButton.disabled = true;
      addUserButton.textContent = 'الحسابات من Firebase Console';
      addUserButton.title = 'أنشئ الحسابات من Firebase Console.';
      renderUsers();
      connectionStatus.className = 'connection-status';
      connectionStatus.textContent = `الحسابات والتقدم مرتبطان بـ Firebase (${cloud.projectId}). أضف الحسابات واحذفها من Firebase Console؛ ويمكنك هنا تعديل الأدوار والحالة.`;
    } else if (!cloud.enabled) {
      renderUsers();
      connectionStatus.className = 'connection-status offline';
      connectionStatus.textContent = 'قاعدة Firebase غير مفعّلة؛ الحسابات والتقدم محفوظان محليًا على هذا الجهاز.';
    } else {
      renderUsers();
      connectionStatus.className = 'connection-status partial';
      connectionStatus.textContent = `Firebase جاهز (${cloud.projectId})، لكن جلسة المدير ليست حسابًا سحابيًا. سجّل الدخول بحساب مدير Firebase لإدارة الحسابات السحابية.`;
    }
  } catch (error) {
    console.error('Unable to check account connection:', error);
    renderUsers();
    connectionStatus.className = 'connection-status offline';
    connectionStatus.textContent = 'تعذر التحقق من الاتصال السحابي. الحسابات المعروضة محفوظة محليًا على هذا الجهاز.';
  }
});
