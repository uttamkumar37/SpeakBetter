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
	const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
	const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
	const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState("");
	const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState("");
	const [micLevel, setMicLevel] = useState(0);

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const streamRef = useRef<MediaStream | null>(null);
	const mediaRecorderRef = useRef<MediaRecorder | null>(null);
	const mimeTypeRef = useRef<string | null>(null);
	const chunksRef = useRef<BlobPart[]>([]);
	const elapsedSecondsRef = useRef(0);
	const timerIntervalRef = useRef<number | null>(null);
	const audioContextRef = useRef<AudioContext | null>(null);
	const animationFrameRef = useRef<number | null>(null);

	useEffect(() => {
		requestCamera();
		navigator.mediaDevices?.addEventListener?.("devicechange", refreshDevices);
		return () => {
			navigator.mediaDevices?.removeEventListener?.("devicechange", refreshDevices);
			stopTimer();
			stopMicMeter();
			stopTracks();
		};
		// requestCamera intentionally runs once on mount only.
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

	function stopMicMeter() {
		if (animationFrameRef.current !== null) {
			window.cancelAnimationFrame(animationFrameRef.current);
			animationFrameRef.current = null;
		}
		void audioContextRef.current?.close();
		audioContextRef.current = null;
		setMicLevel(0);
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

	async function refreshDevices() {
		if (!navigator.mediaDevices?.enumerateDevices) {
			return;
		}
		const devices = await navigator.mediaDevices.enumerateDevices();
		const cameras = devices.filter((device) => device.kind === "videoinput");
		const microphones = devices.filter((device) => device.kind === "audioinput");
		setVideoDevices(cameras);
		setAudioDevices(microphones);
		setSelectedVideoDeviceId((current) => current || cameras[0]?.deviceId || "");
		setSelectedAudioDeviceId((current) => current || microphones[0]?.deviceId || "");
	}

	async function requestCamera(videoDeviceId = selectedVideoDeviceId, audioDeviceId = selectedAudioDeviceId) {
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
		stopMicMeter();
		stopTracks();
		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				video: videoDeviceId ? { deviceId: { exact: videoDeviceId } } : true,
				audio: audioDeviceId ? { deviceId: { exact: audioDeviceId } } : true,
			});
			streamRef.current = stream;
			if (videoRef.current) {
				videoRef.current.srcObject = stream;
			}
			await refreshDevices();
			startMicMeter(stream);
			setPhase("ready");
		} catch (err) {
			stopTracks();
			setPhase("error");
			setErrorMessage(describeMediaError(err));
		}
	}

	function startMicMeter(stream: MediaStream) {
		const audioTrack = stream.getAudioTracks()[0];
		if (!audioTrack) {
			return;
		}
		const AudioContextClass = window.AudioContext || window.webkitAudioContext;
		if (!AudioContextClass) {
			return;
		}
		const audioContext = new AudioContextClass();
		const analyser = audioContext.createAnalyser();
		analyser.fftSize = 256;
		const source = audioContext.createMediaStreamSource(new MediaStream([audioTrack]));
		source.connect(analyser);
		const data = new Uint8Array(analyser.frequencyBinCount);
		audioContextRef.current = audioContext;

		function tick() {
			analyser.getByteFrequencyData(data);
			const average = data.reduce((sum, value) => sum + value, 0) / data.length;
			setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
			animationFrameRef.current = window.requestAnimationFrame(tick);
		}
		tick();
	}

	function handleDeviceChange(kind: "video" | "audio", deviceId: string) {
		if (kind === "video") {
			setSelectedVideoDeviceId(deviceId);
			void requestCamera(deviceId, selectedAudioDeviceId);
		} else {
			setSelectedAudioDeviceId(deviceId);
			void requestCamera(selectedVideoDeviceId, deviceId);
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
			stopMicMeter();
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

	const cameraReady = Boolean(streamRef.current?.getVideoTracks?.().some((track) => track.readyState === "live"));
	const microphoneReady = Boolean(streamRef.current?.getAudioTracks?.().some((track) => track.readyState === "live"));

	return (
		<div className="video-recorder">
			<div className="device-check">
				<div>
					<p className="device-check-title">Camera and microphone check</p>
					<p className="device-check-hint">Choose your devices and confirm the level moves before recording.</p>
				</div>
				<div className="device-status-list">
					<span className={cameraReady ? "device-status ready" : "device-status"}>Camera ready</span>
					<span className={microphoneReady ? "device-status ready" : "device-status"}>Microphone ready</span>
				</div>
			</div>

			<div className="camera-frame">
				<video ref={videoRef} className="camera-preview" autoPlay muted playsInline />

				{phase === "requesting" && (
					<div className="camera-frame-overlay">
						<p>Requesting camera and microphone access...</p>
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

			{phase !== "recording" && (
				<div className="device-controls">
					<label>
						Camera
						<select
							value={selectedVideoDeviceId}
							onChange={(event) => handleDeviceChange("video", event.target.value)}
							disabled={phase === "requesting"}
						>
							{videoDevices.length === 0 && <option value="">Default camera</option>}
							{videoDevices.map((device, index) => (
								<option key={device.deviceId} value={device.deviceId}>
									{device.label || `Camera ${index + 1}`}
								</option>
							))}
						</select>
					</label>
					<label>
						Microphone
						<select
							value={selectedAudioDeviceId}
							onChange={(event) => handleDeviceChange("audio", event.target.value)}
							disabled={phase === "requesting"}
						>
							{audioDevices.length === 0 && <option value="">Default microphone</option>}
							{audioDevices.map((device, index) => (
								<option key={device.deviceId} value={device.deviceId}>
									{device.label || `Microphone ${index + 1}`}
								</option>
							))}
						</select>
					</label>
					<div className="mic-meter" aria-label="Microphone input level">
						<span style={{ width: `${micLevel}%` }} />
					</div>
				</div>
			)}

			{phase === "error" && (
				<>
					<div className="recorder-error">{errorMessage}</div>
					<button type="button" className="btn btn-primary" onClick={() => requestCamera()}>
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
