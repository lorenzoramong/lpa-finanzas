import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-64.png','apple-touch-icon.png','logo-lpa.png'],
      manifest: {
        name: 'LPA Finanzas',
        short_name: 'LPA Finanzas',
        description: 'Flujo de caja de la Liga de Padel del Atlántico',
        theme_color: '#172A46',
        background_color: '#ffffff',
        display: 'browser',
        start_url: './',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      }
    })
  ]
});
