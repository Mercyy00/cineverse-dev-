/**
 * CineVerse — pwa.js
 * PWA Service Worker Registration & Cache API Offline Downloader
 */

'use strict';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(reg => console.log('CineVerse ServiceWorker registered:', reg.scope))
      .catch(err => console.warn('ServiceWorker registration failed:', err));
  });
}

// Cache API Real Offline Downloader
async function cacheVideoForOffline(movieId, videoUrl, onProgress) {
  if (!('caches' in window)) {
    throw new Error('Cache API not supported');
  }

  const cacheName = 'cineverse-media-v1';
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(videoUrl);
    if (!response.ok) throw new Error('Fetch failed');

    const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
    const reader = response.body.getReader();
    let receivedBytes = 0;
    const chunks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      chunks.push(value);
      receivedBytes += value.length;

      if (contentLength > 0 && onProgress) {
        const percent = Math.min(100, Math.floor((receivedBytes / contentLength) * 100));
        onProgress(percent);
      }
    }

    const blob = new Blob(chunks, { type: 'video/mp4' });
    const blobResponse = new Response(blob, {
      headers: { 'Content-Type': 'video/mp4', 'Content-Length': blob.size.toString() }
    });

    await cache.put(`/offline-media-${movieId}.mp4`, blobResponse);
    return true;
  } catch (e) {
    console.error('Offline caching error:', e);
    return false;
  }
}
