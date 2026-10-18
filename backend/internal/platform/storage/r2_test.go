package storage

import (
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"github.com/aws/aws-sdk-go-v2/service/s3"
)

func TestR2SignedUploadPlaybackDeleteAndMissingObject(t *testing.T) {
	missing := false
	var uploaded, deleted bool
	server := httptest.NewTLSServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !strings.HasPrefix(r.Header.Get("Authorization"), "AWS4-HMAC-SHA256 ") {
			t.Error("request is not signed")
		}
		if !strings.HasPrefix(r.URL.Path, "/private-recordings/2026/10/") {
			t.Error("unexpected object path", r.URL.Path)
		}
		switch r.Method {
		case http.MethodPut:
			data, err := io.ReadAll(r.Body)
			if err != nil || string(data) != "real-upload-bytes" {
				t.Error("upload bytes changed")
			}
			uploaded = true
			w.Header().Set("ETag", `"test-etag"`)
			w.WriteHeader(200)
		case http.MethodHead:
			if missing {
				w.WriteHeader(404)
			} else {
				w.Header().Set("Content-Length", "17")
				w.WriteHeader(200)
			}
		case http.MethodDelete:
			deleted = true
			w.WriteHeader(204)
		default:
			t.Error("unexpected operation", r.Method)
			w.WriteHeader(400)
		}
	}))
	defer server.Close()
	store, err := NewR2(server.URL, "private-recordings", "test-access", "test-secret")
	if err != nil {
		t.Fatal(err)
	}
	options := store.client.Options()
	options.HTTPClient = server.Client()
	store.client = s3.New(options)
	store.presigner = s3.NewPresignClient(store.client)
	stored, err := store.Put(context.Background(), strings.NewReader("real-upload-bytes"), 17, "video/webm", time.Date(2026, 10, 18, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	source, err := store.Open(context.Background(), stored.Key)
	if err != nil {
		t.Fatal(err)
	}
	u, err := url.Parse(source.Redirect)
	if err != nil {
		t.Fatal(err)
	}
	if u.Query().Get("X-Amz-Expires") != "900" || u.Query().Get("X-Amz-Signature") == "" {
		t.Fatal("expected expiring signed playback URL")
	}
	if err := store.Delete(context.Background(), stored.Key); err != nil {
		t.Fatal(err)
	}
	missing = true
	if _, err := store.Open(context.Background(), stored.Key); err != ErrNotFound {
		t.Fatal("expected missing object", err)
	}
	if !uploaded || !deleted {
		t.Fatal("storage lifecycle was incomplete")
	}
}
