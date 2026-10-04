const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {
  normalizeUsername,
  validateCredentials,
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

function requireAdmin(request) {
  if (!request.auth || request.auth.token.role !== 'admin') {
    throw new HttpsError('permission-denied', 'يتطلب هذا الإجراء صلاحية المدير.');
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
    provider: 'local'
  };
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
    credentials = validateCredentials(request.data?.username, request.data?.password);
  } catch (error) {
    throw new HttpsError('invalid-argument', error.message);
  }

  const limitRef = await checkLoginLimit(request, credentials.username);
  const snapshot = await database.collection(ACCOUNTS).doc(credentials.username).get();
  const account = snapshot.exists ? snapshot.data() : null;
  if (!account || account.status === 'inactive' || !(await verifyPassword(credentials.password, account))) {
    await recordFailedLogin(limitRef);
    throw new HttpsError('unauthenticated', 'اسم المستخدم أو كلمة المرور غير صحيحة.');
  }

  await limitRef.delete();
  const token = await auth.createCustomToken(account.uid, {
    role: account.role,
    username: account.username
  });
  return { token };
});

exports.createAccount = onCall(async request => {
  requireAdmin(request);
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
    await auth.setCustomUserClaims(userRecord.uid, { role, username: credentials.username });
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
  requireAdmin(request);
  const snapshot = await database.collection(ACCOUNTS).orderBy('username').get();
  return { users: snapshot.docs.map(document => accountView(document.data())) };
});

exports.updateAccount = onCall(async request => {
  requireAdmin(request);
  const uid = String(request.data?.uid || '');
  const oldUsername = normalizeUsername(request.data?.oldUsername);
  const username = normalizeUsername(request.data?.username);
  const role = String(request.data?.role || '');
  const status = request.data?.status === 'inactive' ? 'inactive' : 'active';
  const email = String(request.data?.email || '').trim().toLowerCase();
  const fullName = username;
  if (!uid || !oldUsername || !/^[a-z0-9._-]{3,32}$/.test(username) || !ALLOWED_ROLES.has(role)) {
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
  if (existing.role === 'admin' && role !== 'admin') {
    if (uid === request.auth.uid) {
      throw new HttpsError('failed-precondition', 'لا يمكن للمدير تغيير دوره بنفسه.');
    }
    const admins = await database.collection(ACCOUNTS).where('role', '==', 'admin').get();
    if (admins.size <= 1) throw new HttpsError('failed-precondition', 'يجب أن يبقى مدير واحد على الأقل.');
  }
  if (uid === request.auth.uid && (status === 'inactive' || role !== 'admin')) {
    throw new HttpsError('failed-precondition', 'لا يمكن تعطيل حساب المدير الحالي أو تغيير دوره.');
  }

  const passwordData = password ? await hashPassword(password) : {};
  await auth.updateUser(uid, { displayName: fullName, ...(password ? { password } : {}) });
  await auth.setCustomUserClaims(uid, { role, username });
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

exports.deleteAccount = onCall(async request => {
  requireAdmin(request);
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
  const role = String(request.data?.role || '');
  if (!['child', 'parent', 'teacher'].includes(role)) {
    throw new HttpsError('invalid-argument', 'نوع الحساب غير صالح.');
  }
  const user = await auth.getUser(request.auth.uid);
  const username = String(user.customClaims?.username || user.email?.split('@')[0] || '');
  if (user.customClaims?.role === 'admin') throw new HttpsError('permission-denied', 'لا يمكن تغيير دور المدير بهذه الطريقة.');
  await auth.setCustomUserClaims(user.uid, { role, ...(username ? { username } : {}) });
  await database.collection(USERS).doc(user.uid).set({
    role,
    status: 'active',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return { role };
});
