# Pismo Zones — Revamp Design

- **Status:** Approved 2026-10-07
- **Date:** 2026-10-07
- **Owner:** Ashwin Gopalsamy
- **Visual reference:** [`docs/design/redesign-canvas/`](../../design/redesign-canvas/) (live canvas: Phone · Zones, Plan, Cities, Settings; Desktop)

## 1. Summary

Rebuild Pismo Zones from a lean, framework-free time engine upward, keeping the app's visual soul (sky-as-data cards, glass, calm motion) and making every existing feature correct, fast and effortless. No new product surface: the meeting finder, 12/24h, PT-BR, holidays and sharing already exist in code or in the case study. They become reachable, correct and delightful.

The app moves from Vercel to the Cloudflare free tier (Workers + static assets). Analytics move to Cloudflare Web Analytics plus first-party product events in Workers Analytics Engine, with no cookies, no IP storage and no free text.

### Goals

1. **Never silently wrong.** Every time shown is derived from one UTC instant. Wall-clock input always goes through explicit DST disambiguation. Unknown or ambiguous input gets an explicit answer, never a fallback.
2. **Two interactions or fewer** for every core job, on phone and desktop:
   - (a) see who's working now
   - (b) convert time X in city A for everyone
   - (c) find a meeting slot
   - (d) know about holidays
   - (e) share a time
3. **Delightful input.** You can directly edit any card's time, scrub the ruler or plan, and the command bar previews before it commits.
4. **Fast.** About 45 KB gzipped of JavaScript on the critical path. Nothing re-renders every second except the seconds text. Instant offline after the first visit.
5. **WCAG 2.2 AA**, enforced by tests where it can be computed (sky contrast).
6. **Exceptional developer experience.** Strict types, pure core with property tests, one `npm run dev` that runs the SPA and the Worker locally, CI with budgets, and preview deploys.

### Non-goals

- Custom working hours per user. Hours remain an office policy, 09:00–18:00.
- Recurring events, ranges ("9–5") and calendar integrations. The parser rejects these explicitly.
- An analytics dashboard UI. The schema plus saved SQL queries ship; a dashboard is a follow-up.
- Updating `design-case-study.html`. This is a follow-up once the revamp ships.

## 2. Settled decisions

| # | Decision | Source |
|---|---|---|
| D1 | Replace both natural-language engines (the regex parser and the neural `gpu-time` parser) with one deterministic grammar parser. `gpu-time` leaves the production path. | User |
| D2 | Interaction model: direct manipulation plus a timeline. There is no "source" control: the reference city is whoever you last edited. The command bar previews, Enter commits and Esc reverts. An explicit Live/Pinned state. | User |
| D3 | Hosting is entirely on the Cloudflare free tier; all Vercel artifacts are removed. | User |
| D4 | Analytics: Cloudflare Web Analytics plus rich first-party events in Analytics Engine. No cookies, no IP, no free text. | User |
| D5 | Canonical origin `pismozones.ashwingopalsamy.in`, plus the account's `*.workers.dev` URL. | User |
| D6 | Architecture A: TypeScript strict, Preact plus signals, Vite. No framer-motion, no luxon (zone math uses `Intl`). | User delegated, "best architecture" |
| D7 | EN and PT-BR, auto-detected, with a switch in Settings. PT copy needs native-speaker review before release. | User |
| D8 | The visual direction is the redesign canvas: true-black ground, physically-derived skies, sun path with work window, delta pill, ruler, dot-matrix map, Zones \| Plan on phone. | User approved mock |
| D9 | Bare hours (`3`, `9`) resolve with a business-hours bias, plus a one-tap flip chip in the preview. | User delegated |
| D10 | GPC/DNT are not consulted. Analytics stay anonymous, with no cookies and no free text. | User |

## 3. Product and interaction model

### 3.1 Concepts the user sees

- **Moment.** The one instant every card shows.
  - **Live** follows now and shows a pulsing dot and seconds.
  - **Pinned** is a fixed instant, shown as a delta pill ("+2h 30m · Thu 15:00 Bristol") with ↺ to return to live.
  - **Preview** is a transient state while the command bar holds a valid, uncommitted parse. It shows an amber dot and "Enter to set · Esc to clear".
- **Reference city.**
  - **What sets it:** the city you last edited, typed as the source, or picked in Plan.
  - **What it means:** typed times are read in its zone, and the Plan axis and ruler labels use its hours.
  - **How it looks:** a 1.5 px ring on its card. There is no mode to learn.
  - **Default:** the viewer's office if their IANA zone exactly matches one, otherwise São Paulo.
- **You.** A card is tagged *You* when its IANA zone equals `Intl.DateTimeFormat().resolvedOptions().timeZone`.
  - If no active card matches, the header shows a compact "You · \<local time\>" chip.
  - There is no offset-based guessing.
- **Active cities.** Your saved, ordered list.
  - The default is the current four (`austin`, `saopaulo`, `bristol`, `bangalore`), plus the viewer's own office if it isn't already in the list.
  - Commands and shared links may add *temporary* cards, tagged "Not saved", with an **Add** action. They never mutate the saved list.

### 3.2 Card anatomy (phone 124 px, desktop 152 px tall)

- **Background.** The sky gradient for the city's current solar elevation (§5.6). Stars fade in below −3° elevation.
- **Sun path.** The sun's elevation over the city's local day is drawn across the full card width.
  - The above-horizon segment is solid at 45%; below-horizon is dotted at 16%.
  - The horizon line sits at 62% of the card height.
  - The 09:00–18:00 work window is a brighter 2 px segment on the horizon.
  - The sun disc sits at the current position. It renders as a hollow ring below the horizon.
