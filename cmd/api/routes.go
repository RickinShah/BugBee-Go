package main

import "net/http"

func (app *application) routes() http.Handler {
	router := http.NewServeMux()

	router.HandleFunc("GET  /v1/healthcheck", app.healthcheckHandler)
	router.HandleFunc("GET  /v1/posts/{id}", app.showPostHandler)
	router.HandleFunc("POST  /v1/posts", app.createPostHandler)
	router.HandleFunc("PATCH  /v1/posts/{id}", app.updatePostHandler)
	router.HandleFunc("DELETE  /v1/posts/{id}", app.deletePostHandler)

	router.HandleFunc("POST /v1/otp", app.generateOtpHandler)
	router.HandleFunc("POST /v1/otp/validate", app.validateOtpHandler)

	router.HandleFunc("POST /v1/users", app.registerUserHandler)
	router.HandleFunc("PUT /v1/users/activated", app.activateUserHandler)

	router.HandleFunc("POST /v1/tokens/authentication", app.createAuthenticationHandler)

	//return app.recoverPanic(app.rateLimit(router))
	return app.recoverPanic(router)
}
