package storage

import (
	"bytes"
	"context"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestMediaContainerVerification(t *testing.T) {
	for _, tc := range []struct {
		kind  string
		data  []byte
		valid bool
	}{
		{"video/webm;codecs=vp8,opus", append([]byte{0x1a, 0x45, 0xdf, 0xa3}, []byte("....webmdata")...), true},
		{"audio/wav", []byte("RIFF....WAVEdata"), true},
		{"video/mp4", []byte("....ftypmp42data"), true},
		{"video/ogg", []byte("OggS............"), true},
		{"video/webm", []byte("<script>alert(1)</script>"), false},
		{"video/mp4", []byte("RIFF....WAVEdata"), false},
		{"application/octet-stream", []byte("....ftypmp42data"), false},
		{"audio/wav", []byte("RIFF"), false},
	} {
		r := bytes.NewReader(tc.data)
		_, err := VerifyContainer(r, tc.kind)
		if (err == nil) != tc.valid {
			t.Fatalf("%s: %v", tc.kind, err)
		}
		if pos, _ := r.Seek(0, io.SeekCurrent); pos != 0 {
			t.Fatal("media reader was not rewound")
		}
	}
}

func TestLocalPersistenceRangeAndDeletion(t *testing.T) {
	s, err := NewLocal(t.TempDir())
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	data := []byte("0123456789abcdefghijklmnop")
	stored, err := s.Put(context.Background(), bytes.NewReader(data), int64(len(data)), "video/webm", time.Date(2026, 10, 18, 0, 0, 0, 0, time.UTC))
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(stored.Key, "2026/10/") || stored.Size != int64(len(data)) {
		t.Fatal(stored)
	}
	source, err := s.Open(context.Background(), stored.Key)
	if err != nil {
		t.Fatal(err)
	}
	defer source.File.Close()
	for _, tc := range []struct {
		rangeHeader string
		status      int
		body        string
	}{
		{"", 200, string(data)}, {"bytes=2-5", 206, "2345"}, {"bytes=-4", 206, "mnop"}, {"bytes=999-", 416, ""},
	} {
		w := httptest.NewRecorder()
		r := httptest.NewRequest(http.MethodGet, "/video", nil)
		r.Header.Set("Range", tc.rangeHeader)
		http.ServeContent(w, r, stored.Key, source.Modified, source.File)
		if w.Code != tc.status || (tc.status != 416 && w.Body.String() != tc.body) {
			t.Fatalf("range %q: %d %s", tc.rangeHeader, w.Code, w.Body)
		}
	}
	if err := s.Delete(context.Background(), stored.Key); err != nil {
		t.Fatal(err)
	}
	if err := s.Delete(context.Background(), stored.Key); err != nil {
		t.Fatal("delete must be idempotent:", err)
	}
	if _, err := s.Open(context.Background(), stored.Key); err != ErrNotFound {
		t.Fatal(err)
	}
}

func TestLocalRejectsTraversalAndSymlinkEscape(t *testing.T) {
	dir := t.TempDir()
	s, err := NewLocal(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	for _, key := range []string{"../private", "/etc/passwd", "2026/10/../../../private"} {
		if _, err := s.Open(context.Background(), key); err == nil {
			t.Fatal("unsafe key accepted")
		}
		if err := s.Delete(context.Background(), key); err == nil {
			t.Fatal("unsafe delete accepted")
		}
	}
	outside := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "2026"), 0o750); err != nil {
		t.Fatal(err)
	}
	if err := os.Symlink(outside, filepath.Join(dir, "2026", "10")); err != nil {
		t.Fatal(err)
	}
	if _, err := s.Put(context.Background(), strings.NewReader("data"), 4, "video/webm", time.Date(2026, 10, 18, 0, 0, 0, 0, time.UTC)); err == nil {
		t.Fatal("symlink escape accepted")
	}
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	if _, err := s.Open(ctx, "2026/10/00000000-0000-4000-8000-000000000001.webm"); err == nil {
		t.Fatal("cancellation ignored")
	}
}

func TestLocalFailedWritesDoNotLeaveOrphans(t *testing.T) {
	dir := t.TempDir()
	s, err := NewLocal(dir)
	if err != nil {
		t.Fatal(err)
	}
	defer s.Close()
	if _, err := s.Put(context.Background(), strings.NewReader("short"), 100, "video/webm", time.Now()); err == nil {
		t.Fatal("short write accepted")
	}
	var files int
	err = filepath.WalkDir(dir, func(_ string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if !d.IsDir() {
			files++
		}
		return nil
	})
	if err != nil || files != 0 {
		t.Fatalf("orphan files %d: %v", files, err)
	}
}
