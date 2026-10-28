import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { preserveCompanyFlags } from './company-flags.mjs';

// Uses only the public, read-only search endpoint exposed by YC's own directory.
// No secret credentials are stored. Public short-lived search options are discovered each run.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = Number(process.argv.find(v => v.startsWith('--target='))?.split('=')[1] || 1000);
if (!Number.isInteger(target) || target < 201 || target > 5000) throw new Error('Target must be 201..5000');
const catalogPath = path.join(root, 'data/companies.json');
const provenancePath = path.join(root, 'data/company-provenance.json');
const directory = 'https://www.ycombinator.com/companies';
const old = JSON.parse(await readFile(catalogPath, 'utf8'));
const oldProvenance = await readFile(provenancePath, 'utf8').then(JSON.parse).catch(() => ({ companies: {} }));
const pokemon = JSON.parse(await readFile(path.join(root, 'data/pokemon.json'), 'utf8'));
const pokemonNames = new Set(pokemon.map(row => row.name.toLowerCase()));
// Keep the curated pre-import catalog; replace only records previously added by this importer.
const curated = old.filter(row => !row.source?.startsWith(directory + '/'));
const now = new Date().toISOString();
async function get(url, options = {}) {
  const r = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000) });
  if (!r.ok) throw new Error(`${r.status} from ${new URL(url).hostname}`);
  return r;
}
const html = await (await get(directory)).text();
const match = html.match(/window\.AlgoliaOpts\s*=\s*(\{[^;]+\})/);
if (!match) throw new Error('YC directory search configuration changed');
const opts = JSON.parse(match[1]);
const endpoint = `https://${opts.app}-dsn.algolia.net/1/indexes/YCCompany_production/query`;
const attributes = ['id', 'name', 'slug', 'former_names', 'website', 'one_liner', 'long_description', 'industries', 'tags', 'industry', 'subindustry', 'batch', 'status', 'nonprofit', 'small_logo_thumb_url', 'top_company', 'team_size'];
async function query(params) {
  const r = await get(endpoint, { method: 'POST', headers: {
    'content-type': 'application/json', 'x-algolia-application-id': opts.app, 'x-algolia-api-key': opts.key,
  }, body: JSON.stringify({ query: '', hitsPerPage: 1000, attributesToRetrieve: attributes, attributesToHighlight: [], ...params }) });
  return r.json();
}
const first = await query({ hitsPerPage: 0, facets: ['batch'], maxValuesPerFacet: 100 });
const batches = Object.keys(first.facets.batch).sort();
const discovered = new Map(); let cursor = 0;
await Promise.all(Array.from({ length: 5 }, async () => {
  while (cursor < batches.length) {
    const batch = batches[cursor++];
    // Skip announced future batches, whose profiles may be placeholders.
    const year = Number(batch.match(/\d{4}/)?.[0] || 0);
    if (year > new Date().getUTCFullYear()) continue;
    const result = await query({ facetFilters: [`batch:${batch}`] });
    if (result.nbHits > 1000) throw new Error('Batch exceeds API page size; update pagination');
    for (const row of result.hits) discovered.set(String(row.id), row);
  }
}));

