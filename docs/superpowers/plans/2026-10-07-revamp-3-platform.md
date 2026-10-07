# Pismo Zones Revamp — Plan 3 of 3: Platform, Delivery and Acceptance

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the revamped app on the Cloudflare free tier.

**What this plan delivers:**
- DST-correct share previews served by the Worker.
- First-party product analytics in Analytics Engine, plus Cloudflare Web Analytics.
- Strict security headers.
- An offline-first PWA with update prompts.
- CI with budgets and preview deploys.
- The custom domain.
- The Vercel retirement.
- A verified pass of the spec's acceptance checklist.

**Architecture:**
- The Worker runs only for `/s/*` and `/e` (`run_worker_first`). Every other request is a free static-asset hit.
- `/s/:token` rewrites the SPA shell's meta tags with HTMLRewriter, using the core codec and formatters, so previews match the app exactly.
- `/e` validates batches against the shared core schema and writes positional data points.
- The PWA uses `vite-plugin-pwa` (Workbox `generateSW`).

**Tech Stack:**
- Cloudflare Workers with Static Assets, HTMLRewriter and Analytics Engine
- Wrangler and `@cloudflare/vitest-pool-workers`
- `vite-plugin-pwa`
- GitHub Actions and Playwright

**Spec:** `docs/superpowers/specs/2026-10-07-pismozones-revamp-design.md` (§8, §9, §12).

**Depends on:** Plans 1 and 2 being complete.

## Global Constraints

- Everything in Plans 1 and 2 still applies.
- **Canonical origin:** `https://pismozones.ashwingopalsamy.in`.
- **Allowed event origins:**
  - the canonical origin
  - `https://pismozones.<subdomain>.workers.dev`
  - preview aliases `https://<alias>-pismozones.<subdomain>.workers.dev`
  - `http://localhost:<port>`
- **Worker CPU:** stay well under the free 10 ms per request. The Worker does no image generation and no subrequests other than `ASSETS`.
- **Analytics writes:** no IP, user agent or free text is ever written. `country` comes only from `request.cf.country`. GPC/DNT are not consulted (spec D10).
- **Third-party origins** are limited to `static.cloudflareinsights.com` (script) and `cloudflareinsights.com` (beacon).
- **Budgets** (gzip):
  - JS entry ≤ 45 KB
  - all CSS ≤ 12 KB
  - total JS + CSS + HTML + fonts ≤ 160 KB
- **Deployment secrets** live only in GitHub secrets and variables, never in the repo.
- **Owner-only steps** (DNS, Cloudflare dashboard, Vercel settings, pushing branches) are marked **[owner]**. The implementer prepares and verifies them, but does not perform them without the owner's go-ahead.

## Review Focus

1. **A share link opened by a crawler from any region.** The preview text must be computed for the instant in each office's own zone, and must not depend on the Worker's clock or locale. Test: Task 1 (`og text is DST-correct for a future date`).
2. **A malformed, huge or hostile `/e` POST**: a 20 KB body, a NaN double, an unknown event, or a foreign origin. It gets a 4xx with nothing written. Test: Task 2.
3. **A first visit that goes offline.** A reload must still render the app from the precache. Test: Task 4 (`works offline after first load`).
4. **A deploy while a tab is open for hours.** The update prompt must appear within an hour and reload cleanly. Test: Task 4 (`shows update prompt on new SW`).
5. **A v1 link created in Austin, opened in São Paulo and in Chicago.** Both must show 15:00 Austin on Wed 7 Oct. Test: Task 8 (`share.spec.ts`).

---

### Task 1: Worker router and share previews

**Files:**
- Create: `worker/og.ts`, `worker/share.ts`, `worker/headers.ts`, `vitest.workers.config.ts`
- Modify: `worker/index.ts`, `package.json` (`"test": "vitest run && vitest run -c vitest.workers.config.ts"`, plus dev dep `@cloudflare/vitest-pool-workers`), `tsconfig.worker.json` (types for `cloudflare:test`)
- Test: `worker/og.test.ts`, `worker/share.test.ts`, `worker/router.test.ts`

