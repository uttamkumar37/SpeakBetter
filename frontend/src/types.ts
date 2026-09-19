export interface RecordingResult {
	blob: Blob;
	mimeType: string;
	durationSeconds: number;
}

export interface PracticeSession {
	id: string;
	topic: string;
	createdAt: string;
	durationSeconds: number;
	expiresAt: string;
	videoUrl: string;
	wentWell: string | null;
	needsImprovement: string | null;
	fillerWordCount: number | null;
	notes: string | null;
}

export interface ReviewInput {
	wentWell: string | null;
	needsImprovement: string | null;
	fillerWordCount: number | null;
	notes: string | null;
}
