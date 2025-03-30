package data

import (
	"context"
	"database/sql"
	"time"

	"github.com/RickinShah/BugBee/internal/validator"
	"github.com/go-redis/redis/v8"
)

type CommunityRole struct {
	ID          int64  `json:"role_id" db:"role_pid"`
	CommunityID int64  `json:"community_id" db:"community_id"`
	Name        string `json:"name" db:"name"`
}

func ValidateRoleName(v *validator.Validator, name string) {
	v.Check(len(name) != 0, "role name", "should not be empty")
}

type CommunityRoleModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m CommunityRoleModel) Insert(tx *sql.Tx, communityRole *CommunityRole) error {
	query := `
		INSERT INTO community_roles(community_id, name)
		VALUES ($1, $2)
		RETURNING role_pid
	`
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{communityRole.CommunityID, communityRole.Name}

	return m.DB.QueryRowContext(ctx, query, args...).Scan(&communityRole.ID)
}

func (m CommunityRoleModel) Get(communityID int64) ([]*CommunityRole, error) {
	query := `
		SELECT role_pid, name FROM community_roles
		WHERE community_id = $1
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{communityID}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}

	var communityRoles []*CommunityRole

	for rows.Next() {
		var communityRole CommunityRole
		if err := rows.Scan(&communityRole.ID, &communityRole.Name); err != nil {
			return nil, err
		}

		communityRoles = append(communityRoles, &communityRole)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return communityRoles, err
}
