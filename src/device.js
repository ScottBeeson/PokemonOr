// Handheld presentation: viewport fit and physical button labels.
import './app.js?v=2.2.0';

// Keep the physical center button's accessible name in sync with its short label.
const nextButton = document.getElementById('next-button');
function labelContinue() {
  const action = nextButton.textContent.startsWith('Next') ? 'next' : nextButton.textContent === 'See score' ? 'score' : nextButton.textContent === 'Play again' ? 'replay' : 'start';
  const label = nextButton.hidden ? 'Round in progress' : { next: 'Next name', score: 'See score', replay: 'Play again', start: 'Start game' }[action];
  nextButton.setAttribute('aria-label', label);
  nextButton.dataset.action = action;
}
new MutationObserver(labelContinue).observe(nextButton, { childList: true, attributes: true, attributeFilter: ['hidden'] });
labelContinue();

function fitDevice() {
  const scale = Math.min(1, (window.innerHeight - 106) / 680, (window.innerWidth - 28) / 440);
  document.documentElement.style.setProperty('--device-scale', Math.max(0.45, scale));
}
fitDevice();
window.addEventListener('resize', fitDevice);
