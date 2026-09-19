import { describe, expect, it } from "vitest";
import type { PracticeSession } from "../types";
import { groupByTopic } from "./groupByTopic";

function session(overrides: Partial<PracticeSession>): PracticeSession {
	return {
		id: overrides.id ?? "id",
		topic: overrides.topic ?? "topic",
		createdAt: overrides.createdAt ?? "2026-09-01T00:00:00",
		durationSeconds: overrides.durationSeconds ?? 10,
		expiresAt: overrides.expiresAt ?? "2026-10-01T00:00:00",
		videoUrl: overrides.videoUrl ?? "/video",
		wentWell: overrides.wentWell ?? null,
		needsImprovement: overrides.needsImprovement ?? null,
		fillerWordCount: overrides.fillerWordCount ?? null,
		notes: overrides.notes ?? null,
	};
}

describe("groupByTopic", () => {
	it("groups sessions with the same topic regardless of case or surrounding whitespace", () => {
		const sessions = [
			session({ id: "1", topic: "Explain REST API", createdAt: "2026-09-01T00:00:00" }),
			session({ id: "2", topic: "  explain rest api  ", createdAt: "2026-09-05T00:00:00" }),
			session({ id: "3", topic: "Daily stand-up", createdAt: "2026-09-03T00:00:00" }),
		];

		const groups = groupByTopic(sessions);

		expect(groups).toHaveLength(2);
		const restApiGroup = groups.find((g) => g.attempts.some((a) => a.id === "1"));
		expect(restApiGroup?.attempts.map((a) => a.id)).toEqual(["1", "2"]);
	});

	it("orders attempts within a group oldest first, so Attempt 1 really is the first attempt", () => {
		const sessions = [
			session({ id: "newest", topic: "t", createdAt: "2026-09-10T00:00:00" }),
			session({ id: "oldest", topic: "t", createdAt: "2026-09-01T00:00:00" }),
			session({ id: "middle", topic: "t", createdAt: "2026-09-05T00:00:00" }),
		];

		const [group] = groupByTopic(sessions);

		expect(group.attempts.map((a) => a.id)).toEqual(["oldest", "middle", "newest"]);
	});

	it("orders groups by their most recently practiced attempt, newest topic first", () => {
		const sessions = [
			session({ id: "a", topic: "Old topic", createdAt: "2026-09-01T00:00:00" }),
			session({ id: "b", topic: "Recent topic", createdAt: "2026-09-15T00:00:00" }),
		];

		const groups = groupByTopic(sessions);

		expect(groups.map((g) => g.topic)).toEqual(["Recent topic", "Old topic"]);
	});

	it("uses the most recent attempt's exact topic casing as the group's display name", () => {
		const sessions = [
			session({ id: "1", topic: "explain api", createdAt: "2026-09-01T00:00:00" }),
			session({ id: "2", topic: "Explain API", createdAt: "2026-09-05T00:00:00" }),
		];

		const [group] = groupByTopic(sessions);

		expect(group.topic).toBe("Explain API");
	});
});
