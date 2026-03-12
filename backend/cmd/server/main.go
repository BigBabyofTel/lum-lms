package main

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

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

type ClassesResponse struct {
	Id        string    `json:"id"`
	Subject   string    `json:"subject"`
	Grade     int       `json:"grade"`
	TeacherId string    `json:"teacherId"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (cfg *apiConfig) getClasses(c *gin.Context) {
	teacherIdStr := c.Query("teacherId")
	teacherUUID, err := uuid.Parse(teacherIdStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	classes, err := cfg.DB.GetClasses(c, uuid.NullUUID{UUID: teacherUUID, Valid: true})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if classes == nil {
		classes = []database.Class{}
	}

	response := make([]ClassesResponse, len(classes))
	for i, class := range classes {
		response[i] = ClassesResponse{
			Id:        class.ID.String(),
			Subject:   class.Subject,
			Grade:     int(class.Grade),
			TeacherId: class.TeacherID.UUID.String(),
			CreatedAt: class.CreatedAt,
			UpdatedAt: class.UpdatedAt.Time,
		}
	}
	fmt.Println(response)
	c.JSON(http.StatusOK, response)
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
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
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
	router.GET("/v1/api/classes", cfg.getClasses)

	if err := router.Run(); err != nil {
		log.Printf("Failed to start server: %v\n", err)
	}

}
