package com.speakbetter.practice.service.analysis.interview;

import java.time.LocalDateTime;
import java.util.List;

public record AiInterviewAnalysis(
		ProviderResultStatus status,
		String summary,
		List<String> strengths,
		List<String> improvementAreas,
		String nextPracticeGoal,
		String providerName,
		String modelName,
		LocalDateTime analyzedAt,
		String message) {
}
