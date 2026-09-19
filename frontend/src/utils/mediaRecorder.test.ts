import { afterEach, describe, expect, it, vi } from "vitest";
import { baseMimeType, describeMediaError, formatDuration, isMediaRecorderSupported, pickSupportedMimeType } from "./mediaRecorder";

describe("baseMimeType", () => {
	it("strips codec parameters", () => {
		expect(baseMimeType("video/webm;codecs=vp9,opus")).toBe("video/webm");
	});

	it("leaves a bare MIME type unchanged", () => {
		expect(baseMimeType("video/mp4")).toBe("video/mp4");
	});
});

describe("formatDuration", () => {
	it("pads minutes and seconds to two digits", () => {
		expect(formatDuration(5)).toBe("00:05");
		expect(formatDuration(65)).toBe("01:05");
		expect(formatDuration(3600)).toBe("60:00");
	});
});

describe("describeMediaError", () => {
	it("gives a friendly message for permission denial", () => {
		const error = new DOMException("denied", "NotAllowedError");
		expect(describeMediaError(error)).toMatch(/denied/i);
	});

	it("gives a friendly message when no device is found", () => {
		const error = new DOMException("none", "NotFoundError");
		expect(describeMediaError(error)).toMatch(/no camera or microphone/i);
	});

	it("gives a friendly message when the device is already in use", () => {
		const error = new DOMException("busy", "NotReadableError");
		expect(describeMediaError(error)).toMatch(/already in use/i);
	});

	it("falls back to a generic message for a plain Error", () => {
		expect(describeMediaError(new Error("boom"))).toMatch(/boom/);
	});

	it("never throws for a non-Error value", () => {
		expect(() => describeMediaError("not an error")).not.toThrow();
		expect(describeMediaError("not an error")).toMatch(/unable to access/i);
	});
});

describe("isMediaRecorderSupported / pickSupportedMimeType", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("reports unsupported and returns null when MediaRecorder does not exist", () => {
		vi.stubGlobal("MediaRecorder", undefined);
		expect(isMediaRecorderSupported()).toBe(false);
		expect(pickSupportedMimeType()).toBeNull();
	});

	it("returns the first MIME type the browser reports as supported", () => {
		vi.stubGlobal("MediaRecorder", {
			isTypeSupported: (type: string) => type === "video/webm",
		});
		expect(pickSupportedMimeType()).toBe("video/webm");
	});

	it("returns null when none of the candidate types are supported", () => {
		vi.stubGlobal("MediaRecorder", { isTypeSupported: () => false });
		expect(pickSupportedMimeType()).toBeNull();
	});
});
