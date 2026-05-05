package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/BigBabyofTel/lum-lms/internal/auth"
	"github.com/gin-gonic/gin"
	"golang.org/x/time/rate"
)

func AuthMiddleware(jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing token"})
			return
		}
		userID, err := auth.ValidateJWT(strings.TrimPrefix(header, "Bearer "), jwtSecret)
		if err != nil {

			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid token"})
			return
		}
		c.Set("userID", userID)
		c.Next()
	}
}

var loginLimiter = rate.NewLimiter(rate.Every(time.Minute), 10)

func RateLimit() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !loginLimiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "rate limit exceeded"})
			return
		}
		c.Next()
	}
}
