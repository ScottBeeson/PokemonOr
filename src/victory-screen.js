/** DOM adapter kept separate from scoring so an image failure cannot affect a run. */
export function createVictoryScreen({ root, sheet, character, caption }) {
  let activeScene = null;
  sheet.addEventListener('error', () => {
    if (activeScene) {
      root.classList.remove('is-ready');
      root.classList.add('art-unavailable');
    }
  });
  sheet.addEventListener('load', () => {
    if (!activeScene) return;
    root.classList.remove('art-unavailable');
    root.classList.add('is-ready');
  });
  return {
    render(scene, packId) {
      root.hidden = !scene;
      if (!scene) {
        activeScene = null;
        root.removeAttribute('data-pack');
        // Removing the image ends the old animation/load on reset or switching.
        sheet.removeAttribute('src');
        root.classList.remove('art-unavailable');
        root.classList.remove('is-ready');
        return;
      }
      if (activeScene === scene) return;
      activeScene = scene;
      root.dataset.pack = packId;
      root.classList.remove('art-unavailable');
      root.classList.remove('is-ready');
      character.textContent = scene.character;
      caption.textContent = scene.caption;
      sheet.parentElement.setAttribute('aria-label', scene.artAlt);
      sheet.src = scene.art;
    },
  };
}
