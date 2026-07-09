import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

// Alias vers la source de @comoov/shared : Vite transpile ainsi directement
// le TypeScript partagé, sans étape de build intermédiaire.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@comoov/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  server: {
    port: 5173,
  },
});
