package routes

import (
	"net/http"

	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/gin-gonic/gin"
)

func RegisterRoutes(router *gin.Engine, h *handlers.Handler) {
	//health check
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "this link is working"})
	})

	v1 := router.Group("/api/v1")
	{
		RegisterClassRoutes(v1, h)
		RegisterAuthRoutes(v1, h)
		RegisterAssignmentRoutes(v1, h)
		RegisterStreamRoutes(v1, h)
	}

}