- **Top left.** City name, plus tags (HQ, You, Not saved).
- **Top right.** A state chip with dot and reason:
  - Working
  - Starts 09:00
  - After hours
  - Off hours
  - Weekend
  - Holiday · *name*
- **Bottom left.** The time, light weight with tabular numerals.
  - AM/PM appears in 12h mode.
  - When Live, a `:ss` suffix at 45% opacity sits on its own text node (§6.2).
  - On desktop the time is a button that opens inline edit (§3.4).
- **Bottom right.** The relative date (Today / Tomorrow / Yesterday, otherwise "Thu 8 Oct"), then the UTC offset in mono.
- **Overlays.**
  - A top-to-bottom scrim guarantees text contrast (§7.4).
  - Within 7 days of a DST transition, the offset line reads "UTC+1 → UTC+0 Sun 25 Oct".
- **Accessible name.** `"{city}, {time}, {relative date}, {state}, {offset}"`. No action-only label replaces the content.
- **Order.** Card order is stable (your order). Cards never regroup by work state.

### 3.3 Layouts

| Width | Layout |
|---|---|
| < 768 px (phone) | **Header:** Settings · Zones \| Plan toggle · Cities.<br>**Body:** scrollable card list.<br>**Bottom dock:** preview sentence (when typing), Share · Moment pill · ↺, the ruler, then the command field (16 px, always visible, thumb zone).<br>**Plan:** a tab. |
| 768–1023 px | Top bar (brand · command · moment · actions). Cards in 2 columns, Plan panel below. |
| ≥ 1024 px | Top bar. Cards in a wrapping row (`flex: 1 1 360px`), with the Plan panel always visible beneath and linked to the cards. |

### 3.4 Interactions

**Command bar** (§5.7 for the grammar):
- **While typing:**
  - The parse result previews live on the cards and on the ruler or plan.
  - A sentence appears, e.g. "Tomorrow, Thu 8 Oct · 15:00 Bristol → 09:00 Austin · 11:00 São Paulo".
  - Token highlighting comes from the parser's own spans.
  - Tab accepts a completion for a city or abbreviation.
- **Enter** commits. This sets Pinned (or Live for "now" queries) and the reference city, and clears the field.
- **Esc** clears the field. A second Esc returns to Live.
- **↑ / ↓** in an empty field recall the last 20 queries. These are stored locally only.
- **Errors and ambiguity** are inline, each with tappable suggestions, for example:
  - "Didn't recognise 'brstol' → Bristol"
  - "CST — US Central or China?"
  - "BST isn't in effect on 15 Jan — Bristol is on GMT"
- **Bare hours** (no am/pm, no minutes): use a business-hours bias (7–11 → AM, 12 → noon, 1–6 → PM). A flip chip ("15:00 ⇄ 03:00") always appears in the preview, so the interpretation is visible and reversible with one tap.

**Inline card edit:**
- **Opening:** click or tap the time, or press Enter on a focused card.
- **Accepted input:** `1530`, `930`, `3:30p`, `15`, `noon`, `midnight`.
- **Keys:**
  - ↑ / ↓ move ±15 min; Shift moves ±1 h.
  - PgUp / PgDn move ±1 day.
  - Enter commits; Esc cancels.
- **Phone:** the same input with `inputmode="numeric"`, plus a chip row (−1h, −15m, +15m, +1h, Tomorrow).
- **Effect:** committing makes that city the reference.

**Ruler (phone dock):**
- Dragging scrubs time: drag left for the future, 1 px = 75 s, snapping to 5 min while dragging and to 15 min on release.
- ‹ › step ±1 h.
- Keyboard: ←/→ ±15 min, Shift ±1 h, Home/Esc returns to Live.
- Major ticks carry the reference city's hour labels.
- Ticks where the most offices are working are highlighted in green.
- It has `role="slider"` and `aria-valuetext` set to the full moment.

**Plan:**
- A row per active city with 30-minute cells on the reference city's calendar day. Days with 23 or 25 hours are handled (§5.8).
- Cells: working, early/late, off, weekend (hatched), holiday (amber hatched).
- The best-overlap band is outlined. "Best overlap 13:30–14:30 · 3 of 5 working · Singapore outside" jumps there.
- Dragging or clicking the grid pins the moment, so the cards update live.
- Day navigation ‹ › moves ±1 day.
- An `sr-only` table mirrors the grid for screen readers.

**Holidays sheet:**
- Holidays drive the card chips and the plan cells.
- The sheet is opened from the header or by tapping a holiday chip, which pre-filters it to that office and date.
- It shows one merged upcoming list for the active offices, grouped by month, with the office code.

**Cities sheet:**
- A dot-matrix world map with the live day/night terminator and pins for active cities.
- A searchable list (name, country, codes, abbreviations) with check toggles, live local time and offset.
- Drag to reorder (keyboard: Alt+↑/↓).

**Settings sheet:**
- Live preview card.
- Time format: Auto (from locale) / 12h / 24h.
- Theme: System / Dark / Light.
- Language: Auto / English / Português.
- Links to Cities and Holidays.
- A privacy note that describes exactly what is collected.

**Share:**
- **Encoding:** one action encodes the current moment (rounded to the minute), the reference city and the active cities.
- **Delivery:** it uses `navigator.share` on touch devices and the clipboard elsewhere, confirming with a toast ("Link copied · Thu 15:00 Bristol").
- **Recipient view:** recipients see a **shared overlay** with the shared instant and cities, and a banner reading "Shared time · Thu 8 Oct 15:00 Bristol — Back to my view".
- **Safety:** nothing is persisted.
- **Invalid links:** these open the normal view with a toast "This link is invalid or expired".

