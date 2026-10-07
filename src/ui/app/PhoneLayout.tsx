import type { OfficeId } from '@core/cities/registry';
import { CardList } from '../components/CardList/CardList';
import { CommandBar } from '../components/CommandBar/CommandBar';
import { Sentence } from '../components/CommandBar/Sentence';
import { Icon } from '../components/Icon';
import { MomentPill } from '../components/MomentPill/MomentPill';
import { PlanView } from '../components/Plan/PlanView';
import { Ruler } from '../components/Ruler/Ruler';
import { SharedBanner } from '../components/SharedBanner/SharedBanner';
import { PHONE_BOX } from '../components/ZoneCard/model';
import { useApp, useT } from './context';
import styles from './layout.module.css';

export interface LayoutActions {
  openSettings(): void;
  openCities(): void;
  openHolidays(focus?: { officeId: OfficeId; date: string }): void;
  share(): void;
}

export function PhoneLayout({ actions }: { actions: LayoutActions }) {
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
            <Icon name="zones" size={16} />
            {t('view.zones')}
          </button>
          <button type="button" aria-pressed={view === 'plan'} onClick={() => setView('plan')}>
            <Icon name="plan" size={16} />
            {t('view.plan')}
          </button>
        </nav>
        <button
          type="button"
          class={styles.iconbtn}
          aria-label={t('a11y.cities')}
          onClick={actions.openCities}
        >
          <Icon name="globe" />
        </button>
      </header>
      <main class={styles.phoneMain}>
        <SharedBanner />
        {view === 'plan' ? (
          <PlanView layout="phone" />
        ) : (
          <CardList
            box={PHONE_BOX}
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
