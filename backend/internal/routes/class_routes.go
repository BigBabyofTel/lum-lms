package routes

import (
	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/gin-gonic/gin"
)

func RegisterClassRoutes(router *gin.RouterGroup, h *handlers.Handler) {

	classes := router.Group("/classes")
	{
		classes.GET("", h.GetClasses)
		classes.POST("", h.CreateClass)
	}
}
