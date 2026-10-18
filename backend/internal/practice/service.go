// Package practice preserves the V1 practice-session contract.
package practice

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/storage"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/recording"
)

type Review struct {
	WentWell         *string `json:"wentWell"`
	NeedsImprovement *string `json:"needsImprovement"`
	FillerWordCount  *int    `json:"fillerWordCount"`
	Notes            *string `json:"notes"`
}

func (r *Review) Validate() error {
	if r.FillerWordCount != nil && (*r.FillerWordCount < 0 || *r.FillerWordCount > 2147483647) {
		return errors.New("fillerWordCount must be a nonnegative integer")
	}
	for _, field := range []**string{&r.WentWell, &r.NeedsImprovement, &r.Notes} {
		if *field != nil {
			value := strings.TrimSpace(**field)
			if utf8.RuneCountInString(value) > 2000 {
				return errors.New("Review fields must be 2000 characters or fewer")
			}
			if value == "" {
				*field = nil
			} else {
				*field = &value
			}
		}
	}
	return nil
}

type Session struct {
	ID              string    `json:"id"`
	Topic           string    `json:"topic"`
	CreatedAt       time.Time `json:"createdAt"`
	DurationSeconds int       `json:"durationSeconds"`
	ExpiresAt       time.Time `json:"expiresAt"`
	VideoURL        string    `json:"videoUrl"`
	Review
	Key  string `json:"-"`
	MIME string `json:"-"`
	Size int64  `json:"-"`
}

type Service struct {
	Pool          *pgxpool.Pool
	Storage       storage.RecordingStore
	RetentionDays int
}

const columns = `id::text,topic,created_at,duration_seconds,expires_at,went_well,needs_improvement,filler_word_count,notes,file_path,original_mime_type,file_size_bytes`

func scan(row pgx.Row) (Session, error) {
	var s Session
	err := row.Scan(&s.ID, &s.Topic, &s.CreatedAt, &s.DurationSeconds, &s.ExpiresAt, &s.WentWell, &s.NeedsImprovement, &s.FillerWordCount, &s.Notes, &s.Key, &s.MIME, &s.Size)
	s.VideoURL = "/api/practice-sessions/" + s.ID + "/video"
	return s, err
}

func (s *Service) Get(ctx context.Context, id string) (Session, error) {
	return scan(s.Pool.QueryRow(ctx, "SELECT "+columns+" FROM practice_sessions WHERE id=$1 AND status='ACTIVE'", id))
}

func (s *Service) List(ctx context.Context) ([]Session, error) {
	rows, err := s.Pool.Query(ctx, "SELECT "+columns+" FROM practice_sessions WHERE status='ACTIVE' ORDER BY created_at DESC,id DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]Session, 0)
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return nil, err
		}
		result = append(result, item)
	}
	return result, rows.Err()
}

func (s *Service) Create(ctx context.Context, topic string, upload recording.Upload) (Session, error) {
	now := time.Now().UTC()
	id := uuid.NewString()
	stored, err := s.Storage.Put(ctx, upload.File, upload.Size, upload.MIME, now)
	if err != nil {
		return Session{}, err
	}
	_, err = s.Pool.Exec(ctx, `INSERT INTO practice_sessions
		(id,topic,file_path,original_mime_type,file_size_bytes,duration_seconds,created_at,expires_at,status)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'ACTIVE')`, id, topic, stored.Key, upload.MIME, stored.Size, upload.Duration, now, now.AddDate(0, 0, s.RetentionDays))
	if err != nil {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = s.Storage.Delete(cleanupCtx, stored.Key)
		return Session{}, err
	}
	return s.Get(ctx, id)
}

func (s *Service) UpdateReview(ctx context.Context, id string, r Review) (Session, error) {
	tag, err := s.Pool.Exec(ctx, `UPDATE practice_sessions SET went_well=$2,needs_improvement=$3,filler_word_count=$4,notes=$5 WHERE id=$1 AND status='ACTIVE'`, id, r.WentWell, r.NeedsImprovement, r.FillerWordCount, r.Notes)
	if err != nil {
		return Session{}, err
	}
	if tag.RowsAffected() == 0 {
		return Session{}, pgx.ErrNoRows
	}
	return s.Get(ctx, id)
}

// Delete records intent first. Storage failures leave a retryable tombstone.
func (s *Service) Delete(ctx context.Context, id string) error {
	var key string
	if err := s.Pool.QueryRow(ctx, `UPDATE practice_sessions SET status='DELETE_PENDING' WHERE id=$1 AND status IN ('ACTIVE','DELETE_PENDING') RETURNING file_path`, id).Scan(&key); err != nil {
		return err
	}
	if err := s.Storage.Delete(ctx, key); err != nil {
		return err
	}
	_, err := s.Pool.Exec(ctx, "DELETE FROM practice_sessions WHERE id=$1 AND status='DELETE_PENDING'", id)
	return err
}

func (s *Service) Cleanup(ctx context.Context) error {
	rows, err := s.Pool.Query(ctx, `SELECT id::text FROM practice_sessions WHERE status='DELETE_PENDING' OR (status='ACTIVE' AND expires_at < $1) LIMIT 100`, time.Now().UTC())
	if err != nil {
		return err
	}
	ids := make([]string, 0)
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		ids = append(ids, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	var failures []error
	for _, id := range ids {
		if err := s.Delete(ctx, id); err != nil {
			failures = append(failures, err)
		}
	}
	return errors.Join(failures...)
}
