package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/go-redis/redis/v8"
)

type Conversation struct {
	ID        int64           `json:"_id,string" db:"conversation_pid"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt time.Time       `json:"updated_at" db:"updated_at"`
	Members   json.RawMessage `json:"members" db:"members"`
}

type ConversationModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m ConversationModel) Insert(senderID int64, receiverID int64) (*Conversation, error) {
	query := `
		INSERT INTO conversations DEFAULT VALUES RETURNING *
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	var conversation Conversation

	if err := m.DB.QueryRowContext(ctx, query).Scan(
		&conversation.ID,
		&conversation.CreatedAt,
		&conversation.UpdatedAt,
	); err != nil {
		return nil, err
	}

	query = `
		INSERT INTO conversation_members (conversation_id, user_id) VALUES ($1, $2), ($1, $3)
	`

	args := []any{conversation.ID, senderID, receiverID}

	result, err := m.DB.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return nil, err
	}

	if rows == 0 {
		return nil, ErrEditConflict
	}

	return &conversation, nil
}

func (m ConversationModel) GetAll(userID int64) ([]*Conversation, error) {
	query := `
		WITH user_conversations AS (
			SELECT DISTINCT conversation_id
			FROM conversation_members
			WHERE user_id = $1
		),
		conversation_data AS (
			SELECT
				c.conversation_pid,
				c.created_at,
				c.updated_at,
				-- Aggregate all members including current user
				jsonb_agg(DISTINCT jsonb_build_object(
					'_id', u.user_pid,
					'name', COALESCE(u.name, 'Deleted User'),
					'username', COALESCE(u.username, 'deleted_user'),
					'profile_path', COALESCE(u.profile_path, '/profiles/default.png')
				)) AS members
			FROM conversations c
			JOIN conversation_members cm ON c.conversation_pid = cm.conversation_id
			JOIN users u ON cm.user_id = u.user_pid
			WHERE c.conversation_pid IN (SELECT conversation_id FROM user_conversations)
			GROUP BY c.conversation_pid, c.created_at, c.updated_at
		)
		SELECT
			conversation_pid AS _id,
			created_at,
			updated_at,
			members
		FROM conversation_data
		ORDER BY updated_at DESC;
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	var conversations []*Conversation

	for rows.Next() {
		var conversation Conversation
		if err := rows.Scan(
			&conversation.ID,
			&conversation.CreatedAt,
			&conversation.UpdatedAt,
			&conversation.Members,
		); err != nil {
			return nil, err
		}

		conversations = append(conversations, &conversation)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return conversations, nil
}
