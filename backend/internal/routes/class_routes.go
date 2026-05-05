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
		protected.GET("/get", h.GetClasses)
		protected.POST("/create", h.CreateClass)
	}

}
