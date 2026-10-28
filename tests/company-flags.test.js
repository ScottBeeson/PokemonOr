import test from 'node:test';
import assert from 'node:assert/strict';
import { preserveCompanyFlags } from '../scripts/company-flags.mjs';

test('refresh preserves true and false reviews, defaults new entries, and does not mutate inputs', () => {
  const old = [{ name: 'Obvious Robotics', TooObvious: true }, { name: 'Ambiguous', TooObvious: false }];
  const fresh = [{ name: 'Obvious Robotics' }, { name: 'Ambiguous', TooObvious: true }, { name: 'New Name' }];
  const before = structuredClone({ old, fresh });
  const result = preserveCompanyFlags(old, fresh);
  assert.equal(result.find(entry => entry.name === 'Obvious Robotics').TooObvious, true);
  assert.equal(result.find(entry => entry.name === 'Ambiguous').TooObvious, false);
  assert.equal(result.find(entry => entry.name === 'New Name').TooObvious, false);
  assert.deepEqual({ old, fresh }, before);
});

test('flagged entries omitted by a refresh retain their complete record', () => {
  const archived = { name: 'Old Robotics', source: 'https://example.com/old', description: 'Original description', TooObvious: true };
  const result = preserveCompanyFlags([archived], [{ name: 'New Name' }]);
  assert.deepEqual(result.find(entry => entry.name === archived.name), archived);
});

test('a directory rename preserves the flag without duplicating the company', () => {
  const result = preserveCompanyFlags([{ name: 'Former Name', source: 'https://example.com/id', TooObvious: true }],
    [{ name: 'New Name', source: 'https://example.com/id' }]);
  assert.deepEqual(result, [{ name: 'New Name', source: 'https://example.com/id', TooObvious: true }]);
});
