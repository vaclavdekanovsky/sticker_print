import { defineConfig, devices } from '@playwright/test';
import process from 'node:process';

const port = Number(process.env.STICKER_PORT || 5174);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
    testDir: './e2e',
    testMatch: 'outline.spec.js',
    fullyParallel: false,
    workers: 1,
    reporter: 'line',
    use: { baseURL, trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command: `npm run dev -- --host 127.0.0.1 --port ${port} --strictPort`,
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120000
    }
});