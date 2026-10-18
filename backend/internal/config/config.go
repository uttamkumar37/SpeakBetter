// Package config validates the environment once, before starting the server.
package config

import (
	"fmt"
	"net"
	"net/url"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Address         string
	AllowedOrigins  []string
	ShutdownTimeout time.Duration
	DatabaseURL     string
	StorageBackend  string
	StoragePath     string
	RetentionDays   int
	MaxUploadBytes  int64
	R2Endpoint      string
	R2Bucket        string
	R2AccessKey     string
	R2Secret        string
}

// Load accepts an environment lookup so tests do not mutate process globals.
func Load(getenv func(string) string) (Config, error) {
	host := getenv("HOST")
	if host == "" {
		host = "127.0.0.1"
	}
	port := getenv("PORT")
	if port == "" {
		port = "8081"
	}
	n, err := strconv.Atoi(port)
	if err != nil || n < 1 || n > 65535 {
		return Config{}, fmt.Errorf("PORT must be an integer between 1 and 65535")
	}
	origins := getenv("CORS_ALLOWED_ORIGINS")
	if origins == "" {
		origins = "http://localhost:5173"
	}
	allowed := make([]string, 0)
	for _, origin := range strings.Split(origins, ",") {
		origin = strings.TrimSpace(origin)
		u, err := url.Parse(origin)
		if err != nil || (u.Scheme != "http" && u.Scheme != "https") || u.Hostname() == "" ||
			u.User != nil || u.Path != "" || u.RawQuery != "" || u.Fragment != "" || strings.Contains(origin, "*") {
			return Config{}, fmt.Errorf("CORS_ALLOWED_ORIGINS must contain exact HTTP(S) origins without paths or wildcards")
		}
		allowed = append(allowed, origin)
	}
	backend := getenv("STORAGE_BACKEND")
	if backend == "" {
		backend = "local"
	}
	if backend != "local" && backend != "r2" {
		return Config{}, fmt.Errorf("STORAGE_BACKEND must be local or r2")
	}
	storagePath := getenv("RECORDING_STORAGE_PATH")
	if storagePath == "" {
		storagePath = "./data/recordings"
	}
	retention := 30
	if value := getenv("RECORDING_RETENTION_DAYS"); value != "" {
		retention, err = strconv.Atoi(value)
		if err != nil || retention < 1 || retention > 3650 {
			return Config{}, fmt.Errorf("RECORDING_RETENTION_DAYS must be between 1 and 3650")
		}
	}
	maxUpload := int64(524288000)
	if value := getenv("MAX_UPLOAD_BYTES"); value != "" {
		maxUpload, err = strconv.ParseInt(value, 10, 64)
		if err != nil || maxUpload < 1024 || maxUpload > 2147483648 {
			return Config{}, fmt.Errorf("MAX_UPLOAD_BYTES must be between 1024 and 2147483648")
		}
	}
	return Config{Address: net.JoinHostPort(host, strconv.Itoa(n)), AllowedOrigins: allowed,
		ShutdownTimeout: 10 * time.Second, DatabaseURL: getenv("DATABASE_URL"), StorageBackend: backend,
		StoragePath: storagePath, RetentionDays: retention, MaxUploadBytes: maxUpload,
		R2Endpoint: getenv("R2_ENDPOINT"), R2Bucket: getenv("R2_BUCKET_NAME"), R2AccessKey: getenv("R2_ACCESS_KEY_ID"), R2Secret: getenv("R2_SECRET_ACCESS_KEY")}, nil
}
