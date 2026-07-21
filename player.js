/**
 * CineStream / CineVerse — player.js
 * Multi-Server Embed Engine, Cinema Lighting, Progress Tracking & Watch Party Room
 * Clean Scratch Rebuild — Cinema Grade Architecture
 */

'use strict';

// ─── API CONFIGURATION ───
const TMDB_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const BASE_URL = 'https://api.themoviedb.org/3';
const IMG_BASE = 'https://image.tmdb.org/t/p/';

// ─── ROUTE & STATE PARAMS ───
const urlParams = new URLSearchParams(window.location.search);
const movieId = urlParams.get('id') || '157336'; // Default: Interstellar
const mediaType = urlParams.get('type') === 'tv' ? 'tv' : 'movie';
const initialTitle = decodeURIComponent(urlParams.get('title') || 'Interstellar');
const startTime = parseInt(urlParams.get('startTime') || '0', 10) || 0;

// Anime & Anikoto parameters
const isAnimeMode = urlParams.get('isAnime') === '1';
const aniwatchEpId = urlParams.get('aniwatchEpId');
const anilistId = urlParams.get('anilistId');
const malId = urlParams.get('malId');
let currentAudioLang = urlParams.get('audio') || localStorage.getItem('cs_anime_audio') || 'sub';

let currentServer = isAnimeMode ? (currentAudioLang === 'dub' ? 'anikoto_dub' : 'anikoto_sub') : 'viduki1';
let currentSeason = parseInt(urlParams.get('season') || '1', 10) || 1;
let currentEpisode = parseInt(urlParams.get('episode') || '1', 10) || 1;
let movieDetailsData = null;
let selectedStarRating = 5;
let watchTimer = null;
let watchedSeconds = startTime;
let totalEpisodesInSeason = 10;
let totalSeasons = 1;
let isTheaterActive = false;

// ─── DOM HELPER UTILITIES ───
const $ = (id) => document.getElementById(id);
const $$ = (sel) => [...document.querySelectorAll(sel)];

/* ================================================
   ACCENT HEX HELPERS
================================================ */
function getAccentHex() {
  const accent = localStorage.getItem('cs_accent_theme') || 'crimson';
  const hexMap = { crimson: 'e50914', cyan: '00d2d3', gold: 'ffb800', purple: 'a855f7' };
  return hexMap[accent] || 'e50914';
}

function getAccentHexWithHash() {
  return '%23' + getAccentHex();
}

// ─── OFFICIAL ANIME ID RESOLUTION MAP ───
const ANIME_ID_MAP = {
  37854: { malId: 21, anilistId: 21, totalEps: 1120, name: 'One Piece' },
  46260: { malId: 20, anilistId: 20, totalEps: 220, name: 'Naruto' },
  31911: { malId: 1735, anilistId: 1735, totalEps: 500, name: 'Naruto Shippuden' },
  95557: { malId: 38000, anilistId: 101922, totalEps: 65, name: 'Demon Slayer' },
  1429: { malId: 16498, anilistId: 16498, totalEps: 89, name: 'Attack on Titan' },
  114411: { malId: 40748, anilistId: 113415, totalEps: 47, name: 'Jujutsu Kaisen' },
  219109: { malId: 52299, anilistId: 151807, totalEps: 12, name: 'Solo Leveling' },
  30984: { malId: 269, anilistId: 269, totalEps: 366, name: 'Bleach' },
  12971: { malId: 223, anilistId: 223, totalEps: 291, name: 'Dragon Ball Z' },
  46298: { malId: 11061, anilistId: 11061, totalEps: 148, name: 'Hunter x Hunter' },
  65930: { malId: 31964, anilistId: 21459, totalEps: 150, name: 'My Hero Academia' }
};

function getResolvedAnimeInfo(id, title) {
  const numericId = parseInt(id, 10);
  if (ANIME_ID_MAP[numericId]) return ANIME_ID_MAP[numericId];

  const tLower = (title || '').toLowerCase();
  if (tLower.includes('one piece')) return ANIME_ID_MAP[37854];
  if (tLower.includes('naruto shippuden')) return ANIME_ID_MAP[31911];
  if (tLower.includes('naruto')) return ANIME_ID_MAP[46260];
  if (tLower.includes('demon slayer') || tLower.includes('kimetsu')) return ANIME_ID_MAP[95557];
  if (tLower.includes('attack on titan') || tLower.includes('shingeki')) return ANIME_ID_MAP[1429];
  if (tLower.includes('jujutsu kaisen')) return ANIME_ID_MAP[114411];
  if (tLower.includes('solo leveling')) return ANIME_ID_MAP[219109];
  if (tLower.includes('bleach')) return ANIME_ID_MAP[30984];
  if (tLower.includes('dragon ball')) return ANIME_ID_MAP[12971];

  return null;
}

