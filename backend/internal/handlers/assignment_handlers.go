package handlers

import (
	"database/sql"
	"errors"
	"net/http"
	"strings"
	"time"

	"github.com/BigBabyofTel/lum-lms/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// Helper functions

func (h *Handler) getCurrentUser(c *gin.Context) (database.User, uuid.UUID, bool) {
	userID := c.MustGet("userID").(uuid.UUID)

	user, err := h.DB.GetUserByID(c, userID)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
		return database.User{}, uuid.Nil, false
	}

	return user, userID, true
}

func (h *Handler) requireClassAccess(c *gin.Context, classID uuid.UUID) (database.Class, database.User, bool) {
	user, userID, ok := h.getCurrentUser(c)
	if !ok {
		return database.Class{}, database.User{}, false
	}

	class, err := h.DB.GetClassByID(c, classID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Class not found"})
		return database.Class{}, database.User{}, false
	}

	switch user.Type {
	case database.RoleTeacher:
		if !class.TeacherID.Valid || class.TeacherID.UUID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this class"})
			return database.Class{}, database.User{}, false
		}
	case database.RoleStudent:
		enrolled, err := h.DB.IsStudentEnrolled(c, database.IsStudentEnrolledParams{
			ClassID:   class.ID,
			StudentID: userID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify enrollment"})
			return database.Class{}, database.User{}, false
		}
		if !enrolled {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not enrolled in this class"})
			return database.Class{}, database.User{}, false
		}
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "role not permitted"})
		return database.Class{}, database.User{}, false
	}

	return class, user, true
}

func (h *Handler) requireTeacherOwnedAssignment(c *gin.Context, assignmentID uuid.UUID) (database.Assignment, database.Class, database.User, bool) {
	user, userID, ok := h.getCurrentUser(c)
	if !ok {
		return database.Assignment{}, database.Class{}, database.User{}, false
	}

	if user.Type != database.RoleTeacher {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only teachers can access this assignment"})
		return database.Assignment{}, database.Class{}, database.User{}, false
	}

	assignment, class, ok := h.getAssignmentClass(c, assignmentID)
	if !ok {
		return database.Assignment{}, database.Class{}, database.User{}, false
	}

	if !class.TeacherID.Valid || class.TeacherID.UUID != userID {
		c.JSON(http.StatusForbidden, gin.H{"error": "You do not own this assignment"})
		return database.Assignment{}, database.Class{}, database.User{}, false
	}

	return assignment, class, user, true
}

func (h *Handler) requireAssignmentAccess(c *gin.Context, assignmentID uuid.UUID) (database.Assignment, database.Class, database.User, bool) {
	user, userID, ok := h.getCurrentUser(c)
	if !ok {
		return database.Assignment{}, database.Class{}, database.User{}, false
	}

	assignment, class, ok := h.getAssignmentClass(c, assignmentID)
	if !ok {
		return database.Assignment{}, database.Class{}, database.User{}, false
	}

	switch user.Type {
	case database.RoleTeacher:
		if !class.TeacherID.Valid || class.TeacherID.UUID != userID {
			c.JSON(http.StatusForbidden, gin.H{"error": "You do not have access to this assignment"})
			return database.Assignment{}, database.Class{}, database.User{}, false
		}
	case database.RoleStudent:
		enrolled, err := h.DB.IsStudentEnrolled(c, database.IsStudentEnrolledParams{
			ClassID:   class.ID,
			StudentID: userID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not verify enrollment"})
			return database.Assignment{}, database.Class{}, database.User{}, false
		}
		if !enrolled {
			c.JSON(http.StatusForbidden, gin.H{"error": "Not enrolled in this assignment's class"})
			return database.Assignment{}, database.Class{}, database.User{}, false
		}
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "role not permitted"})
		return database.Assignment{}, database.Class{}, database.User{}, false
	}

	return assignment, class, user, true
}

func (h *Handler) getAssignmentClass(c *gin.Context, assignmentID uuid.UUID) (database.Assignment, database.Class, bool) {
	assignment, err := h.DB.GetAssignmentByID(c, assignmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment not found"})
		return database.Assignment{}, database.Class{}, false
	}

	if !assignment.ClassID.Valid {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Assignment has no class"})
		return database.Assignment{}, database.Class{}, false
	}

	class, err := h.DB.GetClassByID(c, assignment.ClassID.UUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment class not found"})
		return database.Assignment{}, database.Class{}, false
	}

	return assignment, class, true
}

