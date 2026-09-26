package com.speakbetter.practice.service.analysis.interview;

public record PacingMetric(
		MetricAvailability availability,
		Integer wordCount,
		Integer wordsPerMinute,
		String message) {
}
