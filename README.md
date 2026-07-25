# Signal Loss — Critical Infrastructure Outage Radar

A live dashboard tracking internet outages, censorship-style national
blackouts, and unconfirmed routing anomalies, powered by the free
[Cloudflare Radar API](https://developers.cloudflare.com/radar/).

Every outage is drawn as a **signal trace**: a clean waveform that flatlines
(or goes noisy, for critical events) at the moment connectivity was lost, and
recovers once the outage resolves.

This repo deploys two ways from the same code:

| Target | What it shows | Why |
|---|---|---|
| **GitHub Pages** | Static demo, dummy data, deploys automatically on every push | Free, no server, no secrets — good for showing off the UI |
| **Render** | The real app, live Cloudflare Radar data | Needs a Node server to run the `/api/outages` route and keep your API token secret |

---

## 1. Run it locally first

```bash
npm install
cp .env.local.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Without a token in
`.env.local` it runs on sample data (with a banner explaining why) — that's
expected, not broken.

To see real data locally, get a free Cloudflare Radar token:

1. [dash.cloudflare.com](https://dash.cloudflare.com) → **My Profile** → **API Tokens**
2. **Create Token** → **Create Custom Token** (bottom of the page)
3. Name it, then under **Permissions** add: `Account` → `Radar` → `Read`
4. **Continue to summary** → **Create Token**, then copy it
5. Paste it into `.env.local` as `CLOUDFLARE_API_TOKEN=...`, restart `npm run dev`

---

## 2. Push to your repo

This project lives at
[github.com/rootabhi1/OSINT-OUTAGE-RADAR](https://rootabhi1.github.io/OSINT-OUTAGE-RADAR/).

I can't push to it directly (no credentials/access from here) — but it's five
commands:

```bash
cd infra-outage-radar
git init
git add .
git commit -m "Initial commit: Signal Loss outage radar"
git branch -M main
git remote add origin https://github.com/rootabhi1/OSINT-OUTAGE-RADAR.git
git push -u origin main
```

If the remote already has commits (e.g. you pushed some files already),
use `git push -u origin main --force` only if you're sure you want to
overwrite it — otherwise `git pull --rebase origin main` first.

---

## 3. Turn on GitHub Pages (dummy data, live in ~2 minutes)

The workflow at `.github/workflows/deploy-pages.yml` builds a static version
(client-side sample data, no API keys involved) and deploys it on every push
to `main`.

> **If you used the browser pusher tool to push files:** double check
> `.github/workflows/deploy-pages.yml` actually made it into the repo — [see
> it here](https://github.com/rootabhi1/OSINT-OUTAGE-RADAR/tree/main/.github/workflows).
> Pushing files under `.github/workflows/` needs a token with a **separate**
> "Workflows: Read and write" permission, not just "Contents" — GitHub
> silently rejects just that one file if it's missing, while everything else
> goes through fine. If it's missing, add it via **Add file → Create new
> file** in the GitHub web UI (paste the workflow YAML in) — that doesn't
> need any special token permission since it's your logged-in browser
> session.

1. On GitHub, go to your repo → **Settings** → **Pages**
2. Under **Build and deployment** → **Source**, choose **GitHub Actions**
3. Go to the **Actions** tab — you should see "Deploy demo to GitHub Pages"
   run automatically once the workflow file is in place
4. When it finishes (green check), go back to **Settings → Pages** — your
   live URL will be shown at the top:
   `https://rootabhi1.github.io/OSINT-OUTAGE-RADAR/`

Every future push to `main` redeploys it automatically. This version always
shows the bundled sample data — it has no server to call Cloudflare from.

---

## 4. Deploy the real app to Render

This is the version with a live Node server, so `/api/outages` actually
calls Cloudflare and your API token stays server-side and secret.

**Option A — Blueprint (fastest):**

1. Go to [dashboard.render.com](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect your GitHub account if you haven't, then select your
   `OSINT-OUTAGE-RADAR` repo
3. Render reads `render.yaml` (already in the repo) and proposes a **Web
   Service** — review it, click **Apply**
4. It will pause and ask you to fill in `CLOUDFLARE_API_TOKEN` (marked
   `sync: false` in the blueprint so it's never stored in the repo) — paste
   your token from step 1
5. Click **Deploy** — first build takes 2–4 minutes

**Option B — Manual web service:**

1. [dashboard.render.com](https://dashboard.render.com) → **New** → **Web Service**
2. Connect your repo
3. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm run start -- -p $PORT`
   - **Instance Type**: Free is fine to start
4. Under **Environment**, add:
   - `CLOUDFLARE_API_TOKEN` = *(your token)*
   - `NODE_VERSION` = `20`
5. **Create Web Service** — Render builds and deploys automatically

Once live, Render gives you a URL like
`https://osint-outage-radar.onrender.com` — that's your real, live dashboard.
Every push to `main` auto-redeploys it too.

> **Free tier note:** Render's free web services spin down after inactivity
> and take ~30–50s to wake back up on the next request. That's normal, not
> a bug — upgrade the instance type if you want it always warm.

---

## Data sources

- `GET /radar/annotations/outages` — confirmed, manually verified outages
  (national blackouts, regional disruptions)
- `GET /radar/traffic_anomalies` — automatically detected traffic anomalies
  that may indicate an unconfirmed outage

Both are free, rate-limited endpoints under Cloudflare's `CC BY-NC 4.0` data
license — fine for personal dashboards and internal tools, not for resale.

## Project structure

```
src/app/page.tsx              main dashboard UI
src/app/api/outages/route.ts  live data fetch + normalization (Render only)
src/lib/demo-data.ts          shared sample data (API route + GH Pages fallback)
src/lib/country-centroids.json  ISO country code → lat/lng lookup
src/components/               TopBar, OutageMap, OutageList, DetailPanel, SignalTrace
scripts/build-pages.sh        builds the static export for GitHub Pages
.github/workflows/            GitHub Pages auto-deploy
render.yaml                   Render blueprint
```

## Extending

- Add more Radar endpoints (e.g. `/radar/attacks/layer3` for DDoS activity)
  in `src/app/api/outages/route.ts` and merge them into the same
  `NormalizedOutage[]` shape
- `src/components/SignalTrace.tsx` — the waveform visualization; tweak noise
  amplitude, colors, or wire up a real sparkline from Radar's
  `traffic_anomalies` timeseries data
