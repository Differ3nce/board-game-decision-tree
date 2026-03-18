import { XMLParser } from "fast-xml-parser";
import type { BGGCollectionItem, Game } from "@/types/game";

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'",
  nbsp: "\u00A0", mdash: "\u2014", ndash: "\u2013", hellip: "\u2026",
  ldquo: "\u201C", rdquo: "\u201D", lsquo: "\u2018", rsquo: "\u2019",
  eacute: "\u00E9", egrave: "\u00E8", ecirc: "\u00EA", euml: "\u00EB",
  aacute: "\u00E1", agrave: "\u00E0", acirc: "\u00E2", auml: "\u00E4", atilde: "\u00E3",
  oacute: "\u00F3", ograve: "\u00F2", ocirc: "\u00F4", ouml: "\u00F6",
  uacute: "\u00FA", ugrave: "\u00F9", ucirc: "\u00FB", uuml: "\u00FC",
  iacute: "\u00ED", igrave: "\u00EC", icirc: "\u00EE", iuml: "\u00EF",
  ntilde: "\u00F1", ccedil: "\u00E7", szlig: "\u00DF",
};

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&#x([0-9a-fA-F]+);/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match);
}

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "_",
  isArray: (name) =>
    ["item", "link", "rank", "poll", "results", "result"].includes(name),
});

function ensureHttps(url: string | undefined): string {
  if (!url) return "";
  if (url.startsWith("//")) return `https:${url}`;
  return url;
}

function parseName(nameField: unknown): string {
  let raw = "";
  if (typeof nameField === "string") raw = nameField;
  else if (typeof nameField === "object" && nameField !== null) {
    const obj = nameField as Record<string, unknown>;
    if (typeof obj["#text"] === "string") raw = obj["#text"];
    else if (typeof obj["_value"] === "string") raw = obj["_value"];
  }
  return decodeHtmlEntities(raw);
}

function parseFloat2(val: unknown): number | undefined {
  const n = parseFloat(String(val));
  return isNaN(n) ? undefined : n;
}

