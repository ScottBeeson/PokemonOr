import test from 'node:test';
import assert from 'node:assert/strict';
import { installSecretCode } from '../src/secret-code.js';

const code = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];
function setup() {
  const target = new EventTarget();
  const state = { title: true, dialog: false, unlocks: 0 };
  const control = installSecretCode(target, { canEnter: () => state.title, isDialogOpen: () => state.dialog, onUnlock: () => state.unlocks++ });
  const press = (key, fields = {}) => {
    const event = new Event('keydown', { cancelable: true });
    Object.assign(event, { key, ...fields });
    target.dispatchEvent(event);
    return event.defaultPrevented;
  };
  return { target, state, control, press };
}

test('exact eight-arrow code unlocks only at the end, without needing B, A, or Enter', () => {
  const { state, press } = setup();
  for (const key of code.slice(0, -1)) { assert.equal(press(key), true); assert.equal(state.unlocks, 0); }
  press(code.at(-1));
  assert.equal(state.unlocks, 1);
  press('ArrowRight');
  assert.equal(state.unlocks, 1);
  code.forEach(key => press(key));
  assert.equal(state.unlocks, 2);
});

test('incorrect, interrupted, and held-key sequences do not accidentally unlock', () => {
  const { state, press } = setup();
  code.slice(0, 4).forEach(key => press(key)); press('ArrowUp'); code.slice(4).forEach(key => press(key));
  assert.equal(state.unlocks, 0);
  code.slice(0, 4).forEach(key => press(key)); press('x'); code.slice(4).forEach(key => press(key));
  assert.equal(state.unlocks, 0);
  press('ArrowUp'); press('ArrowUp', { repeat: true }); code.slice(2).forEach(key => press(key));
  assert.equal(state.unlocks, 0);
  // An extra Up may overlap the beginning, just as typing a fresh code should.
  press('ArrowUp'); code.forEach(key => press(key));
  assert.equal(state.unlocks, 1);
});

test('gameplay, score screens, dialogs, editors, and modified arrows are left alone', () => {
  const { target, state, press } = setup();
  state.title = false;
  code.forEach(key => assert.equal(press(key), false));
  state.title = true; state.dialog = true;
  code.forEach(key => assert.equal(press(key), false));
  state.dialog = false;
  for (const tag of ['INPUT', 'TEXTAREA', 'SELECT']) {
    target.tagName = tag;
    code.forEach(key => assert.equal(press(key), false));
  }
  target.tagName = 'DIV'; target.isContentEditable = true;
  code.forEach(key => assert.equal(press(key), false));
  target.isContentEditable = false;
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) code.forEach(key => assert.equal(press(key, { [modifier]: true }), false));
  assert.equal(state.unlocks, 0);
});

test('resetting a run or changing packs discards partial input; dispose removes the listener', () => {
  const { state, press, control } = setup();
  code.slice(0, 4).forEach(key => press(key)); control.reset(); code.slice(4).forEach(key => press(key));
  assert.equal(state.unlocks, 0);
  code.forEach(key => press(key)); assert.equal(state.unlocks, 1);
  control.dispose(); code.forEach(key => press(key)); assert.equal(state.unlocks, 1);
});
