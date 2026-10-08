# Pismo Zones

What time is it for the team? Pismo Zones shows every Pismo office at a glance — local time, working state, daylight, holidays — and converts any moment you type, drag or share. Every calculation runs on your device, it works offline, and it is exact across daylight-saving changes. It runs on Cloudflare's free tier at [pismozones.ashwingopalsamy.in](https://pismozones.ashwingopalsamy.in).

## Features

- **Zones.** A card per office: local time with live seconds, working / early / late / off hours, holidays and half days, a sky that follows the real sun, and upcoming clock changes. Tap a time to set it; drag the ruler to scrub; `←` `→` nudge by 15 minutes.
- **Plan.** The reference city's day in 30-minute slots across every office, DST-exact (23- and 25-hour days included), with the best window in which the same people are all working.
- **Command bar.** Type `3pm bristol to austin`, `noon sg to sp`, `in 2 hours` or `amanhã 9h sp para ist` — English or Portuguese. One deterministic parser previews as you type, explains what it understood, and tells you when a time doesn't exist or happens twice.
- **Sharing.** `/s/<token>` links pin an exact instant, not a wall time, so they mean the same thing in every zone. Link previews are rendered by the Worker in each office's own time. Old v1 links keep working.
- **Holidays.** Public and office calendars for São Paulo, Austin, Bristol, Warsaw, Bangalore and Singapore, including observed days and half days.
- **PWA.** Installable, works offline after the first visit, checks for updates hourly and asks before reloading.

## Privacy

There are no cookies, no accounts, and nothing that identifies you. Saved cities and preferences stay in your browser. The app sends anonymous product events (which features are used, never what you type) to its own Worker, and Cloudflare Web Analytics counts page views. [docs/analytics.md](docs/analytics.md) lists exactly what is collected and what never is.

## Develop

Requires Node 24 (`.nvmrc`).

```bash
npm ci
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server, with the Worker running in workerd |
| `npm run build` | Type-check, then build the client and the Worker into `dist/` |
| `npm run preview` | Build, then serve the production output locally |
| `npm run check` | Lint (Biome), type-check, unit and Worker tests |
| `npm run test` / `test:watch` | Vitest: `core`, `app` and `worker` projects |
| `npm run e2e` | Playwright: desktop Chrome, iPhone WebKit, and the production build |
| `npm run size` | Gzip budgets for the built client |
| `npm run deploy` | Build and deploy with Wrangler |
| `npm run analytics -- "<sql>"` | Query the Analytics Engine dataset |
| `npm run cf-typegen` | Regenerate `worker-configuration.d.ts` from `wrangler.jsonc` |

## Architecture

```
src/core   pure TypeScript; no DOM, no framework, no I/O. Deterministic given (instant, inputs).
src/state  Preact signals; persistence, URL/share overlay, analytics client. Imports core.
src/ui     Preact components + CSS modules. Imports state and core.
worker/    Cloudflare Worker. Imports core (codec, registry, formatting) — never ui/state.
```

Imports flow `ui → state → core` and `worker → core`; `src/architecture.test.ts` enforces it. The same core runs in the browser, in the Worker (link previews) and in Node (tests). The UTC instant is the single source of truth; every zone's wall time is derived from it with `Intl`.

```
src/core/      time/ · cities/ · work/ (policy, holidays) · sky/ · parse/ · plan/ · share/ · analytics/
src/state/     clock · moment · cities · prefs · storage · shareOverlay · history · analytics
src/ui/        app/ (shell, layouts, shortcuts, PWA) · components/ · i18n/ (en, pt-BR) · styles/
worker/        index (router) · share (HTMLRewriter previews) · events (/e ingest) · headers
public/        fonts (Geist, OFL) · icons · _headers · boot.js
tests/e2e/     Playwright specs
docs/          analytics.md · design/ · superpowers/ (spec and plans)
```

The Worker runs only for `/s/*` and `/e`; every other request is a static-asset hit. Security headers are shared by the Worker (`worker/headers.ts`) and the static assets (`public/_headers`).

## Testing

```bash
npm run test        # unit (core, state, ui) and Worker tests
npm run e2e         # end-to-end, accessibility (axe, light and dark), offline and CSP checks
npm run build && npm run size
```

Worker tests that need the real runtime (HTMLRewriter) are named `*.workerd.test.ts`; they bundle `worker/index.ts` and run it in workerd through Miniflare.

## Deploy

Both hosts build straight from GitHub; GitHub Actions only runs the checks (`.github/workflows/ci.yml`).

- **Cloudflare (canonical):** `pismozones.ashwingopalsamy.in` and the `workers.dev` URL. Cloudflare Workers Builds deploys `main` (build `npm run build`, deploy `npx wrangler deploy`) and uploads a preview version for other branches (`npx wrangler versions upload`). The build variable `VITE_CF_BEACON_TOKEN` enables Cloudflare Web Analytics. The Worker serves link previews (`/s/…`) and the event endpoint (`/e`).
- **Vercel (mirror):** `pismozones.vercel.app`, built from `main` by Vercel's Git integration using `vercel.json` (static `dist/client`, the same security headers). Vercel Web Analytics counts page views there; product events go to the Cloudflare `/e`; share links always use the canonical domain.
- **Manual:** `npm run deploy` (Cloudflare), with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set.

## Licence

[CC0 1.0 Universal](LICENSE). The Geist fonts are under the SIL Open Font License (`public/fonts/OFL.txt`).