**Interfaces:**
- Consumes: core `decodeShare`, `DecodedShare`, `getOffice`, `zonedFields`, `formatClock`, `formatShortDate`, `dayDelta`, `civilDate`.
- Produces:

```ts
// headers.ts
export const CANONICAL_ORIGIN = 'https://pismozones.ashwingopalsamy.in';
export const SECURITY_HEADERS: Readonly<Record<string, string>>;   // exact values in Task 3
// og.ts
export function ogText(p: DecodedShare, lang: 'en' | 'pt-BR'): { title: string; description: string };
// share.ts
export function renderSharePage(shell: Response, token: string, lang: 'en' | 'pt-BR'): Response;
// index.ts
export default { fetch(request: Request, env: Env): Promise<Response> } satisfies ExportedHandler<Env>;
```

- **`ogText`:**
  - All times use `h23`.
  - The title is `${hm} in ${ref.name} · ${formatShortDate(ref date)}`; in PT it is `${hm} em ${ref.name} · …`.
  - The description lists the other offices in `officeIds` order, excluding the reference. Each entry is `${hm} ${name}`, with ` (+1d)` / ` (−1d)` relative to the reference's civil date, joined by ` · `.
  - When the reference is the only office, the description is `Pismo Zones`.
- **`renderSharePage`:**
  - `HTMLRewriter` sets `<title>`, `meta[property="og:title"]`, `og:description`, `twitter:title` and `twitter:description` from `ogText`.
  - It sets `og:url` and `link[rel=canonical]` to `${CANONICAL_ORIGIN}/s/${token}`.
  - It returns status 200 with `content-type: text/html; charset=utf-8`, `cache-control: public, max-age=300` and every `SECURITY_HEADERS` entry.
  - For an invalid token it leaves the meta unchanged and adds `data-share-error="1"` to `<html>`. The SPA reads that and sets `AppEnv.shareErrorFlag` in `browserEnv()`.
- **Router:**
  - `GET`/`HEAD` `/s/:token` → `renderSharePage(await env.ASSETS.fetch(new Request(new URL('/', request.url))), token, langFrom(Accept-Language))`. Language is `pt-BR` if the first tag starts with `pt`.
  - `/e` → `handleEvents` (Task 2).
  - Anything else → `env.ASSETS.fetch(request)`.

- [ ] **Step 1: Configure the Worker test project.** `vitest.workers.config.ts` uses `defineWorkersConfig` from `@cloudflare/vitest-pool-workers/config` with:
  - `test.include: ['worker/**/*.test.ts']`
  - `poolOptions.workers.miniflare: { compatibilityDate: '2026-10-01' }`
  - no wrangler config (the tests call the handlers with fake bindings)
  - the `@core` alias

- [ ] **Step 2: Write the failing tests.**

