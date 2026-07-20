/**
 * CineVerse — comments.js
 * Threaded Discussions, Rating Aggregator & Moderation Engine
 */

'use strict';

class CommentsEngine {
  constructor(movieId) {
    this.movieId = movieId || '157336';
    this.storageKey = `cs_comments_${this.movieId}`;
    this.selectedStars = 5;
    this.init();
  }

  init() {
    this.bindStarPicker();
    this.bindForm();
    this.render();
  }

  bindStarPicker() {
    const stars = document.querySelectorAll('#starRatingSelect span');
    stars.forEach(star => {
      star.onclick = () => {
        this.selectedStars = parseInt(star.dataset.star, 10);
        stars.forEach((s, idx) => {
          s.style.opacity = idx < this.selectedStars ? '1' : '0.25';
        });
      };
    });
  }

  bindForm() {
    const btn = document.getElementById('submitReviewBtn');
    if (!btn) return;

    btn.onclick = () => {
      const input = document.getElementById('reviewTextInput');
      const text = input ? input.value.trim() : '';
      if (!text) {
        if (typeof showToast === 'function') showToast('Please enter your review', '⚠️');
        return;
      }

      const profile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
      const commentObj = {
        id: 'comm_' + Date.now(),
        author: profile.name || 'CineVerse Critic',
        avatar: profile.avatar || '🍿',
        rating: this.selectedStars,
        text: text,
        timestamp: Date.now(),
        date: 'Just now',
        likes: 0,
        reports: 0
      };

      const existing = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      existing.unshift(commentObj);
      localStorage.setItem(this.storageKey, JSON.stringify(existing));

      if (input) input.value = '';
      this.render();
      if (typeof showToast === 'function') showToast('Review published!', '✍️');
    };
  }

  getComments() {
    const custom = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
    const defaults = [
      { id: 'def_1', author: 'CinephileMax', avatar: '⚡', rating: 5, text: 'Absolute masterpiece! The sound design and cinematography are peak cinema.', date: '2 days ago', likes: 24, reports: 0 },
      { id: 'def_2', author: 'ElenaR', avatar: '🍿', rating: 4, text: 'Stunning visuals. Highly recommend watching on a 4K display in dark mode!', date: '1 week ago', likes: 11, reports: 0 }
    ];
    return [...custom, ...defaults];
  }

  calculateAverageRating() {
    const comments = this.getComments();
    if (!comments.length) return 5.0;
    const total = comments.reduce((acc, c) => acc + (c.rating || 5), 0);
    return (total / comments.length).toFixed(1);
  }

  render() {
    const container = document.getElementById('reviewsList');
    if (!container) return;

    const comments = this.getComments();
    const avgScore = this.calculateAverageRating();

    const avgEl = document.getElementById('communityAvgScore');
    if (avgEl) avgEl.textContent = `⭐ ${avgScore} / 5.0 (${comments.length} reviews)`;

    container.innerHTML = '';
    comments.forEach(c => {
      if (c.reports > 2) return; // Hidden by moderation

      const starsHtml = '★'.repeat(c.rating || 5) + '☆'.repeat(5 - (c.rating || 5));
      const card = document.createElement('div');
      card.className = 'review-card';
      card.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <div style="font-weight:800;font-size:0.85rem;display:flex;align-items:center;gap:6px;">
            <span>${c.avatar}</span> <span>${c.author}</span>
          </div>
          <div style="color:#ffb800;font-size:0.75rem;">${starsHtml}</div>
        </div>
        <div style="font-size:0.85rem;line-height:1.6;color:var(--text);opacity:0.9;">${c.text}</div>
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;font-size:0.72rem;color:var(--muted);">
          <span>${c.date}</span>
          <button style="background:none;border:none;color:var(--muted);cursor:pointer;font-size:0.7rem;" onclick="reportComment('${c.id}')">🚩 Report</button>
        </div>
      `;
      container.appendChild(card);
    });
  }
}

function reportComment(commentId) {
  if (typeof showToast === 'function') showToast('Comment reported to moderators', '🚩');
}
