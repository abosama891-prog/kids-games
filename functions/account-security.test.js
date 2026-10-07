const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeUsername,
  normalizePin,
  validateCredentials,
  validatePinCredentials,
  validateSignupPinCredentials,
  hashPassword,
  verifyPassword,
  hashRateLimitKey
} = require('./account-security');

test('normalizes and validates account credentials', () => {
  assert.equal(normalizeUsername('  Buddy_1  '), 'buddy_1');
  assert.equal(normalizePin('٠٠٤٢'), '0042');
  assert.deepEqual(validateCredentials(' Child-1 ', 'secret1'), {
    username: 'child-1',
    password: 'secret1'
  });
  assert.deepEqual(validateCredentials(' A ', 'secret1'), {
    username: 'a',
    password: 'secret1'
  });
  assert.throws(() => validateCredentials('', 'secret1'), TypeError);
  assert.throws(() => validateCredentials('valid_name', 'short'), TypeError);
  assert.deepEqual(validatePinCredentials(' Child-1 ', '0042'), {
    username: 'child-1',
    password: '0042'
  });
  assert.deepEqual(validatePinCredentials(' X ', '0042'), {
    username: 'x',
    password: '0042'
  });
  assert.deepEqual(validatePinCredentials(' Child-1 ', '٠٠٤٢'), {
    username: 'child-1',
    password: '0042'
  });
  assert.throws(() => validatePinCredentials('valid_name', '42'), TypeError);
  assert.throws(() => validatePinCredentials('valid_name', '12a4'), TypeError);
  assert.deepEqual(validateSignupPinCredentials(' Child-1 ', '123456'), {
    username: 'child-1',
    password: '123456'
  });
  assert.deepEqual(validateSignupPinCredentials(' Child-1 ', '١٢٣٤٥٦'), {
    username: 'child-1',
    password: '123456'
  });
  assert.throws(() => validateSignupPinCredentials('valid_name', '1234'), TypeError);
  assert.throws(() => validateSignupPinCredentials('valid_name', '12a456'), TypeError);
  assert.throws(() => validateSignupPinCredentials('valid_name', '1'.repeat(129)), TypeError);
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

test('PINs are stored as salted hashes and only verify the matching PIN', async () => {
  const first = await hashPassword('0042');
  const second = await hashPassword('0042');
  assert.notEqual(first.passwordSalt, second.passwordSalt);
  assert.notEqual(first.passwordHash, second.passwordHash);
  assert.equal(await verifyPassword('0042', first), true);
  assert.equal(await verifyPassword('0043', first), false);
});

test('rate-limit identifiers are one-way stable hashes', () => {
  assert.equal(hashRateLimitKey('ip:user'), hashRateLimitKey('ip:user'));
  assert.notEqual(hashRateLimitKey('ip:user'), hashRateLimitKey('ip:other'));
  assert.equal(hashRateLimitKey('ip:user').length, 64);
});