```ts
// og.test.ts
it('describes a v1 link exactly as the app shows it', () => {
  expect(ogText(decodeShare('10p00hwf')!, 'en')).toEqual({ title: '15:00 in Austin · Wed 7 Oct',
    description: '17:00 São Paulo · 21:00 Bristol · 01:30 Bangalore (+1d)' });
  expect(ogText(decodeShare('10p00hwf')!, 'pt-BR').title).toBe('15:00 em Austin · qua 7 out');
});
it('og text is DST-correct for a future date', () => {
  const t = encodeShare({ instant: Date.UTC(2026, 10, 10, 13), refId: 'saopaulo', officeIds: ['saopaulo', 'bristol'] });
  expect(ogText(decodeShare(t)!, 'en').description).toBe('13:00 Bristol');          // 10 Nov: Bristol is on GMT, not BST
});
// share.test.ts
const SHELL = '<!doctype html><html lang="en"><head><title>Pismo Zones</title><meta property="og:title" content="Pismo Zones">'
  + '<meta property="og:description" content="x"><meta property="og:url" content="x"><meta name="twitter:title" content="x">'
  + '<meta name="twitter:description" content="x"><link rel="canonical" href="x"></head><body><div id="root"></div></body></html>';
it('rewrites meta for a valid token', async () => {
  const res = renderSharePage(new Response(SHELL, { headers: { 'content-type': 'text/html' } }), '10p00hwf', 'en');
  const html = await res.text();
  expect(html).toContain('<title>15:00 in Austin · Wed 7 Oct</title>');
  expect(html).toContain('property="og:url" content="https://pismozones.ashwingopalsamy.in/s/10p00hwf"');
  expect(html).toContain('rel="canonical" href="https://pismozones.ashwingopalsamy.in/s/10p00hwf"');
  expect(res.headers.get('content-security-policy')).toBe(SECURITY_HEADERS['Content-Security-Policy']);
});
it('flags invalid tokens without touching meta', async () => {
  const html = await renderSharePage(new Response(SHELL), 'zz', 'en').text();
  expect(html).toContain('data-share-error="1"'); expect(html).toContain('<title>Pismo Zones</title>');
});
// router.test.ts
it('routes /s, passes everything else to assets', async () => {
  const seen: string[] = [];
  const env = { ASSETS: { fetch: async (r: Request) => { seen.push(new URL(r.url).pathname); return new Response(SHELL, { headers: { 'content-type': 'text/html' } }); } },
    EVENTS: { writeDataPoint() {} } } as unknown as Env;
  expect((await worker.fetch(new Request('https://x/s/10p00hwf'), env)).status).toBe(200);
  await worker.fetch(new Request('https://x/app.js'), env);
  expect(seen).toEqual(['/', '/app.js']);
});
```

- [ ] **Step 3: Run the tests to confirm they fail.**
  - Run: `npx vitest run -c vitest.workers.config.ts`
  - Expected: FAIL.

- [ ] **Step 4: Implement**, and read `data-share-error` in `browserEnv()` (`document.documentElement.dataset.shareError === '1'`).

- [ ] **Step 5: Run the tests to confirm they pass.**
  - Run: `npm run test`
  - Expected: PASS (both configs).

- [ ] **Step 6: Commit.**

```bash
git add -A && git commit -m "feat(worker): DST-correct share previews via HTMLRewriter"
```

---

### Task 2: Event ingest (`/e`)

**Files:**
- Create: `worker/events.ts`
- Test: `worker/events.test.ts`

**Interfaces:**
- Consumes: core `validateBatch`, `WireBatch` (Plan 2 Task 6).
- Produces:
  - `export const ORIGIN_RE = /^(https:\/\/(pismozones\.ashwingopalsamy\.in|([a-z0-9-]+-)?pismozones\.[a-z0-9-]+\.workers\.dev)|http:\/\/localhost:\d+)$/`
  - `export async function handleEvents(request: Request, env: Pick<Env, 'EVENTS'>): Promise<Response>`
- **Response rules:**
  - non-POST → 405
  - `Origin` failing `ORIGIN_RE` → 403
  - body over 16 384 bytes (check `content-length`, then the read length) → 413
  - invalid JSON or `validateBatch` null → 400
  - otherwise → 204 with no body
- **Write shape** (one data point per event):
  - `indexes: [e.n]`
  - `blobs: [e.n, String(batch.v), batch.a, country, batch.s, ...e.b]`
  - `doubles: [e.t, ...e.d]`
  - `country = (request.cf?.country as string | undefined) ?? 'XX'`

- [ ] **Step 1: Write the failing tests.**

