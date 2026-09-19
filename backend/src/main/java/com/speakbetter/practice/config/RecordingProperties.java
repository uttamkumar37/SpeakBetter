package com.speakbetter.practice.config;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code app.recordings.*} settings from application.yml so retention,
 * storage location, and upload limits can be changed without touching Java code.
 */
@ConfigurationProperties(prefix = "app.recordings")
public class RecordingProperties {

	private String storagePath = "./data/recordings";
	private int retentionDays = 30;
	private long maxUploadSizeBytes = 524_288_000L;
	private String cleanupCron = "0 0 3 * * *";
	private List<String> allowedMimeTypes = List.of("video/webm", "video/mp4", "video/ogg");

	public String getStoragePath() {
		return storagePath;
	}

	public void setStoragePath(String storagePath) {
		this.storagePath = storagePath;
	}

	public int getRetentionDays() {
		return retentionDays;
	}

	public void setRetentionDays(int retentionDays) {
		this.retentionDays = retentionDays;
	}

	public long getMaxUploadSizeBytes() {
		return maxUploadSizeBytes;
	}

	public void setMaxUploadSizeBytes(long maxUploadSizeBytes) {
		this.maxUploadSizeBytes = maxUploadSizeBytes;
	}

	public String getCleanupCron() {
		return cleanupCron;
	}

	public void setCleanupCron(String cleanupCron) {
		this.cleanupCron = cleanupCron;
	}

	public List<String> getAllowedMimeTypes() {
		return allowedMimeTypes;
	}

	public void setAllowedMimeTypes(List<String> allowedMimeTypes) {
		this.allowedMimeTypes = allowedMimeTypes;
	}
}
