import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { CitySelector } from './CitySelector';

// ─── i18n ───────────────────────────────────────────────────
const T = {
  en: {
    title: 'Sweet Spot',
    subtitle: 'Best meeting times across offices',
    source: 'Source',
    best: 'Best',
    good: 'Good',
    stretch: 'Stretch',
    duration: '1h',
    legendOffice: 'Office hours',
    legendSweet: 'Best window',
    legendOk: 'Working',
    legendEdge: 'Closing',
    legendOut: 'Late',
    sectionTimeline: 'Office Hours Overview',
    sectionAlts: 'Alternatives',
    hintDrag: 'Drag the green band or click a track to explore times',
    officesInHours: 'offices in business hours',
    inHours: 'in hours',
    closing: 'closing',
    late: 'late',
  },
  pt: {
    title: 'Melhor Horario',
    subtitle: 'Melhores horarios de reuniao entre escritorios',
    source: 'Origem',
    best: 'Melhor',
    good: 'Bom',
    stretch: 'Possivel',
    duration: '1h',
    legendOffice: 'Expediente',
    legendSweet: 'Melhor janela',
    legendOk: 'Trabalhando',
    legendEdge: 'Fechando',
    legendOut: 'Tarde',
    sectionTimeline: 'Visao Geral do Expediente',
    sectionAlts: 'Alternativas',
    hintDrag: 'Arraste a barra verde ou clique na trilha para explorar',
    officesInHours: 'escritorios em horario comercial',
    inHours: 'em horario',
    closing: 'fechando',
    late: 'tarde',
  },
};

// ─── helpers ────────────────────────────────────────────────

