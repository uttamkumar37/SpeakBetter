package com.speakbetter.practice.exception;

import java.util.UUID;

public class InterviewSessionNotFoundException extends RuntimeException {

	public InterviewSessionNotFoundException(UUID id) {
		super("Interview session not found: " + id);
	}
}
