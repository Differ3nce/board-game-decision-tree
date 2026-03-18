const BGG_BASE = "https://boardgamegeek.com/xmlapi2";

export function buildCollectionUrl(username: string): string {
  const params = new URLSearchParams({
    username,
    stats: "1",
    own: "1",
    subtype: "boardgame",
    excludesubtype: "boardgameexpansion",
  });
  return `${BGG_BASE}/collection?${params}`;
}

export function buildGamesUrl(ids: string[]): string {
  return `${BGG_BASE}/thing?id=${ids.join(",")}&stats=1&type=boardgame`;
}

function bggHeaders(): HeadersInit {
  const token = process.env.BGG_API_TOKEN;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function fetchBGGWithRetry(
  url: string,
  maxAttempts = 8,
  delayMs = 4000
): Promise<string> {
  const headers = bggHeaders();

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(url, { cache: "no-store", headers });

    if (res.status === 202) {
      if (attempt === maxAttempts) {
        throw new Error("BGG is taking too long to respond. Please try again.");
      }
      await new Promise((r) => setTimeout(r, delayMs));
      continue;
    }

    if (res.status === 401) {
      throw new Error(
        "BGG API requires an authorization token. Set BGG_API_TOKEN in your environment. Register at boardgamegeek.com/using_the_xml_api"
      );
    }

    if (res.status === 404) {
      throw new Error("BGG user not found or collection is private.");
    }

    if (!res.ok) {
      throw new Error(`BGG API error: ${res.status}`);
    }

    return res.text();
  }

  throw new Error("BGG API: max retries exceeded");
}
