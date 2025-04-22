package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/RickinShah/BugBee/internal/data"
	"github.com/RickinShah/BugBee/internal/validator"
)

func (app *application) createPostHandler(w http.ResponseWriter, r *http.Request) {
	err := r.ParseMultipartForm(1000 << 20)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	files := r.MultipartForm.File["files"]
	content := strings.TrimSpace(r.FormValue("content"))

	v := validator.New()

	if data.ValidateContent(v, content); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	post := data.Post{
		Content: &content,
		User:    app.contextGetUser(r),
	}

	post.HasFiles = len(files) > 0

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	tx, err := app.models.Posts.DB.BeginTx(ctx, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	defer func() {
		if err != nil {
			tx.Rollback()
		}
	}()

	err = app.models.Posts.Insert(tx, &post)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	if post.HasFiles {
		for _, fileHeader := range files {
			multipartFile, err := fileHeader.Open()
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			mimeType, err := data.GetFileContentType(multipartFile)
			if err != nil {
				multipartFile.Close()
				app.serverErrorResponse(w, r, err)
				return
			}
			if data.ValidateFile(v, *fileHeader, mimeType); !v.Valid() {
				multipartFile.Close()
				app.failedValidationResponse(w, r, v.Errors)
				return
			}

			file := data.File{
				PostID: post.ID,
				Path:   app.config.storage.postBasePath,
				Size:   fileHeader.Size,
				Type:   mimeType,
			}

			path := file.Path
			err = app.models.Files.Insert(tx, &file)
			if err != nil {
				multipartFile.Close()
				app.serverErrorResponse(w, r, err)
				return
			}

			fileExtension := filepath.Ext(fileHeader.Filename)
			file.Path, err = data.GetFilePath(path, file.ID, fileExtension)
			if err != nil {
				multipartFile.Close()
				app.serverErrorResponse(w, r, err)
				return
			}
			// err = data.SaveFile(multipartFile, file.Path)
			// multipartFile.Seek(0, io.SeekStart)

			err = data.UploadFile("bugbee", multipartFile, file.Path, file.Type)
			log.Print(err)

			fileJSON, err := file.MarshalJSON()
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}

			if strings.HasPrefix(file.Type, "image/") {
				err = app.models.Files.Redis.LPush(context.Background(), data.NSFWQueue, fileJSON).Err()
				if err != nil {
					app.serverErrorResponse(w, r, err)
					return
				}

			}

			multipartFile.Close()
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}
			err = app.models.Files.UpdatePath(tx, file)
			if err != nil {
				app.serverErrorResponse(w, r, err)
				return
			}
		}
	}

	err = tx.Commit()
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"post": "created successfully"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) updatePostHandler(w http.ResponseWriter, r *http.Request) {
	postID, err := app.readIDPath("post_id", r)
	if err != nil {
		app.notFoundResponse(w, r)
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

	if data.ValidateContent(v, input.Content); !v.Valid() {
		app.failedValidationResponse(w, r, v.Errors)
		return
	}

	post, err := app.models.Posts.Get(postID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	post.Content = &input.Content
	err = app.models.Posts.Update(post)
	if err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"content": "updated successfully"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) deletePostHandler(w http.ResponseWriter, r *http.Request) {
	id, err := app.readIDPath("post_id", r)
	if err != nil {
		app.notFoundResponse(w, r)
		return
	}

	user := app.contextGetUser(r)

	files, err := app.models.Files.Get(id)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			break
		default:
			app.serverErrorResponse(w, r, err)
		}
	}

	err = app.models.Posts.Delete(id, user.ID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	for _, file := range files {
		err = data.DeleteFile("bugbee", file.Path)
		app.logger.PrintError(fmt.Errorf("failed to delete post: %w"+err.Error()), map[string]string{"file_id": strconv.FormatInt(file.ID, 10)})
	}

	err = app.writeJson(w, http.StatusOK, envelope{"message": "post deleted successfully"}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getPostHandler(w http.ResponseWriter, r *http.Request) {
	postID, err := app.readIDPath("post_id", r)
	if err != nil {
		app.badRequestResponse(w, r, err)
		return
	}

	post, err := app.models.Posts.Get(postID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	postStats, err := app.models.PostStats.Get(post.ID)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}
	post.Stats = postStats

	if post.HasFiles {
		files, err := app.models.Files.Get(post.ID)
		if err != nil {
			switch {
			case errors.Is(err, data.ErrRecordNotFound):
				app.notFoundResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}
		post.Files = files
	}

	err = app.writeJson(w, http.StatusOK, envelope{"post": post}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

func (app *application) getAllPostHandler(w http.ResponseWriter, r *http.Request) {
	lastID, err := app.readIDParam("last_id", r)
	if err != nil {
		lastID = 999999999999999999
	}
	size, err := app.readIntParam("size", r)
	if err != nil {
		size = 10
	}

	user := app.contextGetUser(r)

	filters := data.Filters{
		PageSize: size,
		LastID:   lastID,
	}
	posts, err := app.models.Posts.GetAll(filters)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	for i := range posts {
		post := posts[i]
		postStats, err := app.models.PostStats.Get(post.ID)
		if err != nil {
			switch {
			case errors.Is(err, data.ErrRecordNotFound):
				app.notFoundResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}
		post.Stats = postStats

		if post.HasFiles {
			files, err := app.models.Files.Get(post.ID)
			if err != nil {
				switch {
				case errors.Is(err, data.ErrRecordNotFound):
					app.notFoundResponse(w, r)
				default:
					app.serverErrorResponse(w, r, err)
				}
				return
			}
			post.Files = files
		}
	}

	if err = app.models.PostVotes.GetAll(posts, user.ID); err != nil {
		app.serverErrorResponse(w, r, err)
		return
	}

	err = app.writeJson(w, http.StatusOK, envelope{"posts": posts}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}

// TODO: Get All Posts of User
func (app *application) getUserPostsHandler(w http.ResponseWriter, r *http.Request) {
	lastID, err := app.readIDParam("last_id", r)
	if err != nil {
		lastID = 999999999999999999
	}
	// username, err := app.readIDPath("username", r)
	// if err != nil {
	// 	app.badRequestResponse(w, r, err)
	// }
	size, err := app.readIntParam("size", r)
	if err != nil {
		size = 10
	}

	filters := data.Filters{
		PageSize: size,
		LastID:   lastID,
	}
	posts, err := app.models.Posts.GetAll(filters)
	if err != nil {
		switch {
		case errors.Is(err, data.ErrRecordNotFound):
			app.notFoundResponse(w, r)
		default:
			app.serverErrorResponse(w, r, err)
		}
		return
	}

	for i := range posts {
		post := posts[i]
		postStats, err := app.models.PostStats.Get(post.ID)
		if err != nil {
			switch {
			case errors.Is(err, data.ErrRecordNotFound):
				app.notFoundResponse(w, r)
			default:
				app.serverErrorResponse(w, r, err)
			}
			return
		}
		post.Stats = postStats

		if post.HasFiles {
			files, err := app.models.Files.Get(post.ID)
			if err != nil {
				switch {
				case errors.Is(err, data.ErrRecordNotFound):
					app.notFoundResponse(w, r)
				default:
					app.serverErrorResponse(w, r, err)
				}
				return
			}
			post.Files = files
		}
	}

	err = app.writeJson(w, http.StatusOK, envelope{"posts": posts}, nil)
	if err != nil {
		app.serverErrorResponse(w, r, err)
	}
}
