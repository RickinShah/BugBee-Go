package main

import (
	"context"
	"errors"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/validator"
)

func (app *application) createCommunityHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name       string
		Handle     string
		File       multipart.File
		FileHeader *multipart.FileHeader
	}
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	user := app.contextGetUser(r)

	input.File, input.FileHeader, err = r.FormFile("profile_pic")
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

	input.Name = strings.TrimSpace(r.FormValue("name"))
	input.Handle = strings.TrimSpace(r.FormValue("handle"))

	v := validator.New()
	if data.ValidateHandle(v, input.Handle); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if data.ValidateName(v, input.Name); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	community := data.Community{
		Name:      input.Name,
		CreatorID: app.contextGetUser(r).ID,
		Handle:    input.Handle,
	}

	tx, err := app.models.Communities.DB.BeginTx(context.Background(), nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	err = app.models.Communities.Insert(tx, &community)
	if err != nil {
		switch {
		case err == data.ErrDuplicateCommunityHandle:
			v.AddError("community handle", "a community with this handle already exists")
			app.failedValidationResponse(w, r, v.Errors)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if !noFileFound {
		defer input.File.Close()

		if data.ValidateProfilePic(v, input.File); !v.Valid() {
			app.failedValidationResponse(w, r, v.Errors)
			return
		}

		fileExtension := filepath.Ext(input.FileHeader.Filename)

		path, err := data.GetFilePath(app.config.storage.profileBasePath, community.ID, fileExtension)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		community.ProfilePath = &path

		err = data.SaveFile(input.File, path)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}

		err = app.models.Communities.UpdatePath(tx, &community)

		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
	}
	err = tx.Commit()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	tx, err = app.models.Communities.DB.BeginTx(context.Background(), nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return

	}
	defer tx.Rollback()

	communityMember := data.CommunityMember{
		UserID:      user.ID,
		CommunityID: community.ID,
	}
	err = app.models.CommunityMembers.InsertTx(tx, &communityMember)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	permissionIDs, err := app.models.Permissions.GetAll()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	app.logger.PrintInfo(strconv.FormatInt(community.ID, 10), nil)
	communityRole := data.CommunityRole{
		CommunityID: community.ID,
		Name:        "admin",
	}

	err = app.models.CommunityRoles.Insert(tx, &communityRole)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.models.RolePermissions.Insert(tx, communityRole.ID, permissionIDs)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	userRole := data.UserRole{
		UserID:      app.contextGetUser(r).ID,
		CommunityID: community.ID,
		RoleID:      communityRole.ID,
	}

	err = app.models.UserRoles.InsertTx(tx, userRole)

	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = tx.Commit()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"community": community}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getCommunitiesHandler(w http.ResponseWriter, r *http.Request) {
	// var input struct {
	// 	data.Filters
	// }
}

func (app *application) getJoinedCommunitiesHandler(w http.ResponseWriter, r *http.Request) {

}
