import { useState } from "react";
import { useLocation } from "react-router-dom";
import { ApiError, createPracticeSession } from "../api/practiceSessionsApi";
import { PracticeHome } from "../components/PracticeHome";
import { PracticePreparation } from "../components/PracticePreparation";
import { RecordingPreview } from "../components/RecordingPreview";
import { ReviewWorkspace } from "../components/review/ReviewWorkspace";
import { SpeakingGuide } from "../components/SpeakingGuide";
import { TopicSelector } from "../components/TopicSelector";
import { VideoRecorder } from "../components/VideoRecorder";
import { useSessions } from "../state/useSessions";
import type { PracticeSession, RecordingResult } from "../types";
import "./PracticePage.css";

type Stage = "home" | "topic-select" | "prepare" | "record";

interface NavigationState {
	topic?: string;
}

export function PracticePage() {
	const location = useLocation();
	const { addSession } = useSessions();
	const initialTopic = (location.state as NavigationState | null)?.topic;

	const [stage, setStage] = useState<Stage>(initialTopic ? "prepare" : "home");
	const [topic, setTopic] = useState(initialTopic ?? "");
	const [guideVisible, setGuideVisible] = useState(true);
	const [recordingResult, setRecordingResult] = useState<RecordingResult | null>(null);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [savedSession, setSavedSession] = useState<PracticeSession | null>(null);

	function selectTopic(newTopic: string) {
		setTopic(newTopic);
		setGuideVisible(true);
		setRecordingResult(null);
		setSavedSession(null);
		setSaveError(null);
		setStage("prepare");
	}

	function handleRecordingComplete(result: RecordingResult) {
		setSaveError(null);
		setRecordingResult(result);
	}

	function handleRetake() {
		setSaveError(null);
		setRecordingResult(null);
	}

	async function handleSave(result: RecordingResult) {
		setSaving(true);
		setSaveError(null);
		try {
			const saved = await createPracticeSession(topic, result.durationSeconds, result.blob, result.mimeType);
			addSession(saved);
			setSavedSession(saved);
			setRecordingResult(null);
		} catch (err) {
			setSaveError(err instanceof ApiError ? err.message : "Failed to save the recording. Please try again.");
		} finally {
			setSaving(false);
		}
	}

	function handleReviewDone() {
		setSavedSession(null);
		setTopic("");
		setStage("home");
	}

	function handlePracticeAgain(nextTopic: string) {
		setSavedSession(null);
		setRecordingResult(null);
		setTopic(nextTopic);
		setStage("prepare");
	}

	if (stage === "home") {
		return (
			<PracticeHome onStartNewPractice={() => setStage("topic-select")} onSelectTopic={selectTopic} />
		);
	}

	if (stage === "topic-select") {
		return (
			<div className="practice-stage">
				<button type="button" className="back-link" onClick={() => setStage("home")}>
					&larr; Back
				</button>
				<TopicSelector onSelect={selectTopic} />
			</div>
		);
	}

	if (stage === "prepare") {
		return (
			<div className="practice-stage">
				<button type="button" className="back-link" onClick={() => setStage("topic-select")}>
					&larr; Back
				</button>
				<PracticePreparation
					topic={topic}
					onTopicChange={setTopic}
					onStartRecording={() => setStage("record")}
					onSkip={() => setStage("record")}
				/>
			</div>
		);
	}

	// stage === "record"
	if (savedSession) {
		return (
			<div className="practice-stage">
				<ReviewWorkspace session={savedSession} onDone={handleReviewDone} onPracticeAgain={handlePracticeAgain} />
			</div>
		);
	}

	return (
		<div className="practice-stage">
			<button type="button" className="back-link" onClick={() => setStage("prepare")}>
				&larr; Back
			</button>

			{recordingResult ? (
				<RecordingPreview
					topic={topic}
					result={recordingResult}
					onRetake={handleRetake}
					onSave={handleSave}
					saving={saving}
					saveError={saveError}
				/>
			) : (
				<div className="record-stage">
					<h2 className="record-stage-topic">{topic}</h2>
					{guideVisible && <SpeakingGuide topic={topic} onHide={() => setGuideVisible(false)} />}
					<VideoRecorder topic={topic} onRecordingComplete={handleRecordingComplete} />
				</div>
			)}
		</div>
	);
}
