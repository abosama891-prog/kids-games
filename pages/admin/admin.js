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
  let editingUserId = null;
  let cloudAccounts = null;

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
      createCell(row, user.email || '—', 'البريد الإلكتروني').classList.add('email-column');
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
      deleteButton.disabled = user.id === currentUser.id;
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
    passwordInput.disabled = user?.provider === 'google';
    passwordInput.placeholder = user ? 'اتركها فارغة دون تغيير' : '6 أحرف على الأقل';
    passwordHint.textContent = user
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

  document.getElementById('add-user-button').addEventListener('click', () => openUserDialog());
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
        try {
          await window.KidsGamesCloud.deleteAccount({ uid: user.uid, username: user.username });
          await refreshCloudAccounts();
          showMessage('تم حذف الحساب وبيانات تقدمه من قاعدة البيانات.');
        } catch (error) {
          console.error('Unable to delete cloud account:', error);
          showMessage(error.code === 'functions/failed-precondition'
            ? 'لا يمكن حذف المدير الحالي أو آخر مدير.'
            : 'تعذر حذف الحساب من قاعدة البيانات.', 'error');
        }
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
          showMessage(error.code === 'functions/already-exists'
            ? 'اسم المستخدم مستخدم في حساب آخر.'
            : error.message || 'تعذر حفظ التعديلات في قاعدة البيانات.', 'error');
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
      if (cloudAccounts) {
        try {
          const added = await window.KidsGamesCloud.createAccount(payload);
          userDialog.close();
          await refreshCloudAccounts();
          showMessage(`تمت إضافة ${added.username} إلى قاعدة البيانات.`);
        } catch (error) {
          console.error('Unable to create cloud account:', error);
          showMessage(error.code === 'functions/already-exists'
            ? 'اسم المستخدم مستخدم بالفعل.'
            : error.message || 'تعذر إضافة الحساب إلى قاعدة البيانات.', 'error');
        }
        return;
      }
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
      cloudAccounts = await cloud.listAccounts();
      renderUsers();
      connectionStatus.className = 'connection-status';
      connectionStatus.textContent = `إدارة الحسابات والتقدم مرتبطة بقاعدة Firebase (${cloud.projectId}).`;
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
