import { useApp, useT } from '../../app/context';
import { Icon } from '../Icon';

/** One tap flips light ↔ dark and remembers it; Settings → System returns to following the machine. */
export function ThemeToggle({ class: className }: { class?: string | undefined }) {
  const app = useApp();
  const t = useT();
  const dark = app.prefs.theme.value === 'dark';
  const next = dark ? 'light' : 'dark';
  const label = t(dark ? 'theme.toLight' : 'theme.toDark');
  return (
    <button
      type="button"
      class={className}
      aria-label={label}
      title={label}
      onClick={() => {
        app.prefs.set('theme', next);
        app.track('setting', { key: 'theme', value: next });
      }}
    >
      <Icon name={dark ? 'sun' : 'moon'} size={19} />
    </button>
  );
}
