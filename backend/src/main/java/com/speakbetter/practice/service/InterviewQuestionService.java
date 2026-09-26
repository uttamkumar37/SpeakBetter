package com.speakbetter.practice.service;

import com.speakbetter.practice.dto.InterviewQuestionResponse;
import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import com.speakbetter.practice.exception.InterviewQuestionNotFoundException;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class InterviewQuestionService {

	private final InterviewQuestionCatalog catalog;

	public InterviewQuestionService(InterviewQuestionCatalog catalog) {
		this.catalog = catalog;
	}

	public List<InterviewQuestionResponse> listQuestions(InterviewRole role, InterviewLevel level, InterviewCategory category) {
		return catalog.findQuestions(role, level, category).stream()
				.map(InterviewQuestionResponse::from)
				.toList();
	}

	public InterviewQuestionResponse getQuestion(String id) {
		return InterviewQuestionResponse.from(catalog.findById(id)
				.orElseThrow(() -> new InterviewQuestionNotFoundException(id)));
	}
}
