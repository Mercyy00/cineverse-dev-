const API_KEY = '4e44d9029b1270a757cddc766a1bcb63';
const BASE = 'https://api.themoviedb.org/3';
const IMG = 'https://image.tmdb.org/t/p/';

// STATE
let heroMovies = [], heroIdx = 0, heroTimer = null;
let currentMovie = null, currentTV = null;
let popularPage = 1, popularMovies = [];
let activeProfile = null, profiles = [], user = null;
let searchTimeout = null, reviewStarRating = 1;
let allGenres = {}, activeGenreId = null;
let isSpinning = false;
let spinDeg = 0;
let selectedAvatar = '🍿', kidsMode = false;
let trailTimeout = null;

// QUOTES
const QUOTES = [
  {text:"Life is like a box of chocolates. You never know what you're gonna get.",movie:"— Forrest Gump (1994)"},
  {text:"Here's looking at you, kid.",movie:"— Casablanca (1942)"},
  {text:"May the Force be with you.",movie:"— Star Wars (1977)"},
  {text:"You can't handle the truth!",movie:"— A Few Good Men (1992)"},
  {text:"To infinity and beyond!",movie:"— Toy Story (1995)"},
  {text:"Why so serious?",movie:"— The Dark Knight (2008)"},
  {text:"I am inevitable.",movie:"— Avengers: Endgame (2019)"},
  {text:"Elementary, my dear Watson.",movie:"— Sherlock Holmes (2009)"},
  {text:"I'll be back.",movie:"— The Terminator (1984)"},
  {text:"Keep your friends close, but your enemies closer.",movie:"— The Godfather Part II (1974)"},
];

// MOOD GENRE MAP
const MOOD_GENRES = {
  happy: {ids:[35,16],label:'😂 Fun & Laughs'},
  scary: {ids:[27,53],label:'😱 Thrills & Horror'},
  romantic: {ids:[10749,18],label:'💕 Romance'},
  action: {ids:[28,12],label:'💥 Action & Adventure'},
  thoughtful: {ids:[18,36],label:'🤔 Drama & History'},
  adventure: {ids:[12,14,878],label:'🌍 Adventure & Fantasy'},
};

// ACHIEVEMENTS
const ACHIEVEMENTS_DEF = [
  {id:'first_watch',icon:'🎬',name:'First Watch',desc:'Watch your first film',req:1,type:'watch'},
  {id:'binge_5',icon:'🍿',name:'Binge Watcher',desc:'Watch 5 films',req:5,type:'watch'},
  {id:'watchlist_3',icon:'📋',name:'Curator',desc:'Add 3 films to list',req:3,type:'watchlist'},
  {id:'reviewer',icon:'✍️',name:'Critic',desc:'Post your first review',req:1,type:'review'},
  {id:'cinephile',icon:'🎭',name:'Cinephile',desc:'Watch 10 films',req:10,type:'watch'},
  {id:'social',icon:'🤝',name:'Social Streamer',desc:'Share a movie',req:1,type:'share'},
];

// ---- INIT ----
window.onload = async function() {
  loadTheme();
  loadUser();
  
  const introPlayed = sessionStorage.getItem('cs_intro_played') === '1';
  if (introPlayed) {
    const splash = document.getElementById('loadingSplash');
    if (splash) {
      splash.style.display = 'none';
      splash.classList.add('hidden');
    }
    const saved = localStorage.getItem('cs_active_profile');
    if (saved) {
      try {
        activeProfile = JSON.parse(saved);
        revealMainAppDirectly();
      } catch (e) {
        showProfileScreenDirectly();
      }
    } else {
      showProfileScreenDirectly();
    }
  } else {
    sessionStorage.setItem('cs_intro_played', '1');
    animateSplash();
  }
  
  const isOffline = localStorage.getItem('cs_offline_mode') === '1';
  if (isOffline) {
    toggleOfflineMode(true, false);
    setupScrollEvents();
    setupKeyboard();
    renderProfiles();
    updateNavProfile();
  } else {
    await loadGenres();
    await Promise.all([loadHero(), loadPopular()]);
    loadSliders();
    renderGenreChips();
    setRandomQuote();
    setupScrollEvents();
    setupKeyboard();
    renderProfiles();
    updateNavProfile();
  }
};

function revealMainAppDirectly() {
  const ps = document.getElementById('profileScreen');
  if (ps) {
    ps.style.opacity = '0';
    ps.style.visibility = 'hidden';
    ps.classList.add('hidden');
  }
  const app = document.getElementById('mainApp');
  if (app) {
    app.style.opacity = '1';
    app.style.transform = 'translateY(0)';
  }
  updateNavProfile();
  renderWatchlist();
  renderContinueWatching();
}

function showProfileScreenDirectly() {
  const splash = document.getElementById('loadingSplash');
  if (splash) {
    splash.style.display = 'none';
    splash.classList.add('hidden');
  }
  const ps = document.getElementById('profileScreen');
  if (ps) {
    ps.style.opacity = '1';
    ps.style.visibility = 'visible';
    ps.classList.remove('hidden');
  }
}

function animateSplash() {
  const flare = document.querySelector('.intro-lens-flare');
  const lettermark = document.getElementById('introLettermark');
  const logoText = document.getElementById('introLogoText');
  const letters = logoText ? logoText.querySelectorAll('.intro-letter, .intro-letter-accent') : [];
  const underline = document.getElementById('introUnderline');
  const tagline = document.getElementById('introTagline');
  const burst = document.getElementById('introBurst');

  // Load and play intro music
  const introAudio = new Audio('intro music.mp3');
  introAudio.volume = 0.65;
  introAudio.play().catch(e => {
    console.warn("Autoplay blocked by browser policy:", e);
  });

  // Stage 1 — Lens Flare Sweep (0ms)
  setTimeout(() => {
    if (flare) flare.classList.add('animate');
  }, 400);

  // Stage 2 — Lettermark "C" appears (800ms)
  setTimeout(() => {
    if (lettermark) lettermark.classList.add('visible');
  }, 800);

  // Stage 3 — Lettermark shrinks away, logo text appears (1800ms)
  setTimeout(() => {
    if (lettermark) lettermark.classList.add('shrink');
    if (logoText) logoText.classList.add('visible');
    
    // Type out letters one by one
    letters.forEach((letter, i) => {
      setTimeout(() => {
        letter.classList.add('typed');
      }, i * 80);
    });
  }, 1800);

  // Stage 4 — Underline expands + tagline fades in (2600ms)
  setTimeout(() => {
    if (underline) underline.classList.add('expand');
  }, 2600);

  setTimeout(() => {
    if (tagline) tagline.classList.add('visible');
  }, 2900);

  // Stage 5 — Sonic boom burst + fade out (3600ms)
  setTimeout(() => {
    if (burst) burst.classList.add('boom');
    
    // Fade out audio volume smoothly
    let fadeInterval = setInterval(() => {
      if (introAudio.volume > 0.05) {
        introAudio.volume -= 0.05;
      } else {
        introAudio.volume = 0;
        introAudio.pause();
        clearInterval(fadeInterval);
      }
    }, 50);
  }, 3600);

  setTimeout(() => {
    showProfileScreen();
  }, 4200);
}

function showProfileScreen() {
  document.getElementById('loadingSplash').classList.add('hidden');
  const ps = document.getElementById('profileScreen');
  ps.style.opacity = '1';
  // If profile already selected, auto-enter
  const saved = localStorage.getItem('cs_active_profile');
  if(saved) {
    try { activeProfile = JSON.parse(saved); revealMainApp(); return; } catch(e){}
  }
}

function revealMainApp() {
  const ps = document.getElementById('profileScreen');
  ps.style.opacity = '0'; ps.style.transform = 'scale(0.96)';
  setTimeout(() => { ps.style.visibility = 'hidden'; }, 500);
  const app = document.getElementById('mainApp');
  app.style.opacity = '1'; app.style.transform = 'translateY(0)';
  updateNavProfile();
  renderWatchlist();
  renderContinueWatching();
}

// ---- PROFILES ----
let isManageMode = false;

function toggleManageMode() {
  isManageMode = !isManageMode;
  const btn = document.getElementById('manageProfilesBtn');
  if (btn) {
    btn.textContent = isManageMode ? 'Done' : 'Manage';
    btn.classList.toggle('active', isManageMode);
  }
  renderProfiles();
}

function deleteProfile(event, id) {
  event.stopPropagation();
  if (profiles.length <= 1) {
    showToast('You must keep at least one profile!', '⚠️');
    return;
  }
  const index = profiles.findIndex(p => p.id === id);
  if (index !== -1) {
    const deletedName = profiles[index].name;
    profiles.splice(index, 1);
    localStorage.setItem('cs_profiles', JSON.stringify(profiles));
    
    if (activeProfile && activeProfile.id === id) {
      activeProfile = null;
      localStorage.removeItem('cs_active_profile');
      updateNavProfile();
    }
    
    showToast(`Profile "${deletedName}" deleted`, '🗑️');
    renderProfiles();
  }
}

function handleSearchKey(e) {
  if (e.key === 'Enter') {
    const query = e.target.value.trim();
    if (query) {
      window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }
  }
}

function renderProfiles() {
  const defaultProfiles = [
    {id:'p1',name:'Viewer',avatar:'🍿',isKids:false},
    {id:'p2',name:'Movie Buff',avatar:'⚡',isKids:false},
    {id:'p3',name:'Kids Mode',avatar:'🦁',isKids:true},
    {id:'p4',name:'Guest',avatar:'🚀',isKids:false},
  ];
  profiles = JSON.parse(localStorage.getItem('cs_profiles') || 'null') || defaultProfiles;
  
  // Make sure they are written to localStorage so they persist correctly
  if (!localStorage.getItem('cs_profiles')) {
    localStorage.setItem('cs_profiles', JSON.stringify(profiles));
  }

  const grid = document.getElementById('profilesGrid');
  grid.innerHTML = '';
  profiles.forEach(p => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    if (isManageMode) {
      card.classList.add('managing');
    }
    
    let deleteHtml = '';
    if (isManageMode && profiles.length > 1) {
      deleteHtml = `<div class="profile-delete-btn" onclick="deleteProfile(event, '${p.id}')">×</div>`;
    }

    card.innerHTML = `
      ${deleteHtml}
      <div class="profile-avatar">${p.avatar}</div>
      <div class="profile-name">${p.name}</div>
      ${p.isKids ? '<div style="font-size:.7rem;color:var(--accent);">KIDS</div>' : ''}
    `;
    
    card.onclick = () => {
      if (isManageMode) return;
      selectProfile(p);
    };
    grid.appendChild(card);
  });
}

function selectProfile(p) {
  activeProfile = p;
  localStorage.setItem('cs_active_profile', JSON.stringify(p));
  showToast(`👋 Welcome, ${p.name}!`, '🎬');
  revealMainApp();
}

function updateNavProfile() {
  if(!activeProfile) {
    document.getElementById('profileBtnAvatar').textContent = '🍿';
    document.getElementById('profileBtnName').textContent = 'Profile';
    return;
  }
  document.getElementById('profileBtnAvatar').textContent = activeProfile.avatar;
  document.getElementById('profileBtnName').textContent = activeProfile.name;
}

