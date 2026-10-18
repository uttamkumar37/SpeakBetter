// Package recording shares bounded upload and streaming behavior across features.
package recording

import (
	"errors"
	"mime/multipart"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/httpapi"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/storage"
)

type Upload struct {
	File     multipart.File
	Size     int64
	MIME     string
	Duration int
}

// ReadUpload always returns a cleanup function, including on malformed requests.
func ReadUpload(c *gin.Context, limit int64) (Upload, func(), bool) {
	var file multipart.File
	cleanup := func() {
		if file != nil {
			_ = file.Close()
		}
		if c.Request.MultipartForm != nil {
			_ = c.Request.MultipartForm.RemoveAll()
		}
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, limit+2*1024*1024)
	if err := c.Request.ParseMultipartForm(8 * 1024 * 1024); err != nil {
		var large *http.MaxBytesError
		if errors.As(err, &large) {
			httpapi.Error(c, 413, "Recording exceeds the maximum upload size")
		} else {
			httpapi.Error(c, 400, "A valid multipart recording is required")
		}
		return Upload{}, cleanup, false
	}
	f, header, err := c.Request.FormFile("video")
	if err != nil {
		httpapi.Error(c, 400, "A recording in the video field is required")
		return Upload{}, cleanup, false
	}
	file = f
	if header.Size <= 0 || header.Size > limit {
		httpapi.Error(c, 413, "Recording is empty or exceeds the maximum upload size")
		return Upload{}, cleanup, false
	}
	duration, err := strconv.Atoi(c.Request.FormValue("durationSeconds"))
	if err != nil || duration < 0 || duration > 2147483647 {
		httpapi.Error(c, 400, "durationSeconds must be a nonnegative integer")
		return Upload{}, cleanup, false
	}
	mediaType, err := storage.VerifyContainer(file, header.Header.Get("Content-Type"))
	if err != nil {
		httpapi.Error(c, 400, "Recording content must match a supported WebM, MP4, Ogg or WAV container")
		return Upload{}, cleanup, false
	}
	return Upload{File: file, Size: header.Size, MIME: mediaType, Duration: duration}, cleanup, true
}

func Stream(c *gin.Context, store storage.RecordingStore, key, mediaType string, expectedSize int64) {
	source, err := store.Open(c.Request.Context(), key)
	if errors.Is(err, storage.ErrNotFound) {
		httpapi.Error(c, 404, "Recording file is missing")
		return
	}
	if err != nil {
		httpapi.Failure(c, err)
		return
	}
	if source.Redirect != "" {
		c.Redirect(http.StatusFound, source.Redirect)
		return
	}
	defer source.File.Close()
	if source.Size != expectedSize {
		httpapi.Error(c, 500, "Recording file is incomplete or corrupted")
		return
	}
	c.Header("Content-Type", mediaType)
	c.Header("Accept-Ranges", "bytes")
	http.ServeContent(c.Writer, c.Request, key, source.Modified, source.File)
}
