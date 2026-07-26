# Signal Loss — Critical Infrastructure Outage Radar

A live dashboard tracking internet outages, BGP hijacks/route leaks, DDoS
attack origins, and lets you investigate any URL directly — powered by the
free [Cloudflare Radar API](https://developers.cloudflare.com/radar/) and
[URL Scanner API](https://developers.cloudflare.com/radar/investigate/url-scanner/).
A rotating 3D globe (satellite imagery, real zoom/search) shows where each
event is; every entry is translated into a plain-language sentence — not raw
API jargon — plus a confidence badge (Cloudflare-confirmed vs.
automatically-detected).

**Three tabs:**
- **Outages** — confirmed outages + traffic anomalies by country
- **Threats** — BGP hijacks, route leaks, and top DDoS attack origin countries
- **Investigate** — paste any URL, get a security verdict, screenshot, and hosting details

Live: `https://osint-outage-radar.onrender.com`
Repo: `https://github.com/rootabhi1/OSINT-OUTAGE-RADAR`

---

## Run it locally

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No credentials yet?
Outages/Threats run on sample data with a banner saying so, and Investigate
shows a clear "not configured" message — expected, not broken.

**To see real data**, set two things in `.env.local` (full steps in the file
itself):

1. `CLOUDFLARE_API_TOKEN` — a token with `Account → Radar → Read` (Outages,
   Threats tabs) **and** `Account → URL Scanner → Edit` (Investigate tab) —
   either on the same token or two separate ones
2. `CLOUDFLARE_ACCOUNT_ID` — only needed for the Investigate tab, since URL
   Scanner is account-scoped rather than a global read like Radar

---

## Pushing changes to GitHub

Use `github-pusher.html` — open it in a browser, it pushes every project
file straight to `api.github.com` using a token you paste in. Nothing goes
through any third party; view source if you want to confirm.

**Token permissions, exactly:**

| Setting | Value |
|---|---|
| Repository access | Only select repositories → `OSINT-OUTAGE-RADAR` |
| Contents | Read and write |
| Workflows | Read and write |
| Everything else | No access |
| Expiration | Shortest available — revoke right after use |

Both **Contents** and **Workflows** are required — GitHub treats
`.github/workflows/*.yml` as a separate permission from regular files and
silently drops just that one file if only Contents is granted.

(Prefer plain git? `git init && git add . && git commit -m "..." && git push`
works too — same permissions apply if you're pushing workflow files.)

---

## Deploying

Two targets, same code:

| Target | Shows | Setup |
|---|---|---|
| **GitHub Pages** | Static demo, sample data only | Repo → **Settings → Pages** → Source: **GitHub Actions**. Already wired via `.github/workflows/deploy-pages.yml` — deploys on every push to `main`. |
| **Render** | The real app, live Cloudflare data | [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint** → select the repo → Render reads `render.yaml` → paste `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` when prompted → **Deploy**. |

Render's free tier spins down after inactivity (~30–50s cold start on the
next visit) — normal, not a bug.

---

## Data sources

Outages tab:
- `GET /radar/annotations/outages` — confirmed, human-verified outages
- `GET /radar/traffic_anomalies` — automatically detected anomalies that
  *may* indicate an outage, not yet confirmed

Threats tab:
- `GET /radar/bgp/hijacks/events` — possible BGP origin hijacks
- `GET /radar/bgp/leaks/events` — BGP route leaks
- `GET /radar/attacks/layer3/top/locations/origin` — top DDoS attack origin countries
- `GET /radar/attacks/layer7/top/locations/origin` — top web-application attack origin countries

Investigate tab:
- `POST /accounts/{id}/urlscanner/v2/scan` + `GET .../result/{uuid}` — submits
  a URL to Cloudflare's isolated browser and returns a security verdict,
  hosting details, and a screenshot

Radar endpoints are free, rate-limited, under Cloudflare's `CC BY-NC 4.0` —
fine for personal/internal dashboards, not for resale. URL Scanner has its
own [usage limits](https://developers.cloudflare.com/security-center/investigate/scan-limits/);
scans are submitted as **unlisted** (not publicly searchable) by default.

## Project structure

```
src/app/page.tsx                main dashboard UI (mode switching)
src/app/api/outages/route.ts    outages + anomalies fetch/normalize (Render only)
src/app/api/threats/route.ts    BGP hijacks/leaks + attack hotspots fetch/normalize
src/app/api/scan/route.ts       URL Scanner submit (POST) + poll (GET)
src/app/api/scan/screenshot/    proxies the scan screenshot (keeps the token server-side)
src/lib/demo-data.ts            shared sample data (API routes + GH Pages fallback)
src/lib/interpret.ts            raw API fields → plain-language sentences
src/lib/country-centroids.json  ISO country code → lat/lng lookup
src/components/GlobeMap.tsx     shared globe/search/basemap toggle, used by both map views
src/components/                 TopBar, ModeTabs, OutageMap/List/DetailPanel,
                                 ThreatMap/List/DetailPanel, InvestigatePanel, SignalTrace
scripts/build-pages.sh          static export build for GitHub Pages
.github/workflows/              GitHub Pages auto-deploy
render.yaml                     Render blueprint
```

`github-pusher.html` (provided separately, alongside this README) is a
standalone local tool for pushing this project to GitHub — don't commit it to
the repo itself, since it embeds a full copy of every project file and would
grow stale/duplicated on every change.

## Extending

- More Radar endpoints (e.g. `/radar/attacks/layer3` for DDoS) → add to
  `src/app/api/outages/route.ts`, merge into the same `NormalizedOutage[]` shape
- `src/components/SignalTrace.tsx` — the waveform visual; tweak noise/colors
  or wire up a real sparkline from Radar's anomaly timeseries
- `src/lib/interpret.ts` — the plain-language translations; extend if you add
  new event types or scopes
