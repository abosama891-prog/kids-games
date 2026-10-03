document.addEventListener('DOMContentLoaded', () => {
  const currentUser = window.KidsGamesAuth?.getCurrentUser?.();
  if (!currentUser || currentUser.role !== 'admin') {
    window.location.href = '../auth/index.html';
    return;
  }

  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    logoutButton.addEventListener('click', async () => {
      const cloud = await window.KidsGamesCloudReady;
      if (cloud.enabled) await cloud.signOut();
      else window.KidsGamesAuth.logoutUser();
      window.location.href = '../auth/index.html';
    });
  }

  const usersTableBody = document.getElementById('users-table-body');
  const userForm = document.getElementById('user-form');

  function renderSummary(users) {
    document.getElementById('total-users').textContent = users.length;
    document.getElementById('active-users').textContent = users.filter(user => user.status === 'active').length;
    document.getElementById('child-users').textContent = users.filter(user => user.role === 'child').length;
    document.getElementById('parent-users').textContent = users.filter(user => user.role === 'parent').length;
  }

  function renderUsers() {
    const users = window.KidsGamesAuth.getUsers();
    renderSummary(users);

    usersTableBody.innerHTML = users.map(user => `
      <tr>
        <td>${user.fullName}</td>
        <td>${user.username}</td>
        <td>${user.email}</td>
        <td>
          <select data-field="role" data-id="${user.id}">
            <option value="child" ${user.role === 'child' ? 'selected' : ''}>طفل</option>
            <option value="parent" ${user.role === 'parent' ? 'selected' : ''}>ولي أمر</option>
            <option value="teacher" ${user.role === 'teacher' ? 'selected' : ''}>معلم</option>
            <option value="admin" ${user.role === 'admin' ? 'selected' : ''}>مدير</option>
          </select>
        </td>
        <td>
          <select data-field="status" data-id="${user.id}">
            <option value="active" ${user.status === 'active' ? 'selected' : ''}>نشط</option>
            <option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>غير نشط</option>
          </select>
        </td>
        <td>${user.provider}</td>
        <td>
          <button class="table-action" type="button" data-action="delete" data-id="${user.id}">حذف</button>
        </td>
      </tr>
    `).join('');
  }

  usersTableBody.addEventListener('change', event => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const userId = target.dataset.id;
    const field = target.dataset.field;
    const value = target.value;

    if (!userId || !field) return;

    const current = window.KidsGamesAuth.getUsers().find(user => user.id === userId);
    if (!current) return;

    window.KidsGamesAuth.updateUser(userId, { [field]: value });
    renderUsers();
  });

  usersTableBody.addEventListener('click', event => {
    const button = event.target.closest('[data-action="delete"]');
    if (!button) return;

    const userId = button.dataset.id;
    const confirmDelete = window.confirm('هل تريد حذف هذا المستخدم؟');
    if (!confirmDelete) return;

    const success = window.KidsGamesAuth.deleteUser(userId);
    if (!success) {
      window.alert('لا يمكن حذف آخر مدير أو حذف هذا المستخدم في الوقت الحالي.');
      return;
    }

    renderUsers();
  });

  userForm.addEventListener('submit', event => {
    event.preventDefault();

    const payload = {
      fullName: document.getElementById('full-name').value.trim(),
      username: document.getElementById('username').value.trim(),
      email: document.getElementById('email').value.trim(),
      password: document.getElementById('password').value.trim(),
      role: document.getElementById('role').value,
      provider: 'local',
      status: 'active'
    };

    if (!payload.fullName || !payload.username || !payload.email || !payload.password) {
      window.alert('يرجى تعبئة كل الحقول المطلوبة.');
      return;
    }

    const users = window.KidsGamesAuth.getUsers();
    const exists = users.some(user => user.username.toLowerCase() === payload.username.toLowerCase() || user.email.toLowerCase() === payload.email.toLowerCase());
    if (exists) {
      window.alert('اسم المستخدم أو البريد الإلكتروني موجود بالفعل.');
      return;
    }

    window.KidsGamesAuth.addUser(payload);
    userForm.reset();
    renderUsers();
  });

  renderUsers();
});