func parseNullableTime(value string) (sql.NullTime, error) {
	if strings.TrimSpace(value) == "" {
		return sql.NullTime{}, nil
	}

	parsed, err := time.Parse(time.RFC3339, value)
	if err != nil {
		return sql.NullTime{}, err
	}

	return sql.NullTime{Time: parsed, Valid: true}, nil
}

// Handlers

func (h *Handler) CreateAssignment(c *gin.Context) {
	_, classID, ok := h.requireTeacherOwnedClass(c)
	if !ok {
		return
	}

	var params struct {
		Type            string `json:"type" binding:"required,oneof=assignment material"`
		Title           string `json:"title" binding:"required"`
		Details         string `json:"details"`
		DueDate         string `json:"due_date"`
		AttachmentCount int32  `json:"attachment_count"`
	}
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dueDate, err := parseNullableTime(params.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due_date"})
		return
	}

	tx, err := h.DBconn.BeginTx(c, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not start transaction"})
		return
	}
	defer func() {
		_ = tx.Rollback()
	}()

	qtx := h.DB.WithTx(tx)

	assignment, err := qtx.CreateAssignment(c, database.CreateAssignmentParams{
		Type:            database.ContentType(params.Type),
		Title:           params.Title,
		ClassID:         uuid.NullUUID{UUID: classID, Valid: true},
		Details:         sql.NullString{String: params.Details, Valid: params.Details != ""},
		DueDate:         dueDate,
		AttachmentCount: sql.NullInt32{Int32: params.AttachmentCount, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not create assignment"})
		return
	}

	if assignment.Type == database.ContentTypeAssignment {
		err = qtx.CreateUserAssignmentsForClass(c, database.CreateUserAssignmentsForClassParams{
			AssignmentID: uuid.NullUUID{UUID: assignment.ID, Valid: true},
			ClassID:      classID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not assign students"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save assignment"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"assignment": assignment})
}

func (h *Handler) GetClassAssignments(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("classId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class id"})
		return
	}

	if _, _, ok := h.requireClassAccess(c, classID); !ok {
		return
	}

	assignments, err := h.DB.GetClassAssignments(c, uuid.NullUUID{UUID: classID, Valid: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not get assignments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"assignments": assignments})
}

func (h *Handler) GetAssignment(c *gin.Context) {
	assignmentID, err := uuid.Parse(c.Param("assignmentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment id"})
		return
	}

	assignment, _, user, ok := h.requireAssignmentAccess(c, assignmentID)
	if !ok {
		return
	}

	var userAssignment any
	if user.Type == database.RoleStudent && assignment.Type == database.ContentTypeAssignment {
		submission, err := h.DB.GetStudentUserAssignment(c, database.GetStudentUserAssignmentParams{
			AssignmentID: uuid.NullUUID{UUID: assignment.ID, Valid: true},
			StudentID:    uuid.NullUUID{UUID: user.ID, Valid: true},
		})
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not get user assignment"})
			return
		}
		if err == nil {
			userAssignment = submission
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"assignment":      assignment,
		"user_assignment": userAssignment,
	})
}

func (h *Handler) UpdateAssignment(c *gin.Context) {
	assignmentID, err := uuid.Parse(c.Param("assignmentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment id"})
		return
	}

	existingAssignment, class, _, ok := h.requireTeacherOwnedAssignment(c, assignmentID)
	if !ok {
		return
	}

	var params struct {
		Type            string `json:"type" binding:"required,oneof=assignment material"`
		Title           string `json:"title" binding:"required"`
		Details         string `json:"details"`
		DueDate         string `json:"due_date"`
		AttachmentCount int32  `json:"attachment_count"`
	}
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	dueDate, err := parseNullableTime(params.DueDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid due_date"})
		return
	}

	tx, err := h.DBconn.BeginTx(c, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not start transaction"})
		return
	}
	defer func() {
		_ = tx.Rollback()
	}()

	qtx := h.DB.WithTx(tx)

	assignment, err := qtx.UpdateAssignment(c, database.UpdateAssignmentParams{
		Type:            database.ContentType(params.Type),
		Title:           params.Title,
		Details:         sql.NullString{String: params.Details, Valid: strings.TrimSpace(params.Details) != ""},
		DueDate:         dueDate,
		AttachmentCount: sql.NullInt32{Int32: params.AttachmentCount, Valid: true},
		ID:              assignmentID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not update assignment"})
		return
	}

	if existingAssignment.Type != database.ContentTypeAssignment && assignment.Type == database.ContentTypeAssignment {
		err = qtx.CreateUserAssignmentsForClass(c, database.CreateUserAssignmentsForClassParams{
			AssignmentID: uuid.NullUUID{UUID: assignment.ID, Valid: true},
			ClassID:      class.ID,
		})
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not assign students"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save assignment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"assignment": assignment})
}

func (h *Handler) DeleteAssignment(c *gin.Context) {
	assignmentID, err := uuid.Parse(c.Param("assignmentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment id"})
		return
	}

	if _, _, _, ok := h.requireTeacherOwnedAssignment(c, assignmentID); !ok {
		return
	}

	if err := h.DB.DeleteAssignment(c, assignmentID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not delete assignment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "assignment deleted"})
}

