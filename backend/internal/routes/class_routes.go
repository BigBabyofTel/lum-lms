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

		protected.GET("/classes/:classId", h.GetClassesByID)
		protected.PUT("/classes/:classId", h.UpdateClass)
		protected.DELETE("/classes/:classId", h.DeleteClass)
		//enroll one student
		protected.POST("/classes/:classId/enroll", h.EnrollInClass)
		//get all enrolled students
		protected.GET("/classes/:classId/students", h.GetClassStudents)
		//get if student is enrolled
		protected.GET("/classes/:classId/students/:studentId/enrollment", h.GetClassEnrollments)
		// remove a student from the class
		protected.DELETE("/classes/:classId/students/:studentId", h.UnenrollStudent)
		// Get all students
		protected.GET("/students", h.GetStudents)
		// get all classes a student is in
		protected.GET("/students/:studentId/classes", h.GetStudentClasses)
		// enroll a student in multiple classes at a time
		protected.POST("/students/:studentId/enrollments", h.BatchEnrollment)

	}
}
