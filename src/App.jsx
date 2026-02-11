import { useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AnchorCard } from './components/AnchorCard';
import { TimeCard } from './components/TimeCard';
import { useTimeConversion } from './hooks/useTimeConversion';

import './styles/tokens.css';
import './styles/layout.css';
import './styles/components.css';

function ThemeToggle({ theme, onToggle }) {
  return (
    <button className="theme-toggle" onClick={onToggle} aria-label="Toggle theme" type="button">
      {theme === 'dark' ? (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

import { InputBar } from './components/InputBar';

function WorkStateSection({ title, indicator, cities, sourceId, onSelect, use24Hour }) {
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

function Footer() {
  return (
    <footer className="footer">
      <div className="footer__main">
        <span className="footer__privacy-wrapper">
          <span className="footer__privacy-trigger">🔒</span>
          <span className="footer__privacy-tooltip">
            Zero data captured. Not your timezone, not your preferences, not your IP, not even a single pixel of telemetry. Everything literally happens inside your browser tab.
          </span>
        </span>
        100% Local · Everything happens within your browser · <a href="https://github.com/ashwingopalsamy/pismozones" target="_blank" rel="noopener noreferrer">Open Source</a>
      </div>
      <div className="footer__attribution">
        Crafted with <span className="footer__heart">♥</span> by <a href="https://linkedin.com/in/ashwingopalsamy" target="_blank" rel="noopener noreferrer" className="footer__author">Ashwin Gopalsamy</a> · Engineering, PCI-ISO, Auth Tribe @ Pismo
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
    updateTime,
    setToNow,
    setSource,
    toggleFormat,
  } = useTimeConversion();

  return (
    <div className="app">
      <header className="header">
        <div className="header__brand">
          <svg className="header__logo" viewBox="0 0 32 32">
            <defs>
              <linearGradient id="globe" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4A90D9"/>
                <stop offset="50%" stopColor="#F5A623"/>
                <stop offset="100%" stopColor="#E8984A"/>
              </linearGradient>
            </defs>
            <circle cx="16" cy="16" r="14" fill="url(#globe)" opacity="0.9"/>
            <ellipse cx="16" cy="16" rx="6" ry="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
            <line x1="2" y1="16" x2="30" y2="16" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
            <circle cx="16" cy="16" r="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.3"/>
          </svg>
          <div className="header__text">
            <h1 className="header__title">Pismo Zones</h1>
            <p className="header__subtitle">Track timezones across our globally distributed workplaces.</p>
          </div>
        </div>
        <ThemeToggle theme={theme} onToggle={toggleTheme} />
      </header>

      <InputBar
        sourceId={sourceId}
        cities={cities}
        hour={sourceTimeComponents.hour}
        minute={sourceTimeComponents.minute}
        date={sourceTimeComponents.date}
        use24Hour={use24Hour}
        onSetSource={setSource}
        onUpdateTime={updateTime}
        onSetNow={setToNow}
        onToggleFormat={toggleFormat}
      />

      <main className="main">
        <AnchorCard city={brazilTime} use24Hour={use24Hour} />

        {groupedCities.working.length === 1 && groupedCities.startingSoon.length === 1 ? (
          <div className="work-state-combined-row">
            <WorkStateSection
              title="WORKING HOURS"
              indicator="working"
              cities={groupedCities.working}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
            />
            <WorkStateSection
              title="STARTING SOON"
              indicator="starting"
              cities={groupedCities.startingSoon}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
            />
          </div>
        ) : (
          <>
            <WorkStateSection
              title="WORKING HOURS"
              indicator="working"
              cities={groupedCities.working}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
            />

            <WorkStateSection
              title="STARTING SOON"
              indicator="starting"
              cities={groupedCities.startingSoon}
              sourceId={sourceId}
              onSelect={setSource}
              use24Hour={use24Hour}
            />
          </>
        )}

        <WorkStateSection
          title="OUTSIDE HOURS"
          indicator="outside"
          cities={groupedCities.outside}
          sourceId={sourceId}
          onSelect={setSource}
          use24Hour={use24Hour}
        />
      </main>

      <Footer />
    </div>
  );
}
