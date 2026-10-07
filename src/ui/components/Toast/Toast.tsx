import styles from './Toast.module.css';
import { toast } from './toast';

export function Toast() {
  const msg = toast.message.value;
  return (
    <div role="status" aria-live="polite">
      {msg && <div class={styles.toast}>{msg}</div>}
    </div>
  );
}
