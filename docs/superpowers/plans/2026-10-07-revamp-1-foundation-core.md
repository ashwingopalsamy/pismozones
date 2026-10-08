# Pismo Zones Revamp — Plan 1 of 3: Foundation and Core Engine

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy toolchain with the new TypeScript, Preact and Cloudflare skeleton, and build `src/core`. The core is a pure, fully tested time engine: zones, cities, holidays, work state, sun and sky, parser, planner, and share codec.

**Architecture:** `src/core` is framework-free TypeScript with no DOM, no I/O and no clock reads. Every function takes the instant it needs, which lets the browser, the Worker and Node tests share it unchanged. Zone math uses `Intl.DateTimeFormat`, with explicit DST disambiguation. This plan ends with a building app shell (a placeholder page), a pass-through Worker, and a green test suite.

**Tech Stack:**
- TypeScript (strict)
- Vite, `@preact/preset-vite`, `@cloudflare/vite-plugin`, Wrangler
- Vitest and fast-check
- Biome
- Node 24 LTS, npm

**Spec:** `docs/superpowers/specs/2026-10-07-pismozones-revamp-design.md` (read §4–§5 before starting).

**Plan sequence:**
- **Plan 1 (this):** foundation and core.
- **Plan 2:** `2026-10-07-revamp-2-app.md` — state and UI.
- **Plan 3:** `2026-10-07-revamp-3-platform.md` — Worker, PWA, analytics and deploy.

Work happens on branch `revamp`.

## Global Constraints

- **Toolchain:** Node 24 LTS (`.nvmrc` = `24`) and npm. TypeScript runs with `strict`, `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes` all `true`.
- **Layer rule:** `src/core` may import only from `src/core`.
  - It must not reference `Date.now`, `new Date()` without arguments, `window`, `document`, `localStorage` or `navigator`.
  - `src/state` must not import `src/ui`.
  - `worker/` must not import `src/state` or `src/ui`.
  - The architecture test (Task 1) enforces all of this.
- **Instants:** epoch milliseconds (UTC) typed as `Instant = number`. Wall-clock values exist only as `CivilDateTime` objects.
- **Office ids are unchanged from v1:** `saopaulo`, `austin`, `bristol`, `bangalore`, `singapore`, `warsaw`, `mexicocity`, `buenosaires`, `bogota`, `sydney`, `hochiminh`, `jakarta`.
- **Offset labels** use U+2212 MINUS SIGN for negatives: `UTC−3`, `UTC+5:30`, `UTC+0`.
- **Browser floor:** Safari 16.4, Chrome/Edge 111, Firefox 115.
  - Do not use `Temporal`.
  - Do not pass offset strings (e.g. `+05:30`) as `Intl` `timeZone`; fixed offsets are handled in code.
- **Dependencies:** no runtime dependencies other than `preact` and `@preact/signals` (both added in Task 1, unused until Plan 2).
- **Commits:** Conventional Commit messages, with no attribution trailers.
- **Testing:** test files are co-located as `*.test.ts`. Run a single file with `npx vitest run <path>`.
- **Shared test fixture:** `NOW = Date.UTC(2026, 9, 7, 14, 22)`. This is Wed 7 Oct 2026, which is 11:22 in São Paulo and 19:52 in Bangalore.

## Review Focus

1. **Accented, uppercase and messy input.** `"SÃO PAULO 15:00 → Bengaluru"` and `"  3PM  bristol→austin "` must parse exactly like their clean forms. The test is in Task 9 (corpus rows 25–26).
2. **Year and month boundaries.** Two cases:
   - "tomorrow" on 31 Dec rolls to 1 Jan.
   - 23:30 tomorrow in São Paulo is the day after tomorrow in Singapore.
   The tests are in Task 3 (`relativeDay` across a year) and Task 9 (corpus row 32: tomorrow 23:30 in São Paulo is already Friday in Singapore).
3. **Half-hour zones as the reference.** Bangalore +5:30 must align plan slots to Bangalore midnight. The test is in Task 11 (`refers to a half-hour zone`).
4. **Garbage input.** Emoji, 500-character strings, lone punctuation and `"99"` must never throw, and every non-space character must be covered by a span. The test is in Task 10 (`fuzz`).
5. **Cross-office day flips.** When it is Friday evening in Austin it is Saturday morning in Singapore, and work state must follow each office's own calendar day. The test is in Task 6 (`Friday evening in Austin is Saturday in Singapore`).

---

### Task 1: Toolchain reset and skeleton

**Files:**
- Delete:
  - `src/` (all legacy files)
  - `api/`, `vercel.json`, `eslint.config.js`
  - `public/sw.js`, `public/sw-init.js`, `public/offline.html`
  - `public/fonts/*`
  - `public/Screenshot 2026-01-30 at 17.58.17.png`
- Create:
  - `.nvmrc`
  - `tsconfig.json`, `tsconfig.worker.json`, `tsconfig.node.json`
  - `vite.config.ts`, `vitest.config.ts`, `biome.json`, `wrangler.jsonc`
  - `worker/index.ts`
  - `src/main.tsx`, `src/test-setup.ts`
  - `src/architecture.test.ts`
- Modify: `package.json`, `index.html`, `.gitignore`

**Interfaces:**
- Produces:
  - **Path aliases:** `@core/*` → `src/core/*`, `@state/*` → `src/state/*`, `@ui/*` → `src/ui/*`, in both TypeScript and Vite.
  - **npm scripts:** `dev`, `build`, `preview`, `check`, `test`, `test:watch`, `typecheck`, `lint`, `cf-typegen`.
  - **Worker:** an `Env` type with an `ASSETS: Fetcher` binding and an `EVENTS: AnalyticsEngineDataset` binding, generated into `worker-configuration.d.ts` by `wrangler types`.

- [ ] **Step 1: Remove the legacy app and Vercel artifacts.**

```bash
git rm -r -q src api vercel.json eslint.config.js public/sw.js public/sw-init.js public/offline.html public/fonts "public/Screenshot 2026-01-30 at 17.58.17.png"
```

- [ ] **Step 2: Rewrite `package.json`.**
  - Set `"name": "pismozones"`, `"version": "2.0.0"`, `"private": true`, `"type": "module"` and `"engines": {"node": ">=24"}`.
  - Scripts:
    - `"dev": "vite"`
    - `"build": "npm run typecheck && vite build"`
    - `"preview": "npm run build && vite preview"`
    - `"typecheck": "tsc -p tsconfig.json --noEmit && tsc -p tsconfig.worker.json --noEmit && tsc -p tsconfig.node.json --noEmit"`
    - `"lint": "biome check ."`
    - `"test": "vitest run"`
    - `"test:watch": "vitest"`
    - `"check": "npm run lint && npm run typecheck && npm run test"`
    - `"cf-typegen": "wrangler types"`
  - Install runtime deps: `preact @preact/signals`.
  - Install dev deps: `typescript vite @preact/preset-vite @cloudflare/vite-plugin wrangler vitest @vitest/coverage-v8 fast-check jsdom @testing-library/preact @testing-library/user-event @testing-library/jest-dom @biomejs/biome @types/node`.
  - Use the current stable versions; the lockfile pins them.

- [ ] **Step 3: Write the configs.**
  - **`tsconfig.json`** (the app):
    - `include: ["src"]`
    - `jsx: "react-jsx"` with `jsxImportSource: "preact"`.
    - `lib: ["ES2023", "DOM", "DOM.Iterable"]`.
    - `module: "ESNext"`, `moduleResolution: "Bundler"`.
    - The three strict flags from Global Constraints.
    - `paths` for the aliases.
    - `types: ["vite/client"]`.
  - **`tsconfig.worker.json`:** `include: ["worker", "src/core"]` and `types: ["./worker-configuration.d.ts"]`.
  - **`tsconfig.node.json`:** for `vite.config.ts` and `vitest.config.ts`.
  - **`vite.config.ts`:** plugins `[preact(), cloudflare()]`, plus `resolve.alias` for the three aliases.
  - **`vitest.config.ts`:**
    - Plugins `[preact()]`, the same aliases, and no cloudflare plugin.
    - `test.projects`:
      - `{ test: { name: 'core', environment: 'node', include: ['src/core/**/*.test.ts', 'src/*.test.ts'] } }`
      - `{ test: { name: 'app', environment: 'jsdom', include: ['src/state/**/*.test.{ts,tsx}', 'src/ui/**/*.test.{ts,tsx}'], setupFiles: ['src/test-setup.ts'] } }`
    - Both projects set `extends: true`.
  - **`biome.json`:** formatter with 2-space indent, single quotes, semicolons and line width 100; linter `recommended`; ignore `dist`, `.wrangler`, `worker-configuration.d.ts` and `docs/design`.
  - **`wrangler.jsonc`:**

```jsonc
{
  "$schema": "node_modules/wrangler/config-schema.json",
  "name": "pismozones",
  "main": "worker/index.ts",
  "compatibility_date": "2026-10-01",
  "workers_dev": true,
  "assets": { "binding": "ASSETS", "not_found_handling": "single-page-application", "run_worker_first": ["/s/*", "/e"] },
  "analytics_engine_datasets": [{ "binding": "EVENTS", "dataset": "pismozones_events" }],
  "observability": { "enabled": true }
}
```

  - **`.nvmrc`:** `24`.
  - **`.gitignore`:** add `.wrangler/` and `dist/`.

- [ ] **Step 4: Write the skeleton entry points.**
  - **`worker/index.ts`:** `export default { fetch: (request, env) => env.ASSETS.fetch(request) } satisfies ExportedHandler<Env>;`. Plan 3 replaces this.
  - **`src/main.tsx`:** renders `<main id="app">Pismo Zones</main>` into `#root` with `preact`'s `render`.
  - **`index.html`:** `<!doctype html>`, `lang="en"`, charset, `viewport` (`width=device-width, initial-scale=1, viewport-fit=cover`), `<title>Pismo Zones</title>`, `<div id="root"></div>` and `<script type="module" src="/src/main.tsx"></script>`. Plan 2 completes the head.
  - **`src/test-setup.ts`:** `import '@testing-library/jest-dom/vitest';`
  - Then run `npm run cf-typegen`.

- [ ] **Step 5: Write the failing architecture test in `src/architecture.test.ts`.**