function formatTimeFull(hour, minute, use24Hour) {
  if (use24Hour) {
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const period = hour >= 12 ? 'PM' : 'AM';
  const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
}

function splitTime(timeStr, use24Hour) {
  if (use24Hour) return { time: timeStr, period: '' };
  const match = timeStr.match(/^(\d+:\d+)\s*(AM|PM)$/);
  return match ? { time: match[1], period: match[2] } : { time: timeStr, period: '' };
}

function formatUtcOffset(offsetMinutes) {
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  return minutes > 0 ? `${sign}${hours}:${String(minutes).padStart(2, '0')}` : `${sign}${hours}`;
}

function getAxisLabels(use24Hour) {
  if (use24Hour) {
    return ['00', '02', '04', '06', '08', '10', '12', '14', '16', '18', '20', '22'];
  }
  return ['12a', '2a', '4a', '6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p', '10p'];
}

function officeHoursPosition(sourceOffset, cityOffset) {
  const diffHours = (sourceOffset - cityOffset) / 60;
  let startHour = 9 + diffHours;
  startHour = ((startHour % 24) + 24) % 24;
  const left = (startHour / 24) * 100;
  const width = (9 / 24) * 100;
  return { left, width };
}

function stateWord(state, tx) {
  if (state === 'ok') return tx.legendOk;
  if (state === 'edge') return tx.legendEdge;
  return tx.legendOut;
}

function stateLabel(state, tx) {
  if (state === 'edge') return tx.closing;
  if (state === 'out') return tx.late;
  return '';
}

// ─── ModalContent ───────────────────────────────────────────

function ModalContent({
  onClose, suggestions, allSlots, cities, sourceCity,
  activeCityIds, allCities, use24Hour,
  onAddCity, onRemoveCity, onResetDefaults,
  onSetSource, sourceId, lang,
}) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [customSlot, setCustomSlot] = useState(null);
  const tx = T[lang] || T.en;
  const trackRef = useRef(null);

  // Escape key
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // customSlot overrides suggestion selection when user clicks timeline
  const selectedSlot = customSlot ?? suggestions?.[selectedIdx] ?? suggestions?.[0] ?? null;
  const sourceOffset = sourceCity
    ? (selectedSlot?.cityScores?.find(cs => cs.id === sourceCity.id)?.offset ?? 0)
    : 0;

  const sourceCityData = sourceCity
    ? {
        ...sourceCity,
        offset: sourceOffset,
        code: sourceCity.code || sourceCity.name?.slice(0, 2).toUpperCase(),
      }
    : null;

  const axisLabels = getAxisLabels(use24Hour);
  const sweetHour = selectedSlot?.hour ?? -1;
  const sweetAxisIdx = Math.floor(sweetHour / 2);
  const cityCount = cities.length;

  // Track click handler — snap to nearest 30-min slot
  const handleTrackClick = useCallback((e) => {
    const track = e.currentTarget;
    const rect = track.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = x / rect.width;
    const fractionalHour = pct * 24;
    // Snap to nearest 30-min: index 0-47
    const slotIdx = Math.round(fractionalHour * 2) % 48;

    // Check if this slot matches a suggestion
    if (allSlots && allSlots[slotIdx]) {
      const slot = allSlots[slotIdx];
      const suggIdx = suggestions.findIndex(s => s.hour === slot.hour && (s.minute || 0) === (slot.minute || 0));
      if (suggIdx >= 0) {
        setCustomSlot(null);
        setSelectedIdx(suggIdx);
      } else {
        setCustomSlot(slot);
        setSelectedIdx(-1);
      }
    }
  }, [suggestions, allSlots]);

  // When user clicks a suggestion card, clear customSlot
  const handleSelectSuggestion = useCallback((idx) => {
    setCustomSlot(null);
    setSelectedIdx(idx);
  }, []);

  // Hero card data (rank 1)
  const heroSlot = suggestions?.[0] ?? null;
  const heroTime = heroSlot ? splitTime(formatTimeFull(heroSlot.hour, heroSlot.minute || 0, use24Hour), use24Hour) : { time: '--:--', period: '' };

  return (
      /* Static overlay: flex-centers the modal. Not animated itself. */
      <div className="meet-modal__overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        {/* Animated dim backdrop — absolute fill, only does opacity */}
        <motion.div
          className="meet-modal__backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
        {/* Animated modal — sibling to backdrop, centered by overlay flex */}
        <motion.div
          className="meet-modal"
          initial={{ opacity: 0, scale: 0.96, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 20 }}
          transition={{ duration: 0.25, ease: [0.25, 1, 0.5, 1] }}
          role="dialog"
          aria-modal="true"
          aria-label="Sweet Spot — Meeting Time Finder"
          onClick={(e) => e.stopPropagation()}
        >
        {/* ── HEADER ── */}
        <div className="meet-modal__header">
          <div className="meet-modal__icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="meet-modal__title-group">
            <div className="meet-modal__title">{tx.title}</div>
            <div className="meet-modal__subtitle">{tx.subtitle}</div>
          </div>
          <CitySelector
            cities={allCities}
            value={sourceId}
            onChange={onSetSource}
            activeCityIds={activeCityIds}
            onAddCity={onAddCity}
            onRemoveCity={onRemoveCity}
            onResetDefaults={onResetDefaults}
          />
          <button
            className="meet-modal__close"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="meet-modal__sep" />

        {/* ── HERO CARD (Rank #1) ── */}
        {heroSlot && (
          <div className="meet-modal__hero">
            <div className="meet-modal__hero-top">
              <div className="meet-modal__hero-badge">1</div>
              <div className="meet-modal__hero-center">
                <div className="meet-modal__hero-time-row">
                  <span className="meet-modal__hero-time">{heroTime.time}</span>
                  {heroTime.period && <span className="meet-modal__hero-period">{heroTime.period}</span>}
                  <span className="meet-modal__hero-tz">{sourceCityData?.code || 'BRT'}</span>
                  <span className="meet-modal__hero-dur">{tx.duration}</span>
                  <span className="meet-modal__hero-sep-dot">&middot;</span>
                  <span className="meet-modal__hero-summary">
                    <strong>{heroSlot.okCount} of {cityCount}</strong> {tx.officesInHours}
                  </span>
                </div>
              </div>
              <div className="meet-modal__hero-right">
                <span className="meet-modal__hero-qt">{tx.best}</span>
              </div>
            </div>
            <div className="meet-modal__hero-sep" />
            <div className="meet-modal__hero-cities">
              {heroSlot.cityScores.map((cs) => {
                const isSource = cs.id === sourceId;
                const pillClass = [
                  'meet-modal__pill',
                  cs.state === 'edge' ? 'meet-modal__pill--edge' : '',
                  cs.state === 'out' ? 'meet-modal__pill--out' : '',
                  isSource ? 'meet-modal__pill--source' : '',
                ].filter(Boolean).join(' ');

                return (
                  <span key={cs.id} className={pillClass}>
                    <span className="meet-modal__pill-flag">
                      {cities.find(c => c.id === cs.id)?.flag || ''}
                    </span>
                    <span className="meet-modal__pill-time">
                      {formatTimeFull(cs.hour, cs.minute, use24Hour)}
                    </span>
                    {isSource && <span className="meet-modal__pill-source-tag">{tx.source}</span>}
                    {!isSource && stateLabel(cs.state, tx) && (
                      <span className="meet-modal__pill-state">{stateLabel(cs.state, tx)}</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        <div className="meet-modal__sep" style={{ marginTop: 16 }} />

        {/* ── SECTION: Timeline ── */}
        <div className="meet-modal__section-label">
          <span className="meet-modal__section-text">{tx.sectionTimeline}</span>
          <span className="meet-modal__section-line" />
        </div>

        <div className="meet-modal__timeline">
          <div className="meet-modal__tl-grid" ref={trackRef}>
            {/* Gutter */}
            <div />
            {/* Axis labels */}
            <div className="meet-modal__tl-axis">
              {axisLabels.map((label, i) => (
                <span
                  key={i}
                  className={`meet-modal__tl-h${i === sweetAxisIdx ? ' meet-modal__tl-h--active' : ''}`}
                >
                  {label}
                </span>
              ))}
            </div>

            {/* City rows */}
            {cities.map((city) => {
              const cityScore = selectedSlot?.cityScores?.find(cs => cs.id === city.id);
              const cityOffset = cityScore?.offset ?? 0;
              const office = officeHoursPosition(sourceOffset, cityOffset);
              const localTime = cityScore
                ? formatTimeFull(cityScore.hour, cityScore.minute, use24Hour)
                : '--:--';
              const state = cityScore?.state ?? 'ok';
              const isSource = city.id === sourceId;

              return [
                <div key={`${city.id}-label`} className="meet-modal__tl-lw">
                  <span className="meet-modal__tl-flag">{city.flag}</span>
                  <div className="meet-modal__tl-name-col">
                    <span className={`meet-modal__tl-code${isSource ? ' meet-modal__tl-code--source' : ''}`}>
                      {city.code || city.name.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="meet-modal__tl-utc">{formatUtcOffset(cityOffset)}</span>
                  </div>
                </div>,
                <div key={`${city.id}-track`} className="meet-modal__tl-tw">
                  <div className="meet-modal__tl-track" onClick={handleTrackClick}>
                    <div
                      className="meet-modal__tl-office"
                      style={{ left: `${office.left}%`, width: `${office.width}%` }}
                    />
                    {selectedSlot && (
                      <div
                        className="meet-modal__tl-sweet"
                        style={{
                          left: `${selectedSlot.sweetLeft}%`,
                          width: `${selectedSlot.sweetWidth}%`,
                        }}
                      >
                        <div className="meet-modal__tl-sweet-handle">
                          <span /><span /><span />
                        </div>
                      </div>
                    )}
                    <div className={`meet-modal__tl-dot meet-modal__tl-dot--${state}`} />
                    <div className="meet-modal__tl-local-group">
                      <span className="meet-modal__tl-state">{stateWord(state, tx)}</span>
                      <span className="meet-modal__tl-local">{localTime}</span>
                    </div>
                  </div>
                </div>,
              ];
            })}

            {/* Legend */}
            <div className="meet-modal__tl-legend">
              <span className="meet-modal__tl-li">
                <span className="meet-modal__tl-ls meet-modal__tl-ls--office" />
                {tx.legendOffice}
              </span>
              <span className="meet-modal__tl-li">
                <span className="meet-modal__tl-ls meet-modal__tl-ls--sweet" />
                {tx.legendSweet}
              </span>
              <span className="meet-modal__tl-li">
                <span className="meet-modal__tl-ld meet-modal__tl-ld--ok" />
                {tx.legendOk}
              </span>
              <span className="meet-modal__tl-li">
                <span className="meet-modal__tl-ld meet-modal__tl-ld--edge" />
                {tx.legendEdge}
              </span>
              <span className="meet-modal__tl-li">
                <span className="meet-modal__tl-ld meet-modal__tl-ld--out" />
                {tx.legendOut}
              </span>
            </div>

            {/* Drag hint removed — interaction is self-discoverable */}
          </div>
        </div>

        <div className="meet-modal__sep" />

        {/* ── SECTION: Alternatives ── */}
        {suggestions.length > 1 && (
          <>
            <div className="meet-modal__section-label">
              <span className="meet-modal__section-text">{tx.sectionAlts}</span>
              <span className="meet-modal__section-line" />
            </div>

            <div className="meet-modal__alts">
              {suggestions.slice(1).map((slot, idx) => {
                const altTime = splitTime(formatTimeFull(slot.hour, slot.minute || 0, use24Hour), use24Hour);
                const qualityLabel = slot.quality === 'good' ? tx.good : tx.stretch;
                const realIdx = idx + 1;

                return (
                  <div
                    key={slot.rank}
                    className={`meet-modal__alt${selectedIdx === realIdx ? ' meet-modal__alt--selected' : ''}`}
                    onClick={() => handleSelectSuggestion(realIdx)}
                  >
                    <div className="meet-modal__alt-row">
                      <div className="meet-modal__alt-rank">{slot.rank}</div>
                      <span className="meet-modal__alt-time">{altTime.time}</span>
                      {altTime.period && <span className="meet-modal__alt-pm">{altTime.period}</span>}
                      <span className="meet-modal__alt-tz">{sourceCityData?.code || 'BRT'}</span>
                      <div className="meet-modal__alt-summary">
                        <strong>{slot.okCount} of {cityCount}</strong> {tx.inHours}
                      </div>
                      <span className={`meet-modal__alt-qt meet-modal__alt-qt--${slot.quality}`}>
                        {qualityLabel}
                      </span>
                    </div>
                    <div className="meet-modal__alt-pills">
                      {slot.cityScores.map((cs) => (
                        <span key={cs.id} className="meet-modal__alt-pill">
                          {cities.find(c => c.id === cs.id)?.flag || ''} {formatTimeFull(cs.hour, cs.minute, use24Hour)}
                        </span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Bottom padding */}
        <div style={{ height: 8 }} />
        </motion.div>
      </div>
  );
}

// ─── MeetPanel (portal export) ──────────────────────────────

export function MeetPanel({
  isOpen,
  onClose,
  suggestions,
  allSlots,
  cities,
  sourceCity,
  activeCityIds,
  allCities,
  use24Hour,
  onAddCity,
  onRemoveCity,
  onResetDefaults,
  onSetSource,
  sourceId,
  lang,
}) {
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <ModalContent
          key="meet-modal"
          onClose={onClose}
          suggestions={suggestions}
          allSlots={allSlots}
          cities={cities}
          sourceCity={sourceCity}
          activeCityIds={activeCityIds}
          allCities={allCities}
          use24Hour={use24Hour}
          onAddCity={onAddCity}
          onRemoveCity={onRemoveCity}
          onResetDefaults={onResetDefaults}
          onSetSource={onSetSource}
          sourceId={sourceId}
          lang={lang}
        />
      )}
    </AnimatePresence>,
    document.body
  );
}
