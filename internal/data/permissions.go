package data

import (
	"context"
	"database/sql"
	"errors"
	"log"
	"slices"
	"time"

	"github.com/RickinShah/BugBee/internal/validator"
	"github.com/go-redis/redis/v8"
)

type Permissions []string

func (p Permissions) Include(code string) bool {
	return slices.Contains(p, code)
}

type PermissionModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func ValidatePermissionName(v *validator.Validator, name string) {
	v.Check(len(name) != 0, "name", "should not be empty")
}

func (m PermissionModel) AddPermission(code string) error {
	query := `INSERT INTO permissions (code) VALUES ($1)`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	_, err := m.DB.ExecContext(ctx, query, code)
	if err != nil {
		return err
	}

	return nil
}

func (m PermissionModel) GetPermissionsByUser(userID int64, communityID int64) (Permissions, error) {
	query := `
		SELECT DISTINCT p.code
		FROM user_roles ur
		JOIN role_permissions rp ON ur.role_id = rp.role_id
		JOIN permissions p ON rp.permission_id = p.permission_pid
		WHERE ur.user_id = $1 AND ur.community_id = $2;
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query, userID, communityID)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	var codes Permissions

	for rows.Next() {
		var code string
		if err := rows.Scan(&code); err != nil {
			return nil, err
		}

		codes = append(codes, code)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}

	return codes, nil
}

func (m PermissionModel) GetIDByCode(codes []string) ([]int, error) {
	query := `
		SELECT permission_pid FROM permissions
		WHERE code = $1
	`

	stmt, err := m.DB.Prepare(query)
	if err != nil {
		return nil, err
	}

	var permissionIDs []int
	for _, code := range codes {
		var tempID int
		log.Print(code)
		err := stmt.QueryRow(code).Scan(&tempID)
		if err != nil {
			switch {
			case errors.Is(err, sql.ErrNoRows):
				return nil, ErrRecordNotFound
			default:
				return nil, err
			}
		}
		permissionIDs = append(permissionIDs, tempID)
	}
	return permissionIDs, nil
}

func (m PermissionModel) GetAll() ([]int, error) {
	query := `
		SELECT permission_pid FROM permissions
	`
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	rows, err := m.DB.QueryContext(ctx, query)

	var permissionIDs []int
	for rows.Next() {
		var tempID int
		if err := rows.Scan(&tempID); err != nil {
			return nil, err
		}

		permissionIDs = append(permissionIDs, tempID)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	return permissionIDs, nil
}

func (m PermissionModel) InsertAllTx(tx *sql.Tx, roleID int64) error {
	query := `
		INSERT INTO role_permissions(role_id, permission_id)
		SELECT $1, permission_pid FROM permissions
		ON CONFLICT DO NOTHING
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	result, err := tx.ExecContext(ctx, query, roleID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected <= 1 {
		return ErrEditConflict
	}

	return nil
}
