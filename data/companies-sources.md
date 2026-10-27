# Company dataset

Curated on 2026-10-27 for **POkemon or BigData**.

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