**Keyboard map (desktop):**
- `/` or `⌘K`: focus the command bar
- `N`: back to Live
- `←` / `→`: ±15 min (Shift ±1 h) when not in a field
- `[` / `]`: ±1 day
- `?`: shortcuts sheet

### 3.5 Copy rules

- Plain words, not jargon: no "source" and no "anchor".
- State chips always give a reason.
- Off-hours colour is a neutral grey; nothing is red.
- PT-BR copy carries full diacritics and is reviewed by a native speaker before release.

## 4. Architecture

### 4.1 Layers and dependency rule

```
src/core   pure TypeScript; no DOM, no framework, no I/O. Deterministic given (instant, inputs).
src/state  Preact signals; persistence, URL/share overlay, analytics client. Imports core.
src/ui     Preact components + CSS modules. Imports state and core (types/formatters only).
worker/    Cloudflare Worker. Imports core (codec, registry, formatting) — never ui/state.
```

- **Allowed imports:** `ui → state → core` and `worker → core`.
- **Enforcement:** Biome `noRestrictedImports` per directory, plus path aliases `@core/*`, `@state/*`, `@ui/*`.
- **Why it matters:** the core runs unchanged in the browser, the Worker (OG text) and Node (tests).

### 4.2 Repository layout

```
src/
  core/
    time/        zoned.ts (civil⇄instant, disambiguation) · format.ts · relative.ts · transitions.ts
    cities/      registry.ts (offices, IANA zone, lat/lon, country, aliases, work hours) · shareIndex.ts (frozen v1 order)
    work/        policy.ts (work state + reason) · holidays/{index.ts, data/<office>.ts}
    sky/         sun.ts (solar position) · sky.ts (elevation→gradient keyframes) · contrast.ts
    parse/       lexicon.ts · lexer.ts · grammar.ts · resolve.ts · suggest.ts · types.ts
    plan/        overlap.ts (slots, scoring, best window)
    share/       codec.ts (v1 decode, v2 encode/decode)
  state/         clock.ts · moment.ts · cities.ts · prefs.ts · storage.ts · shareOverlay.ts · history.ts · analytics.ts
  ui/
    app/         App.tsx · layout.css · shortcuts.ts
    components/  ZoneCard/ · CardList/ · MomentPill/ · Ruler/ · CommandBar/ · Plan/ · CitiesSheet/ · WorldMap/
                 SettingsSheet/ · HolidaysSheet/ · SharedBanner/ · Toast/ · Sheet/ · Icon/
    i18n/        en.ts · pt-BR.ts · index.ts (typed keys; missing key = type error)
    styles/      tokens.css · base.css
  main.tsx
worker/
  index.ts · share.ts (HTMLRewriter OG) · events.ts (Analytics Engine ingest) · schema.ts
public/          fonts/ (Geist + Geist Mono variable woff2, OFL) · icons · manifest.webmanifest · _headers · og-image.png
tests/e2e/       Playwright specs
docs/            design/ · superpowers/specs/ · analytics.md
wrangler.jsonc · vite.config.ts · tsconfig.json · biome.json · .nvmrc
```

### 4.3 Removed

The following are removed:
- `vercel.json`, `api/`, `@vercel/analytics`
- `framer-motion`, `luxon`
- `src/lib/gpu-time/` and `naturalTimeParser*.js`
- the dead components and hooks (`MeetPanel`, `useTilt`, `MeshBackground`, the duplicate `MobileTopBar`/`MobileBottomBar` trees)
- the HTML-pages-as-fonts files in `public/fonts`
- the 762 KB screenshot in `public/`

Before deletion, the current working tree, including the uncommitted `gpu-time` work, is preserved on `archive/gpu-time-wip`.

## 5. Core engine

### 5.1 Time model invariants

1. **One instant.** The only time state is a UTC instant in epoch milliseconds. Wall-clock values exist only at boundaries: parsing, editing and display.
2. **Display is pure.** Every displayed field is `f(instant, ianaZone, prefs)`.
3. **Explicit disambiguation.** Wall-clock to instant always goes through `toInstant(civil, zone, {disambiguation})`. Its result is `{instant, kind: 'exact'|'gap'|'overlap', alternatives}`. The default disambiguation is `compatible`: gaps shift forward, overlaps take the earlier instant. A `gap` or `overlap` result always produces a user-visible notice with a one-tap alternative, for example "02:30 doesn't exist in Austin on 8 Mar — clocks jump to 03:00. Showing 03:30."
4. **No field-by-field mutation.** Edits construct a full civil value and convert it once. This removes the edit-history dependence.
5. **Calendar arithmetic** ("tomorrow", "+1 day") operates on civil dates in the relevant zone, then converts. It never adds 86 400 000 ms across a transition.

### 5.2 `zoned.ts`

- **Basis:** `Intl.DateTimeFormat#formatToParts` with cached formatters.
- **Seed:** the deterministic `civil`/`instant` helpers in `gpu-time/zoned.ts` are ported. That design already classifies `exact`/`gap`/`overlap`.
- **API:**
  - `civil(instant, zone)`
  - `toInstant(civil, zone, opts)`
  - `offsetMinutes(instant, zone)`
  - `startOfDay(date, zone)`, which returns `{start, end, lengthMs}` so days of 23 or 25 hours are exact
  - `nextTransition(instant, zone, horizonDays)`, which finds offset changes by binary search
