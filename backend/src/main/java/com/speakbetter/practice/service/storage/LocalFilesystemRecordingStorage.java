package com.speakbetter.practice.service.storage;

import com.speakbetter.practice.config.RecordingProperties;
import com.speakbetter.practice.exception.StorageException;
import com.speakbetter.practice.service.StoredFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.FileSystemResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * Default storage backend: writes recordings to a local directory. Used for
 * local development, where the filesystem is expected to persist across
 * restarts. Not active under the "r2" profile (that filesystem usually isn't
 * persistent in deployment).
 */
@Service
@Profile("!r2")
public class LocalFilesystemRecordingStorage implements RecordingStorage {

	private static final Map<String, String> EXTENSIONS_BY_MIME_TYPE = Map.of(
			"video/webm", "webm",
			"video/mp4", "mp4",
			"video/ogg", "ogv");

	private final Path storageRoot;

	public LocalFilesystemRecordingStorage(RecordingProperties properties) {
		this.storageRoot = Path.of(properties.getStoragePath()).toAbsolutePath().normalize();
		try {
			Files.createDirectories(storageRoot);
		} catch (IOException e) {
			throw new StorageException("Could not create recordings storage directory: " + storageRoot, e);
		}
	}

	/**
	 * Streams the multipart upload to disk under {@code yyyy/MM/<uuid>.<ext>} and
	 * returns the path relative to the storage root (this relative path is what gets
	 * persisted in the database - never the absolute filesystem path).
	 */
	@Override
	public StoredFile store(MultipartFile file, LocalDateTime recordedAt) {
		String extension = extensionFor(file.getContentType());
		String filename = UUID.randomUUID() + "." + extension;
		String relativePath = "%04d/%02d/%s".formatted(recordedAt.getYear(), recordedAt.getMonthValue(), filename);

		Path target = resolveWithinRoot(relativePath);
		try {
			Files.createDirectories(target.getParent());
			file.transferTo(target);
		} catch (IOException e) {
			throw new StorageException("Failed to save recording to disk", e);
		}
		return new StoredFile(relativePath, file.getSize());
	}

	@Override
	public VideoSource loadVideo(String relativePath) {
		Path target = resolveWithinRoot(relativePath);
		if (!Files.isRegularFile(target)) {
			throw new StorageException("Recording file is missing on disk: " + relativePath);
		}
		return new VideoSource.LocalFile(new FileSystemResource(target));
	}

	@Override
	public void delete(String relativePath) {
		try {
			Files.deleteIfExists(resolveWithinRoot(relativePath));
		} catch (IOException e) {
			throw new StorageException("Failed to delete recording file: " + relativePath, e);
		}
	}

	private Path resolveWithinRoot(String relativePath) {
		Path target = storageRoot.resolve(relativePath).normalize();
		if (!target.startsWith(storageRoot)) {
			throw new StorageException("Refusing to access path outside the recordings directory");
		}
		return target;
	}

	private String extensionFor(String mimeType) {
		String extension = EXTENSIONS_BY_MIME_TYPE.get(mimeType == null ? null : mimeType.toLowerCase());
		if (extension == null) {
			throw new StorageException("No file extension mapping for MIME type: " + mimeType);
		}
		return extension;
	}
}
