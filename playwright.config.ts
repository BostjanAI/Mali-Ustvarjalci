import { defineConfig, devices } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 30000,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 2,
  reporter: [['line'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3000', trace: 'retain-on-failure' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: '"' + process.execPath + '" scripts/start-preview.cjs',
    url: 'http://localhost:3000/sl',
    reuseExistingServer: false,
    timeout: 30000,
    env: {
      NEXT_PUBLIC_MOCK_MODE: 'true',
      AUTH_MODE: 'mock',
      NEXTAUTH_URL: 'http://localhost:3000',
      NEXTAUTH_SECRET: 'browser-tests-only-secret-over-32-characters',
    },
  },
});
