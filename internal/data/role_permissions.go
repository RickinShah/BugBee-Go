package data

import (
	"database/sql"

	"github.com/go-redis/redis/v8"
)

type RolePermission struct {
	RoleID       int64 `json:"role_id" db:"role_id"`
	PermissionID int64 `json:"permission_id" db:"permission_id"`
}

type RolePermissionModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m RolePermissionModel) Insert(tx *sql.Tx, roleID int64, permissionIDs []int) error {
	query := `
		INSERT INTO role_permissions(role_id, permission_id)
		VALUES ($1, $2)
	`

	stmt, err := tx.Prepare(query)
	if err != nil {
		return err
	}

	for i := range permissionIDs {
		args := []any{roleID, permissionIDs[i]}

		_, err := stmt.Exec(args...)
		if err != nil {
			return err
		}
	}

	return nil
}
