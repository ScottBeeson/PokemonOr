// Handheld presentation: viewport fit and physical button labels.
import './app.js?v=2.0.0';

// Keep the physical center button's accessible name in sync with its short label.
const nextButton = document.getElementById('next-button');
function labelContinue() {
  const label = nextButton.hidden ? 'Round in progress' : nextButton.textContent.startsWith('Next') ? 'Next name' : 'Start game';
  nextButton.setAttribute('aria-label', label);
}
new MutationObserver(labelContinue).observe(nextButton, { childList: true, attributes: true, attributeFilter: ['hidden'] });
labelContinue();

function fitDevice() {
  const scale = Math.min(1, (window.innerHeight - 106) / 680, (window.innerWidth - 28) / 440);
  document.documentElement.style.setProperty('--device-scale', Math.max(0.45, scale));
}
fitDevice();
window.addEventListener('resize', fitDevice);
