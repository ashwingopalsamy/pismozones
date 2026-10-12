# Pismo Zones

> What time is it for the team? Pismo Zones shows every Pismo office at a glance — local time, working state, daylight, holidays — and converts any moment you type, drag or share. Every calculation runs on your device, it works offline, and it is exact across daylight-saving changes.

Canonical: https://pismozones.ashwingopalsamy.in/

Pismo Zones is a web app for teams spread across Pismo's offices. It shows the local time, working state, daylight and holidays for each office, and converts any moment you type, drag or share into every office's time.

## Features

- **Zones.** A card per office with live local time, working / early / late / off hours, holidays and half days, a sky that follows the real sun, and upcoming clock changes.
- **Plan.** The reference city's day in 30-minute slots across every office, DST-exact, with the best window in which everyone is working.
- **Command bar.** Type `3pm bristol to austin`, `noon sg to sp` or `in 2 hours`. Portuguese works too: `amanhã 9h sp para ist`. The parser previews as you type and flags times that do not exist or happen twice.
- **Sharing.** Share links pin an exact instant. See Share links below.
- **Holidays.** Company holiday calendars for India, Brazil, the UK, the US and Poland, with observed days and half days. Only 2026 is published.
- **Offline.** Installable, and it works offline after the first visit.

## How to use

1. Open https://pismozones.ashwingopalsamy.in/.
2. Tap a time to set it, drag the ruler to scrub, or use the left and right arrow keys to move 15 minutes at a time.
3. Type a conversion into the command bar, or open the Plan view at `/?view=plan`.

## Share links

A link such as `/s/<token>` pins an exact instant, not a wall time, so it means the same moment in every office. Link previews are rendered by the Worker in each office's own time. Links from the first version keep working.

## Privacy

- Every calculation the app shows runs on your device. The one server-side step is link previews: when a crawler or chat app fetches a `/s/` link, the Worker decodes the token to write the preview.
- No cookies, no accounts, and nothing that identifies you. Saved cities and preferences stay in your browser.
- Anonymous product events (which features are used, never what you type) go to the app's own Worker. Cloudflare Web Analytics counts page views.
- What is collected, and what never is: https://github.com/ashwingopalsamy/pismozones/blob/main/docs/analytics.md

## Offices

São Paulo (headquarters), Austin, Bristol, Bengaluru, Singapore, Warsaw, Mexico City, Buenos Aires, Bogotá, Sydney, Ho Chi Minh, Jakarta.

## Source and licence

- Source: https://github.com/ashwingopalsamy/pismozones
- Text and code: CC0 1.0 Universal. Fonts: SIL Open Font License 1.1.
- Rules for automated readers: https://pismozones.ashwingopalsamy.in/ai.txt

## Author

Ashwin Gopalsamy, https://ashwingopalsamy.in