```ts
const batch = { v: 1, s: 'abcd1234abcd1234', a: '2.0.0', e: [{ n: 'commit', b: ['ruler'], d: [2.5], t: 1200 }, { n: 'view', b: ['plan'], d: [], t: 1300 }] };
const post = (body: string, origin = 'https://pismozones.ashwingopalsamy.in', init: RequestInit = {}) =>
  new Request('https://pismozones.ashwingopalsamy.in/e', { method: 'POST', body, headers: { origin, 'content-type': 'text/plain' }, ...init });
it('writes one positional data point per event', async () => {
  const writeDataPoint = vi.fn();
  const res = await handleEvents(post(JSON.stringify(batch)), { EVENTS: { writeDataPoint } } as never);
  expect(res.status).toBe(204);
  expect(writeDataPoint).toHaveBeenNthCalledWith(1, { indexes: ['commit'], blobs: ['commit', '1', '2.0.0', 'XX', 'abcd1234abcd1234', 'ruler'], doubles: [1200, 2.5] });
  expect(writeDataPoint).toHaveBeenCalledTimes(2);
});
it.each([
  ['wrong method', new Request('https://x/e'), 405],
  ['foreign origin', post(JSON.stringify(batch), 'https://evil.example'), 403],
  ['oversized', post('x'.repeat(20_000)), 413],
  ['not json', post('{'), 400],
  ['bad event', post(JSON.stringify({ ...batch, e: [{ n: 'nope', b: [], d: [], t: 1 }] })), 400],
])('%s → %i and writes nothing', async (_n, req, status) => {
  const writeDataPoint = vi.fn();
  expect((await handleEvents(req as Request, { EVENTS: { writeDataPoint } } as never)).status).toBe(status);
  expect(writeDataPoint).not.toHaveBeenCalled();
});
it('accepts preview aliases and localhost', () => {
  for (const o of ['https://pismozones.acme.workers.dev', 'https://pr-12-pismozones.acme.workers.dev', 'http://localhost:5173'])
    expect(ORIGIN_RE.test(o)).toBe(true);
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run -c vitest.workers.config.ts worker/events.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement** as specified in Interfaces.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run test`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add worker && git commit -m "feat(worker): validated first-party event ingest into Analytics Engine"
```

---

### Task 3: Security headers and third-party guard

**Files:**
- Create: `public/_headers`, `src/ui/styles/headers.test.ts`, `tests/e2e/network.spec.ts`
- Modify: `worker/headers.ts`

**Interfaces:**
- Produces: `SECURITY_HEADERS` with these exact values. `public/_headers` mirrors them for `/*`.

```
Content-Security-Policy: default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; img-src 'self' data:; style-src 'self'; font-src 'self'; manifest-src 'self'; worker-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()
```

  `_headers` also sets:
  - `/assets/*` and `/fonts/*` → `Cache-Control: public, max-age=31536000, immutable`
  - `/sw.js` and `/index.html` → `Cache-Control: no-cache`

- [ ] **Step 1: Write the failing tests.**

```ts
// headers.test.ts (app project; reads files)
import { SECURITY_HEADERS } from '../../../worker/headers';
it('_headers mirrors the Worker security headers', () => {
  const file = readFileSync('public/_headers', 'utf8');
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) expect(file).toContain(`  ${k}: ${v}`);
});
// tests/e2e/network.spec.ts
test('no CSP violations and no unexpected third parties', async ({ page }) => {
  const bad: string[] = [];
  page.on('console', (m) => { if (/Content Security Policy|Refused to/i.test(m.text())) bad.push(m.text()); });
  page.on('request', (r) => { const h = new URL(r.url()).hostname; if (!['localhost', '127.0.0.1', 'static.cloudflareinsights.com', 'cloudflareinsights.com'].includes(h)) bad.push(h); });
  await page.goto('/'); await page.getByRole('textbox', { name: 'Convert a time' }).fill('3pm bristol to austin');
  await page.keyboard.press('Enter'); await page.getByRole('button', { name: 'Settings' }).click();
  expect(bad).toEqual([]);
});
```

  - The headers test is a test file, so the architecture test (which skips `*.test.ts`) allows its import from `worker/`.
  - `network.spec.ts` runs in a new Playwright project `prod` with `baseURL: 'http://localhost:4173'`, so the production `_headers` apply. Make `webServer` an array: the existing dev server on 5199, plus `{ command: 'npm run preview -- --port 4173 --strictPort', url: 'http://localhost:4173' }`.

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/ui/styles/headers.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement** the constant and `_headers`.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run test && npm run build && npx playwright test --project=prod tests/e2e/network.spec.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat: strict security headers shared by assets and Worker"
```

---

### Task 4: PWA — offline, updates, install

**Files:**
- Modify: `vite.config.ts` (`VitePWA`), `src/ui/app/App.tsx`, `src/ui/components/SettingsSheet/SettingsSheet.tsx`, `src/ui/i18n/{en,pt-BR}.ts`, `package.json` (dev dep `vite-plugin-pwa`)
- Create: `src/ui/app/UpdatePrompt.tsx`, `src/ui/app/install.ts`, `tests/e2e/pwa.spec.ts`
- Delete: `public/manifest.json`

**Interfaces:**
- **`VitePWA` config:**
  - `registerType: 'prompt'`, `injectRegister: false`
  - `manifest`:
    - `name: 'Pismo Zones'`, `short_name: 'Pismo Zones'`, `description` as in `index.html`
    - `start_url: '/'`, `display: 'standalone'`
    - `background_color: '#000000'`, `theme_color: '#000000'`
    - `icons` (192, 512 PNG and the SVG, `purpose: 'any'`)
    - `shortcuts: [{ name: 'Plan a meeting', url: '/?view=plan' }, { name: 'Holidays', url: '/?panel=holidays' }]`
    - no `orientation`
  - `workbox`:
    - `globPatterns: ['**/*.{js,css,html,woff2,png,svg,ico,webmanifest}']`
    - `navigateFallback: '/index.html'`, `navigateFallbackDenylist: [/^\/s\//, /^\/e$/]`
    - `runtimeCaching: [{ urlPattern: ({ url }) => url.pathname.startsWith('/s/'), handler: 'NetworkFirst', options: { cacheName: 'share-pages', networkTimeoutSeconds: 3, expiration: { maxEntries: 20 }, plugins: [{ handlerDidError: async () => caches.match('/index.html') }] } }]`
