package com.speakbetter.practice.service;

import com.speakbetter.practice.config.RecordingProperties;
import com.speakbetter.practice.dto.PracticeSessionResponse;
import com.speakbetter.practice.dto.ReviewRequest;
import com.speakbetter.practice.entity.PracticeSession;
import com.speakbetter.practice.entity.SessionStatus;
import com.speakbetter.practice.exception.InvalidUploadException;
import com.speakbetter.practice.exception.SessionNotFoundException;
import com.speakbetter.practice.repository.PracticeSessionRepository;
import com.speakbetter.practice.service.storage.RecordingStorage;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

/**
 * Business logic for practice sessions. Controllers stay thin and delegate here;
 * storage details are delegated further to a RecordingStorage implementation.
 */
@Service
public class PracticeSessionService {

	private static final Logger log = LoggerFactory.getLogger(PracticeSessionService.class);
	private static final int MAX_TOPIC_LENGTH = 255;

	private final PracticeSessionRepository repository;
	private final RecordingStorage storageService;
	private final RecordingProperties properties;

	public PracticeSessionService(PracticeSessionRepository repository, RecordingStorage storageService,
			RecordingProperties properties) {
		this.repository = repository;
		this.storageService = storageService;
		this.properties = properties;
	}

	@Transactional
	public PracticeSessionResponse createSession(MultipartFile video, String topic, int durationSeconds) {
		validateUpload(video);
		String cleanTopic = validateTopic(topic);
		if (durationSeconds < 0) {
			throw new InvalidUploadException("durationSeconds must not be negative");
		}

		LocalDateTime now = LocalDateTime.now();
		StoredFile stored = storageService.store(video, now);
		LocalDateTime expiresAt = now.plusDays(properties.getRetentionDays());

		PracticeSession session = new PracticeSession(UUID.randomUUID(), cleanTopic, stored.relativePath(),
				video.getContentType(), stored.sizeBytes(), durationSeconds, now, expiresAt, SessionStatus.ACTIVE);
		repository.save(session);
		log.info("Saved practice session {} (topic='{}', {} bytes)", session.getId(), cleanTopic, stored.sizeBytes());
		return toResponse(session);
	}

	public List<PracticeSessionResponse> listSessions() {
		return repository.findByStatusOrderByCreatedAtDesc(SessionStatus.ACTIVE).stream()
				.map(this::toResponse)
				.toList();
	}

	public PracticeSessionResponse getSession(UUID id) {
		return toResponse(findActiveOrThrow(id));
	}

	public VideoFile getVideoForStreaming(UUID id) {
		PracticeSession session = findActiveOrThrow(id);
		return new VideoFile(storageService.loadVideo(session.getFilePath()), session.getOriginalMimeType());
	}

	@Transactional
	public void deleteSession(UUID id) {
		PracticeSession session = findActiveOrThrow(id);
		storageService.delete(session.getFilePath());
		repository.delete(session);
		log.info("Deleted practice session {}", id);
	}

	@Transactional
	public PracticeSessionResponse updateReview(UUID id, ReviewRequest request) {
		PracticeSession session = findActiveOrThrow(id);
		if (request.fillerWordCount() != null && request.fillerWordCount() < 0) {
			throw new InvalidUploadException("fillerWordCount must not be negative");
		}
		session.setWentWell(trimToNull(request.wentWell()));
		session.setNeedsImprovement(trimToNull(request.needsImprovement()));
		session.setFillerWordCount(request.fillerWordCount());
		session.setNotes(trimToNull(request.notes()));
		repository.save(session);
		log.info("Updated review for practice session {}", id);
		return toResponse(session);
	}

	/**
	 * Removes every session past its expiresAt. Deliberately not wrapped in a single
	 * @Transactional: each repository.delete() below already runs in its own
	 * transaction (Spring Data's default), so one failure can't roll back sessions
	 * that were already cleaned up successfully earlier in the batch.
	 */
	public int cleanupExpiredSessions() {
		List<PracticeSession> expired = repository.findByStatusAndExpiresAtBefore(SessionStatus.ACTIVE, LocalDateTime.now());
		int deletedCount = 0;
		for (PracticeSession session : expired) {
			try {
				storageService.delete(session.getFilePath());
				repository.delete(session);
				deletedCount++;
				log.info("Cleanup: removed expired session {} (topic='{}', expired at {})",
						session.getId(), session.getTopic(), session.getExpiresAt());
			} catch (Exception e) {
				log.error("Cleanup: failed to remove expired session {}", session.getId(), e);
			}
		}
		log.info("Cleanup run complete: {} of {} expired session(s) removed", deletedCount, expired.size());
		return deletedCount;
	}

	private PracticeSession findActiveOrThrow(UUID id) {
		return repository.findById(id)
				.filter(session -> session.getStatus() == SessionStatus.ACTIVE)
				.orElseThrow(() -> new SessionNotFoundException(id));
	}

	private void validateUpload(MultipartFile video) {
		if (video == null || video.isEmpty()) {
			throw new InvalidUploadException("No video file was provided");
		}
		if (video.getSize() > properties.getMaxUploadSizeBytes()) {
			throw new InvalidUploadException("Video exceeds the maximum allowed size of "
					+ properties.getMaxUploadSizeBytes() / (1024 * 1024) + "MB");
		}
		String contentType = video.getContentType();
		boolean allowed = contentType != null && properties.getAllowedMimeTypes().stream()
				.anyMatch(contentType::equalsIgnoreCase);
		if (!allowed) {
			throw new InvalidUploadException("Unsupported video type: " + contentType);
		}
	}

	private String validateTopic(String topic) {
		if (topic == null || topic.isBlank()) {
			throw new InvalidUploadException("Topic is required");
		}
		String trimmed = topic.trim();
		if (trimmed.length() > MAX_TOPIC_LENGTH) {
			throw new InvalidUploadException("Topic must be " + MAX_TOPIC_LENGTH + " characters or fewer");
		}
		return trimmed;
	}

	private String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private PracticeSessionResponse toResponse(PracticeSession session) {
		return new PracticeSessionResponse(
				session.getId(),
				session.getTopic(),
				session.getCreatedAt(),
				session.getDurationSeconds(),
				session.getExpiresAt(),
				"/api/practice-sessions/" + session.getId() + "/video",
				session.getWentWell(),
				session.getNeedsImprovement(),
				session.getFillerWordCount(),
				session.getNotes());
	}
}
