package main

import (
	"github.com/julienschmidt/httprouter"
	"net/http"
)

func (app *application) routes() http.Handler {
	router := httprouter.New()

	router.NotFound = http.HandlerFunc(app.notFoundResponse)
	router.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	router.HandlerFunc(http.MethodGet, "/v1/healthcheck", app.healthcheckHandler)

	router.HandlerFunc(http.MethodGet, "/v1/posts/:id", app.showPostHandler)
	router.HandlerFunc(http.MethodPost, "/v1/posts/:id", app.createPostHandler)
	router.HandlerFunc(http.MethodPut, "/v1/posts/:id", app.updatePostHandler)
	router.HandlerFunc(http.MethodDelete, "/v1/posts/:id", app.deletePostHandler)

	router.HandlerFunc(http.MethodPost, "/v1/otp", app.generateOtpHandler)
	router.HandlerFunc(http.MethodPost, "/v1/otp/validate", app.validateOtpHandler)

	router.HandlerFunc(http.MethodPost, "/v1/users", app.registerUserHandler)
	router.HandlerFunc(http.MethodPut, "/v1/users/activated", app.activateUserHandler)

	router.HandlerFunc(http.MethodPost, "/v1/tokens/authentication", app.createAuthenticationHandler)

	//return app.recoverPanic(app.rateLimit(router))
	return app.recoverPanic(app.authenticate(router))
}
