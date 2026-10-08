// Applies an explicit theme before first paint (no flash). Classic script, CSP-safe ('self').
(() => {
  try {
    const theme = JSON.parse(localStorage.getItem('pz:v1') || 'null')?.prefs?.theme;
    if (theme === 'dark' || theme === 'light') document.documentElement.dataset.theme = theme;
  } catch {
    // Storage unavailable: follow the system theme.
  }
})();
