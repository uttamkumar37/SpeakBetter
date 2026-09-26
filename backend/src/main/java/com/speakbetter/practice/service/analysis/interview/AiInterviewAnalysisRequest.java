package com.speakbetter.practice.service.analysis.interview;

import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;

public record AiInterviewAnalysisRequest(
		String question,
		InterviewRole role,
		InterviewLevel level,
		InterviewCategory category,
		String transcript,
		Integer durationSeconds,
		AnalysisResult deterministicMetrics) {
}
