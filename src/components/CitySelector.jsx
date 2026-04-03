import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

// ─── helpers (inline so they work without Luxon inside this component) ─────
export function getCitySnapshot(timezone, sourceTimezone) {
  try {
    const now = new Date();
    // HH:MM in city's timezone
    const hm = new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
    const hour   = parseInt(hm.find(p => p.type === 'hour')?.value ?? 0, 10);
    const minute = parseInt(hm.find(p => p.type === 'minute')?.value ?? 0, 10);
    const time24 = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const period = hour >= 12 ? 'PM' : 'AM';
    const time12 = `${h12}:${String(minute).padStart(2, '0')} ${period}`;

    // YYYY-MM-DD for each zone (for day-offset calc)
    const cityDate   = new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(now);
    const sourceDate = new Intl.DateTimeFormat('en-CA', { timeZone: sourceTimezone }).format(now);
    const dayOffset  = Math.round((new Date(cityDate) - new Date(sourceDate)) / 86400000);

    // UTC offset as "UTC+5:30" etc.
    const local  = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    const utcNow = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const diff   = Math.round((local - utcNow) / 60000);
    const sign   = diff >= 0 ? '+' : '-';
    const abs    = Math.abs(diff);
    const oh = Math.floor(abs / 60);
    const om = abs % 60;
    const utcOffset = om > 0
      ? `UTC${sign}${oh}:${String(om).padStart(2, '0')}`
      : `UTC${sign}${oh}`;

    // Work state
    let workState = 'outside';
    if (hour >= 9 && hour < 18) workState = 'working';
    else if (hour >= 7 && hour < 9) workState = 'soon';

    return { time: time24, time12, dayOffset, utcOffset, workState };
  } catch { return { time: '--:--', dayOffset: 0, utcOffset: '', workState: 'outside' }; }
}

function WorkDot({ state }) {
  return <span className={`cs-work-dot cs-work-dot--${state}`} aria-hidden="true" />;
}

