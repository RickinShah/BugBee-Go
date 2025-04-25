package main

import (
	"errors"
	"net/http"

	"github.com/RickinShah/BugBee/internal/data"
)

func (app *application) addConversation(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Username string `json:"username"`
	}

	err := app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextGetUser(r)

	recUser, err := app.models.Users.GetByUsername(input.Username)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	conversation, err := app.models.Conversations.Insert(user.ID, recUser.ID)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if err := app.writeJson(w, http.StatusOK, envelope{"newConversation": conversation}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

func (app *application) getConversations(w http.ResponseWriter, r *http.Request) {
	user := app.contextGetUser(r)

	conversations, err := app.models.Conversations.GetAll(user.ID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJson(w, http.StatusOK, envelope{"conversations": conversations}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}
