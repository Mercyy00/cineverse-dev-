/* ================================================
   CINEVERSE CORE API ENGINE & SECURITY SANITIZER
================================================ */

// Base configuration
const CINEVERSE_CONFIG = {
  TMDB_BASE: 'https://api.themoviedb.org/3',
  TMDB_KEY: '8114f056d61fb3a75e3c75ab3f89ee18',
  ANILIST_GRAPHQL: 'https://graphql.anilist.co',
  IMG_BASE: 'https://image.tmdb.org/t/p/',
  POSTER_FALLBACK: 'https://images.pexels.com/photos/1790556/pexels-photo-1790556.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=600&w=400',
  BACKDROP_FALLBACK: 'https://images.pexels.com/photos/1790556/pexels-photo-1790556.jpeg?auto=compress&cs=tinysrgb&fit=crop&h=800&w=1200'
};

/**
 * HTML Entity Sanitizer to prevent XSS attacks
 */
function sanitizeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const apiCache = new Map();
const pendingRequests = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Robust fetch wrapper with caching, de-duplication, timeout & exponential backoff
 */
async function fetchTMDB(endpoint, params = {}, retries = 2) {
  const url = new URL(`${CINEVERSE_CONFIG.TMDB_BASE}${endpoint}`);
  url.searchParams.set('api_key', CINEVERSE_CONFIG.TMDB_KEY);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });

  const cacheKey = url.toString();
  const cached = apiCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
    return cached.data;
  }

  if (pendingRequests.has(cacheKey)) {
    return pendingRequests.get(cacheKey);
  }

  const fetchPromise = (async () => {
    let attempt = 0;
    while (attempt <= retries) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      try {
        const res = await fetch(cacheKey, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!res.ok) throw new Error(`TMDB HTTP ${res.status}`);
        const data = await res.json();
        apiCache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
      } catch (e) {
        clearTimeout(timeoutId);
        attempt++;
        if (attempt > retries) {
          console.error(`Fetch failed for ${endpoint} after ${retries} retries:`, e);
          return null;
        }
        await new Promise(r => setTimeout(r, attempt * 500));
      }
    }
  })();

  pendingRequests.set(cacheKey, fetchPromise);
  try {
    return await fetchPromise;
  } finally {
    pendingRequests.delete(cacheKey);
  }
}

/**
 * AniList GraphQL API Fetcher for real Anime data & Seiyuu voice actors
 */
async function fetchAniListGraphQL(query, variables = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(CINEVERSE_CONFIG.ANILIST_GRAPHQL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!res.ok) throw new Error(`AniList HTTP ${res.status}`);
    const data = await res.json();
    return data?.data || null;
  } catch (e) {
    clearTimeout(timeoutId);
    console.error('AniList GraphQL Fetch error:', e);
    return null;
  }
}

/**
 * Universal SVG Icon Helper
 */
const CINEVERSE_ICONS = {
  play: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>`,
  star: `<svg width="14" height="14" viewBox="0 0 24 24" fill="#FFB800"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>`,
  torii: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 5h18M5 5v14M19 5v14M2 9h20M9 9v10M15 9v10"/></svg>`,
  close: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
  info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>`,
  menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="20" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`
};

// Export to window
window.CINEVERSE_CONFIG = CINEVERSE_CONFIG;
window.sanitizeHTML = sanitizeHTML;
window.fetchTMDB = fetchTMDB;
window.fetchAniListGraphQL = fetchAniListGraphQL;
window.CINEVERSE_ICONS = CINEVERSE_ICONS;
