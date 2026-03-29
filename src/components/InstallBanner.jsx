import { useState, useEffect, useRef, useCallback } from 'react';
import { useIsMobile } from './MobileDock';

const DISMISS_KEY = 'pismozones-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;
}

function isDismissed() {
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const { timestamp } = JSON.parse(raw);
    return Date.now() - timestamp < DISMISS_DURATION;
  } catch {
    return false;
  }
}

function isIOS() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function ShareIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ verticalAlign: 'middle' }}>
      <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill="none">
      <circle cx="16" cy="16" r="14" stroke="white" strokeWidth="2" />
      <ellipse cx="16" cy="16" rx="6" ry="14" stroke="white" strokeWidth="1.5" opacity="0.6" />
      <line x1="2" y1="16" x2="30" y2="16" stroke="white" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

const TX = {
  en: {
    installText: 'Install app for quick access',
    installCta: 'Install',
    installStep1: 'Tap the share button',
    installStep2: 'Select "Add to Home Screen"',
    installGotIt: 'Got it',
  },
  pt: {
    installText: 'Instale o app para acesso rapido',
    installCta: 'Instalar',
    installStep1: 'Toque no botao compartilhar',
    installStep2: 'Selecione "Adicionar a Tela de Inicio"',
    installGotIt: 'Entendi',
  },
};

export function InstallBanner({ lang }) {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [entered, setEntered] = useState(false);
  const deferredPromptRef = useRef(null);
  const tx = TX[lang] || TX.en;

  useEffect(() => {
    if (!isMobile || isStandalone() || isDismissed()) return;
    const timer = setTimeout(() => setVisible(true), 1500);
    return () => clearTimeout(timer);
  }, [isMobile]);

  useEffect(() => {
    if (visible) {
      requestAnimationFrame(() => setEntered(true));
    }
  }, [visible]);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    window.addEventListener('beforeinstallprompt', handler);

    const installedHandler = () => {
      setVisible(false);
      deferredPromptRef.current = null;
    };
    window.addEventListener('appinstalled', installedHandler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  const handleDismiss = useCallback(() => {
    setEntered(false);
    setTimeout(() => {
      setVisible(false);
      try {
        localStorage.setItem(DISMISS_KEY, JSON.stringify({ dismissed: true, timestamp: Date.now() }));
      } catch { /* ignore */ }
    }, 200);
  }, []);

  const handleInstall = useCallback(() => {
    if (deferredPromptRef.current) {
      deferredPromptRef.current.prompt();
      deferredPromptRef.current.userChoice.then((result) => {
        if (result.outcome === 'accepted') setVisible(false);
        deferredPromptRef.current = null;
      });
      return;
    }
    if (isIOS()) {
      setShowIOSSteps(true);
      return;
    }
    handleDismiss();
  }, [handleDismiss]);

  if (!visible) return null;

  return (
    <div className={`install-banner${entered ? ' install-banner--entered' : ''}${showIOSSteps ? ' install-banner--expanded' : ''}`}>
      <div className="install-banner__pill">
        <div className="install-banner__icon">
          <GlobeIcon />
        </div>
        <span className="install-banner__text">{tx.installText}</span>
        <button className="install-banner__cta" onClick={handleInstall} type="button">
          {tx.installCta}
        </button>
        <button className="install-banner__close" onClick={handleDismiss} type="button" aria-label="Dismiss">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {showIOSSteps && (
        <div className="install-banner__steps">
          <div className="install-banner__step">
            <span className="install-banner__step-num">1</span>
            <span className="install-banner__step-text">
              {tx.installStep1} <ShareIcon />
            </span>
          </div>
          <div className="install-banner__step">
            <span className="install-banner__step-num">2</span>
            <span className="install-banner__step-text">{tx.installStep2}</span>
          </div>
          <button className="install-banner__got-it" onClick={handleDismiss} type="button">
            {tx.installGotIt}
          </button>
        </div>
      )}
    </div>
  );
}
