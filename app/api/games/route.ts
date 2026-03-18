import { NextRequest, NextResponse } from "next/server";
import { buildGamesUrl, fetchBGGWithRetry } from "@/lib/bgg-client";
import { parseGameDetails } from "@/lib/bgg-parser";
import type { BGGCollectionItem } from "@/types/game";

export const dynamic = "force-dynamic";

const BATCH_SIZE = 20;
const NUMERIC_ID = /^\d+$/;

export async function POST(req: NextRequest) {
  let body: { ids: string[]; collectionItems: BGGCollectionItem[] };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { ids, collectionItems } = body;

  if (!Array.isArray(ids) || !ids.every((id) => NUMERIC_ID.test(id))) {
    return NextResponse.json({ error: "Invalid game IDs." }, { status: 400 });
  }

  const games = [];
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    batches.push(ids.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const url = buildGamesUrl(batch);
      const xml = await fetchBGGWithRetry(url);
      const batchGames = parseGameDetails(xml, collectionItems);
      games.push(...batchGames);
    } catch {
      // Non-fatal: skip failed batch, continue with partial data
    }
  }

  return NextResponse.json({ games });
}
