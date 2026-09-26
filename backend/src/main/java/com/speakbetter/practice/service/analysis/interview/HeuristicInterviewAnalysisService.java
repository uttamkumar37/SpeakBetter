package com.speakbetter.practice.service.analysis.interview;

import com.speakbetter.practice.entity.InterviewCategory;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

/**
 * Deterministic interview metrics from stored duration and transcript text.
 * This is not AI analysis and never estimates transcript-dependent metrics when
 * transcript text is missing.
 */
@Service
public class HeuristicInterviewAnalysisService implements InterviewAnalysisService {

	private static final Pattern WORD_PATTERN = Pattern.compile("[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?");
	private static final List<String> FILLERS = List.of("um", "uh", "erm", "like", "actually", "basically", "literally");
	private static final List<String> SITUATION_INDICATORS = List.of("situation", "context", "when", "at the time", "background");
	private static final List<String> TASK_INDICATORS = List.of("task", "responsibility", "goal", "needed to", "my role");
	private static final List<String> ACTION_INDICATORS = List.of("action", "i did", "i built", "i led", "i worked", "i decided");
	private static final List<String> RESULT_INDICATORS = List.of("result", "outcome", "impact", "learned", "improved", "reduced", "increased");

	@Override
	public AnalysisResult analyze(InterviewAnalysisRequest request) {
		TargetDuration target = targetDuration(request.category());
		String transcript = request.transcript();
		boolean missingTranscript = transcript == null;
		boolean blankTranscript = transcript != null && transcript.isBlank();

		return new AnalysisResult(
				durationMetric(request.durationSeconds(), target),
				pacingMetric(transcript, request.durationSeconds(), missingTranscript, blankTranscript),
				fillerMetric(transcript, request.durationSeconds(), missingTranscript, blankTranscript),
				starMetric(transcript, missingTranscript, blankTranscript));
	}

	private DurationMetric durationMetric(Integer durationSeconds, TargetDuration target) {
		if (durationSeconds == null) {
			return new DurationMetric(MetricAvailability.NOT_ENOUGH_DATA, null, target.minSeconds(), target.maxSeconds(),
					DurationBand.NOT_AVAILABLE, "Not enough data");
		}
		DurationBand band;
		String message;
		if (durationSeconds < target.minSeconds()) {
			band = DurationBand.BELOW_TARGET;
			message = "Your answer duration is below the selected target.";
		} else if (durationSeconds > target.maxSeconds()) {
			band = DurationBand.ABOVE_TARGET;
			message = "Your answer duration is longer than the selected target. Consider making the context more concise.";
		} else {
			band = DurationBand.WITHIN_TARGET;
			message = "Your answer duration is within the selected target range.";
		}
		return new DurationMetric(MetricAvailability.AVAILABLE, durationSeconds, target.minSeconds(), target.maxSeconds(), band, message);
	}

	private PacingMetric pacingMetric(String transcript, Integer durationSeconds, boolean missingTranscript, boolean blankTranscript) {
		if (missingTranscript) {
			return new PacingMetric(MetricAvailability.TRANSCRIPT_REQUIRED, null, null,
					"Transcript required for pacing analysis");
		}
		int wordCount = wordCount(transcript);
		if (blankTranscript || wordCount == 0 || durationSeconds == null || durationSeconds <= 0) {
			return new PacingMetric(MetricAvailability.NOT_ENOUGH_DATA, wordCount, null, "Not enough data");
		}
		int wpm = (int) Math.round(wordCount / (durationSeconds / 60.0));
		return new PacingMetric(MetricAvailability.AVAILABLE, wordCount, wpm, "Words per minute calculated from transcript word count and recording duration.");
	}

	private FillerWordMetric fillerMetric(String transcript, Integer durationSeconds, boolean missingTranscript, boolean blankTranscript) {
		if (missingTranscript) {
			return new FillerWordMetric(MetricAvailability.TRANSCRIPT_REQUIRED, null, null, Map.of(),
					"Transcript required for filler-word analysis");
		}
		if (blankTranscript) {
			return new FillerWordMetric(MetricAvailability.NOT_ENOUGH_DATA, 0, null, Map.of(), "Not enough data");
		}
		Map<String, Integer> matches = fillerMatches(transcript);
		int count = matches.values().stream().mapToInt(Integer::intValue).sum();
		Double perMinute = durationSeconds == null || durationSeconds <= 0 ? null : count / (durationSeconds / 60.0);
		return new FillerWordMetric(MetricAvailability.AVAILABLE, count, perMinute, matches,
				"Filler count is detected with case-insensitive exact word matching.");
	}

	private StarStructureMetric starMetric(String transcript, boolean missingTranscript, boolean blankTranscript) {
		if (missingTranscript) {
			return new StarStructureMetric(MetricAvailability.TRANSCRIPT_REQUIRED, StarSectionStatus.UNABLE_TO_DETERMINE,
					StarSectionStatus.UNABLE_TO_DETERMINE, StarSectionStatus.UNABLE_TO_DETERMINE,
					StarSectionStatus.UNABLE_TO_DETERMINE, "Transcript required for response-structure analysis");
		}
		if (blankTranscript) {
			return new StarStructureMetric(MetricAvailability.NOT_ENOUGH_DATA, StarSectionStatus.UNABLE_TO_DETERMINE,
					StarSectionStatus.UNABLE_TO_DETERMINE, StarSectionStatus.UNABLE_TO_DETERMINE,
					StarSectionStatus.UNABLE_TO_DETERMINE, "Not enough data");
		}
		String normalized = transcript.toLowerCase(Locale.ROOT);
		return new StarStructureMetric(MetricAvailability.AVAILABLE,
				statusFor(normalized, SITUATION_INDICATORS),
				statusFor(normalized, TASK_INDICATORS),
				statusFor(normalized, ACTION_INDICATORS),
				statusFor(normalized, RESULT_INDICATORS),
				"STAR indicators are detected with documented keyword heuristics.");
	}

	private int wordCount(String transcript) {
		int count = 0;
		var matcher = WORD_PATTERN.matcher(transcript);
		while (matcher.find()) {
			count++;
		}
		return count;
	}

	private Map<String, Integer> fillerMatches(String transcript) {
		Map<String, Integer> matches = new LinkedHashMap<>();
		String normalized = transcript.toLowerCase(Locale.ROOT);
		for (String filler : FILLERS) {
			var matcher = Pattern.compile("\\b" + Pattern.quote(filler) + "\\b").matcher(normalized);
			int count = 0;
			while (matcher.find()) {
				count++;
			}
			if (count > 0) {
				matches.put(filler, count);
			}
		}
		return matches;
	}

	private StarSectionStatus statusFor(String normalizedTranscript, List<String> indicators) {
		return indicators.stream().anyMatch(normalizedTranscript::contains)
				? StarSectionStatus.DETECTED
				: StarSectionStatus.NOT_DETECTED;
	}

	private TargetDuration targetDuration(InterviewCategory category) {
		return switch (category) {
			case SYSTEM_DESIGN -> new TargetDuration(180, 420);
			case TECHNICAL -> new TargetDuration(120, 300);
			case LEADERSHIP -> new TargetDuration(120, 240);
			default -> new TargetDuration(60, 180);
		};
	}

	private record TargetDuration(int minSeconds, int maxSeconds) {
	}
}
