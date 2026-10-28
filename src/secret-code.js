const sequence = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight'];

/** Keyboard-only title-screen code. Reset explicitly when a run or pack changes. */
export function installSecretCode(target, { canEnter, isDialogOpen, onUnlock }) {
  let entered = [];
  const reset = () => { entered = []; };
  const keydown = event => {
    const editing = /^(INPUT|TEXTAREA|SELECT)$/.test(event.target?.tagName) || event.target?.isContentEditable;
    if (!canEnter() || isDialogOpen() || editing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) {
      reset();
      return;
    }
    if (event.repeat) return;
    if (!event.key.startsWith('Arrow')) { reset(); return; }
    event.preventDefault();
    entered.push(event.key);
    // Keep the longest suffix that could still begin the code, including an
    // extra Up key before the first two Ups. A mistaken direction cannot unlock.
    while (entered.some((key, index) => key !== sequence[index])) entered.shift();
    if (entered.length === sequence.length) {
      reset();
      onUnlock();
    }
  };
  target.addEventListener('keydown', keydown);
  return { reset, dispose() { target.removeEventListener('keydown', keydown); reset(); } };
}
