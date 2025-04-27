package main

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/RickinShah/BugBee/internal/data"
)

func (app *application) addChannelMessage(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(5 << 20)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	noImage := false
	_, imageHeader, err := r.FormFile("image")
	if err != nil {
		switch {
		case errors.Is(err, http.ErrMissingFile):
			noImage = true
		default:
			app.badRequestResponse(w, r, err)
			return
		}
	}

	channelID, err := strconv.ParseInt(strings.TrimSpace(r.FormValue("conversation")), 10, 64)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	content := strings.TrimSpace(r.FormValue("content"))

	user := app.contextGetUser(r)

	message := data.ChannelMessage{
		Sender:    user,
		ChannelID: channelID,
		Message:   &content,
	}

	if !noImage {
		fileName, err := data.UploadSingleFile(app.config.storage.postBasePath, imageHeader)
		if err != nil {
			app.serverErrorResponse(w, r, err)
			return
		}
		message.ImageURL = &fileName
	}

	if err = app.models.ChannelMessages.Insert(&message); err != nil {
		app.serverErrorResponse(w, r, err)
		if !noImage {
			err := data.DeleteFile("bugbee", *message.ImageURL)
			if err != nil {
				app.serverErrorResponse(w, r, err)
			}
		}
		return
	}

	if err = app.writeJson(w, http.StatusOK, envelope{"message": &message}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getChannelMessages(w http.ResponseWriter, r *http.Request) {
	channelID, err := app.readIDPath("channel_id", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	messages, err := app.models.ChannelMessages.GetAll(channelID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	if err := app.writeJson(w, http.StatusOK, envelope{"messages": messages}, nil); err != nil {
		app.serverErrorResponse(w, r, err)
	}

}
