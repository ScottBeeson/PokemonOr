import { createDeck, createGame } from './engine.js';
import { keyCategory, swipeCategory } from './gestures.js';

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
let bestStreak = 0;
try { bestStreak = Math.max(0, Number(localStorage.getItem('pob-best-streak')) || 0); } catch { /* Storage is optional. */ }

function updateBest() {
  $('best-label').textContent = bestStreak > 0
    ? `Your personal best: ${bestStreak} correct in a row. Can you beat it?`
    : 'A little knowledge. A lot of gut feeling.';
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
  const playing = state.phase === 'playing';
  const answered = state.phase === 'answered';
  card.classList.toggle('is-playing', playing);
  card.classList.toggle('is-answered', answered);
  card.dataset.category = answered ? state.entry.category : '';
  $('score').textContent = state.correct;
  $('answered').textContent = state.answered;
  $('accuracy').textContent = state.answered ? Math.round(state.correct / state.answered * 100) : '—';
  $('accuracy-unit').textContent = state.answered ? '%' : '';
  $('streak').textContent = state.streak;
  $('round-label').textContent = state.round ? `ROUND ${String(state.round).padStart(2, '0')}` : 'YOUR NEXT FIVE-SECOND OBSESSION';
  $('question-label').textContent = state.entry ? (answered ? 'THE ANSWER IS IN.' : 'POKÉMON OR BIG DATA?') : 'ONE NAME. TWO POSSIBILITIES.';
  $('name').textContent = state.entry?.name ?? 'Meet your next guess.';
  $('question-hint').textContent = answered
    ? `${state.entry.category === 'pokemon' ? 'A Pokémon.' : 'A big data company.'} ${state.result.correct ? 'Good instinct.' : 'Now you know.'}`
    : playing ? '← Pokémon · Big Data →' : 'One name. Five seconds. Go with your gut.';
  $('card-swipe-hint').hidden = answered;
  renderVisual(answered ? state.entry : null);
  for (const [category, button] of Object.entries(choiceButtons)) {
    button.disabled = !playing;
    button.classList.toggle('reveal-correct', answered && state.entry.category === category);
    button.classList.toggle('reveal-wrong', answered && !state.result.correct && state.result.choice === category);
  }
  $('next-button').hidden = playing;
  $('next-button').disabled = false;
  $('next-button').textContent = answered ? 'Next name →' : 'Let’s play →';
  $('action-hint').textContent = playing ? 'Swipe the card, tap a choice, or use ← / → (P / B).' : answered ? 'Ready for another? Press Space or tap Next name.' : 'Five seconds per name. As many rounds as you like.';
  $('reset-button').hidden = !state.round || playing;
  $('feedback').hidden = !answered;
  if (answered) {
    const feedback = $('feedback');
    feedback.classList.toggle('incorrect', !state.result.correct);
    const heading = document.createElement('strong');
    heading.textContent = state.result.timedOut ? 'Time’s up! This one got away.' : state.result.correct ? '✓ You got it right.' : 'Not quite. A convincing name, though.';
    const description = document.createElement('span');
    description.textContent = `${state.entry.description} `;
    const link = document.createElement('a');
    link.href = state.entry.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = state.entry.category === 'pokemon' ? 'Species data ↗' : 'Company website ↗';
    feedback.replaceChildren(heading, description, link);
    if (state.bestStreak > bestStreak) {
      bestStreak = state.bestStreak;
      try { localStorage.setItem('pob-best-streak', String(bestStreak)); } catch { /* Play without persistence. */ }
    }
  }
  updateBest();
  updateClock(state);
}

function animate() {
  const state = game.tick();
  if (state.phase === 'answered') {
    render(state);
    if (!dialog.open) $('next-button').focus({ preventScroll: true });
    return;
  }
  updateClock(state);
  frame = requestAnimationFrame(animate);
}

function nextRound() {
  if (!game || game.getState().phase === 'playing') return;
  cancelAnimationFrame(frame);
  render(game.startRound());
  // Keep the name and timer visible if the player scrolled down to Next name.
  card.scrollIntoView({ block: 'nearest', behavior: 'instant' });
  choiceButtons.pokemon.focus({ preventScroll: true });
  frame = requestAnimationFrame(animate);
}

