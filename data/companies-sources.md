# Company dataset

Curated on 2026-10-27 for **Pokemon or BigData**.

## Scope

`companies.json` contains **230 distinct company names**, each with a short original description and an HTTPS source link.

“Big Data” is deliberately broad for this game: data platforms, databases, analytics, business intelligence, data engineering, governance, observability, and AI data infrastructure. Some large technology companies are included because they sell substantial data infrastructure. This is a name-recognition game, not an investment directory or a strict industry taxonomy.

Both current and historical company names are eligible. Acquired or renamed companies such as Census, Rockset, Varada, Trifacta, Talend, and Pachyderm still count. Descriptions use past tense where a former independent company or older brand is relevant. Acquisition or rebranding does not make a historical company name a Pokémon.

Bare open-source projects and product-only names such as Hadoop, Spark, Kafka, PostgreSQL, and BigQuery are intentionally excluded. A name shared by a company and its software, such as MongoDB, is eligible. Former and current aliases of the same company are not deliberately included as separate entries.

## Sources and verification

Each record's `url` is its primary source: the company's official website, official documentation, or an acquiring company's announcement. Descriptions are brief original summaries, not copied marketing passages.

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

Add one record per company with `name`, `category: "company"`, `description`, and `url`. Prefer official sources and accurate company names over maximizing the count. Check case-insensitive name uniqueness, valid HTTPS URLs, and that each description explains the company's connection to the data ecosystem.

Company names and trademarks belong to their respective owners. This game is unaffiliated with the listed companies. The data is bundled locally so gameplay does not depend on these websites being available.

## Company website icons

`data/company-logos.json` maps exact company names to locally bundled website icons. Each value has `src` (a relative local asset URL) and `source` (the downloaded HTTPS image URL). The initial collection contains **199 icons for 230 companies**, totaling about **2.24 MB**: 144 PNGs, 31 ICOs, 20 SVGs, and 4 WebP images.

These are official website favicons or Apple touch icons, not necessarily full company wordmarks. The collector discovers icon links in the company's official homepage HTML and downloads the actual asset, including CDN URLs linked by that page. It prefers larger square/touch icons and SVGs over tiny favicons. Where no suitable icon is available, the game can show company initials.

Run `node scripts/update-company-logos.mjs` to fill missing icons. Existing downloaded icons are retained across transient network failures; add `--refresh` to attempt to refresh them too. Requests use ten workers, seven-second timeouts, and a 500 KB limit per icon. Content is checked against PNG, ICO, WebP, JPEG, GIF, or SVG signatures; HTML/error responses and SVGs with scripts, event handlers, foreign objects, or external references are rejected. All manifest files were checked for existence and size. Databricks, Snowflake, and MotherDuck icons were visually spot-checked.

Historical/acquired names whose pages now show a different company's brand are deliberately omitted. Redirects to unrelated brands are rejected, with a small documented allowlist for recognizable company domain changes. Other omissions are caused by inaccessible sites, anti-bot responses, or unavailable suitable icons. Downloaded logos retain their owners' trademark and copyright rights; inclusion does not imply affiliation or endorsement.

