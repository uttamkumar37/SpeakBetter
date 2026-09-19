import { useContext } from "react";
import { SessionsContext, type SessionsContextValue } from "./sessionsContext";

export function useSessions(): SessionsContextValue {
	const ctx = useContext(SessionsContext);
	if (!ctx) {
		throw new Error("useSessions must be used within a SessionsProvider");
	}
	return ctx;
}
