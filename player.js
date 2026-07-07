/**
 * CineStream – player.js
 * Multi-Server Embed Engine, Progress Tracking & Watch Party Sync Room
 */

'use strict';

const TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/';

const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id') || '157336'; // Default fallback: Interstellar
const mediaType = urlParams.get('type') === 'tv' ? 'tv' : 'movie';
const initialTitle = decodeURIComponent(urlParams.get('title') || 'Interstellar');
const startTime = parseInt(urlParams.get('startTime') || '0', 10) || 0;

let currentServer = 'vidsync';
let currentSeason = parseInt(urlParams.get('season') || '1', 10) || 1;
let currentEpisode = parseInt(urlParams.get('episode') || '1', 10) || 1;
let movieDetailsData = null;
let selectedStarRating = 5;
let watchTimer = null;
let watchedSeconds = startTime;

const SERVER_URLS = {
  vidsync: (id, type, s, e, st) => type === 'tv' ? `https://vidsync.live/embed/tv/${id}/${s}/${e}?startTime=${st}` : `https://vidsync.live/embed/movie/${id}?startTime=${st}`,
  cinesrc: (id, type, s, e, st) => {
    const accent = localStorage.getItem('cs_accent_theme') || 'crimson';
    const hexMap = { crimson: '%23e50914', cyan: '%2300d2d3', gold: '%23ffb800', purple: '%23a855f7' };
    const colorHex = hexMap[accent] || '%23e50914';
    let url = type === 'tv' 
      ? `https://cinesrc.st/embed/tv/${id}?s=${s}&e=${e}&color=${colorHex}`
      : `https://cinesrc.st/embed/movie/${id}?color=${colorHex}`;
    if (st > 0) url += `&t=${st}`;
    return url;
  },
  vidnest: (id, type, s, e, st, anilistId) => {
    let url;
    if (anilistId) {
      url = `https://vidnest.fun/anime/${anilistId}/${e || 1}/sub`;
    } else if (type === 'tv' || type === 'anime') {
      url = `https://vidnest.fun/tv/${id}/${s || 1}/${e || 1}`;
    } else {
      url = `https://vidnest.fun/movie/${id}`;
    }
    if (st > 0) url += `?startAt=${st}`;
    return url;
  },
  vidnest_pahe: (id, type, s, e, st, anilistId) => {
    let url;
    if (anilistId) {
      url = `https://vidnest.fun/animepahe/${anilistId}/${e || 1}/sub`;
    } else if (type === 'tv' || type === 'anime') {
      url = `https://vidnest.fun/tv/${id}/${s || 1}/${e || 1}`;
    } else {
      url = `https://vidnest.fun/movie/${id}`;
    }
    if (st > 0) url += `?startAt=${st}`;
    return url;
  },
  vidsrc: (id, type, s, e, st) => type === 'tv' ? `https://vidsrc.pro/embed/tv/${id}/${s}/${e}` : `https://vidsrc.pro/embed/movie/${id}`,
  autoembed: (id, type, s, e, st) => type === 'tv' ? `https://autoembed.cc/embed/tv/${id}/${s}/${e}` : `https://autoembed.cc/embed/movie/${id}`,
};

const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('API Error:', e);
    return null;
  }
}

/* ================================================
   ACCENT THEMES
================================================ */
function initAccentThemes() {
  const mode = localStorage.getItem('cs_mode') || 'dark';
  applyModeTheme(mode);

  const savedAccent = localStorage.getItem('cs_accent_theme') || 'crimson';
  applyAccentTheme(savedAccent);
  $$('.swatch-btn').forEach(btn => {
    btn.onclick = () => {
      const accent = btn.dataset.accent;
      applyAccentTheme(accent);
      localStorage.setItem('cs_accent_theme', accent);
    };
  });
}

function applyModeTheme(mode) {
  document.documentElement.className = mode === 'light' ? 'light-theme' : 'dark-theme';
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(mode === 'light' ? 'light-theme' : 'dark-theme');
  const toggleBtn = $('watchModeToggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = mode === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
  }
}

