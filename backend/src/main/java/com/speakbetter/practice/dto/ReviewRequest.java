package com.speakbetter.practice.dto;

/** Body for PUT /api/practice-sessions/{id}/review - every field is optional. */
public record ReviewRequest(
		String wentWell,
		String needsImprovement,
		Integer fillerWordCount,
		String notes) {
}
