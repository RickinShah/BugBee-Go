package main

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/validator"
)

func (app *application) createCommentHandler(w http.ResponseWriter, r *http.Request) {
	postID, err := app.readIDPath("post_id", r)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	var input struct {
		Content         string `json:"content"`
		ParentCommentID *int64 `json:"parent_comment_id"`
	}

	err = app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	user := app.contextGetUser(r)
	comment := &data.Comment{
		Content: input.Content,
		PostID:  postID,
		User: &data.User{
			ID: user.ID,
		},
		ParentCommentID: input.ParentCommentID,
	}
	comment.User.SetMarshalType(data.IDOnly)

	v := validator.New()

	if data.ValidateComment(v, comment.Content); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	commentJSON, err := json.Marshal(comment)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	err = app.models.Comments.Redis.RPush(ctx, data.CommentInsertQueueKey, commentJSON).Err()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusCreated, envelope{"comment": "added successfully!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updateCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentID, err := app.readIDPath("comment_id", r)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	postID, err := app.readIDPath("post_id", r)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	var input struct {
		Content string `json:"content"`
	}

	err = app.readJson(w, r, &input)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	v := validator.New()
	if data.ValidateComment(v, input.Content); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	comment := data.Comment{
		ID:     commentID,
		PostID: postID,
		User: &data.User{
			ID: app.contextGetUser(r).ID,
		},
		Content: input.Content,
	}
	comment.User.SetMarshalType(1)
	err = app.writeJson(w, http.StatusOK, envelope{"comment": "updated successfully"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deleteCommentHandler(w http.ResponseWriter, r *http.Request) {
	commentID, err := app.readIDPath("comment_id", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}
	userID := app.contextGetUser(r).ID

	comment := data.Comment{
		ID: commentID,
		User: &data.User{
			ID: userID,
		},
	}
	comment.User.SetMarshalType(data.IDOnly)

	commentJSON, err := json.Marshal(comment)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 1*time.Second)
	defer cancel()

	err = app.models.Comments.Redis.RPush(ctx, data.CommentDeleteQueueKey, commentJSON).Err()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"comment": "deleted successfully!"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}
}

func (app *application) getComments(w http.ResponseWriter, r *http.Request) {
	postID, err := app.readIDPath("post_id", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	comments, err := app.models.Comments.GetAll(postID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			err := app.writeJson(w, http.StatusOK, envelope{"comments": comments}, nil)
			if err != nil {
				app.serverErrorResponse(w, r, err)
			}
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"comments": comments}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