func (h *Handler) SubmitAssignment(c *gin.Context) {
	assignmentID, err := uuid.Parse(c.Param("assignmentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment id"})
		return
	}

	assignment, _, user, ok := h.requireAssignmentAccess(c, assignmentID)
	if !ok {
		return
	}

	if user.Type != database.RoleStudent {
		c.JSON(http.StatusForbidden, gin.H{"error": "Only students can submit assignments"})
		return
	}
	if assignment.Type != database.ContentTypeAssignment {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Materials cannot be submitted"})
		return
	}

	var params struct {
		SubmissionText string `json:"submission_text" binding:"required"`
	}
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	submissionText := strings.TrimSpace(params.SubmissionText)
	if submissionText == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "submission_text is required"})
		return
	}

	existingSubmission, err := h.DB.GetStudentUserAssignment(c, database.GetStudentUserAssignmentParams{
		AssignmentID: uuid.NullUUID{UUID: assignment.ID, Valid: true},
		StudentID:    uuid.NullUUID{UUID: user.ID, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Assignment is not assigned to this student"})
		return
	}
	if existingSubmission.Status == database.AssignmentStatusGraded {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Graded assignments cannot be resubmitted"})
		return
	}

	submission, err := h.DB.SubmitAssignment(c, database.SubmitAssignmentParams{
		SubmissionText: sql.NullString{String: submissionText, Valid: true},
		AssignmentID:   uuid.NullUUID{UUID: assignment.ID, Valid: true},
		StudentID:      uuid.NullUUID{UUID: user.ID, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not submit assignment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"submission": submission})
}

func (h *Handler) GetAssignmentSubmissions(c *gin.Context) {
	assignmentID, err := uuid.Parse(c.Param("assignmentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid assignment id"})
		return
	}

	if _, _, _, ok := h.requireTeacherOwnedAssignment(c, assignmentID); !ok {
		return
	}

	submissions, err := h.DB.GetAssignmentSubmissions(c, uuid.NullUUID{UUID: assignmentID, Valid: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not get submissions"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"submissions": submissions})
}

func (h *Handler) GradeUserAssignment(c *gin.Context) {
	userAssignmentID, err := uuid.Parse(c.Param("userAssignmentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user assignment id"})
		return
	}

	userAssignment, err := h.DB.GetUserAssignmentByID(c, userAssignmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User assignment not found"})
		return
	}
	if !userAssignment.AssignmentID.Valid {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "User assignment has no assignment"})
		return
	}

	if _, _, _, ok := h.requireTeacherOwnedAssignment(c, userAssignment.AssignmentID.UUID); !ok {
		return
	}

	var params struct {
		Grade    *int32 `json:"grade" binding:"required"`
		Feedback string `json:"feedback"`
	}
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if params.Grade == nil || *params.Grade < 0 || *params.Grade > 100 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "grade must be between 0 and 100"})
		return
	}
	if len(params.Feedback) > 2000 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "feedback must be 2000 characters or fewer"})
		return
	}

	gradedAssignment, err := h.DB.GradeUserAssignment(c, database.GradeUserAssignmentParams{
		Grade:    sql.NullInt32{Int32: *params.Grade, Valid: true},
		Feedback: sql.NullString{String: params.Feedback, Valid: strings.TrimSpace(params.Feedback) != ""},
		ID:       userAssignmentID,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not grade assignment"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"user_assignment": gradedAssignment})
}

func (h *Handler) GetClassGradebook(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("classId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid class id"})
		return
	}

	if _, _, ok := h.requireTeacherOwnedClass(c); !ok {
		return
	}

	gradebook, err := h.DB.GetClassGradebook(c, uuid.NullUUID{UUID: classID, Valid: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not get gradebook"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"gradebook": gradebook})
}
