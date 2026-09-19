const CANDIDATE_MIME_TYPES = [
	"video/webm;codecs=vp9,opus",
	"video/webm;codecs=vp8,opus",
	"video/webm",
	"video/mp4",
];

export function isMediaRecorderSupported(): boolean {
	return typeof window !== "undefined" && Boolean(window.MediaRecorder);
}

/** Returns the first MIME type this browser's MediaRecorder actually supports, or null. */
export function pickSupportedMimeType(): string | null {
	if (!isMediaRecorderSupported()) {
		return null;
	}
	return CANDIDATE_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) ?? null;
}

/** Strips codec parameters (e.g. "video/webm;codecs=vp9,opus" -> "video/webm") for backend upload. */
export function baseMimeType(mimeType: string): string {
	return mimeType.split(";")[0];
}

export function formatDuration(totalSeconds: number): string {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function describeMediaError(error: unknown): string {
	if (error instanceof DOMException) {
		switch (error.name) {
			case "NotAllowedError":
			case "PermissionDeniedError":
				return "Camera and microphone access was denied. Please allow access in your browser settings and try again.";
			case "NotFoundError":
			case "DevicesNotFoundError":
				return "No camera or microphone was found on this device.";
			case "NotReadableError":
				return "Your camera or microphone is already in use by another application.";
			default:
				return `Unable to access camera and microphone (${error.name}).`;
		}
	}
	if (error instanceof Error) {
		return `Unable to access camera and microphone: ${error.message}`;
	}
	return "Unable to access camera and microphone.";
}
