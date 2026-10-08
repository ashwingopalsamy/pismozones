import { render } from '@testing-library/preact';
import { expect, it, vi } from 'vitest';
import { lazyComponent } from './lazy';

it('renders nothing until the chunk arrives, then the component, loading it once', async () => {
  const load = vi.fn(async () => ({ label }: { label: string }) => <p>{label}</p>);
  const Lazy = lazyComponent(load);
  const { findByText, container } = render(
    <>
      <Lazy label="a" />
      <Lazy label="b" />
    </>,
  );
  expect(container.textContent).toBe('');
  expect(await findByText('a')).toBeTruthy();
  expect(await findByText('b')).toBeTruthy();
  expect(load).toHaveBeenCalledTimes(1);
});

it('retries on the next mount after a failed load', async () => {
  const load = vi
    .fn<() => Promise<() => preact.JSX.Element>>()
    .mockRejectedValueOnce(new Error('offline'))
    .mockResolvedValue(() => <p>ok</p>);
  const Lazy = lazyComponent(load);
  const first = render(<Lazy />);
  await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(1));
  await new Promise((r) => setTimeout(r)); // let the failure settle
  first.unmount();
  expect(await render(<Lazy />).findByText('ok')).toBeTruthy();
});
