package com.speakbetter.practice.service;

import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import java.util.List;

public record InterviewQuestion(
		String id,
		InterviewRole role,
		InterviewLevel level,
		InterviewCategory category,
		String questionText,
		String guidance,
		List<String> expectedResponseStructure,
		boolean active) {
}
