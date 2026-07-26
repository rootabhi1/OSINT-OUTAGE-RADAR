import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const uuid = req.nextUrl.searchParams.get("uuid");

  if (!token || !accountId || !uuid) {
    return NextResponse.json({ error: "Missing configuration or uuid" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/urlscanner/v2/screenshots/${uuid}.png?resolution=desktop`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json({ error: `Screenshot not available (${res.status})` }, { status: res.status });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=3600" },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch screenshot." },
      { status: 502 }
    );
  }
}
