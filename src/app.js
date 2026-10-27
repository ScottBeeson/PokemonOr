import { createDeck, createGame } from './engine.js';

const $ = (id) => document.getElementById(id);
const choiceButtons = { pokemon: $('pokemon-button'), company: $('company-button') };
const dialog = $('info-dialog');
let pokemon = [];
let companies = [];
let game;
let frame;
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
  const playing = state.phase === 'playing';
  const answered = state.phase === 'answered';
  $('score').textContent = state.correct;
  $('answered').textContent = state.answered;
  $('accuracy').textContent = state.answered ? Math.round(state.correct / state.answered * 100) : '—';
  $('accuracy-unit').textContent = state.answered ? '%' : '';
  $('streak').textContent = state.streak;
  $('round-label').textContent = state.round ? `ROUND ${String(state.round).padStart(2, '0')}` : 'YOUR NEXT FIVE-SECOND OBSESSION';
  $('question-label').textContent = state.entry ? (answered ? 'THE ANSWER IS IN.' : 'POKÉMON OR BIG DATA?') : 'ONE NAME. TWO POSSIBILITIES.';
  $('name').textContent = state.entry?.name ?? 'Trust your instinct.';
  $('question-hint').textContent = answered
    ? `${state.entry.category === 'pokemon' ? 'A Pokémon.' : 'A big data company.'} ${state.result.correct ? 'Good instinct.' : 'Now you know.'}`
    : 'Is it a Pokémon or a big data company?';
  for (const [category, button] of Object.entries(choiceButtons)) {
    button.disabled = !playing;
    button.classList.toggle('reveal-correct', answered && state.entry.category === category);
    button.classList.toggle('reveal-wrong', answered && !state.result.correct && state.result.choice === category);
  }
  $('next-button').hidden = playing;
  $('next-button').disabled = false;
  $('next-button').textContent = answered ? 'Next name →' : 'Let’s play →';
  $('action-hint').textContent = playing ? 'Go with your gut. The clock is ticking.' : answered ? 'Take a breath. The next timer starts when you’re ready.' : 'Five seconds per name. As many rounds as you like.';
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
  choiceButtons.pokemon.focus({ preventScroll: true });
  frame = requestAnimationFrame(animate);
}

function answer(category) {
  if (!game || game.getState().phase !== 'playing') return;
  cancelAnimationFrame(frame);
  render(game.answer(category));
  $('next-button').focus({ preventScroll: true });
}

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
  const key = event.key.toLowerCase();
  if (game?.getState().phase === 'playing' && ['p', 'b'].includes(key)) {
    event.preventDefault();
    answer(key === 'p' ? 'pokemon' : 'company');
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
  <ol><li><strong>Start a round.</strong> We’ll show you a real name.</li><li><strong>Make your call.</strong> Choose Pokémon or Big Data before the five-second timer runs out. Use the buttons or press <kbd>P</kbd> / <kbd>B</kbd>.</li><li><strong>See the reveal.</strong> Correct answers earn one point. Wrong answers and timeouts count toward your total and reset your streak.</li><li><strong>Keep going.</strong> Select “Next name” or press Space when you’re ready. There’s no round limit.</li></ol>
  <p>Each category has a 50/50 chance. Names within a category won’t repeat until you’ve seen that whole category. The timer continues when you switch tabs or open this help.</p><p>Your accuracy is correct answers divided by all completed rounds. Your best streak is saved on this device when browser storage is available.</p>`));
$('about-button').addEventListener('click', () => openDialog('Big names. Tiny explanation.', `
  <p><strong>POkemon or BigData</strong> is a small guessing game about the wonderfully similar names of creatures and companies.</p>
  <p><strong>The collection:</strong> ${pokemon.length.toLocaleString()} Pokémon species, sourced from the <a href="https://github.com/PokeAPI/pokeapi" target="_blank" rel="noopener noreferrer">PokéAPI project</a>, plus ${companies.length.toLocaleString()} curated companies in databases, analytics, data engineering, infrastructure, and AI data platforms. “Big Data” is used broadly; some companies have been acquired or use historical names. We use company names, not standalone products.</p>
  <p>Every answer has a source link. The complete datasets and company sourcing notes are in the <a href="https://github.com/ScottBeeson/PokemonOrBigData/tree/main/data" target="_blank" rel="noopener noreferrer">GitHub repository</a>. Data is bundled with the game, so rounds don’t depend on a live API.</p>
  <p>This is an unofficial fan project. Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc., and GAME FREAK inc. Company names belong to their respective owners. No affiliation or endorsement is implied.</p>
  <p>No accounts or analytics. Only your best streak is stored locally. Fonts are requested from Google Fonts, with system fonts as a fallback.</p>`));
$('collection-button').addEventListener('click', () => {
  openDialog('Meet the name collection.', '<p>Discover the names behind the game. Searching here might give you an edge.</p><label for="collection-search">Search Pokémon and companies</label><input id="collection-search" class="search-input" type="search" placeholder="Try Pikachu or Databricks…"><p id="result-count" role="status"></p><ul class="collection-results" id="collection-results"></ul>');
  const all = [...pokemon, ...companies].sort((a, b) => a.name.localeCompare(b.name));
  function search() {
    const query = $('collection-search').value.trim().toLocaleLowerCase();
    const results = all.filter((entry) => entry.name.toLocaleLowerCase().includes(query));
    $('result-count').textContent = `${results.length.toLocaleString()} names${results.length > 100 ? ' · showing the first 100' : ''}`;
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
    [pokemon, companies] = await Promise.all(['pokemon', 'companies'].map(async (name) => {
      const response = await fetch(new URL(`../data/${name}.json`, import.meta.url));
      if (!response.ok) throw new Error(`Could not load ${name}`);
      return response.json();
    }));
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
