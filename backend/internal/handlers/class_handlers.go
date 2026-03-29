package handlers

import (
	"fmt"
	"net/http"

	"github.com/BigBabyofTel/lum-lms/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *Handler) GetClasses(c *gin.Context) {
	teacherIdStr := c.Query("teacherId")
	teacherUUID, err := uuid.Parse(teacherIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	classes, err := h.DB.GetClasses(c, uuid.NullUUID{UUID: teacherUUID, Valid: true})
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, classes)
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
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"class created": classParams})

	fmt.Println("creating class")
}