function openAddProfileModal() { document.getElementById('addProfileModal').classList.add('open'); }
function closeAddProfileModal() { document.getElementById('addProfileModal').classList.remove('open'); }
function selectAvatar(el) {
  document.querySelectorAll('.avatar-option').forEach(o => o.classList.remove('selected'));
  el.classList.add('selected'); selectedAvatar = el.dataset.emoji;
}
function toggleKidsMode() {
  kidsMode = !kidsMode;
  const t = document.getElementById('kidsToggle');
  t.classList.toggle('on', kidsMode);
}
function saveNewProfile() {
  const name = document.getElementById('newProfileName').value.trim();
  if(!name) { showToast('Please enter a profile name','⚠️'); return; }
  const newP = {id:'p'+Date.now(),name,avatar:selectedAvatar,isKids:kidsMode};
  profiles.push(newP);
  localStorage.setItem('cs_profiles',JSON.stringify(profiles));
  renderProfiles();
  closeAddProfileModal();
  selectProfile(newP);
  showToast(`Profile "${name}" created!`,'✅');
}

// ---- THEME ----
function loadTheme() {
  const mode = localStorage.getItem('cs_mode') || 'dark';
  const accent = localStorage.getItem('cs_accent_theme') || 'crimson';
  document.documentElement.className = mode === 'light' ? 'light-theme' : 'dark-theme';
  document.body.className = mode === 'light' ? 'light-theme' : 'dark-theme';
  applyAccent(accent, false);
  updateModeBtn(mode);
  
  // Re-apply Liquid Glass Theme if enabled
  const isLiquid = localStorage.getItem('cs_liquid_glass') === '1';
  if (isLiquid) document.body.classList.add('liquid-glass-theme');
  
  // Re-apply Hero Ambient Glow if enabled
  const isHeroGlow = localStorage.getItem('cs_hero_glow') !== '0';
  if (isHeroGlow) document.body.classList.add('ambient-glow-theme');
}
function setTheme(t) {
  localStorage.setItem('cs_accent_theme', t);
  localStorage.setItem('cs_theme_name', t); // keep in sync with theme.js
  applyAccent(t, true);
  const dropdown = document.getElementById('themeDropdown');
  if (dropdown) dropdown.classList.remove('open');
}
function applyAccent(t, toast=false) {
  // Remove ALL possible theme classes, including the 5 new ones
  document.body.classList.remove(
    'theme-cyan','theme-gold','theme-purple',
    'theme-violet','theme-emerald','theme-rose','theme-sunset','theme-monochrome'
  );
  if(t !== 'crimson') document.body.classList.add(`theme-${t}`);
  document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
  const sw = document.getElementById(`sw-${t}`);
  if(sw) sw.classList.add('active');
  const swSet = document.getElementById(`set-sw-${t}`);
  if(swSet) swSet.classList.add('active');
  if(toast) showToast(`Theme changed to ${t.charAt(0).toUpperCase()+t.slice(1)}`,'🎨');
}
function toggleMode() {
  const isLight = document.body.classList.contains('light-theme');
  const newMode = isLight ? 'dark' : 'light';
  localStorage.setItem('cs_mode', newMode);
  document.documentElement.className = newMode === 'light' ? 'light-theme' : 'dark-theme';
  document.body.classList.remove('light-theme','dark-theme');
  document.body.classList.add(newMode === 'light' ? 'light-theme' : 'dark-theme');
  // re-apply accent
  const accent = localStorage.getItem('cs_accent_theme') || 'crimson';
  if(accent !== 'crimson') document.body.classList.add(`theme-${accent}`);
  
  // re-apply Liquid Glass Theme if enabled
  const isLiquid = localStorage.getItem('cs_liquid_glass') === '1';
  if (isLiquid) document.body.classList.add('liquid-glass-theme');
  
  // re-apply Hero Ambient Glow if enabled
  const isHeroGlow = localStorage.getItem('cs_hero_glow') !== '0';
  if (isHeroGlow) document.body.classList.add('ambient-glow-theme');

  updateModeBtn(newMode);
  document.getElementById('themeDropdown').classList.remove('open');
  showToast(`Switched to ${newMode} mode`,'🌙');
}
function updateModeBtn(mode) {
  const btn = document.getElementById('modeToggleBtn');
  if(!btn) return;
  if(mode === 'light') {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg> Dark Mode`;
  } else {
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 2v3M12 19v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M2 12h3M19 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg> Light Mode`;
  }
}
function toggleThemeDropdown() {
  document.getElementById('themeDropdown').classList.toggle('open');
}

// ---- API ----
async function api(path) {
  const res = await fetch(`${BASE}${path}${path.includes('?')?'&':'?'}api_key=${API_KEY}`);
  if(!res.ok) throw new Error(res.statusText);
  return res.json();
}

// ---- GENRES ----
async function loadGenres() {
  try {
    const [mv, tv] = await Promise.all([api('/genre/movie/list'), api('/genre/tv/list')]);
    [...mv.genres, ...tv.genres].forEach(g => allGenres[g.id] = g.name);
  } catch(e) {}
}

function getGenreNames(ids=[]) {
  return ids.slice(0,3).map(id => allGenres[id]).filter(Boolean);
}

// ---- HERO ----
async function loadHero() {
  try {
    const d = await api('/trending/movie/week');
    heroMovies = d.results.slice(0,8);
    renderHero(0);
    renderHeroDots();
    updateTicker();
    heroTimer = setInterval(() => nextHero(), 8000);
  } catch(e) { console.error(e); }
}

function renderHero(idx) {
  const m = heroMovies[idx];
  if(!m) return;
  heroIdx = idx;
  document.getElementById('heroImg').src = m.backdrop_path ? IMG + 'w1280' + m.backdrop_path : '';
  const title = document.getElementById('heroTitle');
  title.textContent = m.title || m.name || '';
  title.classList.remove('skeleton'); title.style.height = ''; title.style.width = '';
  const meta = document.getElementById('heroMeta');
  const year = (m.release_date || m.first_air_date || '').slice(0,4);
  meta.innerHTML = `<span class="star">★</span> ${m.vote_average?.toFixed(1)} &nbsp;•&nbsp; ${year} &nbsp;•&nbsp; ${getGenreNames(m.genre_ids).join(', ')}`;
  const overview = document.getElementById('heroOverview');
  overview.textContent = m.overview || '';
  overview.classList.remove('skeleton'); overview.style.height = '';
  const btns = document.getElementById('heroBtns');
  const wl = getWatchlist(); const inList = wl.some(x => x.id === m.id);
  btns.innerHTML = `
    <button class="btn-play" id="heroPlayBtn">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
      Watch Stream Now
    </button>
    <button class="btn-list ${inList?'in-list':''}" id="heroListBtn" onclick="toggleHeroWatchlist()">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="${inList?'var(--accent)':'none'}" stroke="${inList?'var(--accent)':'currentColor'}" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      ${inList ? '✓ In My List' : '+ Add to My List'}
    </button>`;
  btns.style.opacity = '1';
  document.getElementById('heroPlayBtn').onclick = () => watchMovie(m);
  document.getElementById('heroRating').textContent = m.vote_average?.toFixed(1) || '--';
  document.getElementById('heroVotes').textContent = (m.vote_count ? m.vote_count.toLocaleString() + ' votes' : '');
  document.getElementById('heroRatingCard').style.opacity = '1';
  document.querySelectorAll('.hero-dot').forEach((d,i) => d.classList.toggle('active', i===idx));
  document.title = 'CineVerse — Premium Cinematic Experience';
}

function renderHeroDots() {
  const dots = document.getElementById('heroDots');
  dots.innerHTML = heroMovies.map((_,i) => `<div class="hero-dot${i===0?' active':''}" onclick="goToHero(${i})"></div>`).join('');
}

function nextHero() { goToHero((heroIdx+1) % heroMovies.length); }
function prevHero() { goToHero((heroIdx-1+heroMovies.length) % heroMovies.length); }
function goToHero(i) { renderHero(i); }

function toggleHeroWatchlist() {
  const m = heroMovies[heroIdx]; if(!m) return;
  toggleWatchlistItem(m);
  renderHero(heroIdx);
}

function updateTicker() {
  if(!heroMovies.length) return;
  const t1 = document.getElementById('tickerInner');
  const items = heroMovies.map(m => `<span class="ticker-item">🔥 <strong>${m.title||m.name}</strong> &nbsp;•&nbsp; ★ ${m.vote_average?.toFixed(1)}</span>`).join('');
  t1.innerHTML = items + items;
}

// ---- JAPANESE ANIME & ANIKOTO API ENGINE ----
const ANIKOTO_BASE = 'https://anikotoapi.site';
let globalAnimeAudio = localStorage.getItem('cs_anime_audio') || 'sub';
let anikotoRecentCache = [];

function setGlobalAnimeAudio(lang) {
  globalAnimeAudio = lang;
  localStorage.setItem('cs_anime_audio', lang);
  const subBtn = document.getElementById('subBtn');
  const dubBtn = document.getElementById('dubBtn');
  if (subBtn) subBtn.classList.toggle('active', lang === 'sub');
  if (dubBtn) dubBtn.classList.toggle('active', lang === 'dub');
  showToast(`Anime Audio set to ${lang === 'sub' ? '🇯🇵 Japanese Sub' : '🎙️ English Dub'}`, '⛩️');
}

function initSakuraPetals() {
  const container = document.getElementById('sakuraContainer');
  if (!container || container.children.length > 0) return;
  
  for (let i = 0; i < 25; i++) {
    const petal = document.createElement('div');
    petal.className = 'sakura-petal';
    const size = Math.random() * 12 + 8;
    petal.style.width = `${size}px`;
    petal.style.height = `${size * 1.3}px`;
    petal.style.left = `${Math.random() * 100}%`;
    petal.style.animationDuration = `${Math.random() * 8 + 6}s`;
    petal.style.animationDelay = `${Math.random() * 5}s`;
    container.appendChild(petal);
  }
}

function activateAnimeThemeMode(active) {
  document.body.classList.toggle('anime-mode', active);
  if (active) {
    initSakuraPetals();
  }
}

