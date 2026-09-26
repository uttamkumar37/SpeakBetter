package com.speakbetter.practice.exception;

public class InterviewQuestionNotFoundException extends RuntimeException {

	public InterviewQuestionNotFoundException(String id) {
		super("Interview question not found: " + id);
	}
}
