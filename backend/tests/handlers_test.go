package tests

import (
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/BigBabyofTel/lum-lms/internal/auth"
	"github.com/BigBabyofTel/lum-lms/internal/database"
	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/BigBabyofTel/lum-lms/internal/routes"
	"github.com/DATA-DOG/go-sqlmock"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const testJWTSecret = "test-secret"

func newTestRouter(t *testing.T, db *sql.DB) *gin.Engine {
	t.Helper()
	t.Setenv("JWT_SECRET", testJWTSecret)
	gin.SetMode(gin.TestMode)

	h := handlers.New(database.New(db), db)
	router := gin.New()
	routes.RegisterRoutes(router, h)
	return router
}

func authHeader(t *testing.T, userID uuid.UUID) string {
	t.Helper()

	token, err := auth.MakeJWT(userID, testJWTSecret, time.Hour)
	if err != nil {
		t.Fatalf("make jwt: %v", err)
	}
	return "Bearer " + token
}

func performRequest(router *gin.Engine, method, path, body, authorization string) *httptest.ResponseRecorder {
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	if authorization != "" {
		req.Header.Set("Authorization", authorization)
	}

	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)
	return w
}

func userRows(userID uuid.UUID, role database.Role) *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id", "first_name", "last_name", "email", "password", "type", "grade", "avatar", "avatar_color", "created_at", "updated_at",
	}).AddRow(
		userID,
		"Test",
		"User",
		"test@example.com",
		sql.NullString{},
		string(role),
		sql.NullInt32{},
		sql.NullString{},
		sql.NullString{},
		time.Now(),
		sql.NullTime{},
	)
}

func classRows(classID uuid.UUID, teacherID uuid.UUID) *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id", "subject", "grade", "teacher_id", "color", "created_at", "updated_at",
	}).AddRow(
		classID,
		"Math",
		int32(5),
		teacherID,
		"#2563eb",
		time.Now(),
		sql.NullTime{},
	)
}

func enrollmentRows(enrollmentID, classID, studentID uuid.UUID) *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id", "class_id", "student_id", "enrolled_at",
	}).AddRow(
		enrollmentID,
		classID,
		studentID,
		time.Now(),
	)
}

func assignmentRows(assignmentID, classID uuid.UUID, contentType database.ContentType) *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id", "type", "title", "class_id", "details", "assign_date", "due_date", "attachment_count", "created_at", "updated_at",
	}).AddRow(
		assignmentID,
		string(contentType),
		"Essay",
		classID,
		sql.NullString{String: "Write a response", Valid: true},
		sql.NullTime{Time: time.Now(), Valid: true},
		sql.NullTime{},
		sql.NullInt32{Int32: 1, Valid: true},
		time.Now(),
		sql.NullTime{},
	)
}

func userAssignmentRows(userAssignmentID, assignmentID, studentID uuid.UUID, status database.AssignmentStatus) *sqlmock.Rows {
	return sqlmock.NewRows([]string{
		"id", "assignment_id", "student_id", "grade", "status", "submission_text", "feedback", "submitted_at", "created_at", "updated_at",
	}).AddRow(
		userAssignmentID,
		assignmentID,
		studentID,
		sql.NullInt32{},
		string(status),
		sql.NullString{},
		sql.NullString{},
		sql.NullTime{},
		time.Now(),
		sql.NullTime{},
	)
}

func expectGetUserByID(mock sqlmock.Sqlmock, userID uuid.UUID, role database.Role) {
	mock.ExpectQuery(`SELECT id, first_name, last_name, email, password, type, grade, avatar, avatar_color, created_at, updated_at\s+FROM users\s+WHERE id = \$1\s+LIMIT 1`).
		WithArgs(userID).
		WillReturnRows(userRows(userID, role))
}

func expectGetUserByEmail(mock sqlmock.Sqlmock, email string, userID uuid.UUID, role database.Role) {
	mock.ExpectQuery(`SELECT id, first_name, last_name, email, password, type, grade, avatar, avatar_color, created_at, updated_at\s+FROM users\s+WHERE email = \$1\s+LIMIT 1`).
		WithArgs(email).
		WillReturnRows(
			sqlmock.NewRows([]string{
				"id", "first_name", "last_name", "email", "password", "type", "grade", "avatar", "avatar_color", "created_at", "updated_at",
			}).AddRow(
				userID,
				"Test",
				"User",
				email,
				sql.NullString{},
				string(role),
				sql.NullInt32{},
				sql.NullString{},
				sql.NullString{},
				time.Now(),
				sql.NullTime{},
			),
		)
}

