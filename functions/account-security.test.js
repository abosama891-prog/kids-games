const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeUsername,
  validateCredentials,
  hashPassword,
  verifyPassword,
  hashRateLimitKey
} = require('./account-security');

test('normalizes and validates account credentials', () => {
  assert.equal(normalizeUsername('  Buddy_1  '), 'buddy_1');
  assert.deepEqual(validateCredentials(' Child-1 ', 'secret1'), {
    username: 'child-1',
    password: 'secret1'
  });
  assert.throws(() => validateCredentials('ab', 'secret1'), TypeError);
  assert.throws(() => validateCredentials('valid_name', 'short'), TypeError);
});

test('password hashes are salted and only verify the matching password', async () => {
  const first = await hashPassword('secret1');
  const second = await hashPassword('secret1');
  assert.notEqual(first.passwordSalt, second.passwordSalt);
  assert.notEqual(first.passwordHash, second.passwordHash);
  assert.equal(await verifyPassword('secret1', first), true);
  assert.equal(await verifyPassword('different', first), false);
  assert.equal(await verifyPassword('secret1', { passwordSalt: 'bad', passwordHash: 'bad' }), false);
});

test('rate-limit identifiers are one-way stable hashes', () => {
  assert.equal(hashRateLimitKey('ip:user'), hashRateLimitKey('ip:user'));
  assert.notEqual(hashRateLimitKey('ip:user'), hashRateLimitKey('ip:other'));
  assert.equal(hashRateLimitKey('ip:user').length, 64);
});
