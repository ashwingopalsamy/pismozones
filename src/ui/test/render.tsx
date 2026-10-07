import type { OfficeId } from '@core/cities/registry';
import type { Instant } from '@core/time/types';
import type { AppEnv } from '@state/env';
import { type AppState, createAppState } from '@state/index';
import { makeEnv, type TestEnv } from '@state/testing';
import { render } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';
import type { ComponentChildren } from 'preact';
import { AppContext } from '../app/context';

export interface RenderOpts {
  activeIds?: OfficeId[];
  refId?: OfficeId;
  moment?: Instant;
  path?: string;
  env?: Partial<AppEnv>;
}

/** Renders a component inside a fresh, deterministic app state (NOW = Wed 7 Oct 2026 14:22 UTC). */
export function renderWithApp(ui: ComponentChildren, opts: RenderOpts = {}) {
  const env: TestEnv = makeEnv({
    ...opts.env,
    ...(opts.path
      ? { location: { pathname: opts.path, search: '', origin: 'http://localhost' } }
      : {}),
  });
  const app: AppState = createAppState(env);
  if (opts.activeIds) app.cities.activeIds.value = opts.activeIds;
  if (opts.refId) app.cities.refId.value = opts.refId;
  if (opts.moment !== undefined) app.pin(opts.moment, 'keyboard');
  const wrap = (node: ComponentChildren) => (
    <AppContext.Provider value={app}>{node}</AppContext.Provider>
  );
  const result = render(wrap(ui));
  const user = userEvent.setup();
  return {
    ...result,
    rerender: (next: ComponentChildren) => result.rerender(wrap(next)),
    app,
    env,
    user,
  };
}
