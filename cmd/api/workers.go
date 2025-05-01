package main

import (
	"context"

	"github.com/RickinShah/BugBee/internal/worker"
)

func (app *application) StartWorkers(ctx context.Context) {
	for workerID := range 1 {
		worker.StartCommentWorker(ctx, app.models, workerID)
		worker.StartPostVoteWorker(ctx, &app.models, workerID)
		// worker.StartNSFWWorker(ctx, app.models, workerID)
	}
}
