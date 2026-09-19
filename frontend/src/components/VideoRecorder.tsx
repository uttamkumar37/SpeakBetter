import { useEffect, useRef, useState } from "react";
import type { RecordingResult } from "../types";
import {
	describeMediaError,
	formatDuration,
	isMediaRecorderSupported,
	pickSupportedMimeType,
} from "../utils/mediaRecorder";
import { RecordingCountdown } from "./RecordingCountdown";
import "./VideoRecorder.css";

type Phase = "requesting" | "ready" | "countdown" | "recording" | "error";

const COUNTDOWN_PREF_KEY = "speakbetter.countdownEnabled";

interface VideoRecorderProps {
	topic: string;
	onRecordingComplete: (result: RecordingResult) => void;
}

export function VideoRecorder({ topic, onRecordingComplete }: VideoRecorderProps) {
	const [phase, setPhase] = useState<Phase>("requesting");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [elapsedSeconds, setElapsedSeconds] = useState(0);
	const [countdownEnabled, setCountdownEnabled] = useState(() => {
		try {
			return window.localStorage.getItem(COUNTDOWN_PREF_KEY) !== "false";
		} catch {
			return true;
		}
	});

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mimeTypeRef = useRef<string | null>(null);
	const chunksRef = useRef<BlobPart[]>([]);
	const elapsedSecondsRef = useRef(0);
	const timerIntervalRef = useRef<number | null>(null);

	useEffect(() => {
		requestCamera();
		return () => {
			stopTimer();
			stopTracks();
		};
		// requestCamera intentionally runs once on mount only - it's not memoized,
		// and re-running it whenever it gets a new identity would re-request the camera.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	function stopTracks() {
		streamRef.current?.getTracks().forEach((track) => track.stop());
		streamRef.current = null;
	}

	function stopTimer() {
		if (timerIntervalRef.current !== null) {
			window.clearInterval(timerIntervalRef.current);
			timerIntervalRef.current = null;
		}
	}

	function toggleCountdown() {
		const next = !countdownEnabled;
		setCountdownEnabled(next);
		try {
			window.localStorage.setItem(COUNTDOWN_PREF_KEY, String(next));
		} catch {
			// localStorage unavailable - preference just won't persist across visits
		}
	}

	async function requestCamera() {
		setErrorMessage(null);

		if (!navigator.mediaDevices?.getUserMedia) {
			setPhase("error");
			setErrorMessage("This browser does not support camera/microphone recording. Please use an up-to-date Chrome, Firefox, or Edge.");
			return;
		}
		if (!isMediaRecorderSupported()) {
			setPhase("error");
			setErrorMessage("This browser does not support the MediaRecorder API needed to save recordings.");
			return;
		}
		const mimeType = pickSupportedMimeType();
		if (!mimeType) {
			setPhase("error");
			setErrorMessage("This browser does not support any compatible video recording format.");
			return;
		}
		mimeTypeRef.current = mimeType;

		setPhase("requesting");
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
			setPhase("ready");
		} catch (err) {
			stopTracks();
			setPhase("error");
			setErrorMessage(describeMediaError(err));
		}
	}

	function handleStartClick() {
		if (countdownEnabled) {
			setPhase("countdown");
		} else {
			beginRecording();
		}
	}

	function beginRecording() {
		const stream = streamRef.current;
		const mimeType = mimeTypeRef.current;
		if (!stream || !mimeType) {
			return;
		}

		chunksRef.current = [];
		const recorder = new MediaRecorder(stream, { mimeType });
		recorder.ondataavailable = (event) => {
			if (event.data.size > 0) {
				chunksRef.current.push(event.data);
			}
		};
		recorder.onstop = () => {
			const blob = new Blob(chunksRef.current, { type: mimeType });
			stopTracks();
			onRecordingComplete({ blob, mimeType, durationSeconds: elapsedSecondsRef.current });
		};
		mediaRecorderRef.current = recorder;
		recorder.start();

		elapsedSecondsRef.current = 0;
		setElapsedSeconds(0);
		const startedAt = Date.now();
		timerIntervalRef.current = window.setInterval(() => {
			const secs = Math.floor((Date.now() - startedAt) / 1000);
			elapsedSecondsRef.current = secs;
			setElapsedSeconds(secs);
		}, 1000);

		setPhase("recording");
	}

	function handleStop() {
		stopTimer();
		mediaRecorderRef.current?.stop();
	}

	// The <video> element stays mounted across every phase so its ref is already
	// attached by the time getUserMedia resolves and assigns srcObject - if it only
	// mounted once recording actually started, the stream would arrive before the
	// element existed and the live preview would stay blank.
	return (
		<div className="video-recorder">
			<div className="camera-frame">
				<video ref={videoRef} className="camera-preview" autoPlay muted playsInline />

				{phase === "requesting" && (
					<div className="camera-frame-overlay">
						<p>Requesting camera access...</p>
					</div>
				)}

				{phase === "countdown" && <RecordingCountdown onFinished={beginRecording} />}

				{phase === "recording" && (
					<>
						<div className="rec-indicator">
							<span className="rec-dot" />
							REC {formatDuration(elapsedSeconds)}
						</div>
						<div className="recording-topic-badge">Topic: {topic}</div>
					</>
				)}
			</div>

			{phase === "error" && (
				<>
					<div className="recorder-error">{errorMessage}</div>
					<button type="button" className="btn btn-primary" onClick={requestCamera}>
						Try Again
					</button>
				</>
			)}

			{phase === "ready" && (
				<div className="ready-controls">
					<p className="ready-hint">Ready when you are.</p>
					<label className="countdown-toggle">
						<input type="checkbox" checked={countdownEnabled} onChange={toggleCountdown} />
						3-2-1 countdown
					</label>
					<button type="button" className="btn btn-primary" onClick={handleStartClick}>
						Start Recording
					</button>
				</div>
			)}

			{phase === "recording" && (
				<button type="button" className="btn btn-stop" onClick={handleStop}>
					Stop Recording
				</button>
			)}
		</div>
	);
}
