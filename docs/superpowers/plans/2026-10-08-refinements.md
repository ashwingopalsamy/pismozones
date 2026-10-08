# Pismo Zones Refinements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the owner's post-launch refinements:
- a single-line control lane
- one content column
- a São Paulo hero and a city lane
- clean cards
- the ruler on desktop
- a city pill with a wide cities panel
- desktop dialogs
- a world-clock Plan
- Pismo company holidays
- a theme toggle
- a footer with the owner's avatar
- a Vercel mirror with analytics on both hosts

**Architecture:** Same layering as before: `core → state → ui`, with `worker → core`.
- Layout is driven by one content-column token.
- The control lane compacts through four width tiers computed by a `ResizeObserver` hook. The hook feeds compact props to the pill components; nothing wraps or hides.
- Holidays become per-year company lists in core.
- Hosting adds a `hostKind` switch in state that selects the analytics and event transport per host.

**Tech Stack:** TypeScript strict, Preact 11 + signals, CSS Modules, Vite 8, Vitest 5, Playwright, Cloudflare Workers, Vercel static hosting.

**Spec:** `docs/superpowers/specs/2026-10-08-pismozones-refinements-design.md` (it amends `2026-10-07-pismozones-revamp-design.md`).

## Global Constraints

- Everything in Plans 1–3 still applies:
  - the layer rule (`src/architecture.test.ts`)
  - TS strict with `exactOptionalPropertyTypes`
  - Biome clean
  - tokens-only CSS, enforced by the styles test
  - EN and PT-BR key parity
  - axe-clean in light and dark
  - budgets: JS entry ≤ 45 KB, CSS ≤ 12 KB, total ≤ 160 KB gzip
- Office ids and the frozen share index never change; only display names do.
- **One content column:** `width: min(1280px, 100% - 2 × gutter)`. The gutter is 32px at ≥1024px and 24px below. Every desktop element aligns to it.
- **The control lane never wraps and never hides or merges a control.** Tiers by lane width W:
  - **A:** W ≥ 1120
  - **B:** 960 ≤ W < 1120
  - **C:** 840 ≤ W < 960
  - **D:** W < 840
- **One CSP for both hosts:**
  - `connect-src 'self' https://pismozones.ashwingopalsamy.in https://cloudflareinsights.com`
  - everything else as before.
- **No new runtime dependencies.** Vercel Web Analytics is a same-origin script tag.
- **Canonical origin:** `https://pismozones.ashwingopalsamy.in`, defined once in core (`src/core/site.ts`).
- Steps marked **[owner]** are not performed by the implementer.

## Review Focus

1. **Single line under the worst text:** PT-BR strings, a long command preview, and preview mode at a 768px viewport. Every lane child must stay on one row and visible. Test: Task 6, `control lane is one line`.
2. **The holiday coverage boundary:**
   - A 2027 date gets no holiday state, and the panel says "not published yet".
   - Ash Wednesday 2026 means off until 14:00 in São Paulo.

   Test: Task 2, `2027 is unpublished`, and Task 3, `unpublished note`.
3. **São Paulo cannot disappear:**
   - corrupted storage
   - legacy migration
   - a shared link whose office set excludes São Paulo
   - toggling or moving São Paulo

   Test: Task 1, `São Paulo is always displayed`.
4. **Cross-origin events from Vercel:** they reach `/e` with a host blob, look-alike origins are rejected, and event blob positions don't shift. Test: Task 12, `host blob`.
5. **Plan grid on DST days and half-hour zones:**
   - 25 columns for Bristol's reference day on 2026-10-25
   - `:30` labels for Bengaluru
   - 12-hour labels

   Test: Task 10, `world-clock grid`.

---

### Task 1: Registry, defaults and the São Paulo anchor

**Files:**
- Modify: `src/core/cities/registry.ts`, `src/state/cities.ts`, `src/state/storage.ts`, `src/state/index.ts`
- Rename text: replace `Bangalore` with `Bengaluru` in expectations in `src/state/testing.ts` (comment), `src/core/parse/corpus.ts` (comment), `tests/e2e/fixtures.ts`, `tests/e2e/zones.spec.ts`, `src/ui/components/CommandBar/model.test.ts`, `src/ui/components/Plan/model.test.ts`, `src/ui/components/CardList/CardList.test.tsx`, `src/ui/components/SettingsSheet/SettingsSheet.test.tsx`, `worker/og.test.ts`, `worker/share.workerd.test.ts`
- Test: `src/core/cities/registry.test.ts`, `src/state/moment.test.ts`, `src/state/storage.test.ts`, `src/state/appState.test.ts`

**Interfaces:**
- Produces:
  - `Office.code: string`, three uppercase letters:

    | Office | Code |
    |---|---|
    | São Paulo | SAO |
    | Austin | AUS |
    | Bristol | BRS |
    | Bengaluru | BLR |
    | Singapore | SIN |
    | Warsaw | WAW |
    | Mexico City | MEX |
    | Buenos Aires | BUE |
    | Bogotá | BOG |
    | Sydney | SYD |
    | Ho Chi Minh | SGN |
    | Jakarta | JKT |

  - `bangalore.name = 'Bengaluru'`.
  - `export const ANCHOR: OfficeId = 'saopaulo'`.
  - `DEFAULT_ACTIVE = ['saopaulo', 'austin', 'bangalore', 'bristol']`.
  - `cities.toggle(ANCHOR)` and `cities.move(ANCHOR, n)` are no-ops.
  - `sanitize` prepends `ANCHOR` when it is missing.
  - `AppState.displayed` always contains `ANCHOR`, first and `temp: false` (also inside a shared overlay).

- [ ] **Step 1: Write the failing tests.**

