import { NextRequest, NextResponse } from "next/server";
import { buildCollectionUrl, fetchBGGWithRetry } from "@/lib/bgg-client";
import { parseCollection } from "@/lib/bgg-parser";

export const dynamic = "force-dynamic";

const VALID_USERNAME = /^[a-zA-Z0-9_-]+$/;

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username")?.trim();

  if (!username || !VALID_USERNAME.test(username)) {
    return NextResponse.json(
      { error: "Invalid or missing username." },
      { status: 400 }
    );
  }

  try {
    const url = buildCollectionUrl(username);
    const xml = await fetchBGGWithRetry(url);
    const items = parseCollection(xml);

    if (items.length === 0) {
      return NextResponse.json(
        {
          error:
            "No owned board games found. Make sure your games are marked as 'owned' on BoardGameGeek.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({ items, total: items.length });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
