package interview

import (
	"math"
	"regexp"
	"strings"
)

type DurationMetric struct {
	Availability     string `json:"availability"`
	ActualSeconds    *int   `json:"actualSeconds"`
	TargetMinSeconds int    `json:"targetMinSeconds"`
	TargetMaxSeconds int    `json:"targetMaxSeconds"`
	Band             string `json:"band"`
	Message          string `json:"message"`
}
type PacingMetric struct {
	Availability   string `json:"availability"`
	WordCount      *int   `json:"wordCount"`
	WordsPerMinute *int   `json:"wordsPerMinute"`
	Message        string `json:"message"`
}
type FillerMetric struct {
	Availability     string         `json:"availability"`
	FillerWordCount  *int           `json:"fillerWordCount"`
	FillersPerMinute *float64       `json:"fillersPerMinute"`
	Matches          map[string]int `json:"matches"`
	Message          string         `json:"message"`
}
type StructureMetric struct {
	Availability string `json:"availability"`
	Situation    string `json:"situation"`
	Task         string `json:"task"`
	Action       string `json:"action"`
	Result       string `json:"result"`
	Message      string `json:"message"`
}
type Metrics struct {
	Duration          DurationMetric  `json:"duration"`
	Pacing            PacingMetric    `json:"pacing"`
	FillerWords       FillerMetric    `json:"fillerWords"`
	ResponseStructure StructureMetric `json:"responseStructure"`
}

var words = regexp.MustCompile(`[A-Za-z0-9]+(?:'[A-Za-z0-9]+)?`)

func Measure(category string, duration *int, transcript *string) Metrics {
	min, max := 60, 180
	switch category {
	case "SYSTEM_DESIGN":
		min, max = 180, 420
	case "TECHNICAL":
		min, max = 120, 300
	case "LEADERSHIP":
		min, max = 120, 240
	}
	m := Metrics{
		Duration:          DurationMetric{"NOT_ENOUGH_DATA", duration, min, max, "NOT_AVAILABLE", "Not enough data"},
		Pacing:            PacingMetric{Availability: "TRANSCRIPT_REQUIRED", Message: "Transcript required for pacing analysis"},
		FillerWords:       FillerMetric{Availability: "TRANSCRIPT_REQUIRED", Matches: map[string]int{}, Message: "Transcript required for filler-word analysis"},
		ResponseStructure: StructureMetric{"TRANSCRIPT_REQUIRED", "UNABLE_TO_DETERMINE", "UNABLE_TO_DETERMINE", "UNABLE_TO_DETERMINE", "UNABLE_TO_DETERMINE", "Transcript required for response-structure analysis"},
	}
	if duration != nil {
		m.Duration.Availability = "AVAILABLE"
		switch {
		case *duration < min:
			m.Duration.Band = "BELOW_TARGET"
			m.Duration.Message = "Your answer duration is below the selected target."
		case *duration > max:
			m.Duration.Band = "ABOVE_TARGET"
			m.Duration.Message = "Your answer duration is longer than the selected target. Consider making the context more concise."
		default:
			m.Duration.Band = "WITHIN_TARGET"
			m.Duration.Message = "Your answer duration is within the selected target range."
		}
	}
	if transcript == nil {
		return m
	}
	text := strings.ToLower(*transcript)
	count := len(words.FindAllString(text, -1))
	m.Pacing = PacingMetric{Availability: "NOT_ENOUGH_DATA", WordCount: &count, Message: "Not enough data"}
	if strings.TrimSpace(text) != "" && count > 0 && duration != nil && *duration > 0 {
		wpm := int(math.Round(float64(count) * 60 / float64(*duration)))
		m.Pacing = PacingMetric{"AVAILABLE", &count, &wpm, "Words per minute calculated from transcript word count and recording duration."}
	}
	fillers := 0
	if strings.TrimSpace(text) == "" {
		m.FillerWords.Availability = "NOT_ENOUGH_DATA"
		m.FillerWords.FillerWordCount = &fillers
		m.FillerWords.Message = "Not enough data"
		m.ResponseStructure.Availability = "NOT_ENOUGH_DATA"
		m.ResponseStructure.Message = "Not enough data"
		return m
	}
	for _, filler := range []string{"um", "uh", "erm", "like", "actually", "basically", "literally"} {
		n := len(regexp.MustCompile(`\b`+filler+`\b`).FindAllString(text, -1))
		if n > 0 {
			m.FillerWords.Matches[filler] = n
			fillers += n
		}
	}
	m.FillerWords.Availability = "AVAILABLE"
	m.FillerWords.FillerWordCount = &fillers
	m.FillerWords.Message = "Filler count is detected with case-insensitive exact word matching."
	if duration != nil && *duration > 0 {
		rate := float64(fillers) * 60 / float64(*duration)
		m.FillerWords.FillersPerMinute = &rate
	}
	indicator := func(values ...string) string {
		for _, value := range values {
			if strings.Contains(text, value) {
				return "DETECTED"
			}
		}
		return "NOT_DETECTED"
	}
	m.ResponseStructure = StructureMetric{"AVAILABLE",
		indicator("situation", "context", "when", "at the time", "background"),
		indicator("task", "responsibility", "goal", "needed to", "my role"),
		indicator("action", "i did", "i built", "i led", "i worked", "i decided"),
		indicator("result", "outcome", "impact", "learned", "improved", "reduced", "increased"),
		"STAR indicators are detected with documented keyword heuristics."}
	return m
}
