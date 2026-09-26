package com.speakbetter.practice.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import org.junit.jupiter.api.Test;

class InterviewQuestionCatalogTest {

	private final InterviewQuestionCatalog catalog = new InterviewQuestionCatalog();

	@Test
	void listQuestionsReturnsReviewedStaticQuestions() {
		assertThat(catalog.listQuestions())
				.isNotEmpty()
				.allSatisfy(question -> {
					assertThat(question.id()).isNotBlank();
					assertThat(question.questionText()).isNotBlank();
					assertThat(question.guidance()).isNotBlank();
				});
	}

	@Test
	void findQuestionsIncludesGeneralQuestionsForSpecificRoles() {
		assertThat(catalog.findQuestions(InterviewRole.BACKEND_ENGINEER, InterviewLevel.MID, InterviewCategory.BEHAVIORAL))
				.extracting(InterviewQuestion::role)
				.containsOnly(InterviewRole.GENERAL);
	}

	@Test
	void findQuestionsCanFilterToRoleLevelAndCategory() {
		assertThat(catalog.findQuestions(InterviewRole.BACKEND_ENGINEER, InterviewLevel.MID, InterviewCategory.TECHNICAL))
				.extracting(InterviewQuestion::id)
				.containsExactly("technical-backend-mid-api");
	}

	@Test
	void findByIdTrimsInputAndReturnsEmptyForBlankInput() {
		assertThat(catalog.findById(" technical-backend-mid-api ")).isPresent();
		assertThat(catalog.findById(" ")).isEmpty();
	}
}
