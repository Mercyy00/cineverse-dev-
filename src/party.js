/**
 * CineVerse — party.js
 * Realtime Synced Watch Party Engine with Host/Viewer Roles & Real Presence
 */

'use strict';

class RealtimeWatchPartyEngine {
  constructor() {
    this.urlParams = new URLSearchParams(window.location.search);
    this.roomCode = this.urlParams.get('room') || this.generateRoomCode();
    this.isHost = !this.urlParams.get('room');
    this.channelName = `cineverse_party_${this.roomCode}`;
    this.channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(this.channelName) : null;
    
    this.user = this.loadUserSession();
    this.activeViewers = new Map();
    this.currentServer = 'vidsrc';
    this.hostInfo = null;

    this.init();
  }

  generateRoomCode() {
    return 'PARTY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  loadUserSession() {
    const activeProfile = JSON.parse(localStorage.getItem('cs_active_profile') || '{}');
    const userHandle = JSON.parse(localStorage.getItem('cs_user_handle') || '{}');
    const userAccount = JSON.parse(localStorage.getItem('cs_user') || '{}');

    return {
      id: userAccount.id || 'usr_' + Math.random().toString(36).substring(2),
      name: userHandle.displayName || activeProfile.name || userAccount.name || 'CineVerse Viewer',
      username: userHandle.username || 'guest',
      avatar: userHandle.emoji || activeProfile.avatar || userAccount.avatar || '🍿',
      role: this.isHost ? 'host' : 'viewer'
    };
  }

  init() {
    this.initURLState();
    this.initUI();
    this.bindEvents();
    this.initChannelListeners();
    this.startPresenceHeartbeat();

    if (this.isHost) {
      this.hostInfo = { name: this.user.name, avatar: this.user.avatar, username: this.user.username };
      this.broadcastHostState();
    } else {
      this.requestHostSync();
    }

    this.logSharedWatchHistory();
  }

  initURLState() {
    this.movieId = this.urlParams.get('id') || '157336';
    this.mediaType = this.urlParams.get('type') === 'tv' ? 'tv' : 'movie';
    this.season = this.urlParams.get('season') || '1';
    this.episode = this.urlParams.get('episode') || '1';
    this.title = this.urlParams.get('title') || 'Interstellar';
  }

  initUI() {
    // Room code badge
    const roomBadge = document.getElementById('roomCodeDisplay');
    if (roomBadge) roomBadge.textContent = this.roomCode;

    // Title bar
    const titleBar = document.getElementById('partyMediaTitle');
    if (titleBar) {
      titleBar.textContent = this.mediaType === 'tv'
        ? `${this.title} — S${this.season} E${this.episode}`
        : this.title;
    }

    // Role badge & Host controls
    const roleBadge = document.getElementById('roleBadgeDisplay');
    if (roleBadge) {
      roleBadge.textContent = this.user.role === 'host' ? '👑 Host (Owner)' : '👁 Viewer';
      roleBadge.style.background = this.user.role === 'host' ? 'rgba(229,9,20,0.2)' : 'rgba(0,210,211,0.15)';
      roleBadge.style.borderColor = this.user.role === 'host' ? '#e50914' : '#00d2d3';
      roleBadge.style.color = this.user.role === 'host' ? '#e50914' : '#00d2d3';
    }

    const hostControls = document.getElementById('hostControlsPanel');
    if (hostControls) {
      hostControls.style.display = this.user.role === 'host' ? 'flex' : 'none';
    }

    this.updateStreamPlayer();
  }

