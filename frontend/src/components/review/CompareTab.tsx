import type { PracticeSession } from "../../types";
import { formatDurationLong } from "../../utils/format";
import { analyzeSession, compareAttempts } from "../../utils/sessionInsights";
import "./CoachingTabs.css";

interface CompareTabProps {
	current: PracticeSession;
	previous?: PracticeSession;
}

export function CompareTab({ current, previous }: CompareTabProps) {
	const currentInsight = analyzeSession(current);
	const previousInsight = previous ? analyzeSession(previous) : null;

	return (
		<div className="coaching-tab">
			<section className="coaching-panel">
				<h3>Attempt comparison</h3>
				<p>{compareAttempts(current, previous)}</p>
			</section>

			<div className="compare-grid">
				<div className="compare-card">
					<span>Current</span>
					<strong>{currentInsight.score ?? "--"}</strong>
					<small>{formatDurationLong(current.durationSeconds)}</small>
				</div>
				<div className="compare-card">
					<span>Previous</span>
					<strong>{previousInsight?.score ?? "--"}</strong>
					<small>{previous ? formatDurationLong(previous.durationSeconds) : "No earlier attempt"}</small>
				</div>
			</div>
		</div>
	);
}
