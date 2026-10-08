import type { OfficeId } from '@core/cities/registry';
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
  const view = app.view.value;
  const setView = (v: 'zones' | 'plan') => {
    app.view.value = v;
    app.track('view', { view: v });
  };
  return (
    <div class={styles.phone}>
      <header class={styles.phoneHeader}>
        <Brand />
        <ThemeToggle class={styles.iconbtn} />
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
      {/* Thumb zone, bottom-up: controls, then search, then the time scrubber. */}
      <section class={styles.dock} aria-label={t('a11y.controls')}>
        <Sentence />
        <YouChip class={styles.you} />
        <div class={styles.timeRow}>
          <MomentPill compact />
          <Ruler />
        </div>
        <CommandBar placement="dock" />
        <nav class={styles.controls} aria-label={t('a11y.controls')}>
          <button
            type="button"
            class={styles.iconbtn}
            aria-label={t('a11y.settings')}
            onClick={actions.openSettings}
          >
            <Icon name="sliders" size={19} />
          </button>
          <fieldset class={styles.seg}>
            <legend class="sr-only">{t('a11y.view')}</legend>
            <button type="button" aria-pressed={view === 'zones'} onClick={() => setView('zones')}>
              {t('view.zones')}
            </button>
            <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>
              {t('view.plan')}
            </button>
          </fieldset>
          <CityPill mode="code" expanded={citiesOpen} onOpen={actions.openCities} />
          <button
            type="button"
            class={styles.iconbtn}
            aria-label={t('share.action')}
            onClick={actions.share}
          >
            <Icon name="share" size={19} />
          </button>
        </nav>
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