- **`UpdatePrompt()`:**
  - Uses `useRegisterSW` from `virtual:pwa-register/preact`.
  - `onRegisteredSW(_, r)` sets up `setInterval(() => r?.update(), 3_600_000)`.
  - When `needRefresh` is set, it renders a persistent toast: `update.available` with an `update.reload` button that calls `updateServiceWorker(true)` and emits `pwa {outcome:'update_applied'}`. It emits `pwa {outcome:'update_shown'}` once.
- **`install.ts`:** `createInstall(win: Window): { available: ReadonlySignal<'prompt' | 'ios' | null>; prompt(): Promise<'accepted' | 'dismissed'> }`.
  - It captures `beforeinstallprompt`.
  - `ios` means iOS Safari not in standalone mode.
  - It emits `pwa {outcome: 'installed' | 'accepted' | 'dismissed'}`.
- **Settings:** an "Install app" row appears when `available` is set. In `ios` mode it shows a hint.
- **New i18n keys:**
  - `settings.install` — "Install app" / "Instalar app"
  - `settings.installIos` — "On iPhone: Share → Add to Home Screen" / "No iPhone: Compartilhar → Adicionar à Tela de Início"

- [ ] **Step 1: Write the failing e2e tests** in project `prod`.

```ts
test('works offline after first load', async ({ page, context }) => {
  await page.goto('/'); await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload(); await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  await context.setOffline(true); await page.reload();
  await expect(page.getByRole('article')).toHaveCount(4);
});
test('shows update prompt on new SW', async ({ page }) => {
  await page.goto('/'); await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('pz:test-need-refresh')));
  await expect(page.getByRole('button', { name: 'Reload' })).toBeVisible();
});
```

  `UpdatePrompt` also listens for the `pz:test-need-refresh` window event and sets `needRefresh`. Gate this on `import.meta.env.MODE !== 'production' || location.hostname === 'localhost'` so production builds keep the hook only on localhost.

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npm run build && npx playwright test --project=prod tests/e2e/pwa.spec.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement** the configuration, `UpdatePrompt`, `install.ts` and the Settings row.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run build && npx playwright test --project=prod tests/e2e/pwa.spec.ts && npm run test`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat(pwa): precached offline shell, hourly update checks, install affordance"
```

