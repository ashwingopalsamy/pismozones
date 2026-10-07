import { useT } from './context';
import styles from './layout.module.css';

export function ErrorFallback() {
  const t = useT();
  return (
    <div class={styles.error} role="alert">
      <p>{t('error.title')}</p>
      <button type="button" onClick={() => location.reload()}>
        {t('error.reload')}
      </button>
    </div>
  );
}