```ts
// registry.test.ts
it('codes are unique 3-letter uppercase; India is Bengaluru', () => {
  const codes = OFFICES.map((o) => o.code);
  expect(new Set(codes).size).toBe(OFFICES.length);
  for (const c of codes) expect(c).toMatch(/^[A-Z]{3}$/);
  expect(getOffice('bangalore')).toMatchObject({ name: 'Bengaluru', code: 'BLR' });
  expect(DEFAULT_ACTIVE).toEqual(['saopaulo', 'austin', 'bangalore', 'bristol']);
});
// moment.test.ts (cities)
it('São Paulo can be neither removed nor moved', () => {
  const m = compose();
  m.cities.toggle('saopaulo'); m.cities.move('saopaulo', 3);
  expect(m.cities.activeIds.value[0]).toBe('saopaulo');
  expect(m.cities.activeIds.value).toContain('saopaulo');
});
// storage.test.ts
it('restores São Paulo when stored data lacks it', () => {
  const env = makeEnv();
  env.storage?.setItem('pz:v1', JSON.stringify({ schema: 1, activeIds: ['austin'] }));
  expect(loadPersisted(env.storage, 'UTC').activeIds).toEqual(['saopaulo', 'austin']);
});
// appState.test.ts
it('São Paulo is always displayed, first, even in a shared view without it', () => {
  const token = encodeShare({ instant: Date.UTC(2026, 9, 8, 14), refId: 'bristol', officeIds: ['bristol', 'sydney'] });
  const s = createAppState(makeEnv({ location: { pathname: `/s/${token}`, search: '', origin: 'https://x' } }));
  expect(s.displayed.value[0]).toMatchObject({ office: { id: 'saopaulo' }, temp: false });
});
it('a new UTC viewer gets the four defaults', () => {
  expect(createAppState(makeEnv({ viewerZone: 'UTC' })).cities.activeIds.value)
    .toEqual(['saopaulo', 'austin', 'bangalore', 'bristol']);
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/core/cities src/state`
  - Expected: FAIL. `code` and `ANCHOR` are undefined, and the order differs.

- [ ] **Step 3: Implement** as described in Interfaces.
  - `sanitize`: `activeIds = activeIds.includes(ANCHOR) ? activeIds : [ANCHOR, ...activeIds]`.
  - `displayed`: build `ids` with `ANCHOR` prepended, dropping any duplicate.
  - Replace "Bangalore" with "Bengaluru" in the listed expectation files.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run test`
  - Expected: PASS, with every renamed expectation green.

- [ ] **Step 5: Commit.**
  - Run: `git add -A src worker tests && git commit -m "feat(cities): Bengaluru, office codes, São Paulo anchor and new defaults"`

---

### Task 2: Pismo company holiday calendars (core)

**Files:**
- Delete:
  - `src/core/work/holidays/{engine.ts,easter.ts,holidays.test.ts,coverage.test.ts}`
  - `src/core/work/holidays/calendars/`
- Create:
  - `src/core/work/holidays/company/2026.ts`
  - `src/core/work/holidays/company.test.ts`
- Modify:
  - `src/core/work/holidays/{index.ts,types.ts}`
  - `src/core/cities/registry.ts` (calendar ids)
  - `src/core/work/policy.test.ts` (only expectations that pinned gazette-only dates)

**Interfaces:**
- Consumes: `CivilDate`, `Office.holidayCalendar`.
- Produces:
  ```ts
  type CalendarId = 'in' | 'br' | 'uk' | 'us' | 'pl';
  // registry: saopaulo 'br', austin 'us', bristol 'uk', bangalore 'in', warsaw 'pl'; all others null
  interface Holiday { date: string; name: { en: string; pt?: string }; note?: string; kind: 'full' | 'half'; hours?: { start: number; end: number } }
  publishedYears(id: CalendarId): readonly number[];                 // [2026]
  holidaysIn(id: CalendarId, year: number): readonly Holiday[];      // [] when unpublished
  holidayOn(id: CalendarId, date: CivilDate): Holiday | undefined;
  coverage(id: CalendarId, date: CivilDate): 'published' | 'unpublished';
  upcomingHolidays(ids: readonly CalendarId[], from: CivilDate, days: number): Array<Holiday & { calendar: CalendarId }>;
  ```
- **Data:** copy every entry from `git show 4e60f25:src/components/HolidayPanel.jsx`.
  - **Brazil:** `name.pt` is the Portuguese name and `name.en` is its English note, without the "– Half Day" suffix. Ash Wednesday is `kind: 'half', hours: { start: 840, end: 1080 }`.
  - **US Jul 3:** `note: 'Observed (Jul 4)'`.
  - **UK Dec 26:** `note: 'Substitute day'`.

- [ ] **Step 1: Write the failing test.** The expected dates are the old `holidays.js` sets, written out literally.

```ts
const OLD = {
  in: ['2026-01-01','2026-01-26','2026-02-19','2026-03-03','2026-03-19','2026-04-03','2026-05-01','2026-05-28','2026-08-26','2026-09-14','2026-10-02','2026-11-09','2026-11-10','2026-12-25'],
  br: ['2026-01-01','2026-01-25','2026-02-16','2026-02-17','2026-02-18','2026-04-03','2026-04-05','2026-04-21','2026-05-01','2026-06-04','2026-07-09','2026-09-07','2026-10-12','2026-11-02','2026-11-15','2026-11-20','2026-12-25'],
  uk: ['2026-01-01','2026-04-03','2026-04-06','2026-05-04','2026-05-25','2026-08-31','2026-12-25','2026-12-26'],
  us: ['2026-01-01','2026-01-19','2026-02-16','2026-05-25','2026-06-19','2026-07-03','2026-09-07','2026-10-12','2026-11-11','2026-11-26','2026-11-27','2026-12-25'],
  pl: ['2026-01-01','2026-01-06','2026-04-05','2026-04-06','2026-05-01','2026-05-03','2026-05-24','2026-06-04','2026-08-15','2026-11-01','2026-11-11','2026-12-24','2026-12-25','2026-12-26'],
} as const;
it('matches the Pismo 2026 company calendars exactly', () => {
  for (const [id, dates] of Object.entries(OLD)) expect(holidaysIn(id as CalendarId, 2026).map((h) => h.date)).toEqual(dates);
  expect(holidayOn('br', { year: 2026, month: 2, day: 18 })).toMatchObject({ kind: 'half', hours: { start: 840, end: 1080 }, name: { pt: 'Quarta-feira de Cinzas', en: 'Ash Wednesday' } });
});
it('2027 is unpublished', () => {
  expect(coverage('in', { year: 2027, month: 1, day: 26 })).toBe('unpublished');
  expect(holidayOn('in', { year: 2027, month: 1, day: 26 })).toBeUndefined();
  expect(workState(Date.UTC(2027, 0, 26, 6), getOffice('bangalore') as Office).kind).toBe('working');
});
```

- [ ] **Step 2: Run the test to confirm it fails.**
  - Run: `npx vitest run src/core/work`
  - Expected: FAIL. `coverage` is not exported, and the data differs.

- [ ] **Step 3: Implement** the data file, the new `index.ts` API, and the registry ids, then delete the old engine.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run test`
  - Some existing tests may fail because they pinned gazette-only dates, for example Karnataka Rajyotsava on Nov 1 or the Singapore list. Update each one to the matching company-list fact and ledger it.
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Run: `git add -A src && git commit -m "feat(holidays): Pismo company calendars replace gazette rules"`

