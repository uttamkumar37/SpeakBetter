package interview

import (
	"errors"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/httpapi"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/practice"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/recording"
)

func Register(router *gin.Engine, service *Service, maxUpload int64) {
	questions := router.Group("/api/interview-questions")
	questions.GET("", func(c *gin.Context) {
		role, level, category := c.Query("role"), c.Query("level"), c.Query("category")
		if err := ValidateFilters(role, level, category); err != nil {
			httpapi.Error(c, 400, err.Error())
			return
		}
		c.JSON(200, Questions(role, level, category))
	})
	questions.GET("/:id", func(c *gin.Context) {
		q, ok := FindQuestion(c.Param("id"))
		if !ok {
			httpapi.Error(c, 404, ErrQuestionNotFound.Error())
			return
		}
		c.JSON(200, q)
	})
	g := router.Group("/api/interview-sessions")
	g.POST("", func(c *gin.Context) {
		var request CreateRequest
		if !httpapi.JSON(c, &request) {
			return
		}
		q, err := request.Validate()
		if err != nil {
			status := 400
			if errors.Is(err, ErrQuestionNotFound) {
				status = 404
			}
			httpapi.Error(c, status, err.Error())
			return
		}
		result, err := service.Create(c.Request.Context(), request, q)
		if err != nil {
			httpapi.Failure(c, err)
			return
		}
		c.JSON(201, result)
	})
	g.GET("", func(c *gin.Context) {
		role, level, category := c.Query("role"), c.Query("level"), c.Query("category")
		if err := ValidateFilters(role, level, category); err != nil {
			httpapi.Error(c, 400, err.Error())
			return
		}
		result, err := service.List(c.Request.Context(), role, level, category, strings.TrimSpace(c.Query("questionId")))
		if err != nil {
			httpapi.Failure(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.GET("/:id", func(c *gin.Context) {
		id, ok := httpapi.ID(c)
		if !ok {
			return
		}
		result, err := service.Get(c.Request.Context(), id)
		if err != nil {
			httpapi.Failure(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.POST("/:id/recording", func(c *gin.Context) {
		id, ok := httpapi.ID(c)
		if !ok {
			return
		}
		upload, cleanup, ok := recording.ReadUpload(c, maxUpload)
		defer cleanup()
		if !ok {
			return
		}
		result, err := service.SaveRecording(c.Request.Context(), id, upload)
		if errors.Is(err, ErrRecordingState) {
			httpapi.Error(c, 400, err.Error())
			return
		}
		if err != nil {
			httpapi.Failure(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.PUT("/:id/review", func(c *gin.Context) {
		id, ok := httpapi.ID(c)
		if !ok {
			return
		}
		var review practice.Review
		if !httpapi.JSON(c, &review) {
			return
		}
		if err := review.Validate(); err != nil {
			httpapi.Error(c, 400, err.Error())
			return
		}
		result, err := service.UpdateReview(c.Request.Context(), id, review)
		if err != nil {
			httpapi.Failure(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.Match([]string{"GET", "HEAD"}, "/:id/video", func(c *gin.Context) {
		id, ok := httpapi.ID(c)
		if !ok {
			return
		}
		result, err := service.Get(c.Request.Context(), id)
		if err != nil {
			httpapi.Failure(c, err)
			return
		}
		if result.Key == nil || result.MIME == nil || result.FileSizeBytes == nil {
			httpapi.Error(c, 400, "Recording has not been uploaded for this interview session")
			return
		}
		recording.Stream(c, service.Storage, *result.Key, *result.MIME, *result.FileSizeBytes)
	})
	g.DELETE("/:id", func(c *gin.Context) {
		id, ok := httpapi.ID(c)
		if !ok {
			return
		}
		if err := service.Delete(c.Request.Context(), id); err != nil {
			httpapi.Failure(c, err)
			return
		}
		c.Status(204)
	})
}
