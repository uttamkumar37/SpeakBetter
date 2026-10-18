// Package storage persists media without knowing practice or interview details.
package storage

import (
	"bytes"
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"io"
	"mime"
	"regexp"
	"strings"
	"time"
)

var ErrNotFound = errors.New("recording is missing from storage")
var ErrInvalidMedia = errors.New("recording content does not match a supported media container")

type Stored struct {
	Key  string
	Size int64
}
type Source struct {
	File     io.ReadSeekCloser
	Size     int64
	Modified time.Time
	Redirect string
}

type RecordingStore interface {
	Put(context.Context, io.ReadSeeker, int64, string, time.Time) (Stored, error)
	Open(context.Context, string) (Source, error)
	Delete(context.Context, string) error
}

var extensions = map[string]string{
	"video/webm": "webm", "audio/webm": "webm", "video/mp4": "mp4", "audio/mp4": "mp4",
	"video/ogg": "ogv", "audio/ogg": "ogg", "audio/wav": "wav",
}

// VerifyContainer checks actual bytes, not the filename or multipart MIME alone.
// It verifies the container signature, not track presence, codec safety or quality.
func VerifyContainer(r io.ReadSeeker, claimed string) (string, error) {
	mediaType, _, err := mime.ParseMediaType(strings.SplitN(claimed, ";", 2)[0])
	if err != nil || extensions[mediaType] == "" {
		return "", ErrInvalidMedia
	}
	var header [512]byte
	n, err := io.ReadFull(r, header[:])
	if err != nil && err != io.EOF && err != io.ErrUnexpectedEOF {
		return "", err
	}
	if _, err := r.Seek(0, io.SeekStart); err != nil {
		return "", err
	}
	if n < 12 {
		return "", ErrInvalidMedia
	}
	b := header[:n]
	valid := false
	switch extensions[mediaType] {
	case "webm":
		valid = bytes.HasPrefix(b, []byte{0x1a, 0x45, 0xdf, 0xa3}) && bytes.Contains(b, []byte("webm"))
	case "mp4":
		valid = string(b[4:8]) == "ftyp"
	case "ogv", "ogg":
		valid = string(b[:4]) == "OggS"
	case "wav":
		valid = string(b[:4]) == "RIFF" && string(b[8:12]) == "WAVE"
	}
	if !valid {
		return "", ErrInvalidMedia
	}
	return mediaType, nil
}

func newKey(at time.Time, mediaType string) (string, error) {
	ext := extensions[mediaType]
	if ext == "" {
		return "", ErrInvalidMedia
	}
	var id [16]byte
	_, _ = rand.Read(id[:])
	id[6] = (id[6] & 0x0f) | 0x40
	id[8] = (id[8] & 0x3f) | 0x80
	uuid := fmt.Sprintf("%x-%x-%x-%x-%x", id[:4], id[4:6], id[6:8], id[8:10], id[10:])
	return fmt.Sprintf("%04d/%02d/%s.%s", at.Year(), at.Month(), uuid, ext), nil
}

var keyPattern = regexp.MustCompile(`^[0-9]{4}/[0-9]{2}/[a-fA-F0-9-]{36}\.(webm|mp4|ogv|ogg|wav)$`)

func validateKey(key string) error {
	if !keyPattern.MatchString(key) {
		return errors.New("invalid recording storage key")
	}
	return nil
}

type contextReader struct {
	ctx    context.Context
	reader io.Reader
}

func (r contextReader) Read(p []byte) (int, error) {
	if err := r.ctx.Err(); err != nil {
		return 0, err
	}
	return r.reader.Read(p)
}
