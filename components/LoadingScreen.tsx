import type { LoadingProgress } from "@/types/game";

interface Props {
  progress: LoadingProgress | null;
}

export default function LoadingScreen({ progress }: Props) {
  const isCollection = !progress || progress.stage === "collection";
  const pct =
    progress && progress.total > 0
      ? Math.round((progress.fetched / progress.total) * 100)
      : 0;

  const user = progress?.username ? ` for ${progress.username}` : "";

  let stageLabel: string;
  if (!progress) {
    stageLabel = "Fetching your collection from BGG…";
  } else if (progress.fromCache) {
    stageLabel = `Loaded${user} from cache ✓`;
  } else if (isCollection) {
    stageLabel = `Fetching collection${user} from BGG…`;
  } else {
    stageLabel = `Loading game details${user}… (${progress.fetched} / ${progress.total})`;
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-cream">
      <div className="max-w-sm w-full space-y-6 text-center">
        <div className="text-5xl animate-spin select-none">🎲</div>
        <h2 className="text-2xl font-bold text-wood-800">Loading your collection</h2>
        <p className="text-wood-600 text-sm">{stageLabel}</p>
        {!progress?.fromCache && isCollection && (
          <p className="text-xs text-wood-400">
            BGG sometimes takes a moment to prepare data — hang tight!
          </p>
        )}
        {!progress?.fromCache && !isCollection && progress && progress.total > 0 && (
          <div className="w-full bg-wood-400/30 rounded-full h-3 overflow-hidden">
            <div
              className="h-3 bg-felt-500 rounded-full transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}
      </div>
    </main>
  );
}
