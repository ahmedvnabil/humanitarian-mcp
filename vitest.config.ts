import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // Process entry points are exercised end-to-end (stdio + --http smoke
      // runs), not unit-tested: index.ts parses argv/starts transports, and
      // http/ is the demo dashboard host.
      exclude: ['src/http/**', 'src/index.ts', 'src/viz/series.ts'],
      reporter: ['text', 'html'],
    },
  },
});
