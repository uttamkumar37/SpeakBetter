import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, createPracticeSession, deletePracticeSession, listPracticeSessions } from "./practiceSessionsApi";

function jsonResponse(body: unknown, status = 200) {
	return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

describe("createPracticeSession", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("strips codec params from the blob's MIME type before uploading", async () => {
		const fakeSaved = {
			id: "1",
			topic: "t",
			createdAt: "now",
			durationSeconds: 5,
			expiresAt: "later",
			videoUrl: "/x",
			wentWell: null,
			needsImprovement: null,
			fillerWordCount: null,
			notes: null,
		};
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse(fakeSaved, 201));

		const blob = new Blob(["data"], { type: "video/webm;codecs=vp9,opus" });
		await createPracticeSession("Daily stand-up", 42, blob, "video/webm;codecs=vp9,opus");

		const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
		const formData = init.body as FormData;
		const uploadedVideo = formData.get("video") as File;
		expect(uploadedVideo.type).toBe("video/webm");
		expect(formData.get("topic")).toBe("Daily stand-up");
		expect(formData.get("durationSeconds")).toBe("42");
	});

	it("throws ApiError with the server's message on a non-2xx response", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
			jsonResponse({ message: "Unsupported video type: text/plain" }, 400),
		);

		await expect(
			createPracticeSession("t", 1, new Blob(["x"], { type: "video/webm" }), "video/webm"),
		).rejects.toThrow(/unsupported video type/i);
	});

	it("throws a clean ApiError when the network request fails outright", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new TypeError("Failed to fetch"));

		await expect(
			createPracticeSession("t", 1, new Blob(["x"], { type: "video/webm" }), "video/webm"),
		).rejects.toBeInstanceOf(ApiError);
		await expect(
			createPracticeSession("t", 1, new Blob(["x"], { type: "video/webm" }), "video/webm"),
		).rejects.toThrow(/could not reach the server/i);
	});
});

describe("listPracticeSessions / deletePracticeSession", () => {
	beforeEach(() => {
		vi.stubGlobal("fetch", vi.fn());
	});

	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("returns the parsed list on success", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse([{ id: "1" }]));
		const sessions = await listPracticeSessions();
		expect(sessions).toEqual([{ id: "1" }]);
	});

	it("falls back to a generic message when the error body isn't JSON", async () => {
		(fetch as ReturnType<typeof vi.fn>).mockResolvedValue(new Response("<html>oops</html>", { status: 500 }));
		await expect(deletePracticeSession("id-1")).rejects.toThrow(/request failed \(http 500\)/i);
	});
});
