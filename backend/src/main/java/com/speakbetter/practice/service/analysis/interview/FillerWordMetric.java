package com.speakbetter.practice.service.analysis.interview;

import java.util.Map;

public record FillerWordMetric(
		MetricAvailability availability,
		Integer fillerWordCount,
		Double fillersPerMinute,
		Map<String, Integer> matches,
		String message) {
}
