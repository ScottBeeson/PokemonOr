import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('bundled data contains complete Pokémon species and a substantial company collection', async () => {
  const names = new Set();
  for (const [file, category, minimum] of [['pokemon', 'pokemon', 1025], ['companies', 'company', 150]]) {
    const entries = JSON.parse(await readFile(new URL(`../data/${file}.json`, import.meta.url), 'utf8'));
    assert.ok(entries.length >= minimum, `${file} must contain at least ${minimum} entries`);
    for (const entry of entries) {
      assert.equal(entry.category, category);
      assert.equal(typeof entry.name, 'string');
      assert.ok(entry.name.trim().length > 0);
      assert.ok(!names.has(entry.name.toLowerCase()), `Duplicate name ${entry.name}`);
      names.add(entry.name.toLowerCase());
      assert.ok(entry.description.length > 10, `Missing description for ${entry.name}`);
      assert.equal(new URL(entry.url).protocol, 'https:');
    }
    if (category === 'pokemon') {
      assert.equal(new Set(entries.map(entry => entry.id)).size, entries.length);
      for (let id = 1; id <= 1025; id++) assert.ok(entries.some(entry => entry.id === id), `Missing species ${id}`);
      assert.ok(entries.some(entry => entry.name === 'Type: Null'));
      assert.ok(entries.some(entry => entry.name === 'Flabébé'));
    }
  }
});
