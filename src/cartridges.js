// One definition per cartridge. Pokémon is shared by every pack.
export const cartridges = [{
  id: 'tech',
  label: 'Tech',
  title: 'Tech Pack',
  catalog: '01',
  accent: '#416a88',
  art: new URL('../assets/cartridges/tech.svg', import.meta.url).href,
  artAlt: 'A pixel computer with a smiling screen and circuit traces',
  category: 'company',
  choiceLabel: 'Tech',
  answerLabel: 'A tech company.',
  keys: ['t', 'b'],
  shortcutLabel: 'T (B also works)',
  profileLabel: 'Company profile',
  websiteLabel: 'Company website',
  dataUrl: new URL('../data/companies.json?v=3.2.0', import.meta.url).href,
  logosUrl: new URL('../data/company-logos.json?v=3.2.0', import.meta.url).href,
  bestKey: 'pob-best-streak',
  collection: 'tech companies spanning software, cybersecurity, developer tools, robotics, fintech, AI, and data infrastructure',
  notes: 'Some companies have been acquired or use historical names. The collection uses company names, not standalone products. Names containing “Tech” or “Data” are excluded.',
  sourceUrl: 'https://www.ycombinator.com/companies',
  sourceLabel: 'Y Combinator’s official directory',
}];

export const pokemonUrl = new URL('../data/pokemon.json?v=3.2.0', import.meta.url).href;
