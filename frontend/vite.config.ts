import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import fs from 'node:fs';

// Resolve symlink / Windows junction drive mismatch
const realCwd = fs.realpathSync(process.cwd());
if (process.cwd() !== realCwd) {
  process.chdir(realCwd);
}

// https://vite.dev/config/
export default defineConfig({
  root: realCwd,
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(realCwd, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query: ['@tanstack/react-query', 'axios'],
          icons: ['lucide-react'],
        },
      },
    },
  },
  server: {
    port: 5180,
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
