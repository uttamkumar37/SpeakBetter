package com.speakbetter.practice.repository;

import com.speakbetter.practice.entity.InterviewSession;
import com.speakbetter.practice.entity.InterviewSessionStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewSessionRepository extends JpaRepository<InterviewSession, UUID> {

	List<InterviewSession> findByStatusOrderByCreatedAtDesc(InterviewSessionStatus status);

	List<InterviewSession> findByStatusAndExpiresAtBefore(InterviewSessionStatus status, LocalDateTime cutoff);
}
