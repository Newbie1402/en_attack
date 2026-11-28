import { defineConfig, devices } from '@playwright/test';

interface RuntimeGlobals {
  readonly process?: { readonly env?: Readonly<Record<string, string | undefined>> };
}

const externalBaseUrl = (globalThis as typeof globalThis & RuntimeGlobals).process?.env
  ?.PLAYWRIGHT_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: externalBaseUrl ?? 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
  },
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 4173',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: true,
      },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
