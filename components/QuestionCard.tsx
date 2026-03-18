"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Question, QuestionDimension } from "@/types/game";

interface Props {
  question: Question;
  remaining: number;
  onAnswer: (dimension: QuestionDimension, value: string) => void;
}

function formatMinutes(min: number): string {
  const hours = Math.floor(min / 60);
  const mins = min % 60;
  if (hours === 0) return `${min} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

function SliderQuestion({
  question,
  onAnswer,
}: {
  question: Question;
  onAnswer: (dimension: QuestionDimension, value: string) => void;
}) {
  const cfg = question.sliderConfig!;
  const [value, setValue] = useState(cfg.defaultValue);
  const displayValue = cfg.format === "count"
    ? `${value} player${value !== 1 ? "s" : ""}`
    : formatMinutes(value);

  return (
    <div className="space-y-8">
      <div className="text-center">
        <span className="text-5xl font-bold text-wood-800">
          {displayValue}
        </span>
      </div>

      <div className="space-y-2 px-1">
        <input
          type="range"
          min={cfg.min}
          max={cfg.max}
          step={cfg.step}
          value={value}
          onChange={(e) => setValue(Number(e.target.value))}
          className="w-full h-2 rounded-full accent-wood-600 cursor-pointer"
        />
        <div className="flex justify-between text-sm text-ink/40">
          <span>{cfg.format === "count" ? cfg.min : formatMinutes(cfg.min)}</span>
          <span>{cfg.format === "count" ? cfg.max : formatMinutes(cfg.max)}</span>
        </div>
      </div>

      <button
        onClick={() => onAnswer(question.dimension, String(value))}
        className="w-full py-4 px-5 rounded-xl bg-wood-600 text-cream font-semibold text-lg hover:bg-wood-800 transition-all shadow-sm"
      >
        That works for me!
      </button>
    </div>
  );
}

export default function QuestionCard({ question, remaining, onAnswer }: Props) {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 bg-cream">
      <AnimatePresence mode="wait">
        <motion.div
          key={question.dimension + question.text}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -40 }}
          transition={{ duration: 0.25 }}
          className="w-full max-w-lg space-y-6"
        >
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-wood-400 uppercase tracking-widest">
              {remaining} games remaining
            </p>
            <h2 className="text-2xl font-bold text-ink leading-snug">
              {question.text}
            </h2>
          </div>

          {question.type === "slider" ? (
            <SliderQuestion question={question} onAnswer={onAnswer} />
          ) : (
            <div className="grid gap-3">
              {question.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onAnswer(question.dimension, opt.value)}
                  className="w-full py-4 px-5 text-left rounded-xl border-2 border-wood-400 bg-cream text-ink font-medium hover:border-wood-800 hover:bg-wood-400/10 transition-all shadow-sm text-lg"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
