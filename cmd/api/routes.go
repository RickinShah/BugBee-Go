package main

import (
	"net/http"

	"github.com/julienschmidt/httprouter"
)

func (app *application) routes() http.Handler {
	router := httprouter.New()

	router.NotFound = http.HandlerFunc(app.notFoundResponse)
	router.MethodNotAllowed = http.HandlerFunc(app.methodNotAllowedResponse)

	router.HandlerFunc(http.MethodGet, "/v1/healthcheck", app.healthcheckHandler)

	router.HandlerFunc(http.MethodGet, "/v1/posts/:id", app.requireActivatedUser(app.showPostHandler))
	//router.HandlerFunc(http.MethodPost, "/v1/posts", app.requireActivatedUser(app.createPostHandler))
	router.HandlerFunc(http.MethodPost, "/v1/posts", app.createPostHandler)
	router.HandlerFunc(http.MethodPut, "/v1/posts/:id", app.requireActivatedUser(app.updatePostHandler))
	router.HandlerFunc(http.MethodDelete, "/v1/posts/:id", app.requireActivatedUser(app.deletePostHandler))

	router.HandlerFunc(http.MethodPost, "/v1/otp", app.generateOtpHandler)
	router.HandlerFunc(http.MethodPost, "/v1/otp/validate", app.validateOtpHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/users/reset-password", app.passwordResetHandler)

	router.HandlerFunc(http.MethodPost, "/v1/users", app.registerUserHandler)
	router.HandlerFunc(http.MethodPut, "/v1/users/activated", app.activateUserHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/register/email", app.registerEmailHandler)
	router.HandlerFunc(http.MethodPatch, "/v1/register/username", app.registerUsernameHandler)
	router.HandlerFunc(http.MethodPost, "/v1/profile/update", app.requireActivatedUser(app.updateProfileHandler))

	router.HandlerFunc(http.MethodPost, "/v1/tokens/authentication", app.createAuthenticationHandler)
	// router.HandlerFunc(http.MethodPost, "/v1/temp", app.tempHandler)

	// router.HandlerFunc(http.MethodPost, "/v1/posts/:post_id/comments", app.createCommentHandler)

	//return app.recoverPanic(app.rateLimit(router))
	return app.recoverPanic(app.enableCORS(app.authenticate(router)))
}
