package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"strconv"
	"time"

	"github.com/RickinShah/BugBee/internal/validator"
	"github.com/go-redis/redis/v8"
)

var (
	ErrDuplicateCommunityHandle = errors.New("duplicate community_handle")
)

const CommunityCacheDuration = 30 * time.Minute

type Community struct {
	ID          int64     `json:"community_id,string" db:"community_pid"`
	CreatorID   int64     `json:"creator_id,string" db:"creator_id"`
	Handle      string    `json:"community_handle" db:"handle"`
	Name        string    `json:"name" db:"name"`
	Description *string   `json:"description" db:"description"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time `json:"updated_at" db:"updated_at"`
	ProfilePath *string   `json:"profile_path" db:"profile_path"`
	IsOfficial  bool      `json:"is_official" db:"is_official"`
	Version     int       `json:"version" db:"version"`
	all         bool
}

func (c *Community) MarshalJSON() ([]byte, error) {
	community := make(map[string]any, 9)
	community["community_id"] = strconv.FormatInt(c.ID, 10)
	community["creator_id"] = strconv.FormatInt(c.CreatorID, 10)
	community["community_handle"] = c.Handle
	community["name"] = c.Name
	community["description"] = c.Description
	community["created_at"] = c.CreatedAt
	community["updated_at"] = c.UpdatedAt
	community["profile_path"] = c.ProfilePath
	community["is_official"] = c.IsOfficial
	if c.all {
		community["version"] = c.Version
	}
	return json.Marshal(community)
}

func (c *Community) SetIncludeAll(include bool) {
	c.all = include
}

func ValidateHandle(v *validator.Validator, handle string) {
	v.Check(handle != "", "community handle", "must be provided")
	v.Check(len(handle) <= 30, "community handle", "must not be more than 30 characters")
	v.Check(validator.Matches(handle, validator.UsernameRX), "community handle", "should only contain alphanumeric characters and underscore")
}

type CommunityModel struct {
	DB    *sql.DB
	Redis *redis.Client
}

func (m CommunityModel) Insert(tx *sql.Tx, community *Community) error {
	query := `
		INSERT INTO communities(creator_id, handle, name)
		VALUES ($1, $2, $3)
		RETURNING community_pid, created_at, version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{
		community.CreatorID,
		community.Handle,
		community.Name,
	}

	err := tx.QueryRowContext(ctx, query, args...).Scan(
		&community.ID,
		&community.CreatedAt,
		&community.Version,
	)

	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "communities_handle_key"`:
			return ErrDuplicateCommunityHandle
		default:
			return err
		}
	}
	return nil
}

func (m CommunityModel) UpdatePath(tx *sql.Tx, community *Community) error {
	query := `
		UPDATE communities
		SET profile_path = $1
		WHERE community_pid = $2 AND version = $3
		RETURNING version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{community.ProfilePath, community.ID, community.Version}

	return tx.QueryRowContext(ctx, query, args...).Scan(&community.Version)
}

func (m CommunityModel) Update(community *Community) error {
	query := `
		UPDATE communities
		SET handle = $1, name = $2, description = $3, profile_path = $4, updated_at = now(), version = version + 1
		WHERE community_pid = $5 AND version = $6
		RETURNING version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{
		community.Handle,
		community.Name,
		community.Description,
		community.ProfilePath,
		community.ID,
		community.Version,
	}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(&community.Version)

	if err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "communities_handle_key"`:
			return ErrDuplicateCommunityHandle
		default:
			return err
		}
	}

	CacheDel(m.Redis, m.generateCacheKey(community.Handle))
	return nil
}

func (m CommunityModel) GetByHandle(handle string) (*Community, error) {
	query := `
		SELECT community_pid, name, description, created_at, updated_at, profile_path, is_official, version
		FROM communities
		WHERE handle = $1
	`

	community := Community{}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{handle}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(
		&community.ID,
		&community.Name,
		&community.Description,
		&community.CreatedAt,
		&community.UpdatedAt,
		&community.ProfilePath,
		&community.IsOfficial,
		&community.Version,
	)

	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	go func(community Community) {
		community.SetIncludeAll(true)
		CacheSet(m.Redis, m.generateCacheKey(handle), &community, CommunityCacheDuration)
	}(community)

	return &community, err
}

func (m CommunityModel) Delete(id int64) error {
	query := `
		DELETE FROM communities WHERE community_pid = $1
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{id}

	result, err := m.DB.ExecContext(ctx, query, args)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return ErrRecordNotFound
	}

	return nil
}

func (m CommunityModel) generateCacheKey(handle string) string {
	return "community:" + handle
}
