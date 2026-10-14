/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Saat dev lokal, /api diteruskan ke gateway (atau langsung ke layanan).
const apiTarget = process.env.VITE_API_PROXY ?? 'http://localhost:8080';

// Mode "gateway lokal tanpa Docker" (scripts/local-stack.mjs): vite preview meniru routing nginx.
const marketUrl = process.env.MARKET_SERVICE_URL ?? 'http://localhost:3001';
const userUrl = process.env.USER_SERVICE_URL ?? 'http://localhost:3002';
const localGatewayProxy = {
  '/api/health/market': { target: marketUrl, changeOrigin: true, rewrite: () => '/api/health' },
  '/api/health/user': { target: userUrl, changeOrigin: true, rewrite: () => '/api/health' },
  '/api/fx': { target: marketUrl, changeOrigin: true },
  '/api/crypto': { target: marketUrl, changeOrigin: true },
  '/api/convert': { target: marketUrl, changeOrigin: true },
  '/api/market': { target: marketUrl, changeOrigin: true },
  '/api/auth': { target: userUrl, changeOrigin: true },
  '/api/watchlist': { target: userUrl, changeOrigin: true },
  '/api/alerts': { target: userUrl, changeOrigin: true },
};

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: process.env.LOCAL_GATEWAY
      ? localGatewayProxy
      : { '/api': { target: apiTarget, changeOrigin: true } },
  },
  preview: {
    port: Number(process.env.GATEWAY_PORT ?? 8080),
    strictPort: true,
    proxy: localGatewayProxy,
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'],
          chart: ['chart.js', 'react-chartjs-2'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