/* ================================================
   SERVER URL BUILDERS (All Priority Servers)
================================================ */
const SERVER_URLS = {
  // ─── TOP PRIORITY SERVERS ───
  zxcstream: (id, type, s, e, st) => {
    return type === 'tv'
      ? `https://zxcstream.xyz/player/tv/${id}/${s}/${e}`
      : `https://zxcstream.xyz/player/movie/${id}`;
  },
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
  vidsync_xyz: (id, type, s, e, st) => type === 'tv' ? `https://vidsync.xyz/embed/tv/${id}/${s}/${e}?autoPlay=true` : `https://vidsync.xyz/embed/movie/${id}?autoPlay=true`,
  movies111: (id, type, s, e, st) => type === 'tv' ? `https://111movies.com/tv/${id}/${s}/${e}` : `https://111movies.com/movie/${id}`,
  vidlink: (id, type, s, e, st) => type === 'tv' ? `https://vidlink.pro/tv/${id}/${s}/${e}` : `https://vidlink.pro/movie/${id}`,
  videasy: (id, type, s, e, st) => type === 'tv' ? `https://player.videasy.net/tv/${id}/${s}/${e}?nextEpisode=true&autoplayNextEpisode=true` : `https://player.videasy.net/movie/${id}`,
  vidfast: (id, type, s, e, st) => type === 'tv' ? `https://vidfast.pro/tv/${id}/${s}/${e}?autoPlay=true` : `https://vidfast.pro/movie/${id}?autoPlay=true`,
  cinesrc: (id, type, s, e, st) => {
    const colorHex = getAccentHexWithHash();
    let url = type === 'tv' 
      ? `https://cinesrc.st/embed/tv/${id}?s=${s}&e=${e}&color=${colorHex}`
      : `https://cinesrc.st/embed/movie/${id}?color=${colorHex}`;
    if (st > 0) url += `&t=${st}`;
    return url;
  },
  vidsrc_to: (id, type, s, e, st) => type === 'tv' ? `https://vidsrc.to/embed/tv/${id}/${s}/${e}` : `https://vidsrc.to/embed/movie/${id}`,
  vidsrc_cc: (id, type, s, e, st) => type === 'tv' ? `https://vidsrc.cc/v2/embed/tv/${id}/${s}/${e}` : `https://vidsrc.cc/v2/embed/movie/${id}`,
  vidnest: (id, type, s, e, st, params) => {
    let url;
    if (params?.anilistId) {
      url = `https://vidnest.fun/anime/${params.anilistId}/${e || 1}/sub`;
    } else if (type === 'tv' || type === 'anime') {
      url = `https://vidnest.fun/tv/${id}/${s || 1}/${e || 1}`;
    } else {
      url = `https://vidnest.fun/movie/${id}`;
    }
    return url;
  },
  // Anime Engine Embeds
  anikoto_sub: (id, type, s, e, st, params) => {
    const resolved = getResolvedAnimeInfo(id, initialTitle);
    if (resolved?.malId) return `https://megaplay.buzz/stream/mal/${resolved.malId}/${e}/sub`;
    const epId = params?.aniwatchEpId || id;
    return `https://vidnest.fun/anime/${epId}/${e || 1}/sub`;
  },
  anikoto_dub: (id, type, s, e, st, params) => {
    const resolved = getResolvedAnimeInfo(id, initialTitle);
    if (resolved?.malId) return `https://megaplay.buzz/stream/mal/${resolved.malId}/${e}/dub`;
    const epId = params?.aniwatchEpId || id;
    return `https://vidnest.fun/anime/${epId}/${e || 1}/dub`;
  },
  megaplay_anilist: (id, type, s, e, st, params) => {
    const resolved = getResolvedAnimeInfo(id, initialTitle);
    const aniId = resolved?.anilistId || params?.anilistId || id;
    const lang = currentAudioLang || 'sub';
    return `https://vidnest.fun/anime/${aniId}/${e || 1}/${lang}`;
  },
  megaplay_mal: (id, type, s, e, st, params) => {
    const resolved = getResolvedAnimeInfo(id, initialTitle);
    const mId = resolved?.malId || params?.malId || id;
    const lang = currentAudioLang || 'sub';
    return `https://megaplay.buzz/stream/mal/${mId}/${e}/${lang}`;
  }
};

/* Server display metadata (Clean Server 1-10 labels with ZXCStream & Viduki on top) */
const ANIME_ONLY_SERVERS = ['anikoto_sub', 'anikoto_dub', 'megaplay_anilist', 'megaplay_mal'];

