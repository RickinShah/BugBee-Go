package main

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/validator"
)

func (app *application) registerUserHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		RegID           int64  `json:"reg_id,string"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	err := app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateConfirmPassword(v, input.Password, input.ConfirmPassword); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	pendingUser, err := app.models.PendingUsers.Get(input.RegID)

	user := &data.User{
		Email:     pendingUser.Email,
		Username:  pendingUser.Username.String,
		Name:      pendingUser.Name.String,
		Activated: false,
	}

	err = user.Password.Set(input.Password)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if data.ValidateUser(v, user); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Users.Insert(user)

	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateEmail):
			v.AddError("email", "a user with this email address already exists")
			app.failedValidationResponse(w, r, v.Errors)
		case errors.Is(err, data.ErrDuplicateUsername):
			v.AddError("username", "a user with this username already exists")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.models.PendingUsers.Delete(input.RegID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	app.background(func() {
		token, err := app.models.Tokens.New(user.ID, 3*24*time.Hour, data.ScopeActivation)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		embedData := map[string]any{
			"activationToken": token.Plaintext,
			"userID":          user.ID,
			"url":             fmt.Sprintf("%s://%s:%d", app.config.protocol, app.config.host, app.config.port),
		}
		err = app.mailer.Send(user.Email, "user_welcome.tmpl", embedData)
		if err != nil {
			app.logger.PrintError(err, nil)
		}
	})

	err = app.writeJson(w, http.StatusCreated, envelope{"user": user}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) activateUserHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		TokenPlainText string `json:"token"`
	}

	err := app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateTokenPlaintext(v, input.TokenPlainText); !v.Valid() {
		app.invalidCredentialsResponse(w, r)
		return
	}

	user, err := app.models.Users.GetForToken(data.ScopeActivation, input.TokenPlainText)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			v.AddError("token", "invalid or expired activation")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	user.Activated = true

	err = app.models.Users.Update(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.models.Tokens.DeleteAllForUser(data.ScopeActivation, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"user": user}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updateUserHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email           string  `json:"email"`
		Name            *string `json:"name"`
		Username        *string `json:"username"`
		Password        *string `json:"password"`
		ConfirmPassword *string `json:"confirm_password"`
	}

	err := app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user, err := app.models.Users.GetByEmailOrUsername(input.Email, input.Email)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if input.Name != nil {
		user.Name = *input.Name
	}

	if input.Username != nil {
		user.Username = *input.Username
	}

	if input.Password != nil {

		if input.ConfirmPassword == nil {
			app.invalidCredentialsResponse(w, r)
			return
		}
		err = user.Password.Set(*input.Password)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	v := validator.New()

	if data.ValidateUser(v, user); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Users.Update(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"credentials": "updated successfully!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}

func (app *application) passwordResetHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		TokenPlainText  string `json:"token"`
		Password        string `json:"password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	err := app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateConfirmPassword(v, input.Password, input.ConfirmPassword); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if data.ValidatePasswordPlainText(v, input.Password); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if data.ValidateTokenPlaintext(v, input.TokenPlainText); !v.Valid() {
		app.invalidCredentialsResponse(w, r)
		return
	}

	user, err := app.models.Users.GetForToken(data.ScopePasswordReset, input.TokenPlainText)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			v.AddError("token", "invalid or expired activation")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = user.Password.Set(input.Password)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.models.Users.Update(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.models.Tokens.DeleteAllForUser(data.ScopePasswordReset, user.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"password": "updated successfully!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}

func (app *application) insertEmailHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email string `json:"email"`
	}

	err := app.readJson(w, r, &input)

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	if data.ValidateEmail(v, input.Email); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	_, err = app.models.Users.GetByEmailOrUsername(input.Email, input.Email)
	emailAlreadyExists := true
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			emailAlreadyExists = false
		default:
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	if emailAlreadyExists {
		err = app.writeJson(w, http.StatusForbidden, envelope{"email": "a user with this email address already exists"}, nil)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	user := &data.PendingUser{
		Email: input.Email,
	}

	err = app.models.PendingUsers.InsertEmail(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateEmail):
			v.AddError("email", "a user with this email address already exists")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"reg_id": strconv.FormatInt(user.ID, 10)}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}

func (app *application) insertUsernameHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		RegID    int64  `json:"reg_id,string"`
		Username string `json:"username"`
		Name     string `json:"name"`
	}

	err := app.readJson(w, r, &input)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	v := validator.New()
	if data.ValidateUsername(v, input.Username); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	_, err = app.models.Users.GetByEmailOrUsername(input.Username, input.Username)
	usernameAlreadyExists := true
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			usernameAlreadyExists = false
		default:
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	if usernameAlreadyExists {
		err = app.writeJson(w, http.StatusForbidden, envelope{"username": "a user with this username already exists"}, nil)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	user, err := app.models.PendingUsers.Get(input.RegID)
	user.Username = sql.NullString{String: input.Username, Valid: true}
	user.Name = sql.NullString{String: input.Name, Valid: true}

	err = app.models.PendingUsers.InsertUsername(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateUsername):
			v.AddError("email", "a user with this usernamme already exists")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"username": "is valid!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}
