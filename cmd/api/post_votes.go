package main

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/validator"
)

func (app *application) createPostVoteHandler(w http.ResponseWriter, r *http.Request) {
	postID, err := app.readIDPath("post_id", r)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	var input struct {
		VoteType int `json:"vote_type"`
	}

	err = app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()

	if data.ValidateVote(v, data.VoteType(input.VoteType)); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	postVote := data.PostVote{
		PostID:   postID,
		UserID:   app.contextGetUser(r).ID,
		VoteType: data.VoteType(input.VoteType),
	}

	postVoteJSON, err := json.Marshal(postVote)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err = app.models.PostVotes.Redis.RPush(ctx, data.PostVoteQueueKey, postVoteJSON).Err()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"vote": "added successfully!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
