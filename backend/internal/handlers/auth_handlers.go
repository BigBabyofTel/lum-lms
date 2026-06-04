package handlers

import (
	"database/sql"
	"net/http"
	"os"
	"time"

	"github.com/BigBabyofTel/lum-lms/internal/auth"
	"github.com/BigBabyofTel/lum-lms/internal/database"
	"github.com/gin-gonic/gin"
)

func (h *Handler) Register(c *gin.Context) {
	var params struct {
		FirstName string `json:"first_name" binding:"required"`
		LastName  string `json:"last_name" binding:"required"`
		Email     string `json:"email" binding:"required"`
		Password  string `json:"password" binding:"required"`
		Type      string `json:"type" binding:"required,oneof=teacher student parent"`
		Grade     *int32 `json:"grade"`
	}

	if err := c.ShouldBind(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var grade sql.NullInt32

	if params.Type == "student" {
		if params.Grade == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "grade is required for students"})
			return
		}
		grade = sql.NullInt32{Int32: *params.Grade, Valid: true}
	} else if params.Grade != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "grade is only allowed for students"})
		return
	}

	hash, err := auth.HashPassword(params.Password)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "could not hash password"})
		return
	}

	user, err := h.DB.CreateUser(c, database.CreateUserParams{
		FirstName: params.FirstName,
		LastName:  params.LastName,
		Email:     params.Email,
		Password:  sql.NullString{String: hash, Valid: true},
		Type:      database.Role(params.Type),
		Grade:     grade,
	})
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "could not create user"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"user": auth.SanitizeUser(user)})
}

func (h *Handler) Login(c *gin.Context) {
	var params struct {
		Email    string `json:"email" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	if err := c.ShouldBind(&params); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid characters"})
		return
	}

	user, err := h.DB.GetUserByEmail(c, params.Email)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid credentials"})
		return
	}

	ok, err := auth.VerifyPassword(params.Password, user.Password.String)
	if err != nil || !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid credentials"})
		return
	}

	expires := time.Hour

	jwtSecret := os.Getenv("JWT_SECRET")
	token, err := auth.MakeJWT(user.ID, jwtSecret, expires)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create token"})
		return
	}

	refreshToken, err := auth.MakeJWT(user.ID, jwtSecret, expires*24)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create refresh token"})
		return
	}
	//The access token lasts 1 hr and the refresh lasts 1 day
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie("refresh_token", refreshToken, 604800, "/", "", false, true)

	c.JSON(http.StatusCreated, gin.H{
		"access_token": token,
		"user":         auth.SanitizeUser(user),
	})
}

func (h *Handler) Refresh(c *gin.Context) {
	//make refresh tokens a signed JWT and set the refresh for 7 days
	rToken, err := c.Cookie("refresh_token")
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "no refresh token"})
		return
	}

	claims, err := auth.ValidateJWT(rToken, os.Getenv("JWT_SECRET"))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid refresh token"})
		return
	}

	expires := time.Hour

	newToken, err := auth.MakeJWT(claims, os.Getenv("JWT_SECRET"), expires*24)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "could not create token"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{"access_token": newToken})
}

func (h *Handler) Logout(c *gin.Context) {
	c.SetCookie("refresh_token", "", -1, "/", "", false, true)
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}

func (h *Handler) Health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "OK"})
}
