// Secret endings are a presentation step, never an extra game round.
export const perfectScenes = {
  tech: {
    character: 'Clippy',
    caption: 'It looks like you don’t need my help.',
    art: new URL('../assets/victories/tech.png', import.meta.url).href,
    artAlt: 'Clippy pops up, looks resigned, and reluctantly disappears.',
  },
  rx: {
    character: 'Morpheus',
    caption: 'You clearly know your pills.',
    art: new URL('../assets/victories/rx.png', import.meta.url).href,
    artAlt: 'Morpheus presents two pills and gives an approving nod.',
  },
  flat: {
    character: 'Ron Swanson',
    caption: 'Instructions are for other people.',
    art: new URL('../assets/victories/flat.png', import.meta.url).href,
    artAlt: 'Ron Swanson silently assembles a chair and stands proudly beside it.',
  },
  rock: {
    character: 'Hank Schrader',
    caption: 'They’re minerals!',
    art: new URL('../assets/victories/rock.png', import.meta.url).href,
    artAlt: 'Hank Schrader raises a mineral specimen and emphatically corrects you.',
  },
  garden: {
    character: 'Audrey II',
    caption: 'FEED ME!',
    art: new URL('../assets/victories/garden.png', import.meta.url).href,
    artAlt: 'Audrey II grows out of its pot and snaps its jaws around the 10 out of 10 counter.',
  },
};

/** One ending per run; repeated renders must not consume it or bring it back. */
export function createPerfectRun() {
  let dismissed = false;
  return {
    scene(state, packId) {
      if (dismissed || state?.phase !== 'complete' || state.totalRounds !== 10
        || state.answered !== 10 || state.correct !== 10) return null;
      return Object.hasOwn(perfectScenes, packId) ? perfectScenes[packId] : null;
    },
    dismiss() { dismissed = true; },
    reset() { dismissed = false; },
  };
}
