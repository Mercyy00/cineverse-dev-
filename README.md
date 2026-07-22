# CineVerse — Premium Cinematic & Vibe Discovery Experience

[![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)](LICENSE)
[![Vanilla JS](https://img.shields.io/badge/Stack-Vanilla_JS_|_CSS3_|_HTML5-blue.svg)](#tech-stack)
[![PWA Ready](https://img.shields.io/badge/PWA-Service_Worker_Active-emerald.svg)](#offline-pwa)

**CineVerse** is a full-featured, highly responsive movie & TV streaming web platform combining mood-based discovery algorithms, interactive swipe decision decks, multi-server streaming players, and Japanese animation hubs.

---

## 🌟 Key Features

### 1. 🎭 Vibe DNA & Ambient Mood Engine
- Select from 8 dynamic mood vectors (*Hyped 🔥, Melancholy 💜, Terrified 😱, Romantic 💕, Mindblown 🌀, Funny 😄, Chill 🌙, Curious 🌍*).
- Shifting CSS ambient radial lighting based on mood RGB variables (`--vr, --vg, --vb`).
- Real-time TMDB plot keyword and genre sentiment analysis scoring films with percentage match badges (*"94% Vibe Match - Dead On"*).

### 2. 🎴 The Decider (Interactive Tinder-Style Swipe Deck)
- Touch/click swipe cards for movie discovery (*Loved it ❤️, Not for me 👎, Haven't seen 👁*).
- Dynamic recommendation engine generating top personalized match picks upon deck completion.

### 3. ⛩️ Anime Universe Hub & Voice Actor Seiyuu Engine
- Dedicated Japanese animation portal powered by `Anikoto` & `HiAnime` archives.
- Global and per-series **SUB (Japanese)** vs **DUB (English)** audio toggle.
- Voice actor cast cards (Japanese Seiyuu) and season episode grids.

### 4. ▶ Post-Binge Recovery ("Because You Watched...")
- Debounced live search field for recently finished series or films.
- Generates post-binge recommendations matching genre profiles and mood vectors.

### 5. 🎬 Multi-Server Streaming Video Player & Watch Party
- Custom player overlay with instant server node switching (RiveStream, VidCodin, 1embed, CineSrc, VidSync).
- Subtitle toggling, resolution selection, skip intro, picture-in-picture, and real-time Watch Party sync (`party.html`).

### 6. 🎨 8-Swatch Theme Engine & Multi-Profile System
- Light/Dark mode toggle paired with 8 curated cinematic accent palettes (*Crimson, Cyber Cyan, Gold, Violet, Emerald, Rose, Sunset, Monochrome*).
- Multi-profile selector with avatar emoji customization, Kids Mode safety filter, and watch history tracking.

---

## 🛠️ Project Structure & Architecture

```
responsive-movie-streaming-app/
├── index.html            # Main web application entry point
├── anime.html            # Dedicated Japanese Anime Portal page
├── watch.html            # Fullscreen Video Streaming Player UI
├── search.html           # Dedicated Multi-Criteria Search page
├── party.html            # Real-Time Watch Party Sync UI
├── style.css             # Unified Glassmorphic CSS Styling System (105KB)
├── script.js             # Core App Controller & Vibe Engine (104KB)
├── player.js             # Embedded Streaming & Subtitle Controller (52KB)
├── anime.js              # Anime Universe & Seiyuu API Controller (28KB)
├── service-worker.js     # Progressive Web App Offline Caching Worker
└── src/                  # Core Utilities & Security Sub-modules
    ├── api.js            # TMDB & AniList GraphQL Data Fetchers
    ├── theme.js          # Palette & Diegetic Image Color Sampler
    ├── comments.js       # Star Ratings & Sanitized Reviews Engine
    ├── security.js       # Developer Console Notice & Drag Shield
    └── pwa.js            # PWA Service Worker Registration
```

---

## 💻 Tech Stack & APIs

- **Frontend Core**: Vanilla JavaScript (ES6+), HTML5 Semantic Markup, Vanilla CSS3 (Custom Properties & Flex/Grid Layouts).
- **APIs & Services**:
  - **TMDB API v3** (`api.themoviedb.org`) for movie/TV metadata, cast credits, backdrops, trailers, and reviews.
  - **AniList GraphQL API** (`graphql.anilist.co`) for Japanese anime metadata, seiyuu cast, and seasonal charts.
  - **Streaming Nodes**: Multi-provider embeds with fallback server switching.
- **Persistence & Storage**: `localStorage` per profile for watchlists, watch progress timestamps, reviews, and theme settings.

---

## 🚀 Getting Started

### Prerequisites
A modern browser (Chrome, Firefox, Safari, Edge) with JavaScript enabled. No local Node.js or build server required.

### Local Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Mercyy00/cineverse-dev-.git
   cd cineverse-dev-
   ```
2. Serve locally using any static web server, or open `index.html` directly in your browser:
   ```bash
   # Using VS Code Live Server or Python http.server:
   python -m http.server 8000
   ```
3. Open `http://localhost:8000` in your browser.

---

## 🛡️ Security & XSS Protection

- User comments and profile names are sanitized through `escapeHTML()` and `window.sanitizeHTML()` to prevent XSS.
- Moderation reporting flags inappropriate reviews to ensure a safe community browsing experience.

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
