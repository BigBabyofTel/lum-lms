package routes

import (
	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(router *gin.RouterGroup, h *handlers.Handler) {

	users := router.Group("/users")
	{
		users.GET("", h.GetStudents)
	}
}