function answer(category) {
  if (!game || game.getState().phase !== 'playing') return;
  const fromX = drag?.dx ?? (category === 'pokemon' ? -22 : 22);
  cancelAnimationFrame(frame);
  render(game.answer(category));
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    card.animate([{ transform: `translateX(${fromX}px) rotate(${fromX / 22}deg)` }, { transform: 'none' }], { duration: 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
  }
  $('next-button').focus({ preventScroll: true });
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
  const image = document.createElement('img');
  image.className = isPokemon ? 'pokemon-art' : 'company-logo';
  image.alt = isPokemon ? `Artwork of ${entry.name}` : `${entry.name} logo`;
  image.referrerPolicy = 'no-referrer';
  image.hidden = true;
  image.onload = () => { image.hidden = false; fallback.hidden = true; };
  image.onerror = () => { image.remove(); caption.textContent = isPokemon ? 'Artwork unavailable' : 'Logo unavailable'; };
  image.src = source;
  visual.append(image);
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
$('reset-button').addEventListener('click', () => { reset(); $('next-button').focus({ preventScroll: true }); });
for (const [category, button] of Object.entries(choiceButtons)) button.addEventListener('click', () => answer(category));

document.addEventListener('keydown', (event) => {
  if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || dialog.open || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
  const category = keyCategory(event.key);
  if (game?.getState().phase === 'playing' && category) {
    event.preventDefault();
    answer(category);
  } else if (event.code === 'Space' && game && game.getState().phase !== 'playing' && !['A', 'BUTTON'].includes(event.target.tagName)) {
    event.preventDefault();
    nextRound();
  } else if (event.code === 'Space' && event.target === $('next-button')) {
    // Native button activation handles Space once, on keyup.
    return;
  }
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
  dialog.showModal();
}
$('close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } });
$('how-button').addEventListener('click', () => openDialog('A name. A hunch. Five seconds.', `
  <ol><li><strong>Start a round.</strong> We’ll show you a real name.</li><li><strong>Make your call.</strong> Swipe left for Pokémon or right for Big Data before the five-second timer runs out. You can also tap a choice, press <kbd>←</kbd> / <kbd>→</kbd>, or use the original <kbd>P</kbd> / <kbd>B</kbd> keys.</li><li><strong>See the reveal.</strong> Discover the Pokémon artwork or company logo. Correct answers earn one point. Wrong answers and timeouts count toward your total and reset your streak.</li><li><strong>Keep going.</strong> Select “Next name” or press Space when you’re ready. There’s no round limit.</li></ol>
  <p>Each category has a 50/50 chance. Names within a category won’t repeat until you’ve seen that whole category. The timer continues when you switch tabs or open this help.</p><p>Your accuracy is correct answers divided by all completed rounds. Your best streak is saved on this device when browser storage is available.</p>`));
$('about-button').addEventListener('click', () => openDialog('Big names. Tiny explanation.', `
  <p><strong>Pokemon or BigData</strong> is a small guessing game about the wonderfully similar names of creatures and companies.</p>
  <p><strong>The collection:</strong> ${pokemon.length.toLocaleString()} Pokémon species, sourced from the <a href="https://github.com/PokeAPI/pokeapi" target="_blank" rel="noopener noreferrer">PokéAPI project</a>, plus ${companies.length.toLocaleString()} curated companies in databases, analytics, data engineering, infrastructure, and AI data platforms. “Big Data” is used broadly; some companies have been acquired or use historical names. We use company names, not standalone products.</p>
  <p>Every answer has a source link. The complete datasets and company sourcing notes are in the <a href="https://github.com/ScottBeeson/PokemonOrBigData/tree/main/data" target="_blank" rel="noopener noreferrer">GitHub repository</a>. Data is bundled with the game, so rounds don’t depend on a live API.</p>
  <p>This is an unofficial fan project. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc., and GAME FREAK inc. Company names belong to their respective owners. No affiliation or endorsement is implied.</p>
  <p>Pokémon artwork comes from <a href="https://github.com/PokeAPI/sprites" target="_blank" rel="noopener noreferrer">PokéAPI’s sprite collection</a> and loads only after the answer. Company brand icons are sourced from official websites and bundled locally. Unavailable images fall back to a placeholder; historical companies may have no logo.</p>
  <p>No accounts or analytics. Only your best streak is stored locally. Fonts are requested from Google Fonts and Pokémon artwork from GitHub, with fallbacks if either is unavailable.</p>`));
$('collection-button').addEventListener('click', () => {
  openDialog('Meet the name collection.', '<p>Discover the names behind the game. Searching here might give you an edge.</p><label for="collection-search">Search Pokémon and companies</label><input id="collection-search" class="search-input" type="search" placeholder="Try Pikachu or Databricks…"><p id="result-count" role="status"></p><ul class="collection-results" id="collection-results"></ul>');
  const all = [...pokemon, ...companies].sort((a, b) => a.name.localeCompare(b.name));
  function search() {
    const query = $('collection-search').value.trim().toLocaleLowerCase();
    const results = all.filter((entry) => entry.name.toLocaleLowerCase().includes(query));
    $('result-count').textContent = `${results.length.toLocaleString()} ${results.length === 1 ? 'name' : 'names'}${results.length > 100 ? ' · showing the first 100' : ''}`;
    $('collection-results').replaceChildren(...results.slice(0, 100).map((entry) => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.textContent = entry.name;
      a.href = entry.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      const category = document.createElement('span');
      category.textContent = entry.category === 'pokemon' ? 'Pokémon' : 'Big Data';
      li.append(a, category);
      return li;
    }));
  }
  $('collection-search').addEventListener('input', search);
  search();
});

async function load() {
  try {
    [pokemon, companies, companyLogos] = await Promise.all([...['pokemon', 'companies'].map(async (name) => {
      const response = await fetch(new URL(`../data/${name}.json`, import.meta.url));
      if (!response.ok) throw new Error(`Could not load ${name}`);
      return response.json();
    }), fetch(new URL('../data/company-logos.json', import.meta.url)).then(response => response.ok ? response.json() : {}).catch(() => ({}))]);
    $('collection-count').textContent = `${pokemon.length.toLocaleString()} Pokémon + ${companies.length.toLocaleString()} data companies. Endless second-guessing.`;
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
