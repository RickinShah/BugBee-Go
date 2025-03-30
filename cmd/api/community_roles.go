package main

import (
	"context"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/validator"
)

func (app *application) addCommunityRoleHandler(w http.ResponseWriter, r *http.Request) {
	handle, err := app.readStringPath("handle", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	var input struct {
		Name        string   `json:"name"`
		Permissions []string `json:"permissions"`
	}
	err = app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
	}

	v := validator.New()
	if data.ValidateRoleName(v, input.Name); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	community, err := app.models.Communities.GetByHandle(handle)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	app.logger.PrintInfo(input.Permissions[0], nil)
	app.logger.PrintInfo(input.Permissions[1], nil)
	permissionIDs, err := app.models.Permissions.GetIDByCode(input.Permissions)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	communityRole := data.CommunityRole{
		CommunityID: community.ID,
		Name:        input.Name,
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	tx, err := app.models.CommunityRoles.DB.BeginTx(ctx, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer tx.Rollback()

	err = app.models.CommunityRoles.Insert(tx, &communityRole)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	app.logger.PrintInfo(strconv.FormatInt(int64(permissionIDs[0]), 10), nil)
	err = app.models.RolePermissions.Insert(tx, communityRole.ID, permissionIDs)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	tx.Commit()

	err = app.writeJson(w, http.StatusOK, nil, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getCommunityRolesHandler(w http.ResponseWriter, r *http.Request) {
	handle, err := app.readStringPath("handle", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	community, err := app.models.Communities.GetByHandle(handle)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	communityRoles, err := app.models.CommunityRoles.Get(community.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"roles": communityRoles}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
