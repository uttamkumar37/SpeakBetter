package com.speakbetter.practice.service.storage;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.speakbetter.practice.config.RecordingProperties;
import com.speakbetter.practice.exception.StorageException;
import com.speakbetter.practice.service.StoredFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.Resource;
import org.springframework.mock.web.MockMultipartFile;

class LocalFilesystemRecordingStorageTest {

	@TempDir
	Path tempDir;

	private LocalFilesystemRecordingStorage storageService;

	@BeforeEach
	void setUp() {
		RecordingProperties properties = new RecordingProperties();
		properties.setStoragePath(tempDir.toString());
		storageService = new LocalFilesystemRecordingStorage(properties);
	}

	private Resource loadResource(String key) {
		VideoSource source = storageService.loadVideo(key);
		assertThat(source).isInstanceOf(VideoSource.LocalFile.class);
		return ((VideoSource.LocalFile) source).resource();
	}

	@Test
	void storesFileUnderYearMonthDirectoryWithServerGeneratedUuidName() throws IOException {
		MockMultipartFile file = new MockMultipartFile("video", "whatever-the-browser-called-it.webm", "video/webm",
				"hello".getBytes());

		StoredFile stored = storageService.store(file, LocalDateTime.of(2026, 9, 20, 10, 0));

		assertThat(stored.relativePath()).matches("2026/09/[0-9a-f-]{36}\\.webm");
		assertThat(stored.sizeBytes()).isEqualTo(5);
		assertThat(Files.readString(tempDir.resolve(stored.relativePath()))).isEqualTo("hello");
	}

	@Test
	void generatedFilenameNeverIncorporatesTheClientSuppliedFilename() {
		MockMultipartFile file = new MockMultipartFile("video", "../../etc/passwd.webm", "video/webm", "x".getBytes());

		StoredFile stored = storageService.store(file, LocalDateTime.now());

		assertThat(stored.relativePath()).doesNotContain("etc").doesNotContain("passwd").doesNotContain("..");
	}

	@Test
	void twoUploadsNeverCollideOnFilename() {
		MockMultipartFile fileA = new MockMultipartFile("video", "clip.webm", "video/webm", "a".getBytes());
		MockMultipartFile fileB = new MockMultipartFile("video", "clip.webm", "video/webm", "b".getBytes());

		StoredFile storedA = storageService.store(fileA, LocalDateTime.now());
		StoredFile storedB = storageService.store(fileB, LocalDateTime.now());

		assertThat(storedA.relativePath()).isNotEqualTo(storedB.relativePath());
	}

	@Test
	void loadVideoReturnsTheStoredBytesAsALocalFile() throws IOException {
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", "content-bytes".getBytes());
		StoredFile stored = storageService.store(file, LocalDateTime.now());

		Resource resource = loadResource(stored.relativePath());

		assertThat(resource.exists()).isTrue();
		assertThat(resource.contentLength()).isEqualTo("content-bytes".length());
	}

	@Test
	void loadVideoThrowsStorageExceptionWhenFileIsMissing() {
		assertThatThrownBy(() -> storageService.loadVideo("2026/09/does-not-exist.webm"))
				.isInstanceOf(StorageException.class);
	}

	@Test
	void deleteRemovesTheFileFromDisk() {
		MockMultipartFile file = new MockMultipartFile("video", "clip.webm", "video/webm", "x".getBytes());
		StoredFile stored = storageService.store(file, LocalDateTime.now());

		storageService.delete(stored.relativePath());

		assertThatThrownBy(() -> storageService.loadVideo(stored.relativePath()))
				.isInstanceOf(StorageException.class);
	}

	@Test
	void deletingAnAlreadyMissingFileDoesNotThrow() {
		assertThatCode(() -> storageService.delete("2026/09/never-existed.webm")).doesNotThrowAnyException();
	}

	@Test
	void refusesToResolvePathsThatEscapeTheStorageRoot() {
		assertThatThrownBy(() -> storageService.loadVideo("../../../etc/passwd"))
				.isInstanceOf(StorageException.class);
	}

	@Test
	void refusesUnsupportedMimeTypes() {
		MockMultipartFile file = new MockMultipartFile("video", "clip.mov", "video/quicktime", "x".getBytes());

		assertThatThrownBy(() -> storageService.store(file, LocalDateTime.now())).isInstanceOf(StorageException.class);
	}
}
