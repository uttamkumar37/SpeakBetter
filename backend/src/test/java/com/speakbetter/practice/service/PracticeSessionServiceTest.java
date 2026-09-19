package com.speakbetter.practice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.speakbetter.practice.config.RecordingProperties;
import com.speakbetter.practice.dto.PracticeSessionResponse;
import com.speakbetter.practice.entity.PracticeSession;
import com.speakbetter.practice.entity.SessionStatus;
import com.speakbetter.practice.exception.InvalidUploadException;
import com.speakbetter.practice.exception.SessionNotFoundException;
import com.speakbetter.practice.repository.PracticeSessionRepository;
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
class PracticeSessionServiceTest {

	@Mock
	private PracticeSessionRepository repository;

	@Mock
	private RecordingStorageService storageService;

	private RecordingProperties properties;
	private PracticeSessionService service;

	@BeforeEach
	void setUp() {
		properties = new RecordingProperties();
		properties.setRetentionDays(30);
		properties.setMaxUploadSizeBytes(1024L * 1024);
		properties.setAllowedMimeTypes(List.of("video/webm", "video/mp4", "video/ogg"));
		service = new PracticeSessionService(repository, storageService, properties);
	}

	@Test
	void createSessionComputesExpiresAtThirtyDaysFromCreation() {
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", "hello".getBytes());
		when(storageService.store(eq(file), any())).thenReturn(new StoredFile("2026/09/abc.webm", 5L));

		PracticeSessionResponse response = service.createSession(file, "Daily stand-up", 60);

		assertThat(response.topic()).isEqualTo("Daily stand-up");
		assertThat(response.durationSeconds()).isEqualTo(60);
		assertThat(Duration.between(response.createdAt(), response.expiresAt()).toDays()).isEqualTo(30);
		verify(repository).save(any(PracticeSession.class));
	}

	@Test
	void createSessionTrimsTopicWhitespace() {
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", "hello".getBytes());
		when(storageService.store(eq(file), any())).thenReturn(new StoredFile("2026/09/abc.webm", 5L));

		PracticeSessionResponse response = service.createSession(file, "  Daily stand-up  ", 60);

		assertThat(response.topic()).isEqualTo("Daily stand-up");
	}

	@Test
	void createSessionRejectsUnsupportedMimeType() {
		MockMultipartFile file = new MockMultipartFile("video", "clip.mov", "video/quicktime", "x".getBytes());

		assertThatThrownBy(() -> service.createSession(file, "topic", 10)).isInstanceOf(InvalidUploadException.class);
		verifyNoInteractions(storageService);
	}

	@Test
	void createSessionRejectsFileOverTheConfiguredSizeLimit() {
		properties.setMaxUploadSizeBytes(4L);
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", new byte[] { 1, 2, 3, 4, 5 });

		assertThatThrownBy(() -> service.createSession(file, "topic", 10)).isInstanceOf(InvalidUploadException.class);
		verifyNoInteractions(storageService);
	}

	@Test
	void createSessionRejectsBlankTopic() {
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", "x".getBytes());

		assertThatThrownBy(() -> service.createSession(file, "   ", 10)).isInstanceOf(InvalidUploadException.class);
	}

	@Test
	void createSessionRejectsEmptyFile() {
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", new byte[0]);

		assertThatThrownBy(() -> service.createSession(file, "topic", 10)).isInstanceOf(InvalidUploadException.class);
	}

	@Test
	void deleteSessionRemovesFileAndRecordForAnActiveSession() {
		UUID id = UUID.randomUUID();
		PracticeSession session = new PracticeSession(id, "topic", "2026/09/x.webm", "video/webm", 10, 5,
				LocalDateTime.now(), LocalDateTime.now().plusDays(30), SessionStatus.ACTIVE);
		when(repository.findById(id)).thenReturn(Optional.of(session));

		service.deleteSession(id);

		verify(storageService).delete("2026/09/x.webm");
		verify(repository).delete(session);
	}

	@Test
	void deleteSessionThrowsWhenSessionDoesNotExist() {
		UUID id = UUID.randomUUID();
		when(repository.findById(id)).thenReturn(Optional.empty());

		assertThatThrownBy(() -> service.deleteSession(id)).isInstanceOf(SessionNotFoundException.class);
	}

	@Test
	void getSessionThrowsForAnIdThatExistsButIsNotActive() {
		UUID id = UUID.randomUUID();
		PracticeSession deleted = new PracticeSession(id, "topic", "2026/09/x.webm", "video/webm", 10, 5,
				LocalDateTime.now(), LocalDateTime.now().plusDays(30), SessionStatus.DELETED);
		when(repository.findById(id)).thenReturn(Optional.of(deleted));

		assertThatThrownBy(() -> service.getSession(id)).isInstanceOf(SessionNotFoundException.class);
	}

	@Test
	void cleanupExpiredSessionsDeletesExactlyWhatTheRepositoryReportsAsExpired() {
		PracticeSession expired = new PracticeSession(UUID.randomUUID(), "old", "2026/08/a.webm", "video/webm", 1, 1,
				LocalDateTime.now().minusDays(40), LocalDateTime.now().minusDays(1), SessionStatus.ACTIVE);
		when(repository.findByStatusAndExpiresAtBefore(eq(SessionStatus.ACTIVE), any())).thenReturn(List.of(expired));

		int removedCount = service.cleanupExpiredSessions();

		assertThat(removedCount).isEqualTo(1);
		verify(storageService).delete("2026/08/a.webm");
		verify(repository).delete(expired);
	}

	@Test
	void cleanupExpiredSessionsQueriesOnlyByExpiresAtBeforeNow_soItCanNeverDeleteBeforeExpiry() {
		when(repository.findByStatusAndExpiresAtBefore(eq(SessionStatus.ACTIVE), any())).thenReturn(List.of());

		int removedCount = service.cleanupExpiredSessions();

		assertThat(removedCount).isZero();
		verifyNoInteractions(storageService);
		verify(repository, never()).delete(any());
	}

	@Test
	void cleanupContinuesPastAFailureAndReportsOnlySuccessfulDeletions() {
		PracticeSession ok = new PracticeSession(UUID.randomUUID(), "ok", "2026/08/ok.webm", "video/webm", 1, 1,
				LocalDateTime.now().minusDays(40), LocalDateTime.now().minusDays(1), SessionStatus.ACTIVE);
		PracticeSession broken = new PracticeSession(UUID.randomUUID(), "broken", "2026/08/broken.webm", "video/webm", 1, 1,
				LocalDateTime.now().minusDays(40), LocalDateTime.now().minusDays(1), SessionStatus.ACTIVE);
		when(repository.findByStatusAndExpiresAtBefore(eq(SessionStatus.ACTIVE), any())).thenReturn(List.of(broken, ok));
		doThrow(new RuntimeException("disk error")).when(storageService).delete("2026/08/broken.webm");

		int removedCount = service.cleanupExpiredSessions();

		assertThat(removedCount).isEqualTo(1);
		verify(repository).delete(ok);
		verify(repository, never()).delete(broken);
	}
}
