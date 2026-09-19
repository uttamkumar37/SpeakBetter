import type { PracticeSession, ReviewInput } from "../types";
import { baseMimeType } from "../utils/mediaRecorder";

const API_BASE_URL = "http://localhost:8080";

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
	"video/webm": "webm",
	"video/mp4": "mp4",
	"video/ogg": "ogv",
};

/** Thrown for any failed API call, always carrying a message safe to show the user. */
export class ApiError extends Error {}

export async function createPracticeSession(
	topic: string,
	durationSeconds: number,
	blob: Blob,
	mimeType: string,
): Promise<PracticeSession> {
	const uploadType = baseMimeType(mimeType);
	const extension = EXTENSIONS_BY_MIME_TYPE[uploadType] ?? "webm";
	// The recorder's Blob.type includes codec params (e.g. "video/webm;codecs=vp9,opus"),
	// but the backend only accepts the bare MIME types it validates against.
	const uploadBlob = blob.type === uploadType ? blob : new Blob([blob], { type: uploadType });

	const formData = new FormData();
	formData.append("video", uploadBlob, `recording.${extension}`);
	formData.append("topic", topic);
	formData.append("durationSeconds", String(durationSeconds));

	const response = await request("/api/practice-sessions", { method: "POST", body: formData });
	return response.json();
}

export async function listPracticeSessions(): Promise<PracticeSession[]> {
	const response = await request("/api/practice-sessions");
	return response.json();
}

export async function deletePracticeSession(id: string): Promise<void> {
	await request(`/api/practice-sessions/${id}`, { method: "DELETE" });
}

export async function updateSessionReview(id: string, review: ReviewInput): Promise<PracticeSession> {
	const response = await request(`/api/practice-sessions/${id}/review`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(review),
	});
	return response.json();
}

export function videoUrlFor(session: PracticeSession): string {
	return `${API_BASE_URL}${session.videoUrl}`;
}

async function request(path: string, init?: RequestInit): Promise<Response> {
	let response: Response;
	try {
		response = await fetch(`${API_BASE_URL}${path}`, init);
	} catch {
		throw new ApiError("Could not reach the server. Make sure the backend is running.");
	}
	if (!response.ok) {
		throw new ApiError(await extractErrorMessage(response));
	}
	return response;
}

async function extractErrorMessage(response: Response): Promise<string> {
	try {
		const body = await response.json();
		if (typeof body?.message === "string") {
			return body.message;
		}
	} catch {
		// response body wasn't JSON - fall through to the generic message
	}
	return `Request failed (HTTP ${response.status}).`;
}
