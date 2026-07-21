/**
 * CineVerse — anime.js
 * Standalone Japanese Anime Hub Engine powered by Anikoto API & TMDB Archive
 */

'use strict';

// ─── ANIKOTO API & STATE ───
const ANIKOTO_HUB_BASE = 'https://anikotoapi.site';
let currentAnimeAudio = localStorage.getItem('cs_anime_audio') || 'sub';
let animeHeroItems = [];
let animeHeroIdx = 0;
let animeHeroTimer = null;
let currentCatalogPage = 1;
let activeAnimeGenre = 'all';
let currentSelectedAnime = null;

// Robust Fallback Catalog (Ensures 100% tile loading guarantee)
const CURATED_ANIME_FALLBACK = [
  { id: 1429, name: 'Attack on Titan (進撃の巨人)', poster_path: '/hTP1DtLGFamjfu8WqjM8uL9q8jU.jpg', backdrop_path: '/m0mLB142rD08z0L2u6M6uL.jpg', vote_average: 9.0, first_air_date: '2023-03-03', overview: 'Humanity fights against giant man-eating Titans in a epic dark fantasy battle.' },
  { id: 95557, name: 'Demon Slayer: Kimetsu no Yaiba', poster_path: '/xUfVStAEX3GichfZFfZvYviWd21.jpg', backdrop_path: '/nTvM431sF156yuvmBkKDw.jpg', vote_average: 8.8, first_air_date: '2024-05-12', overview: 'Tanjiro Kamado sets out to become a demon slayer after his family is slaughtered.' },
  { id: 114410, name: 'Chainsaw Man', poster_path: '/npGf5E9w1l2mYv6y.jpg', backdrop_path: '/4V1Yv.jpg', vote_average: 8.6, first_air_date: '2022-10-11', overview: 'Denji merges with his pet chainsaw devil Pochita to hunt down evil devils.' },
  { id: 114411, name: 'Jujutsu Kaisen (呪術廻戦)', poster_path: '/eAbAV.jpg', backdrop_path: '/jujutsu.jpg', vote_average: 8.7, first_air_date: '2023-07-06', overview: 'Yuji Itadori swallows a cursed finger and enters the world of Jujutsu Sorcerers.' },
  { id: 219109, name: 'Solo Leveling (俺だけレベルアップな件)', poster_path: '/gO6X1.jpg', backdrop_path: '/sololeveling.jpg', vote_average: 8.9, first_air_date: '2024-01-07', overview: 'Weakest hunter Sung Jinwoo discovers a mysterious system that allows him to level up without limits.' },
  { id: 37854, name: 'One Piece (ワンピース)', poster_path: '/cMD9Y.jpg', backdrop_path: '/onepiece.jpg', vote_average: 8.9, first_air_date: '1999-10-20', overview: 'Monkey D. Luffy explores the Grand Line searching for the ultimate treasure One Piece.' },
  { id: 119460, name: 'SPY x FAMILY', poster_path: '/spyfamily.jpg', backdrop_path: '/spybg.jpg', vote_average: 8.6, first_air_date: '2022-04-09', overview: 'A spy, an assassin, and a telepathic child form a fake family for world peace.' }
];

// Helper Image Resolvers
function getAnimePoster(m) {
  if (m.poster_path && m.poster_path.startsWith('/')) return `https://image.tmdb.org/t/p/w342${m.poster_path}`;
  if (m.poster && m.poster.startsWith('http')) return m.poster;
  if (m.image && m.image.startsWith('http')) return m.image;
  if (m.cover && m.cover.startsWith('http')) return m.cover;
  return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80';
}

function getAnimeBackdrop(m) {
  if (m.backdrop_path && m.backdrop_path.startsWith('/')) return `https://image.tmdb.org/t/p/w1280${m.backdrop_path}`;
  if (m.banner && m.banner.startsWith('http')) return m.banner;
  if (m.backdrop && m.backdrop.startsWith('http')) return m.backdrop;
  return 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1280&q=80';
}

