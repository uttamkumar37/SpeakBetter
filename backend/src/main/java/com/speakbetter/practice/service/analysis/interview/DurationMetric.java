package com.speakbetter.practice.service.analysis.interview;

public record DurationMetric(
		MetricAvailability availability,
		Integer actualSeconds,
		int targetMinSeconds,
		int targetMaxSeconds,
		DurationBand band,
		String message) {
}
