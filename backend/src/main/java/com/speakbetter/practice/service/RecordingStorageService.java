package com.speakbetter.practice.service;

import com.speakbetter.practice.config.RecordingProperties;
import com.speakbetter.practice.exception.StorageException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/**
 * The only class in the app that touches the filesystem for recordings. Filenames
 * are always generated here (UUID-based) - the browser-supplied filename is never
 * trusted or used to build a path, which is what keeps this safe from path traversal.
 */
@Service
public class RecordingStorageService {

	private static final Map<String, String> EXTENSIONS_BY_MIME_TYPE = Map.of(
			"video/webm", "webm",
			"video/mp4", "mp4",
			"video/ogg", "ogv");

	private final Path storageRoot;

	public RecordingStorageService(RecordingProperties properties) {
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

	public Resource loadAsResource(String relativePath) {
		Path target = resolveWithinRoot(relativePath);
		if (!Files.isRegularFile(target)) {
			throw new StorageException("Recording file is missing on disk: " + relativePath);
		}
		return new FileSystemResource(target);
	}

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
