import { NextRequest, NextResponse } from "next/server";
import type { ScanResult } from "@/lib/types";

export const dynamic = "force-dynamic";

function apiBase(accountId: string) {
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/urlscanner/v2`;
}

function creds() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  return { token, accountId };
}

export async function POST(req: NextRequest) {
  const { token, accountId } = creds();
  if (!token || !accountId) {
    return NextResponse.json(
      {
        error:
          "URL Scanner isn't configured. Set CLOUDFLARE_API_TOKEN (with URL Scanner: Edit permission) and CLOUDFLARE_ACCOUNT_ID.",
      },
      { status: 501 }
    );
  }

  let url: string;
  try {
    const body = await req.json();
    url = body.url;
    if (!url || typeof url !== "string") throw new Error("missing url");
    new URL(url); // throws if invalid
  } catch {
    return NextResponse.json({ error: "Provide a valid, full URL (including https://)." }, { status: 400 });
  }

  try {
    const res = await fetch(`${apiBase(accountId)}/scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url, visibility: "Unlisted" }),
    });

    if (!res.ok) {
      const errJson = await res.json().catch(() => ({}));
      const msg =
        errJson?.errors?.[0]?.message ??
        errJson?.message ??
        `Cloudflare rejected the scan request (${res.status}).`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const json = await res.json();
    const uuid = json?.result?.uuid ?? json?.uuid;
    if (!uuid) {
      return NextResponse.json({ error: "Cloudflare didn't return a scan ID." }, { status: 502 });
    }
    return NextResponse.json({ uuid, status: "pending" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to submit scan." },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { token, accountId } = creds();
  const uuid = req.nextUrl.searchParams.get("uuid");
  if (!uuid) return NextResponse.json({ error: "Missing uuid" }, { status: 400 });

  if (!token || !accountId) {
    return NextResponse.json(
      { error: "URL Scanner isn't configured." },
      { status: 501 }
    );
  }

  try {
    const res = await fetch(`${apiBase(accountId)}/result/${uuid}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    if (res.status === 404) {
      return NextResponse.json<Partial<ScanResult>>({ status: "pending", uuid });
    }
    if (!res.ok) {
      return NextResponse.json<Partial<ScanResult>>(
        { status: "failed", uuid, error: `Cloudflare returned ${res.status}` },
        { status: 200 }
      );
    }

    const json = await res.json();
    const page = json?.page ?? {};
    const meta = json?.meta ?? {};

    // Technology detection lives under different keys depending on which
    // processor ran; try the common shapes defensively rather than assume one.
    const techRaw =
      meta?.processors?.wappalyzer?.data ?? meta?.technologies ?? meta?.tech ?? [];
    const technologies = Array.isArray(techRaw)
      ? techRaw
          .map((t: any) => ({
            name: t?.name ?? t?.app ?? String(t),
            category: t?.categories?.[0]?.name ?? t?.category,
          }))
          .filter((t: any) => t.name)
          .slice(0, 12)
      : [];

    const result: ScanResult = {
      status: "done",
      uuid,
      submittedUrl: json?.task?.url ?? page?.url ?? "",
      finalUrl: page?.url,
      verdictMalicious: json?.verdicts?.overall?.malicious ?? undefined,
      verdictCategories: json?.verdicts?.overall?.categories ?? [],
      screenshotUrl: `/api/scan/screenshot?uuid=${uuid}`,
      ip: page?.ip,
      asn: page?.asn ? Number(String(page.asn).replace(/^AS/i, "")) : undefined,
      asnName: page?.asnname ?? page?.asnName,
      country: page?.country,
      tlsIssuer: page?.tlsIssuer ?? page?.tlsIssue,
      technologies,
      reportUrl: json?.result ?? undefined,
    };
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json<Partial<ScanResult>>(
      { status: "failed", uuid, error: err instanceof Error ? err.message : "Failed to fetch scan result." }
    );
  }
}
