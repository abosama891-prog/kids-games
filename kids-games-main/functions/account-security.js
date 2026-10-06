const crypto = require('node:crypto');
const { promisify } = require('node:util');

const scrypt = promisify(crypto.scrypt);
const KEY_LENGTH = 64;
const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

function normalizeUsername(value) {
  return String(value || '').trim().toLocaleLowerCase('en-US');
}

function normalizePin(value) {
  return String(value || '').replace(/[٠-٩۰-۹]/g, digit => {
    const code = digit.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

function validateCredentials(username, password) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPassword = String(password || '');
  if (!/^[a-z0-9._-]{1,32}$/.test(normalizedUsername)) {
    throw new TypeError('اسم المستخدم يجب أن يتكون من 1 إلى 32 حرفًا إنجليزيًا أو رقمًا أو . _ -');
  }
  if (normalizedPassword.length < 6 || normalizedPassword.length > 128) {
    throw new TypeError('كلمة المرور يجب أن تتكون من 6 إلى 128 حرفًا.');
  }
  return { username: normalizedUsername, password: normalizedPassword };
}

function validatePinCredentials(username, pin) {
  const normalizedUsername = normalizeUsername(username);
  const normalizedPin = normalizePin(pin);
  if (!/^[a-z0-9._-]{1,32}$/.test(normalizedUsername)) {
    throw new TypeError('اسم المستخدم يجب أن يتكون من 1 إلى 32 حرفًا إنجليزيًا أو رقمًا أو . _ -');
  }
  if (!/^\d{4}$/.test(normalizedPin)) {
    throw new TypeError('رمز الدخول يجب أن يتكون من 4 أرقام بالضبط.');
  }
  return { username: normalizedUsername, password: normalizedPin };
}

async function hashPassword(password, salt = crypto.randomBytes(16)) {
  const derivedKey = await scrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return {
    passwordSalt: salt.toString('base64url'),
    passwordHash: derivedKey.toString('base64url')
  };
}

async function verifyPassword(password, account) {
  if (typeof account.passwordSalt !== 'string' || typeof account.passwordHash !== 'string') return false;
  const salt = Buffer.from(account.passwordSalt, 'base64url');
  const expected = Buffer.from(account.passwordHash, 'base64url');
  if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;
  const actual = await scrypt(String(password), salt, KEY_LENGTH, SCRYPT_OPTIONS);
  return crypto.timingSafeEqual(actual, expected);
}

function hashRateLimitKey(value) {
  return crypto.createHash('sha256').update(String(value)).digest('hex');
}

module.exports = {
  normalizeUsername,
  normalizePin,
  validateCredentials,
  validatePinCredentials,
  hashPassword,
  verifyPassword,
  hashRateLimitKey
};
