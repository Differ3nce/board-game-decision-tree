import type { Answer, Game, Question, QuestionDimension } from "@/types/game";
import {
  applyFilter,
  excludeByMechanic,
  excludeByCategory,
} from "./filters";

export const RESULT_THRESHOLD = 1;

/** Score 1.0 = perfect 50/50 split, 0.0 = no split at all */
function splitScore(matching: number, total: number): number {
  if (total === 0) return 0;
  return 1 - Math.abs(0.5 - matching / total);
}

/**
 * Apply a filter value that may include special prefixes (__exclude__:).
 * Used for both scoring and answer application.
 */
function applyOptionFilter(
  games: Game[],
  dimension: QuestionDimension,
  value: string
): Game[] {
  if (value.startsWith("__exclude__:")) {
    const name = value.slice(12);
    if (dimension === "mechanic") return excludeByMechanic(games, name);
    if (dimension === "category") return excludeByCategory(games, name);
    return games;
  }
  return applyFilter(games, dimension, value);
}

function questionScore(q: Question, games: Game[]): number {
  // Slider questions: sample several values to find the best achievable split
  if (q.type === "slider" && q.sliderConfig) {
    const { min, max, step } = q.sliderConfig;
    let best = 0;
    for (let v = min; v <= max; v += step * 4) {
      const filtered = applyFilter(games, q.dimension, String(v));
      best = Math.max(best, splitScore(filtered.length, games.length));
    }
    return best;
  }

  return q.options.reduce((best, opt) => {
    if (opt.value.startsWith("__skip__")) return best;
    const filtered = applyOptionFilter(games, q.dimension, opt.value);
    return Math.max(best, splitScore(filtered.length, games.length));
  }, 0);
}

function buildPlayerCountQuestion(games: Game[]): Question | null {
  const counts = new Set<number>();
  games.forEach((g) => {
    // Use bestPlayerCounts when available, else fallback to min/max range
    if (g.bestPlayerCounts.length > 0) {
      g.bestPlayerCounts.forEach((c) => counts.add(c));
    } else {
      for (let i = g.minPlayers; i <= Math.min(g.maxPlayers, 8); i++) {
        counts.add(i);
      }
    }
  });
  if (counts.size <= 1) return null;
  const sorted = [...counts].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const defaultValue = Math.min(Math.max(2, min), max);
  return {
    dimension: "playerCount",
    text: "How many players are playing tonight?",
    options: [],
    type: "slider",
    sliderConfig: { min, max, step: 1, defaultValue, format: "count" },
  };
}

function buildPlayTimeQuestion(games: Game[]): Question | null {
  const times = games
    .map((g) => g.maxPlayTime || g.minPlayTime)
    .filter((t) => t > 0);
  if (times.length === 0) return null;

  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  if (maxTime - minTime < 30) return null; // no meaningful spread to filter on

  // Default slider position: average play time of collection, rounded to 15 min
  const avgTime =
    games
      .filter((g) => g.maxPlayTime > 0 || g.minPlayTime > 0)
      .reduce((sum, g) => sum + (g.minPlayTime + (g.maxPlayTime || g.minPlayTime)) / 2, 0) /
    Math.max(1, games.filter((g) => g.maxPlayTime > 0 || g.minPlayTime > 0).length);
  const defaultValue = Math.round(Math.min(Math.max(avgTime, 30), 300) / 15) * 15;

  return {
    dimension: "playTime",
    text: "How long do you want to play?",
    options: [],
    type: "slider",
    sliderConfig: { min: 30, max: 300, step: 15, defaultValue },
  };
}

function buildComplexityQuestion(games: Game[]): Question | null {
  const tiers = [
    { label: "Filler (mindless fun)", value: "filler" },
    { label: "Light (easy to learn)", value: "light" },
    { label: "Medium (some rules)", value: "medium" },
    { label: "Heavy (lots of rules)", value: "heavy" },
    { label: "Expert (brain-burner)", value: "expert" },
  ];
  const usable = tiers.filter((t) => applyFilter(games, "complexity", t.value).length > 0);
  if (usable.length < 2) return null;
  return {
    dimension: "complexity",
    text: "How complex of a game are you in the mood for?",
    options: usable,
  };
}

function buildAgeRestrictionQuestion(games: Game[]): Question | null {
  // Only relevant when some games have a recommended age ≥ 12
  const hasAgeSensitiveGames = games.some((g) => g.recommendedAge >= 12);
  if (!hasAgeSensitiveGames) return null;

  const thresholds = [
    { label: "Kids welcome (up to age 10)", value: "10" },
    { label: "Pre-teens okay (up to age 13)", value: "13" },
    { label: "Teens and up (age 14+)", value: "17" },
    { label: "Adults only — no kids", value: "__skip__" },
  ];

  // Keep options that actually filter at least one game out
  const usable = thresholds.filter((opt) => {
    if (opt.value === "__skip__") return true;
    const filtered = applyFilter(games, "ageRestriction", opt.value);
    return filtered.length < games.length;
  });

  if (usable.length < 2) return null;

  return {
    dimension: "ageRestriction",
    text: "Will kids be joining tonight?",
    options: usable,
  };
}

