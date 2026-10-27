import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Download official website icons, not third-party logo API results.
// Run from any directory with Node 22+: node scripts/update-company-logos.mjs
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'assets/company-logos');
const companies = JSON.parse(await readFile(path.join(root, 'data/companies.json'), 'utf8'));
const maxBytes = 500_000;
const concurrency = 10;
const timeout = 7_000;
// These URLs now identify an acquirer, another brand, or a historical announcement.
// An omitted logo is preferable to identifying the old company with its acquirer's mark.
const historical = new Set([
  'Census', 'Rockset', 'Varada', 'TruEra', 'Pachyderm', 'Octopai', 'Tecton',
  'Metaphor', 'Gretel', 'Oxla', 'Satori', 'Zeenea', 'CelerData', 'Opendatasoft',
  'MindsDB', 'DataStax', 'StreamSets', 'Talend', 'Trifacta', 'Upsolver',
]);
// These canonical, official addresses avoid redirects/TLS issues at bare domains.
const overrides = {
  'Amazon Web Services': 'https://aws.amazon.com/',
  'Altair': 'https://altair.com/',
  'Datadog': 'https://www.datadoghq.com/',
  'Dataloop': 'https://dataloop.ai/',
  'Domo': 'https://www.domo.com/',
  'IBM': 'https://www.ibm.com/us-en',
  'PingCAP': 'https://www.pingcap.com/',
  'SingleStore': 'https://www.singlestore.com/',
  'Teradata': 'https://www.teradata.com/',
  'TigerGraph': 'https://www.tigergraph.com/',
  'Weka': 'https://www.weka.io/',
  'Voltron Data': 'https://voltrondata.com/',
  'Zing Data': 'https://docs.getzingdata.com/',
};
// Rebrands where the company still uses its recognizable original name.
const acceptedRedirects = new Map([
  ['gooddata.com', 'gooddata.ai'], ['arango.ai', 'arangodb.com'],
  ['arangodb.com', 'arango.ai'], ['dominodatalab.com', 'domino.ai'],
  ['montecarlodata.com', 'montecarlo.ai'], ['stratio.com', 'stratio.ai'],
  ['prophecy.io', 'prophecy.ai'], ['treasuredata.com', 'treasure.ai'],
]);

function brandHost(url) {
  return new URL(url).hostname.replace(/^(www|docs)\./, '');
}
function sameBrand(original, redirected) {
  const a = brandHost(original), b = brandHost(redirected);
  return a === b || acceptedRedirects.get(a) === b;
}
async function fetchLimited(url, limit) {
  if (new URL(url).protocol !== 'https:') throw new Error('HTTPS required');
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeout),
    headers: { 'User-Agent': 'PokemonOrBigData/1.0 (official website icon collector)' },
  });
  if (!response.ok) throw new Error('HTTP ' + response.status);
  if (Number(response.headers.get('content-length')) > limit) throw new Error('Too large');
  const chunks = []; let length = 0;
  for await (const chunk of response.body) {
    length += chunk.length;
    if (length > limit) throw new Error('Too large');
    chunks.push(chunk);
  }
  return { bytes: Buffer.concat(chunks), url: response.url, type: response.headers.get('content-type') || '' };
}
function decode(value) {
  return value.replace(/&amp;/g, '&').replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
}
function attributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) attrs[match[1].toLowerCase()] = decode(match[2] ?? match[3] ?? match[4]);
  return attrs;
}
function iconCandidates(html, base) {
  const candidates = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) || []) {
    const attrs = attributes(tag), rel = (attrs.rel || '').toLowerCase();
    if (!attrs.href || !/(^|\s)(icon|apple-touch-icon|apple-touch-icon-precomposed)(\s|$)/.test(rel)) continue;
    try {
      const url = new URL(attrs.href, base);
      if (url.protocol !== 'https:') continue;
      const size = Number((attrs.sizes || '').match(/(\d+)x\d+/)?.[1] || 0);
      const score = /apple-touch/.test(rel) ? 500 + size : /svg/i.test(attrs.type || url.pathname) ? 450 : size;
      candidates.push({ url: url.href, score });
    } catch { /* Ignore malformed website markup. */ }
  }
  candidates.push({ url: new URL('/favicon.ico', base).href, score: -1 });
  return [...new Map(candidates.sort((a, b) => b.score - a.score).map(c => [c.url, c])).values()].slice(0, 4);
}
function imageExtension(bytes, type) {
  if (bytes.length < 80 || /text\/html|application\/json/i.test(type)) throw new Error('Not an image');
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png';
  if (bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0) return 'ico';
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (/^GIF8[79]a/.test(bytes.toString('ascii', 0, 6))) return 'gif';
  const text = bytes.toString('utf8').trim();
  if (/<svg\b/i.test(text) && !/<(?:script|foreignObject|html)\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|javascript:)/i.test(text)) return 'svg';
  throw new Error('Unrecognized or unsafe image');
}

await mkdir(output, { recursive: true });
let index = 0;
const manifest = {}, omitted = [];
// Preserve already downloaded icons across transient website outages.
try {
  const previous = JSON.parse(await readFile(path.join(root, 'data/company-logos.json'), 'utf8'));
  for (const company of companies) {
    const entry = previous[company.name];
    if (!historical.has(company.name) && entry?.src?.startsWith('./assets/company-logos/') && !entry.src.includes('..') && entry?.source?.startsWith('https://')) {
      const info = await stat(path.join(root, entry.src)).catch(() => null);
      if (info?.isFile() && info.size <= maxBytes) manifest[company.name] = entry;
    }
  }
} catch { /* First run. */ }
await Promise.all(Array.from({ length: concurrency }, async () => {
  while (index < companies.length) {
    const company = companies[index++];
    if (historical.has(company.name)) { omitted.push(company.name + ': historical/acquired brand'); continue; }
    if (manifest[company.name] && !process.argv.includes('--refresh')) continue;
    const homepage = overrides[company.name] || company.url;
    try {
      let page;
      try { page = await fetchLimited(homepage, 2_000_000); }
      catch {
        const alternate = new URL(homepage);
        alternate.hostname = alternate.hostname.startsWith('www.') ? alternate.hostname.slice(4) : 'www.' + alternate.hostname;
        page = await fetchLimited(alternate.href, 2_000_000);
      }
      if (!sameBrand(homepage, page.url)) throw new Error('Redirect changed company brand');
      let saved = false;
      for (const candidate of iconCandidates(page.bytes.toString('utf8'), page.url)) {
        try {
          const image = await fetchLimited(candidate.url, maxBytes);
          const extension = imageExtension(image.bytes, image.type);
          const slug = company.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
          const filename = slug + '.' + extension;
          await writeFile(path.join(output, filename), image.bytes);
          manifest[company.name] = { src: './assets/company-logos/' + filename, source: image.url };
          saved = true;
          break;
        } catch { /* Try the next official icon. */ }
      }
      if (!saved) throw new Error('No downloadable valid icon');
    } catch (error) { omitted.push(company.name + ': ' + error.message); }
  }
}));
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
await writeFile(path.join(root, 'data/company-logos.json'), JSON.stringify(sorted, null, 2) + '\n');
console.log(`Saved ${Object.keys(sorted).length}/${companies.length} company website icons.`);
console.log('Omitted (UI uses text fallback):\n' + omitted.sort().join('\n'));
