/*
 * FSRS (Free Spaced Repetition Scheduler), v4.5 default parameters.
 * The best openly published scheduling algorithm (Ye et al.), successor to
 * SM-2. Each card carries {difficulty, stability, due, last, reps, lapses,
 * state}. Grades: 1 = نسيت (Again), 2 = صعبة (Hard), 3 = زين (Good),
 * 4 = سهلة (Easy).
 */
const FSRS = (() => {
  const W = [
    0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.031, 1.6474,
    0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.587, 0.2272, 2.8755,
  ];
  const DECAY = -0.5;
  const FACTOR = 19 / 81; // so R(t=S) = 0.9
  const REQUEST_RETENTION = 0.9;
  const MAX_INTERVAL = 365;
  const DAY = 24 * 60 * 60 * 1000;

  const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

  function retrievability(elapsedDays, stability) {
    if (stability <= 0) return 0;
    return Math.pow(1 + (FACTOR * elapsedDays) / stability, DECAY);
  }

  function initDifficulty(grade) {
    return clamp(W[4] - (grade - 3) * W[5], 1, 10);
  }

  function initStability(grade) {
    return Math.max(W[grade - 1], 0.1);
  }

  function nextDifficulty(d, grade) {
    const next = d - W[6] * (grade - 3);
    // mean-revert toward the "Easy" starting difficulty
    return clamp(W[7] * initDifficulty(4) + (1 - W[7]) * next, 1, 10);
  }

  function stabilityAfterRecall(d, s, r, grade) {
    const hardPenalty = grade === 2 ? W[15] : 1;
    const easyBonus = grade === 4 ? W[16] : 1;
    return (
      s *
      (1 +
        Math.exp(W[8]) *
          (11 - d) *
          Math.pow(s, -W[9]) *
          (Math.exp(W[10] * (1 - r)) - 1) *
          hardPenalty *
          easyBonus)
    );
  }

  function stabilityAfterForget(d, s, r) {
    const sf =
      W[11] *
      Math.pow(d, -W[12]) *
      (Math.pow(s + 1, W[13]) - 1) *
      Math.exp(W[14] * (1 - r));
    return Math.min(sf, s);
  }

  function intervalDays(stability) {
    const days =
      (stability / FACTOR) * (Math.pow(REQUEST_RETENTION, 1 / DECAY) - 1);
    return clamp(Math.round(days), 1, MAX_INTERVAL);
  }

  function emptyCard() {
    return {
      difficulty: 0,
      stability: 0,
      due: 0, // 0 = new, never studied
      last: 0,
      reps: 0,
      lapses: 0,
      state: "new", // new | learning | review
    };
  }

  /** Apply a grade to a card. Returns a NEW card object. */
  function grade(card, g, now = Date.now()) {
    const c = { ...card };
    if (c.state === "new" || c.reps === 0) {
      c.difficulty = initDifficulty(g);
      c.stability = initStability(g);
      c.state = g === 1 ? "learning" : "review";
    } else {
      const elapsed = Math.max(0, (now - c.last) / DAY);
      const r = retrievability(elapsed, c.stability);
      if (g === 1) {
        c.lapses += 1;
        c.stability = stabilityAfterForget(c.difficulty, c.stability, r);
        c.state = "learning";
      } else {
        c.stability = stabilityAfterRecall(c.difficulty, c.stability, r, g);
        c.state = "review";
      }
      c.difficulty = nextDifficulty(c.difficulty, g);
    }
    c.reps += 1;
    c.last = now;
    // Again re-queues within the session (handled by the app); its persisted
    // due date is tomorrow so a missed session still resurfaces it first.
    const days = g === 1 ? 1 : intervalDays(c.stability);
    c.due = now + days * DAY;
    return c;
  }

  return { emptyCard, grade, retrievability, intervalDays, DAY };
})();
