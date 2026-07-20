/**
 * CineVerse — theme.js
 * 8 Cinematic Palettes, 300ms Hover Preview & Diegetic Canvas Color Sampling
 */

'use strict';

const THEMES = {
  crimson: { name: 'Crimson', accent: '#E50914', glow: 'rgba(229, 9, 20, 0.4)', text: 'Classic cinema, high drama' },
  cyan: { name: 'Cyan', accent: '#00D2D3', glow: 'rgba(0, 210, 211, 0.4)', text: 'Sci-fi, neon-noir' },
  gold: { name: 'Gold', accent: '#FFB800', glow: 'rgba(255, 184, 0, 0.4)', text: 'Premium, awards-night' },
  violet: { name: 'Violet', accent: '#A855F7', glow: 'rgba(168, 85, 247, 0.4)', text: 'Fantasy, dreamlike' },
  emerald: { name: 'Emerald', accent: '#10B981', glow: 'rgba(16, 185, 129, 0.4)', text: 'Nature docs, calm focus' },
  rose: { name: 'Rose', accent: '#FB7185', glow: 'rgba(251, 113, 133, 0.4)', text: 'Romance, warm' },
  sunset: { name: 'Sunset', accent: 'linear-gradient(135deg, #FF7A45, #FFC53D)', glow: 'rgba(255, 122, 69, 0.35)', text: 'Adventure, golden-hour' },
  monochrome: { name: 'Monochrome', accent: '#F3F3F8', glow: 'rgba(255, 255, 255, 0.15)', text: 'Editorial, high-contrast WCAG AA' }
};

let hoverPreviewTimeout = null;

// Initialize Theme System
function initThemeEngine() {
  const savedTheme = localStorage.getItem('cs_theme_name') || 'crimson';
  const savedMode = localStorage.getItem('cs_mode') || 'dark';

  applyTheme(savedTheme, false);
  applyMode(savedMode);
  initCustomCursor();
}

function applyTheme(themeKey, isTemporary = false) {
  const theme = THEMES[themeKey] || THEMES.crimson;
  const root = document.documentElement;

  root.setAttribute('data-theme', themeKey);
  
  if (themeKey === 'sunset') {
    root.style.setProperty('--accent', '#FF7A45');
    root.style.setProperty('--accent2', '#FFC53D');
  } else {
    root.style.setProperty('--accent', theme.accent);
    root.style.setProperty('--accent2', theme.accent);
  }
  root.style.setProperty('--accent-glow', theme.glow);

  if (!isTemporary) {
    localStorage.setItem('cs_theme_name', themeKey);
    updateActiveSwatchUI(themeKey);
  }
}

function updateActiveSwatchUI(themeKey) {
  document.querySelectorAll('.theme-swatch, .swatch-btn').forEach(btn => {
    const key = btn.dataset.theme || btn.dataset.accent;
    btn.classList.toggle('active', key === themeKey);
  });
}

function setupThemeHoverPreviews() {
  document.querySelectorAll('.theme-swatch, .swatch-btn').forEach(btn => {
    const themeKey = btn.dataset.theme || btn.dataset.accent;
    if (!themeKey) return;

    btn.addEventListener('mouseenter', () => {
      clearTimeout(hoverPreviewTimeout);
      hoverPreviewTimeout = setTimeout(() => {
        applyTheme(themeKey, true);
      }, 300);
    });

    btn.addEventListener('mouseleave', () => {
      clearTimeout(hoverPreviewTimeout);
      const savedTheme = localStorage.getItem('cs_theme_name') || 'crimson';
      applyTheme(savedTheme, false);
    });

    btn.addEventListener('click', () => {
      clearTimeout(hoverPreviewTimeout);
      applyTheme(themeKey, false);
    });
  });
}

function applyMode(mode) {
  document.documentElement.className = mode === 'light' ? 'light-theme' : 'dark-theme';
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(mode === 'light' ? 'light-theme' : 'dark-theme');
  localStorage.setItem('cs_mode', mode);
}

function toggleMode() {
  const isLight = document.body.classList.contains('light-theme');
  applyMode(isLight ? 'dark' : 'light');
}

/* ================================================
   DIEGETIC CANVAS PIXEL SAMPLER
================================================ */
function samplePosterColor(imgUrl, callback) {
  if (!imgUrl) return;

  const img = new Image();
  img.crossOrigin = 'Anonymous';
  img.src = imgUrl;

  img.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 50;
      canvas.height = 50;
      ctx.drawImage(img, 0, 0, 50, 50);

      const imageData = ctx.getImageData(0, 0, 50, 50).data;
      let r = 0, g = 0, b = 0, count = 0;

      for (let i = 0; i < imageData.length; i += 16) {
        const red = imageData[i];
        const green = imageData[i + 1];
        const blue = imageData[i + 2];
        const alpha = imageData[i + 3];

        if (alpha > 200 && (red > 30 || green > 30 || blue > 30)) {
          r += red;
          g += green;
          b += blue;
          count++;
        }
      }

      if (count > 0) {
        r = Math.floor(r / count);
        g = Math.floor(g / count);
        b = Math.floor(b / count);
        const sampledGlow = `rgba(${r}, ${g}, ${b}, 0.55)`;
        
        document.documentElement.style.setProperty('--sampled-glow', sampledGlow);
        if (callback) callback(sampledGlow);
      }
    } catch (e) {
      console.warn('Color sampling CORS fallback');
    }
  };
}

document.addEventListener('DOMContentLoaded', () => {
  initThemeEngine();
  setupThemeHoverPreviews();
});
