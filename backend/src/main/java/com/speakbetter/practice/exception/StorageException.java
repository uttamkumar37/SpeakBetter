package com.speakbetter.practice.exception;

/**
 * Thrown when reading, writing, or deleting a recording file on disk fails
 * (I/O error, file missing when expected, resolved path outside the storage root).
 * Maps to HTTP 500 - these are server-side/environment problems, not user input errors.
 */
public class StorageException extends RuntimeException {

	public StorageException(String message) {
		super(message);
	}

	public StorageException(String message, Throwable cause) {
		super(message, cause);
	}
}
