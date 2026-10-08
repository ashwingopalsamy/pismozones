# Pismo Zones — Refinements after launch (design)

**Status:** approved in conversation on 2026-10-08; this document is the written spec.
**Amends:** `2026-10-07-pismozones-revamp-design.md` (the base spec). Where this document and the base spec disagree, this one wins. Section numbers in brackets (for example [base §3.1]) point at the base spec.

## 1. Goals

The owner reviewed the live app and asked for the following, in their words where it matters:

1. Remove "those useless sun and moon and that horizontal line" from the cards.
2. Keep "everything within the same width that the city and meeting panels have, never outside that".
3. The control lane (header) "should never overflow to next line", with every control visible: no overflow menus, nothing folded into another button.
4. São Paulo is "the biggest, widest panel on the top, fixed"; the other cities sit on a second lane.
5. The ruler ("the mobile version's moving toggle") sits between the cities and the meeting panel on desktop and drives both.
6. The meeting panel is "much more clearer".
7. The cities selector becomes a pill dropdown in the control lane that shows the city whose time is shown (the old app's selector concept).
8. Desktop panels (settings, city selector, holidays) are wide desktop panels, not tall phone sheets.
9. Light/dark follows the machine by default, remembers a choice, and has a visible toggle in the control lane.
10. Default cities are São Paulo, Austin, Bengaluru and Bristol; São Paulo can never be removed.
11. Holidays use Pismo's own per-country leave calendars from the pre-revamp app.
12. The footer sits at the bottom of the window, with a small photo of the owner.
13. Keep the Cloudflare deployment and bring the Vercel one back, with analytics on both.

**Owner decisions taken during design:**
- Holidays: company lists only. 2026 is the published year; nothing is projected or guessed.
- Vercel: a mirror of the same app, with Vercel Web Analytics there and Cloudflare Web Analytics on Cloudflare. Product events from both hosts go to the Cloudflare `/e` endpoint. Share links always use the canonical domain.
- The India office is displayed as **Bengaluru**.
- The footer photo is the owner's GitHub avatar, downloaded once and self-hosted.

**Non-goals:** new features beyond the list above; changes to the parser, share codec or Plan scoring rules (except as stated in §6); deleting old analytics rows.

## 2. One content column

- A single token, `--page: min(1280px, 100% - 2 × gutter)`, centres every desktop element in one column. The gutter is 32px at widths of 1024px and above, and 24px below that.
- The header, sentence row, banners, cards, ruler, Plan, footer and every desktop panel align to that column's left and right edges. Nothing renders outside it, including focus rings, which are drawn with inset outlines at the column edges.
- **Sticky footer:** the page is a full-height flex column (`min-height: 100dvh`). The footer gets `margin-top: auto`, so it sits at the window bottom when content is short and after the content when it is long.
- **Guarantee (tested, §11):** at viewport widths 768, 900, 1024, 1280, 1440 and 1920, the bounding boxes of the header, every card, the ruler, the Plan and the footer satisfy `left ≥ column.left − 0.5px` and `right ≤ column.right + 0.5px`. `document.documentElement.scrollWidth` equals `clientWidth`, so there is no horizontal page scroll.

## 3. The control lane (desktop header)

### 3.1 Contents, in order

| # | Element | Purpose |
|---|---|---|
| 1 | Brand | Logo mark + "Pismo Zones" wordmark |
| 2 | Command bar | Type a time; the only elastic element |
| 3 | City pill | Shows the reference city (the city typed times are read in) and opens the cities dropdown (§5) |
| 4 | Moment pill | Live / Pinned / Preview, the delta, and the ↺ reset ([base §3.2]) |
| 5 | Share | Icon button |
| 6 | Holidays | Icon button |
| 7 | Theme | Icon button: flips light ↔ dark (§8) |
| 8 | Settings | Icon button |

The globe button and the "You · 10:22" chip are gone from the header. The globe's job moves to the city pill. The You chip moves next to the ruler (§4.3).

### 3.2 Single-line rule

- The header is `display: flex; flex-wrap: nowrap`, with `container-type: inline-size`. Compaction is driven by the header's own width W (the column width), not the viewport.
- Every element except the command bar has a fixed, known footprint at each tier (below). The command bar takes the remaining space: `flex: 1 1 0`, with a minimum width of 200px.
- Icon buttons are 40 × 40px with an 8px gap. Every icon button keeps a visible tooltip (`title`) and an `aria-label`.

| Tier | Header width W | Brand | City pill | Moment pill | Command placeholder |
|---|---|---|---|---|---|
| A | ≥ 1120px | mark + wordmark | `● São Paulo · 19:30  4 ▾` | two lines (delta / "Today · 05:00 Bengaluru") | full example |
| B | 960–1119px | mark only (wordmark kept as `aria-label`) | as A | as A | full example |
| C | 840–959px | mark only | `● São Paulo  4 ▾` (time dropped) | one line (delta or "Live") + ↺ | "Convert a time…" |
| D | < 840px (narrowest: 720px at a 768px viewport) | mark only | `● SAO  4 ▾` (3-letter code, §5.4) | one line + ↺ | "Convert a time…" |

- **Width budget at tier D, W = 720px.** Mark 32 + command bar ≥ 200 + city pill 92 + moment pill 156 + 4 × 40 icons + 7 × 8 gaps = **696px ≤ 720px**. The 24px margin covers PT-BR strings.
- **The longest pill text in each tier** is measured in a test (§11), so the budget cannot rot silently.
- **What is never done:** wrapping, hiding a control, an overflow ("⋯") menu, or merging two controls into one.
- What compacts is only information that is visible elsewhere:
  - the wordmark;
  - the reference city's time, which is on the hero card and in the Plan;
  - the moment pill's second line, which repeats the ruler's label.

### 3.3 Phone top bar

- Also one line: `[⚙ Settings] [Zones | Plan] [◐ Theme] [● SAO 4 ▾ city pill]`.
- At a 360px viewport the budget is 40 + 136 + 40 + 84 + 3 × 8 = **324px ≤ 328px**. Above 400px the city pill shows the full name.
- Share and the moment pill stay in the bottom dock. Holidays stays reachable from Settings and from holiday chips on cards. Neither is hidden; both sit where they did, which the owner has seen.

## 4. Cities on screen

### 4.1 Cards lose the sky decorations

- Remove from `ZoneCard`:
  - the sun path (above- and below-horizon polylines);
  - the sun/moon disc;
  - the horizon line;
  - the work-window line.
- Remove from the card model: `path`, `sun` and their computation. The `sunSamples` and `solarElevation` exports stay, because the sky gradient still uses elevation.
- **Kept:**
  - the sky gradient and the stars;
  - the `CARD_SCRIM` contrast guarantee ([base §5.6]; its tests stay);
  - name, tags, state chip, time, day label, offset and clocks-change label.

### 4.2 São Paulo hero + city lane (desktop)

- **Hero:** São Paulo always renders first, as a full-column-width card, taller than the rest (`HERO_BOX = { w: 1216, h: 176 }`, scaling with the column). It shows the work hours label (for example "09:00–18:00") beside the offset. It is not draggable or removable.
- **City lane:** the second lane holds every other displayed city (saved, temporary and shared), in saved order.
  - It uses `grid-template-columns: repeat(auto-fit, minmax(260px, 1fr))`, so 1–4 cities share one row and further cities wrap to more rows of the same lane.
  - Temporary and shared cards keep their "Not saved / Add" affordance.
- **Phone:** São Paulo is the first card in the list and uses the larger phone box (`PHONE_HERO_BOX = { w: 358, h: 148 }`). Others follow as today.

### 4.3 Ruler between cities and Plan (desktop)

- The desktop layout renders the existing `Ruler` between the city lane and the Plan, at full column width. Scrubbing it moves the moment, so it drives the cards and the Plan's selected column (§6).
- On phone the ruler stays in the dock, as today.
- **You chip [amends base §3.1].** When no displayed card's zone matches the viewer's zone, a compact "You · 10:22" chip sits at the ruler row's left end (desktop), or above the dock's ruler (phone). This also covers the earlier gap where the chip appeared only when the viewer's zone matched no office at all.

## 5. City pill and the cities panel

### 5.1 Pill

- **Contents:**
  - a work-state dot for the reference city;
  - the reference city's name (or its code at tier D / on phone);
  - its local time (tiers A and B);
  - the count of active cities;
  - a chevron.
- `aria-haspopup="dialog"`, `aria-expanded`, and the accessible name "Reference city: São Paulo, 4 active. Change cities".
- The reference city is unchanged in meaning [base §3.1]. A command preview's source temporarily overrides it, and the pill reflects the effective reference.

### 5.2 Desktop: wide dropdown

- Opening the pill shows a panel directly under the header, spanning the full column width. It is a `<dialog>` opened with `show()`, so it is non-modal and positioned under the header rather than centred. While it is open, focus is trapped inside it; Esc and an outside click close it and return focus to the pill.
- Layout: search, then **Active** and **Available** in a two-column grid of rows. The world map was removed at the owner's request (2026-10-08).
- Each row shows the work-state dot, name, country, local time, ±day and offset, then the actions:
  - **Clicking the row** makes it the reference city (and adds it if inactive).
  - **The ＋/− button** adds or removes it.
- São Paulo's row shows "Always on" instead of a remove button.
- Keyboard:
  - arrow keys move between rows;
  - Enter sets the reference;
  - Delete or Backspace removes;
  - Alt+↑/↓ reorders active cities (existing behaviour, now listed in the panel footer so it is discoverable).

### 5.3 Phone

The same contents as a bottom sheet, which is the existing Cities sheet plus the reference-on-tap behaviour.

### 5.4 Registry changes

- `bangalore`'s display name becomes **Bengaluru**. The id stays `bangalore`, because the share index, storage and links depend on it. Aliases keep `bangalore`, `bengaluru`, `blr` and `india`.
- Every office gains `code`, a 3-letter city code used only for display at tier D and on phone:

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

### 5.5 Defaults and São Paulo [amends base §3.1]

- `DEFAULT_ACTIVE = ['saopaulo', 'austin', 'bangalore', 'bristol']`, plus the viewer's office if it isn't one of them (unchanged rule).
- **São Paulo is always active:**
  - `cities.toggle('saopaulo')` and `cities.move('saopaulo', …)` are no-ops;
  - `sanitize` and migration put `saopaulo` first in `activeIds` when it is missing;
  - the active count includes it.

## 6. Plan: a world-clock grid [amends base §3.3]

- **Model:** scoring and the best window are unchanged: 30-minute slots on the reference city's DST-exact day, with "same people working throughout". New fields in `planViewModel`:
  - `columns`: one per reference-day hour (23, 24 or 25). Each holds its two half-hour slot indexes and `startInstant`.
  - `rows[i].cells[c]`: `{ label, kind, dayDelta }`.
    - `label` is the row's local time at the column start, formatted `H` when minutes are 0 and `H:MM` otherwise; `h23` or `h12` follows prefs, with the 12-hour form as `9a` / `5:30p`.
    - `kind` is the work state of the column's first half-slot. When the two halves differ, the cell renders both halves.
    - `dayDelta` is set where the row's local date differs from the reference date, rendered as a small "+1" / "−1" marker on the first such cell of a run.
  - `rows[i].hours`: the office's work hours, for example `09–18`.
  - `selected`: the column containing the current moment, with its label "Now 19:52" or "Pinned 15:00" (or "Preview 15:00").
  - `best.perCity`: for every row, `{ officeId, from, to, kind }` in that city's local time. Offices outside the window are listed with their local times and state ("outside").
- **Desktop rendering:**
  - Rows: name + hours on the left, then 24 (±1) cells, each showing its label.
  - The selected column is outlined and labelled above the grid.
  - The best window is a tinted band.
  - The summary line reads: "Best overlap · Austin 09:00–11:30 · São Paulo 11:00–13:30 · Bristol 15:00–17:30 · Bengaluru outside (19:30–22:00)", followed by "Jump to best overlap".
  - Clicking a column pins its start instant (`commit` method `plan_drag`). Dragging across columns scrubs, as today.
- **Phone rendering:** the same grid in a horizontal scroller (each column 36px), with sticky row names. The selected column scrolls into view on open.
- **Accessibility:** the screen-reader table stays, gaining a column per hour with the local times. The legend keeps Working / Early or late / Off / Weekend / Holiday, with a "Half day" pattern added.

## 7. Desktop panels [amends base §3.4]

- At widths ≥ 768px, every sheet renders as a centred modal `<dialog>`, constrained to the column (`width: min(var(--page), 960px)`, `max-height: 80dvh`, internal scroll). Below 768px they stay bottom sheets.

| Panel | Desktop layout |
|---|---|
| Settings | Two columns: the live preview card (left, 40%); Display / Places / Privacy groups (right) |
| Holidays | Tabs across the top (§9.3), with a list of holiday rows in two columns at widths ≥ 960px |
| Shortcuts | Single column, `width: min(var(--page), 560px)` |
| Cities | The dropdown described in §5.2 (not a modal) |

- Focus management, Esc, and returning focus to the opener follow the existing `Sheet` behaviour. `Sheet` gains a `variant: 'sheet' | 'dialog'` chosen by layout.

## 8. Theme

- **Default:** the system theme (unchanged). `prefs.theme` is `'system' | 'light' | 'dark'` and is stored in `pz:v1`; `boot.js` still applies an explicit choice before first paint.
- **Theme button** (desktop control lane and phone top bar):
  - its icon shows the current effective theme (sun / moon);
  - clicking it sets the opposite theme explicitly and saves it;
  - its tooltip names the result ("Switch to light").
- Settings keeps System / Light / Dark, so the user can return to following the machine.
- Analytics: `setting { key: 'theme', value }`.

## 9. Holidays: Pismo company calendars [replaces base §5.5 data]

### 9.1 Data

- **Sources:** the pre-revamp app's `HolidayPanel.jsx` / `holidays.js` (commit `4e60f25`), copied verbatim: dates, English names, Brazil's Portuguese names and notes.
- **One calendar per country**, mapped to offices:

| Calendar | Office | 2026 entries |
|---|---|---|
| `in` (India) | Bengaluru | 14 |
| `br` (Brazil) | São Paulo | 17, incl. Ash Wednesday (half day) |
| `uk` (UK) | Bristol | 8 |
| `us` (USA) | Austin | 12, incl. Jul 3 "Observed (Jul 4)" and the day after Thanksgiving |
| `pl` (Poland) | Warsaw | 14, incl. Christmas Eve |

- Brazil entries show the Portuguese name in PT and the English note in EN. Other countries show their English name in both languages; there is no invented translation, and the PT copy is flagged for native review.
- **Ash Wednesday (2026-02-18, São Paulo):** a half day; the office works from 14:00 ([base §5.5] ruling kept).
- **Offices with no company calendar:** Singapore, Mexico City, Buenos Aires, Bogotá, Sydney, Ho Chi Minh and Jakarta.

### 9.2 Model

```ts
type CalendarId = 'in' | 'br' | 'uk' | 'us' | 'pl';
interface Holiday { date: string; name: { en: string; pt?: string }; note?: { en: string }; kind: 'full' | 'half'; hours?: { start: number; end: number } }
// src/core/work/holidays/company/2026.ts — data, frozen
publishedYears(id): readonly number[]            // [2026]
holidaysIn(id, year): readonly Holiday[]          // [] when unpublished
holidayOn(id, date): Holiday | undefined          // undefined when unpublished
coverage(id, date): 'published' | 'unpublished'
```

- The rule engine, Easter computation, gazette calendars (`br-sp`, `us-tx`, `gb-eng`, `pl`, `in-ka`, `sg`) and their tests are deleted.
- `workState` returns a holiday only for published dates.
- Adding 2027 means adding `company/2027.ts` and its year to `publishedYears`.

### 9.3 Holidays panel

- **Tabs:** **Upcoming** (merged across the active offices' calendars, the next 90 days, each row tagged with its offices), then one tab per country present among the active offices.
- **Country tab:** the full published year, grouped by month. Past days are dimmed, and "Today", "Next" and "Half day" are badges.
- **Notes:**
  - In years with no published calendar, the panel says "2027 calendar not published yet".
  - Active offices without a calendar are listed under "No company calendar".
- **Opening from a card's holiday chip** selects that office's country tab and scrolls to the date. This fixes the earlier deferred minor.

## 10. Hosting and analytics [amends base §8]

### 10.1 Hosts

| Host | Origin | Builds | Serves |
|---|---|---|---|
| Cloudflare (canonical) | `https://pismozones.ashwingopalsamy.in`, `https://pismozones.ashwingopalsamy.workers.dev` | Cloudflare Workers Builds from `main` (owner connects the repo); non-production branches upload preview versions | Worker (`/s/*` previews, `/e` ingest) + static assets |
| Vercel (mirror) | `https://pismozones.vercel.app` (+ preview URLs) | Vercel Git integration from `main` (owner recreates the project) | Static `dist/client` only |

- **`vercel.json`:**
  - `buildCommand: "npm run build"`, `outputDirectory: "dist/client"`;
  - a rewrite `/(.*)` → `/index.html` (filesystem first, so assets win);
  - headers that mirror `SECURITY_HEADERS` and the `_headers` cache rules (a test enforces the mirror).
- **Node version:** `package.json` gains `"engines": { "node": "24.x" }`; Vercel reads it and Workers Builds reads `.nvmrc`.
- On Vercel, `/s/<token>` opens the app through the SPA fallback; there is no Worker preview there.
- **Share links** are always built on the canonical origin (`https://pismozones.ashwingopalsamy.in/s/…`) unless the app runs on `localhost`, so previews stay rich from either host.

### 10.2 Host detection

`hostKind(location): 'cloudflare' | 'vercel' | 'local'`, in `src/state/host.ts`:
- `*.vercel.app` → `vercel`;
- `localhost`, `127.0.0.1` or `*.localhost` → `local`;
- anything else → `cloudflare`.

### 10.3 Analytics per host

| Host | Page analytics | Product events |
|---|---|---|
| cloudflare | Cloudflare Web Analytics beacon (build-time `VITE_CF_BEACON_TOKEN`; skipped if the zone already injected one) | `POST /e` (same origin) |
| vercel | Vercel Web Analytics: `<script defer src="/_vercel/insights/script.js">` injected at runtime (same origin; the owner enables Web Analytics on the project) | `POST https://pismozones.ashwingopalsamy.in/e` (cross-origin `sendBeacon`, `text/plain`, no preflight) |
| local | none | `POST /e` (dev Worker) |

- **One CSP for both hosts:** `connect-src 'self' https://pismozones.ashwingopalsamy.in https://cloudflareinsights.com`. Everything else is unchanged.
- **Worker `ORIGIN_RE`** additionally accepts `https://pismozones.vercel.app` and `https://pismozones-[a-z0-9-]+.vercel.app`.
- **Host blob:** the Worker writes the request's validated origin host into **`blob12`** for every event. Event blobs are padded with `''` to six slots (`blob6`–`blob11`), so existing `blob6+` positions are unchanged and old rows read `blob12 = ''`. `docs/analytics.md` documents `blob12` and adds a "sessions by host" query.

### 10.4 CI

- `.github/workflows/ci.yml` keeps only `verify`; the `preview` and `deploy` jobs are removed.
- The GitHub secret `CLOUDFLARE_ACCOUNT_ID` and the variable `VITE_CF_BEACON_TOKEN` are deleted. The beacon token becomes a Cloudflare Workers Builds build variable.
- The README "Deploy" section describes both hosts and their owner steps.

### 10.5 Owner steps (not automatable here)

1. **Cloudflare:** Workers & Pages → `pismozones` → Settings → Builds → connect `ashwingopalsamy/pismozones`.
   - Build command `npm run build`; deploy command `npx wrangler deploy`.
   - Non-production branches: `npx wrangler versions upload`.
   - Build variable `VITE_CF_BEACON_TOKEN`.
2. **Vercel:** run `vercel login` (or use the dashboard) and import the repo as project `pismozones`; framework "Other"; settings come from `vercel.json`. Then enable Web Analytics on the project.
3. **Optional:** in the zone's Web Analytics site, exclude `pismozones.ashwingopalsamy.in` from automatic setup so the app's own site receives its page views.

## 11. Footer

- Inside the column, at the window bottom (§2). Left: the privacy line. Right: a 24px round avatar, then "Ashwin Gopalsamy · Auth Tribe, Pismo · GitHub".
- **Avatar:** `public/ashwin.jpg`, a 64 × 64 JPEG generated once from `https://github.com/ashwingopalsamy.png` (the owner approved this download). It is self-hosted (CSP `img-src 'self'`), loaded with `loading="lazy"` and `decoding="async"` at a fixed 24 × 24 size (no layout shift), and has `alt="Ashwin Gopalsamy"`.
- **Phone:** the footer sits at the end of the Settings sheet, as today, and gains the avatar.

## 12. Testing and acceptance

These are added to [base §12]. Item C10 is replaced.

- [ ] **Single line:** at viewport widths 768, 900, 1024, 1280, 1440 and 1920, in EN and PT-BR, in live, pinned and preview modes:
  - every header child shares one row (equal `top` within 1px);
  - `header.scrollWidth ≤ header.clientWidth`;
  - every control is visible (non-zero box, not `visibility:hidden`).
- [ ] **Phone single line:** the same checks for the phone top bar at 360, 390 and 430.
- [ ] **Column containment** (§2) at the same widths, including open desktop panels.
- [ ] **No sky decorations:** cards render no arc, sun/moon, horizon or work line, verified by a component test that queries the removed elements.
- [ ] **São Paulo:** São Paulo is the hero, cannot be removed or moved, and is restored by `sanitize` when it is missing from storage.
- [ ] **Defaults:** a new viewer gets São Paulo, Austin, Bengaluru and Bristol (+ their own office).
- [ ] **City pill:**
  - clicking a city sets the reference;
  - Esc returns focus to the pill;
  - the pill's text matches the effective reference, including during a command preview.
- [ ] **Theme:**
  - the default follows `prefers-color-scheme`;
  - the button flips the theme and the choice survives a reload;
  - Settings → System returns to following the machine.
- [ ] **Plan:**
  - the labels show each row's local hours (including `:30` for Bengaluru);
  - the column count is 23 or 25 on DST days;
  - clicking a column pins it;
  - the best window is summarised per city.
- [ ] **C10 (replaced):** the company calendars match the 2026 source lists exactly (a pinned snapshot). Dates in 2027 report `unpublished`, and `workState` shows no holiday for them.
- [ ] **Hosts:**
  - `hostKind` classification;
  - Vercel Analytics is injected only on `vercel`, and the CF beacon only on `cloudflare`;
  - share URLs use the canonical origin except on `local`;
  - the tracker endpoint per host.
- [ ] **Worker:** Vercel origins are accepted; look-alikes are rejected; `blob12` carries the host; event blob positions are unchanged.
- [ ] **`vercel.json`:** its headers mirror `SECURITY_HEADERS`, and the cache rules match `_headers`.
- [ ] **Budgets hold:** JS entry ≤ 45 KB, CSS ≤ 12 KB, total ≤ 160 KB gzipped.
