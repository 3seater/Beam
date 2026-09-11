import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Run tests in jsdom environment for React component testing
    environment: 'jsdom',
    // Pick up test files from src/ and lib/ directories
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'lib/**/*.{test,spec}.{ts,tsx}',
      'components/**/*.{test,spec}.{ts,tsx}',
      'hooks/**/*.{test,spec}.{ts,tsx}',
      'app/**/*.{test,spec}.{ts,tsx}',
    ],
    // Global setup for @testing-library/react (auto-cleanup)
    globals: true,
    setupFiles: [],
  },
  resolve: {
    alias: {
      // Match the Next.js @/ path alias used throughout the project
      '@': path.resolve(__dirname, '.'),
    },
  },
});
