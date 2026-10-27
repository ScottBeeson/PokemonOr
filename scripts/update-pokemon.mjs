// Refresh the bundled English species list from the PokéAPI project's data.
// Node.js 20+; run from any working directory: node scripts/update-pokemon.mjs
// Source: https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv
import { mkdir, writeFile } from 'node:fs/promises';

const source = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/pokemon_species_names.csv';

// CSV fields can contain quoted commas, double quotes, or newlines.
function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field); field = '';
    } else if (char === '\n' && !quoted) {
      row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = '';
    } else field += char;
  }
  if (quoted) throw new Error('Invalid CSV: unterminated quoted field.');
  if (field || row.length) { row.push(field.replace(/\r$/, '')); rows.push(row); }
  return rows;
}

const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`PokéAPI data download failed: ${response.status}`);
const [header, ...rows] = parseCsv(await response.text());
if (header.join(',') !== 'pokemon_species_id,local_language_id,name,genus') {
  throw new Error('PokéAPI CSV schema changed; inspect the source before updating.');
}
const pokemon = rows.filter(row => row[1] === '9').map(([id, , name, genus]) => ({
  name,
  category: 'pokemon',
  description: `Pokémon species #${id}${genus ? ` · ${genus}` : ''}.`,
  url: `https://pokeapi.co/api/v2/pokemon-species/${id}/`,
  id: Number(id),
})).sort((a, b) => a.id - b.id);

// Fail safely rather than silently replacing the full list with a partial response.
if (pokemon.length < 1025 || new Set(pokemon.map(p => p.id)).size !== pokemon.length
    || new Set(pokemon.map(p => p.name)).size !== pokemon.length
    || pokemon.some(p => !p.name || !Number.isInteger(p.id) || p.id < 1)) {
  throw new Error('Pokémon data is incomplete or contains invalid/duplicate entries.');
}
const outputDirectory = new URL('../data/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
await writeFile(new URL('pokemon.json', outputDirectory), `${JSON.stringify(pokemon, null, 2)}\n`);
console.log(`Saved ${pokemon.length} English Pokémon species to data/pokemon.json.`);