---

### Task 5: Web Analytics beacon and analytics docs

**Files:**
- Create: `src/ui/app/beacon.ts`, `src/ui/app/beacon.test.ts`, `docs/analytics.md`, `scripts/analytics.sh`, `.env.example`
- Modify: `src/main.tsx`, `package.json` (script `"analytics": "sh scripts/analytics.sh"`)

**Interfaces:**
- `injectBeacon(token: string | undefined, doc: Document): void`
  - When `token` is set and no beacon exists, append `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"…","spa":true}'>`.
  - Call it from `main.tsx` with `import.meta.env.VITE_CF_BEACON_TOKEN`.
- `.env.example`: `VITE_CF_BEACON_TOKEN=` and `CLOUDFLARE_ACCOUNT_ID=`.
- `scripts/analytics.sh`: `curl -s "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/analytics_engine/sql" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" --data "$1"`.
- **`docs/analytics.md`:**
  - **(a)** The privacy statement: what is collected, what never is.
  - **(b)** The positional schema:
    - `index1` = event
    - `blob1` event, `blob2` schema version, `blob3` app version, `blob4` country, `blob5` session id
    - `blob6`+ the event's `blobs` in `EVENTS` order
    - `double1` ms since session start, `double2`+ the event's `doubles`
    - Include a table per event.
  - **(c)** Saved queries, using `SUM(_sample_interval)` for counts:
    1. Sessions per day: `index1='session_start'`, grouped by `toStartOfDay(timestamp)`.
    2. Commits by input method: `blob6` where `index1='commit'`.
    3. Parse outcomes by status and code: `blob6`, `blob8`.
    4. Top unsupported abbreviations: `blob9 != ''`.
    5. Share funnel: `share` vs `share_open` by `blob6`.
    6. Plan usage: `view` with `blob6='plan'` and `plan_best`.
    7. Mean active offices per session: `SUM(double2 * _sample_interval) / SUM(_sample_interval)` on `session_start`.
    8. Sessions by country: `blob4`.
    9. Errors by code and component: `blob6`, `blob7`.

    Write each as a complete `SELECT … FROM pismozones_events WHERE … AND timestamp > NOW() - INTERVAL '30' DAY GROUP BY … ORDER BY …`.
  - **(d)** How to run a query: `npm run analytics -- "<sql>"`, which needs a token with Account Analytics Read.

- [ ] **Step 1: Write the failing test.**

```ts
it('injects the beacon once, only with a token', () => {
  injectBeacon(undefined, document); expect(document.querySelectorAll('script[data-cf-beacon]')).toHaveLength(0);
  injectBeacon('abc', document); injectBeacon('abc', document);
  const s = document.querySelectorAll('script[data-cf-beacon]');
  expect(s).toHaveLength(1);
  expect(JSON.parse(s[0]!.getAttribute('data-cf-beacon')!)).toEqual({ token: 'abc', spa: true });
});
```

- [ ] **Step 2: Run the test to confirm it fails.**
  - Run: `npx vitest run src/ui/app/beacon.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement**, and write the docs and script.

- [ ] **Step 4: Run the test to confirm it passes.**
  - Run: `npx vitest run src/ui/app/beacon.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add -A && git commit -m "feat(analytics): Web Analytics beacon, schema docs and saved SQL queries"
