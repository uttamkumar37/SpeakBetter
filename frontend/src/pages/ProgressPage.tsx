import { useSessions } from "../state/useSessions";
import { formatTotalDuration } from "../utils/format";
import { groupByTopic } from "../utils/groupByTopic";
import "./ProgressPage.css";

export function ProgressPage() {
	const { sessions, loading, error } = useSessions();

	if (loading) {
		return <p className="recorder-hint">Loading your progress...</p>;
	}

	if (error) {
		return <p className="recorder-error">{error}</p>;
	}

	if (sessions.length === 0) {
		return (
			<div className="empty-history-state">
				<p>No practice data yet.</p>
				<p className="recorder-hint">Complete a few practice sessions and your progress will show up here.</p>
			</div>
		);
	}

	const totalSeconds = sessions.reduce((sum, s) => sum + s.durationSeconds, 0);
	const topicGroups = groupByTopic(sessions).sort((a, b) => b.attempts.length - a.attempts.length);
	const maxAttempts = Math.max(...topicGroups.map((g) => g.attempts.length));

	return (
		<div className="progress-page">
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
			</div>

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
		</div>
	);
}
