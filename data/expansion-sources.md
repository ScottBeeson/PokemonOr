# Flat, Rock, and Garden sourcing

These are bundled snapshots, verified on 2026-10-28. Gameplay needs no catalog or
taxonomy API. Each answer links to its source. Per-entry provenance lives in
`flat-provenance.json`, `rock-provenance.json`, and `garden-provenance.json`.
The illustrated box, crystal, and flower are original symbolic pack artwork,
not images of the individual answers.

## Flat Pack (03)

183 IKEA furniture and homeware family names; 179 playable. Source: structured
Product records in the [official US catalog](https://www.ikea.com/us/en/cat/products-products/).
The provenance preserves the original name, product type, source title, exact
product URL, and the category page where the record was found. One example
product represents each name; different products may share that name.

Names are displayed in title case with diacritics removed to reduce typography
giveaways. The reveal restores the original spelling and gives the product type.
Single-word names of 4–14 Latin letters are selected across furniture, textiles,
storage, kitchenware, and decor. Familiar names are flagged `TooObvious`.
Catalog inclusion records identity, not ongoing stock or availability. No prices
or product photography are bundled. IKEA trademarks belong to their owners;
this game is unaffiliated with IKEA.

Refresh with `node scripts/update-expansions.mjs flat`. The importer reads public
JSON-LD, deduplicates normalized names, excludes Pokémon collisions, and preserves
existing `TooObvious` flags. Category URLs are in `scripts/expansion-seeds.mjs`.
Review new names, URLs, product types, and exclusions before accepting a refresh.

## Rock Pack (04)

151 handbook mineral names; 145 playable. Source: Anthony, Bideaux, Bladh, and
Nichols, eds., [Handbook of Mineralogy, Mineralogical Society of America](https://handbookofmineralogy.org/).
Names are curated in `scripts/expansion-seeds.mjs`, then matched to exact entries
in the handbook's alphabetical index. Group/variety names without exact entries
are omitted. The snapshot follows the handbook's terminology; it is not a claim
that every historical entry is a currently accepted IMA species.

Each PDF's name heading, crystal system, and hardness are checked during import.
The provenance stores short evidence excerpts for the two reveal facts.
Unrecognized headings or fields are excluded rather than guessed. The short
reveal reports the Mohs hardness value/range, preserving Kyanite's directional
range and Pyrolusite's massive-specimen qualification. The linked sheet contains
additional qualifications and mineral properties. PDFs are not distributed
with the game. Familiar minerals are flagged `TooObvious`; names ending in `-ite`
are retained because that is a real, common mineral naming pattern.

Refresh:

```sh
node scripts/update-expansions.mjs rock --refresh
python scripts/extract-minerals.py
```

The extraction step requires `pypdf`. Downloads go into the ignored
`artifacts/pack-sources/minerals/` directory. Review extraction diagnostics,
provenance excerpts, and any changed facts before accepting the new snapshot.

## Garden Pack (05)

169 plant genera; 162 playable. The curated selection draws from garden plants
and houseplants; names denote genera, not cultivars or individual species.
Source: [GBIF's taxonomic backbone](https://www.gbif.org/), through its
[species match API](https://techdocs.gbif.org/en/openapi/v1/species).

Every included name must be an exact, accepted `GENUS` match in `Plantae`, with
the same canonical name and an identified family. Synonyms, doubtful records,
higher-rank matches, and Pokémon name collisions are excluded. The provenance
preserves GBIF's match response and request URL. The reveal gives the botanical
family and links to the record's stable GBIF usage key. Taxonomy can change;
these are snapshot classifications. Familiar names are flagged `TooObvious`.

Refresh with `node scripts/update-expansions.mjs garden`. Seed names are in
`scripts/expansion-seeds.mjs`. Review any taxonomy changes and newly admitted
names before accepting the output.

## Validation

All three refreshes require at least 100 records before replacing a catalog.
Run `npm test` and `npm run build` after a refresh. Tests verify provenance,
category identity, unique names, Pokémon collision checks, playable minimums,
excluded-name filtering, pack-specific controls, full ten-question runs, and
cross-pack loader isolation. Existing Tech and Rx score keys stay unchanged.
