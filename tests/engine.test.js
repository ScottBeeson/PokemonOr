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

test('idle game starts a five-second round and ignores repeated starts', () => {
  const { game } = setup();
  assert.equal(game.getState().phase, 'idle');
  assert.equal(game.getState().deadline, null);
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

test('category selection has a 50/50 boundary independent of dataset sizes', () => {
  let roll = 0.499999;
  const deck = createDeck(pokemon, companies, () => roll);
  assert.equal(deck.next().category, 'pokemon');
  roll = 0.5;
  assert.equal(deck.next().category, 'company');
});

test('each category exhausts all names before repeating and avoids adjacent cycle repeats', () => {
  const deck = createDeck(pokemon, companies, () => 0);
  const first = Array.from({ length: pokemon.length }, () => deck.next().name);
  const second = Array.from({ length: pokemon.length }, () => deck.next().name);
  assert.equal(new Set(first).size, pokemon.length);
  assert.equal(new Set(second).size, pokemon.length);
  assert.notEqual(first.at(-1), second[0]);
});

test('single-item bags remain playable', () => {
  const deck = createDeck([pokemon[0]], [companies[0]], () => 0);
  assert.equal(deck.next().name, 'Pikachu');
  assert.equal(deck.next().name, 'Pikachu');
});

test('invalid categories, duplicate names, clocks, and random samples are rejected', () => {
  assert.throws(() => createDeck([], companies), /empty/);
  assert.throws(() => createDeck([companies[0]], companies), /matching category/);
  assert.throws(() => createDeck([pokemon[0], pokemon[0]], companies), /Duplicate/);
  assert.throws(() => createDeck(pokemon, companies, () => 1).next(), /random/);
  assert.throws(() => createGame({ deck: {}, durationMs: 5000 }), /deck/);
  assert.throws(() => createGame({ deck: { next() {} }, durationMs: 0 }), /positive/);
  assert.throws(() => setup().game.answer('banana'), /Answer/);
});
