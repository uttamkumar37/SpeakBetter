package com.speakbetter.practice.service.analysis.interview;

import org.springframework.stereotype.Service;

@Service
public class DisabledInterviewTranscriptionProvider implements InterviewTranscriptionProvider {

	@Override
	public TranscriptionResult transcribe(TranscriptionRequest request) {
		return new TranscriptionResult(ProviderResultStatus.DISABLED, null, "Transcription provider is not configured");
	}
}