const normalize = value => value.toLowerCase().replace(/[^a-z0-9]/g, '').replace(/(?:incorporated|corporation|limited|inc|llc|ltd)$/, '');
const host = value => new URL(value).hostname.replace(/^www\./, '');
const usedNames = new Set(curated.map(row => normalize(row.name)));
const usedHosts = new Set(curated.map(row => host(row.url)));
const excluded = {};
const reject = reason => { excluded[reason] = (excluded[reason] || 0) + 1; return null; };
// Word boundaries matter: "API" must not match "capital". A generic platform,
// marketplace, finance, or AI tag alone does not establish a technology product.
const signals = /\b(?:software|saas|developer|devops|cybersecurity|api|cloud computing|robotics|hardware|computer vision|machine learning|artificial intelligence|database|analytics|open source|semiconductor|messaging|collaboration|productivity|gaming|aerospace|drones|consumer electronics)\b/i;
const concreteProduct = /\b(?:software|saas|api|apis|app|apps|application|applications|database|robot|robots|robotics|semiconductor|satellite|satellites|spacecraft|space vehicle|space vehicles|propulsion|drone|drones|computer|computing|developer tools|cloud|cybersecurity|operating system|browser|game engine|video games|autonomous|payment processing|digital wallet|digital currency wallet)\b/i;
const reviewedExclusions = new Map([
  ['Proven Group', 'Personalized skincare products; not a software company'],
  ['garten', 'Office nutrition and wellness services'],
  ['Craftwork', 'Home painting and home-services franchise'],
  ['Circular', 'Electronics rental service; hardware tag does not establish hardware development'],
  ['Version Story Compare', 'Product-wrapper name; independent company brand not established'],
  ['Lux Foods', 'Engineered crop production rather than a software/hardware product business'],
  ['TyltGO', 'Delivery service; SaaS tag alone is insufficient product evidence'],
  ['Charityvest', 'Charitable giving accounts; insufficient direct technology-product evidence'],
  ['doola', 'Business formation and compliance services; excluded as a borderline service business'],
]);
const ineligibleIndustries = /healthcare|therapeutics|drug discovery|diagnostics|industrial bio|apparel|food and beverage|home and personal|retail|health and wellness|health services|job and career services|travel, leisure/i;
const buckets = new Map();
function candidate(row) {
  if (!row.name || /tech|data/i.test(row.name)) return reject('name_contains_tech_or_data');
  if (reviewedExclusions.has(row.name)) return reject('reviewed_nontech_or_product_wrapper');
  if (pokemonNames.has(row.name.toLowerCase())) return reject('ambiguous_pokemon_name');
  if (!/^[A-Za-z0-9][A-Za-z0-9 .&+'!-]{2,27}$/.test(row.name) || row.name.trim().split(/\s+/).length > 4) return reject('long_or_unsuitable_name');
  if (/\sby\s|\bformerly\b|\bpowered\b/i.test(row.name)) return reject('product_or_alias_wrapper_name');
  if (!['Active', 'Public', 'Acquired'].includes(row.status) || row.nonprofit) return reject('inactive_nonprofit_or_unlisted_status');
  if (!row.slug || !row.website?.startsWith('https://')) return reject('missing_primary_https_website');
  let url;
  try { url = new URL(row.website); } catch { return reject('invalid_website'); }
  if (!url.hostname.includes('.') || /(^|\.)(linkedin\.com|twitter\.com|facebook\.com|github\.com|youtube\.com|youtu\.be|google\.com|notion\.site|ycombinator\.com)$/.test(url.hostname)) return reject('non_company_website');
  const industries = row.industries || [], tags = row.tags || [];
  const evidence = `${industries.join(' ')} ${tags.join(' ')} ${row.one_liner || ''}`;
  if (ineligibleIndustries.test(industries.join(' '))) return reject('outside_technology_scope');
  if (!signals.test(evidence)) return reject('insufficient_technology_evidence');
  const classifiedProduct = /\b(?:SaaS|Enterprise Software|Developer Tools|DevOps|API|Open Source|Cloud Computing|Cybersecurity|Robotics|Aerospace|Consumer Electronics|Drones|Gaming)\b/i.test(tags.join(' '));
  // A broad SaaS label is insufficient when the description only offers services.
  // Read detailed directory evidence without copying that biography into the bundle.
  if (!concreteProduct.test(row.one_liner || '') && !(classifiedProduct && concreteProduct.test(row.long_description || ''))) return reject('no_direct_technology_product_evidence');
  if (/\b(?:agency|consultancy|consulting firm|staffing|recruitment agency|law firm|clinic|franchise|skincare|skin care|catering|nutrition|wellness|rental|rentals)\b/i.test(row.one_liner || '') && !/\b(?:software|saas|api|app|apps|application|applications)\b/i.test(row.one_liner || '')) return reject('service_business');
  // Classify by specific evidence first so AI tags do not dominate the selection.
  let bucket = 'business software';
  if (/security|cybersecurity|devsecops/i.test(evidence)) bucket = 'security';
  else if (/\b(?:developer tools|devops|infrastructure|cloud computing|api|open source)\b/i.test(tags.join(' '))) bucket = 'developer tools and infrastructure';
  else if (/robotics|hardware|semiconductor|drones|consumer electronics/i.test(evidence)) bucket = 'hardware and robotics';
  else if (row.industry === 'Fintech' || /payments|crypto|blockchain|fintech/i.test(tags.join(' '))) bucket = 'financial software';
  else if (/gaming|social|content|messaging|entertainment|design tools/i.test(industries.join(' ') + ' ' + tags.join(' '))) bucket = 'creative and consumer software';
  else if (/productivity|collaboration|workflow/i.test(evidence)) bucket = 'productivity';
  else if (/analytics|data engineering|database/i.test(evidence)) bucket = 'analytics';
  else if (/artificial intelligence|machine learning|computer vision|\bai\b/i.test(tags.join(' '))) bucket = 'AI software';
  return { row, bucket, url: url.href, aliases: [row.name, ...(row.former_names || [])].map(normalize).filter(Boolean) };
}
for (const row of discovered.values()) {
  const item = candidate(row);
  if (item) {
    if (!buckets.has(item.bucket)) buckets.set(item.bucket, []);
    buckets.get(item.bucket).push(item);
  }
}
// Prefer established companies within each group, then alternate groups for breadth.
for (const list of buckets.values()) list.sort((a, b) => Number(b.row.top_company) - Number(a.row.top_company) || (b.row.team_size || 0) - (a.row.team_size || 0) || a.row.name.localeCompare(b.row.name));
const additions = [], provenance = {}, mix = {};
const orderedBuckets = [...buckets.keys()].sort();
let progress = true;
while (curated.length + additions.length < target && progress) {
  progress = false;
  for (const bucket of orderedBuckets) {
    const list = buckets.get(bucket);
    while (list.length) {
      const item = list.shift(), row = item.row;
      if (item.aliases.some(name => usedNames.has(name)) || usedHosts.has(host(item.url))) { reject('duplicate_name_alias_or_domain'); continue; }
      item.aliases.forEach(name => usedNames.add(name)); usedHosts.add(host(item.url));
      const ycUrl = directory + '/' + encodeURIComponent(row.slug);
      // Describe the source taxonomy explicitly. Group assignment is only a
      // sampling strategy and cannot prove what the company builds or sells.
      const specificIndustry = (row.industries || []).at(-1) || row.industry || 'technology';
      const specifics = [...new Set(row.tags || [])]
        .filter(tag => !/^(B2B|Consumer|Enterprise)$/i.test(tag) && tag.toLowerCase() !== specificIndustry.toLowerCase()).slice(0, 2);
      const description = `YC lists this company in ${specificIndustry.toLowerCase()}${specifics.length ? ', with a focus on ' + specifics.map(t => t.toLowerCase()).join(' and ') : ''}.`;
      additions.push({ name: row.name, category: 'company', description, url: item.url, source: ycUrl });
      provenance[row.name] = {
        ycUrl, website: item.url, logoUrl: row.small_logo_thumb_url?.startsWith('https://') ? row.small_logo_thumb_url : null,
        industries: row.industries || [], tags: row.tags || [], verifiedAt: now,
        formerNames: row.former_names || [], status: row.status, batch: row.batch, selectionGroup: bucket,
      };
      mix[bucket] = (mix[bucket] || 0) + 1; progress = true;
      break;
    }
    if (curated.length + additions.length >= target) break;
  }
}
if (curated.length + additions.length < target) throw new Error(`Only ${curated.length + additions.length} eligible unique records; no files changed`);
// Keep manual flags and archive flagged entries even if a later directory refresh omits them.
// Retaining such records can take the stored catalog above the requested target.
const catalog = preserveCompanyFlags(old, [...curated, ...additions]);
for (const entry of catalog.filter(entry => entry.source)) {
  if (!provenance[entry.name]) {
    const record = oldProvenance.companies[entry.name];
    if (!record) throw new Error(`Missing retained provenance for ${entry.name}`);
    provenance[entry.name] = record;
  }
}
const finalMix = {};
for (const record of Object.values(provenance)) {
  finalMix[record.selectionGroup] = (finalMix[record.selectionGroup] || 0) + 1;
}
if (catalog.some(row => /tech|data/i.test(row.name))) throw new Error('Forbidden company name');
if (catalog.some(row => pokemonNames.has(row.name.toLowerCase()))) throw new Error('Ambiguous Pokémon/company name');
if (new Set(catalog.map(row => row.name.toLowerCase())).size !== catalog.length) throw new Error('Duplicate company name');
await writeFile(provenancePath, JSON.stringify({
  source: directory, retrievedAt: now, verification: 'Company identity, website association, industry, and tags verified against Y Combinator\'s official public directory; individual company websites are not exhaustively audited.',
  discoveredCount: discovered.size, curatedCount: curated.length, importedCount: Object.keys(provenance).length,
  selectionGroups: finalMix, exclusions: excluded, reviewedExclusions: Object.fromEntries(reviewedExclusions), companies: Object.fromEntries(Object.entries(provenance).sort(([a], [b]) => a.localeCompare(b))),
}, null, 2) + '\n');
await writeFile(catalogPath, JSON.stringify(catalog, null, 2) + '\n');
console.log(JSON.stringify({ total: catalog.length, preserved: curated.length, imported: Object.keys(provenance).length, selectedImports: additions.length, discovered: discovered.size, mix: finalMix, excluded,
  removedNames: old.filter(a => !catalog.some(b => a.name === b.name)).map(a => a.name),
  addedNames: catalog.filter(a => !old.some(b => a.name === b.name)).map(a => a.name),
}, null, 2));
