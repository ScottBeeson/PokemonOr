// Handheld presentation: viewport fit and physical button labels.
import './app.js?v=3.4.0';

function fitDevice() {
  const scale = Math.min(1, (window.innerHeight - 116) / 752, (window.innerWidth - 28) / 440);
  document.documentElement.style.setProperty('--device-scale', Math.max(0.45, scale));
}
fitDevice();
window.addEventListener('resize', fitDevice);
