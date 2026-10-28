import { createDeck, createGame } from './engine.js?v=3.0.0';
import { createLcdArtwork } from './lcd-art.js?v=3.0.0';
import { swipeCategory } from './gestures.js';
import { installGameKeyboard } from './keyboard.js?v=3.0.0';

const $ = (id) => document.getElementById(id);
const choiceButtons = { pokemon: $('pokemon-button'), company: $('company-button') };
const dialog = $('info-dialog');
let pokemon = [];
let companies = [];
let companyLogos = {};
let game;
let frame;
let drag = null;
const card = $('game-card');
let resultAnimations = [];
let particleLayer = null;
let bestStreak = 0;
try { bestStreak = Math.max(0, Number(localStorage.getItem('pob-best-streak')) || 0); } catch { /* Storage is optional. */ }

function updateBest() {
  $('best-label').textContent = `PERSONAL BEST · ${bestStreak} IN A ROW`;
}

function updateClock(state) {
  const seconds = Math.max(0, state.remainingMs) / 1000;
  $('time').textContent = seconds.toFixed(1);
  $('timer').setAttribute('aria-label', `${seconds.toFixed(1)} seconds remaining`);
  $('timer-fill').style.transform = `scaleX(${Math.max(0, state.remainingMs) / 5000})`;
  $('game-card').classList.toggle('urgent', state.phase === 'playing' && seconds <= 2);
}

function render(state) {
  clearDrag();
  clearResultEffects();
  const playing = state.phase === 'playing';
  const answered = state.phase === 'answered';
  const complete = state.phase === 'complete';
  $('best-label').hidden = state.phase !== 'idle';
  card.classList.toggle('is-playing', playing);
  card.classList.toggle('is-answered', answered);
  card.classList.toggle('is-complete', complete);
  card.setAttribute('aria-label', complete ? 'Final score screen' : 'Name screen. Swipe left for Pokémon or right for Tech.');
  $('score-screen').hidden = !complete;
  card.dataset.category = answered ? state.entry.category : '';
  card.dataset.result = answered ? (state.result.correct ? 'correct' : 'wrong') : '';
  $('score').textContent = state.correct;
  $('answered').textContent = state.answered;
  $('accuracy').textContent = state.answered ? Math.round(state.correct / state.answered * 100) : '—';
  $('accuracy-unit').textContent = state.answered ? '%' : '';
  $('streak').textContent = state.streak;
  $('round-label').textContent = state.round ? `QUESTION ${String(state.round).padStart(2, '0')} / ${state.totalRounds}` : '10 QUESTIONS · 50/50 ODDS';
  $('question-label').textContent = state.entry ? (answered ? 'THE ANSWER IS IN.' : 'POKÉMON OR TECH?') : 'ONE NAME. TWO POSSIBILITIES.';
  $('name').textContent = state.entry?.name ?? 'Meet your next guess.';
  $('question-hint').textContent = answered
    ? `${state.entry.category === 'pokemon' ? 'A Pokémon.' : 'A tech company.'} ${state.result.correct ? 'Good instinct.' : 'Now you know.'}`
    : playing ? 'Go with your gut.' : 'One name. Five seconds. Go with your gut.';
  renderVisual(answered ? state.entry : null);
  for (const [category, button] of Object.entries(choiceButtons)) {
    button.disabled = !playing;
    button.classList.toggle('reveal-correct', answered && state.entry.category === category);
    button.classList.toggle('reveal-wrong', answered && !state.result.correct && state.result.choice === category);
  }
  $('next-button').hidden = playing;
  $('next-button').disabled = false;
  $('next-button').textContent = complete ? 'Play again' : answered ? (state.answered === state.totalRounds ? 'See score' : 'Next name →') : 'Let’s play →';
  $('action-hint').textContent = complete ? 'Press Space or Replay for a fresh set of 10.' : playing ? 'Make your call before the clock runs out.' : answered ? (state.answered === state.totalRounds ? 'All 10 answered. Press Space to see your score.' : 'Ready for another?') : '10 questions. Five seconds per name.';
  $('reset-button').hidden = !state.round || playing || complete;
  $('feedback').hidden = !answered;
  if (answered) {
    const feedback = $('feedback');
    feedback.classList.toggle('incorrect', !state.result.correct);
    const heading = document.createElement('strong');
    heading.textContent = state.result.timedOut ? '⌛ Time’s up!' : state.result.correct ? '✓ Correct! Nice instinct.' : '✕ Not quite!';
    const description = document.createElement('span');
    description.textContent = `${state.entry.description} `;
    const link = document.createElement('a');
    link.href = state.entry.source || state.entry.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.tabIndex = -1;
    link.textContent = state.entry.category === 'pokemon' ? 'Species data ↗' : state.entry.source ? 'Company profile ↗' : 'Company website ↗';
    feedback.replaceChildren(heading, description, link);
    if (state.bestStreak > bestStreak) {
      bestStreak = state.bestStreak;
      try { localStorage.setItem('pob-best-streak', String(bestStreak)); } catch { /* Play without persistence. */ }
    }
  }
  updateBest();
  updateClock(state);
  if (complete) {
    $('final-score').textContent = state.correct;
    $('final-accuracy').textContent = `${Math.round(state.correct / state.totalRounds * 100)}%`;
    $('final-streak').textContent = state.bestStreak;
    $('final-rank').textContent = state.correct === state.totalRounds ? 'PERFECT INSTINCT.' : state.correct >= 8 ? 'SHARP INSTINCTS!' : state.correct >= 6 ? 'GOOD RUN!' : state.correct >= 4 ? 'KEEP THEM GUESSING.' : 'READY FOR A REMATCH?';
  }
  if (answered) playResultEffects(state.result.correct);
}

