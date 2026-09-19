package com.speakbetter.practice.scheduler;

import com.speakbetter.practice.service.PracticeSessionService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Periodically removes recordings past their retention period. The schedule is
 * read from app.recordings.cleanup-cron (see application.yml) so it can be
 * changed without touching code; retention length itself is enforced in
 * PracticeSessionService, which only ever deletes sessions where expiresAt has
 * already passed.
 */
@Component
public class RecordingCleanupScheduler {

	private final PracticeSessionService practiceSessionService;

	public RecordingCleanupScheduler(PracticeSessionService practiceSessionService) {
		this.practiceSessionService = practiceSessionService;
	}

	@Scheduled(cron = "${app.recordings.cleanup-cron}")
	public void cleanupExpiredRecordings() {
		practiceSessionService.cleanupExpiredSessions();
	}
}
