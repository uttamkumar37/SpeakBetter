package com.speakbetter.practice.service.analysis.interview;

public record StarStructureMetric(
		MetricAvailability availability,
		StarSectionStatus situation,
		StarSectionStatus task,
		StarSectionStatus action,
		StarSectionStatus result,
		String message) {
}
