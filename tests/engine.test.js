import test from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, createGame } from '../src/engine.js';

const pokemon = ['Pikachu', 'Eevee', 'Snorlax'].map((name) => ({ name, category: 'pokemon' }));
const companies = ['Databricks', 'Snowflake'].map((name) => ({ name, category: 'company' }));

function setup() {
  let time = 100;
  let index = 0;
  const game = createGame({ deck: { next: () => pokemon[index++ % pokemon.length] }, now: () => time });
  return { game, advance: (ms) => { time += ms; } };
}

function seededRandom(seed) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

test('idle game starts a five-second round and ignores repeated starts', () => {
  const { game } = setup();
  assert.equal(game.getState().phase, 'idle');
  assert.equal(game.getState().deadline, null);
  assert.equal(game.getState().totalRounds, 10);
  const state = game.startRound();
  assert.equal(state.deadline, 5100);
  assert.equal(state.remainingMs, 5000);
  assert.equal(state.round, 1);
  assert.deepEqual(game.startRound(), state);
});

test('correct answers update the running score and streak; wrong answers reset streak', () => {
  const { game, advance } = setup();
  game.startRound();
  advance(1000);
  let state = game.answer('pokemon');
  assert.equal(state.phase, 'answered');
  assert.equal(state.remainingMs, 4000);
  assert.equal(state.correct, 1);
  assert.equal(state.answered, 1);
  assert.deepEqual(state.result, { correct: true, timedOut: false, choice: 'pokemon' });
  game.startRound();
  state = game.answer('pokemon');
  assert.equal(state.streak, 2);
  game.startRound();
  state = game.answer('company');
  assert.equal(state.correct, 2);
  assert.equal(state.answered, 3);
  assert.equal(state.streak, 0);
  assert.equal(state.bestStreak, 2);
  assert.equal(state.result.correct, false);
});

test('an expired round counts exactly one incorrect answer and does not start another round', () => {
  const { game, advance } = setup();
  game.startRound();
  advance(8000);
  const state = game.tick();
  assert.equal(state.phase, 'answered');
  assert.equal(state.remainingMs, 0);
  assert.equal(state.correct, 0);
  assert.equal(state.answered, 1);
  assert.equal(state.round, 1);
  assert.deepEqual(state.result, { correct: false, timedOut: true, choice: null });
  assert.deepEqual(game.tick(), state);
  assert.deepEqual(game.answer('pokemon'), state);
});

test('a late click cannot win a round even if no animation tick has fired', () => {
  const { game, advance } = setup();
  game.startRound();
  advance(5001);
  assert.equal(game.answer('pokemon').result.timedOut, true);
});

test('the exact deadline is a timeout; one millisecond before is valid', () => {
  const first = setup();
  first.game.startRound();
  first.advance(5000);
  assert.equal(first.game.answer('pokemon').result.timedOut, true);
  const second = setup();
  second.game.startRound();
  second.advance(4999);
  assert.equal(second.game.answer('pokemon').result.correct, true);
});

test('duplicate clicks do not change scores or the original answer', () => {
  const { game } = setup();
  game.startRound();
  const state = game.answer('company');
  assert.deepEqual(game.answer('pokemon'), state);
  assert.deepEqual(game.answer(null), state);
});

test('null checks the deadline without forfeiting a live round', () => {
  const { game, advance } = setup();
  game.startRound();
  assert.equal(game.answer(null).phase, 'playing');
  advance(5000);
  assert.equal(game.answer(null).result.timedOut, true);
});

test('snapshots cannot mutate the internal score, entry, or result', () => {
  const { game } = setup();
  const state = game.startRound();
  state.correct = 99;
  state.entry.category = 'company';
  const answered = game.answer('pokemon');
  answered.result.correct = false;
  assert.equal(game.getState().correct, 1);
  assert.equal(game.getState().entry.category, 'pokemon');
  assert.equal(game.getState().result.correct, true);
});

test('the category threshold is exactly 0.5 regardless of unequal dataset sizes or prior choices', () => {
  const manyPokemon = Array.from({ length: 1025 }, (_, i) => ({ name: `Pokémon ${i}`, category: 'pokemon' }));
  const fewerCompanies = Array.from({ length: 200 }, (_, i) => ({ name: `Company ${i}`, category: 'company' }));
  let roll = 0;
  const deck = createDeck(manyPokemon, fewerCompanies, () => roll);
  for (let repetition = 0; repetition < 20; repetition += 1) {
    for (const [value, expected] of [[0, 'pokemon'], [0.499999, 'pokemon'], [0.5, 'company'], [0.999999, 'company']]) {
      roll = value;
      assert.equal(deck.next().category, expected);
    }
  }
});

test('all-Pokémon and all-company ten-question runs are possible', () => {
  for (const [roll, expected] of [[0, 'pokemon'], [0.999999, 'company']]) {
    const deck = createDeck(pokemon, companies, () => roll);
    const categories = Array.from({ length: 10 }, () => deck.next().category);
    assert.deepEqual(categories, Array(10).fill(expected));
  }
});

