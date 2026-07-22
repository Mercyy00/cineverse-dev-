/**
 * CineVerse — src/modules/vibeEngine.js
 * Vibe DNA & Mood Vectors Algorithm Engine
 */

export const VIBE_PROFILES = {
  hyped: { name: 'Hyped 🔥', genres: [28, 12, 878], sub: 'Action-packed · High energy · Mindblowing adrenaline' },
  melancholy: { name: 'Melancholy 💜', genres: [18, 10749], sub: 'Emotional · Deep feeling · Heartfelt' },
  terrified: { name: 'Terrified 😱', genres: [27, 53], sub: 'Thrills & Horror · Edge of seat' },
  romantic: { name: 'Romantic 💕', genres: [10749, 35], sub: 'Warmth & Passion · Cozy love' },
  mindblown: { name: 'Mindblown 🌀', genres: [878, 9648], sub: 'Sci-Fi & Mind-bending plot twists' },
  funny: { name: 'Funny 😄', genres: [35, 16], sub: 'Laughs & Pure Comedy · Feel good' },
  chill: { name: 'Chill 🌙', genres: [10751, 35, 18], sub: 'Relaxed · Cozy vibes · Comfort watch' },
  curious: { name: 'Curious 🌍', genres: [99, 36, 12], sub: 'Documentaries & World Cinema · Inspiring' }
};

export function calculateVibeMatchScore(movie, vibeId = 'hyped') {
  if (!movie) return 85;
  const targetGenres = VIBE_PROFILES[vibeId]?.genres || [28];
  const itemGenres = movie.genre_ids || movie.genres?.map(g => g.id) || [];
  let matchCount = 0;
  targetGenres.forEach(g => { if (itemGenres.includes(g)) matchCount++; });
  const voteScore = movie.vote_average ? movie.vote_average * 8 : 70;
  return Math.min(99, Math.max(65, Math.round(voteScore + (matchCount * 12))));
}