const SERVER_INFO = [
  { key: 'zxcstream', name: 'Server 1 (ZXC Stream)', desc: 'Primary • Multi-dub HD', icon: '🚀', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  { key: 'viduki1', name: 'Server 2 (Viduki Multi)', desc: 'Auto-cascading HD stream node', icon: '⚡', gradient: 'linear-gradient(135deg,#ff6b35,#e50914)' },
  { key: 'viduki2', name: 'Server 3 (Viduki Multi-Lang)', desc: 'Multi-language audio stream', icon: '🌐', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
  { key: 'viduki3', name: 'Server 4 (Viduki Premium)', desc: 'Ultra HD high speed stream', icon: '👑', gradient: 'linear-gradient(135deg,#ffb800,#f59e0b)' },
  { key: 'vidsync_xyz', name: 'Server 5 (VidSync Cloud)', desc: 'Fast HLS video stream', icon: '🚀', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
  { key: 'movies111', name: 'Server 6 (111 Movies)', desc: 'Zero ads • fast playback', icon: '🎬', gradient: 'linear-gradient(135deg,#a855f7,#7c3aed)' },
  { key: 'vidlink', name: 'Server 7 (VidLink Pro)', desc: 'High-definition CDN node', icon: '⚡', gradient: 'linear-gradient(135deg,#00d2d3,#3b82f6)' },
  { key: 'videasy', name: 'Server 8 (Videasy Stream)', desc: 'Auto-next episode engine', icon: '🔮', gradient: 'linear-gradient(135deg,#ff4081,#ff75a0)' },
  { key: 'vidfast', name: 'Server 9 (VidFast Pro)', desc: 'High-speed auto-buffering', icon: '🛸', gradient: 'linear-gradient(135deg,#10b981,#059669)' },
  { key: 'cinesrc', name: 'Server 10 (CineSrc HD)', desc: 'Theme sync • Full HD', icon: '🍁', gradient: 'linear-gradient(135deg,#f43f5e,#be123c)' },
  { key: 'vidsrc_to', name: 'Server 11 (VidSrc Pro)', desc: 'High speed backup node', icon: '⚡', gradient: 'linear-gradient(135deg,#ff6b35,#e50914)' },
  { key: 'vidsrc_cc', name: 'Server 12 (VidSrc v2)', desc: 'Multi-resolution backup', icon: '🌐', gradient: 'linear-gradient(135deg,#3b82f6,#1d4ed8)' },
  { key: 'vidnest', name: 'Server 13 (VidNest Direct)', desc: 'Anime & TV series stream', icon: '⛩️', gradient: 'linear-gradient(135deg,#ef4444,#dc2626)' },
  // Dedicated Anime Hub Nodes
  { key: 'anikoto_sub', name: 'Anikoto Sub (MegaPlay)', desc: 'Japanese Audio • English Subs', icon: '⛩️', gradient: 'linear-gradient(135deg,#ff75a0,#a855f7)' },
  { key: 'anikoto_dub', name: 'Anikoto Dub (MegaPlay)', desc: 'English Dubbed Audio', icon: '🎙️', gradient: 'linear-gradient(135deg,#a855f7,#3b82f6)' },
  { key: 'megaplay_anilist', name: 'AniList Engine (MegaPlay)', desc: 'Direct AniList Stream', icon: '🌸', gradient: 'linear-gradient(135deg,#ff4081,#ff75a0)' },
  { key: 'megaplay_mal', name: 'MyAnimeList Engine', desc: 'Direct MAL Stream', icon: '⚡', gradient: 'linear-gradient(135deg,#00d2d3,#3b82f6)' },
];

/* Auto-shifting fallback cascade order */
const AUTO_FALLBACK_CASCADE = [
  'zxcstream', 'viduki1', 'viduki2', 'viduki3', 'vidsync_xyz', 
  'movies111', 'vidlink', 'videasy', 'vidfast', 'cinesrc', 
  'vidsrc_to', 'vidsrc_cc', 'vidnest'
];
let autoFallbackIndex = 0;

/* ================================================
   TMDB API FETCHER
================================================ */
async function apiFetch(endpoint, params = {}) {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set('api_key', TMDB_KEY);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  try {
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error('API Fetch Error:', e);
    return null;
  }
}

/* ================================================
   THEME SYSTEM (Accent Swatches & Mode)
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
      renderEmbedServer(currentServer);
    };
  });
}

function applyModeTheme(mode) {
  document.documentElement.className = mode === 'light' ? 'light-theme' : 'dark-theme';
  document.body.classList.remove('light-theme', 'dark-theme');
  document.body.classList.add(mode === 'light' ? 'light-theme' : 'dark-theme');

  const toggleBtn = $('watchModeToggle');
  if (toggleBtn) {
    toggleBtn.innerHTML = mode === 'light' ? '🌙 Dark' : '☀️ Light';
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

  // Update dynamic ambient backlight color
  const glow = $('cinemaGlow');
  if (glow) {
    const hex = getAccentHex();
    glow.style.background = `radial-gradient(circle at 50% 50%, rgba(${hexToRgb(hex)}, 0.45) 0%, transparent 70%)`;
  }
}

function hexToRgb(hex) {
  const bigint = parseInt(hex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `${r}, ${g}, ${b}`;
}

/* ================================================
   THEATER LIGHTS CONTROLLER
================================================ */
function toggleTheaterMode() {
  isTheaterActive = !isTheaterActive;
  document.body.classList.toggle('theater-mode', isTheaterActive);

  const topBtn = $('theaterToggleBtn');
  if (topBtn) topBtn.classList.toggle('active', isTheaterActive);

  const sidebarBtn = $('sidebarTheaterBtn');
  if (sidebarBtn) sidebarBtn.classList.toggle('active', isTheaterActive);

  showToast(isTheaterActive ? '💡 Theater Lights Dimmed' : '💡 Theater Lights Restored', '💡');
}

/* ================================================
   KEYBOARD SHORTCUTS MODAL CONTROLLER
================================================ */
function toggleShortcutsModal() {
  const modal = $('shortcutsModal');
  if (modal) modal.classList.toggle('open');
}

function closeShortcutsModalIfBackdrop(e) {
  if (e.target === $('shortcutsModal')) {
    $('shortcutsModal').classList.remove('open');
  }
}

/* ================================================
   EMBED SERVER RENDERER & PROGRESS TRACKER
================================================ */
function renderEmbedServer(serverKey = 'viduki1') {
  currentServer = serverKey;
  const wrapper = $('playerWrapper');
  if (!wrapper) return;

  // Update active server highlight in sidebar
  updateSidebarServerHighlight(serverKey);

  // Update server status badge
  const serverInfo = SERVER_INFO.find(s => s.key === serverKey);
  if (serverInfo && $('currentActiveServerName')) {
    $('currentActiveServerName').textContent = serverInfo.name;
  }

  const builder = SERVER_URLS[serverKey] || SERVER_URLS.viduki1;
  const embedUrl = builder(movieId, mediaType, currentSeason, currentEpisode, watchedSeconds, {
    aniwatchEpId,
    anilistId,
    malId,
    audio: currentAudioLang
  });

  wrapper.innerHTML = `
    <iframe
      id="embedIframe"
      src="${embedUrl}"
      width="100%"
      height="100%"
      frameborder="0"
      allow="autoplay *; fullscreen *; picture-in-picture *; encrypted-media *; accelerometer *; gyroscope *; display-capture *; screen-wake-lock *"
      allowfullscreen
      allowfullscreen="true"
      webkitallowfullscreen="true"
      mozallowfullscreen="true"
      style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
      title="Stream Player"
    ></iframe>
  `;

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
    localStorage.setItem('cs_progress_default', JSON.stringify(allProgress));
  } catch (e) {
    console.warn('Progress save failed:', e);
  }
}

function switchToFallbackApi() {
  // Manual server selection mode active (auto-shift disabled)
}

/* ================================================
   FULLSCREEN ENGINE
================================================ */
function toggleFullscreen(targetEl) {
  const section = targetEl || document.getElementById('playerSection');
  if (!section) return;

  const isFs = !!(document.fullscreenElement || 
                  document.webkitFullscreenElement || 
                  document.mozFullScreenElement || 
                  document.msFullscreenElement || 
                  section.classList.contains('is-pseudo-fullscreen'));

  if (!isFs) {
    const req = section.requestFullscreen || 
                section.webkitRequestFullscreen || 
                section.mozRequestFullScreen || 
                section.msRequestFullscreen;

    if (req) {
      req.call(section).then(() => {
        updateFullscreenUI(true);
      }).catch(err => {
        console.warn('Native fullscreen blocked, using pseudo-fullscreen fallback:', err);
        section.classList.add('is-pseudo-fullscreen');
        updateFullscreenUI(true);
      });
    } else {
      section.classList.add('is-pseudo-fullscreen');
      updateFullscreenUI(true);
    }
  } else {
    if (section.classList.contains('is-pseudo-fullscreen')) {
      section.classList.remove('is-pseudo-fullscreen');
      updateFullscreenUI(false);
    } else {
      const exit = document.exitFullscreen || 
                   document.webkitExitFullscreen || 
                   document.mozCancelFullScreen || 
                   document.msExitFullscreen;
      if (exit) {
        exit.call(document).catch(e => console.warn('Exit fullscreen failed:', e));
      }
    }
  }
}

function updateFullscreenUI(isFullscreen) {
  const fsBtn = document.getElementById('playerFullscreenBtn');
  if (fsBtn) {
    const expIcon = fsBtn.querySelector('.icon-expand');
    const compIcon = fsBtn.querySelector('.icon-compress');
    const txt = fsBtn.querySelector('.fs-text');
    if (expIcon) expIcon.style.display = isFullscreen ? 'none' : 'block';
    if (compIcon) compIcon.style.display = isFullscreen ? 'block' : 'none';
    if (txt) txt.textContent = isFullscreen ? 'Exit Fullscreen' : 'Fullscreen';
    fsBtn.classList.toggle('active', isFullscreen);
  }

  const sidebarFsBtn = document.getElementById('sidebarFullscreenBtn');
  if (sidebarFsBtn) {
    sidebarFsBtn.classList.toggle('active', isFullscreen);
  }

  const overlayEls = [
    document.getElementById('watchTopbar'),
    document.getElementById('sidebarMenuBtn'),
    document.getElementById('sidebarOverlay'),
    document.getElementById('playerSidebar'),
    document.getElementById('partyDrawer')
  ];

  overlayEls.forEach(el => {
    if (!el) return;
    if (isFullscreen) {
      el.dataset.prevDisplay = el.style.display || '';
      el.style.display = 'none';
    } else {
      el.style.display = el.dataset.prevDisplay || '';
      delete el.dataset.prevDisplay;
    }
  });

  if (isFullscreen) closePlayerSidebar();
}

['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(evt => {
  document.addEventListener(evt, () => {
    const section = document.getElementById('playerSection');
    const fullEl = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
    const isFs = !!fullEl;

    if (section && !isFs) {
      section.classList.remove('is-pseudo-fullscreen');
    }
    updateFullscreenUI(isFs);
  });
});

/* ================================================
   SIDEBAR COMMAND CENTER
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

function renderSidebarServers() {
  const grid = $('sidebarServersGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const animeServerKeys = ['anikoto_sub', 'anikoto_dub', 'megaplay_anilist', 'megaplay_mal', 'vidnest', 'zxcstream', 'cinesrc'];
  const serversToDisplay = isAnimeMode
    ? SERVER_INFO.filter(s => animeServerKeys.includes(s.key))
    : SERVER_INFO.filter(s => !ANIME_ONLY_SERVERS.includes(s.key));

  serversToDisplay.forEach((server, idx) => {
    const btn = document.createElement('div');
    btn.className = `sidebar-server-btn ${server.key === currentServer ? 'active' : ''}`;
    btn.dataset.server = server.key;
    const mockPing = Math.floor(25 + (idx * 8) + (Math.random() * 10));
    const pingColor = mockPing < 50 ? '#10B981' : (mockPing < 80 ? '#F59E0B' : '#EF4444');
    btn.innerHTML = `
      <div class="sidebar-server-icon" style="background:${server.gradient}">${server.icon}</div>
      <div class="sidebar-server-info">
        <div class="sidebar-server-name">${sanitizeHTML(server.name)}</div>
        <div class="sidebar-server-desc">${sanitizeHTML(server.desc)}</div>
      </div>
      <div class="sidebar-server-ping" style="font-size:0.68rem;font-weight:800;color:${pingColor};margin-right:6px;">${mockPing}ms</div>
      <div class="sidebar-server-status"></div>
    `;
    btn.onclick = () => {
      renderEmbedServer(server.key);
      closePlayerSidebar();
      if (typeof showToast === 'function') {
        showToast(`Connected to server node ${server.name} (${mockPing}ms)`, '⚡');
      }
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
   TV SHOW EPISODE NAVIGATOR
================================================ */
function goToPrevEpisode() {
  if (currentEpisode > 1) {
    currentEpisode--;
  } else if (currentSeason > 1) {
    currentSeason--;
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

async function loadSidebarEpisodes(seasonNum) {
  const grid = $('sidebarEpGrid');
  if (!grid) return;
  grid.innerHTML = '<div style="color:var(--muted);font-size:0.72rem;padding:4px 0;">Loading episodes...</div>';

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
    grid.innerHTML = '<div style="color:var(--muted);font-size:0.72rem;padding:4px 0;">Episode grid unavailable.</div>';
  }
}

function highlightSidebarEpisode() {
  $$('.sidebar-ep-btn').forEach(btn => {
    const epNum = parseInt(btn.textContent.replace('E', ''), 10);
    btn.classList.toggle('active', epNum === currentEpisode);
  });
}

/* ================================================
   DETAILS & CAST LOADER
================================================ */
async function loadContentDetails() {
  document.title = 'CineVerse — Cinema Player';

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
    const posterUrl = details.poster_path ? `${IMG_BASE}w185${details.poster_path}` : '';
    poster.src = posterUrl;
    poster.style.display = 'block';

    if (typeof samplePosterColor === 'function' && posterUrl) {
      samplePosterColor(posterUrl);
    }
  }
  const titleEl = $('detailTitle');
  if (titleEl) titleEl.textContent = title;

  const metaEl = $('detailMeta');
  if (metaEl) {
    const year = (details.release_date || details.first_air_date || '2026').slice(0, 4);
    const vote = details.vote_average ? details.vote_average.toFixed(1) : '8.5';
    metaEl.innerHTML = `<span>⭐ ${vote}</span> • <span>${year}</span> • <span style="color:var(--accent-cyan)">${mediaType === 'tv' ? 'TV Series' : 'Movie'}</span>`;
  }

  const overviewEl = $('detailOverview');
  if (overviewEl) overviewEl.textContent = details.overview || 'Streaming content available in HD quality.';

  if (mediaType === 'tv') {
    totalSeasons = details.number_of_seasons || 1;
    const sidebarSeasonSelect = $('sidebarSeasonSelect');
    if (sidebarSeasonSelect) {
      sidebarSeasonSelect.innerHTML = Array.from({length: totalSeasons}, (_, i) => `<option value="${i+1}">Season ${i+1}</option>`).join('');
      sidebarSeasonSelect.value = currentSeason;
      sidebarSeasonSelect.onchange = (e) => {
        currentSeason = parseInt(e.target.value, 10);
        loadSidebarEpisodes(currentSeason);
      };
    }

    const epNav = $('sidebarEpNav');
    if (epNav) epNav.style.display = 'flex';
    const epSection = $('sidebarEpisodesSection');
    if (epSection) epSection.style.display = 'block';

    loadSidebarEpisodes(currentSeason);
  }

  populateSidebarNowPlaying(details);
  loadWatchCastAndSimilar();
}

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

  if (mediaType === 'tv' && episodeEl) {
    episodeEl.textContent = `Season ${currentSeason} • Episode ${currentEpisode}`;
    episodeEl.style.display = 'block';
  }

  if (metaEl) {
    const year = (details.release_date || details.first_air_date || '2026').slice(0, 4);
    const vote = details.vote_average ? `⭐ ${details.vote_average.toFixed(1)}` : '';
    metaEl.textContent = `${year} ${vote ? '• ' + vote : ''}`;
  }

  if (overviewEl) overviewEl.textContent = details.overview || '';
}

