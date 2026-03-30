// HolidayPanel.jsx — Slide-in panel showing 2026 public holidays per Pismo office country.
// Tabs: India · Brazil · UK · USA · Poland
import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import { DateTime } from 'luxon';

// ─── Panel labels (only strings this component needs from i18n) ───
const PANEL_LABELS = {
  en: { holidayTitle: 'Pismo Holidays' },
  pt: { holidayTitle: 'Feriados Pismo' },
};

// ─── Holiday data ─────────────────────────────────────────────────

const INDIA_HOLIDAYS_2026 = [
  { name: "New Year's Day",                     date: '2026-01-01' },
  { name: 'Republic Day',                        date: '2026-01-26' },
  { name: 'Chhatrapati Shivaji Maharaj Jayanti', date: '2026-02-19' },
  { name: 'Holi',                                date: '2026-03-03' },
  { name: 'Gudhi Padwa',                         date: '2026-03-19' },
  { name: 'Good Friday',                         date: '2026-04-03' },
  { name: 'May Day',                             date: '2026-05-01' },
  { name: 'Bakrid',                              date: '2026-05-28' },
  { name: 'Eid-Milad',                           date: '2026-08-26' },
  { name: 'Vinayaka Chaturthi',                  date: '2026-09-14' },
  { name: 'Gandhi Jayanthi',                     date: '2026-10-02' },
  { name: 'Naraka Chaturdashi (Diwali)',          date: '2026-11-09' },
  { name: 'Diwali Balipadyami',                  date: '2026-11-10' },
  { name: 'Christmas',                           date: '2026-12-25' },
];

const BRAZIL_HOLIDAYS_2026 = [
  { name: 'Confraternização Universal',  date: '2026-01-01', note: "New Year's Day" },
  { name: 'Aniversário de São Paulo',    date: '2026-01-25', note: 'City of São Paulo Anniversary' },
  { name: 'Carnaval',                    date: '2026-02-16', note: 'Carnival' },
  { name: 'Carnaval',                    date: '2026-02-17', note: 'Carnival' },
  { name: 'Quarta-feira de Cinzas',      date: '2026-02-18', note: 'Ash Wednesday – Half Day' },
  { name: 'Paixão de Cristo',            date: '2026-04-03', note: 'Good Friday' },
  { name: 'Páscoa',                      date: '2026-04-05', note: 'Easter Sunday' },
  { name: 'Tiradentes',                  date: '2026-04-21', note: 'Tiradentes Day' },
  { name: 'Dia do Trabalho',             date: '2026-05-01', note: 'Labour Day' },
  { name: 'Corpus Christi',              date: '2026-06-04', note: 'Corpus Christi' },
  { name: 'Constituição de 1932',        date: '2026-07-09', note: 'Constitutionalist Revolution' },
  { name: 'Independência do Brasil',     date: '2026-09-07', note: 'Independence Day' },
  { name: 'Nossa Senhora de Aparecida',  date: '2026-10-12', note: 'Our Lady of Aparecida' },
  { name: 'Dia de Finados',              date: '2026-11-02', note: "All Souls' Day" },
  { name: 'Proclamação da República',    date: '2026-11-15', note: 'Republic Day' },
  { name: 'Dia da Consciência Negra',    date: '2026-11-20', note: 'Black Consciousness Day' },
  { name: 'Natal',                       date: '2026-12-25', note: 'Christmas Day' },
];

const UK_HOLIDAYS_2026 = [
  { name: "New Year's Day",        date: '2026-01-01' },
  { name: 'Good Friday',           date: '2026-04-03' },
  { name: 'Easter Monday',         date: '2026-04-06' },
  { name: 'Early May Bank Holiday',date: '2026-05-04' },
  { name: 'Spring Bank Holiday',   date: '2026-05-25' },
  { name: 'Summer Bank Holiday',   date: '2026-08-31' },
  { name: 'Christmas Day',         date: '2026-12-25' },
  { name: 'Boxing Day',            date: '2026-12-26', note: 'Substitute day' },
];

