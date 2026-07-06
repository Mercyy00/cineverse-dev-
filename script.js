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
  animateSplash();
  await loadGenres();
  await Promise.all([loadHero(), loadPopular()]);
  loadSliders();
  renderGenreChips();
  setRandomQuote();
  setupCursorTrail();
  setupScrollEvents();
  setupKeyboard();
  renderProfiles();
  updateNavProfile();
};

function animateSplash() {
  let fill = document.getElementById('splashFill'), w = 0;
  let iv = setInterval(() => {
    w += 3 + Math.random()*4;
    if(w >= 100) { w = 100; clearInterval(iv); setTimeout(showProfileScreen, 400); }
    fill.style.width = w + '%';
  }, 80);
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
function renderProfiles() {
  const defaultProfiles = [
    {id:'p1',name:'JAY',avatar:'🍿',isKids:false},
    {id:'p2',name:'Movie Buff',avatar:'⚡',isKids:false},
    {id:'p3',name:'Kids Mode',avatar:'🦁',isKids:true},
    {id:'p4',name:'Guest',avatar:'🚀',isKids:false},
  ];
  profiles = JSON.parse(localStorage.getItem('cs_profiles') || 'null') || defaultProfiles;
  const grid = document.getElementById('profilesGrid');
  grid.innerHTML = '';
  profiles.forEach(p => {
    const card = document.createElement('div');
    card.className = 'profile-card';
    card.innerHTML = `<div class="profile-avatar">${p.avatar}</div><div class="profile-name">${p.name}</div>${p.isKids ? '<div style="font-size:.7rem;color:var(--accent);">KIDS</div>' : ''}`;
    card.onclick = () => selectProfile(p);
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
  if(!activeProfile) return;
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
}
function setTheme(t) {
  localStorage.setItem('cs_accent_theme', t);
  applyAccent(t, true);
  document.getElementById('themeDropdown').classList.remove('open');
}
function applyAccent(t, toast=false) {
  document.body.classList.remove('theme-cyan','theme-gold','theme-purple');
  if(t !== 'crimson') document.body.classList.add(`theme-${t}`);
  document.querySelectorAll('.theme-swatch').forEach(s => s.classList.remove('active'));
  const sw = document.getElementById(`sw-${t}`);
  if(sw) sw.classList.add('active');
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

// ---- SLIDERS ----
async function loadSliders() {
  const sliders = [
    {track:'top10Track', fetch:()=>api('/trending/movie/week'), key:'results', type:'top10'},
    {track:'animeTrack', fetch:()=>api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc'), key:'results', type:'card', badge:'SUB | DUB', seeAll:'Anime'},
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
    <div class="card-meta">${(m.release_date||m.first_air_date||'').slice(0,4)} • ${isTV ? 'TV Series' : 'Movie'}</div>
  </div>`;
  div.onclick = () => { if(isTV) openTVSeries(m); else openMovieTray(m); };
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

// ---- CONTINUE WATCHING ----
function renderContinueWatching() {
  if(!activeProfile) return;
  const progress = JSON.parse(localStorage.getItem(`cs_progress_${activeProfile.id}`) || '{}');
  const ids = Object.keys(progress).filter(id => progress[id].percent > 0 && progress[id].percent < 95);
  const section = document.getElementById('continueSection');
  const track = document.getElementById('continueTrack');
  if(!ids.length) { section.classList.remove('visible'); return; }
  section.classList.add('visible');
  track.innerHTML = '';
  ids.forEach(id => {
    const p = progress[id];
    if(p.movie) {
      const card = createMovieCard(p.movie);
      track.appendChild(card);
    }
  });
}

function saveProgress(movieId, movie, seconds, percent) {
  if(!activeProfile) return;
  const key = `cs_progress_${activeProfile.id}`;
  const progress = JSON.parse(localStorage.getItem(key) || '{}');
  progress[movieId] = {seconds, percent, movie};
  localStorage.setItem(key, JSON.stringify(progress));
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
  const text = `Watch "${currentMovie.title||currentMovie.name}" on CineStream!`;
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

  // Theme hex mapping for Vidsync player
  const themeHexMap = { crimson: 'E50914', cyan: '00D2D3', gold: 'FFB800', purple: 'A855F7' };
  const currentTheme = localStorage.getItem('cs_accent_theme') || 'crimson';
  const themeHex = themeHexMap[currentTheme] || 'E50914';

  // Check saved progress for startTime
  let startTimeParam = '';
  if (activeProfile && id) {
    const progressData = JSON.parse(localStorage.getItem(`cs_progress_${activeProfile.id}`) || '{}');
    if (progressData[id] && progressData[id].seconds > 5) {
      startTimeParam = `&startTime=${Math.floor(progressData[id].seconds)}`;
    }
  }

  const vidsyncUrl = isTV
    ? `https://vidsync.live/embed/tv/${id}/${season}/${episode}?autoPlay=true&nextButton=true&autoNext=true&theme=${themeHex}${startTimeParam}`
    : `https://vidsync.live/embed/movie/${id}?autoPlay=true&theme=${themeHex}${startTimeParam}`;

  const cinesrcStartTime = startTimeParam ? `&t=${Math.floor(progressData?.[id]?.seconds || 0)}` : '';
  const cinesrcUrl = isTV
    ? `https://cinesrc.st/embed/tv/${id}?s=${season}&e=${episode}&color=%23${themeHex}${cinesrcStartTime}`
    : `https://cinesrc.st/embed/movie/${id}?color=%23${themeHex}${cinesrcStartTime}`;

  const vidnestStartParam = startTimeParam ? `?startAt=${Math.floor(progressData?.[id]?.seconds || 0)}` : '';
  const vidnestUrl = item.anilistId
    ? `https://vidnest.fun/anime/${item.anilistId}/${episode}/sub${vidnestStartParam}`
    : (isTV
      ? `https://vidnest.fun/tv/${id}/${season}/${episode}${vidnestStartParam}`
      : `https://vidnest.fun/movie/${id}${vidnestStartParam}`);

  const vidnestPaheUrl = item.anilistId
    ? `https://vidnest.fun/animepahe/${item.anilistId}/${episode}/sub${vidnestStartParam}`
    : (isTV
      ? `https://vidnest.fun/tv/${id}/${season}/${episode}${vidnestStartParam}`
      : `https://vidnest.fun/movie/${id}${vidnestStartParam}`);

  const servers = {
    srvVidsync: vidsyncUrl,
    srv2: cinesrcUrl,
    srv3: vidnestUrl,
    srv3_pahe: vidnestPaheUrl,
    srv1: isTV 
      ? `https://vidsrc.cc/v2/embed/tv/${id}/${season}/${episode}` 
      : `https://vidsrc.cc/v2/embed/movie/${id}`,
    srv4: isTV 
      ? `https://multiembed.mov/?video_id=${id}&tmdb=1&s=${season}&e=${episode}` 
      : `https://multiembed.mov/?video_id=${id}&tmdb=1`
  };

  const existing = document.getElementById('watchOverlay');
  if(existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'watchOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;z-index:8500;background:#07070A;display:flex;flex-direction:column;';
  overlay.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px 20px;background:rgba(18,18,26,0.95);border-bottom:1px solid var(--border);backdrop-filter:blur(20px);z-index:10;gap:12px;">
      <button onclick="closeWatch()" style="display:flex;align-items:center;gap:8px;background:rgba(255,255,255,0.08);border:1px solid var(--border);color:var(--text);padding:8px 14px;border-radius:20px;cursor:pointer;font-weight:600;font-size:.85rem;transition:all .3s;flex-shrink:0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15,18 9,12 15,6"/></svg>
        Back to Browse
      </button>
      <div style="font-family:var(--font-heading);font-weight:700;font-size:1.05rem;color:var(--text);text-align:center;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:40%;">
        ${title} ${isTV ? `<span style="color:var(--accent);font-size:.85rem;margin-left:6px;">(S${season} : E${episode})</span>` : ''}
      </div>
      <div class="server-hub-container" id="serverBtns">
        <button class="server-card-btn active" onclick="switchServer('srvVidsync',this)">
          <span class="server-icon-badge">⚡</span>
          <span>VidSync</span>
          <span class="server-tag-badge">FAST 4K</span>
          <span class="server-pulse-dot"></span>
        </button>
        <button class="server-card-btn" onclick="switchServer('srv2',this)">
          <span class="server-icon-badge">🎬</span>
          <span>CineSrc</span>
          <span class="server-tag-badge">AUTO-SKIP</span>
          <span class="server-pulse-dot"></span>
        </button>
        <button class="server-card-btn" onclick="switchServer('srv3',this)">
          <span class="server-icon-badge">⛩️</span>
          <span>VidNest Anime</span>
          <span class="server-tag-badge">SUB/DUB</span>
          <span class="server-pulse-dot"></span>
        </button>
        <button class="server-card-btn" onclick="switchServer('srv3_pahe',this)">
          <span class="server-icon-badge">🌸</span>
          <span>AnimePahe</span>
          <span class="server-tag-badge">PAHE HD</span>
          <span class="server-pulse-dot"></span>
        </button>
        <button class="server-card-btn" onclick="switchServer('srv1',this)">
          <span class="server-icon-badge">🔮</span>
          <span>VidSrc CC</span>
          <span class="server-tag-badge">MULTI-SUB</span>
          <span class="server-pulse-dot"></span>
        </button>
        <button class="server-card-btn" onclick="switchServer('srv4',this)">
          <span class="server-icon-badge">🚀</span>
          <span>MultiEmbed</span>
          <span class="server-tag-badge">GLOBAL</span>
          <span class="server-pulse-dot"></span>
        </button>
        <button class="server-card-btn" onclick="openMovieTrailer()">
          <span class="server-icon-badge">🎥</span>
          <span>Trailer HD</span>
          <span class="server-tag-badge">1080P</span>
        </button>
      </div>
    </div>
    <div style="position:relative;flex:1;background:#000;">
      <iframe id="playerFrame" src="${servers.srvVidsync}" allowfullscreen allow="autoplay; fullscreen; picture-in-picture; encrypted-media" style="width:100%;height:100%;border:none;"></iframe>
    </div>`;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';
  overlay._servers = servers;

  if(item && item.id) {
    let pct = 0;
    overlay._progressTimer = setInterval(() => {
      pct = Math.min(pct+1, 100);
      saveProgress(item.id, item, pct*36, pct);
    }, 10000);
  }
  document.title = 'CineVerse — Premium Cinematic Experience';
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
    const grid = document.getElementById('seeAllGrid');
    grid.innerHTML = '';
    (d.results||[]).forEach(m => { const c = createMovieCard(m); grid.appendChild(c); });
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
    grid.innerHTML = '';
    const results = d.results || [];
    if (!results.length) {
      grid.innerHTML = `<div style="color:var(--muted);padding:30px;text-align:center;">No titles found in ${name} collection.</div>`;
      return;
    }
    results.forEach(m => { const c = createMovieCard(m); grid.appendChild(c); });
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
    const results = (d.results || []).filter(r => r.media_type !== 'person');
    if (!results.length) {
      grid.innerHTML = `<div style="color:var(--muted);padding:40px 20px;text-align:center;">No movies or TV shows found matching "${q}".</div>`;
      return;
    }
    grid.innerHTML = '';
    results.forEach(m => {
      const card = createMovieCard(m);
      grid.appendChild(card);
    });
  } catch(e) {
    grid.innerHTML = '<div style="color:var(--muted);padding:20px;">Search failed to load results.</div>';
  }
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
  document.getElementById('accountAvatar').textContent = activeProfile?.avatar || user?.avatar || '🎬';
  document.getElementById('accountName').textContent = user?.name || activeProfile?.name || 'Guest';
  document.getElementById('accountEmail').textContent = user?.email || 'guest@cinestream.io';
  const wl = getWatchlist();
  document.getElementById('statWatchlist').textContent = wl.length;
  const prog = JSON.parse(localStorage.getItem(`cs_progress_${activeProfile?.id||'guest'}`) || '{}');
  document.getElementById('statWatched').textContent = Object.keys(prog).length;
  const reviews = Object.keys(localStorage).filter(k => k.startsWith('cs_reviews_')).reduce((a,k) => {
    try { return a + JSON.parse(localStorage.getItem(k)||'[]').length; } catch(e) { return a; }
  }, 0);
  document.getElementById('statReviews').textContent = reviews;
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

// ---- ACHIEVEMENTS ----
function openAchievements() {
  closeAccountModal();
  const grid = document.getElementById('achievementGrid');
  const progress = JSON.parse(localStorage.getItem(`cs_progress_${activeProfile?.id||'guest'}`) || '{}');
  const wl = getWatchlist();
  const watched = Object.keys(progress).length;
  const reviews = Object.keys(localStorage).filter(k=>k.startsWith('cs_reviews_')).reduce((a,k)=>{try{return a+JSON.parse(localStorage.getItem(k)||'[]').length;}catch(e){return a;}},0);
  grid.innerHTML = ACHIEVEMENTS_DEF.map(a => {
    let current = 0;
    if(a.type==='watch') current = watched;
    if(a.type==='watchlist') current = wl.length;
    if(a.type==='review') current = reviews;
    const unlocked = current >= a.req;
    return `<div class="achievement-card ${unlocked?'unlocked':''}">
      <div class="achievement-icon">${a.icon}</div>
      <div class="achievement-name">${a.name}</div>
      <div class="achievement-desc">${a.desc}</div>
      ${unlocked ? '<div style="color:var(--accent);font-size:.65rem;font-weight:700;margin-top:4px;">UNLOCKED ✓</div>' : `<div style="color:var(--muted);font-size:.65rem;margin-top:4px;">${current}/${a.req}</div>`}
    </div>`;
  }).join('');
  document.getElementById('achievementsModal').classList.add('open');
}
function closeAchievements() { document.getElementById('achievementsModal').classList.remove('open'); }
function closeAchievementsIfBackdrop(e) { if(e.target===document.getElementById('achievementsModal')) closeAchievements(); }
function checkAchievements() {
  const progress = JSON.parse(localStorage.getItem(`cs_progress_${activeProfile?.id||'guest'}`) || '{}');
  const watched = Object.keys(progress).length;
  if(watched === 1) showToast('🎬 Achievement Unlocked: First Watch!','🏆');
  if(watched === 5) showToast('🍿 Achievement Unlocked: Binge Watcher!','🏆');
  if(watched === 10) showToast('🎭 Achievement Unlocked: Cinephile!','🏆');
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
      document.getElementById('trailerFrameWrap').innerHTML = `<iframe src="https://www.youtube.com/embed/${yt.key}?autoplay=1" allowfullscreen allow="autoplay" style="position:absolute;inset:0;width:100%;height:100%;border:none;"></iframe>`;
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

// ---- SURPRISE SPINNER ----
function openSurpriseSpinner() { document.getElementById('spinnerModal').classList.add('open'); }
function closeSpinner() { document.getElementById('spinnerModal').classList.remove('open'); }
function closeSpinnerIfBackdrop(e) { if(e.target===document.getElementById('spinnerModal')) closeSpinner(); }

const SPIN_GENRES = [
  {name:'Action',id:28},{name:'Comedy',id:35},{name:'Horror',id:27},
  {name:'Romance',id:10749},{name:'Sci-Fi',id:878},{name:'Thriller',id:53}
];

function spinWheel() {
  if(isSpinning) return;
  isSpinning = true;
  document.getElementById('spinResult').textContent = 'Spinning...';
  const extraDeg = 720 + Math.floor(Math.random() * 360);
  spinDeg += extraDeg;
  const wheel = document.getElementById('spinnerWheel');
  wheel.style.transform = `rotate(${spinDeg}deg)`;
  setTimeout(async () => {
    isSpinning = false;
    const idx = Math.floor(((spinDeg % 360) / 60)) % SPIN_GENRES.length;
    const genre = SPIN_GENRES[idx];
    document.getElementById('spinResult').textContent = `🎬 Loading ${genre.name} movies...`;
    try {
      const d = await api(`/discover/movie?with_genres=${genre.id}&sort_by=popularity.desc`);
      const movies = d.results||[];
      const pick = movies[Math.floor(Math.random()*Math.min(movies.length,5))];
      if(pick) {
        document.getElementById('spinResult').textContent = `🎉 "${pick.title}" — ${genre.name}`;
        setTimeout(() => { closeSpinner(); openMovieTray(pick); }, 1500);
      }
    } catch(e) { document.getElementById('spinResult').textContent = 'Pick a genre above!'; }
  }, 3000);
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
}

function setupScrollEvents() {
  const scrollBtn = document.getElementById('scrollTopBtn');
  window.addEventListener('scroll', () => {
    scrollBtn.classList.toggle('visible', window.scrollY > 400);
    // Infinite scroll
    if(window.innerHeight + window.scrollY >= document.body.offsetHeight - 400) {
      const btn = document.getElementById('loadMoreBtn');
      if(btn && !btn.dataset.loading) {
        btn.dataset.loading = '1';
        loadMorePopular().then(() => { delete btn.dataset.loading; });
      }
    }
  });
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

// ---- CURSOR TRAIL ----
function setupCursorTrail() {
  if(window.innerWidth < 768) return;
  document.addEventListener('mousemove', e => {
    const trail = document.createElement('div');
    trail.className = 'cursor-trail';
    trail.style.left = (e.clientX - 4) + 'px';
    trail.style.top = (e.clientY - 4) + 'px';
    document.body.appendChild(trail);
    setTimeout(() => { trail.style.opacity = '0'; setTimeout(() => trail.remove(), 500); }, 200);
  });
}

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