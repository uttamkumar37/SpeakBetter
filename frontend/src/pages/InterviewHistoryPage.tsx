import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/practiceSessionsApi";
import { useInterviewSessions } from "../state/useInterviewSessions";
import type { InterviewCategory, InterviewRole, InterviewSession } from "../types";
import { daysRemaining, formatDate, formatDurationLong } from "../utils/format";
import { INTERVIEW_CATEGORIES, INTERVIEW_ROLES, interviewLabel } from "../utils/interviewLabels";
import "./InterviewPortal.css";

export function InterviewHistoryPage() {
	const navigate = useNavigate();
	const { sessions, loading, error, reload, deleteSession, deletingId } = useInterviewSessions();
	const [roleFilter, setRoleFilter] = useState<InterviewRole | "">("");
	const [categoryFilter, setCategoryFilter] = useState<InterviewCategory | "">("");

	const filtered = sessions.filter((session) =>
		(!roleFilter || session.role === roleFilter) && (!categoryFilter || session.category === categoryFilter),
	);
	const grouped = useMemo(() => groupByQuestion(filtered), [filtered]);

	async function handleDelete(session: InterviewSession) {
		if (!window.confirm(`Delete this interview attempt for "${session.question.questionText}"? This cannot be undone.`)) return;
		try {
			await deleteSession(session.id);
		} catch (err) {
			window.alert(err instanceof ApiError ? err.message : "Failed to delete the interview attempt.");
		}
	}

	return (
		<div className="interview-page">
			<section className="interview-hero">
				<div>
					<p className="interview-eyebrow">Interview History</p>
					<h1>Review saved interview attempts.</h1>
					<p>Attempts are grouped by real question history so repeat practice is easy to compare.</p>
				</div>
				<button type="button" className="btn btn-primary" onClick={() => navigate("/interview")}>
					New Interview Practice
				</button>
			</section>

			<section className="interview-filters" aria-label="Interview history filters">
				<label>
					Role
					<select value={roleFilter} onChange={(event) => setRoleFilter(event.target.value as InterviewRole | "")}>
						<option value="">All roles</option>
						{INTERVIEW_ROLES.map((role) => <option key={role} value={role}>{interviewLabel(role)}</option>)}
					</select>
				</label>
				<label>
					Category
					<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value as InterviewCategory | "")}>
						<option value="">All categories</option>
						{INTERVIEW_CATEGORIES.map((category) => <option key={category} value={category}>{interviewLabel(category)}</option>)}
					</select>
				</label>
			</section>

			{loading && <p className="recorder-hint">Loading interview history...</p>}
			{error && !loading && (
				<div className="recorder-error">
					{error}
					<button type="button" className="btn btn-secondary retry-btn" onClick={reload}>Retry</button>
				</div>
			)}
			{!loading && !error && filtered.length === 0 && (
				<div className="empty-history-state">
					<p>No interview attempts yet.</p>
					<p className="recorder-hint">Record an interview answer and it will appear here.</p>
				</div>
			)}
			{!loading && !error && filtered.length > 0 && (
				<div className="topic-group-list">
					{grouped.map((group) => (
						<section className="topic-group" key={group.questionId}>
							<h2 className="topic-group-heading">
								{group.questionText}
								{group.attempts.length > 1 && <span className="attempt-count"> &bull; {group.attempts.length} attempts</span>}
							</h2>
							<div className="recording-list">
								{group.attempts.map((session, index) => (
									<div className="recording-card" key={session.id}>
										<div className="recording-card-info">
											<p className="recording-card-attempt">Attempt {index + 1} of {group.attempts.length}</p>
											<p className="recording-card-meta">
												{interviewLabel(session.role)} &bull; {interviewLabel(session.level)} &bull; {interviewLabel(session.category)}
											</p>
											<p className="recording-card-meta">
												{formatDate(session.createdAt)}
												{session.durationSeconds !== null && ` • ${formatDurationLong(session.durationSeconds)}`}
											</p>
											<p className={`recording-card-expiry${daysRemaining(session.expiresAt) <= 5 ? " recording-card-expiry-soon" : ""}`}>
												Expires in {daysRemaining(session.expiresAt)} day{daysRemaining(session.expiresAt) === 1 ? "" : "s"}
											</p>
										</div>
										<div className="recording-card-actions">
											<button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/interview/review/${session.id}`)}>
												Review
											</button>
											<button type="button" className="btn btn-secondary btn-sm" onClick={() => navigate("/interview")}>
												Practice Again
											</button>
											<button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(session)} disabled={deletingId === session.id}>
												{deletingId === session.id ? "Deleting..." : "Delete"}
											</button>
										</div>
									</div>
								))}
							</div>
						</section>
					))}
				</div>
			)}
		</div>
	);
}

function groupByQuestion(sessions: InterviewSession[]) {
	const groups = new Map<string, InterviewSession[]>();
	for (const session of sessions) {
		const key = session.question.id;
		groups.set(key, [...(groups.get(key) ?? []), session]);
	}
	return [...groups.entries()].map(([questionId, attempts]) => ({
		questionId,
		questionText: attempts[0].question.questionText,
		attempts: [...attempts].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
	}));
}