const USA_HOLIDAYS_2026 = [
  { name: "New Year's Day",              date: '2026-01-01' },
  { name: 'Martin Luther King Jr. Day',  date: '2026-01-19' },
  { name: "Presidents' Day",             date: '2026-02-16' },
  { name: 'Memorial Day',                date: '2026-05-25' },
  { name: 'Juneteenth',                  date: '2026-06-19' },
  { name: 'Independence Day',            date: '2026-07-03', note: 'Observed (Jul 4)' },
  { name: 'Labor Day',                   date: '2026-09-07' },
  { name: 'Columbus Day',                date: '2026-10-12' },
  { name: 'Veterans Day',                date: '2026-11-11' },
  { name: 'Thanksgiving Day',            date: '2026-11-26' },
  { name: 'Day After Thanksgiving',      date: '2026-11-27' },
  { name: 'Christmas Day',               date: '2026-12-25' },
];

const POLAND_HOLIDAYS_2026 = [
  { name: "New Year's Day",        date: '2026-01-01' },
  { name: 'Epiphany',              date: '2026-01-06' },
  { name: 'Easter Sunday',         date: '2026-04-05' },
  { name: 'Easter Monday',         date: '2026-04-06' },
  { name: 'Labour Day',            date: '2026-05-01' },
  { name: 'Constitution Day',      date: '2026-05-03' },
  { name: 'Whit Sunday',           date: '2026-05-24' },
  { name: 'Corpus Christi',        date: '2026-06-04' },
  { name: 'Assumption Day',        date: '2026-08-15' },
  { name: "All Saints' Day",       date: '2026-11-01' },
  { name: 'Independence Day',      date: '2026-11-11' },
  { name: 'Christmas Eve',         date: '2026-12-24' },
  { name: 'Christmas Day',         date: '2026-12-25' },
  { name: 'Second Day of Christmas',date: '2026-12-26' },
];

// ─── Country registry ──────────────────────────────────────────────
const COUNTRIES = {
  india:  { id: 'india',  flag: '🇮🇳', name: 'India',   timezone: 'Asia/Kolkata',          holidays: INDIA_HOLIDAYS_2026  },
  brazil: { id: 'brazil', flag: '🇧🇷', name: 'Brazil',  timezone: 'America/Sao_Paulo',     holidays: BRAZIL_HOLIDAYS_2026 },
  uk:     { id: 'uk',     flag: '🇬🇧', name: 'UK',      timezone: 'Europe/London',         holidays: UK_HOLIDAYS_2026     },
  usa:    { id: 'usa',    flag: '🇺🇸', name: 'USA',     timezone: 'America/Chicago',       holidays: USA_HOLIDAYS_2026    },
  poland: { id: 'poland', flag: '🇵🇱', name: 'Poland',  timezone: 'Europe/Warsaw',         holidays: POLAND_HOLIDAYS_2026 },
};

// ─── Helpers ───────────────────────────────────────────────────────

function processHolidays(holidays, timezone) {
  const nowLocal = DateTime.now().setZone(timezone).startOf('day');
  let foundNext = false;
  return holidays.map(h => {
    const dt = DateTime.fromISO(h.date, { zone: timezone }).startOf('day');
    const diff = Math.round(dt.diff(nowLocal, 'days').days);
    let state;
    if (diff < 0) state = 'past';
    else if (diff === 0) state = 'today';
    else if (!foundNext) { foundNext = true; state = 'next'; }
    else state = 'upcoming';
    return { ...h, dt, state };
  });
}

