import type { PracticeSession } from "../../types";
import "./CoachingTabs.css";

interface TranscriptTabProps {
	session: PracticeSession;
}

export function TranscriptTab({ session }: TranscriptTabProps) {
	const hasReviewText = Boolean(session.wentWell || session.needsImprovement || session.notes);

	return (
		<div className="coaching-tab">
			<section className="coaching-panel">
				<h3>Transcript</h3>
				<p>
					Automatic speech-to-text is not connected in this project yet. Review the video or audio tabs, then use
					the notes below as your working transcript until a transcription provider is configured.
				</p>
			</section>

			<section className="coaching-panel">
				<h3>Review notes</h3>
				{hasReviewText ? (
					<div className="transcript-notes">
						{session.wentWell && (
							<p>
								<strong>Went well:</strong> {session.wentWell}
							</p>
						)}
						{session.needsImprovement && (
							<p>
								<strong>Needs improvement:</strong> {session.needsImprovement}
							</p>
						)}
						{session.notes && (
							<p>
								<strong>Notes:</strong> {session.notes}
							</p>
						)}
					</div>
				) : (
					<p>Add self-review notes in the Overview tab and they will appear here for follow-up practice.</p>
				)}
			</section>
		</div>
	);
}
