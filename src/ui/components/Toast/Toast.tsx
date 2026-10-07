import { toast } from './store';
import styles from './Toast.module.css';

export function Toast() {
  const msg = toast.message.value;
  return (
    <div role="status" aria-live="polite">
      {msg && <div class={styles.toast}>{msg}</div>}
    </div>
  );
}
