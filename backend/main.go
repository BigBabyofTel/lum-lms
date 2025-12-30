package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func main() {
	router := gin.Default()

	router.GET("/home", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "Hello World2!",
		})
	})

	if err := router.Run(); err != nil {
		log.Printf("Failed to start server: %v\n", err)
	}

}
