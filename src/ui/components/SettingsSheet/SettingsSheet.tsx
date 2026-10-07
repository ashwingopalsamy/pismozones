import type { Prefs } from '@state/storage';
import { useApp, useT } from '../../app/context';
import type { Key } from '../../i18n';
import { Icon, type IconName } from '../Icon';
import { Sheet } from '../Sheet/Sheet';
import { cardModel, PHONE_BOX } from '../ZoneCard/model';
import { ZoneCard } from '../ZoneCard/ZoneCard';
import styles from './SettingsSheet.module.css';

interface Choice<K extends keyof Prefs> {
  key: K;
  icon: IconName;
  label: Key;
  options: Array<{ value: Prefs[K]; label: string }>;
}

export interface SettingsSheetProps {
  open: boolean;
  onClose(): void;
  onOpenCities(): void;
  onOpenHolidays(): void;
}

export function SettingsSheet({ open, onClose, onOpenCities, onOpenHolidays }: SettingsSheetProps) {
  const app = useApp();
  const t = useT();
  const prefs = app.prefs.prefs.value;
  const ref = app.reference.value;
  const now = app.clock.minuteNow.value;
  const model = cardModel(ref, now, {
    now,
    viewerZone: app.env.viewerZone,
    hourCycle: app.prefs.hourCycle.value,
    lang: app.prefs.lang.value,
    refId: ref.id,
    temp: false,
    box: PHONE_BOX,
    starCount: 26,
  });

  const choices = [
    {
      key: 'hourCycle',
      icon: 'clock',
      label: 'settings.timeFormat',
      options: [
        { value: 'auto', label: t('settings.auto') },
        { value: 'h12', label: '12h' },
        { value: 'h23', label: '24h' },
      ],
    } satisfies Choice<'hourCycle'>,
    {
      key: 'theme',
      icon: 'moon',
      label: 'settings.theme',
      options: [
        { value: 'system', label: t('settings.system') },
        { value: 'dark', label: t('settings.dark') },
        { value: 'light', label: t('settings.light') },
      ],
    } satisfies Choice<'theme'>,
    {
      key: 'lang',
      icon: 'language',
      label: 'settings.language',
      options: [
        { value: 'auto', label: t('settings.auto') },
        { value: 'en', label: 'English' },
        { value: 'pt-BR', label: 'Português' },
      ],
    } satisfies Choice<'lang'>,
  ];

  const set = <K extends keyof Prefs>(key: K, value: Prefs[K]) => {
    app.prefs.set(key, value);
    app.track('setting', { key, value: String(value) });
  };

  return (
    <Sheet open={open} onClose={onClose} title={t('settings.title')}>
      <div class={styles.preview}>
        <ZoneCard model={model} live editable={false} box={PHONE_BOX} />
        <div class={styles.caption}>{t('settings.preview')}</div>
      </div>

      <div class={styles.section}>{t('settings.display')}</div>
      <div class={styles.group}>
        {choices.map((c) => (
          <div key={c.key} class={styles.row}>
            <span class={styles.icon}>
              <Icon name={c.icon as IconName} />
            </span>
            <span class={styles.label}>{t(c.label as Key)}</span>
            <fieldset class={styles.seg} aria-label={t(c.label as Key)}>
              {c.options.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={prefs[c.key as keyof Prefs] === o.value}
                  onClick={() => set(c.key as keyof Prefs, o.value as never)}
                >
                  {o.label}
                </button>
              ))}
            </fieldset>
          </div>
        ))}
      </div>

      <div class={styles.section}>{t('settings.places')}</div>
      <div class={styles.group}>
        <button type="button" class={styles.row} onClick={onOpenCities}>
          <span class={styles.icon}>
            <Icon name="globe" />
          </span>
          <span class={styles.label}>{t('cities.title')}</span>
          <span class={styles.value}>
            {app.cities.activeIds.value.length}
            <Icon name="chevronRight" size={16} />
          </span>
        </button>
        <button type="button" class={styles.row} onClick={onOpenHolidays}>
          <span class={styles.icon}>
            <Icon name="calendar" />
          </span>
          <span class={styles.label}>{t('holidays.title')}</span>
          <span class={styles.value}>
            <Icon name="chevronRight" size={16} />
          </span>
        </button>
      </div>

      <div class={styles.section}>{t('settings.privacy')}</div>
      <div class={styles.group}>
        <p class={styles.note}>{t('settings.privacyNote')}</p>
      </div>

      <p class={styles.credit}>
        Pismo Zones ·{' '}
        <a
          href="https://github.com/ashwingopalsamy/pismozones"
          target="_blank"
          rel="noopener noreferrer"
        >
          GitHub
        </a>{' '}
        · Ashwin Gopalsamy
      </p>
    </Sheet>
  );
}