function toggleWatchMode() {
  const isLight = document.body.classList.contains('light-theme');
  const newMode = isLight ? 'dark' : 'light';
  localStorage.setItem('cs_mode', newMode);
  applyModeTheme(newMode);
}

function applyAccentTheme(accentName) {
  document.body.classList.remove('theme-crimson', 'theme-cyan', 'theme-gold', 'theme-purple');
  if (accentName !== 'crimson') document.body.classList.add(`theme-${accentName}`);
  $$('.swatch-btn').forEach(b => b.classList.toggle('active', b.dataset.accent === accentName));
}

/* ================================================
   EMBED SERVER ENGINE & PROGRESS SAVER
================================================ */
function renderEmbedServer(serverKey = 'vidsync') {
  currentServer = serverKey;
  const wrapper = $('playerWrapper');
  if (!wrapper) return;

  $$('.server-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.server === serverKey);
  });

  const builder = SERVER_URLS[serverKey] || SERVER_URLS.vidsync;
  const embedUrl = builder(movieId, mediaType, currentSeason, currentEpisode, watchedSeconds);

  const adblockActive = localStorage.getItem('cs_adblock') !== 'false';
  const sandboxAttr = adblockActive ? 'sandbox="allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-popups allow-popups-to-escape-sandbox"' : '';

  wrapper.innerHTML = `
    <iframe
      src="${embedUrl}"
      width="100%"
      height="100%"
      frameborder="0"
      allow="encrypted-media; autoplay; fullscreen; picture-in-picture"
      allowfullscreen
      ${sandboxAttr}
      style="position:absolute;top:0;left:0;width:100%;height:100%;"
      title="Stream Player"
    ></iframe>
  `;

  startProgressTracker();
}

function startProgressTracker() {
  clearInterval(watchTimer);
  watchTimer = setInterval(() => {
    watchedSeconds += 5;
    saveWatchProgress(watchedSeconds);
  }, 5000);
}

function saveWatchProgress(secs) {
  try {
    const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
    const key = `cs_progress_${activeProfile.id || 'default'}`;
    const allProgress = JSON.parse(localStorage.getItem(key) || '{}');

    const totalSecs = (movieDetailsData && movieDetailsData.runtime) ? movieDetailsData.runtime * 60 : 7200;
    const percent = Math.min(100, Math.floor((secs / totalSecs) * 100));

    allProgress[movieId] = {
      seconds: secs,
      percent: percent,
      timestamp: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(allProgress));
  } catch (e) {
    console.warn('Could not save progress:', e);
  }
}