```ts
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : /\.(ts|tsx)$/.test(p) && !p.includes('.test.') ? [p] : [];
  });
const imports = (file: string) => [...readFileSync(file, 'utf8').matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]!);

describe('architecture', () => {
  it('core imports only core', () => {
    for (const f of walk('src/core'))
      for (const i of imports(f)) expect(i, `${f} → ${i}`).toMatch(/^(\.{1,2}\/|@core\/)/);
  });
  it('core is pure (no clock, DOM or storage access)', () => {
    for (const f of walk('src/core')) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/Date\.now\(|new Date\(\)|\bwindow\.|\bdocument\.|localStorage|navigator\./);
    }
  });
  it('state never imports ui; worker never imports state or ui', () => {
    for (const f of walk('src/state')) for (const i of imports(f)) expect(i, f).not.toMatch(/^@ui\/|\/ui\//);
    for (const f of walk('worker')) for (const i of imports(f)) expect(i, f).not.toMatch(/^@(state|ui)\/|preact/);
  });
});
```

  Create an empty `src/core/.gitkeep` and `src/state/.gitkeep`, and make `walk` tolerate a missing directory by returning `[]` when it does not exist.

- [ ] **Step 6: Run the checks.**
  - Run: `npm install && npm run check && npm run build`.
  - Expected: Biome clean, `tsc` clean, the 3 architecture tests passing, and `dist/` containing the client `index.html` and the worker bundle.

- [ ] **Step 7: Smoke-test the dev server.**
  - Run: `npm run dev`, then open the URL Vite prints (5173, or the next free port) at `/` and at `/anything`.
  - Expected: both show "Pismo Zones", the second via the SPA fallback. Stop the server.

- [ ] **Step 8: Commit.**

```bash
git add -A
git commit -m "build: replace legacy toolchain with TS + Preact + Vite + Cloudflare Workers skeleton"
```

---

### Task 2: Zoned time (`src/core/time/zoned.ts`)

**Files:**
- Create: `src/core/time/zoned.ts`, `src/core/time/types.ts`
- Test: `src/core/time/zoned.test.ts`

**Interfaces:**
- Produces from `types.ts`:

```ts
export type Instant = number;
export interface CivilDate { year: number; month: number; day: number }            // month 1–12
export interface CivilDateTime extends CivilDate { hour: number; minute: number; second: number }
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;                                   // 0 = Sunday
export interface ZonedFields extends CivilDateTime { weekday: Weekday; offsetMinutes: number }
export type ZoneId = string;                                                       // IANA name, 'UTC', or 'UTC±h[:mm]'
export type Disambiguation = 'compatible' | 'earlier' | 'later' | 'reject';
export interface Resolution { instant: Instant; kind: 'exact' | 'gap' | 'overlap'; earlier: Instant; later: Instant }
```

- Produces from `zoned.ts`:
  - `zonedFields(instant, zone): ZonedFields`
  - `offsetMinutes(instant, zone): number`
  - `toInstant(civil: CivilDateTime, zone, disambiguation: Disambiguation = 'compatible'): Resolution`
  - `startOfDay(date: CivilDate, zone): { start: Instant; end: Instant; lengthMs: number }`
  - `addDays(date: CivilDate, days: number): CivilDate`
  - `civilDate(instant, zone): CivilDate`
  - `parseFixedOffset(zone: string): number | null`
  - `isValidZone(zone: string): boolean`

- [ ] **Step 1: Write the failing tests.**

```ts
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { addDays, isValidZone, offsetMinutes, parseFixedOffset, startOfDay, toInstant, zonedFields } from './zoned';

const U = Date.UTC;
const civil = (y: number, mo: number, d: number, h = 0, mi = 0) => ({ year: y, month: mo, day: d, hour: h, minute: mi, second: 0 });

describe('offsetMinutes', () => {
  it('is DST-aware and handles fixed offsets', () => {
    expect(offsetMinutes(U(2026, 9, 7, 12), 'Europe/London')).toBe(60);
    expect(offsetMinutes(U(2026, 11, 7, 12), 'Europe/London')).toBe(0);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'America/Sao_Paulo')).toBe(-180);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'Asia/Kolkata')).toBe(330);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'UTC')).toBe(0);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'UTC+05:30')).toBe(330);
    expect(offsetMinutes(U(2026, 9, 7, 12), 'UTC−3')).toBe(-180);
  });
});

describe('zonedFields', () => {
  it('projects an instant into a zone, crossing the date line', () => {
    expect(zonedFields(U(2026, 9, 7, 23, 30), 'Asia/Singapore')).toEqual({
      year: 2026, month: 10, day: 8, hour: 7, minute: 30, second: 0, weekday: 4, offsetMinutes: 480,
    });
  });
});

describe('toInstant', () => {
  it('exact', () => {
    expect(toInstant(civil(2026, 10, 7, 15), 'Europe/London')).toEqual({
      instant: U(2026, 9, 7, 14), kind: 'exact', earlier: U(2026, 9, 7, 14), later: U(2026, 9, 7, 14),
    });
  });
  it('spring-forward gap (Chicago 02:30 does not exist)', () => {
    const r = toInstant(civil(2026, 3, 8, 2, 30), 'America/Chicago');
    expect(r).toEqual({ instant: U(2026, 2, 8, 8, 30), kind: 'gap', earlier: U(2026, 2, 8, 7, 30), later: U(2026, 2, 8, 8, 30) });
    expect(toInstant(civil(2026, 3, 8, 2, 30), 'America/Chicago', 'earlier').instant).toBe(U(2026, 2, 8, 7, 30));
    expect(() => toInstant(civil(2026, 3, 8, 2, 30), 'America/Chicago', 'reject')).toThrow(RangeError);
  });
  it('fall-back overlap (Chicago 01:30 happens twice)', () => {
    const r = toInstant(civil(2026, 11, 1, 1, 30), 'America/Chicago');
    expect(r).toEqual({ instant: U(2026, 10, 1, 6, 30), kind: 'overlap', earlier: U(2026, 10, 1, 6, 30), later: U(2026, 10, 1, 7, 30) });
    expect(toInstant(civil(2026, 11, 1, 1, 30), 'America/Chicago', 'later').instant).toBe(U(2026, 10, 1, 7, 30));
  });
  it('London and Sydney transitions', () => {
    expect(toInstant(civil(2026, 3, 29, 1, 30), 'Europe/London')).toMatchObject({ kind: 'gap', instant: U(2026, 2, 29, 1, 30), earlier: U(2026, 2, 29, 0, 30) });
    expect(toInstant(civil(2026, 10, 25, 1, 30), 'Europe/London')).toMatchObject({ kind: 'overlap', earlier: U(2026, 9, 25, 0, 30), later: U(2026, 9, 25, 1, 30) });
    expect(toInstant(civil(2026, 10, 4, 2, 30), 'Australia/Sydney')).toMatchObject({ kind: 'gap', instant: U(2026, 9, 3, 16, 30) });
  });
  it('round-trips every real instant in every office zone', () => {
    const zones = ['America/Sao_Paulo', 'America/Chicago', 'Europe/London', 'Asia/Kolkata', 'Asia/Singapore', 'Europe/Warsaw',
      'America/Mexico_City', 'America/Argentina/Buenos_Aires', 'America/Bogota', 'Australia/Sydney', 'Asia/Ho_Chi_Minh', 'Asia/Jakarta'];
    fc.assert(fc.property(fc.integer({ min: U(2020, 0, 1) / 1000, max: U(2035, 0, 1) / 1000 }), fc.constantFrom(...zones), (sec, zone) => {
      const t = sec * 1000;
      const r = toInstant(zonedFields(t, zone), zone);
      if (r.kind === 'overlap') expect([r.earlier, r.later]).toContain(t);
      else expect(r).toMatchObject({ kind: 'exact', instant: t });
    }), { numRuns: 3000 });
  });
});

describe('startOfDay / addDays', () => {
  it('measures 23h and 25h days', () => {
    expect(startOfDay({ year: 2026, month: 3, day: 8 }, 'America/Chicago')).toEqual({ start: U(2026, 2, 8, 6), end: U(2026, 2, 9, 5), lengthMs: 23 * 3_600_000 });
    expect(startOfDay({ year: 2026, month: 11, day: 1 }, 'America/Chicago')).toEqual({ start: U(2026, 10, 1, 5), end: U(2026, 10, 2, 6), lengthMs: 25 * 3_600_000 });
    expect(startOfDay({ year: 2026, month: 10, day: 8 }, 'Asia/Kolkata').start).toBe(U(2026, 9, 7, 18, 30));
  });
  it('adds civil days across month and year ends', () => {
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
    expect(addDays({ year: 2026, month: 3, day: 1 }, -1)).toEqual({ year: 2026, month: 2, day: 28 });
  });
});

describe('zone parsing', () => {
  it('parses fixed offsets and validates zones', () => {
    expect(parseFixedOffset('UTC')).toBe(0);
    expect(parseFixedOffset('UTC+5')).toBe(300);
    expect(parseFixedOffset('UTC-3')).toBe(-180);
    expect(parseFixedOffset('UTC+05:30')).toBe(330);
    expect(parseFixedOffset('Europe/London')).toBeNull();
    expect(isValidZone('Europe/London')).toBe(true);
    expect(isValidZone('UTC+05:30')).toBe(true);
    expect(isValidZone('Mars/Olympus')).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/time/zoned.test.ts`
  - Expected: FAIL (module not found).

- [ ] **Step 3: Implement `zoned.ts`.**
  - **Formatters:** cache one `Intl.DateTimeFormat('en-US', { timeZone, hourCycle: 'h23', year, month, day, hour, minute, second: 'numeric', weekday: 'short' })` per zone.
  - **`zonedFields`:** read `formatToParts`, normalise hour `24` to `0`, and derive `offsetMinutes` from `(Date.UTC(fields) − floor(instant/1000)*1000) / 60000`.
  - **Fixed-offset zones:** `parseFixedOffset` matches `^UTC(?:([+−-])(\d{1,2})(?::?(\d{2}))?)?$`. These zones bypass `Intl`: shift the instant by the offset, then read the UTC getters.
  - **`isValidZone`:** use `parseFixedOffset`; otherwise try constructing the formatter.
  - **`toInstant`:** this algorithm is not determined by the tests, so follow it exactly.

