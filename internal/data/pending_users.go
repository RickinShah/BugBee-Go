package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/go-redis/redis/v8"
)

type PendingUser struct {
	ID        int64     `json:"user_id,string" db:"user_pid"`
	Username  *string   `json:"username" db:"username"`
	Name      *string   `json:"name" db:"name"`
	Email     string    `json:"email" db:"email"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	Expiry    time.Time `json:"expiry" db:"expiry"`
	Version   int       `json:"version" db:"version"`
}

type PendingUserModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m PendingUserModel) Get(userID int64) (*PendingUser, error) {
	userJSON, err := CacheGet(m.Redis, m.generateCacheKey(userID))

	if nil == err {
		user := PendingUser{}
		err := json.Unmarshal([]byte(userJSON), &user)
		if nil == err {
			return &user, nil
		}
	}
	query := `
		SELECT user_pid, email, name, username, created_at, expiry, version
		FROM pending_users
		WHERE user_pid = $1 AND expiry > $2
	`
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	user := PendingUser{}

	args := []any{userID, time.Now()}

	err = m.DB.QueryRowContext(ctx, query, args...).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Username,
		&user.CreatedAt,
		&user.Expiry,
		&user.Version,
	)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	return &user, nil
}

func (m PendingUserModel) Delete(userID int64) error {
	query := `
		DELETE FROM pending_users
		WHERE user_pid = $1
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, userID)
	if err != nil {
		return err
	}

	CacheDel(m.Redis, m.generateCacheKey(userID))

	return nil
}

func (m PendingUserModel) InsertEmail(user *PendingUser) error {
	query := `
		INSERT INTO pending_users (email) VALUES ($1)
		ON CONFLICT (email) DO UPDATE
		SET email = EXCLUDED.email
		RETURNING user_pid
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	err := m.DB.QueryRowContext(ctx, query, user.Email).Scan(&user.ID)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "pending_users_email_key"`:
			return ErrDuplicateEmail
		default:
			return err
		}
	}

	go func() {
		userCopy := *user

		CacheSet(m.Redis, m.generateCacheKey(userCopy.ID), &userCopy, 24*time.Hour)
	}()

	return nil
}

func (m PendingUserModel) InsertUsername(user *PendingUser) error {
	query := `
		UPDATE pending_users
		SET username = $1, name = $2, version = version + 1
		WHERE user_pid = $3 AND expiry > $4
		RETURNING email, version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{user.Username, user.Name, user.ID, time.Now()}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&user.Email, &user.Version)
	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "pending_users_username_key"`:
			return ErrDuplicateUsername
		case errors.Is(err, sql.ErrNoRows):
			return ErrRecordNotFound
		default:
			return err
		}
	}

	go func() {
		userCopy := *user

		CacheSet(m.Redis, m.generateCacheKey(userCopy.ID), &userCopy, 24*time.Hour)
	}()

	return nil
}

func (m PendingUserModel) generateCacheKey(userID int64) string {
	return fmt.Sprintf("pending_user:%d", userID)
}