- **Fixed-offset pseudo-zones** (`UTC`, `UTC±hh:mm`) are first-class, which fixes C4.

### 5.3 City registry (`cities/registry.ts`)

- **Contents:** the 12 existing offices with **unchanged ids**. Each carries:
  - name, country code, IANA zone, latitude/longitude
  - aliases (names, IATA codes, unambiguous abbreviations)
  - `workHours` (default 09:00–18:00)
  - `holidayCalendar` id
- **Data source:** latitude/longitude are new data from public city coordinates.
- **Share order:** `shareIndex.ts` freezes the v1 order (`saopaulo`, `austin`, `bristol`, `bangalore`, `singapore`, `warsaw`, `mexicocity`, `buenosaires`, `bogota`, `sydney`, `hochiminh`, `jakarta`). A snapshot test enforces append-only.

### 5.4 Work policy (`work/policy.ts`)

`workState(instant, office) → {kind, holiday?, halfDay?}` where `kind ∈ {working, early, late, off, weekend, holiday}`.

| Kind | When (local, Mon–Fri) |
|---|---|
| holiday | the date is in the office calendar (this takes precedence) |
| weekend | Saturday or Sunday |
| early | 07:00–09:00 |
| working | 09:00–18:00 |
| late | 18:00–20:00 |
| off | otherwise |

There is a single implementation. The card chip, plan cells, ruler highlights and the analytics "who's working" count all call it, which fixes the three-way divergence found in the audit.

### 5.5 Holidays (`work/holidays`)

- **Granularity:** one calendar per office, not per country. Bangalore follows Karnataka, not Maharashtra.
- **Calendars:** the six existing countries get calendars: São Paulo, Austin, Bristol, Bangalore, Warsaw and Singapore (Singapore was empty before).
- **Rule-based calendars never expire:** BR, US, GB and PL use fixed dates, nth-weekday dates, Easter offsets and weekend-substitution rules.
- **List-based calendars:** IN (Karnataka) and SG cover 2026 and 2027, entered from official notifications, with each source URL in the file.
- **Entries:** `{date, name: {en, pt}, kind: 'full'|'half'}`.
- **Calendar status:** `'public'` means public holidays from official sources; `'office'` means confirmed by Pismo HR.
- **Offices without a calendar** (Mexico City, Buenos Aires, Bogotá, Sydney, Ho Chi Minh, Jakarta) show "No holiday calendar" in Plan and the Holidays sheet, instead of implying "no holidays".
- **Half days:** `half` (e.g. Ash Wednesday) renders as "early close". It does not count as a holiday.
- **Coverage test:** fails CI when any list-based calendar has less than 180 days of future data.
- **Verification:** the data is entered by hand from official sources. Pismo HR calendars must confirm office-specific days. This is an owner task (§11).

### 5.6 Sun and sky (`sky/`)

- **Solar elevation:** NOAA low-precision algorithm (±0.5°), `sunElevation(instant, lat, lon)`.
- **Sun path:** 97 samples (15 min) per card, memoised per `(office, local date)`.
- **Sky:** elevation keyframes from −90° to 90° (night → blue hour → civil twilight with a warm horizon → golden hour → day haze), with three vertical stops each, interpolated in sRGB. The values are in the canvas (`Main.dc.html#sky`).
- **Contrast enforcement** ("Enforce accessibility with math"): a unit test composites every keyframe at 1° steps with the card scrim. It asserts:
  - white small text in the top 34% and bottom 30% regions ≥ 4.5:1
  - the large time ≥ 3:1
- **Light theme:** cards keep their skies (sky is data). Only the ground and surfaces change.

### 5.7 Parser (`parse/`)

- **Structure:** a deterministic pipeline of lexer → grammar → resolver. There is no ML, it uses about 10–15 KB gzipped, and it is total: every token is either consumed or reported.

**Output:**

```ts
type ParseResult =
  | { status: 'ok'; intent: Intent; spans: Span[]; notices: Notice[] }   // the bare-hour flip is a notice with an alternative
  | { status: 'ambiguous'; spans: Span[]; question: Diagnostic; options: Suggestion[] }
  | { status: 'error'; spans: Span[]; diagnostic: Diagnostic; suggestions: Suggestion[] };
type Intent = { instant: number; isNow: boolean; source: ZoneRef; destinations: ZoneRef[]; implicitSource: boolean };
```

**Grammar:**
- **Times:**
  - `3pm`, `3 pm`, `3p`, `3:15pm`, `3.15pm`, `15:00`, `15h`, `1530`, `noon`, `midnight`, `half past 3`
  - `now`, and implicit now (`sp to ist`)
  - `in 2 hours`, `in 90 min`
- **Dates:**
  - `today`, `tonight`, `tomorrow`, `yesterday`
  - weekdays (`fri` = today if Friday, else the coming Friday; `next fri` = the coming Friday, excluding today)
  - `12 oct`, `oct 12`, `12/10`
  - ISO `2026-10-12`
- **Numeric dates** follow the viewer locale's order (DMY for pt/en-GB/en-IN, MDY for en-US). The resolved date is always printed in the preview sentence.
- **Places:**
  - city names and aliases
  - IANA zones
  - `UTC`, `Z`, `UTC±h[:mm]`
  - fixed-offset abbreviations (BRT, IST = India, SGT, ART, COT, WIB, ICT)
  - seasonal abbreviations (GMT/BST, CST/CDT, EST/EDT, PST/PDT, CET/CEST, AEST/AEDT), handled as shown below
