package com.speakbetter.practice.service;

import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

/**
 * V1 question bank. Questions are static, reviewed content and are snapshotted
 * onto saved sessions so future catalog edits do not alter past attempts.
 */
@Service
public class InterviewQuestionCatalog {

	private static final List<InterviewQuestion> QUESTIONS = List.of(
			new InterviewQuestion(
					"behavioral-general-entry-ownership",
					InterviewRole.GENERAL,
					InterviewLevel.ENTRY,
					InterviewCategory.BEHAVIORAL,
					"Tell me about a time you took ownership of a task that was unclear.",
					"Use STAR: set the situation briefly, explain your responsibility, describe your action, and close with the result.",
					List.of("Situation", "Task", "Action", "Result"),
					true),
			new InterviewQuestion(
					"behavioral-general-mid-conflict",
					InterviewRole.GENERAL,
					InterviewLevel.MID,
					InterviewCategory.BEHAVIORAL,
					"Describe a time you disagreed with a teammate and still moved the work forward.",
					"Show how you listened, clarified the trade-off, chose a path, and protected the relationship.",
					List.of("Context", "Disagreement", "Action", "Outcome"),
					true),
			new InterviewQuestion(
					"leadership-general-senior-influence",
					InterviewRole.GENERAL,
					InterviewLevel.SENIOR,
					InterviewCategory.LEADERSHIP,
					"Tell me about a time you influenced a decision without direct authority.",
					"Focus on context, stakeholders, evidence, the decision process, and measurable outcome.",
					List.of("Context", "Stakeholders", "Evidence", "Outcome"),
					true),
			new InterviewQuestion(
					"technical-backend-mid-api",
					InterviewRole.BACKEND_ENGINEER,
					InterviewLevel.MID,
					InterviewCategory.TECHNICAL,
					"How would you design an API endpoint for uploading and streaming user recordings?",
					"Discuss validation, storage keys, metadata, range requests, error handling, and retention.",
					List.of("Requirements", "API shape", "Storage", "Failure handling"),
					true),
			new InterviewQuestion(
					"system-design-backend-senior-retention",
					InterviewRole.BACKEND_ENGINEER,
					InterviewLevel.SENIOR,
					InterviewCategory.SYSTEM_DESIGN,
					"Design a recording retention system that deletes expired media safely.",
					"Cover data model, scheduled cleanup, storage failures, idempotency, observability, and user-facing guarantees.",
					List.of("Data model", "Cleanup flow", "Failure handling", "Observability"),
					true),
			new InterviewQuestion(
					"technical-frontend-mid-recorder",
					InterviewRole.FRONTEND_ENGINEER,
					InterviewLevel.MID,
					InterviewCategory.TECHNICAL,
					"How would you build a browser-based video recorder experience?",
					"Mention permissions, MediaRecorder support, device selection, stream cleanup, preview, upload, and accessibility.",
					List.of("Permissions", "Recording flow", "Cleanup", "Accessibility"),
					true),
			new InterviewQuestion(
					"role-specific-product-mid-prioritization",
					InterviewRole.PRODUCT_MANAGER,
					InterviewLevel.MID,
					InterviewCategory.ROLE_SPECIFIC,
					"How do you prioritize two important features when engineering capacity is limited?",
					"Explain user impact, business value, risk, evidence, stakeholder alignment, and the final trade-off.",
					List.of("User impact", "Business value", "Trade-off", "Decision"),
					true),
			new InterviewQuestion(
					"role-specific-data-entry-insight",
					InterviewRole.DATA_ANALYST,
					InterviewLevel.ENTRY,
					InterviewCategory.ROLE_SPECIFIC,
					"Tell me about an analysis you did that changed someone's decision.",
					"State the question, data source, method, finding, recommendation, and decision impact.",
					List.of("Question", "Data", "Method", "Impact"),
					true));

	public List<InterviewQuestion> listQuestions() {
		return QUESTIONS.stream()
				.filter(InterviewQuestion::active)
				.sorted(Comparator.comparing(InterviewQuestion::id))
				.toList();
	}

	public List<InterviewQuestion> findQuestions(InterviewRole role, InterviewLevel level, InterviewCategory category) {
		return QUESTIONS.stream()
				.filter(InterviewQuestion::active)
				.filter(question -> matchesRole(question, role))
				.filter(question -> level == null || question.level() == level)
				.filter(question -> category == null || question.category() == category)
				.sorted(Comparator.comparing(InterviewQuestion::id))
				.toList();
	}

	public Optional<InterviewQuestion> findById(String id) {
		if (id == null || id.isBlank()) {
			return Optional.empty();
		}
		return QUESTIONS.stream()
				.filter(InterviewQuestion::active)
				.filter(question -> question.id().equals(id.trim()))
				.findFirst();
	}

	private boolean matchesRole(InterviewQuestion question, InterviewRole role) {
		return role == null || question.role() == role || question.role() == InterviewRole.GENERAL;
	}
}
