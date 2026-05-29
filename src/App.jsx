import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AnchorCard, TimeCard } from './components/Cards';
import { HolidayPanel } from './components/HolidayPanel';
import { AppBar } from './components/AppBar';
import { MobileTopBar } from './components/MobileTopBar';
import { MobileBottomBar } from './components/MobileBottomBar';
import { MeshBackground } from './components/MeshBackground';
import { InstallBanner } from './components/InstallBanner';
import { useTimeConversion } from './hooks/useTimeConversion';
import { useNaturalLanguageConversion } from './hooks/useNaturalLanguageConversion';
import { NLResultSection } from './components/NLResultSection';
import { decodeShareLink, buildShareUrl } from './hooks/useShareableLink';
import { useIsMobile } from './hooks/useIsMobile';
import './styles/styles.css';

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
  const isMobile = useIsMobile();

  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem('pismo-theme');
    if (stored) return stored;
    return getSystemTheme();
  });

  const [isExplicitChoice, setIsExplicitChoice] = useState(() => {
    return localStorage.getItem('pismo-theme-explicit') === 'true';
  });

  const [showHolidayPanel, setShowHolidayPanel] = useState(false);

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
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [showHolidayPanel]);

  // ─── PWA shortcut URL params ───
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('panel') === 'holidays') setShowHolidayPanel(true);
    if (params.toString()) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  // ─── Service Worker update notification ───
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) setSwUpdateAvailable(true);
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          // Only show toast when a NEW SW replaces an EXISTING one (not first install)
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setSwUpdateAvailable(true);
          }
        });
      });
    });
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
    sourceCity,
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
    setActiveCities,
    updateTime,
    setToNow,
    setSource,
    toggleFormat,
  } = useTimeConversion();

  // ─── Shareable links ───
  const [isSharedView, setIsSharedView] = useState(false);

  // ─── NL query ───
  const [query, setQuery] = useState('');
  const applyTimerRef = useRef(null);

  const conversion = useNaturalLanguageConversion({
    query,
    sourceDateTime,
    sourceId,
    use24Hour,
    activeCityIds,
    setSource,
    updateTime,
    setActiveCities,
  });

  // IDs shown in NL result cards — suppressed from WorkState sections below to avoid duplicates
  // Using parsed.destinationIds (raw city ID strings) rather than results.map(r => r.id)
  // to avoid any memo-lag between the hook's parsed output and its computed results array
  const nlResultIds = new Set(
    conversion.status === 'ready' ? (conversion.parsed?.destinationIds ?? []) : []
  );

  // Apply the conversion 400ms after the query resolves. Uses a ref-based timer so that
  // clearing the input (signature → undefined) does NOT cancel a pending apply — only a
  // NEW valid signature cancels the previous timer. This prevents the "reset to now" bug
  // where clearing quickly before the 400ms window would abort the time update.
  useEffect(() => {
    if (conversion.status !== 'ready') return;
    clearTimeout(applyTimerRef.current);
    applyTimerRef.current = setTimeout(() => {
      conversion.apply();
      setIsSharedView(false);
    }, 400);
  }, [conversion.parsed?.signature]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(applyTimerRef.current), []);

  useEffect(() => {
    // Read share hash from ?share= param (path-based) or #hash (legacy)
    const params = new URLSearchParams(window.location.search);
    const shareParam = params.get('share');
    const hashFrag = window.location.hash;
    const raw = shareParam || (hashFrag && hashFrag.length >= 2 ? hashFrag : null);
    if (!raw) return;

    const decoded = decodeShareLink(raw);
    if (!decoded) return;

    // Apply shared state: source, time, and city list
    setSource(decoded.sourceId);
    updateTime({ hour: decoded.hour, minute: decoded.minute, date: decoded.date });
    setActiveCities(decoded.cityIds);

    setIsSharedView(true);
    window.history.replaceState({}, '', '/');

    // Auto-dismiss toast after 3s, leave reset pill
    setTimeout(() => {
      const toast = document.getElementById('shared-toast');
      if (toast) toast.style.display = 'none';
    }, 3000);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(
      sourceId,
      sourceTimeComponents.hour,
      sourceTimeComponents.minute,
      sourceTimeComponents.date,
      activeCityIds,
    );
    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Pismo Zones', url });
      } catch { /* user cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(url);
      } catch { /* clipboard failed */ }
    }
  }, [sourceId, sourceTimeComponents, activeCityIds]);

  const handleResetShared = useCallback(() => {
    setIsSharedView(false);
    setToNow();
  }, [setToNow]);

  const handleSetNow = useCallback(() => {
    setToNow();
    setQuery('');
  }, [setToNow]);

  // Smart card mode: working/starting always full, outside goes mini when congested
  // Filter NL destination cities from WorkState sections — avoid showing the same city twice
  const visWorking = groupedCities.working.filter(c => !nlResultIds.has(c.id));
  const visStartingSoon = groupedCities.startingSoon.filter(c => !nlResultIds.has(c.id));
  const visOutside = groupedCities.outside.filter(c => !nlResultIds.has(c.id));

  const totalOtherCities = visWorking.length + visStartingSoon.length + visOutside.length;
  const isCongested = totalOtherCities > 5;
  const getCardMode = () => 'full'; // working + starting always full
  const outsideCardMode = isCongested ? 'mini' : 'full';

  return (
    <div className="app">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {swUpdateAvailable && (
        <div className="sw-update-toast">
          <span>New version available</span>
          <button onClick={handleSwUpdate} type="button">Update</button>
        </div>
      )}
      {isSharedView && (
        <div className="shared-toast" id="shared-toast">
          <span>Viewing shared time</span>
        </div>
      )}
      <MeshBackground />
      {isMobile ? (
        <>
          <MobileTopBar
            sourceCity={sourceCity}
            sourceTimeComponents={sourceTimeComponents}
            use24Hour={use24Hour}
          />
          <MobileBottomBar
            sourceId={sourceId}
            use24Hour={use24Hour}
            activeCityIds={activeCityIds}
            allCities={allCities}
            onSetSource={setSource}
            onAddCity={addCity}
            onRemoveCity={removeCity}
            onResetDefaults={resetToDefaults}
            theme={theme}
            onToggleTheme={toggleTheme}
            onShowHoliday={() => openModal(setShowHolidayPanel)}
            onShare={handleShare}
            onSetNow={handleSetNow}
            query={query}
            setQuery={setQuery}
            sourceTimeComponents={sourceTimeComponents}
            updateTime={updateTime}
          />
        </>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
        >
          <AppBar
            sourceId={sourceId}
            use24Hour={use24Hour}
            activeCityIds={activeCityIds}
            allCities={allCities}
            onSetSource={setSource}
            onSetActiveCities={setActiveCities}
            onAddCity={addCity}
            onRemoveCity={removeCity}
            onResetDefaults={resetToDefaults}
            onToggleFormat={toggleFormat}
            theme={theme}
            onToggleTheme={toggleTheme}
            onShowHoliday={() => openModal(setShowHolidayPanel)}
            onShare={handleShare}
            onSetNow={handleSetNow}
            query={query}
            setQuery={setQuery}
            conversionStatus={conversion.status}
          />
        </motion.div>
      )}

      <motion.main
        className="main"
        id="main-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.12, duration: 0.3 }}
      >
        {/* NL result section — replaces primary card position when query resolves */}
        <AnimatePresence mode="wait">
          {conversion.status === 'ready' && conversion.results?.length > 0 && (
            <NLResultSection
              key="nl-result"
              conversion={conversion}
              use24Hour={use24Hour}
              onSelect={setSource}
            />
          )}
        </AnimatePresence>

        {/* São Paulo anchor — hidden when it's already shown as an NL destination */}
        {!(conversion.status === 'ready' && conversion.results?.some(r => r.id === 'saopaulo')) && (
          <AnchorCard
            city={brazilTime}
            use24Hour={use24Hour}
            onSelect={setSource}
            isSource={sourceId === 'saopaulo'}
            lang="en"
          />
        )}

        {visWorking.length === 1 && visStartingSoon.length === 1 ? (
          <div className="work-state-combined-row">
            <WorkStateSection
              title="WORKING HOURS"
              indicator="working"
              cities={visWorking}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              cardMode={getCardMode(visWorking.length)}
            />
            <WorkStateSection
              title="STARTING SOON"
              indicator="starting"
              cities={visStartingSoon}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              cardMode={getCardMode(visStartingSoon.length)}
            />
          </div>
        ) : (
          <>
            <WorkStateSection
              title="WORKING HOURS"
              indicator="working"
              cities={visWorking}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              cardMode={getCardMode(visWorking.length)}
            />
            <WorkStateSection
              title="STARTING SOON"
              indicator="starting"
              cities={visStartingSoon}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
              cardMode={getCardMode(visStartingSoon.length)}
            />
          </>
        )}

        <WorkStateSection
          title="OUTSIDE HOURS"
          indicator="outside"
          cities={visOutside}
          sourceId={sourceId}
          onSelect={setSource}
          use24Hour={use24Hour}
          cardMode={outsideCardMode}
        />
      </motion.main>

      <Footer tx={{
        footerLocal: '100% Local · Everything happens within your browser',
        footerOpenSrc: 'Open Source',
        footerRole: 'Auth Tribe @ Pismo',
        footerPrivacy: 'Zero data captured. Not your timezone, not your preferences, not your IP, not even a single pixel of telemetry. Everything literally happens inside your browser tab.',
      }} />

      <HolidayPanel
        isOpen={showHolidayPanel}
        onClose={() => setShowHolidayPanel(false)}
        lang="en"
      />

      <InstallBanner lang="en" />
      <div aria-live="polite" className="sr-only" id="a11y-announcer" />
    </div>
  );
}