// ─── HolidayList ───────────────────────────────────────────────────
function HolidayList({ country, lang }) {
  const contentRef = useRef(null);
  const scrollTargetRef = useRef(null);
  const processed = processHolidays(country.holidays, country.timezone);

  const monthGroups = {};
  processed.forEach(h => {
    const key = h.dt.toFormat('MMMM').toUpperCase();
    if (!monthGroups[key]) monthGroups[key] = [];
    monthGroups[key].push(h);
  });

  const firstActiveMonth = processed.find(
    h => h.state === 'today' || h.state === 'next'
  )?.dt.toFormat('MMMM').toUpperCase();

  useEffect(() => {
    if (!scrollTargetRef.current) return;
    const t = setTimeout(() => {
      scrollTargetRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);
    return () => clearTimeout(t);
  }, []);

  // lang-aware: Brazil has PT name + EN note; other countries note = context only
  const getLabel = (h) => (lang === 'en' && h.note) ? h.note : h.name;

  // Build flat index for stagger across all month groups
  let flatIndex = 0;
  const monthEntries = Object.entries(monthGroups);

  return (
    <div ref={contentRef} className="holiday-panel__content">
      {monthEntries.map(([month, holidays]) => (
        <div
          key={month}
          className="holiday-month-group"
          ref={month === firstActiveMonth ? scrollTargetRef : null}
        >
          <div className="holiday-month-label">{month}</div>
          {holidays.map(h => {
            const idx = flatIndex++;
            return (
              <motion.div
                key={h.date + h.name}
                className={`holiday-item holiday-item--${h.state}`}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: 0.12 + idx * 0.056,
                  duration: 0.2,
                  ease: [0.2, 0.8, 0.2, 1],
                }}
              >
                <span className="holiday-dot" />
                <span className="holiday-name">{getLabel(h)}</span>
                <div className="holiday-item__right">
                  {h.state === 'today' && <span className="badge holiday-chip--today">TODAY</span>}
                  {h.state === 'next'  && <span className="badge holiday-chip--next">NEXT</span>}
                  <span className="holiday-date">{h.dt.toFormat('MMM d')}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── PanelContent ──────────────────────────────────────────────────
function HeroCard({ country }) {
  const processed = processHolidays(country.holidays, country.timezone);
  const nextUp = processed.find(h => h.state === 'today' || h.state === 'next');
  if (!nextUp) return null;

  const nowLocal = DateTime.now().setZone(country.timezone).startOf('day');
  const daysUntil = Math.round(nextUp.dt.diff(nowLocal, 'days').days);

  return (
    <div className={`holiday-hero holiday-hero--${country.id}`}>
      <div className="holiday-hero__icon">{country.flag}</div>
      <div className="holiday-hero__info">
        <span className="holiday-hero__name">{nextUp.name}</span>
        <span className="holiday-hero__date">{nextUp.dt.toFormat('EEE, MMM d')}</span>
      </div>
      <div className="holiday-hero__countdown">
        <span className="holiday-hero__days">{daysUntil}</span>
        <span className="holiday-hero__label">
          {daysUntil === 0 ? 'today' : daysUntil === 1 ? 'day' : 'days'}
        </span>
      </div>
    </div>
  );
}

function PanelContent({ onClose, lang }) {
  const [activeTab, setActiveTab] = useState('brazil');
  const tx = PANEL_LABELS[lang] ?? PANEL_LABELS.en;
  const country = COUNTRIES[activeTab];

  return (
    <>
      <motion.div
        className="holiday-panel__backdrop"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
      />
      <motion.div
        className="holiday-panel"
        initial={{ x: window.innerWidth <= 768 ? 0 : '100%', y: window.innerWidth <= 768 ? '100%' : 0 }}
        animate={{ x: 0, y: 0 }}
        exit={{ x: window.innerWidth <= 768 ? 0 : '100%', y: window.innerWidth <= 768 ? '100%' : 0 }}
        transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
        role="dialog"
        aria-modal="true"
        aria-label="Pismo Holidays 2026"
      >
        <div className="holiday-panel__header">
          <div className="holiday-panel__header-top">
            <div className="holiday-panel__title">
              <span className="holiday-panel__active-flag">{country.flag}</span>
              <div className="holiday-panel__title-text">
                <div className="holiday-panel__title-main">{tx.holidayTitle}</div>
                <div className="holiday-panel__title-sub">{country.name} · 2026</div>
              </div>
            </div>
            <button
              className="holiday-panel__close"
              onClick={onClose}
              aria-label="Close holiday panel"
              type="button"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          <div className="holiday-tabs">
            {Object.values(COUNTRIES).map(c => (
              <button
                key={c.id}
                className={`holiday-tab${activeTab === c.id ? ' holiday-tab--active' : ''}`}
                onClick={() => setActiveTab(c.id)}
                aria-label={c.name}
                data-label={c.name}
                type="button"
              >
                <span className="holiday-tab__flag">{c.flag}</span>
              </button>
            ))}
          </div>
        </div>

        <HeroCard country={country} />

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.16, ease: [0.2, 0.8, 0.2, 1] }}
            style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
          >
            <HolidayList country={country} lang={lang === 'pt' ? 'pt' : 'en'} />
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </>
  );
}

// ─── Export ────────────────────────────────────────────────────────
export function HolidayPanel({ isOpen, onClose, lang = 'en' }) {
  return createPortal(
    <AnimatePresence>
      {isOpen && <PanelContent key="holiday-panel" onClose={onClose} lang={lang} />}
    </AnimatePresence>,
    document.body
  );
}