test('the tenth question follows its own random draw instead of a category quota', () => {
  for (const firstRoll of [0, 0.9]) {
    for (const tenthRoll of [0, 0.9]) {
      const rolls = [...Array(9).fill(firstRoll), tenthRoll];
      const deck = createDeck([pokemon[0]], [companies[0]], () => rolls.shift());
      const categories = Array.from({ length: 10 }, () => deck.next().category);
      assert.deepEqual(categories.slice(0, 9), Array(9).fill(firstRoll < 0.5 ? 'pokemon' : 'company'));
      assert.equal(categories[9], tenthRoll < 0.5 ? 'pokemon' : 'company');
      assert.equal(rolls.length, 0);
    }
  }
});

test('category order varies across seeded runs and allows consecutive same-category questions', () => {
  const orders = new Set();
  let hasAdjacentMatch = false;
  for (let seed = 1; seed <= 20; seed += 1) {
    const deck = createDeck(pokemon, companies, seededRandom(seed));
    const order = Array.from({ length: 10 }, () => deck.next().category);
    orders.add(order.join(','));
    if (order.some((category, i) => i > 0 && category === order[i - 1])) hasAdjacentMatch = true;
  }
  assert.ok(orders.size > 1);
  assert.ok(hasAdjacentMatch);
});

test('each category exhausts all names before repeating and avoids adjacent cycle repeats', () => {
  for (const [dataset, roll] of [[pokemon, 0], [companies, 0.999999]]) {
    const deck = createDeck(pokemon, companies, () => roll);
    const entries = Array.from({ length: 30 }, () => deck.next());
    assert.ok(entries.every((entry) => entry.category === dataset[0].category));
    const names = entries.map((entry) => entry.name);
    for (let i = 0; i + dataset.length <= names.length; i += dataset.length) {
      assert.equal(new Set(names.slice(i, i + dataset.length)).size, dataset.length);
      if (i > 0) assert.notEqual(names[i - 1], names[i]);
    }
  }
});

test('single-item bags remain playable', () => {
  let roll = 0;
  const deck = createDeck([pokemon[0]], [companies[0]], () => roll);
  assert.equal(deck.next().name, 'Pikachu');
  assert.equal(deck.next().name, 'Pikachu');
  roll = 0.9;
  assert.equal(deck.next().name, 'Databricks');
  assert.equal(deck.next().name, 'Databricks');
});

test('TooObvious entries never appear while false and missing flags retain no-repeat cycles', () => {
  const makeEntries = category => [
    { name: `${category} excluded`, category, TooObvious: true },
    { name: `${category} false`, category, TooObvious: false },
    { name: `${category} missing`, category },
    { name: `${category} undefined`, category, TooObvious: undefined },
  ];
  const pokemonEntries = makeEntries('pokemon');
  const companyEntries = makeEntries('company');
  for (const [category, roll] of [['pokemon', 0], ['company', 0.9]]) {
    const deck = createDeck(pokemonEntries, companyEntries, () => roll);
    const names = Array.from({ length: 30 }, () => deck.next().name);
    const eligible = [`${category} false`, `${category} missing`, `${category} undefined`];
    for (let i = 0; i < names.length; i += eligible.length) {
      assert.deepEqual(new Set(names.slice(i, i + eligible.length)), new Set(eligible));
      if (i > 0) assert.notEqual(names[i - 1], names[i]);
    }
  }
});

test('filtering TooObvious entries leaves source arrays and their entries unchanged', () => {
  const pokemonEntries = Object.freeze([
    Object.freeze({ ...pokemon[0], TooObvious: true }),
    Object.freeze({ ...pokemon[1], TooObvious: false }),
    Object.freeze({ ...pokemon[2] }),
  ]);
  const companyEntries = Object.freeze(companies.map(entry => Object.freeze({ ...entry })));
  const before = structuredClone({ pokemonEntries, companyEntries });
  const deck = createDeck(pokemonEntries, companyEntries, seededRandom(42));
  for (let i = 0; i < 50; i += 1) {
    const entry = deck.next();
    entry.name = 'Changed by the caller';
    entry.TooObvious = true;
  }
  assert.deepEqual({ pokemonEntries, companyEntries }, before);
});

test('categories with no eligible entries fail clearly', () => {
  assert.throws(
    () => createDeck(pokemon.map(entry => ({ ...entry, TooObvious: true })), companies),
    { name: 'TypeError', message: /pokemon dataset has no eligible entries/ },
  );
  assert.throws(
    () => createDeck(pokemon, companies.map(entry => ({ ...entry, TooObvious: true }))),
    { name: 'TypeError', message: /company dataset has no eligible entries/ },
  );
});