---

### Task 3: Holidays panel (tabs, upcoming, focus, unpublished)

**Files:**
- Modify:
  - `src/ui/components/HolidaysSheet/{model.ts,HolidaysSheet.tsx,HolidaysSheet.module.css}`
  - `src/ui/i18n/{en,pt-BR}.ts`
- Test: `src/ui/components/HolidaysSheet/model.test.ts`, `HolidaysSheet.test.tsx`

**Interfaces:**
- Consumes: the Task 2 API.
- Produces:
  ```ts
  interface HolidaysModel {
    tabs: Array<{ id: 'upcoming' | CalendarId; label: string }>;   // upcoming first, then one per active country
    selected: 'upcoming' | CalendarId;                               // focus → its calendar, else 'upcoming'
    upcoming: HolidayItem[];                                          // next 90 days, merged, tagged with offices
    country: Partial<Record<CalendarId, { months: Array<{ title: string; items: HolidayItem[] }> }>>;
    unpublished: number | null;                                       // first unpublished year within the 90-day window, else null
    noCalendar: string[];
  }
  // HolidayItem gains: state: 'past' | 'today' | 'next' | 'upcoming'
  holidaysModel(offices, today: CivilDate, lang: Lang, focus?: { officeId: OfficeId; date: string }): HolidaysModel
  ```
- **New i18n keys:**

  | Key | EN | PT |
  |---|---|---|
  | `holidays.upcoming` | "Upcoming" | "Próximos" |
  | `holidays.unpublished` | "{year} calendar not published yet" | "Calendário de {year} ainda não publicado" |
  | `holidays.next` | "Next" | "Próximo" |
  | `holidays.today` | "Today" | "Hoje" |
  | `holidays.halfDay` | "Half day" | "Meio período" |
  | `country.in` / `country.br` / `country.uk` / `country.us` / `country.pl` | India / Brazil / UK / USA / Poland | Índia / Brasil / Reino Unido / EUA / Polônia |

- [ ] **Step 1: Write the failing tests.**

```ts
it('tabs follow active countries; a chip focus opens its country at the date', () => {
  const m = holidaysModel(offices(['saopaulo', 'austin', 'singapore']), { year: 2026, month: 10, day: 7 }, 'en', { officeId: 'austin', date: '2026-11-26' });
  expect(m.tabs.map((t) => t.id)).toEqual(['upcoming', 'br', 'us']);
  expect(m.selected).toBe('us');
  expect(m.country.us?.months.flatMap((x) => x.items).find((i) => i.focused)?.date).toBe('2026-11-26');
  expect(m.noCalendar).toEqual(['Singapore']);
});
it('unpublished note inside the window', () => {
  expect(holidaysModel(offices(['saopaulo']), { year: 2026, month: 12, day: 1 }, 'en').unpublished).toBe(2027);
});
// HolidaysSheet.test.tsx: renders the tablist; clicking "USA" shows Thanksgiving; the axe check passes.
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/ui/components/HolidaysSheet`
  - Expected: FAIL.

