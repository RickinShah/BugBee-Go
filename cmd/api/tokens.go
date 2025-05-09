package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/validator"
)

func (app *application) createAuthenticationHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
		Password string `json:"password"`
	}

	err := app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateUsernameOrEmail(v, input.Username); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if data.ValidatePasswordPlainText(v, input.Password); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetByEmailOrUsername(input.Username, input.Username)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			// app.badRequestResponse(w, r, errors.New("Invalid Credentials"))
			app.invalidCredentialsResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if !user.Activated {
		app.inactiveAccountResponse(w, r)
		return
	}

	match, err := user.Password.Matches(input.Password)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if !match {
		app.invalidCredentialsResponse(w, r)
		return
	}

	token, err := app.models.Tokens.New(user.ID, 24*time.Hour, data.ScopeAuthentication)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	cookie := http.Cookie{
		Name:        "auth_token",
		Value:       token.Plaintext,
		Expires:     token.Expiry.UTC(),
		HttpOnly:    true,
		SameSite:    http.SameSiteNoneMode,
		Secure:      true,
		Path:        "/",
		Partitioned: true,
	}

	http.SetCookie(w, &cookie)

	user.SetMarshalType(data.Frontend)
	err = app.writeJson(w, http.StatusCreated, envelope{"user": user}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
