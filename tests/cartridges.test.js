import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { cartridges, pokemonUrl } from '../src/cartridges.js';
import { createCartridgeLoader } from '../src/cartridge-loader.js';
import { createDeck, createGame } from '../src/engine.js';
import { keyCategory, swipeCategory } from '../src/gestures.js';

const pokemon = [{ name: 'Pikachu', category: 'pokemon' }];
const opponents = [{ name: 'Example', category: 'company' }];
const pack = cartridges[0];
const response = data => ({ ok: true, json: async () => data });

test('Tech and Rx ship as numbered packs and Tech retains its original record key and data', async () => {
  assert.deepEqual(cartridges.map(({ id, number }) => [id, number]), [['tech', '01'], ['rx', '02']]);
  assert.equal(pack.label, 'Tech');
  assert.equal(pack.bestKey, 'pob-best-streak');
  const loader = createCartridgeLoader(async url => response(JSON.parse(await readFile(new URL(url), 'utf8'))));
  const data = await loader(pack);
  assert.equal(data.pokemon.length, 1025);
  assert.ok(data.opponents.length >= 1000);
  assert.ok(Object.keys(data.logos).length > 0);
  assert.match(await readFile(new URL(pack.art), 'utf8'), /<svg/);
});

test('Rx loads verified prescription brands, independent controls and a separate personal best', async () => {
  const rx = cartridges.find(entry => entry.id === 'rx');
  assert.notEqual(rx.bestKey, pack.bestKey);
  const requested = [];
  const loader = createCartridgeLoader(async url => {
    requested.push(url);
    return response(JSON.parse(await readFile(new URL(url), 'utf8')));
  });
  const data = await loader(rx);
  assert.deepEqual(requested.sort(), [pokemonUrl, rx.dataUrl].sort());
  assert.deepEqual(data.logos, {});
  const provenance = JSON.parse(await readFile(new URL('../data/rx-provenance.json', import.meta.url)));
  const pokemonNames = new Set(data.pokemon.map(entry => entry.name.toLowerCase()));
  const names = new Set();
  assert.ok(data.opponents.filter(entry => !entry.TooObvious).length >= 150);
  for (const entry of data.opponents) {
    assert.equal(entry.category, 'drug');
    assert.equal(typeof entry.TooObvious, 'boolean');
    assert.ok(!names.has(entry.name.toLowerCase()) && !pokemonNames.has(entry.name.toLowerCase()));
    names.add(entry.name.toLowerCase());
    const evidence = provenance.find(record => record.name === entry.name);
    assert.ok(evidence, entry.name);
    assert.ok(evidence.brandNames.some(brand => brand.toLowerCase() === entry.name.toLowerCase()));
    assert.ok(!evidence.genericNames.some(generic => generic.toLowerCase() === entry.name.toLowerCase()));
    assert.ok(evidence.productTypes.includes('HUMAN PRESCRIPTION DRUG'));
    assert.equal(new URL(entry.url).hostname, 'dailymed.nlm.nih.gov');
    assert.equal(new URL(entry.url).searchParams.get('setid'), evidence.setId);
    assert.equal(entry.description, `Prescription brand for ${evidence.genericNames.join(' / ').toLowerCase()}.`);
  }
  assert.match(await readFile(new URL(rx.art), 'utf8'), /<svg/);
  assert.equal(keyCategory('R', rx), 'drug');
  assert.equal(keyCategory('P', rx), 'pokemon');
  assert.equal(keyCategory('t', rx), null);
  const game = createGame({ deck: createDeck(data.pokemon, data.opponents, () => .9, rx.category), now: () => 0 });
  for (let round = 0; round < 10; round++) {
    assert.equal(game.startRound().entry.category, 'drug');
    assert.equal(game.answer(keyCategory('r', rx)).result.correct, true);
  }
  assert.equal(game.startRound().correct, 10);
  // Loading Tech afterward must reuse Pokémon but use only Tech's opponents and logos.
  const tech = await loader(pack);
  assert.ok(tech.opponents.every(entry => entry.category === 'company'));
  assert.equal(requested.filter(url => url === pokemonUrl).length, 1);
});

test('reinsertion reuses successful data and another pack reuses the shared Pokémon collection', async () => {
  const calls = [];
  const anotherPack = { ...pack, dataUrl: 'other.json', logosUrl: undefined, category: 'other' };
  const loader = createCartridgeLoader(async url => {
    calls.push(url);
    return response(url === pokemonUrl ? pokemon : url === pack.dataUrl ? opponents : url === 'other.json' ? [{ name: 'Other', category: 'other' }] : {});
  });
  await Promise.all([loader(pack), loader(pack)]);
  await loader(pack);
  await loader(anotherPack);
  assert.equal(calls.filter(url => url === pokemonUrl).length, 1);
  assert.equal(calls.filter(url => url === pack.dataUrl).length, 1);
  assert.equal(calls.length, 4);
});

test('failed required reads can retry, while missing logos do not block play', async () => {
  let fail = true;
  const loader = createCartridgeLoader(async url => {
    if (url === pack.logosUrl || (url === pack.dataUrl && fail)) return { ok: false };
    return response(url === pokemonUrl ? pokemon : opponents);
  });
  await assert.rejects(loader(pack), /Could not read/);
  fail = false;
  const data = await loader(pack);
  assert.deepEqual(data.logos, {});
  assert.equal(createGame({ deck: createDeck(data.pokemon, data.opponents) }).startRound().phase, 'playing');
});

test('invalid and empty playable catalogs fail before boot completes and are not cached', async () => {
  let entries = [{ ...opponents[0], TooObvious: true }];
  const loader = createCartridgeLoader(async url => response(url === pokemonUrl ? pokemon : url === pack.dataUrl ? entries : {}));
  await assert.rejects(loader(pack), /no eligible entries/);
  entries = [{ name: 'Wrong category', category: 'other' }];
  await assert.rejects(loader(pack), /matching category/);
  entries = opponents;
  assert.deepEqual((await loader(pack)).opponents, opponents);
});

test('a configured opponent category works through draw, keyboard, swipe, and score', () => {
  const opponent = { category: 'other', keys: ['o'] };
  const deck = createDeck(pokemon, [{ name: 'Other', category: 'other' }], () => .9, opponent.category);
  const game = createGame({ deck, totalRounds: 1, now: () => 0 });
  assert.equal(game.startRound().entry.category, 'other');
  assert.equal(keyCategory('O', opponent), 'other');
  assert.equal(keyCategory('t', opponent), null);
  assert.equal(swipeCategory(120, 0, 320, opponent.category), 'other');
  assert.throws(() => game.answer('company'), /Answer/);
  assert.equal(game.answer(keyCategory('ArrowRight', opponent)).correct, 1);
  assert.equal(game.startRound().phase, 'complete');
  assert.throws(() => createDeck(pokemon, opponents, Math.random, 'pokemon'), /opponent category/);
});
