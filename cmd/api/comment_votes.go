package main

import (
	"net/http"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/tasks"
	"github.com/RickinShah/BugBee/internal/validator"
)

func (app *application) createCommentVoteHandler(w http.ResponseWriter, r *http.Request) {
	commentID, err := app.readIDPath("comment_id", r)
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

	commentVote := data.CommentVote{
		CommentID: commentID,
		UserID:    app.contextGetUser(r).ID,
		VoteType:  data.VoteType(input.VoteType),
	}

	task, err := tasks.NewTask(tasks.TypeCommentVote, commentVote)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	_, err = app.asynqClient.Enqueue(task, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusCreated, envelope{"vote": "added successfully!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
