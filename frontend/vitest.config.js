import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    // Use happy-dom for DOM simulation (lighter than jsdom)
    environment: 'happy-dom',

    // Test file patterns
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],

    // Global test utilities (optional - makes describe, it, expect available without imports)
    globals: true,

    // Coverage settings
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/**/*.test.js',
        'src/**/*.spec.js',
        'dist/',
      ],
    },

    // Mock setup
    setupFiles: ['./src/tests/setup.ts'],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@managers': path.resolve(__dirname, './src/managers'),
      '@data': path.resolve(__dirname, './src/data'),
    },
  },
});
