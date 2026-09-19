import type { PracticeSession } from "../types";

export interface TopicGroup {
	topic: string;
	/** Oldest first, so "Attempt 1" is really the first attempt - lets you watch progress across attempts. */
	attempts: PracticeSession[];
}

/** Groups sessions by topic (case/whitespace-insensitive) so repeat attempts at the same topic sit together. */
export function groupByTopic(sessions: PracticeSession[]): TopicGroup[] {
	const groupsByKey = new Map<string, PracticeSession[]>();
	for (const session of sessions) {
		const key = session.topic.trim().toLowerCase();
		const existing = groupsByKey.get(key);
		if (existing) {
			existing.push(session);
		} else {
			groupsByKey.set(key, [session]);
		}
	}

	const groups: TopicGroup[] = Array.from(groupsByKey.values()).map((sessionsForTopic) => {
		const attempts = [...sessionsForTopic].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
		return { topic: attempts[attempts.length - 1].topic, attempts };
	});

	// Most recently practiced topic first.
	groups.sort((a, b) => {
		const aLatest = a.attempts[a.attempts.length - 1].createdAt;
		const bLatest = b.attempts[b.attempts.length - 1].createdAt;
		return bLatest.localeCompare(aLatest);
	});

	return groups;
}
