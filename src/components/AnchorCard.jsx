import { motion } from 'framer-motion';

export function AnchorCard({ city, use24Hour }) {
  const {
    name,
    flag,
    formattedTime,
    formattedSeconds,
    formattedDate,
    utcOffset,
    isDST,
    gradientColors,
    contrastOverlay,
    hour,
    dayLabel,
  } = city;

  let displayTime = formattedTime;
  let period = '';
  if (!use24Hour) {
    const h = hour;
    period = h >= 12 ? 'PM' : 'AM';
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    displayTime = `${String(h12).padStart(2, '0')}:${formattedTime.split(':')[1]}`;
  }

  const gradientStyle = {
    background: `linear-gradient(180deg, ${gradientColors.top} 0%, ${gradientColors.bottom} 100%)`,
    '--card-overlay-alpha': contrastOverlay ?? 0,
  };

  return (
    <motion.section
      className="anchor-card"
      style={gradientStyle}
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
          <span className="anchor-card__utc">{utcOffset}</span>
          {isDST && <span className="anchor-card__dst-badge">☀️ DST</span>}
        </div>
      </header>

      <div className="anchor-card__footer">
        <span className="anchor-card__time">
          {displayTime.split(':')[0]}<span className="time-colon">:</span>{displayTime.split(':')[1]}
        </span>
        <span className="anchor-card__seconds"><span className="time-colon">:</span>{formattedSeconds}</span>
        {!use24Hour && <span className="anchor-card__period">{period}</span>}
        <div className="anchor-card__footer-right">
          {dayLabel && <span className="anchor-card__day-label">{dayLabel}</span>}
          <span className="anchor-card__date">{formattedDate}</span>
        </div>
      </div>
    </motion.section>
  );
}