function parseInt2(val: unknown): number {
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

export function parseCollection(xml: string): BGGCollectionItem[] {
  const doc = parser.parse(xml);
  const items: unknown[] = doc?.items?.item ?? [];

  return items.map((raw: unknown) => {
    const item = raw as Record<string, unknown>;
    const stats = item.stats as Record<string, unknown> | undefined;
    const rating = (stats?.rating as Record<string, unknown>) ?? {};
    const ranks = (rating.ranks as Record<string, unknown[]> | undefined)
      ?.rank ?? [];

    const communityRatingVal = (rating as Record<string, unknown>)
      ._value as string;
    const userRatingVal = (rating as Record<string, unknown>)
      ._value as string;

    // community rating lives in stats.rating.average._value
    const avgRating = (
      (stats?.rating as Record<string, unknown>)?.average as
        | Record<string, unknown>
        | undefined
    )?._value;

    return {
      id: String(item._objectid),
      name: parseName(item.name),
      yearPublished: parseInt2(
        (item.yearpublished as Record<string, unknown>)?._value ??
          item.yearpublished
      ) || undefined,
      image: ensureHttps(item.image as string),
      thumbnail: ensureHttps(item.thumbnail as string),
      minPlayers: parseInt2(stats?._minplayers),
      maxPlayers: parseInt2(stats?._maxplayers),
      minPlayTime: parseInt2(stats?._minplaytime),
      maxPlayTime: parseInt2(stats?._maxplaytime),
      userRating: parseFloat2(userRatingVal) !== undefined
        ? parseFloat2(userRatingVal)
        : undefined,
      communityRating: parseFloat2(avgRating),
      numRatings: parseInt2(
        (
          (stats?.rating as Record<string, unknown>)
            ?.usersrated as Record<string, unknown>
        )?._value
      ),
    } satisfies BGGCollectionItem;
  });
}

/** Parse the suggested_numplayers poll and return player counts rated "Best" */
function parseBestPlayerCounts(polls: unknown[]): number[] {
  const poll = polls.find(
    (p) => (p as Record<string, unknown>)._name === "suggested_numplayers"
  );
  if (!poll) return [];

  const results: unknown[] =
    (poll as Record<string, unknown>).results as unknown[] ?? [];
  const bestCounts: number[] = [];

  for (const r of results) {
    const res = r as Record<string, unknown>;
    const numPlayersStr = String(res._numplayers ?? "");
    const numPlayers = parseInt(numPlayersStr, 10);
    if (isNaN(numPlayers)) continue; // skip "3+" style entries

    const resultItems: unknown[] = (res.result as unknown[]) ?? [];
    let bestVotes = 0;
    let notRecVotes = 0;

    for (const ri of resultItems) {
      const it = ri as Record<string, unknown>;
      const value = String(it._value ?? "");
      const votes = parseInt(String(it._numvotes ?? "0"), 10);
      if (value === "Best") bestVotes = votes;
      if (value === "Not Recommended") notRecVotes = votes;
    }

    if (bestVotes > 0 && bestVotes >= notRecVotes) {
      bestCounts.push(numPlayers);
    }
  }

  return bestCounts;
}

/** Parse the suggested_playerage poll and return the age with the most votes */
function parseRecommendedAge(polls: unknown[]): number {
  const poll = polls.find(
    (p) => (p as Record<string, unknown>)._name === "suggested_playerage"
  );
  if (!poll) return 0;

  const results: unknown[] =
    (poll as Record<string, unknown>).results as unknown[] ?? [];

  let bestAge = 0;
  let bestVotes = 0;

  for (const r of results) {
    const res = r as Record<string, unknown>;
    const resultItems: unknown[] = (res.result as unknown[]) ?? [];

    for (const ri of resultItems) {
      const it = ri as Record<string, unknown>;
      const age = parseInt(String(it._value ?? "0"), 10);
      const votes = parseInt(String(it._numvotes ?? "0"), 10);
      if (!isNaN(age) && votes > bestVotes) {
        bestVotes = votes;
        bestAge = age;
      }
    }
  }

  return bestAge;
}

export function parseGameDetails(
  xml: string,
  collectionItems: BGGCollectionItem[]
): Game[] {
  const doc = parser.parse(xml);
  const items: unknown[] = doc?.items?.item ?? [];

  const collectionMap = new Map(collectionItems.map((c) => [c.id, c]));

  return items.flatMap((raw: unknown) => {
    const item = raw as Record<string, unknown>;
    const id = String(item._id);
    const col = collectionMap.get(id);
    if (!col) return [];

    const links: unknown[] = (item.link as unknown[]) ?? [];
    const mechanics = links
      .filter(
        (l) =>
          (l as Record<string, unknown>)._type === "boardgamemechanic"
      )
      .map((l) =>
        decodeHtmlEntities(String((l as Record<string, unknown>)._value))
      );
    const categories = links
      .filter(
        (l) =>
          (l as Record<string, unknown>)._type === "boardgamecategory"
      )
      .map((l) =>
        decodeHtmlEntities(String((l as Record<string, unknown>)._value))
      );

    const stats = item.statistics as Record<string, unknown> | undefined;
    const ratings = stats?.ratings as Record<string, unknown> | undefined;
    const weight = parseFloat2(
      (ratings?.averageweight as Record<string, unknown>)?._value
    ) ?? 0;

    const communityRating =
      parseFloat2(
        (ratings?.average as Record<string, unknown>)?._value
      ) ?? col.communityRating;

    const rawDescription = typeof item.description === "string" ? item.description : "";
    const description = decodeHtmlEntities(rawDescription)
      .replace(/<[^>]*>/g, "")
      .replace(/\s+/g, " ")
      .trim();

    const polls: unknown[] = (item.poll as unknown[]) ?? [];
    const bestPlayerCounts = parseBestPlayerCounts(polls);
    const recommendedAge = parseRecommendedAge(polls);

    return [
      {
        ...col,
        communityRating,
        mechanics,
        categories,
        weight,
        description,
        bestPlayerCounts,
        recommendedAge,
      } satisfies Game,
    ];
  });
}
