import { Sheet, type SheetVariant } from '../components/Sheet/Sheet';
import { useT } from './context';
import styles from './layout.module.css';

export function ShortcutsSheet({
  open,
  onClose,
  variant = 'sheet',
}: {
  open: boolean;
  onClose(): void;
  variant?: SheetVariant;
}) {
  const t = useT();
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={t('shortcuts.title')}
      variant={variant}
      size="narrow"
    >
      <dl class={styles.shortcuts}>
        <dt>/ · ⌘K</dt>
        <dd>{t('shortcuts.focus')}</dd>
        <dt>N</dt>
        <dd>{t('shortcuts.now')}</dd>
        <dt>← →</dt>
        <dd>{t('shortcuts.nudge')}</dd>
        <dt>[ ]</dt>
        <dd>{t('shortcuts.day')}</dd>
        <dt>?</dt>
        <dd>{t('shortcuts.help')}</dd>
      </dl>
    </Sheet>
  );
}
