package main

import (
	"errors"
	"net/http"

	"github.com/RickinShah/BugBee/internal/data"
)

func (app *application) addUserRoleHandler(w http.ResponseWriter, r *http.Request) {
	handle, err := app.readStringPath("handle", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	var input struct {
		RoleID   int64  `json:"role_id"`
		Username string `json:"username"`
	}

	err = app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user, err := app.models.Users.GetByUsername(input.Username)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.logger.PrintInfo(input.Username, nil)
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	community, err := app.models.Communities.GetByHandle(handle)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.logger.PrintInfo("handle", nil)
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	userRole := data.UserRole{
		UserID:      user.ID,
		CommunityID: community.ID,
		RoleID:      input.RoleID,
	}

	err = app.models.UserRoles.Insert(userRole)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getUserPermissions(w http.ResponseWriter, r *http.Request) {
	handle, err := app.readStringPath("handle", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextGetUser(r)

	community, err := app.models.Communities.GetByHandle(handle)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.logger.PrintInfo("handle", nil)
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	permissions, err := app.models.Permissions.GetPermissionsByUser(user.ID, community.ID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJson(w, http.StatusOK, envelope{"permissions": permissions}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getUserRoles(w http.ResponseWriter, r *http.Request) {
	handle, err := app.readStringPath("handle", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextGetUser(r)

	community, err := app.models.Communities.GetByHandle(handle)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.logger.PrintInfo("handle", nil)
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	roles, err := app.models.UserRoles.GetByUser(user.ID, community.ID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJson(w, http.StatusOK, envelope{"roles": roles}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