function buildMechanicQuestion(games: Game[], skipMechanics: Set<string>): Question | null {
  const mechanicCounts = new Map<string, number>();
  games.forEach((g) =>
    g.mechanics.forEach((m) => {
      mechanicCounts.set(m, (mechanicCounts.get(m) ?? 0) + 1);
    })
  );

  let bestMechanic: string | null = null;
  let bestScore = -1;

  mechanicCounts.forEach((count, mechanic) => {
    if (skipMechanics.has(mechanic)) return;
    if (count === games.length) return; // all remaining games have it — useless filter
    const score = splitScore(count, games.length);
    if (score > bestScore) {
      bestScore = score;
      bestMechanic = mechanic;
    }
  });

  if (!bestMechanic) return null;

  return {
    dimension: "mechanic",
    text: `Are you in the mood for a game with "${bestMechanic}"?`,
    options: [
      { label: "Yes, love it! 👍", value: bestMechanic },
      { label: "No preference", value: `__skip__:${bestMechanic}` },
      { label: "No, I hate it! 👎", value: `__exclude__:${bestMechanic}` },
    ],
  };
}

function buildCategoryQuestion(games: Game[], skipCategories: Set<string>): Question | null {
  const categoryCounts = new Map<string, number>();
  games.forEach((g) =>
    g.categories.forEach((c) => {
      categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
    })
  );

  let bestCategory: string | null = null;
  let bestScore = -1;

  categoryCounts.forEach((count, category) => {
    if (skipCategories.has(category)) return;
    if (count === games.length) return; // all remaining games have it — useless filter
    const score = splitScore(count, games.length);
    if (score > bestScore) {
      bestScore = score;
      bestCategory = category;
    }
  });

  if (!bestCategory) return null;

  return {
    dimension: "category",
    text: `Are you in the mood for a "${bestCategory}" game?`,
    options: [
      { label: "Yes, love it! 👍", value: bestCategory },
      { label: "No preference", value: `__skip__:${bestCategory}` },
      { label: "No, I hate it! 👎", value: `__exclude__:${bestCategory}` },
    ],
  };
}

function buildRatingQuestion(games: Game[]): Question | null {
  const thresholds = [
    { label: "7.0+ (Good)", value: "7" },
    { label: "7.5+ (Great)", value: "7.5" },
    { label: "8.0+ (Excellent)", value: "8" },
  ];
  const usable = thresholds.filter((t) => {
    const filtered = applyFilter(games, "rating", t.value);
    return filtered.length > 0 && filtered.length < games.length;
  });
  if (usable.length === 0) return null;
  return {
    dimension: "rating",
    text: "Any minimum BGG community rating preference?",
    options: [...usable, { label: "No preference", value: "__skip__" }],
  };
}

interface ScoredQuestion {
  question: Question;
  score: number;
}

/** Extract the mechanic/category name from an answer value, handling prefixes */
function extractValue(value: string): string {
  if (value.startsWith("__skip__:")) return value.slice(9);
  if (value.startsWith("__exclude__:")) return value.slice(12);
  return value;
}

export function getNextQuestion(
  games: Game[],
  askedDimensions: Set<QuestionDimension>,
  answers: Answer[]
): Question | null {
  if (games.length <= RESULT_THRESHOLD) return null;

  // Player count is always asked first
  if (!askedDimensions.has("playerCount")) {
    return buildPlayerCountQuestion(games);
  }

  // Mechanics/categories already offered (yes, skip, or exclude), to avoid repeating
  const askedMechanics = new Set(
    answers.filter((a) => a.dimension === "mechanic").map((a) => extractValue(a.value))
  );
  const askedCategories = new Set(
    answers.filter((a) => a.dimension === "category").map((a) => extractValue(a.value))
  );

  const candidates: ScoredQuestion[] = [];

  if (!askedDimensions.has("playTime")) {
    const q = buildPlayTimeQuestion(games);
    if (q) candidates.push({ question: q, score: questionScore(q, games) });
  }
  if (!askedDimensions.has("complexity")) {
    const q = buildComplexityQuestion(games);
    if (q) candidates.push({ question: q, score: questionScore(q, games) });
  }
  if (!askedDimensions.has("rating")) {
    const q = buildRatingQuestion(games);
    if (q) candidates.push({ question: q, score: questionScore(q, games) });
  }
  if (!askedDimensions.has("ageRestriction")) {
    const q = buildAgeRestrictionQuestion(games);
    if (q) candidates.push({ question: q, score: questionScore(q, games) });
  }

  // Mechanic and category can be asked repeatedly with different values
  const mechanicQ = buildMechanicQuestion(games, askedMechanics);
  if (mechanicQ) candidates.push({ question: mechanicQ, score: questionScore(mechanicQ, games) });

  const categoryQ = buildCategoryQuestion(games, askedCategories);
  if (categoryQ) candidates.push({ question: categoryQ, score: questionScore(categoryQ, games) });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return candidates[0].question;
}

export function applyAnswer(
  games: Game[],
  dimension: QuestionDimension,
  value: string
): Game[] {
  if (value.startsWith("__skip__")) return games;

  if (value.startsWith("__exclude__:")) {
    const name = value.slice(12);
    const filtered = applyOptionFilter(games, dimension, value);
    return filtered.length > 0 ? filtered : games;
  }

  const filtered = applyFilter(games, dimension, value);
  // Safety net: if filter removes everything, keep original set
  return filtered.length > 0 ? filtered : games;
}