  updateStreamPlayer() {
    const iframe = document.getElementById('embedIframe');
    if (!iframe) return;

    let streamUrl = '';
    if (this.currentServer === 'vidsrc') {
      streamUrl = this.mediaType === 'tv'
        ? `https://vidsrc.me/embed/tv?tmdb=${this.movieId}&season=${this.season}&episode=${this.episode}`
        : `https://vidsrc.me/embed/movie?tmdb=${this.movieId}`;
    } else if (this.currentServer === 'vidking') {
      streamUrl = this.mediaType === 'tv'
        ? `https://vidking.net/embed/tv/${this.movieId}/${this.season}/${this.episode}`
        : `https://vidking.net/embed/movie/${this.movieId}`;
    } else {
      streamUrl = this.mediaType === 'tv'
        ? `https://viduki.net/1/tv/${this.movieId}/${this.season}/${this.episode}?color=%23e50914`
        : `https://viduki.net/1/movie/${this.movieId}?color=%23e50914`;
    }

    if (iframe.src !== streamUrl) {
      iframe.src = streamUrl;
    }
  }

  switchServer(serverNode) {
    if (this.user.role !== 'host') {
      alert('Only the Watch Party Host can change streaming server nodes.');
      return;
    }
    this.currentServer = serverNode;
    this.updateStreamPlayer();
    this.broadcastHostState();
    this.appendSystemNotice(`👑 Host switched server node to ${serverNode.toUpperCase()}`);
  }

