import { defineConfig } from '@playwright/test';

// Desktop tests launch the packaged game (see tests/electron).
export default defineConfig({
  testDir: 'tests/electron',
  timeout: 60_000,
  reporter: process.env['CI'] ? [['github'], ['list']] : 'list',
});
