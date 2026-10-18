package config

import "testing"

func TestLoadDefaultsAndOverrides(t *testing.T) {
	cfg, err := Load(func(string) string { return "" })
	if err != nil || cfg.Address != "127.0.0.1:8081" || len(cfg.AllowedOrigins) != 1 {
		t.Fatalf("unexpected defaults: %+v, %v", cfg, err)
	}
	values := map[string]string{"HOST": "::1", "PORT": "9081", "CORS_ALLOWED_ORIGINS": "https://coach.example, http://localhost:5173"}
	cfg, err = Load(func(key string) string { return values[key] })
	if err != nil || cfg.Address != "[::1]:9081" || len(cfg.AllowedOrigins) != 2 {
		t.Fatalf("unexpected overrides: %+v, %v", cfg, err)
	}
}

func TestLoadRejectsUnsafeOrInvalidConfiguration(t *testing.T) {
	for _, tc := range []struct{ key, value string }{
		{"PORT", "0"}, {"PORT", "65536"}, {"PORT", "abc"},
		{"STORAGE_BACKEND", "unknown"}, {"RECORDING_RETENTION_DAYS", "0"}, {"RECORDING_RETENTION_DAYS", "3651"},
		{"MAX_UPLOAD_BYTES", "0"}, {"MAX_UPLOAD_BYTES", "2147483649"},
		{"CORS_ALLOWED_ORIGINS", "*"}, {"CORS_ALLOWED_ORIGINS", "https://coach.example/path"},
		{"CORS_ALLOWED_ORIGINS", "https://user:secret@coach.example"}, {"CORS_ALLOWED_ORIGINS", "http://"},
		{"CORS_ALLOWED_ORIGINS", "https://coach.example,"},
	} {
		t.Run(tc.value, func(t *testing.T) {
			_, err := Load(func(key string) string {
				if key == tc.key {
					return tc.value
				}
				return ""
			})
			if err == nil {
				t.Fatal("expected configuration error")
			}
		})
	}
}
