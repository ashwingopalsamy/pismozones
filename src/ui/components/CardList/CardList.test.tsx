import { NOW } from '@state/testing';
import { expect, it } from 'vitest';
import { renderWithApp } from '../../test/render';
import { CardList } from './CardList';

it('lists active offices in order and adds a temp office', async () => {
  const { app, user, getAllByRole, findByRole } = renderWithApp(
    <CardList layout="phone" editable={false} />,
  );
  expect(getAllByRole('article').map((a) => a.getAttribute('aria-label')?.split(',')[0])).toEqual([
    'São Paulo',
    'Austin',
    'Bengaluru',
    'Bristol',
  ]);
  app.pin(NOW, 'command', { extras: ['warsaw'] });
  await user.click(await findByRole('button', { name: 'Add' }));
  expect(app.cities.activeIds.value).toContain('warsaw');
});
