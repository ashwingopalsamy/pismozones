import { useT } from './context';
import styles from './layout.module.css';

export function Footer({ class: className }: { class?: string | undefined }) {
  const t = useT();
  return (
    <footer class={`${styles.footer} ${className ?? ''}`}>
      <span>{t('footer.privacy')}</span>
      <span class={styles.credit}>
        <img
          class={styles.avatar}
          src="/ashwin.jpg"
          width={24}
          height={24}
          alt="Ashwin Gopalsamy"
          loading="lazy"
          decoding="async"
        />
        <span>
          Ashwin Gopalsamy · Auth Tribe, Pismo ·{' '}
          <a
            href="https://github.com/ashwingopalsamy/pismozones"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </span>
      </span>
    </footer>
  );
}
