const admin = require('firebase-admin');
const { validateCredentials, hashPassword } = require('../account-security');

async function main() {
  const credentials = validateCredentials(
    process.env.BOOTSTRAP_ADMIN_USERNAME,
    process.env.BOOTSTRAP_ADMIN_PASSWORD
  );
  admin.initializeApp();
  const auth = admin.auth();
  const database = admin.firestore();
  const adminAccounts = await database.collection('accounts').where('role', '==', 'admin').limit(1).get();
  if (!adminAccounts.empty) throw new Error('يوجد مدير بالفعل. يستخدم هذا الأمر لإنشاء المدير الأول فقط.');

  const usernameRef = database.collection('accounts').doc(credentials.username);
  if ((await usernameRef.get()).exists) throw new Error('اسم المستخدم موجود بالفعل.');
  const user = await auth.createUser({ displayName: credentials.username });
  const passwordData = await hashPassword(credentials.password);
  await auth.setCustomUserClaims(user.uid, { role: 'admin', admin: true, username: credentials.username });
  await database.runTransaction(async transaction => {
    const existing = await transaction.get(usernameRef);
    if (existing.exists) throw new Error('اسم المستخدم موجود بالفعل.');
    transaction.create(usernameRef, {
      uid: user.uid,
      username: credentials.username,
      fullName: credentials.username,
      email: '',
      role: 'admin',
      status: 'active',
      provider: 'local',
      ...passwordData,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    transaction.create(database.collection('users').doc(user.uid), {
      username: credentials.username,
      fullName: credentials.username,
      role: 'admin',
      status: 'active',
      provider: 'local',
      progress: {},
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
  });
  console.log(`Created initial administrator "${credentials.username}". Keep the password private.`);
}

main().catch(error => {
  console.error('Unable to initialize the administrator:', error.message);
  process.exitCode = 1;
});
