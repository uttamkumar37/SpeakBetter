import { createContext } from "react";
import type { PracticeSession } from "../types";

export interface SessionsContextValue {
	sessions: PracticeSession[];
	loading: boolean;
	error: string | null;
	reload: () => Promise<void>;
	addSession: (session: PracticeSession) => void;
	updateSession: (session: PracticeSession) => void;
	deleteSession: (id: string) => Promise<void>;
	deletingId: string | null;
}

export const SessionsContext = createContext<SessionsContextValue | null>(null);
