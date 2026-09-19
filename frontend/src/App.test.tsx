import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import type { PracticeSession } from "./types";

const { listPracticeSessions, createPracticeSession } = vi.hoisted(() => ({
	listPracticeSessions: vi.fn(),
	createPracticeSession: vi.fn(),
}));

vi.mock("./api/practiceSessionsApi", () => ({
	listPracticeSessions,
	createPracticeSession,
	deletePracticeSession: vi.fn(),
	updateSessionReview: vi.fn(),
	videoUrlFor: (session: PracticeSession) => `http://localhost:8080${session.videoUrl}`,
	ApiError: class ApiError extends Error {},
}));

/** Minimal stand-in for the real MediaRecorder - just enough to drive the recorder's state machine. */
class FakeMediaRecorder {
	static isTypeSupported() {
		return true;
	}

	ondataavailable: ((event: { data: Blob }) => void) | null = null;
	onstop: (() => void) | null = null;
	state = "inactive";
	stream: unknown;
	options: unknown;

	constructor(stream: unknown, options: unknown) {
		this.stream = stream;
		this.options = options;
	}

	start() {
		this.state = "recording";
	}

	stop() {
		this.state = "inactive";
		this.ondataavailable?.({ data: new Blob(["fake-video-bytes"], { type: "video/webm" }) });
		this.onstop?.();
	}
}

function fakeStream() {
	return { getTracks: () => [{ stop: vi.fn() }] };
}

beforeEach(() => {
	window.localStorage.clear();
	// Skip the 3-2-1 countdown in tests so we don't need fake timers.
	window.localStorage.setItem("speakbetter.countdownEnabled", "false");

	vi.stubGlobal("MediaRecorder", FakeMediaRecorder);
	Object.defineProperty(navigator, "mediaDevices", {
		configurable: true,
		value: { getUserMedia: vi.fn().mockResolvedValue(fakeStream()) },
	});
	if (!("createObjectURL" in URL)) {
		Object.defineProperty(URL, "createObjectURL", { configurable: true, value: vi.fn() });
	}
	vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:mock-url");
	vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
	HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
	HTMLMediaElement.prototype.pause = vi.fn();
	listPracticeSessions.mockResolvedValue([]);
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("full practice workflow", () => {
	it("goes from Home through recording to a saved Review Workspace", async () => {
		const user = userEvent.setup();
		const savedSession: PracticeSession = {
			id: "session-1",
			topic: "Daily Stand-up",
			createdAt: "2026-09-20T01:00:00",
			durationSeconds: 5,
			expiresAt: "2026-10-20T01:00:00",
			videoUrl: "/api/practice-sessions/session-1/video",
			wentWell: null,
			needsImprovement: null,
			fillerWordCount: null,
			notes: null,
		};
		createPracticeSession.mockResolvedValue(savedSession);

		render(<App />);

		// Home
		await screen.findByText(/speak with more clarity and confidence/i);
		await user.click(screen.getByRole("button", { name: "Start New Practice" }));

		// Topic selection
		await screen.findByText(/what would you like to practice/i);
		await user.click(screen.getByRole("button", { name: "Daily Stand-up" }));

		// Record stage: camera auto-requested, guide shown, then ready to record
		await waitFor(() => expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ video: true, audio: true }));
		await screen.findByText("How to approach this topic");
		await screen.findByText("Ready when you are.");

		await user.click(screen.getByRole("button", { name: "Start Recording" }));
		await screen.findByRole("button", { name: "Stop Recording" });

		await user.click(screen.getByRole("button", { name: "Stop Recording" }));
		await screen.findByText(/nice.*review your attempt/i);

		await user.click(screen.getByRole("button", { name: "Save & Review" }));

		// Review Workspace
		await screen.findByRole("heading", { name: "Daily Stand-up" });
		expect(screen.getByText(/attempt 1 of 1/i)).toBeInTheDocument();
		expect(createPracticeSession).toHaveBeenCalledWith("Daily Stand-up", 0, expect.any(Blob), "video/webm;codecs=vp9,opus");

		// Overview tab is active by default
		expect(screen.getByText("Your speaking snapshot")).toBeInTheDocument();

		// Switch to the Original tab and confirm the video is present
		await user.click(screen.getByRole("tab", { name: "Original" }));
		expect(document.querySelector(".media-tab-video")).toBeTruthy();

		// Done returns to Home
		await user.click(screen.getByRole("button", { name: "Done" }));
		await screen.findByText(/speak with more clarity and confidence/i);
	});

	it("shows a clean error when the camera/microphone is unavailable", async () => {
		const user = userEvent.setup();
		(navigator.mediaDevices.getUserMedia as ReturnType<typeof vi.fn>).mockRejectedValue(
			new DOMException("denied", "NotAllowedError"),
		);

		render(<App />);
		await screen.findByText(/speak with more clarity and confidence/i);
		await user.click(screen.getByRole("button", { name: "Interview Answer" }));

		expect(await screen.findByText(/camera and microphone access was denied/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /try again/i })).toBeInTheDocument();
	});
});
