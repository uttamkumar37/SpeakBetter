package com.speakbetter.practice.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Metadata for one recorded practice attempt. The actual video bytes live on disk
 * (see RecordingStorageService) - only the file path and descriptive fields are
 * persisted here.
 */
@Entity
@Table(name = "practice_sessions")
public class PracticeSession {

	@Id
	private UUID id;

	@Column(nullable = false)
	private String topic;

	@Column(name = "file_path", nullable = false)
	private String filePath;

	@Column(name = "original_mime_type", nullable = false)
	private String originalMimeType;

	@Column(name = "file_size_bytes", nullable = false)
	private long fileSizeBytes;

	@Column(name = "duration_seconds", nullable = false)
	private int durationSeconds;

	@Column(name = "created_at", nullable = false)
	private LocalDateTime createdAt;

	@Column(name = "expires_at", nullable = false)
	private LocalDateTime expiresAt;

	@Enumerated(EnumType.STRING)
	@Column(nullable = false)
	private SessionStatus status;

	// Self-review fields, filled in later via PUT /{id}/review - all optional,
	// left null until the person reviews the recording.
	@Column(name = "went_well")
	private String wentWell;

	@Column(name = "needs_improvement")
	private String needsImprovement;

	@Column(name = "filler_word_count")
	private Integer fillerWordCount;

	private String notes;

	protected PracticeSession() {
		// required by JPA
	}

	public PracticeSession(UUID id, String topic, String filePath, String originalMimeType,
			long fileSizeBytes, int durationSeconds, LocalDateTime createdAt, LocalDateTime expiresAt,
			SessionStatus status) {
		this.id = id;
		this.topic = topic;
		this.filePath = filePath;
		this.originalMimeType = originalMimeType;
		this.fileSizeBytes = fileSizeBytes;
		this.durationSeconds = durationSeconds;
		this.createdAt = createdAt;
		this.expiresAt = expiresAt;
		this.status = status;
	}

	public UUID getId() {
		return id;
	}

	public String getTopic() {
		return topic;
	}

	public String getFilePath() {
		return filePath;
	}

	public String getOriginalMimeType() {
		return originalMimeType;
	}

	public long getFileSizeBytes() {
		return fileSizeBytes;
	}

	public int getDurationSeconds() {
		return durationSeconds;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public LocalDateTime getExpiresAt() {
		return expiresAt;
	}

	public SessionStatus getStatus() {
		return status;
	}

	public void setStatus(SessionStatus status) {
		this.status = status;
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
}
