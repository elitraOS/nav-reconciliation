import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globalSetup: ['./apps/api/src/__tests__/integration/setup/anvil.setup.ts'],
    include: ['apps/api/src/__tests__/integration/**/*.test.ts'],
    // Allow time for Anvil startup and on-chain fork reads
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
