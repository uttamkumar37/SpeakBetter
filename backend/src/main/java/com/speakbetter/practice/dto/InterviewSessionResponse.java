package com.speakbetter.practice.dto;

import com.speakbetter.practice.entity.AnalysisStatus;
import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import com.speakbetter.practice.entity.InterviewSessionStatus;
import com.speakbetter.practice.entity.TranscriptStatus;
import com.speakbetter.practice.service.analysis.interview.AnalysisResult;
import java.time.LocalDateTime;
import java.util.UUID;

public record InterviewSessionResponse(
		UUID id,
		InterviewRole role,
		InterviewLevel level,
		InterviewCategory category,
		InterviewQuestionResponse question,
		InterviewSessionStatus status,
		TranscriptStatus transcriptStatus,
		String transcript,
		AnalysisStatus analysisStatus,
		String analysisResult,
		AnalysisResult metrics,
		Integer durationSeconds,
		Long fileSizeBytes,
		LocalDateTime createdAt,
		LocalDateTime updatedAt,
		LocalDateTime expiresAt,
		String videoUrl,
		String wentWell,
		String needsImprovement,
		Integer fillerWordCount,
		String notes) {
}
