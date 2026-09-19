package com.speakbetter.practice.exception;

import java.util.UUID;

public class SessionNotFoundException extends RuntimeException {

	public SessionNotFoundException(UUID id) {
		super("Practice session not found: " + id);
	}
}
