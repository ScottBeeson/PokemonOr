import test from 'node:test';
import assert from 'node:assert/strict';
import { tintPixels } from '../src/lcd-art.js';

test('LCD tint maps black and white to the screen palette and preserves transparency', () => {
  const pixels = new Uint8ClampedArray([0, 0, 0, 255, 255, 255, 255, 127, 255, 0, 0, 0]);
  tintPixels(pixels);
  assert.deepEqual([...pixels.slice(0, 8)], [41, 69, 44, 255, 168, 186, 121, 127]);
  assert.equal(pixels[11], 0);
});

test('saturated source colors become green LCD pixels before display', () => {
  const pixels = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 200, 0, 0, 255, 100]);
  tintPixels(pixels);
  for (let i = 0; i < pixels.length; i += 4) {
    assert.ok(pixels[i + 1] > pixels[i]);
    assert.ok(pixels[i + 1] > pixels[i + 2]);
  }
  assert.deepEqual([pixels[3], pixels[7], pixels[11]], [255, 200, 100]);
  assert.ok(pixels[5] > pixels[1] && pixels[1] > pixels[9], 'relative luminance is retained');
});