- [ ] **Step 3: Implement** the model and the view.
  - Use a `role="tablist"` of buttons, with arrow-key navigation between tabs.
  - Show "Next", "Today" and "Half day" badges; dim past items.
  - Render rows in two columns at panel widths ≥ 960px.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run test`
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Run: `git add -A src && git commit -m "feat(holidays): country tabs, upcoming, focus and unpublished notice"`

---

### Task 4: Clean cards, São Paulo hero and the city lane

**Files:**
- Modify:
  - `src/ui/components/ZoneCard/{model.ts,ZoneCard.tsx,ZoneCard.module.css}`
  - `src/ui/components/CardList/{CardList.tsx,CardList.module.css}`
  - `src/ui/app/{WideLayout.tsx,PhoneLayout.tsx}`
  - `src/ui/i18n/{en,pt-BR}.ts` (`card.hours`: "{from}–{to}")
- Test: `ZoneCard.test.tsx`, `ZoneCard/model.test.ts`, `CardList.test.tsx`

**Interfaces:**
- Produces:
  - `CardModel` loses `path` and `sun`, and gains `hours: string` (for example "09:00–18:00").
  - Boxes: `HERO_BOX = { w: 1216, h: 176 }` and `PHONE_HERO_BOX = { w: 358, h: 148 }`.
  - `CardList({ layout: 'phone' | 'desktop', editable, onHoliday? })` replaces the `box` prop.
    - It renders the `ANCHOR` card as the hero, with `data-hero`.
    - On desktop it renders a `.lane` grid (`repeat(auto-fit, minmax(260px, 1fr))`) for the rest; on phone, a list.
  - The hero card shows `hours` beside the offset.

- [ ] **Step 1: Write the failing tests.**

```ts
// ZoneCard.test.tsx
// renderCard(id): renders one ZoneCard from cardModel(getOffice(id), NOW, ctx) inside renderWithApp
it('renders no sky decorations', () => {
  const { container } = renderCard('saopaulo');
  expect(container.querySelectorAll('svg')).toHaveLength(0);
  expect(container.querySelector('[class*="sun"]')).toBeNull();
});
// CardList.test.tsx
it('São Paulo is the hero; the rest form the lane in saved order', () => {
  const { container } = renderWithApp(<CardList layout="desktop" editable={false} />, { activeIds: ['saopaulo', 'austin', 'bangalore', 'bristol'] });
  const cards = [...container.querySelectorAll('article')];
  expect(cards[0]?.hasAttribute('data-hero')).toBe(true);
  expect(cards.map((a) => a.getAttribute('aria-label')?.split(',')[0])).toEqual(['São Paulo', 'Austin', 'Bengaluru', 'Bristol']);
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/ui/components/ZoneCard src/ui/components/CardList`
  - Expected: FAIL.

- [ ] **Step 3: Implement.**
  - Delete the arc `<svg>`, the sun div, `sunPath`, `daySamples` and the related CSS. Keep the sky gradient, stars and scrim.
  - Update the callers to `layout`.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run test`
  - Expected: PASS, with the sky contrast tests unchanged.

- [ ] **Step 5: Commit.**
  - Run: `git add -A src && git commit -m "feat(cards): clean cards, São Paulo hero and city lane"`

---

### Task 5: One content column, sticky footer and avatar

**Files:**
- Create:
  - `src/ui/app/Footer.tsx`
  - `public/ashwin.jpg`
  - `tests/e2e/layout.spec.ts`
- Modify:
  - `src/ui/app/{WideLayout.tsx,layout.module.css}`
  - `src/ui/components/SettingsSheet/SettingsSheet.tsx` (phone credit uses `Footer`)
  - `vite.config.ts` (`globPatterns` gains `jpg`)

**Interfaces:**
- Produces:
  - Custom properties on `:root` in `tokens.css`:
    - `--gutter: 32px`, or 24px below 1024px;
    - `--page-w: min(1280px, 100% - 2 * var(--gutter))`.
  - A `.column` class: `width: var(--page-w); margin-inline: auto`. Task 9's dialogs reuse `--page-w`.
  - The `WideLayout` root is `display: flex; flex-direction: column; min-height: 100dvh`. Its header, main and footer use `.column`; the footer uses `margin-top: auto`.
  - `Footer({ compact?: boolean })` renders the privacy line, then a 24×24 avatar (`<img src="/ashwin.jpg" width="24" height="24" alt="Ashwin Gopalsamy" loading="lazy" decoding="async">`), then the credit and the GitHub link.

- [ ] **Step 1: Create the avatar** (download approved by the owner).
  - Run:
    ```bash
    curl -sL https://github.com/ashwingopalsamy.png -o /tmp/pz-avatar.png && sips -z 64 64 -s format jpeg -s formatOptions 82 /tmp/pz-avatar.png --out public/ashwin.jpg
    ```
  - Expected: `public/ashwin.jpg`, 64×64, under 6 KB.
  - JPEG via the built-in `sips` replaces the spec's `.webp`. Ledger that as a ruling.

- [ ] **Step 2: Write the failing e2e test** in `tests/e2e/layout.spec.ts` (desktop project).

```ts
for (const width of [768, 900, 1024, 1280, 1440, 1920])
  test(`everything stays inside the column at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    const box = await page.evaluate(() => {
      const col = document.querySelector('main')!.getBoundingClientRect();
      const parts = ['header', 'main', 'footer', 'article', '[role="slider"]'].flatMap((s) => [...document.querySelectorAll(s)]);
      return { col: [col.left, col.right], parts: parts.map((p) => { const r = p.getBoundingClientRect(); return [r.left, r.right]; }),
        hscroll: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        footerBottom: document.querySelector('footer')!.getBoundingClientRect().bottom, vh: innerHeight };
    });
    for (const [l, r] of box.parts) { expect(l).toBeGreaterThanOrEqual(box.col[0]! - 0.5); expect(r).toBeLessThanOrEqual(box.col[1]! + 0.5); }
    expect(box.hscroll).toBe(0);
    expect(box.footerBottom).toBeGreaterThanOrEqual(box.vh - 1);
  });
