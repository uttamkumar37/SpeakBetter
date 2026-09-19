import type { PracticeSession } from "../../types";
import { formatDurationLong } from "../../utils/format";
import { SessionReview } from "../SessionReview";
import "./OverviewTab.css";

interface OverviewTabProps {
	session: PracticeSession;
	onReviewSaved: (updated: PracticeSession) => void;
}

export function OverviewTab({ session, onReviewSaved }: OverviewTabProps) {
	return (
		<div className="overview-tab">
			<div className="snapshot-card">
				<p className="snapshot-eyebrow">Your speaking snapshot</p>
				<div className="snapshot-stat">
					<span className="snapshot-stat-value">{formatDurationLong(session.durationSeconds)}</span>
					<span className="snapshot-stat-label">Duration</span>
				</div>
				<p className="snapshot-note">
					Automatic speech metrics (pace, filler detection, pauses) aren't enabled yet - the filler word count
					below is whatever you enter yourself.
				</p>
			</div>

			<div className="self-review-card">
				<p className="self-review-heading">Self-review</p>
				<SessionReview session={session} onSaved={onReviewSaved} />
			</div>
		</div>
	);
}
