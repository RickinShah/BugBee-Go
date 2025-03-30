package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/go-redis/redis/v8"
)

type UserRole struct {
	UserID      int64 `json:"user_id" db:"user_id"`
	CommunityID int64 `json:"community_id" db:"community_id"`
	RoleID      int64 `json:"role_id" db:"role_id"`
}

type UserRoleModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m UserRoleModel) Insert(userRole UserRole) error {
	query := `
		INSERT INTO user_roles(user_id, community_id, role_id)
		VALUES ($1, $2, $3)
		ON CONFLICT
		DO NOTHING
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{userRole.UserID, userRole.CommunityID, userRole.RoleID}

	_, err := m.DB.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}
	return nil
}

func (m UserRoleModel) InsertTx(tx *sql.Tx, userRole UserRole) error {
	query := `
		INSERT INTO user_roles(user_id, community_id, role_id)
		VALUES ($1, $2, $3)
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{userRole.UserID, userRole.CommunityID, userRole.RoleID}

	_, err := tx.ExecContext(ctx, query, args...)
	if err != nil {
		return err
	}
	return nil
}
