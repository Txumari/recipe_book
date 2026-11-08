import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3000',
        changeOrigin: true,
      },
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/e2e/**'],
    // HTTP integration suites share the local JSON files in ./data; running test files
    // in parallel worker processes lets their read-modify-write cycles overwrite each other.
    fileParallelism: false,
  },
});
