import { defineConfig, devices } from '@playwright/test';

// See https://playwright.dev/docs/test-configuration
export default defineConfig({
  timeout: 90_000,
  expect: { timeout: 10_000 },
  testDir: './src/tests',
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'html' : 'list',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    // Dismiss the Ask Ontos copilot side-panel that opens by default for
    // first-time visitors. Without this, the z-50 fixed panel intercepts
    // pointer events on the main content area and causes click timeouts.
    contextOptions: {
      storageState: {
        cookies: [],
        origins: [{
          origin: process.env.BASE_URL || 'http://localhost:3000',
          localStorage: [{ name: 'copilot-sidebar-visited', value: 'true' }],
        }],
      },
    },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'yarn dev:frontend --port 3000',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});


