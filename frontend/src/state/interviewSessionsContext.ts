import { createContext } from "react";
import type { InterviewSession } from "../types";

export interface InterviewSessionsContextValue {
	sessions: InterviewSession[];
	loading: boolean;
	error: string | null;
	deletingId: string | null;
	reload: () => Promise<void>;
	addSession: (session: InterviewSession) => void;
	updateSession: (session: InterviewSession) => void;
	deleteSession: (id: string) => Promise<void>;
}

export const InterviewSessionsContext = createContext<InterviewSessionsContextValue | null>(null);
