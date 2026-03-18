import type { Game } from "@/types/game";
import GameCard from "./GameCard";

interface Props {
  games: Game[];
  onReset: () => void;
}

export default function ResultScreen({ games, onReset }: Props) {
  const isSingle = games.length === 1;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-cream">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center space-y-2">
          <div className="text-5xl">{isSingle ? "🎉" : "🎲"}</div>
          <h2 className="text-2xl font-bold text-wood-800">
            {isSingle
              ? "Tonight you're playing:"
              : "Your top picks for tonight:"}
          </h2>
        </div>

        <div className="space-y-3">
          {games.map((game) => (
            <GameCard key={game.id} game={game} />
          ))}
        </div>

        <button
          onClick={onReset}
          className="w-full py-3 border-2 border-wood-400 text-wood-800 font-semibold rounded-lg hover:bg-wood-400/10 transition-colors"
        >
          ← Start over
        </button>
      </div>
    </main>
  );
}