```

---

### Task 6: Size budget and CI/CD

**Files:**
- Create: `scripts/size.mjs`, `.github/workflows/ci.yml`
- Modify: `package.json` (script `"size": "node scripts/size.mjs"`)

**Interfaces:**
- **`scripts/size.mjs`:**
  - Reads `dist/client/index.html` (the client output directory of `@cloudflare/vite-plugin`) and finds the entry `<script type="module" src>`.
  - Gzips with `zlib.gzipSync(buf, { level: 9 })`:
    - the entry JS
    - every `*.css`
    - the total of every `*.{js,css,html,woff2}` under `dist/client`
  - Prints a table of the three figures with their budgets.
  - Exits 1 on any breach, against the budgets in Global Constraints.
- **`ci.yml`:**
  - Triggers: `on: [pull_request, push: { branches: [main] }]`, `concurrency: ci-${{ github.ref }}`, `permissions: contents: read`.
  - **`verify`** (ubuntu-latest):
    - `actions/checkout@v4`, then `actions/setup-node@v4` with `node-version-file: .nvmrc` and `cache: npm`
    - `npm ci`, `npm run check`, `npm run build`, `npm run size`
    - `npx playwright install --with-deps chromium webkit`, then `npm run e2e`
  - **`preview`** (PRs, needs `verify`): `npx wrangler versions upload --preview-alias pr-${{ github.event.number }}` with env `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` and `VITE_CF_BEACON_TOKEN: ${{ vars.VITE_CF_BEACON_TOKEN }}`.
  - **`deploy`** (push to main, needs `verify`): `npm run build && npx wrangler deploy` with the same env.

- [ ] **Step 1: Run the budget script against the current build.**
  - Run: `npm run build && npm run size`
  - Expected: a table printed, and exit 0. If it exits 1, reduce the offending bundle (lazy-load the sheets with `import()`) until it passes; do not raise a budget.

- [ ] **Step 2: Validate the workflow syntax.**
  - Run: `npx --yes @action-validator/cli .github/workflows/ci.yml`
  - Expected: no errors.

- [ ] **Step 3: Commit.**

```bash
git add -A && git commit -m "ci: verify, budgets, PR preview deploys and production deploy"
```

- [ ] **Step 4: [owner] Configure GitHub.**
  - Secrets `CLOUDFLARE_API_TOKEN` (permissions: Workers Scripts Edit, Account Analytics Read) and `CLOUDFLARE_ACCOUNT_ID`.
  - Variable `VITE_CF_BEACON_TOKEN`.
  - Push `revamp` and open a PR. Expected: `verify` and `preview` are green, and the preview URL loads.

---

### Task 7: Production cut-over, docs and Vercel retirement

**Files:**
- Modify: `wrangler.jsonc` (add `"routes": [{ "pattern": "pismozones.ashwingopalsamy.in", "custom_domain": true }]`), `README.md` (rewrite)
- Create: branch `legacy-redirect` (orphan) containing only `vercel.json`

**Interfaces:**
- **README sections:**
  1. What it is (one paragraph).
  2. Features (zones, plan, command bar, sharing, holidays, PWA).
  3. Privacy: what is collected, linking `docs/analytics.md`.
  4. Develop: `npm ci`, `npm run dev`, and a scripts table.
  5. Architecture: the layer diagram from spec §4.1 and the repo map.
  6. Testing: the unit, worker, e2e and budget commands.
  7. Deploy: CI, manual `npm run deploy`, the custom domain.
  8. Licence.
- **`legacy-redirect` `vercel.json`:**

```json
{ "redirects": [{ "source": "/(.*)", "destination": "https://pismozones.ashwingopalsamy.in/$1", "permanent": true }] }
```

- [ ] **Step 1: Write the README and the routes entry, then run the gate.**
  - Run: `npm run check && npm run build`
  - Expected: PASS.

- [ ] **Step 2: Commit.**

```bash
git add -A && git commit -m "docs: README for the Cloudflare revamp; route custom domain"
```

- [ ] **Step 3: [owner] Set up DNS and Cloudflare.**
  1. Add `ashwingopalsamy.in` to Cloudflare on the Free plan. Confirm the imported DNS records match the registrar's, including MX/TXT for email, then switch nameservers at the registrar and wait for "Active".
  2. In Web Analytics, add the site and copy the token into the GitHub variable.
  3. Merge the PR. The `deploy` job publishes, and the custom domain attaches through `routes`.

  Verify:
  - `curl -sI https://pismozones.ashwingopalsamy.in/` returns `200` with the CSP header.
  - `curl -s https://pismozones.ashwingopalsamy.in/s/10p00hwf | grep -o '<title>[^<]*'` prints `<title>15:00 in Austin · Wed 7 Oct`.

