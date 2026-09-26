package com.speakbetter.practice.exception;

import com.speakbetter.practice.dto.ErrorResponse;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

/**
 * Translates internal exceptions into clean JSON error responses so the frontend
 * (and the person testing with curl) never sees a raw Java stack trace.
 */
@RestControllerAdvice
public class GlobalExceptionHandler {

	private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

	@ExceptionHandler(SessionNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleNotFound(SessionNotFoundException ex) {
		return build(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler({ InterviewQuestionNotFoundException.class, InterviewSessionNotFoundException.class })
	public ResponseEntity<ErrorResponse> handleInterviewNotFound(RuntimeException ex) {
		return build(HttpStatus.NOT_FOUND, ex.getMessage());
	}

	@ExceptionHandler(InvalidUploadException.class)
	public ResponseEntity<ErrorResponse> handleInvalidUpload(InvalidUploadException ex) {
		return build(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	@ExceptionHandler(InvalidInterviewSessionException.class)
	public ResponseEntity<ErrorResponse> handleInvalidInterviewSession(InvalidInterviewSessionException ex) {
		return build(HttpStatus.BAD_REQUEST, ex.getMessage());
	}

	@ExceptionHandler(MissingServletRequestParameterException.class)
	public ResponseEntity<ErrorResponse> handleMissingParameter(MissingServletRequestParameterException ex) {
		return build(HttpStatus.BAD_REQUEST, "Missing required field: " + ex.getParameterName());
	}

	@ExceptionHandler(MissingServletRequestPartException.class)
	public ResponseEntity<ErrorResponse> handleMissingPart(MissingServletRequestPartException ex) {
		return build(HttpStatus.BAD_REQUEST, "Missing required field: " + ex.getRequestPartName());
	}

	@ExceptionHandler(MethodArgumentTypeMismatchException.class)
	public ResponseEntity<ErrorResponse> handleTypeMismatch(MethodArgumentTypeMismatchException ex) {
		return build(HttpStatus.BAD_REQUEST, "Invalid value for field: " + ex.getName());
	}

	@ExceptionHandler(HttpMessageNotReadableException.class)
	public ResponseEntity<ErrorResponse> handleMalformedBody(HttpMessageNotReadableException ex) {
		return build(HttpStatus.BAD_REQUEST, "Malformed request body");
	}

	@ExceptionHandler(MaxUploadSizeExceededException.class)
	public ResponseEntity<ErrorResponse> handleTooLarge(MaxUploadSizeExceededException ex) {
		return build(HttpStatus.PAYLOAD_TOO_LARGE, "Recording exceeds the maximum allowed upload size");
	}

	@ExceptionHandler(StorageException.class)
	public ResponseEntity<ErrorResponse> handleStorage(StorageException ex) {
		log.error("Storage failure", ex);
		return build(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to access recording storage");
	}

	@ExceptionHandler(Exception.class)
	public ResponseEntity<ErrorResponse> handleUnexpected(Exception ex) {
		log.error("Unhandled exception", ex);
		return build(HttpStatus.INTERNAL_SERVER_ERROR, "Something went wrong. Please try again.");
	}

	private ResponseEntity<ErrorResponse> build(HttpStatus status, String message) {
		ErrorResponse body = new ErrorResponse(LocalDateTime.now(), status.value(), status.getReasonPhrase(), message);
		return ResponseEntity.status(status).body(body);
	}
}
