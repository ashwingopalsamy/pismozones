// Cards.jsx — AnchorCard (São Paulo hero) and TimeCard (city grid tiles)
// Both read city.gradientColors (time-of-day interpolated RGB) from useTimeConversion.
import { motion, AnimatePresence } from 'framer-motion';
import { useTilt } from '../hooks/useTilt';
import { useRipple } from './Ripple';
import { DigitSlide } from './DigitSlide';

// ─── Border Color Computation ─────────────────────────────
// Derives lightened RGBA border colors from the card's gradient endpoints.
// Fed as CSS custom properties so the ::after mask-composite border can
// pick them up without any JS on every frame.
function computeBorderColors(gradientColors) {
  if (!gradientColors) return {};
  const parse = (rgb) => {
    const m = rgb.match(/\d+/g);
    return m ? m.map(Number) : [128, 128, 128];
  };
  const lighten = ([r, g, b]) =>
    `rgba(${Math.min(255, r + 64)},${Math.min(255, g + 64)},${Math.min(255, b + 64)},0.25)`;
  const top = parse(gradientColors.top);
  const bottom = parse(gradientColors.bottom);
  return {
    '--border-warm': lighten(top),
    '--border-cool': lighten(bottom),
  };
}

// ─── AnchorCard ───────────────────────────────────────────
// Full-width hero card, always shows São Paulo.
// Tilt + sheen on hover (no ripple — hero isn't a selection target in the same way).
export function AnchorCard({ city, use24Hour, onSelect, isSource, lang = 'en' }) {
  const {
    name, flag, formattedTime, formattedSeconds,
    formattedDate, utcOffset, isDST, gradientColors,
    contrastOverlay, hour, dayLabel,
  } = city;

  const { ref: tiltRef, onMouseMove, onMouseLeave } = useTilt();
  const sourceLabel = lang === 'pt' ? 'Origem' : 'Source';

  let displayTime = formattedTime;
  let period = '';
  if (!use24Hour) {
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    period = hour >= 12 ? 'PM' : 'AM';
    displayTime = `${String(h12).padStart(2, '0')}:${formattedTime.split(':')[1]}`;
  }

  return (
    <motion.section
      ref={tiltRef}
      className="anchor-card"
      style={{
        background: [
          `linear-gradient(180deg, rgba(0,0,0,${contrastOverlay ?? 0}) 0%, rgba(0,0,0,${((contrastOverlay ?? 0) * 0.9).toFixed(3)}) 100%)`,
          `linear-gradient(180deg, ${gradientColors.top} 0%, ${gradientColors.bottom} 100%)`,
        ].join(', '),
        ...computeBorderColors(gradientColors),
      }}
      onClick={() => onSelect?.('saopaulo')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.('saopaulo'); } }}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      tabIndex={0}
      role="button"
      aria-pressed={isSource}
      aria-label="São Paulo — Click to set as source"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.24, ease: [0.25, 1, 0.5, 1] }}
    >
      <div className="anchor-card__sheen" />
      <div className="card-shimmer" style={{ animationDelay: '0.2s' }} />

      <AnimatePresence mode="wait">
        <motion.div
          key={name}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
          style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '8px', position: 'relative', zIndex: 2 }}
        >
          <header className="anchor-card__header">
            <div className="anchor-card__location">
              <span className="anchor-card__flag">{flag}</span>
              <h2 className="anchor-card__city">{name}</h2>
            </div>
            <div className="anchor-card__meta-top">
              {isSource && (
                <span style={{ position: 'relative', display: 'inline-flex' }}>
                  <motion.span
                    className="badge badge--source"
                    key={`source-anchor`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  >
                    {sourceLabel}
                  </motion.span>
                  <span className="badge--source-ring" />
                </span>
              )}
              <motion.span
                className="badge badge--utc"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.16 }}
              >
                {utcOffset}
              </motion.span>
              {isDST && (
                <motion.span
                  className="badge badge--dst"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.22 }}
                >
                  DST
                </motion.span>
              )}
            </div>
          </header>

          {dayLabel && <div className="card-day-sweep" />}

          <div className="anchor-card__footer">
            <span className="anchor-card__time">
              {displayTime.split(':')[0]}<span className="time-colon">:</span><DigitSlide value={displayTime.split(':')[1]} />
            </span>
            <span className="anchor-card__seconds"><span className="time-colon">:</span>{formattedSeconds}</span>
            {!use24Hour && <span className="anchor-card__period">{period}</span>}
            <div className="anchor-card__footer-right">
              {dayLabel && <span className="badge badge--day-offset">{dayLabel}</span>}
              <span className="anchor-card__date">{formattedDate}</span>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </motion.section>
  );
}

