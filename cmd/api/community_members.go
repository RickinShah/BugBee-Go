package main

import (
	"errors"
	"net/http"

	"github.com/RickinShah/BugBee/internal/data"
)

func (app *application) getCommunityMembersHandler(w http.ResponseWriter, r *http.Request) {
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

	users, err := app.models.CommunityMembers.Get(community.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"users": users}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) joinCommunityHandler(w http.ResponseWriter, r *http.Request) {
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
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	communityMember := data.CommunityMember{
		UserID:      user.ID,
		CommunityID: community.ID,
	}

	err = app.models.CommunityMembers.Insert(&communityMember)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{handle: "joined successfully!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
