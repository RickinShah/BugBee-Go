package data

import (
	"context"
	"database/sql"
	"errors"
	"strings"
	"time"

	"github.com/RickinShah/BugBee/internal/validator"
	"github.com/go-redis/redis/v8"
)

type Channel struct {
	ID          int64     `json:"channel_id,string" db:"channel_pid"`
	CommunityID int64     `json:"community_id,string" db:"community_id"`
	Name        string    `json:"name" db:"name"`
	Roles       *[]string `json:"roles" db:"roles"`
}

type ChannelRole struct {
	ChannelID int64 `json:"channel_id, string" db:"channel_id"`
	RoleID    int64 `json:"role_id, string" db:"role_id"`
}

type ChannelModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func ValidateChannelName(v *validator.Validator, name string) {
	v.Check(len(strings.TrimSpace(name)) != 0, "channel name", "should not be empty")
}

func (m ChannelModel) Insert(channel *Channel) error {
	query := `
		INSERT INTO channels (community_id, name)
		VALUES ($1, $2)
		RETURNING channel_pid
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{channel.CommunityID, channel.Name}
	return m.DB.QueryRowContext(ctx, query, args...).Scan(&channel.ID)
}

func (m ChannelModel) GetAll(communityID int64) ([]*Channel, error) {
	query := `
		SELECT channel_pid, community_id, name
		FROM channels
		WHERE community_id = $1
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{communityID}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	var channels []*Channel

	for rows.Next() {
		var channel Channel
		if err := rows.Scan(&channel.ID, &channel.CommunityID, &channel.Name); err != nil {
			return nil, err
		}

		channels = append(channels, &channel)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return channels, nil
}

func (m ChannelModel) InsertRoles(channelID int64, roleIDs []int64) error {
	query := `
		INSERT INTO channel_roles(channel_id, role_id)
		VALUES ($1, $2)
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	stmt, err := m.DB.PrepareContext(ctx, query)
	if err != nil {
		return err
	}

	for _, id := range roleIDs {
		_, err = stmt.Exec(channelID, id)
		if err != nil {
			return err
		}
	}
	return nil
}

func (m ChannelModel) GetRoles(channelID int64) ([]string, error) {
	query := `
		SELECT DISTINCT name
		FROM channel_roles chr
		LEFT JOIN community_roles cr
		ON chr.role_id = cr.role_pid
		WHERE channel_id = $1
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

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, err
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return roles, nil
}
