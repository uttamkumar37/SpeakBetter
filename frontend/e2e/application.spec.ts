import AxeBuilder from "@axe-core/playwright";
import { expect, test as base, type Page, type TestInfo } from "@playwright/test";
import { randomUUID } from "node:crypto";

// Only paths created by the current test are eligible for API cleanup.
const test = base.extend<{ ownedSessions: string[] }>({
	ownedSessions: async ({ request }, provide) => {
		const paths: string[] = [];
		try {
			await provide(paths);
		} finally {
			for (const path of paths) {
				const response = await request.delete(path);
				expect([204, 404], `cleanup ${path}`).toContain(response.status());
			}
		}
	},
});

test.beforeEach(async ({ page, request }) => {
	expect((await request.get("/api/v2/health/ready")).status()).toBe(200);
	await page.addInitScript(() => localStorage.setItem("speakbetter.countdownEnabled", "false"));
});

async function prepare(page: Page, topic: string) {
	await page.goto("/#/practice");
	await page.getByRole("button", { name: "Browse practice types" }).click();
	await page.getByPlaceholder("Enter your own topic...").fill(topic);
	await page.getByRole("button", { name: "Continue", exact: true }).click();
	await expect(page.getByRole("heading", { name: topic, exact: true })).toBeVisible();
	await page.getByRole("button", { name: "Start Recording", exact: true }).click();
	await expect(page.getByText("Ready when you are.", { exact: true })).toBeVisible();
}

async function record(page: Page) {
	await page.getByRole("button", { name: "Start Recording", exact: true }).click();
	await expect(page.locator(".rec-indicator")).toHaveText(/REC 00:0[1-9]/);
	await page.getByRole("button", { name: "Stop Recording", exact: true }).click();
	await expect(page.getByRole("button", { name: "Save & Review", exact: true })).toBeVisible();
}

async function savePractice(page: Page, owned: string[]) {
	const saved = page.waitForResponse(response =>
		new URL(response.url()).pathname === "/api/practice-sessions" && response.request().method() === "POST",
	);
	await page.getByRole("button", { name: "Save & Review", exact: true }).click();
	const response = await saved;
	expect(response.status()).toBe(201);
	const session = await response.json();
	owned.push(`/api/practice-sessions/${session.id}`);
	await expect(page.getByText("Your speaking snapshot", { exact: true })).toBeVisible();
	return session;
}

async function capture(page: Page, info: TestInfo, name: string) {
	await page.screenshot({ path: info.outputPath(name), fullPage: true });
}

test("navigation and responsive pages render without browser errors", async ({ page }, info) => {
	const errors: string[] = [];
	page.on("pageerror", error => errors.push(error.message));
	for (const path of ["practice", "interview", "history", "progress", "interview/history"]) {
		await page.goto(`/#/${path}`);
		await page.waitForLoadState("networkidle");
		await expect(page.getByRole("navigation")).toBeVisible();
		expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `overflow on ${path}`).toBe(true);
	}
	await page.getByRole("navigation").getByRole("link", { name: "Practice", exact: true }).click();
	await expect(page.getByRole("button", { name: "Browse practice types" })).toBeVisible();
	await capture(page, info, "dashboard.png");
	expect(errors).toEqual([]);
});

