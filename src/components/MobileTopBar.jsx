function formatTopBarTime(hour, minute, use24Hour) {
  const m = String(minute).padStart(2, '0');
  if (use24Hour) return `${String(hour).padStart(2, '0')}:${m}`;
  const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${String(h).padStart(2, '0')}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function MobileTopBar({ sourceCity, sourceTimeComponents, use24Hour }) {
  const flag = sourceCity?.flag ?? '';
  const time = sourceTimeComponents
    ? formatTopBarTime(sourceTimeComponents.hour, sourceTimeComponents.minute, use24Hour)
    : '';

  return (
    <div className="mobile-top-bar">
      <div className="mobile-top-bar__brand">
        <svg className="app-bar__globe" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="mobile-top-bar-globe-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4A90D9"/>
              <stop offset="50%" stopColor="#F5A623"/>
              <stop offset="100%" stopColor="#E8984A"/>
            </linearGradient>
          </defs>
          <circle cx="16" cy="16" r="14" fill="url(#mobile-top-bar-globe-grad)" opacity="0.9"/>
          <ellipse cx="16" cy="16" rx="6" ry="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
          <line x1="2" y1="16" x2="30" y2="16" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.6"/>
          <circle cx="16" cy="16" r="14" fill="none" stroke="#0A0A0B" strokeWidth="1.5" opacity="0.3"/>
        </svg>
        <span className="app-bar__brand-name">Pismo Zones</span>
      </div>
      {time && (
        <div className="mobile-top-bar__clock" aria-label={`Current time: ${time}`}>
          <span className="mobile-top-bar__clock-flag">{flag}</span>
          <span className="mobile-top-bar__clock-time">{time}</span>
        </div>
      )}
    </div>
  );
}
