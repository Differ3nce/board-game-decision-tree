"use client";

import { useReducer, useEffect, useCallback, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { sessionReducer, initialState } from "@/lib/session-reducer";
import { getNextQuestion, applyAnswer } from "@/lib/decision-engine";
import { getCachedGames, setCachedGames } from "@/lib/cache";
import type { Answer, BGGCollectionItem, Game, LoadingProgress } from "@/types/game";
import LoadingScreen from "@/components/LoadingScreen";
import QuestionCard from "@/components/QuestionCard";
import ResultScreen from "@/components/ResultScreen";
import OfferStopCard from "@/components/OfferStopCard";

const BATCH_SIZE = 20;
const OFFER_THRESHOLD = 3;

/** Fetch one user's games from BGG: collection metadata + thing details. */
async function fetchUserGames(
  username: string,
  onProgress: (p: LoadingProgress) => void
): Promise<Game[]> {
  // 1. Collection metadata
  onProgress({ stage: "collection", fetched: 0, total: 0, username });
  const colRes = await fetch(
    `/api/collection?username=${encodeURIComponent(username)}`
  );
  const colData = await colRes.json();
  if (!colRes.ok) {
    throw new Error(colData.error ?? `Failed to load collection for ${username}.`);
  }
  const items = colData.items as BGGCollectionItem[];

  // 2. Game details in batches
  const allIds = items.map((i) => i.id);
  const batches: string[][] = [];
  for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
    batches.push(allIds.slice(i, i + BATCH_SIZE));
  }

  const games: Game[] = [];
  let fetched = 0;

  for (const batch of batches) {
    onProgress({ stage: "details", fetched, total: allIds.length, username });
    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: batch, collectionItems: items }),
      });
      const data = await res.json();
      games.push(...(data.games as Game[]));
    } catch {
      // Non-fatal: continue with partial data
    }
    fetched += batch.length;
  }

  onProgress({ stage: "details", fetched: allIds.length, total: allIds.length, username });
  return games;
}

function SessionContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Support comma-separated usernames: ?username=Alice,Bob
  const usernames = (searchParams.get("username") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const displayName = usernames.join(" & ");

  const [state, dispatch] = useReducer(sessionReducer, {
    ...initialState,
    username: displayName,
  });

  const [keepGoingThreshold, setKeepGoingThreshold] = useState(0);

  const loadCollection = useCallback(async () => {
    if (usernames.length === 0) {
      router.push("/");
      return;
    }

    dispatch({ type: "START_LOADING", username: displayName });

    const allGames: Game[] = [];

    for (const username of usernames) {
      // Cache-first: skip BGG API entirely if data is fresh
      const cached = getCachedGames(username);
      if (cached) {
        dispatch({
          type: "SET_LOADING_PROGRESS",
          progress: { stage: "details", fetched: cached.length, total: cached.length, username, fromCache: true },
        });
        allGames.push(...cached);
        continue;
      }

      // Cache miss: fetch from BGG
      try {
        const games = await fetchUserGames(username, (progress) =>
          dispatch({ type: "SET_LOADING_PROGRESS", progress })
        );

        if (games.length > 0) {
          setCachedGames(username, games);
          allGames.push(...games);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : `Failed to load ${username}.`;
        dispatch({ type: "SET_ERROR", error: message });
        return;
      }
    }

    if (allGames.length === 0) {
      dispatch({
        type: "SET_ERROR",
        error: "Could not load any game details. Please try again.",
      });
      return;
    }

    // Deduplicate by game ID (same game in multiple collections)
    const uniqueGames = Array.from(
      new Map(allGames.map((g) => [g.id, g])).values()
    );

    dispatch({ type: "COLLECTION_LOADED", games: uniqueGames });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.get("username"), router]);

  useEffect(() => {
    loadCollection();
  }, [loadCollection]);

  const handleAnswer = (answers: Answer[]) => {
    let remaining = state.remaining;
    for (const answer of answers) {
      remaining = applyAnswer(remaining, answer.dimension, answer.value);
    }
    dispatch({ type: "ANSWER_GIVEN", answers, remaining });
  };

  const handleReset = () => router.push("/");
  const handleShowGames = () => dispatch({ type: "SHOW_RESULT" });
  const handleBackToQuestions = () => dispatch({ type: "BACK_TO_QUESTIONS" });

  if (state.status === "error") {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-cream">
        <div className="max-w-md text-center space-y-4">
          <h2 className="text-2xl font-bold text-wood-800">Something went wrong</h2>
          <p className="text-ink">{state.error}</p>
          <button
            onClick={handleReset}
            className="px-6 py-3 bg-wood-600 text-cream rounded-lg font-semibold hover:bg-wood-800 transition-colors"
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  if (state.status === "loading") {
    return <LoadingScreen progress={state.loadingProgress} />;
  }

  if (state.status === "result") {
    const sorted = [...state.remaining].sort(
      (a, b) => (b.communityRating ?? 0) - (a.communityRating ?? 0)
    );
    return <ResultScreen games={sorted} onReset={handleReset} onBackToQuestions={handleBackToQuestions} />;
  }

  if (state.status === "questioning") {
    const { remaining } = state;

    const shouldOffer =
      remaining.length <= OFFER_THRESHOLD &&
      remaining.length > keepGoingThreshold;

    if (shouldOffer) {
      return (
        <OfferStopCard
          remaining={remaining.length}
          onShowResults={() => dispatch({ type: "SHOW_RESULT" })}
          onKeepGoing={() => setKeepGoingThreshold(remaining.length - 1)}
        />
      );
    }

    const question = getNextQuestion(state.remaining, state.askedDimensions, state.answers);

    if (!question) {
      const sorted = [...state.remaining].sort(
        (a, b) => (b.communityRating ?? 0) - (a.communityRating ?? 0)
      );
      return <ResultScreen games={sorted} onReset={handleReset} />;
    }

    return (
      <QuestionCard
        key={question.dimension + question.text}
        question={question}
        remaining={state.remaining.length}
        onAnswer={handleAnswer}
        onShowGames={handleShowGames}
      />
    );
  }

  return null;
}

export default function SessionPage() {
  return (
    <Suspense fallback={<LoadingScreen progress={null} />}>
      <SessionContent />
    </Suspense>
  );
}
