import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globalSetup: './test/setup.js',
    globalTeardown: './test/teardown.js',
    testIgnore: ['/node_modules/'],
    coverage: {
      provider: 'v8'
    }
  }
});
