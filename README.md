# HORUS

**Global OSINT and threat intelligence dashboard** — internet outages, routing/DDoS threats, real-time flight tracking, and URL investigation, built on [Cloudflare Radar](https://developers.cloudflare.com/radar/), [Cloudflare URL Scanner](https://developers.cloudflare.com/radar/investigate/url-scanner/), and [OpenSky Network](https://opensky-network.org/).

A rotating 3D globe (satellite imagery, live zoom/search) shows where each event is happening. Every entry is translated into a plain-language summary rather than raw API fields, alongside a confidence indicator (Cloudflare-confirmed vs. automatically detected).

**Live app:** https://osint-outage-radar.onrender.com

> Renamed from "Signal Loss" — the underlying repo/service name (`osint-outage-radar`) is left as-is on GitHub and Render, since changing either would risk breaking the existing deployment links. Only the in-app branding changed.

## Features

**Outages** — Confirmed internet outages and traffic anomalies by country, with real cause classification (e.g. cable cut, power outage, government-directed) where Cloudflare provides it, not just a generic description.

**Threats** — BGP hijacks and route leaks with explicit source/affected-network labels, plus top DDoS attack origin *and* target countries (network-layer and application-layer, last 24h).

**Flights** — Every currently airborne aircraft broadcasting ADS-B position data, worldwide, updated roughly every 15 seconds. Covers all aircraft categories OpenSky reports — airliners, light aircraft, helicopters, gliders, airships, and UAVs — not just commercial traffic, color-coded by type on the globe.

**Investigate** — Submit any URL for an isolated-browser scan: security verdict, live screenshot, detected technologies, and hosting/network details.

## Tech stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS
- MapLibre GL (used directly, not through a React wrapper) for the 3D globe — Esri satellite imagery / CARTO dark vector basemap, live aircraft rendered as a GPU symbol layer (not DOM markers, so it scales to thousands of concurrent aircraft)
- Cloudflare Radar API, Cloudflare URL Scanner API, and OpenSky Network REST API for all live data
- Deployed on Render; a static demo build (sample data only) deploys to GitHub Pages via GitHub Actions

## Getting started

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without credentials configured: Outages/Threats show sample data with a banner saying so, Investigate shows a configuration notice, and Flights still works with real live data (OpenSky's anonymous access needs no credentials) — this is expected default behavior, not broken.

### Configuration

Cloudflare credentials (see `.env.local.example` for exact steps):

| Variable | Used for | Required permission |
|---|---|---|
| `CLOUDFLARE_API_TOKEN` | Outages, Threats, Investigate | `Account → Radar → Read` and `Account → URL Scanner → Edit` |
| `CLOUDFLARE_ACCOUNT_ID` | Investigate only | — (URL Scanner is account-scoped) |

OpenSky credentials (optional — Flights works anonymously, these just raise the daily rate limit):

| Variable | Used for |
|---|---|
| `OPENSKY_CLIENT_ID` | Flights (optional, higher rate limit) |
| `OPENSKY_CLIENT_SECRET` | Flights (optional, higher rate limit) |

Get these free at [opensky-network.org](https://opensky-network.org/) → create an account → API Client in your profile settings (OpenSky moved to OAuth2 client-credentials in March 2026; the old username/password Basic Auth no longer works).

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
| Flights | `GET opensky-network.org/api/states/all` | Every currently airborne aircraft with an active ADS-B transponder |

Radar data is provided under Cloudflare's `CC BY-NC 4.0` license — suitable for personal and internal use, not for resale. URL Scanner has its own [usage limits](https://developers.cloudflare.com/security-center/investigate/scan-limits/); scans submitted by this app are marked **unlisted** (not publicly searchable) by default. OpenSky's data is crowdsourced from volunteer ADS-B receivers — coverage is excellent over populated areas/major routes, thinner over oceans and low-receiver-density regions, and aircraft without an active transponder won't appear regardless of location.

## Project structure

```
src/app/page.tsx                 Main dashboard UI and tab switching
src/app/api/outages/route.ts     Outages + anomalies fetch/normalize
src/app/api/threats/route.ts     BGP hijacks/leaks + attack hotspots fetch/normalize
src/app/api/flights/route.ts     Live aircraft fetch/normalize (OpenSky)
src/app/api/geocode/route.ts     Address/city search proxy (OpenStreetMap Nominatim)
src/app/api/scan/route.ts        URL Scanner submit + poll
src/app/api/scan/screenshot/     Screenshot proxy (keeps the API token server-side)
src/lib/demo-data.ts             Sample data (used when no credentials are configured)
src/lib/interpret.ts             Raw API fields → plain-language summaries
src/lib/country-centroids.json   ISO country code → coordinate lookup
src/components/GlobeMap.tsx      Shared globe, search, basemap toggle, and the GPU-rendered flight layer
src/components/                 TopBar, ModeTabs, Outage*/Threat*/Flight* views, InvestigatePanel
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