- [ ] **Step 4: Prepare the legacy redirect branch, then [owner] retire Vercel.**

```bash
git switch --orphan legacy-redirect && printf '%s\n' '{ "redirects": [{ "source": "/(.*)", "destination": "https://pismozones.ashwingopalsamy.in/$1", "permanent": true }] }' > vercel.json
git add vercel.json && git commit -m "chore: redirect legacy Vercel host to Cloudflare" && git switch revamp
```

  **[owner]** Push `legacy-redirect`, set it as the Vercel project's Production Branch, and redeploy.

  Verify: `curl -sI https://pismozones.vercel.app/s/10p00hwf` returns `308` with `location: https://pismozones.ashwingopalsamy.in/s/10p00hwf`.

  Delete the Vercel project once Web Analytics shows no `pismozones.vercel.app` referrals for 30 days.

---

### Task 8: Acceptance pass

**Files:**
- Create: `tests/e2e/share.spec.ts`

**Interfaces:**
- Consumes: everything.
- Produces: a filled-in copy of spec §12 in the PR description, with the command or test that proved each item.

- [ ] **Step 1: Write the cross-timezone share test.**

```ts
for (const tz of ['America/Sao_Paulo', 'America/Chicago', 'Asia/Kolkata']) {
  test.describe(tz, () => {
    test.use({ timezoneId: tz });
    test(`v1 link shows Austin 15:00 Wed 7 Oct in ${tz}`, async ({ page }) => {
      await page.clock.install({ time: new Date('2026-10-07T14:22:00Z') });
      await page.goto('/s/10p00hwf');
      await expect(page.getByText('Shared time · Wed 7 Oct 15:00 Austin')).toBeVisible();
      await expect(page.getByRole('article', { name: /^Austin, 15:00,/ })).toBeVisible();
      await page.getByRole('button', { name: 'Back to my view' }).click();
      await expect(page.getByRole('article')).toHaveCount(4);
    });
  });
}
```

  Run it in the `prod` project, so the Worker serves `/s/*`.

- [ ] **Step 2: Run the full suite.**
  - Run: `npm run check && npm run build && npm run size && npm run e2e && npx playwright test --project=prod`
  - Expected: everything PASS.

- [ ] **Step 3: Walk the spec §12 checklist and record the evidence for each item:**
  - **C1:** `share.spec.ts` plus the codec tests.
  - **C2–C8:** the parser corpus and `diagnose.test.ts`.
  - **C9:** `og.test.ts`.
  - **C10:** `coverage.test.ts`.
  - **C11:** the ZoneCard tests.
  - **U1/U2:** the CommandBar tests and `zones.spec.ts`.
  - **U7:** `plan.spec.ts`.
  - **Budget:** `npm run size` output.
  - **1 Hz:** a render-counter check in DevTools over 5 s (only `LiveSeconds` updates).
  - **Offline and update:** `pwa.spec.ts`.
  - **axe:** `a11y.spec.ts`.
  - **Third parties:** `network.spec.ts`.

- [ ] **Step 4: [owner] Native review of the PT-BR copy.**
  - Hand `src/ui/i18n/pt-BR.ts` to a native Portuguese speaker on the São Paulo team, and apply their edits.
  - Then run `npm run test`. Expected: PASS (the placeholder-parity test).

- [ ] **Step 5: Commit and finish.**

```bash
git add -A && git commit -m "test: cross-timezone share acceptance; record spec §12 evidence"
```

  Then use superpowers:finishing-a-development-branch.

---

## Plan 3 exit criteria

These must all hold:
- Production serves `pismozones.ashwingopalsamy.in` with CI green.
- Every spec §12 item has recorded evidence.
- `pismozones.vercel.app` 308-redirects with the path preserved.
- The analytics queries in `docs/analytics.md` return data.
