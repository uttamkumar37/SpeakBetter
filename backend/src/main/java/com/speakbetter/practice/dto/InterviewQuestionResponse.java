package com.speakbetter.practice.dto;

import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import com.speakbetter.practice.service.InterviewQuestion;
import java.util.List;

public record InterviewQuestionResponse(
		String id,
		InterviewRole role,
		InterviewLevel level,
		InterviewCategory category,
		String questionText,
		String guidance,
		List<String> expectedResponseStructure) {

	public static InterviewQuestionResponse from(InterviewQuestion question) {
		return new InterviewQuestionResponse(
				question.id(),
				question.role(),
				question.level(),
				question.category(),
				question.questionText(),
				question.guidance(),
				question.expectedResponseStructure());
	}
}
