package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func (h *Handler) GetStudents(c *gin.Context) {
	students, err := h.DB.GetStudents(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "could not get students"})
	}

	c.JSON(http.StatusOK, students)
}
