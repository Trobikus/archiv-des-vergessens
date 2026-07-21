/// <reference types="vitest" />
import { defineConfig } from 'vite'

/**
 * Vite Configuration File
 * https://vite.dev/config/
 */
export default defineConfig({
  // Setzt den korrekten Pfad für das GitHub-Pages-Unterverzeichnis oder relativ für Tauri
  base: process.env.TAURI_ENV_PLATFORM ? '' : '/archiv-des-vergessens/',

  // Server-Konfiguration für die lokale Entwicklung
  server: {
    port: 3000,
    open: true,
    host: true
  },

  // Build-Konfiguration für die Produktion
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    target: 'es2022',
    minify: 'esbuild'
  },

  // Vitest Test-Konfiguration
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./js/_tests_/setup.js'],
    include: ['js/_tests_/**/*.test.js']
  }
})