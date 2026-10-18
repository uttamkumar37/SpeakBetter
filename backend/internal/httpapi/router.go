// Package httpapi owns HTTP routing and the common response boundary.
package httpapi

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type ErrorResponse struct {
	Timestamp time.Time `json:"timestamp"`
	Status    int       `json:"status"`
	Error     string    `json:"error"`
	Message   string    `json:"message"`
	RequestID string    `json:"requestId"`
}

func Error(c *gin.Context, status int, message string) {
	c.AbortWithStatusJSON(status, ErrorResponse{
		Timestamp: time.Now().UTC(), Status: status, Error: http.StatusText(status),
		Message: message, RequestID: c.GetString("requestID"),
	})
}

// New has no database or media side effects. Later slices register real features.
func New(logger *slog.Logger, allowedOrigins []string, readiness func(context.Context) error) *gin.Engine {
	router := gin.New()
	router.HandleMethodNotAllowed = true
	router.RedirectTrailingSlash = false
	// Do not trust arbitrary X-Forwarded-For headers from Internet clients.
	_ = router.SetTrustedProxies(nil)
	router.Use(requestContext(logger), recovery(logger), cors(allowedOrigins))
	router.NoRoute(func(c *gin.Context) { Error(c, http.StatusNotFound, "Route not found") })
	router.NoMethod(func(c *gin.Context) { Error(c, http.StatusMethodNotAllowed, "Method not allowed") })
	health := router.Group("/api/v2/health")
	health.GET("/live", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "alive", "service": "speakbetter-api"})
	})
	health.GET("/ready", func(c *gin.Context) {
		ctx, cancel := context.WithTimeout(c.Request.Context(), 2*time.Second)
		defer cancel()
		if readiness == nil || readiness(ctx) != nil {
			Error(c, http.StatusServiceUnavailable, "Database is unavailable or migrations are required")
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "ready", "service": "speakbetter-api"})
	})
	return router
}

var validRequestID = regexp.MustCompile(`^[A-Za-z0-9_-]{1,64}$`)

func requestContext(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-ID")
		if !validRequestID.MatchString(id) {
			var buf [16]byte
			_, _ = rand.Read(buf[:])
			id = hex.EncodeToString(buf[:])
		}
		c.Set("requestID", id)
		c.Header("X-Request-ID", id)
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("Cache-Control", "no-store")
		if !strings.HasPrefix(c.GetHeader("Content-Type"), "multipart/form-data") {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, 1024*1024)
		}
		start := time.Now()
		c.Next()
		// Route templates avoid recording private query strings, UUIDs or text.
		route := c.FullPath()
		if route == "" {
			route = "unmatched"
		}
		logger.Info("http request", "request_id", id, "method", c.Request.Method,
			"route", route, "status", c.Writer.Status(), "duration_ms", time.Since(start).Milliseconds())
	}
}

func recovery(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		defer func() {
			if recover() != nil {
				logger.Error("request panic", "request_id", c.GetString("requestID"))
				Error(c, http.StatusInternalServerError, "Something went wrong. Please try again.")
			}
		}()
		c.Next()
	}
}

func cors(origins []string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(origins))
	for _, origin := range origins {
		allowed[origin] = true
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" {
			c.Writer.Header().Add("Vary", "Origin")
			if !allowed[origin] {
				Error(c, http.StatusForbidden, "Origin is not allowed")
				return
			}
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Access-Control-Expose-Headers", "X-Request-ID, Content-Range, Accept-Ranges")
			if c.Request.Method == http.MethodOptions {
				c.Header("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS")
				c.Header("Access-Control-Allow-Headers", "Content-Type, X-Request-ID")
				c.AbortWithStatus(http.StatusNoContent)
				return
			}
		}
		c.Next()
	}
}
