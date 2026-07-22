/**
 * CineVerse — src/modules/deciderDeck.js
 * Interactive Tinder-Style Swipe Decision Deck
 */

export class DeciderDeckEngine {
  constructor() {
    this.stack = [];
    this.index = 0;
    this.mode = 'movie';
    this.swipes = { loved: [], pass: [], unseen: [] };
  }

  setMode(mode) {
    this.mode = mode;
  }

  reset() {
    this.swipes = { loved: [], pass: [], unseen: [] };
    this.index = 0;
  }

  recordSwipe(movie, action) {
    if (movie && this.swipes[action]) {
      this.swipes[action].push(movie);
    }
    this.index++;
  }

  getTopMatch() {
    if (this.swipes.loved.length > 0) {
      return this.swipes.loved[0];
    }
    return this.stack[0] || null;
  }
}
