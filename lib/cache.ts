/**
 * localStorage-based cache for BGG collection data.
 * Each user's games are stored under their lowercase username.
 * Data expires after CACHE_TTL_MS (7 days).
 */

import type { Game } from "@/types/game";

const CACHE_KEY = "bgg_cache_v1";
const RECENT_KEY = "bgg_recent_v1";
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const MAX_RECENT = 8;

interface UserCache {
  username: string; // original casing
  games: Game[];
  cachedAt: number; // Date.now() timestamp
}

type CacheStore = Record<string, UserCache>; // keyed by lowercase username

function readStore(): CacheStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CacheStore) : {};
  } catch {
    return {};
  }
}

function writeStore(store: CacheStore): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(store));
  } catch {
    // Storage full — clear and retry once
    try {
      localStorage.removeItem(CACHE_KEY);
      localStorage.setItem(CACHE_KEY, JSON.stringify(store));
    } catch {
      // Give up silently
    }
  }
}

/** Returns cached games if they exist and are within the TTL, otherwise null. */
export function getCachedGames(username: string): Game[] | null {
  const entry = readStore()[username.toLowerCase()];
  if (!entry) return null;
  if (Date.now() - entry.cachedAt > CACHE_TTL_MS) return null; // stale
  return entry.games;
}

/** Stores games in the cache and records the username in recents. */
export function setCachedGames(username: string, games: Game[]): void {
  const store = readStore();
  store[username.toLowerCase()] = { username, games, cachedAt: Date.now() };
  writeStore(store);
  addToRecent(username);
}

/** Removes a user's cached data, forcing a fresh fetch next time. */
export function invalidateCache(username: string): void {
  const store = readStore();
  delete store[username.toLowerCase()];
  writeStore(store);
}

/**
 * Returns the Unix timestamp (ms) when this user's data was last cached,
 * or null if there is no cache entry (fresh or stale).
 */
export function getCacheTimestamp(username: string): number | null {
  return readStore()[username.toLowerCase()]?.cachedAt ?? null;
}

/** Returns usernames in most-recently-used order. */
export function getRecentUsernames(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Removes a username from recents and wipes its cache. */
export function removeFromRecent(username: string): void {
  const recent = getRecentUsernames().filter(
    (u) => u.toLowerCase() !== username.toLowerCase()
  );
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent));
  } catch {}
  invalidateCache(username);
}

function addToRecent(username: string): void {
  const recent = getRecentUsernames().filter(
    (u) => u.toLowerCase() !== username.toLowerCase()
  );
  recent.unshift(username);
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
  } catch {}
}
