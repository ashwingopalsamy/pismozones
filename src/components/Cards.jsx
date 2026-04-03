// Cards.jsx — AnchorCard (São Paulo hero) and TimeCard (city grid tiles)
import { useTilt } from '../hooks/useTilt';
import { useRipple } from './Ripple';
import { DigitSlide } from './DigitSlide';

// ─── Border Color Computation ─────────────────────────────
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
    <section
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
    >
      <div className="anchor-card__sheen" />
      <div className="card-shimmer" style={{ animationDelay: '0.2s' }} />

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '8px', position: 'relative', zIndex: 2 }}>
        <header className="anchor-card__header">
          <div className="anchor-card__location">
            <span className="anchor-card__flag">{flag}</span>
            <h2 className="anchor-card__city">{name}</h2>
          </div>
          <div className="anchor-card__meta-top">
            {isSource && (
              <span style={{ position: 'relative', display: 'inline-flex' }}>
                <span className="badge badge--source">{sourceLabel}</span>
                <span className="badge--source-ring" />
              </span>
            )}
            <span className="badge badge--utc">{utcOffset}</span>
            {isDST && <span className="badge badge--dst">DST</span>}
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
      </div>
    </section>
  );
}

// ─── TimeCard ─────────────────────────────────────────────
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
    <article
      ref={tiltRef}
      className="time-card"
      data-city={id}
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
                <span className="badge badge--source">{sourceLabel}</span>
                <span className="badge--source-ring" />
              </span>
            ) : null}
          </span>
          <span className="badge badge--utc">{utcOffset}</span>
          {isDST && <span className="badge badge--dst">DST</span>}
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
    </article>
  );
}
