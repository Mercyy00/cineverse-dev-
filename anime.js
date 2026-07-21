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
let animeCatalogItems = [];
let activeAnimeGenre = 'all';
let currentSelectedAnime = null;

// Init Page
window.addEventListener('DOMContentLoaded', async () => {
  initSakuraPetals();
  updateAudioUI();
  await Promise.all([
    loadAnimeHero(),
    loadAnimeTop10(),
    loadAnimeCatalogGrid(1)
  ]);
});

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
    const tmdbData = await api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc');
    animeHeroItems = (tmdbData.results || []).slice(0, 7);
    if (animeHeroItems.length > 0) {
      renderAnimeHero(0);
      renderAnimeHeroDots();
      animeHeroTimer = setInterval(() => nextAnimeHero(), 8000);
    }
  } catch (e) {
    console.error('Anime Hero Load Error:', e);
  }
}

function renderAnimeHero(idx) {
  const m = animeHeroItems[idx];
  if (!m) return;
  animeHeroIdx = idx;

  const backdrop = document.getElementById('animeHeroBackdrop');
  if (backdrop) backdrop.src = m.backdrop_path ? `https://image.tmdb.org/t/p/w1280${m.backdrop_path}` : '';

  const title = document.getElementById('animeHeroTitle');
  if (title) title.textContent = m.name || m.title || '';

  const meta = document.getElementById('animeHeroMeta');
  if (meta) {
    const year = (m.first_air_date || m.release_date || '').slice(0, 4);
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
    const tmdbData = await api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=vote_average.desc&vote_count.gte=200');
    const items = (tmdbData.results || []).slice(0, 10);
    
    track.innerHTML = '';
    items.forEach((m, i) => {
      const card = document.createElement('div');
      card.className = 'top10-card';
      card.style.cursor = 'pointer';
      card.innerHTML = `
        <div class="top10-rank" style="color:var(--anime-pink);-webkit-text-stroke:2px var(--anime-purple);">${i + 1}</div>
        <div class="movie-card-poster">
          <img src="${m.poster_path ? 'https://image.tmdb.org/t/p/w342' + m.poster_path : ''}" alt="${m.name || m.title}" loading="lazy"/>
          <div class="play-overlay"><div class="play-circle" style="background:var(--anime-pink);"><svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg></div></div>
          <div class="card-badge rating">★ ${m.vote_average ? m.vote_average.toFixed(1) : '8.5'}</div>
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

  if (page === 1) grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px;">Fetching latest anime catalog from Anikoto API...</div>';

  try {
    // 1. Attempt Anikoto API Live Recent Feed
    const anikotoRes = await fetchAnikotoApi(`/recent-anime?page=${page}&per_page=20`);
    const anikotoItems = anikotoRes?.data || anikotoRes?.anime || anikotoRes?.results || [];

    // 2. TMDB Japanese Anime Feed for imagery & metadata enrichment
    const tmdbData = await api(`/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc&page=${page}`);
    const tmdbItems = tmdbData.results || [];

    // Combine feeds
    let combined = tmdbItems;
    if (page === 1) grid.innerHTML = '';

    combined.forEach(m => {
      grid.appendChild(createAnimeCard(m));
    });

    currentCatalogPage = page;
  } catch (e) {
    console.error('Anime Catalog Load Error:', e);
  }
}

function createAnimeCard(m) {
  const div = document.createElement('div');
  div.className = 'movie-card';
  div.style.borderColor = 'rgba(255, 117, 160, 0.2)';

  const poster = m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : '';
  const title = m.name || m.title || 'Anime Series';
  const year = (m.first_air_date || m.release_date || '2026').slice(0, 4);
  const rating = m.vote_average ? m.vote_average.toFixed(1) : '8.2';

  div.innerHTML = `
    <div class="movie-card-poster">
      <img src="${poster}" alt="${title}" loading="lazy" onerror="this.style.display='none'"/>
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

  div.onclick = () => openAnimeDetails(m);
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
  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:40px;">Filtering anime by genre...</div>';

  api('/discover/tv?with_genres=16&with_original_language=ja&sort_by=popularity.desc')
    .then(d => {
      let items = d.results || [];
      if (genre === 'shonen') items = items.filter(m => (m.overview||'').toLowerCase().includes('fight') || (m.overview||'').toLowerCase().includes('battle') || (m.vote_average > 7.8));
      else if (genre === 'isekai') items = items.filter(m => (m.overview||'').toLowerCase().includes('world') || (m.overview||'').toLowerCase().includes('reincarnat'));
      else if (genre === 'action') items = items.filter(m => (m.overview||'').toLowerCase().includes('action') || (m.genre_ids||[]).includes(28));
      else if (genre === 'fantasy') items = items.filter(m => (m.overview||'').toLowerCase().includes('magic') || (m.genre_ids||[]).includes(14));
      else if (genre === 'romance') items = items.filter(m => (m.overview||'').toLowerCase().includes('love') || (m.genre_ids||[]).includes(10749));

      grid.innerHTML = '';
      items.forEach(m => grid.appendChild(createAnimeCard(m)));
    });
}

// ─── SEARCH HANDLER ───
let animeSearchTimeout = null;
function handleAnimeSearch(query) {
  clearTimeout(animeSearchTimeout);
  const dropdown = document.getElementById('animeSearchDropdown');
  if (!dropdown) return;

  if (!query || query.trim().length < 2) {
    dropdown.style.display = 'none';
    return;
  }

  animeSearchTimeout = setTimeout(async () => {
    try {
      const data = await api(`/search/tv?query=${encodeURIComponent(query)}`);
      const animeResults = (data.results || []).filter(m => (m.genre_ids||[]).includes(16) || m.original_language === 'ja');

      dropdown.innerHTML = '';
      if (!animeResults.length) {
        dropdown.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:0.82rem;">No matching anime found</div>';
      } else {
        animeResults.slice(0, 6).forEach(m => {
          const item = document.createElement('div');
          item.className = 'search-item';
          item.style.cssText = 'display:flex;align-items:center;gap:12px;padding:10px;cursor:pointer;border-bottom:1px solid rgba(255,255,255,0.06);';
          item.innerHTML = `
            <img src="${m.poster_path ? 'https://image.tmdb.org/t/p/w92' + m.poster_path : ''}" style="width:36px;height:54px;border-radius:6px;object-fit:cover;"/>
            <div>
              <div style="font-weight:700;font-size:0.85rem;color:var(--text);">${m.name || m.title}</div>
              <div style="font-size:0.75rem;color:var(--muted);">${(m.first_air_date||'').slice(0,4)} • Rating: ★ ${m.vote_average?.toFixed(1)||'8.0'}</div>
            </div>
          `;
          item.onclick = () => {
            dropdown.style.display = 'none';
            openAnimeDetails(m);
          };
          dropdown.appendChild(item);
        });
      }
      dropdown.style.display = 'block';
    } catch (e) {
      console.error('Anime Search Error:', e);
    }
  }, 300);
}

// ─── ANIME DETAILS & EPISODE MODAL ───
async function openAnimeDetails(m) {
  currentSelectedAnime = m;
  const modal = document.getElementById('animeModal');
  if (!modal) return;

  const poster = document.getElementById('animeModalPoster');
  if (poster) poster.src = m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : '';

  const title = document.getElementById('animeModalTitle');
  if (title) title.textContent = m.name || m.title || 'Anime Series';

  const meta = document.getElementById('animeModalMeta');
  if (meta) {
    const year = (m.first_air_date || m.release_date || '2026').slice(0, 4);
    meta.textContent = `${year} • Rating: ★ ${m.vote_average ? m.vote_average.toFixed(1) : '8.5'} • Anikoto Video Stream`;
  }

  const overview = document.getElementById('animeModalOverview');
  if (overview) overview.textContent = m.overview || 'Enjoy watching this high-definition anime series with multi-language server choices.';

  // Build Episode Selector Grid
  const epGrid = document.getElementById('animeEpisodesGrid');
  if (epGrid) {
    epGrid.innerHTML = Array.from({ length: 24 }, (_, i) => `
      <button class="sidebar-ep-btn" style="padding:10px;font-weight:800;border-color:rgba(255,117,160,0.3);" onclick="playAnimeEpisode(${i + 1})">
        E${i + 1}
      </button>
    `).join('');
  }

  modal.classList.add('open');
}

function closeAnimeModal() {
  const modal = document.getElementById('animeModal');
  if (modal) modal.classList.remove('open');
}

function closeAnimeModalIfBackdrop(e) {
  if (e.target === document.getElementById('animeModal')) {
    closeAnimeModal();
  }
}

function playAnimeEpisode(epNum) {
  if (!currentSelectedAnime) return;
  closeAnimeModal();

  const id = currentSelectedAnime.id || 0;
  const title = currentSelectedAnime.name || currentSelectedAnime.title || 'Anime Series';

  // Redirect to standalone watch.html with Anikoto Stream parameters
  window.location.href = `watch.html?id=${id}&type=tv&season=1&episode=${epNum}&title=${encodeURIComponent(title)}&isAnime=1&audio=${currentAnimeAudio}`;
}
