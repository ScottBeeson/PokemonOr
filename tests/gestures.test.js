import test from 'node:test';
import assert from 'node:assert/strict';
import { keyCategory, swipeCategory } from '../src/gestures.js';

test('arrow keys and original P/B shortcuts select the same categories', () => {
  for (const key of ['ArrowLeft', 'p', 'P']) assert.equal(keyCategory(key), 'pokemon');
  for (const key of ['ArrowRight', 'b', 'B']) assert.equal(keyCategory(key), 'company');
  for (const key of ['ArrowUp', 'ArrowDown', ' ', 'Enter']) assert.equal(keyCategory(key), null);
});

test('swipes require a deliberate horizontal drag at mobile and desktop widths', () => {
  assert.equal(swipeCategory(-90, 5, 320), 'pokemon');
  assert.equal(swipeCategory(120, -25, 480), 'company');
  assert.equal(swipeCategory(45, 0, 320), null);
  assert.equal(swipeCategory(100, 150, 320), null);
  assert.equal(swipeCategory(90, 0, 480), null);
  assert.equal(swipeCategory(-100, 0, 480), 'pokemon');
});
