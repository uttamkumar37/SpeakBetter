package com.speakbetter.practice.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Binds the {@code app.r2.*} settings - only used when the "r2" Spring profile
 * is active (see CloudflareR2RecordingStorage). No defaults are given for the
 * credentials on purpose: if the r2 profile is active without them set, startup
 * should fail loudly rather than silently trying to talk to a blank endpoint.
 */
@ConfigurationProperties(prefix = "app.r2")
public class R2Properties {

	private String accountId;
	private String accessKeyId;
	private String secretAccessKey;
	private String bucket;
	private int presignedUrlTtlMinutes = 15;

	public String getAccountId() {
		return accountId;
	}

	public void setAccountId(String accountId) {
		this.accountId = accountId;
	}

	public String getAccessKeyId() {
		return accessKeyId;
	}

	public void setAccessKeyId(String accessKeyId) {
		this.accessKeyId = accessKeyId;
	}

	public String getSecretAccessKey() {
		return secretAccessKey;
	}

	public void setSecretAccessKey(String secretAccessKey) {
		this.secretAccessKey = secretAccessKey;
	}

	public String getBucket() {
		return bucket;
	}

	public void setBucket(String bucket) {
		this.bucket = bucket;
	}

	public int getPresignedUrlTtlMinutes() {
		return presignedUrlTtlMinutes;
	}

	public void setPresignedUrlTtlMinutes(int presignedUrlTtlMinutes) {
		this.presignedUrlTtlMinutes = presignedUrlTtlMinutes;
	}

	public String endpoint() {
		return "https://" + accountId + ".r2.cloudflarestorage.com";
	}
}
