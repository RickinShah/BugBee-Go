package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
)

type ChannelMessage struct {
	ID        int64     `json:"_id" db:"message_pid"`
	Sender    *User     `json:"sender"`
	ChannelID int64     `json:"conversation"`
	Message   *string   `json:"message"`
	ImageURL  *string   `json:"imageUrl"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (m *ChannelMessage) MarshalJSON() ([]byte, error) {
	message := make(map[string]any, 7)
	user := make(map[string]any, 4)
	user["_id"] = strconv.FormatInt(m.Sender.ID, 10)
	user["name"] = m.Sender.Name
	user["username"] = m.Sender.Username
	user["profile_path"] = m.Sender.ProfilePath
	if m.Sender.ProfilePath == nil {
		user["profile_path"] = "/profiles/default.png"
	}

	message["_id"] = strconv.FormatInt(m.ID, 10)
	message["sender"] = user
	message["conversation"] = strconv.FormatInt(m.ChannelID, 10)
	message["message"] = m.Message
	message["imageUrl"] = m.ImageURL
	message["createdAt"] = m.CreatedAt
	message["updatedAt"] = m.UpdatedAt

	return json.Marshal(message)
}

type ChannelMessageModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m ChannelMessageModel) Insert(message *ChannelMessage) error {
	query := `
		INSERT INTO channel_messages(channel_id, sender_id, message, image_url, updated_at)
		VALUES($1, $2, $3, $4, now())
		RETURNING message_pid, created_at, updated_at
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{message.ChannelID, message.Sender.ID, message.Message, message.ImageURL}

	return m.DB.QueryRowContext(ctx, query, args...).Scan(
		&message.ID,
		&message.CreatedAt,
		&message.UpdatedAt,
	)
}

func (m ChannelMessageModel) GetAll(channelID int64) ([]*ChannelMessage, error) {
	query := `
		SELECT m.message_pid, m.message, m.image_url, m.created_at, u.user_pid, u.username, u.name, u.profile_path
		FROM channel_messages m
		LEFT JOIN users u on m.sender_id = u.user_pid
		WHERE m.channel_id = $1
		ORDER BY m.created_at ASC
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, channelID)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}
	defer rows.Close()

	var messages []*ChannelMessage

	for rows.Next() {
		message := ChannelMessage{
			Sender: &User{},
		}
		if err := rows.Scan(
			&message.ID,
			&message.Message,
			&message.ImageURL,
			&message.CreatedAt,
			&message.Sender.ID,
			&message.Sender.Username,
			&message.Sender.Name,
			&message.Sender.ProfilePath,
		); err != nil {
			return nil, err
		}

		messages = append(messages, &message)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}

	return messages, nil
}
