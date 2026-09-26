import type { PracticeSession } from "../../types";
import { formatDurationLong } from "../../utils/format";
import { analyzeSession } from "../../utils/sessionInsights";
import { SessionReview } from "../SessionReview";
import "./OverviewTab.css";

interface OverviewTabProps {
	session: PracticeSession;
	onReviewSaved: (updated: PracticeSession) => void;
}

export function OverviewTab({ session, onReviewSaved }: OverviewTabProps) {
	const insight = analyzeSession(session);

	return (
		<div className="overview-tab">
			<div className="snapshot-card">
				<p className="snapshot-eyebrow">Your speaking snapshot</p>
				<div className="snapshot-grid">
					<div className="snapshot-stat">
						<span className="snapshot-stat-value">{insight.score ?? "--"}</span>
						<span className="snapshot-stat-label">Heuristic score</span>
					</div>
					<div className="snapshot-stat">
						<span className="snapshot-stat-value">{formatDurationLong(session.durationSeconds)}</span>
						<span className="snapshot-stat-label">Duration</span>
					</div>
					<div className="snapshot-stat">
						<span className="snapshot-stat-value">{insight.strongestArea}</span>
						<span className="snapshot-stat-label">Strongest area</span>
					</div>
				</div>
				<p className="snapshot-score-status">{insight.scoreStatus}</p>
				<p className="snapshot-note">{insight.durationFeedback}</p>
				<p className="snapshot-note">{insight.fillerFeedback}</p>
				<p className="snapshot-methodology">{insight.methodology}</p>
			</div>

			<div className="self-review-card">
				<p className="self-review-heading">Self-review</p>
				<SessionReview session={session} onSaved={onReviewSaved} />
			</div>
		</div>
	);
}
