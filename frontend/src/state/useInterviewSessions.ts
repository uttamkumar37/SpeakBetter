import { useContext } from "react";
import { InterviewSessionsContext } from "./interviewSessionsContext";

export function useInterviewSessions() {
	const context = useContext(InterviewSessionsContext);
	if (!context) {
		throw new Error("useInterviewSessions must be used inside InterviewSessionsProvider");
	}
	return context;
}