async function fetchAnikotoRecentAnime() {
  try {
    const res = await fetch(`${ANIKOTO_BASE}/recent-anime?page=1&per_page=20`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.data || data.anime || data.results || (Array.isArray(data) ? data : []);
  } catch (e) {
    console.warn('Anikoto Recent API offline, utilizing TMDB Anime archive:', e);
    return [];
  }
}

async function fetchAnikotoSeries(seriesId) {
  try {
    const res = await fetch(`${ANIKOTO_BASE}/series/${seriesId}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`Anikoto Series ${seriesId} fetch failed:`, e);
    return null;
  }
}

function filterAnimeGenre(genre, btnEl) {
  if (btnEl) {
    const parent = btnEl.parentElement;
    if (parent) parent.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    btnEl.classList.add('active');
  }

  showToast(`Filtering Anime by ${genre.toUpperCase()}...`, '⛩️');
  const track = document.getElementById('animeTrack');
  if (!track) return;

  api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc')
    .then(d => {
      let items = d.results || [];
      if (genre === 'shonen') items = items.filter(m => (m.overview||'').toLowerCase().includes('fight') || (m.overview||'').toLowerCase().includes('battle') || m.vote_average > 7.8);
      else if (genre === 'isekai') items = items.filter(m => (m.overview||'').toLowerCase().includes('world') || (m.overview||'').toLowerCase().includes('reincarnat'));
      else if (genre === 'action') items = items.filter(m => (m.overview||'').toLowerCase().includes('action') || (m.genre_ids||[]).includes(28));
      else if (genre === 'fantasy') items = items.filter(m => (m.overview||'').toLowerCase().includes('magic') || (m.genre_ids||[]).includes(14));
      else if (genre === 'romance') items = items.filter(m => (m.overview||'').toLowerCase().includes('love') || (m.genre_ids||[]).includes(10749));

      renderSlider('animeTrack', items.slice(0, 20), 'card', 'SUB | DUB', 'Anime');
    });
}

// ---- SLIDERS ----
async function loadSliders() {
  const sliders = [
    {track:'top10Track', fetch:()=>api('/trending/movie/week'), key:'results', type:'top10'},
    {track:'animeTrack', fetch:async () => {
      const tmdbData = await api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc');
      const anikotoList = await fetchAnikotoRecentAnime();
      if (anikotoList && anikotoList.length > 0) {
        anikotoRecentCache = anikotoList;
      }
      return tmdbData;
    }, key:'results', type:'card', badge:'SUB | DUB', seeAll:'Anime'},
    {track:'kdramaTrack', fetch:()=>api('/discover/tv?with_original_language=ko&sort_by=popularity.desc'), key:'results', type:'card', badge:'SUB | DUB', seeAll:'K-Drama'},
    {track:'hollywoodTrack', fetch:()=>api('/discover/movie?with_original_language=en&sort_by=popularity.desc'), key:'results', type:'card', seeAll:'Hollywood'},
    {track:'bollywoodTrack', fetch:()=>api('/discover/movie?with_original_language=hi&sort_by=popularity.desc'), key:'results', type:'card', seeAll:'Bollywood'},
    {track:'tvTrack', fetch:()=>api('/tv/popular'), key:'results', type:'card', seeAll:'TV Shows'},
  ];
  for(const s of sliders) {
    try {
      const d = await s.fetch();
      renderSlider(s.track, d[s.key]?.slice(0,s.type==='top10'?10:20)||[], s.type, s.badge, s.seeAll);
    } catch(e) { console.error(e); }
  }
}

function renderSlider(trackId, items, type, badge, seeAll) {
  const track = document.getElementById(trackId);
  if(!track) return;
  track.innerHTML = '';
  if(type === 'top10') {
    items.forEach((m, i) => {
      const div = document.createElement('div');
      div.className = 'top10-card';
      div.style.cursor = 'pointer';
      div.innerHTML = `<div class="top10-rank">${i+1}</div><div class="movie-card-poster">
        <img src="${m.poster_path ? IMG+'w342'+m.poster_path : ''}" alt="${m.title||m.name}" loading="lazy" onerror="this.style.display='none'"/>
        <div class="play-overlay"><div class="play-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></div>
        ${getRatingBadge(m)} ${isNew(m)?'<div class="new-badge">NEW</div>':''}
        ${getProgressBar(m.id)}
      </div>`;
      div.onclick = () => openMovieTray(m);
      track.appendChild(div);
    });
  } else {
    items.forEach(m => track.appendChild(createMovieCard(m, badge)));
  }
  if(seeAll) {
    const card = document.createElement('div');
    card.className = 'see-all-card';
    card.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><div class="see-all-text">See All</div><div style="font-size:.72rem;">${seeAll}</div>`;
    card.onclick = () => openSeeAll(seeAll);
    track.appendChild(card);
  }
}

function createMovieCard(m, badge) {
  const div = document.createElement('div');
  div.className = 'movie-card';
  const isTV = m.media_type === 'tv' || m.first_air_date !== undefined;
  const isAnime = m.isAnime || (m.genre_ids || []).includes(16) || m.original_language === 'ja' || badge === 'Anime';
  const prog = getProgressBar(m.id);
  div.innerHTML = `<div class="movie-card-poster">
    <img src="${m.poster_path ? IMG+'w342'+m.poster_path : ''}" alt="${m.title||m.name}" loading="lazy" onerror="this.style.display='none'"/>
    ${getRatingBadge(m)}
    ${badge ? `<div class="card-badge sub-dub">${badge}</div>` : ''}
    ${isNew(m) ? '<div class="new-badge">NEW</div>' : ''}
    <div class="play-overlay"><div class="play-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></div>
    ${prog}
  </div>
  <div class="card-info">
    <div class="card-title">${m.title || m.name || 'Unknown'}</div>
    <div class="card-meta">${(m.release_date||m.first_air_date||'').slice(0,4)} • ${isAnime ? 'Anime' : (isTV ? 'TV Series' : 'Movie')}</div>
  </div>`;
  div.onclick = (e) => {
    e.stopPropagation();
    if (isAnime && typeof openAnimeDetails === 'function') {
      openAnimeDetails(m);
    } else if (isTV) {
      openTVSeries(m);
    } else {
      openMovieTray(m);
    }
  };
  return div;
}

function getRatingBadge(m) {
  if(!m.vote_average) return '';
  return `<div class="card-badge rating">★ ${m.vote_average?.toFixed(1)}</div>`;
}

function isNew(m) {
  const d = m.release_date || m.first_air_date;
  if(!d) return false;
  return (Date.now() - new Date(d).getTime()) < 30 * 24 * 60 * 60 * 1000;
}

function getProgressBar(id) {
  if(!activeProfile) return '';
  const progress = JSON.parse(localStorage.getItem(`cs_progress_${activeProfile.id}`) || '{}');
  const p = progress[id];
  if(!p || !p.percent) return '';
  return `<div class="progress-bar"><div class="progress-fill" style="width:${p.percent}%"></div></div>`;
}

function scrollSlider(id, dir) {
  const t = document.getElementById(id);
  if(t) t.scrollBy({left: dir * (155+14)*3, behavior:'smooth'});
}

// ---- POPULAR GRID ----
async function loadPopular() {
  try {
    const endpoint = getPopularEndpoint();
    const d = await api(`${endpoint}&page=${popularPage}`);
    popularMovies = d.results || [];
    renderPopularGrid(popularMovies);
  } catch(e) { console.error(e); }
}

function getPopularEndpoint() {
  const sort = document.getElementById('sortSelect')?.value || 'popular';
  const gid = activeGenreId;
  let base = '/discover/movie?sort_by=popularity.desc';
  if(sort === 'top_rated') base = '/discover/movie?sort_by=vote_average.desc&vote_count.gte=200';
  if(sort === 'latest') base = '/discover/movie?sort_by=release_date.desc';
  if(gid) base += `&with_genres=${gid}`;
  return base;
}

function renderPopularGrid(movies, append=false) {
  const grid = document.getElementById('popularGrid');
  if(!append) grid.innerHTML = '';
  movies.forEach(m => {
    const div = document.createElement('div');
    div.style.cursor = 'pointer';
    div.appendChild(createMovieCard(m));
    grid.appendChild(div);
  });
}

async function loadMorePopular() {
  popularPage++;
  try {
    const d = await api(`${getPopularEndpoint()}&page=${popularPage}`);
    renderPopularGrid(d.results||[], true);
  } catch(e) {}
}

async function sortPopular() {
  popularPage = 1; activeGenreId = null;
  document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
  await loadPopular();
}

function renderGenreChips() {
  const mainGenres = [{id:28,name:'Action'},{id:35,name:'Comedy'},{id:27,name:'Horror'},{id:10749,name:'Romance'},{id:878,name:'Sci-Fi'},{id:18,name:'Drama'},{id:16,name:'Animation'},{id:53,name:'Thriller'},{id:12,name:'Adventure'},{id:80,name:'Crime'}];
  const chips = document.getElementById('genreChips');
  chips.innerHTML = mainGenres.map(g => `<div class="genre-chip" data-id="${g.id}" onclick="filterByGenre(${g.id}, this)">${g.name}</div>`).join('');
}

async function filterByGenre(id, el) {
  if(activeGenreId === id) { activeGenreId = null; el.classList.remove('active'); }
  else { activeGenreId = id; document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active')); el.classList.add('active'); }
  popularPage = 1;
  await loadPopular();
}

// ---- WATCHLIST ----
function getWatchlist() {
  if(!activeProfile) return [];
  return JSON.parse(localStorage.getItem(`cs_watchlist_${activeProfile.id}`) || '[]');
}
function saveWatchlist(wl) {
  if(!activeProfile) return;
  localStorage.setItem(`cs_watchlist_${activeProfile.id}`, JSON.stringify(wl));
}
function toggleWatchlistItem(m) {
  let wl = getWatchlist();
  const idx = wl.findIndex(x => x.id === m.id);
  if(idx >= 0) { wl.splice(idx,1); showToast('Removed from My List','🗑️'); }
  else { wl.push(m); showToast('Added to My List','📋'); checkAchievements(); }
  saveWatchlist(wl);
  renderWatchlist();
}
function renderWatchlist() {
  const wl = getWatchlist();
  const section = document.getElementById('watchlistSection');
  const track = document.getElementById('watchlistTrack');
  if(!wl.length) { section.classList.remove('visible'); return; }
  section.classList.add('visible');
  track.innerHTML = '';
  wl.forEach(m => track.appendChild(createMovieCard(m)));
}

// ---- CONTINUE WATCHING & WATCH HISTORY ----
function renderContinueWatching() {
  const profileId = activeProfile?.id || 'default';
  let progress = JSON.parse(localStorage.getItem(`cs_progress_${profileId}`) || '{}');
  
  // Fallback to default key if active profile key is empty
  if (!Object.keys(progress).length) {
    progress = JSON.parse(localStorage.getItem('cs_progress_default') || '{}');
  }

  const ids = Object.keys(progress).filter(id => progress[id] && progress[id].movie);
  const section = document.getElementById('continueSection');
  const track = document.getElementById('continueTrack');
  if (!section || !track) return;

  if (!ids.length) {
    section.classList.remove('visible');
    return;
  }

  section.classList.add('visible');
  track.innerHTML = '';

  // Sort by latest watched timestamp
  ids.sort((a, b) => (progress[b].timestamp || 0) - (progress[a].timestamp || 0));

  ids.forEach(id => {
    const p = progress[id];
    if (p && p.movie) {
      const card = createMovieCard(p.movie);
      const posterContainer = card.querySelector('.movie-card-poster') || card;
      if (p.percent > 0) {
        const pBar = document.createElement('div');
        pBar.className = 'card-progress-bar';
        pBar.style.cssText = 'position:absolute;bottom:0;left:0;right:0;height:4px;background:rgba(255,255,255,0.2);z-index:4;border-radius:0 0 12px 12px;overflow:hidden;';
        pBar.innerHTML = `<div style="height:100%;width:${p.percent}%;background:var(--accent);"></div>`;
        posterContainer.appendChild(pBar);
      }
      track.appendChild(card);
    }
  });
}

function saveProgress(movieId, movie, seconds, percent) {
  const profileId = activeProfile?.id || 'default';
  const key = `cs_progress_${profileId}`;
  const progress = JSON.parse(localStorage.getItem(key) || '{}');
  progress[movieId] = { seconds, percent, timestamp: Date.now(), movie };
  localStorage.setItem(key, JSON.stringify(progress));
  localStorage.setItem('cs_progress_default', JSON.stringify(progress));
}

// ---- MOVIE DETAIL TRAY ----
async function openMovieTray(m) {
  currentMovie = m;
  // Populate immediately with what we have
  document.getElementById('trayTitle').textContent = m.title || m.name || '';
  document.getElementById('trayBackdropImg').src = m.backdrop_path ? IMG + 'w1280' + m.backdrop_path : '';
  document.getElementById('trayOverview').textContent = m.overview || '';
  const year = (m.release_date || m.first_air_date || '').slice(0,4);
  document.getElementById('trayMeta').textContent = `${year} • ${m.media_type === 'tv' ? 'TV Series' : 'Full Feature Film'}`;
  document.getElementById('trayBadges').innerHTML = `
    ${m.vote_average ? `<div class="quality-badge" style="color:#FFB800;">★ ${m.vote_average.toFixed(1)}</div>` : ''}
    <div class="quality-badge">4K ULTRA HD</div><div class="quality-badge">HDR10+</div>
    <div class="quality-badge">5.1 AUDIO</div><div class="quality-badge">SUB | DUB</div>`;
  document.getElementById('trayGenres').innerHTML = getGenreNames(m.genre_ids||[]).map(g => `<div class="genre-pill">${g}</div>`).join('');
  const isTV = m.media_type === 'tv' || m.first_air_date !== undefined;
  document.getElementById('trayEpisodesBtn').style.display = isTV ? '' : 'none';
  // Watchlist
  const wl = getWatchlist(); const inList = wl.some(x => x.id === m.id);
  document.getElementById('trayWatchlistText').textContent = inList ? '✓ In My List' : '+ Add to My List';
  document.getElementById('trayWatchlistBtn').classList.toggle('in-list', inList);
  // Progress
  if(activeProfile) {
    const progress = JSON.parse(localStorage.getItem(`cs_progress_${activeProfile.id}`) || '{}');
    const p = progress[m.id];
    const rp = document.getElementById('trayResumePrompt');
    if(p && p.percent > 5) {
      const mins = Math.floor(p.seconds/60), secs = p.seconds%60;
      document.getElementById('resumeText').textContent = `You left off at ${mins}:${String(secs).padStart(2,'0')} (${Math.round(p.percent)}% completed)`;
      rp.style.display = 'flex';
    } else { rp.style.display = 'none'; }
  }
  // Open tray
  document.getElementById('trayOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  // Load extras async
  loadTrayCastAndRecs(m.id, isTV);
  loadReviews(m.id);
}

async function loadTrayCastAndRecs(id, isTV) {
  const castTrack = document.getElementById('trayCastTrack');
  const recsTrack = document.getElementById('trayRecsTrack');
  castTrack.innerHTML = '<div style="color:var(--muted);font-size:.82rem;">Loading cast...</div>';
  recsTrack.innerHTML = '<div style="color:var(--muted);font-size:.82rem;">Loading recommendations...</div>';
  try {
    const type = isTV ? 'tv' : 'movie';
    const [credits, recsData] = await Promise.all([
      api(`/${type}/${id}/credits`),
      api(`/${type}/${id}/recommendations`).then(res => (res && res.results?.length) ? res : api(`/${type}/${id}/similar`))
    ]);
    // Cast
    castTrack.innerHTML = '';
    (credits.cast||[]).slice(0,14).forEach(actor => {
      const div = document.createElement('div');
      div.className = 'cast-card';
      div.style.cursor = 'pointer';
      div.onclick = () => openActor(actor.id);
      div.innerHTML = `<img class="cast-photo" src="${actor.profile_path ? IMG+'w185'+actor.profile_path : ''}" alt="${actor.name}" onerror="this.src=''" loading="lazy"/>
        <div class="cast-name">${actor.name}</div>
        <div class="cast-role">${actor.character||''}</div>`;
      castTrack.appendChild(div);
    });
    if(!credits.cast?.length) castTrack.innerHTML = '<div style="color:var(--muted);font-size:.82rem;">No cast info available.</div>';

    // Recs
    recsTrack.innerHTML = '';
    const items = (recsData?.results||[]).slice(0,18);
    items.forEach(m => recsTrack.appendChild(createMovieCard(m)));

    if(items.length > 0) {
      const seeMoreCard = document.createElement('div');
      seeMoreCard.className = 'see-all-card';
      seeMoreCard.innerHTML = `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg><div class="see-all-text">See All</div><div style="font-size:.72rem;">Similar Titles</div>`;
      seeMoreCard.onclick = () => {
        closeTray();
        openSeeAll(isTV ? 'TV Shows' : 'Hollywood');
      };
      recsTrack.appendChild(seeMoreCard);
    } else {
      recsTrack.innerHTML = '<div style="color:var(--muted);font-size:.82rem;">No recommendations found.</div>';
    }
  } catch(e) {
    castTrack.innerHTML = '<div style="color:var(--muted);font-size:.82rem;">Cast info unavailable.</div>';
    recsTrack.innerHTML = '<div style="color:var(--muted);font-size:.82rem;">Recommendations unavailable.</div>';
  }
}

function closeTray() {
  document.getElementById('trayOverlay').classList.remove('open');
  document.body.style.overflow = '';
}
function closeTrayIfBackdrop(e) { if(e.target === document.getElementById('trayOverlay')) closeTray(); }

function playCurrentMovie() {
  if(!currentMovie) return;
  watchMovie(currentMovie);
  saveProgress(currentMovie.id, currentMovie, 0, 1);
  checkAchievements();
}
function resumePlayback() { playCurrentMovie(); }
function startOverPlayback() {
  if(!activeProfile || !currentMovie) return;
  const key = `cs_progress_${activeProfile.id}`;
  const progress = JSON.parse(localStorage.getItem(key) || '{}');
  delete progress[currentMovie.id];
  localStorage.setItem(key, JSON.stringify(progress));
  playCurrentMovie();
}

function toggleTrayWatchlist() {
  if(!currentMovie) return;
  toggleWatchlistItem(currentMovie);
  const wl = getWatchlist(); const inList = wl.some(x => x.id === currentMovie.id);
  document.getElementById('trayWatchlistText').textContent = inList ? '✓ In My List' : '+ Add to My List';
  document.getElementById('trayWatchlistBtn').classList.toggle('in-list', inList);
}

function shareMovie() {
  if(!currentMovie) return;
  const text = `Watch "${currentMovie.title||currentMovie.name}" on CineVerse!`;
  if(navigator.share) {
    navigator.share({title:currentMovie.title||currentMovie.name, text, url:window.location.href}).catch(()=>{});
  } else {
    navigator.clipboard?.writeText(window.location.href).then(()=>showToast('Link copied to clipboard!','🔗'));
  }
  const p = JSON.parse(localStorage.getItem(`cs_progress_${activeProfile?.id||'guest'}_share`) || '0');
  localStorage.setItem(`cs_progress_${activeProfile?.id||'guest'}_share`, '1');
}

// ---- TV SERIES ----
async function openTVSeries(m) {
  currentTV = m;
  const overlay = document.getElementById('tvSeriesOverlay');
  document.getElementById('tvHeroBg').src = m.backdrop_path ? IMG + 'w1280' + m.backdrop_path : '';
  document.getElementById('tvTitle').textContent = m.name || m.title || '';
  const year = (m.first_air_date || m.release_date || '').slice(0,4);
  document.getElementById('tvMeta').textContent = `${year} • Loading...`;
  document.getElementById('tvOverview').textContent = m.overview || '';
  document.getElementById('tvGenres').innerHTML = getGenreNames(m.genre_ids||[]).map(g => `<div class="genre-pill">${g}</div>`).join('');
  document.getElementById('tvBadges').innerHTML = `<span class="tv-badge">TV SERIES</span><span class="tv-badge">★ ${m.vote_average?.toFixed(1)||'--'}</span><span class="tv-badge">4K ULTRA HD</span><span class="tv-badge">SUB | DUB</span>`;
  const wl = getWatchlist(); const inList = wl.some(x => x.id === m.id);
  document.getElementById('tvWatchlistText').textContent = inList ? '✓ In My List' : '+ Add to My List';
  // Default episodes
  loadDefaultEpisodes(m.id);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  // Load real data
  try {
    const data = await api(`/tv/${m.id}`);
    const seasons = data.number_of_seasons || 1;
    document.getElementById('tvMeta').textContent = `${year} • ${seasons} Season${seasons>1?'s':''} • ${data.number_of_episodes||'?'} Episodes`;
    const sel = document.getElementById('seasonSelect');
    sel.innerHTML = Array.from({length:seasons},(_,i) => `<option value="${i+1}">Season ${i+1}</option>`).join('');
    await loadSeason(1);
  } catch(e) {}
}

function loadDefaultEpisodes(showId) {
  const grid = document.getElementById('episodesGrid');
  grid.innerHTML = Array.from({length:10},(_,i) => `
    <div class="episode-card" onclick="playTVEpisode(1,${i+1})">
      <div class="episode-thumb" style="background:var(--card2);">
        <div class="episode-badge">S1 : E${i+1}</div>
        <div class="ep-play-overlay"><div class="play-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></div>
      </div>
      <div class="episode-info">
        <div class="episode-title">Episode ${i+1}</div>
        <div class="episode-desc">Click to watch Episode ${i+1}</div>
      </div>
    </div>`).join('');
}

async function loadSeason(num) {
  if(!currentTV) return;
  const grid = document.getElementById('episodesGrid');
  try {
    const data = await api(`/tv/${currentTV.id}/season/${num}`);
    const eps = data.episodes || [];
    grid.innerHTML = eps.map((ep,i) => `
      <div class="episode-card" onclick="playTVEpisode(${num},${ep.episode_number})">
        <div class="episode-thumb">
          <img src="${ep.still_path ? IMG+'w300'+ep.still_path : ''}" alt="E${ep.episode_number}" loading="lazy" onerror="this.style.display='none'"/>
          <div class="episode-badge">S${num} : E${ep.episode_number}</div>
          <div class="ep-play-overlay"><div class="play-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></div>
        </div>
        <div class="episode-info">
          <div class="episode-title">${ep.name||`Episode ${ep.episode_number}`}</div>
          <div class="episode-desc">${ep.overview||'Click to watch this episode'}</div>
        </div>
      </div>`).join('') || grid.innerHTML;
  } catch(e) {}
}

function closeTVSeries() {
  document.getElementById('tvSeriesOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

function playTVEpisode(season, episode) {
  if(!currentTV) return;
  openPlayer(currentTV, true, season, episode);
}

function toggleTVWatchlist() {
  if(!currentTV) return;
  toggleWatchlistItem(currentTV);
  const wl = getWatchlist(); const inList = wl.some(x => x.id === currentTV.id);
  document.getElementById('tvWatchlistText').textContent = inList ? '✓ In My List' : '+ Add to My List';
}

// ---- WATCH ----
function watchMovie(m) {
  if (!m) return;
  let item = m;
  if (typeof m === 'number' || typeof m === 'string') {
    item = { id: m, title: 'Movie' };
  }
  const isTV = item.media_type === 'tv' || (item.first_air_date !== undefined);
  openPlayer(item, isTV, 1, 1);
}

function openPlayer(item, isTV, season=1, episode=1) {
  const id = item.id || item;
  const title = item.title || item.name || (isTV ? 'TV Series' : 'Movie');
  const isAnime = item.media_type === 'anime' || (item.genre_ids && item.genre_ids.includes(16)) || (item.original_language === 'ja');

  // Check saved progress for startTime
  let startTimeParam = '';
  if (activeProfile && id) {
    const progressData = JSON.parse(localStorage.getItem(`cs_progress_${activeProfile.id}`) || '{}');
    if (progressData[id] && progressData[id].seconds > 5) {
      startTimeParam = `&startTime=${Math.floor(progressData[id].seconds)}`;
    }
  }

  const audioParam = `&audio=${globalAnimeAudio}`;
  const isAnimeParam = isAnime ? `&isAnime=1` : ``;
  const aniwatchEpIdParam = item.aniwatchEpId ? `&aniwatchEpId=${item.aniwatchEpId}` : ``;
  const malIdParam = item.mal_id ? `&malId=${item.mal_id}` : ``;
  const anilistIdParam = item.anilist_id ? `&anilistId=${item.anilist_id}` : ``;

  // Redirect to standalone watch.html
  window.location.href = `watch.html?id=${id}&type=${isTV ? 'tv' : 'movie'}&season=${season}&episode=${episode}&title=${encodeURIComponent(title)}${startTimeParam}${audioParam}${isAnimeParam}${aniwatchEpIdParam}${malIdParam}${anilistIdParam}`;
}

function watchViaEmbed(embedUrl, title, isTV) {
  openPlayer({ title, id: 0 }, isTV);
}

function switchServer(type, btn) {
  const overlay = document.getElementById('watchOverlay');
  if(!overlay) return;
  const url = overlay._servers?.[type];
  if(url) document.getElementById('playerFrame').src = url;
  document.querySelectorAll('#serverBtns .server-card-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
}

// Listen for Vidsync & CineSrc player progress & events
window.addEventListener("message", (event) => {
  const message = event.data;
  if (!message || typeof message !== "object") return;

  if (message.type === "VIDEO_PROGRESS") {
    const payload = message.payload || {};
    const currentTime = payload.currentTime;
    const duration = payload.duration || 3600;
    if (currentMovie && currentTime) {
      const pct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
      saveProgress(currentMovie.id, currentMovie, Math.floor(currentTime), pct);
      renderContinueWatching();
    }
  }

  if (event.origin === "https://cinesrc.st") {
    const { type, currentTime, duration } = message;
    if (type === "cinesrc:timeupdate" && currentMovie && currentTime && duration) {
      const pct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
      saveProgress(currentMovie.id, currentMovie, Math.floor(currentTime), pct);
      renderContinueWatching();
    }
    return;
  }

  if (message.type === "VIDSYNC_PLAYER_EVENT" && message.data) {
    const { currentTime, duration } = message.data;
    if (currentMovie && currentTime && duration) {
      const pct = Math.min(100, Math.max(0, (currentTime / duration) * 100));
      saveProgress(currentMovie.id, currentMovie, Math.floor(currentTime), pct);
      renderContinueWatching();
    }
  }

  if (message.type === "VIDSYNC_MEDIA_DATA" && message.data?.entry) {
    const entry = message.data.entry;
    const watched = entry.progress?.watched || 0;
    const duration = entry.progress?.duration || 1;
    const pct = Math.min(100, Math.max(0, (watched / duration) * 100));
    if (currentMovie && entry.id == currentMovie.id) {
      saveProgress(currentMovie.id, currentMovie, Math.floor(watched), pct);
      renderContinueWatching();
    }
  }
});

function openMovieTrailer() {
  closeWatch();
  if(currentMovie) openTrailer();
}

function closeWatch() {
  const overlay = document.getElementById('watchOverlay');
  if(overlay) { clearInterval(overlay._progressTimer); overlay.remove(); }
  document.body.style.overflow = '';
  document.title = 'CineVerse — Premium Cinematic Experience';
}

// ---- SEE ALL ----
async function openSeeAll(category) {
  const overlay = document.getElementById('seeAllOverlay');
  document.getElementById('seeAllTitle').textContent = category;
  document.getElementById('seeAllGrid').innerHTML = '<div style="color:var(--muted);padding:20px;">Loading...</div>';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  try {
    let endpoint;
    if(category === 'Anime') endpoint = '/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc';
    else if(category === 'K-Drama') endpoint = '/discover/tv?with_original_language=ko&sort_by=popularity.desc';
    else if(category === 'Hollywood') endpoint = '/discover/movie?with_original_language=en&sort_by=popularity.desc';
    else if(category === 'Bollywood') endpoint = '/discover/movie?with_original_language=hi&sort_by=popularity.desc';
    else if(category === 'TV Shows') endpoint = '/tv/popular';
    else endpoint = '/movie/popular';
    const d = await api(endpoint);
    currentSeeAllMovies = d.results || [];
    applySearchFilters(true);
  } catch(e) { document.getElementById('seeAllGrid').innerHTML = '<div style="color:var(--muted);padding:20px;">Failed to load content.</div>'; }
}

function closeSeeAll() {
  document.getElementById('seeAllOverlay').classList.remove('open');
  document.body.style.overflow = '';
}

// ---- BRAND HUBS ----
async function loadBrandHub(name, companyId) {
  const grid = document.getElementById('seeAllGrid');
  document.getElementById('seeAllTitle').textContent = `${name} Collection`;
  grid.innerHTML = '<div style="color:var(--muted);padding:20px;">Loading collection...</div>';
  document.getElementById('seeAllOverlay').classList.add('open');
  document.body.style.overflow = 'hidden';
  try {
    let endpoint = `/discover/movie?with_companies=${companyId}&sort_by=popularity.desc`;
    if (name === 'Marvel') endpoint = `/discover/movie?with_companies=420|7505|11106&sort_by=popularity.desc`;
    if (name === 'DC Studios' || name === 'DC') endpoint = `/discover/movie?with_companies=9993|429|128064&sort_by=popularity.desc`;
    if (name === 'Star Wars') endpoint = `/discover/movie?with_keywords=161176|1930|208462&sort_by=popularity.desc`;
    
    const d = await api(endpoint);
    currentSeeAllMovies = d.results || [];
    applySearchFilters(true);
  } catch(e) { grid.innerHTML = '<div style="color:var(--muted);padding:20px;">Failed to load collection.</div>'; }
}

// ---- SEARCH ----
function handleSearch(val) {
  const clear = document.getElementById('searchClear');
  clear.classList.toggle('visible', val.length > 0);
  clearTimeout(searchTimeout);
  if(!val.trim()) { document.getElementById('searchDropdown').classList.remove('open'); return; }
  searchTimeout = setTimeout(() => doSearch(val), 400);
}

async function doSearch(q) {
  const dropdown = document.getElementById('searchDropdown');
  dropdown.innerHTML = '<div class="search-empty">Searching...</div>';
  dropdown.classList.add('open');
  try {
    const d = await api(`/search/multi?query=${encodeURIComponent(q)}`);
    const results = (d.results||[]).filter(r => r.media_type !== 'person').slice(0,8);
    if(!results.length) { dropdown.innerHTML = '<div class="search-empty">No results found.</div>'; return; }
    dropdown.innerHTML = results.map(m => `
      <div class="search-result-item" onclick='handleSearchClick(${JSON.stringify(m).replace(/'/g,"&#39;")})'>
        <img class="search-result-poster" src="${m.poster_path ? IMG+'w92'+m.poster_path : ''}" onerror="this.style.background='var(--card2)'"/>
        <div class="search-result-info">
          <div class="search-result-title">${m.title||m.name||''}</div>
          <div class="search-result-meta">${(m.release_date||m.first_air_date||'').slice(0,4)} • ${m.media_type==='tv'?'TV':'Movie'} • ★${m.vote_average?.toFixed(1)||'--'}</div>
        </div>
      </div>`).join('');
  } catch(e) { dropdown.innerHTML = '<div class="search-empty">Search failed.</div>'; }
}

function handleSearchClick(m) {
  closeSearch();
  if(m.media_type === 'tv' || m.first_air_date !== undefined) openTVSeries(m);
  else openMovieTray(m);
}

function clearSearch() {
  document.getElementById('searchInput').value = '';
  document.getElementById('searchClear').classList.remove('visible');
  closeSearch();
}

function closeSearch() { document.getElementById('searchDropdown').classList.remove('open'); }

function handleSearchKey(e) {
  if(e.key === 'Escape') clearSearch();
  if(e.key === 'Enter') {
    const val = document.getElementById('searchInput').value.trim();
    if(val) submitSearch(val);
  }
}

async function submitSearch(q) {
  closeSearch();
  const overlay = document.getElementById('seeAllOverlay');
  document.getElementById('seeAllTitle').textContent = `Search Results: "${q}"`;
  const grid = document.getElementById('seeAllGrid');
  grid.innerHTML = '<div style="color:var(--muted);padding:20px;">Searching for films & shows...</div>';
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  try {
    const d = await api(`/search/multi?query=${encodeURIComponent(q)}`);
    currentSeeAllMovies = (d.results || []).filter(r => r.media_type !== 'person');
    applySearchFilters(true);
  } catch(e) {
    grid.innerHTML = '<div style="color:var(--muted);padding:20px;">Search failed to load results.</div>';
  }
}

// ---- ADVANCED SEARCH FILTERS ----
let currentSeeAllMovies = [];

function toggleSearchFilters() {
  const panel = document.getElementById('searchFilterPanel');
  const btn = document.getElementById('searchFilterToggle');
  if (panel && btn) {
    panel.classList.toggle('open');
    btn.classList.toggle('active');
  }
}

function updateRatingFilterVal(val) {
  const lbl = document.getElementById('filterRatingVal');
  if (lbl) lbl.textContent = parseFloat(val).toFixed(1);
}

function applySearchFilters(reset=false) {
  if (reset) {
    document.getElementById('filterGenre').value = '';
    document.getElementById('filterYear').value = '';
    document.getElementById('filterRating').value = '0';
    document.getElementById('filterRatingVal').textContent = '0.0';
    document.getElementById('filterSort').value = 'popularity.desc';
  }

  const genreId = document.getElementById('filterGenre').value;
  const yearRange = document.getElementById('filterYear').value;
  const minRating = parseFloat(document.getElementById('filterRating').value);
  const sortBy = document.getElementById('filterSort').value;

  let filtered = [...currentSeeAllMovies];

  // 1. Genre filter
  if (genreId) {
    const id = parseInt(genreId, 10);
    filtered = filtered.filter(m => (m.genre_ids || []).includes(id));
  }

  // 2. Year filter
  if (yearRange) {
    if (yearRange.includes('-')) {
      const [start, end] = yearRange.split('-').map(Number);
      filtered = filtered.filter(m => {
        const year = parseInt((m.release_date || m.first_air_date || '').slice(0, 4), 10);
        return year >= start && year <= end;
      });
    } else {
      filtered = filtered.filter(m => (m.release_date || m.first_air_date || '').slice(0, 4) === yearRange);
    }
  }

  // 3. Rating filter
  if (minRating > 0) {
    filtered = filtered.filter(m => (m.vote_average || 0) >= minRating);
  }

  // 4. Sort
  filtered.sort((a, b) => {
    if (sortBy === 'popularity.desc') {
      return (b.popularity || 0) - (a.popularity || 0);
    } else if (sortBy === 'vote_average.desc') {
      return (b.vote_average || 0) - (a.vote_average || 0);
    } else if (sortBy === 'release_date.desc') {
      const dateA = new Date(a.release_date || a.first_air_date || '1970-01-01');
      const dateB = new Date(b.release_date || b.first_air_date || '1970-01-01');
      return dateB - dateA;
    }
    return 0;
  });

  // Render to grid
  const grid = document.getElementById('seeAllGrid');
  if (!grid) return;
  grid.innerHTML = '';
  if (!filtered.length) {
    grid.innerHTML = '<div style="color:var(--muted);padding:40px;text-align:center;width:100%;grid-column:1/-1;">No movies or TV shows match the selected filters.</div>';
    return;
  }
  filtered.forEach(m => {
    grid.appendChild(createMovieCard(m));
  });
}

function resetSearchFilters() {
  applySearchFilters(true);
}

// ---- AUTH ----
function loadUser() {
  const saved = localStorage.getItem('cs_user');
  if(saved) { user = JSON.parse(saved); updateAuthUI(); }
}
function handleAuthClick() { if(user) openAccountModal(); else openAuthModal(); }
function handleProfileClick() { if(user) openAccountModal(); else openAuthModal(); }
function openAuthModal() { document.getElementById('authModal').classList.add('open'); }
function closeAuthModal() { document.getElementById('authModal').classList.remove('open'); }
function closeAuthIfBackdrop(e) { if(e.target===document.getElementById('authModal')) closeAuthModal(); }
function switchAuthTab(t) {
  document.getElementById('signinTab').classList.toggle('active', t==='signin');
  document.getElementById('signupTab').classList.toggle('active', t==='signup');
  document.getElementById('signinForm').style.display = t==='signin' ? '' : 'none';
  document.getElementById('signupForm').style.display = t==='signup' ? '' : 'none';
}
function handleSignIn() {
  const email = document.getElementById('signinEmail').value.trim();
  const pass = document.getElementById('signinPassword').value;
  if(!email||!pass) { showToast('Please fill in all fields','⚠️'); return; }
  user = {name:email.split('@')[0], email, avatar:'🎬'};
  localStorage.setItem('cs_user', JSON.stringify(user));
  updateAuthUI(); closeAuthModal(); showToast(`Welcome back, ${user.name}!`,'🎉');
}
function handleSignUp() {
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const pass = document.getElementById('signupPassword').value;
  if(!name||!email||!pass) { showToast('Please fill in all fields','⚠️'); return; }
  user = {name, email, avatar:'🎬'};
  localStorage.setItem('cs_user', JSON.stringify(user));
  updateAuthUI(); closeAuthModal(); showToast(`Account created! Welcome, ${name}!`,'🎉');
}
function socialLogin(provider) {
  user = {name:`${provider} User`, email:`user@${provider.toLowerCase()}.com`, avatar:'🌐'};
  localStorage.setItem('cs_user', JSON.stringify(user));
  updateAuthUI(); closeAuthModal(); showToast(`Signed in with ${provider}!`,'✅');
}
function updateAuthUI() {
  const btn = document.getElementById('authBtn');
  if(user) { btn.textContent = user.name; btn.style.background = 'var(--card2)'; btn.style.color = 'var(--text)'; btn.style.border = '1px solid var(--border)'; }
  else { btn.textContent = 'Sign In'; btn.style.background = ''; btn.style.color = ''; btn.style.border = ''; }
}

// ---- ACCOUNT MODAL ----
function openAccountModal() {
  document.getElementById('accountAvatar').textContent = activeProfile?.avatar || user?.avatar || '🍿';
  document.getElementById('accountName').textContent = user?.name || activeProfile?.name || 'Guest';
  document.getElementById('accountEmail').textContent = user?.email || 'guest@cineverse.io';

  const profileId = activeProfile?.id || 'default';
  const progress = JSON.parse(localStorage.getItem(`cs_progress_${profileId}`) || '{}');
  const wl = getWatchlist();
  const watchedCount = Object.keys(progress).length;
  const watchlistCount = wl.length;
  
  // Calculate total reviews
  const reviewCount = Object.keys(localStorage)
    .filter(k => k.startsWith('cs_reviews_'))
    .reduce((acc, k) => {
      try { return acc + JSON.parse(localStorage.getItem(k) || '[]').length; } catch(e) { return acc; }
    }, 0);

  document.getElementById('statWatched').textContent = `${watchedCount} Title${watchedCount !== 1 ? 's' : ''}`;
  document.getElementById('statWatchlist').textContent = `${watchlistCount} Title${watchlistCount !== 1 ? 's' : ''}`;
  document.getElementById('statReviews').textContent = `${reviewCount} Posted`;

  // 1. Calculate watch time
  let totalSeconds = 0;
  Object.values(progress).forEach(p => {
    totalSeconds += p.seconds || 0;
  });
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  document.getElementById('statTime').textContent = `${hours}h ${minutes}m`;

  // 2. Genre Breakdown
  const genreCounts = {};
  let totalGenresCount = 0;
  Object.values(progress).forEach(p => {
    if (p.movie && p.movie.genre_ids) {
      p.movie.genre_ids.forEach(gid => {
        const gname = allGenres[gid] || 'Other';
        genreCounts[gname] = (genreCounts[gname] || 0) + 1;
        totalGenresCount++;
      });
    }
  });

  const genreContainer = document.getElementById('genreBarContainer');
  if (totalGenresCount === 0) {
    genreContainer.innerHTML = '<div style="font-size:0.78rem;color:var(--muted);padding:15px 0;">No stats available. Watch movies to generate breakdown!</div>';
  } else {
    const sortedGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4); // Top 4 genres

    genreContainer.innerHTML = sortedGenres.map(([gname, count]) => {
      const pct = Math.round((count / totalGenresCount) * 100);
      return `
        <div class="genre-bar-row">
          <div class="genre-bar-name" title="${gname}">${gname}</div>
          <div class="genre-bar-wrapper">
            <div class="genre-bar-fill" style="width:${pct}%"></div>
          </div>
          <div class="genre-bar-count">${pct}%</div>
        </div>`;
    }).join('');
  }

  // 3. Render Achievements Grid
  const achGrid = document.getElementById('statsAchievementsGrid');
  if (achGrid) {
    achGrid.innerHTML = ACHIEVEMENTS_DEF.map(a => {
      let current = 0;
      if (a.type === 'watch') current = watchedCount;
      if (a.type === 'watchlist') current = watchlistCount;
      if (a.type === 'review') current = reviewCount;
      const unlocked = current >= a.req;
      return `
        <div class="achievement-stats-card ${unlocked ? 'unlocked' : ''}">
          <div class="achievement-stats-icon">${a.icon}</div>
          <div class="achievement-stats-name">${a.name}</div>
          <div class="achievement-stats-desc">${a.desc}</div>
          <div style="font-size:0.6rem;font-weight:800;color:${unlocked ? 'var(--accent)' : 'var(--muted)'};margin-top:4px;">
            ${unlocked ? 'UNLOCKED' : `${current}/${a.req}`}
          </div>
        </div>`;
    }).join('');
  }

  document.getElementById('accountModal').classList.add('open');
}
function closeAccountModal() { document.getElementById('accountModal').classList.remove('open'); }
function closeAccountIfBackdrop(e) { if(e.target===document.getElementById('accountModal')) closeAccountModal(); }
function signOut() {
  user = null; localStorage.removeItem('cs_user');
  updateAuthUI(); closeAccountModal(); showToast('Signed out successfully','👋');
}
function switchProfile() {
  closeAccountModal();
  const ps = document.getElementById('profileScreen');
  ps.style.visibility = 'visible'; ps.style.opacity = '1'; ps.style.transform = 'none';
}

function checkAchievements() {
  if (!activeProfile) return;
  const profileId = activeProfile.id || 'default';
  const progress = JSON.parse(localStorage.getItem(`cs_progress_${profileId}`) || '{}');
  const watched = Object.keys(progress).length;
  const wl = getWatchlist();
  
  const reviewCount = Object.keys(localStorage)
    .filter(k => k.startsWith('cs_reviews_'))
    .reduce((acc, k) => {
      try { return acc + JSON.parse(localStorage.getItem(k) || '[]').length; } catch(e) { return acc; }
    }, 0);

  const unlockedKey = `cs_unlocked_achievements_${profileId}`;
  const unlocked = JSON.parse(localStorage.getItem(unlockedKey) || '[]');

  const checkAndUnlock = (id, cond, name, icon) => {
    if (cond && !unlocked.includes(id)) {
      unlocked.push(id);
      localStorage.setItem(unlockedKey, JSON.stringify(unlocked));
      showToast(`🏆 Achievement Unlocked: ${name}!`, icon);
    }
  };

  checkAndUnlock('first_watch', watched >= 1, 'First Watch', '🎬');
  checkAndUnlock('binge_5', watched >= 5, 'Binge Watcher', '🍿');
  checkAndUnlock('cinephile', watched >= 10, 'Cinephile', '🎭');
  checkAndUnlock('watchlist_3', wl.length >= 3, 'Curator', '📋');
  checkAndUnlock('reviewer', reviewCount >= 1, 'Critic', '✍️');
}

// ---- TRAILER ----
async function openTrailer() {
  if(!currentMovie) return;
  const isTV = currentMovie.media_type === 'tv' || currentMovie.first_air_date !== undefined;
  try {
    const d = await api(`/${isTV?'tv':'movie'}/${currentMovie.id}/videos`);
    const yt = (d.results||[]).find(v => v.site==='YouTube' && v.type==='Trailer') || d.results?.[0];
    if(yt) {
      document.getElementById('trailerTitle').textContent = `${currentMovie.title||currentMovie.name} — Official Trailer`;
      document.getElementById('trailerFrameWrap').innerHTML = `<iframe src="https://www.youtube.com/embed/${yt.key}?autoplay=1" allowfullscreen="true" webkitallowfullscreen="true" mozallowfullscreen="true" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" style="position:absolute;inset:0;width:100%;height:100%;border:none;"></iframe>`;
      document.getElementById('trailerModal').classList.add('open');
    } else { showToast('No trailer available','📹'); }
  } catch(e) { showToast('Could not load trailer','⚠️'); }
}
function closeTrailer() {
  document.getElementById('trailerFrameWrap').innerHTML = '';
  document.getElementById('trailerModal').classList.remove('open');
}
function closeTrailerIfBackdrop(e) { if(e.target===document.getElementById('trailerModal')) closeTrailer(); }

// Fix: Episodes button opens TV Series overlay
document.getElementById('trayEpisodesBtn').onclick = function() {
  if(currentMovie) { closeTray(); openTVSeries(currentMovie); }
};

// ---- ACTOR ----
async function openActor(actorId) {
  document.getElementById('actorModal').classList.add('open');
  document.getElementById('actorName').textContent = 'Loading...';
  document.getElementById('actorBio').textContent = '';
  document.getElementById('actorFilmsGrid').innerHTML = '';
  try {
    const [info, creds] = await Promise.all([
      api(`/person/${actorId}`),
      api(`/person/${actorId}/movie_credits`)
    ]);
    document.getElementById('actorPhoto').src = info.profile_path ? IMG+'w185'+info.profile_path : '';
    document.getElementById('actorName').textContent = info.name || '';
    document.getElementById('actorKnownFor').textContent = info.known_for_department || '';
    document.getElementById('actorBirthday').textContent = info.birthday ? `Born: ${info.birthday}` : '';
    document.getElementById('actorBio').textContent = info.biography?.slice(0,600) || 'No biography available.';
    const films = document.getElementById('actorFilmsGrid');
    (creds.cast||[]).slice(0,10).forEach(m => {
      const div = document.createElement('div');
      div.className = 'actor-film-card';
      div.onclick = () => { closeActor(); openMovieTray(m); };
      div.innerHTML = `<img class="actor-film-poster" src="${m.poster_path ? IMG+'w92'+m.poster_path : ''}" onerror="this.style.background='var(--card2)'" loading="lazy"/>
        <div class="actor-film-title">${m.title||''}</div>`;
      films.appendChild(div);
    });
  } catch(e) { document.getElementById('actorName').textContent = 'Info unavailable'; }
}
function closeActor() { document.getElementById('actorModal').classList.remove('open'); }
function closeActorIfBackdrop(e) { if(e.target===document.getElementById('actorModal')) closeActor(); }

// ---- REVIEWS ----
function setReviewStar(n) {
  reviewStarRating = n;
  document.querySelectorAll('.star-btn').forEach((s,i) => s.classList.toggle('active', i < n));
}
function updateCharCount() {
  const val = document.getElementById('reviewInput').value;
  document.getElementById('charCount').textContent = val.length;
}
function postReview() {
  if(!currentMovie) return;
  const text = document.getElementById('reviewInput').value.trim();
  if(!text) { showToast('Please write a review first','⚠️'); return; }
  const key = `cs_reviews_${currentMovie.id}`;
  const reviews = JSON.parse(localStorage.getItem(key) || '[]');
  const rev = { user: user?.name || activeProfile?.name || 'Anonymous', avatar: user?.avatar || activeProfile?.avatar || '🎬', stars: reviewStarRating, text, date: new Date().toLocaleDateString() };
  reviews.unshift(rev);
  localStorage.setItem(key, JSON.stringify(reviews));
  document.getElementById('reviewInput').value = '';
  document.getElementById('charCount').textContent = '0';
  loadReviews(currentMovie.id);
  showToast('Review posted!','⭐');
}
function loadReviews(movieId) {
  const key = `cs_reviews_${movieId}`;
  const reviews = JSON.parse(localStorage.getItem(key) || '[]');
  const list = document.getElementById('reviewsList');
  if(!reviews.length) { list.innerHTML = '<div style="color:var(--muted);font-size:.82rem;text-align:center;padding:12px;">No reviews yet. Be the first!</div>'; return; }
  list.innerHTML = reviews.map(r => `
    <div class="review-card">
      <div class="review-header">
        <div class="reviewer-avatar">${r.avatar}</div>
        <div class="reviewer-name">${r.user}</div>
        <div style="font-size:.72rem;color:var(--muted);margin-left:6px;">${r.date||''}</div>
        <div class="review-stars">${'★'.repeat(r.stars)}${'☆'.repeat(5-r.stars)}</div>
      </div>
      <div class="review-text">${r.text}</div>
    </div>`).join('');
}

// ---- MOOD ----
async function filterByMood(mood) {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
  event.target.closest('.mood-btn').classList.add('active');
  const def = MOOD_GENRES[mood];
  if(!def) return;
  document.getElementById('moodResultsTitle').textContent = def.label;
  document.getElementById('moodResultsSection').classList.add('visible');
  const track = document.getElementById('moodResultsTrack');
  track.innerHTML = '<div style="color:var(--muted);padding:20px;">Loading...</div>';
  try {
    const d = await api(`/discover/movie?with_genres=${def.ids.join(',')}&sort_by=popularity.desc`);
    track.innerHTML = '';
    (d.results||[]).slice(0,15).forEach(m => track.appendChild(createMovieCard(m)));
  } catch(e) { track.innerHTML = '<div style="color:var(--muted);">Failed to load.</div>'; }
}
function clearMood() {
  document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('moodResultsSection').classList.remove('visible');
}

// ---- TASTE FINDER MATCHMAKER WIZARD ----
let tasteSelections = { mood: '28', time: 'standard', audience: 'solo' };

function openTasteFinderModal() {
  const modal = document.getElementById('tasteFinderModal');
  if (!modal) return;
  modal.classList.add('open');
  
  // Reset steps to step 1
  document.getElementById('tasteStep1').style.display = 'block';
  document.getElementById('tasteStep2').style.display = 'none';
  document.getElementById('tasteStep3').style.display = 'none';
  document.getElementById('tasteResults').style.display = 'none';
}

function closeTasteFinderModal() {
  const modal = document.getElementById('tasteFinderModal');
  if (modal) modal.classList.remove('open');
}

function closeTasteFinderModalIfBackdrop(e) {
  if (e.target === document.getElementById('tasteFinderModal')) closeTasteFinderModal();
}

async function selectTasteOption(category, value, btnEl) {
  tasteSelections[category] = value;

  // Highlight button in current step
  const parentGrid = btnEl.closest('.taste-options-grid');
  if (parentGrid) {
    parentGrid.querySelectorAll('.taste-option-btn').forEach(b => b.classList.remove('selected'));
  }
  btnEl.classList.add('selected');

  // Advance steps smoothly
  setTimeout(async () => {
    if (category === 'mood') {
      document.getElementById('tasteStep1').style.display = 'none';
      document.getElementById('tasteStep2').style.display = 'block';
    } else if (category === 'time') {
      document.getElementById('tasteStep2').style.display = 'none';
      document.getElementById('tasteStep3').style.display = 'block';
    } else if (category === 'audience') {
      document.getElementById('tasteStep3').style.display = 'none';
      document.getElementById('tasteResults').style.display = 'block';
      await renderTasteResults();
    }
  }, 250);
}

async function renderTasteResults() {
  const container = document.getElementById('tasteResultsGrid');
  if (!container) return;
  container.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center;">Finding perfect matches for your taste...</div>';

  try {
    const genreId = tasteSelections.mood || '28';
    const endpoint = `/discover/movie?with_genres=${genreId}&sort_by=popularity.desc`;
    const data = await api(endpoint);
    const movies = data.results || [];

    if (!movies.length) {
      container.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center;">No matches found. Try selecting different options!</div>';
      return;
    }

    container.innerHTML = '';
    const topMatches = movies.slice(0, 4);
    const matchScores = [98, 95, 92, 89];

    topMatches.forEach((m, idx) => {
      const card = document.createElement('div');
      card.className = 'search-result-item';
      card.style.cssText = 'background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:12px;display:flex;align-items:center;gap:14px;cursor:pointer;transition:transform 0.3s;';
      
      const cleanTitle = sanitizeHTML(m.title || m.name || 'Movie');
      const cleanOverview = sanitizeHTML(m.overview || 'Stream this movie in HD on CineVerse.');
      const posterUrl = m.poster_path ? `${IMG}w185${m.poster_path}` : 'https://images.pexels.com/photos/1790556/pexels-photo-1790556.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=200';

      card.innerHTML = `
        <img src="${posterUrl}" style="width:50px;height:75px;border-radius:8px;object-fit:cover;" onerror="this.src='https://images.pexels.com/photos/1790556/pexels-photo-1790556.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=300&w=200'"/>
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:8px;">
            <div style="font-weight:800;font-size:0.9rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${cleanTitle}</div>
            <span style="background:var(--accent);color:#fff;font-size:0.65rem;font-weight:800;padding:2px 6px;border-radius:4px;">${matchScores[idx] || 90}% Match</span>
          </div>
          <div style="font-size:0.75rem;color:var(--muted);margin-top:4px;">⭐ ${m.vote_average ? m.vote_average.toFixed(1) : '8.5'} • ${(m.release_date || '2026').slice(0,4)}</div>
          <div style="font-size:0.72rem;color:var(--text);opacity:0.8;margin-top:4px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${cleanOverview}</div>
        </div>
        <button onclick="event.stopPropagation();closeTasteFinderModal();watchMovie('${m.id}','movie','${encodeURIComponent(m.title||m.name)}')" style="background:var(--accent);color:#fff;border:none;border-radius:50px;padding:8px 16px;font-weight:800;font-size:0.75rem;cursor:pointer;flex-shrink:0;">Watch</button>
      `;
      card.onclick = () => { closeTasteFinderModal(); openMovieTray(m); };
      container.appendChild(card);
    });
  } catch (e) {
    container.innerHTML = '<div style="color:var(--muted);padding:20px;text-align:center;">Could not fetch recommendations.</div>';
  }
}

// ---- SURPRISE ROULETTE WHEEL ENGINE ----
function openSurpriseSpinner() {
  const modal = document.getElementById('spinnerModal');
  if (modal) modal.classList.add('open');
  drawWheelCanvas();
}
function closeSpinner() {
  const modal = document.getElementById('spinnerModal');
  if (modal) modal.classList.remove('open');
}
function closeSpinnerIfBackdrop(e) {
  if (e.target === document.getElementById('spinnerModal')) closeSpinner();
}

const SPIN_GENRES = [
  { name: 'Action', id: 28, color: '#E50914' },
  { name: 'Comedy', id: 35, color: '#FFB800' },
  { name: 'Horror', id: 27, color: '#A855F7' },
  { name: 'Romance', id: 10749, color: '#FB7185' },
  { name: 'Sci-Fi', id: 878, color: '#00D2D3' },
  { name: 'Thriller', id: 53, color: '#10B981' }
];

function drawWheelCanvas() {
  const canvas = document.getElementById('spinnerWheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const numSegments = SPIN_GENRES.length;
  const anglePerSegment = (2 * Math.PI) / numSegments;
  const radius = canvas.width / 2;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  SPIN_GENRES.forEach((g, i) => {
    const startAngle = i * anglePerSegment;
    const endAngle = (i + 1) * anglePerSegment;

    ctx.beginPath();
    ctx.moveTo(radius, radius);
    ctx.arc(radius, radius, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = g.color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.stroke();

    // Render Text
    ctx.save();
    ctx.translate(radius, radius);
    ctx.rotate(startAngle + anglePerSegment / 2);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 13px Outfit, sans-serif';
    ctx.fillText(g.name, radius - 20, 5);
    ctx.restore();
  });
}

function spinWheel() {
  if (isSpinning) return;
  isSpinning = true;

  const resultTxt = document.getElementById('spinResult');
  if (resultTxt) resultTxt.textContent = 'Spinning...';

  const extraDeg = 1440 + Math.floor(Math.random() * 360);
  spinDeg += extraDeg;

  const canvas = document.getElementById('spinnerWheelCanvas');
  if (canvas) {
    canvas.style.transform = `rotate(${spinDeg}deg)`;
  }

  setTimeout(async () => {
    isSpinning = false;
    const normalizedDeg = (spinDeg % 360);
    // Calculate winner segment from pointer top (270deg offset)
    const winningIdx = Math.floor(((360 - (normalizedDeg % 360)) + 270) % 360 / (360 / SPIN_GENRES.length)) % SPIN_GENRES.length;
    const genre = SPIN_GENRES[winningIdx];

    if (resultTxt) resultTxt.textContent = `🎬 Selected ${genre.name}! Loading title...`;

    try {
      const d = await api(`/discover/movie?with_genres=${genre.id}&sort_by=popularity.desc`);
      const movies = d.results || [];
      const pick = movies[Math.floor(Math.random() * Math.min(movies.length, 8))];

      if (pick) {
        if (resultTxt) resultTxt.textContent = `🎉 Winners Choice: "${pick.title}"!`;
        setTimeout(() => {
          closeSpinner();
          openMovieTray(pick);
        }, 1200);
      }
    } catch (e) {
      if (resultTxt) resultTxt.textContent = 'Spin again!';
    }
  }, 4000);
}

// ---- QUOTE ----
function setRandomQuote() {
  const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  document.getElementById('quoteText').textContent = `"${q.text}"`;
  document.getElementById('quoteMovie').textContent = q.movie;
}

// ---- NAV & SCROLL ----
function scrollToSection(id, tabName) {
  const el = document.getElementById(id);
  if(el) el.scrollIntoView({behavior:'smooth'});
  document.querySelectorAll('.nav-tab,.mobile-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => { if(t.textContent.trim()===tabName) t.classList.add('active'); });
  document.querySelectorAll('.mobile-tab').forEach(t => { if(t.textContent.trim()===tabName) t.classList.add('active'); });
  
  if (id === 'animeSection' || tabName === 'Anime') {
    activateAnimeThemeMode(true);
  } else if (id === 'hero' || id === 'hollywoodSection' || id === 'bollywoodSection') {
    activateAnimeThemeMode(false);
  }
}

function setupScrollEvents() {
  // 1. Create Top Scroll Progress Bar if missing
  if (!document.getElementById('scrollProgressBar')) {
    const bar = document.createElement('div');
    bar.id = 'scrollProgressBar';
    document.body.prepend(bar);
  }

  const progressBar = document.getElementById('scrollProgressBar');
  const scrollBtn = document.getElementById('scrollTopBtn');
  const navbar = document.getElementById('navbar');
  const liquidBg = document.getElementById('liquidBg');

  // 2. Main Scroll Listener
  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
    const progress = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    
    if (progressBar) progressBar.style.width = progress + '%';
    if (scrollBtn) scrollBtn.classList.toggle('visible', scrollTop > 400);
    
    if (navbar) {
      if (scrollTop > 40) navbar.classList.add('scrolled');
      else navbar.classList.remove('scrolled');
    }

    if (liquidBg) {
      liquidBg.style.transform = `translateY(${scrollTop * 0.12}px)`;
    }

    // Infinite scroll trigger
    if (window.innerHeight + scrollTop >= document.body.offsetHeight - 400) {
      const btn = document.getElementById('loadMoreBtn');
      if (btn && !btn.dataset.loading) {
        btn.dataset.loading = '1';
        loadMorePopular().then(() => { delete btn.dataset.loading; });
      }
    }
  }, { passive: true });

  // 3. Scroll Reveal Observer System
  const revealTargets = document.querySelectorAll('.section, .brand-hubs-grid, .quote-banner, #moodSection, .reviews-section, footer, .hero-content, .hero-rating-card, .popular-grid, #continueSection');
  
  revealTargets.forEach(el => {
    el.classList.add('reveal-on-scroll');
    if (el.classList.contains('brand-hubs-grid') || el.classList.contains('popular-grid')) {
      el.classList.add('stagger-children');
    }
  });

  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -40px 0px',
    threshold: 0.08
  };

  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal-on-scroll').forEach(el => revealObserver.observe(el));

  // 4. Spotlight & Interactive Tilt Hover Engine
  document.addEventListener('mousemove', (e) => {
    const cards = document.querySelectorAll('.movie-card, .brand-hub-card, .mood-btn, .server-premium-card');
    cards.forEach(card => {
      card.classList.add('spotlight-card');
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
    });
  }, { passive: true });
}

// ---- KEYBOARD ----
function setupKeyboard() {
  document.addEventListener('keydown', e => {
    const tag = document.activeElement.tagName;
    if(tag === 'INPUT' || tag === 'TEXTAREA') return;
    if(e.ctrlKey && e.key === 'k') { e.preventDefault(); document.getElementById('searchInput').focus(); }
    if(e.key === '?') { document.getElementById('shortcutsPanel').classList.add('open'); }
    if(e.key === 'Escape') {
      closeTray(); closeAuthModal(); closeAccountModal(); closeTrailer();
      closeActor(); closeAchievements(); closeSeeAll();
      document.getElementById('shortcutsPanel').classList.remove('open');
      closeSpinner(); closeWatch();
      closeTVSeries();
      closeSettingsModal();
    }
    if(e.key === 'ArrowRight' && !e.ctrlKey) nextHero();
    if(e.key === 'ArrowLeft' && !e.ctrlKey) prevHero();
    if(e.key === 'd' || e.key === 'D') toggleMode();
    if(e.key === 'r' || e.key === 'R') { openSurpriseSpinner(); spinWheel(); }
  });
  // Close dropdowns on outside click
  document.addEventListener('click', e => {
    if(!e.target.closest('.btn-theme') && !e.target.closest('.theme-dropdown'))
      document.getElementById('themeDropdown').classList.remove('open');
    if(!e.target.closest('.nav-search') && !e.target.closest('.search-dropdown'))
      closeSearch();
  });
}

function closeShortcuts() { document.getElementById('shortcutsPanel').classList.remove('open'); }

// ---- TOAST ----
function showToast(msg, icon='ℹ️') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3200);
}

// ---- KONAMI CODE ----
let konamiSeq = [], konamiCode = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
document.addEventListener('keydown', e => {
  konamiSeq.push(e.key);
  if(konamiSeq.length > 10) konamiSeq.shift();
  if(konamiSeq.join(',') === konamiCode.join(',')) {
    konamiSeq = [];
    document.body.style.animation = 'none';
    showToast('🎮 KONAMI CODE ACTIVATED! Developer Mode ON!', '🕹️');
    document.body.style.filter = 'hue-rotate(0deg)';
    let deg = 0;
    const iv = setInterval(() => { deg += 5; document.body.style.filter = `hue-rotate(${deg}deg)`; if(deg>=360){clearInterval(iv);document.body.style.filter='none';} }, 50);
  }
});

function openDownloadModal(type, id, title) {
  let season = 1;
  let episode = 1;
  if (type === 'tv') {
    season = document.getElementById('seasonSelect')?.value || 1;
    episode = document.getElementById('episodeSelect')?.value || 1;
  }

  // Directly open ZXCStream — their player has a built-in download button
  const zxcUrl = type === 'tv'
    ? `https://zxcstream.xyz/player/tv/${id}/${season}/${episode}`
    : `https://zxcstream.xyz/player/movie/${id}`;

  window.open(zxcUrl, '_blank');
  if (typeof showToast === 'function') {
    showToast('⚡ Opening ZXCStream — use the download button in the player', '📥');
  }
}

function closeDownloadChoiceModal() {
  const modal = document.getElementById('downloadChoiceModal');
  if (modal) {
    modal.classList.remove('open');
    setTimeout(() => modal.remove(), 300);
  }
}

// ---- SETTINGS MODAL ENGINE ----
function openSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (!modal) return;
  modal.classList.add('open');
  
  // Sync fields with saved settings in localStorage
  const liquidGlass = localStorage.getItem('cs_liquid_glass') === '1';
  const inputLG = document.getElementById('settingLiquidGlass');
  if (inputLG) inputLG.checked = liquidGlass;
  
  const heroGlow = localStorage.getItem('cs_hero_glow') !== '0';
  const inputHG = document.getElementById('settingHeroGlow');
  if (inputHG) inputHG.checked = heroGlow;
  
  const autoplay = localStorage.getItem('cs_autoplay') === '1';
  const inputAP = document.getElementById('settingAutoplay');
  if (inputAP) inputAP.checked = autoplay;
  
  const server = localStorage.getItem('cs_preferred_player') || 'rivestream';
  const selectSrv = document.getElementById('settingServer');
  if (selectSrv) selectSrv.value = server;
  
  const quality = localStorage.getItem('cs_stream_quality') || 'auto';
  const selectQty = document.getElementById('settingQuality');
  if (selectQty) selectQty.value = quality;

  const offlineMode = localStorage.getItem('cs_offline_mode') === '1';
  const inputOM = document.getElementById('settingOffline');
  if (inputOM) inputOM.checked = offlineMode;

  // Highlight active accent swatch in settings
  const accent = localStorage.getItem('cs_accent_theme') || 'crimson';
  document.querySelectorAll('.settings-accent-swatches .theme-swatch').forEach(s => s.classList.remove('active'));
  const activeSwatch = document.getElementById(`set-sw-${accent}`);
  if (activeSwatch) activeSwatch.classList.add('active');

  // Load default settings tab
  switchSettingsTab('appearance');
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  if (modal) modal.classList.remove('open');
}

function closeSettingsIfBackdrop(e) {
  if (e.target === document.getElementById('settingsModal')) {
    closeSettingsModal();
  }
}

function switchSettingsTab(tabName) {
  // Update nav buttons
  document.querySelectorAll('.settings-nav-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = document.getElementById(`btn-tab-${tabName}`);
  if (activeBtn) activeBtn.classList.add('active');
  
  // Update panels
  document.querySelectorAll('.settings-panel').forEach(panel => panel.classList.remove('active'));
  const activePanel = document.getElementById(`panel-${tabName}`);
  if (activePanel) activePanel.classList.add('active');
}

function toggleLiquidGlassSetting(checked) {
  localStorage.setItem('cs_liquid_glass', checked ? '1' : '0');
  if (checked) {
    document.body.classList.add('liquid-glass-theme');
    showToast('Liquid Glass Theme enabled!', '🎨');
  } else {
    document.body.classList.remove('liquid-glass-theme');
    showToast('Liquid Glass Theme disabled.', '🎨');
  }
}

function toggleHeroGlowSetting(checked) {
  localStorage.setItem('cs_hero_glow', checked ? '1' : '0');
  if (checked) {
    document.body.classList.add('ambient-glow-theme');
    showToast('Hero ambient glow enabled!', '✨');
  } else {
    document.body.classList.remove('ambient-glow-theme');
    showToast('Hero ambient glow disabled.', '✨');
  }
}

function toggleAutoplaySetting(checked) {
  localStorage.setItem('cs_autoplay', checked ? '1' : '0');
  showToast(checked ? 'Autoplay next episode enabled!' : 'Autoplay next episode disabled.', '▶');
}

function saveSettingServer(value) {
  localStorage.setItem('cs_preferred_player', value);
  showToast(`Default stream server set to ${value.charAt(0).toUpperCase() + value.slice(1)}`, '🚀');
}

function saveSettingQuality(value) {
  localStorage.setItem('cs_stream_quality', value);
  showToast(`Preferred playback quality set to ${value}`, '📺');
}

function clearSettingsHistory() {
  if (confirm('Are you sure you want to clear all data? This will wipe your watch progress, watchlists, settings, and custom profiles.')) {
    localStorage.clear();
    showToast('All settings and data wiped. Reloading...', '🧹');
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  }
}

// ---- OFFLINE MODE LOGIC ----
function toggleOfflineMode(active, showToastMessage = true) {
  if (active) {
    localStorage.setItem('cs_offline_mode', '1');
    document.body.classList.add('offline-active');
    
    // Hide all normal sections
    const sectionsToHide = [
      'hero', 'moodSection', 'moodResultsSection', 'continueSection', 
      'trendingSection', 'animeSection', 'kdramaSection', 'hollywoodSection', 
      'bollywoodSection', 'tvSection', 'watchlistSection'
    ];
    sectionsToHide.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'none';
    });

    // Show offline section
    const offlineSec = document.getElementById('offlineSection');
    if (offlineSec) offlineSec.style.display = 'block';

    renderOfflineLibrary();

    if (showToastMessage) showToast('🔌 Offline Mode Activated!', '⚠️');
  } else {
    localStorage.setItem('cs_offline_mode', '0');
    document.body.classList.remove('offline-active');

    // Show all normal sections (revert to defaults)
    const sectionsToShow = [
      'hero', 'moodSection', 'continueSection', 'trendingSection', 
      'animeSection', 'kdramaSection', 'hollywoodSection', 'bollywoodSection', 'tvSection', 'watchlistSection'
    ];
    sectionsToShow.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = '';
    });

    // Hide offline section
    const offlineSec = document.getElementById('offlineSection');
    if (offlineSec) offlineSec.style.display = 'none';

    // Rerender watchlist/continue sections just in case
    renderWatchlist();
    renderContinueWatching();

    if (showToastMessage) showToast('🌐 Online Mode Activated!', '✅');
  }
  
  const offlineCheck = document.getElementById('settingOffline');
  if (offlineCheck) offlineCheck.checked = active;
}