func expectGetClassByID(mock sqlmock.Sqlmock, classID uuid.UUID, teacherID uuid.UUID) {
	mock.ExpectQuery(`SELECT id, subject, grade, teacher_id, color, created_at, updated_at\s+FROM classes\s+WHERE id = \$1\s+LIMIT 1`).
		WithArgs(classID).
		WillReturnRows(classRows(classID, teacherID))
}

func expectIsStudentEnrolled(mock sqlmock.Sqlmock, classID, studentID uuid.UUID, enrolled bool) {
	mock.ExpectQuery(`(?s)SELECT EXISTS \(SELECT 1\s+FROM class_enrollments\s+WHERE class_id = \$1\s+AND student_id = \$2\) AS enrolled`).
		WithArgs(classID, studentID).
		WillReturnRows(sqlmock.NewRows([]string{"enrolled"}).AddRow(enrolled))
}

func expectGetAssignmentByID(mock sqlmock.Sqlmock, assignmentID, classID uuid.UUID, contentType database.ContentType) {
	mock.ExpectQuery(`SELECT id, type, title, class_id, details, assign_date, due_date, attachment_count, created_at, updated_at\s+FROM assignments\s+WHERE id = \$1\s+LIMIT 1`).
		WithArgs(assignmentID).
		WillReturnRows(assignmentRows(assignmentID, classID, contentType))
}

func TestCreateClassRequiresAuth(t *testing.T) {
	db, _, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodPost, "/api/v1/classes", `{"subject":"Math","grade":5}`, "")

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusUnauthorized, w.Body.String())
	}
}

func TestCreateClassValidatesBodyBeforeDatabase(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodPost, "/api/v1/classes", `{"grade":5}`, authHeader(t, teacherID))

	if w.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusBadRequest, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("unexpected database call: %v", err)
	}
}

