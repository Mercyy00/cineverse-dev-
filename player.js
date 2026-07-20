/**
 * CineStream – player.js
 * Multi-Server Embed Engine, Progress Tracking & Watch Party Sync Room
 * Updated: Viduki (4 APIs) + ZXCStream as priority servers, Floating Sidebar UI
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

let currentServer = 'viduki1';
let currentSeason = parseInt(urlParams.get('season') || '1', 10) || 1;
let currentEpisode = parseInt(urlParams.get('episode') || '1', 10) || 1;
let movieDetailsData = null;
let selectedStarRating = 5;
let watchTimer = null;
let watchedSeconds = startTime;
let totalEpisodesInSeason = 10;
let totalSeasons = 1;

/* ================================================
   ACCENT HEX HELPER — returns hex without #
================================================ */
function getAccentHex() {
  const accent = localStorage.getItem('cs_accent_theme') || 'crimson';
  const hexMap = { crimson: 'e50914', cyan: '00d2d3', gold: 'ffb800', purple: 'a855f7' };
  return hexMap[accent] || 'e50914';
}

function getAccentHexWithHash() {
  return '%23' + getAccentHex();
}

/* ================================================
   SERVER URL BUILDERS — Priority Order
================================================ */
const SERVER_URLS = {
  // ─── PRIORITY 1: Viduki (4 API tiers) ───
  viduki1: (id, type, s, e, st) => {
    const color = getAccentHexWithHash();
    return type === 'tv'
      ? `https://viduki.net/1/tv/${id}/${s}/${e}?color=${color}`
      : `https://viduki.net/1/movie/${id}?color=${color}`;
  },
  viduki2: (id, type, s, e, st) => {
    const color = getAccentHexWithHash();
    return type === 'tv'
      ? `https://viduki.net/2/tv/${id}/${s}/${e}?color=${color}`
      : `https://viduki.net/2/movie/${id}?color=${color}`;
  },
  viduki3: (id, type, s, e, st) => {
    const color = getAccentHexWithHash();
    return type === 'tv'
      ? `https://viduki.net/3/tv/${id}/${s}/${e}?color=${color}`
      : `https://viduki.net/3/movie/${id}?color=${color}`;
  },
  viduki4: (id, type, s, e, st) => {
    const color = getAccentHexWithHash();
    return type === 'tv'
      ? `https://viduki.net/4/tv/${id}/${s}/${e}?color=${color}`
      : `https://viduki.net/4/movie/${id}?color=${color}`;
  },

  // ─── PRIORITY 2: ZXCStream ───
  zxcstream: (id, type, s, e, st) => {
    const color = getAccentHex();
    const base = type === 'tv'
      ? `https://zxcstream.xyz/player/tv/${id}/${s}/${e}`
      : `https://zxcstream.xyz/player/movie/${id}`;
    return `${base}?color=${color}&autoplay=true&back=true`;
  },

  // ─── PRIORITY 3+: Legacy Servers ───
  rivestream: (id, type, s, e, st) => type === 'tv' ? `https://www.rivestream.app/embed?type=tv&id=${id}&season=${s}&episode=${e}` : `https://www.rivestream.app/embed?type=movie&id=${id}`,
  vidcodin: (id, type, s, e, st) => type === 'tv' ? `https://vidcodin.net/embed/tv/${id}/${s}/${e}` : `https://vidcodin.net/embed/movie/${id}`,
  oneembed: (id, type, s, e, st) => type === 'tv' ? `https://1embed.cc/embed/tv/${id}/${s}/${e}` : `https://1embed.cc/embed/movie/${id}`,
  mapple: (id, type, s, e, st) => type === 'tv' ? `https://mapple.uk/watch/tv/${id}-${s}-${e}` : `https://mapple.uk/watch/movie/${id}`,
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
};