// ─── TimeCard ─────────────────────────────────────────────
// Grid tile for all non-anchor cities. Gradient = city's local hour.
// Tilt + sheen + ripple on click + physical press state.
export function TimeCard({ city, isSource = false, onSelect, use24Hour, index = 0, lang = 'en' }) {
  const {
    id, name, flag, formattedTime, formattedSeconds,
    formattedDate, dayLabel, utcOffset, isDST,
    gradientColors, contrastOverlay, hour,
  } = city;

  const { ref: tiltRef, onMouseMove, onMouseLeave } = useTilt();
  const { triggerRipple, RippleContainer } = useRipple();
  const sourceLabel = lang === 'pt' ? 'Origem' : 'Source';

  let displayTime = formattedTime;
  let period = '';
  if (!use24Hour) {
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    period = hour >= 12 ? 'PM' : 'AM';
    displayTime = `${String(h12).padStart(2, '0')}:${formattedTime.split(':')[1]}`;
  }

  const handleClick = (e) => {
    triggerRipple(e);
    onSelect?.(id);
  };
  const handleKeyDown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(e); } };

  return (
    <motion.article
      ref={tiltRef}
      className="time-card"
      data-city={id}
      layout
      style={{
        background: [
          `linear-gradient(180deg, rgba(0,0,0,${contrastOverlay ?? 0}) 0%, rgba(0,0,0,${((contrastOverlay ?? 0) * 0.9).toFixed(3)}) 100%)`,
          `linear-gradient(135deg, ${gradientColors.top} 0%, ${gradientColors.bottom} 100%)`,
        ].join(', '),
        ...computeBorderColors(gradientColors),
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      tabIndex={0}
      role="button"
      aria-pressed={isSource}
      aria-label={`${name} - Click to set as source`}
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28, delay: index * 0.065 }}
      whileTap={{
        scale: 0.97,
        y: 1,
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,0.15), 0 1px 4px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
      }}
    >
      <div className="time-card__sheen" />
      <div className="card-shimmer" style={{ animationDelay: `${(index * 0.065) + 0.2}s` }} />
      <RippleContainer />
      {dayLabel && <div className="card-day-sweep" />}

      <header className="time-card__header">
        <div className="time-card__location">
          <span className="time-card__flag">{flag}</span>
          <span className="time-card__city">{name}</span>
        </div>
        <div className="time-card__meta-top">
          <span className="time-card__source-slot" aria-hidden={!isSource}>
            {isSource ? (
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <motion.span
                  className="badge badge--source"
                  key={`source-${id}`}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                >
                  {sourceLabel}
                </motion.span>
                <span className="badge--source-ring" />
              </span>
            ) : null}
          </span>
          <motion.span
            className="badge badge--utc"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20, delay: (index * 0.065) + 0.16 }}
          >
            {utcOffset}
          </motion.span>
          {isDST && (
            <motion.span
              className="badge badge--dst"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20, delay: (index * 0.065) + 0.22 }}
            >
              DST
            </motion.span>
          )}
        </div>
      </header>

      <div className="time-card__time-row">
        <span className="time-card__time">
          {displayTime.split(':')[0]}<span className="time-colon">:</span><DigitSlide value={displayTime.split(':')[1]} />
        </span>
        <span className="time-card__seconds"><span className="time-colon">:</span>{formattedSeconds}</span>
        {!use24Hour && <span className="time-card__period">{period}</span>}
        <span className="time-card__day-slot" aria-hidden={!dayLabel}>
          {dayLabel ? <span className="badge badge--day-offset">{dayLabel}</span> : null}
        </span>
        <span className="time-card__date-hover">{formattedDate}</span>
      </div>
    </motion.article>
  );
}
