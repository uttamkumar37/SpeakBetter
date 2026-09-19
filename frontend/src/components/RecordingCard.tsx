import type { PracticeSession } from "../types";
import { daysRemaining, formatDate, formatDurationLong } from "../utils/format";
import "./RecordingCard.css";

interface RecordingCardProps {
	session: PracticeSession;
	/** e.g. "Attempt 2 of 3" - set only when this topic has more than one attempt. */
	attemptLabel?: string;
	onReview: (session: PracticeSession) => void;
	onPracticeAgain: (topic: string) => void;
	onDelete: (id: string) => void;
	deleting?: boolean;
}

export function RecordingCard({
	session,
	attemptLabel,
	onReview,
	onPracticeAgain,
	onDelete,
	deleting,
}: RecordingCardProps) {
	const remaining = daysRemaining(session.expiresAt);

	function handleDelete() {
		if (window.confirm(`Delete this recording of "${session.topic}"? This cannot be undone.`)) {
			onDelete(session.id);
		}
	}

	return (
		<div className="recording-card">
			<div className="recording-card-info">
				{attemptLabel && <p className="recording-card-attempt">{attemptLabel}</p>}
				<p className="recording-card-meta">
					{formatDate(session.createdAt)} &bull; {formatDurationLong(session.durationSeconds)}
				</p>
				<p className={`recording-card-expiry${remaining <= 5 ? " recording-card-expiry-soon" : ""}`}>
					{remaining > 0 ? `Expires in ${remaining} day${remaining === 1 ? "" : "s"}` : "Expires today"}
				</p>
			</div>

			<div className="recording-card-actions">
				<button type="button" className="btn btn-primary btn-sm" onClick={() => onReview(session)}>
					Review
				</button>
				<button type="button" className="btn btn-secondary btn-sm" onClick={() => onPracticeAgain(session.topic)}>
					Practice Again
				</button>
				<button type="button" className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
					{deleting ? "Deleting..." : "Delete"}
				</button>
			</div>
		</div>
	);
}
