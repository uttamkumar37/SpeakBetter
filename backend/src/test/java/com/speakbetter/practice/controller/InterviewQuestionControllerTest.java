package com.speakbetter.practice.controller;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.speakbetter.practice.dto.InterviewQuestionResponse;
import com.speakbetter.practice.entity.InterviewCategory;
import com.speakbetter.practice.entity.InterviewLevel;
import com.speakbetter.practice.entity.InterviewRole;
import com.speakbetter.practice.exception.InterviewQuestionNotFoundException;
import com.speakbetter.practice.service.InterviewQuestionService;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(InterviewQuestionController.class)
class InterviewQuestionControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockBean
	private InterviewQuestionService questionService;

	@Test
	void listQuestionsSupportsOptionalFilters() throws Exception {
		when(questionService.listQuestions(InterviewRole.BACKEND_ENGINEER, InterviewLevel.MID, InterviewCategory.TECHNICAL))
				.thenReturn(List.of(new InterviewQuestionResponse(
						"technical-backend-mid-api",
						InterviewRole.BACKEND_ENGINEER,
						InterviewLevel.MID,
						InterviewCategory.TECHNICAL,
						"How would you design an API endpoint?",
						"Discuss API shape.",
						List.of("Requirements", "API shape"))));

		mockMvc.perform(get("/api/interview-questions")
						.param("role", "BACKEND_ENGINEER")
						.param("level", "MID")
						.param("category", "TECHNICAL"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value("technical-backend-mid-api"))
				.andExpect(jsonPath("$[0].expectedResponseStructure[0]").value("Requirements"));
	}

	@Test
	void getQuestionReturnsClean404() throws Exception {
		when(questionService.getQuestion("missing")).thenThrow(new InterviewQuestionNotFoundException("missing"));

		mockMvc.perform(get("/api/interview-questions/missing"))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.message").value("Interview question not found: missing"));
	}

	@Test
	void invalidRoleFilterReturnsClean400() throws Exception {
		mockMvc.perform(get("/api/interview-questions").param("role", "NOPE"))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.message").value("Invalid value for field: role"));
	}
}
