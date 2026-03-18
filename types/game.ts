// Raw shape from BGG /collection API
export interface BGGCollectionItem {
  id: string;
  name: string;
  yearPublished: number | undefined;
  image: string;
  thumbnail: string;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime: number;
  maxPlayTime: number;
  userRating: number | undefined;
  communityRating: number | undefined;
  numRatings: number;
}

// Enriched game after merging collection + thing details
export interface Game {
  id: string;
  name: string;
  yearPublished: number | undefined;
  image: string;
  thumbnail: string;
  minPlayers: number;
  maxPlayers: number;
  minPlayTime: number;
  maxPlayTime: number;
  bestPlayerCounts: number[];  // BGG community "Best" player counts (empty = unknown)
  recommendedAge: number;      // BGG community recommended minimum age, 0 = unknown
  userRating: number | undefined;
  communityRating: number | undefined;
  numRatings: number;
  mechanics: string[];
  categories: string[];
  weight: number; // BGG average weight (complexity), 0 if unknown
  description: string;
}

export type QuestionDimension =
  | "playerCount"
  | "playTime"
  | "complexity"
  | "mechanic"
  | "category"
  | "rating"
  | "ageRestriction";

export interface QuestionOption {
  label: string;
  value: string;
}

export interface SliderConfig {
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  format?: "minutes" | "count";
  range?: boolean;
  defaultMin?: number;
  defaultMax?: number;
}

export interface Question {
  dimension: QuestionDimension;
  text: string;
  options: QuestionOption[];
  type?: "choice" | "slider" | "mechanic-multi";
  sliderConfig?: SliderConfig;
}

export interface Answer {
  dimension: QuestionDimension;
  value: string;
}

export type SessionStatus =
  | "idle"
  | "loading"
  | "questioning"
  | "result"
  | "error";

export interface LoadingProgress {
  stage: "collection" | "details";
  fetched: number;
  total: number;
  username?: string;   // which user is currently being loaded
  fromCache?: boolean; // true when this user was served from localStorage
}

export interface SessionState {
  username: string;
  games: Game[];
  remaining: Game[];
  answers: Answer[];
  askedDimensions: Set<QuestionDimension>;
  status: SessionStatus;
  loadingProgress: LoadingProgress | null;
  error: string | null;
}

export type SessionAction =
  | { type: "START_LOADING"; username: string }
  | { type: "SET_LOADING_PROGRESS"; progress: LoadingProgress }
  | { type: "COLLECTION_LOADED"; games: Game[] }
  | { type: "ANSWER_GIVEN"; answers: Answer[]; remaining: Game[] }
  | { type: "SHOW_RESULT" }
  | { type: "SET_ERROR"; error: string }
  | { type: "RESET" };