function updateSidebarNowPlayingEpisode() {
  const episodeEl = $('sidebarNpEpisode');
  if (episodeEl && mediaType === 'tv') {
    episodeEl.textContent = `Season ${currentSeason} • Episode ${currentEpisode}`;
    episodeEl.style.display = 'block';
  }
}

async function loadWatchCastAndSimilar() {
  const isOffline = localStorage.getItem('cs_offline_mode') === '1';
  if (isOffline) return;

  try {
    const [creds, similar] = await Promise.all([
      apiFetch(`/${mediaType}/${movieId}/credits`),
      apiFetch(`/${mediaType}/${movieId}/similar`)
    ]);

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
    }

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
    }
  } catch (e) {
    console.error('Error loading cast/similar:', e);
  }
}

async function openWatchActor(actorId) {
  const modal = $('watchActorModal');
  if (!modal) return;
  modal.classList.add('open');
  $('watchActorName').textContent = 'Loading actor info...';
  $('watchActorBio').textContent = '';

  try {
    const info = await apiFetch(`/person/${actorId}`);
    if (!info) throw new Error('No info');

    $('watchActorPhoto').src = info.profile_path ? IMG_BASE + 'w185' + info.profile_path : '';
    $('watchActorName').textContent = info.name || 'Unknown';
    $('watchActorKnownFor').textContent = info.known_for_department || 'Acting';
    $('watchActorBirthday').textContent = info.birthday ? `Born: ${info.birthday}` : 'Born: —';
    $('watchActorBio').textContent = info.biography || 'No biography available for this actor.';
  } catch (e) {
    $('watchActorName').textContent = 'Info unavailable';
    $('watchActorBio').textContent = 'Could not retrieve actor details.';
  }
}

