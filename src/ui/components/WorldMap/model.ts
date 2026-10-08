import type { Office, OfficeId } from '@core/cities/registry';
import { solarElevation, terminatorLatitude } from '@core/sky/sun';
import type { Instant } from '@core/time/types';
import { LAND } from './land';

export interface MapModel {
  day: string;
  dusk: string;
  night: string;
  terminator: string;
  pins: Array<{ id: OfficeId; name: string; xPct: number; yPct: number; labelLeft: boolean }>;
}

const R = 1.22;
const dot = (x: number, y: number) =>
  `M${(x - R).toFixed(2)} ${y.toFixed(2)}a${R} ${R} 0 1 0 ${2 * R} 0a${R} ${R} 0 1 0 ${-2 * R} 0`;

export function worldMapModel(
  instant: Instant,
  offices: readonly Office[],
  box = { w: 358, h: 134 },
): MapModel {
  const { cols, rows, lat0, lat1, hex } = LAND;
  const dx = box.w / cols;
  const dy = box.h / rows;
  const span = lat0 - lat1;
  const out = { day: '', dusk: '', night: '' };
  hex.forEach((line, row) => {
    const lat = lat0 - (row + 0.5) * (span / rows);
    for (let col = 0; col < cols; col++) {
      const nibble = Number.parseInt(line[col >> 2] as string, 16);
      if (!((nibble >> (3 - (col & 3))) & 1)) continue;
      const lon = -180 + (col + 0.5) * (360 / cols);
      const el = solarElevation(instant, lat, lon);
      out[el > 0 ? 'day' : el > -8 ? 'dusk' : 'night'] += dot((col + 0.5) * dx, (row + 0.5) * dy);
    }
  });
  let terminator = '';
  for (let i = 0; i <= 120; i++) {
    const lon = -180 + i * 3;
    const lat = terminatorLatitude(instant, lon);
    const y = Math.max(0, Math.min(box.h, ((lat0 - lat) / span) * box.h));
    terminator += `${i ? 'L' : 'M'}${(((lon + 180) / 360) * box.w).toFixed(1)} ${y.toFixed(1)}`;
  }
  return {
    ...out,
    terminator,
    pins: offices.map((o) => ({
      id: o.id,
      name: o.name,
      xPct: ((o.lon + 180) / 360) * 100,
      yPct: ((lat0 - o.lat) / span) * 100,
      labelLeft: o.lon > 60 || o.id === 'austin',
    })),
  };
}