function renderOfflineLibrary() {
  const profileId = activeProfile?.id || 'default';
  const downloadKey = `cs_downloads_${profileId}`;
  const downloads = JSON.parse(localStorage.getItem(downloadKey) || '[]');
  const grid = document.getElementById('offlineGrid');
  if (!grid) return;

  grid.innerHTML = '';
  if (!downloads.length) {
    grid.innerHTML = `
      <div style="color:var(--muted);text-align:center;padding:60px 20px;grid-column:1/-1;width:100%;font-size:0.9rem;">
        <div style="font-size:2.5rem;margin-bottom:12px;">📥</div>
        <strong>No downloads yet.</strong><br/>
        Go online, open a movie or TV show, and click "Download Video" to save it for offline playback.
      </div>`;
    return;
  }

  downloads.forEach(m => {
    // Generate card
    const div = document.createElement('div');
    div.className = 'movie-card';
    const isTV = m.media_type === 'tv';
    div.innerHTML = `
      <div class="movie-card-poster">
        <img src="${m.poster_path ? IMG+'w342'+m.poster_path : ''}" alt="${m.title||m.name}" loading="lazy" onerror="this.style.background='var(--card2)'"/>
        <div class="play-overlay"><div class="play-circle"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></div>
        <div class="card-badge" style="background:#10B981;color:#fff;">DOWNLOADED</div>
      </div>
      <div class="card-info">
        <div class="card-title">${m.title || m.name || 'Unknown'}</div>
        <div class="card-meta">${(m.release_date||m.first_air_date||'').slice(0,4)} • ${isTV ? 'TV Series' : 'Movie'}</div>
      </div>`;
    div.onclick = () => {
      openPlayer(m, isTV, m.season || 1, m.episode || 1);
    };
    grid.appendChild(div);
  });
}