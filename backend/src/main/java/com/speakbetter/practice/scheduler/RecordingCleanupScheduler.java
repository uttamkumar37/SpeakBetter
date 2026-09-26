package com.speakbetter.practice.scheduler;

import com.speakbetter.practice.service.PracticeSessionService;
import com.speakbetter.practice.service.InterviewSessionService;
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
	private final InterviewSessionService interviewSessionService;

	public RecordingCleanupScheduler(PracticeSessionService practiceSessionService, InterviewSessionService interviewSessionService) {
		this.practiceSessionService = practiceSessionService;
		this.interviewSessionService = interviewSessionService;
	}

	@Scheduled(cron = "${app.recordings.cleanup-cron}")
	public void cleanupExpiredRecordings() {
		practiceSessionService.cleanupExpiredSessions();
		interviewSessionService.cleanupExpiredSessions();
	}
}