```ts
// g = Date.UTC(civil); oBefore = offsetMinutes(g − 86_400_000), oAfter = offsetMinutes(g + 86_400_000)
// a = g − oBefore·60_000; b = g − oAfter·60_000; valid(x) ⇔ zonedFields(x) has the same y/mo/d/h/mi/s as civil
// both valid and a ≠ b → overlap { earlier: min(a,b), later: max(a,b) }; compatible|earlier → earlier
// exactly one valid      → exact  { instant = earlier = later = that one }
// none valid             → gap    { earlier: b, later: a }; compatible|later → a (shifted forward)
// 'reject' throws RangeError on gap or overlap
```

  - **`startOfDay`:**
    - `start = toInstant(midnight(date)).instant`
    - `end = toInstant(midnight(addDays(date, 1))).instant`
  - **`addDays`:** use `Date.UTC` arithmetic on the civil date.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/time/zoned.test.ts`
  - Expected: PASS, including the 3000-run property.

- [ ] **Step 5: Commit.**

```bash
git add src/core/time && git commit -m "feat(core): Intl-based zoned time with explicit DST disambiguation"
```

---

### Task 3: Formatting, relative days and transitions

**Files:**
- Create: `src/core/time/format.ts`, `src/core/time/relative.ts`, `src/core/time/transitions.ts`, `src/core/i18n.ts`
- Test: `src/core/time/format.test.ts`, `src/core/time/relative.test.ts`, `src/core/time/transitions.test.ts`

**Interfaces:**
- Consumes: `zoned.ts`, `types.ts` (Task 2).
- Produces:
  - **`i18n.ts`:** `export type Lang = 'en' | 'pt-BR'`.
  - **`format.ts`:**
    - `export type HourCycle = 'h12' | 'h23'`
    - `resolveHourCycle(pref: 'auto' | HourCycle, locale: string): HourCycle`
    - `formatClock(f: { hour: number; minute: number }, hc: HourCycle): { hm: string; period: '' | 'AM' | 'PM' }`
    - `formatOffset(minutes: number): string`
    - `formatShortDate(d: CivilDate & { weekday: Weekday }, lang: Lang): string`
  - **`relative.ts`:**
    - `export type RelativeDay = 'today' | 'tomorrow' | 'yesterday' | null`
    - `relativeDay(target: CivilDate, reference: CivilDate): RelativeDay`
    - `dayDelta(a: CivilDate, b: CivilDate): number`
    - `formatDelta(ms: number): string`
  - **`transitions.ts`:**
    - `export interface Transition { at: Instant; fromOffset: number; toOffset: number }`
    - `nextTransition(from: Instant, zone: ZoneId, horizonDays: number): Transition | null`

- [ ] **Step 1: Write the failing tests.**

```ts
// format.test.ts
expect(formatClock({ hour: 9, minute: 5 }, 'h23')).toEqual({ hm: '09:05', period: '' });
expect(formatClock({ hour: 9, minute: 5 }, 'h12')).toEqual({ hm: '9:05', period: 'AM' });
expect(formatClock({ hour: 0, minute: 0 }, 'h12')).toEqual({ hm: '12:00', period: 'AM' });
expect(formatClock({ hour: 12, minute: 30 }, 'h12')).toEqual({ hm: '12:30', period: 'PM' });
expect(formatClock({ hour: 23, minute: 59 }, 'h12')).toEqual({ hm: '11:59', period: 'PM' });
expect(formatOffset(-180)).toBe('UTC−3');
expect(formatOffset(330)).toBe('UTC+5:30');
expect(formatOffset(0)).toBe('UTC+0');
expect(formatOffset(-570)).toBe('UTC−9:30');
expect(formatShortDate({ year: 2026, month: 10, day: 8, weekday: 4 }, 'en')).toBe('Thu 8 Oct');
expect(formatShortDate({ year: 2026, month: 10, day: 8, weekday: 4 }, 'pt-BR')).toBe('qui 8 out');
expect(resolveHourCycle('auto', 'en-US')).toBe('h12');
expect(resolveHourCycle('auto', 'pt-BR')).toBe('h23');
expect(resolveHourCycle('auto', 'en-GB')).toBe('h23');
expect(resolveHourCycle('h12', 'pt-BR')).toBe('h12');

// relative.test.ts
const d = (year: number, month: number, day: number) => ({ year, month, day });
expect(relativeDay(d(2026, 10, 7), d(2026, 10, 7))).toBe('today');
expect(relativeDay(d(2026, 10, 8), d(2026, 10, 7))).toBe('tomorrow');
expect(relativeDay(d(2026, 10, 6), d(2026, 10, 7))).toBe('yesterday');
expect(relativeDay(d(2027, 1, 1), d(2026, 12, 31))).toBe('tomorrow');
expect(relativeDay(d(2026, 10, 10), d(2026, 10, 7))).toBeNull();
expect(dayDelta(d(2027, 1, 1), d(2026, 12, 31))).toBe(1);
expect(formatDelta(9_000_000)).toBe('+2h 30m');
expect(formatDelta(-2_700_000)).toBe('−45m');
expect(formatDelta(97_200_000)).toBe('+1d 3h');
expect(formatDelta(86_400_000)).toBe('+1d');
expect(formatDelta(3_600_000)).toBe('+1h');
expect(formatDelta(20_000)).toBe('Now');

// transitions.test.ts
const U = Date.UTC;
expect(nextTransition(U(2026, 9, 7, 12), 'Europe/London', 30)).toEqual({ at: U(2026, 9, 25, 1), fromOffset: 60, toOffset: 0 });
expect(nextTransition(U(2026, 8, 20), 'Australia/Sydney', 30)).toEqual({ at: U(2026, 9, 3, 16), fromOffset: 600, toOffset: 660 });
expect(nextTransition(U(2026, 9, 7), 'America/Chicago', 60)).toEqual({ at: U(2026, 10, 1, 7), fromOffset: -300, toOffset: -360 });
expect(nextTransition(U(2026, 9, 7), 'America/Sao_Paulo', 365)).toBeNull();
```

  Wrap each group in `describe`/`it` blocks.

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/time`
  - Expected: the new files FAIL.

- [ ] **Step 3: Implement the three modules.**
  - **`formatShortDate`:** use fixed arrays.
    - en weekdays: `Sun Mon Tue Wed Thu Fri Sat`; en months: `Jan … Dec`.
    - pt-BR weekdays: `dom seg ter qua qui sex sáb`; pt-BR months: `jan fev mar abr mai jun jul ago set out nov dez`.
    - Format: `${wd} ${day} ${mon}`.
  - **`resolveHourCycle('auto')`:** `new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hourCycle` — `h11` or `h12` → `'h12'`, otherwise `'h23'`.
  - **`formatDelta`:**
    - `|ms| < 30s` → `'Now'`.
    - Otherwise round to the minute and emit the sign (`+` or `−`), then `d`/`h`/`m` parts.
    - Minutes are omitted when days > 0.
  - **`nextTransition`:**
    - Step forward 6 h at a time comparing `offsetMinutes`.
    - On a change, binary-search the bracket to 60 000 ms precision.
    - `at` is the first instant with the new offset.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/time`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/core && git commit -m "feat(core): clock/offset/date formatting, relative days, DST transitions"
```

---

### Task 4: Text normalisation and office registry

**Files:**
- Create: `src/core/text/normalize.ts`, `src/core/cities/registry.ts`, `src/core/cities/shareIndex.ts`
- Test: `src/core/text/normalize.test.ts`, `src/core/cities/registry.test.ts`

**Interfaces:**
- Consumes: `isValidZone` (Task 2).
- Produces:

```ts
// normalize.ts
export function normalize(s: string): string;   // NFD, strip U+0300–U+036F, lowercase, collapse whitespace, trim
// registry.ts
export type OfficeId = 'saopaulo' | 'austin' | 'bristol' | 'bangalore' | 'singapore' | 'warsaw' | 'mexicocity'
  | 'buenosaires' | 'bogota' | 'sydney' | 'hochiminh' | 'jakarta';
export type CalendarId = 'br-sp' | 'us-tx' | 'gb-eng' | 'in-ka' | 'sg' | 'pl';
export interface Office {
  id: OfficeId; name: string; country: string; countryName: { en: string; pt: string }; zone: string;
  lat: number; lon: number; aliases: readonly string[]; workHours: { start: number; end: number };
  holidayCalendar: CalendarId | null; hq?: true;
}
export const OFFICES: readonly Office[];
export function getOffice(id: string): Office | undefined;
export function officeForZone(zone: string): Office | undefined;          // exact IANA match only
export const DEFAULT_ACTIVE: readonly OfficeId[];                         // ['austin','saopaulo','bristol','bangalore']
// shareIndex.ts
export const SHARE_INDEX: readonly OfficeId[];                           // frozen v1 order, append-only
```

- [ ] **Step 1: Write the failing tests.**

```ts
// normalize.test.ts
expect(normalize('  SÃO   Paulo ')).toBe('sao paulo');
expect(normalize('Bogotá')).toBe('bogota');

// registry.test.ts
it('keeps the v1 share order forever (append-only)', () => {
  expect(SHARE_INDEX).toEqual(['saopaulo', 'austin', 'bristol', 'bangalore', 'singapore', 'warsaw', 'mexicocity',
    'buenosaires', 'bogota', 'sydney', 'hochiminh', 'jakarta']);
});
it('every office is valid, aliases are normalised and unique', () => {
  const seen = new Set<string>();
  for (const o of OFFICES) {
    expect(isValidZone(o.zone)).toBe(true);
    for (const a of o.aliases) { expect(normalize(a)).toBe(a); expect(seen.has(a)).toBe(false); seen.add(a); }
  }
  expect(OFFICES.map((o) => o.id).sort()).toEqual([...SHARE_INDEX].sort());
});
it('looks up offices', () => {
  expect(getOffice('saopaulo')?.hq).toBe(true);
  expect(officeForZone('Asia/Kolkata')?.id).toBe('bangalore');
  expect(officeForZone('America/New_York')).toBeUndefined();
  expect(DEFAULT_ACTIVE).toEqual(['austin', 'saopaulo', 'bristol', 'bangalore']);
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/text src/core/cities`
  - Expected: FAIL.

- [ ] **Step 3: Implement the registry with these exact values.**
  - All offices use `workHours {start: 540, end: 1080}`.
  - `country` is ISO 3166-1 alpha-2.

