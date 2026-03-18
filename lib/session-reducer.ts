import type { SessionState, SessionAction } from "@/types/game";
import { RESULT_THRESHOLD } from "./decision-engine";

export const initialState: SessionState = {
  username: "",
  games: [],
  remaining: [],
  answers: [],
  askedDimensions: new Set(),
  status: "idle",
  loadingProgress: null,
  error: null,
};

export function sessionReducer(
  state: SessionState,
  action: SessionAction
): SessionState {
  switch (action.type) {
    case "START_LOADING":
      return {
        ...initialState,
        username: action.username,
        status: "loading",
        loadingProgress: { stage: "collection", fetched: 0, total: 0 },
      };

    case "SET_LOADING_PROGRESS":
      return { ...state, loadingProgress: action.progress };

    case "COLLECTION_LOADED":
      return {
        ...state,
        games: action.games,
        remaining: action.games,
        status: "questioning",
        loadingProgress: null,
      };

    case "ANSWER_GIVEN": {
      const newAsked = new Set(state.askedDimensions);
      // category can repeat; all other dimensions (including mechanic) are asked once
      for (const answer of action.answers) {
        if (answer.dimension !== "category") {
          newAsked.add(answer.dimension);
        }
      }
      const shouldEnd = action.remaining.length <= RESULT_THRESHOLD;
      return {
        ...state,
        remaining: action.remaining,
        answers: [...state.answers, ...action.answers],
        askedDimensions: newAsked,
        status: shouldEnd ? "result" : "questioning",
      };
    }

    case "SHOW_RESULT":
      return { ...state, status: "result" };

    case "BACK_TO_QUESTIONS":
      return { ...state, status: "questioning" };

    case "SET_ERROR":
      return { ...state, status: "error", error: action.error, loadingProgress: null };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}
