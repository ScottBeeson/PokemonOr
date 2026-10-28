import { keyCategory } from './gestures.js?v=3.0.0';

/** Space belongs to the game, never to a focused button's native click behavior. */
export function installGameKeyboard(target, { getPhase, isDialogOpen, onNext, onAnswer, onReset, onTab }) {
  const isEditing = event => /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable;
  const keydown = event => {
    if (event.key === 'Tab') { event.preventDefault(); onTab(); return; }
    if (event.ctrlKey || event.metaKey || event.altKey || isDialogOpen() || isEditing(event)) return;
    if (event.key === 'Backspace') {
      event.preventDefault();
      if (!event.repeat && ['idle', 'playing', 'answered', 'complete'].includes(getPhase())) onReset();
      return;
    }
    if (event.code === 'Space') {
      event.preventDefault();
      const phase = getPhase();
      if (!event.repeat && ['idle', 'answered', 'complete'].includes(phase)) onNext();
      return;
    }
    if (event.repeat) return;
    const category = keyCategory(event.key);
    if (getPhase() === 'playing' && category) { event.preventDefault(); onAnswer(category); }
  };
  const keyup = event => {
    if ((event.code === 'Space' || event.key === 'Backspace') && !event.ctrlKey && !event.metaKey && !event.altKey && !isDialogOpen() && !isEditing(event)) event.preventDefault();
  };
  target.addEventListener('keydown', keydown);
  target.addEventListener('keyup', keyup);
  return () => { target.removeEventListener('keydown', keydown); target.removeEventListener('keyup', keyup); };
}
