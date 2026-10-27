import test from 'node:test';
import assert from 'node:assert/strict';
import { installGameKeyboard } from '../src/keyboard.js';

function setup() {
  const target = new EventTarget();
  const state = { phase: 'answered', dialog: false, next: 0, answers: [], tabs: 0 };
  installGameKeyboard(target, {
    getPhase: () => state.phase, isDialogOpen: () => state.dialog,
    onNext: () => { state.next++; state.phase = 'playing'; },
    onAnswer: category => state.answers.push(category), onTab: () => state.tabs++,
  });
  const press = (type, fields) => {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, fields);
    target.dispatchEvent(event);
    return event.defaultPrevented;
  };
  return { target, state, press };
}

test('Space starts exactly one round and suppresses button activation on keydown and keyup', () => {
  const { target, state, press } = setup();
  target.tagName = 'BUTTON';
  assert.equal(press('keydown', { key: ' ', code: 'Space' }), true);
  assert.equal(press('keydown', { key: ' ', code: 'Space', repeat: true }), true);
  assert.equal(press('keyup', { key: ' ', code: 'Space' }), true);
  assert.equal(state.next, 1);
  assert.deepEqual(state.answers, []);
  assert.equal(press('keydown', { key: ' ', code: 'Space' }), true);
  assert.equal(state.next, 1);
});

test('Tab and Shift+Tab never navigate, including in dialogs and inputs', () => {
  const { target, state, press } = setup();
  assert.equal(press('keydown', { key: 'Tab' }), true);
  state.dialog = true;
  target.tagName = 'INPUT';
  assert.equal(press('keydown', { key: 'Tab', shiftKey: true }), true);
  assert.equal(state.tabs, 2);
});

test('search input and dialogs do not trigger game shortcuts', () => {
  const { target, state, press } = setup();
  target.tagName = 'INPUT';
  assert.equal(press('keydown', { key: ' ', code: 'Space' }), false);
  target.tagName = 'BODY';
  state.dialog = true;
  press('keydown', { key: ' ', code: 'Space' });
  assert.equal(state.next, 0);
  state.dialog = false;
  state.phase = 'playing';
  press('keydown', { key: 'ArrowLeft' });
  press('keydown', { key: 'b' });
  assert.deepEqual(state.answers, ['pokemon', 'company']);
});
