import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('bundled data contains complete Pokémon species and a substantial company collection', async () => {
  const names = new Set();
  for (const [file, category, minimum] of [['pokemon', 'pokemon', 1025], ['companies', 'company', 1000]]) {
    const entries = JSON.parse(await readFile(new URL(`../data/${file}.json`, import.meta.url), 'utf8'));
    assert.ok(entries.length >= minimum, `${file} must contain at least ${minimum} entries`);
    for (const entry of entries) {
      assert.equal(entry.category, category);
      assert.equal(typeof entry.name, 'string');
      assert.ok(entry.name.trim().length > 0);
      assert.doesNotMatch(entry.name, /tech|data/i, `${category} name contains an excluded giveaway: ${entry.name}`);
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

test('imported tech companies retain primary-source provenance', async () => {
  const companies = JSON.parse(await readFile(new URL('../data/companies.json', import.meta.url), 'utf8'));
  const provenance = JSON.parse(await readFile(new URL('../data/company-provenance.json', import.meta.url), 'utf8'));
  const imported = companies.filter(company => company.source);
  assert.ok(imported.length >= 799);
  assert.equal(Object.keys(provenance.companies).length, imported.length);
  const hosts = new Set(companies.filter(company => !company.source)
    .map(company => new URL(company.url).hostname.replace(/^www\./, '')));
  for (const name of Object.keys(provenance.reviewedExclusions || {})) {
    assert.ok(!companies.some(company => company.name === name), `Reviewed exclusion returned: ${name}`);
  }
  for (const company of imported) {
    const record = provenance.companies[company.name];
    assert.ok(record, `Missing provenance for ${company.name}`);
    assert.equal(record.ycUrl, company.source);
    assert.equal(new URL(record.ycUrl).hostname, 'www.ycombinator.com');
    assert.equal(record.website, company.url);
    assert.ok(record.industries.length > 0);
    const host = new URL(company.url).hostname.replace(/^www\./, '');
    assert.ok(!hosts.has(host), `Duplicate imported company host: ${host}`);
    hosts.add(host);
  }
});