func TestGetClassesReturnsTeacherClasses(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	classID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	mock.ExpectQuery(`SELECT id, subject, grade, teacher_id, color, created_at, updated_at\s+FROM classes\s+WHERE teacher_id = \$1`).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(classRows(classID, teacherID))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodGet, "/api/v1/classes", "", authHeader(t, teacherID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGetClassesByIDAllowsEnrolledStudent(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()

	expectGetClassByID(mock, classID, teacherID)
	expectGetUserByID(mock, studentID, database.RoleStudent)
	expectIsStudentEnrolled(mock, classID, studentID, true)
	expectGetUserByID(mock, teacherID, database.RoleTeacher)

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodGet, "/api/v1/classes/"+classID.String(), "", authHeader(t, studentID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestUpdateClassUsesClassIDRouteParam(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	classID := uuid.New()

	mock.ExpectQuery(`(?s)UPDATE classes\s+SET subject\s+= \$1,\s+grade\s+= \$2,\s+color\s+= \$3,\s+updated_at = NOW\(\)\s+WHERE id = \$4\s+AND teacher_id = \$5\s+RETURNING id, subject, grade, teacher_id, color, created_at, updated_at`).
		WithArgs("Science", int32(6), "#16a34a", classID, sqlmock.AnyArg()).
		WillReturnRows(classRows(classID, teacherID))

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodPut,
		"/api/v1/classes/"+classID.String(),
		`{"subject":"Science","grade":6,"color":"#16a34a"}`,
		authHeader(t, teacherID),
	)

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestDeleteClassUsesClassIDRouteParam(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	classID := uuid.New()

	mock.ExpectExec(`DELETE\s+FROM classes\s+WHERE id = \$1\s+AND teacher_id = \$2`).
		WithArgs(classID, sqlmock.AnyArg()).
		WillReturnResult(sqlmock.NewResult(0, 1))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodDelete, "/api/v1/classes/"+classID.String(), "", authHeader(t, teacherID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestEnrollInClassEnrollsStudentByEmail(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()
	enrollmentID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetClassByID(mock, classID, teacherID)
	expectGetUserByEmail(mock, "student@example.com", studentID, database.RoleStudent)
	mock.ExpectQuery(`INSERT INTO class_enrollments \(id, class_id, student_id, enrolled_at\)\s+VALUES \(gen_random_uuid\(\), \$1, \$2, NOW\(\)\)\s+ON CONFLICT \(class_id, student_id\) DO NOTHING\s+RETURNING id, class_id, student_id, enrolled_at`).
		WithArgs(classID, studentID).
		WillReturnRows(enrollmentRows(enrollmentID, classID, studentID))

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodPost,
		"/api/v1/classes/"+classID.String()+"/enroll",
		`{"email":"student@example.com"}`,
		authHeader(t, teacherID),
	)

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGetClassStudentsUsesClassIDRouteParam(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	classID := uuid.New()
	studentID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectQuery(`(?s)SELECT u\.id, u\.first_name, u\.last_name, u\.email, u\.password, u\.type, u\.grade, u\.avatar, u\.avatar_color, u\.created_at, u\.updated_at\s+FROM users u\s+JOIN class_enrollments e ON e\.student_id = u\.id\s+WHERE e\.class_id = \$1`).
		WithArgs(classID).
		WillReturnRows(userRows(studentID, database.RoleStudent))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodGet, "/api/v1/classes/"+classID.String()+"/students", "", authHeader(t, teacherID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestUnenrollStudentRequiresTeacherOwnedClass(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	classID := uuid.New()
	studentID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectExec(`DELETE\s+FROM class_enrollments\s+WHERE class_id = \$1\s+AND student_id = \$2`).
		WithArgs(classID, studentID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodDelete, "/api/v1/classes/"+classID.String()+"/students/"+studentID.String(), "", authHeader(t, teacherID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGetStudentClassesReturnsOwnClasses(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()

	expectGetUserByID(mock, studentID, database.RoleStudent)
	mock.ExpectQuery(`(?s)SELECT c\.id, c\.subject, c\.grade, c\.teacher_id, c\.color, c\.created_at, c\.updated_at\s+FROM classes c\s+JOIN class_enrollments e ON e\.class_id = c\.id\s+WHERE e\.student_id = \$1`).
		WithArgs(studentID).
		WillReturnRows(classRows(classID, teacherID))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodGet, "/api/v1/students/"+studentID.String()+"/classes", "", authHeader(t, studentID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGetStudentClassesForbidsStudentViewingAnotherStudent(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	userID := uuid.New()
	otherStudentID := uuid.New()

	expectGetUserByID(mock, userID, database.RoleStudent)

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodGet, "/api/v1/students/"+otherStudentID.String()+"/classes", "", authHeader(t, userID))

	if w.Code != http.StatusForbidden {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusForbidden, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGetClassEnrollmentsReturnsEnrollmentStatus(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetClassByID(mock, classID, teacherID)
	expectIsStudentEnrolled(mock, classID, studentID, true)

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodGet,
		"/api/v1/classes/"+classID.String()+"/students/"+studentID.String()+"/enrollment",
		"",
		authHeader(t, teacherID),
	)

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}

	var response struct {
		Enrolled bool `json:"enrolled"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !response.Enrolled {
		t.Fatal("got enrolled false, want true")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestBatchEnrollmentReportsAlreadyEnrolledClasses(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetUserByID(mock, studentID, database.RoleStudent)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectQuery(`INSERT INTO class_enrollments \(id, class_id, student_id, enrolled_at\)\s+VALUES \(gen_random_uuid\(\), \$1, \$2, NOW\(\)\)\s+ON CONFLICT \(class_id, student_id\) DO NOTHING\s+RETURNING id, class_id, student_id, enrolled_at`).
		WithArgs(classID, studentID).
		WillReturnError(sql.ErrNoRows)

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodPost,
		"/api/v1/students/"+studentID.String()+"/enrollments",
		`{"class_ids":["`+classID.String()+`"]}`,
		authHeader(t, teacherID),
	)

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}

	var response struct {
		AlreadyEnrolled []string `json:"already_enrolled"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.AlreadyEnrolled) != 1 || response.AlreadyEnrolled[0] != classID.String() {
		t.Fatalf("got already_enrolled %#v, want [%s]", response.AlreadyEnrolled, classID)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestBatchEnrollmentEnrollsOwnedClasses(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()
	enrollmentID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetUserByID(mock, studentID, database.RoleStudent)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectQuery(`INSERT INTO class_enrollments \(id, class_id, student_id, enrolled_at\)\s+VALUES \(gen_random_uuid\(\), \$1, \$2, NOW\(\)\)\s+ON CONFLICT \(class_id, student_id\) DO NOTHING\s+RETURNING id, class_id, student_id, enrolled_at`).
		WithArgs(classID, studentID).
		WillReturnRows(enrollmentRows(enrollmentID, classID, studentID))

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodPost,
		"/api/v1/students/"+studentID.String()+"/enrollments",
		`{"class_ids":["`+classID.String()+`"]}`,
		authHeader(t, teacherID),
	)

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}

	var response struct {
		Enrolled []string `json:"enrolled"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(response.Enrolled) != 1 || response.Enrolled[0] != classID.String() {
		t.Fatalf("got enrolled %#v, want [%s]", response.Enrolled, classID)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestCreateAssignmentCreatesStudentAssignments(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectBegin()
	mock.ExpectQuery(`(?s)INSERT INTO assignments .*RETURNING id, type, title, class_id, details, assign_date, due_date, attachment_count, created_at, updated_at`).
		WithArgs(database.ContentTypeAssignment, "Essay", sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(assignmentRows(assignmentID, classID, database.ContentTypeAssignment))
	mock.ExpectExec(`(?s)INSERT INTO user_assignments .*FROM class_enrollments e\s+WHERE e\.class_id = \$2\s+ON CONFLICT \(assignment_id, student_id\) DO NOTHING`).
		WithArgs(sqlmock.AnyArg(), classID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodPost,
		"/api/v1/classes/"+classID.String()+"/assignments",
		`{"type":"assignment","title":"Essay","details":"Write a response","attachment_count":1}`,
		authHeader(t, teacherID),
	)

	if w.Code != http.StatusCreated {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusCreated, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGetClassAssignmentsAllowsEnrolledStudent(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()

	expectGetUserByID(mock, studentID, database.RoleStudent)
	expectGetClassByID(mock, classID, teacherID)
	expectIsStudentEnrolled(mock, classID, studentID, true)
	mock.ExpectQuery(`SELECT id, type, title, class_id, details, assign_date, due_date, attachment_count, created_at, updated_at\s+FROM assignments\s+WHERE class_id = \$1\s+ORDER BY COALESCE\(due_date, assign_date, created_at\) DESC`).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(assignmentRows(assignmentID, classID, database.ContentTypeAssignment))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodGet, "/api/v1/classes/"+classID.String()+"/assignments", "", authHeader(t, studentID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGetAssignmentReturnsStudentUserAssignment(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()
	userAssignmentID := uuid.New()

	expectGetUserByID(mock, studentID, database.RoleStudent)
	expectGetAssignmentByID(mock, assignmentID, classID, database.ContentTypeAssignment)
	expectGetClassByID(mock, classID, teacherID)
	expectIsStudentEnrolled(mock, classID, studentID, true)
	mock.ExpectQuery(`SELECT id, assignment_id, student_id, grade, status, submission_text, feedback, submitted_at, created_at, updated_at\s+FROM user_assignments\s+WHERE assignment_id = \$1\s+AND student_id = \$2\s+LIMIT 1`).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(userAssignmentRows(userAssignmentID, assignmentID, studentID, database.AssignmentStatusAssigned))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodGet, "/api/v1/assignments/"+assignmentID.String(), "", authHeader(t, studentID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestUpdateAssignmentMaterialToAssignmentCreatesStudentRows(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetAssignmentByID(mock, assignmentID, classID, database.ContentTypeMaterial)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectBegin()
	mock.ExpectQuery(`(?s)UPDATE assignments\s+SET type = \$1,\s+title = \$2,\s+details = \$3,\s+due_date = \$4,\s+attachment_count = \$5,\s+updated_at = NOW\(\)\s+WHERE id = \$6\s+RETURNING id, type, title, class_id, details, assign_date, due_date, attachment_count, created_at, updated_at`).
		WithArgs(database.ContentTypeAssignment, "Essay", sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg(), assignmentID).
		WillReturnRows(assignmentRows(assignmentID, classID, database.ContentTypeAssignment))
	mock.ExpectExec(`(?s)INSERT INTO user_assignments .*FROM class_enrollments e\s+WHERE e\.class_id = \$2\s+ON CONFLICT \(assignment_id, student_id\) DO NOTHING`).
		WithArgs(sqlmock.AnyArg(), classID).
		WillReturnResult(sqlmock.NewResult(0, 1))
	mock.ExpectCommit()

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodPut,
		"/api/v1/assignments/"+assignmentID.String(),
		`{"type":"assignment","title":"Essay","details":"Write a response","attachment_count":1}`,
		authHeader(t, teacherID),
	)

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestDeleteAssignmentRequiresTeacherOwnedAssignment(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetAssignmentByID(mock, assignmentID, classID, database.ContentTypeAssignment)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectExec(`DELETE\s+FROM assignments\s+WHERE id = \$1`).
		WithArgs(assignmentID).
		WillReturnResult(sqlmock.NewResult(0, 1))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodDelete, "/api/v1/assignments/"+assignmentID.String(), "", authHeader(t, teacherID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestSubmitAssignmentSubmitsForEnrolledStudent(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()
	userAssignmentID := uuid.New()

	expectGetUserByID(mock, studentID, database.RoleStudent)
	expectGetAssignmentByID(mock, assignmentID, classID, database.ContentTypeAssignment)
	expectGetClassByID(mock, classID, teacherID)
	expectIsStudentEnrolled(mock, classID, studentID, true)
	mock.ExpectQuery(`SELECT id, assignment_id, student_id, grade, status, submission_text, feedback, submitted_at, created_at, updated_at\s+FROM user_assignments\s+WHERE assignment_id = \$1\s+AND student_id = \$2\s+LIMIT 1`).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(userAssignmentRows(userAssignmentID, assignmentID, studentID, database.AssignmentStatusAssigned))
	mock.ExpectQuery(`(?s)UPDATE user_assignments\s+SET submission_text = \$1,\s+submitted_at = NOW\(\),\s+status = 'submitted',\s+updated_at = NOW\(\)\s+WHERE assignment_id = \$2\s+AND student_id = \$3\s+AND status <> 'graded'\s+RETURNING id, assignment_id, student_id, grade, status, submission_text, feedback, submitted_at, created_at, updated_at`).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), sqlmock.AnyArg()).
		WillReturnRows(userAssignmentRows(userAssignmentID, assignmentID, studentID, database.AssignmentStatusSubmitted))

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodPost,
		"/api/v1/assignments/"+assignmentID.String()+"/submit",
		`{"submission_text":"Completed work"}`,
		authHeader(t, studentID),
	)

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestSubmitAssignmentRejectsMaterial(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()

	expectGetUserByID(mock, studentID, database.RoleStudent)
	expectGetAssignmentByID(mock, assignmentID, classID, database.ContentTypeMaterial)
	expectGetClassByID(mock, classID, teacherID)
	expectIsStudentEnrolled(mock, classID, studentID, true)

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodPost,
		"/api/v1/assignments/"+assignmentID.String()+"/submit",
		`{"submission_text":"Completed work"}`,
		authHeader(t, studentID),
	)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusBadRequest, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGetAssignmentSubmissionsRequiresTeacherOwnedAssignment(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()
	userAssignmentID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetAssignmentByID(mock, assignmentID, classID, database.ContentTypeAssignment)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectQuery(`(?s)SELECT\s+ua\.id,\s+ua\.assignment_id,\s+ua\.student_id,\s+ua\.grade,\s+ua\.status,\s+ua\.submission_text,\s+ua\.feedback,\s+ua\.submitted_at,\s+ua\.created_at,\s+ua\.updated_at,\s+u\.first_name,\s+u\.last_name,\s+u\.email,\s+u\.grade AS student_grade\s+FROM user_assignments ua\s+JOIN users u ON u\.id = ua\.student_id\s+WHERE ua\.assignment_id = \$1\s+ORDER BY u\.last_name, u\.first_name`).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{
			"id", "assignment_id", "student_id", "grade", "status", "submission_text", "feedback", "submitted_at", "created_at", "updated_at", "first_name", "last_name", "email", "student_grade",
		}).AddRow(
			userAssignmentID,
			assignmentID,
			studentID,
			sql.NullInt32{},
			string(database.AssignmentStatusSubmitted),
			sql.NullString{String: "Done", Valid: true},
			sql.NullString{},
			sql.NullTime{Time: time.Now(), Valid: true},
			time.Now(),
			sql.NullTime{},
			"Test",
			"Student",
			"student@example.com",
			sql.NullInt32{Int32: 5, Valid: true},
		))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodGet, "/api/v1/assignments/"+assignmentID.String()+"/submissions", "", authHeader(t, teacherID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGradeUserAssignmentRequiresTeacherOwnership(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()
	userAssignmentID := uuid.New()

	mock.ExpectQuery(`SELECT id, assignment_id, student_id, grade, status, submission_text, feedback, submitted_at, created_at, updated_at\s+FROM user_assignments\s+WHERE id = \$1\s+LIMIT 1`).
		WithArgs(userAssignmentID).
		WillReturnRows(userAssignmentRows(userAssignmentID, assignmentID, studentID, database.AssignmentStatusSubmitted))
	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetAssignmentByID(mock, assignmentID, classID, database.ContentTypeAssignment)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectQuery(`(?s)UPDATE user_assignments\s+SET grade = \$1,\s+feedback = \$2,\s+status = 'graded',\s+updated_at = NOW\(\)\s+WHERE id = \$3\s+RETURNING id, assignment_id, student_id, grade, status, submission_text, feedback, submitted_at, created_at, updated_at`).
		WithArgs(sqlmock.AnyArg(), sqlmock.AnyArg(), userAssignmentID).
		WillReturnRows(userAssignmentRows(userAssignmentID, assignmentID, studentID, database.AssignmentStatusGraded))

	router := newTestRouter(t, db)
	w := performRequest(
		router,
		http.MethodPatch,
		"/api/v1/user-assignments/"+userAssignmentID.String()+"/grade",
		`{"grade":92,"feedback":"Strong work"}`,
		authHeader(t, teacherID),
	)

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}

func TestGetClassGradebookRequiresTeacherOwnedClass(t *testing.T) {
	db, mock, err := sqlmock.New()
	if err != nil {
		t.Fatalf("sqlmock: %v", err)
	}
	defer db.Close()

	teacherID := uuid.New()
	studentID := uuid.New()
	classID := uuid.New()
	assignmentID := uuid.New()
	userAssignmentID := uuid.New()

	expectGetUserByID(mock, teacherID, database.RoleTeacher)
	expectGetClassByID(mock, classID, teacherID)
	mock.ExpectQuery(`(?s)SELECT\s+a\.id AS assignment_id,\s+a\.title,\s+a\.due_date,\s+ua\.id AS user_assignment_id,\s+ua\.student_id,\s+ua\.grade,\s+ua\.status,\s+ua\.feedback,\s+ua\.submitted_at,\s+u\.first_name,\s+u\.last_name,\s+u\.email\s+FROM assignments a\s+JOIN user_assignments ua ON ua\.assignment_id = a\.id\s+JOIN users u ON u\.id = ua\.student_id\s+WHERE a\.class_id = \$1\s+AND a\.type = 'assignment'\s+ORDER BY a\.due_date NULLS LAST, a\.created_at, u\.last_name, u\.first_name`).
		WithArgs(sqlmock.AnyArg()).
		WillReturnRows(sqlmock.NewRows([]string{
			"assignment_id", "title", "due_date", "user_assignment_id", "student_id", "grade", "status", "feedback", "submitted_at", "first_name", "last_name", "email",
		}).AddRow(
			assignmentID,
			"Essay",
			sql.NullTime{},
			userAssignmentID,
			studentID,
			sql.NullInt32{Int32: 92, Valid: true},
			string(database.AssignmentStatusGraded),
			sql.NullString{String: "Strong work", Valid: true},
			sql.NullTime{Time: time.Now(), Valid: true},
			"Test",
			"Student",
			"student@example.com",
		))

	router := newTestRouter(t, db)
	w := performRequest(router, http.MethodGet, "/api/v1/classes/"+classID.String()+"/gradebook", "", authHeader(t, teacherID))

	if w.Code != http.StatusOK {
		t.Fatalf("got status %d, want %d; body: %s", w.Code, http.StatusOK, w.Body.String())
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatalf("database expectations: %v", err)
	}
}
