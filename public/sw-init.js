// Service worker lifecycle management
// Dev mode: nuke stale service workers + caches
if (window.location.port && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then(function(regs) {
    if (regs.length > 0) {
      Promise.all(regs.map(function(r) { return r.unregister(); })).then(function() {
        if (window.caches) caches.keys().then(function(keys) {
          Promise.all(keys.map(function(k) { return caches.delete(k); }));
        });
      });
    }
  });
}
// Production only: register SW
if ('serviceWorker' in navigator && !window.location.port) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').catch(function() {});
  });
}