| id | name | country | zone | lat, lon | calendar | aliases |
|---|---|---|---|---|---|---|
| saopaulo (hq) | São Paulo | BR (Brazil / Brasil) | America/Sao_Paulo | −23.55, −46.63 | br-sp | `sao paulo`, `saopaulo`, `sampa`, `sp`, `gru`, `hq`, `brazil`, `brasil` |
| austin | Austin | US (United States / Estados Unidos) | America/Chicago | 30.27, −97.74 | us-tx | `austin`, `atx`, `aus`, `texas`, `usa` |
| bristol | Bristol | GB (United Kingdom / Reino Unido) | Europe/London | 51.45, −2.59 | gb-eng | `bristol`, `brs`, `london`, `uk`, `england`, `britain` |
| bangalore | Bangalore | IN (India / Índia) | Asia/Kolkata | 12.97, 77.59 | in-ka | `bangalore`, `bengaluru`, `blr`, `india` |
| singapore | Singapore | SG (Singapore / Singapura) | Asia/Singapore | 1.35, 103.82 | sg | `singapore`, `singapura`, `sin`, `sg` |
| warsaw | Warsaw | PL (Poland / Polônia) | Europe/Warsaw | 52.23, 21.01 | pl | `warsaw`, `warszawa`, `waw`, `poland`, `polska` |
| mexicocity | Mexico City | MX (Mexico / México) | America/Mexico_City | 19.43, −99.13 | null | `mexico city`, `ciudad de mexico`, `cdmx`, `mex`, `mexico` |
| buenosaires | Buenos Aires | AR (Argentina) | America/Argentina/Buenos_Aires | −34.60, −58.38 | null | `buenos aires`, `bue`, `argentina` |
| bogota | Bogotá | CO (Colombia / Colômbia) | America/Bogota | 4.71, −74.07 | null | `bogota`, `bog`, `colombia` |
| sydney | Sydney | AU (Australia / Austrália) | Australia/Sydney | −33.87, 151.21 | null | `sydney`, `syd`, `australia` |
| hochiminh | Ho Chi Minh | VN (Vietnam / Vietnã) | Asia/Ho_Chi_Minh | 10.82, 106.63 | null | `ho chi minh`, `ho chi minh city`, `hcmc`, `saigon`, `sgn`, `vietnam` |
| jakarta | Jakarta | ID (Indonesia / Indonésia) | Asia/Jakarta | −6.21, 106.85 | null | `jakarta`, `cgk`, `indonesia` |

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/text src/core/cities`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/core && git commit -m "feat(core): office registry, frozen share index, text normalisation"
```

---

### Task 5: Holiday calendars

**Files:**
- Create:
  - `src/core/work/holidays/engine.ts` (rules and lists)
  - `src/core/work/holidays/easter.ts`
  - `src/core/work/holidays/calendars/{br-sp,us-tx,gb-eng,pl,in-ka,sg}.ts`
  - `src/core/work/holidays/index.ts`
- Test: `src/core/work/holidays/holidays.test.ts`, `src/core/work/holidays/coverage.test.ts`

**Interfaces:**
- Consumes: `CivilDate`, `Weekday`, `addDays` (Task 2); `CalendarId` (Task 4).
- Produces:

```ts
export interface Holiday { date: string; name: { en: string; pt: string }; kind: 'full' | 'half' }   // date 'YYYY-MM-DD'
export interface CalendarInfo { id: CalendarId; status: 'public' | 'office'; sources: readonly string[] }
export function calendarInfo(id: CalendarId): CalendarInfo;
export function holidaysIn(id: CalendarId, year: number): readonly Holiday[];      // sorted by date, memoised
export function holidayOn(id: CalendarId, date: CivilDate): Holiday | undefined;
export function upcomingHolidays(ids: readonly CalendarId[], from: CivilDate, days: number): Array<Holiday & { calendar: CalendarId }>;
export function listCoverageEnd(id: CalendarId): CivilDate | null;                // null ⇒ rule-based (never expires)
export function easterSunday(year: number): CivilDate;
```

- **Rule kinds** (internal to `engine.ts`):
  - `{ type: 'fixed', month, day, name, kind?, observe?: 'us' | 'substitute' }`
  - `{ type: 'nth', month, weekday, n /* −1 = last */, name }`
  - `{ type: 'easter', offset, name, kind? }`
  - `{ type: 'list', entries: Holiday[] }`
- **Observance:**
  - `us`: Saturday → Friday, Sunday → Monday, with the name suffixed " (observed)" / " (ponto observado)".
  - `substitute`: on a weekend, move to the next weekday that is not already a holiday. Resolve in date order, so Christmas lands before Boxing Day.

- [ ] **Step 1: Write the failing tests.**

```ts
const on = (id: CalendarId, s: string) => {
  const [y, m, d] = s.split('-').map(Number) as [number, number, number];
  return holidayOn(id, { year: y, month: m, day: d });
};
it('computes Easter', () => {
  expect(easterSunday(2024)).toEqual({ year: 2024, month: 3, day: 31 });
  expect(easterSunday(2026)).toEqual({ year: 2026, month: 4, day: 5 });
  expect(easterSunday(2027)).toEqual({ year: 2027, month: 3, day: 28 });
});
it('São Paulo', () => {
  expect(on('br-sp', '2026-02-17')?.name.pt).toBe('Carnaval');
  expect(on('br-sp', '2026-02-18')).toMatchObject({ kind: 'half', name: { en: 'Ash Wednesday', pt: 'Quarta-feira de Cinzas' } });
  expect(on('br-sp', '2026-04-03')?.name.en).toBe('Good Friday');
  expect(on('br-sp', '2026-06-04')?.name.en).toBe('Corpus Christi');
  expect(on('br-sp', '2026-10-12')?.name).toEqual({ en: 'Our Lady of Aparecida', pt: 'Nossa Senhora Aparecida' });
  expect(on('br-sp', '2026-11-20')?.name.pt).toBe('Dia da Consciência Negra');
  expect(on('br-sp', '2026-01-25')?.name.pt).toBe('Aniversário de São Paulo');
});
it('Austin (US federal, without Columbus and Veterans Day)', () => {
  expect(on('us-tx', '2026-01-19')?.name.en).toBe('Martin Luther King Jr. Day');
  expect(on('us-tx', '2026-05-25')?.name.en).toBe('Memorial Day');
  expect(on('us-tx', '2026-07-03')?.name.en).toBe('Independence Day (observed)');
  expect(on('us-tx', '2026-09-07')?.name.en).toBe('Labor Day');
  expect(on('us-tx', '2026-11-26')?.name.en).toBe('Thanksgiving');
  expect(on('us-tx', '2026-10-12')).toBeUndefined();
  expect(on('us-tx', '2026-11-11')).toBeUndefined();
});
it('Bristol (England bank holidays with substitutes)', () => {
  expect(on('gb-eng', '2026-04-06')?.name.en).toBe('Easter Monday');
  expect(on('gb-eng', '2026-05-04')?.name.en).toBe('Early May bank holiday');
  expect(on('gb-eng', '2026-08-31')?.name.en).toBe('Summer bank holiday');
  expect(on('gb-eng', '2026-12-28')?.name.en).toBe('Boxing Day (substitute day)');
  expect(on('gb-eng', '2027-12-27')?.name.en).toBe('Christmas Day (substitute day)');
  expect(on('gb-eng', '2027-12-28')?.name.en).toBe('Boxing Day (substitute day)');
});
it('Warsaw', () => {
  expect(on('pl', '2026-04-06')?.name.en).toBe('Easter Monday');
  expect(on('pl', '2026-12-24')?.name.en).toBe('Christmas Eve');
});
it('Bangalore and Singapore (lists)', () => {
  expect(on('in-ka', '2026-01-26')?.name.en).toBe('Republic Day');
  expect(on('in-ka', '2026-10-02')?.name.en).toBe('Gandhi Jayanti');
  expect(on('in-ka', '2026-11-01')?.name.en).toBe('Kannada Rajyotsava');
  expect(on('sg', '2026-08-10')?.name.en).toBe('National Day (observed)');
});
it('upcoming merges calendars in date order', () => {
  const u = upcomingHolidays(['br-sp', 'gb-eng'], { year: 2026, month: 10, day: 7 }, 30);
  expect(u.map((h) => [h.calendar, h.date])).toEqual([['br-sp', '2026-10-12'], ['br-sp', '2026-11-02']]);
});
```

  **`coverage.test.ts`** (intentionally time-dependent: it is the staleness alarm):

```ts
it('list-based calendars cover at least 180 days ahead', () => {
  const horizon = new Date(Date.now() + 180 * 86_400_000).toISOString().slice(0, 10);
  for (const id of ['in-ka', 'sg'] as const) {
    const end = listCoverageEnd(id)!;
    expect(`${end.year}-${String(end.month).padStart(2, '0')}-${String(end.day).padStart(2, '0')}` >= horizon, id).toBe(true);
  }
});
```

  `coverage.test.ts` may call `Date.now()`, because test files are exempt from the purity rule. The architecture test skips `*.test.ts`.

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/work/holidays`
  - Expected: FAIL.

- [ ] **Step 3: Implement the engine and calendars.**
  - **Easter:** the anonymous Gregorian (Meeus/Jones/Butcher) algorithm.
  - **Every calendar file** exports `{ info: CalendarInfo; rules: Rule[] }`. `info.status` is `'public'` and `sources` lists the official URLs.
  - **br-sp** (no observance shifting):
    - Jan 1 Confraternização Universal / New Year's Day
    - Jan 25 Aniversário de São Paulo / São Paulo Anniversary
    - Easter −48 Carnaval / Carnival; −47 Carnaval / Carnival
    - Easter −46 Quarta-feira de Cinzas / Ash Wednesday (`half`)
    - Easter −2 Sexta-feira Santa / Good Friday
    - Apr 21 Tiradentes / Tiradentes
    - May 1 Dia do Trabalho / Labour Day
    - Easter +60 Corpus Christi / Corpus Christi
    - Jul 9 Revolução Constitucionalista / Constitutionalist Revolution
    - Sep 7 Independência do Brasil / Independence Day
    - Oct 12 Nossa Senhora Aparecida / Our Lady of Aparecida
    - Nov 2 Finados / All Souls' Day
    - Nov 15 Proclamação da República / Republic Day
    - Nov 20 Dia da Consciência Negra / Black Consciousness Day
    - Dec 25 Natal / Christmas Day
  - **us-tx** (`observe: 'us'` on fixed dates):
    - Jan 1 New Year's Day / Ano-Novo
    - 3rd Mon Jan Martin Luther King Jr. Day / Dia de Martin Luther King Jr.
    - 3rd Mon Feb Washington's Birthday / Dia dos Presidentes
    - last Mon May Memorial Day / Memorial Day
    - Jun 19 Juneteenth / Juneteenth
    - Jul 4 Independence Day / Dia da Independência dos EUA
    - 1st Mon Sep Labor Day / Dia do Trabalho (EUA)
    - 4th Thu Nov Thanksgiving / Ação de Graças
    - Dec 25 Christmas Day / Natal
  - **gb-eng:**
    - Jan 1 New Year's Day (`substitute`)
    - Easter −2 Good Friday / Sexta-feira Santa
    - Easter +1 Easter Monday / Segunda-feira de Páscoa
    - 1st Mon May Early May bank holiday / Feriado bancário de maio
    - last Mon May Spring bank holiday / Feriado bancário de primavera
    - last Mon Aug Summer bank holiday / Feriado bancário de verão
    - Dec 25 Christmas Day (`substitute`)
    - Dec 26 Boxing Day / Boxing Day (`substitute`)
    - Substitute names append " (substitute day)" / " (dia substituto)".
  - **pl** (no substitution):
    - Jan 1 New Year's Day
    - Jan 6 Epiphany / Epifania
    - Easter +1 Easter Monday
    - May 1 Labour Day
    - May 3 Constitution Day / Dia da Constituição
    - Easter +60 Corpus Christi
    - Aug 15 Assumption Day / Assunção de Nossa Senhora
    - Nov 1 All Saints' Day / Dia de Todos os Santos
    - Nov 11 Independence Day / Dia da Independência
    - Dec 24 Christmas Eve / Véspera de Natal
    - Dec 25 Christmas Day
    - Dec 26 Second Day of Christmas / Segundo dia de Natal
  - **in-ka:** a `list` for 2026 and 2027, transcribed from the Government of Karnataka general-holidays notifications.
    - Use the source URLs in `sources`.
    - Include every general holiday, including Republic Day, Gandhi Jayanti and Kannada Rajyotsava.
    - If the 2027 Karnataka notification is not yet published, use the Government of India 2027 gazetted list for 2027, plus Kannada Rajyotsava (Nov 1), and record the source used.
  - **sg:** a `list` for 2026 and 2027 from the Ministry of Manpower public-holidays pages, including "(observed)" Mondays exactly as MOM lists them.
  - **`listCoverageEnd`:** returns 31 Dec of the last listed year.
  - **`holidaysIn`:** memoised per `(id, year)`.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/work/holidays`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/core/work && git commit -m "feat(core): rule- and list-based office holiday calendars with coverage guard"
