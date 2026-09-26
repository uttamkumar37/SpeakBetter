package com.speakbetter.practice.service.analysis.interview;

import static org.assertj.core.api.Assertions.assertThat;

import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import org.junit.jupiter.api.Test;

class HeuristicInterviewAnalysisServiceTest {

	private final HeuristicInterviewAnalysisService service = new HeuristicInterviewAnalysisService();

	@Test
	void calculatesDurationBandsWithoutScoringQuality() {
		assertThat(analyze(null, 45, InterviewCategory.BEHAVIORAL).duration().band()).isEqualTo(DurationBand.BELOW_TARGET);
		assertThat(analyze(null, 90, InterviewCategory.BEHAVIORAL).duration().band()).isEqualTo(DurationBand.WITHIN_TARGET);
		assertThat(analyze(null, 240, InterviewCategory.BEHAVIORAL).duration().band()).isEqualTo(DurationBand.ABOVE_TARGET);
	}

	@Test
	void calculatesWordsPerMinuteFromTranscriptAndDuration() {
		AnalysisResult result = analyze("one two three four five six", 30, InterviewCategory.TECHNICAL);

		assertThat(result.pacing().availability()).isEqualTo(MetricAvailability.AVAILABLE);
		assertThat(result.pacing().wordCount()).isEqualTo(6);
		assertThat(result.pacing().wordsPerMinute()).isEqualTo(12);
	}

	@Test
	void detectsFillerWordsWithCaseInsensitiveExactWordMatching() {
		AnalysisResult result = analyze("Um, I was LIKE actually focused. Unlike this word should not count uh.", 60,
				InterviewCategory.BEHAVIORAL);

		assertThat(result.fillerWords().availability()).isEqualTo(MetricAvailability.AVAILABLE);
		assertThat(result.fillerWords().fillerWordCount()).isEqualTo(4);
		assertThat(result.fillerWords().fillersPerMinute()).isEqualTo(4.0);
		assertThat(result.fillerWords().matches()).containsEntry("um", 1).containsEntry("like", 1)
				.containsEntry("actually", 1).containsEntry("uh", 1);
	}

	@Test
	void detectsStarIndicatorsWithDocumentedKeywords() {
		AnalysisResult result = analyze(
				"The context was a release issue. My responsibility was API stability. I built a rollback plan. The outcome reduced incidents.",
				120,
				InterviewCategory.BEHAVIORAL);

		assertThat(result.responseStructure().availability()).isEqualTo(MetricAvailability.AVAILABLE);
		assertThat(result.responseStructure().situation()).isEqualTo(StarSectionStatus.DETECTED);
		assertThat(result.responseStructure().task()).isEqualTo(StarSectionStatus.DETECTED);
		assertThat(result.responseStructure().action()).isEqualTo(StarSectionStatus.DETECTED);
		assertThat(result.responseStructure().result()).isEqualTo(StarSectionStatus.DETECTED);
	}

	@Test
	void returnsTranscriptRequiredForMissingTranscript() {
		AnalysisResult result = analyze(null, 90, InterviewCategory.BEHAVIORAL);

		assertThat(result.pacing().availability()).isEqualTo(MetricAvailability.TRANSCRIPT_REQUIRED);
		assertThat(result.fillerWords().availability()).isEqualTo(MetricAvailability.TRANSCRIPT_REQUIRED);
		assertThat(result.responseStructure().availability()).isEqualTo(MetricAvailability.TRANSCRIPT_REQUIRED);
		assertThat(result.pacing().wordsPerMinute()).isNull();
	}

	@Test
	void returnsNotEnoughDataForEmptyTranscript() {
		AnalysisResult result = analyze("   ", 90, InterviewCategory.BEHAVIORAL);

		assertThat(result.pacing().availability()).isEqualTo(MetricAvailability.NOT_ENOUGH_DATA);
		assertThat(result.fillerWords().availability()).isEqualTo(MetricAvailability.NOT_ENOUGH_DATA);
		assertThat(result.responseStructure().availability()).isEqualTo(MetricAvailability.NOT_ENOUGH_DATA);
	}

	@Test
	void doesNotReportLongPauseMetricsWithoutRealAudioTimingData() {
		AnalysisResult result = analyze("I paused then continued.", 90, InterviewCategory.BEHAVIORAL);

		assertThat(result).hasNoNullFieldsOrPropertiesExcept();
		assertThat(result.pacing().message()).doesNotContainIgnoringCase("pause");
	}

	private AnalysisResult analyze(String transcript, Integer durationSeconds, InterviewCategory category) {
		return service.analyze(new InterviewAnalysisRequest(
				transcript,
				"Question",
				InterviewRole.BACKEND_ENGINEER,
				InterviewLevel.MID,
				category,
				durationSeconds,
				"recording-key"));
	}
}
