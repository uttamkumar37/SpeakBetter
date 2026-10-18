package practice_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/httpapi"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/database"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/storage"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/practice"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/testutil"
	"github.com/uttamkumar37/SpeakBetter/backend/migrations"
)

func setup(t *testing.T) (*gin.Engine, *practice.Service) {
	t.Helper()
	gin.SetMode(gin.TestMode)
	dsn := testutil.Database(t)
	ctx := context.Background()
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
	service := &practice.Service{Pool: db.Pool, Storage: store, RetentionDays: 30}
	router := httpapi.New(slog.New(slog.NewJSONHandler(io.Discard, nil)), nil, db.Ready)
	practice.Register(router, service, 4*1024*1024)
	return router, service
}

func upload(t *testing.T, router http.Handler, topic, duration, kind string, data []byte) *httptest.ResponseRecorder {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	header := make(textproto.MIMEHeader)
	header.Set("Content-Disposition", `form-data; name="video"; filename="../../unsafe.webm"`)
	header.Set("Content-Type", kind)
	part, err := writer.CreatePart(header)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := part.Write(data); err != nil {
		t.Fatal(err)
	}
	if err := writer.WriteField("topic", topic); err != nil {
		t.Fatal(err)
	}
	if err := writer.WriteField("durationSeconds", duration); err != nil {
		t.Fatal(err)
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	r := httptest.NewRequest(http.MethodPost, "/api/practice-sessions", &body)
	r.Header.Set("Content-Type", writer.FormDataContentType())
	w := httptest.NewRecorder()
	router.ServeHTTP(w, r)
	return w
}

func request(router http.Handler, method, path, body string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, strings.NewReader(body))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, r)
	return w
}

