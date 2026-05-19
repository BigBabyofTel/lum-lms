package routes

import (
	"os"

	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/BigBabyofTel/lum-lms/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterClassRoutes(router *gin.RouterGroup, h *handlers.Handler) {
	protected := router.Group("/classes").Use(middleware.AuthMiddleware(os.Getenv("JWT_SECRET")))
	{
		protected.GET("", h.GetClasses)
		protected.POST("", h.CreateClass)

		protected.GET("/:id", h.GetClassesByID)
		protected.PUT("/:id", h.UpdateClass)
		protected.DELETE("/:id", h.DeleteClass)

		protected.POST("/:id/enroll", h.EnrollInClass)
		protected.GET("/:id/students", h.GetClassStudents)
	}
}
