# Analytics

Pismo Zones measures how it is used so the defaults, parser and planner can get better. It does this without cookies, without identifiers that outlive a page load, and without ever recording what anyone types.

## Privacy

**Collected**

- First-party product events (below), batched in memory and sent to `/e` on this origin at most every 60 s, every 50 events, or when the page is hidden.
- Each batch carries a random session id that lives only in memory for one page load, the app version, and the schema version.
- The Worker adds the visitor's country, as reported by Cloudflare (`request.cf.country`), and the site's own host name (which deployment sent the event).
- Events from the Vercel mirror go to the same Worker endpoint, so both hosts share one dataset.
- On the Vercel mirror, Vercel Web Analytics counts page views in place of Cloudflare Web Analytics.
- Cloudflare Web Analytics (cookieless page views and Core Web Vitals), when a beacon token is configured.

**Never collected**

- IP addresses, user agents, cookies, or any persistent or cross-site identifier.
- Free text: command-bar input is reduced to a token *shape* ("3pm bristol to austin" becomes `TP>P`) and to error codes. A time-zone abbreviation is recorded only when it is on the fixed list the app already knows.
- Anything from local storage (saved cities, preferences, history).

The client builds events from the schema in `src/core/analytics/schema.ts`, and the Worker validates every batch against it. A batch with an unknown event, a wrong field count, a non-finite number or an unexpected character is dropped whole. GPC/DNT are not consulted (spec D10): nothing collected identifies or tracks a person.

## Schema

Dataset: `pismozones_events` (Workers Analytics Engine). One data point per event; fields are positional.

| Column | Meaning |
| --- | --- |
| `index1` | event name |
| `blob1` | event name |
| `blob2` | schema version (`1`) |
| `blob3` | app version |
| `blob4` | country (ISO 3166-1 alpha-2, `XX` if unknown) |
| `blob5` | session id (random, per page load) |
| `blob6`–`blob11` | the event's blobs, in order (padded with `''` to six) |
| `blob12` | the sending host (`pismozones.ashwingopalsamy.in`, `pismozones.vercel.app`, …); `''` on rows written before hosts were recorded |
| `double1` | ms since the session started |
| `double2`… | the event's doubles, in order |

Counts must be weighted by `_sample_interval` (Analytics Engine samples at high volume).

| Event | `blob6` | `blob7` | `blob8` | `blob9` | `blob10` | `blob11` | `double2` | `double3` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `session_start` | lang | hourCycle | theme | device | display | entry | activeCount | |
| `commit` | method | | | | | | hoursFromNow | |
| `parse_outcome` | status | shape | code | abbr | | | parseMs | tokens |
| `back_to_live` | method | | | | | | pinnedSeconds | |
| `view` | view | | | | | | | |
| `plan_best` | | | | | | | working | total |
| `cities_change` | action | officeId | | | | | activeCount | |
| `share` | channel | version | | | | | | |
| `share_open` | valid | version | | | | | | |
| `share_exit` | | | | | | | secondsViewed | |
| `holidays_open` | entry | | | | | | | |
| `setting` | key | value | | | | | | |
| `pwa` | outcome | | | | | | | |
| `error` | code | component | | | | | | |

Changing an event's fields means bumping `SCHEMA_VERSION` and updating this table; old rows keep their old positions (filter on `blob2`).

## Saved queries

All cover the last 30 days.

1. Sessions per day

   ```sql
   SELECT toStartOfDay(timestamp) AS day, SUM(_sample_interval) AS sessions
   FROM pismozones_events
   WHERE index1 = 'session_start' AND timestamp > now() - INTERVAL '30' DAY
   GROUP BY day ORDER BY day
   ```

2. Commits by input method

   ```sql
   SELECT blob6 AS method, SUM(_sample_interval) AS commits
   FROM pismozones_events
   WHERE index1 = 'commit' AND timestamp > now() - INTERVAL '30' DAY
   GROUP BY method ORDER BY commits DESC
   ```

3. Parse outcomes by status and code

   ```sql
   SELECT blob6 AS status, blob8 AS code, SUM(_sample_interval) AS parses
   FROM pismozones_events
   WHERE index1 = 'parse_outcome' AND timestamp > now() - INTERVAL '30' DAY
   GROUP BY status, code ORDER BY parses DESC
   ```

4. Top unsupported abbreviations

   ```sql
   SELECT blob9 AS abbr, SUM(_sample_interval) AS attempts
   FROM pismozones_events
   WHERE index1 = 'parse_outcome' AND blob9 != '' AND timestamp > now() - INTERVAL '30' DAY
   GROUP BY abbr ORDER BY attempts DESC LIMIT 20
   ```

5. Share funnel (links made vs links opened, by channel or validity)

   ```sql
   SELECT index1 AS step, blob6 AS kind, SUM(_sample_interval) AS events
   FROM pismozones_events
   WHERE index1 IN ('share', 'share_open') AND timestamp > now() - INTERVAL '30' DAY
   GROUP BY step, kind ORDER BY step, events DESC
   ```

6. Plan usage (Plan views and best-overlap jumps)

   ```sql
   SELECT index1 AS event, SUM(_sample_interval) AS events
   FROM pismozones_events
   WHERE ((index1 = 'view' AND blob6 = 'plan') OR index1 = 'plan_best')
     AND timestamp > now() - INTERVAL '30' DAY
   GROUP BY event ORDER BY event
   ```

7. Mean active offices per session

   ```sql
   SELECT SUM(double2 * _sample_interval) / SUM(_sample_interval) AS mean_active_offices
   FROM pismozones_events
   WHERE index1 = 'session_start' AND timestamp > now() - INTERVAL '30' DAY
   ```

8. Sessions by country

   ```sql
   SELECT blob4 AS country, SUM(_sample_interval) AS sessions
   FROM pismozones_events
   WHERE index1 = 'session_start' AND timestamp > now() - INTERVAL '30' DAY
   GROUP BY country ORDER BY sessions DESC
   ```

9. Errors by code and component

   ```sql
   SELECT blob6 AS code, blob7 AS component, SUM(_sample_interval) AS errors
   FROM pismozones_events
   WHERE index1 = 'error' AND timestamp > now() - INTERVAL '30' DAY
   GROUP BY code, component ORDER BY errors DESC
   ```

10. Sessions by host

   ```sql
   SELECT blob12 AS host, SUM(_sample_interval) AS sessions
   FROM pismozones_events
   WHERE index1 = 'session_start' AND timestamp > now() - INTERVAL '30' DAY
   GROUP BY host ORDER BY sessions DESC
   ```

## Running a query

Create an API token with **Account Analytics Read**, then:

```bash
export CLOUDFLARE_ACCOUNT_ID=<account id>
export CLOUDFLARE_API_TOKEN=<token>
npm run analytics -- "SELECT blob6 AS method, SUM(_sample_interval) AS commits FROM pismozones_events WHERE index1 = 'commit' AND timestamp > now() - INTERVAL '30' DAY GROUP BY method ORDER BY commits DESC"
```

The response is JSON (`data` rows plus `meta`). Web Analytics (page views, Core Web Vitals) is in the Cloudflare dashboard under **Analytics & Logs → Web Analytics**.