/* Server display info for sidebar */
const SERVER_INFO = [
  { key: 'viduki1', name: 'Viduki Multi Server', desc: 'Primary • auto-cascading servers', icon: '⚡', gradient: 'linear-gradient(135deg,#ff6b35,#e50914)' },
  { key: 'viduki2', name: 'Viduki Multi Language', desc: 'Multi-language audio support', icon: '🌐', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
  { key: 'viduki3', name: 'Viduki Multi Embeds', desc: 'Multiple embed sources', icon: '🔮', gradient: 'linear-gradient(135deg,#a855f7,#7c3aed)' },
  { key: 'viduki4', name: 'Viduki Premium', desc: 'Premium quality streams', icon: '👑', gradient: 'linear-gradient(135deg,#ffb800,#f59e0b)' },
  { key: 'zxcstream', name: 'ZXC Stream', desc: 'Multi-dub • HD quality', icon: '🚀', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  { key: 'rivestream', name: 'RiveStream', desc: 'Auto-aggregator • fastest CDN', icon: '⚡', gradient: 'linear-gradient(135deg,#ff6b35,#e50914)' },
  { key: 'vidcodin', name: 'VidCodin', desc: 'High-speed decoding', icon: '🛸', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  { key: 'oneembed', name: '1embed', desc: 'Multi-quality • zero ads', icon: '🔮', gradient: 'linear-gradient(135deg,#a855f7,#7c3aed)' },
  { key: 'mapple', name: 'Mapple HD', desc: 'HD streaming', icon: '🍁', gradient: 'linear-gradient(135deg,#f43f5e,#be123c)' },
  { key: 'vidsync', name: 'VidSync Cloud', desc: 'HLS streaming', icon: '🚀', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
  { key: 'cinesrc', name: 'CineSrc Premium', desc: 'Theme sync • FHD', icon: '🎬', gradient: 'linear-gradient(135deg,#ffb800,#f59e0b)' },
  { key: 'vidnest', name: 'VidNest Anime', desc: 'Anime • sub & dub', icon: '⛩️', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
];

/* Viduki auto-fallback cascade order */
const VIDUKI_FALLBACK_ORDER = ['viduki1', 'viduki2', 'viduki3', 'viduki4', 'zxcstream', 'rivestream'];
let vidukiFallbackIndex = 0;

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
      // Re-render embed to update player theme color
      renderEmbedServer(currentServer);
    };
  });
}

function applyModeTheme(mode) {
  document.documentElement.className = mode === 'light' ? 'light-theme' : 'dark-theme';
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(mode === 'light' ? 'light-theme' : 'dark-theme');
  
  // Inherit Liquid Glass Theme class
  const isLiquid = localStorage.getItem('cs_liquid_glass') === '1';
  if (isLiquid) document.body.classList.add('liquid-glass-theme');
  else document.body.classList.remove('liquid-glass-theme');

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
function renderEmbedServer(serverKey = 'viduki1') {
  currentServer = serverKey;
  const wrapper = $('playerWrapper');
  if (!wrapper) return;

  // Update sidebar server highlighting
  updateSidebarServerHighlight(serverKey);

  // Update active server status badge on player
  const serverInfo = SERVER_INFO.find(s => s.key === serverKey);
  if (serverInfo && $('currentActiveServerName')) {
    $('currentActiveServerName').textContent = serverInfo.name;
  }

  // Track fallback index
  const fallbackIdx = VIDUKI_FALLBACK_ORDER.indexOf(serverKey);
  if (fallbackIdx !== -1) vidukiFallbackIndex = fallbackIdx;

  const builder = SERVER_URLS[serverKey] || SERVER_URLS.viduki1;
  const embedUrl = builder(movieId, mediaType, currentSeason, currentEpisode, watchedSeconds);

  wrapper.innerHTML = `
    <iframe
      src="${embedUrl}"
      width="100%"
      height="100%"
      frameborder="0"
      allow="encrypted-media; autoplay; fullscreen; picture-in-picture"
      allowfullscreen
      style="position:absolute;top:0;left:0;width:100%;height:100%;"
      title="Stream Player"
    ></iframe>
  `;

  // Save preferred server
  localStorage.setItem('cs_preferred_player', serverKey);
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
      movie: movieDetailsData || { id: movieId, title: initialTitle, poster_path: null, release_date: '2026', media_type: mediaType }
    };

    localStorage.setItem(key, JSON.stringify(allProgress));
  } catch (e) {
    console.warn('Could not save progress:', e);
  }
}

/* ================================================
   VIDUKI SERVER FALLBACK CASCADE
================================================ */
function switchToFallbackApi(mediaInfo) {
  vidukiFallbackIndex++;
  if (vidukiFallbackIndex < VIDUKI_FALLBACK_ORDER.length) {
    const nextServer = VIDUKI_FALLBACK_ORDER[vidukiFallbackIndex];
    console.log(`Viduki fallback: switching to ${nextServer}`);
    showToast(`Server unavailable. Switching to ${SERVER_INFO.find(s => s.key === nextServer)?.name || nextServer}...`, '🔄');
    renderEmbedServer(nextServer);
  } else {
    showToast('All priority servers unavailable. Try a different server from the menu.', '⚠️');
  }
}

