import { useComputed } from '@preact/signals';
import { useApp } from '../app/context';

/** The only 1 Hz subscriber: binds the seconds signal straight to a text node. */
export function LiveSeconds({ class: className }: { class?: string | undefined }) {
  const app = useApp();
  const text = useComputed(
    () => `:${String(Math.floor(app.clock.now.value / 1000) % 60).padStart(2, '0')}`,
  );
  return (
    <span class={className} aria-hidden="true">
      {text}
    </span>
  );
}
