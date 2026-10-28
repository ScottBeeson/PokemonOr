import { createDeck, createGame } from './engine.js?v=3.3.0';
import { createLcdArtwork } from './lcd-art.js?v=3.2.0';
import { swipeCategory } from './gestures.js?v=3.3.0';
import { installGameKeyboard } from './keyboard.js?v=3.3.0';
import { cartridges } from './cartridges.js?v=3.5.0';
import { createCartridgeLoader } from './cartridge-loader.js?v=3.5.0';
import { createPerfectRun, perfectScenes } from './perfect-run.js?v=3.6.0';
import { createVictoryScreen } from './victory-screen.js?v=3.6.0';
import { installSecretCode } from './secret-code.js?v=3.6.0';

const $ = (id) => document.getElementById(id);
let cartridge = cartridges[0];
let choiceButtons;
const dialog = $('info-dialog');
const cartridgeDialog = $('cartridge-dialog');
const handheld = document.querySelector('.handheld');
const loadCartridge = createCartridgeLoader();
let screen = 'boot';
let skipBoot;
let bootId = 0;
let pokemon = [];
let opponents = [];
let opponentLogos = {};
let game;
let frame;
let drag = null;
const card = $('game-card');
let resultAnimations = [];
let particleLayer = null;
let bestStreak = 0;
const perfectRun = createPerfectRun();
const victoryScreen = createVictoryScreen({
  root: $('victory-screen'), sheet: $('victory-sheet'),
  character: $('victory-character'), caption: $('victory-caption'),
});

function setContinue(action, label, disabled = false) {
  const button = $('next-button');
  button.dataset.action = action;
  button.textContent = label;
  button.setAttribute('aria-label', label);
  button.disabled = disabled;
}

function isDialogOpen() { return dialog.open || cartridgeDialog.open; }