/* ================================================
   WATCH PARTY SYNC ROOM ENGINE
================================================ */
function initWatchParty() {
  const drawer = $('partyDrawer');
  const closeBtn = $('closePartyBtn');
  const msgInput = $('partyMsgInput');
  const sendBtn = $('sendPartyMsgBtn');

  if (!drawer) return;

  if (closeBtn) {
    closeBtn.onclick = () => {
      drawer.classList.add('hidden');
      clearInterval(botInterval);
      clearInterval(reactionInterval);
    };
  }

  const sendMessage = () => {
    const text = msgInput.value.trim();
    if (!text) return;
    const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
    const sender = activeProfile.name || 'Viewer';

    const box = $('partyMessages');
    const msgEl = document.createElement('div');
    msgEl.className = 'party-msg';
    msgEl.innerHTML = `<strong></strong>: <span class="msg-body"></span>`;
    msgEl.querySelector('strong').textContent = sender;
    msgEl.querySelector('.msg-body').textContent = text;
    box.appendChild(msgEl);
    box.scrollTop = box.scrollHeight;
    msgInput.value = '';
  };

  if (sendBtn) sendBtn.onclick = sendMessage;
  if (msgInput) msgInput.onkeypress = (e) => { if (e.key === 'Enter') sendMessage(); };
}

function handleSidebarWatchParty() {
  closePlayerSidebar();
  const drawer = $('partyDrawer');
  if (!drawer) return;

  const roomCode = 'PARTY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  $('roomCodeDisplay').textContent = roomCode;
  drawer.classList.remove('hidden');
  
  // Start bot chat and reaction simulation
  startWatchPartyBotSimulation();

  // Unlock 'social' achievement
  try {
    const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
    const profileId = activeProfile.id || 'default';
    const unlockedKey = `cs_unlocked_achievements_${profileId}`;
    const unlocked = JSON.parse(localStorage.getItem(unlockedKey) || '[]');
    if (!unlocked.includes('social')) {
      unlocked.push('social');
      localStorage.setItem(unlockedKey, JSON.stringify(unlocked));
      
      const toast = document.createElement('div');
      toast.style.cssText = 'position:fixed;bottom:24px;left:24px;background:var(--accent);color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);font-size:0.85rem;display:flex;align-items:center;gap:8px;';
      toast.innerHTML = '<span>🏆</span> Achievement Unlocked: Social Streamer! 🤝';
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s';
        setTimeout(() => toast.remove(), 500);
      }, 4000);
    }
  } catch (e) {}

  try {
    navigator.clipboard.writeText(`${window.location.origin}${window.location.pathname}?id=${movieId}&party=${roomCode}`);
    showToast(`Watch Party Created! Link copied. Code: ${roomCode}`, '🍿');
  } catch (e) {
    showToast(`Watch Party Created! Code: ${roomCode}`, '🍿');
  }
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
      if (!text) return showToast('Please enter a review', '⚠️');

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

      // Unlock 'reviewer' achievement
      try {
        const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
        const profileId = activeProfile.id || 'default';
        const unlockedKey = `cs_unlocked_achievements_${profileId}`;
        const unlocked = JSON.parse(localStorage.getItem(unlockedKey) || '[]');
        if (!unlocked.includes('reviewer')) {
          unlocked.push('reviewer');
          localStorage.setItem(unlockedKey, JSON.stringify(unlocked));
          
          const toast = document.createElement('div');
          toast.style.cssText = 'position:fixed;bottom:24px;left:24px;background:var(--accent);color:#fff;padding:12px 24px;border-radius:12px;font-weight:700;z-index:9999;box-shadow:0 10px 30px rgba(0,0,0,0.4);border:1px solid rgba(255,255,255,0.1);font-size:0.85rem;display:flex;align-items:center;gap:8px;';
          toast.innerHTML = '<span>🏆</span> Achievement Unlocked: Critic! ✍️';
          document.body.appendChild(toast);
          setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => toast.remove(), 500);
          }, 4000);
        }
      } catch (e) {}

      textInput.value = '';
      renderReviews();
      showToast('Review posted successfully!', '✍️');
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
    populateSidebarNowPlaying(null);
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

  // TV Show handling
  if (mediaType === 'tv') {
    totalSeasons = details.number_of_seasons || 1;
    
    // Populate sidebar season select
    const sidebarSeasonSelect = $('sidebarSeasonSelect');
    if (sidebarSeasonSelect) {
      sidebarSeasonSelect.innerHTML = Array.from({length: totalSeasons}, (_, i) => `<option value="${i+1}">Season ${i+1}</option>`).join('');
      sidebarSeasonSelect.value = currentSeason;
      sidebarSeasonSelect.onchange = (e) => {
        currentSeason = parseInt(e.target.value, 10);
        loadSidebarEpisodes(currentSeason);
      };
    }

    // Show episode sections in sidebar
    const epNav = $('sidebarEpNav');
    if (epNav) epNav.style.display = 'flex';
    const epSection = $('sidebarEpisodesSection');
    if (epSection) epSection.style.display = 'block';

    loadSidebarEpisodes(currentSeason);
  }

  // Populate sidebar Now Playing
  populateSidebarNowPlaying(details);

  loadWatchCastAndSimilar();
}

