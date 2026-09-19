package com.speakbetter.practice.repository;

import com.speakbetter.practice.entity.PracticeSession;
import com.speakbetter.practice.entity.SessionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PracticeSessionRepository extends JpaRepository<PracticeSession, UUID> {

	List<PracticeSession> findByStatusOrderByCreatedAtDesc(SessionStatus status);

	List<PracticeSession> findByStatusAndExpiresAtBefore(SessionStatus status, LocalDateTime cutoff);
}
