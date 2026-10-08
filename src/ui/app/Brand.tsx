import { Icon } from '../components/Icon';
import styles from './layout.module.css';

/** `wordmark` false: the mark alone (tight lanes); the name stays for screen readers. */
export function Brand({ wordmark = true }: { wordmark?: boolean }) {
  return (
    <div class={styles.brand}>
      <span class={styles.logo}>
        <Icon name="globe" size={17} />
      </span>
      {wordmark ? 'Pismo Zones' : <span class="sr-only">Pismo Zones</span>}
    </div>
  );
}
