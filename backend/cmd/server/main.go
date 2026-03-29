package main

import (
	"database/sql"
	"log"
	"os"

	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/BigBabyofTel/lum-lms/internal/routes"
	_ "github.com/lib/pq"

	"github.com/BigBabyofTel/lum-lms/internal/database"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
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
	h := handlers.New(dbQueries, db)

	router := gin.Default()
	routes.RegisterRoutes(router, h)

	if err := router.Run(":" + port); err != nil {
		log.Printf("Failed to start server: %v\n", err)
	}

}
