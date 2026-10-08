import type { Instant } from '../time/types';

const RAD = Math.PI / 180;

interface SunPosition {
  rightAscension: number;
  declination: number;
  /** Greenwich mean sidereal time, hours */
  gmst: number;
}

/** NOAA low-precision solar position (±0.5°). */
function position(instant: Instant): SunPosition {
  const d = instant / 86_400_000 - 10957.5; // days since J2000.0
  const g = (357.529 + 0.98560028 * d) * RAD;
  const q = 280.459 + 0.98564736 * d;
  const l = (q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * RAD;
  const e = (23.439 - 0.00000036 * d) * RAD;
  return {
    rightAscension: Math.atan2(Math.cos(e) * Math.sin(l), Math.cos(l)),
    declination: Math.asin(Math.sin(e) * Math.sin(l)),
    gmst: (((18.697374558 + 24.06570982441908 * d) % 24) + 24) % 24,
  };
}

const hourAngle = (p: SunPosition, lon: number) => (p.gmst * 15 + lon) * RAD - p.rightAscension;

/** Degrees above (+) or below (−) the horizon. */
export function solarElevation(instant: Instant, lat: number, lon: number): number {
  const p = position(instant);
  const phi = lat * RAD;
  return (
    Math.asin(
      Math.sin(phi) * Math.sin(p.declination) +
        Math.cos(phi) * Math.cos(p.declination) * Math.cos(hourAngle(p, lon)),
    ) / RAD
  );
}

/** Elevations sampled evenly from start to end inclusive. */
export function sunSamples(
  start: Instant,
  end: Instant,
  lat: number,
  lon: number,
  n = 97,
): number[] {
  const step = (end - start) / (n - 1);
  return Array.from({ length: n }, (_, i) => solarElevation(start + i * step, lat, lon));
}

/** Latitude of the day/night line at a longitude, for the world map. */
export function terminatorLatitude(instant: Instant, lon: number): number {
  const p = position(instant);
  return Math.atan(-Math.cos(hourAngle(p, lon)) / Math.tan(p.declination)) / RAD;
}
