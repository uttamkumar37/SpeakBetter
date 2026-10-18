package storage

import (
	"context"
	"errors"
	"io"
	"os"
	"path"
	"time"
)

type Local struct{ root *os.Root }

func NewLocal(directory string) (*Local, error) {
	if err := os.MkdirAll(directory, 0o750); err != nil {
		return nil, errors.New("could not create recording directory")
	}
	root, err := os.OpenRoot(directory)
	if err != nil {
		return nil, errors.New("could not open recording directory")
	}
	return &Local{root: root}, nil
}

func (s *Local) Close() error { return s.root.Close() }

func (s *Local) Put(ctx context.Context, r io.ReadSeeker, size int64, mediaType string, at time.Time) (Stored, error) {
	key, err := newKey(at, mediaType)
	if err != nil {
		return Stored{}, err
	}
	if err := s.root.MkdirAll(path.Dir(key), 0o750); err != nil {
		return Stored{}, err
	}
	f, err := s.root.OpenFile(key, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0o640)
	if err != nil {
		return Stored{}, err
	}
	ok := false
	defer func() {
		if !ok {
			_ = f.Close()
			_ = s.root.Remove(key)
		}
	}()
	n, err := io.Copy(f, io.LimitReader(contextReader{ctx, r}, size+1))
	if err != nil {
		return Stored{}, err
	}
	if n != size {
		return Stored{}, errors.New("recording size changed while saving")
	}
	if err := f.Sync(); err != nil {
		return Stored{}, err
	}
	if err := f.Close(); err != nil {
		return Stored{}, err
	}
	ok = true
	return Stored{key, n}, nil
}

func (s *Local) Open(ctx context.Context, key string) (Source, error) {
	if err := ctx.Err(); err != nil {
		return Source{}, err
	}
	if err := validateKey(key); err != nil {
		return Source{}, err
	}
	f, err := s.root.Open(key)
	if errors.Is(err, os.ErrNotExist) {
		return Source{}, ErrNotFound
	}
	if err != nil {
		return Source{}, err
	}
	info, err := f.Stat()
	if err != nil || !info.Mode().IsRegular() {
		_ = f.Close()
		return Source{}, ErrNotFound
	}
	return Source{File: f, Size: info.Size(), Modified: info.ModTime()}, nil
}

func (s *Local) Delete(ctx context.Context, key string) error {
	if err := ctx.Err(); err != nil {
		return err
	}
	if err := validateKey(key); err != nil {
		return err
	}
	err := s.root.Remove(key)
	if errors.Is(err, os.ErrNotExist) {
		return nil
	}
	return err
}