function clearResultEffects() {
  resultAnimations.forEach(animation => animation.cancel());
  resultAnimations = [];
  particleLayer?.remove();
  particleLayer = null;
}

function playResultEffects(correct) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!correct) {
    resultAnimations.push(card.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-7px) rotate(-.6deg)' },
      { transform: 'translateX(6px) rotate(.5deg)' }, { transform: 'translateX(-4px)' },
      { transform: 'translateX(3px)' }, { transform: 'translateX(0)' },
    ], { duration: 360, easing: 'ease-in-out' }));
    return;
  }
  resultAnimations.push(card.animate([
    { transform: 'scale(1)' }, { transform: 'scale(1.012)' }, { transform: 'scale(1)' },
  ], { duration: 300, easing: 'ease-out' }));
  const layer = document.createElement('div');
  layer.className = 'result-particles';
  layer.setAttribute('aria-hidden', 'true');
  particleLayer = layer;
  card.append(layer);
  const colors = ['#80b781', '#c9ad55', '#aa92c9', '#64a793'];
  for (let i = 0; i < 16; i++) {
    const particle = document.createElement('i');
    particle.style.background = colors[i % colors.length];
    particle.style.borderRadius = i % 3 === 0 ? '50%' : '2px';
    layer.append(particle);
    const angle = -Math.PI + (i / 15) * Math.PI;
    const distance = 55 + (i % 4) * 22;
    const x = Math.cos(angle) * distance;
    const y = Math.sin(angle) * distance;
    const animation = particle.animate([
      { transform: 'translate(0, 0) rotate(0)', opacity: 0 },
      { opacity: .9, offset: .12 },
      { transform: `translate(${x}px, ${y}px) rotate(${i * 37}deg)`, opacity: .8, offset: .65 },
      { transform: `translate(${x * 1.15}px, ${y + 35}px) rotate(${i * 53}deg)`, opacity: 0 },
    ], { duration: 700 + (i % 3) * 70, easing: 'ease-out', fill: 'forwards' });
    resultAnimations.push(animation);
    if (i === 14) animation.onfinish = () => layer.remove();
  }
}

function blurControl() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && !active.matches('input, textarea, select, [contenteditable="true"]')) active.blur();
}

function disableTabStops(root = document) {
  root.querySelectorAll('a, button, input, textarea, select, [tabindex]').forEach(element => element.setAttribute('tabindex', '-1'));
}
disableTabStops();
document.addEventListener('focusin', blurControl);

function animate() {
  const state = game.tick();
  if (state.phase !== 'playing') {
    render(state);
    blurControl();
    return;
  }
  updateClock(state);
  frame = requestAnimationFrame(animate);
}

function nextRound() {
  if (!game || game.getState().phase === 'playing') return;
  cancelAnimationFrame(frame);
  if (game.getState().phase === 'complete') reset();
  const state = game.startRound();
  render(state);
  // Keep the name and timer visible if the player scrolled down to Next name.
  card.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  blurControl();
  if (state.phase === 'playing') frame = requestAnimationFrame(animate);
}

