import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './e2e',
    fullyParallel: false, // Sequential for docs to ensure order or irrelevant? Sequential is safer for avoiding file conflicts if we used same files, but we are just reading. Parallel is fine, but for a single docs script, it doesn't matter.
    forbidOnly: !!process.env.CI,
    retries: 0,
    workers: 1, // Run sequentially to avoid resource contention during screenshots
    reporter: 'line',
    use: {
        trace: 'on-first-retry',
        baseURL: 'http://localhost:5173',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:5173',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
});
