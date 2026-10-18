import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VideoRecorder } from "./VideoRecorder";

const recorders: TestRecorder[] = [];

class TestRecorder {
	static isTypeSupported() { return true; }
	state = "inactive";
	ondataavailable: ((event: { data: Blob }) => void) | null = null;
	onstop: (() => void) | null = null;
	constructor() { recorders.push(this); }
	start() { this.state = "recording"; }
	stop = vi.fn(() => { this.state = "inactive"; this.onstop?.(); });
}

function stream() {
	const tracks = [{ readyState: "live", stop: vi.fn() }, { readyState: "live", stop: vi.fn() }];
	return { getTracks: () => tracks, getVideoTracks: () => [tracks[0]], getAudioTracks: () => [tracks[1]] };
}

beforeEach(() => {
	window.localStorage.setItem("speakbetter.countdownEnabled", "false");
	recorders.length = 0;
	vi.stubGlobal("MediaRecorder", TestRecorder);
	Object.defineProperty(navigator, "mediaDevices", {
		configurable: true,
		value: { getUserMedia: vi.fn(), enumerateDevices: vi.fn().mockResolvedValue([]), addEventListener: vi.fn(), removeEventListener: vi.fn() },
	});
});

afterEach(() => {
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
});

describe("recorder cancellation", () => {
	it("releases a stream granted after the recorder was unmounted", async () => {
		const media = stream();
		let grant: (value: MediaStream) => void = () => {};
		vi.mocked(navigator.mediaDevices.getUserMedia).mockReturnValue(new Promise<MediaStream>(resolve => { grant = resolve; }));
		const view = render(<VideoRecorder topic="QA cancellation" onRecordingComplete={vi.fn()} />);
		view.unmount();
		await act(async () => { grant(media as unknown as MediaStream); });
		for (const track of media.getTracks()) expect(track.stop).toHaveBeenCalledOnce();
	});

	it("stops the recorder and ignores a late stop event after cancellation", async () => {
		const media = stream();
		vi.mocked(navigator.mediaDevices.getUserMedia).mockResolvedValue(media as unknown as MediaStream);
		const completed = vi.fn();
		const view = render(<VideoRecorder topic="QA cancellation" onRecordingComplete={completed} />);
		await screen.findByText("Ready when you are.");
		await userEvent.click(screen.getByRole("button", { name: "Start Recording" }));
		expect(recorders).toHaveLength(1);
		const recorder = recorders[0];
		const pendingStop = recorder.onstop;
		view.unmount();
		await act(async () => { pendingStop?.(); });
		expect(recorder.stop).toHaveBeenCalledOnce();
		expect(completed).not.toHaveBeenCalled();
		for (const track of media.getTracks()) expect(track.stop).toHaveBeenCalled();
	});
});
