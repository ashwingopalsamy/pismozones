import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AnchorCard, TimeCard } from './components/Cards';
import { HolidayPanel } from './components/HolidayPanel';
import { InputBar } from './components/InputBar';
import { useTimeConversion } from './hooks/useTimeConversion';
import './styles/styles.css';

// ─── i18n ──────────────────────────────────────────────────
const T = {
  en: {
    subtitle: 'Track timezones across our globally distributed workplaces.',
    source: 'Source',
    on: 'On',
    at: 'At',
    now: 'Now',
    working: 'WORKING HOURS',
    startingSoon: 'STARTING SOON',
    outside: 'OUTSIDE HOURS',
    footerLocal: '100% Local · Everything happens within your browser',
    footerOpenSrc: 'Open Source',
    footerBy: 'Crafted with',
    footerRole: 'Engineering, PCI-ISO, Auth Tribe @ Pismo',
    footerPrivacy: 'Zero data captured. Not your timezone, not your preferences, not your IP, not even a single pixel of telemetry. Everything literally happens inside your browser tab.',
    holidayTitle: 'Pismo Holidays',
  },
  pt: {
    subtitle: 'Acompanhe os fusos horários dos nossos escritórios ao redor do mundo.',
    source: 'Origem',
    on: 'Em',
    at: 'Às',
    now: 'Agora',
    working: 'EM HORÁRIO',
    startingSoon: 'INÍCIO EM BREVE',
    outside: 'FORA DO HORÁRIO',
    footerLocal: '100% Local · Tudo acontece no seu navegador',
    footerOpenSrc: 'Código Aberto',
    footerBy: 'Criado com',
    footerRole: 'Engenharia, PCI-ISO, Auth Tribe @ Pismo',
    footerPrivacy: 'Nenhum dado captured. Nem fuso horário, preferências, IP ou qualquer telemetria. Tudo acontece dentro da aba do seu navegador.',
    holidayTitle: 'Feriados Pismo',
  },
};

function WorkStateSection({ title, indicator, cities, sourceId, onSelect, use24Hour, lang }) {
  if (cities.length === 0) return null;

  return (
    <section className="work-state-section">
      <header className="work-state-section__header">
        <div className="work-state-section__title">
          <span className={`work-state-section__indicator work-state-section__indicator--${indicator}`} />
          {title}
        </div>
      </header>
      <div className="work-state-section__cards">
        <AnimatePresence>
          {cities.map(city => (
            <TimeCard
              key={city.id}
              city={city}
              isSource={city.id === sourceId}
              onSelect={onSelect}
              use24Hour={use24Hour}
            />
          ))}
        </AnimatePresence>
      </div>
    </section>
  );
}

function Footer({ tx }) {
  return (
    <footer className="footer">
      <div className="footer__main">
        <span className="footer__privacy-wrapper">
          <span className="footer__privacy-trigger">🔒</span>
          <span className="footer__privacy-tooltip">{tx.footerPrivacy}</span>
        </span>
        {tx.footerLocal} · <a href="https://github.com/ashwingopalsamy/pismozones" target="_blank" rel="noopener noreferrer">{tx.footerOpenSrc}</a>
      </div>
      <div className="footer__attribution">
        {tx.footerBy} <span className="footer__heart">♥</span> by <a href="https://linkedin.com/in/ashwingopalsamy" target="_blank" rel="noopener noreferrer" className="footer__author">Ashwin Gopalsamy</a> · {tx.footerRole}
      </div>
    </footer>
  );
}

const getSystemTheme = () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return 'dark';
};

export default function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('pismo-theme');
    if (stored) return stored;
    return getSystemTheme();
  });

  const [isExplicitChoice, setIsExplicitChoice] = useState(() => {
    return localStorage.getItem('pismo-theme-explicit') === 'true';
  });

  const [showHolidayPanel, setShowHolidayPanel] = useState(false);
  const [lang, setLang] = useState('en');
  const tx = T[lang];

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('pismo-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (isExplicitChoice) return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => setTheme(e.matches ? 'dark' : 'light');

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [isExplicitChoice]);

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
    setIsExplicitChoice(true);
    localStorage.setItem('pismo-theme-explicit', 'true');
  };

  const {
    sourceId,
    use24Hour,
    brazilTime,
    groupedCities,
    sourceTimeComponents,
    cities,
    sortedCities,
    updateTime,
    setToNow,
    setSource,
    toggleFormat,
  } = useTimeConversion();

  return (
    <div className="app">
      <InputBar
        sourceId={sourceId}
        cities={sortedCities}
        hour={sourceTimeComponents.hour}
        minute={sourceTimeComponents.minute}
        date={sourceTimeComponents.date}
        use24Hour={use24Hour}
        onSetSource={setSource}
        onUpdateTime={updateTime}
        onSetNow={setToNow}
        onToggleFormat={toggleFormat}
        lang={lang}
        theme={theme}
        onToggleLang={setLang}
        onToggleTheme={toggleTheme}
        onShowHoliday={() => setShowHolidayPanel(true)}
      />

      <main className="main">
        <AnchorCard
          city={brazilTime}
          use24Hour={use24Hour}
          onSelect={setSource}
          isSource={sourceId === 'saopaulo'}
        />

        {groupedCities.working.length === 1 && groupedCities.startingSoon.length === 1 ? (
          <div className="work-state-combined-row">
            <WorkStateSection
              title={tx.working}
              indicator="working"
              cities={groupedCities.working}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              lang={lang}
            />
            <WorkStateSection
              title={tx.startingSoon}
              indicator="starting"
              cities={groupedCities.startingSoon}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              lang={lang}
            />
          </div>
        ) : (
          <>
            <WorkStateSection
              title={tx.working}
              indicator="working"
              cities={groupedCities.working}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              lang={lang}
            />
            <WorkStateSection
              title={tx.startingSoon}
              indicator="starting"
              cities={groupedCities.startingSoon}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              lang={lang}
            />
          </>
        )}

        <WorkStateSection
          title={tx.outside}
          indicator="outside"
          cities={groupedCities.outside}
          sourceId={sourceId}
          onSelect={setSource}
          use24Hour={use24Hour}
          lang={lang}
        />
      </main>

      <Footer tx={tx} />

      <HolidayPanel
        isOpen={showHolidayPanel}
        onClose={() => setShowHolidayPanel(false)}
        lang={lang}
      />
    </div>
  );
}
