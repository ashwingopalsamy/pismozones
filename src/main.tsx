import { createTracker } from '@state/analytics';
import { browserEnv } from '@state/env';
import { createAppState } from '@state/index';
import { render } from 'preact';
import { App } from './ui/app/App';
import { injectBeacon } from './ui/app/beacon';
import { AppContext } from './ui/app/context';
import { createInstall } from './ui/app/install';
import './ui/styles/fonts.css';
import './ui/styles/tokens.css';
import './ui/styles/base.css';

const env = browserEnv();
const tracker = createTracker(env);
const app = createAppState(env, tracker.track);
app.start();
const install = createInstall(window, tracker.track);
injectBeacon(import.meta.env.VITE_CF_BEACON_TOKEN, document);

const width = window.innerWidth;
tracker.track('session_start', {
  lang: app.prefs.lang.value,
  hourCycle: app.prefs.hourCycle.value,
  theme: app.prefs.theme.value,
  device: width < 768 ? 'phone' : width < 1024 ? 'tablet' : 'desktop',
  display: window.matchMedia?.('(display-mode: standalone)').matches ? 'standalone' : 'browser',
  entry: app.boot.entry,
  activeCount: app.cities.activeIds.value.length,
});
addEventListener('pagehide', () => tracker.flush());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') tracker.flush();
});

const root = document.getElementById('root');
if (root)
  render(
    <AppContext.Provider value={app}>
      <App install={install} />
    </AppContext.Provider>,
    root,
  );