```

- [ ] **Step 3: Run the test to confirm it fails.**
  - Run: `npx playwright test --project=desktop tests/e2e/layout.spec.ts`
  - Expected: FAIL, because the header is wider than the column.

- [ ] **Step 4: Implement** the column and the footer.

- [ ] **Step 5: Run the tests to confirm they pass.**
  - Run: `npm run check && npx playwright test --project=desktop tests/e2e/layout.spec.ts`
  - Expected: PASS.

- [ ] **Step 6: Commit.**
  - Run: `git add -A && git commit -m "feat(layout): one content column, sticky footer with avatar"`

---

### Task 6: The single-line control lane (desktop and phone)

**Files:**
- Create:
  - `src/ui/app/lane.ts` (`tierFor`, `useLaneTier`)
  - `src/ui/app/lane.test.ts`
  - `src/ui/components/CityPill/{CityPill.tsx,CityPill.module.css,CityPill.test.tsx}`
  - `src/ui/components/ThemeToggle/{ThemeToggle.tsx,ThemeToggle.test.tsx}`
- Modify:
  - `src/ui/app/{WideLayout.tsx,PhoneLayout.tsx,Brand.tsx,layout.module.css}`
  - `src/ui/components/MomentPill/MomentPill.tsx` (`compact` prop)
  - `src/ui/components/CommandBar/CommandBar.tsx` (`placeholder` prop)
  - `src/ui/components/Icon/index.tsx` (`sun`, `chevronDown`)
  - `src/ui/i18n/{en,pt-BR}.ts`
  - `tests/e2e/layout.spec.ts`, `tests/e2e/plan.spec.ts`
- Remove: the globe buttons and `YouChip` from both headers (the chip moves in Task 8).

**Interfaces:**
- Produces:
  ```ts
  type Tier = 'A' | 'B' | 'C' | 'D';
  tierFor(width: number): Tier            // ≥1120 A, ≥960 B, ≥840 C, else D
  useLaneTier(ref: RefObject<HTMLElement>): Tier   // ResizeObserver; 'A' when unavailable (jsdom)
  CityPill({ tier, onOpen, expanded }: { tier: Tier | 'phone'; onOpen(): void; expanded: boolean })
  ThemeToggle()                            // flips effective theme, prefs.set('theme', opposite), track('setting', { key: 'theme', value })
  MomentPill({ compact?: boolean })        // compact → one line
  ```
- **CityPill text by tier:**

  | Tier | Text |
  |---|---|
  | A, B | `● {name} · {time}  {n} ▾` |
  | C | `● {name}  {n} ▾` |
  | D | `● {code}  {n} ▾` |
  | phone | `● {code}  {n} ▾` below a 400px container, otherwise as C |

  - The accessible name comes from `t('pill.cities', { city, n })`: "Reference city: {city}, {n} active. Change cities" (EN) / "Cidade de referência: {city}, {n} ativas. Alterar cidades" (PT).
- **Brand** shows the wordmark only in tier A; it always keeps `aria-label="Pismo Zones"`.
- **Command placeholder:** the full example in A and B; `t('command.placeholderShort')` ("Convert a time…" / "Converter um horário…") in C and D.
- **ThemeToggle labels:** `theme.toLight` "Switch to light" / "Mudar para claro"; `theme.toDark` "Switch to dark" / "Mudar para escuro".
- **Lane order:** Brand, CommandBar, CityPill, MomentPill, Share, Holidays, Theme, Settings.
- **Phone top bar:** Settings, Zones/Plan, Theme, CityPill.

- [ ] **Step 1: Write the failing tests.**

```ts
// lane.test.ts
it('tiers', () => { expect([1300, 1120, 1119, 960, 959, 840, 839, 720].map(tierFor)).toEqual(['A','A','B','B','C','C','D','D']); });
// CityPill.test.tsx
it('shows the effective reference by tier', () => {
  const r = renderWithApp(<CityPill tier="D" onOpen={() => {}} expanded={false} />, { refId: 'bangalore' });
  expect(r.getByRole('button', { name: 'Reference city: Bengaluru, 4 active. Change cities' }).textContent).toContain('BLR');
});
// ThemeToggle.test.tsx
it('flips and persists the theme', async () => {
  const { app, user, getByRole } = renderWithApp(<ThemeToggle />);
  const before = app.prefs.theme.value;
  await user.click(getByRole('button'));
  expect(app.prefs.prefs.value.theme).toBe(before === 'dark' ? 'light' : 'dark');
});
```

  Then add to `tests/e2e/layout.spec.ts`:
  - desktop widths 768, 900, 1024, 1280, 1440 and 1920;
  - langs `en` and `pt-BR` (set via Settings);
  - modes live, pinned (ArrowRight) and preview (typing "3pm bristol to austin").
  - Assert, for the header's direct children, that:
    - `top` values are equal within 1px;
    - `header.scrollWidth <= header.clientWidth`;
    - every child has a non-zero box.

  Add a phone variant for the top bar at 360, 390 and 430.

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/ui/app/lane.test.ts src/ui/components/CityPill src/ui/components/ThemeToggle && npx playwright test tests/e2e/layout.spec.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement.**
  - Header: `display: flex; flex-wrap: nowrap`. The command bar is `flex: 1 1 0; min-width: 200px`; every other child has `flex: none`. Icon buttons are 40px with an 8px gap.
  - Update `plan.spec.ts`, which opens cities through the old "Cities" button, to use the pill.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run check && npm run e2e`
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Run: `git add -A && git commit -m "feat(lane): single-line control lane with city pill and theme toggle"`

---

### Task 7: Cities panel: wide desktop dropdown and setting the reference

**Files:**
- Create:
  - `src/ui/components/CitiesSheet/CityRow.tsx`
  - `src/ui/components/CitiesSheet/CitiesPanel.tsx` (desktop)
  - `src/ui/components/CitiesSheet/CitiesPanel.test.tsx`
- Modify:
  - `src/ui/components/CitiesSheet/{CitiesSheet.tsx,CitiesSheet.module.css}`
  - `src/state/cities.ts` (`setReference`)
  - `src/ui/app/App.tsx` (the pill opens the panel on wide layouts and the sheet on phone)
  - `src/ui/i18n/{en,pt-BR}.ts`

