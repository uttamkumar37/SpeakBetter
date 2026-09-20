package com.speakbetter.practice.service.storage;

import com.speakbetter.practice.config.R2Properties;
import com.speakbetter.practice.exception.StorageException;
import com.speakbetter.practice.service.StoredFile;
import java.io.IOException;
import java.net.URI;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.exception.SdkException;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.HeadObjectRequest;
import software.amazon.awssdk.services.s3.model.NoSuchKeyException;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;

/**
 * Storage backend for deployment: recordings live in a Cloudflare R2 bucket
 * (S3-compatible) instead of local disk, since deployed filesystems usually
 * aren't persistent across restarts/redeploys. Active only under the "r2"
 * Spring profile. Playback works by redirecting the browser to a short-lived
 * presigned URL rather than proxying bytes through this server.
 */
@Service
@Profile("r2")
public class CloudflareR2RecordingStorage implements RecordingStorage {

	private static final Map<String, String> EXTENSIONS_BY_MIME_TYPE = Map.of(
			"video/webm", "webm",
			"video/mp4", "mp4",
			"video/ogg", "ogv");

	private final S3Client s3Client;
	private final S3Presigner presigner;
	private final R2Properties properties;

	public CloudflareR2RecordingStorage(R2Properties properties) {
		validate(properties);
		this.properties = properties;
		AwsBasicCredentials credentials = AwsBasicCredentials.create(properties.getAccessKeyId(), properties.getSecretAccessKey());
		StaticCredentialsProvider credentialsProvider = StaticCredentialsProvider.create(credentials);
		URI endpoint = URI.create(properties.endpoint());

		this.s3Client = S3Client.builder()
				.endpointOverride(endpoint)
				.region(Region.of("auto"))
				.credentialsProvider(credentialsProvider)
				.build();
		this.presigner = S3Presigner.builder()
				.endpointOverride(endpoint)
				.region(Region.of("auto"))
				.credentialsProvider(credentialsProvider)
				.build();
	}

	@Override
	public StoredFile store(MultipartFile file, LocalDateTime recordedAt) {
		String extension = extensionFor(file.getContentType());
		String key = "%04d/%02d/%s.%s".formatted(recordedAt.getYear(), recordedAt.getMonthValue(), UUID.randomUUID(), extension);

		try {
			s3Client.putObject(
					PutObjectRequest.builder()
							.bucket(properties.getBucket())
							.key(key)
							.contentType(file.getContentType())
							.contentLength(file.getSize())
							.build(),
					RequestBody.fromInputStream(file.getInputStream(), file.getSize()));
		} catch (IOException | SdkException e) {
			throw new StorageException("Failed to upload recording to R2", e);
		}
		return new StoredFile(key, file.getSize());
	}

	@Override
	public VideoSource loadVideo(String key) {
		try {
			s3Client.headObject(HeadObjectRequest.builder().bucket(properties.getBucket()).key(key).build());
		} catch (NoSuchKeyException e) {
			throw new StorageException("Recording file is missing in storage: " + key);
		}

		GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
				.signatureDuration(Duration.ofMinutes(properties.getPresignedUrlTtlMinutes()))
				.getObjectRequest(b -> b.bucket(properties.getBucket()).key(key))
				.build();
		PresignedGetObjectRequest presigned = presigner.presignGetObject(presignRequest);
		return new VideoSource.RedirectUrl(presigned.url().toString());
	}

	@Override
	public void delete(String key) {
		try {
			// S3-compatible delete is idempotent - no error if the key is already gone,
			// matching the local implementation's Files.deleteIfExists behavior.
			s3Client.deleteObject(DeleteObjectRequest.builder().bucket(properties.getBucket()).key(key).build());
		} catch (SdkException e) {
			throw new StorageException("Failed to delete recording from R2: " + key, e);
		}
	}

	private String extensionFor(String mimeType) {
		String extension = EXTENSIONS_BY_MIME_TYPE.get(mimeType == null ? null : mimeType.toLowerCase());
		if (extension == null) {
			throw new StorageException("No file extension mapping for MIME type: " + mimeType);
		}
		return extension;
	}

	/**
	 * Fails fast with a clear message when the "r2" profile is active but its
	 * required env vars aren't set - without this, a missing/unresolved property
	 * surfaces later as a confusing low-level error (e.g. URISyntaxException from
	 * the literal, unresolved "${R2_ACCOUNT_ID}" string).
	 */
	private static void validate(R2Properties properties) {
		requireSet("R2_ACCOUNT_ID", properties.getAccountId());
		requireSet("R2_ACCESS_KEY_ID", properties.getAccessKeyId());
		requireSet("R2_SECRET_ACCESS_KEY", properties.getSecretAccessKey());
		requireSet("R2_BUCKET_NAME", properties.getBucket());
	}

	private static void requireSet(String envVarName, String value) {
		if (value == null || value.isBlank() || value.startsWith("${")) {
			throw new IllegalStateException(
					"The 'r2' profile is active but " + envVarName + " is not set. "
							+ "Set it as an environment variable and restart.");
		}
	}
}
