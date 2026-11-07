import { defineConfig } from 'vitest/config';

/**
 * First Vitest setup in this repo (Phase 1 of the Task redesign — see
 * docs/project/04, 2026-11-07). Scans every package/app's own `src` for
 * `*.test.ts(x)` files rather than each workspace owning a separate
 * config, since most packages here are plain TS with no bundler step of
 * their own.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['packages/*/src/**/*.test.ts', 'packages/*/src/**/*.test.tsx'],
    exclude: ['**/node_modules/**', '**/dist/**'],
  },
});
