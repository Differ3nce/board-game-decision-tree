"use client";

import { useState, useEffect, FormEvent, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import {
  getRecentUsernames,
  getCacheTimestamp,
  invalidateCache,
  removeFromRecent,
} from "@/lib/cache";

function formatAge(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 60) return "just now";
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "1 day ago" : `${days} days ago`;
}

export default function UsernameForm() {
  const [inputValue, setInputValue] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [recents, setRecents] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    setRecents(getRecentUsernames());
  }, []);

  const addUser = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (users.some((u) => u.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }
    setUsers((prev) => [...prev, trimmed]);
    setInputValue("");
    setError("");
  };

  const removeUser = (name: string) =>
    setUsers((prev) => prev.filter((u) => u !== name));

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addUser(inputValue);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const allUsers = [...users];
    const trimmed = inputValue.trim();
    if (trimmed && !allUsers.some((u) => u.toLowerCase() === trimmed.toLowerCase())) {
      allUsers.push(trimmed);
    }
    if (allUsers.length === 0) {
      setError("Please enter at least one BGG username.");
      return;
    }
    setError("");
    router.push(`/session?username=${encodeURIComponent(allUsers.join(","))}`);
  };

  const handleRefreshCache = (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    invalidateCache(username);
    setRecents([...getRecentUsernames()]); // force re-render to update age labels
  };

  const handleRemoveRecent = (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeFromRecent(username);
    setRecents(getRecentUsernames());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="username"
          className="block text-sm font-semibold text-wood-800 uppercase tracking-wider"
        >
          BoardGameGeek {users.length > 1 ? "Usernames" : "Username"}
        </label>

        {/* Active user chips */}
        {users.length > 0 && (
          <div className="flex flex-wrap gap-2 p-2 rounded-lg border border-wood-400 bg-wood-400/10">
            {users.map((u) => (
              <span
                key={u}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-wood-600 text-cream rounded-full text-sm font-medium"
              >
                {u}
                <button
                  type="button"
                  onClick={() => removeUser(u)}
                  className="hover:opacity-70 transition-opacity leading-none"
                  aria-label={`Remove ${u}`}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input row */}
        <div className="flex gap-2">
          <input
            id="username"
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={users.length > 0 ? "Add another username…" : "e.g. Laivindur"}
            className="flex-1 px-4 py-3 border-2 border-wood-400 rounded-lg bg-cream text-ink placeholder-wood-400 focus:outline-none focus:border-wood-800 transition-colors text-lg"
            autoComplete="off"
            autoCapitalize="none"
          />
          {/* Show Add button only when there's already at least one user queued */}
          {users.length > 0 && (
            <button
              type="button"
              onClick={() => addUser(inputValue)}
              className="px-4 py-3 border-2 border-wood-400 text-wood-800 font-semibold rounded-lg hover:bg-wood-400/10 transition-colors whitespace-nowrap"
            >
              + Add
            </button>
          )}
        </div>

        {error && <p className="text-red-700 text-sm">{error}</p>}
      </div>

      <button
        type="submit"
        className="w-full py-3 bg-felt-500 text-cream font-bold rounded-lg text-lg hover:opacity-90 transition-opacity shadow-md"
      >
        {users.length > 1 ? "Find Our Game →" : "Find My Game →"}
      </button>

      {/* Recent accounts */}
      {recents.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-wood-400 uppercase tracking-wider text-left">
            Recent accounts
          </p>
          <div className="space-y-1.5">
            {recents.map((u) => {
              const ts = getCacheTimestamp(u);
              const alreadyAdded = users.some(
                (existing) => existing.toLowerCase() === u.toLowerCase()
              );
              return (
                <div
                  key={u}
                  className="flex items-center justify-between px-3 py-2 rounded-lg border border-wood-400/40 bg-cream hover:bg-wood-400/10 transition-colors group"
                >
                  <button
                    type="button"
                    onClick={() => addUser(u)}
                    disabled={alreadyAdded}
                    className="flex-1 text-left flex items-center gap-2 disabled:opacity-50"
                  >
                    <span className="font-medium text-ink">{u}</span>
                    {ts ? (
                      <span className="text-xs text-ink/40">{formatAge(ts)}</span>
                    ) : (
                      <span className="text-xs text-ink/40">no cache</span>
                    )}
                    {alreadyAdded && (
                      <span className="text-xs text-wood-400">✓ added</span>
                    )}
                  </button>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {ts && (
                      <button
                        type="button"
                        title="Clear cache — will re-fetch from BGG"
                        onClick={(e) => handleRefreshCache(u, e)}
                        className="p-1 text-wood-400 hover:text-wood-800 transition-colors text-sm"
                      >
                        🔄
                      </button>
                    )}
                    <button
                      type="button"
                      title="Remove from recents"
                      onClick={(e) => handleRemoveRecent(u, e)}
                      className="p-1 text-wood-400 hover:text-red-600 transition-colors text-sm"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </form>
  );
}
