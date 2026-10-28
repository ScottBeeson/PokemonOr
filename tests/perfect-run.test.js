import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createGame } from '../src/engine.js';
import { cartridges } from '../src/cartridges.js';
import { createPerfectRun, perfectScenes } from '../src/perfect-run.js';
import { createVictoryScreen } from '../src/victory-screen.js';

function play({ wrongAt = -1, timeoutAt = -1, rounds = 10 } = {}) {
  let now = 0;
  let draws = 0;
  const game = createGame({
    deck: { next: () => ({ name: `Name ${++draws}`, category: 'pokemon' }) },
    now: () => now, totalRounds: rounds,
  });
  for (let round = 0; round < rounds; round++) {
    game.startRound();
    if (round === timeoutAt) { now += 5000; game.tick(); }
    else game.answer(round === wrongAt ? 'company' : 'pokemon');
  }
  return { game, draws: () => draws };
}

test('every pack has its own complete four-frame sprite sheet and caption', async () => {
  assert.deepEqual(Object.keys(perfectScenes), cartridges.map(pack => pack.id));
  assert.equal(new Set(Object.values(perfectScenes).map(scene => scene.art)).size, 5);
  for (const scene of Object.values(perfectScenes)) {
    const png = await readFile(new URL(scene.art));
    assert.equal(png.subarray(1, 4).toString(), 'PNG');
    const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    assert.equal(width, height, '2 × 2 sheet must be square');
    assert.equal(width % 2, 0, 'Frames must divide evenly');
    assert.ok(width >= 300);
    assert.ok(scene.caption.length > 5);
    assert.ok(scene.artAlt.includes(scene.character.split(' ')[0]));
  }
});

test('a perfect ending appears only after the tenth answer reveal, for each pack', () => {
  for (const pack of cartridges) {
    const ending = createPerfectRun();
    const { game, draws } = play();
    assert.equal(game.getState().correct, 10);
    assert.equal(game.getState().phase, 'answered');
    assert.equal(ending.scene(game.getState(), pack.id), null);
    const complete = game.startRound();
    assert.equal(ending.scene(complete, pack.id), perfectScenes[pack.id]);
    assert.equal(ending.scene(complete, pack.id), perfectScenes[pack.id], 'Rerender cannot consume the ending');
    const before = game.getState();
    ending.dismiss();
    assert.equal(ending.scene(game.getState(), pack.id), null);
    assert.deepEqual(game.getState(), before, 'Continue must retain the score, accuracy, and streak');
    assert.equal(draws(), 10, 'Ending and dismissal must not draw an eleventh name');
    ending.reset();
    assert.equal(ending.scene(complete, pack.id), perfectScenes[pack.id], 'A new run can earn it again');
  }
});

test('wrong answers, timeouts, incomplete runs, and non-ten-round games never unlock endings', () => {
  for (const options of [{ wrongAt: 9 }, { timeoutAt: 9 }, { wrongAt: 0 }, { timeoutAt: 0 }, { rounds: 5 }, { rounds: 11 }]) {
    const { game } = play(options);
    const state = game.startRound();
    for (const pack of cartridges) assert.equal(createPerfectRun().scene(state, pack.id), null);
  }
  const ending = createPerfectRun();
  assert.equal(ending.scene(null, 'tech'), null);
  assert.equal(ending.scene({ phase: 'idle' }, 'tech'), null);
  assert.equal(ending.scene({ phase: 'complete', totalRounds: 10, correct: 10, answered: 9 }, 'tech'), null);
  const perfect = play().game.startRound();
  assert.equal(ending.scene(perfect, 'missing'), null);
  assert.equal(ending.scene(perfect, 'toString'), null);
});

// Minimal element doubles exercise the DOM adapter's lifecycle without a browser
// or adding a package dependency to this static game.
class Element extends EventTarget {
  hidden = true;
  dataset = {};
  attributes = new Map();
  classes = new Set();
  classList = {
    add: value => this.classes.add(value),
    remove: value => this.classes.delete(value),
    contains: value => this.classes.has(value),
  };
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) {
    this.attributes.delete(name);
    if (name === 'data-pack') delete this.dataset.pack;
    if (name === 'src') this.src = undefined;
  }
}

test('image loading starts animation only when ready; failures retain readable ending text', () => {
  const root = new Element(), sheet = new Element(), character = new Element(), caption = new Element();
  sheet.parentElement = new Element();
  const view = createVictoryScreen({ root, sheet, character, caption });
  view.render(perfectScenes.rock, 'rock');
  assert.equal(root.hidden, false);
  assert.equal(root.dataset.pack, 'rock');
  assert.equal(caption.textContent, 'They’re minerals!');
  assert.equal(character.textContent, 'Hank Schrader');
  assert.equal(sheet.parentElement.attributes.get('aria-label'), perfectScenes.rock.artAlt);
  assert.equal(root.classList.contains('is-ready'), false);
  sheet.dispatchEvent(new Event('load'));
  assert.equal(root.classList.contains('is-ready'), true);
  view.render(perfectScenes.rock, 'rock');
  assert.equal(root.classList.contains('is-ready'), true, 'Rerenders must not restart the scene');
  sheet.dispatchEvent(new Event('error'));
  assert.equal(root.classList.contains('art-unavailable'), true);
  assert.equal(root.classList.contains('is-ready'), false);
  assert.equal(caption.textContent, 'They’re minerals!');
  view.render(null);
  assert.equal(root.hidden, true);
  assert.equal(sheet.src, undefined);
  assert.equal(root.dataset.pack, undefined);
  sheet.dispatchEvent(new Event('load'));
  assert.equal(root.classList.contains('is-ready'), false, 'Late loads cannot resurrect dismissed endings');
  view.render(perfectScenes.garden, 'garden');
  assert.equal(root.dataset.pack, 'garden');
  assert.equal(caption.textContent, 'FEED ME!');
  assert.equal(sheet.src, perfectScenes.garden.art);
  assert.equal(root.classList.contains('art-unavailable'), false);
});