function closeWatchActor() {
  const modal = $('watchActorModal');
  if (modal) modal.classList.remove('open');
}

function closeWatchActorIfBackdrop(e) {
  if (e.target === $('watchActorModal')) closeWatchActor();
}

function scrollWatchSlider(id, dir) {
  const track = $(id);
  if (track) track.scrollBy({ left: dir * 300, behavior: 'smooth' });
}

/* ================================================
   COMMUNITY REVIEWS & RATINGS ENGINE
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
      if (!text) return showToast('Please enter your review text', '⚠️');

      const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
      const reviewObj = {
        id: 'rev_' + Date.now(),
        author: activeProfile.name || 'CineVerse Member',
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
      showToast('Review published successfully!', '✍️');
    };
  }

  renderReviews();
}

function renderReviews() {
  const container = $('reviewsList');
  if (!container) return;

  const defaultReviews = [
    { author: 'CinemaFanatic', avatar: '⚡', rating: 5, text: 'Absolute masterpiece! The visuals and soundtrack blew me away.', likes: 14, date: '2 days ago' },
    { author: 'Alex', avatar: '🍿', rating: 4, text: 'Great plot twists and smooth streaming quality on Viduki/ZXCStream.', likes: 6, date: '1 week ago' },
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
        <div style="font-weight:700;font-size:0.82rem;">${r.avatar} ${r.author}</div>
        <div style="color:#ffb800;font-size:0.75rem;">${stars}</div>
      </div>
      <div style="font-size:0.82rem;color:var(--text);opacity:0.85;line-height:1.5;">${r.text}</div>
    `;
    container.appendChild(card);
  });
}

/* ================================================
   WATCH PARTY SYNC ROOM ENGINE
================================================ */
let botInterval = null;
let reactionInterval = null;

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

  const roomCode = 'PARTY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  const partyUrl = `${window.location.origin}/party.html?room=${roomCode}&id=${movieId}&type=${mediaType}&title=${encodeURIComponent(initialTitle)}`;

  try {
    navigator.clipboard.writeText(partyUrl);
    showToast(`Watch Party Room Created! Share link copied to clipboard. Redirecting...`, '🍿');
  } catch (e) {
    showToast(`Watch Party Created! Room Code: ${roomCode}`, '🍿');
  }

  setTimeout(() => {
    window.location.href = partyUrl;
  }, 1000);
}

