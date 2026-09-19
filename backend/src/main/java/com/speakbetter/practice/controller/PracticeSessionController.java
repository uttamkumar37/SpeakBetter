package com.speakbetter.practice.controller;

import com.speakbetter.practice.dto.PracticeSessionResponse;
import com.speakbetter.practice.dto.ReviewRequest;
import com.speakbetter.practice.exception.StorageException;
import com.speakbetter.practice.service.PracticeSessionService;
import com.speakbetter.practice.service.VideoFile;
import java.io.IOException;
import java.util.List;
import java.util.UUID;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.ResourceRegion;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpRange;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

/**
 * Thin HTTP layer - no filesystem or persistence logic lives here, it all
 * delegates to PracticeSessionService.
 */
@RestController
@RequestMapping("/api/practice-sessions")
public class PracticeSessionController {

	private static final long DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB, used when a Range request omits an end byte

	private final PracticeSessionService sessionService;

	public PracticeSessionController(PracticeSessionService sessionService) {
		this.sessionService = sessionService;
	}

	@PostMapping
	public ResponseEntity<PracticeSessionResponse> create(
			@RequestParam("video") MultipartFile video,
			@RequestParam("topic") String topic,
			@RequestParam("durationSeconds") int durationSeconds) {
		PracticeSessionResponse response = sessionService.createSession(video, topic, durationSeconds);
		return ResponseEntity.status(HttpStatus.CREATED).body(response);
	}

	@GetMapping
	public List<PracticeSessionResponse> list() {
		return sessionService.listSessions();
	}

	@GetMapping("/{id}")
	public PracticeSessionResponse get(@PathVariable UUID id) {
		return sessionService.getSession(id);
	}

	@PutMapping("/{id}/review")
	public PracticeSessionResponse updateReview(@PathVariable UUID id, @RequestBody ReviewRequest request) {
		return sessionService.updateReview(id, request);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable UUID id) {
		sessionService.deleteSession(id);
		return ResponseEntity.noContent().build();
	}

	@GetMapping("/{id}/video")
	public ResponseEntity<ResourceRegion> streamVideo(@PathVariable UUID id,
			@RequestHeader HttpHeaders headers) {
		VideoFile video = sessionService.getVideoForStreaming(id);
		ResourceRegion region = toResourceRegion(video.resource(), headers.getRange());
		HttpStatus status = headers.getRange().isEmpty() ? HttpStatus.OK : HttpStatus.PARTIAL_CONTENT;
		return ResponseEntity.status(status)
				.contentType(MediaType.parseMediaType(video.mimeType()))
				.header(HttpHeaders.ACCEPT_RANGES, "bytes")
				.body(region);
	}

	private ResourceRegion toResourceRegion(Resource resource, List<HttpRange> ranges) {
		try {
			long contentLength = resource.contentLength();
			if (ranges.isEmpty()) {
				return new ResourceRegion(resource, 0, contentLength);
			}
			HttpRange range = ranges.get(0);
			long start = range.getRangeStart(contentLength);
			long end = range.getRangeEnd(contentLength);
			long rangeLength = Math.min(DEFAULT_CHUNK_SIZE, end - start + 1);
			return new ResourceRegion(resource, start, rangeLength);
		} catch (IOException e) {
			throw new StorageException("Failed to read recording for playback", e);
		}
	}
}
