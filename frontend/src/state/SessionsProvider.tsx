import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
	ApiError,
	deletePracticeSession as apiDeletePracticeSession,
	listPracticeSessions,
} from "../api/practiceSessionsApi";
import type { PracticeSession } from "../types";
import { SessionsContext } from "./sessionsContext";

export function SessionsProvider({ children }: { children: ReactNode }) {
	const [sessions, setSessions] = useState<PracticeSession[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const reload = useCallback(async () => {
		setLoading(true);
		setError(null);
		try {
			setSessions(await listPracticeSessions());
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Failed to load recording history.");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		// Fetching from the backend on mount - this is exactly what effects are for
		// (synchronizing with an external system), not derivable during render.
		// oxlint-disable-next-line react/set-state-in-effect
		reload();
	}, [reload]);

	const addSession = useCallback((session: PracticeSession) => {
		setSessions((prev) => [session, ...prev]);
	}, []);

	const updateSession = useCallback((updated: PracticeSession) => {
		setSessions((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
	}, []);

	const deleteSession = useCallback(async (id: string) => {
		setDeletingId(id);
		try {
			await apiDeletePracticeSession(id);
			setSessions((prev) => prev.filter((s) => s.id !== id));
		} finally {
			setDeletingId(null);
		}
	}, []);

	const value = useMemo(
		() => ({ sessions, loading, error, reload, addSession, updateSession, deleteSession, deletingId }),
		[sessions, loading, error, reload, addSession, updateSession, deleteSession, deletingId],
	);

	return <SessionsContext.Provider value={value}>{children}</SessionsContext.Provider>;
}
