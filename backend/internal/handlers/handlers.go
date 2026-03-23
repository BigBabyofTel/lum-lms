package handlers

import (
	"database/sql"

	"github.com/BigBabyofTel/lum-lms/internal/database"
)

type Handler struct {
	DB     *database.Queries
	DBconn *sql.DB
}

func New(db *database.Queries, dbConn *sql.DB) *Handler {
	return &Handler{
		DB:     db,
		DBconn: dbConn,
	}
}
