package com.speakbetter.practice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Metadata for one recorded interview answer. The video bytes use the same
 * RecordingStorage key pattern as practice sessions; this entity stores only
 * durable metadata, question context, and honest transcript/analysis state.
 */
@Entity
@Table(name = "interview_sessions")
public class InterviewSession {

	@Id
	private UUID id;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private InterviewRole role;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private InterviewLevel level;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private InterviewCategory category;

	@Column(name = "question_id", nullable = false, length = 120)
	private String questionId;

	@Column(name = "question_text_snapshot", nullable = false, columnDefinition = "TEXT")
	private String questionTextSnapshot;

	@Column(name = "file_path", length = 512)
	private String filePath;

	@Column(name = "original_mime_type", length = 100)
	private String originalMimeType;

	@Column(name = "file_size_bytes")
	private Long fileSizeBytes;

	@Column(name = "duration_seconds")
	private Integer durationSeconds;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private InterviewSessionStatus status;

	@Enumerated(EnumType.STRING)
	@Column(name = "transcript_status", nullable = false)
	private TranscriptStatus transcriptStatus;

	@Column(columnDefinition = "TEXT")
	private String transcript;

	@Enumerated(EnumType.STRING)
	@Column(name = "analysis_status", nullable = false)
	private AnalysisStatus analysisStatus;

	@Column(name = "analysis_result", columnDefinition = "TEXT")
	private String analysisResult;

	@Column(name = "went_well", length = 2000)
	private String wentWell;

	@Column(name = "needs_improvement", length = 2000)
	private String needsImprovement;

	@Column(name = "filler_word_count")
	private Integer fillerWordCount;

	@Column(length = 2000)
	private String notes;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "updated_at", nullable = false)
	private LocalDateTime updatedAt;

	@Column(name = "expires_at", nullable = false)
	private LocalDateTime expiresAt;

	protected InterviewSession() {
		// required by JPA
	}

	public InterviewSession(UUID id, InterviewRole role, InterviewLevel level, InterviewCategory category,
			String questionId, String questionTextSnapshot, String filePath, String originalMimeType,
			Long fileSizeBytes, Integer durationSeconds, InterviewSessionStatus status,
			TranscriptStatus transcriptStatus, AnalysisStatus analysisStatus,
			LocalDateTime createdAt, LocalDateTime expiresAt) {
		this.id = id;
		this.role = role;
		this.level = level;
		this.category = category;
		this.questionId = questionId;
		this.questionTextSnapshot = questionTextSnapshot;
		this.filePath = filePath;
		this.originalMimeType = originalMimeType;
		this.fileSizeBytes = fileSizeBytes;
		this.durationSeconds = durationSeconds;
		this.status = status;
		this.transcriptStatus = transcriptStatus;
		this.analysisStatus = analysisStatus;
		this.createdAt = createdAt;
		this.updatedAt = createdAt;
		this.expiresAt = expiresAt;
	}

	@PrePersist
	void prePersist() {
		LocalDateTime now = LocalDateTime.now();
		if (createdAt == null) {
			createdAt = now;
		}
		if (updatedAt == null) {
			updatedAt = createdAt;
		}
	}

	@PreUpdate
	void preUpdate() {
		updatedAt = LocalDateTime.now();
	}

	public UUID getId() {
		return id;
	}

	public InterviewRole getRole() {
		return role;
	}

	public InterviewLevel getLevel() {
		return level;
	}

	public InterviewCategory getCategory() {
		return category;
	}

	public String getQuestionId() {
		return questionId;
	}

	public String getQuestionTextSnapshot() {
		return questionTextSnapshot;
	}

	public String getFilePath() {
		return filePath;
	}

	public String getOriginalMimeType() {
		return originalMimeType;
	}

	public Long getFileSizeBytes() {
		return fileSizeBytes;
	}

	public void setFileMetadata(String filePath, String originalMimeType, long fileSizeBytes, int durationSeconds) {
		this.filePath = filePath;
		this.originalMimeType = originalMimeType;
		this.fileSizeBytes = fileSizeBytes;
		this.durationSeconds = durationSeconds;
	}

	public Integer getDurationSeconds() {
		return durationSeconds;
	}

	public InterviewSessionStatus getStatus() {
		return status;
	}

	public void setStatus(InterviewSessionStatus status) {
		this.status = status;
	}

	public TranscriptStatus getTranscriptStatus() {
		return transcriptStatus;
	}

	public void setTranscriptStatus(TranscriptStatus transcriptStatus) {
		this.transcriptStatus = transcriptStatus;
	}

	public String getTranscript() {
		return transcript;
	}

	public void setTranscript(String transcript) {
		this.transcript = transcript;
	}

	public AnalysisStatus getAnalysisStatus() {
		return analysisStatus;
	}

	public void setAnalysisStatus(AnalysisStatus analysisStatus) {
		this.analysisStatus = analysisStatus;
	}

	public String getAnalysisResult() {
		return analysisResult;
	}

	public void setAnalysisResult(String analysisResult) {
		this.analysisResult = analysisResult;
	}

	public String getWentWell() {
		return wentWell;
	}

	public void setWentWell(String wentWell) {
		this.wentWell = wentWell;
	}

	public String getNeedsImprovement() {
		return needsImprovement;
	}

	public void setNeedsImprovement(String needsImprovement) {
		this.needsImprovement = needsImprovement;
	}

	public Integer getFillerWordCount() {
		return fillerWordCount;
	}

	public void setFillerWordCount(Integer fillerWordCount) {
		this.fillerWordCount = fillerWordCount;
	}

	public String getNotes() {
		return notes;
	}

	public void setNotes(String notes) {
		this.notes = notes;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public LocalDateTime getUpdatedAt() {
		return updatedAt;
	}

	public LocalDateTime getExpiresAt() {
		return expiresAt;
	}
}
