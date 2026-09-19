package com.speakbetter.practice.controller;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.speakbetter.practice.entity.PracticeSession;
import com.speakbetter.practice.entity.SessionStatus;
import com.speakbetter.practice.repository.PracticeSessionRepository;
import com.speakbetter.practice.service.PracticeSessionService;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * End-to-end tests against the real HTTP layer, a real Postgres database
 * (speakbetter_test - see src/test/resources/application.yml), and a real,
 * disposable filesystem directory. Each test runs in a transaction that's rolled
 * back afterward, so the test database stays empty between runs.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PracticeSessionIntegrationTest {

	@TempDir
	static Path storageDir;

	@DynamicPropertySource
	static void overrideStoragePath(DynamicPropertyRegistry registry) {
		registry.add("app.recordings.storage-path", () -> storageDir.toString());
	}

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private PracticeSessionRepository repository;

	@Autowired
	private PracticeSessionService practiceSessionService;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void createSavesMetadataAndTheVideoFileAndReturns201() throws Exception {
		MockMultipartFile video = new MockMultipartFile("video", "clip.webm", "video/webm", "hello-world".getBytes());

		mockMvc.perform(multipart("/api/practice-sessions")
						.file(video)
						.param("topic", "Daily stand-up")
						.param("durationSeconds", "94"))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.topic").value("Daily stand-up"))
				.andExpect(jsonPath("$.durationSeconds").value(94))
				.andExpect(jsonPath("$.videoUrl").exists());

		PracticeSession saved = repository.findByStatusOrderByCreatedAtDesc(SessionStatus.ACTIVE).get(0);
		assertThat(Duration.between(saved.getCreatedAt(), saved.getExpiresAt()).toDays()).isEqualTo(30);
		assertThat(Files.exists(storageDir.resolve(saved.getFilePath()))).isTrue();
		assertThat(Files.readString(storageDir.resolve(saved.getFilePath()))).isEqualTo("hello-world");
	}

	@Test
	void rejectsAnUploadWithAnUnsupportedMimeType() throws Exception {
		MockMultipartFile video = new MockMultipartFile("video", "clip.mov", "video/quicktime", "x".getBytes());

		mockMvc.perform(multipart("/api/practice-sessions")
						.file(video)
						.param("topic", "t")
						.param("durationSeconds", "1"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").exists());

		assertThat(repository.findByStatusOrderByCreatedAtDesc(SessionStatus.ACTIVE)).isEmpty();
	}

	@Test
	void rejectsAnUploadWithABlankTopic() throws Exception {
		MockMultipartFile video = new MockMultipartFile("video", "clip.webm", "video/webm", "x".getBytes());

		mockMvc.perform(multipart("/api/practice-sessions")
						.file(video)
						.param("topic", "   ")
						.param("durationSeconds", "1"))
				.andExpect(status().isBadRequest());
	}

	@Test
	void rejectsAnUploadMissingTheTopicFieldEntirelyWith400NotA500() throws Exception {
		MockMultipartFile video = new MockMultipartFile("video", "clip.webm", "video/webm", "x".getBytes());

		mockMvc.perform(multipart("/api/practice-sessions").file(video).param("durationSeconds", "1"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Missing required field: topic"));
	}

	@Test
	void rejectsAnUploadWithANonNumericDurationWith400NotA500() throws Exception {
		MockMultipartFile video = new MockMultipartFile("video", "clip.webm", "video/webm", "x".getBytes());

		mockMvc.perform(multipart("/api/practice-sessions")
						.file(video)
						.param("topic", "t")
						.param("durationSeconds", "not-a-number"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Invalid value for field: durationSeconds"));
	}

	@Test
	void rejectsAMalformedIdInThePathWith400NotA500() throws Exception {
		mockMvc.perform(get("/api/practice-sessions/{id}", "not-a-uuid"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Invalid value for field: id"));
	}

	@Test
	void getByIdReturns404ForAnUnknownId() throws Exception {
		mockMvc.perform(get("/api/practice-sessions/{id}", UUID.randomUUID()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").exists());
	}

	@Test
	void videoEndpointSupportsPartialRangeRequests() throws Exception {
		MockMultipartFile video = new MockMultipartFile("video", "clip.webm", "video/webm", "0123456789".getBytes());
		String responseBody = mockMvc.perform(multipart("/api/practice-sessions")
						.file(video)
						.param("topic", "t")
						.param("durationSeconds", "1"))
				.andExpect(status().isCreated())
				.andReturn().getResponse().getContentAsString();
		String id = objectMapper.readTree(responseBody).get("id").asText();

		mockMvc.perform(get("/api/practice-sessions/{id}/video", id).header("Range", "bytes=0-3"))
				.andExpect(status().isPartialContent())
				.andExpect(header().string("Content-Range", "bytes 0-3/10"))
				.andExpect(content().bytes("0123".getBytes()));
	}

	@Test
	void videoEndpointReturnsFullContentWhenNoRangeIsRequested() throws Exception {
		MockMultipartFile video = new MockMultipartFile("video", "clip.webm", "video/webm", "0123456789".getBytes());
		String responseBody = mockMvc.perform(multipart("/api/practice-sessions")
						.file(video)
						.param("topic", "t")
						.param("durationSeconds", "1"))
				.andReturn().getResponse().getContentAsString();
		String id = objectMapper.readTree(responseBody).get("id").asText();

		mockMvc.perform(get("/api/practice-sessions/{id}/video", id))
				.andExpect(status().isOk())
				.andExpect(content().bytes("0123456789".getBytes()));
	}

	@Test
	void deleteRemovesBothTheDatabaseRecordAndTheFile() throws Exception {
		MockMultipartFile video = new MockMultipartFile("video", "clip.webm", "video/webm", "x".getBytes());
		String responseBody = mockMvc.perform(multipart("/api/practice-sessions")
						.file(video)
						.param("topic", "t")
						.param("durationSeconds", "1"))
				.andReturn().getResponse().getContentAsString();
		String id = objectMapper.readTree(responseBody).get("id").asText();
		Path filePath = storageDir.resolve(repository.findById(UUID.fromString(id)).orElseThrow().getFilePath());
		assertThat(Files.exists(filePath)).isTrue();

		mockMvc.perform(delete("/api/practice-sessions/{id}", id)).andExpect(status().isNoContent());

		assertThat(repository.findById(UUID.fromString(id))).isEmpty();
		assertThat(Files.exists(filePath)).isFalse();
		mockMvc.perform(get("/api/practice-sessions/{id}", id)).andExpect(status().isNotFound());
	}

	@Test
	void deletingAnUnknownIdReturns404() throws Exception {
		mockMvc.perform(delete("/api/practice-sessions/{id}", UUID.randomUUID())).andExpect(status().isNotFound());
	}

	@Test
	void cleanupRemovesOnlyExpiredSessionsAndLeavesUnexpiredOnesUntouched() throws Exception {
		Path expiredFile = storageDir.resolve("2026/01/expired.webm");
		Files.createDirectories(expiredFile.getParent());
		Files.writeString(expiredFile, "expired-content");
		PracticeSession expired = new PracticeSession(UUID.randomUUID(), "old topic", "2026/01/expired.webm", "video/webm",
				10, 5, LocalDateTime.now().minusDays(40), LocalDateTime.now().minusDays(1), SessionStatus.ACTIVE);
		repository.save(expired);

		Path validFile = storageDir.resolve("2026/01/valid.webm");
		Files.createDirectories(validFile.getParent());
		Files.writeString(validFile, "valid-content");
		PracticeSession valid = new PracticeSession(UUID.randomUUID(), "current topic", "2026/01/valid.webm", "video/webm",
				10, 5, LocalDateTime.now(), LocalDateTime.now().plusDays(29), SessionStatus.ACTIVE);
		repository.save(valid);

		int removedCount = practiceSessionService.cleanupExpiredSessions();

		assertThat(removedCount).isEqualTo(1);
		assertThat(repository.findById(expired.getId())).isEmpty();
		assertThat(repository.findById(valid.getId())).isPresent();
		assertThat(Files.exists(expiredFile)).isFalse();
		assertThat(Files.exists(validFile)).isTrue();
	}

	@Test
	void cleanupNeverRemovesASessionBeforeItsExpiresAt() throws Exception {
		Path fileExpiringInOneMinute = storageDir.resolve("2026/01/soon.webm");
		Files.createDirectories(fileExpiringInOneMinute.getParent());
		Files.writeString(fileExpiringInOneMinute, "soon-content");
		PracticeSession expiresVerySoon = new PracticeSession(UUID.randomUUID(), "soon topic", "2026/01/soon.webm",
				"video/webm", 10, 5, LocalDateTime.now(), LocalDateTime.now().plusMinutes(1), SessionStatus.ACTIVE);
		repository.save(expiresVerySoon);

		int removedCount = practiceSessionService.cleanupExpiredSessions();

		assertThat(removedCount).isZero();
		assertThat(repository.findById(expiresVerySoon.getId())).isPresent();
		assertThat(Files.exists(fileExpiringInOneMinute)).isTrue();
	}
}
