import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

test('every company logo maps to a real company and a bundled image', async () => {
  const root = new URL('../', import.meta.url);
  const companies = JSON.parse(await readFile(new URL('data/companies.json', root), 'utf8'));
  const logos = JSON.parse(await readFile(new URL('data/company-logos.json', root), 'utf8'));
  const names = new Set(companies.map(company => company.name));
  for (const [name, logo] of Object.entries(logos)) {
    assert.ok(names.has(name), `Unknown company: ${name}`);
    assert.match(logo.src, /^\.\/assets\/company-logos\/[a-z0-9-]+\.(png|svg|ico|webp|jpg|gif)$/);
    assert.equal(new URL(logo.source).protocol, 'https:');
    const file = await stat(new URL(logo.src, root));
    assert.ok(file.isFile() && file.size > 80 && file.size <= 500_000, `Invalid image: ${name}`);
  }
});
