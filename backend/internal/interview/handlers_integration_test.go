package interview_test

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/httpapi"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/interview"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/database"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/storage"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/testutil"
	"github.com/uttamkumar37/SpeakBetter/backend/migrations"
)

func call(router http.Handler, method, path, body string) *httptest.ResponseRecorder {
	w := httptest.NewRecorder()
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	router.ServeHTTP(w, r)
	return w
}

func TestInterviewCreateConcurrentUploadReviewHistoryAndRetention(t *testing.T) {
	gin.SetMode(gin.TestMode)
	ctx := context.Background()
	dsn := testutil.Database(t)
	if err := migrations.Up(ctx, dsn); err != nil {
		t.Fatal(err)
	}
	db, err := database.Open(ctx, dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(db.Pool.Close)
	store, err := storage.NewLocal(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = store.Close() })
	service := &interview.Service{Pool: db.Pool, Storage: store, RetentionDays: 30}
	router := httpapi.New(slog.New(slog.NewJSONHandler(io.Discard, nil)), nil, db.Ready)
	interview.Register(router, service, 1024*1024)
	w := call(router, "GET", "/api/interview-questions?role=BACKEND_ENGINEER&level=MID&category=BEHAVIORAL", "")
	var questions []interview.Question
	if err := json.Unmarshal(w.Body.Bytes(), &questions); err != nil || len(questions) != 1 {
		t.Fatal(w.Body, err)
	}
	if w := call(router, "GET", "/api/interview-questions?role=invalid", ""); w.Code != 400 {
		t.Fatal(w.Code)
	}
	if w := call(router, "POST", "/api/interview-sessions", `{"role":"BACKEND_ENGINEER","level":"SENIOR","category":"TECHNICAL","questionId":"technical-backend-mid-api"}`); w.Code != 400 {
		t.Fatal(w.Code)
	}
	w = call(router, "POST", "/api/interview-sessions", `{"role":"BACKEND_ENGINEER","level":"MID","category":"TECHNICAL","questionId":"technical-backend-mid-api"}`)
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body)
	}
	var item interview.Session
	if err := json.Unmarshal(w.Body.Bytes(), &item); err != nil {
		t.Fatal(err)
	}
	if item.Status != "CREATED" || item.VideoURL != nil || item.Transcript != nil || item.DurationSeconds != nil || item.Metrics.Pacing.Availability != "TRANSCRIPT_REQUIRED" {
		t.Fatal(item)
	}
	path := "/api/interview-sessions/" + item.ID
	if w := call(router, "GET", path+"/video", ""); w.Code != 400 {
		t.Fatal(w.Code)
	}
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	header := make(textproto.MIMEHeader)
	header.Set("Content-Disposition", `form-data; name="video"; filename="audio.wav"`)
	header.Set("Content-Type", "audio/wav")
	part, err := writer.CreatePart(header)
	if err != nil {
		t.Fatal(err)
	}
	_, _ = part.Write([]byte("RIFF....WAVEactual-test-audio"))
	_ = writer.WriteField("durationSeconds", "125")
	_ = writer.Close()
	data := append([]byte(nil), body.Bytes()...)
	contentType := writer.FormDataContentType()
	statuses := make(chan int, 2)
	var wg sync.WaitGroup
	for range 2 {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := httptest.NewRequest("POST", path+"/recording", bytes.NewReader(data))
			r.Header.Set("Content-Type", contentType)
			w := httptest.NewRecorder()
			router.ServeHTTP(w, r)
			statuses <- w.Code
		}()
	}
	wg.Wait()
	close(statuses)
	success, rejected := 0, 0
	for status := range statuses {
		if status == 200 {
			success++
		} else if status == 400 {
			rejected++
		} else {
			t.Fatal("unexpected upload result", status)
		}
	}
	if success != 1 || rejected != 1 {
		t.Fatal("concurrent upload must save exactly one recording", success, rejected)
	}
	w = call(router, "GET", path, "")
	if err := json.Unmarshal(w.Body.Bytes(), &item); err != nil {
		t.Fatal(err)
	}
	if item.Status != "READY" || item.VideoURL == nil || item.Metrics.Duration.Band != "WITHIN_TARGET" || item.TranscriptStatus != "NOT_CONFIGURED" {
		t.Fatal(item)
	}
	w = call(router, "PUT", path+"/review", `{"wentWell":" clear ","needsImprovement":null,"fillerWordCount":2,"notes":"manual notes"}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body)
	}
	w = call(router, "GET", "/api/interview-sessions?role=BACKEND_ENGINEER&questionId=technical-backend-mid-api", "")
	var items []interview.Session
	if err := json.Unmarshal(w.Body.Bytes(), &items); err != nil || len(items) != 1 {
		t.Fatal(w.Body, err)
	}
	w = call(router, "GET", "/api/interview-sessions?level=JUNIOR", "")
	if w.Code != 200 || strings.TrimSpace(w.Body.String()) != "[]" {
		t.Fatal(w.Code, w.Body)
	}
	if _, err := db.Pool.Exec(ctx, `UPDATE interview_sessions SET question_id='retired-question',question_text_snapshot='Saved original question',expires_at=$2 WHERE id=$1`, item.ID, time.Now().UTC().Add(time.Hour)); err != nil {
		t.Fatal(err)
	}
	loaded, err := service.Get(ctx, item.ID)
	if err != nil || loaded.Question.QuestionText != "Saved original question" {
		t.Fatal(loaded, err)
	}
	if err := service.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}
	if _, err := service.Get(ctx, item.ID); err != nil {
		t.Fatal("future recording removed", err)
	}
	if _, err := db.Pool.Exec(ctx, "UPDATE interview_sessions SET expires_at=$2 WHERE id=$1", item.ID, time.Now().UTC().Add(-time.Hour)); err != nil {
		t.Fatal(err)
	}
	if err := service.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}
	if w := call(router, "GET", path, ""); w.Code != 404 {
		t.Fatal(w.Code)
	}
}
