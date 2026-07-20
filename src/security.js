/**
 * CineVerse — security.js
 * Content & Code Security Shield — Disables Right-Click, Inspect Element, DevTools & Copying
 */

'use strict';

(function () {
  // 1. Prevent Right-Click Context Menu
  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    if (typeof showToast === 'function') {
      showToast('🔒 Right-click and inspect are disabled on CineVerse', '🛡️');
    }
    return false;
  }, false);

  // 2. Prevent Developer Tools Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // F12 Key
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I / Cmd+Opt+I (Inspect Element)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+J / Cmd+Opt+J (Console)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+C / Cmd+Opt+C (Select Element)
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+U / Cmd+Opt+U (View Source)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+S / Cmd+S (Save Page)
    if ((e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's' || e.keyCode === 83)) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }
  }, true);

  // 3. Prevent Image Dragging & Text Selection/Copying
  document.addEventListener('dragstart', (e) => e.preventDefault(), false);
  document.addEventListener('selectstart', (e) => {
    if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
    }
  }, false);

  document.addEventListener('copy', (e) => {
    const active = document.activeElement;
    if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
    e.preventDefault();
    if (typeof showToast === 'function') {
      showToast('🔒 Content copying is disabled', '🛡️');
    }
  }, false);

  // 4. Anti-DevTools Debugger Loop
  setInterval(() => {
    const startTime = performance.now();
    /* eslint-disable no-debugger */
    debugger;
    const endTime = performance.now();
    if (endTime - startTime > 100) {
      document.body.innerHTML = `
        <div style="background:#07070b;color:#e50914;font-family:sans-serif;height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px;">
          <h1 style="font-size:3rem;margin-bottom:10px;">🔒 Developer Tools Detected</h1>
          <p style="color:#8e8ea8;font-size:1.1rem;max-width:500px;">Inspection and dev tools are restricted on CineVerse to protect streaming assets. Please close DevTools and reload.</p>
          <button onclick="window.location.reload()" style="margin-top:20px;background:#e50914;color:#fff;border:none;padding:12px 28px;border-radius:50px;font-weight:bold;cursor:pointer;">Reload CineVerse</button>
        </div>
      `;
    }
  }, 2000);
})();
