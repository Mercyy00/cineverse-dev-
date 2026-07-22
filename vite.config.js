import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  root: './',
  publicDir: 'public',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        anime: resolve(__dirname, 'anime.html'),
        watch: resolve(__dirname, 'watch.html'),
        search: resolve(__dirname, 'search.html'),
        party: resolve(__dirname, 'party.html'),
        notFound: resolve(__dirname, '404.html')
      },
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  server: {
    port: 3000,
    open: true
  },
  test: {
    environment: 'happy-dom',
    globals: true
  }
});
