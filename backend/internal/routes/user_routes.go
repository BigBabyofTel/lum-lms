package routes

import (
	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/BigBabyofTel/lum-lms/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterUserRoutes(router *gin.RouterGroup, h *handlers.Handler) {
	users := router.Group("/users")
	{
		users.POST("/register", h.Register)
		users.POST("/login", middleware.RateLimit(), h.Login)
		users.POST("/refresh", h.Refresh)
		users.POST("/logout", h.Logout)
		users.GET("/", h.GetStudents)
	}
}
