// vite.config.js - CON ALIAS PARA NUEVA ARQUITECTURA
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],

  // ========================================
  // ALIAS PARA IMPORTS ABSOLUTOS
  // ========================================
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@features': path.resolve(__dirname, './src/features'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@assets': path.resolve(__dirname, './src/assets'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },

  // ========================================
  // CONFIGURACIÓN DE BUILD (Producción)
  // ========================================
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendors pesados van en chunks separados para mejor caching
          'vendor-react':    ['react', 'react-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-query':    ['@tanstack/react-query'],
          'vendor-router':   ['react-router'],
          'vendor-xlsx':     ['xlsx'],
          'vendor-misc':     ['zustand', 'react-window'],
          // Librerías de gráficas y PDF (pesadas, solo para roles específicos)
          'vendor-charts':   ['recharts'],
          'vendor-pdf-lib':  ['pdf-lib'],
        },
      },
    },
  },

  // ========================================
  // CONFIGURACIÓN DE TESTS (Vitest)
  // ========================================
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.test.{js,jsx}',
        '**/__tests__/**',
      ],
    },
  },
  server: {
    allowedHosts: true,
    host: true,
    port: 5173,
  },
});