function sendPartyReaction(emoji) {
  const container = $('floatingReactionContainer');
  if (!container) return;

  const reaction = document.createElement('div');
  reaction.className = 'floating-emoji';
  reaction.textContent = emoji;

  const randomOffset = Math.floor(Math.random() * 80) - 40;
  reaction.style.right = `${50 + randomOffset}px`;

  container.appendChild(reaction);

  setTimeout(() => reaction.remove(), 3000);
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
    "The soundtrack gives me goosebumps every single time.",
    "Stream quality on this server node is incredibly smooth! 🍿",
    "Best scene coming up in 3... 2... 1...",
    "Wait, is that actor the same one from the other series?",
    "Perfect movie night pick! Thanks for room invite!"
  ];

  const reactions = ['👍', '❤️', '😂', '😮', '🔥'];

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
  }, 9000);

  reactionInterval = setInterval(() => {
    const drawer = $('partyDrawer');
    if (drawer && !drawer.classList.contains('hidden')) {
      const emoji = reactions[Math.floor(Math.random() * reactions.length)];
      sendPartyReaction(emoji);
    }
  }, 5000);
}

/* ================================================
   DOWNLOAD SIMULATOR & TOAST NOTIFIER
================================================ */
function triggerDownload() {
  closePlayerSidebar();
  
  const title = movieDetailsData?.title || movieDetailsData?.name || initialTitle;
  
  // Save to offline library
  try {
    const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
    const profileId = activeProfile.id || 'default';
    const downloadKey = `cs_downloads_${profileId}`;
    const downloads = JSON.parse(localStorage.getItem(downloadKey) || '[]');

    const isExists = downloads.some(d => d.id === movieId);
    if (!isExists) {
      downloads.push({
        id: movieId,
        title: title,
        poster_path: movieDetailsData?.poster_path || null,
        media_type: mediaType,
        downloadedAt: Date.now()
      });
      localStorage.setItem(downloadKey, JSON.stringify(downloads));
      localStorage.setItem('cs_downloads_default', JSON.stringify(downloads));
    }
  } catch (e) {}

  // Directly open ZXCStream player — it has a built-in download button
  const zxcUrl = mediaType === 'tv'
    ? `https://zxcstream.xyz/player/tv/${movieId}/${currentSeason}/${currentEpisode}`
    : `https://zxcstream.xyz/player/movie/${movieId}`;
  window.open(zxcUrl, '_blank');
  showToast(`⚡ Opening ZXCStream — use the download button in the player`, '📥');
}

