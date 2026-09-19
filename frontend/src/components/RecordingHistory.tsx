import { useState } from "react";
import { ApiError } from "../api/practiceSessionsApi";
import { useSessions } from "../state/useSessions";
import type { PracticeSession } from "../types";
import { groupByTopic } from "../utils/groupByTopic";
import { RecordingCard } from "./RecordingCard";
import { ReviewWorkspace } from "./review/ReviewWorkspace";
import { SkeletonCard } from "./SkeletonCard";
import "./RecordingHistory.css";

interface RecordingHistoryProps {
	onPracticeAgain: (topic: string) => void;
	title?: string;
}

export function RecordingHistory({ onPracticeAgain, title = "Previous Recordings" }: RecordingHistoryProps) {
	const { sessions, loading, error, reload, deleteSession, deletingId } = useSessions();
	const [reviewingSession, setReviewingSession] = useState<PracticeSession | null>(null);

	async function handleDelete(id: string) {
		try {
			await deleteSession(id);
		} catch (err) {
			window.alert(err instanceof ApiError ? err.message : "Failed to delete the recording. Please try again.");
		}
	}

	if (reviewingSession) {
		return <ReviewWorkspace session={reviewingSession} onDone={() => setReviewingSession(null)} />;
	}

	return (
		<section className="recording-history">
			<h2>{title}</h2>

			{loading && (
				<div className="recording-list">
					<SkeletonCard />
					<SkeletonCard />
				</div>
			)}

			{error && !loading && (
				<div className="recorder-error">
					{error}
					<button type="button" className="btn btn-secondary retry-btn" onClick={reload}>
						Retry
					</button>
				</div>
			)}

			{!loading && !error && sessions.length === 0 && (
				<div className="empty-history-state">
					<p>No recordings yet.</p>
					<p className="recorder-hint">Start a practice session above and your first attempt will show up here.</p>
				</div>
			)}

			{!loading && !error && sessions.length > 0 && (
				<div className="topic-group-list">
					{groupByTopic(sessions).map((group) => (
						<div className="topic-group" key={group.topic.toLowerCase()}>
							<h3 className="topic-group-heading">
								{group.topic}
								{group.attempts.length > 1 && (
									<span className="attempt-count"> &bull; {group.attempts.length} attempts</span>
								)}
							</h3>
							<div className="recording-list">
								{group.attempts.map((session, index) => (
									<RecordingCard
										key={session.id}
										session={session}
										attemptLabel={
											group.attempts.length > 1 ? `Attempt ${index + 1} of ${group.attempts.length}` : undefined
										}
										onReview={setReviewingSession}
										onPracticeAgain={onPracticeAgain}
										onDelete={handleDelete}
										deleting={deletingId === session.id}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			)}
		</section>
	);
}
