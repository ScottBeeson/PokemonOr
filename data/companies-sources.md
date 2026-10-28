# Company dataset

Originally curated on 2026-10-27; expanded on 2026-10-28 for **Pokémon Or**.

## Scope

`companies.json` contains **1,000 distinct company names**: 201 preserved from the curated catalog and 799 imported from Y Combinator's official public company directory. Each has a short original description and an HTTPS website/source link.

The game now covers technology companies broadly: software, cybersecurity, developer tools, computing infrastructure, robotics, hardware, financial software, productivity, analytics, and AI. The initial curated collection emphasized databases and analytics. This is a name-recognition game, not an investment directory or a strict industry taxonomy.

Both current and historical company names are eligible. Acquired or renamed companies such as Census, Rockset, Varada, Trifacta, Talend, and Pachyderm still count. Descriptions use past tense where a former independent company or older brand is relevant. Acquisition or rebranding does not make a historical company name a Pokémon.

Bare open-source projects and product-only names such as Hadoop, Spark, Kafka, PostgreSQL, and BigQuery are intentionally excluded. A name shared by a company and its software, such as MongoDB, is eligible. Former and current aliases of the same company are not deliberately included as separate entries.

On 2026-10-28, 29 original company names containing "Tech" or "Data" (case-insensitive substrings) were excluded from play, leaving the 201 preserved records. This exclusion also applies to every import. None of the 1,025 bundled Pokémon names contain either substring. Company names that also match a Pokémon are excluded to avoid ambiguous questions. The original collection and verification history below are retained for provenance.

## Official Y Combinator import

### Name difficulty review

On 2026-10-28, all 1,000 company names were reviewed for obvious company identifiers. Each record now has the literal boolean `TooObvious`: 237 are `true` and excluded from rounds, while 763 are `false` and eligible. No records, existing fields, provenance, or logos were removed. Legal suffixes, explicit industry/technical labels, domain-style names, and a few widely recognizable company names were flagged; ambiguous short brands were retained. Individual reasons and examples are recorded in `company-obvious-review.json`.

The flag in `companies.json` is authoritative: changing it to `false` makes that company eligible again. Refreshes preserve manual flags by source URL/name and retain flagged records with their provenance even when a later directory selection omits them. This can take the stored catalog above the refresh target. Newly imported entries default to `false` and should receive a difficulty review before publication.

Run `node scripts/import-tech-companies.mjs` to reproduce the expansion. The default target is 1,000 total records; `--target=1000` is explicit. The importer preserves the curated entries and replaces only its own prior imports. It fails before writing if there are too few eligible records.

