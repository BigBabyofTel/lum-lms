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

func (h *Handler) requireTeacherOwnedClass(c *gin.Context) (database.Class, uuid.UUID, bool) {
	classID, err := uuid.Parse(c.Param("classId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class id"})
		return database.Class{}, uuid.Nil, false
	}

	teacherID := c.MustGet("userID").(uuid.UUID)

	user, err := h.DB.GetUserByID(c, teacherID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return database.Class{}, uuid.Nil, false
	}

	if user.Type != database.RoleTeacher {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only teachers can access this class"})
		return database.Class{}, uuid.Nil, false
	}

	class, err := h.DB.GetClassByID(c, classID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return database.Class{}, uuid.Nil, false
	}

	if !class.TeacherID.Valid || class.TeacherID.UUID != teacherID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this class"})
		return database.Class{}, uuid.Nil, false
	}

	return class, classID, true
}

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
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "class deleted"})
}

func (h *Handler) EnrollInClass(c *gin.Context) {

	_, classID, ok := h.requireTeacherOwnedClass(c)
	if !ok {
		return
	}

	var params struct {
		Email string `json:"email" binding:"required,email"`
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
		ClassID:   classID,
		StudentID: student.ID,
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusConflict, gin.H{"error": "Student already enrolled"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not enroll student"})
		return
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
		c.JSON(http.StatusForbidden, gin.H{"error": "User not found"})
		return
	}

	if user.Type != database.RoleTeacher {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Only teachers can get class's students"})
		return
	}
	class, err := h.DB.GetClassByID(c, classID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "You do not own this class"})
		return
	}
	if !class.TeacherID.Valid || class.TeacherID.UUID != teacherID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this class"})
		return
	}
	students, err := h.DB.GetClassStudents(c, classID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not get class students"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"students": students})
}

func (h *Handler) UnenrollStudent(c *gin.Context) {
	_, classID, ok := h.requireTeacherOwnedClass(c)
	if !ok {
		return
	}

	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student id"})
		return
	}

	err = h.DB.UnenrollStudent(c, database.UnenrollStudentParams{
		ClassID:   classID,
		StudentID: studentID,
	})

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not unenroll student"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "unenrolled student"})
}

func (h *Handler) GetStudentClasses(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student id"})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)

	user, err := h.DB.GetUserByID(c, userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if user.Type == database.RoleStudent && userID != studentID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only view your own classes"})
		return
	}

	if user.Type != database.RoleStudent && user.Type != database.RoleTeacher {
		c.JSON(http.StatusForbidden, gin.H{"error": "role not permitted"})
		return
	}

	classes, err := h.DB.GetStudentClasses(c, studentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not get student classes"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"classes": classes})
}

func (h *Handler) GetClassEnrollments(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("classId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class id"})
		return
	}

	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student id"})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)

	user, err := h.DB.GetUserByID(c, userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if user.Type == database.RoleStudent && userID != studentID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only view your own enrollment"})
		return
	}

	if user.Type == database.RoleTeacher {
		class, err := h.DB.GetClassByID(c, classID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
			return
		}

		if !class.TeacherID.Valid || class.TeacherID.UUID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this class"})
			return
		}
	}

	if user.Type != database.RoleStudent && user.Type != database.RoleTeacher {
		c.JSON(http.StatusForbidden, gin.H{"error": "role not permitted"})
		return
	}

	enrolled, err := h.DB.IsStudentEnrolled(c, database.IsStudentEnrolledParams{
		ClassID:   classID,
		StudentID: studentID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not check enrollment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"enrolled": enrolled})
}

func (h *Handler) BatchEnrollment(c *gin.Context) {
	studentID, err := uuid.Parse(c.Param("studentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid student id"})
		return
	}

	teacherID := c.MustGet("userID").(uuid.UUID)

	user, err := h.DB.GetUserByID(c, teacherID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return
	}

	if user.Type != database.RoleTeacher {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only teachers can enroll students"})
		return
	}

	student, err := h.DB.GetUserByID(c, studentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Student not found"})
		return
	}

	if student.Type != database.RoleStudent {
		c.JSON(http.StatusBadRequest, gin.H{"error": "User is not a student"})
		return
	}

	var params struct {
		ClassIDs []uuid.UUID `json:"class_ids" binding:"required"`
	}

	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if len(params.ClassIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "class_ids cannot be empty"})
		return
	}

	var enrolled []uuid.UUID
	var alreadyEnrolled []uuid.UUID
	var failed []uuid.UUID

	for _, classID := range params.ClassIDs {
		class, err := h.DB.GetClassByID(c, classID)
		if err != nil {
			failed = append(failed, classID)
			continue
		}

		if !class.TeacherID.Valid || class.TeacherID.UUID != teacherID {
			failed = append(failed, classID)
			continue
		}

		_, err = h.DB.EnrollStudent(c, database.EnrollStudentParams{
			ClassID:   classID,
			StudentID: studentID,
		})
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				alreadyEnrolled = append(alreadyEnrolled, classID)
				continue
			}

			failed = append(failed, classID)
			continue
		}

		enrolled = append(enrolled, classID)
	}

	c.JSON(http.StatusOK, gin.H{
		"student_id":       studentID,
		"enrolled":         enrolled,
		"already_enrolled": alreadyEnrolled,
		"failed":           failed,
	})
}
