package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"github.com/BigBabyofTel/lum-lms/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *Handler) GetClassesByID(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class id"})
		return
	}
	class, err := h.DB.GetClassByID(c, classID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)

	user, err := h.DB.GetUserByID(c, userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}
	if user.Type == database.RoleTeacher && class.TeacherID.UUID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this class"})
		return
	}

	if user.Type == database.RoleStudent {
		enrolled, _ := h.DB.IsStudentEnrolled(c, database.IsStudentEnrolledParams{
			ClassID:   class.ID,
			StudentID: userID,
		})

		if !enrolled {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not enrolled in this class"})
			return
		}
	}
	c.JSON(http.StatusOK, gin.H{"class": class})
}

func (h *Handler) GetClasses(c *gin.Context) {

	userID := c.MustGet("userID").(uuid.UUID)

	user, err := h.DB.GetUserByID(c, userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	switch user.Type {
	case database.RoleTeacher:
		classes, err := h.DB.GetClasses(c, uuid.NullUUID{UUID: userID, Valid: true})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"classes": classes})

	case database.RoleStudent:
		classes, err := h.DB.GetStudentClasses(c, userID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"classes": classes})

	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "role not permitted"})
	}
}

func (h *Handler) UpdateClass(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class id"})
		return
	}
	teacherID := c.MustGet("userID").(uuid.UUID)

	var params struct {
		Subject string `json:"subject" binding:"required"`
		Grade   int32  `json:"grade" binding:"required"`
		Color   string `json:"color"`
	}

	if err := c.BindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	updated, err := h.DB.UpdateClass(c, database.UpdateClassParams{
		ID:        classID,
		TeacherID: uuid.NullUUID{UUID: teacherID, Valid: true},
		Subject:   params.Subject,
		Grade:     params.Grade,
		Color:     params.Color,
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "class not found or not authorized"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"class": updated})
}

func (h *Handler) CreateClass(c *gin.Context) {

	//define the structure
	var parameters struct {
		Subject string `json:"subject" binding:"required"`
		Grade   int32  `json:"grade" binding:"required"`
	}
	// data binding
	if err := c.ShouldBindJSON(&parameters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	teacherID := c.MustGet("userID").(uuid.UUID)
	user, err := h.DB.GetUserByID(c, teacherID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if user.Type == database.RoleTeacher {
		//create params
		classParams := database.CreateClassParams{
			Subject:   parameters.Subject,
			Grade:     parameters.Grade,
			TeacherID: uuid.NullUUID{UUID: teacherID, Valid: true},
		}
		//add to db using cfg
		_, err = h.DB.CreateClass(c, classParams)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"class created": classParams})

		fmt.Println("creating class")
	} else {
		c.JSON(http.StatusForbidden, gin.H{"error": "role not permitted"})
		return
	}
}

func (h *Handler) DeleteClass(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class id"})
		return
	}
	teacherID := c.MustGet("userID").(uuid.UUID)

	err = h.DB.DeleteClass(c, database.DeleteClassParams{
		ID:        classID,
		TeacherID: uuid.NullUUID{UUID: teacherID, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete class"})
	}
	c.JSON(http.StatusOK, gin.H{"message": "class deleted"})
}

func (h *Handler) EnrollInClass(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class id"})
		return
	}

	teacherID := c.MustGet("userID").(uuid.UUID)

	user, err := h.DB.GetUserByID(c, teacherID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if user.Type != database.RoleStudent {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only teachers can enroll students"})
		return
	}

	class, err := h.DB.GetClassByID(c, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Class not found"})
		return
	}

	if !class.TeacherID.Valid || class.TeacherID.UUID != teacherID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this class"})
		return
	}

	var params struct {
		Email string `json:"email" binding:"required"`
	}
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	student, err := h.DB.GetUserByEmail(c, params.Email)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	if student.Type != database.RoleStudent {
		c.JSON(http.StatusForbidden, gin.H{"error": "User is not a student"})
		return
	}

	enrollment, err := h.DB.EnrollStudent(c, database.EnrollStudentParams{
		classID:   classID,
		StudentID: student.ID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusConflict, gin.H{"error": "Student already enrolled"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not enroll student"})
	}

	c.JSON(http.StatusOK, gin.H{"enrollment": enrollment})

}

func (h *Handler) GetClassStudents(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class id"})
		return
	}
	teacherID := c.MustGet("userID").(uuid.UUID)

	user, err := h.DB.GetUserByID(c, teacherID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if user.Type != 

}
