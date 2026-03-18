"use client";

import { motion } from "framer-motion";

interface Props {
  remaining: number;
  onShowResults: () => void;
  onKeepGoing: () => void;
}

export default function OfferStopCard({ remaining, onShowResults, onKeepGoing }: Props) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-cream">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
        className="w-full max-w-lg space-y-6 text-center"
      >
        <div className="space-y-2">
          <div className="text-5xl">🎯</div>
          <h2 className="text-2xl font-bold text-ink">
            Down to {remaining} {remaining === 1 ? "game" : "games"}!
          </h2>
          <p className="text-ink/60">
            Want to see {remaining === 1 ? "it" : "them"}, or keep narrowing it down?
          </p>
        </div>

        <div className="grid gap-3">
          <button
            onClick={onShowResults}
            className="w-full py-4 px-5 rounded-xl bg-wood-600 text-cream font-semibold text-lg hover:bg-wood-800 transition-all shadow-sm"
          >
            Show me the {remaining === 1 ? "game" : "games"}! 🎲
          </button>
          <button
            onClick={onKeepGoing}
            className="w-full py-4 px-5 text-left rounded-xl border-2 border-wood-400 bg-cream text-ink font-medium hover:border-wood-800 hover:bg-wood-400/10 transition-all shadow-sm text-lg"
          >
            Keep filtering →
          </button>
        </div>
      </motion.div>
    </main>
  );
}