function showToast(msg, icon = 'ℹ️') {
  const container = $('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

/* ================================================
   POSTMESSAGE LISTENERS (Embed Interop & Fallback)
================================================ */
window.addEventListener('message', (event) => {
  let data = event.data;
  if (!data) return;

  // Handle string messages or stringified JSON messages sent by embed players
  if (typeof data === 'string') {
    const rawLower = data.toLowerCase();
    if (
      rawLower === 'fullscreen' ||
      rawLower.includes('requestfullscreen') ||
      rawLower.includes('togglefullscreen') ||
      rawLower.includes('enterfullscreen') ||
      rawLower.includes('jwplayer-fullscreen')
    ) {
      toggleFullscreen();
      return;
    }
    try {
      data = JSON.parse(data);
    } catch (e) {
      // not JSON string
    }
  }

  if (typeof data !== 'object' || data === null) return;

  const type = String(data.type || data.event || data.action || data.msg || '').toLowerCase();
  const evtName = String(data.event || '').toLowerCase();
  const action = String(data.action || '').toLowerCase();

  if (
    type.includes('fullscreen') || 
    evtName.includes('fullscreen') || 
    action.includes('fullscreen') ||
    data.fullscreen === true ||
    data.isFullscreen === true ||
    data.isFullScreen === true
  ) {
    toggleFullscreen();
    return;
  }

  if (event.origin === 'https://www.viduki.net' || event.origin === 'https://viduki.net') {
    if (type === 'viduki:all-servers-failed') {
      switchToFallbackApi(data.media);
      return;
    }
  }

  if (type === 'MEDIA_DATA' && data.data) {
    try {
      const mediaData = data.data;
      if (mediaData[movieId] && mediaData[movieId].progress) {
        watchedSeconds = Math.floor(mediaData[movieId].progress.watched || 0);
        saveWatchProgress(watchedSeconds);
      }
    } catch (e) {}
    return;
  }

  if (type === 'VIDEO_PROGRESS' && data.payload && data.payload.currentTime) {
    watchedSeconds = Math.floor(data.payload.currentTime);
    saveWatchProgress(watchedSeconds);
  }
});

/* ================================================
   GLOBAL KEYBOARD SHORTCUTS ENGINE
================================================ */
document.addEventListener('keydown', (e) => {
  const activeEl = document.activeElement;
  if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.isContentEditable)) {
    return;
  }

  const key = e.key.toLowerCase();

  if (key === 'f') {
    toggleFullscreen();
  } else if (key === 't') {
    toggleTheaterMode();
  } else if (key === 'm') {
    const sidebar = $('playerSidebar');
    if (sidebar && sidebar.classList.contains('open')) closePlayerSidebar();
    else openPlayerSidebar();
  } else if (key === 'n' && mediaType === 'tv') {
    goToNextEpisode();
  } else if (key === 'p' && mediaType === 'tv') {
    goToPrevEpisode();
  } else if (key === '?' || (e.shiftKey && e.key === '/')) {
    toggleShortcutsModal();
  } else if (key === 'escape') {
    const modal = $('shortcutsModal');
    if (modal && modal.classList.contains('open')) {
      modal.classList.remove('open');
      return;
    }
    const actorModal = $('watchActorModal');
    if (actorModal && actorModal.classList.contains('open')) {
      actorModal.classList.remove('open');
      return;
    }
    const sidebar = $('playerSidebar');
    if (sidebar && sidebar.classList.contains('open')) {
      closePlayerSidebar();
      return;
    }
    const section = $('playerSection');
    if (section && section.classList.contains('is-pseudo-fullscreen')) {
      section.classList.remove('is-pseudo-fullscreen');
      updateFullscreenUI(false);
    }
  }
});

