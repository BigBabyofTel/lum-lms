package handlers

import (
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
	userRole := c.MustGet("userRole").(string)

	if userRole == "teacher" && class.TeacherID.UUID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this class"})
		return
	}

	if userRole == "student" {
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
	userRole := c.MustGet("userRole").(string)

	switch userRole {
	case "teacher":
		classes, err := h.DB.GetClasses(c, uuid.NullUUID{UUID: userID, Valid: true})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"classes": classes})

	case "student":
		classes, err := h.DB.GetClasses(c, uuid.NullUUID{UUID: userID, Valid: true})
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
		Subject   string `json:"subject" binding:"required"`
		Grade     int32  `json:"grade" binding:"required"`
		TeacherId string `json:"teacher_id" binding:"required"`
	}
	// data binding
	if err := c.ShouldBindJSON(&parameters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	teacherUUID, err := uuid.Parse(parameters.TeacherId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "TeacherId is not a valid UUID"})
		return
	}
	//create params
	classParams := database.CreateClassParams{
		Subject:   parameters.Subject,
		Grade:     parameters.Grade,
		TeacherID: uuid.NullUUID{UUID: teacherUUID, Valid: true},
	}
	//add to db using cfg
	_, err = h.DB.CreateClass(c, classParams)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"class created": classParams})

	fmt.Println("creating class")
}

func (h *Handler) DeleteClass(c *gin.Context) {
	classID, _ := uuid.Parse(c.Param("id"))
	teacherID, _ := c.MustGet("userID").(uuid.UUID)

	err := h.DB.DeleteClass(c, database.DeleteClassParams{
		ID:        classID,
		TeacherID: uuid.NullUUID{UUID: teacherID, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete class"})
	}
	c.JSON(http.StatusOK, gin.H{"message": "class deleted"})
}
