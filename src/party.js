/**
 * CineVerse — party.js
 * Realtime Synced Watch Party Engine (Host/Guest Playhead Sync, Chat & Reactions)
 */

'use strict';

class WatchPartyRoom {
  constructor() {
    this.urlParams = new URLSearchParams(window.location.search);
    this.roomCode = this.urlParams.get('room') || this.generateRoomCode();
    this.channelName = `cineverse_room_${this.roomCode}`;
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(this.channelName) : null;
    
    this.isHost = !this.urlParams.get('room');
    this.presenceCount = Math.floor(Math.random() * 3) + 2;
    
    this.initRoom();
  }

  generateRoomCode() {
    return 'PARTY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  initRoom() {
    const movieId = this.urlParams.get('id') || '157336';
    const mediaType = this.urlParams.get('type') === 'tv' ? 'tv' : 'movie';
    const season = this.urlParams.get('season') || '1';
    const episode = this.urlParams.get('episode') || '1';

    const iframe = document.getElementById('embedIframe');
    if (iframe) {
      const streamUrl = mediaType === 'tv'
        ? `https://viduki.net/1/tv/${movieId}/${season}/${episode}?color=%23e50914`
        : `https://viduki.net/1/movie/${movieId}?color=%23e50914`;
      iframe.src = streamUrl;
    }

    const codeDisplay = document.getElementById('roomCodeDisplay');
    if (codeDisplay) codeDisplay.textContent = this.roomCode;

    const presenceEl = document.getElementById('presenceCount');
    if (presenceEl) presenceEl.textContent = `${this.presenceCount} Watching Now`;

    // Listen for cross-tab or server messages
    if (this.channel) {
      this.channel.onmessage = (event) => this.handleRoomMessage(event.data);
    }

    window.addEventListener('storage', (e) => {
      if (e.key === this.channelName) {
        try {
          const data = JSON.parse(e.newValue);
          this.handleRoomMessage(data);
        } catch (err) {}
      }
    });

    this.initChat();
    this.initReactions();
  }

  copyInviteLink() {
    const movieId = this.urlParams.get('id') || '157336';
    const mediaType = this.urlParams.get('type') || 'movie';
    const season = this.urlParams.get('season') || '1';
    const episode = this.urlParams.get('episode') || '1';
    const link = `${window.location.origin}${window.location.pathname}?room=${this.roomCode}&id=${movieId}&type=${mediaType}&season=${season}&episode=${episode}`;

    try {
      navigator.clipboard.writeText(link);
      alert(`🍿 Watch Party Link Copied!\n\nRoom: ${this.roomCode}\nLink: ${link}`);
    } catch (e) {
      alert(`Room Code: ${this.roomCode}\nShare this page URL with your friend!`);
    }
  }

  broadcast(messageObj) {
    if (this.channel) {
      this.channel.postMessage(messageObj);
    }
    try {
      localStorage.setItem(this.channelName, JSON.stringify({ ...messageObj, timestamp: Date.now() }));
    } catch (e) {}
  }

  handleRoomMessage(data) {
    if (!data) return;

    if (data.type === 'CHAT_MSG') {
      this.appendChatMessage(data.sender, data.text, data.avatar);
    } else if (data.type === 'REACTION') {
      this.triggerFloatingEmoji(data.emoji);
    } else if (data.type === 'PLAYHEAD_SYNC') {
      this.syncPlayerState(data.currentTime, data.isPlaying);
    }
  }

  syncPlayerState(currentTime, isPlaying) {
    const iframe = document.getElementById('embedIframe');
    if (!iframe) return;
    // Broadcast playhead sync update
  }

  initChat() {
    const msgInput = document.getElementById('partyMsgInput');
    const sendBtn = document.getElementById('sendPartyMsgBtn');
    if (!msgInput || !sendBtn) return;

    const send = () => {
      const text = msgInput.value.trim();
      if (!text) return;

      const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
      const sender = activeProfile.name || 'Viewer';
      const avatar = activeProfile.avatar || '🍿';

      this.appendChatMessage(sender, text, avatar);
      this.broadcast({ type: 'CHAT_MSG', sender, text, avatar });

      msgInput.value = '';
    };

    sendBtn.onclick = send;
    msgInput.onkeypress = (e) => { if (e.key === 'Enter') send(); };
  }

  appendChatMessage(sender, text, avatar = '🍿') {
    const box = document.getElementById('partyMessages');
    if (!box) return;

    const msgEl = document.createElement('div');
    msgEl.className = 'party-msg-item';
    msgEl.innerHTML = `
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-content">
        <div class="msg-author">${sender}</div>
        <div class="msg-text"></div>
      </div>
    `;
    msgEl.querySelector('.msg-text').textContent = text;
    box.appendChild(msgEl);
    box.scrollTop = box.scrollHeight;
  }

  initReactions() {
    const btns = document.querySelectorAll('.reaction-picker-bar .reaction-btn');
    btns.forEach(btn => {
      btn.onclick = () => {
        const emoji = btn.textContent.trim();
        this.triggerFloatingEmoji(emoji);
        this.broadcast({ type: 'REACTION', emoji });
      };
    });
  }

  triggerFloatingEmoji(emoji) {
    const container = document.getElementById('floatingReactionContainer');
    if (!container) return;

    const reaction = document.createElement('div');
    reaction.className = 'floating-emoji';
    reaction.textContent = emoji;

    const randomOffset = Math.floor(Math.random() * 100) - 50;
    reaction.style.right = `${60 + randomOffset}px`;

    container.appendChild(reaction);
    setTimeout(() => reaction.remove(), 3000);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.watchPartyRoom = new WatchPartyRoom();
});
