// Cards.jsx — AnchorCard (São Paulo hero) and TimeCard (city grid tiles)
// Both read city.gradientColors (time-of-day interpolated RGB) from useTimeConversion.
import { motion } from 'framer-motion';

// ─── AnchorCard ───────────────────────────────────────────
// Full-width hero card, always shows São Paulo.
export function AnchorCard({ city, use24Hour, onSelect, isSource }) {
  const {
    name, flag, formattedTime, formattedSeconds,
    formattedDate, utcOffset, isDST, gradientColors,
    contrastOverlay, hour, dayLabel,
  } = city;

  let displayTime = formattedTime;
  let period = '';
  if (!use24Hour) {
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    period = hour >= 12 ? 'PM' : 'AM';
    displayTime = `${String(h12).padStart(2, '0')}:${formattedTime.split(':')[1]}`;
  }

  return (
    <motion.section
      className="anchor-card"
      style={{
        background: `linear-gradient(180deg, ${gradientColors.top} 0%, ${gradientColors.bottom} 100%)`,
        '--card-overlay-alpha': contrastOverlay ?? 0,
      }}
      onClick={() => onSelect?.('saopaulo')}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.('saopaulo'); } }}
      tabIndex={0}
      role="button"
      aria-pressed={isSource}
      aria-label="São Paulo — Click to set as source"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
    >
      <header className="anchor-card__header">
        <div className="anchor-card__location">
          <span className="anchor-card__flag">{flag}</span>
          <h2 className="anchor-card__city">{name}</h2>
        </div>
        <div className="anchor-card__meta-top">
          {isSource && <span className="badge badge--source">Source</span>}
          <span className="badge badge--utc">{utcOffset}</span>
          {isDST && <span className="badge badge--dst">DST</span>}
        </div>
      </header>

      <div className="anchor-card__footer">
        <span className="anchor-card__time">
          {displayTime.split(':')[0]}<span className="time-colon">:</span>{displayTime.split(':')[1]}
        </span>
        <span className="anchor-card__seconds"><span className="time-colon">:</span>{formattedSeconds}</span>
        {!use24Hour && <span className="anchor-card__period">{period}</span>}
        <div className="anchor-card__footer-right">
          {dayLabel && <span className="badge badge--day-offset">{dayLabel}</span>}
          <span className="anchor-card__date">{formattedDate}</span>
        </div>
      </div>
    </motion.section>
  );
}

// ─── TimeCard ─────────────────────────────────────────────
// Grid tile for all non-anchor cities. Gradient = city's local hour.
export function TimeCard({ city, isSource = false, onSelect, use24Hour }) {
  const {
    id, name, flag, formattedTime, formattedSeconds,
    formattedDate, dayLabel, utcOffset, isDST,
    gradientColors, contrastOverlay, hour,
  } = city;

  let displayTime = formattedTime;
  let period = '';
  if (!use24Hour) {
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    period = hour >= 12 ? 'PM' : 'AM';
    displayTime = `${String(h12).padStart(2, '0')}:${formattedTime.split(':')[1]}`;
  }

  const handleClick = () => onSelect?.(id);
  const handleKeyDown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } };

  return (
    <motion.article
      className="time-card"
      data-city={id}
      layout
      style={{
        background: `linear-gradient(135deg, ${gradientColors.top} 0%, ${gradientColors.bottom} 100%)`,
        '--card-overlay-alpha': contrastOverlay ?? 0,
      }}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSource}
      aria-label={`${name} - Click to set as source`}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ type: 'spring', stiffness: 300, damping: 28 }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.97 }}
    >
      <header className="time-card__header">
        <div className="time-card__location">
          <span className="time-card__flag">{flag}</span>
          <span className="time-card__city">{name}</span>
        </div>
        <div className="time-card__meta-top">
          <span className="time-card__source-slot" aria-hidden={!isSource}>
            {isSource ? <span className="badge badge--source">Source</span> : null}
          </span>
          <span className="badge badge--utc">{utcOffset}</span>
          {isDST && <span className="badge badge--dst">DST</span>}
        </div>
      </header>

      <div className="time-card__time-row">
        <span className="time-card__time">
          {displayTime.split(':')[0]}<span className="time-colon">:</span>{displayTime.split(':')[1]}
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