test('malformed TooObvious flags and invalid or duplicate suppressed entries are rejected', () => {
  for (const TooObvious of ['true', 'false', 0, 1, null, {}, []]) {
    assert.throws(
      () => createDeck([{ ...pokemon[0], TooObvious }], companies),
      { name: 'TypeError', message: /TooObvious must be a boolean/ },
    );
    assert.throws(
      () => createDeck(pokemon, [{ ...companies[0], TooObvious }]),
      { name: 'TypeError', message: /TooObvious must be a boolean/ },
    );
  }
  assert.throws(() => createDeck([
    pokemon[0], { ...pokemon[0], TooObvious: true },
  ], companies), /Duplicate pokemon name/);
  assert.throws(() => createDeck([
    pokemon[0], { name: '', category: 'pokemon', TooObvious: true },
  ], companies), /needs a name and matching category/);
  assert.throws(() => createDeck(pokemon, [
    companies[0], { ...pokemon[0], TooObvious: true },
  ]), /needs a name and matching category/);
});

test('unequal suppression counts do not change the independent 50/50 category boundary', () => {
  const pokemonEntries = pokemon.map((entry, i) => ({ ...entry, TooObvious: i !== 0 }));
  let roll = 0;
  const deck = createDeck(pokemonEntries, companies, () => roll);
  for (let i = 0; i < 20; i += 1) {
    roll = 0.499999;
    assert.equal(deck.next().category, 'pokemon');
    roll = 0.5;
    assert.equal(deck.next().category, 'company');
  }
});

test('always choosing Pokémon can score zero or ten depending on the independent draws', () => {
  for (const [roll, expectedScore] of [[0, 10], [0.9, 0]]) {
    const game = createGame({ deck: createDeck(pokemon, companies, () => roll), now: () => 0 });
    for (let round = 1; round <= 10; round += 1) {
      assert.equal(game.startRound().round, round);
      game.answer('pokemon');
    }
    const result = game.startRound();
    assert.equal(result.phase, 'complete');
    assert.equal(result.correct, expectedScore);
    assert.equal(result.answered, 10);
  }
});

test('a perfect game preserves the tenth reveal, then completes with ten points', () => {
  const game = createGame({ deck: createDeck(pokemon, companies, seededRandom(42)), now: () => 0 });
  let reveal;
  for (let round = 1; round <= 10; round += 1) {
    const state = game.startRound();
    reveal = game.answer(state.entry.category);
    assert.equal(reveal.phase, 'answered');
  }
  assert.equal(reveal.correct, 10);
  assert.equal(reveal.answered, 10);
  assert.equal(reveal.streak, 10);
  assert.equal(reveal.result.correct, true);
  const complete = game.startRound();
  assert.equal(complete.phase, 'complete');
  assert.deepEqual(complete.entry, reveal.entry);
  assert.deepEqual(complete.result, reveal.result);
  assert.deepEqual(game.startRound(), complete);
  assert.deepEqual(game.answer('company'), complete);
  assert.deepEqual(game.tick(), complete);
});

test('a tenth-question timeout completes without drawing an eleventh question', () => {
  let draws = 0;
  let time = 0;
  const game = createGame({
    deck: { next: () => { draws += 1; return pokemon[0]; } },
    now: () => time,
  });
  for (let round = 1; round <= 9; round += 1) {
    game.startRound();
    game.answer('pokemon');
  }
  game.startRound();
  time = 5000;
  const reveal = game.tick();
  assert.equal(reveal.phase, 'answered');
  assert.equal(reveal.result.timedOut, true);
  assert.equal(reveal.correct, 9);
  assert.equal(reveal.answered, 10);
  const complete = game.startRound();
  assert.equal(complete.phase, 'complete');
  assert.equal(complete.round, 10);
  assert.equal(draws, 10);
  time += 5000;
  assert.deepEqual(game.tick(), complete);
  assert.deepEqual(game.startRound(), complete);
  assert.deepEqual(game.answer(null), complete);
  assert.equal(draws, 10);
});

test('a custom positive integer totalRounds limits the number of questions', () => {
  const game = createGame({ deck: { next: () => pokemon[0] }, totalRounds: 1, now: () => 0 });
  assert.equal(game.getState().totalRounds, 1);
  game.startRound();
  assert.equal(game.answer('pokemon').phase, 'answered');
  assert.equal(game.startRound().phase, 'complete');
});

test('invalid categories, duplicate names, clocks, and random samples are rejected', () => {
  assert.throws(() => createDeck([], companies), /empty/);
  assert.throws(() => createDeck([companies[0]], companies), /matching category/);
  assert.throws(() => createDeck([pokemon[0], pokemon[0]], companies), /Duplicate/);
  assert.throws(() => createDeck(pokemon, companies, () => 1).next(), /random/);
  assert.throws(() => createGame({ deck: {}, durationMs: 5000 }), /deck/);
  assert.throws(() => createGame({ deck: { next() {} }, durationMs: 0 }), /positive/);
  for (const totalRounds of [0, -1, 1.5, NaN, Infinity, '10']) {
    assert.throws(() => createGame({ deck: { next() {} }, totalRounds }), /positive integer/);
  }
  assert.throws(() => setup().game.answer('banana'), /Answer/);
});
