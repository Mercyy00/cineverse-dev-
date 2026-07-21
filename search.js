/**
 * CineVerse — search.js
 * Dedicated Search Engine Page Logic
 */

'use strict';

const searchUrlParams = new URLSearchParams(window.location.search);
let currentSearchQuery = searchUrlParams.get('q') || 'One Piece';
let activeSearchFilter = 'all';
let currentSearchPage = 1;
let allSearchResults = [];

window.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('pageSearchInput');
  if (input) input.value = currentSearchQuery;

  const queryText = document.getElementById('searchQueryText');
  if (queryText) queryText.textContent = currentSearchQuery;

  executeFullSearch(currentSearchQuery);
});

function handlePageSearchKey(e) {
  if (e.key === 'Enter') {
    executePageSearch();
  }
}

function executePageSearch() {
  const input = document.getElementById('pageSearchInput');
  const val = input ? input.value.trim() : '';
  if (!val) return;
  window.location.href = `search.html?q=${encodeURIComponent(val)}`;
}

async function executeFullSearch(query) {
  const grid = document.getElementById('searchResultsGrid');
  const countEl = document.getElementById('searchTotalCount');
  if (!grid) return;

  grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:60px;">Searching titles across movies, series, and anime...</div>';

  try {
    const [multiData, animeData] = await Promise.all([
      api(`/search/multi?query=${encodeURIComponent(query)}`),
      api(`/search/tv?query=${encodeURIComponent(query)}`)
    ]);

    const multiList = multiData?.results || [];
    const animeList = (animeData?.results || []).map(m => ({ ...m, isAnime: true }));

    // Merge and deduplicate
    const combined = [...multiList, ...animeList];
    const seen = new Set();
    allSearchResults = combined.filter(m => {
      if (!m.id || seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    if (countEl) countEl.textContent = `Found ${allSearchResults.length} matching titles`;
    renderSearchResultsGrid();
  } catch (e) {
    console.error('Search Engine Error:', e);
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:60px;">Search failed to load results. Please try again.</div>';
  }
}

function filterSearchMedia(type, btnEl) {
  activeSearchFilter = type;
  if (btnEl) {
    document.querySelectorAll('.genre-chip').forEach(c => c.classList.remove('active'));
    btnEl.classList.add('active');
  }
  renderSearchResultsGrid();
}

function renderSearchResultsGrid() {
  const grid = document.getElementById('searchResultsGrid');
  if (!grid) return;

  let filtered = allSearchResults;
  if (activeSearchFilter === 'movie') {
    filtered = filtered.filter(m => m.media_type === 'movie' || m.release_date !== undefined);
  } else if (activeSearchFilter === 'tv') {
    filtered = filtered.filter(m => m.media_type === 'tv' || m.first_air_date !== undefined);
  } else if (activeSearchFilter === 'anime') {
    filtered = filtered.filter(m => m.isAnime || (m.genre_ids || []).includes(16) || m.original_language === 'ja');
  }

  grid.innerHTML = '';
  if (!filtered.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;text-align:center;color:var(--muted);padding:60px;">No ${activeSearchFilter} titles match "${currentSearchQuery}".</div>`;
    return;
  }

  filtered.forEach(m => {
    grid.appendChild(createSearchResultCard(m));
  });
}

function createSearchResultCard(m) {
  const div = document.createElement('div');
  div.className = 'movie-card';

  const isTV = m.media_type === 'tv' || m.first_air_date !== undefined;
  const isAnime = m.isAnime || (m.genre_ids || []).includes(16) || m.original_language === 'ja';
  const poster = m.poster_path ? `https://image.tmdb.org/t/p/w342${m.poster_path}` : 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80';
  const title = m.title || m.name || 'Title';
  const year = (m.release_date || m.first_air_date || '2026').slice(0, 4);
  const rating = m.vote_average ? m.vote_average.toFixed(1) : '8.5';

  div.innerHTML = `
    <div class="movie-card-poster">
      <img src="${poster}" alt="${title}" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80'"/>
      <div class="card-badge rating">★ ${rating}</div>
      ${isAnime ? '<div class="card-badge sub-dub" style="background:var(--anime-pink);color:#fff;">ANIME</div>' : ''}
      <div class="play-overlay">
        <div class="play-circle">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5,3 19,12 5,21"/></svg>
        </div>
      </div>
    </div>
    <div class="card-info">
      <div class="card-title">${title}</div>
      <div class="card-meta">${year} • ${isAnime ? 'Japanese Anime' : (isTV ? 'TV Series' : 'Movie')}</div>
    </div>
  `;

  div.onclick = () => {
    if (isAnime) {
      window.location.href = `watch.html?id=${m.id}&type=tv&season=1&episode=1&title=${encodeURIComponent(title)}&isAnime=1`;
    } else if (isTV) {
      openTVSeries(m);
    } else {
      openMovieTray(m);
    }
  };
  return div;
}
