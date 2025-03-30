package data

import (
	"context"
	"database/sql"
	"errors"
	"time"

	"github.com/go-redis/redis/v8"
)

type CommunityMember struct {
	UserID      int64     `json:"user_id" db:"user_id"`
	CommunityID int64     `json:"community" db:"communities"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

type CommunityMemberModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m CommunityMemberModel) Get(communityID int64) ([]*User, error) {
	query := `
		SELECT u.username, u.name, u.profile_path
		FROM community_members c
		LEFT JOIN users u ON c.user_id = u.user_pid
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

	var users []*User
	for rows.Next() {
		var user User

		if err := rows.Scan(&user.Username, &user.Name, &user.ProfilePath); err != nil {
			return nil, err
		}
		user.SetMarshalType(3)
		users = append(users, &user)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return users, nil
}

func (m CommunityMemberModel) InsertTx(tx *sql.Tx, cm *CommunityMember) error {
	query := `
		INSERT INTO community_members (user_id, community_id)
		VALUES ($1, $2)
		RETURNING created_at
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{cm.UserID, cm.CommunityID}

	err := tx.QueryRowContext(ctx, query, args...).Scan(&cm.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}

func (m CommunityMemberModel) Insert(cm *CommunityMember) error {
	query := `
		INSERT INTO community_members (user_id, community_id)
		VALUES ($1, $2)
		RETURNING created_at
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{cm.UserID, cm.CommunityID}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&cm.CreatedAt)
	if err != nil {
		return err
	}
	return nil
}