function answer(category) {
  if (!game || game.getState().phase !== 'playing') return;
  cancelAnimationFrame(frame);
  render(game.answer(category));
  blurControl();
}

function renderVisual(entry) {
  const visual = $('reveal-visual');
  visual.replaceChildren();
  if (!entry) {
    const mark = document.createElement('span');
    mark.className = 'mystery-mark';
    mark.setAttribute('aria-hidden', 'true');
    mark.textContent = '?';
    visual.append(mark);
    return;
  }
  const isPokemon = entry.category === 'pokemon';
  const source = isPokemon
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${entry.id}.png`
    : companyLogos[entry.name]?.src;
  const fallback = document.createElement('div');
  fallback.className = 'image-fallback';
  const initials = document.createElement('span');
  initials.textContent = isPokemon ? '✦' : entry.name.split(/\s+/).map(word => word[0]).join('').slice(0, 2).toUpperCase();
  const caption = document.createElement('small');
  caption.textContent = source ? 'Loading image…' : 'Logo unavailable';
  fallback.append(initials, caption);
  visual.append(fallback);
  if (!source) return;
  createLcdArtwork(source, {
    className: isPokemon ? 'pokemon-art' : 'company-logo',
    alt: isPokemon ? `Artwork of ${entry.name}` : `${entry.name} logo`,
  }).then(artwork => {
    // A slow image must not replace the next question or another reveal.
    if (!visual.contains(fallback)) return;
    fallback.replaceWith(artwork);
  }).catch(() => {
    if (visual.contains(fallback)) caption.textContent = isPokemon ? 'Artwork unavailable' : 'Logo unavailable';
  });
}

function clearDrag() {
  const pointerId = drag?.pointerId;
  drag = null;
  card.classList.remove('is-dragging', 'leans-left', 'leans-right');
  card.style.removeProperty('transform');
  card.style.removeProperty('--stamp-opacity');
  if (pointerId !== undefined && card.hasPointerCapture(pointerId)) card.releasePointerCapture(pointerId);
}

card.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0 || drag || game?.getState().phase !== 'playing' || dialog.open) return;
  drag = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, dx: 0, dy: 0 };
  card.setPointerCapture(event.pointerId);
});
card.addEventListener('pointermove', (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  drag.dx = event.clientX - drag.x;
  drag.dy = event.clientY - drag.y;
  if (Math.abs(drag.dy) > 12 && Math.abs(drag.dy) > Math.abs(drag.dx)) { clearDrag(); return; }
  if (Math.abs(drag.dx) < 8) return;
  card.classList.add('is-dragging');
  card.classList.toggle('leans-left', drag.dx < 0);
  card.classList.toggle('leans-right', drag.dx > 0);
  const offset = Math.max(-150, Math.min(150, drag.dx));
  card.style.transform = `translateX(${offset}px) rotate(${offset / 22}deg)`;
  card.style.setProperty('--stamp-opacity', Math.min(1, Math.abs(drag.dx) / 85));
});
card.addEventListener('pointerup', (event) => {
  if (!drag || event.pointerId !== drag.pointerId) return;
  const category = swipeCategory(event.clientX - drag.x, event.clientY - drag.y, card.offsetWidth);
  if (category) answer(category);
  else clearDrag();
});
card.addEventListener('pointercancel', clearDrag);
card.addEventListener('lostpointercapture', clearDrag);

function reset() {
  cancelAnimationFrame(frame);
  game = createGame({ deck: createDeck(pokemon, companies) });
  render(game.getState());
}

$('next-button').addEventListener('click', nextRound);
$('reset-button').addEventListener('click', () => { reset(); blurControl(); });
for (const [category, button] of Object.entries(choiceButtons)) button.addEventListener('click', () => answer(category));

installGameKeyboard(document, {
  getPhase: () => game?.getState().phase,
  isDialogOpen: () => dialog.open,
  onNext: nextRound,
  onAnswer: answer,
  onTab: blurControl,
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && game?.getState().phase === 'playing') {
    cancelAnimationFrame(frame);
    animate();
  }
});

function openDialog(title, html) {
  $('dialog-title').textContent = title;
  $('dialog-content').innerHTML = html;
  disableTabStops(dialog);
  dialog.showModal();
}
$('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
$('how-button').addEventListener('click', () => openDialog('A name. A hunch. Five seconds.', `
  <ol><li><strong>Start a game.</strong> You’ll get 10 names, each with an independent 50/50 chance of being a Pokémon or a company.</li><li><strong>Make your call.</strong> Swipe left for Pokémon or right for Tech before the five-second timer runs out. You can also tap a choice, press <kbd>←</kbd> / <kbd>→</kbd>, or use <kbd>P</kbd> / <kbd>T</kbd>. The original <kbd>B</kbd> shortcut still works for Tech.</li><li><strong>See the reveal.</strong> Discover the Pokémon artwork or company logo. Correct answers earn one point. Wrong answers and timeouts count toward your total and reset your streak.</li><li><strong>Finish your run.</strong> After the tenth reveal, press Space or Score to see your final result. Press Replay for a fresh game.</li></ol>
  <p>The category is chosen with a fresh coin flip each question, regardless of collection sizes. The mix varies each game, and previous answers never change the next question’s odds. Always choosing one category averages 50% over many games. Names don’t repeat within a game. The timer continues when you switch tabs or open this help.</p><p>Your accuracy is correct answers divided by all completed questions. Your best streak is saved on this device when browser storage is available.</p>`));
$('about-button').addEventListener('click', () => openDialog('Big names. Tiny explanation.', `
  <p><strong>Pokémon Or</strong> is a small guessing game about the wonderfully similar names of creatures and companies.</p>
  <p>Inspired by <a href="https://pixelastic.github.io/pokemonorbigdata/" target="_blank" rel="noopener noreferrer">Pokémon or Big Data by Pixelastic</a>. Credit to Pixelastic for the original web game.</p>
  <p><strong>The collection:</strong> ${pokemon.length.toLocaleString()} Pokémon species, sourced from the <a href="https://github.com/PokeAPI/pokeapi" target="_blank" rel="noopener noreferrer">PokéAPI project</a>, plus ${companies.length.toLocaleString()} tech companies spanning software, cybersecurity, developer tools, robotics, fintech, AI, and data infrastructure. Some companies have been acquired or use historical names. We use company names, not standalone products. Names containing “Tech” or “Data” are excluded to avoid easy giveaways.</p>
  <p>Every answer has a source link. The expanded company catalog is sourced from <a href="https://www.ycombinator.com/companies" target="_blank" rel="noopener noreferrer">Y Combinator’s official directory</a>, alongside the original curated collection. Company identity and tech focus are checked against directory records; individual company websites are not exhaustively audited. The datasets and sourcing notes are in the <a href="https://github.com/ScottBeeson/PokemonOr/tree/main/data" target="_blank" rel="noopener noreferrer">GitHub repository</a>. Data is bundled with the game, so rounds don’t depend on a live API.</p>
  <p>This is an unofficial fan project. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc., and GAME FREAK inc. Company names belong to their respective owners. No affiliation or endorsement is implied.</p>
  <p>Pokémon artwork comes from <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noopener noreferrer">PokéAPI’s sprite collection</a> and loads only after the answer. Company brand icons come from official websites and Y Combinator’s directory and are bundled locally. Unavailable images fall back to a placeholder; historical companies may have no logo.</p>
  <p>No accounts or analytics. Only your best streak is stored locally. Fonts are requested from Google Fonts and Pokémon artwork from GitHub, with fallbacks if either is unavailable.</p>`));

async function load() {
  try {
    [pokemon, companies, companyLogos] = await Promise.all([...['pokemon', 'companies'].map(async (name) => {
      const response = await fetch(new URL(`../data/${name}.json?v=3.0.0`, import.meta.url));
      if (!response.ok) throw new Error(`Could not load ${name}`);
      return response.json();
    }), fetch(new URL('../data/company-logos.json?v=3.0.0', import.meta.url)).then(response => response.ok ? response.json() : {}).catch(() => ({}))]);
    reset();
  } catch (error) {
    console.error(error);
    $('name').textContent = 'A little connection hiccup.';
    $('question-hint').textContent = 'The name collection couldn’t load. Please try again.';
    $('next-button').textContent = 'Try again ↻';
    $('next-button').disabled = false;
    $('next-button').onclick = () => { $('next-button').onclick = null; $('next-button').disabled = true; load(); };
  }
}
updateBest();
load();
