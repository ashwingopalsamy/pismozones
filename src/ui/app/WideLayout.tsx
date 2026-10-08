import type { Ref } from 'preact';
import { useRef } from 'preact/hooks';
import { CardList } from '../components/CardList/CardList';
import { CityPill } from '../components/CityPill/CityPill';
import { CommandBar } from '../components/CommandBar/CommandBar';
import { Sentence } from '../components/CommandBar/Sentence';
import { Icon } from '../components/Icon';
import { MomentPill } from '../components/MomentPill/MomentPill';
import { PlanView } from '../components/Plan/PlanView';
import { Ruler } from '../components/Ruler/Ruler';
import { SharedBanner } from '../components/SharedBanner/SharedBanner';
import { ThemeToggle } from '../components/ThemeToggle/ThemeToggle';
import { YouChip } from '../components/YouChip';
import { Brand } from './Brand';
import { useApp, useT } from './context';
import { Footer } from './Footer';
import { tierFor, useWidth } from './lane';
import styles from './layout.module.css';
import { focusFor, type LayoutActions } from './PhoneLayout';

export function WideLayout({
  actions,
  commandRef,
  citiesOpen,
}: {
  actions: LayoutActions;
  commandRef: Ref<HTMLInputElement>;
  citiesOpen: boolean;
}) {
  const app = useApp();
  const t = useT();
  const lane = useRef<HTMLElement>(null);
  // One line at every width: only the command bar stretches; the rest compact by tier, never hide.
  const tier = tierFor(useWidth(lane));
  const tight = tier === 'C' || tier === 'D';
  return (
    <div class={styles.wide}>
      <div class={styles.topBar}>
        <header ref={lane} data-lane class={`${styles.column} ${styles.lane}`}>
          <Brand wordmark={tier === 'A'} />
          <CommandBar
            placement="top"
            sentence={false}
            ref={commandRef}
            placeholder={tight ? t('command.placeholderShort') : undefined}
          />
          <CityPill
            mode={tier === 'D' ? 'code' : tier === 'C' ? 'name' : 'time'}
            expanded={citiesOpen}
            onOpen={actions.openCities}
          />
          <MomentPill compact={tight} />
          <button
            type="button"
            class={styles.iconbtn}
            aria-label={t('share.action')}
            title={t('share.action')}
            onClick={actions.share}
          >
            <Icon name="share" size={19} />
          </button>
          <button
            type="button"
            class={styles.iconbtn}
            aria-label={t('a11y.holidays')}
            title={t('a11y.holidays')}
            onClick={() => actions.openHolidays()}
          >
            <Icon name="calendar" size={19} />
          </button>
          <ThemeToggle class={styles.iconbtn} />
          <button
            type="button"
            class={styles.iconbtn}
            aria-label={t('a11y.settings')}
            title={t('a11y.settings')}
            onClick={actions.openSettings}
          >
            <Icon name="sliders" size={19} />
          </button>
        </header>
      </div>
      <main class={`${styles.column} ${styles.wideMain}`}>
        <Sentence />
        <SharedBanner />
        <CardList
          layout="desktop"
          editable
          onHoliday={(id) => actions.openHolidays(focusFor(app, id))}
        />
        <div class={styles.rulerRow}>
          <YouChip class={styles.you} />
          <Ruler />
        </div>
        <PlanView layout="panel" />
      </main>
      <Footer class={styles.column} />
    </div>
  );
}