/* ================================================
   WATCH PARTY SYNC ROOM ENGINE
================================================ */
function initWatchParty() {
  const btn = $('createPartyBtn');
  const drawer = $('partyDrawer');
  const closeBtn = $('closePartyBtn');
  const msgInput = $('partyMsgInput');
  const sendBtn = $('sendPartyMsgBtn');

  if (!btn || !drawer) return;

  btn.onclick = () => {
    const roomCode = 'PARTY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    $('roomCodeDisplay').textContent = roomCode;
    drawer.classList.remove('hidden');
    try {
      navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?id=${movieId}&party=${roomCode}`);
      alert(`Watch Party Created! (${roomCode})\nShare link copied to clipboard.`);
    } catch (e) {
      alert(`Watch Party Created! Code: ${roomCode}`);
    }
  };

  closeBtn.onclick = () => drawer.classList.add('hidden');

  const sendMessage = () => {
    const text = msgInput.value.trim();
    if (!text) return;
    const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
    const sender = activeProfile.name || 'Guest';

    const box = $('partyMessages');
    const msgEl = document.createElement('div');
    msgEl.className = 'party-msg';
    msgEl.innerHTML = `<strong>${sender}:</strong> ${text}`;
    box.appendChild(msgEl);
    box.scrollTop = box.scrollHeight;
    msgInput.value = '';
  };

  sendBtn.onclick = sendMessage;
  msgInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
}

/* ================================================
   COMMUNITY REVIEWS
================================================ */
function initCommunityReviews() {
  const stars = $$('#starRatingSelect span');
  stars.forEach(star => {
    star.onclick = () => {
      selectedStarRating = parseInt(star.dataset.star, 10);
      stars.forEach((s, idx) => {
        s.style.opacity = idx < selectedStarRating ? '1' : '0.3';
      });
    };
  });

  const submitBtn = $('submitReviewBtn');
  if (submitBtn) {
    submitBtn.onclick = () => {
      const textInput = $('reviewTextInput');
      const text = textInput.value.trim();
      if (!text) return alert('Please enter a review');

      const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
      const reviewObj = {
        id: 'rev_' + Date.now(),
        author: activeProfile.name || 'Anonymous',
        avatar: activeProfile.avatar || '🍿',
        rating: selectedStarRating,
        text: text,
        likes: 0,
        date: 'Just now',
      };

      const key = `cs_reviews_${movieId}`;
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.unshift(reviewObj);
      localStorage.setItem(key, JSON.stringify(existing));

      textInput.value = '';
      renderReviews();
      alert('Review posted successfully!');
    };
  }

  renderReviews();
}

function renderReviews() {
  const container = $('reviewsList');
  if (!container) return;

  const defaultReviews = [
    { author: 'CinemaFanatic', avatar: '⚡', rating: 5, text: 'Absolute masterpiece! The visuals and soundtrack blew me away.', likes: 14, date: '2 days ago' },
    { author: 'Alex', avatar: '🍿', rating: 4, text: 'Great plot twists and smooth streaming quality.', likes: 6, date: '1 week ago' },
  ];

  const key = `cs_reviews_${movieId}`;
  const customReviews = JSON.parse(localStorage.getItem(key) || '[]');
  const allReviews = [...customReviews, ...defaultReviews];

  container.innerHTML = '';
  allReviews.forEach(r => {
    const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
    const card = document.createElement('div');
    card.className = 'review-card';
    card.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="font-weight:700;font-size:13px;">${r.avatar} ${r.author}</div>
        <div style="color:#ffb800;font-size:12px;">${stars}</div>
      </div>
      <div style="font-size:13px;color:#c0c0d0;line-height:1.5;">${r.text}</div>
    `;
    container.appendChild(card);
  });
}

/* ================================================
   DETAILS LOADER
================================================ */
async function loadContentDetails() {
  document.title = 'CineVerse — Premium Cinematic Experience';

  const details = await apiFetch(`/${mediaType}/${movieId}`);
  if (!details) {
    $('watchTitleBar').textContent = initialTitle;
    return;
  }

  movieDetailsData = details;
  const title = details.title || details.name || initialTitle;
  $('watchTitleBar').textContent = title;

  const poster = $('detailPoster');
  if (poster) {
    poster.src = details.poster_path ? `${IMG_BASE}w185${details.poster_path}` : '';
    poster.style.display = 'block';
  }
  const titleEl = $('detailTitle');
  if (titleEl) titleEl.textContent = title;

  const metaEl = $('detailMeta');
  if (metaEl) {
    metaEl.innerHTML = `⭐ ${details.vote_average ? details.vote_average.toFixed(1) : '8.5'} • ${(details.release_date || details.first_air_date || '2025').slice(0,4)}`;
  }
  const overviewEl = $('detailOverview');
  if (overviewEl) overviewEl.textContent = details.overview || 'Streaming content available in HD quality.';

  if (mediaType === 'tv') {
    const tvPicker = $('tvPickerContainer');
    if (tvPicker) tvPicker.style.display = 'block';
    
    const seasons = details.number_of_seasons || 1;
    const seasonSelect = $('seasonSelect');
    if (seasonSelect) {
      seasonSelect.className = 'season-select';
      seasonSelect.style.cssText = 'background:var(--card2);color:var(--text);border:1px solid var(--border);padding:8px 14px;border-radius:10px;font-family:var(--font);font-weight:700;outline:none;cursor:pointer;';
      seasonSelect.innerHTML = Array.from({length: seasons}, (_, i) => `<option value="${i+1}">Season ${i+1}</option>`).join('');
      seasonSelect.value = currentSeason;
      seasonSelect.onchange = (e) => {
        currentSeason = parseInt(e.target.value, 10);
        loadWatchEpisodes(currentSeason);
      };
    }
    loadWatchEpisodes(currentSeason);
  }
}

