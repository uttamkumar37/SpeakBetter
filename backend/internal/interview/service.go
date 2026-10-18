package interview

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/platform/storage"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/practice"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/recording"
)

var ErrQuestionNotFound = errors.New("Interview question not found")
var ErrRecordingState = errors.New("Recording can only be uploaded for a newly created interview session")

type Session struct {
	ID               string    `json:"id"`
	Role             string    `json:"role"`
	Level            string    `json:"level"`
	Category         string    `json:"category"`
	Question         Question  `json:"question"`
	Status           string    `json:"status"`
	TranscriptStatus string    `json:"transcriptStatus"`
	Transcript       *string   `json:"transcript"`
	AnalysisStatus   string    `json:"analysisStatus"`
	AnalysisResult   *string   `json:"analysisResult"`
	Metrics          Metrics   `json:"metrics"`
	DurationSeconds  *int      `json:"durationSeconds"`
	FileSizeBytes    *int64    `json:"fileSizeBytes"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
	ExpiresAt        time.Time `json:"expiresAt"`
	VideoURL         *string   `json:"videoUrl"`
	practice.Review
	Key  *string `json:"-"`
	MIME *string `json:"-"`
}

type Service struct {
	Pool          *pgxpool.Pool
	Storage       storage.RecordingStore
	RetentionDays int
}

const columns = `id::text,role,level,category,question_id,question_text_snapshot,status,transcript_status,transcript,analysis_status,analysis_result,duration_seconds,file_size_bytes,created_at,updated_at,expires_at,went_well,needs_improvement,filler_word_count,notes,file_path,original_mime_type`

func scan(row pgx.Row) (Session, error) {
	var s Session
	var questionID, text string
	err := row.Scan(&s.ID, &s.Role, &s.Level, &s.Category, &questionID, &text, &s.Status, &s.TranscriptStatus, &s.Transcript, &s.AnalysisStatus, &s.AnalysisResult, &s.DurationSeconds, &s.FileSizeBytes, &s.CreatedAt, &s.UpdatedAt, &s.ExpiresAt, &s.WentWell, &s.NeedsImprovement, &s.FillerWordCount, &s.Notes, &s.Key, &s.MIME)
	if err != nil {
		return s, err
	}
	q, ok := FindQuestion(questionID)
	if !ok {
		q = Question{questionID, s.Role, s.Level, s.Category, text, "This question is no longer active in the current catalog.", []string{}}
	}
	s.Question = q
	if s.TranscriptStatus != "READY" {
		s.Transcript = nil
	}
	if s.AnalysisStatus != "READY" {
		s.AnalysisResult = nil
	}
	s.Metrics = Measure(s.Category, s.DurationSeconds, s.Transcript)
	if s.Key != nil {
		videoURL := "/api/interview-sessions/" + s.ID + "/video"
		s.VideoURL = &videoURL
	}
	return s, nil
}

func (s *Service) Get(ctx context.Context, id string) (Session, error) {
	return scan(s.Pool.QueryRow(ctx, "SELECT "+columns+" FROM interview_sessions WHERE id=$1 AND status NOT IN ('DELETED','DELETE_PENDING')", id))
}

func (s *Service) List(ctx context.Context, role, level, category, questionID string) ([]Session, error) {
	rows, err := s.Pool.Query(ctx, "SELECT "+columns+` FROM interview_sessions WHERE status NOT IN ('DELETED','DELETE_PENDING')
		AND ($1='' OR role=$1) AND ($2='' OR level=$2) AND ($3='' OR category=$3) AND ($4='' OR question_id=$4) ORDER BY created_at DESC,id DESC`, role, level, category, questionID)
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

func (s *Service) Create(ctx context.Context, request CreateRequest, q Question) (Session, error) {
	id := uuid.NewString()
	now := time.Now().UTC()
	_, err := s.Pool.Exec(ctx, `INSERT INTO interview_sessions
		(id,role,level,category,question_id,question_text_snapshot,status,transcript_status,analysis_status,created_at,updated_at,expires_at)
		VALUES ($1,$2,$3,$4,$5,$6,'CREATED','NOT_CONFIGURED','NOT_CONFIGURED',$7,$7,$8)`, id, request.Role, request.Level, request.Category, q.ID, q.QuestionText, now, now.AddDate(0, 0, s.RetentionDays))
	if err != nil {
		return Session{}, err
	}
	return s.Get(ctx, id)
}

func (s *Service) SaveRecording(ctx context.Context, id string, upload recording.Upload) (Session, error) {
	current, err := s.Get(ctx, id)
	if err != nil {
		return Session{}, err
	}
	if current.Status != "CREATED" {
		return Session{}, ErrRecordingState
	}
	stored, err := s.Storage.Put(ctx, upload.File, upload.Size, upload.MIME, time.Now().UTC())
	if err != nil {
		return Session{}, err
	}
	tag, err := s.Pool.Exec(ctx, `UPDATE interview_sessions SET file_path=$2,original_mime_type=$3,file_size_bytes=$4,duration_seconds=$5,status='READY',updated_at=$6 WHERE id=$1 AND status='CREATED'`, id, stored.Key, upload.MIME, stored.Size, upload.Duration, time.Now().UTC())
	if err != nil || tag.RowsAffected() == 0 {
		cleanupCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = s.Storage.Delete(cleanupCtx, stored.Key)
		if err != nil {
			return Session{}, err
		}
		return Session{}, ErrRecordingState
	}
	return s.Get(ctx, id)
}

func (s *Service) UpdateReview(ctx context.Context, id string, r practice.Review) (Session, error) {
	tag, err := s.Pool.Exec(ctx, `UPDATE interview_sessions SET went_well=$2,needs_improvement=$3,filler_word_count=$4,notes=$5,updated_at=$6 WHERE id=$1 AND status NOT IN ('DELETED','DELETE_PENDING')`, id, r.WentWell, r.NeedsImprovement, r.FillerWordCount, r.Notes, time.Now().UTC())
	if err != nil {
		return Session{}, err
	}
	if tag.RowsAffected() == 0 {
		return Session{}, pgx.ErrNoRows
	}
	return s.Get(ctx, id)
}

func (s *Service) Delete(ctx context.Context, id string) error {
	var key *string
	if err := s.Pool.QueryRow(ctx, `UPDATE interview_sessions SET status='DELETE_PENDING' WHERE id=$1 AND status<>'DELETED' RETURNING file_path`, id).Scan(&key); err != nil {
		return err
	}
	if key != nil {
		if err := s.Storage.Delete(ctx, *key); err != nil {
			return err
		}
	}
	_, err := s.Pool.Exec(ctx, "DELETE FROM interview_sessions WHERE id=$1 AND status='DELETE_PENDING'", id)
	return err
}

func (s *Service) Cleanup(ctx context.Context) error {
	rows, err := s.Pool.Query(ctx, `SELECT id::text FROM interview_sessions WHERE status='DELETE_PENDING' OR (status<>'DELETED' AND expires_at<$1) LIMIT 100`, time.Now().UTC())
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
