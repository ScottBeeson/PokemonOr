# Rx Pack sources

Pack 02 contains curated prescription medication brand names. Identity and generic-name
descriptions come from the [openFDA drug labeling API](https://open.fda.gov/apis/drug/label/).
Each entry links directly to its Structured Product Label on
[DailyMed](https://dailymed.nlm.nih.gov/).

`rx-provenance.json` stores the exact API query, matched brand names, generic names,
prescription product type, label set ID, and verification date for every shipped entry.
Only exact brand matches with `HUMAN PRESCRIPTION DRUG` labels are accepted.
Records whose generic name is the same as the displayed brand are excluded.
Historical labels may be included; these records do not establish current availability.

Reveals identify the generic ingredient from the label, without treatment or dosing advice.
The capsule artwork is a pack illustration, not the appearance of a specific medication.

The candidate list is curated for distinctive names. Particularly recognizable brands
are retained with `TooObvious: true` and excluded from play. This is a subjective game
difficulty decision; existing flags are preserved on refresh.

Run `npm run update:rx` to verify the candidate list and regenerate both JSON files.
This is a manual maintenance task. Gameplay and builds use the checked-in snapshot
and never call the FDA API. Review the result and run `npm test` before publishing.
