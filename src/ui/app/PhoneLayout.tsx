import type { OfficeId } from '@core/cities/registry';
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
import { useApp, useT } from './context';
import { useWidth } from './lane';
import styles from './layout.module.css';

export interface LayoutActions {
  openSettings(): void;
  openCities(): void;
  openHolidays(focus?: { officeId: OfficeId; date: string }): void;
  share(): void;
}

export function PhoneLayout({
  actions,
  citiesOpen,
}: {
  actions: LayoutActions;
  citiesOpen: boolean;
}) {
  const app = useApp();
  const t = useT();
  const bar = useRef<HTMLElement>(null);
  // One line down to 360px: below 400px the view labels drop their icons and the pill shows a code.
  const roomy = useWidth(bar) >= 400;
  const view = app.view.value;
  const setView = (v: 'zones' | 'plan') => {
    app.view.value = v;
    app.track('view', { view: v });
  };
  return (
    <div class={styles.phone}>
      <header ref={bar} class={styles.phoneHeader}>
        <button
          type="button"
          class={styles.iconbtn}
          aria-label={t('a11y.settings')}
          onClick={actions.openSettings}
        >
          <Icon name="sliders" />
        </button>
        <nav class={styles.seg} aria-label={t('a11y.view')}>
          <button type="button" aria-pressed={view === 'zones'} onClick={() => setView('zones')}>
            {roomy && <Icon name="zones" size={16} />}
            {t('view.zones')}
          </button>
          <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>
            {roomy && <Icon name="plan" size={16} />}
            {t('view.plan')}
          </button>
        </nav>
        <ThemeToggle class={styles.iconbtn} />
        <CityPill
          mode={roomy ? 'name' : 'code'}
          expanded={citiesOpen}
          onOpen={actions.openCities}
        />
      </header>
      <main class={styles.phoneMain}>
        <SharedBanner />
        {view === 'plan' ? (
          <PlanView layout="phone" />
        ) : (
          <CardList
            layout="phone"
            editable
            onHoliday={(id) => actions.openHolidays(focusFor(app, id))}
          />
        )}
      </main>
      <section class={styles.dock} aria-label={t('moment.live')}>
        <Sentence />
        <div class={styles.momentRow}>
          <button
            type="button"
            class={styles.iconbtn}
            aria-label={t('share.action')}
            onClick={actions.share}
          >
            <Icon name="share" />
          </button>
          <MomentPill />
        </div>
        <YouChip class={styles.you} />
        <Ruler />
        <CommandBar placement="dock" />
      </section>
    </div>
  );
}

export function focusFor(app: ReturnType<typeof useApp>, officeId: OfficeId) {
  const office = app.displayed.value.find((d) => d.office.id === officeId)?.office;
  if (!office) return undefined;
  const f = new Intl.DateTimeFormat('en-CA', {
    timeZone: office.zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return { officeId, date: f.format(app.moment.value) };
}
