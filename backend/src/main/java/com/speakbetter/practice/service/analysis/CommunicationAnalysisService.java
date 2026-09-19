package com.speakbetter.practice.service.analysis;

/**
 * Future extension point: turns a Transcript into communication feedback (words
 * per minute, filler words, repeated words, long pauses, grammar suggestions,
 * clarity feedback, a concise rewrite, comparison against earlier attempts). No
 * implementation or Spring bean exists yet - in V1 this data is entered manually
 * by the person reviewing their own recording (see ReviewRequest). Implement
 * against a real analysis/LLM provider later and register it as a @Service.
 */
public interface CommunicationAnalysisService {

	CommunicationAnalysis analyze(Transcript transcript);
}
