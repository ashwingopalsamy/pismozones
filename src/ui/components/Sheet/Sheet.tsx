import type { ComponentChildren } from 'preact';
import { useId, useLayoutEffect, useRef } from 'preact/hooks';
import { useT } from '../../app/context';
import { Icon } from '../Icon';
import styles from './Sheet.module.css';

export interface SheetProps {
  open: boolean;
  onClose(): void;
  title: string;
  children: ComponentChildren;
}

type ViewTransitionDoc = Document & { startViewTransition?: (cb: () => void) => unknown };

/** Modal dialog: native <dialog> focus containment, Esc/backdrop close, focus returns to the opener. */
export function Sheet({ open, onClose, title, children }: SheetProps) {
  const t = useT();
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useLayoutEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (open && !d.open) {
      opener.current = document.activeElement as HTMLElement | null;
      const show = () => {
        d.showModal();
        d.querySelector<HTMLElement>(
          'button, [href], input, [tabindex]:not([tabindex="-1"])',
        )?.focus();
      };
      const doc = document as ViewTransitionDoc;
      if (doc.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches)
        doc.startViewTransition(show);
      else show();
    } else if (!open && d.open) {
      d.close();
      opener.current?.focus();
    }
  }, [open]);

  return (
    <dialog
      ref={dialog}
      class={styles.sheet}
      aria-labelledby={titleId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
      }}
      onClick={(e) => {
        if (e.target === dialog.current) onClose();
      }}
    >
      {open && (
        <div class={styles.inner}>
          <div class={styles.head}>
            <button
              type="button"
              class={styles.close}
              aria-label={t('a11y.close')}
              onClick={onClose}
            >
              <Icon name="close" size={18} />
            </button>
            <h2 id={titleId} class={styles.title}>
              {title}
            </h2>
            <span />
          </div>
          <div class={styles.body}>{children}</div>
        </div>
      )}
    </dialog>
  );
}
