export function keyCategory(key) {
  if (['ArrowLeft', 'p', 'P'].includes(key)) return 'pokemon';
  if (['ArrowRight', 't', 'T', 'b', 'B'].includes(key)) return 'company';
  return null;
}

/** Deliberate horizontal movement; vertical scrolling and short drags don't guess. */
export function swipeCategory(dx, dy, width) {
  const threshold = Math.min(100, Math.max(60, width * 0.22));
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.3) return null;
  return dx < 0 ? 'pokemon' : 'company';
}
