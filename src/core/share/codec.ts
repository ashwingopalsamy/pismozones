import { getOffice, type OfficeId } from '../cities/registry';
import { SHARE_INDEX } from '../cities/shareIndex';
import { isSupportedInstant } from '../time/range';
import type { Instant } from '../time/types';
import { toInstant } from '../time/zoned';

export interface SharePayload {
  instant: Instant;
  refId: OfficeId;
  officeIds: OfficeId[];
}

export interface DecodedShare extends SharePayload {
  version: 1 | 2;
  resolution: 'exact' | 'gap' | 'overlap';
}

const V1 = /^[0-9a-z]{7,16}$/;
const V2 = /^[0-9a-z]{1,9}\.[0-9a-z]{1,2}\.[0-9a-z]{1,13}$/;
const V1_EPOCH = Date.UTC(2025, 0, 1);

function bigFromBase36(s: string): bigint {
  let n = 0n;
  for (const ch of s) n = n * 36n + BigInt(Number.parseInt(ch, 36));
  return n;
}

/** Office ids for a bitset, in share-index order; null if any bit has no office. */
function idsFromBits(bits: bigint): OfficeId[] | null {
  const ids: OfficeId[] = [];
  for (let i = 0; bits > 0n; i++, bits >>= 1n) {
    if (!(bits & 1n)) continue;
    const id = SHARE_INDEX[i];
    if (!id) return null;
    ids.push(id);
  }
  return ids;
}

/** v2 token: `<epoch minutes>.<reference index>.<office bitset>`, all base 36. Zone-free and DST-proof. */
export function encodeShare(p: SharePayload): string {
  let bits = 0n;
  for (const id of p.officeIds) bits |= 1n << BigInt(SHARE_INDEX.indexOf(id));
  return `${Math.floor(p.instant / 60_000).toString(36)}.${SHARE_INDEX.indexOf(p.refId).toString(36)}.${bits.toString(36)}`;
}

export function decodeShare(token: string): DecodedShare | null {
  if (V2.test(token)) {
    const [m, r, c] = token.split('.') as [string, string, string];
    const refId = SHARE_INDEX[Number.parseInt(r, 36)];
    const officeIds = idsFromBits(bigFromBase36(c));
    const instant = Number.parseInt(m, 36) * 60_000;
    if (!refId || !officeIds || !isSupportedInstant(instant)) return null;
    return {
      version: 2,
      resolution: 'exact',
      instant,
      refId,
      officeIds,
    };
  }
  if (!V1.test(token) || token.startsWith('v')) return null;
  // v1: source(1) · minutes(3) · days since 2025-01-01(3) · bitset. The date is the source office's
  // civil date (the old encoder counted from the sender's local midnight, which rounds to it).
  const refId = SHARE_INDEX[Number.parseInt(token.slice(0, 1), 36)];
  const minutes = Number.parseInt(token.slice(1, 4), 36);
  const days = Number.parseInt(token.slice(4, 7), 36);
  const officeIds = idsFromBits(bigFromBase36(token.slice(7)));
  const office = refId ? getOffice(refId) : undefined;
  if (!refId || !office || minutes > 1439 || !officeIds) return null;
  const d = new Date(V1_EPOCH + days * 86_400_000);
  const r = toInstant(
    {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: Math.floor(minutes / 60),
      minute: minutes % 60,
      second: 0,
    },
    office.zone,
  );
  return { version: 1, resolution: r.kind, instant: r.instant, refId, officeIds };
}
