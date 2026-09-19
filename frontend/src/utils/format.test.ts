import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { daysRemaining, formatDate, formatDurationLong } from "./format";

describe("formatDate", () => {
	it("formats an ISO datetime as 'DD Mon YYYY'", () => {
		expect(formatDate("2026-09-20T01:48:04.102301")).toBe("20 Sept 2026");
	});
});

describe("formatDurationLong", () => {
	it("shows only seconds when under a minute", () => {
		expect(formatDurationLong(45)).toBe("45s");
	});

	it("shows minutes and seconds once over a minute", () => {
		expect(formatDurationLong(134)).toBe("2m 14s");
	});

	it("handles exactly zero seconds", () => {
		expect(formatDurationLong(0)).toBe("0s");
	});
});

describe("daysRemaining", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-09-20T00:00:00"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("computes whole days remaining, rounded up", () => {
		expect(daysRemaining("2026-10-20T00:00:00")).toBe(30);
	});

	it("never goes below zero for an already-passed expiry", () => {
		expect(daysRemaining("2026-09-01T00:00:00")).toBe(0);
	});
});
