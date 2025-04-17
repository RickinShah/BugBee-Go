package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/go-redis/redis/v8"
)

type Conversations struct {
	ID        int64     `json:"conversation_id" db:"conversation_pid"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`
}

type ConversationModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m ConversationModel) Insert(id int64) error {
	query := `
		INSERT INTO conversations(conversation_pid)
		VALUES ($1)
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := m.DB.ExecContext(ctx, query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rows == 0 {
		return ErrEditConflict
	}

	return nil
}
