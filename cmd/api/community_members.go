package main

import (
	"context"
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

	err = app.writeJson(w, http.StatusOK, envelope{"members": users}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) joinCommunityHandler(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Handle string
	}
	var err error
	input.Handle, err = app.readStringPath("handle", r)
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

	communityMember := data.CommunityMember{
		UserID:      user.ID,
		CommunityID: community.ID,
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

	err = app.models.CommunityMembers.InsertTx(tx, &communityMember)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err = app.models.Communities.UpdateMemberCountTx(tx, community, 1); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := tx.Commit(); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{input.Handle: "joined successfully!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
