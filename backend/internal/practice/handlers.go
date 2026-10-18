package practice

import (
	"strings"
	"unicode/utf8"

	"github.com/gin-gonic/gin"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/httpapi"
	"github.com/uttamkumar37/SpeakBetter/backend/internal/recording"
)

func Register(router *gin.Engine, service *Service, maxUpload int64) {
	g := router.Group("/api/practice-sessions")
	g.GET("", func(c *gin.Context) {
		result, err := service.List(c.Request.Context())
		if err != nil {
			httpapi.Failure(c, err)
			return
		}
		c.JSON(200, result)
	})
	g.POST("", func(c *gin.Context) {
		upload, cleanup, ok := recording.ReadUpload(c, maxUpload)
		defer cleanup()
		if !ok {
			return
		}
		topic := strings.TrimSpace(c.Request.FormValue("topic"))
		if topic == "" || utf8.RuneCountInString(topic) > 255 {
			httpapi.Error(c, 400, "Topic must contain between 1 and 255 characters")
			return
		}
		result, err := service.Create(c.Request.Context(), topic, upload)
		if err != nil {
			httpapi.Failure(c, err)
			return
		}
		c.JSON(201, result)
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
	g.PUT("/:id/review", func(c *gin.Context) {
		id, ok := httpapi.ID(c)
		if !ok {
			return
		}
		var review Review
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
		recording.Stream(c, service.Storage, result.Key, result.MIME, result.Size)
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
