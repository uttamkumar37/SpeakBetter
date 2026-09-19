import { useState } from "react";
import { ApiError, updateSessionReview } from "../api/practiceSessionsApi";
import type { PracticeSession } from "../types";
import "./SessionReview.css";

interface SessionReviewProps {
	session: PracticeSession;
	onSaved: (updated: PracticeSession) => void;
}

export function SessionReview({ session, onSaved }: SessionReviewProps) {
	const [wentWell, setWentWell] = useState(session.wentWell ?? "");
	const [needsImprovement, setNeedsImprovement] = useState(session.needsImprovement ?? "");
	const [fillerWordCount, setFillerWordCount] = useState(
		session.fillerWordCount !== null ? String(session.fillerWordCount) : "",
	);
	const [notes, setNotes] = useState(session.notes ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [savedJustNow, setSavedJustNow] = useState(false);

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault();

		let parsedFillerCount: number | null = null;
		if (fillerWordCount.trim() !== "") {
			const parsed = Number(fillerWordCount);
			if (!Number.isInteger(parsed) || parsed < 0) {
				setError("Filler word count must be a whole number of 0 or more.");
				return;
			}
			parsedFillerCount = parsed;
		}

		setSaving(true);
		setError(null);
		setSavedJustNow(false);
		try {
			const updated = await updateSessionReview(session.id, {
				wentWell: wentWell.trim() || null,
				needsImprovement: needsImprovement.trim() || null,
				fillerWordCount: parsedFillerCount,
				notes: notes.trim() || null,
			});
			onSaved(updated);
			setSavedJustNow(true);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Failed to save the review. Please try again.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<form className="session-review" onSubmit={handleSubmit}>
			<div className="review-field">
				<label htmlFor={`went-well-${session.id}`}>What went well</label>
				<textarea
					id={`went-well-${session.id}`}
					rows={2}
					value={wentWell}
					onChange={(e) => setWentWell(e.target.value)}
				/>
			</div>

			<div className="review-field">
				<label htmlFor={`needs-improvement-${session.id}`}>What needs improvement</label>
				<textarea
					id={`needs-improvement-${session.id}`}
					rows={2}
					value={needsImprovement}
					onChange={(e) => setNeedsImprovement(e.target.value)}
				/>
			</div>

			<div className="review-field review-field-narrow">
				<label htmlFor={`filler-count-${session.id}`}>Filler word count</label>
				<input
					id={`filler-count-${session.id}`}
					type="number"
					min={0}
					step={1}
					value={fillerWordCount}
					onChange={(e) => setFillerWordCount(e.target.value)}
				/>
			</div>

			<div className="review-field">
				<label htmlFor={`notes-${session.id}`}>Notes</label>
				<textarea id={`notes-${session.id}`} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
			</div>

			{error && <p className="recorder-error">{error}</p>}
			{savedJustNow && !error && <p className="review-saved-note">Review saved.</p>}

			<button type="submit" className="btn btn-primary" disabled={saving}>
				{saving ? "Saving..." : "Save Review"}
			</button>
		</form>
	);
}
