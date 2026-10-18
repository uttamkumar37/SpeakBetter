package interview

import (
	_ "embed"
	"encoding/json"
	"errors"
	"strings"
)

type Question struct {
	ID                        string   `json:"id"`
	Role                      string   `json:"role"`
	Level                     string   `json:"level"`
	Category                  string   `json:"category"`
	QuestionText              string   `json:"questionText"`
	Guidance                  string   `json:"guidance"`
	ExpectedResponseStructure []string `json:"expectedResponseStructure"`
}

//go:embed questions.json
var questionData []byte

func Questions(role, level, category string) []Question {
	var all []Question
	if err := json.Unmarshal(questionData, &all); err != nil {
		panic("invalid embedded interview catalog")
	}
	result := make([]Question, 0)
	for _, q := range all {
		if (role == "" || q.Role == role || q.Role == "GENERAL") && (level == "" || q.Level == level) && (category == "" || q.Category == category) {
			result = append(result, q)
		}
	}
	return result
}

func FindQuestion(id string) (Question, bool) {
	for _, q := range Questions("", "", "") {
		if q.ID == strings.TrimSpace(id) {
			return q, true
		}
	}
	return Question{}, false
}

func ValidateFilters(role, level, category string) error {
	for _, check := range []struct {
		value   string
		allowed []string
	}{
		{role, []string{"BACKEND_ENGINEER", "FRONTEND_ENGINEER", "FULL_STACK_ENGINEER", "PRODUCT_MANAGER", "DATA_ANALYST", "GENERAL"}},
		{level, []string{"ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD"}},
		{category, []string{"BEHAVIORAL", "TECHNICAL", "SITUATIONAL", "SYSTEM_DESIGN", "COMMUNICATION", "LEADERSHIP", "ROLE_SPECIFIC"}},
	} {
		if check.value == "" {
			continue
		}
		found := false
		for _, value := range check.allowed {
			if check.value == value {
				found = true
			}
		}
		if !found {
			return errors.New("Invalid interview role, level or category")
		}
	}
	return nil
}

type CreateRequest struct {
	Role       string `json:"role"`
	Level      string `json:"level"`
	Category   string `json:"category"`
	QuestionID string `json:"questionId"`
}

func (r CreateRequest) Validate() (Question, error) {
	if r.Role == "" || r.Level == "" || r.Category == "" || strings.TrimSpace(r.QuestionID) == "" {
		return Question{}, errors.New("role, level, category and questionId are required")
	}
	if err := ValidateFilters(r.Role, r.Level, r.Category); err != nil {
		return Question{}, err
	}
	q, ok := FindQuestion(r.QuestionID)
	if !ok {
		return Question{}, ErrQuestionNotFound
	}
	if (q.Role != "GENERAL" && q.Role != r.Role) || q.Level != r.Level || q.Category != r.Category {
		return Question{}, errors.New("Question does not match the selected role, level and category")
	}
	return q, nil
}
