package httpapi

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
)

func ID(c *gin.Context) (string, bool) {
	id, err := uuid.Parse(c.Param("id"))
	if err != nil {
		Error(c, 400, "Invalid session ID")
		return "", false
	}
	return id.String(), true
}

func JSON(c *gin.Context, target interface{}) bool {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 64*1024)
	decoder := json.NewDecoder(c.Request.Body)
	var raw json.RawMessage
	if err := decoder.Decode(&raw); err != nil {
		Error(c, 400, "Malformed or oversized request body")
		return false
	}
	trimmed := bytes.TrimSpace(raw)
	if len(trimmed) == 0 || trimmed[0] != '{' {
		Error(c, 400, "Request must be a JSON object")
		return false
	}
	objectDecoder := json.NewDecoder(bytes.NewReader(raw))
	objectDecoder.DisallowUnknownFields()
	if err := objectDecoder.Decode(target); err != nil {
		Error(c, 400, "Malformed request body or unknown fields")
		return false
	}
	if err := decoder.Decode(&struct{}{}); err != io.EOF {
		Error(c, 400, "Request must contain one JSON object")
		return false
	}
	return true
}

func Failure(c *gin.Context, err error) {
	switch {
	case errors.Is(err, pgx.ErrNoRows):
		Error(c, 404, "Session not found")
	case errors.Is(err, context.DeadlineExceeded):
		Error(c, 504, "The operation timed out. Please try again.")
	case errors.Is(err, context.Canceled):
		Error(c, 408, "The request was canceled")
	default:
		Error(c, 500, "The operation could not be completed. Please try again.")
	}
}
