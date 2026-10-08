import type { Ref } from 'preact';
import { CardList } from '../components/CardList/CardList';
import { CommandBar } from '../components/CommandBar/CommandBar';
import { Sentence } from '../components/CommandBar/Sentence';
import { Icon } from '../components/Icon';
import { MomentPill } from '../components/MomentPill/MomentPill';
import { PlanView } from '../components/Plan/PlanView';
import { SharedBanner } from '../components/SharedBanner/SharedBanner';
import { YouChip } from '../components/YouChip';
import { DESKTOP_BOX } from '../components/ZoneCard/model';
import { Brand } from './Brand';
import { useApp, useT } from './context';
import styles from './layout.module.css';
import { focusFor, type LayoutActions } from './PhoneLayout';

export function WideLayout({
  actions,
  commandRef,
}: {
  actions: LayoutActions;
  commandRef: Ref<HTMLInputElement>;
}) {
  const app = useApp();
  const t = useT();
  return (
    <div>
      <header class={styles.top}>
        <Brand />
        <CommandBar placement="top" sentence={false} ref={commandRef} />
        <div class={styles.spacer} />
        <YouChip class={styles.you} />
        <MomentPill />
        <button
          type="button"
          class={styles.iconbtn}
          aria-label={t('share.action')}
          onClick={actions.share}
        >
          <Icon name="share" size={19} />
        </button>
        <button
          type="button"
          class={styles.iconbtn}
          aria-label={t('a11y.holidays')}
          onClick={() => actions.openHolidays()}
        >
          <Icon name="calendar" size={19} />
        </button>
        <button
          type="button"
          class={styles.iconbtn}
          aria-label={t('a11y.cities')}
          onClick={actions.openCities}
        >
          <Icon name="globe" size={19} />
        </button>
        <button
          type="button"
          class={styles.iconbtn}
          aria-label={t('a11y.settings')}
          onClick={actions.openSettings}
        >
          <Icon name="sliders" size={19} />
        </button>
      </header>
      <main class={styles.wideMain}>
        <Sentence />
        <SharedBanner />
        <CardList
          box={DESKTOP_BOX}
          editable
          onHoliday={(id) => actions.openHolidays(focusFor(app, id))}
        />
        <PlanView layout="panel" />
        <footer class={styles.footer}>
          <span>{t('footer.privacy')}</span>
          <span>
            <a
              href="https://github.com/ashwingopalsamy/pismozones"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>{' '}
            · Ashwin Gopalsamy · Auth Tribe, Pismo
          </span>
        </footer>
      </main>
    </div>
  );
}
