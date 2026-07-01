package handlers

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/BigBabyofTel/lum-lms/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

func (h *Handler) canAccessClassStream(c *gin.Context, classID uuid.UUID, userID uuid.UUID) (database.User, error) {
	user, err := h.DB.GetUserByID(c, userID)
	if err != nil {
		return database.User{}, err
	}

	class, err := h.DB.GetClassByID(c, classID)
	if err != nil {
		return database.User{}, err
	}

	if user.Type == database.RoleTeacher {
		if !class.TeacherID.Valid || class.TeacherID.UUID != userID {
			return database.User{}, fmt.Errorf("not authorized")
		}
		return user, nil
	}

	if user.Type == database.RoleStudent {
		enrolled, err := h.DB.IsStudentEnrolled(c, database.IsStudentEnrolledParams{
			ClassID:   classID,
			StudentID: userID,
		})
		if err != nil || !enrolled {
			return database.User{}, fmt.Errorf("not enrolled")
		}
		return user, nil
	}

	return database.User{}, fmt.Errorf("role not permitted")
}

func (h *Handler) CreatePost(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("classId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
		return
	}

	authorID := c.MustGet("userID").(uuid.UUID)
	if _, err := h.canAccessClassStream(c, classID, authorID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this class"})
		return
	}

	var params struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	post, err := h.DB.CreatePost(c, database.CreatePostParams{
		ClassID:  uuid.NullUUID{UUID: classID, Valid: true},
		AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
		Content:  params.Content,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create post"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"post": post})
}

func (h *Handler) GetStream(c *gin.Context) {
	classID, err := uuid.Parse(c.Param("classId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid class id"})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)
	if _, err := h.canAccessClassStream(c, classID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this class"})
		return
	}

	posts, err := h.DB.GetPostsByClass(c, uuid.NullUUID{UUID: classID, Valid: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch stream"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"posts": posts})
}

func (h *Handler) DeletePost(c *gin.Context) {
	postID, err := uuid.Parse(c.Param("postId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}
	authorID := c.MustGet("userID").(uuid.UUID)

	err = h.DB.DeletePost(c, database.DeletePostParams{
		ID:       postID,
		AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete post"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "post deleted"})
}

func (h *Handler) UpdateStream(c *gin.Context) {
	postID, err := uuid.Parse(c.Param("postId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}

	authorID := c.MustGet("userID").(uuid.UUID)
	post, err := h.DB.GetPostByID(c, postID)
	if err != nil || !post.ClassID.Valid {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	if _, err := h.canAccessClassStream(c, post.ClassID.UUID, authorID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this post"})
		return
	}

	var params struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	content := strings.TrimSpace(params.Content)
	if content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "content is required"})
		return
	}

	commentParam := c.Param("commentId")
	if commentParam != "" {
		commentID, err := uuid.Parse(commentParam)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
			return
		}

		comment, err := h.DB.UpdateComment(c, database.UpdateCommentParams{
			Content:  content,
			ID:       commentID,
			PostID:   uuid.NullUUID{UUID: postID, Valid: true},
			AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
		})
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "comment not found or not authorized"})
				return
			}

			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update comment"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"comment": comment})
		return
	}

	updatedPost, err := h.DB.UpdatePost(c, database.UpdatePostParams{
		Content:  content,
		ID:       postID,
		AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
	})
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "post not found or not authorized"})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update post"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"post": updatedPost})
}

func (h *Handler) CreateComment(c *gin.Context) {
	postID, err := uuid.Parse(c.Param("postId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}
	authorID := c.MustGet("userID").(uuid.UUID)

	post, err := h.DB.GetPostByID(c, postID)
	if err != nil || !post.ClassID.Valid {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	if _, err := h.canAccessClassStream(c, post.ClassID.UUID, authorID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this post"})
		return
	}

	var params struct {
		Content string `json:"content" binding:"required"`
	}
	if err := c.ShouldBindJSON(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	comment, err := h.DB.CreateComment(c, database.CreateCommentParams{
		PostID:   uuid.NullUUID{UUID: postID, Valid: true},
		AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
		Content:  params.Content,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create comment"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"comment": comment})
}

func (h *Handler) GetComments(c *gin.Context) {
	postID, err := uuid.Parse(c.Param("postId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid post id"})
		return
	}

	userID := c.MustGet("userID").(uuid.UUID)
	post, err := h.DB.GetPostByID(c, postID)
	if err != nil || !post.ClassID.Valid {
		c.JSON(http.StatusNotFound, gin.H{"error": "post not found"})
		return
	}
	if _, err := h.canAccessClassStream(c, post.ClassID.UUID, userID); err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "not authorized for this post"})
		return
	}

	comments, err := h.DB.GetCommentsByPost(c, uuid.NullUUID{UUID: postID, Valid: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not fetch comments"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"comments": comments})
}

func (h *Handler) DeleteComment(c *gin.Context) {
	commentID, err := uuid.Parse(c.Param("commentId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid comment id"})
		return
	}
	authorID := c.MustGet("userID").(uuid.UUID)

	err = h.DB.DeleteComment(c, database.DeleteCommentParams{
		ID:       commentID,
		AuthorID: uuid.NullUUID{UUID: authorID, Valid: true},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete comment"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "comment deleted"})
}
