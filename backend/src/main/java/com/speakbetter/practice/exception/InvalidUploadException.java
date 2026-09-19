package com.speakbetter.practice.exception;

/**
 * Thrown when an uploaded recording fails validation (missing, too large, wrong
 * MIME type, blank topic, etc). Maps to HTTP 400.
 */
public class InvalidUploadException extends RuntimeException {

	public InvalidUploadException(String message) {
		super(message);
	}
}