- **Seasonal abbreviations** resolve to `(zone, expected offset)`:
  - If the zone's offset at that instant differs, the result is a diagnostic with a suggestion.
  - Abbreviations that are ambiguous across regions (CST = US Central or China) produce `ambiguous` with options. IST always means India, by Pismo convention; that is stated in the preview, not asked.
- **Connectors:** `to`, `in`, `into`, `→`, `->`, `vs`, `,`, `and`, `&`.
- **Fillers** (`what`, `time`, `is`, `at`, `on`, …) are consumed.
- **Explicit rejections** with a reason:
  - ranges (`9-5`, `3 to 5pm`)
  - recurrences
  - more than 6 destinations
  - leftover tokens
- **Unknown tokens** get Damerau–Levenshtein suggestions (distance ≤ 2) over aliases.
- **Implicit source** is the reference city, and the preview names it explicitly ("15:00 Bangalore (you)"). It is never a silent substitution: an *unrecognised* source is an error, which fixes C2.
- **Latency:** under 1 ms per keystroke. Parsing is synchronous, with no async engines and no race, which fixes C5 and C6.

### 5.8 Planner (`plan/overlap.ts`)

- **Slots:** 30-minute slots spanning `startOfDay(refDate, refZone)` to `end`, giving 46, 48 or 50 slots. Each office's state comes from `workState`.
- **Score:** each slot gets `working count`, plus 0.25 for each early or late office.
- **Best window:** the contiguous run with the maximum working count. Ties go to the higher summed score, then to the earliest.
- **Output:**
  - the slots
  - the best window
  - who is outside and why (weekend, holiday, night)
  - `allWorking: boolean`
- **When nobody works:** if no slot has anyone working, the result says so ("No overlap on Sat 10 Oct — try Mon").
- **Purity:** the planner is pure and memoised per `(refDate, refZone, activeIds, holidayVersion)`.

### 5.9 Share codec (`share/codec.ts`)

- **v1 (decode only, forever):** `/s/<7–16 [0-9a-z]>`.
  - Layout: `source idx(1) · minutes(3) · days since 2025-01-01(3) · city bitfield`.
  - Days are read as a **civil date in UTC getters**, which is how the v1 encoder effectively wrote them for senders in UTC−12…+12. Minutes are the source city's wall time.
  - The instant comes from `toInstant(civil, sourceZone)`.
  - This fixes C1. Fixtures captured from the old encoder under several `TZ`s lock it.
- **v2 (encode and decode):** `/s/<m>.<r>.<c>`.
  - `m` is base-36 epoch minutes, the **instant** (zone-free, DST-proof).
  - `r` is the base-36 reference index.
  - `c` is a base-36 BigInt bitset of share indices, so there is no 31-city limit.
  - Validation: `/^[0-9a-z]{1,9}\.[0-9a-z]{1,2}\.[0-9a-z]{1,13}$/`, and indices must exist.
  - A property test checks that `decode(encode(x)) == x`.

## 6. State layer (`src/state`)

### 6.1 Signals

| Signal | Kind | Notes |
|---|---|---|
| `now` | source, 1 Hz aligned to the second boundary | Only the seconds text and Live pill subscribe. |
| `minuteNow` | computed | Changes once per minute and drives the cards. |
| `pinned` | `number \| null` | Committed instant. |
| `preview` | `ParseResult \| null` | From the command bar, not persisted. |
| `moment` | computed | `preview.ok ? preview.instant : pinned ?? minuteNow`. |
| `mode` | computed | `'live' \| 'pinned' \| 'preview'`. |
| `refId` | signal | Persisted. |
| `activeIds` | signal | Persisted and ordered. |
| `prefs` | signal | `{hourCycle: 'auto'\|'h12'\|'h23', theme, lang}`, persisted. |
| `overlay` | `SharedView \| null` | When set, it overrides the moment, cities and ref, and is never persisted. |
| `view` | `'zones' \| 'plan'` | Phone only. URL `?view=plan` from the PWA shortcut. |

### 6.2 Rendering discipline

- **Seconds** render as `<Sec value={secondsSignal} />`, which binds a signal to a text node. That keeps 1 Hz work to one text node per card.
- **Cards** are `memo`'d, keyed by city id, and depend on `moment` (minute granularity when live).
- **Scrubbing** writes `pinned` at most once per animation frame. Derived values (sky, sun path, state) are cached per (city, minute).

### 6.3 Persistence and migration (`storage.ts`)

- **Storage format:** one key, `pz:v1`, holding a JSON document `{schema: 1, activeIds, refId, prefs, history}`.
- **Safety:** every access is wrapped in try/catch. Corrupt data falls back to defaults and does not crash or reload.
- **Migration:** a one-time migration reads the legacy keys (`pismo-active-cities`, `pismo-theme`, `pismo-theme-explicit`), maps them and deletes them.

### 6.4 URL and share overlay

- **Boot:** the URL is parsed **once, before anything else**:
  - `/s/<payload>` decodes to `overlay`.
  - `?view=plan` sets the view.
  - `?panel=holidays` opens Holidays.
- **Cleanup:** after reading, `history.replaceState` normalises the URL to `/`. "Back to my view" clears `overlay`. This fixes the race in which the recipient's view was stripped.
- **No state in the URL:** state is never otherwise mirrored into the URL, which avoids sync loops. Share builds links on demand.

### 6.5 Analytics client (`analytics.ts`)

- **API:** `track(event, props)`, validated against the shared `worker/schema.ts` types.
- **Batching:** events are buffered in memory and flushed with `navigator.sendBeacon('/e', …)` on `pagehide` or when the tab becomes hidden, plus every 60 s when non-empty. That is typically one request per session.
- **Session id:** a random per-page-load id kept in memory only. No cookies and no storage.
- **Opt-out signals:** GPC and DNT are not consulted (owner decision D10). The events are anonymous, cookieless and carry no free text or IP, and the privacy note in Settings and the footer says exactly that.