test("real browser recording, review, media tabs and persisted notes", async ({ page, request, ownedSessions }, info) => {
	const topic = `QA recording ${randomUUID().slice(0, 8)}`;
	await prepare(page, topic);
	await record(page);
	const session = await savePractice(page, ownedSessions);
	expect(session.durationSeconds).toBeGreaterThanOrEqual(1);
	await page.getByLabel("What went well", { exact: true }).fill("Generated QA recording saved and decoded.");
	await page.getByLabel("What needs improvement", { exact: true }).fill("QA fixture, not a language assessment.");
	await page.getByLabel("Filler word count", { exact: true }).fill("0");
	await page.getByLabel("Notes", { exact: true }).fill("Disposable automated browser test.");
	await page.getByRole("button", { name: "Save Review", exact: true }).click();
	await expect(page.getByText("Review saved.", { exact: true })).toBeVisible();
	const stored = await (await request.get(`/api/practice-sessions/${session.id}`)).json();
	expect(stored.notes).toBe("Disposable automated browser test.");
	await page.getByRole("tab", { name: "Original", exact: true }).click();
	await expect.poll(() => page.locator("video.media-tab-video").evaluate(video => (video as HTMLVideoElement).readyState)).toBeGreaterThanOrEqual(2);
	await capture(page, info, "recording-review.png");
	await page.getByRole("tab", { name: "Audio Only", exact: true }).click();
	await expect.poll(() => page.locator("audio").evaluate(audio => (audio as HTMLAudioElement).readyState)).toBeGreaterThanOrEqual(2);
	await page.getByRole("tab", { name: "Video Only", exact: true }).click();
	expect(await page.locator("video.media-tab-video").evaluate(video => (video as HTMLVideoElement).muted)).toBe(true);
	await page.getByRole("tab", { name: "Transcript", exact: true }).click();
	await expect(page.getByText(/Automatic speech-to-text is not connected/)).toBeVisible();
	await page.goto("/#/history");
	await page.reload();
	const group = page.locator(".topic-group").filter({ has: page.getByRole("heading", { name: topic, exact: true }) });
	await group.getByRole("button", { name: "Review", exact: true }).click();
	await expect(page.getByLabel("Notes", { exact: true })).toHaveValue("Disposable automated browser test.");
	await page.getByRole("button", { name: "Done", exact: true }).click();
	page.once("dialog", dialog => dialog.dismiss());
	await group.getByRole("button", { name: "Delete", exact: true }).click();
	expect((await request.get(`/api/practice-sessions/${session.id}`)).status()).toBe(200);
});

test("retake and linked topic comparison keep both saved attempts", async ({ page, ownedSessions }) => {
	const topic = `QA comparison ${randomUUID().slice(0, 8)}`;
	await prepare(page, topic);
	await record(page);
	await page.getByRole("button", { name: "Retake", exact: true }).click();
	await expect(page.getByText("Ready when you are.", { exact: true })).toBeVisible();
	await record(page);
	const first = await savePractice(page, ownedSessions);
	await page.getByRole("button", { name: "Record Again", exact: true }).click();
	await page.getByRole("button", { name: "Start Recording", exact: true }).click();
	await expect(page.getByText("Ready when you are.", { exact: true })).toBeVisible();
	await record(page);
	const second = await savePractice(page, ownedSessions);
	expect(second.id).not.toBe(first.id);
	await expect(page.getByText(/Attempt 2 of 2/)).toBeVisible();
	await page.getByRole("tab", { name: "Compare", exact: true }).click();
	await expect(page.getByText("Previous", { exact: true })).toBeVisible();
	await expect(page.getByText("No earlier attempt", { exact: true })).toHaveCount(0);
	await expect(page.getByText(/A reliable comparison needs two attempts/)).toBeVisible();
});

