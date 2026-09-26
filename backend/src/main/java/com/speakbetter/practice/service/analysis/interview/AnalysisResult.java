package com.speakbetter.practice.service.analysis.interview;

public record AnalysisResult(
		DurationMetric duration,
		PacingMetric pacing,
		FillerWordMetric fillerWords,
		StarStructureMetric responseStructure) {
}
