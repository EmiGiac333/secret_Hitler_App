// ============================================================
// app.js — Main entry point, render dispatcher, boot
// ============================================================

let _lastScreen = null;
let _transitioning = false;

function render() {
  const app = document.getElementById('app');
  if (!app) return;

  let content = '';
  switch (state.screen) {
    case 'home':                        content = renderHome(); break;
    case 'online-menu':                 content = renderOnlineMenu(); break;
    case 'online-lobby':                content = renderOnlineLobby(); break;
    case 'online-role':                 content = renderOnlineRole(); break;
    case 'setup':                       content = renderSetup(); break;
    case 'pass-reveal':                 content = renderPassReveal(); break;
    case 'role-reveal':                 content = renderRoleReveal(); break;
    case 'legislative-pass-president':  content = renderLegislativePass('president'); break;
    case 'legislative-president':       content = renderLegislativePresident(); break;
    case 'legislative-pass-chancellor': content = renderLegislativePass('chancellor'); break;
    case 'legislative-chancellor':      content = renderLegislativeChancellor(); break;
    case 'legislative-veto-president':  content = renderLegislativeVetoPresident(); break;
    case 'policy-reveal':               content = renderPolicyReveal(); break;
    case 'post-election-choice':        content = renderPostElectionChoice(); break;
    case 'game':                        content = renderGame(); break;
    case 'end':                         content = renderEnd(); break;
    default:                            content = renderHome();
  }

  const isNewScreen = _lastScreen !== state.screen;

  if (isNewScreen && !_transitioning) {
    _transitioning = true;
    app.style.transition = 'opacity 0.12s ease, transform 0.12s ease';
    app.style.opacity    = '0';
    app.style.transform  = 'translateY(6px)';

    setTimeout(() => {
      app.innerHTML = content;
      attachHandlers();
      _lastScreen = state.screen;

      requestAnimationFrame(() => {
        app.style.opacity   = '1';
        app.style.transform = 'translateY(0)';
        setTimeout(() => { _transitioning = false; }, 150);
      });
    }, 100);
  } else {
    app.innerHTML = content;
    attachHandlers();
    _lastScreen = state.screen;
  }
}

// ===== BOOT =====

(function boot() {
  // Splash → render after short delay for paint
  const splash = document.getElementById('splash');
  if (splash) {
    setTimeout(() => {
      splash.style.transition = 'opacity 0.5s ease';
      splash.style.opacity    = '0';
      setTimeout(() => splash.remove(), 550);
    }, 900);
  }

  render();

  // Wake Lock: impedisce allo schermo di spegnersi
  if ('wakeLock' in navigator) {
    let _wl = null;
    const _acquire = async () => {
      try { _wl = await navigator.wakeLock.request('screen'); } catch (_) {}
    };
    _acquire();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') _acquire();
    });
  }

  // Service Worker
  if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // Prevent pull-to-refresh in standalone mode
  document.addEventListener('touchmove', e => {
    if (e.target.closest('input, select, textarea')) return;
  }, { passive: true });
})();
