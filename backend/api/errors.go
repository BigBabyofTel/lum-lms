package api

import (
	"fmt"
	"net/http"
)

func (a *app) logError(r *http.Request, err error) {
	method := r.Method
	URI := r.URL.RequestURI()

	a.logger.Error().Err(err).Str("method", method).Str("URI", URI)
}

func (a *app) errorResponse(w http.ResponseWriter, r *http.Request, status int, message interface{}) {
	if err := a.writeJSON(w, status, envelope{"erorr": message}, nil); err != nil {
		a.logError(r, err)
		w.WriteHeader(http.StatusInternalServerError)
	}
}

func (a *app) serverErrorResponse(w http.ResponseWriter, r *http.Request, err error) {
	a.logError(r, err)
	message := "the server encountered a problem, please try again later."
	a.errorResponse(w, r, http.StatusInternalServerError, envelope{"message": message})
}

func (a *app) authenticationRequiredResponse(w http.ResponseWriter, r *http.Request) {
	message := "you must be authenticated to access this resource"
	a.errorResponse(w, r, http.StatusUnauthorized, message)
}

func (a *app) invalidAuthenticationTokenResponse(w http.ResponseWriter, r *http.Request) {
	message := "invalid or missing authentication token"
	a.errorResponse(w, r, http.StatusUnauthorized, message)
}

func (a *app) notFoundResponse(w http.ResponseWriter, r *http.Request) {
	message := "the requested resource could not be found"
	a.errorResponse(w, r, http.StatusNotFound, message)
}

func (a *app) methodNotAllowedResponse(w http.ResponseWriter, r *http.Request) {
	message := fmt.Sprintf("the %s method is not supported for this resource", r.Method)
	a.errorResponse(w, r, http.StatusMethodNotAllowed, message)
}

func (a *app) badRequestResponse(w http.ResponseWriter, r *http.Request, err error) {
	a.errorResponse(w, r, http.StatusBadRequest, err.Error())
}

func (a *app) failedValidationResponse(w http.ResponseWriter, r *http.Request, errors map[string]string) {
	a.errorResponse(w, r, http.StatusUnprocessableEntity, errors)
}

func (a *app) notPermittedResponse(w http.ResponseWriter, r *http.Request) {
	message := "your user account doesn't have the necessary permissions to access this resource"
	a.errorResponse(w, r, http.StatusForbidden, message)
}

func (a *app) invalidCredentialsResponse(w http.ResponseWriter, r *http.Request) {
	message := "invalid authentication credentials"
	a.errorResponse(w, r, http.StatusUnauthorized, message)
}

func (a *app) editConflictResponse(w http.ResponseWriter, r *http.Request) {
	message := "unable to update the record due to an edit conflict, please try again"
	a.errorResponse(w, r, http.StatusConflict, message)
}

func (a *app) nothingUpdatedResponse(w http.ResponseWriter, r *http.Request) {
	message := "the requested resource has not been modified"
	a.errorResponse(w, r, http.StatusNotModified, message)
}

func (a *app) notFoundEmailResponse(w http.ResponseWriter, r *http.Request) {
	message := "email not found"
	a.errorResponse(w, r, http.StatusUnprocessableEntity, message)
}
