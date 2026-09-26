package com.speakbetter.practice.controller;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.speakbetter.practice.dto.CreateInterviewSessionRequest;
import com.speakbetter.practice.dto.InterviewQuestionResponse;
import com.speakbetter.practice.dto.InterviewSessionResponse;
import com.speakbetter.practice.entity.AnalysisStatus;
import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import com.speakbetter.practice.entity.InterviewSessionStatus;
import com.speakbetter.practice.entity.TranscriptStatus;
import com.speakbetter.practice.service.analysis.interview.AnalysisResult;
import com.speakbetter.practice.service.analysis.interview.DurationBand;
import com.speakbetter.practice.service.analysis.interview.DurationMetric;
import com.speakbetter.practice.service.analysis.interview.FillerWordMetric;
import com.speakbetter.practice.service.analysis.interview.MetricAvailability;
import com.speakbetter.practice.service.analysis.interview.PacingMetric;
import com.speakbetter.practice.service.analysis.interview.StarSectionStatus;
import com.speakbetter.practice.service.analysis.interview.StarStructureMetric;
import com.speakbetter.practice.service.InterviewSessionService;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(InterviewSessionController.class)
class InterviewSessionControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private InterviewSessionService sessionService;

	@Test
	void createSessionReturns201() throws Exception {
		UUID id = UUID.randomUUID();
		when(sessionService.createSession(any(CreateInterviewSessionRequest.class))).thenReturn(response(id));

		mockMvc.perform(post("/api/interview-sessions")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "role": "BACKEND_ENGINEER",
								  "level": "MID",
								  "category": "TECHNICAL",
								  "questionId": "technical-backend-mid-api"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.id").value(id.toString()))
				.andExpect(jsonPath("$.status").value("CREATED"))
				.andExpect(jsonPath("$.analysisStatus").value("NOT_CONFIGURED"))
				.andExpect(jsonPath("$.metrics.duration.availability").value("NOT_ENOUGH_DATA"));
	}

	@Test
	void malformedSessionIdReturnsClean400() throws Exception {
		mockMvc.perform(get("/api/interview-sessions/not-a-uuid"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Invalid value for field: id"));
	}

	private InterviewSessionResponse response(UUID id) {
		LocalDateTime now = LocalDateTime.now();
		InterviewQuestionResponse question = new InterviewQuestionResponse(
				"technical-backend-mid-api",
				InterviewRole.BACKEND_ENGINEER,
				InterviewLevel.MID,
				InterviewCategory.TECHNICAL,
				"How would you design an API endpoint?",
				"Discuss API shape.",
				List.of("Requirements", "API shape"));
		return new InterviewSessionResponse(
				id,
				InterviewRole.BACKEND_ENGINEER,
				InterviewLevel.MID,
				InterviewCategory.TECHNICAL,
				question,
				InterviewSessionStatus.CREATED,
				TranscriptStatus.NOT_CONFIGURED,
				null,
				AnalysisStatus.NOT_CONFIGURED,
				null,
				new AnalysisResult(
						new DurationMetric(MetricAvailability.NOT_ENOUGH_DATA, null, 120, 300, DurationBand.NOT_AVAILABLE, "Not enough data"),
						new PacingMetric(MetricAvailability.TRANSCRIPT_REQUIRED, null, null, "Transcript required for pacing analysis"),
						new FillerWordMetric(MetricAvailability.TRANSCRIPT_REQUIRED, null, null, java.util.Map.of(), "Transcript required for filler-word analysis"),
						new StarStructureMetric(MetricAvailability.TRANSCRIPT_REQUIRED, StarSectionStatus.UNABLE_TO_DETERMINE,
								StarSectionStatus.UNABLE_TO_DETERMINE, StarSectionStatus.UNABLE_TO_DETERMINE,
								StarSectionStatus.UNABLE_TO_DETERMINE, "Transcript required for response-structure analysis")),
				null,
				null,
				now,
				now,
				now.plusDays(30),
				null,
				null,
				null,
				null,
				null);
	}
}
