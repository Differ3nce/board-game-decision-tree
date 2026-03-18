import type { Game, QuestionDimension } from "@/types/game";

export function filterByPlayerCount(games: Game[], count: number): Game[] {
  return games.filter((g) => {
    // Use BGG community "Best" counts if the community voted enough to establish them
    if (g.bestPlayerCounts.length > 0) {
      return g.bestPlayerCounts.includes(count);
    }
    // Fallback: use the min/max range from the game itself
    return count >= g.minPlayers && count <= g.maxPlayers;
  });
}

/**
 * Filter games by a target play duration in minutes.
 * A game fits if its play-time range overlaps the target (±30% tolerance).
 */
export function filterByPlayTime(games: Game[], targetMinutes: number): Game[] {
  return games.filter((g) => {
    const gMin = g.minPlayTime || 0;
    const gMax = g.maxPlayTime || g.minPlayTime || 0;
    if (gMin === 0 && gMax === 0) return true; // unknown play time always passes
    // Game's max should be within 130% of target (won't drag on forever)
    // Game's min should be at least 40% of target (won't be trivially short)
    return gMin <= targetMinutes * 1.3 && gMax >= targetMinutes * 0.4;
  });
}

type ComplexityTier = "filler" | "light" | "medium" | "heavy" | "expert";

export function filterByComplexity(games: Game[], tier: string): Game[] {
  return games.filter((g) => {
    if (g.weight === 0) return true; // unknown weight passes all
    switch (tier as ComplexityTier) {
      case "filler": return g.weight <= 1.5;
      case "light":  return g.weight > 1.5 && g.weight <= 2.5;
      case "medium": return g.weight > 2.5 && g.weight <= 3.5;
      case "heavy":  return g.weight > 3.5 && g.weight <= 4.2;
      case "expert": return g.weight > 4.2;
    }
  });
}

export function filterByMechanic(games: Game[], mechanic: string): Game[] {
  const lower = mechanic.toLowerCase();
  return games.filter((g) =>
    g.mechanics.some((m) => m.toLowerCase().includes(lower))
  );
}

export function excludeByMechanic(games: Game[], mechanic: string): Game[] {
  const lower = mechanic.toLowerCase();
  return games.filter((g) =>
    !g.mechanics.some((m) => m.toLowerCase().includes(lower))
  );
}

export function filterByCategory(games: Game[], category: string): Game[] {
  const lower = category.toLowerCase();
  return games.filter((g) =>
    g.categories.some((c) => c.toLowerCase().includes(lower))
  );
}

export function excludeByCategory(games: Game[], category: string): Game[] {
  const lower = category.toLowerCase();
  return games.filter((g) =>
    !g.categories.some((c) => c.toLowerCase().includes(lower))
  );
}

export function filterByRating(games: Game[], minRating: number): Game[] {
  return games.filter(
    (g) => g.communityRating !== undefined && g.communityRating >= minRating
  );
}

/**
 * Filter by recommended age: keep games appropriate for the youngest player.
 * Games with unknown recommended age (0) always pass.
 */
export function filterByAgeRestriction(games: Game[], maxAge: number): Game[] {
  return games.filter(
    (g) => g.recommendedAge === 0 || g.recommendedAge <= maxAge
  );
}

export function applyFilter(
  games: Game[],
  dimension: QuestionDimension,
  value: string
): Game[] {
  switch (dimension) {
    case "playerCount":
      return filterByPlayerCount(games, parseInt(value, 10));
    case "playTime":
      return filterByPlayTime(games, parseFloat(value));
    case "complexity":
      return filterByComplexity(games, value);
    case "mechanic":
      return filterByMechanic(games, value);
    case "category":
      return filterByCategory(games, value);
    case "rating":
      return filterByRating(games, parseFloat(value));
    case "ageRestriction":
      return filterByAgeRestriction(games, parseInt(value, 10));
  }
}
