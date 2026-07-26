# Signal Loss — Critical Infrastructure Outage Radar

A live dashboard tracking internet outages, national blackouts, and
unconfirmed routing anomalies, powered by the free
[Cloudflare Radar API](https://developers.cloudflare.com/radar/). A rotating
3D globe (satellite imagery, real zoom/search) shows where each event is;
every entry is translated into a plain-language sentence — not raw API
jargon — plus a confidence badge (Cloudflare-confirmed vs.
automatically-detected).

Live: `https://osint-outage-radar.onrender.com`
Repo: `https://github.com/rootabhi1/OSINT-OUTAGE-RADAR`

---

## Run it locally

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). No token yet? It runs on
sample data with a banner saying so — expected, not broken.

**Get a free Cloudflare Radar token** to see real data:
[dash.cloudflare.com](https://dash.cloudflare.com) → **My Profile → API
Tokens → Create Token → Create Custom Token** → under **Permissions** add
`Account → Radar → Read` → create, copy it, paste into `.env.local` as
`CLOUDFLARE_API_TOKEN=...`, restart `npm run dev`.

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
| **Render** | The real app, live Cloudflare data | [dashboard.render.com](https://dashboard.render.com) → **New → Blueprint** → select the repo → Render reads `render.yaml` → paste `CLOUDFLARE_API_TOKEN` when prompted → **Deploy**. |

Render's free tier spins down after inactivity (~30–50s cold start on the
next visit) — normal, not a bug.

---

## Data sources

- `GET /radar/annotations/outages` — confirmed, human-verified outages
- `GET /radar/traffic_anomalies` — automatically detected anomalies that
  *may* indicate an outage, not yet confirmed

Both free, rate-limited, under Cloudflare's `CC BY-NC 4.0` — fine for
personal/internal dashboards, not for resale.

## Project structure

```
src/app/page.tsx                main dashboard UI
src/app/api/outages/route.ts    live data fetch + normalization (Render only)
src/lib/demo-data.ts            shared sample data (API route + GH Pages fallback)
src/lib/interpret.ts            raw API fields → plain-language sentences
src/lib/country-centroids.json  ISO country code → lat/lng lookup
src/components/                 TopBar, OutageMap, OutageList, DetailPanel, SignalTrace
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
