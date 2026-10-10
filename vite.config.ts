/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon-180.png', 'sw-notify.js'],
      manifest: {
        name: 'Aurelio',
        short_name: 'Aurelio',
        description: 'Routines, tasks and a calendar for two, with Ori.',
        display: 'standalone',
        orientation: 'portrait',
        id: '/',
        start_url: '/',
        scope: '/',
        background_color: '#F6F1E9',
        theme_color: '#F6F1E9',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // App shell, self-hosted fonts and icons are all precached; all data is local in v1.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Tapping a reminder focuses the open app (or opens it) on the right screen.
        importScripts: ['sw-notify.js'],
      },
    }),
  ],
  test: { environment: 'jsdom' },
})
