import { type Signal, signal } from '@preact/signals';

const MAX = 20;

export function createHistory(initial: string[]): {
  items: Signal<string[]>;
  remember(q: string): void;
} {
  const items = signal(initial.slice(0, MAX));
  return {
    items,
    remember(q) {
      const query = q.trim();
      if (!query) return;
      items.value = [query, ...items.value.filter((x) => x !== query)].slice(0, MAX);
    },
  };
}
