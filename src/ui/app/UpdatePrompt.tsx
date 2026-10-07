import { useRegisterSW } from 'virtual:pwa-register/preact';
import { useEffect, useRef } from 'preact/hooks';
import styles from '../components/Toast/Toast.module.css';
import { useApp, useT } from './context';

const HOUR = 3_600_000;
// Lets e2e simulate a waiting worker; production keeps the hook only on localhost.
const TEST_HOOK = import.meta.env.MODE !== 'production' || location.hostname === 'localhost';

/** Persistent "Update available · Reload" once a new service worker is waiting; checks hourly. */
export function UpdatePrompt() {
  const app = useApp();
  const t = useT();
  const shown = useRef(false);
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, r) {
      registration.current = r;
      if (r) setInterval(() => r.update().catch(() => {}), HOUR);
    },
  });

  useEffect(() => {
    if (!TEST_HOOK) return;
    const on = () => setNeedRefresh(true);
    addEventListener('pz:test-need-refresh', on);
    return () => removeEventListener('pz:test-need-refresh', on);
  }, []);
  useEffect(() => {
    if (!needRefresh || shown.current) return;
    shown.current = true;
    app.track('pwa', { outcome: 'update_shown' });
  }, [needRefresh]);

  if (!needRefresh) return null;
  return (
    <div class={`${styles.toast} ${styles.prompt}`} role="status">
      <span>{t('update.available')}</span>
      <button
        type="button"
        class={styles.action}
        onClick={() => {
          app.track('pwa', { outcome: 'update_applied' });
          // An uncontrolled tab (first visit, hard reload) has no waiting worker to skip: the new one
          // is already active, so a plain reload picks it up.
          if (navigator.serviceWorker?.controller && registration.current?.waiting)
            void updateServiceWorker(true);
          else location.reload();
        }}
      >
        {t('update.reload')}
      </button>
    </div>
  );
}