**Interfaces:**
- Produces:
  - `cities.setReference(id: OfficeId)` adds `id` if it is inactive, sets `refId`, and tracks `cities_change { action: 'reference' }`.
  - `CityRow({ office, active, anchor, onPick, onToggle })`:
    - a main button (pick as reference), then the ＋/− button;
    - when `anchor` is set, an "Always on" label (`cities.always` "Always on" / "Sempre ativa") replaces the remove button.
  - `CitiesPanel({ open, onClose, anchorRef })`:
    - a `<dialog>` opened with `show()`, positioned under the header and as wide as the column;
    - a grid of `WorldMap` (40%) and the lists (60%) — search, Active, Available — with two-column rows;
    - Esc and an outside click close it and focus the pill;
    - arrow keys move between rows; Delete or Backspace removes;
    - the footer hint `cities.reorderHint`: "Alt + ↑/↓ reorders" / "Alt + ↑/↓ reordena".

- [ ] **Step 1: Write the failing tests.**

```ts
it('picking a city makes it the reference and adds it', async () => {
  const { app, user, getByRole } = renderWithApp(<CitiesPanel open onClose={() => {}} anchorRef={{ current: null }} />);
  await user.click(getByRole('button', { name: /^Warsaw/ }));
  expect([app.cities.refId.value, app.cities.activeIds.value.includes('warsaw')]).toEqual(['warsaw', true]);
});
it('São Paulo shows Always on and no remove button', () => {
  const { getByText, queryByRole } = renderWithApp(<CitiesPanel open onClose={() => {}} anchorRef={{ current: null }} />);
  expect(getByText('Always on')).toBeTruthy();
  expect(queryByRole('button', { name: 'Remove São Paulo' })).toBeNull();
});
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/ui/components/CitiesSheet`
  - Expected: FAIL.

- [ ] **Step 3: Implement.**
  - The phone `CitiesSheet` reuses `CityRow`.
  - The existing CitiesSheet tests keep their behaviour: toggling uses the ＋/− buttons, and the focus-preserving logic applies to whichever button was used.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run check && npm run e2e`
  - Expected: PASS, including the axe scans.

- [ ] **Step 5: Commit.**
  - Run: `git add -A && git commit -m "feat(cities): wide desktop dropdown; pick sets the reference; São Paulo always on"`

---

### Task 8: Ruler on desktop and the relocated You chip

**Files:**
- Modify:
  - `src/ui/app/{WideLayout.tsx,PhoneLayout.tsx,layout.module.css}`
  - `src/ui/components/YouChip.tsx`
- Test: `src/ui/components/YouChip.test.tsx`, `tests/e2e/plan.spec.ts`

**Interfaces:**
- Produces:
  - `WideLayout` renders `<div class={styles.rulerRow}><YouChip/><Ruler/></div>` between `CardList` and `PlanView`.
  - `YouChip` renders when no displayed office's zone `sameZone` matches `env.viewerZone`.
  - The phone shows the chip above the dock ruler.

- [ ] **Step 1: Write the failing tests.**

```ts
it('shows when the viewer zone matches no displayed card', () => {
  const r = renderWithApp(<YouChip />, { env: { viewerZone: 'Asia/Singapore' } });
  expect(r.container.textContent).toMatch(/You · 22:22/);
});
it('hides when a displayed card is in the viewer zone', () => {
  const r = renderWithApp(<YouChip />, { env: { viewerZone: 'Asia/Singapore' }, activeIds: ['saopaulo', 'singapore'] });
  expect(r.container.textContent).toBe('');
});
// plan.spec.ts (desktop): focus the ruler slider, press ArrowRight; the Plan's selected-column label shows "Pinned".
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/ui/components/YouChip.test.tsx`
  - Expected: FAIL.

- [ ] **Step 3: Implement.**

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run check && npm run e2e`
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Run: `git add -A && git commit -m "feat(layout): ruler between cities and Plan; You chip beside it"`

---

### Task 9: Desktop dialogs

**Files:**
- Modify:
  - `src/ui/components/Sheet/{Sheet.tsx,Sheet.module.css}`
  - `src/ui/components/SettingsSheet/{SettingsSheet.tsx,SettingsSheet.module.css}`
  - `src/ui/app/{App.tsx,ShortcutsSheet.tsx}`
  - `tests/e2e/layout.spec.ts`

**Interfaces:**
- Produces:
  - `Sheet({ variant?: 'sheet' | 'dialog', size?: 'wide' | 'narrow' })`, with `data-variant` on the dialog.
    - `dialog` + `wide`: `width: min(var(--page-w), 960px); max-height: 80dvh`.
    - `dialog` + `narrow`: 560px.
  - `App` passes `variant={wide ? 'dialog' : 'sheet'}`.
  - In the dialog variant, Settings uses `grid-template-columns: 2fr 3fr`: preview on the left, groups on the right.

- [ ] **Step 1: Write the failing test.** Extend `layout.spec.ts`: open Settings, Holidays and Shortcuts (`?`) at widths 768 and 1440. Each dialog box must lie within the column, its width must be ≥ 560px at 1440, and the Settings preview and groups must be side by side (preview `right ≤` groups `left`).

- [ ] **Step 2: Run the test to confirm it fails.**
  - Run: `npx playwright test --project=desktop tests/e2e/layout.spec.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement.** Keep the focus, Esc and opener-return behaviour unchanged. The phone keeps the bottom-sheet variant.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run check && npm run e2e`
  - Expected: PASS, including the axe scans of the opened dialogs.

- [ ] **Step 5: Commit.**
  - Run: `git add -A && git commit -m "feat(ui): wide desktop dialogs for settings, holidays and shortcuts"`

---

### Task 10: Plan as a world-clock grid

**Files:**
- Modify:
  - `src/ui/components/Plan/{model.ts,PlanView.tsx,Plan.module.css}`
  - `src/ui/i18n/{en,pt-BR}.ts`
  - `tests/e2e/plan.spec.ts`
- Test: `src/ui/components/Plan/model.test.ts`, `PlanView.test.tsx`

