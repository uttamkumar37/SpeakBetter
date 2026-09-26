package com.speakbetter.practice.service.analysis.interview;

public record TranscriptionResult(ProviderResultStatus status, String transcript, String message) {
}
