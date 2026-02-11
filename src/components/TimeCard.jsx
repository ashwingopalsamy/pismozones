import { motion } from 'framer-motion';

export function TimeCard({
  city, 
  isSource = false,
  onSelect,
  use24Hour,
}) {
  const {
    id,
    name,
    flag,
    formattedTime,
    formattedSeconds,
    formattedDate,
    dayLabel,
    utcOffset,
    isDST,
    gradientColors,
    contrastOverlay,
    hour,
  } = city;

  let displayTime = formattedTime;
  let period = '';
  if (!use24Hour) {
    const h = hour;
    period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    displayTime = `${String(h12).padStart(2, '0')}:${formattedTime.split(':')[1]}`;
  }

  const handleClick = () => {
    if (onSelect) onSelect(id);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleClick();
    }
  };

  const gradientStyle = {
    background: `linear-gradient(135deg, ${gradientColors.top} 0%, ${gradientColors.bottom} 100%)`,
    '--card-overlay-alpha': contrastOverlay ?? 0,
  };

  return (
    <motion.article
      className="time-card"
      data-city={id}
      style={gradientStyle}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-pressed={isSource}
      aria-label={`${name} - Click to set as source`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
    >
      <header className="time-card__header">
        <div className="time-card__location">
          <span className="time-card__flag">{flag}</span>
          <span className="time-card__city">{name}</span>
        </div>
        <div className="time-card__meta-top">
          <span className="time-card__source-slot" aria-hidden={!isSource}>
            {isSource ? <span className="time-card__source-badge">Source</span> : null}
          </span>
          <span className="time-card__utc">{utcOffset}</span>
          {isDST && <span className="time-card__dst-badge">☀️ DST</span>}
        </div>
      </header>

      <div className="time-card__time-row">
        <span className="time-card__time">
          {displayTime.split(':')[0]}<span className="time-colon">:</span>{displayTime.split(':')[1]}
        </span>
        <span className="time-card__seconds"><span className="time-colon">:</span>{formattedSeconds}</span>
        {!use24Hour && <span className="time-card__period">{period}</span>}
        <span className="time-card__day-slot" aria-hidden={!dayLabel}>
          {dayLabel ? <span className="time-card__day-label">{dayLabel}</span> : null}
        </span>
        <span className="time-card__date-hover">{formattedDate}</span>
      </div>
    </motion.article>
  );
}