function applyCartridge() {
  choiceButtons = { pokemon: $('pokemon-button'), [cartridge.category]: $('company-button') };
  document.querySelector('.device-stage').style.setProperty('--cart-accent', cartridge.accent);
  document.querySelectorAll('[data-cart-label]').forEach(element => { element.textContent = cartridge.label.toUpperCase(); });
  document.querySelectorAll('[data-cart-number]').forEach(element => { element.textContent = cartridge.number; });
  document.querySelectorAll('[data-cart-art]').forEach(element => { element.src = cartridge.art; });
  $('cartridge-slot').setAttribute('aria-label', `Change cartridge. ${cartridge.label} inserted.`);
  $('pack-title').textContent = cartridge.title;
  $('pack-art').src = cartridge.art;
  $('pack-art').alt = cartridge.artAlt;
  $('title-screen').dataset.animation = cartridge.titleAnimation;
  $('opponent-label').textContent = cartridge.choiceLabel.toUpperCase();
  document.querySelector('.stamp-right').textContent = cartridge.choiceLabel.toUpperCase();
  $('company-button').setAttribute('aria-label', `${cartridge.choiceLabel}, right arrow or ${cartridge.shortcutLabel}`);
  bestStreak = 0;
  try { bestStreak = Math.max(0, Number(localStorage.getItem(cartridge.bestKey)) || 0); } catch { /* Storage is optional. */ }
  updateBest();
}

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
  const idle = state.phase === 'idle';
  const ending = perfectRun.scene(state, cartridge.id);
  victoryScreen.render(ending, cartridge.id);
  $('victory-continue').textContent = 'CONTINUE TO SCORE ▸';
  handheld.dataset.screen = ending ? 'victory' : idle ? 'title' : 'game';
  $('title-screen').hidden = !idle;
  $('boot-screen').hidden = true;
  $('cartridge-slot').disabled = !idle && !complete;
  $('cartridge-slot').title = idle || complete ? 'Change cartridge' : 'Reset your run to change cartridge';
  card.classList.toggle('is-playing', playing);
  card.classList.toggle('is-answered', answered);
  card.classList.toggle('is-complete', complete);
  card.setAttribute('aria-label', complete ? 'Final score screen' : `Name screen. Swipe left for Pokémon or right for ${cartridge.choiceLabel}.`);
  $('score-screen').hidden = !complete || Boolean(ending);
  card.dataset.category = answered ? state.entry.category : '';
  card.dataset.result = answered ? (state.result.correct ? 'correct' : 'wrong') : '';
  $('score').textContent = state.correct;
  $('answered').textContent = state.answered;
  $('accuracy').textContent = state.answered ? Math.round(state.correct / state.answered * 100) : '—';
  $('accuracy-unit').textContent = state.answered ? '%' : '';
  $('streak').textContent = state.streak;
  $('round-label').textContent = state.round ? `QUESTION ${String(state.round).padStart(2, '0')} / ${state.totalRounds}` : '10 QUESTIONS · 50/50 ODDS';
  $('question-label').textContent = state.entry ? (answered ? 'THE ANSWER IS IN.' : `POKÉMON OR ${cartridge.choiceLabel.toUpperCase()}?`) : 'ONE NAME. TWO POSSIBILITIES.';
  $('name').textContent = state.entry?.name ?? 'Meet your next guess.';
  $('question-hint').textContent = answered
    ? `${state.entry.category === 'pokemon' ? 'A Pokémon.' : cartridge.answerLabel} ${state.result.correct ? 'Good instinct.' : 'Now you know.'}`
    : playing ? 'Go with your gut.' : 'One name. Five seconds. Go with your gut.';
  renderVisual(answered ? state.entry : null);
  for (const [category, button] of Object.entries(choiceButtons)) {
    button.disabled = !playing;
    button.classList.toggle('reveal-correct', answered && state.entry.category === category);
    button.classList.toggle('reveal-wrong', answered && !state.result.correct && state.result.choice === category);
  }
  $('next-button').hidden = playing;
  setContinue(complete ? 'replay' : answered ? (state.answered === state.totalRounds ? 'score' : 'next') : 'start', complete ? 'Play again' : answered ? (state.answered === state.totalRounds ? 'See score' : 'Next name') : 'Start game');
  if (ending) setContinue('ending', 'Continue to score');
  $('reset-button').disabled = false;
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
    link.textContent = state.entry.category === 'pokemon' ? 'Species data ↗' : `${state.entry.source ? cartridge.profileLabel : cartridge.websiteLabel} ↗`;
    feedback.replaceChildren(heading, description, link);
    if (state.bestStreak > bestStreak) {
      bestStreak = state.bestStreak;
      try { localStorage.setItem(cartridge.bestKey, String(bestStreak)); } catch { /* Play without persistence. */ }
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
  if (screen !== 'game' || isDialogOpen() || !['playing', 'answered'].includes(game?.getState().phase)) return;
  const active = document.activeElement;
  if (active instanceof HTMLElement && !active.matches('input, textarea, select, [contenteditable="true"]')) active.blur();
}

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
  if (screen === 'secret' && !isDialogOpen()) {
    screen = 'game';
    render(game.getState());
    return;
  }
  if (screen !== 'game' || isDialogOpen() || !game || game.getState().phase === 'playing') return;
  cancelAnimationFrame(frame);
  if (perfectRun.scene(game.getState(), cartridge.id)) {
    perfectRun.dismiss();
    render(game.getState());
    return;
  }
  if (game.getState().phase === 'complete') reset();
  const state = game.startRound();
  render(state);
  // Keep the name and timer visible if the player scrolled down to Next name.
  (perfectRun.scene(state, cartridge.id) ? $('victory-screen') : card).scrollIntoView({ block: 'nearest', behavior: 'instant' });
  blurControl();
  if (state.phase === 'playing') frame = requestAnimationFrame(animate);
}

