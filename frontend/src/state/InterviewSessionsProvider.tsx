import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
	deleteInterviewSession as apiDeleteInterviewSession,
	listInterviewSessions,
} from "../api/interviewApi";
import { ApiError } from "../api/practiceSessionsApi";
import type { InterviewSession } from "../types";
import { InterviewSessionsContext } from "./interviewSessionsContext";

export function InterviewSessionsProvider({ children }: { children: ReactNode }) {
	const [sessions, setSessions] = useState<InterviewSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setSessions(await listInterviewSessions());
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Failed to load interview history.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		// Fetching from the backend on mount synchronizes with external data.
		// oxlint-disable-next-line react/set-state-in-effect
		void reload();
	}, [reload]);

	const addSession = useCallback((session: InterviewSession) => {
		setSessions((prev) => [session, ...prev.filter((item) => item.id !== session.id)]);
	}, []);

	const updateSession = useCallback((updated: InterviewSession) => {
		setSessions((prev) => prev.map((session) => (session.id === updated.id ? updated : session)));
	}, []);

	const deleteSession = useCallback(async (id: string) => {
		setDeletingId(id);
		try {
			await apiDeleteInterviewSession(id);
			setSessions((prev) => prev.filter((session) => session.id !== id));
		} finally {
			setDeletingId(null);
		}
	}, []);

	const value = useMemo(
		() => ({ sessions, loading, error, reload, addSession, updateSession, deleteSession, deletingId }),
		[sessions, loading, error, reload, addSession, updateSession, deleteSession, deletingId],
	);

	return <InterviewSessionsContext.Provider value={value}>{children}</InterviewSessionsContext.Provider>;
}
