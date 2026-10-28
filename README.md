# Pokémon Or

A real Pokémon, or a real tech company? Five seconds to make your guess.

**[Play the game](https://scottbeeson.github.io/PokemonOr/)**

Inspired by **[Pokémon or Big Data by Pixelastic](https://pixelastic.github.io/pokemonorbigdata/)**. Credit to Pixelastic for the original web game.

## The game

- Five seconds per name, with a countdown and shrinking timer bar.
- Running correct/total score, accuracy percentage, current streak, and a personal best streak saved on your device.
- 1,025 Pokémon species and 1,000 stored tech companies: 763 playable, with 237 obvious names retained but excluded from rounds.
- Exactly ten questions per game, with an independent 50/50 category choice on every question and no repeated names. The mix varies each game: previous answers never constrain the next category. Always choosing one category averages 50% over many games, regardless of dataset sizes.
- A classic handheld shell with a green LCD, physical-style left / continue / right buttons, and a screen you can swipe. The entire device scales to fit desktop and mobile viewports.
- Pokémon artwork and company brand icons appear after each answer in the monochrome screen, with descriptions and source links.
- Swipe **left** for Pokémon or **right** for Tech. You can also tap the buttons, use the **left/right arrow keys**, or use **P/T** (**B** still works for Tech). Press **Space** to continue without focusing a button. Tab navigation is disabled. Your personal best streak appears inside the LCD on the start screen.
- Press **Backspace** or tap the reset icon above Start/Next to clear the current run and return to the start screen. Your personal best is retained. Reset is available during a round; game shortcuts are paused while a dialog is open or a text field is being edited.
- Short drags snap back; vertical gestures scroll normally. The five-second deadline still applies when you release a swipe.
- Each question starts when you choose; wrong answers and timeouts count as incorrect. Switching tabs does not pause the clock. After the tenth reveal, choose **Score** (or press Space) to see your result, accuracy, and best streak. **Replay** starts a fresh ten-question game.
- Distinct result messages and borders, green/red choice indicators, a subtle particle burst for correct answers, and a brief shake for wrong answers. Reduced-motion preferences disable both effects. Screen-reader answer announcements remain available.

The current category is tech companies: software, cybersecurity, developer tools, robotics, fintech, AI, and data infrastructure. Historical company names are included; standalone open-source projects and product names are excluded. See [company sourcing notes](data/companies-sources.md).

## Run locally

Requires Node.js 22 or newer. There are no package dependencies to install.

```sh
npm run dev
```

Open **http://127.0.0.1:4173**. Use the HTTP server rather than opening `index.html` directly, because the game loads local JSON files.

```sh
npm test        # Game rules, exact deadline, scoring, shuffling, dataset integrity
npm run build  # Copies the static site into dist/
```

## GitHub Pages

The repository uses **GitHub Actions** as its Pages source. Pushing to `main` runs the tests, builds the static site, and deploys `dist/` using `.github/workflows/pages.yml`. The deploy job uses the `github-pages` environment.

For a fork, set **Settings → Pages → Build and deployment → Source → GitHub Actions**, and update the repository links in `index.html`, `src/app.js`, and this README. All application assets use relative paths, so hosting in a repository subdirectory works without a base-URL build setting.

## Data maintenance

Pokémon names and English species classifications come from the [PokéAPI dataset](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv). One record represents one species, not every alternate form. Refresh the snapshot with:

```sh
npm run update:pokemon
```

Curated company records live in `data/companies.json`. Each record contains `name`, `category: "company"`, a short `description`, an official HTTPS `url`, and a boolean `TooObvious`. Set `TooObvious: true` to keep a company and its logo in the catalog while excluding it from every game. Set it to `false` to make it playable again. Review notes are in `data/company-obvious-review.json`; the flag on the company record controls gameplay. Names containing "Tech" or "Data" anywhere (case-insensitive) are excluded to avoid easy giveaways; none of the 1,025 bundled Pokémon names contain either substring. Add verified company names, review their difficulty, update the sourcing notes and collection count in this README, then run `npm test` before committing. Both datasets ship with the site, so gameplay has no live API dependency.

## Answer images

Pokémon artwork loads after an answer from [PokéAPI's official artwork collection](https://github.com/PokeAPI/sprites). Images are never shown before the guess. Decoded images are tinted into LCD-colored canvas pixels before display, preventing a full-color flash during the reveal. Company icons from official websites and Y Combinator’s official directory are bundled locally in `assets/company-logos/`, with exact-name mappings and source URLs in `data/company-logos.json`. There are currently 975 icons for the 1,000 companies; unavailable or historically ambiguous logos use initials instead. Failed Pokémon artwork requests also show a text fallback. These are website brand icons, not necessarily full company wordmarks.

The expansion adds 799 companies sourced from [Y Combinator’s official directory](https://www.ycombinator.com/companies), retaining the 201 curated entries. Per-company directory links, website associations, tags, and verification dates are recorded in `data/company-provenance.json`. Directory verification establishes identity and technology scope; individual websites are not exhaustively audited. Refresh the selection with `node scripts/import-tech-companies.mjs`, then review new names, update logos and run tests. Refreshes preserve existing `TooObvious` decisions by source URL/name, and retain flagged records and their provenance even if the directory no longer selects them. Keeping those archived records may increase the stored catalog above the import target. New entries default to `TooObvious: false` pending review.

Refresh company icons with `node scripts/update-company-logos.mjs`; pass `--refresh` to recheck already cached icons. Review identity and image quality before committing new assets.

## Project layout

```text
index.html                 Page structure and dialogs
styles.css                 Handheld shell, LCD, controls, and responsive design
src/device.js              Viewport scaling and physical button labels
src/app.js                 Interface, keyboard controls, timer rendering
src/engine.js              Pure game state machine and independent fair category selection
src/gestures.js            Keyboard mapping and intentional swipe thresholds
assets/company-logos/      Locally bundled website and official directory icons
data/                      Bundled datasets and provenance
tests/                     Node built-in test suite
scripts/                   Local server, static build, catalog and logo refresh
.github/workflows/pages.yml Automated tests and deployment
```

## Privacy and attribution

No accounts, analytics, backend, or tracking cookies. Only the best streak is saved in local browser storage. Font files are loaded from Google Fonts with system-font fallbacks; Pokémon artwork is requested from GitHub after each reveal. Company icons are served with the site. GitHub Pages serves the site.

This is an unofficial fan project, unaffiliated with Nintendo, Creatures Inc., GAME FREAK inc., or any featured company. Pokémon and character names are their respective owners’ trademarks. Company names and trademarks belong to their respective owners. Source links are provided for reference; inclusion does not imply endorsement. Pokémon dataset provenance is linked above; company sourcing and verification limitations are documented alongside the data.
