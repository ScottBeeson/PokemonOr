export function keyCategory(key, opponent = { category: 'company', keys: ['t', 'b'] }) {
  if (key === 'ArrowLeft' || key?.toLowerCase() === 'p') return 'pokemon';
  if (key === 'ArrowRight' || opponent.keys.includes(key?.toLowerCase())) return opponent.category;
  return null;
}

/** Deliberate horizontal movement; vertical scrolling and short drags don't guess. */
export function swipeCategory(dx, dy, width, opponentCategory = 'company') {
  const threshold = Math.min(100, Math.max(60, width * 0.22));
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.3) return null;
  return dx < 0 ? 'pokemon' : opponentCategory;
}
