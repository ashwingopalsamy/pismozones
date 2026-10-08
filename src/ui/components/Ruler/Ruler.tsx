import { zonedFields } from '@core/time/zoned';
import { useLayoutEffect, useRef, useState } from 'preact/hooks';
import { useApp, useT } from '../../app/context';
import { Icon } from '../Icon';
import { momentPillModel } from '../MomentPill/model';
import { MS_PER_PX, rulerTicks } from './model';
import styles from './Ruler.module.css';

const HOUR = 3_600_000;
const QUARTER = 900_000;
const FALLBACK_WIDTH = 252;
const round5 = (t: number) => Math.round(t / 300_000) * 300_000;

export function Ruler() {
  const app = useApp();
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; base: number } | null>(null);
  const [width, setWidth] = useState(FALLBACK_WIDTH);
  const [dragging, setDragging] = useState(false);

  useLayoutEffect(() => {
    const el = track.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth || FALLBACK_WIDTH));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const moment = app.moment.value;
  const ref = app.reference.value;
  const hc = app.prefs.hourCycle.value;
  const offices = app.displayed.value.map((d) => d.office);
  const ticks = rulerTicks(moment, ref.zone, offices, width, hc);
  const pill = momentPillModel(
    app.mode.value,
    moment,
    app.clock.minuteNow.value,
    ref,
    app.env.viewerZone,
    hc,
    app.prefs.lang.value,
  );
  const f = zonedFields(moment, ref.zone);

  const onPointerDown = (e: PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // Capture is best-effort (unsupported in some environments).
    }
    drag.current = { x: e.clientX, base: app.moment.value };
    setDragging(true);
  };
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    if (Math.abs(dx) < 2) return;
    app.scrub(round5(d.base - dx * MS_PER_PX));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    app.endScrub('ruler');
  };
  const onKeyDown = (e: KeyboardEvent) => {
    const step = e.shiftKey ? HOUR : QUARTER;
    if (e.key === 'ArrowRight') app.nudge(step, 'keyboard');
    else if (e.key === 'ArrowLeft') app.nudge(-step, 'keyboard');
    else if (e.key === 'Home' || e.key === 'Escape') app.backToLive('key');
    else return;
    e.preventDefault();
  };

  return (
    <div class={styles.ruler}>
      <button
        type="button"
        class={styles.chev}
        aria-label={t('a11y.hourBack')}
        onClick={() => app.nudge(-HOUR, 'keyboard')}
      >
        <Icon name="chevronLeft" size={18} />
      </button>
      <div
        ref={track}
        class={`${styles.track} ${dragging ? styles.dragging : ''}`}
        role="slider"
        tabIndex={0}
        aria-label={t('a11y.ruler')}
        aria-valuemin={0}
        aria-valuemax={1439}
        aria-valuenow={f.hour * 60 + f.minute}
        aria-valuetext={`${pill.main}, ${pill.sub}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        {ticks.map((tick) => (
          <div
            key={tick.x.toFixed(2)}
            class={`${styles.tick} ${tick.major ? styles.major : ''} ${tick.hot ? styles.hot : ''}`}
            style={{ left: `${tick.x}px` }}
          >
            <i />
            {tick.label && <span>{tick.label}</span>}
          </div>
        ))}
        <div class={styles.needle} />
      </div>
      <button
        type="button"
        class={styles.chev}
        aria-label={t('a11y.hourFwd')}
        onClick={() => app.nudge(HOUR, 'keyboard')}
      >
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );
}