function answer(category) {
  if (screen !== 'game' || isDialogOpen() || !game || game.getState().phase !== 'playing') return;
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
  if (!isPokemon && cartridge.revealArt) {
    const artwork = document.createElement('img');
    artwork.src = cartridge.revealArt;
    artwork.alt = cartridge.revealArtAlt;
    artwork.className = 'lcd-art pack-reveal-art';
    visual.append(artwork);
    return;
  }
  const source = isPokemon
    ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${entry.id}.png`
    : opponentLogos[entry.name]?.src;
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
  if (!event.isPrimary || event.button !== 0 || drag || screen !== 'game' || game?.getState().phase !== 'playing' || isDialogOpen()) return;
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
  const category = swipeCategory(event.clientX - drag.x, event.clientY - drag.y, card.offsetWidth, cartridge.category);
  if (category) answer(category);
  else clearDrag();
});
card.addEventListener('pointercancel', clearDrag);
card.addEventListener('lostpointercapture', clearDrag);

function reset() {
  cancelAnimationFrame(frame);
  secretCode.reset();
  perfectRun.reset();
  game = createGame({ deck: createDeck(pokemon, opponents, Math.random, cartridge.category) });
  render(game.getState());
}

$('next-button').addEventListener('click', () => {
  if (screen === 'boot') skipBoot?.();
  else if (screen === 'error') insertCartridge(cartridge);
  else nextRound();
});
function resetGame() {
  if (!['game', 'secret'].includes(screen) || isDialogOpen() || !game) return;
  screen = 'game';
  reset();
  blurControl();
}
$('reset-button').addEventListener('click', resetGame);
$('pokemon-button').addEventListener('click', () => answer('pokemon'));
$('company-button').addEventListener('click', () => answer(cartridge.category));

installGameKeyboard(document, {
  getPhase: () => screen === 'secret' ? 'complete' : screen === 'game' ? game?.getState().phase : undefined,
  getOpponent: () => cartridge,
  isDialogOpen,
  onNext: nextRound,
  onAnswer: answer,
  onReset: resetGame,
  onTab: blurControl,
});

const secretCode = installSecretCode(document, {
  canEnter: () => screen === 'game' && game?.getState().phase === 'idle',
  isDialogOpen,
  onUnlock() {
    screen = 'secret';
    $('title-screen').hidden = true;
    handheld.dataset.screen = 'victory';
    victoryScreen.render(perfectScenes[cartridge.id], cartridge.id);
    $('victory-continue').textContent = 'RETURN TO START ▸';
    setContinue('ending', 'Return to start');
  },
});

document.addEventListener('visibilitychange', () => {
  if (!document.hidden && game?.getState().phase === 'playing') {
    cancelAnimationFrame(frame);
    animate();
  }
});

function openDialog(title, html) {
  secretCode.reset();
  $('dialog-title').textContent = title;
  $('dialog-content').innerHTML = html;
  dialog.showModal();
}
$('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
$('how-button').addEventListener('click', () => openDialog('A name. A hunch. Five seconds.', `
  <ol><li><strong>Start a game.</strong> Press Start on the ${cartridge.title} screen. You’ll get 10 names, each with an independent 50/50 chance of belonging to either category.</li><li><strong>Make your call.</strong> Swipe left for Pokémon or right for ${cartridge.choiceLabel} before the five-second timer runs out. You can also tap a choice, press <kbd>←</kbd> / <kbd>→</kbd>, or use <kbd>P</kbd> / <kbd>${cartridge.keys[0].toUpperCase()}</kbd>. ${cartridge.shortcutLabel} selects ${cartridge.choiceLabel}.</li><li><strong>See the reveal.</strong> Discover the answer, its image, and a source link. Correct answers earn one point. Wrong answers and timeouts count toward your total and reset your streak.</li><li><strong>Finish your run.</strong> After the tenth reveal, press Space or Score to see your final result. Press Replay for a fresh game.</li></ol>
  <p><strong>Change cartridge.</strong> Click the cartridge sticking out of the top of the system on the title or score screen. Swipe or use the arrows to browse, then click a pack to insert it. Left/right arrows, Tab, and Enter work in the picker; Escape closes it. During a run, reset first to change cartridges.</p>
  <p><strong>Reset your run.</strong> Press <kbd>Backspace</kbd> or tap the circular-arrow button above Start/Next to return to the start screen and clear the current score. Your personal best is preserved. Keyboard game shortcuts are paused while this help is open.</p>
  <p>The category is chosen with a fresh coin flip each question, regardless of collection sizes. The mix varies each game, and previous answers never change the next question’s odds. Always choosing one category averages 50% over many games. Names don’t repeat within a game. The timer continues when you switch tabs or open this help.</p><p>Your accuracy is correct answers divided by all completed questions. Your best streak is saved on this device when browser storage is available.</p>`));
$('about-button').addEventListener('click', () => openDialog('Big names. Tiny explanation.', `
  <p><strong>Pokémon Or</strong> is a small guessing game with interchangeable cartridges. Currently inserted: <strong>${cartridge.title}</strong>.</p>
  <p>Inspired by <a href="https://pixelastic.github.io/pokemonorbigdata/" target="_blank" rel="noopener noreferrer">Pokémon or Big Data by Pixelastic</a>. Credit to Pixelastic for the original web game.</p>
  <p><strong>The collection:</strong> ${pokemon.length.toLocaleString()} Pokémon species, sourced from the <a href="https://github.com/PokeAPI/pokeapi" target="_blank" rel="noopener noreferrer">PokéAPI project</a>, plus ${opponents.length.toLocaleString()} ${cartridge.collection} (${opponents.filter(entry => entry.TooObvious !== true).length.toLocaleString()} in play). ${cartridge.notes} Other names that give away the answer are kept in the collection but left out of rounds.</p>
  <p>Every answer has a source link. This pack is sourced from <a href="${cartridge.sourceUrl}" target="_blank" rel="noopener noreferrer">${cartridge.sourceLabel}</a>. ${cartridge.sourceNote} The datasets and sourcing notes are in the <a href="https://github.com/ScottBeeson/PokemonOr/tree/main/data" target="_blank" rel="noopener noreferrer">GitHub repository</a>. Data is bundled with the game, so rounds don’t depend on a live API.</p>
  <p>This is an unofficial fan project. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc., and GAME FREAK inc. Other brand names belong to their respective owners. No affiliation or endorsement is implied.</p>
  <p>Pokémon artwork comes from <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noopener noreferrer">PokéAPI’s sprite collection</a> and loads only after the answer. ${cartridge.imageNote}</p>
  <p>No accounts or analytics. Only your best streak is stored locally. Fonts are requested from Google Fonts and Pokémon artwork from GitHub, with fallbacks if either is unavailable.</p>`));

let carouselIndex = 0;
const cartridgeList = $('cartridge-list');

function updateCarouselPosition() {
  const buttons = [...cartridgeList.children];
  const center = cartridgeList.scrollLeft + cartridgeList.clientWidth / 2;
  let nearest = 0;
  buttons.forEach((button, index) => {
    if (Math.abs(button.offsetLeft + button.offsetWidth / 2 - center)
      < Math.abs(buttons[nearest].offsetLeft + buttons[nearest].offsetWidth / 2 - center)) nearest = index;
  });
  carouselIndex = nearest;
  $('carousel-position').textContent = `${nearest + 1} / ${cartridges.length} · ${cartridges[nearest].title.toUpperCase()}`;
}

function showCartridge(index, { focus = false, instant = false } = {}) {
  carouselIndex = (index + cartridges.length) % cartridges.length;
  const button = cartridgeList.children[carouselIndex];
  if (!button) return;
  if (focus) button.focus({ preventScroll: true });
  const left = button.offsetLeft - (cartridgeList.clientWidth - button.offsetWidth) / 2;
  cartridgeList.scrollTo({ left, behavior: instant || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  $('carousel-position').textContent = `${carouselIndex + 1} / ${cartridges.length} · ${cartridges[carouselIndex].title.toUpperCase()}`;
}

cartridgeList.addEventListener('scroll', updateCarouselPosition, { passive: true });
$('previous-cartridge').addEventListener('click', () => showCartridge(carouselIndex - 1));
$('next-cartridge').addEventListener('click', () => showCartridge(carouselIndex + 1));
cartridgeDialog.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  showCartridge(event.key === 'Home' ? 0 : event.key === 'End' ? cartridges.length - 1 : carouselIndex + (event.key === 'ArrowRight' ? 1 : -1), { focus: true });
});

function openCartridges({ initial = false } = {}) {
  if (!initial && $('cartridge-slot').disabled) return;
  secretCode.reset();
  const list = $('cartridge-list');
  list.replaceChildren();
  for (const pack of cartridges) {
    const button = document.createElement('button');
    button.className = 'cartridge-option';
    button.style.setProperty('--cart-accent', pack.accent);
    button.setAttribute('aria-label', `Insert ${pack.title}, Pack ${pack.number}${pack.id === cartridge.id ? ', currently inserted' : ''}`);
    const shell = $('cartridge-slot').querySelector('.cartridge-shell').cloneNode(true);
    shell.querySelector('[data-cart-label]').textContent = pack.label.toUpperCase();
    shell.querySelector('[data-cart-number]').textContent = pack.number;
    shell.querySelector('[data-cart-art]').src = pack.art;
    // These copies belong to the picker, not the inserted cartridge.
    shell.querySelectorAll('[data-cart-label], [data-cart-number], [data-cart-art]').forEach(element => {
      for (const attr of ['data-cart-label', 'data-cart-number', 'data-cart-art']) element.removeAttribute(attr);
    });
    const action = document.createElement('span');
    action.className = 'cartridge-option-action';
    action.textContent = pack.id === cartridge.id ? 'INSERTED · CLICK TO RELOAD' : 'CLICK TO LOAD ↗';
    button.append(shell, action);
    button.addEventListener('click', () => {
      cartridgeDialog.close();
      insertCartridge(pack);
    });
    list.append(button);
  }
  cartridgeDialog.showModal();
  showCartridge(cartridges.findIndex(pack => pack.id === cartridge.id), { focus: true, instant: true });
}
$('cartridge-slot').addEventListener('click', openCartridges);
$('close-cartridges').addEventListener('click', () => cartridgeDialog.close());
cartridgeDialog.addEventListener('click', event => {
  if (event.target !== cartridgeDialog) return;
  const rect = cartridgeDialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) cartridgeDialog.close();
});

async function insertCartridge(pack) {
  const id = ++bootId;
  cancelAnimationFrame(frame);
  clearDrag();
  clearResultEffects();
  secretCode.reset();
  perfectRun.reset();
  victoryScreen.render(null);
  game = null;
  screen = 'boot';
  cartridge = pack;
  pokemon = [];
  opponents = [];
  opponentLogos = {};
  applyCartridge();
  handheld.dataset.screen = 'boot';
  $('title-screen').hidden = true;
  $('boot-screen').hidden = false;
  $('boot-status').textContent = '';
  $('cartridge-slot').disabled = true;
  $('reset-button').disabled = true;
  Object.values(choiceButtons).forEach(button => { button.disabled = true; button.classList.remove('reveal-correct', 'reveal-wrong'); });
  $('next-button').hidden = false;
  setContinue('skip', 'Skip startup animation');
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduceMotion) $('cartridge-slot').querySelector('.cartridge-shell').animate([
    { transform: 'translateY(-15px)' }, { transform: 'translateY(0)' },
  ], { duration: 240, easing: 'ease-out' });
  let bootTimer;
  const flourish = new Promise(resolve => {
    skipBoot = () => { clearTimeout(bootTimer); setContinue('loading', 'Reading cartridge', true); resolve(); };
    bootTimer = setTimeout(skipBoot, reduceMotion ? 0 : 900);
  });
  const loadingTimer = setTimeout(() => { if (id === bootId) $('boot-status').textContent = 'READING CARTRIDGE…'; }, 900);
  try {
    const [data] = await Promise.all([loadCartridge(pack), flourish]);
    if (id !== bootId) return;
    pokemon = data.pokemon;
    opponents = data.opponents;
    opponentLogos = data.logos;
    screen = 'game';
    reset();
  } catch (error) {
    if (id !== bootId) return;
    console.error(error);
    screen = 'error';
    handheld.dataset.screen = 'error';
    $('boot-status').textContent = 'Couldn’t read cartridge. Retry or choose a pack from the slot above.';
    setContinue('retry', 'Retry cartridge loading');
    $('cartridge-slot').disabled = false;
    $('cartridge-slot').title = 'Change cartridge';
  } finally {
    clearTimeout(bootTimer);
    clearTimeout(loadingTimer);
    if (id === bootId) skipBoot = null;
  }
}

insertCartridge(cartridge);
// Show the collection once per page load, while the default pack boots behind it.
// Later insertions, resets, and replays keep their existing flow.
openCartridges({ initial: true });