export function CitySelector({ cities, value, onChange, activeCityIds, onAddCity, onRemoveCity, onResetDefaults, use24Hour = true }) {
  const [isOpen, setIsOpen]         = useState(false);
  const [pos, setPos]               = useState({ top: 0, left: 0, width: 0 });
  const [query, setQuery]           = useState('');
  const [snapshots, setSnapshots]   = useState({});
  const [removingIds, setRemovingIds] = useState(new Set());
  const [pillPop, setPillPop]       = useState(false);

  const triggerRef   = useRef(null);
  const searchRef    = useRef(null);
  const listRef      = useRef(null);
  const sourceCity   = cities.find(c => c.id === value) || cities[0];
  const activeSet    = new Set(activeCityIds ?? []);
  const activeCount  = activeSet.size;

  // Compute city time snapshots whenever dropdown opens, then tick every second
  const refreshSnapshots = useCallback(() => {
    const sourceTz = sourceCity?.timezone ?? 'UTC';
    const next = {};
    cities.forEach(c => { next[c.id] = getCitySnapshot(c.timezone, sourceTz); });
    setSnapshots(next);
  }, [cities, sourceCity]);

  useEffect(() => {
    if (!isOpen) return;
    refreshSnapshots();
    const id = setInterval(refreshSnapshots, 1000);
    return () => clearInterval(id);
  }, [isOpen, refreshSnapshots]);

  // Keyboard: Escape + arrow navigation
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { setIsOpen(false); return; }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        const rows = listRef.current
          ? [...listRef.current.querySelectorAll('[data-cityrow]:not([data-hidden])')]
          : [];
        if (!rows.length) return;
        const idx  = rows.indexOf(document.activeElement);
        const next = e.key === 'ArrowDown'
          ? rows[(idx + 1) % rows.length]
          : rows[(idx - 1 + rows.length) % rows.length];
        next?.focus();
        next?.scrollIntoView({ block: 'nearest' });
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleOpen = () => {
    if (triggerRef.current) {
      const r = triggerRef.current.getBoundingClientRect();
      const DROPDOWN_H = 480; // generous max height budget
      const fitsBelow  = r.bottom + 8 + DROPDOWN_H < window.innerHeight - 16;
      setPos({
        top:   fitsBelow ? r.bottom + 8 : Math.max(8, r.top - DROPDOWN_H - 8),
        left:  Math.min(r.left, window.innerWidth - 360 - 8),
        width: Math.max(r.width, 360),
      });
    }
    setIsOpen(true);
    setTimeout(() => searchRef.current?.focus(), 0);
  };

  const triggerPill = () => {
    setPillPop(true);
    setTimeout(() => setPillPop(false), 350);
  };

  const handleAdd = (id) => {
    onAddCity?.(id);
    triggerPill();
  };

  const handleRemove = (id) => {
    setRemovingIds(prev => new Set(prev).add(id));
    setTimeout(() => {
      setRemovingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
      onRemoveCity?.(id);
      triggerPill();
    }, 220);
  };

  const handleReset = () => { onResetDefaults?.(); triggerPill(); };

  const q = query.trim().toLowerCase();
  const matches = (c) => !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q);

  const activeCities    = cities.filter(c => activeSet.has(c.id));
  const availableCities = cities.filter(c => !activeSet.has(c.id));
  const visibleActive   = activeCities.filter(matches);
  const visibleAvail    = availableCities.filter(matches);
  const noResults       = visibleActive.length === 0 && visibleAvail.length === 0;

  const renderRow = (city) => {
    const snap      = snapshots[city.id] ?? { time: '--:--', dayOffset: 0, utcOffset: '', workState: 'outside' };
    const isActive  = activeSet.has(city.id);
    const isAnchor  = city.id === 'saopaulo';
    const isSrc     = city.id === value;
    const isRemoving = removingIds.has(city.id);
    const hidden    = !matches(city);

    return (
      <div
        key={city.id}
        data-cityrow
        data-hidden={hidden || undefined}
        className={[
          'cs-row',
          isSrc      ? 'cs-row--source'   : '',
          isRemoving ? 'cs-row--removing' : '',
          hidden     ? 'cs-row--hidden'   : '',
        ].join(' ')}
        tabIndex={hidden ? -1 : 0}
        role="option"
        aria-selected={isSrc}
        onClick={() => { if (isActive || isAnchor) { onChange(city.id); setIsOpen(false); } }}
        onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && (isActive || isAnchor)) { e.preventDefault(); onChange(city.id); setIsOpen(false); } }}
        style={!isActive && !isAnchor ? { cursor: 'default' } : undefined}
      >
        {/* 1 -- work state dot */}
        <WorkDot state={snap.workState} />

        {/* 2 -- flag */}
        <span className="cs-flag" aria-hidden="true">{city.flag}</span>

        {/* 3 -- name + country */}
        <div className="cs-info">
          <span className="cs-name">
            {city.name}
            {isSrc && <span className="cs-source-badge">Source</span>}
          </span>
          <span className="cs-country">{city.country}</span>
        </div>

        {/* 4 -- time + day-offset + UTC offset */}
        <div className="cs-time">
          <div className="cs-time-top">
            {snap.dayOffset !== 0 && (
              <span className={`cs-day-badge cs-day-badge--${snap.dayOffset > 0 ? 'ahead' : 'behind'}`}>
                {snap.dayOffset > 0 ? `+${snap.dayOffset}d` : `${snap.dayOffset}d`}
              </span>
            )}
            <span className="cs-time-val">{use24Hour ? snap.time : snap.time12}</span>
          </div>
          {snap.utcOffset && <span className="cs-utc">{snap.utcOffset}</span>}
        </div>

        {/* 5 -- toggle button */}
        {isAnchor ? (
          <span className="cs-toggle cs-toggle--anchor" aria-label="Always active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
          </span>
        ) : (
          <motion.button
            className={`cs-toggle ${isActive ? 'cs-toggle--remove' : 'cs-toggle--add'}`}
            type="button"
            aria-label={isActive ? `Remove ${city.name}` : `Add ${city.name}`}
            title={isActive ? `Remove ${city.name} from view` : `Add ${city.name} to view`}
            whileHover={{ scale: 1.12 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              isActive ? handleRemove(city.id) : handleAdd(city.id);
            }}
          >
            {isActive ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            )}
          </motion.button>
        )}
      </div>
    );
  };

  return (
    <div className="city-selector">
      {/* Trigger */}
      <button
        ref={triggerRef}
        className={`city-selector__trigger${isOpen ? ' city-selector__trigger--open' : ''}`}
        onClick={handleOpen}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="city-selector__flag">{sourceCity.flag}</span>
        <span className="city-selector__name">{sourceCity.name}</span>
        <span className={`cs-count-pill${pillPop ? ' cs-count-pill--pop' : ''}`}>{activeCount}</span>
        <svg className="city-selector__chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && createPortal(
        <>
          <div className="city-selector__overlay" onClick={() => setIsOpen(false)} />
          <motion.div
            className="city-selector__dropdown"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.16, ease: [0.25, 1, 0.5, 1] }}
            role="listbox"
          >
            {/* Search */}
            <div className="cs-search">
              <svg className="cs-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <input
                ref={searchRef}
                className="cs-search__input"
                placeholder="Search cities..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                autoComplete="off"
                spellCheck="false"
              />
              {query && (
                <button className="cs-search__clear" type="button" onClick={() => setQuery('')} aria-label="Clear search">x</button>
              )}
            </div>

            {/* Work-state legend */}
            <div className="cs-legend">
              <span className="cs-legend__item"><span className="cs-work-dot cs-work-dot--working" />Working</span>
              <span className="cs-legend__sep" />
              <span className="cs-legend__item"><span className="cs-work-dot cs-work-dot--soon" />Starting soon</span>
              <span className="cs-legend__sep" />
              <span className="cs-legend__item"><span className="cs-work-dot cs-work-dot--outside" />Outside hours</span>
            </div>

            {/* Scrollable body */}
            <div className="cs-body" ref={listRef}>
              {/* Active section */}
              {visibleActive.length > 0 && (
                <div className="cs-section">
                  <div className="cs-section__header">
                    <span className="cs-section__label">Active</span>
                    <span className="cs-section__count">{visibleActive.length}</span>
                  </div>
                  {activeCities.map(renderRow)}
                </div>
              )}

              {/* Divider */}
              {visibleActive.length > 0 && visibleAvail.length > 0 && (
                <div className="cs-divider" />
              )}

              {/* Available section */}
              {visibleAvail.length > 0 && (
                <div className="cs-section">
                  <div className="cs-section__header">
                    <span className="cs-section__label">Available to Add</span>
                    <span className="cs-section__count">{visibleAvail.length}</span>
                  </div>
                  {availableCities.map(renderRow)}
                </div>
              )}

              {/* No results */}
              {noResults && (
                <div className="cs-empty">
                  <span>No cities match "{query}"</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="cs-footer">
              <button className="cs-footer__reset" type="button" onClick={handleReset}>Reset defaults</button>
              <div className="cs-footer__keys">
                <kbd>Up/Down</kbd> navigate &nbsp; <kbd>Esc</kbd> close
              </div>
              <button className="cs-footer__done" type="button" onClick={() => setIsOpen(false)}>Done</button>
            </div>
          </motion.div>
        </>,
        document.body
      )}
    </div>
  );
}
