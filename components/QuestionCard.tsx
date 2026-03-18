"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Answer, Question, QuestionDimension } from "@/types/game";

interface Props {
  question: Question;
  remaining: number;
  onAnswer: (answers: Answer[]) => void;
  onShowGames: () => void;
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
  onShowGames,
}: {
  question: Question;
  onAnswer: (answers: Answer[]) => void;
  onShowGames: () => void;
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
        onClick={() => onAnswer([{ dimension: question.dimension, value: String(value) }])}
        className="w-full py-4 px-5 rounded-xl bg-wood-600 text-cream font-semibold text-lg hover:bg-wood-800 transition-all shadow-sm"
      >
        That works for me!
      </button>
      <SkipFooter
        dimension={question.dimension}
        onAnswer={onAnswer}
        onShowGames={onShowGames}
      />
    </div>
  );
}

function SkipFooter({
  dimension,
  onAnswer,
  onShowGames,
  hideSkip = false,
}: {
  dimension: QuestionDimension;
  onAnswer: (answers: Answer[]) => void;
  onShowGames: () => void;
  hideSkip?: boolean;
}) {
  return (
    <div className="flex justify-between items-center pt-1">
      {!hideSkip ? (
        <button
          onClick={() => onAnswer([{ dimension, value: "__skip__" }])}
          className="text-sm text-ink/50 hover:text-ink/80 transition-colors"
        >
          No preference
        </button>
      ) : (
        <span />
      )}
      <button
        onClick={onShowGames}
        className="text-sm text-wood-600 hover:text-wood-800 font-medium transition-colors"
      >
        See remaining games →
      </button>
    </div>
  );
}

function MultiMechanicQuestion({
  question,
  onAnswer,
  onShowGames,
}: {
  question: Question;
  onAnswer: (answers: Answer[]) => void;
  onShowGames: () => void;
}) {
  const [selections, setSelections] = useState<Record<string, "love" | "hate" | null>>({});

  const toggle = (mechanic: string, sentiment: "love" | "hate") => {
    setSelections((prev) => ({
      ...prev,
      [mechanic]: prev[mechanic] === sentiment ? null : sentiment,
    }));
  };

  const handleSubmit = () => {
    const answers: Answer[] = [];
    for (const [mechanic, sentiment] of Object.entries(selections)) {
      if (sentiment === "love") answers.push({ dimension: "mechanic", value: mechanic });
      if (sentiment === "hate") answers.push({ dimension: "mechanic", value: `__exclude__:${mechanic}` });
    }
    // Always dispatch at least a skip so the dimension is marked as asked
    onAnswer(answers.length > 0 ? answers : [{ dimension: "mechanic", value: "__skip__" }]);
  };

  return (
    <div className="space-y-3">
      {question.options.map((opt) => {
        const sel = selections[opt.value] ?? null;
        return (
          <div
            key={opt.value}
            className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border-2 border-wood-400/30 bg-cream"
          >
            <span className="font-medium text-ink">{opt.label}</span>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => toggle(opt.value, "love")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  sel === "love"
                    ? "bg-green-600 text-white"
                    : "bg-wood-400/20 text-ink hover:bg-green-100"
                }`}
              >
                👍 Love
              </button>
              <button
                onClick={() => toggle(opt.value, "hate")}
                className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
                  sel === "hate"
                    ? "bg-red-500 text-white"
                    : "bg-wood-400/20 text-ink hover:bg-red-100"
                }`}
              >
                👎 Hate
              </button>
            </div>
          </div>
        );
      })}
      <button
        onClick={handleSubmit}
        className="w-full py-4 px-5 rounded-xl bg-wood-600 text-cream font-semibold text-lg hover:bg-wood-800 transition-all shadow-sm mt-2"
      >
        Continue
      </button>
      <SkipFooter
        dimension={question.dimension}
        onAnswer={onAnswer}
        onShowGames={onShowGames}
      />
    </div>
  );
}

export default function QuestionCard({ question, remaining, onAnswer, onShowGames }: Props) {
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
            <SliderQuestion question={question} onAnswer={onAnswer} onShowGames={onShowGames} />
          ) : question.type === "mechanic-multi" ? (
            <MultiMechanicQuestion question={question} onAnswer={onAnswer} onShowGames={onShowGames} />
          ) : (
            <div className="grid gap-3">
              {question.options.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onAnswer([{ dimension: question.dimension, value: opt.value }])}
                  className="w-full py-4 px-5 text-left rounded-xl border-2 border-wood-400 bg-cream text-ink font-medium hover:border-wood-800 hover:bg-wood-400/10 transition-all shadow-sm text-lg"
                >
                  {opt.label}
                </button>
              ))}
              <SkipFooter
                dimension={question.dimension}
                onAnswer={onAnswer}
                onShowGames={onShowGames}
                hideSkip={question.options.some((o) => o.value.startsWith("__skip__"))}
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </main>
  );
}