**Interfaces:**
- Consumes: `planDay` (unchanged), `workState`, the `ZONE` helpers.
- Produces:
  ```ts
  interface PlanViewModel {
    dayTitle: string;
    columns: Array<{ start: Instant; slots: [number, number] | [number] }>;   // one per reference-day hour (23/24/25)
    rows: Array<{ id: OfficeId; name: string; hours: string; at: string; dayDelta: number;
                  cells: Array<{ label: string; kinds: [WorkKind, WorkKind] | [WorkKind]; dayMark: '+1' | '−1' | null }> }>;
    selected: { column: number; label: string } | null;  // "Now 19:52" | "Pinned 15:00" | "Preview 15:00"
    best: { start: Instant; columns: [number, number]; perCity: Array<{ id: OfficeId; text: string }>; summary: string } | null;
    noCalendar: string[];
  }
  ```
- **Labels:** `H` (or `H:MM` when minutes ≠ 0) in `h23`; `9a` / `5:30p` in 12-hour mode.
- **`best.perCity[i].text`:**
  - a working office: "Austin 09:00–11:30";
  - an office outside: "Bengaluru outside (19:30–22:00)".
- **`summary`:** `t('plan.bestSummary', { list })`.
- **Clicking a column:** pins `columns[c].start` (`commit` `plan_drag`). Drag-scrub is kept.

- [ ] **Step 1: Write the failing tests.**

```ts
// vm({ ref, offices, date: [y, m, d], hc? }): planDay(date, ref.zone, offices) → planViewModel(…, now = NOW)
it('world-clock grid: local labels, half-hour zones, DST days, 12h', () => {
  const m = vm({ ref: 'saopaulo', offices: ['saopaulo', 'bangalore'], date: [2026, 10, 7] });
  expect(m.columns).toHaveLength(24);
  expect(m.rows[1]?.cells[0]?.label).toBe('8:30');     // 00:00 São Paulo = 08:30 Bengaluru
  expect(vm({ ref: 'bristol', offices: ['bristol'], date: [2026, 10, 25] }).columns).toHaveLength(25);
  expect(vm({ ref: 'saopaulo', offices: ['saopaulo'], date: [2026, 10, 7], hc: 'h12' }).rows[0]?.cells[13]?.label).toBe('1p');
});
it('best window spelled out per city', () => {
  const m = vm({ ref: 'saopaulo', offices: ['saopaulo', 'austin', 'bristol', 'bangalore'], date: [2026, 10, 7] });
  expect(m.best?.perCity.map((p) => p.text)).toEqual(expect.arrayContaining([expect.stringMatching(/^Bengaluru outside \(/)]));
});
// PlanView.test.tsx: clicking column 15 pins its start instant.
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/ui/components/Plan`
  - Expected: FAIL.

