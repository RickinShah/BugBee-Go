package main

import (
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
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
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if pendingUser.Username == nil {
		v.AddError("username", "must be provided")
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user := &data.User{
		Email:     pendingUser.Email,
		Username:  strings.ToLower(*pendingUser.Username),
		Activated: false,
	}

	if pendingUser.Name != nil {
		user.Name = pendingUser.Name
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
			"url":             fmt.Sprintf("%s://%s:%d", app.config.client.protocol, app.config.client.host, app.config.client.port),
		}
		err = app.mailer.Send(user.Email, "user_welcome.tmpl", embedData)
		if err != nil {
			app.logger.PrintError(err, nil)
		}
	})

	err = app.writeJson(w, http.StatusCreated, envelope{"account": "created successfully!"}, nil)
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

	err = app.models.Users.Update(user, data.ScopeActivation, input.TokenPlainText)
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
		Email    string  `json:"email"`
		Name     *string `json:"name"`
		Username *string `json:"username"`
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
		user.Name = input.Name
	}

	if input.Username != nil {
		user.Username = *input.Username
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
		TokenPlainText  string `json:"reset_token"`
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

func (app *application) registerEmailHandler(w http.ResponseWriter, r *http.Request) {
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
		err = app.writeJson(w, http.StatusConflict, envelope{"email": "a user with this email address already exists"}, nil)
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
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"reg_id": strconv.FormatInt(user.ID, 10)}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}

func (app *application) registerUsernameHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		RegID    int64   `json:"reg_id,string"`
		Username string  `json:"username"`
		Name     *string `json:"name"`
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

	_, err = app.models.Users.GetByUsername(input.Username)
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
		err = app.writeJson(w, http.StatusConflict, envelope{"username": "a user with this username already exists"}, nil)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	user, err := app.models.PendingUsers.Get(input.RegID)
	user.Username = &input.Username
	if input.Name != nil {
		user.Name = input.Name
	}

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

func (app *application) settingsHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
		ShowNsfw bool   `json:"show_nsfw"`
	}

	err := app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextGetUser(r)

	v := validator.New()

	if data.ValidateUsername(v, input.Username); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user.Username = input.Username
	user.ShowNsfw = input.ShowNsfw

	if err = app.models.Users.Update(user); err != nil {
		switch {
		case errors.Is(err, data.ErrDuplicateUsername):
			app.errorResponse(w, r, http.StatusConflict, "a user with the same username already exists")
		case errors.Is(err, data.ErrEditConflict):
			app.editConflictResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	user.SetMarshalType(data.Frontend)

	if err = app.writeJson(w, http.StatusOK, envelope{"user": user}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

}

func (app *application) updateProfileHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	file, fileHeader, err := r.FormFile("profile_pic")
	noFileFound := false
	if err != nil {
		switch {
		case errors.Is(err, http.ErrMissingFile):
			noFileFound = true
		default:
			app.badRequestResponse(w, r, err)
			return
		}
	}

	user := app.contextGetUser(r)

	name := strings.TrimSpace(r.FormValue("name"))
	bio := strings.TrimSpace(r.FormValue("bio"))
	removedProfile, err := strconv.ParseBool(r.FormValue("removedProfile"))
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateName(v, name); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}
	if data.ValidateBioOrDescription(v, bio); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if bio != "" {
		user.Bio = &bio
	}
	if name != "" {
		user.Name = &name
	}

	if removedProfile {
		user.ProfilePath = nil
	}

	if !noFileFound {
		defer file.Close()

		if data.ValidateProfilePic(v, file); !v.Valid() {
			app.failedValidationResponse(w, r, v.Errors)
			return
		}

		fileExtension := filepath.Ext(fileHeader.Filename)

		path, err := data.GetFilePath(app.config.storage.profileBasePath, user.ID, fileExtension)
		if err != nil {
			app.serverErrorResponse(w, r, err)
		}

		user.ProfilePath = &path

		err = data.UploadFile("bugbee", file, path, "image/jpeg")
		// err = data.SaveFile(file, path)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}

	authorizationCookie, err := r.Cookie("auth_token")
	if err != nil {
		switch {
		case errors.Is(err, http.ErrNoCookie):
			break
		default:
			app.badRequestResponse(w, r, err)
			return
		}
	}
	err = app.models.Users.Update(user, data.ScopeAuthentication, authorizationCookie.Value)
	app.contextSetUser(r, user)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	user.SetMarshalType(3)

	err = app.writeJson(w, http.StatusOK, envelope{"user": user}, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getUserData(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)
	user.SetMarshalType(2)

	err := app.writeJson(w, http.StatusOK, envelope{"user": user}, nil)

	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getUserHandler(w http.ResponseWriter, r *http.Request) {
	username, err := app.readStringPath("username", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateUsername(v, username); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user, err := app.models.Users.GetByUsername(username)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	user.SetMarshalType(2)

	posts, err := app.models.Posts.GetByUserID(user.ID)

	var postIDs []int64

	for _, post := range posts {
		postIDs = append(postIDs, post.ID)
	}

	files, err := app.models.Files.GetSingle(postIDs)
	err = app.writeJson(w, http.StatusOK, envelope{"user": user, "posts": files}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}

func (app *application) searchUserHandler(w http.ResponseWriter, r *http.Request) {
	query, err := app.readStringParam("query", r)
	user := app.contextGetUser(r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	size, err := app.readIntParam("size", r)
	if err != nil {
		size = 10
	}

	users, err := app.models.Users.GetUsersByUsernameOrName(query, size, user.Username)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"users": users}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteUserHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)
	err := app.models.Users.Delete(user)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrEditConflict):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	cookie := http.Cookie{
		Name:     "auth_token",
		Value:    "",
		MaxAge:   -1,
		Path:     "/",
		HttpOnly: true,
	}
	http.SetCookie(w, &cookie)
	err = app.writeJson(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) changePasswordHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		OldPassword     string `json:"old_password"`
		NewPassword     string `json:"password"`
		ConfirmPassword string `json:"confirm_password"`
	}

	if err := app.readJson(w, r, &input); err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidatePasswordPlainText(v, input.OldPassword); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if data.ValidatePasswordPlainText(v, input.NewPassword); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if data.ValidateConfirmPassword(v, input.NewPassword, input.ConfirmPassword); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	user := app.contextGetUser(r)

	match, err := user.Password.Matches(input.OldPassword)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if !match {
		app.invalidCredentialsResponse(w, r)
		return
	}

	err = user.Password.Set(input.NewPassword)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err = app.models.Users.Update(user); err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err = app.writeJson(w, http.StatusOK, envelope{"password": "updated successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

}

func (app *application) logoutHandler(w http.ResponseWriter, r *http.Request) {
	cookie := http.Cookie{
		Name:     "auth_token",
		Value:    "",
		MaxAge:   -1,
		Path:     "/",
		HttpOnly: true,
	}
	http.SetCookie(w, &cookie)
	err := app.writeJson(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) checkLogin(w http.ResponseWriter, r *http.Request) {
	app.writeJson(w, http.StatusOK, nil, nil)
	return
}
