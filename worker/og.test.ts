import { decodeShare, encodeShare } from '@core/share/codec';
import { expect, it } from 'vitest';
import { ogText } from './og';

const decoded = (token: string) => {
  const d = decodeShare(token);
  if (!d) throw new Error(`bad token ${token}`);
  return d;
};

it('describes a v1 link exactly as the app shows it', () => {
  expect(ogText(decoded('10p00hwf'), 'en')).toEqual({
    title: '15:00 in Austin · Wed 7 Oct',
    description: '17:00 São Paulo · 21:00 Bristol · 01:30 Bangalore (+1d)',
  });
  expect(ogText(decoded('10p00hwf'), 'pt-BR').title).toBe('15:00 em Austin · qua 7 out');
});

it('og text is DST-correct for a future date', () => {
  const t = encodeShare({
    instant: Date.UTC(2026, 10, 10, 13),
    refId: 'saopaulo',
    officeIds: ['saopaulo', 'bristol'],
  });
  // 10 Nov: Bristol is on GMT, not BST.
  expect(ogText(decoded(t), 'en').description).toBe('13:00 Bristol');
});

it('falls back to the product name when the reference is the only office', () => {
  const t = encodeShare({
    instant: Date.UTC(2026, 9, 7, 14),
    refId: 'bristol',
    officeIds: ['bristol'],
  });
  expect(ogText(decoded(t), 'en').description).toBe('Pismo Zones');
});
