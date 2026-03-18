import Image from "next/image";
import type { Game } from "@/types/game";

interface Props {
  game: Game;
}

function complexityLabel(weight: number): string {
  if (weight === 0) return "—";
  if (weight <= 2.0) return "Light";
  if (weight <= 3.5) return "Medium";
  return "Heavy";
}

function complexityColor(weight: number): string {
  if (weight === 0) return "bg-wood-400/30 text-wood-800";
  if (weight <= 2.0) return "bg-green-100 text-green-800";
  if (weight <= 3.5) return "bg-yellow-100 text-yellow-800";
  return "bg-red-100 text-red-800";
}

export default function GameCard({ game }: Props) {
  const bggUrl = `https://boardgamegeek.com/boardgame/${game.id}`;

  return (
    <a
      href={bggUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex flex-col gap-3 p-4 rounded-xl border-2 border-wood-400 bg-cream hover:border-wood-800 transition-colors shadow-sm"
    >
      <div className="flex gap-4">
        <div className="flex-shrink-0 relative w-20 h-20 rounded-lg overflow-hidden bg-wood-400/20">
          {game.thumbnail ? (
            <Image
              src={game.thumbnail}
              alt={game.name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-3xl">🎲</span>
          )}
        </div>

        <div className="flex-1 min-w-0 space-y-1">
          <h3 className="font-bold text-ink text-lg leading-tight truncate">{game.name}</h3>
          {game.yearPublished && (
            <p className="text-wood-600 text-sm">{game.yearPublished}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-wood-400/20 text-wood-800">
              {game.minPlayers === game.maxPlayers
                ? `${game.minPlayers}p`
                : `${game.minPlayers}–${game.maxPlayers}p`}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-wood-400/20 text-wood-800">
              {game.minPlayTime === game.maxPlayTime
                ? `${game.minPlayTime} min`
                : `${game.minPlayTime}–${game.maxPlayTime} min`}
            </span>
            <span className={`px-2 py-0.5 rounded-full ${complexityColor(game.weight)}`}>
              {complexityLabel(game.weight)}
            </span>
            {game.communityRating !== undefined && (
              <span className="px-2 py-0.5 rounded-full bg-felt-500/10 text-felt-500 font-semibold">
                ★ {game.communityRating.toFixed(1)}
              </span>
            )}
          </div>
        </div>
      </div>

      {game.description && (
        <p className="text-sm text-ink/70 leading-snug line-clamp-3">
          {game.description}
        </p>
      )}
    </a>
  );
}
