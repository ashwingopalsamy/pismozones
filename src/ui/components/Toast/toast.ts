import { signal } from '@preact/signals';

let timer: ReturnType<typeof setTimeout> | undefined;

/** One transient message at a time; a new one replaces the current. */
export const toast = {
  message: signal<string | null>(null),
  show(msg: string, ms = 1800) {
    clearTimeout(timer);
    toast.message.value = msg;
    timer = setTimeout(() => {
      toast.message.value = null;
    }, ms);
  },
};
