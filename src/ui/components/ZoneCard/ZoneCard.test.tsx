import { getOffice, type Office } from '@core/cities/registry';
import { NOW } from '@state/testing';
import { expect, it } from 'vitest';
import { a11yViolations } from '../../test/axe';
import { renderWithApp } from '../../test/render';
import { cardModel, PHONE_BOX } from './model';
import { ZoneCard } from './ZoneCard';

const ctx = {
  now: NOW,
  viewerZone: 'Asia/Kolkata',
  hourCycle: 'h23' as const,
  lang: 'en' as const,
  refId: 'bangalore' as const,
  temp: false,
  box: PHONE_BOX,
  starCount: 26,
};

it('renders an accessible card, with seconds only when live', async () => {
  const model = cardModel(getOffice('saopaulo') as Office, NOW, ctx);
  const { container, getByRole, rerender } = renderWithApp(
    <ZoneCard model={model} live editable={false} box={PHONE_BOX} />,
  );
  expect(
    getByRole('article', { name: 'São Paulo, 11:22, Today · Wed 7 Oct, In hours, UTC−3' }),
  ).toBeTruthy();
  expect(container.textContent).toMatch(/11:22:\d{2}/);
  rerender(<ZoneCard model={model} live={false} editable={false} box={PHONE_BOX} />);
  expect(container.textContent).not.toMatch(/11:22:\d{2}/);
  expect(await a11yViolations(container)).toEqual([]);
});
