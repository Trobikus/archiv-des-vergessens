import { defineConfig } from 'vite'
import { readFileSync } from 'fs'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'));

/**
 * Vite Configuration File
 * https://vite.dev/config/
 */
export default defineConfig({
  define: {
    '__APP_VERSION__': JSON.stringify(pkg.version)
  },
  // Setzt den korrekten Pfad für das GitHub-Pages-Unterverzeichnis oder relativ für Tauri
  base: process.env.TAURI_ENV_PLATFORM ? '' : '/archiv-des-vergessens/',

  // Server-Konfiguration für die lokale Entwicklung
  server: {
    port: 3000,
    open: 'chrome',
    host: true
  },

  // Build-Konfiguration für die Produktion
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    target: 'es2022',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        main: 'index.html',
        launcher: 'launcher.html'
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('preact') || id.includes('htm')) {
              return 'vendor-preact';
            }
            if (id.includes('@tauri-apps')) {
              return 'vendor-tauri';
            }
            return 'vendor';
          }
          if (id.includes('js/data/')) {
            return 'game-data';
          }
        }
      }
    }
  },

  // Vitest Test-Konfiguration
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./js/_tests_/setup.js'],
    include: ['js/_tests_/**/*.test.js']
  }
})