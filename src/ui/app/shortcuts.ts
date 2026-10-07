import type { AppState } from '@state/index';

const HOUR = 3_600_000;
const QUARTER = 900_000;

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) ||
    !!target.closest('dialog')
  );
}

/** Global keyboard map (desktop). Returns true when the key was handled. */
export function handleShortcut(
  e: KeyboardEvent,
  app: AppState,
  ui: { focusCommand(): void; openShortcuts(): void },
): boolean {
  if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
    ui.focusCommand();
    return true;
  }
  if (e.metaKey || e.ctrlKey || e.altKey || isEditable(e.target)) return false;
  const step = e.shiftKey ? HOUR : QUARTER;
  switch (e.key) {
    case '/':
      ui.focusCommand();
      return true;
    case 'n':
    case 'N':
      app.backToLive('key');
      return true;
    case 'ArrowRight':
      app.nudge(step, 'keyboard');
      return true;
    case 'ArrowLeft':
      app.nudge(-step, 'keyboard');
      return true;
    case ']':
      app.nudge(24 * HOUR, 'day_nav');
      return true;
    case '[':
      app.nudge(-24 * HOUR, 'day_nav');
      return true;
    case '?':
      ui.openShortcuts();
      return true;
    default:
      return false;
  }
}
