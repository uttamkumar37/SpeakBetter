import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getInterviewSession, interviewVideoUrlFor, updateInterviewReview } from "../api/interviewApi";
import { ApiError } from "../api/practiceSessionsApi";
import { useInterviewSessions } from "../state/useInterviewSessions";
import type { InterviewSession } from "../types";
import { formatDate, formatDurationLong } from "../utils/format";
import { interviewLabel } from "../utils/interviewLabels";
import "./InterviewPortal.css";

type TabKey = "overview" | "question" | "recording" | "transcript" | "metrics" | "structure" | "review" | "previous";

const TABS: { key: TabKey; label: string }[] = [
	{ key: "overview", label: "Overview" },
	{ key: "question", label: "Question" },
	{ key: "recording", label: "Recording" },
	{ key: "transcript", label: "Transcript" },
	{ key: "metrics", label: "Metrics" },
	{ key: "structure", label: "Structure" },
	{ key: "review", label: "Self-review" },
	{ key: "previous", label: "Previous" },
];

export function InterviewReviewPage() {
	const { id } = useParams();
	const navigate = useNavigate();
	const { sessions, updateSession } = useInterviewSessions();
	const [session, setSession] = useState<InterviewSession | null>(sessions.find((item) => item.id === id) ?? null);
	const [loading, setLoading] = useState(!session);
	const [error, setError] = useState<string | null>(null);
	const [activeTab, setActiveTab] = useState<TabKey>("overview");

	useEffect(() => {
		if (!id) return;
		const sessionId = id;
		let ignore = false;
		async function load() {
			setLoading(true);
			setError(null);
			try {
				const loaded = await getInterviewSession(sessionId);
				if (!ignore) {
					setSession(loaded);
					updateSession(loaded);
				}
			} catch (err) {
				if (!ignore) setError(err instanceof ApiError ? err.message : "Failed to load interview review.");
			} finally {
				if (!ignore) setLoading(false);
			}
		}
		void load();
		return () => {
			ignore = true;
		};
	}, [id, updateSession]);

	const attemptsForQuestion = useMemo(
		() => session ? sessions
			.filter((item) => item.question.id === session.question.id)
			.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [],
		[session, sessions],
	);
	const attemptIndex = session ? attemptsForQuestion.findIndex((item) => item.id === session.id) : -1;
	const previous = attemptIndex > 0 ? attemptsForQuestion[attemptIndex - 1] : undefined;

	if (loading) return <p className="recorder-hint">Loading interview review...</p>;
	if (error || !session) {
		return (
			<div className="recorder-error">
				{error ?? "Interview session not found."}
				<button type="button" className="btn btn-secondary retry-btn" onClick={() => navigate("/interview/history")}>History</button>
			</div>
		);
	}

	const videoUrl = interviewVideoUrlFor(session);

	return (
		<div className="interview-page">
			<section className="review-workspace">
				<div className="review-workspace-header">
					<div>
						<p className="interview-eyebrow">Interview Review</p>
						<h2>{session.question.questionText}</h2>
						<p className="review-workspace-meta">
							Attempt {attemptIndex + 1 || 1} of {attemptsForQuestion.length || 1} &bull; {formatDate(session.createdAt)}
							{session.durationSeconds !== null && ` • ${formatDurationLong(session.durationSeconds)}`}
						</p>
					</div>
					<div className="review-score-card">
						<span>{session.metrics.duration.band === "WITHIN_TARGET" ? "On" : "--"}</span>
						<small>Duration target</small>
					</div>
				</div>

				<div className="result-summary">
					<div><span>Transcript</span><strong>{statusLabel(session.transcriptStatus)}</strong></div>
					<div><span>AI analysis</span><strong>{aiStatus(session.analysisStatus)}</strong></div>
				</div>

				<div className="review-tab-bar" role="tablist">
					{TABS.map((tab) => (
						<button
							key={tab.key}
							type="button"
							role="tab"
							aria-selected={activeTab === tab.key}
							className={`review-tab${activeTab === tab.key ? " review-tab-active" : ""}`}
							onClick={() => setActiveTab(tab.key)}
						>
							{tab.label}
						</button>
					))}
				</div>

				<div className="review-tab-content">
					{activeTab === "overview" && <Overview session={session} />}
					{activeTab === "question" && <Question session={session} />}
					{activeTab === "recording" && (
						<div className="interview-panel">
							<h3>Recording</h3>
							{videoUrl ? <video src={videoUrl} controls className="media-tab-video" /> : <p>Recording is not available.</p>}
						</div>
					)}
					{activeTab === "transcript" && <Transcript session={session} />}
					{activeTab === "metrics" && <Metrics session={session} />}
					{activeTab === "structure" && <Structure session={session} />}
					{activeTab === "review" && (
						<SelfReview
							session={session}
							onSaved={(saved) => {
								setSession(saved);
								updateSession(saved);
							}}
						/>
					)}
					{activeTab === "previous" && <Previous current={session} previous={previous} attempts={attemptsForQuestion} />}
				</div>

				<div className="review-actions">
					<button type="button" className="btn btn-primary" onClick={() => navigate("/interview")}>Practice Again</button>
					<button type="button" className="btn btn-secondary" onClick={() => navigate("/interview/history")}>History</button>
				</div>
			</section>
		</div>
	);
}

