import { useSessions } from "../state/useSessions";
import { useInterviewSessions } from "../state/useInterviewSessions";
import { formatTotalDuration } from "../utils/format";
import { groupByTopic } from "../utils/groupByTopic";
import { analyzeSession, averageScore, currentStreak, quickImprovementInsight, sessionsThisWeek } from "../utils/sessionInsights";
import { interviewLabel } from "../utils/interviewLabels";
import "./ProgressPage.css";

export function ProgressPage() {
	const { sessions, loading, error } = useSessions();
	const { sessions: interviewSessions, loading: interviewLoading, error: interviewError } = useInterviewSessions();

	if (loading) {
		return <p className="recorder-hint">Loading your progress...</p>;
	}

	if (error) {
		return <p className="recorder-error">{error}</p>;
	}

	const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
	const topicGroups = groupByTopic(sessions).sort((a, b) => b.attempts.length - a.attempts.length);
	const maxAttempts = topicGroups.length ? Math.max(...topicGroups.map((g) => g.attempts.length)) : 1;
	const score = averageScore(sessions);
	const scoredSessions = sessions.filter((session) => analyzeSession(session).score !== null);

	return (
		<div className="progress-page">
			{sessions.length === 0 ? (
				<div className="empty-history-state">
					<p>No speaking-practice data yet.</p>
					<p className="recorder-hint">Complete a practice session and your speaking progress will show up here.</p>
				</div>
			) : (
				<>
					<div className="progress-stats">
						<div className="progress-stat-card">
							<span className="progress-stat-value">{sessions.length}</span>
							<span className="progress-stat-label">Total attempts</span>
						</div>
						<div className="progress-stat-card">
							<span className="progress-stat-value">{formatTotalDuration(totalSeconds)}</span>
							<span className="progress-stat-label">Time practiced</span>
						</div>
						<div className="progress-stat-card">
							<span className="progress-stat-value">{topicGroups.length}</span>
							<span className="progress-stat-label">Topics practiced</span>
						</div>
						<div className="progress-stat-card">
							<span className="progress-stat-value">{sessionsThisWeek(sessions)}</span>
							<span className="progress-stat-label">Sessions this week</span>
						</div>
						<div className="progress-stat-card">
							<span className="progress-stat-value">{currentStreak(sessions)}</span>
							<span className="progress-stat-label">Current streak</span>
						</div>
						<div className="progress-stat-card">
							<span className="progress-stat-value">{score ?? "--"}</span>
							<span className="progress-stat-label">Average heuristic score</span>
						</div>
					</div>

					<div className="progress-insight">{quickImprovementInsight(sessions)}</div>

					<div className="progress-breakdown">
						<h2>Practice by topic</h2>
						<div className="progress-bars">
							{topicGroups.map((group) => (
								<div className="progress-bar-row" key={group.topic.toLowerCase()}>
									<span className="progress-bar-label">{group.topic}</span>
									<div className="progress-bar-track">
										<div
											className="progress-bar-fill"
											style={{ width: `${(group.attempts.length / maxAttempts) * 100}%` }}
										/>
									</div>
									<span className="progress-bar-count">
										{group.attempts.length} attempt{group.attempts.length === 1 ? "" : "s"}
									</span>
								</div>
							))}
						</div>
					</div>

					<div className="progress-breakdown">
						<h2>Recent scores</h2>
						<div className="score-list">
							{scoredSessions.slice(0, 6).map((session) => {
								const insight = analyzeSession(session);
								return (
									<div className="score-row" key={session.id}>
										<span>{session.topic}</span>
										<div className="score-track">
											<div className="score-fill" style={{ width: `${insight.score ?? 0}%` }} />
										</div>
										<strong>{insight.score ?? "--"}</strong>
									</div>
								);
							})}
							{scoredSessions.length === 0 && (
								<p className="progress-muted">Complete a recording of at least 30 seconds to start the score trend.</p>
							)}
						</div>
					</div>
				</>
			)}

			<div className="progress-breakdown">
				<h2>Interview progress</h2>
				{interviewLoading && <p className="progress-muted">Loading interview progress...</p>}
				{interviewError && !interviewLoading && <p className="recorder-error">{interviewError}</p>}
				{!interviewLoading && !interviewError && interviewSessions.length === 0 && (
					<p className="progress-muted">No interview attempts yet. Interview progress will stay separate from speaking practice.</p>
				)}
				{!interviewLoading && !interviewError && interviewSessions.length > 0 && (
					<>
						<div className="progress-stats progress-stats-compact">
							<div className="progress-stat-card">
								<span className="progress-stat-value">{interviewSessions.length}</span>
								<span className="progress-stat-label">Interview attempts</span>
							</div>
							<div className="progress-stat-card">
								<span className="progress-stat-value">{new Set(interviewSessions.map((s) => s.question.id)).size}</span>
								<span className="progress-stat-label">Questions practiced</span>
							</div>
							<div className="progress-stat-card">
								<span className="progress-stat-value">{formatTotalDuration(interviewSessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0))}</span>
								<span className="progress-stat-label">Interview time</span>
							</div>
						</div>
						<div className="score-list">
							{Object.entries(countBy(interviewSessions.map((session) => session.category))).map(([category, count]) => (
								<div className="score-row" key={category}>
									<span>{interviewLabel(category)}</span>
									<div className="score-track">
										<div className="score-fill" style={{ width: `${(count / interviewSessions.length) * 100}%` }} />
									</div>
									<strong>{count}</strong>
								</div>
							))}
						</div>
					</>
				)}
			</div>
		</div>
	);
}

function countBy(values: string[]): Record<string, number> {
	return values.reduce<Record<string, number>>((acc, value) => {
		acc[value] = (acc[value] ?? 0) + 1;
		return acc;
	}, {});
}
