# Pismo Zones

A timezone converter optimized for Pismo's distributed teams. Focuses on speed and privacy—everything runs client-side.

## Overview

Designed to answer "what time is it for the team?" instantly.
- **Reference**: São Paulo (HQ)
- **Locations**: Bristol, Bangalore, Austin, Singapore
- **Zero-Config**: Auto-detects local user timezone or defaults to HQ.

## Development

Currently using Vite + React.

```bash
npm install
npm run dev
```

## Tech Notes

- **Time Handling**: `luxon` is used for all timezone math to avoid native Date object quirks.
- **State**: `src/hooks/useTimeConversion.js` drives the central clock. It uses a single reference time (Source) and projects other zones from it.
- **Styling**: Pure CSS variables (`src/styles/tokens.css`). No utility frameworks used to keep the bundle minimal.

## License

Apache-2.0
