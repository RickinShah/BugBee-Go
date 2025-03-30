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
