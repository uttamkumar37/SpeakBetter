package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func testRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	return New(slog.New(slog.NewJSONHandler(io.Discard, nil)), []string{"http://localhost:5173"}, func(context.Context) error { return nil })
}

func TestHealthAndRequestID(t *testing.T) {
	for path, status := range map[string]string{"/api/v2/health/live": "alive", "/api/v2/health/ready": "ready"} {
		t.Run(path, func(t *testing.T) {
			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodGet, path, nil)
			r.Header.Set("X-Request-ID", "health-check_1")
			testRouter().ServeHTTP(w, r)
			var body map[string]string
			if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
				t.Fatal(err)
			}
			if w.Code != http.StatusOK || body["status"] != status || w.Header().Get("X-Request-ID") != "health-check_1" {
				t.Fatalf("unexpected health response: %d %s", w.Code, w.Body)
			}
		})
	}
}

func TestErrorsAndPanicDoNotExposeInternalDetails(t *testing.T) {
	router := testRouter()
	router.GET("/panic", func(c *gin.Context) { panic("secret database password") })
	for _, tc := range []struct {
		method, path string
		status       int
	}{
		{http.MethodGet, "/missing", 404}, {http.MethodPost, "/api/v2/health/live", 405}, {http.MethodGet, "/panic", 500},
	} {
		w := httptest.NewRecorder()
		r := httptest.NewRequest(tc.method, tc.path, nil)
		r.Header.Set("X-Request-ID", strings.Repeat("x", 100))
		router.ServeHTTP(w, r)
		var body ErrorResponse
		if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
			t.Fatal(err)
		}
		if w.Code != tc.status || body.Status != tc.status || body.Message == "" || len(body.RequestID) != 32 || strings.Contains(w.Body.String(), "secret") {
			t.Fatalf("unsafe/unexpected error: %d %s", w.Code, w.Body)
		}
	}
}

func TestCORSAllowlist(t *testing.T) {
	for _, tc := range []struct {
		origin, method string
		status         int
		allow          string
	}{
		{"http://localhost:5173", http.MethodGet, 200, "http://localhost:5173"},
		{"http://localhost:5173", http.MethodOptions, 204, "http://localhost:5173"},
		{"https://attacker.example", http.MethodGet, 403, ""},
		{"http://localhost:5173.attacker.example", http.MethodOptions, 403, ""},
		{"", http.MethodGet, 200, ""},
	} {
		w := httptest.NewRecorder()
		r := httptest.NewRequest(tc.method, "/api/v2/health/live", nil)
		r.Header.Set("Origin", tc.origin)
		testRouter().ServeHTTP(w, r)
		if w.Code != tc.status || w.Header().Get("Access-Control-Allow-Origin") != tc.allow {
			t.Fatalf("CORS %q: %d %v", tc.origin, w.Code, w.Header())
		}
	}
}

func TestAccessLogExcludesPrivateURLAndPanicValue(t *testing.T) {
	var logs bytes.Buffer
	router := New(slog.New(slog.NewJSONHandler(&logs, nil)), nil, nil)
	router.GET("/test/:id", func(c *gin.Context) { panic("private-panic-value") })
	w := httptest.NewRecorder()
	router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/test/private-id?transcript=private-text", nil))
	for _, secret := range []string{"private-id", "private-text", "private-panic-value"} {
		if strings.Contains(logs.String(), secret) {
			t.Fatalf("private data logged: %s", secret)
		}
	}
	if !strings.Contains(logs.String(), "/test/:id") {
		t.Fatal("missing route template in log")
	}
}

func TestReadinessFailureDoesNotAffectLiveness(t *testing.T) {
	for _, check := range []func(context.Context) error{nil, func(ctx context.Context) error {
		if _, ok := ctx.Deadline(); !ok {
			t.Error("missing readiness deadline")
		}
		return errors.New("private connection details")
	}} {
		router := New(slog.New(slog.NewJSONHandler(io.Discard, nil)), nil, check)
		for path, status := range map[string]int{"/api/v2/health/ready": 503, "/api/v2/health/live": 200} {
			w := httptest.NewRecorder()
			router.ServeHTTP(w, httptest.NewRequest(http.MethodGet, path, nil))
			if w.Code != status || strings.Contains(w.Body.String(), "private") {
				t.Fatalf("unexpected probe: %d %s", w.Code, w.Body)
			}
		}
	}
}