## 7. UI system

### 7.1 Tokens (`styles/tokens.css`)

- **Ground:** dark `#000`, light `#f2f2f5`.
- **Surfaces:** dark `#141518` / `rgba(255,255,255,.07)`, light `#fff`.
- **Text:** a 100/85/65/45% opacity hierarchy, which continues the case study's "Opacity is hierarchy" principle.
- **Accent:** `#5b9bff` (plan/working cells, focus ring `rgba(122,167,255,.6)`).
- **Status colours:** working `#4ade80`, early/holiday `#fbbf24`, off `rgba(255,255,255,.45)`.
- **Type:** Geist (UI and numerals, weights 300–600) and Geist Mono (offsets, axes).
  - Scale: 11 · 12 · 13 · 14 · 15 · 17 · 20 · 34 · 46 · 58.
  - Nothing below 11 px.
- **Radii:** chip 999 · control 22 · card 26/28 · sheet 28.
- **Spacing:** 4 · 8 · 10 · 12 · 14 · 16 · 24 · 32.
- **Motion:**
  - `--ease-out: cubic-bezier(.2,.8,.2,1)` and `--ease-spring: cubic-bezier(.34,1.56,.64,1)`
  - durations 200 (press) · 280 (snap) · 480 (confirm) · 900 (sky)
  - from the case study's two-personality rule
- **z-index:** base 0 · dock 10 · header 20 · sheet 40 · toast 50.
- **Theme switching** works by swapping tokens only. Components never branch on theme.
- **Values:** every value used in component CSS is a token.

### 7.2 Styling

- **CSS Modules** are co-located per component. Unused component CSS is tree-shaken with the component, and class names are typed through a typed-CSS-modules plugin.
- **Global CSS** is limited to `tokens.css` and `base.css`.
- **Forbidden:** `!important`.
- **Media queries:**
  - breakpoints at 768 and 1024
  - `prefers-reduced-motion` disables pulses, sky and sun transitions, and the digit roll
  - `forced-colors` keeps the text, focus and borders, and hides decorative layers
- **Blur:** `backdrop-filter` is used only on floating controls over moving content (dock, sheets). Cards use no blur, because their background is opaque.

### 7.3 Motion

**What moves:**
- the sky and sun position ease on change (900 ms, or 500 ms for the sun)
- the minute digit rolls (CSS transform), suppressed while scrubbing
- sheets open with the View Transitions API, with a CSS fallback
- toasts use spring-in
- the Live dot pulses only while Live

**What doesn't:**
- no infinite animations other than the Live dot
- no mesh background
- no artificial add or remove delays

### 7.4 Accessibility (WCAG 2.2 AA)

- **Semantics:**
  - cards are `<article>` elements with full content names
  - the live region announces **committed** changes only, never every keystroke
  - the ruler is a slider
  - Plan has a table alternative
  - sheets are `<dialog>` with a focus trap and focus return
  - Escape works everywhere
- **Targets and type:** touch targets ≥ 44 px; inputs ≥ 16 px on phone.
- **Contrast:** enforced by the sky test (§5.6) and token checks.
- **Automated checks:** an axe check runs in component tests and in e2e.

### 7.5 i18n

- **Dictionaries:** `en` and `pt-BR`, keyed with typed keys, so a missing translation is a compile error.
- **Formatting:** dates and numbers use `Intl` in the active language.
- **Hour cycle:** comes from the locale unless overridden.
- **Parser:** accepts English and Portuguese keywords (`amanhã`, `hoje`, `meio-dia`, `às`, `para`), so the command bar works for HQ.

### 7.6 Fonts

- Geist and Geist Mono variable woff2 files (OFL) are self-hosted, latin plus latin-ext subset, about 60 KB total.
- One `<link rel="preload">` for Geist.
- There are no third-party font requests.

## 8. Platform (Cloudflare, free tier)

### 8.1 Worker and assets (`wrangler.jsonc`)

- **Static assets:** `assets.directory = dist`, `not_found_handling = "single-page-application"`.
- **Worker routing:** `assets.run_worker_first = ["/s/*", "/e"]`. Every other request is served as a static asset, which is free, unlimited and does not count toward 100k requests/day.
- **Bindings:** `ASSETS`, and `EVENTS` (Analytics Engine dataset `pismozones_events`).
- **Domains:** custom domain `pismozones.ashwingopalsamy.in` plus `workers_dev = true`.
- **Local development:** `@cloudflare/vite-plugin` runs the Worker inside `vite dev` (workerd). One command runs everything.

### 8.2 `/s/:payload`

- **Flow:** the Worker decodes the payload with the core codec, then fetches `index.html` from `ASSETS`. HTMLRewriter rewrites `<title>`, `og:*` and `twitter:*` and adds `<link rel="canonical">`. The response is `200`; there is no redirect.
- **Preview text** is computed with `Intl` at the shared instant, so it is DST-correct:
  - title: "15:00 in Bristol · Thu 8 Oct"
  - description: "09:00 Austin · 11:00 São Paulo · 19:30 Bangalore"
- **Image:** a static `og-image.png`, because generating images is outside the 10 ms CPU budget.
- **Invalid payloads** get the default meta plus a `data-share-error` flag that the SPA reads. The CPU target is under 2 ms.

### 8.3 `/e` (product events)

