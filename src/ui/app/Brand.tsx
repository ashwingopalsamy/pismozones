import { Icon } from '../components/Icon';
import styles from './layout.module.css';

export function Brand() {
  return (
    <div class={styles.brand}>
      <span class={styles.logo}>
        <Icon name="globe" size={22} />
      </span>
      Pismo Zones
    </div>
  );
}
