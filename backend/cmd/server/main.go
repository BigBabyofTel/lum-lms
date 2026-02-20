package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/google/uuid"
	_ "github.com/lib/pq"

	"github.com/BigBabyofTel/lum-lms/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

type apiConfig struct {
	DB     *database.Queries
	DBConn *sql.DB
}

func (cfg *apiConfig) updateClass() {
	/*
		var parameters struct {
			Subject   string `json:"subject" binding:"required"`
			Grade     int32  `json:"grade" binding:"required"`
			TeacherId string `json:"teacher_id" binding:"required"`
		}

		if err := c.ShouldBindJSON(&parameters); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err})
		}

		teacherUUID, err := uuid.Parse(parameters.TeacherId)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "TeacherId is not a valid UUID"})
		}

		classParams := database
	*/
}

func (cfg *apiConfig) createClass(c *gin.Context) {

	//define the structure
	var parameters struct {
		Subject   string `json:"subject" binding:"required"`
		Grade     int32  `json:"grade" binding:"required"`
		TeacherId string `json:"teacher_id" binding:"required"`
	}
	// data binding
	if err := c.ShouldBindJSON(&parameters); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "data not provided"})
	}

	teacherUUID, err := uuid.Parse(parameters.TeacherId)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "TeacherId is not a valid UUID"})
	}
	//create params
	classParams := database.CreateClassParams{
		Subject:   parameters.Subject,
		Grade:     parameters.Grade,
		TeacherID: uuid.NullUUID{UUID: teacherUUID, Valid: true},
	}
	//add to db using cfg
	_, err = cfg.DB.CreateClass(c, classParams)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	}
	c.JSON(http.StatusOK, gin.H{"class created": classParams})

	fmt.Println("creating class")
}

func main() {
	router := gin.Default()
	err := godotenv.Load(".env")
	if err != nil {
		log.Fatalf("Error: %v", err)
	}

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Fatal("DATABASE_URL environment variable not set")
	}

	db, err := sql.Open("postgres", dbURL)
	if err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}

	err = db.Ping()
	if err != nil {
		log.Fatalf("Error connecting database: %v", err)
	}

	dbQueries := database.New(db)

	cfg := apiConfig{
		DB:     dbQueries,
		DBConn: db,
	}

	router.GET("/home", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "hello home",
		})
	})

	router.POST("/v1/api/classes", cfg.createClass)

	if err := router.Run(); err != nil {
		log.Printf("Failed to start server: %v\n", err)
	}

}
