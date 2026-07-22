import { describe, it, expect } from 'vitest';
import { calculateVibeMatchScore, VIBE_PROFILES } from '../src/modules/vibeEngine.js';

describe('Vibe Engine Scoring Algorithm', () => {
  it('should return a high score when film genres match the target vibe profile', () => {
    const movie = { title: 'Action Hero', genre_ids: [28, 12], vote_average: 8.5 };
    const score = calculateVibeMatchScore(movie, 'hyped');
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it('should return valid match scores bounded between 65% and 99%', () => {
    const movie = { title: 'Obscure Indie', genre_ids: [999], vote_average: 3.0 };
    const score = calculateVibeMatchScore(movie, 'hyped');
    expect(score).toBeGreaterThanOrEqual(65);
    expect(score).toBeLessThanOrEqual(99);
  });

  it('should contain definitions for all 8 core mood profiles', () => {
    const profiles = Object.keys(VIBE_PROFILES);
    expect(profiles).toContain('hyped');
    expect(profiles).toContain('melancholy');
    expect(profiles).toContain('terrified');
    expect(profiles).toContain('romantic');
    expect(profiles).toContain('mindblown');
    expect(profiles).toContain('funny');
    expect(profiles).toContain('chill');
    expect(profiles).toContain('curious');
  });
});
