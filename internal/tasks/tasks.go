package tasks

import (
	"encoding/json"
	"os"

	"github.com/RickinShah/BugBee/internal/jsonlog"
	"github.com/hibiken/asynq"
)

const (
	TypeCommentInsert = "comment:insert"
	TypeCommentUpdate = "comment:update"
	TypeCommentDelete = "comment:delete"
	TypePostVote      = "post:vote"
	TypeCommentVote   = "comment:vote"
)

var logger *jsonlog.Logger = jsonlog.New(os.Stdout, jsonlog.LevelInfo)

func NewTask(taskType string, payload any) (*asynq.Task, error) {
	data, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return asynq.NewTask(taskType, data, nil), nil
}
