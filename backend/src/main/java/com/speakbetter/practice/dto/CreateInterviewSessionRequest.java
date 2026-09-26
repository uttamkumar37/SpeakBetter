package com.speakbetter.practice.dto;

import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;

public record CreateInterviewSessionRequest(
		InterviewRole role,
		InterviewLevel level,
		InterviewCategory category,
		String questionId) {
}
