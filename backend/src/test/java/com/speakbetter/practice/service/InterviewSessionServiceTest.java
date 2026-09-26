package com.speakbetter.practice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.speakbetter.practice.config.RecordingProperties;
import com.speakbetter.practice.dto.CreateInterviewSessionRequest;
import com.speakbetter.practice.dto.InterviewSessionResponse;
import com.speakbetter.practice.dto.ReviewRequest;
import com.speakbetter.practice.entity.AnalysisStatus;
import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import com.speakbetter.practice.entity.InterviewSession;
import com.speakbetter.practice.entity.InterviewSessionStatus;
import com.speakbetter.practice.entity.TranscriptStatus;
import com.speakbetter.practice.exception.InvalidInterviewSessionException;
import com.speakbetter.practice.exception.InvalidUploadException;
import com.speakbetter.practice.repository.InterviewSessionRepository;
import com.speakbetter.practice.service.analysis.interview.DurationBand;
import com.speakbetter.practice.service.analysis.interview.HeuristicInterviewAnalysisService;
import com.speakbetter.practice.service.analysis.interview.MetricAvailability;
import com.speakbetter.practice.service.storage.RecordingStorage;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class InterviewSessionServiceTest {

	@Mock
	private InterviewSessionRepository repository;

	@Mock
	private RecordingStorage storageService;

	private InterviewSessionService service;
	private RecordingProperties properties;

	@BeforeEach
	void setUp() {
		properties = new RecordingProperties();
		properties.setRetentionDays(30);
		properties.setMaxUploadSizeBytes(1024L * 1024);
		properties.setAllowedMimeTypes(List.of("video/webm", "video/mp4", "video/ogg"));
		service = new InterviewSessionService(repository, new InterviewQuestionCatalog(), storageService, properties,
				new HeuristicInterviewAnalysisService());
	}

	@Test
	void createSessionStoresQuestionSnapshotAndDefaultUnavailableStatuses() {
		InterviewSessionResponse response = service.createSession(new CreateInterviewSessionRequest(
				InterviewRole.BACKEND_ENGINEER,
				InterviewLevel.MID,
				InterviewCategory.BEHAVIORAL,
				"behavioral-general-mid-conflict"));

		assertThat(response.status()).isEqualTo(InterviewSessionStatus.CREATED);
		assertThat(response.transcriptStatus()).isEqualTo(TranscriptStatus.NOT_CONFIGURED);
		assertThat(response.analysisStatus()).isEqualTo(AnalysisStatus.NOT_CONFIGURED);
		assertThat(response.videoUrl()).isNull();
		assertThat(response.metrics().duration().availability()).isEqualTo(MetricAvailability.NOT_ENOUGH_DATA);
		assertThat(response.metrics().pacing().availability()).isEqualTo(MetricAvailability.TRANSCRIPT_REQUIRED);
		assertThat(response.question().questionText()).contains("disagreed with a teammate");
		assertThat(Duration.between(response.createdAt(), response.expiresAt()).toDays()).isEqualTo(30);
		verify(repository).save(any(InterviewSession.class));
		verifyNoInteractions(storageService);
	}

	@Test
	void createSessionRejectsQuestionThatDoesNotMatchSelectedLevel() {
		CreateInterviewSessionRequest request = new CreateInterviewSessionRequest(
				InterviewRole.BACKEND_ENGINEER,
				InterviewLevel.SENIOR,
				InterviewCategory.BEHAVIORAL,
				"behavioral-general-mid-conflict");

		assertThatThrownBy(() -> service.createSession(request))
				.isInstanceOf(InvalidInterviewSessionException.class)
				.hasMessageContaining("level");
	}

	@Test
	void uploadRecordingStoresMediaAndMarksSessionReady() {
		UUID id = UUID.randomUUID();
		InterviewSession session = createdSession(id);
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", "hello".getBytes());
		when(repository.findById(id)).thenReturn(Optional.of(session));
		when(storageService.store(eq(file), any())).thenReturn(new StoredFile("2026/09/clip.webm", 5L));

		InterviewSessionResponse response = service.uploadRecording(id, file, 62);

		assertThat(response.status()).isEqualTo(InterviewSessionStatus.READY);
		assertThat(response.durationSeconds()).isEqualTo(62);
		assertThat(response.metrics().duration().band()).isEqualTo(DurationBand.WITHIN_TARGET);
		assertThat(response.fileSizeBytes()).isEqualTo(5L);
		assertThat(response.videoUrl()).isEqualTo("/api/interview-sessions/" + id + "/video");
		verify(repository).save(session);
	}

	@Test
	void uploadRecordingRejectsUnsupportedMediaTypes() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.of(createdSession(id)));
		MockMultipartFile file = new MockMultipartFile("video", "clip.mov", "video/quicktime", "x".getBytes());

		assertThatThrownBy(() -> service.uploadRecording(id, file, 1)).isInstanceOf(InvalidUploadException.class);
		verifyNoInteractions(storageService);
	}

	@Test
	void uploadRecordingRejectsOversizedFiles() {
		properties.setMaxUploadSizeBytes(1L);
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.of(createdSession(id)));
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", "xx".getBytes());

		assertThatThrownBy(() -> service.uploadRecording(id, file, 1)).isInstanceOf(InvalidUploadException.class);
		verifyNoInteractions(storageService);
	}

	@Test
	void uploadRecordingRejectsInvalidStatusTransition() {
		UUID id = UUID.randomUUID();
		InterviewSession session = createdSession(id);
		session.setStatus(InterviewSessionStatus.READY);
		when(repository.findById(id)).thenReturn(Optional.of(session));
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", "x".getBytes());

		assertThatThrownBy(() -> service.uploadRecording(id, file, 1)).isInstanceOf(InvalidInterviewSessionException.class);
		verifyNoInteractions(storageService);
	}

	@Test
	void listSessionsAppliesOptionalFiltersNewestFirst() {
		InterviewSession older = createdSession(UUID.randomUUID(), InterviewRole.GENERAL, InterviewLevel.ENTRY,
				InterviewCategory.BEHAVIORAL, "behavioral-general-entry-ownership", LocalDateTime.now().minusDays(2));
		InterviewSession newer = createdSession(UUID.randomUUID(), InterviewRole.BACKEND_ENGINEER, InterviewLevel.MID,
				InterviewCategory.TECHNICAL, "technical-backend-mid-api", LocalDateTime.now());
		when(repository.findAll()).thenReturn(List.of(older, newer));

		List<InterviewSessionResponse> responses = service.listSessions(InterviewRole.BACKEND_ENGINEER, null, null, null);

		assertThat(responses).extracting(InterviewSessionResponse::id).containsExactly(newer.getId());
	}

	@Test
	void updateReviewTrimsTextAndRejectsNegativeFillerCount() {
		UUID id = UUID.randomUUID();
		InterviewSession session = createdSession(id);
		when(repository.findById(id)).thenReturn(Optional.of(session));

		InterviewSessionResponse response = service.updateReview(id, new ReviewRequest("  good  ", "  ", 3, " notes "));

		assertThat(response.wentWell()).isEqualTo("good");
		assertThat(response.needsImprovement()).isNull();
		assertThat(response.fillerWordCount()).isEqualTo(3);
		assertThat(response.notes()).isEqualTo("notes");

		assertThatThrownBy(() -> service.updateReview(id, new ReviewRequest(null, null, -1, null)))
				.isInstanceOf(InvalidUploadException.class);
	}

	@Test
	void deleteSessionRemovesMediaWhenPresent() {
		UUID id = UUID.randomUUID();
		InterviewSession session = createdSession(id);
		session.setFileMetadata("2026/09/clip.webm", "video/webm", 1, 1);
		when(repository.findById(id)).thenReturn(Optional.of(session));

		service.deleteSession(id);

		verify(storageService).delete("2026/09/clip.webm");
		verify(repository).delete(session);
	}

	@Test
	void deleteSessionWithoutRecordingDoesNotTouchStorage() {
		UUID id = UUID.randomUUID();
		InterviewSession session = createdSession(id);
		when(repository.findById(id)).thenReturn(Optional.of(session));

		service.deleteSession(id);

		verify(storageService, never()).delete(any());
		verify(repository).delete(session);
	}

	private InterviewSession createdSession(UUID id) {
		return createdSession(id, InterviewRole.BACKEND_ENGINEER, InterviewLevel.MID, InterviewCategory.BEHAVIORAL,
				"behavioral-general-mid-conflict", LocalDateTime.now());
	}

	private InterviewSession createdSession(UUID id, InterviewRole role, InterviewLevel level, InterviewCategory category,
			String questionId, LocalDateTime createdAt) {
		return new InterviewSession(
				id,
				role,
				level,
				category,
				questionId,
				"Question snapshot",
				null,
				null,
				null,
				null,
				InterviewSessionStatus.CREATED,
				TranscriptStatus.NOT_CONFIGURED,
				AnalysisStatus.NOT_CONFIGURED,
				createdAt,
				createdAt.plusDays(30));
	}
}
