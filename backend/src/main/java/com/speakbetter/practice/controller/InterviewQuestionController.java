package com.speakbetter.practice.controller;

import com.speakbetter.practice.dto.InterviewQuestionResponse;
import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import com.speakbetter.practice.service.InterviewQuestionService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/interview-questions")
public class InterviewQuestionController {

	private final InterviewQuestionService questionService;

	public InterviewQuestionController(InterviewQuestionService questionService) {
		this.questionService = questionService;
	}

	@GetMapping
	public List<InterviewQuestionResponse> list(
			@RequestParam(required = false) InterviewRole role,
			@RequestParam(required = false) InterviewLevel level,
			@RequestParam(required = false) InterviewCategory category) {
		return questionService.listQuestions(role, level, category);
	}

	@GetMapping("/{id}")
	public InterviewQuestionResponse get(@PathVariable String id) {
		return questionService.getQuestion(id);
	}
}