/* ================================================
   SIDEBAR — Now Playing
================================================ */
function populateSidebarNowPlaying(details) {
  const posterEl = $('sidebarPoster');
  const titleEl = $('sidebarNpTitle');
  const episodeEl = $('sidebarNpEpisode');
  const metaEl = $('sidebarNpMeta');
  const overviewEl = $('sidebarNpOverview');

  if (!details) {
    if (titleEl) titleEl.textContent = initialTitle;
    return;
  }

  const title = details.title || details.name || initialTitle;
  if (posterEl) posterEl.src = details.poster_path ? `${IMG_BASE}w185${details.poster_path}` : '';
  if (titleEl) titleEl.textContent = title;

  if (mediaType === 'tv') {
    if (episodeEl) {
      episodeEl.textContent = `Season ${currentSeason} • Episode ${currentEpisode}`;
      episodeEl.style.display = 'block';
    }
  }

  if (metaEl) {
    const year = (details.release_date || details.first_air_date || '2025').slice(0, 4);
    const rating = details.vote_average ? `⭐ ${details.vote_average.toFixed(1)}` : '';
    metaEl.textContent = `${year} ${rating ? '• ' + rating : ''}`;
  }

  if (overviewEl) {
    overviewEl.textContent = details.overview || '';
  }
}

function updateSidebarNowPlayingEpisode() {
  const episodeEl = $('sidebarNpEpisode');
  if (episodeEl && mediaType === 'tv') {
    episodeEl.textContent = `Season ${currentSeason} • Episode ${currentEpisode}`;
    episodeEl.style.display = 'block';
  }
}

/* ================================================
   SIDEBAR — Episode Navigation (Prev/Next)
================================================ */
function goToPrevEpisode() {
  if (currentEpisode > 1) {
    currentEpisode--;
  } else if (currentSeason > 1) {
    currentSeason--;
    currentEpisode = 1; // Will be updated when episodes load
    const seasonSelect = $('sidebarSeasonSelect');
    if (seasonSelect) seasonSelect.value = currentSeason;
    loadSidebarEpisodes(currentSeason);
  }
  watchedSeconds = 0;
  updateSidebarNowPlayingEpisode();
  renderEmbedServer(currentServer);
  updateEpNavButtons();
  highlightSidebarEpisode();
}

function goToNextEpisode() {
  if (currentEpisode < totalEpisodesInSeason) {
    currentEpisode++;
  } else if (currentSeason < totalSeasons) {
    currentSeason++;
    currentEpisode = 1;
    const seasonSelect = $('sidebarSeasonSelect');
    if (seasonSelect) seasonSelect.value = currentSeason;
    loadSidebarEpisodes(currentSeason);
  }
  watchedSeconds = 0;
  updateSidebarNowPlayingEpisode();
  renderEmbedServer(currentServer);
  updateEpNavButtons();
  highlightSidebarEpisode();
}

function updateEpNavButtons() {
  const prevBtn = $('prevEpBtn');
  const nextBtn = $('nextEpBtn');
  if (prevBtn) prevBtn.disabled = (currentSeason === 1 && currentEpisode === 1);
  if (nextBtn) nextBtn.disabled = (currentSeason === totalSeasons && currentEpisode >= totalEpisodesInSeason);
}

