package com.speakbetter.practice.service.analysis.interview;

import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;

public record InterviewAnalysisRequest(
		String transcript,
		String question,
		InterviewRole role,
		InterviewLevel level,
		InterviewCategory category,
		Integer durationSeconds,
		String recordingReference) {
}
