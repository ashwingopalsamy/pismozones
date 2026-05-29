import { motion } from 'framer-motion';
import { NLConversionToast } from './NLConversionToast';
import { TimeCard } from './Cards';
import { DigitSlide } from './DigitSlide';
import { computeBorderColors } from '../lib/timeCardStyles';

const easeOut = [0.2, 0.8, 0.2, 1];

function buildCardStyle(city) {
  const borderVars = computeBorderColors(city.gradientColors);
  return {
    background: [
      `linear-gradient(180deg, rgba(0,0,0,${city.contrastOverlay ?? 0}) 0%, rgba(0,0,0,${((city.contrastOverlay ?? 0) * 0.9).toFixed(3)}) 100%)`,
      `linear-gradient(180deg, ${city.gradientColors.top} 0%, ${city.gradientColors.bottom} 100%)`,
    ].join(', '),
    ...borderVars,
  };
}

function buildTime(city, use24Hour) {
  if (use24Hour) return { displayTime: city.formattedTime, period: '' };
  const h12 = city.hour === 0 ? 12 : city.hour > 12 ? city.hour - 12 : city.hour;
  return {
    displayTime: `${String(h12).padStart(2, '0')}:${city.formattedTime.split(':')[1]}`,
    period: city.hour >= 12 ? 'PM' : 'AM',
  };
}

// Uses exact anchor-card CSS classes — identical look to the primary AnchorCard
function NLDestinationCard({ city, use24Hour, onSelect }) {
  const { displayTime, period } = buildTime(city, use24Hour);
  return (
    <section
      className="anchor-card"
      style={buildCardStyle(city)}
      onClick={() => onSelect?.(city.id)}
      role="button"
      tabIndex={0}
      aria-label={`${city.name} — ${displayTime}${period ? ` ${period}` : ''}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(city.id); } }}
    >
      <div className="anchor-card__sheen" />
      <div className="card-shimmer" style={{ animationDelay: '0.25s' }} />
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, gap: '8px', position: 'relative', zIndex: 2 }}>
        <header className="anchor-card__header">
          <div className="anchor-card__location">
            <span className="anchor-card__flag">{city.flag}</span>
            <h2 className="anchor-card__city">{city.name}</h2>
          </div>
          <div className="anchor-card__meta-top">
            <span className="badge badge--utc">{city.utcOffset}</span>
            {city.isDST && <span className="badge badge--dst">DST</span>}
          </div>
        </header>
        {city.dayLabel && <div className="card-day-sweep" />}
        <div className="anchor-card__footer">
          <span className="anchor-card__time">
            {displayTime.split(':')[0]}<span className="time-colon">:</span><DigitSlide value={displayTime.split(':')[1]} />
          </span>
          <span className="anchor-card__seconds"><span className="time-colon">:</span>{city.formattedSeconds}</span>
          {!use24Hour && <span className="anchor-card__period">{period}</span>}
          <div className="anchor-card__footer-right">
            {city.dayLabel && <span className="badge badge--day-offset">{city.dayLabel}</span>}
            <span className="anchor-card__date">{city.formattedDate}</span>
          </div>
        </div>
      </div>
    </section>
  );
}


export function NLResultSection({ conversion, use24Hour, onSelect }) {
  if (conversion.status !== 'ready' || !conversion.results?.length) return null;

  const results = conversion.results;
  const signature = conversion.parsed?.signature;

  return (
    <motion.div
      className="nl-result-section"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.2, ease: easeOut }}
    >
      <NLConversionToast conversion={conversion} signature={signature} />

      {results.length === 1 && (
        <NLDestinationCard city={results[0]} use24Hour={use24Hour} onSelect={onSelect} />
      )}

      {results.length === 2 && (
        <div className="nl-half-row">
          {results.map((city, index) => (
            <TimeCard
              key={city.id}
              city={city}
              index={index}
              isSource={false}
              onSelect={onSelect}
              use24Hour={use24Hour}
              lang="en"
            />
          ))}
        </div>
      )}

      {results.length >= 3 && (
        <div className="nl-multi-row">
          {results.map((city, index) => (
            <TimeCard
              key={city.id}
              city={city}
              index={index}
              isSource={false}
              onSelect={onSelect}
              use24Hour={use24Hour}
              lang="en"
            />
          ))}
        </div>
      )}

      <div className="nl-result-divider">
        <span>other active cities at this time</span>
      </div>
    </motion.div>
  );
}
