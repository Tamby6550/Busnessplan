import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Fichiers à pré-cacher (shell de l'app)
      includeAssets: ['logo-aides.png', 'logo-aides-white.svg', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'BusinessPlan AIDES',
        short_name: 'BP AIDES',
        description: 'Outil de création de business plan professionnel — AIDES Madagascar',
        start_url: '/',
        display: 'standalone',
        background_color: '#1e2433',
        theme_color: '#3a7d2e',
        orientation: 'any',
        lang: 'fr',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        // Stratégie : Network First pour l'API, Cache First pour les assets
        runtimeCaching: [
          {
            // Assets statiques (JS, CSS, fonts) → Cache First
            urlPattern: /\.(js|css|woff2?|ttf|eot|svg|png|jpg|jpeg)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // API Symfony → Network First (avec fallback cache si offline)
            urlPattern: /^\/api\//,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
        // Ne pas mettre en cache les routes de navigation (React Router gère cela)
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api/],
      },
      devOptions: {
        // Active le Service Worker en mode développement
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
