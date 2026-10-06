const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('node:crypto');
const {
  normalizeUsername,
  normalizePin,
  validateCredentials,
  validatePinCredentials,
  validateLegacyPinCredentials,
  hashPassword,
  verifyPassword,
  hashRateLimitKey
} = require('./account-security');

admin.initializeApp();
setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

const auth = admin.auth();
const database = admin.firestore();
const ACCOUNTS = 'accounts';
const USERS = 'users';
const RATE_LIMITS = 'authRateLimits';
const ALLOWED_ROLES = new Set(['child', 'parent', 'teacher', 'admin']);

async function requireAdmin(request) {
  if (!request.auth || request.auth.token.admin !== true || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'يتطلب هذا الإجراء صلاحية المدير.');
  }
  const profile = await database.collection(USERS).doc(request.auth.uid).get();
  if (!profile.exists || profile.data().role !== 'admin' || profile.data().status !== 'active') {
    throw new HttpsError('permission-denied', 'حساب المدير غير نشط أو لم تعد لديه صلاحية الإدارة.');
  }
}

function accountView(account) {
  return {
    id: account.uid,
    uid: account.uid,
    username: account.username,
    fullName: account.fullName || account.username,
    email: account.email || '',
    role: account.role,
    status: account.status || 'active',
    avatar: account.avatar || 'child',
    provider: 'local'
  };
}

async function checkSignupLimit(request) {
  const ip = request.rawRequest?.ip || 'unknown';
  const key = `signup_${hashRateLimitKey(ip)}`;
  const ref = database.collection(RATE_LIMITS).doc(key);
  const now = Date.now();

  await database.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() || {};
    const windowStart = Number(data.windowStart) || now;
    const attempts = now - windowStart > 15 * 60 * 1000 ? 0 : Number(data.attempts) || 0;
    if (attempts >= 5) {
      throw new HttpsError('resource-exhausted', 'محاولات إنشاء كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى.');
    }
    transaction.set(ref, { attempts: attempts + 1, windowStart: attempts ? windowStart : now });
  });
}

async function checkLoginLimit(request, username) {
  const ip = request.rawRequest?.ip || 'unknown';
  const key = hashRateLimitKey(`${ip}:${username}`);
  const ref = database.collection(RATE_LIMITS).doc(key);
  const now = Date.now();

  await database.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() || {};
    const windowStart = Number(data.windowStart) || now;
    const attempts = now - windowStart > 15 * 60 * 1000 ? 0 : Number(data.attempts) || 0;
    if (attempts >= 10) {
      throw new HttpsError('resource-exhausted', 'محاولات كثيرة. انتظر 15 دقيقة ثم حاول مرة أخرى.');
    }
    transaction.set(ref, { attempts, windowStart: attempts ? windowStart : now });
  });
  return ref;
}

async function recordFailedLogin(ref) {
  await database.runTransaction(async transaction => {
    const snapshot = await transaction.get(ref);
    const data = snapshot.data() || {};
    const now = Date.now();
    const windowStart = Number(data.windowStart) || now;
    const attempts = now - windowStart > 15 * 60 * 1000 ? 1 : (Number(data.attempts) || 0) + 1;
    transaction.set(ref, { attempts, windowStart });
  });
}

