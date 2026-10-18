import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	workers: 1,
	forbidOnly: Boolean(process.env.CI),
	retries: 0,
	timeout: 45_000,
	globalTimeout: 10 * 60_000,
	expect: { timeout: 10_000 },
	reporter: [["list"], ["html", { open: "never" }]],
	use: {
		baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:5173",
		channel: process.env.PLAYWRIGHT_CHANNEL || undefined,
		permissions: ["camera", "microphone"],
		launchOptions: {
			args: ["--use-fake-device-for-media-stream", "--use-fake-ui-for-media-stream"],
		},
		trace: "retain-on-failure",
		screenshot: "only-on-failure",
	},
	projects: [
		{ name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1365, height: 900 } } },
		{ name: "mobile-chromium", use: { ...devices["Pixel 7"] } },
	],
});