test("failed practice upload can be retried without losing its preview", async ({ page, ownedSessions }) => {
	await prepare(page, `QA retry ${randomUUID().slice(0, 8)}`);
	await record(page);
	await page.route("**/api/practice-sessions", route => route.request().method() === "POST"
		? route.fulfill({ status: 503, json: { message: "QA simulated temporary upload failure" } }) : route.continue());
	await page.getByRole("button", { name: "Save & Review", exact: true }).click();
	await expect(page.getByText("QA simulated temporary upload failure", { exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Retake", exact: true })).toBeVisible();
	await page.unroute("**/api/practice-sessions");
	await savePractice(page, ownedSessions);
});

test("interview filters include honest empty states", async ({ page }, info) => {
	await page.goto("/#/interview");
	await page.getByRole("combobox", { name: /^Level/ }).selectOption("JUNIOR");
	await expect(page.getByText("No questions match these filters.", { exact: true })).toBeVisible();
	await page.getByRole("combobox", { name: /^Level/ }).selectOption("MID");
	await page.getByRole("combobox", { name: /^Category/ }).selectOption("TECHNICAL");
	await expect(page.getByRole("heading", { name: "How would you design an API endpoint for uploading and streaming user recordings?", exact: true })).toBeVisible();
	await expect(page.getByRole("button", { name: "Start Recording", exact: true })).toBeEnabled();
	await capture(page, info, "interview.png");
});

test("interview recording and manual review persist through reload", async ({ page, ownedSessions }) => {
	await page.goto("/#/interview");
	await expect(page.getByRole("button", { name: "Start Recording", exact: true })).toBeEnabled();
	await page.getByRole("button", { name: "Start Recording", exact: true }).click();
	await expect(page.getByText("Ready when you are.", { exact: true })).toBeVisible();
	await record(page);
	const created = page.waitForResponse(response => new URL(response.url()).pathname === "/api/interview-sessions" && response.request().method() === "POST");
	await page.getByRole("button", { name: "Save & Review", exact: true }).click();
	const response = await created;
	expect(response.status()).toBe(201);
	const session = await response.json();
	ownedSessions.push(`/api/interview-sessions/${session.id}`);
	await page.getByRole("button", { name: "Review Answer", exact: true }).click();
	await expect(page.getByText("Interview Review", { exact: true })).toBeVisible();
	await page.getByRole("tab", { name: "Transcript", exact: true }).click();
	await expect(page.getByRole("heading", { name: "Transcript required for pacing and filler-word analysis.", exact: true })).toBeVisible();
	await page.getByRole("tab", { name: "Self-review", exact: true }).click();
	await page.getByLabel("Notes", { exact: true }).fill("QA interview review persisted.");
	await page.getByRole("button", { name: "Save Review", exact: true }).click();
	await expect(page.getByText("Review saved.", { exact: true })).toBeVisible();
	await page.reload();
	await page.getByRole("tab", { name: "Self-review", exact: true }).click();
	await expect(page.getByLabel("Notes", { exact: true })).toHaveValue("QA interview review persisted.");
});

test("history network failure recovers on retry", async ({ page }) => {
	await page.route("**/api/practice-sessions", route => route.abort("failed"));
	await page.goto("/#/history");
	await expect(page.locator(".recorder-error")).toContainText("Could not reach the server. Make sure the backend is running.");
	await page.unroute("**/api/practice-sessions");
	await page.getByRole("button", { name: "Retry", exact: true }).click();
	await expect(page.locator(".recorder-error")).toHaveCount(0);
});

test("a missing interview review gives a useful navigation path", async ({ page }) => {
	await page.goto(`/#/interview/review/${randomUUID()}`);
	await expect(page.getByText("Session not found", { exact: false })).toBeVisible();
	await page.getByRole("button", { name: "History", exact: true }).click();
	await expect(page).toHaveURL(/#\/interview\/history$/);
});

test("canceling countdown and recording does not reopen a discarded preview", async ({ page }) => {
	await prepare(page, `QA cancel ${randomUUID().slice(0, 8)}`);
	await page.getByLabel("3-2-1 countdown").check();
	await page.getByRole("button", { name: "Start Recording", exact: true }).click();
	await expect(page.locator(".recording-countdown-number")).toBeVisible();
	await page.getByRole("button", { name: /Back/ }).click();
	await page.getByRole("button", { name: "Start Recording", exact: true }).click();
	await expect(page.getByText("Ready when you are.", { exact: true })).toBeVisible();
	await page.getByLabel("3-2-1 countdown").uncheck();
	await page.getByRole("button", { name: "Start Recording", exact: true }).click();
	await expect(page.getByRole("button", { name: "Stop Recording", exact: true })).toBeVisible();
	await page.getByRole("button", { name: /Back/ }).click();
	await page.getByRole("button", { name: "Start Recording", exact: true }).click();
	await expect(page.getByText("Ready when you are.", { exact: true })).toBeVisible();
});

test("main pages meet automated WCAG checks", async ({ page }) => {
	const violations: object[] = [];
	for (const path of ["practice", "history", "progress", "interview", "interview/history"]) {
		await page.goto(`/#/${path}`);
		await page.waitForLoadState("networkidle");
		const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
		violations.push(...result.violations.map(issue => ({ page: path, id: issue.id, impact: issue.impact, elements: issue.nodes.map(node => ({ target: node.target, reason: node.failureSummary })) })));
	}
	expect(violations).toEqual([]);
});