exports.authenticateUsername = onCall(async request => {
  let credentials;
  try {
    const normalizedPin = normalizePin(request.data?.password);
    credentials = /^\d{4}$/.test(normalizedPin)
      ? validateLegacyPinCredentials(request.data?.username, normalizedPin)
      : validateCredentials(request.data?.username, request.data?.password);
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }

  const limitRef = await checkLoginLimit(request, credentials.username);
  const snapshot = await database.collection(ACCOUNTS).doc(credentials.username).get();
  const account = snapshot.exists ? snapshot.data() : null;
  const profileSnapshot = account
    ? await database.collection(USERS).doc(account.uid).get()
    : null;
  const profile = profileSnapshot?.exists ? profileSnapshot.data() : null;
  if (!account || !profile || account.status !== 'active' || profile.status !== 'active'
    || account.role !== profile.role
    || !(await verifyPassword(credentials.password, account))) {
    await recordFailedLogin(limitRef);
    throw new HttpsError('unauthenticated', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
  }

  await limitRef.delete();
  const token = await auth.createCustomToken(account.uid, {
    role: profile.role,
    admin: profile.role === 'admin',
    username: account.username
  });
  return { token };
});

exports.registerAccount = onCall(async request => {
  let credentials;
  try {
    credentials = validatePinCredentials(request.data?.username, request.data?.pin);
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }

  const fullName = String(request.data?.fullName || '').trim();
  const role = String(request.data?.role || 'child');
  const avatar = String(request.data?.avatar || 'child');
  if (!fullName || fullName.length > 60) {
    throw new HttpsError('invalid-argument', 'أدخل اسمًا صحيحًا لا يتجاوز 60 حرفًا.');
  }
  if (!['child', 'parent', 'teacher'].includes(role)) {
    throw new HttpsError('invalid-argument', 'نوع الحساب غير صالح.');
  }
  if (!['child', 'girl', 'engineer'].includes(avatar)) {
    throw new HttpsError('invalid-argument', 'الشخصية المختارة غير صالحة.');
  }
  await checkSignupLimit(request);

  const username = credentials.username;
  const email = `${username}@accounts.kids-games.invalid`;
  const accountRef = database.collection(ACCOUNTS).doc(username);
  const existing = await accountRef.get();
  if (existing.exists) throw new HttpsError('already-exists', 'اسم المستخدم مستخدم بالفعل.');

  let userRecord;
  try {
    userRecord = await auth.createUser({
      email,
      password: crypto.randomBytes(48).toString('base64url'),
      displayName: fullName
    });
  } catch (error) {
    if (error.code === 'auth/email-already-exists') {
      throw new HttpsError('already-exists', 'اسم المستخدم مستخدم بالفعل.');
    }
    throw error;
  }

  try {
    const passwordData = await hashPassword(credentials.password);
    const profile = {
      uid: userRecord.uid,
      username,
      fullName,
      email,
      role,
      avatar,
      status: 'active',
      provider: 'local',
      ...passwordData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await auth.setCustomUserClaims(userRecord.uid, { role, admin: role === 'admin', username });
    await database.runTransaction(async transaction => {
      const latestAccount = await transaction.get(accountRef);
      if (latestAccount.exists) throw new HttpsError('already-exists', 'اسم المستخدم مستخدم بالفعل.');
      transaction.create(accountRef, profile);
      transaction.create(database.collection(USERS).doc(userRecord.uid), {
        username,
        email,
        fullName,
        role,
        avatar,
        status: 'active',
        provider: 'local',
        progress: {},
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  } catch (error) {
    await auth.deleteUser(userRecord.uid).catch(cleanupError => {
      logger.error('Unable to remove Auth account after registration failed.', cleanupError);
    });
    throw error;
  }

  const token = await auth.createCustomToken(userRecord.uid, { role, username });
  return { token };
});

exports.createAccount = onCall(async request => {
  await requireAdmin(request);
  let credentials;
  try {
    credentials = validateCredentials(request.data?.username, request.data?.password);
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }

  const role = String(request.data?.role || 'child');
  if (!ALLOWED_ROLES.has(role)) throw new HttpsError('invalid-argument', 'نوع الحساب غير صالح.');
  const ref = database.collection(ACCOUNTS).doc(credentials.username);
  const existing = await ref.get();
  if (existing.exists) throw new HttpsError('already-exists', 'اسم المستخدم مستخدم بالفعل.');

  const userRecord = await auth.createUser({ displayName: credentials.username });
  const passwordData = await hashPassword(credentials.password);
  const profile = {
    uid: userRecord.uid,
    username: credentials.username,
    fullName: credentials.username,
    email: '',
    role,
    status: 'active',
    provider: 'local',
    ...passwordData,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  try {
    await auth.setCustomUserClaims(userRecord.uid, {
      role,
      admin: role === 'admin',
      username: credentials.username
    });
    await database.runTransaction(async transaction => {
      const accountSnapshot = await transaction.get(ref);
      if (accountSnapshot.exists) throw new HttpsError('already-exists', 'اسم المستخدم مستخدم بالفعل.');
      transaction.create(ref, profile);
      transaction.create(database.collection(USERS).doc(userRecord.uid), {
        username: credentials.username,
        fullName: credentials.username,
        role,
        status: 'active',
        provider: 'local',
        progress: {},
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
  } catch (error) {
    await auth.deleteUser(userRecord.uid).catch(cleanupError => {
      logger.error('Unable to remove Auth account after account creation failed.', cleanupError);
    });
    throw error;
  }

  return accountView(profile);
});

exports.listAccounts = onCall(async request => {
  await requireAdmin(request);
  const snapshot = await database.collection(ACCOUNTS).orderBy('username').get();
  return { users: snapshot.docs.map(document => accountView(document.data())) };
});

exports.updateAccount = onCall(async request => {
  await requireAdmin(request);
  const uid = String(request.data?.uid || '');
  const oldUsername = normalizeUsername(request.data?.oldUsername);
  const username = normalizeUsername(request.data?.username);
  const role = String(request.data?.role || '');
  const status = String(request.data?.status || '');
  const email = String(request.data?.email || '').trim().toLowerCase();
  const fullName = username;
  if (!uid || !oldUsername || !/^[a-z0-9._-]{1,32}$/.test(username)
    || !ALLOWED_ROLES.has(role) || !['active', 'inactive'].includes(status)) {
    throw new HttpsError('invalid-argument', 'بيانات المستخدم غير صالحة.');
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError('invalid-argument', 'البريد الإلكتروني غير صالح.');
  }
  const password = request.data?.password ? String(request.data.password) : '';
  if (password && (password.length < 6 || password.length > 128)) {
    throw new HttpsError('invalid-argument', 'كلمة المرور يجب أن تتكون من 6 إلى 128 حرفًا.');
  }

  const oldRef = database.collection(ACCOUNTS).doc(oldUsername);
  const newRef = database.collection(ACCOUNTS).doc(username);
  const accountSnapshot = await oldRef.get();
  if (!accountSnapshot.exists || accountSnapshot.data().uid !== uid) {
    throw new HttpsError('not-found', 'لم يتم العثور على الحساب.');
  }
  if (username !== oldUsername && (await newRef.get()).exists) {
    throw new HttpsError('already-exists', 'اسم المستخدم مستخدم بالفعل.');
  }
  const existing = accountSnapshot.data();
  const existingStatus = existing.status || 'active';
  if (existing.role === 'admin' && (role !== existing.role || status !== existingStatus)) {
    throw new HttpsError('failed-precondition', 'لا يمكن تغيير صلاحية حساب المدير أو حالته.');
  }
  if (uid === request.auth.uid && (status === 'inactive' || role !== 'admin')) {
    throw new HttpsError('failed-precondition', 'لا يمكن تعطيل حساب المدير الحالي أو تغيير دوره.');
  }

  const passwordData = password ? await hashPassword(password) : {};
  await auth.updateUser(uid, { displayName: fullName, ...(password ? { password } : {}) });
  await auth.setCustomUserClaims(uid, { role, admin: role === 'admin', username });
  const update = {
    ...existing,
    ...passwordData,
    uid,
    username,
    fullName,
    email,
    role,
    status,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };
  delete update.password;

  await database.runTransaction(async transaction => {
    const latestOld = await transaction.get(oldRef);
    const latestNew = username === oldUsername ? latestOld : await transaction.get(newRef);
    if (!latestOld.exists || latestOld.data().uid !== uid) {
      throw new HttpsError('aborted', 'تغير الحساب أثناء التعديل. أعد المحاولة.');
    }
    const latestAccount = latestOld.data();
    const latestStatus = latestAccount.status || 'active';
    if (latestAccount.role === 'admin' && (role !== latestAccount.role || status !== latestStatus)) {
      throw new HttpsError('failed-precondition', 'لا يمكن تغيير صلاحية حساب المدير أو حالته.');
    }
    if (username !== oldUsername && latestNew.exists) {
      throw new HttpsError('already-exists', 'اسم المستخدم مستخدم بالفعل.');
    }
    if (username !== oldUsername) transaction.delete(oldRef);
    transaction.set(newRef, update);
    transaction.set(database.collection(USERS).doc(uid), {
      username,
      fullName,
      email,
      role,
      status,
      provider: 'local',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  });
  return accountView(update);
});

exports.updateOwnProfile = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'سجّل الدخول أولًا.');
  const uid = request.auth.uid;
  const fullName = String(request.data?.fullName || '').trim();
  const avatar = String(request.data?.avatar || '');
  const currentCredential = String(request.data?.currentCredential || '');
  const newCredential = String(request.data?.newCredential || '');
  if (!fullName || fullName.length > 60) {
    throw new HttpsError('invalid-argument', 'أدخل اسمًا صحيحًا لا يتجاوز 60 حرفًا.');
  }
  if (!['child', 'girl', 'engineer'].includes(avatar)) {
    throw new HttpsError('invalid-argument', 'اختر شخصية صحيحة.');
  }

  const userRef = database.collection(USERS).doc(uid);
  const userSnapshot = await userRef.get();
  if (!userSnapshot.exists || userSnapshot.data().status === 'inactive') {
    throw new HttpsError('failed-precondition', 'الحساب غير متاح للتعديل.');
  }

  const changesCredential = Boolean(currentCredential || newCredential);
  if (changesCredential) {
    if (!currentCredential || !newCredential) {
      throw new HttpsError('invalid-argument', 'أدخل بيانات الدخول الحالية والجديدة.');
    }
    const profile = userSnapshot.data();
    const username = normalizeUsername(profile.username);
    const accountRef = database.collection(ACCOUNTS).doc(username);
    const accountSnapshot = await accountRef.get();
    if (accountSnapshot.exists && accountSnapshot.data().uid !== uid) {
      throw new HttpsError('failed-precondition', 'تعذر تغيير كلمة المرور لهذا الحساب القديم. تواصل مع مدير النظام.');
    }
    const normalizedCurrentPin = normalizePin(currentCredential);
    const normalizedCurrentCredential = /^\d+$/.test(normalizedCurrentPin)
      ? normalizedCurrentPin
      : currentCredential;
    const normalizedNewPin = normalizePin(newCredential);
    const normalizedNewCredential = /^\d+$/.test(normalizedNewPin)
      ? normalizedNewPin
      : newCredential;
    if (normalizedNewCredential.length < 6 || normalizedNewCredential.length > 128) {
      throw new HttpsError('invalid-argument', 'استخدم رمزًا من 6 أرقام على الأقل أو كلمة مرور من 6 إلى 128 حرفًا.');
    }

    const passwordData = await hashPassword(normalizedNewCredential);
    const authPassword = /^\d+$/.test(normalizedNewCredential)
      ? crypto.randomBytes(48).toString('base64url')
      : normalizedNewCredential;
    if (accountSnapshot.exists) {
      const account = accountSnapshot.data();
      const limitRef = await checkLoginLimit(request, username);
      if (!(await verifyPassword(normalizedCurrentCredential, account))) {
        await recordFailedLogin(limitRef);
        throw new HttpsError('unauthenticated', 'كلمة المرور أو رمز الدخول الحالي غير صحيح.');
      }
      await limitRef.delete();
      await auth.updateUser(uid, { password: authPassword, displayName: fullName });
      await accountRef.update({
        ...passwordData,
        fullName,
        avatar,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      const authTime = Number(request.auth.token.auth_time) * 1000;
      const recentlyReauthenticated = request.auth.token.firebase?.sign_in_provider === 'password'
        && Number.isFinite(authTime)
        && Date.now() - authTime <= 5 * 60 * 1000;
      if (!recentlyReauthenticated || profile.provider !== 'local') {
        throw new HttpsError('failed-precondition', 'تعذر تغيير كلمة المرور لهذا الحساب القديم. أعد إدخال كلمة المرور الحالية.');
      }
      await auth.updateUser(uid, { password: authPassword, displayName: fullName });
      await accountRef.create({
        uid,
        username,
        fullName,
        email: profile.email || '',
        role: profile.role,
        avatar,
        status: profile.status,
        provider: 'local',
        ...passwordData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

  } else {
    await auth.updateUser(uid, { displayName: fullName });
  }

  await userRef.update({
    fullName,
    avatar,
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  return { fullName, avatar };
});

exports.deleteAccount = onCall(async request => {
  await requireAdmin(request);
  const uid = String(request.data?.uid || '');
  const username = normalizeUsername(request.data?.username);
  if (!uid || !username) throw new HttpsError('invalid-argument', 'بيانات المستخدم غير صالحة.');
  if (uid === request.auth.uid) throw new HttpsError('failed-precondition', 'لا يمكن حذف حساب المدير الحالي.');
  const accountRef = database.collection(ACCOUNTS).doc(username);
  const accountSnapshot = await accountRef.get();
  if (!accountSnapshot.exists || accountSnapshot.data().uid !== uid) {
    throw new HttpsError('not-found', 'لم يتم العثور على الحساب.');
  }
  if (accountSnapshot.data().role === 'admin') {
    const admins = await database.collection(ACCOUNTS).where('role', '==', 'admin').get();
    if (admins.size <= 1) throw new HttpsError('failed-precondition', 'يجب أن يبقى مدير واحد على الأقل.');
  }
  await auth.deleteUser(uid);
  await database.recursiveDelete(accountRef);
  await database.recursiveDelete(database.collection(USERS).doc(uid));
  return { deleted: true };
});

exports.setOwnRole = onCall(async request => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'سجّل الدخول أولًا.');
  throw new HttpsError('permission-denied', 'تغيير صلاحية الحساب متاح لمدير النظام فقط.');
});
