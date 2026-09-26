import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
	createInterviewSession,
	listInterviewQuestions,
	uploadInterviewRecording,
} from "../api/interviewApi";
import { ApiError } from "../api/practiceSessionsApi";
import { RecordingPreview } from "../components/RecordingPreview";
import { VideoRecorder } from "../components/VideoRecorder";
import { useInterviewSessions } from "../state/useInterviewSessions";
import type {
	InterviewCategory,
	InterviewLevel,
	InterviewQuestion,
	InterviewRole,
	RecordingResult,
} from "../types";
import {
	INTERVIEW_CATEGORIES,
	INTERVIEW_LEVELS,
	INTERVIEW_ROLES,
	interviewLabel,
} from "../utils/interviewLabels";
import "./InterviewPortal.css";

type Stage = "select" | "question" | "record" | "saved";

export function InterviewPracticePage() {
	const navigate = useNavigate();
	const { addSession } = useInterviewSessions();
	const [role, setRole] = useState<InterviewRole>("BACKEND_ENGINEER");
	const [level, setLevel] = useState<InterviewLevel>("MID");
	const [category, setCategory] = useState<InterviewCategory>("BEHAVIORAL");
	const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
	const [selectedQuestion, setSelectedQuestion] = useState<InterviewQuestion | null>(null);
	const [stage, setStage] = useState<Stage>("select");
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [recordingResult, setRecordingResult] = useState<RecordingResult | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [savedSessionId, setSavedSessionId] = useState<string | null>(null);

	useEffect(() => {
		let ignore = false;
		async function loadQuestions() {
			setLoading(true);
			setError(null);
			try {
				const next = await listInterviewQuestions({ role, level, category });
				if (!ignore) {
					setQuestions(next);
					setSelectedQuestion((current) => next.find((question) => question.id === current?.id) ?? next[0] ?? null);
				}
			} catch (err) {
				if (!ignore) {
					setQuestions([]);
					setSelectedQuestion(null);
					setError(err instanceof ApiError ? err.message : "Failed to load interview questions.");
				}
			} finally {
				if (!ignore) setLoading(false);
			}
		}
		void loadQuestions();
		return () => {
			ignore = true;
		};
	}, [role, level, category]);

	const recorderTopic = selectedQuestion?.questionText ?? "Interview answer";
	const selectedQuestionAvailable = useMemo(
		() => selectedQuestion && questions.some((question) => question.id === selectedQuestion.id),
		[selectedQuestion, questions],
	);

	function handleRetake() {
		setRecordingResult(null);
		setSaveError(null);
	}

	async function handleSave(result: RecordingResult) {
		if (!selectedQuestion) return;
		setSaving(true);
		setSaveError(null);
		try {
			const created = await createInterviewSession({
				role,
				level,
				category,
				questionId: selectedQuestion.id,
			});
			const saved = await uploadInterviewRecording(created.id, result.durationSeconds, result.blob, result.mimeType);
			addSession(saved);
			setSavedSessionId(saved.id);
			setRecordingResult(null);
			setStage("saved");
		} catch (err) {
			setSaveError(err instanceof ApiError ? err.message : "Failed to save the interview answer. Please try again.");
		} finally {
			setSaving(false);
		}
	}

	if (stage === "record" && selectedQuestion) {
		return (
			<div className="interview-page">
				<button type="button" className="back-link" onClick={() => setStage("question")}>
					&larr; Back
				</button>
				{recordingResult ? (
					<RecordingPreview
						topic={selectedQuestion.questionText}
						result={recordingResult}
						onRetake={handleRetake}
						onSave={handleSave}
						saving={saving}
						saveError={saveError}
					/>
				) : (
					<section className="interview-record-layout">
						<div className="interview-question-panel">
							<p className="interview-eyebrow">Question</p>
							<h2>{selectedQuestion.questionText}</h2>
							<p>{selectedQuestion.guidance}</p>
						</div>
						<VideoRecorder topic={recorderTopic} onRecordingComplete={setRecordingResult} />
					</section>
				)}
			</div>
		);
	}

	if (stage === "saved" && savedSessionId) {
		return (
			<div className="interview-page">
				<section className="interview-complete">
					<p className="interview-eyebrow">Saved</p>
					<h1>Your interview answer is ready for review.</h1>
					<p>Deterministic metrics are available now. Transcript and AI feedback remain unavailable until real providers are configured.</p>
					<div className="interview-actions">
						<button type="button" className="btn btn-primary" onClick={() => navigate(`/interview/review/${savedSessionId}`)}>
							Review Answer
						</button>
						<button type="button" className="btn btn-secondary" onClick={() => {
							setStage("select");
							setSavedSessionId(null);
						}}>
							Practice Another
						</button>
					</div>
				</section>
			</div>
		);
	}

	return (
		<div className="interview-page">
			<section className="interview-hero">
				<div>
					<p className="interview-eyebrow">Interview Portal</p>
					<h1>Practice interview answers with honest feedback.</h1>
					<p>
						Choose a role, level, and category, then record a real answer. SpeakBetter only shows metrics it can
						calculate from stored data.
					</p>
				</div>
				<a className="btn btn-secondary" href="#/interview/history">Interview History</a>
			</section>

			<section className="interview-filters" aria-label="Interview question filters">
				<label>
					Role
					<select value={role} onChange={(event) => setRole(event.target.value as InterviewRole)}>
						{INTERVIEW_ROLES.map((option) => (
							<option key={option} value={option}>{interviewLabel(option)}</option>
						))}
					</select>
				</label>
				<label>
					Level
					<select value={level} onChange={(event) => setLevel(event.target.value as InterviewLevel)}>
						{INTERVIEW_LEVELS.map((option) => (
							<option key={option} value={option}>{interviewLabel(option)}</option>
						))}
					</select>
				</label>
				<label>
					Category
					<select value={category} onChange={(event) => setCategory(event.target.value as InterviewCategory)}>
						{INTERVIEW_CATEGORIES.map((option) => (
							<option key={option} value={option}>{interviewLabel(option)}</option>
						))}
					</select>
				</label>
			</section>

			{loading && <p className="recorder-hint">Loading interview questions...</p>}
			{error && <p className="recorder-error">{error}</p>}
			{!loading && !error && questions.length === 0 && (
				<div className="empty-history-state">
					<p>No questions match these filters.</p>
					<p className="recorder-hint">Try a broader role, level, or category.</p>
				</div>
			)}
			{!loading && !error && questions.length > 0 && (
				<div className="interview-workspace">
					<div className="interview-question-list" role="listbox" aria-label="Interview questions">
						{questions.map((question) => (
							<button
								key={question.id}
								type="button"
								className={question.id === selectedQuestion?.id ? "interview-question-card active" : "interview-question-card"}
								onClick={() => {
									setSelectedQuestion(question);
									setStage("question");
								}}
							>
								<span>{interviewLabel(question.category)} &bull; {interviewLabel(question.level)}</span>
								<strong>{question.questionText}</strong>
							</button>
						))}
					</div>

					{selectedQuestion && (
						<section className="interview-detail">
							<p className="interview-eyebrow">Selected Question</p>
							<h2>{selectedQuestion.questionText}</h2>
							<p>{selectedQuestion.guidance}</p>
							<div className="structure-list">
								{selectedQuestion.expectedResponseStructure.map((item) => <span key={item}>{item}</span>)}
							</div>
							<button
								type="button"
								className="btn btn-primary"
								disabled={!selectedQuestionAvailable}
								onClick={() => setStage("record")}
							>
								Start Recording
							</button>
						</section>
					)}
				</div>
			)}
		</div>
	);
}