The importer reads the [official YC startup directory](https://www.ycombinator.com/companies), discovers the short-lived public search options embedded in that page, and queries the same read-only Algolia index used by YC's directory. It retrieves records by batch to stay within the service's result limit. No search key is saved in source, data, logs, or provenance. The 2026-10-28 run examined **6,342 official directory records** across non-future batches.

`company-provenance.json` provides entry-level primary evidence keyed by exact company name: official YC profile URL, company website supplied by YC, directory logo URL, industry classifications, tags, former names, listed status, batch, verification timestamp, and selection group. Each imported catalog entry also has a `source` URL to its official YC profile. Company identities, website associations, and technology classifications were verified against this primary directory; the importer does **not** claim that all 799 company websites were individually audited, or that a directory's status field is always current. Website availability alone is not treated as company verification.

Imported descriptions explicitly report the directory's industry and tag classifications, using the form “YC lists this company in …, with a focus on ….” They do not infer that a company builds software or hardware from its selection group. No long marketing descriptions or company biographies are copied. A group label is used only for sampling and does not establish what a company manufactures or sells.

Selection excludes:

- Names containing `tech` or `data`, regardless of case; exact Pokémon-name matches.
- Duplicate normalized names, known former-name aliases, and duplicate normalized website hosts.
- Names longer than 28 characters or four words, decorative names, and product/alias wrappers such as “X by Y.”
- Inactive companies, nonprofits, future-batch placeholders, missing HTTPS company websites, and social/profile URLs.
- Healthcare providers, therapeutics, clinical businesses, retail, travel, food, apparel, and other categories outside the intended technology scope.
- Service businesses without direct technology-product evidence, and records lacking a technology signal in their official industry, tags, or short description. “Platform” or “AI” alone does not suffice. Short tokens such as “API” match whole words, so “capital” is not treated as an API signal.
- Nine specifically reviewed borderline records: Proven Group (skincare), garten (wellness services), Craftwork (painting franchise), Circular (electronics rental), Lux Foods (crop production), TyltGO (delivery), Charityvest (giving accounts), doola (formation services), and Version Story Compare (product-wrapper name).

When the short description does not establish a technical product, the importer requires both a relevant product classification and direct technical-product language in the detailed official profile. Detailed biographies are retrieved solely for this eligibility check and are not shipped in the catalog or provenance.

Eligible records are grouped by their technology evidence, prioritized by YC's established-company flag and listed team size, and selected round-robin across nine groups until the target is reached. Smaller eligible groups are exhausted before larger groups continue. The final 799 imports contain 256 developer-tools/infrastructure entries, 137 hardware/robotics, 121 business software, 71 financial software, 71 AI software, 58 security, 40 productivity, 26 analytics, and 19 creative/consumer software. Those are sampling groups rather than exclusive industry classifications. The stronger eligibility checks produce unequal group sizes while preserving broad coverage.

The dataset is a dated primary-source snapshot. Companies can rename, pivot, cease operating, or be acquired after publication; the source URLs and provenance make corrections reviewable. New names must not be added merely to increase the count.

## Sources and verification

For the original curated records, `url` is the company's official website, official documentation, or an acquiring company's announcement. Imported records use YC's supplied company website in `url` and its official YC company profile in `source`. Descriptions are brief original summaries, not copied marketing passages.

All 230 original candidate URLs were checked by automated HTTPS requests and page-title inspection. Most returned readable official pages; some blocked automated requests or had transient DNS/TLS failures. These checks establish link identity and gross relevance, not a comprehensive manual audit of every page or a guarantee that each company remains independent. Acquisition/rename redirects were reviewed, and several stale links were replaced with primary announcements. One inaccessible candidate (Sisu Data) was replaced with Pachyderm using HPE's announcement.

Primary sources examined in more detail include:

- [Databricks company overview](https://www.databricks.com/company/about-us)
- [Fivetran](https://www.fivetran.com/)
- [Snowflake](https://www.snowflake.com/en/)
- [Dataiku](https://www.dataiku.com/)
- [Starburst](https://www.starburst.io/)
- [Aerospike](https://aerospike.com/)
- [ScyllaDB](https://www.scylladb.com/)
- [Yugabyte](https://www.yugabyte.com/)
- [Tiger Data](https://www.tigerdata.com/)
- [PingCAP](https://www.pingcap.com/)
- [Kinetica](https://www.kinetica.com/)
- [Exasol](https://www.exasol.com/)
- [Meltano](https://meltano.com/)
- [Stratio](https://stratio.ai/)
- [Volt Active Data](https://www.voltactivedata.com/)
- [Zing Data official documentation](https://docs.getzingdata.com/docs/getting-started/)

Historical-name references:

- [Census migration to Fivetran](https://fivetran.com/docs/activations/census-migration-faq)
- [OpenAI acquires Rockset](https://openai.com/index/openai-acquires-rockset/)
- [Starburst acquires Varada](https://www.starburst.io/press-releases/starburst-acquires-varada-to-deliver-the-new-standard-of-data-lake-analytics/)
- [Snowflake announces agreement to acquire TruEra](https://www.snowflake.com/en/blog/snowflake-acquires-truera-to-bring-llm-ml-observability-to-data-cloud/)
- [Cloudera announces Octopai platform acquisition](https://www.cloudera.com/about/news-and-blogs/press-releases/2024-11-14-cloudera-to-acquire-octopais-platform.html)
- [Tecton joining Databricks](https://www.databricks.com/blog/tecton-joining-databricks-power-real-time-data-personalized-ai-agents)
- [DuckDB Labs becomes DuckLabs](https://ducklabs.com/news/2026/05/27/duckdb-labs-becomes-ducklabs)
- [KPMG acquires Metaphor's technology platform](https://kpmg.com/us/en/media/news/kpmg-acquires-metaphors-technology-platform.html)
- [Qlik acquires Talend](https://www.qlik.com/us/news/company/press-room/press-releases/qlik-acquires-talend)
- [Trifacta becomes Alteryx Designer Cloud](https://www.alteryx.com/about-us/trifacta-is-now-alteryx-designer-cloud)
- [HPE acquires Pachyderm](https://www.hpe.com/us/en/newsroom/press-release/2023/01/hewlett-packard-enterprise-acquires-pachyderm-to-expand-ai-at-scale-capabilities-with-reproducible-ai.html)

## Maintenance

Add one record per company with `name`, `category: "company"`, `description`, and `url`; retain `source` for imports. Prefer official sources and accurate company names over maximizing the count. Check case-insensitive name uniqueness, known aliases, website hosts, Pokémon collisions, the forbidden `tech`/`data` substrings, valid HTTPS URLs, and a supported connection to the technology ecosystem.

Company names and trademarks belong to their respective owners. This game is unaffiliated with the listed companies. The data is bundled locally so gameplay does not depend on these websites being available.

## Company website icons

`data/company-logos.json` maps exact company names to locally bundled website icons. Each value has `src` (a relative local asset URL) and `source` (the downloaded HTTPS image URL). The initial collection contains **199 icons for 230 companies**, totaling about **2.24 MB**: 144 PNGs, 31 ICOs, 20 SVGs, and 4 WebP images.

These are official website favicons or Apple touch icons, not necessarily full company wordmarks. The collector discovers icon links in the company's official homepage HTML and downloads the actual asset, including CDN URLs linked by that page. It prefers larger square/touch icons and SVGs over tiny favicons. Where no suitable icon is available, the game can show company initials.

Run `node scripts/update-company-logos.mjs` to fill missing icons. Existing downloaded icons are retained across transient network failures; add `--refresh` to attempt to refresh them too. Requests use ten workers, seven-second timeouts, and a 500 KB limit per icon. Content is checked against PNG, ICO, WebP, JPEG, GIF, or SVG signatures; HTML/error responses and SVGs with scripts, event handlers, foreign objects, or external references are rejected. All manifest files were checked for existence and size. Databricks, Snowflake, and MotherDuck icons were visually spot-checked.

Historical/acquired names whose pages now show a different company's brand are deliberately omitted. Redirects to unrelated brands are rejected, with a small documented allowlist for recognizable company domain changes. Other omissions are caused by inaccessible sites, anti-bot responses, or unavailable suitable icons. Downloaded logos retain their owners' trademark and copyright rights; inclusion does not imply affiliation or endorsement.