/* ================================================
   ANIME AUDIO TOGGLE & SAKURA ENGINE
================================================ */
function togglePlayerAudio(lang) {
  currentAudioLang = lang;
  localStorage.setItem('cs_anime_audio', lang);
  const subBtn = $('playerSubBtn');
  const dubBtn = $('playerDubBtn');
  if (subBtn) subBtn.classList.toggle('active', lang === 'sub');
  if (dubBtn) dubBtn.classList.toggle('active', lang === 'dub');

  if (currentServer === 'anikoto_sub' || currentServer === 'anikoto_dub') {
    renderEmbedServer(lang === 'sub' ? 'anikoto_sub' : 'anikoto_dub');
  } else {
    renderEmbedServer(currentServer);
  }
  showToast(`Player Audio switched to ${lang === 'sub' ? '🇯🇵 Japanese Sub' : '🎙️ English Dub'}`, '⛩️');
}

function initPlayerSakuraPetals() {
  const container = $('sakuraPlayerContainer');
  if (!container || container.children.length > 0) return;
  for (let i = 0; i < 20; i++) {
    const petal = document.createElement('div');
    petal.className = 'sakura-petal';
    const size = Math.random() * 10 + 6;
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 1.3}px`;
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.animationDuration = `${Math.random() * 8 + 6}s`;
    petal.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(petal);
  }
}

/* ================================================
   MEGAPLAY & ANIKOTO PLAYER EVENT LISTENER
================================================ */
window.addEventListener("message", function (event) {
  let data = event.data;
  if (!data) return;

  if (typeof data === "string") {
    try {
      data = JSON.parse(data);
    } catch (e) {
      return;
    }
  }

  // Monitor MegaPlay / megacloud playback progress & events
  if (data.channel === "megacloud" || data.type === "watching-log" || data.event) {
    if (data.currentTime || data.time) {
      const current = data.currentTime || data.time;
      watchedSeconds = Math.floor(current);
      saveWatchProgress(watchedSeconds);
    }

    if (data.event === "complete") {
      showAutoNextCountdown();
    }
  }
});

let autoNextCountdownTimer = null;
function showAutoNextCountdown() {
  if ($('autoNextToast')) return;
  const toast = document.createElement('div');
  toast.id = 'autoNextToast';
  toast.className = 'auto-next-toast';
  let secondsLeft = 5;

  toast.innerHTML = `
    <div>
      <div style="font-weight:800;font-size:0.92rem;color:var(--anime-pink);">Episode Complete! 🍿</div>
      <div style="font-size:0.78rem;color:var(--muted);" id="autoNextTxt">Next episode starts in 5s...</div>
    </div>
    <button class="auto-next-btn" onclick="playNextEpisodeImmediately()">Play Next Now ▶</button>
  `;
  document.body.appendChild(toast);

  autoNextCountdownTimer = setInterval(() => {
    secondsLeft--;
    const txt = $('autoNextTxt');
    if (txt) txt.textContent = `Next episode starts in ${secondsLeft}s...`;

    if (secondsLeft <= 0) {
      clearInterval(autoNextCountdownTimer);
      playNextEpisodeImmediately();
    }
  }, 1000);
}

function playNextEpisodeImmediately() {
  clearInterval(autoNextCountdownTimer);
  const toast = $('autoNextToast');
  if (toast) toast.remove();
  
  if (typeof goToNextEpisode === 'function') {
    goToNextEpisode();
  } else {
    currentEpisode++;
    renderEmbedServer(currentServer);
  }
}

/* ================================================
   APPLICATION DOM INITIALIZER
================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initAccentThemes();
  initWatchParty();
  initCommunityReviews();

  renderSidebarServers();
  loadContentDetails();

  // Check Anime Mode
  if (isAnimeMode) {
    document.body.classList.add('anime-player-mode');
    const subDubGrp = $('playerSubDubGroup');
    const badge = $('animePlayerBadge');
    if (subDubGrp) subDubGrp.style.display = 'flex';
    if (badge) badge.style.display = 'inline-block';
    const subBtn = $('playerSubBtn');
    const dubBtn = $('playerDubBtn');
    if (subBtn) subBtn.classList.toggle('active', currentAudioLang === 'sub');
    if (dubBtn) dubBtn.classList.toggle('active', currentAudioLang === 'dub');
    initPlayerSakuraPetals();

    const sidebarEpSec = $('sidebarEpisodesSection');
    if (sidebarEpSec) sidebarEpSec.style.display = 'block';
  } else {
    document.body.classList.add('standard-player-mode');
    const sidebarEpSec = $('sidebarEpisodesSection');
    if (mediaType === 'tv' && sidebarEpSec) {
      sidebarEpSec.style.display = 'block';
    }
  }

  const preferredServer = localStorage.getItem('cs_preferred_player');
  const defaultServer = isAnimeMode ? 'anikoto_sub' : 'vidlink';
  const isValidPreferred = preferredServer && SERVER_URLS[preferredServer] && (isAnimeMode || !ANIME_ONLY_SERVERS.includes(preferredServer));
  const validServer = isValidPreferred ? preferredServer : defaultServer;
  renderEmbedServer(validServer);
});
