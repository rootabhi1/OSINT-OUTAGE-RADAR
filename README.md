# Signal Loss

**Global internet outage, routing security, and threat intelligence dashboard**, built on the [Cloudflare Radar](https://developers.cloudflare.com/radar/) and [URL Scanner](https://developers.cloudflare.com/radar/investigate/url-scanner/) APIs.

A rotating 3D globe (satellite imagery, live zoom/search) shows where each event is happening. Every entry is translated into a plain-language summary rather than raw API fields, alongside a confidence indicator (Cloudflare-confirmed vs. automatically detected).

**Live Demo:**  https://rootabhi1.github.io/OSINT-OUTAGE-RADAR/

## Features

**Outages** — Confirmed internet outages and traffic anomalies by country, with severity, duration, and affected scope.

**Threats** — BGP hijacks, route leaks, and the top originating countries for network-layer and application-layer DDoS attacks in the last 24 hours.

**Investigate** — Submit any URL for an isolated-browser scan: security verdict, live screenshot, detected technologies, and hosting/network details.

## Tech stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- MapLibre GL for the 3D globe (Esri satellite imagery / CARTO dark basemap)
- Cloudflare Radar API and URL Scanner API for all live data
- Deployed on Render; a static demo build (sample data only) deploys to GitHub Pages via GitHub Actions

## Getting started

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without credentials configured, Outages and Threats display sample data with a banner indicating this, and Investigate shows a configuration notice — this is expected default behavior.

### Configuration

Two Cloudflare credentials are required for live data (see `.env.local.example` for exact steps):

| Variable | Used for | Required permission |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Outages, Threats, Investigate | `Account → Radar → Read` and `Account → URL Scanner → Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | Investigate only | — (URL Scanner is account-scoped) |

## Deployment

| Target | Behavior | Setup |
|---|---|---|
| **GitHub Pages** | Static build, sample data only | Repo → Settings → Pages → Source: **GitHub Actions**. Deploys automatically on every push to `main` via `.github/workflows/deploy-pages.yml`. |
| **Render** | Full application with live data | New → Blueprint → select this repo → Render reads `render.yaml` → provide `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` when prompted. |

Render's free tier spins down after inactivity; the first request after idle takes 30–50 seconds to wake up.

## Data sources

| Tab | Endpoint | Notes |
|---|---|---|
| Outages | `GET /radar/annotations/outages` | Confirmed, human-verified outages |
| Outages | `GET /radar/traffic_anomalies` | Automatically detected, not human-confirmed |
| Threats | `GET /radar/bgp/hijacks/events` | Possible BGP origin hijacks |
| Threats | `GET /radar/bgp/leaks/events` | BGP route leaks |
| Threats | `GET /radar/attacks/layer3/top/locations/origin` | Top network-layer (DDoS) attack origins |
| Threats | `GET /radar/attacks/layer7/top/locations/origin` | Top web-application attack origins |
| Investigate | `POST/GET /accounts/{id}/urlscanner/v2/...` | Submits and retrieves an isolated-browser URL scan |

Radar data is provided under Cloudflare's `CC BY-NC 4.0` license — suitable for personal and internal use, not for resale. URL Scanner has its own [usage limits](https://developers.cloudflare.com/security-center/investigate/scan-limits/); scans submitted by this app are marked **unlisted** (not publicly searchable) by default.

## Project structure

```
src/app/page.tsx                 Main dashboard UI and tab switching
src/app/api/outages/route.ts     Outages + anomalies fetch/normalize
src/app/api/threats/route.ts     BGP hijacks/leaks + attack hotspots fetch/normalize
src/app/api/scan/route.ts        URL Scanner submit + poll
src/app/api/scan/screenshot/     Screenshot proxy (keeps the API token server-side)
src/lib/demo-data.ts             Sample data (used when no credentials are configured)
src/lib/interpret.ts             Raw API fields → plain-language summaries
src/lib/country-centroids.json   ISO country code → coordinate lookup
src/components/GlobeMap.tsx      Shared globe, search, and basemap toggle
src/components/                 TopBar, ModeTabs, Outage*/Threat* views, InvestigatePanel
scripts/build-pages.sh           Static export build used for GitHub Pages
.github/workflows/               GitHub Pages deployment workflow
render.yaml                      Render deployment blueprint
```

## Extending

- Additional Radar datasets (e.g. DNS anomalies, internet quality) can be added following the pattern in `src/app/api/threats/route.ts`
- `src/lib/interpret.ts` holds the plain-language translation logic — extend this when adding new event types
- `src/components/SignalTrace.tsx` renders the waveform visualization on outage cards

## License

Application code is provided as-is. Cloudflare Radar and URL Scanner data usage is subject to [Cloudflare's terms](https://developers.cloudflare.com/radar/).
