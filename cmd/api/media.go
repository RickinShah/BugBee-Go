package main

import (
	"errors"
	"net/http"
	"path/filepath"
)

func (app *application) mediaHandler(w http.ResponseWriter, r *http.Request) {
	filename := r.URL.Query().Get("file")
	if filename == "" {
		app.badRequestResponse(w, r, errors.New("filename can't be empty"))
		return
	}

	filePath := filepath.Join(filepath.Clean(filename))

	http.ServeFile(w, r, filePath)
}
