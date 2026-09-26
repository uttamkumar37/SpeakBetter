package com.speakbetter.practice.service.analysis.interview;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class DisabledInterviewAiAnalysisProvider implements InterviewAiAnalysisProvider {

	@Override
	public AiInterviewAnalysis analyze(AiInterviewAnalysisRequest request) {
		return new AiInterviewAnalysis(
				ProviderResultStatus.DISABLED,
				null,
				List.of(),
				List.of(),
				null,
				null,
				null,
				null,
				"AI analysis is not configured");
	}
}
