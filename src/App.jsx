import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnchorCard, TimeCard } from './components/Cards';
import { HolidayPanel } from './components/HolidayPanel';
import { InputBar } from './components/InputBar';
import { MeetPanel } from './components/MeetPanel';
import { MobileDock } from './components/MobileDock';
import { MeshBackground } from './components/MeshBackground';
import { InstallBanner } from './components/InstallBanner';
import { useTimeConversion } from './hooks/useTimeConversion';
import { useMeetingSuggestions } from './hooks/useMeetingSuggestions';
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
    footerRole: 'Auth Tribe @ Pismo',
    footerPrivacy: 'Zero data captured. Not your timezone, not your preferences, not your IP, not even a single pixel of telemetry. Everything literally happens inside your browser tab.',
    holidayTitle: 'Pismo Holidays',
    meetTitle: 'Sweet Spot',
    meetSubtitle: 'Best meeting times across offices',
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
    footerOpenSrc: 'Codigo Aberto',
    footerRole: 'Auth Tribe @ Pismo',
    footerPrivacy: 'Nenhum dado captured. Nem fuso horário, preferências, IP ou qualquer telemetria. Tudo acontece dentro da aba do seu navegador.',
    holidayTitle: 'Feriados Pismo',
    meetTitle: 'Melhor Horario',
    meetSubtitle: 'Melhores horarios de reuniao entre escritorios',
  },
};

