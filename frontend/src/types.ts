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

export type InterviewRole =
	| "BACKEND_ENGINEER"
	| "FRONTEND_ENGINEER"
	| "FULL_STACK_ENGINEER"
	| "PRODUCT_MANAGER"
	| "DATA_ANALYST"
	| "GENERAL";

export type InterviewLevel = "ENTRY" | "JUNIOR" | "MID" | "SENIOR" | "LEAD";

export type InterviewCategory =
	| "BEHAVIORAL"
	| "TECHNICAL"
	| "SITUATIONAL"
	| "SYSTEM_DESIGN"
	| "COMMUNICATION"
	| "LEADERSHIP"
	| "ROLE_SPECIFIC";

export interface InterviewQuestion {
	id: string;
	role: InterviewRole;
	level: InterviewLevel;
	category: InterviewCategory;
	questionText: string;
	guidance: string;
	expectedResponseStructure: string[];
}

export interface CreateInterviewSessionInput {
	role: InterviewRole;
	level: InterviewLevel;
	category: InterviewCategory;
	questionId: string;
}

export type MetricAvailability = "AVAILABLE" | "NOT_ENOUGH_DATA" | "TRANSCRIPT_REQUIRED";
export type DurationBand = "BELOW_TARGET" | "WITHIN_TARGET" | "ABOVE_TARGET" | "NOT_AVAILABLE";
export type StarSectionStatus = "DETECTED" | "NOT_DETECTED" | "UNABLE_TO_DETERMINE";

export interface InterviewMetrics {
	duration: {
		availability: MetricAvailability;
		actualSeconds: number | null;
		targetMinSeconds: number;
		targetMaxSeconds: number;
		band: DurationBand;
		message: string;
	};
	pacing: {
		availability: MetricAvailability;
		wordCount: number | null;
		wordsPerMinute: number | null;
		message: string;
	};
	fillerWords: {
		availability: MetricAvailability;
		fillerWordCount: number | null;
		fillersPerMinute: number | null;
		matches: Record<string, number>;
		message: string;
	};
	responseStructure: {
		availability: MetricAvailability;
		situation: StarSectionStatus;
		task: StarSectionStatus;
		action: StarSectionStatus;
		result: StarSectionStatus;
		message: string;
	};
}

export interface InterviewSession {
	id: string;
	role: InterviewRole;
	level: InterviewLevel;
	category: InterviewCategory;
	question: InterviewQuestion;
	status: "CREATED" | "RECORDING_SAVED" | "READY" | "FAILED" | "DELETED";
	transcriptStatus: "NOT_CONFIGURED" | "PENDING" | "READY" | "FAILED";
	transcript: string | null;
	analysisStatus: "NOT_CONFIGURED" | "PENDING" | "READY" | "FAILED";
	analysisResult: string | null;
	metrics: InterviewMetrics;
	durationSeconds: number | null;
	fileSizeBytes: number | null;
	createdAt: string;
	updatedAt: string;
	expiresAt: string;
	videoUrl: string | null;
	wentWell: string | null;
	needsImprovement: string | null;
	fillerWordCount: number | null;
	notes: string | null;
}