func TestPracticeUploadReviewRangeHistoryAndDelete(t *testing.T) {
	router, service := setup(t)
	data := append([]byte{0x1a, 0x45, 0xdf, 0xa3}, []byte("....webm")...)
	data = append(data, bytes.Repeat([]byte("x"), 2*1024*1024)...)
	w := upload(t, router, " Daily Stand-up ", "42", "video/webm", data)
	if w.Code != 201 {
		t.Fatalf("upload %d %s", w.Code, w.Body)
	}
	var session practice.Session
	if err := json.Unmarshal(w.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	if session.Topic != "Daily Stand-up" || session.DurationSeconds != 42 || session.FillerWordCount != nil || session.ExpiresAt.Sub(session.CreatedAt) != 30*24*time.Hour {
		t.Fatal(session)
	}
	stored, err := service.Get(context.Background(), session.ID)
	if err != nil {
		t.Fatal(err)
	}
	if strings.Contains(stored.Key, "unsafe") {
		t.Fatal("client filename persisted")
	}
	w = request(router, http.MethodPut, "/api/practice-sessions/"+session.ID+"/review", `{"wentWell":"  clear  ","needsImprovement":" ","fillerWordCount":3,"notes":null}`)
	if w.Code != 200 {
		t.Fatal(w.Code, w.Body)
	}
	if err := json.Unmarshal(w.Body.Bytes(), &session); err != nil {
		t.Fatal(err)
	}
	if session.WentWell == nil || *session.WentWell != "clear" || session.NeedsImprovement != nil {
		t.Fatal(session.Review)
	}
	w = request(router, http.MethodGet, "/api/practice-sessions", "")
	var list []practice.Session
	if err := json.Unmarshal(w.Body.Bytes(), &list); err != nil || len(list) != 1 {
		t.Fatal(w.Body, err)
	}
	for _, tc := range []struct {
		rangeHeader string
		status      int
		length      int
	}{
		{"", 200, len(data)}, {"bytes=2-5", 206, 4}, {"bytes=-10", 206, 10}, {"bytes=9999999-", 416, 0},
	} {
		r := httptest.NewRequest(http.MethodGet, session.VideoURL, nil)
		r.Header.Set("Range", tc.rangeHeader)
		w := httptest.NewRecorder()
		router.ServeHTTP(w, r)
		if w.Code != tc.status || (tc.status != 416 && w.Body.Len() != tc.length) {
			t.Fatalf("range %s: %d, length %d", tc.rangeHeader, w.Code, w.Body.Len())
		}
	}
	w = request(router, http.MethodDelete, "/api/practice-sessions/"+session.ID, "")
	if w.Code != 204 {
		t.Fatal(w.Code, w.Body)
	}
	if _, err := service.Storage.Open(context.Background(), stored.Key); !errors.Is(err, storage.ErrNotFound) {
		t.Fatal("media remained", err)
	}
	if w := request(router, http.MethodGet, "/api/practice-sessions/"+session.ID, ""); w.Code != 404 {
		t.Fatal(w.Code)
	}
	if w := request(router, http.MethodGet, "/api/practice-sessions/bad-id", ""); w.Code != 400 {
		t.Fatal(w.Code)
	}
}

func TestPracticeValidationAndRetention(t *testing.T) {
	router, service := setup(t)
	data := append([]byte{0x1a, 0x45, 0xdf, 0xa3}, []byte("....webmdata")...)
	for _, tc := range []struct {
		topic, duration, kind string
		data                  []byte
		status                int
	}{
		{"", "1", "video/webm", data, 400}, {"topic", "-1", "video/webm", data, 400}, {"topic", "abc", "video/webm", data, 400},
		{"topic", "1", "video/webm", []byte("<html>not recording</html>"), 400},
		{"topic", "1", "video/webm", bytes.Repeat(data, 400000), 413},
	} {
		if w := upload(t, router, tc.topic, tc.duration, tc.kind, tc.data); w.Code != tc.status {
			t.Fatalf("validation %d %s", w.Code, w.Body)
		}
	}
	var ids []string
	for range 2 {
		w := upload(t, router, "topic", "60", "video/webm", data)
		if w.Code != 201 {
			t.Fatal(w.Code, w.Body)
		}
		var item practice.Session
		if err := json.Unmarshal(w.Body.Bytes(), &item); err != nil {
			t.Fatal(err)
		}
		ids = append(ids, item.ID)
	}
	ctx := context.Background()
	if _, err := service.Pool.Exec(ctx, "UPDATE practice_sessions SET expires_at=$2 WHERE id=$1", ids[0], time.Now().UTC().Add(-time.Hour)); err != nil {
		t.Fatal(err)
	}
	if err := service.Cleanup(ctx); err != nil {
		t.Fatal(err)
	}
	items, err := service.List(ctx)
	if err != nil || len(items) != 1 || items[0].ID != ids[1] {
		t.Fatalf("cleanup deleted a future recording: %v, %v", items, err)
	}
	for _, body := range []string{`null`, `[]`, `{"unknownField":true}`, `{"fillerWordCount":-1}`, `{"notes":"` + strings.Repeat("a", 2001) + `"}`, `{} {}`} {
		if w := request(router, http.MethodPut, "/api/practice-sessions/"+ids[1]+"/review", body); w.Code != 400 {
			t.Fatal(w.Code, w.Body)
		}
	}
}

type observedStore struct {
	storage.RecordingStore
	failDelete bool
	lastKey    string
}

func (s *observedStore) Put(ctx context.Context, r io.ReadSeeker, size int64, kind string, at time.Time) (storage.Stored, error) {
	result, err := s.RecordingStore.Put(ctx, r, size, kind, at)
	s.lastKey = result.Key
	return result, err
}
func (s *observedStore) Delete(ctx context.Context, key string) error {
	if s.failDelete {
		return errors.New("test storage outage")
	}
	return s.RecordingStore.Delete(ctx, key)
}

func TestPracticeDeletionRetriesAndFailedInsertCompensates(t *testing.T) {
	router, service := setup(t)
	store := &observedStore{RecordingStore: service.Storage}
	service.Storage = store
	data := append([]byte{0x1a, 0x45, 0xdf, 0xa3}, []byte("....webmdata")...)
	w := upload(t, router, "topic", "60", "video/webm", data)
	if w.Code != 201 {
		t.Fatal(w.Code, w.Body)
	}
	var item practice.Session
	if err := json.Unmarshal(w.Body.Bytes(), &item); err != nil {
		t.Fatal(err)
	}
	store.failDelete = true
	if err := service.Delete(context.Background(), item.ID); err == nil {
		t.Fatal("expected storage failure")
	}
	var status string
	if err := service.Pool.QueryRow(context.Background(), "SELECT status FROM practice_sessions WHERE id=$1", item.ID).Scan(&status); err != nil || status != "DELETE_PENDING" {
		t.Fatal(status, err)
	}
	store.failDelete = false
	if err := service.Cleanup(context.Background()); err != nil {
		t.Fatal(err)
	}
	if _, err := store.Open(context.Background(), store.lastKey); !errors.Is(err, storage.ErrNotFound) {
		t.Fatal("deletion retry left media", err)
	}
	service.Pool.Close()
	w = upload(t, router, "topic", "60", "video/webm", data)
	if w.Code != 500 {
		t.Fatal("failed database write must fail request", w.Code, w.Body)
	}
	if _, err := store.Open(context.Background(), store.lastKey); !errors.Is(err, storage.ErrNotFound) {
		t.Fatal("failed insert left an orphan", err)
	}
}