// Init Page
window.addEventListener('DOMContentLoaded', async () => {
  initSakuraPetals();
  updateAudioUI();
  setupClickOutsideSearch();

  await Promise.all([
    loadAnimeHero(),
    loadAnimeTop10(),
    loadAnimeCatalogGrid(1)
  ]);
});

function setupClickOutsideSearch() {
  document.addEventListener('click', (e) => {
    const dropdown = document.getElementById('animeSearchDropdown');
    const searchContainer = document.querySelector('.nav-search');
    if (dropdown && searchContainer && !searchContainer.contains(e.target)) {
      dropdown.classList.remove('open');
      dropdown.style.display = 'none';
    }
  });
}

// ─── SAKURA PETALS SYSTEM ───
function initSakuraPetals() {
  const container = document.getElementById('sakuraContainer');
  if (!container || container.children.length > 0) return;
  for (let i = 0; i < 30; i++) {
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

// ─── AUDIO SUB / DUB TOGGLE ───
function setAnimeAudio(lang) {
  currentAnimeAudio = lang;
  localStorage.setItem('cs_anime_audio', lang);
  updateAudioUI();
  if (typeof showToast === 'function') {
    showToast(`Anime Audio preference set to ${lang === 'sub' ? '🇯🇵 Japanese Sub' : '🎙️ English Dub'}`, '⛩️');
  }
}

function updateAudioUI() {
  const subBtns = [document.getElementById('subBtn'), document.getElementById('modalSubBtn')].filter(Boolean);
  const dubBtns = [document.getElementById('dubBtn'), document.getElementById('modalDubBtn')].filter(Boolean);
  
  subBtns.forEach(b => b.classList.toggle('active', currentAnimeAudio === 'sub'));
  dubBtns.forEach(b => b.classList.toggle('active', currentAnimeAudio === 'dub'));

  const label = document.getElementById('currentAudioLabel');
  if (label) {
    label.textContent = currentAnimeAudio === 'sub' ? '🇯🇵 JAPANESE SUB' : '🎙️ ENGLISH DUB';
  }
}

// ─── NAV SCROLL ───
function scrollToAnimeSec(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
}

function scrollAnimeTrack(trackId, dir) {
  const t = document.getElementById(trackId);
  if (t) t.scrollBy({ left: dir * (175 + 16) * 3, behavior: 'smooth' });
}

// ─── ANIKOTO API FETCHER ───
async function fetchAnikotoApi(endpoint) {
  try {
    const res = await fetch(`${ANIKOTO_HUB_BASE}${endpoint}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    console.warn(`Anikoto API failed for ${endpoint}:`, e);
    return null;
  }
}

// ─── HERO SPOTLIGHT ───
async function loadAnimeHero() {
  try {
    let tmdbData = null;
    if (typeof api === 'function') {
      tmdbData = await api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc');
    }
    animeHeroItems = (tmdbData?.results || []).slice(0, 7);
    if (!animeHeroItems.length) animeHeroItems = CURATED_ANIME_FALLBACK;

    renderAnimeHero(0);
    renderAnimeHeroDots();
    animeHeroTimer = setInterval(() => nextAnimeHero(), 8000);
  } catch (e) {
    console.error('Anime Hero Load Error:', e);
    animeHeroItems = CURATED_ANIME_FALLBACK;
    renderAnimeHero(0);
  }
}

function renderAnimeHero(idx) {
  const m = animeHeroItems[idx];
  if (!m) return;
  animeHeroIdx = idx;

  const backdrop = document.getElementById('animeHeroBackdrop');
  if (backdrop) backdrop.src = getAnimeBackdrop(m);

  const title = document.getElementById('animeHeroTitle');
  if (title) title.textContent = m.name || m.title || 'Anime Spotlight';

  const meta = document.getElementById('animeHeroMeta');
  if (meta) {
    const year = (m.first_air_date || m.release_date || '2026').slice(0, 4);
    const vote = m.vote_average ? m.vote_average.toFixed(1) : '9.0';
    meta.innerHTML = `<span>★ ${vote}</span> &nbsp;•&nbsp; <span>${year}</span> &nbsp;•&nbsp; <span>Japanese Animation</span> &nbsp;•&nbsp; <span>SUB | DUB</span>`;
  }

  const desc = document.getElementById('animeHeroDesc');
  if (desc) desc.textContent = m.overview || 'Stream this popular Japanese anime series in HD quality with original audio and subtitles.';

  const playBtn = document.getElementById('animeHeroPlayBtn');
  if (playBtn) playBtn.onclick = () => openAnimeDetails(m);

  document.querySelectorAll('.anime-hero-dot').forEach((d, i) => d.classList.toggle('active', i === idx));
}

function renderAnimeHeroDots() {
  const container = document.getElementById('animeHeroDots');
  if (!container) return;
  container.innerHTML = animeHeroItems.map((_, i) => `<div class="hero-dot anime-hero-dot ${i === 0 ? 'active' : ''}" onclick="goToAnimeHero(${i})"></div>`).join('');
}

function nextAnimeHero() {
  if (!animeHeroItems.length) return;
  goToAnimeHero((animeHeroIdx + 1) % animeHeroItems.length);
}

function goToAnimeHero(i) {
  renderAnimeHero(i);
}

// ─── TOP 10 WEEKLY LEADERBOARD ───
async function loadAnimeTop10() {
  const track = document.getElementById('top10Track');
  if (!track) return;

  try {
    let items = [];
    if (typeof api === 'function') {
      const tmdbData = await api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=200');
      items = (tmdbData?.results || []).slice(0, 10);
    }
    if (!items.length) items = CURATED_ANIME_FALLBACK;
    
    track.innerHTML = '';
    items.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'top10-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="top10-rank" style="color:var(--anime-pink);-webkit-text-stroke:2px var(--anime-purple);">${i + 1}</div>
        <div class="movie-card-poster">
          <img src="${getAnimePoster(m)}" alt="${m.name || m.title}" loading="lazy"/>
          <div class="play-overlay"><div class="play-circle" style="background:var(--anime-pink);"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></div>
          <div class="card-badge rating">★ ${m.vote_average ? m.vote_average.toFixed(1) : '8.8'}</div>
          <div class="card-badge sub-dub" style="bottom:8px;left:8px;top:auto;">SUB | DUB</div>
        </div>
      `;
      card.onclick = () => openAnimeDetails(m);
      track.appendChild(card);
    });
  } catch (e) {
    console.error('Top 10 Anime Error:', e);
  }
}

// ─── LIVE CATALOG GRID ───
async function loadAnimeCatalogGrid(page = 1) {
  const grid = document.getElementById('animeGrid');
  if (!grid) return;

  if (page === 1) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px;">Fetching latest anime catalog...</div>';

  try {
    let items = [];

    // 1. Try TMDB Anime API
    if (typeof api === 'function') {
      const tmdbData = await api(`/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`);
      items = tmdbData?.results || [];
    }

    // 2. Fallback to Curated List if empty
    if (!items.length) {
      items = CURATED_ANIME_FALLBACK;
    }

    if (page === 1) grid.innerHTML = '';

    items.forEach(m => {
      grid.appendChild(createAnimeCard(m));
    });

    currentCatalogPage = page;
  } catch (e) {
    console.error('Anime Catalog Load Error:', e);
    grid.innerHTML = '';
    CURATED_ANIME_FALLBACK.forEach(m => grid.appendChild(createAnimeCard(m)));
  }
}

function createAnimeCard(m) {
  const div = document.createElement('div');
  div.className = 'movie-card';
  div.style.borderColor = 'rgba(255, 117, 160, 0.2)';

  const poster = getAnimePoster(m);
  const title = m.name || m.title || 'Anime Series';
  const year = (m.first_air_date || m.release_date || '2026').slice(0, 4);
  const rating = m.vote_average ? m.vote_average.toFixed(1) : '8.5';

  div.innerHTML = `
    <div class="movie-card-poster">
      <img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80'"/>
      <div class="card-badge rating">★ ${rating}</div>
      <div class="card-badge sub-dub">SUB | DUB</div>
      <div class="play-overlay">
        <div class="play-circle" style="background:linear-gradient(135deg,var(--anime-pink),var(--anime-purple));">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
    </div>
    <div class="card-info">
      <div class="card-title">${title}</div>
      <div class="card-meta">${year} • Japanese TV</div>
    </div>
  `;

  div.onclick = (e) => {
    e.stopPropagation();
    openAnimeDetails(m);
  };
  return div;
}

function loadMoreAnimeCatalog() {
  currentCatalogPage++;
  loadAnimeCatalogGrid(currentCatalogPage);
}

// ─── GENRE FILTERING ───
function filterAnimeCategory(genre, btnEl) {
  activeAnimeGenre = genre;
  if (btnEl) {
    document.querySelectorAll('#animeGenreChips .genre-chip').forEach(c => c.classList.remove('active'));
    btnEl.classList.add('active');
  }

  const grid = document.getElementById('animeGrid');
  if (!grid) return;

  if (typeof api === 'function') {
    api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc')
      .then(d => {
        let items = d?.results || [];
        if (genre === 'shonen') items = items.filter(m => (m.overview||'').toLowerCase().includes('fight') || (m.overview||'').toLowerCase().includes('battle') || (m.vote_average > 7.8));
        else if (genre === 'isekai') items = items.filter(m => (m.overview||'').toLowerCase().includes('world') || (m.overview||'').toLowerCase().includes('reincarnat'));
        else if (genre === 'action') items = items.filter(m => (m.overview||'').toLowerCase().includes('action') || (m.genre_ids||[]).includes(28));
        else if (genre === 'fantasy') items = items.filter(m => (m.overview||'').toLowerCase().includes('magic') || (m.genre_ids||[]).includes(14));
        else if (genre === 'romance') items = items.filter(m => (m.overview||'').toLowerCase().includes('love') || (m.genre_ids||[]).includes(10749));

        grid.innerHTML = '';
        (items.length ? items : CURATED_ANIME_FALLBACK).forEach(m => grid.appendChild(createAnimeCard(m)));
      });
  }
}

// ─── EXPANDED SEARCH ENGINE ───
let animeSearchTimeout = null;
function handleAnimeSearch(query) {
  clearTimeout(animeSearchTimeout);
  const dropdown = document.getElementById('animeSearchDropdown');
  if (!dropdown) return;

  if (!query || query.trim().length < 2) {
    dropdown.style.display = 'none';
    dropdown.classList.remove('open');
    return;
  }

  animeSearchTimeout = setTimeout(async () => {
    try {
      let results = [];
      const qLower = query.toLowerCase().trim();

      // Search local curated fallback
      const localMatches = CURATED_ANIME_FALLBACK.filter(m => (m.name || m.title || '').toLowerCase().includes(qLower));

      // Search TMDB API
      if (typeof api === 'function') {
        const [tvData, movieData] = await Promise.all([
          api(`/search/tv?query=${encodeURIComponent(query)}`),
          api(`/search/movie?query=${encodeURIComponent(query)}`)
        ]);
        const tvList = (tvData?.results || []);
        const movieList = (movieData?.results || []);
        results = [...localMatches, ...tvList, ...movieList];
      } else {
        results = localMatches;
      }

      // Deduplicate by ID / title
      const seen = new Set();
      const uniqueResults = results.filter(m => {
        const key = m.id || m.name || m.title;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      dropdown.innerHTML = '';
      if (!uniqueResults.length) {
        dropdown.innerHTML = '<div style="padding:14px;color:var(--muted);font-size:0.85rem;text-align:center;">No matching anime found</div>';
      } else {
        uniqueResults.slice(0, 8).forEach(m => {
          const item = document.createElement('div');
          item.className = 'search-item';
          item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px 16px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.06);transition:background 0.2s;';
          item.onmouseover = () => item.style.background = 'rgba(255,117,160,0.15)';
          item.onmouseout = () => item.style.background = 'transparent';

          item.innerHTML = `
            <img src="${getAnimePoster(m)}" style="width:40px;height:58px;border-radius:8px;object-fit:cover;flex-shrink:0;"/>
            <div style="flex:1;min-width:0;">
              <div style="font-weight:800;font-size:0.88rem;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name || m.title}</div>
              <div style="font-size:0.75rem;color:var(--anime-pink);margin-top:2px;">${(m.first_air_date || m.release_date || '2026').slice(0, 4)} • ★ ${m.vote_average ? m.vote_average.toFixed(1) : '8.5'} • SUB | DUB</div>
            </div>
          `;

          item.onclick = (e) => {
            e.stopPropagation();
            dropdown.style.display = 'none';
            dropdown.classList.remove('open');
            openAnimeDetails(m);
          };
          dropdown.appendChild(item);
        });
      }
      dropdown.style.display = 'block';
      dropdown.classList.add('open');
    } catch (e) {
      console.error('Anime Search Error:', e);
    }
  }, 250);
}

// ─── OFFICIAL ANIME SAGAS & SEIYUU DICTIONARY ───
const ANIME_SAGA_MAP = {
  37854: [
    { saga: 'East Blue & Alabasta', start: 1, end: 130 },
    { saga: 'Skypiea & Water 7', start: 131, end: 336 },
    { saga: 'Marineford & Fishman', start: 337, end: 574 },
    { saga: 'Dressrosa & Whole Cake', start: 575, end: 891 },
    { saga: 'Wano Country Arc', start: 892, end: 1085 },
    { saga: 'Egghead Arc', start: 1086, end: 1120 }
  ],
  95557: [
    { saga: 'S1: Unwavering Resolve', start: 1, end: 26 },
    { saga: 'S2: Mugen Train & District', start: 27, end: 44 },
    { saga: 'S3: Swordsmith Village', start: 45, end: 55 },
    { saga: 'S4: Hashira Training', start: 56, end: 65 }
  ],
  1429: [
    { saga: 'Season 1', start: 1, end: 25 },
    { saga: 'Season 2', start: 26, end: 37 },
    { saga: 'Season 3', start: 38, end: 59 },
    { saga: 'Final Season', start: 60, end: 89 }
  ],
  114411: [
    { saga: 'Season 1: Cursed Womb', start: 1, end: 24 },
    { saga: 'Season 2: Shibuya Incident', start: 25, end: 47 }
  ]
};

const ANIME_CAST_MAP = {
  37854: [
    { name: 'Monkey D. Luffy', actor: 'Mayumi Tanaka (Voice)' },
    { name: 'Roronoa Zoro', actor: 'Kazuya Nakai (Voice)' },
    { name: 'Nami', actor: 'Akemi Okamura (Voice)' },
    { name: 'Sanji', actor: 'Hiroaki Hirata (Voice)' }
  ],
  95557: [
    { name: 'Tanjiro Kamado', actor: 'Natsuki Hanae (Voice)' },
    { name: 'Nezuko Kamado', actor: 'Akari Kito (Voice)' },
    { name: 'Zenitsu Agatsuma', actor: 'Hiro Shimono (Voice)' }
  ]
};

// ─── ANIME DETAILS & TV-STYLE TRAY OVERLAY ───
async function openAnimeDetails(m) {
  if (!m) return;
  currentSelectedAnime = m;

  try {
    const overlay = document.getElementById('animeSeriesOverlay');
    if (overlay) {
      const bg = document.getElementById('animeTrayHeroBg');
      if (bg) bg.src = getAnimeBackdrop(m);

      const title = document.getElementById('animeTrayTitle');
      if (title) title.textContent = m.name || m.title || 'Anime Series';

      const ratingBadge = document.getElementById('animeTrayRatingBadge');
      if (ratingBadge) ratingBadge.textContent = `★ ${m.vote_average ? m.vote_average.toFixed(1) : '9.0'}`;

      const meta = document.getElementById('animeTrayMeta');
      if (meta) {
        const year = (m.first_air_date || m.release_date || '2026').slice(0, 4);
        meta.textContent = `${year} • Anikoto Streaming Engine • Japanese Animation`;
      }

      const overview = document.getElementById('animeTrayOverview');
      if (overview) overview.textContent = m.overview || 'Stream this high-definition Japanese anime series with multi-language servers.';

      // Seiyuu Cast Track — Dynamic AniList GraphQL Lookup
      const castTrack = document.getElementById('animeTrayCastTrack');
      if (castTrack) {
        castTrack.innerHTML = '<div style="color:var(--muted);font-size:0.75rem;padding:6px 0;">Loading authentic Japanese Seiyuu voice cast...</div>';
        const query = `
          query ($search: String) {
            Media (search: $search, type: ANIME) {
              characters (limit: 5, sort: ROLE) {
                edges {
                  node { name { full } }
                  voiceActors (language: JAPANESE) { name { full } }
                }
              }
            }
          }
        `;
        fetchAniListGraphQL(query, { search: m.name || m.title }).then(aniData => {
          const edges = aniData?.Media?.characters?.edges || [];
          if (edges.length) {
            castTrack.innerHTML = edges.map(e => {
              const charName = sanitizeHTML(e.node?.name?.full || 'Character');
              const actorName = sanitizeHTML(e.voiceActors[0]?.name?.full || 'Japanese VA');
              return `
                <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:8px 14px;border-radius:24px;white-space:nowrap;font-size:0.78rem;flex-shrink:0;">
                  <span style="color:var(--anime-pink);font-weight:800;">${charName}</span> <span style="color:var(--muted);">• ${actorName}</span>
                </div>
              `;
            }).join('');
          } else {
            castTrack.innerHTML = `
              <div style="background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);padding:8px 14px;border-radius:24px;white-space:nowrap;font-size:0.78rem;flex-shrink:0;">
                <span style="color:var(--anime-pink);font-weight:800;">Japanese Voice Cast</span> <span style="color:var(--muted);">• Original Audio (Anikoto Node)</span>
              </div>
            `;
          }
        }).catch(() => {
          castTrack.innerHTML = '<div style="color:var(--muted);font-size:0.75rem;">Voice cast unavailable</div>';
        });
      }

      // Seasons / Story Arcs Dropdown (<select id="animeSeasonSelect">)
      const seasonSelect = document.getElementById('animeSeasonSelect');
      const sagas = (m.id && ANIME_SAGA_MAP[m.id] && ANIME_SAGA_MAP[m.id].length) ? ANIME_SAGA_MAP[m.id] : [
        { saga: 'Season 1: Original Arc', start: 1, end: 24 },
        { saga: 'Season 2: Sequel Arc', start: 25, end: 48 }
      ];

      if (seasonSelect) {
        seasonSelect.innerHTML = sagas.map((s, i) => `<option value="${s.start}-${s.end}">Season ${i + 1}: ${s.saga} (${s.start}-${s.end})</option>`).join('');
      }

      // Render Episode Cards Grid for first saga
      renderAnimeTrayEpCards(sagas[0].start, sagas[0].end);

      overlay.style.display = 'block';
      overlay.style.opacity = '1';
      overlay.style.visibility = 'visible';
      overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      return;
    }
  } catch (e) {
    console.warn('Overlay rendering error, falling back to player redirect:', e);
  }

  // Fallback direct watch redirect if overlay unavailable or throws
  const id = m.id || 0;
  const title = m.name || m.title || 'Anime Series';
  window.location.href = `watch.html?id=${id}&type=tv&season=1&episode=1&title=${encodeURIComponent(title)}&isAnime=1&audio=${currentAnimeAudio || 'sub'}`;
}

function closeAnimeSeriesOverlay() {
  const overlay = document.getElementById('animeSeriesOverlay');
  if (overlay) {
    overlay.classList.remove('open');
    overlay.style.display = 'none';
  }
  document.body.style.overflow = '';
}

function closeAnimeSeriesOverlayIfBackdrop(e) {
  if (e.target === document.getElementById('animeSeriesOverlay')) {
    closeAnimeSeriesOverlay();
  }
}

function changeAnimeTraySeason(val) {
  if (!val) return;
  const [start, end] = val.split('-').map(n => parseInt(n, 10));
  renderAnimeTrayEpCards(start, end);
}

function renderAnimeTrayEpCards(start, end) {
  const grid = document.getElementById('animeEpisodesGrid');
  if (!grid) return;
  grid.innerHTML = '';

  const backdrop = currentSelectedAnime ? getAnimeBackdrop(currentSelectedAnime) : '';

  for (let i = start; i <= end; i++) {
    const card = document.createElement('div');
    card.className = 'episode-card';
    card.onclick = () => playAnimeTrayEpisode(i);

    card.innerHTML = `
      <div class="episode-thumb" style="background:var(--card2);">
        <img src="${backdrop}" alt="Episode ${i}" loading="lazy"/>
        <div class="episode-badge">S1 : E${i}</div>
        <div class="ep-play-overlay">
          <div class="play-circle" style="background:linear-gradient(135deg,var(--anime-pink),var(--anime-purple));">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
          </div>
        </div>
      </div>
      <div class="episode-info">
        <div class="episode-title">Episode ${i}</div>
        <div class="episode-desc">Stream Episode ${i} in HD with Anikoto Stream Engine</div>
      </div>
    `;
    grid.appendChild(card);
  }
}

function setAnimeTrayAudio(lang) {
  currentAnimeAudio = lang;
  localStorage.setItem('cs_anime_audio', lang);
  const subBtn = document.getElementById('animeTraySubBtn');
  const dubBtn = document.getElementById('animeTrayDubBtn');
  if (subBtn) subBtn.classList.toggle('active', lang === 'sub');
  if (dubBtn) dubBtn.classList.toggle('active', lang === 'dub');
  if (typeof showToast === 'function') {
    showToast(`Audio set to ${lang === 'sub' ? 'Japanese Sub' : 'English Dub'}`, '⛩️');
  }
}

function playAnimeTrayEpisode(epNum) {
  if (!currentSelectedAnime) return;
  closeAnimeSeriesOverlay();

  const id = currentSelectedAnime.id || 0;
  const title = currentSelectedAnime.name || currentSelectedAnime.title || 'Anime Series';

  window.location.href = `watch.html?id=${id}&type=tv&season=1&episode=${epNum}&title=${encodeURIComponent(title)}&isAnime=1&audio=${currentAnimeAudio}`;
}

// ─── ANIKOTO TABS FILTER ───
function filterAnikotoTab(tab, btnEl) {
  if (btnEl) {
    document.querySelectorAll('#anikotoFilterTabs .genre-chip').forEach(c => c.classList.remove('active'));
    btnEl.classList.add('active');
  }

  if (tab === 'sub') setAnimeAudio('sub');
  else if (tab === 'dub') setAnimeAudio('dub');
  else if (tab === 'random') {
    const list = CURATED_ANIME_FALLBACK;
    const randomAnime = list[Math.floor(Math.random() * list.length)];
    openAnimeDetails(randomAnime);
  } else if (tab === 'trending') {
    sortAnimeCatalog('popularity');
  } else {
    loadAnimeCatalogGrid(1);
  }
}
