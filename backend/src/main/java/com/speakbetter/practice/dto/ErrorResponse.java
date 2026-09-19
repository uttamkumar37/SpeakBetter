package com.speakbetter.practice.dto;

import java.time.LocalDateTime;

/** Uniform JSON error body so the frontend never has to parse a raw stack trace. */
public record ErrorResponse(LocalDateTime timestamp, int status, String error, String message) {
}
