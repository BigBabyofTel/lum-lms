package routes

import (
	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/gin-gonic/gin"
)

func RegisterClassRoutes(v1 *gin.RouterGroup, h *handlers.Handler) {

	classes := v1.Group("/classes")
	{
		classes.GET("", h.GetClasses)
		classes.POST("", h.CreateClass)
	}
}