- **Request limits:**
  - POST only
  - `Origin` must be one of our hosts
  - body ≤ 16 KB
  - ≤ 50 events
  - every event is schema-validated against an allow-list
- **Writes:** `EVENTS.writeDataPoint` with:
  - `indexes: [event]`
  - `blobs`: fixed positional schema v1
  - `doubles`: event metrics
- **Country:** derived from `request.cf.country`, which is coarse. IP and user agent are never written.
- **Response:** `204`. Malformed requests get `400` and write nothing.

| Event | Fires when | Key properties (blobs) | Metrics (doubles) |
|---|---|---|---|
| `session_start` | first paint | app version, lang, hour cycle, theme, device class, display mode, entry (direct/share/shortcut), country | active city count |
| `commit` | the moment is pinned or committed | method (command, card_edit, ruler, plan_drag, day_nav, best_overlap, keyboard) | hours from now |
| `parse_outcome` | a command is committed or abandoned | status (ok/ambiguous/error), shape (e.g. `TIME SRC>DST+DATE`), error code, unsupported abbreviation (only tokens found in a static list of world time-zone abbreviations) | parse ms, token count |
| `back_to_live` | Live is restored | method (button/esc/key/plan) | pinned seconds |
| `view` | Zones/Plan toggled | view | — |
| `plan_best` | best overlap used | — | working count, active count |
| `cities_change` | add, remove or reorder | action, city id | active count |
| `share` | link created | channel (native/clipboard), version | — |
| `share_open` | link opened | valid, version, then `share_exit` when back to own view | seconds viewed |
| `holidays_open` | sheet opened | entry (header/chip) | — |
| `setting` | a pref changed | key, value | — |
| `pwa` | install prompt or installed | outcome | — |
| `error` | a JS error or error boundary | error code, component (no message text) | — |

`docs/analytics.md` documents the positional schema and ships saved SQL queries: daily users (sessions), input-method mix, parse error rates by code, top unsupported abbreviations, share funnel, Plan usage and offices per session. The queries run against the Analytics Engine SQL API.

**Web Analytics:**
- The Cloudflare beacon is injected by the SPA after boot, on both hostnames.
- It covers page views, referrers, countries and Core Web Vitals on both hostnames.

**Volume:**
- The Worker runs only for `/s/*` and `/e`, at about 1–2 requests per session.
- Even at 5k sessions/day that is under 10% of the free 100k.
- Analytics Engine stays under 100k data points/day at about 10 events × 5k sessions.

### 8.4 Security headers (`public/_headers`)

- `Content-Security-Policy`:
  - `default-src 'self'`
  - `script-src 'self' https://static.cloudflareinsights.com`
  - `connect-src 'self' https://cloudflareinsights.com`
  - `img-src 'self' data:`
  - `style-src 'self'`
  - `font-src 'self'`
  - `frame-ancestors 'none'`
  - `base-uri 'self'`
  - `form-action 'none'`
