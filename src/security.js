/**
 * CineVerse — security.js
 * Developer Console Notice & Friendly Content Shield
 */

'use strict';

(function () {
  // Console welcome notice for curious developers
  console.log(
    '%cCineVerse %cv8.0 — Premium Cinematic Experience\n%cLooking under the hood? Build something awesome!',
    'color:#e50914;font-size:18px;font-weight:bold;',
    'color:#8e8ea8;font-size:14px;',
    'color:#00d2d3;font-size:12px;'
  );

  // Prevent accidental image drag-and-drop downloads while keeping normal text selection accessible
  document.addEventListener('dragstart', (e) => {
    if (e.target && e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  }, false);
})();