function Overview({ session }: { session: InterviewSession }) {
	return (
		<div className="interview-grid">
			<MetricCard label="Duration" value={session.durationSeconds !== null ? formatDurationLong(session.durationSeconds) : "Not enough data"} note={session.metrics.duration.message} />
			<MetricCard label="Pacing" value={session.metrics.pacing.wordsPerMinute !== null ? `${session.metrics.pacing.wordsPerMinute} wpm` : "Transcript required"} note={session.metrics.pacing.message} />
			<MetricCard label="Filler words" value={session.metrics.fillerWords.fillerWordCount !== null ? String(session.metrics.fillerWords.fillerWordCount) : "Transcript required"} note={session.metrics.fillerWords.message} />
			<MetricCard label="AI feedback" value={aiStatus(session.analysisStatus)} note="AI analysis is not configured. You can still review your recording and use the available deterministic metrics." />
		</div>
	);
}

function Question({ session }: { session: InterviewSession }) {
	return (
		<div className="interview-panel">
			<h3>{session.question.questionText}</h3>
			<p>{session.question.guidance}</p>
			<div className="structure-list">
				{session.question.expectedResponseStructure.map((item) => <span key={item}>{item}</span>)}
			</div>
			<p className="recorder-hint">{interviewLabel(session.role)} &bull; {interviewLabel(session.level)} &bull; {interviewLabel(session.category)}</p>
		</div>
	);
}

function Transcript({ session }: { session: InterviewSession }) {
	if (session.transcriptStatus !== "READY" || !session.transcript) {
		return <Unavailable title="Transcript required for pacing and filler-word analysis." message="Automatic transcription is not configured. No transcript text has been invented for this attempt." />;
	}
	return <div className="interview-panel"><h3>Transcript</h3><p>{session.transcript}</p></div>;
}

function Metrics({ session }: { session: InterviewSession }) {
	return (
		<div className="interview-grid">
			<MetricCard label="Duration target" value={interviewLabel(session.metrics.duration.band)} note={session.metrics.duration.message} />
			<MetricCard label="Word count" value={session.metrics.pacing.wordCount !== null ? String(session.metrics.pacing.wordCount) : session.metrics.pacing.message} note="Calculated only from a real transcript." />
			<MetricCard label="Words per minute" value={session.metrics.pacing.wordsPerMinute !== null ? String(session.metrics.pacing.wordsPerMinute) : session.metrics.pacing.message} note="Transcript required for pacing analysis." />
			<MetricCard label="Filler rate" value={session.metrics.fillerWords.fillersPerMinute !== null ? `${session.metrics.fillerWords.fillersPerMinute.toFixed(1)} / min` : session.metrics.fillerWords.message} note="Detected with deterministic exact-word matching when transcript exists." />
		</div>
	);
}

function Structure({ session }: { session: InterviewSession }) {
	const structure = session.metrics.responseStructure;
	if (structure.availability !== "AVAILABLE") {
		return <Unavailable title={structure.message} message="Try organizing your answer with Situation, Task, Action, and Result during self-review." />;
	}
	return (
		<div className="interview-grid">
			<MetricCard label="Situation" value={interviewLabel(structure.situation)} note="Detected through keyword indicators." />
			<MetricCard label="Task" value={interviewLabel(structure.task)} note="Detected through keyword indicators." />
			<MetricCard label="Action" value={interviewLabel(structure.action)} note="Detected through keyword indicators." />
			<MetricCard label="Result" value={interviewLabel(structure.result)} note="Detected through keyword indicators." />
		</div>
	);
}