function WorkStateSection({ title, indicator, cities, sourceId, onSelect, use24Hour, lang, cardMode }) {
  if (cities.length === 0) return null;

  return (
    <section className="work-state-section">
      <header className="work-state-section__header work-state-section__header--centered">
        <div className="work-state-section__line work-state-section__line--left" />
        <span className={`work-state-section__indicator work-state-section__indicator--${indicator}`} />
        <div className="work-state-section__title">{title}</div>
        <span className={`work-state-section__count work-state-section__count--${indicator}`}>
          {cities.length}
        </span>
        <div className="work-state-section__line work-state-section__line--right" />
      </header>
      <div className="work-state-section__cards" data-card-mode={cardMode}>
        <AnimatePresence mode="popLayout">
          {cities.map((city, index) => (
            <TimeCard
              key={city.id}
              city={city}
              index={index}
              isSource={city.id === sourceId}
              onSelect={onSelect}
              use24Hour={use24Hour}
              lang={lang}
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
        <a href="https://linkedin.com/in/ashwingopalsamy" target="_blank" rel="noopener noreferrer" className="footer__author">Ashwin Gopalsamy</a>
        <span className="footer__heart">♥</span>
        <span className="footer__role">{tx.footerRole}</span>
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
  const [meetOpen, setMeetOpen] = useState(false);
  const [lang, setLang] = useState(() => {
    try { return localStorage.getItem('pismozones-lang') || 'en'; }
    catch { return 'en'; } // eslint-disable-line no-empty
  });

  const handleLangChange = (newLang) => {
    setLang(newLang);
    try { localStorage.setItem('pismozones-lang', newLang); } catch { /* ignore */ }
  };
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

  // ─── Browser back button closes modals ───
  const openModal = useCallback((setter) => {
    window.history.pushState({ modal: true }, '');
    setter(true);
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      if (showHolidayPanel) setShowHolidayPanel(false);
      if (meetOpen) setMeetOpen(false);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showHolidayPanel, meetOpen]);

  // ─── PWA shortcut URL params ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'meet') setMeetOpen(true);
    if (params.get('panel') === 'holidays') setShowHolidayPanel(true);
    if (params.toString()) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // ─── Service Worker update notification ───
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handleMessage = (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        setSwUpdateAvailable(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', handleMessage);
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) setSwUpdateAvailable(true);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setSwUpdateAvailable(true);
          }
        });
      });
    });
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  const handleSwUpdate = () => {
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
    });
    window.location.reload();
  };

  const {
    sourceDateTime,
    sourceId,
    use24Hour,
    brazilTime,
    groupedCities,
    sourceTimeComponents,
    sortedCities,
    allCities,
    activeCityIds,
    addCity,
    removeCity,
    resetToDefaults,
    updateTime,
    setToNow,
    setSource,
    toggleFormat,
  } = useTimeConversion();

  const meetData = useMeetingSuggestions({
    activeCityIds,
    sourceDateTime,
    sourceId,
  });

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {swUpdateAvailable && (
        <div className="sw-update-toast">
          <span>New version available</span>
          <button onClick={handleSwUpdate} type="button">Update</button>
        </div>
      )}
      <MeshBackground />
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
      >
        <InputBar
          sourceId={sourceId}
          cities={sortedCities}
          allCities={allCities}
          activeCityIds={activeCityIds}
          hour={sourceTimeComponents.hour}
          minute={sourceTimeComponents.minute}
          date={sourceTimeComponents.date}
          use24Hour={use24Hour}
          onSetSource={setSource}
          onUpdateTime={updateTime}
          onSetNow={setToNow}
          onToggleFormat={toggleFormat}
          onAddCity={addCity}
          onRemoveCity={removeCity}
          onResetDefaults={resetToDefaults}
          lang={lang}
          theme={theme}
          onToggleLang={handleLangChange}
          onToggleTheme={toggleTheme}
          onShowHoliday={() => openModal(setShowHolidayPanel)}
          meetMode={meetOpen}
          onToggleMeetMode={() => openModal(setMeetOpen)}
        />
      </motion.div>

      <motion.main
        className="main"
        id="main-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.3 }}
      >
        <AnchorCard
          city={brazilTime}
          use24Hour={use24Hour}
          onSelect={setSource}
          isSource={sourceId === 'saopaulo'}
          lang={lang}
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
              cardMode={groupedCities.working.length <= 4 ? 'full' : 'compact'}
            />
            <WorkStateSection
              title={tx.startingSoon}
              indicator="starting"
              cities={groupedCities.startingSoon}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              lang={lang}
              cardMode={groupedCities.startingSoon.length <= 4 ? 'full' : 'compact'}
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
              cardMode={groupedCities.working.length <= 4 ? 'full' : 'compact'}
            />
            <WorkStateSection
              title={tx.startingSoon}
              indicator="starting"
              cities={groupedCities.startingSoon}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              lang={lang}
              cardMode={groupedCities.startingSoon.length <= 4 ? 'full' : 'compact'}
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
          cardMode={groupedCities.outside.length > 1 ? 'compact' : 'full'}
        />
      </motion.main>

      <Footer tx={tx} />

      <HolidayPanel
        isOpen={showHolidayPanel}
        onClose={() => setShowHolidayPanel(false)}
        lang={lang}
      />

      <MeetPanel
        isOpen={meetOpen}
        onClose={() => setMeetOpen(false)}
        suggestions={meetData.suggestions}
        allSlots={meetData.allSlots}
        cities={meetData.cities}
        sourceCity={meetData.sourceCity}
        activeCityIds={activeCityIds}
        allCities={allCities}
        use24Hour={use24Hour}
        onAddCity={addCity}
        onRemoveCity={removeCity}
        onResetDefaults={resetToDefaults}
        onSetSource={setSource}
        sourceId={sourceId}
        lang={lang}
      />

      <InstallBanner lang={lang} />

      <MobileDock
        lang={lang}
        onToggleLang={handleLangChange}
        theme={theme}
        onToggleTheme={toggleTheme}
        use24Hour={use24Hour}
        onToggleFormat={toggleFormat}
        onShowHoliday={() => openModal(setShowHolidayPanel)}
        sourceId={sourceId}
        allCities={allCities}
        onSetNow={setToNow}
        date={sourceTimeComponents.date}
        hour={sourceTimeComponents.hour}
        minute={sourceTimeComponents.minute}
        meetMode={meetOpen}
        onToggleMeetMode={() => meetOpen ? setMeetOpen(false) : openModal(setMeetOpen)}
        onUpdateTime={updateTime}
      />
      <div aria-live="polite" className="sr-only" id="a11y-announcer" />
    </div>
  );
}
