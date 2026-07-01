package routes

import (
	"os"

	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/BigBabyofTel/lum-lms/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterStreamRoutes(router *gin.RouterGroup, h *handlers.Handler) {
	protected := router.Group("").Use(middleware.AuthMiddleware(os.Getenv("JWT_SECRET")))
	{
		// Stream posts scoped to a class
		protected.GET("/classes/:classId/stream", h.GetStream)
		protected.POST("/classes/:classId/stream", h.CreatePost)
		protected.PATCH("/stream/:postId", h.UpdateStream)
		protected.DELETE("/stream/:postId", h.DeletePost)

		// Comments on a post
		protected.GET("/stream/:postId/comments", h.GetComments)
		protected.POST("/stream/:postId/comments", h.CreateComment)
		protected.PATCH("/stream/:postId/comments/:commentId", h.UpdateStream)
		protected.DELETE("/stream/:postId/comments/:commentId", h.DeleteComment)
	}
}
