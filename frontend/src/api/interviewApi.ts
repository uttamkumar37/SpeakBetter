import type {
	CreateInterviewSessionInput,
	InterviewCategory,
	InterviewLevel,
	InterviewQuestion,
	InterviewRole,
	InterviewSession,
	ReviewInput,
} from "../types";
import { ApiError } from "./practiceSessionsApi";
import { baseMimeType } from "../utils/mediaRecorder";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

const EXTENSIONS_BY_MIME_TYPE: Record<string, string> = {
	"video/webm": "webm",
	"video/mp4": "mp4",
	"video/ogg": "ogv",
};

export async function listInterviewQuestions(filters: {
	role?: InterviewRole | "";
	level?: InterviewLevel | "";
	category?: InterviewCategory | "";
} = {}): Promise<InterviewQuestion[]> {
	const params = new URLSearchParams();
	if (filters.role) params.set("role", filters.role);
	if (filters.level) params.set("level", filters.level);
	if (filters.category) params.set("category", filters.category);
	const query = params.toString();
	const response = await request(`/api/interview-questions${query ? `?${query}` : ""}`);
	return response.json();
}

export async function createInterviewSession(input: CreateInterviewSessionInput): Promise<InterviewSession> {
	const response = await request("/api/interview-sessions", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	return response.json();
}

export async function uploadInterviewRecording(
	sessionId: string,
	durationSeconds: number,
	blob: Blob,
	mimeType: string,
): Promise<InterviewSession> {
	const uploadType = baseMimeType(mimeType);
	const extension = EXTENSIONS_BY_MIME_TYPE[uploadType] ?? "webm";
	const uploadBlob = blob.type === uploadType ? blob : new Blob([blob], { type: uploadType });

	const formData = new FormData();
	formData.append("video", uploadBlob, `interview-recording.${extension}`);
	formData.append("durationSeconds", String(durationSeconds));

	const response = await request(`/api/interview-sessions/${sessionId}/recording`, { method: "POST", body: formData });
	return response.json();
}

export async function listInterviewSessions(filters: {
	role?: InterviewRole | "";
	level?: InterviewLevel | "";
	category?: InterviewCategory | "";
	questionId?: string;
} = {}): Promise<InterviewSession[]> {
	const params = new URLSearchParams();
	if (filters.role) params.set("role", filters.role);
	if (filters.level) params.set("level", filters.level);
	if (filters.category) params.set("category", filters.category);
	if (filters.questionId) params.set("questionId", filters.questionId);
	const query = params.toString();
	const response = await request(`/api/interview-sessions${query ? `?${query}` : ""}`);
	return response.json();
}

export async function getInterviewSession(id: string): Promise<InterviewSession> {
	const response = await request(`/api/interview-sessions/${id}`);
	return response.json();
}

export async function updateInterviewReview(id: string, review: ReviewInput): Promise<InterviewSession> {
	const response = await request(`/api/interview-sessions/${id}/review`, {
		method: "PUT",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(review),
	});
	return response.json();
}

export async function deleteInterviewSession(id: string): Promise<void> {
	await request(`/api/interview-sessions/${id}`, { method: "DELETE" });
}

export function interviewVideoUrlFor(session: InterviewSession): string | null {
	return session.videoUrl ? `${API_BASE_URL}${session.videoUrl}` : null;
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
		// response body was not JSON
	}
	return `Request failed (HTTP ${response.status}).`;
}
