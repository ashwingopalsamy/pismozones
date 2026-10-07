import { type ComponentType, type FunctionComponent, h } from 'preact';
import { useEffect, useState } from 'preact/hooks';

/**
 * A component whose code arrives in its own chunk; it renders nothing until then.
 * (Instead of preact/compat's lazy + Suspense, which would put compat in the entry bundle.)
 */
export function lazyComponent<P extends object>(
  load: () => Promise<ComponentType<P>>,
): FunctionComponent<P> {
  let loaded: ComponentType<P> | undefined;
  let pending: Promise<ComponentType<P>> | undefined;
  return function Lazy(props: P) {
    const [Loaded, setLoaded] = useState(() => loaded);
    useEffect(() => {
      if (Loaded) return;
      let live = true;
      pending ??= load().then((c) => (loaded = c));
      pending.then(
        (c) => live && setLoaded(() => c),
        () => {
          pending = undefined; // a later mount tries again
        },
      );
      return () => {
        live = false;
      };
    }, []);
    return Loaded ? h(Loaded, props) : null;
  };
}