- HSTS, `nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geo off).
- `/assets/*` gets `immutable` caching.
- `style-src 'self'` works because Preact sets styles through the DOM style property and never through inline `<style>`.

### 8.5 PWA

- **Tooling:** `vite-plugin-pwa` (Workbox `generateSW`).
- **Caching:**
  - Hashed assets and fonts are precached, so the app works offline on the second load and on first install.
  - The navigation shell uses stale-while-revalidate, so launch never waits on the network.
  - `/s/*` is network-first with a 3 s timeout, falling back to the shell.
  - `/e` is network-only.
- **Updates:** `registerType: 'prompt'`. An "Update available" toast reloads after `controllerchange`, and the app checks for updates every 60 min while open.
- **Manifest:**
  - the shortcuts become `/?view=plan` and `/?panel=holidays`
  - the orientation lock is removed
  - `theme_color` follows the theme
- **Offline copy** is fixed: everything is computed locally, so nothing needs to "sync".

### 8.6 Deploy and migration

- **CI** (GitHub Actions):
  - `npm ci`, then `npm run check` (Biome, `tsc --noEmit`, Vitest), then `npm run build`, then the size budget, then Playwright
  - on a PR: `wrangler versions upload` posts a preview URL
  - on `main`: `wrangler deploy`
  - secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
- **DNS (owner task):** `ashwingopalsamy.in` moves to Cloudflare DNS on the free plan. Existing records must be copied before switching nameservers, and email/MX records checked. Then add the Workers custom domain.
- **Vercel retirement:**
  - The Vercel project is repointed to a `legacy-redirect` branch containing only a `vercel.json` that 301-redirects every path to `https://pismozones.ashwingopalsamy.in/$1`. This preserves old `/s/<v1>` links, which v1 decoding keeps working.
  - The project is deleted once traffic stops (Web Analytics referrers show it).

## 9. Developer experience and quality

### 9.1 Tooling

| Concern | Choice |
|---|---|
| Runtime | Node 24 LTS (`.nvmrc`), npm (existing lockfile) |
| Build | Vite plus `@preact/preset-vite` plus `@cloudflare/vite-plugin` plus `vite-plugin-pwa` |
| Types | TypeScript `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` |
| Lint and format | Biome (one tool), with import-boundary rules per layer |
| Unit and property tests | Vitest plus fast-check (core); `@testing-library/preact` plus axe (ui); `@cloudflare/vitest-pool-workers` (worker) |
| E2E | Playwright on Chromium desktop and the iPhone 15 profile; `Date` frozen through `page.clock` |
| Budgets | A build script gzips `dist` and fails if: JS entry > 45 KB, CSS > 12 KB, total > 160 KB including fonts |

Scripts:
- `dev`
- `build`
- `preview` (wrangler)
- `check`
- `test`
- `test:watch`
- `e2e`
- `deploy`

### 9.2 Test strategy (what proves the invariants)

- **zoned:**
  - **Round-trip property:** for every registry zone and random instants from 2020–2035, a value is `exact` when converted to civil and back, or correctly classified as a gap or overlap.
  - **Fixtures:** US 2026-03-08 and 11-01, UK 03-29 and 10-25, AU 04-05 and 10-04.
- **Parser:** a golden corpus file. Every failing input from the engine audit (C2–C8, U5) appears with its expected status, intent and diagnostic code, plus a PT-BR subset. There is also a fuzz property that the parser never throws and every token is accounted for.
- **Share:**
  - v1 fixtures generated by the old encoder under `TZ` values America/Sao_Paulo, America/Chicago, Asia/Kolkata, Pacific/Auckland and UTC
  - a v2 round-trip property
  - the share-index append-only snapshot
- **Planner:** days of 23 or 25 hours, weekend edges across offices (Friday evening in Austin is Saturday in Singapore), holidays.
- **Sky:** the contrast assertions.
- **Holidays:** the coverage horizon.
- **UI:**
  - command bar preview, commit and revert
  - inline edit keys
  - ruler keyboard
  - shared overlay never persists
  - axe passes
- **Worker:**
  - `/s` meta for v1, v2 and invalid payloads
  - `/e` validation and its rejection paths
- **E2E smoke:**
  - live → type → preview → Enter → pinned → ↺
  - edit a card's time
  - Plan best overlap
  - open a share link
  - reload offline

## 10. Delivery phases

Each phase ends in a working, deployable state on the `revamp` branch.

1. **Foundations.**
   - Archive the WIP branch.
   - New toolchain, layout, CI skeleton and Worker hello-world deployed to workers.dev.
   - Remove the Vercel, gpu-time and dead-code artifacts.
   - Fonts.
2. **Core engine.** zoned, registry, policy, holidays (2026–27 data), sky/sun, parser, planner and codec, with the full test suites.
3. **State.** Signals, storage and migration, URL and overlay, analytics client.
4. **UI.**
   - Tokens and base.
   - The components, matching the canvas, in this order: ZoneCard → CardList → MomentPill → Ruler → CommandBar → Plan → Sheets.
   - Desktop and phone layouts; i18n; accessibility.
5. **Platform.** `/s` OG, `/e` ingest, `_headers`, PWA, Web Analytics, custom domain, production deploy, Vercel redirect stub.
6. **Polish and acceptance.**
   - Budgets.
   - An a11y pass.
   - A visual QA pass against the canvas.
   - A PT-BR review.
   - The acceptance checklist (§12).

## 11. Risks and open items

Resolved with the owner on 2026-10-07:

- **Verification:** the implementer may run tests, type checks, builds and the dev server during implementation (an explicit exception to AGENTS.md's manual-verification default).
- **WIP:** the pre-revamp working tree is archived on `archive/gpu-time-wip`.
- **GPC/DNT:** not honoured (D10).
- **Bare hours:** business-hours bias plus a visible flip chip.

| Item | Default proposed | Needs |
|---|---|---|
| Holiday accuracy | Public holidays from official sources (status `public`); offices without a calendar say so. | HR confirmation per office to promote calendars to `office`. |
| DNS move | Owner moves `ashwingopalsamy.in` to Cloudflare DNS. | Owner action; check email records. |
| Browser support | Safari 16.4+, Chrome/Edge 111+, Firefox 115+. | — |
| Ad-blockers | They block the Web Analytics beacon; first-party `/e` is unaffected. | Accepted. |
| Case study drift | `design-case-study.html` becomes stale. | Follow-up after launch. |

## 12. Acceptance checklist

Each item maps to an audit finding. Every one must hold on production:

- [ ] A v1 share link created in São Paulo or Austin opens on the right date and instant for any viewer zone (C1). Recipients see the shared overlay, and their saved cities are untouched.
- [ ] `3pm SGT to BRT` → Singapore 15:00 → São Paulo 04:00. An unknown source is an error with a suggestion, never a fallback (C2).
- [ ] `3pm GMT` in October explains that Bristol is on BST; `2026-07-15 3pm CST` asks US Central or China (C3).
- [ ] `3pm UTC to sp` sets the correct instant on every card (C4).
- [ ] Clearing the command bar or pressing ↺ can never be undone by a late parse, because parsing is synchronous (C5, C6).
- [ ] `3.15pm`, `in 2 hours`, `oct 20 10am` and `yesterday 3pm` parse correctly (C7).
- [ ] DST gap and overlap inputs show a notice with an alternative. Identical input gives an identical instant regardless of history (C8).
- [ ] OG text is DST-correct for future dates (C9).
- [ ] Holiday data covers ≥ 180 days ahead for every verified office, including Singapore (C10).
- [ ] Pinned times show no seconds; live seconds come from the same instant as the minutes (C11).
- [ ] Typing never mutates saved cities (U1). Live, Pinned and Preview are visually distinct (U2).
- [ ] The meeting finder is reachable in one tap or click and is DST, weekend and holiday correct (U7).
- [ ] JS entry ≤ 45 KB gzipped. No component other than the seconds text re-renders at 1 Hz (profiler check).
- [ ] Works offline after the first visit; an update prompt appears after deploy.
- [ ] axe reports zero violations on the phone and desktop flows. All sky keyframes pass the contrast tests.
- [ ] No request to any third party other than `static.cloudflareinsights.com` / `cloudflareinsights.com`.
