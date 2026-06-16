package routes

import (
	"os"

	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/BigBabyofTel/lum-lms/internal/middleware"
	"github.com/gin-gonic/gin"
)

func RegisterAssignmentRoutes(router *gin.RouterGroup, h *handlers.Handler) {
	protected := router.Group("").Use(middleware.AuthMiddleware(os.Getenv("JWT_SECRET")))
	{
		protected.POST("/classes/:classId/assignments", h.CreateAssignment)
		protected.GET("/classes/:classId/assignments", h.GetClassAssignments)

		protected.GET("/assignments/:assignmentId", h.GetAssignment)
		protected.PUT("/assignments/:assignmentId", h.UpdateAssignment)
		protected.DELETE("/assignments/:assignmentId", h.DeleteAssignment)

		protected.POST("/assignments/:assignmentId/submit", h.SubmitAssignment)
		protected.GET("/assignments/:assignmentId/submissions", h.GetAssignmentSubmissions)
		protected.PATCH("/user-assignments/:userAssignmentId/grade", h.GradeUserAssignment)
		protected.GET("/classes/:classId/gradebook", h.GetClassGradebook)
	}
}