async function loadWatchEpisodes(seasonNum) {
  const grid = $('episodesGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px;">Loading episodes...</div>';
  try {
    const seasonData = await apiFetch(`/tv/${movieId}/season/${seasonNum}`);
    const eps = seasonData?.episodes || [];
    grid.innerHTML = '';
    if (!eps.length) {
      for (let i = 1; i <= 10; i++) eps.push({ episode_number: i, name: `Episode ${i}` });
    }
    eps.forEach(ep => {
      const btn = document.createElement('button');
      btn.className = `ep-btn ${ep.episode_number === currentEpisode ? 'active' : ''}`;
      btn.style.cssText = `padding:8px 14px;border-radius:12px;background:${ep.episode_number === currentEpisode ? 'linear-gradient(135deg,var(--accent2),var(--accent))' : 'var(--card2)'};border:1px solid var(--border);color:${ep.episode_number === currentEpisode ? '#fff' : 'var(--text)'};font-weight:800;font-size:13px;cursor:pointer;transition:all .3s;text-align:center;min-width:64px;`;
      btn.innerHTML = `E${ep.episode_number}`;
      btn.title = ep.name || `Episode ${ep.episode_number}`;
      btn.onclick = () => {
        currentEpisode = ep.episode_number;
        $$('.ep-btn').forEach(b => {
          b.style.background = 'var(--card2)';
          b.style.color = 'var(--text)';
        });
        btn.style.background = 'linear-gradient(135deg,var(--accent2),var(--accent))';
        btn.style.color = '#fff';
        renderEmbedServer(currentServer);
      };
      grid.appendChild(btn);
    });
  } catch (e) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:12px;padding:10px;">Could not load episode list.</div>';
  }
}

/* ================================================
   CINERC PLAYER POSTMESSAGE LISTENER
================================================ */
window.addEventListener('message', (event) => {
  if (event.origin !== 'https://cinesrc.st') return;
  const data = event.data || {};
  const { type } = data;
  if (!type) return;

  switch (type) {
    case 'cinesrc:ready':
      console.log('CineSrc Player ready');
      break;
    case 'cinesrc:timeupdate':
      if (data.currentTime) {
        watchedSeconds = Math.floor(data.currentTime);
        saveWatchProgress(watchedSeconds);
      }
      break;
    case 'cinesrc:nextepisode':
      if (data.season && data.episode) {
        currentSeason = data.season;
        currentEpisode = data.episode;
      }
      break;
    case 'cinesrc:close':
      window.location.href = 'index.html';
      break;
    case 'cinesrc:error':
      console.error('CineSrc Player Error:', data.error);
      break;
  }
});

document.addEventListener('DOMContentLoaded', () => {
  initAccentThemes();
  initWatchParty();
  initCommunityReviews();

  $$('.server-btn').forEach(btn => {
    btn.onclick = () => renderEmbedServer(btn.dataset.server);
  });

  // Set initial state of Adblock checkbox
  const adblockToggle = document.getElementById('adblockToggle');
  if (adblockToggle) {
    adblockToggle.checked = localStorage.getItem('cs_adblock') !== 'false';
  }

  loadContentDetails();
  renderEmbedServer('vidsync');
});

window.toggleAdblockMode = function() {
  const checkbox = document.getElementById('adblockToggle');
  if (!checkbox) return;
  const state = checkbox.checked;
  localStorage.setItem('cs_adblock', state ? 'true' : 'false');
  
  const iframe = document.querySelector('.player-wrapper iframe');
  if (iframe) {
    if (state) {
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-presentation allow-pointer-lock allow-popups allow-popups-to-escape-sandbox');
    } else {
      iframe.removeAttribute('sandbox');
    }
    iframe.src = iframe.src;
  }
};