/* ================================================
   SIDEBAR — Episodes Grid
================================================ */
async function loadSidebarEpisodes(seasonNum) {
  const grid = $('sidebarEpGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="color:var(--muted);font-size:0.72rem;padding:4px 0;">Loading...</div>';

  try {
    const seasonData = await apiFetch(`/tv/${movieId}/season/${seasonNum}`);
    const eps = seasonData?.episodes || [];
    grid.innerHTML = '';
    if (!eps.length) {
      for (let i = 1; i <= 10; i++) eps.push({ episode_number: i, name: `Episode ${i}` });
    }
    totalEpisodesInSeason = eps.length;

    eps.forEach(ep => {
      const btn = document.createElement('button');
      btn.className = `sidebar-ep-btn ${ep.episode_number === currentEpisode && seasonNum === currentSeason ? 'active' : ''}`;
      btn.textContent = `E${ep.episode_number}`;
      btn.title = ep.name || `Episode ${ep.episode_number}`;
      btn.onclick = () => {
        currentEpisode = ep.episode_number;
        currentSeason = seasonNum;
        watchedSeconds = 0;
        highlightSidebarEpisode();
        updateSidebarNowPlayingEpisode();
        renderEmbedServer(currentServer);
        updateEpNavButtons();
      };
      grid.appendChild(btn);
    });

    updateEpNavButtons();
  } catch (e) {
    grid.innerHTML = '<div style="color:var(--muted);font-size:0.72rem;padding:4px 0;">Could not load episodes.</div>';
  }
}

function highlightSidebarEpisode() {
  $$('.sidebar-ep-btn').forEach(btn => {
    const epNum = parseInt(btn.textContent.replace('E', ''), 10);
    btn.classList.toggle('active', epNum === currentEpisode);
  });
}

/* ================================================
   SIDEBAR — Server Buttons
================================================ */
function renderSidebarServers() {
  const grid = $('sidebarServersGrid');
  if (!grid) return;
  grid.innerHTML = '';

  SERVER_INFO.forEach(server => {
    const btn = document.createElement('div');
    btn.className = `sidebar-server-btn ${server.key === currentServer ? 'active' : ''}`;
    btn.dataset.server = server.key;
    btn.innerHTML = `
      <div class="sidebar-server-icon" style="background:${server.gradient}">${server.icon}</div>
      <div class="sidebar-server-info">
        <div class="sidebar-server-name">${server.name}</div>
        <div class="sidebar-server-desc">${server.desc}</div>
      </div>
      <div class="sidebar-server-status"></div>
    `;
    btn.onclick = () => {
      currentServer = server.key;
      vidukiFallbackIndex = VIDUKI_FALLBACK_ORDER.indexOf(server.key);
      if (vidukiFallbackIndex === -1) vidukiFallbackIndex = VIDUKI_FALLBACK_ORDER.length;
      renderEmbedServer(server.key);
      updateSidebarServerHighlight(server.key);
    };
    grid.appendChild(btn);
  });
}

function updateSidebarServerHighlight(serverKey) {
  $$('.sidebar-server-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.server === serverKey);
  });
}

/* ================================================
   SIDEBAR — Toggle Open/Close
================================================ */
function openPlayerSidebar() {
  const sidebar = $('playerSidebar');
  const overlay = $('sidebarOverlay');
  const menuBtn = $('sidebarMenuBtn');
  if (sidebar) sidebar.classList.add('open');
  if (overlay) overlay.classList.add('open');
  if (menuBtn) menuBtn.classList.add('hidden');
}

function closePlayerSidebar() {
  const sidebar = $('playerSidebar');
  const overlay = $('sidebarOverlay');
  const menuBtn = $('sidebarMenuBtn');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('open');
  if (menuBtn) menuBtn.classList.remove('hidden');
}

function toggleSidebarSection(sectionId) {
  const section = $(sectionId);
  if (section) section.classList.toggle('open');
}

/* ================================================
   POSTMESSAGE LISTENERS — Viduki + Legacy
================================================ */
window.addEventListener('message', (event) => {
  const data = event.data || {};
  const { type } = data;
  if (!type) return;

  // ─── Viduki: Server Fallback ───
  if (event.origin === 'https://www.viduki.net' || event.origin === 'https://viduki.net') {
    if (type === 'viduki:all-servers-failed') {
      console.log('Viduki fallback triggered:', data);
      switchToFallbackApi(data.media);
      return;
    }
  }

  // ─── Viduki: Watch Progress ───
  if (type === 'MEDIA_DATA') {
    try {
      const mediaData = data.data;
      if (mediaData) {
        localStorage.setItem('vidukinet-Progress', JSON.stringify(mediaData));
        // Also sync with our own progress tracking
        if (mediaData[movieId] && mediaData[movieId].progress) {
          watchedSeconds = Math.floor(mediaData[movieId].progress.watched || 0);
          saveWatchProgress(watchedSeconds);
        }
      }
    } catch (e) {
      console.warn('Error processing Viduki progress data:', e);
    }
    return;
  }

  // ─── 1embed events ───
  switch (type) {
    case "VIDEO_PLAY":
      console.log("1embed: Playing");
      break;
    case "VIDEO_PAUSE":
      console.log("1embed: Paused");
      break;
    case "VIDEO_PROGRESS":
      if (data.payload && data.payload.currentTime) {
        watchedSeconds = Math.floor(data.payload.currentTime);
        saveWatchProgress(watchedSeconds);
      }
      break;
    case "VIDEO_ended":
    case "VIDEO_ENDED":
      console.log("1embed: Video ended");
      break;
  }

  // ─── CineSrc events ───
  if (event.origin === 'https://cinesrc.st') {
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
  }
});