```

---

### Task 6: Work policy

**Files:**
- Create: `src/core/work/policy.ts`
- Test: `src/core/work/policy.test.ts`

**Interfaces:**
- Consumes: `zonedFields` (Task 2), `Office` (Task 4), `holidayOn`, `Holiday` (Task 5).
- Produces:

```ts
export type WorkKind = 'working' | 'early' | 'late' | 'off' | 'weekend' | 'holiday';
export interface WorkState { kind: WorkKind; holiday?: Holiday; halfDay?: Holiday }
export function workState(instant: Instant, office: Office): WorkState;
```

  The rules apply to local minutes `m` on Mon–Fri, in precedence order:
  1. A `full` holiday → `holiday`.
  2. Saturday or Sunday → `weekend`.
  3. Otherwise, with `start = workHours.start` and `end = workHours.end` (or `780` on a `half` holiday, which also sets `halfDay`):
     - `start ≤ m < end` → `working`
     - `start − 120 ≤ m < start` → `early`
     - `end ≤ m < end + 120` → `late`
     - else `off`

- [ ] **Step 1: Write the failing tests.**

```ts
const U = Date.UTC; const o = (id: string) => getOffice(id)!;
it('classifies a normal weekday', () => {
  expect(workState(U(2026, 9, 7, 15), o('saopaulo'))).toEqual({ kind: 'working' });
  expect(workState(U(2026, 9, 9, 12, 30), o('austin')).kind).toBe('early');       // 07:30 CDT
  expect(workState(U(2026, 9, 8, 14), o('bangalore')).kind).toBe('late');         // 19:30 IST
  expect(workState(U(2026, 9, 8, 14), o('singapore')).kind).toBe('off');          // 22:00 SGT
});
it('weekends and holidays', () => {
  expect(workState(U(2026, 9, 10, 15), o('austin')).kind).toBe('weekend');
  const h = workState(U(2026, 9, 12, 15), o('saopaulo'));
  expect(h.kind).toBe('holiday');
  expect(h.holiday?.name.en).toBe('Our Lady of Aparecida');
  expect(workState(U(2026, 9, 11, 23), o('sydney')).kind).toBe('working');        // Mon 12 Oct 10:00 AEDT; no calendar ⇒ never 'holiday'
});
it('Friday evening in Austin is Saturday in Singapore', () => {
  const t = U(2026, 9, 9, 23);
  expect(workState(t, o('austin')).kind).toBe('late');                             // Fri 18:00 CDT
  expect(workState(t, o('singapore')).kind).toBe('weekend');                       // Sat 07:00 SGT
});
it('half day ends at 13:00', () => {
  expect(workState(U(2026, 1, 18, 14), o('saopaulo'))).toMatchObject({ kind: 'working', halfDay: { kind: 'half' } });
  expect(workState(U(2026, 1, 18, 16, 30), o('saopaulo'))).toMatchObject({ kind: 'late', halfDay: { kind: 'half' } });
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/work/policy.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement `workState`.** It is the single implementation that every caller uses (spec §5.4).

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/work/policy.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/core/work && git commit -m "feat(core): single work-state policy with holidays, weekends and half days"
```

---

### Task 7: Sun, sky and contrast

**Files:**
- Create: `src/core/sky/sun.ts`, `src/core/sky/sky.ts`, `src/core/sky/contrast.ts`
- Test: `src/core/sky/sky.test.ts`

**Interfaces:**
- Produces:

```ts
// sun.ts
export function solarElevation(instant: Instant, lat: number, lon: number): number;              // degrees
export function sunSamples(start: Instant, end: Instant, lat: number, lon: number, n?: number): number[]; // n default 97, inclusive ends
export function terminatorLatitude(instant: Instant, lon: number): number;                        // degrees, for the world map
// sky.ts
export interface SkyStops { top: string; mid: string; bottom: string }                          // 'rgb(r, g, b)'
export const SKY_KEYFRAMES: readonly (readonly [number, string, string, string])[];
export function skyFor(elevation: number): SkyStops;
export function starAlpha(elevation: number): number;                                            // clamp((−el − 3) / 9, 0, 1)
// contrast.ts
export type RGB = readonly [number, number, number];
export const CARD_SCRIM = { top: 0.18, bottom: 0.36 } as const;
export function parseRgb(s: string): RGB;
export function overBlack(c: RGB, alpha: number): RGB;
export function contrastRatio(a: RGB, b: RGB): number;
```

- [ ] **Step 1: Write the failing tests.**

```ts
const U = Date.UTC;
it('solar elevation matches known geometry (±0.5°)', () => {
  expect(solarElevation(U(2026, 5, 21, 12, 10), 51.45, -2.59)).toBeCloseTo(61.98, 0);
  expect(solarElevation(U(2026, 11, 21, 0, 10), 51.45, -2.59)).toBeCloseTo(-61.98, 0);
  expect(solarElevation(U(2026, 2, 20, 12, 7), 0, 0)).toBeGreaterThan(89);
  expect(sunSamples(U(2026, 5, 21), U(2026, 5, 22), 51.45, -2.59)).toHaveLength(97);
});
it('sky keyframes are exact at their anchors and interpolate', () => {
  expect(skyFor(90)).toEqual({ top: 'rgb(30, 86, 178)', mid: 'rgb(56, 111, 191)', bottom: 'rgb(104, 147, 196)' });
  expect(skyFor(-18)).toEqual({ top: 'rgb(3, 6, 15)', mid: 'rgb(8, 17, 41)', bottom: 'rgb(17, 28, 66)' });
  expect(skyFor(-60).top).toBe('rgb(2, 5, 13)');
  expect([starAlpha(-3), starAlpha(-7.5), starAlpha(-12), starAlpha(10)]).toEqual([0, 0.5, 1, 0]);
});
it('white card text passes WCAG at every solar elevation (spec §5.6)', () => {
  const white: RGB = [255, 255, 255];
  for (let el = -90; el <= 90; el++) {
    const s = skyFor(el);
    expect(contrastRatio(white, overBlack(parseRgb(s.top), CARD_SCRIM.top)), `top @${el}`).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(white, overBlack(parseRgb(s.bottom), CARD_SCRIM.bottom)), `bottom @${el}`).toBeGreaterThanOrEqual(4.5);
  }
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/sky`
  - Expected: FAIL.

- [ ] **Step 3: Implement.**
  - **`SKY_KEYFRAMES`**, as `[elevation, top, mid, bottom]` hex values (copied from the canvas):

```ts
[-90,'#02040b','#050a1b','#0a1330'], [-18,'#03060f','#081129','#111c42'], [-12,'#060c22','#0f1c48','#1f2d5e'],
[-6,'#0c1a48','#2b3878','#5a4a7e'], [-2,'#162c66','#46508a','#a8644f'], [2,'#244685','#5e6a9c','#c98455'],
[6,'#28539a','#5480b4','#b0957a'], [15,'#265aa8','#4a7cbb','#7f9fc0'], [35,'#2259b2','#3c75c0','#6f98c6'], [90,'#1e56b2','#386fbf','#6893c4']
```

  - **Interpolation:** linear per sRGB channel between the bracketing keyframes, `Math.round` per channel, output `rgb(r, g, b)`.
  - **Solar position:** the NOAA low-precision algorithm (the canvas `sunEl`), with `d = instant / 86_400_000 − 10957.5`.
  - **`terminatorLatitude`:** `atan(−cos(H) / tan(δ))` in degrees.
  - **Contrast:** WCAG 2 relative luminance. `overBlack(c, a) = c·(1 − a)` per channel.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/sky`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/core/sky && git commit -m "feat(core): solar position, sky gradients, enforced card contrast"
```

---

### Task 8: Parser — lexicon and lexer

**Files:**
- Create: `src/core/parse/types.ts`, `src/core/parse/lexicon.ts`, `src/core/parse/lexer.ts`
- Test: `src/core/parse/lexer.test.ts`

**Interfaces:**
- Consumes: `normalize` (Task 4), `OfficeId`, `OFFICES` (Task 4).
- Produces from `types.ts` (exactly these; spec §5.7 as finalised):

```ts
export type PlaceRef = { kind: 'office'; id: OfficeId } | { kind: 'zone'; zone: string; label: string };
export interface Intent { instant: Instant; isNow: boolean; source: PlaceRef; destinations: PlaceRef[]; implicitSource: boolean; resolution: 'exact' | 'gap' | 'overlap' }
export type SpanRole = 'time' | 'date' | 'place' | 'connector' | 'filler' | 'duration' | 'unknown';
export interface Span { start: number; end: number; role: SpanRole }
export type DiagnosticCode = 'unknown_token' | 'ambiguous_abbreviation' | 'abbreviation_out_of_season' | 'invalid_time'
  | 'invalid_date' | 'range_unsupported' | 'recurrence_unsupported' | 'too_many_destinations' | 'missing_time' | 'nothing_to_convert';
export type NoticeCode = 'dst_gap' | 'dst_overlap' | 'implicit_source' | 'hour_bias' | 'ist_is_india';
export type SuggestionDisplay = { kind: 'office'; id: OfficeId } | { kind: 'zone'; zone: string; label: string }
  | { kind: 'clock'; hour: number; minute: number } | { kind: 'text'; text: string };
export interface Suggestion { query: string; display: SuggestionDisplay }
export interface Diagnostic { code: DiagnosticCode; token?: string; params?: Record<string, string | number> }
export interface Notice { code: NoticeCode; params?: Record<string, string | number>; alternative?: Suggestion }
export type ParseResult =
  | { status: 'ok'; intent: Intent; spans: Span[]; notices: Notice[] }
  | { status: 'ambiguous'; spans: Span[]; diagnostic: Diagnostic; options: Suggestion[] }
  | { status: 'error'; spans: Span[]; diagnostic: Diagnostic; suggestions: Suggestion[] };
export interface ParseContext { now: Instant; referenceId: OfficeId; locale: string }
```

- Produces from `lexicon.ts`:
  - `PLACE_ALIASES`: a `Map<string, PlaceRef>` built from `OFFICES[].aliases` plus the zone aliases below.
  - `FIXED_ABBR`: a `Record<string, { place: PlaceRef; offset: number }>`.
  - `SEASONAL_ABBR`: a `Record<string, { zone: string; office?: OfficeId; offset: number; label: string; ambiguousWith?: PlaceRef }>`.
  - `CONNECTORS_TO`, `CONNECTORS_IN`, `CONJUNCTIONS`, `FILLERS`, `RECURRENCE`.
  - `DAY_WORDS` (`today`, `tonight`, `tomorrow`, `yesterday`, plus pt forms).
  - `WEEKDAYS` (en and pt), `MONTHS` (en and pt), `UNITS`.
- Produces from `lexer.ts`:
  - `export type TokenKind = 'word' | 'number' | 'clock' | 'meridiem' | 'hmark' | 'isodate' | 'numdate' | 'offset' | 'arrow' | 'comma' | 'dash' | 'amp'`
  - `export interface Token { kind: TokenKind; text: string; start: number; end: number; value?: number | [number, number] | [number, number, number] }`
  - `lex(input: string): Token[]`

**Lexicon contents:**

| Group | Members |
|---|---|
| Zone aliases | `utc`/`z` → zone `UTC` label `UTC`; `china`/`shanghai`/`beijing` → `Asia/Shanghai` "China"; `new york`/`nyc` → `America/New_York` "New York"; `san francisco`/`sf`/`los angeles` → `America/Los_Angeles` "Pacific"; `tokyo` → `Asia/Tokyo`; `dubai` → `Asia/Dubai`; `berlin` → `Europe/Berlin` |
| Fixed abbr | `brt` → saopaulo (−180), `ist` → bangalore (330), `sgt` → singapore (480), `art` → buenosaires (−180), `cot` → bogota (−300), `wib` → jakarta (420), `ict` → hochiminh (420) |
| Seasonal abbr | `gmt`/`bst` → Europe/London (bristol) 0/60; `cst`/`cdt` → America/Chicago (austin) −360/−300, and `cst.ambiguousWith = Asia/Shanghai "China"`; `est`/`edt` → America/New_York −300/−240; `pst`/`pdt` → America/Los_Angeles −480/−420; `cet`/`cest` → Europe/Warsaw (warsaw) 60/120; `aest`/`aedt` → Australia/Sydney (sydney) 600/660 |
| Connectors | to-group: `to`, `into`, `vs`, `para`, `pra`, arrow tokens. in-group: `in`, `em`. (`at` is a filler.) |
| Conjunctions | `and`, `e`, `,`, `&` |
| Fillers | `what`, `whats`, `what's`, `is`, `it`, `the`, `time`, `at`, `on`, `me`, `show`, `convert`, `from`, `please`, `will`, `be`, `when`, `for`, `o'clock`, `oclock`, `meeting`, `call`, `sync`, `standup`, `with`, `team`, `que`, `horas`, `hora`, `as`, `às`, `de`, `do`, `da` |
| Recurrence | `every`, `daily`, `weekly`, `weekdays`, `todo`, `toda`, `todos`, `todas` |

- [ ] **Step 1: Write the failing tests.**

```ts
const kinds = (s: string) => lex(s).map((t) => [t.kind, t.text]);
it('splits attached meridiems and clocks', () => {
  expect(kinds('3pm')).toEqual([['number', '3'], ['meridiem', 'pm']]);
  expect(kinds('3:15PM')).toEqual([['clock', '3:15'], ['meridiem', 'pm']]);
  expect(kinds('3.15pm')).toEqual([['clock', '3.15'], ['meridiem', 'pm']]);
  expect(kinds('15h30')).toEqual([['clock', '15h30']]);
  expect(kinds('9h')).toEqual([['number', '9'], ['hmark', 'h']]);
  expect(kinds('1530')).toEqual([['number', '1530']]);
});
it('dates, offsets and punctuation', () => {
  expect(kinds('2026-10-12')).toEqual([['isodate', '2026-10-12']]);
  expect(kinds('12/10')).toEqual([['numdate', '12/10']]);
  expect(kinds('utc+5:30')).toEqual([['offset', 'utc+5:30']]);
  expect(kinds('a→b, c & d 9-5')).toEqual([['word', 'a'], ['arrow', '→'], ['word', 'b'], ['comma', ','], ['word', 'c'],
    ['amp', '&'], ['word', 'd'], ['number', '9'], ['dash', '-'], ['number', '5']]);
});
it('normalises text but keeps original offsets', () => {
  const t = lex('  SÃO Paulo');
  expect(t[0]).toMatchObject({ kind: 'word', text: 'sao', start: 2, end: 5 });
  expect(t[1]).toMatchObject({ kind: 'word', text: 'paulo', start: 6, end: 11 });
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/parse/lexer.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement the lexer as a single left-to-right scanner over the original string.**
  - Each token's `text` is `normalize(raw)`.
  - `start` and `end` index the original string.
  - Recognition order at a position:
    1. `isodate` `\d{4}-\d{2}-\d{2}`
    2. `numdate` `\d{1,2}/\d{1,2}(/\d{2,4})?`
    3. `clock` `\d{1,2}[:.h]\d{2}`
    4. `number` `\d+`, optionally followed immediately by `am|pm|a|p|a.m.|p.m.` (emitted as `meridiem`) or by `h` (emitted as `hmark`)
    5. `offset` `(utc|gmt)[+−-]\d{1,2}(:?\d{2})?`
    6. `arrow` `→|->|=>`
    7. `comma`, `amp`, `dash`
    8. `word` `[\p{L}'.]+` (letters with diacritics, apostrophes and dots)
  - Whitespace is skipped.
  - Any other single **code point** (iterate with `codePointAt`, so a surrogate pair such as an emoji stays one token covering both UTF-16 units) becomes a `word` token, so it is still accounted for (it will become an `unknown` span).
  - **Lexicon:** build it as data. `PLACE_ALIASES` keys may contain spaces; the grammar matches them across consecutive word tokens (longest first).

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/parse/lexer.test.ts`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/core/parse && git commit -m "feat(core): parser types, lexicon and span-preserving lexer"
```

---

### Task 9: Parser — grammar and resolution (happy paths)

**Files:**
- Create: `src/core/parse/grammar.ts`, `src/core/parse/resolve.ts`, `src/core/parse/index.ts`
- Test: `src/core/parse/corpus.ts` (shared table), `src/core/parse/parse.test.ts`

**Interfaces:**
- Consumes:
  - `lex`, the lexicon and `types.ts` (Task 8)
  - `toInstant`, `zonedFields`, `addDays`, `startOfDay` (Task 2)
  - `getOffice` (Task 4)
- Produces:
  - `parse(input: string, ctx: ParseContext): ParseResult | null` — `null` for blank input.
  - `dateOrderFor(locale: string): 'DMY' | 'MDY'` — `MDY` only for `en-US`.

**Semantics** (the decisions the tests pin):
- **Places and connectors:**
  - Places resolve longest-alias-first across consecutive words.
  - The first place before any to-connector is the source. Further places before the connector, and every place after it, are destinations.
  - With an in-connector (`in`, `em`) and no place before it, the place after it is the **source**: `3pm in bristol`, `what time is it in bristol`.
  - With a to-connector and no place before it, the source is implicit (the reference office) and gets an `implicit_source` notice.
- **Time sources:**
  - clock / number + meridiem / number + hmark / 4-digit `HHMM`
  - `noon`, `midnight`, `meio-dia`, `meia-noite`
  - `in N (hours|hour|h|minutes|min|horas|minutos)` and `daqui a N horas`: a duration from `ctx.now`
  - no time, no date and no duration means **now** (`isNow: true`, `instant = ctx.now`)
- **Bare-hour bias (D9):** applies to a bare number 1–12 with no meridiem, no `h` mark and no minutes, and to an unpadded clock with hour ≤ 12 (`3:30`).
  - 7–11 → AM; 12 → 12:00; 1–6 → PM.
  - With `tonight`: 1–11 → PM, and 12 → 00:00 the next day.
  - It emits an `hour_bias` notice with `params {hour}` and an `alternative` whose query replaces the token with the opposite reading, zero-padded 24h (e.g. `03:00`), with display `{kind:'clock'}`.
  - Zero-padded clocks (`03:30`) and hours 13–23 are exact.
- **Dates:**
  - Calendar arithmetic runs in the **source** zone, from `zonedFields(ctx.now, sourceZone)`.
  - `today`/`tonight` = +0, `tomorrow`/`amanhã` = +1, `yesterday`/`ontem` = −1.
  - A weekday means that day if it is today, else the coming one. `next <weekday>` means strictly after today.
  - `D Mon` / `Mon D` / numeric dates use `dateOrderFor(locale)`. The year is the nearest occurrence within ±182 days.
  - ISO dates are exact.
- **Instant:** `toInstant(civil, sourceZone, 'compatible')`.
  - A `gap` result adds a `dst_gap` notice with `params {shown: 'HH:MM'}` and an alternative query that uses the earlier wall time, zero-padded.
  - An `overlap` result adds a `dst_overlap` notice. Its alternative reads the same wall time in the later instant's fixed offset and moves the original place to the destination: `<date> <time> utc−6 to <place>`.
- **Abbreviation notice:** when `ist` is used, add an `ist_is_india` notice.
- **Spans:** every token gets a span with its role; fillers are `filler`.

- [ ] **Step 1: Write the corpus table in `corpus.ts`.**

  `export const CTX = { now: Date.UTC(2026, 9, 7, 14, 22), referenceId: 'bangalore', locale: 'en-GB' } as const;`

  Rows have the form `{ input, ctx?: Partial<ParseContext>, expect: { status: 'ok'; source; dest; instant; isNow?; implicit?; notices?; resolution? } }`. Expected instants:

| # | input | source → destinations | instant (Date.UTC) | notes |
|---|---|---|---|---|
| 1 | `3pm bristol to austin` | bristol → [austin] | (2026,9,7,14,0) | notices [] |
| 2 | `tomorrow 8am bangalore to austin` | bangalore → [austin] | (2026,9,8,2,30) | |
| 3 | `3:15 AM BRT to IST` | saopaulo → [bangalore] | (2026,9,7,6,15) | notices [`ist_is_india`] |
| 4 | `3pm SGT to BRT` | singapore → [saopaulo] | (2026,9,7,7,0) | |
| 7 | `3pm UTC to sp` | zone UTC → [saopaulo] | (2026,9,7,15,0) | |
| 8 | `3.15pm bristol` | bristol → [] | (2026,9,7,14,15) | |
| 9 | `in 2 hours` | bangalore → [] | (2026,9,7,16,22) | implicit; notices [`implicit_source`] |
| 10 | `oct 20 10am sp` | saopaulo → [] | (2026,9,20,13,0) | |
| 11 | `yesterday 3pm` | bangalore → [] | (2026,9,6,9,30) | implicit; notices [`implicit_source`] |
| 12 | `meeting at 3 with sp team` | saopaulo → [] | (2026,9,7,18,0) | notices [`hour_bias` {hour:15}], alternative query `meeting at 03:00 with sp team` |
| 13 | `sp to ist` | saopaulo → [bangalore] | (2026,9,7,14,22) | isNow, notices [`ist_is_india`] |
| 17 | `2026-03-08 2:30am austin` | austin → [] | (2026,2,8,8,30) | resolution gap, notice `dst_gap` {shown:'03:30'}, alternative `2026-03-08 01:30 austin` |
| 18 | `2026-11-01 1:30am austin` | austin → [] | (2026,10,1,6,30) | resolution overlap, notice `dst_overlap`, alternative `2026-11-01 1:30am utc−6 to austin` |
| 19a | `12/10 3pm sp` (en-GB) | saopaulo | (2026,9,12,18,0) | |
| 19b | `12/10 3pm sp` (ctx.locale `en-US`) | saopaulo | (2026,11,10,18,0) | |
| 20 | `amanhã 9h sp para ist` | saopaulo → [bangalore] | (2026,9,8,12,0) | no bias (h mark); notices [`ist_is_india`] |
| 21a | `fri 10am austin` | austin | (2026,9,9,15,0) | |
| 21b | `fri 10am austin` (ctx.now `Date.UTC(2026,9,9,14)`) | austin | (2026,9,9,15,0) | today is Friday |
| 21c | `next fri 10am austin` (ctx.now `Date.UTC(2026,9,9,14)`) | austin | (2026,9,16,15,0) | |
| 25 | `SÃO PAULO 15:00 → Bengaluru` | saopaulo → [bangalore] | (2026,9,7,18,0) | |
| 26 | `  3PM  bristol→austin ` | bristol → [austin] | (2026,9,7,14,0) | |
| 27 | `3pm in bristol` | bristol → [] | (2026,9,7,14,0) | |
| 28 | `what time is it in bristol` | bristol → [] | (2026,9,7,14,22) | isNow |
| 30 | `noon sg to sp` | singapore → [saopaulo] | (2026,9,7,4,0) | |
| 31 | `tonight 9 sp` | saopaulo | (2026,9,8,0,0) | notice `hour_bias` {hour:21} |
| 32 | `tomorrow 11:30pm sp to sg` | saopaulo → [singapore] | (2026,9,9,2,30) | Singapore is already Fri 9 Oct (+1 day) |
| 33 | `1530 austin` | austin | (2026,9,7,20,30) | |

- [ ] **Step 2: Write `parse.test.ts` (the happy paths).**

```ts
for (const row of OK_ROWS)
  it(`parses: ${row.input}`, () => {
    const r = parse(row.input, { ...CTX, ...row.ctx });
    expect(r?.status).toBe('ok');
    if (r?.status !== 'ok') return;
    expect(r.intent).toMatchObject({ instant: row.expect.instant, source: row.expect.source, destinations: row.expect.dest,
      isNow: row.expect.isNow ?? false, implicitSource: row.expect.implicit ?? false, resolution: row.expect.resolution ?? 'exact' });
    expect(r.notices.map((n) => n.code)).toEqual(row.expect.notices ?? []);
    if (row.expect.alternative) expect(r.notices.find((n) => n.alternative)?.alternative?.query).toBe(row.expect.alternative);
  });
it('returns null for blank input', () => { expect(parse('   ', CTX)).toBeNull(); });
```

  Express `source` and `dest` as `PlaceRef` objects, e.g. `{ kind: 'office', id: 'bristol' }` or `{ kind: 'zone', zone: 'UTC', label: 'UTC' }`.

- [ ] **Step 3: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/parse/parse.test.ts`
  - Expected: FAIL.

- [ ] **Step 4: Implement `grammar.ts`, `resolve.ts` and `index.ts`.**
  - **`grammar.ts`:** a single pass over tokens producing `{ time?, date?, duration?, places: {ref, beforeConnector}[], connector?: 'to' | 'in', spans, leftovers: Token[] }`.
  - **`resolve.ts`:** applies the semantics above and builds the `Intent` and notices. Error statuses are left for Task 10.

- [ ] **Step 5: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/parse/parse.test.ts`
  - Expected: PASS.

- [ ] **Step 6: Commit.**

```bash
git add src/core/parse && git commit -m "feat(core): deterministic command grammar with bias, DST notices and PT keywords"
```

---

### Task 10: Parser — diagnostics, suggestions, clock input and fuzz

**Files:**
- Create: `src/core/parse/diagnose.ts`, `src/core/parse/suggest.ts`, `src/core/parse/clock.ts`
- Modify: `src/core/parse/index.ts`, `src/core/parse/corpus.ts`
- Test: `src/core/parse/diagnose.test.ts`, `src/core/parse/clock.test.ts`, `src/core/parse/fuzz.test.ts`

**Interfaces:**
- Consumes: Tasks 8 and 9.
- Produces:
  - `parseClockInput(text: string): { hour: number; minute: number; biased: boolean } | null`, used by inline card edit in Plan 2. It uses the same bias rule as D9.
  - `damerauLevenshtein(a: string, b: string): number`
- Error precedence:
  1. `recurrence_unsupported`
  2. `range_unsupported` (two times joined by `-`, `to` or `até`)
  3. `invalid_time`
  4. `invalid_date`
  5. `ambiguous_abbreviation`
  6. `abbreviation_out_of_season`
  7. `unknown_token` (first leftover word)
  8. `too_many_destinations` (> 6)
  9. `missing_time` (a date but no time)
  10. `nothing_to_convert` (only fillers)
- **Suggestions for `unknown_token`:** aliases of length ≥ 3 with Damerau–Levenshtein ≤ 2, best first, at most 3. Each `query` replaces the token's span in the original input with the alias.

- [ ] **Step 1: Write the failing tests.** Add the error rows to `corpus.ts` and the following to `diagnose.test.ts`:

```ts
const err = (input: string, ctx = CTX) => parse(input, ctx);
it('seasonal abbreviation out of season offers the city or fixed UTC', () => {
  const r = err('3pm GMT');
  expect(r).toMatchObject({ status: 'error', diagnostic: { code: 'abbreviation_out_of_season', token: 'gmt' } });
  if (r?.status === 'error') expect(r.suggestions.map((s) => s.query)).toEqual(['3pm bristol', '3pm utc']);
});
it('CST asks US Central or China', () => {
  const r = err('2026-07-15 3pm CST');
  expect(r).toMatchObject({ status: 'ambiguous', diagnostic: { code: 'ambiguous_abbreviation', token: 'cst' } });
  if (r?.status === 'ambiguous') expect(r.options.map((o) => o.query)).toEqual(['2026-07-15 3pm austin', '2026-07-15 3pm china']);
});
it.each([
  ['9-5 brt', 'range_unsupported'], ['3 to 5pm sp', 'range_unsupported'], ['every monday 10am', 'recurrence_unsupported'],
  ['25:00 sp', 'invalid_time'], ['13pm sp', 'invalid_time'], ['32 oct 3pm', 'invalid_date'], ['tomorrow', 'missing_time'],
  ['what is the', 'nothing_to_convert'], ['hello', 'unknown_token'],
  ['3pm bristol to austin, sp, ist, sg, warsaw, sydney, mexico', 'too_many_destinations'],
])('%s → %s', (input, code) => { expect(err(input)).toMatchObject({ diagnostic: { code } }); });
it('suggests the nearest city for a typo', () => {
  const r = err('3pm brstol');
  expect(r).toMatchObject({ status: 'error', diagnostic: { code: 'unknown_token', token: 'brstol' } });
  if (r?.status === 'error') expect(r.suggestions[0]).toEqual({ query: '3pm bristol', display: { kind: 'office', id: 'bristol' } });
});
it('an unknown source is never replaced by the reference', () => {
  expect(err('3pm zzt to brt')?.status).toBe('error');
});

// clock.test.ts
expect(parseClockInput('1530')).toEqual({ hour: 15, minute: 30, biased: false });
expect(parseClockInput('930')).toEqual({ hour: 9, minute: 30, biased: false });
expect(parseClockInput('3:30p')).toEqual({ hour: 15, minute: 30, biased: false });
expect(parseClockInput('3')).toEqual({ hour: 15, minute: 0, biased: true });
expect(parseClockInput('9')).toEqual({ hour: 9, minute: 0, biased: true });
expect(parseClockInput('03:30')).toEqual({ hour: 3, minute: 30, biased: false });
expect(parseClockInput('noon')).toEqual({ hour: 12, minute: 0, biased: false });
expect(parseClockInput('24:00')).toBeNull();
expect(parseClockInput('abc')).toBeNull();

// fuzz.test.ts
it('never throws and accounts for every non-space character', () => {
  fc.assert(fc.property(fc.oneof(fc.string({ maxLength: 500 }), fc.fullUnicodeString({ maxLength: 80 }),
    fc.array(fc.constantFrom('3pm', 'sp', 'to', 'ist', 'tomorrow', '-', '→', ',', '15:00', 'brt', 'cst', 'oct', '12/10', '😀', '99'))
      .map((a) => a.join(' '))), (input) => {
    const r = parse(input, CTX);
    if (r === null) { expect(input.trim()).toBe(''); return; }
    const covered = new Set<number>();
    for (const s of r.spans) for (let i = s.start; i < s.end; i++) covered.add(i);
    for (let i = 0; i < input.length; i++) if (!/\s/.test(input[i]!)) expect(covered.has(i)).toBe(true);
  }), { numRuns: 2000 });
});
```

  In fast-check v4, `fullUnicodeString` is `fc.string({ unit: 'binary' })`. Use whichever API the installed version exposes.

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/parse`
  - Expected: the new tests FAIL.

- [ ] **Step 3: Implement the diagnostics with the precedence above.**
  - **Seasonal check:** the abbreviation's expected offset is compared with `offsetMinutes(instant, zone)` at the resolved instant.
  - **Out-of-season suggestions:** first `{office or zone name}`, then `utc` for a 0 offset or `utc±h` otherwise.
  - **Ambiguous `cst`:** options are `[austin, china]`, regardless of season.
  - **`parseClockInput`:** reuses the lexer and the bias rule.

- [ ] **Step 4: Run the whole parser suite.**
  - Run: `npx vitest run src/core/parse`
  - Expected: PASS, including the 2000-run fuzz.

- [ ] **Step 5: Commit.**

```bash
git add src/core/parse && git commit -m "feat(core): parser diagnostics, suggestions, clock input and fuzz guard"
```

---

### Task 11: Planner

**Files:**
- Create: `src/core/plan/overlap.ts`
- Test: `src/core/plan/overlap.test.ts`

**Interfaces:**
- Consumes: `startOfDay` (Task 2), `Office` (Task 4), `workState`, `WorkKind` (Task 6).
- Produces:

```ts
export interface PlanSlot { start: Instant; end: Instant; states: WorkKind[]; working: number; score: number }
export interface BestWindow { startIndex: number; endIndex: number; working: number; outside: Array<{ officeId: OfficeId; kind: WorkKind }> }
export interface PlanResult { day: { start: Instant; end: Instant }; slots: PlanSlot[]; best: BestWindow | null; allWorking: boolean }
export function planDay(refDate: CivilDate, refZone: string, offices: readonly Office[], slotMinutes?: number): PlanResult; // default 30
```

  - **Score:** `working + 0.25 × (early + late)`.
  - **Best:** the contiguous run with the maximum `working` (only if > 0). Ties go to the higher summed score, then the earliest.
  - **`outside`:** the states at `best.startIndex` that are not `working`, in office order.
  - **`allWorking`:** true if any slot has every office working.
  - Slots run from `day.start` to `day.end`; the last slot is clipped to `day.end`.
  - Memoise on `(refDate, refZone, office ids)`.

- [ ] **Step 1: Write the failing tests.**

```ts
const U = Date.UTC; const offs = (...ids: string[]) => ids.map((i) => getOffice(i)!);
const five = offs('saopaulo', 'austin', 'bristol', 'bangalore', 'singapore');
it('finds the best overlap across five offices', () => {
  const p = planDay({ year: 2026, month: 10, day: 8 }, 'America/Sao_Paulo', five);
  expect(p.slots).toHaveLength(48);
  expect(p.slots[22]!.start).toBe(U(2026, 9, 8, 14, 0));                          // 11:00 São Paulo
  expect(p.best).toEqual({ startIndex: 22, endIndex: 28, working: 3,
    outside: [{ officeId: 'bangalore', kind: 'late' }, { officeId: 'singapore', kind: 'off' }] });
  expect(p.allWorking).toBe(false);
});
it('handles 23h and 25h days', () => {
  expect(planDay({ year: 2026, month: 3, day: 8 }, 'America/Chicago', five).slots).toHaveLength(46);
  expect(planDay({ year: 2026, month: 11, day: 1 }, 'America/Chicago', five).slots).toHaveLength(50);
});
it('refers to a half-hour zone', () => {
  expect(planDay({ year: 2026, month: 10, day: 8 }, 'Asia/Kolkata', five).slots[0]!.start).toBe(U(2026, 9, 7, 18, 30));
});
it('reports no overlap on a shared weekend', () => {
  expect(planDay({ year: 2026, month: 10, day: 10 }, 'America/Sao_Paulo', offs('saopaulo', 'bristol')).best).toBeNull();
});
it('excludes an office on holiday', () => {
  const p = planDay({ year: 2026, month: 10, day: 12 }, 'America/Sao_Paulo', offs('saopaulo', 'austin', 'bristol'));
  expect(p.best?.outside).toContainEqual({ officeId: 'saopaulo', kind: 'holiday' });
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/plan`
  - Expected: FAIL.

- [ ] **Step 3: Implement `planDay`** as specified in Interfaces.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/plan`
  - Expected: PASS.

- [ ] **Step 5: Commit.**

```bash
git add src/core/plan && git commit -m "feat(core): DST-exact day planner with best-overlap window"
```

---

### Task 12: Share codec

**Files:**
- Create: `src/core/share/codec.ts`
- Test: `src/core/share/codec.test.ts`

**Interfaces:**
- Consumes: `SHARE_INDEX`, `OfficeId`, `getOffice` (Task 4); `toInstant` (Task 2).
- Produces:

```ts
export interface SharePayload { instant: Instant; refId: OfficeId; officeIds: OfficeId[] }
export interface DecodedShare extends SharePayload { version: 1 | 2; resolution: 'exact' | 'gap' | 'overlap' }
export function encodeShare(p: SharePayload): string;                  // v2 'm.r.c'
export function decodeShare(token: string): DecodedShare | null;       // v1 or v2; null if invalid
```

  - **v2 format:**
    - `m = Math.floor(instant / 60000).toString(36)`
    - `r = SHARE_INDEX.indexOf(refId).toString(36)`
    - `c` = the `BigInt` bitset of share indices `.toString(36)`
    - Validated by `/^[0-9a-z]{1,9}\.[0-9a-z]{1,2}\.[0-9a-z]{1,13}$/`. Every index must be `< SHARE_INDEX.length`.
  - **v1 format:**
    - Validated by `/^[0-9a-z]{7,16}$/`, and must not start with `v`.
    - Layout: source idx (1), minutes (3, ≤ 1439), days since 2025-01-01 (3), bitset (rest, base 36).
    - The civil date is `EPOCH + days` read with **UTC** getters.
    - `instant = toInstant(civil(date, minutes), office.zone).instant`, reporting its `resolution`.
    - `officeIds` are returned in `SHARE_INDEX` order.

- [ ] **Step 1: Write the failing tests.**

```ts
const U = Date.UTC;
it('decodes v1 links on the sender\'s calendar date (fixes C1)', () => {
  expect(decodeShare('10p00hwf')).toEqual({ version: 1, resolution: 'exact', refId: 'austin', instant: U(2026, 9, 7, 20, 0),
    officeIds: ['saopaulo', 'austin', 'bristol', 'bangalore'] });
  expect(decodeShare('10460bzf')).toMatchObject({ version: 1, resolution: 'gap', instant: U(2026, 2, 8, 8, 30) });
});
it('v1 encoder output was independent of the sender timezone (UTC−10…+8)', () => {
  const saved = process.env.TZ;
  for (const tz of ['Pacific/Honolulu', 'America/Chicago', 'America/Sao_Paulo', 'Europe/London', 'Asia/Kolkata', 'Asia/Singapore']) {
    process.env.TZ = tz;
    expect(Math.round((new Date(2026, 9, 7).getTime() - U(2025, 0, 1)) / 86_400_000), tz).toBe(644);
  }
  process.env.TZ = saved;
});
it('encodes v2 instants', () => {
  expect(encodeShare({ instant: U(2026, 9, 8, 14, 0), refId: 'bristol',
    officeIds: ['saopaulo', 'austin', 'bristol', 'bangalore', 'singapore'] })).toBe('hryfc.2.v');
});
it('round-trips v2', () => {
  fc.assert(fc.property(fc.integer({ min: 0, max: 2 ** 31 }), fc.constantFrom(...SHARE_INDEX),
    fc.subarray([...SHARE_INDEX], { minLength: 1 }), (min, refId, ids) => {
      const p = { instant: min * 60000, refId, officeIds: ids };
      expect(decodeShare(encodeShare(p))).toEqual({ ...p, officeIds: SHARE_INDEX.filter((i) => ids.includes(i)), version: 2, resolution: 'exact' });
    }));
});
it.each(['', 'v1234567', 'zzzzzzz', '1zzz0hwf', 'hryfc.99.v', 'hryfc.2.zzzzzzzzzzzzzz', 'hryfc.2.1000', '../etc', 'hryfc.2.'])(
  'rejects %j', (t) => { expect(decodeShare(t)).toBeNull(); });
```

  The `'v1 encoder … timezone'` test is a characterisation of the legacy encoder. It must run in the `core` (Node) project, where setting `process.env.TZ` at runtime takes effect.

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/share`
  - Expected: FAIL. (The characterisation test may already pass; that is fine.)

- [ ] **Step 3: Implement the codec** as specified in Interfaces.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npx vitest run src/core/share`
  - Expected: PASS.

- [ ] **Step 5: Run the full gate, then commit.**
  - Run: `npm run check`
  - Expected: Biome clean, `tsc` clean, all core tests PASS.

```bash
git add src/core/share && git commit -m "feat(core): share codec — DST-proof v2, correct v1 decoding"
```

---

## Plan 1 exit criteria

These must all hold:
- `npm run check` and `npm run build` are green.
- `src/core` has no imports outside core.
- Every spec §5 module exists with the tests above.

Plan 2 builds the app on these interfaces.
