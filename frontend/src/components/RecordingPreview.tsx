import { useEffect, useMemo } from "react";
import type { RecordingResult } from "../types";
import { formatDuration } from "../utils/mediaRecorder";
import "./RecordingPreview.css";

interface RecordingPreviewProps {
	topic: string;
	result: RecordingResult;
	onRetake: () => void;
	onSave: (result: RecordingResult) => void;
	saving?: boolean;
	saveError?: string | null;
}

export function RecordingPreview({ topic, result, onRetake, onSave, saving, saveError }: RecordingPreviewProps) {
	const objectUrl = useMemo(() => URL.createObjectURL(result.blob), [result.blob]);

	useEffect(() => {
		return () => URL.revokeObjectURL(objectUrl);
	}, [objectUrl]);

	return (
		<div className="recording-preview">
			<h3>Nice &mdash; review your attempt.</h3>
			<video src={objectUrl} controls className="preview-video" />
			<p className="preview-meta">
				Duration: {formatDuration(result.durationSeconds)} &bull; Topic: {topic}
			</p>
			{saveError && <p className="recorder-error">{saveError}</p>}
			<p className="preview-retake-note">Retake discards this attempt - it isn't saved until you save it.</p>
			<div className="preview-actions">
				<button type="button" className="btn btn-secondary" onClick={onRetake} disabled={saving}>
					Retake
				</button>
				<button type="button" className="btn btn-primary" onClick={() => onSave(result)} disabled={saving}>
					{saving ? "Saving..." : "Save & Review"}
				</button>
			</div>
		</div>
	);
}
