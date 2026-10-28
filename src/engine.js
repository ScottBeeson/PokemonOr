/** Fisher–Yates shuffle; the supplied random function makes the deck testable. */
function shuffle(items, random) {
  const shuffled = [...items];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Choose each question's category independently with equal probability,
 * irrespective of dataset size or previous categories.
 * Within each category, exhaust a shuffled bag before showing a name again.
 * Entries explicitly marked TooObvious: true are validated but never drawn.
 */
export function createDeck(pokemon, companies, random = Math.random) {
  if (typeof random !== 'function') throw new TypeError('random must be a function.');
  const sample = () => {
    const value = random();
    if (!Number.isFinite(value) || value < 0 || value >= 1) {
      throw new RangeError('random must return a number from 0 (inclusive) to 1 (exclusive).');
    }
    return value;
  };
  const makeBag = (entries, category) => {
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new TypeError(`The ${category} dataset must not be empty.`);
    }
    const names = new Set();
    const source = entries.map((entry) => {
      if (!entry || typeof entry.name !== 'string' || !entry.name.trim() || entry.category !== category) {
        throw new TypeError(`Every ${category} entry needs a name and matching category.`);
      }
      if (entry.TooObvious !== undefined && typeof entry.TooObvious !== 'boolean') {
        throw new TypeError(`TooObvious must be a boolean when defined: ${entry.name}`);
      }
      const key = entry.name.toLocaleLowerCase('en');
      if (names.has(key)) throw new TypeError(`Duplicate ${category} name: ${entry.name}`);
      names.add(key);
      return { ...entry };
    }).filter((entry) => entry.TooObvious !== true);
    if (source.length === 0) {
      throw new TypeError(`The ${category} dataset has no eligible entries after TooObvious filtering.`);
    }
    let bag = [];
    let previousName = null;
    return () => {
      if (bag.length === 0) {
        bag = shuffle(source, sample);
        if (bag.length > 1 && bag[0].name === previousName) {
          [bag[0], bag[1]] = [bag[1], bag[0]];
        }
      }
      const entry = bag.shift();
      previousName = entry.name;
      return { ...entry };
    };
  };
  const nextPokemon = makeBag(pokemon, 'pokemon');
  const nextCompany = makeBag(companies, 'company');
  return {
    next() {
      return sample() < 0.5 ? nextPokemon() : nextCompany();
    },
  };
}

/** A clock-driven state machine. The UI chooses when to begin the next round. */
export function createGame({ deck, durationMs = 5000, totalRounds = 10, now = () => performance.now() }) {
  if (!deck || typeof deck.next !== 'function') throw new TypeError('A deck with next() is required.');
  if (!Number.isFinite(durationMs) || durationMs <= 0) throw new RangeError('durationMs must be positive.');
  if (!Number.isSafeInteger(totalRounds) || totalRounds <= 0) throw new RangeError('totalRounds must be a positive integer.');
  if (typeof now !== 'function') throw new TypeError('now must be a function.');

  const state = {
    phase: 'idle',
    entry: null,
    round: 0,
    totalRounds,
    correct: 0,
    answered: 0,
    streak: 0,
    bestStreak: 0,
    remainingMs: durationMs,
    result: null,
    deadline: null,
  };

  function getState() {
    return {
      ...state,
      entry: state.entry ? { ...state.entry } : null,
      result: state.result ? { ...state.result } : null,
    };
  }

  function finish(choice, timedOut) {
    const correct = !timedOut && choice === state.entry.category;
    state.phase = 'answered';
    state.answered += 1;
    state.correct += correct ? 1 : 0;
    state.streak = correct ? state.streak + 1 : 0;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    state.result = { correct, timedOut, choice: timedOut ? null : choice };
  }

  function updateTime() {
    state.remainingMs = Math.max(0, Math.min(durationMs, state.deadline - now()));
    if (state.remainingMs === 0) finish(null, true);
  }

  return {
    getState,
    startRound() {
      if (state.phase === 'playing' || state.phase === 'complete') return getState();
      if (state.answered === totalRounds) {
        state.phase = 'complete';
        return getState();
      }
      const entry = deck.next();
      if (!entry || !['pokemon', 'company'].includes(entry.category)) {
        throw new TypeError('The deck returned an invalid category.');
      }
      state.entry = { ...entry };
      state.phase = 'playing';
      state.round += 1;
      state.remainingMs = durationMs;
      state.result = null;
      state.deadline = now() + durationMs;
      return getState();
    },
    answer(categoryOrNull) {
      if (state.phase === 'complete') return getState();
      if (categoryOrNull !== null && !['pokemon', 'company'].includes(categoryOrNull)) {
        throw new TypeError('Answer must be pokemon, company, or null.');
      }
      if (state.phase !== 'playing') return getState();
      updateTime();
      // A null answer is a request to check for timeout, never an early forfeit.
      if (state.phase === 'playing' && categoryOrNull !== null) finish(categoryOrNull, false);
      return getState();
    },
    tick() {
      if (state.phase === 'playing') updateTime();
      return getState();
    },
  };
}
