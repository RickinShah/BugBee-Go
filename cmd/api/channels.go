package main

import (
	"errors"
	"net/http"

	"github.com/RickinShah/BugBee/internal/data"
)

func (app *application) createChannel(w http.ResponseWriter, r *http.Request) {
	handle, err := app.readStringPath("handle", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	var input struct {
		Name  string  `json:"name"`
		Roles []int64 `json:"roles,string"`
	}

	err = app.readJson(w, r, &input)
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

	channel := data.Channel{
		CommunityID: community.ID,
		Name:        input.Name,
	}
	err = app.models.Channels.Insert(&channel)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.models.Channels.InsertRoles(channel.ID, input.Roles)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"channel": "created successfully"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}

}
