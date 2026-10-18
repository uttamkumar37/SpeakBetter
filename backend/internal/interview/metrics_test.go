package interview

import "testing"

func TestCatalogPreservesEightQuestionsAndRoleSemantics(t *testing.T) {
	all := Questions("", "", "")
	if len(all) != 8 {
		t.Fatal(len(all))
	}
	for i, q := range all {
		if q.ID == "" || q.QuestionText == "" || len(q.ExpectedResponseStructure) == 0 {
			t.Fatal("incomplete reviewed question", q)
		}
		if i > 0 && all[i-1].ID >= q.ID {
			t.Fatal("catalog order changed")
		}
	}
	filtered := Questions("BACKEND_ENGINEER", "MID", "BEHAVIORAL")
	if len(filtered) != 1 || filtered[0].Role != "GENERAL" {
		t.Fatal("specific roles must include GENERAL questions", filtered)
	}
	if len(Questions("BACKEND_ENGINEER", "JUNIOR", "TECHNICAL")) != 0 {
		t.Fatal("invented catalog content")
	}
	if _, ok := FindQuestion(" behavioral-general-entry-ownership "); !ok {
		t.Fatal("trimmed lookup failed")
	}
	if err := ValidateFilters("INVALID", "", ""); err == nil {
		t.Fatal("invalid role accepted")
	}
	_, err := (CreateRequest{"BACKEND_ENGINEER", "SENIOR", "TECHNICAL", "technical-backend-mid-api"}).Validate()
	if err == nil {
		t.Fatal("mismatching question accepted")
	}
}

func TestMetricsRequireRealEvidence(t *testing.T) {
	duration := 120
	m := Measure("TECHNICAL", &duration, nil)
	if m.Duration.Band != "WITHIN_TARGET" || m.Pacing.WordsPerMinute != nil || m.FillerWords.FillerWordCount != nil || m.ResponseStructure.Availability != "TRANSCRIPT_REQUIRED" {
		t.Fatal(m)
	}
	text := "Um, when my goal was unclear, I built an API. The result improved. Uh, actually."
	m = Measure("TECHNICAL", &duration, &text)
	if *m.FillerWords.FillerWordCount != 3 || *m.Pacing.WordCount != 15 || *m.Pacing.WordsPerMinute != 8 {
		t.Fatal(m)
	}
	if m.ResponseStructure.Situation != "DETECTED" || m.ResponseStructure.Task != "DETECTED" || m.ResponseStructure.Action != "DETECTED" || m.ResponseStructure.Result != "DETECTED" {
		t.Fatal(m.ResponseStructure)
	}
	zero := 0
	m = Measure("GENERAL", &zero, &text)
	if m.Pacing.WordsPerMinute != nil || m.FillerWords.FillersPerMinute != nil {
		t.Fatal("fabricated rate for zero seconds")
	}
	blank := "  "
	m = Measure("BEHAVIORAL", nil, &blank)
	if m.Duration.ActualSeconds != nil || m.Pacing.Availability != "NOT_ENOUGH_DATA" || m.FillerWords.Availability != "NOT_ENOUGH_DATA" {
		t.Fatal(m)
	}
	for _, tc := range []struct {
		category string
		min, max int
	}{{"SYSTEM_DESIGN", 180, 420}, {"TECHNICAL", 120, 300}, {"LEADERSHIP", 120, 240}, {"BEHAVIORAL", 60, 180}} {
		for _, value := range []int{tc.min - 1, tc.min, tc.max, tc.max + 1} {
			m := Measure(tc.category, &value, nil)
			expected := "WITHIN_TARGET"
			if value < tc.min {
				expected = "BELOW_TARGET"
			}
			if value > tc.max {
				expected = "ABOVE_TARGET"
			}
			if m.Duration.Band != expected {
				t.Fatal(tc, value, m.Duration)
			}
		}
	}
}
