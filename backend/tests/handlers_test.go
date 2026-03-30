package tests

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/BigBabyofTel/lum-lms/internal/handlers"
	"github.com/BigBabyofTel/lum-lms/internal/routes"
	"github.com/gin-gonic/gin"
)

func TestCreateClass(t *testing.T) {
	// Setup: test router with no real DB (only validation tests)
	gin.SetMode(gin.TestMode)
	h := handlers.New(nil, nil)
	router := gin.Default()
	routes.RegisterRoutes(router, h)

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{"missing subject", `{"grade":5,"teacher_id":"9518dd4e-49f6-4c4e-984f-24c0ab9f77ba"}`, 400},
		{"invalid uuid", `{}`, 400},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			// 1. Build a fake HTTP request with the test case body
			req := httptest.NewRequest(http.MethodPost, "/api/v1/classes", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")

			// 2. Record the response (instead of a real browser)
			w := httptest.NewRecorder()

			// 3. Send the request through the Gin router
			router.ServeHTTP(w, req)

			// 4. Assert the status code matches what we expect
			if w.Code != tt.wantStatus {
				t.Errorf("got status %d, want %d — body: %s", w.Code, tt.wantStatus, w.Body.String())
			}
		})
	}
}
