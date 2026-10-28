// Refresh explicitly with `node scripts/update-expansions.mjs flat|garden|rock`.
// Uses public source records; rounds only read the bundled snapshots.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { ikeaCategories, gardenNames, rockNames } from './expansion-seeds.mjs';

const root = new URL('../', import.meta.url);
const normalize = value => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();
const pokemon = new Set(JSON.parse(await readFile(new URL('data/pokemon.json', root))).map(e => normalize(e.name)));
const date = new Date().toISOString().slice(0, 10);
async function get(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${response.status}: ${url}`);
  return response;
}
async function save(id, entries, provenance) {
  if (entries.length < 100) throw new Error(`${id}: only ${entries.length} entries; refusing to replace snapshot`);
  const previous = await readFile(new URL(`data/${id}.json`, root), 'utf8').then(JSON.parse).catch(() => []);
  const flags = new Map(previous.map(e => [e.name, e.TooObvious]));
  for (const entry of entries) entry.TooObvious = flags.get(entry.name) ?? entry.TooObvious ?? false;
  entries.sort((a,b) => a.name.localeCompare(b.name, 'en'));
  await writeFile(new URL(`data/${id}.json`, root), JSON.stringify(entries, null, 2) + '\n');
  await writeFile(new URL(`data/${id}-provenance.json`, root), JSON.stringify({ verifiedAt: date, records: provenance }, null, 2) + '\n');
  console.log(`${id}: ${entries.length} stored, ${entries.filter(e => !e.TooObvious).length} playable`);
}

const target = process.argv[2];
if (target === 'flat') {
  const found = new Map();
  // Include several product types so one IKEA family does not dominate the deck.
  for (const category of ikeaCategories) {
    const sourceUrl = `https://www.ikea.com/us/en/cat/${category}/?items=60`;
    const html = await (await get(sourceUrl)).text();
    const products = [];
    function walk(value) {
      if (!value || typeof value !== 'object') return;
      if (value['@type'] === 'Product' && value.name && value.url) products.push(value);
      for (const child of Object.values(value)) if (typeof child === 'object') Array.isArray(child) ? child.forEach(walk) : walk(child);
    }
    for (const match of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) walk(JSON.parse(match[1]));
    for (const product of products) {
      const [originalName, type] = product.name.split(',').map(s => s.trim());
      const key = normalize(originalName);
      if (!/^[a-z]{4,14}$/.test(key) || pokemon.has(key) || !type || found.has(key)) continue;
      const name = key[0].toUpperCase() + key.slice(1);
      found.set(key, { name, originalName, type, url: product.url, sourceUrl, sourceTitle: product.name });
    }
    console.log(`${category}: ${found.size} unique names`);
  }
  // Familiar English names are still documented, but excluded from play.
  const obvious = new Set(['Billy', 'Alex', 'Malm', 'Kallax', 'Lack', 'Ivar', 'Micke', 'Pax']);
  const records = [...found.values()];
  await save('flat', records.map(e => ({ name: e.name, category: 'ikea', description: `IKEA ${e.type.toLowerCase()}. Original name: ${e.originalName}.`, url: e.url, TooObvious: obvious.has(e.name) })), records);
} else if (target === 'garden') {
  const records = [];
  for (let offset = 0; offset < gardenNames.length; offset += 4) {
    const batch = await Promise.all(gardenNames.slice(offset, offset + 4).map(async name => {
      const sourceUrl = `https://api.gbif.org/v1/species/match?name=${name}&kingdom=Plantae&rank=GENUS&strict=true`;
      const record = await (await get(sourceUrl)).json();
      if (record.matchType !== 'EXACT' || record.rank !== 'GENUS' || record.kingdom !== 'Plantae' || record.status !== 'ACCEPTED' || record.canonicalName !== name || !record.family || pokemon.has(normalize(name))) {
        console.log(`Excluded ${name}: ${record.matchType}/${record.status}`);
        return null;
      }
      return { name, sourceUrl, ...record };
    }));
    records.push(...batch.filter(Boolean));
    console.log(`Garden: verified ${Math.min(offset + 4, gardenNames.length)}/${gardenNames.length}`);
  }
  const obvious = new Set(['Gardenia', 'Fuchsia', 'Wisteria', 'Yucca', 'Zinnia', 'Viola', 'Cosmos']);
  await save('garden', records.map(e => ({ name: e.name, category: 'plant', description: `A plant genus in the ${e.family} family.`, url: `https://www.gbif.org/species/${e.usageKey}`, TooObvious: obvious.has(e.name) })), records);
} else if (target === 'rock') {
  // Download sheets for the extraction step documented in data/expansion-sources.md.
  const sourceUrl = 'https://handbookofmineralogy.org/pdf-search/';
  const html = await (await get(sourceUrl)).text();
  const links = new Map([...html.matchAll(/href=['"]([^'"]+\.pdf)['"][^>]*>\s*([^<]+)<\/a>/gi)]
    .map(m => [normalize(m[2].trim()), m[1].replace(/^http:/, 'https:')]));
  const dir = new URL('artifacts/pack-sources/minerals/', root);
  await mkdir(dir, { recursive: true });
  const records = [];
  for (let offset = 0; offset < rockNames.length; offset += 4) {
    const batch = await Promise.all(rockNames.slice(offset, offset + 4).map(async name => {
      const url = links.get(normalize(name));
      if (!url || pokemon.has(normalize(name))) { console.log(`Excluded ${name}: no exact handbook entry`); return null; }
      const file = new URL(`${name}.pdf`, dir);
      // Reuse the local download only for this authoring pass; --refresh refetches it.
      if (process.argv.includes('--refresh') || !await readFile(file).then(() => true).catch(() => false)) await writeFile(file, Buffer.from(await (await get(url)).arrayBuffer()));
      return { name, url, sourceUrl };
    }));
    records.push(...batch.filter(Boolean));
    console.log(`Rock: verified ${Math.min(offset + 4, rockNames.length)}/${rockNames.length}`);
  }
  await writeFile(new URL('records.json', dir), JSON.stringify({ verifiedAt: date, records }, null, 2));
  console.log('Run scripts/extract-minerals.py to validate sheets and write the Rock snapshot.');
} else {
  throw new Error('Choose flat, garden, or rock. See data/expansion-sources.md.');
}
