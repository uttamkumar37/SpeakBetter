package com.speakbetter.practice.service.analysis;

import java.nio.file.Path;

/**
 * Future extension point: turns a recording's audio into text. No implementation
 * or Spring bean exists yet - V1 works entirely without this. Implement against a
 * real speech-to-text provider later and register it as a @Service.
 */
public interface TranscriptionService {

	Transcript transcribe(Path videoFile);
}