- [ ] **Step 3: Implement** the model and the view.
  - **Desktop:** a grid of 24 (±1) columns. Each cell shows its label; the two halves are coloured when they differ.
  - **Selected column:** outlined, with its label above.
  - **Best window:** a tinted band, with the summary line and the "Jump" button.
  - **Phone:** a horizontal scroller with sticky row names; the selected column scrolls into view on open.
  - **Screen readers:** the table gains a column per hour.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run check && npm run e2e`
  - Expected: PASS, with `plan.spec.ts` updated to the new labels.

- [ ] **Step 5: Commit.**
  - Run: `git add -A && git commit -m "feat(plan): world-clock grid with per-city hours and best window"`

---

### Task 11: Hosts, analytics per host, the Vercel mirror

**Files:**
- Create:
  - `src/core/site.ts` (`CANONICAL_ORIGIN`)
  - `src/state/host.ts`, `src/state/host.test.ts`
  - `src/ui/app/vercel.ts`, `src/ui/app/vercel.test.ts`
  - `vercel.json`
  - `src/ui/styles/vercel.test.ts`
- Modify:
  - `worker/headers.ts` (import `CANONICAL_ORIGIN` from core; extend CSP `connect-src`)
  - `public/_headers`
  - `src/state/env.ts` (send to `eventsUrl(hostKind(location))`)
  - `src/state/index.ts` (`shareUrl` uses `shareOrigin`)
  - `src/main.tsx` (inject per host)
  - `package.json` (`"engines": { "node": "24.x" }`)
  - `src/state/appState.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // core/site.ts
  export const CANONICAL_ORIGIN = 'https://pismozones.ashwingopalsamy.in';
  // state/host.ts
  type HostKind = 'cloudflare' | 'vercel' | 'local';
  hostKind(loc: { hostname: string }): HostKind;   // *.vercel.app → vercel; localhost|127.0.0.1|*.localhost → local; else cloudflare
  eventsUrl(kind: HostKind): string;               // vercel → `${CANONICAL_ORIGIN}/e`; else '/e'
  shareOrigin(kind: HostKind, origin: string): string;   // local → origin; else CANONICAL_ORIGIN
  // ui/app/vercel.ts
  injectVercelAnalytics(doc: Document): void;      // once: <script defer src="/_vercel/insights/script.js">
  ```
- **`main.tsx`:**
  - `cloudflare` → `injectBeacon(token)`;
  - `vercel` → `injectVercelAnalytics(document)`;
  - `local` → nothing.
- **`vercel.json`:**
  - `buildCommand: "npm run build"`, `outputDirectory: "dist/client"`, `framework: null`;
  - `rewrites: [{ "source": "/(.*)", "destination": "/index.html" }]`;
  - `headers`: `/(.*)` gets every `SECURITY_HEADERS` entry; `/assets/(.*)` and `/fonts/(.*)` get immutable caching; `/sw.js` and `/index.html` get `no-cache`.

- [ ] **Step 1: Write the failing tests.**

```ts
// host.test.ts
it('classifies hosts and routes events and shares', () => {
  expect(['pismozones.vercel.app', 'pismozones-git-x-a.vercel.app', 'localhost', 'pz.localhost', 'pismozones.ashwingopalsamy.in', 'pismozones.ashwingopalsamy.workers.dev'].map((h) => hostKind({ hostname: h })))
    .toEqual(['vercel', 'vercel', 'local', 'local', 'cloudflare', 'cloudflare']);
  expect(eventsUrl('vercel')).toBe('https://pismozones.ashwingopalsamy.in/e');
  expect(eventsUrl('cloudflare')).toBe('/e');
});
// appState.test.ts
it('share links use the canonical origin except locally', () => {
  const s = createAppState(makeEnv({ location: { pathname: '/', search: '', origin: 'https://pismozones.vercel.app' } }));
  expect(s.shareUrl()).toMatch(/^https:\/\/pismozones\.ashwingopalsamy\.in\/s\//);
});
// vercel.test.ts: injects once; never when called twice.
// styles/vercel.test.ts: vercel.json headers contain every SECURITY_HEADERS pair; cache rules match _headers; CSP connect-src includes the canonical origin.
```

- [ ] **Step 2: Run the tests to confirm they fail.**
  - Run: `npx vitest run src/state/host.test.ts src/ui/app/vercel.test.ts src/ui/styles src/state/appState.test.ts`
  - Expected: FAIL.

- [ ] **Step 3: Implement.**
  - `AppEnv.location` gains an optional `hostname` (defaulted from `origin` in tests).
  - The existing `share URL` test expectation changes from `http://localhost` to the local origin rule, which is unchanged for localhost.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run check && npm run build && npm run size && npx playwright test --project=prod`
  - Expected: PASS, budgets met, `network.spec.ts` green.

- [ ] **Step 5: Commit.**
  - Run: `git add -A && git commit -m "feat(hosting): Vercel mirror, per-host analytics, canonical share links"`

---

### Task 12: Worker accepts Vercel origins and records the host

**Files:**
- Modify: `worker/events.ts`, `worker/events.test.ts`, `docs/analytics.md`

**Interfaces:**
- Produces:
  - **`ORIGIN_RE`** additionally matches `https://pismozones.vercel.app` and `https://pismozones-[a-z0-9-]+.vercel.app`.
  - **Write shape:**
    ```
    blobs: [e.n, String(batch.v), batch.a, country, batch.s, ...pad(e.b, 6), host]
    ```
    `pad` fills to six with `''`, so `host` is always `blob12`, the origin's hostname.

- [ ] **Step 1: Write the failing test.**

```ts
it('host blob: Vercel origin accepted, host in blob12, event blobs unmoved', async () => {
  const writeDataPoint = vi.fn();
  const res = await handleEvents(post(JSON.stringify(batch), 'https://pismozones.vercel.app'), { EVENTS: { writeDataPoint } } as never);
  expect(res.status).toBe(204);
  expect(writeDataPoint.mock.calls[0]?.[0].blobs).toEqual(['commit', '1', '2.0.0', 'XX', 'abcd1234abcd1234', 'ruler', '', '', '', '', '', 'pismozones.vercel.app']);
  expect(ORIGIN_RE.test('https://evil.vercel.app')).toBe(false);
});
```

- [ ] **Step 2: Run the test to confirm it fails.**
  - Run: `npx vitest run --project worker`
  - Expected: FAIL.

- [ ] **Step 3: Implement.** Update the existing write-shape expectation to the padded form. In `docs/analytics.md`:
  - document `blob12`;
  - add query 10, "Sessions by host";
  - note that rows written before this change have `blob12 = ''`.

- [ ] **Step 4: Run the tests to confirm they pass.**
  - Run: `npm run check`
  - Expected: PASS.

- [ ] **Step 5: Commit.**
  - Run: `git add -A && git commit -m "feat(worker): accept Vercel origins; record host in blob12"`

---

### Task 13: CI, README, GitHub cleanup and acceptance

**Files:**
- Modify: `.github/workflows/ci.yml` (remove `preview` and `deploy`), `README.md` (Deploy section: both hosts and the owner steps of spec §10.5)

**Interfaces:**
- Consumes: everything.

- [ ] **Step 1: Trim CI and update the README.**
  - Run: `npx --yes @action-validator/cli .github/workflows/ci.yml`
  - Expected: no errors.

- [ ] **Step 2: Remove the unused GitHub configuration** (approved in spec §10.4).
  - Run: `gh secret delete CLOUDFLARE_ACCOUNT_ID && gh variable delete VITE_CF_BEACON_TOKEN`
  - Expected: both report deleted.

- [ ] **Step 3: Run the full acceptance pass.**
  - Run: `npm run check && npm run build && npm run size && npm run e2e`
  - Expected: all PASS.
  - Record evidence for each spec §12 item in the commit body.

- [ ] **Step 4: Visual QA in the browser pane** against the owner's annotated screenshots:
  - desktop at 1440 and 768, light and dark;
  - phone at 390.

  Checks:
  - one-line lane
  - nothing outside the column
  - hero and lane
  - ruler placement
  - footer at the bottom with the avatar
  - wide dialogs

- [ ] **Step 5: Commit.**
  - Run: `git add -A && git commit -m "chore: CI verify-only; README for both hosts; record refinements evidence"`

- [ ] **Step 6: [owner]**
  1. Connect Cloudflare Workers Builds:
     - Build command `npm run build`; deploy command `npx wrangler deploy`.
     - Non-production builds: `npx wrangler versions upload`.
     - Build variable `VITE_CF_BEACON_TOKEN`.
  2. Run `vercel login` and import the repo as project `pismozones`, then enable Web Analytics.
  3. Optionally, exclude the hostname from the zone's automatic Web Analytics setup.

---

## Exit criteria

- Every spec §12 item has recorded evidence, and the whole suite, the budgets and the e2e tests pass.
- Merged to `main`. Cloudflare and Vercel both serve the build once the owner steps are done.
