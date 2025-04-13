package data

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
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
	MemberCount int       `json:"member_count" db:"member_count"`
	Version     int       `json:"version" db:"version"`
	marshalType MarshalType
}

func (c *Community) MarshalJSON() ([]byte, error) {
	community := make(map[string]any, 9)

	if c.marshalType == 0 {
		c.marshalType = Full
	}

	if c.marshalType == Frontend || c.marshalType == Full || c.marshalType == Minimal || c.marshalType == IDOnly {
		community["community_id"] = strconv.FormatInt(c.ID, 10)
	}

	if c.marshalType == Frontend || c.marshalType == Full || c.marshalType == Minimal {
		community["community_handle"] = c.Handle
		community["name"] = c.Name
		if c.ProfilePath == nil {
			community["profile_path"] = "/bugbee/profiles/default.png"
		} else {
			community["profile_path"] = c.ProfilePath
		}
		community["member_count"] = c.MemberCount
	}
	if c.marshalType == Frontend || c.marshalType == Full {
		community["creator_id"] = strconv.FormatInt(c.CreatorID, 10)
		community["description"] = c.Description
		community["updated_at"] = c.UpdatedAt
		community["created_at"] = c.CreatedAt
		community["is_official"] = c.IsOfficial
	}
	if c.marshalType == Full {
		community["version"] = c.Version
	}
	return json.Marshal(community)
}

func (c *Community) SetMarshalType(marshalType MarshalType) {
	c.marshalType = marshalType
}

func ValidateHandle(v *validator.Validator, handle string) {
	v.Check(handle != "", "community handle", "must be provided")
	v.Check(len(handle) <= 30, "community handle", "must not be more than 30 characters")
	v.Check(validator.Matches(handle, validator.UsernameRX), "community handle", "should only contain alphanumeric characters and underscore")
}

func ValidateCreatorID(v *validator.Validator, userID, creatorID int64) {
	v.Check(userID == creatorID, "error", "only the creator can delete the community")
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

func (m CommunityModel) UpdateTx(tx *sql.Tx, community *Community) error {
	query := `
		UPDATE communities
		SET handle = $1, name = $2, updated_at = now(), profile_path = $3, version = version + 1
		WHERE community_pid = $4 AND version = $5 AND creator_id = $6
		RETURNING updated_at, version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{community.Handle, community.Name, community.ProfilePath, community.ID, community.Version, community.CreatorID}
	if err := tx.QueryRowContext(ctx, query, args...).Scan(&community.UpdatedAt, &community.Version); err != nil {
		switch {
		case err.Error() == `pq: duplicate key value violates unique constraint "communities_handle_key"`:
			return ErrDuplicateCommunityHandle
		default:
			return err
		}
	}
	return nil
}

func (m CommunityModel) UpdateMemberCountTx(tx *sql.Tx, community *Community, delta int) error {
	query := `
		UPDATE communities
		SET member_count = member_count + $1, version = version + 1
		WHERE community_pid = $2 AND version = $3
		RETURNING version
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{community.MemberCount, community.ID, community.Version}

	return tx.QueryRowContext(ctx, query, args...).Scan(&community.Version)
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

func (m CommunityModel) SearchCommunities(name string, limit int) ([]*Community, error) {
	query := `
		WITH similarity_scores AS (
			SELECT handle, name, profile_path,
			GREATEST(word_similarity(name, $1), word_similarity(handle, $1)) AS match_similarity
			FROM communities
			WHERE name % $1 OR handle % $1
			ORDER BY match_similarity DESC
			LIMIT $2
		)
		SELECT handle, name, profile_path, match_similarity
		FROM similarity_scores
		UNION ALL
		SELECT handle, name, profile_path,
		GREATEST(word_similarity(handle, $1), word_similarity(name, $1)) AS match_similarity
		FROM communities
		WHERE NOT EXISTS (SELECT 1 FROM similarity_scores)
		AND (handle ^@ $1 OR name ^@ $1)
		ORDER BY match_similarity DESC NULLS LAST
		LIMIT $2;
	`

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{name, limit}

	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}
	defer rows.Close()

	type tempCommunity struct {
		Handle          string  `json:"handle" db:"handle"`
		Name            string  `json:"name" db:"name"`
		ProfilePath     *string `json:"profile_path" db:"profile_path"`
		MatchSimilarity float64 `json:"match_similarity" db:"match_similarity"`
	}

	var communities []*Community

	for rows.Next() {
		var temp tempCommunity
		if err := rows.Scan(
			&temp.Handle,
			&temp.Name,
			&temp.ProfilePath,
			&temp.MatchSimilarity,
		); err != nil {
			return nil, err
		}
		communities = append(communities, &Community{
			Handle:      temp.Handle,
			Name:        temp.Name,
			ProfilePath: temp.ProfilePath,
			marshalType: Minimal,
		})
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}
	return communities, nil
}

func (m CommunityModel) GetByHandle(handle string) (*Community, error) {
	query := `
		SELECT community_pid, handle, name, description, created_at, updated_at, profile_path, is_official, member_count, version
		FROM communities
		WHERE handle = $1
	`

	community := Community{}

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{handle}

	err := m.DB.QueryRowContext(ctx, query, args...).Scan(
		&community.ID,
		&community.Handle,
		&community.Name,
		&community.Description,
		&community.CreatedAt,
		&community.UpdatedAt,
		&community.ProfilePath,
		&community.IsOfficial,
		&community.MemberCount,
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

func (m CommunityModel) GetAll(filters Filters) ([]*Community, error) {
	query := fmt.Sprintf(`
		SELECT community_pid, creator_id, handle, name, created_at, updated_at, profile_path, is_official, member_count, version
		FROM communities
		WHERE community_pid > $1
		ORDER BY %s %s, community_pid ASC
		LIMIT $2
	`, filters.sortColumn(), filters.sortDirection())

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	args := []any{filters.LastID, filters.PageSize}
	rows, err := m.DB.QueryContext(ctx, query, args...)
	if err != nil {
		switch {
		case errors.Is(err, sql.ErrNoRows):
			return nil, ErrRecordNotFound
		default:
			return nil, err
		}
	}

	var communities []*Community

	for rows.Next() {
		var community Community
		if err := rows.Scan(&community.ID,
			&community.CreatorID,
			&community.Handle,
			&community.Name,
			&community.CreatedAt,
			&community.UpdatedAt,
			&community.ProfilePath,
			&community.IsOfficial,
			&community.MemberCount,
			&community.Version,
		); err != nil {
			return nil, err
		}
		communities = append(communities, &community)
	}

	if err := rows.Err(); err != nil {
		return nil, err
	}
	return communities, nil
}

func (m CommunityModel) generateCacheKey(handle string) string {
	return "community:" + handle
}