/* ================================================
   INIT
================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initAccentThemes();
  initWatchParty();
  initCommunityReviews();

  // Render sidebar servers
  renderSidebarServers();

  // Load content details (populates sidebar + below-player)
  loadContentDetails();
  
  // Auto-play on first server (Viduki API 1) — or preferred
  const preferredServer = localStorage.getItem('cs_preferred_player') || 'viduki1';
  // If preferred is a legacy server that we still support, use it; otherwise default to viduki1
  const validServer = SERVER_URLS[preferredServer] ? preferredServer : 'viduki1';
  renderEmbedServer(validServer);

  // Keyboard shortcut: Escape closes sidebar
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePlayerSidebar();
  });
});

function triggerDownload() {
  closePlayerSidebar();
  const overlay = $('downloadProgressOverlay');
  const percentEl = $('downloadPercent');
  const statusEl = $('downloadStatusText');
  if (!overlay || !percentEl || !statusEl) return;

  overlay.classList.add('active');
  let progress = 0;
  statusEl.textContent = 'Allocating local storage block...';
  
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 8) + 4;
    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);
      
      // Save movie details to offline library
      try {
        const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
        const profileId = activeProfile.id || 'default';
        const downloadKey = `cs_downloads_${profileId}`;
        const downloads = JSON.parse(localStorage.getItem(downloadKey) || '[]');
        
        const isExists = downloads.some(d => d.id === movieId);
        if (!isExists) {
          const downloadItem = {
            id: movieId,
            title: movieDetailsData?.title || movieDetailsData?.name || initialTitle,
            name: movieDetailsData?.name || movieDetailsData?.title || initialTitle,
            poster_path: movieDetailsData?.poster_path || null,
            backdrop_path: movieDetailsData?.backdrop_path || null,
            release_date: movieDetailsData?.release_date || movieDetailsData?.first_air_date || '2026',
            media_type: mediaType,
            season: currentSeason,
            episode: currentEpisode,
            downloadedAt: Date.now()
          };
          downloads.push(downloadItem);
          localStorage.setItem(downloadKey, JSON.stringify(downloads));
        }

        statusEl.textContent = 'Encryption complete! Saved to library.';
        setTimeout(() => {
          overlay.classList.remove('active');
          showToast(`📥 "${movieDetailsData?.title || movieDetailsData?.name || initialTitle}" added to Offline Downloads!`, '📥');
        }, 1000);
      } catch (e) {
        console.error('Error saving download:', e);
        overlay.classList.remove('active');
      }
    } else {
      percentEl.textContent = `${progress}%`;
      if (progress > 10 && progress < 40) {
        statusEl.textContent = 'Fetching media stream blocks...';
      } else if (progress >= 40 && progress < 75) {
        statusEl.textContent = 'Writing cached segments...';
      } else if (progress >= 75) {
        statusEl.textContent = 'Verifying digital signatures...';
      }
    }
  }, 150);
}

function renderOfflinePlayer() {
  const wrapper = $('playerWrapper');
  if (!wrapper) return;
  
  const title = movieDetailsData?.title || movieDetailsData?.name || initialTitle;
  
  wrapper.innerHTML = `
    <div class="offline-player-placeholder">
      <div class="offline-player-icon">🔌</div>
      <div class="offline-player-title">Offline Playback Mode</div>
      <div class="offline-player-status">Playing Cache: ${title} (Simulated Stream)</div>
      
      <!-- Video Loop Simulation -->
      <div id="simulatedVisual" style="width:100%;height:100%;position:absolute;inset:0;background:radial-gradient(circle, rgba(229,9,20,0.12) 0%, rgba(0,0,0,0) 70%);opacity:0.4;z-index:1;transition:opacity 0.5s;"></div>
      
      <!-- Custom Controls Overlay -->
      <div class="offline-controls-overlay">
        <button class="offline-play-btn" id="offlinePlayBtn">▶</button>
        <div class="offline-timeline-container" id="offlineTimelineContainer">
          <div class="offline-timeline-fill" id="offlineTimelineFill"></div>
        </div>
        <div class="offline-time-lbl" id="offlineTimeLbl">00:00 / 02:00</div>
      </div>
    </div>
  `;

  let isPlaying = false;
  let simulatedSeconds = watchedSeconds || 0;
  const totalSeconds = 120; // 2 mins mock length
  let simInterval = null;

  const playBtn = $('offlinePlayBtn');
  const fill = $('offlineTimelineFill');
  const label = $('offlineTimeLbl');
  const visual = $('simulatedVisual');

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };

  const updateTimeUI = () => {
    fill.style.width = `${(simulatedSeconds / totalSeconds) * 100}%`;
    label.textContent = `${formatTime(simulatedSeconds)} / ${formatTime(totalSeconds)}`;
  };

  updateTimeUI();

  const togglePlay = () => {
    isPlaying = !isPlaying;
    if (isPlaying) {
      playBtn.textContent = '⏸';
      visual.style.opacity = '1';
      simInterval = setInterval(() => {
        simulatedSeconds++;
        if (simulatedSeconds >= totalSeconds) {
          simulatedSeconds = 0;
          isPlaying = false;
          clearInterval(simInterval);
          playBtn.textContent = '▶';
          visual.style.opacity = '0.4';
        }
        updateTimeUI();
        saveWatchProgress(simulatedSeconds);
      }, 1000);
    } else {
      playBtn.textContent = '▶';
      visual.style.opacity = '0.4';
      clearInterval(simInterval);
    }
  };

  playBtn.onclick = togglePlay;
  
  $('offlineTimelineContainer').onclick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    simulatedSeconds = Math.floor(pct * totalSeconds);
    updateTimeUI();
    saveWatchProgress(simulatedSeconds);
  };
}

// ---- SLIDER SCROLLING ----
function scrollWatchSlider(id, dir) {
  const track = $(id);
  if (track) track.scrollBy({ left: dir * 300, behavior: 'smooth' });
}

// ---- CAST & SIMILAR FETCHING ----
async function loadWatchCastAndSimilar() {
  const isOffline = localStorage.getItem('cs_offline_mode') === '1';
  if (isOffline) {
    // Hide sections since we are offline and don't make API calls
    $('castSectionTitle').style.display = 'none';
    $('castSlider').style.display = 'none';
    $('similarSectionTitle').style.display = 'none';
    $('similarMoviesSection').style.display = 'none';
    return;
  }

  try {
    const [creds, similar] = await Promise.all([
      apiFetch(`/${mediaType}/${movieId}/credits`),
      apiFetch(`/${mediaType}/${movieId}/similar`)
    ]);

    // 1. Render Cast
    const castSlider = $('castSlider');
    const castTitle = $('castSectionTitle');
    if (castSlider && creds && creds.cast && creds.cast.length > 0) {
      castSlider.innerHTML = '';
      creds.cast.slice(0, 10).forEach(c => {
        const card = document.createElement('div');
        card.className = 'cast-card';
        card.onclick = () => openWatchActor(c.id);
        card.innerHTML = `
          <img class="cast-avatar" src="${c.profile_path ? IMG_BASE + 'w185' + c.profile_path : ''}" onerror="this.style.background='var(--card2)'"/>
          <div class="cast-name">${c.name}</div>
          <div class="cast-char">${c.character || 'Actor'}</div>
        `;
        castSlider.appendChild(card);
      });
      castTitle.style.display = 'block';
      castSlider.style.display = 'flex';
    } else {
      castTitle.style.display = 'none';
      castSlider.style.display = 'none';
    }

    // 2. Render Similar
    const similarTrack = $('similarMoviesTrack');
    const similarTitle = $('similarSectionTitle');
    const similarSection = $('similarMoviesSection');
    if (similarTrack && similar && similar.results && similar.results.length > 0) {
      similarTrack.innerHTML = '';
      similar.results.slice(0, 10).forEach(m => {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.style.flexShrink = '0';
        card.style.width = '155px';
        const isTV = m.media_type === 'tv' || mediaType === 'tv';
        card.innerHTML = `
          <div class="movie-card-poster" style="height:225px;position:relative;">
            <img src="${m.poster_path ? IMG_BASE + 'w342' + m.poster_path : ''}" alt="${m.title || m.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;border-radius:12px;" onerror="this.style.background='var(--card2)'"/>
            ${m.vote_average ? `<div class="card-badge rating" style="position:absolute;top:8px;right:8px;background:rgba(0,0,0,0.7);color:#ffb800;padding:2px 6px;border-radius:4px;font-size:11px;font-weight:700;">★ ${m.vote_average.toFixed(1)}</div>` : ''}
            <div class="play-overlay" style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;background:rgba(0,0,0,0.5);border-radius:12px;transition:opacity 0.2s;"><div class="play-circle" style="width:40px;height:40px;border-radius:50%;background:var(--accent);display:flex;align-items:center;justify-content:center;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></div>
          </div>
          <div class="card-info" style="padding-top:8px;">
            <div class="card-title" style="font-weight:700;font-size:0.8rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--text);text-align:left;">${m.title || m.name || 'Unknown'}</div>
            <div class="card-meta" style="font-size:0.7rem;color:var(--muted);margin-top:2px;text-align:left;">${(m.release_date || m.first_air_date || '2026').slice(0, 4)} • ${isTV ? 'TV Series' : 'Movie'}</div>
          </div>
        `;
        const overlayEl = card.querySelector('.play-overlay');
        card.onmouseenter = () => { overlayEl.style.opacity = '1'; };
        card.onmouseleave = () => { overlayEl.style.opacity = '0'; };
        
        card.onclick = () => {
          window.location.href = `watch.html?id=${m.id}&type=${isTV ? 'tv' : 'movie'}&title=${encodeURIComponent(m.title || m.name)}`;
        };
        similarTrack.appendChild(card);
      });
      similarTitle.style.display = 'block';
      similarSection.style.display = 'block';
    } else {
      similarTitle.style.display = 'none';
      similarSection.style.display = 'none';
    }

  } catch(e) {
    console.error('Error loading cast/similar:', e);
  }
}

// ---- ACTOR BIO MODAL FOR WATCH PAGE ----
async function openWatchActor(actorId) {
  const modal = $('watchActorModal');
  if (!modal) return;
  modal.style.display = 'flex';
  $('watchActorName').textContent = 'Loading...';
  $('watchActorBio').textContent = '';
  
  try {
    const info = await apiFetch(`/person/${actorId}`);
    if (!info) throw new Error('No info');
    
    $('watchActorPhoto').src = info.profile_path ? IMG_BASE + 'w185' + info.profile_path : '';
    $('watchActorName').textContent = info.name || 'Unknown';
    $('watchActorKnownFor').textContent = info.known_for_department || 'Acting';
    $('watchActorBirthday').textContent = info.birthday ? `Born: ${info.birthday}` : 'Born: —';
    $('watchActorBio').textContent = info.biography || 'No biography available.';
  } catch(e) {
    $('watchActorName').textContent = 'Info unavailable';
    $('watchActorBio').textContent = 'Could not retrieve actor biography.';
  }
}

function closeWatchActor() {
  const modal = $('watchActorModal');
  if (modal) modal.style.display = 'none';
}

function closeWatchActorIfBackdrop(e) {
  if (e.target === $('watchActorModal')) closeWatchActor();
}

// ---- FLOATING REACTIONS & WATCH PARTY BOT SIMULATION ----
let botInterval = null;
let reactionInterval = null;

function sendPartyReaction(emoji) {
  const container = $('floatingReactionContainer');
  if (!container) return;

  const reaction = document.createElement('div');
  reaction.className = 'floating-emoji';
  reaction.textContent = emoji;
  
  // Random horizontal variance
  const randomOffset = Math.floor(Math.random() * 80) - 40; // -40px to +40px
  reaction.style.right = `${50 + randomOffset}px`;
  
  container.appendChild(reaction);

  // Remove after animation finishes
  setTimeout(() => {
    reaction.remove();
  }, 3000);
}

function startWatchPartyBotSimulation() {
  clearInterval(botInterval);
  clearInterval(reactionInterval);

  const botUsers = [
    { name: 'PopcornQueen 🍿', avatar: '🍿' },
    { name: 'CinephileMax ⚡', avatar: '⚡' },
    { name: 'MovieBuff99 🎬', avatar: '🎬' },
    { name: 'AnimeLover ⛩️', avatar: '⛩️' },
    { name: 'FutureGeek 🚀', avatar: '🚀' }
  ];

  const botMessages = [
    "Wow, this opening scene is absolute gold!",
    "The cinematography in this shot is amazing.",
    "Did anyone else notice that detail in the background?",
    "Hahaha! That was hilarious!",
    "OMG! I wasn't expecting that twist!",
    "This soundtrack gives me goosebumps every single time.",
    "Best scene coming up in 3... 2... 1...",
    "I've watched this movie 5 times and it never gets old.",
    "The acting is so top tier here.",
    "Wait, is that actor the same one from the other series?",
    "Perfect movie for tonight. Thanks for the room invite! 🍿",
    "Stream is so smooth on this server node."
  ];

  const reactions = ['👍', '❤️', '😂', '😮', '🔥'];

  // 1. Chat Bot Interval
  botInterval = setInterval(() => {
    const drawer = $('partyDrawer');
    if (drawer && !drawer.classList.contains('hidden')) {
      const bot = botUsers[Math.floor(Math.random() * botUsers.length)];
      const msg = botMessages[Math.floor(Math.random() * botMessages.length)];
      
      const box = $('partyMessages');
      if (box) {
        const msgEl = document.createElement('div');
        msgEl.className = 'party-msg';
        msgEl.innerHTML = `<strong></strong> <span class="msg-body"></span>`;
        msgEl.querySelector('strong').textContent = `${bot.avatar} ${bot.name}:`;
        msgEl.querySelector('.msg-body').textContent = msg;
        box.appendChild(msgEl);
        box.scrollTop = box.scrollHeight;
      }
    }
  }, 8000 + Math.random() * 6000); // 8 to 14 seconds

  // 2. Reaction Bot Interval
  reactionInterval = setInterval(() => {
    const drawer = $('partyDrawer');
    if (drawer && !drawer.classList.contains('hidden')) {
      const emoji = reactions[Math.floor(Math.random() * reactions.length)];
      sendPartyReaction(emoji);
    }
  }, 4000 + Math.random() * 4000); // 4 to 8 seconds
}

function showToast(msg, icon='ℹ️') {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}
