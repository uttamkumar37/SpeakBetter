package storage

import (
	"context"
	"errors"
	"io"
	"net/http"
	"net/url"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	smithyhttp "github.com/aws/smithy-go/transport/http"
)

type R2 struct {
	client    *s3.Client
	presigner *s3.PresignClient
	bucket    string
}

func NewR2(endpoint, bucket, accessKey, secret string) (*R2, error) {
	u, err := url.Parse(endpoint)
	if err != nil || u.Scheme != "https" || u.Host == "" || bucket == "" || accessKey == "" || secret == "" {
		return nil, errors.New("R2 endpoint, bucket and credentials must be configured")
	}
	client := s3.New(s3.Options{
		Region: "auto", BaseEndpoint: aws.String(endpoint), UsePathStyle: true,
		Credentials: credentials.NewStaticCredentialsProvider(accessKey, secret, ""),
		HTTPClient:  &http.Client{Timeout: 30 * time.Second},
	})
	return &R2{client: client, presigner: s3.NewPresignClient(client), bucket: bucket}, nil
}

func (s *R2) Put(ctx context.Context, r io.ReadSeeker, size int64, mediaType string, at time.Time) (Stored, error) {
	key, err := newKey(at, mediaType)
	if err != nil {
		return Stored{}, err
	}
	_, err = s.client.PutObject(ctx, &s3.PutObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key), Body: r,
		ContentType: aws.String(mediaType), ContentLength: aws.Int64(size)})
	if err != nil {
		return Stored{}, errors.New("R2 recording upload failed")
	}
	return Stored{key, size}, nil
}

func (s *R2) Open(ctx context.Context, key string) (Source, error) {
	if err := validateKey(key); err != nil {
		return Source{}, err
	}
	_, err := s.client.HeadObject(ctx, &s3.HeadObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)})
	if err != nil {
		var response *smithyhttp.ResponseError
		if errors.As(err, &response) && response.HTTPStatusCode() == 404 {
			return Source{}, ErrNotFound
		}
		return Source{}, errors.New("R2 recording lookup failed")
	}
	result, err := s.presigner.PresignGetObject(ctx, &s3.GetObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)},
		func(options *s3.PresignOptions) { options.Expires = 15 * time.Minute })
	if err != nil {
		return Source{}, errors.New("R2 playback authorization failed")
	}
	return Source{Redirect: result.URL}, nil
}

func (s *R2) Delete(ctx context.Context, key string) error {
	if err := validateKey(key); err != nil {
		return err
	}
	_, err := s.client.DeleteObject(ctx, &s3.DeleteObjectInput{Bucket: aws.String(s.bucket), Key: aws.String(key)})
	if err != nil {
		return errors.New("R2 recording deletion failed")
	}
	return nil
}
