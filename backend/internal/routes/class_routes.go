package routes

import (
	"os"

	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/BigBabyofTel/lum-lms/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterClassRoutes(router *gin.RouterGroup, h *handlers.Handler) {
	protected := router.Group("").Use(middleware.AuthMiddleware(os.Getenv("JWT_SECRET")))
	{
		protected.GET("/classes", h.GetClasses)
		protected.POST("/classes", h.CreateClass)

		protected.GET("/classes/:id", h.GetClassesByID)
		protected.PUT("/classes/:id", h.UpdateClass)
		protected.DELETE("/classes/:id", h.DeleteClass)

		protected.POST("/classes/:id/enroll", h.EnrollInClass)
		protected.GET("/classes/:id/students", h.GetClassStudents)
	}
}
