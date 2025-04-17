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

	input.Handle = strings.ToLower(input.Handle)
	community := data.Community{
		Name:      input.Name,
		CreatorID: &user.ID,
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

	if err = tx.Commit(); err != nil {
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

func (app *application) updateCommunityHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name       string
		Handle     string
		NewHandle  string
		File       multipart.File
		FileHeader *multipart.FileHeader
	}
	err := r.ParseMultipartForm(10 << 20)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextGetUser(r)

	input.Handle, err = app.readStringPath("handle", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

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
	input.NewHandle = strings.TrimSpace(r.FormValue("handle"))

	v := validator.New()
	if data.ValidateHandle(v, input.NewHandle); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	if data.ValidateName(v, input.Name); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	community, err := app.models.Communities.GetByHandle(input.Handle)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	community.Handle = strings.ToLower(input.NewHandle)
	community.Name = input.Name
	community.CreatorID = &user.ID

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

	err = app.models.Communities.UpdateTx(tx, community)
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
	}
	if err := tx.Commit(); err != nil {
		app.serverErrorResponse(w, r, err)
	}

	if err := app.writeJson(w, http.StatusOK, envelope{"community": "updated successfully"}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getCommunitiesHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		data.Filters
	}

	v := validator.New()

	qs := r.URL.Query()
	input.Sort = app.readString(qs, "sort", "-member_count")
	input.PageSize = app.readInt(qs, "page_size", 5, v)
	input.LastID = int64(app.readInt(qs, "last_id", 0, v))

	input.Filters.SortSafeList = []string{"community_pid", "member_count", "-member_count", "-community_pid"}

	if data.ValidateFilters(v, input.Filters); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	communities, err := app.models.Communities.GetAll(input.Filters)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	for _, community := range communities {
		community.SetMarshalType(data.Minimal)
	}

	if err = app.writeJson(w, http.StatusOK, envelope{"communities": communities}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getCommunityHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Handle string
	}

	var err error
	input.Handle, err = app.readStringPath("handle", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateHandle(v, input.Handle); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	community, err := app.models.Communities.GetByHandle(input.Handle)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJson(w, http.StatusOK, envelope{"community": community}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getJoinedCommunitiesHandler(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	communities, err := app.models.CommunityMembers.GetAllCommunities(user.ID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	for _, community := range communities {
		community.SetMarshalType(data.Minimal)
	}

	if err := app.writeJson(w, http.StatusOK, envelope{"communities": communities}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) searchCommunityHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name  string
		Limit int
	}

	v := validator.New()
	qs := r.URL.Query()
	input.Name = app.readString(qs, "query", "")
	input.Limit = app.readInt(qs, "limit", 5, v)

	if v.Check(input.Name != "", "search", "should not be empty"); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	communities, err := app.models.Communities.SearchCommunities(input.Name, input.Limit)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err = app.writeJson(w, http.StatusOK, envelope{"communities": communities}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// func (app *application) channelIsAccessible(w http.ResponseWriter, r *http.Request) {
// 	var input struct {
// 		ChannelID int64 `json:"channel_id,string"`
// 	}
//
// 	user := app.contextGetUser(r)
//
// }

func (app *application) deleteCommunityHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Handle string
	}

	handle, err := app.readStringPath("handle", r)
	input.Handle = handle

	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextGetUser(r)

	community, err := app.models.Communities.GetByHandle(input.Handle)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	v := validator.New()
	if data.ValidateCreatorID(v, user.ID, *community.CreatorID); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	err = app.models.Communities.Delete(community.ID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"community": "deleted successfully!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
