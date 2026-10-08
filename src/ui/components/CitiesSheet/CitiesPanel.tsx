import { useLayoutEffect, useRef } from 'preact/hooks';
import { useT } from '../../app/context';
import styles from './CitiesSheet.module.css';
import { CityList } from './CityList';

/**
 * Desktop: the cities dropdown, directly under the control lane and as wide as the content
 * column. Non-modal (opened with show()); Esc or a click outside closes it and returns focus.
 */
export function CitiesPanel({ open, onClose }: { open: boolean; onClose(): void }) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      d.show();
      d.querySelector<HTMLElement>('input')?.focus();
    } else if (!open && d.open) {
      d.close();
      opener.current?.focus();
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const outside = (e: PointerEvent) => {
      const d = dialog.current;
      const target = e.target as Node;
      if (d && !d.contains(target) && !opener.current?.contains(target)) onClose();
    };
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <dialog ref={dialog} class={styles.panel} aria-label={t('cities.title')}>
      {open && <CityList wide />}
    </dialog>
  );
}