function Previous({ current, previous, attempts }: { current: InterviewSession; previous?: InterviewSession; attempts: InterviewSession[] }) {
	if (!previous) {
		return <Unavailable title="No previous attempt for this question yet." message="Record another answer to compare duration, transcript-based metrics, and self-review notes." />;
	}
	const currentDuration = current.durationSeconds;
	const previousDuration = previous.durationSeconds;
	const durationText = currentDuration !== null && previousDuration !== null
		? currentDuration < previousDuration
			? `Your later attempt was ${previousDuration - currentDuration} seconds shorter.`
			: currentDuration > previousDuration
				? `Your later attempt was ${currentDuration - previousDuration} seconds longer.`
				: "Both attempts have the same duration."
		: "Not enough data to compare duration.";
	return (
		<div className="interview-panel">
			<h3>Previous attempts</h3>
			<p>{durationText}</p>
			<p>{compareAvailableMetric("Word count", previous.metrics.pacing.wordCount, current.metrics.pacing.wordCount)}</p>
			<p>{compareAvailableMetric("Filler words", previous.metrics.fillerWords.fillerWordCount, current.metrics.fillerWords.fillerWordCount)}</p>
			<p className="recorder-hint">{attempts.length} total attempt{attempts.length === 1 ? "" : "s"} for this question.</p>
		</div>
	);
}

function MetricCard({ label, value, note }: { label: string; value: string; note: string }) {
	return <div className="interview-metric"><span>{label}</span><strong>{value}</strong><p>{note}</p></div>;
}

function Unavailable({ title, message }: { title: string; message: string }) {
	return <div className="interview-panel unavailable"><h3>{title}</h3><p>{message}</p></div>;
}

function statusLabel(status: InterviewSession["transcriptStatus"]) {
	if (status === "READY") return "Available";
	if (status === "PENDING") return "Analysis pending";
	if (status === "FAILED") return "Analysis unavailable";
	return "Transcript required";
}

function aiStatus(status: InterviewSession["analysisStatus"]) {
	if (status === "READY") return "Available";
	if (status === "PENDING") return "Analysis pending";
	if (status === "FAILED") return "Analysis unavailable";
	return "AI analysis is not configured";
}

function compareAvailableMetric(label: string, previousValue: number | null, currentValue: number | null) {
	if (previousValue === null || currentValue === null) return `Not enough data to compare ${label.toLowerCase()}.`;
	if (currentValue < previousValue) return `${label} decreased from ${previousValue} to ${currentValue}.`;
	if (currentValue > previousValue) return `${label} increased from ${previousValue} to ${currentValue}.`;
	return `${label} stayed at ${currentValue}.`;
}

function SelfReview({ session, onSaved }: { session: InterviewSession; onSaved: (session: InterviewSession) => void }) {
	const [wentWell, setWentWell] = useState(session.wentWell ?? "");
	const [needsImprovement, setNeedsImprovement] = useState(session.needsImprovement ?? "");
	const [fillerWordCount, setFillerWordCount] = useState(
		session.fillerWordCount !== null ? String(session.fillerWordCount) : "",
	);
	const [notes, setNotes] = useState(session.notes ?? "");
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [savedJustNow, setSavedJustNow] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
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
			const saved = await updateInterviewReview(session.id, {
				wentWell: wentWell.trim() || null,
				needsImprovement: needsImprovement.trim() || null,
				fillerWordCount: parsedFillerCount,
				notes: notes.trim() || null,
			});
			onSaved(saved);
			setSavedJustNow(true);
		} catch (err) {
			setError(err instanceof ApiError ? err.message : "Failed to save the review. Please try again.");
		} finally {
			setSaving(false);
		}
	}

	return (
		<form className="session-review interview-panel" onSubmit={handleSubmit}>
			<h3>Self-review</h3>
			<div className="review-field">
				<label htmlFor={`interview-went-well-${session.id}`}>What went well</label>
				<textarea id={`interview-went-well-${session.id}`} rows={2} value={wentWell} onChange={(event) => setWentWell(event.target.value)} />
			</div>
			<div className="review-field">
				<label htmlFor={`interview-needs-improvement-${session.id}`}>What needs improvement</label>
				<textarea id={`interview-needs-improvement-${session.id}`} rows={2} value={needsImprovement} onChange={(event) => setNeedsImprovement(event.target.value)} />
			</div>
			<div className="review-field review-field-narrow">
				<label htmlFor={`interview-filler-${session.id}`}>Filler word count</label>
				<input id={`interview-filler-${session.id}`} type="number" min={0} step={1} value={fillerWordCount} onChange={(event) => setFillerWordCount(event.target.value)} />
			</div>
			<div className="review-field">
				<label htmlFor={`interview-notes-${session.id}`}>Notes</label>
				<textarea id={`interview-notes-${session.id}`} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
			</div>
			{error && <p className="recorder-error">{error}</p>}
			{savedJustNow && !error && <p className="review-saved-note">Review saved.</p>}
			<button type="submit" className="btn btn-primary" disabled={saving}>{saving ? "Saving..." : "Save Review"}</button>
		</form>
	);
}