  bindEvents() {
    // Chat submit
    const msgInput = document.getElementById('partyMsgInput');
    const sendBtn = document.getElementById('sendPartyMsgBtn');

    const handleSend = () => {
      const text = msgInput ? msgInput.value.trim() : '';
      if (!text) return;

      const chatData = {
        type: 'CHAT_MSG',
        sender: this.user.name,
        avatar: this.user.avatar,
        role: this.user.role,
        text: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      this.appendChatMessage(chatData);
      this.broadcast(chatData);
      if (msgInput) msgInput.value = '';
    };

    if (sendBtn) sendBtn.onclick = handleSend;
    if (msgInput) msgInput.onkeypress = (e) => { if (e.key === 'Enter') handleSend(); };

    // Reactions
    const reactionBtns = document.querySelectorAll('.reaction-picker-bar .reaction-btn');
    reactionBtns.forEach(btn => {
      btn.onclick = () => {
        const emoji = btn.textContent.trim();
        this.triggerFloatingEmoji(emoji);
        this.broadcast({ type: 'REACTION', emoji, sender: this.user.name });
      };
    });
  }

  initChannelListeners() {
    if (this.channel) {
      this.channel.onmessage = (e) => this.handleIncomingMessage(e.data);
    }

    window.addEventListener('storage', (e) => {
      if (e.key === this.channelName && e.newValue) {
        try {
          this.handleIncomingMessage(JSON.parse(e.newValue));
        } catch (err) {}
      }
    });
  }

  startPresenceHeartbeat() {
    this.activeViewers.set(this.user.id, { ...this.user, lastPing: Date.now() });
    this.updatePresenceCount();

    setInterval(() => {
      const ping = { type: 'PRESENCE_PING', user: this.user, timestamp: Date.now() };
      this.broadcast(ping);
      this.cleanStaleViewers();
    }, 4000);
  }

  cleanStaleViewers() {
    const now = Date.now();
    this.activeViewers.forEach((v, id) => {
      if (now - v.lastPing > 10000 && id !== this.user.id) {
        this.activeViewers.delete(id);
      }
    });
    this.updatePresenceCount();
  }

  updatePresenceCount() {
    const countEl = document.getElementById('presenceCount');
    if (countEl) {
      countEl.textContent = `${this.activeViewers.size} Watching Now`;
    }
  }

  broadcastHostState() {
    if (this.user.role !== 'host') return;
    const state = {
      type: 'HOST_STATE_SYNC',
      host: this.user,
      currentServer: this.currentServer,
      movieId: this.movieId,
      mediaType: this.mediaType,
      season: this.season,
      episode: this.episode,
      timestamp: Date.now()
    };
    this.broadcast(state);
  }

  requestHostSync() {
    this.broadcast({ type: 'REQUEST_HOST_SYNC', requesterId: this.user.id });
  }

  broadcast(data) {
    if (this.channel) {
      this.channel.postMessage(data);
    }
    try {
      localStorage.setItem(this.channelName, JSON.stringify({ ...data, _ts: Date.now() }));
    } catch (e) {}
  }

  handleIncomingMessage(data) {
    if (!data) return;

    if (data.type === 'PRESENCE_PING' && data.user) {
      this.activeViewers.set(data.user.id, { ...data.user, lastPing: Date.now() });
      this.updatePresenceCount();
    } else if (data.type === 'CHAT_MSG') {
      this.appendChatMessage(data);
    } else if (data.type === 'REACTION') {
      this.triggerFloatingEmoji(data.emoji);
    } else if (data.type === 'HOST_STATE_SYNC') {
      this.hostInfo = data.host;
      if (this.user.role === 'viewer') {
        this.currentServer = data.currentServer || this.currentServer;
        this.updateStreamPlayer();
      }
    } else if (data.type === 'REQUEST_HOST_SYNC' && this.user.role === 'host') {
      this.broadcastHostState();
    }
  }

  appendChatMessage(data) {
    const box = document.getElementById('partyMessages');
    if (!box) return;

    const isHostMsg = data.role === 'host';
    const msgEl = document.createElement('div');
    msgEl.className = 'party-msg-item';
    msgEl.innerHTML = `
      <div class="msg-avatar">${escapeHTML(data.avatar || '🍿')}</div>
      <div class="msg-content">
        <div class="msg-author" style="display:flex;align-items:center;gap:6px;">
          <span>${escapeHTML(data.sender || 'Viewer')}</span>
          ${isHostMsg ? '<span style="background:#e50914;color:#fff;font-size:0.6rem;padding:1px 6px;border-radius:10px;font-weight:800;">👑 HOST</span>' : ''}
          <span style="color:var(--muted);font-weight:400;font-size:0.65rem;">${data.time || ''}</span>
        </div>
        <div class="msg-text">${escapeHTML(data.text || '')}</div>
      </div>
    `;
    box.appendChild(msgEl);
    box.scrollTop = box.scrollHeight;
  }

  appendSystemNotice(text) {
    const box = document.getElementById('partyMessages');
    if (!box) return;

    const noticeEl = document.createElement('div');
    noticeEl.style.cssText = 'font-size:0.75rem;color:#00d2d3;text-align:center;padding:6px;background:rgba(0,210,211,0.08);border-radius:8px;margin:4px 0;font-weight:600;';
    noticeEl.textContent = text;
    box.appendChild(noticeEl);
    box.scrollTop = box.scrollHeight;
  }

  triggerFloatingEmoji(emoji) {
    const container = document.getElementById('floatingReactionContainer');
    if (!container) return;

    const reaction = document.createElement('div');
    reaction.className = 'floating-emoji';
    reaction.textContent = emoji;

    const randomOffset = Math.floor(Math.random() * 120) - 60;
    reaction.style.right = `${80 + randomOffset}px`;

    container.appendChild(reaction);
    setTimeout(() => reaction.remove(), 3000);
  }

  copyInviteLink() {
    const link = `${window.location.origin}${window.location.pathname}?room=${this.roomCode}&id=${this.movieId}&type=${this.mediaType}&season=${this.season}&episode=${this.episode}&title=${encodeURIComponent(this.title)}`;
    try {
      navigator.clipboard.writeText(link);
      alert(`🍿 Watch Party Invite Link Copied!\n\nRoom Code: ${this.roomCode}\nShare this URL with friends to join live as Viewers!`);
    } catch (e) {
      alert(`Room Code: ${this.roomCode}\nShare URL: ${link}`);
    }
  }

  logSharedWatchHistory() {
    const sharedHistory = JSON.parse(localStorage.getItem('cs_shared_history') || '[]');
    sharedHistory.unshift({
      roomCode: this.roomCode,
      title: this.title,
      host: this.user.role === 'host' ? this.user.name : (this.hostInfo?.name || 'Friend'),
      timestamp: Date.now(),
      date: new Date().toLocaleDateString()
    });
    localStorage.setItem('cs_shared_history', JSON.stringify(sharedHistory.slice(0, 20)));
  }
}

function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

document.addEventListener('DOMContentLoaded', () => {
  window.watchPartyRoom = new RealtimeWatchPartyEngine();
});
