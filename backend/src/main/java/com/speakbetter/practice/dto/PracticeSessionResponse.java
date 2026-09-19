package com.speakbetter.practice.dto;

import java.time.LocalDateTime;
import java.util.UUID;

public record PracticeSessionResponse(
		UUID id,
		String topic,
		LocalDateTime createdAt,
		int durationSeconds,
		LocalDateTime expiresAt,
		String videoUrl,
		String wentWell,
		String needsImprovement,
		Integer fillerWordCount,
		String notes) {
}
