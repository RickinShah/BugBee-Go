package main

import (
	"context"

	"github.com/RickinShah/BugBee/internal/worker"
	"github.com/hibiken/asynq"
)

func (app *application) NewAsynqClient() {
	app.asynqClient = asynq.NewClient(asynq.RedisClientOpt{Addr: app.config.redis.address})
}

func (app *application) NewAsynqWorker(ctx context.Context) {
	for workerID := range 2 {
		worker.StartCommentWorker(ctx, app.models, workerID)
	}
	// go tasks.StartCommentBatchProcessor(ctx, &app.models)
	// go tasks.StartPostVoteBatchProcessor(ctx, &app.models)
	// go tasks.StartCommentVoteBatchProcessor(ctx, &app.models)

	// server := asynq.NewServer(
	// 	asynq.RedisClientOpt{Addr: app.config.redis.address},
	// 	asynq.Config{Concurrency: 10},
	// )

	// mux := asynq.NewServeMux()
	// mux.HandleFunc(tasks.TypeCommentInsert, tasks.ProcessCommentTask(&app.models))
	// mux.HandleFunc(tasks.TypeCommentUpdate, tasks.ProcessCommentTask(&app.models))
	// mux.HandleFunc(tasks.TypeCommentDelete, tasks.ProcessCommentTask(&app.models))
	// mux.HandleFunc(tasks.TypePostVote, tasks.ProcessPostVoteTask(&app.models))
	// mux.HandleFunc(tasks.TypeCommentVote, tasks.ProcessCommentVoteTask(&app.models))

	// app.asynqServer = server

	// app.wg.Add(1)
	// go func() {
	// 	defer app.wg.Done()
	// 	app.logger.PrintInfo("Starting Asynq worker...", nil)
	// 	if err := server.Start(mux); err != nil {
	// 		app.logger.PrintFatal(err, nil)
	// 	}
	// }()
}
