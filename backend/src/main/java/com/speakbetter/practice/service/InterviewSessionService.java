package com.speakbetter.practice.service;

import com.speakbetter.practice.config.RecordingProperties;
import com.speakbetter.practice.dto.CreateInterviewSessionRequest;
import com.speakbetter.practice.dto.InterviewQuestionResponse;
import com.speakbetter.practice.dto.InterviewSessionResponse;
import com.speakbetter.practice.dto.ReviewRequest;
import com.speakbetter.practice.entity.AnalysisStatus;
import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import com.speakbetter.practice.entity.InterviewSession;
import com.speakbetter.practice.entity.InterviewSessionStatus;
import com.speakbetter.practice.entity.TranscriptStatus;
import com.speakbetter.practice.exception.InterviewQuestionNotFoundException;
import com.speakbetter.practice.exception.InterviewSessionNotFoundException;
import com.speakbetter.practice.exception.InvalidInterviewSessionException;
import com.speakbetter.practice.exception.InvalidUploadException;
import com.speakbetter.practice.repository.InterviewSessionRepository;
import com.speakbetter.practice.service.storage.RecordingStorage;
import com.speakbetter.practice.service.analysis.interview.AnalysisResult;
import com.speakbetter.practice.service.analysis.interview.InterviewAnalysisRequest;
import com.speakbetter.practice.service.analysis.interview.InterviewAnalysisService;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class InterviewSessionService {

	private static final Logger log = LoggerFactory.getLogger(InterviewSessionService.class);

	private final InterviewSessionRepository repository;
	private final InterviewQuestionCatalog questionCatalog;
	private final RecordingStorage storageService;
	private final RecordingProperties properties;
	private final InterviewAnalysisService analysisService;

	public InterviewSessionService(InterviewSessionRepository repository, InterviewQuestionCatalog questionCatalog,
			RecordingStorage storageService, RecordingProperties properties, InterviewAnalysisService analysisService) {
		this.repository = repository;
		this.questionCatalog = questionCatalog;
		this.storageService = storageService;
		this.properties = properties;
		this.analysisService = analysisService;
	}

	@Transactional
	public InterviewSessionResponse createSession(CreateInterviewSessionRequest request) {
		validateCreateRequest(request);
		InterviewQuestion question = questionCatalog.findById(request.questionId())
				.orElseThrow(() -> new InterviewQuestionNotFoundException(request.questionId()));
		validateQuestionMatchesRequest(request, question);

		LocalDateTime now = LocalDateTime.now();
		InterviewSession session = new InterviewSession(
				UUID.randomUUID(),
				request.role(),
				request.level(),
				request.category(),
				question.id(),
				question.questionText(),
				null,
				null,
				null,
				null,
				InterviewSessionStatus.CREATED,
				TranscriptStatus.NOT_CONFIGURED,
				AnalysisStatus.NOT_CONFIGURED,
				now,
				now.plusDays(properties.getRetentionDays()));
		repository.save(session);
		log.info("Created interview session {} for question {}", session.getId(), question.id());
		return toResponse(session, question);
	}

	public List<InterviewSessionResponse> listSessions(InterviewRole role, InterviewLevel level,
			InterviewCategory category, String questionId) {
		return repository.findAll().stream()
				.filter(session -> session.getStatus() != InterviewSessionStatus.DELETED)
				.filter(session -> role == null || session.getRole() == role)
				.filter(session -> level == null || session.getLevel() == level)
				.filter(session -> category == null || session.getCategory() == category)
				.filter(session -> questionId == null || questionId.isBlank() || session.getQuestionId().equals(questionId.trim()))
				.sorted(Comparator.comparing(InterviewSession::getCreatedAt).reversed())
				.map(this::toResponse)
				.toList();
	}

	public InterviewSessionResponse getSession(UUID id) {
		return toResponse(findVisibleOrThrow(id));
	}

	@Transactional
	public InterviewSessionResponse uploadRecording(UUID id, MultipartFile video, int durationSeconds) {
		InterviewSession session = findVisibleOrThrow(id);
		if (session.getStatus() != InterviewSessionStatus.CREATED) {
			throw new InvalidInterviewSessionException("Recording can only be uploaded for a newly created interview session");
		}
		validateUpload(video);
		if (durationSeconds < 0) {
			throw new InvalidUploadException("durationSeconds must not be negative");
		}

		LocalDateTime now = LocalDateTime.now();
		StoredFile stored = storageService.store(video, now);
		session.setFileMetadata(stored.relativePath(), video.getContentType(), stored.sizeBytes(), durationSeconds);
		session.setStatus(InterviewSessionStatus.READY);
		session.setTranscriptStatus(TranscriptStatus.NOT_CONFIGURED);
		session.setAnalysisStatus(AnalysisStatus.NOT_CONFIGURED);
		repository.save(session);
		log.info("Saved recording for interview session {} ({} bytes)", id, stored.sizeBytes());
		return toResponse(session);
	}

	public VideoFile getVideoForStreaming(UUID id) {
		InterviewSession session = findVisibleOrThrow(id);
		if (session.getFilePath() == null || session.getOriginalMimeType() == null) {
			throw new InvalidInterviewSessionException("Recording has not been uploaded for this interview session");
		}
		return new VideoFile(storageService.loadVideo(session.getFilePath()), session.getOriginalMimeType());
	}

	@Transactional
	public InterviewSessionResponse updateReview(UUID id, ReviewRequest request) {
		InterviewSession session = findVisibleOrThrow(id);
		if (request.fillerWordCount() != null && request.fillerWordCount() < 0) {
			throw new InvalidUploadException("fillerWordCount must not be negative");
		}
		session.setWentWell(trimToNull(request.wentWell()));
		session.setNeedsImprovement(trimToNull(request.needsImprovement()));
		session.setFillerWordCount(request.fillerWordCount());
		session.setNotes(trimToNull(request.notes()));
		repository.save(session);
		log.info("Updated review for interview session {}", id);
		return toResponse(session);
	}

	@Transactional
	public void deleteSession(UUID id) {
		InterviewSession session = findVisibleOrThrow(id);
		if (session.getFilePath() != null) {
			storageService.delete(session.getFilePath());
		}
		repository.delete(session);
		log.info("Deleted interview session {}", id);
	}

	public int cleanupExpiredSessions() {
		LocalDateTime now = LocalDateTime.now();
		List<InterviewSession> expired = repository.findAll().stream()
				.filter(session -> session.getStatus() != InterviewSessionStatus.DELETED)
				.filter(session -> session.getExpiresAt().isBefore(now))
				.toList();
		int deletedCount = 0;
		for (InterviewSession session : expired) {
			try {
				if (session.getFilePath() != null) {
					storageService.delete(session.getFilePath());
				}
				repository.delete(session);
				deletedCount++;
			} catch (Exception e) {
				log.error("Cleanup: failed to remove expired interview session {}", session.getId(), e);
			}
		}
		return deletedCount;
	}

	private InterviewSession findVisibleOrThrow(UUID id) {
		return repository.findById(id)
				.filter(session -> session.getStatus() != InterviewSessionStatus.DELETED)
				.orElseThrow(() -> new InterviewSessionNotFoundException(id));
	}

	private void validateCreateRequest(CreateInterviewSessionRequest request) {
		if (request == null) {
			throw new InvalidInterviewSessionException("Request body is required");
		}
		if (request.role() == null) {
			throw new InvalidInterviewSessionException("role is required");
		}
		if (request.level() == null) {
			throw new InvalidInterviewSessionException("level is required");
		}
		if (request.category() == null) {
			throw new InvalidInterviewSessionException("category is required");
		}
		if (request.questionId() == null || request.questionId().isBlank()) {
			throw new InvalidInterviewSessionException("questionId is required");
		}
	}

	private void validateQuestionMatchesRequest(CreateInterviewSessionRequest request, InterviewQuestion question) {
		if (question.role() != InterviewRole.GENERAL && question.role() != request.role()) {
			throw new InvalidInterviewSessionException("Question is not available for the selected role");
		}
		if (question.level() != request.level()) {
			throw new InvalidInterviewSessionException("Question is not available for the selected level");
		}
		if (question.category() != request.category()) {
			throw new InvalidInterviewSessionException("Question is not available for the selected category");
		}
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

	private String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

	private InterviewSessionResponse toResponse(InterviewSession session) {
		InterviewQuestion question = questionCatalog.findById(session.getQuestionId())
				.orElseGet(() -> new InterviewQuestion(
						session.getQuestionId(),
						session.getRole(),
						session.getLevel(),
						session.getCategory(),
						session.getQuestionTextSnapshot(),
						"This question is no longer active in the current catalog.",
						List.of(),
						false));
		return toResponse(session, question);
	}

	private InterviewSessionResponse toResponse(InterviewSession session, InterviewQuestion question) {
		AnalysisResult metrics = analysisService.analyze(new InterviewAnalysisRequest(
				session.getTranscriptStatus() == TranscriptStatus.READY ? session.getTranscript() : null,
				session.getQuestionTextSnapshot(),
				session.getRole(),
				session.getLevel(),
				session.getCategory(),
				session.getDurationSeconds(),
				session.getFilePath()));
		return new InterviewSessionResponse(
				session.getId(),
				session.getRole(),
				session.getLevel(),
				session.getCategory(),
				InterviewQuestionResponse.from(question),
				session.getStatus(),
				session.getTranscriptStatus(),
				session.getTranscriptStatus() == TranscriptStatus.READY ? session.getTranscript() : null,
				session.getAnalysisStatus(),
				session.getAnalysisStatus() == AnalysisStatus.READY ? session.getAnalysisResult() : null,
				metrics,
				session.getDurationSeconds(),
				session.getFileSizeBytes(),
				session.getCreatedAt(),
				session.getUpdatedAt(),
				session.getExpiresAt(),
				session.getFilePath() == null ? null : "/api/interview-sessions/" + session.getId() + "/video",
				session.getWentWell(),
				session.getNeedsImprovement(),
				session.getFillerWordCount(),
				session.getNotes());
	}
}
